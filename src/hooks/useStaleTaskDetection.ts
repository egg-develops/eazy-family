import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { scoreStaleTask } from '@/lib/intelligence';

export interface StaleTask {
  id: string;
  title: string;
  daysSinceUpdate: number;
  isEscalated: boolean;
}

export function useStaleTaskDetection() {
  const { user } = useAuth();
  const [staleTasks, setStaleTasks] = useState<StaleTask[]>([]);

  useEffect(() => {
    if (!user) return;

    const detect = async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

        const { data } = await supabase
          .from('tasks')
          .select('id, title, created_at, updated_at')
          .eq('completed', false)
          .eq('type', 'task')
          .lte('created_at', sevenDaysAgo)   // must have existed for 7+ days
          .lte('updated_at', sevenDaysAgo)   // AND not touched in 7 days
          .order('updated_at')
          .limit(5);

        if (!data) return;

        const now = new Date();
        setStaleTasks(
          data.map(t => {
            const { daysSinceUpdate, isEscalated } = scoreStaleTask(new Date(t.updated_at), now);
            return { id: t.id, title: t.title, daysSinceUpdate, isEscalated };
          })
        );
      } catch {
        // silent
      }
    };

    detect();
  }, [user]);

  return { staleTasks };
}
