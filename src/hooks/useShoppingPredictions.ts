import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeShoppingPredictions, cleanPurchaseItem, type ShoppingPrediction } from '@/lib/intelligence';

export type { ShoppingPrediction };

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

        const rows = data.map(r => ({ itemName: r.item_name, purchasedAt: new Date(r.purchased_at) }));
        setPredictions(computeShoppingPredictions(rows, new Date()));
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
  const cleaned = cleanPurchaseItem(itemName);
  if (!cleaned) return;
  try {
    await supabase
      .from('shopping_purchase_history')
      .insert({ user_id: userId, item_name: cleaned });
  } catch {
    // silent — logging failure shouldn't affect UX
  }
}
