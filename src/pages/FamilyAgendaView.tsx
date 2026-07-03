import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, MessageCircle, Calendar, CheckSquare, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, isTomorrow, startOfDay, addDays } from "date-fns";
import { de as deLocale, fr as frLocale, it as itLocale, es as esLocale, pt as ptLocale, type Locale } from "date-fns/locale";

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

function groupByDay(items: AgendaItem[], dateLabel: (date: Date) => string): { label: string; date: Date; items: AgendaItem[] }[] {
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
  event: { icon: Calendar, color: TC, labelKey: 'familyAgenda.event' },
  task: { icon: CheckSquare, color: '#6E8FE5', labelKey: 'familyAgenda.task' },
};

const AgendaItemRow = ({ item, members, t, fmt }: { item: AgendaItem; members: MemberMap; t: (key: string) => string; fmt: (date: Date, pattern: string) => string }) => {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const timeStr = item.allDay ? t('familyAgenda.allDay') : fmt(item.startDate, 'p');
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
  const { t, i18n } = useTranslation();
  const dateFnsLocale: Locale | undefined = ({ de: deLocale, fr: frLocale, it: itLocale, es: esLocale, pt: ptLocale } as Record<string, Locale>)[i18n.language.split('-')[0]];
  const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: dateFnsLocale });
  const { user } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [members, setMembers] = useState<MemberMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const cutoff = addDays(now, 60).toISOString();
      const cutoffDate = addDays(now, 60);

      // Fire membership lookup and tasks query in parallel
      const [membershipRes, tasksRes] = await Promise.all([
        supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('tasks')
          .select('id, title, due_date, type, assigned_to')
          .not('due_date', 'is', null)
          .eq('completed', false)
          .eq('type', 'shared')
          .is('parent_id', null)
          .gte('due_date', startOfDay(now).toISOString())
          .lte('due_date', cutoff)
          .order('due_date', { ascending: true }),
      ]);

      // Load family members for assignee name resolution using the resolved family_id
      if (membershipRes.data?.family_id) {
        const { data: fmData } = await supabase
          .from('family_members')
          .select('user_id, full_name')
          .eq('family_id', membershipRes.data.family_id)
          .eq('is_active', true);
        if (fmData) {
          const map: MemberMap = {};
          fmData.forEach(m => { if (m.user_id && m.full_name) map[m.user_id] = m.full_name; });
          setMembers(map);
        }
      }

      // Read family calendar events from localStorage
      const rawEvents: any[] = JSON.parse(localStorage.getItem('eazy-family-calendar-items') || '[]');
      const eventItems: AgendaItem[] = rawEvents
        .filter(e => {
          if (!e.attendees?.length) return false;
          const d = new Date(e.startDate);
          return d >= startOfDay(now) && d <= cutoffDate;
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

  const dateLabel = (date: Date): string => {
    if (isToday(date)) return t('familyAgenda.today');
    if (isTomorrow(date)) return t('familyAgenda.tomorrow');
    return fmt(date, 'EEEE, MMM d');
  };
  const groups = groupByDay(items, dateLabel);

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
          <p className="flex-1 text-center font-bold text-2xl" style={{ color: INK }}>
            {t('familyAgenda.title')}
          </p>
          <button
            onClick={() => navigate('/app/family-channel')}
            className="w-9 h-9 flex items-center justify-center"
            title={t('familyAgenda.channelTitle')}
          >
            <MessageCircle className="w-5 h-5" style={{ color: TC }} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 pb-16 space-y-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2" style={{ borderColor: TC, borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="16" width="52" height="50" rx="9" fill="#FDF3EE" stroke="#964735" strokeWidth="2.5"/>
              <rect x="4" y="16" width="52" height="17" rx="9" fill="#964735"/>
              <rect x="4" y="26" width="52" height="7" fill="#964735"/>
              <rect x="18" y="9" width="6" height="14" rx="3" fill="#D97B66"/>
              <rect x="36" y="9" width="6" height="14" rx="3" fill="#D97B66"/>
              <circle cx="18" cy="50" r="2.5" fill="#D97B66" opacity="0.6"/>
              <circle cx="30" cy="50" r="2.5" fill="#D97B66" opacity="0.6"/>
              <circle cx="42" cy="50" r="2.5" fill="#D97B66" opacity="0.6"/>
              <circle cx="18" cy="60" r="2.5" fill="#964735" opacity="0.3"/>
              <circle cx="30" cy="60" r="2.5" fill="#964735" opacity="0.55"/>
              <circle cx="64" cy="60" r="20" fill="white" stroke="#EDCFB8" strokeWidth="1.5"/>
              <path d="M54 55 L54 65 L70 71 L70 49 Z" fill="#964735"/>
              <rect x="47" y="57" width="8" height="8" rx="2.5" fill="#D97B66"/>
              <path d="M71 54 Q77 60 71 66" stroke="#D97B66" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M74 51 Q82 60 74 69" stroke="#D97B66" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.45"/>
            </svg>
            <p className="font-semibold" style={{ color: INK }}>{t('familyAgenda.emptyTitle')}</p>
            <p className="text-sm" style={{ color: MUTED, maxWidth: '220px' }}>
              {t('familyAgenda.emptyDesc')}
            </p>
            <button
              onClick={() => navigate('/app/calendar')}
              className="mt-2 text-sm font-semibold px-4 py-2 rounded-full"
              style={{ background: 'hsl(var(--muted))', color: TC }}
            >
              {t('familyAgenda.openCalendar')}
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
                  <AgendaItemRow item={item} members={members} t={t} fmt={fmt} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Channel shortcut — visually separated from agenda events */}
        {!loading && (
          <div style={{ marginTop: '8px' }}>
            {/* Section divider */}
            <div className="flex items-center gap-3 mb-3">
              <div style={{ flex: 1, height: '1px', background: BORDER }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
                {t('familyAgenda.connectSection')}
              </p>
              <div style={{ flex: 1, height: '1px', background: BORDER }} />
            </div>

            <button
              onClick={() => navigate('/app/family-channel')}
              className="w-full rounded-2xl flex items-center gap-3 px-4 py-4"
              style={{
                background: 'linear-gradient(135deg, rgba(150,71,53,0.06) 0%, rgba(217,123,102,0.06) 100%)',
                border: `1.5px solid rgba(150,71,53,0.18)`,
              }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: INK }}>{t('familyAgenda.channelTitle')}</p>
                <p className="text-xs" style={{ color: MUTED }}>{t('familyAgenda.channelDesc')}</p>
              </div>
              <ChevronLeft className="w-4 h-4 rotate-180" style={{ color: TC }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyAgendaView;
