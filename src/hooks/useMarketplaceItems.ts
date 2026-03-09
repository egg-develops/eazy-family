import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceItem {
  id: string;
  title: string;
  description?: string;
  price: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  category: string;
  images?: string[];
  posted_at: string;
  seller_id: string;
}

export function useMarketplaceItems() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('marketplace_items')
        .select('*')
        .order('posted_at', { ascending: false });

      if (fetchError) throw fetchError;
      setItems((data || []) as MarketplaceItem[]);
    } catch (err) {
      console.error('Error loading marketplace items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();

    // Set up realtime subscription
    const channel = supabase
      .channel('marketplace-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_items',
        },
        () => {
          loadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createItem = async (item: Omit<MarketplaceItem, 'id' | 'seller_id' | 'posted_at'>) => {
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .insert([item])
        .select();

      if (error) throw error;
      const newItem = data?.[0];
      if (newItem) {
        setItems([newItem, ...items]);
      }
      return newItem;
    } catch (err) {
      console.error('Error creating marketplace item:', err);
      throw err;
    }
  };

  const updateItem = async (id: string, updates: Partial<MarketplaceItem>) => {
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
      return data?.[0];
    } catch (err) {
      console.error('Error updating marketplace item:', err);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting marketplace item:', err);
      throw err;
    }
  };

  return {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refetch: loadItems,
  };
}
