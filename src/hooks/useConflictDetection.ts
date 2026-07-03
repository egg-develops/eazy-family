import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { detectConflicts, type CalEvent, type ConflictPair } from '@/lib/intelligence';

// Re-export so callers that import from this hook still work
export type ConflictEvent = CalEvent;
export type { ConflictPair };

// The user's calendar lives in localStorage (the Supabase `events` table is the
// separate community/local-events feature). Read the SAME store the Calendar
// page writes, or conflict detection silently analyses the wrong data.
const CAL_KEY = 'eazy-family-calendar-items';

interface RawCalItem {
  id: string;
  title: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  location?: string;
}

export function useConflictDetection() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const detect = () => {
      try {
        const raw: RawCalItem[] = JSON.parse(localStorage.getItem(CAL_KEY) || '[]');
        const now = new Date();
        const weekAhead = new Date(now.getTime() + 7 * 86400000);

        const events: CalEvent[] = raw
          .filter(e => e.type !== 'reminder' && !e.allDay && e.startDate)
          .map(e => ({
            id: e.id,
            title: e.title,
            start: new Date(e.startDate!),
            // default 1-hour duration if no end_date
            end: e.endDate ? new Date(e.endDate) : new Date(new Date(e.startDate!).getTime() + 3600000),
            allDay: false,
            location: e.location ?? undefined,
          }))
          // only upcoming events in the next 7 days
          .filter(e => e.start >= now && e.start <= weekAhead);

        setConflicts(detectConflicts(events).slice(0, 3));
      } catch {
        // silent — never block UI for AI features
      } finally {
        setLoading(false);
      }
    };

    detect();
    // Recompute once cloud preferences hydrate the calendar after login, and
    // whenever the calendar changes (EZ capture / Calendar page dispatch this).
    window.addEventListener('eazy-prefs-loaded', detect);
    window.addEventListener('eazy-calendar-updated', detect);
    return () => {
      window.removeEventListener('eazy-prefs-loaded', detect);
      window.removeEventListener('eazy-calendar-updated', detect);
    };
  }, [user]);

  return { conflicts, loading };
}
