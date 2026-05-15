import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StaleTask {
  id: string;
  title: string;
  daysSinceUpdate: number;
  isEscalated: boolean; // 14+ days → suggest delegate/drop
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
          .select('id, title, updated_at')
          .eq('completed', false)
          .eq('type', 'task')
          .lte('updated_at', sevenDaysAgo)
          .order('updated_at')
          .limit(5);

        if (!data) return;

        const now = Date.now();
        setStaleTasks(
          data.map(t => {
            const days = Math.round((now - new Date(t.updated_at).getTime()) / 86400000);
            return { id: t.id, title: t.title, daysSinceUpdate: days, isEscalated: days >= 14 };
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
