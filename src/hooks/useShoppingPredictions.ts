import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ShoppingPrediction {
  itemName: string;
  avgDaysBetween: number;
  daysSinceLast: number;
  daysOverdue: number;
}

export function useShoppingPredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<ShoppingPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const analyze = async () => {
      try {
        const { data } = await supabase
          .from('shopping_purchase_history')
          .select('item_name, purchased_at')
          .eq('user_id', user.id)
          .order('item_name')
          .order('purchased_at', { ascending: false });

        if (!data || data.length === 0) { setLoading(false); return; }

        // Group by item name (normalised lowercase)
        const byItem: Record<string, Date[]> = {};
        for (const row of data) {
          const key = row.item_name.toLowerCase();
          if (!byItem[key]) byItem[key] = [];
          byItem[key].push(new Date(row.purchased_at));
        }

        const now = Date.now();
        const preds: ShoppingPrediction[] = [];

        for (const [name, dates] of Object.entries(byItem)) {
          if (dates.length < 2) continue;

          // dates already desc; compute intervals
          const intervals: number[] = [];
          for (let i = 0; i < dates.length - 1; i++) {
            const diff = (dates[i].getTime() - dates[i + 1].getTime()) / 86400000;
            intervals.push(diff);
          }
          const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const daysSince = (now - dates[0].getTime()) / 86400000;
          const overdue = daysSince - avg;

          if (overdue > 0) {
            preds.push({
              itemName: name.charAt(0).toUpperCase() + name.slice(1),
              avgDaysBetween: Math.round(avg),
              daysSinceLast: Math.round(daysSince),
              daysOverdue: Math.round(overdue),
            });
          }
        }

        preds.sort((a, b) => b.daysOverdue - a.daysOverdue);
        setPredictions(preds.slice(0, 5));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [user]);

  return { predictions, loading };
}

export async function logPurchase(userId: string, itemName: string) {
  try {
    await supabase
      .from('shopping_purchase_history')
      .insert({ user_id: userId, item_name: itemName.toLowerCase().trim() });
  } catch {
    // silent — logging failure shouldn't affect UX
  }
}
