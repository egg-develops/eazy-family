-- ====================================
-- Google Calendar OAuth Integration
-- ====================================

-- Calendar integrations table - stores OAuth tokens and connection info
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google', -- 'google' for now, extensible for future providers
  provider_account_id text NOT NULL, -- Google account email or ID
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone,
  token_type text DEFAULT 'Bearer',
  scope text, -- space-separated scopes granted
  is_active boolean DEFAULT true,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, provider, provider_account_id)
);

-- Synced calendar events table - stores Google Calendar events that are synced to Eazy.Family
CREATE TABLE IF NOT EXISTS public.synced_calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.calendar_integrations(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  all_day boolean DEFAULT false,
  color text DEFAULT 'hsl(220 70% 50%)',
  is_active boolean DEFAULT true,
  google_last_modified timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS calendar_integrations_user_id_idx ON public.calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS calendar_integrations_provider_idx ON public.calendar_integrations(provider, is_active);
CREATE INDEX IF NOT EXISTS synced_calendar_events_user_id_idx ON public.synced_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS synced_calendar_events_integration_id_idx ON public.synced_calendar_events(integration_id);
CREATE INDEX IF NOT EXISTS synced_calendar_events_start_date_idx ON public.synced_calendar_events(start_date);
CREATE INDEX IF NOT EXISTS synced_calendar_events_google_event_id_idx ON public.synced_calendar_events(google_event_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_integrations
CREATE POLICY "Users can view their own calendar integrations" ON public.calendar_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar integrations" ON public.calendar_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar integrations" ON public.calendar_integrations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar integrations" ON public.calendar_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for synced_calendar_events
CREATE POLICY "Users can view their own synced calendar events" ON public.synced_calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own synced calendar events" ON public.synced_calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own synced calendar events" ON public.synced_calendar_events
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced calendar events" ON public.synced_calendar_events
  FOR DELETE USING (auth.uid() = user_id);
