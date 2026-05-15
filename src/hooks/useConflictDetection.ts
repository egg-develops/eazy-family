import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConflictEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
}

export interface ConflictPair {
  eventA: ConflictEvent;
  eventB: ConflictEvent;
}

export function useConflictDetection() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const detect = async () => {
      try {
        const now = new Date();
        const weekAhead = new Date(now.getTime() + 7 * 86400000);

        const { data: events } = await supabase
          .from('events')
          .select('id, title, start_date, end_date, all_day, location')
          .gte('start_date', now.toISOString())
          .lte('start_date', weekAhead.toISOString())
          .eq('all_day', false)
          .order('start_date');

        if (!events || events.length < 2) { setLoading(false); return; }

        const normalized: ConflictEvent[] = events.map(e => ({
          id: e.id,
          title: e.title,
          start: new Date(e.start_date),
          // default 1-hour duration if no end_date
          end: e.end_date ? new Date(e.end_date) : new Date(new Date(e.start_date).getTime() + 3600000),
          location: e.location ?? undefined,
        }));

        const found: ConflictPair[] = [];
        for (let i = 0; i < normalized.length; i++) {
          for (let j = i + 1; j < normalized.length; j++) {
            const a = normalized[i];
            const b = normalized[j];
            if (a.start < b.end && b.start < a.end) {
              found.push({ eventA: a, eventB: b });
            }
          }
        }

        setConflicts(found.slice(0, 3));
      } catch {
        // silent — never block UI for AI features
      } finally {
        setLoading(false);
      }
    };

    detect();
  }, [user]);

  return { conflicts, loading };
}
