import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  token_type: string;
  scope: string;
  is_active: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncedCalendarEvent {
  id: string;
  user_id: string;
  integration_id: string;
  google_event_id: string;
  title: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  color: string;
  is_active: boolean;
  google_last_modified?: string;
  created_at: string;
  updated_at: string;
}

export function useGoogleCalendar() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [syncedEvents, setSyncedEvents] = useState<SyncedCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setIntegrations((data || []) as CalendarIntegration[]);
    } catch (err) {
      console.error('Error loading integrations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncedEvents = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('synced_calendar_events')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (fetchError) throw fetchError;
      setSyncedEvents((data || []) as SyncedCalendarEvent[]);
    } catch (err) {
      console.error('Error loading synced events:', err);
    }
  };

  useEffect(() => {
    loadIntegrations();
    loadSyncedEvents();

    // Set up realtime subscriptions
    const integrationsChannel = supabase
      .channel('calendar-integrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_integrations',
        },
        () => {
          loadIntegrations();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel('synced-calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'synced_calendar_events',
        },
        () => {
          loadSyncedEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(integrationsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const initiateOAuth = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID;
    if (!clientId) {
      setError('Google Calendar client ID not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google-calendar`;
    const scope = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth-callback?code=${code}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OAuth callback failed');
      }

      const result = await response.json();
      await loadIntegrations();
      await loadSyncedEvents();
      return result;
    } catch (err) {
      console.error('Error handling OAuth callback:', err);
      throw err;
    }
  };

  const syncCalendar = async () => {
    try {
      setSyncing(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-calendar`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json();
      await loadSyncedEvents();
      return result;
    } catch (err) {
      console.error('Error syncing calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync calendar');
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  const disconnectCalendar = async (integrationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('calendar_integrations')
        .update({ is_active: false })
        .eq('id', integrationId);

      if (updateError) throw updateError;

      // Deactivate synced events
      const { error: syncError } = await supabase
        .from('synced_calendar_events')
        .update({ is_active: false })
        .eq('integration_id', integrationId);

      if (syncError) console.error('Error deactivating synced events:', syncError);

      await loadIntegrations();
      await loadSyncedEvents();
    } catch (err) {
      console.error('Error disconnecting calendar:', err);
      throw err;
    }
  };

  return {
    integrations,
    syncedEvents,
    loading,
    syncing,
    error,
    initiateOAuth,
    handleOAuthCallback,
    syncCalendar,
    disconnectCalendar,
    refetch: loadIntegrations,
    refetchEvents: loadSyncedEvents,
  };
}
