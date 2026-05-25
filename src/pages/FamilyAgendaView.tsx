import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, MessageCircle, Calendar, CheckSquare, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, isTomorrow, startOfDay, addDays } from "date-fns";

const TC = 'hsl(var(--primary))';
const CARD = 'hsl(var(--card))';
const BORDER = 'hsl(var(--border))';
const MUTED = 'hsl(var(--muted-foreground))';
const INK = 'hsl(var(--foreground))';
const BG = 'hsl(var(--background))';

interface AgendaItem {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  type: 'event' | 'task';
  location?: string;
  allDay?: boolean;
  assignedTo?: string | null;
}

interface MemberMap {
  [userId: string]: string;
}

function dateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

function groupByDay(items: AgendaItem[]): { label: string; date: Date; items: AgendaItem[] }[] {
  const map = new Map<string, { label: string; date: Date; items: AgendaItem[] }>();
  for (const item of items) {
    const key = startOfDay(item.startDate).toISOString();
    if (!map.has(key)) {
      map.set(key, { label: dateLabel(item.startDate), date: startOfDay(item.startDate), items: [] });
    }
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

const TYPE_META = {
  event: { icon: Calendar, color: TC, label: 'Event' },
  task: { icon: CheckSquare, color: '#6E8FE5', label: 'Task' },
};

const AgendaItemRow = ({ item, members }: { item: AgendaItem; members: MemberMap }) => {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const timeStr = item.allDay ? 'All day' : format(item.startDate, 'h:mm a');
  const assigneeName = item.assignedTo ? members[item.assignedTo] : null;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5"
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${meta.color}18` }}
      >
        <Icon className="w-4 h-4" style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: INK }}>{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-3 h-3 flex-shrink-0" style={{ color: MUTED }} />
          <p className="text-xs" style={{ color: MUTED }}>{timeStr}</p>
          {item.location && (
            <p className="text-xs truncate" style={{ color: MUTED }}>· {item.location}</p>
          )}
          {assigneeName && (
            <p className="text-xs truncate" style={{ color: MUTED }}>· {assigneeName}</p>
          )}
        </div>
      </div>
      {assigneeName && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
          style={{ background: '#964735' }}
        >
          {assigneeName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

const FamilyAgendaView = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [members, setMembers] = useState<MemberMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const cutoff = addDays(now, 60).toISOString(); // used for tasks query

      // Load family members for assignee name resolution
      const { data: myMembership } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (myMembership?.family_id) {
        const { data: fmData } = await supabase
          .from('family_members')
          .select('user_id, full_name')
          .eq('family_id', myMembership.family_id)
          .eq('is_active', true);
        if (fmData) {
          const map: MemberMap = {};
          fmData.forEach(m => { if (m.user_id && m.full_name) map[m.user_id] = m.full_name; });
          setMembers(map);
        }
      }

      // Read family calendar events from localStorage (family events, not community events)
      const rawEvents: any[] = JSON.parse(localStorage.getItem('eazy-family-calendar-items') || '[]');
      const cutoffDate = addDays(now, 60);
      const eventItems: AgendaItem[] = rawEvents
        .filter(e => {
          if (!e.attendees?.length) return false;
          const d = new Date(e.startDate);
          return d >= now && d <= cutoffDate;
        })
        .map(e => ({
          id: `ev-${e.id}`,
          title: e.title,
          startDate: new Date(e.startDate),
          endDate: e.endDate ? new Date(e.endDate) : undefined,
          allDay: e.allDay ?? false,
          location: e.location ?? undefined,
          type: 'event' as const,
        }));

      const tasksRes = await supabase
        .from('tasks')
        .select('id, title, due_date, type, assigned_to')
        .not('due_date', 'is', null)
        .eq('completed', false)
        .eq('type', 'shared')
        .is('parent_id', null)
        .gte('due_date', startOfDay(now).toISOString())
        .lte('due_date', cutoff)
        .order('due_date', { ascending: true });

      const taskItems: AgendaItem[] = (tasksRes.data || []).map(t => ({
        id: `task-${t.id}`,
        title: t.title,
        startDate: new Date(t.due_date!),
        type: 'task' as const,
        assignedTo: t.assigned_to ?? null,
      }));

      const all = [...eventItems, ...taskItems];
      all.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      setItems(all);
      setLoading(false);
    };
    load();
  }, [user]);

  const groups = groupByDay(items);

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ background: BG, paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10"
        style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center -ml-1">
            <ChevronLeft className="w-5 h-5" style={{ color: INK }} />
          </button>
          <p className="flex-1 text-center font-bold text-base" style={{ color: INK }}>
            Family
          </p>
          <button
            onClick={() => navigate('/app/family-channel')}
            className="w-9 h-9 flex items-center justify-center"
            title="Family Channel"
          >
            <MessageCircle className="w-5 h-5" style={{ color: TC }} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 pb-16 space-y-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: TC }} />
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="text-4xl">📅</div>
            <p className="font-semibold" style={{ color: INK }}>Nothing coming up</p>
            <p className="text-sm" style={{ color: MUTED, maxWidth: '220px' }}>
              Shared events, tasks, and reminders will appear here.
            </p>
            <button
              onClick={() => navigate('/app/calendar')}
              className="mt-2 text-sm font-semibold px-4 py-2 rounded-full"
              style={{ background: 'hsl(var(--muted))', color: TC }}
            >
              Open Calendar
            </button>
          </div>
        )}

        {groups.map(group => (
          <div key={group.date.toISOString()}>
            <p
              className="text-xs font-bold uppercase tracking-wide px-1 mb-2"
              style={{ color: MUTED }}
            >
              {group.label}
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              {group.items.map((item, i) => (
                <div
                  key={item.id}
                  style={i === group.items.length - 1 ? { borderBottom: 'none' } : undefined}
                >
                  <AgendaItemRow item={item} members={members} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Channel shortcut */}
        {!loading && (
          <button
            onClick={() => navigate('/app/family-channel')}
            className="w-full rounded-2xl flex items-center gap-3 px-4 py-3.5"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'hsl(var(--muted))' }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: TC }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold" style={{ color: INK }}>Family Channel</p>
              <p className="text-xs" style={{ color: MUTED }}>Private family messaging</p>
            </div>
            <ChevronLeft className="w-4 h-4 rotate-180" style={{ color: MUTED }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FamilyAgendaView;
