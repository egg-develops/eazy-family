-- ====================================
-- Google Calendar Webhook Sync Tracking
-- ====================================
-- Tracks sync state for Google Calendar push notifications
-- Each calendar resource gets a watch subscription with unique resource_id

CREATE TABLE IF NOT EXISTS public.google_calendar_sync (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.calendar_integrations(id) ON DELETE CASCADE,
  calendar_id text NOT NULL, -- Google Calendar ID (usually email)
  resource_id text NOT NULL UNIQUE, -- Google's unique resource ID for this watch subscription
  sync_token text, -- For incremental sync; NULL means full sync needed
  needs_sync boolean DEFAULT false, -- Flag set by webhook to indicate changes pending
  last_synced timestamp with time zone,
  watch_expiration timestamp with time zone, -- When Google watch subscription expires
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS google_calendar_sync_user_id_idx ON public.google_calendar_sync(user_id);
CREATE INDEX IF NOT EXISTS google_calendar_sync_resource_id_idx ON public.google_calendar_sync(resource_id);
CREATE INDEX IF NOT EXISTS google_calendar_sync_needs_sync_idx ON public.google_calendar_sync(needs_sync);

-- Enable RLS
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own calendar sync state" ON public.google_calendar_sync
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar sync state" ON public.google_calendar_sync
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar sync state" ON public.google_calendar_sync
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (webhook processor) can update sync state
CREATE POLICY "Service role can update sync state for webhook processing" ON public.google_calendar_sync
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete their own calendar sync state" ON public.google_calendar_sync
  FOR DELETE USING (auth.uid() = user_id);
