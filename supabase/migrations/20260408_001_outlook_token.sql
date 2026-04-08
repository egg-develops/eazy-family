-- Store Outlook refresh token on the user's profile
-- Allows silent re-sync without asking the user to reconnect
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS outlook_refresh_token text;
