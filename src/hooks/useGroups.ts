import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Group {
  id: string;
  name: string;
  description?: string;
  category: string;
  member_count: number;
  is_public: boolean;
  is_joined?: boolean;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setGroups((data || []) as Group[]);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();

    // Set up realtime subscription
    const channel = supabase
      .channel('groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
        },
        () => {
          loadGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createGroup = async (group: {
    name: string;
    description?: string;
    category: string;
    is_public: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([group])
        .select();

      if (error) throw error;
      const newGroup = data?.[0];
      if (newGroup) {
        setGroups([newGroup, ...groups]);
      }
      return newGroup;
    } catch (err) {
      console.error('Error creating group:', err);
      throw err;
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{ group_id: groupId }]);

      if (error) throw error;

      // Update member count
      setGroups(groups.map(g => 
        g.id === groupId 
          ? { ...g, member_count: g.member_count + 1, is_joined: true }
          : g
      ));
    } catch (err) {
      console.error('Error joining group:', err);
      throw err;
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      if (error) throw error;

      // Update member count
      setGroups(groups.map(g => 
        g.id === groupId 
          ? { ...g, member_count: Math.max(0, g.member_count - 1), is_joined: false }
          : g
      ));
    } catch (err) {
      console.error('Error leaving group:', err);
      throw err;
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGroups(groups.filter(g => g.id !== id));
    } catch (err) {
      console.error('Error deleting group:', err);
      throw err;
    }
  };

  return {
    groups,
    loading,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    refetch: loadGroups,
  };
}
