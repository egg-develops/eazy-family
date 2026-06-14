-- Enable required extensions (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule morning digest daily at 07:00 UTC (08:00 CET / 09:00 CEST)
-- Prereq: set CRON_SECRET in Supabase dashboard → Edge Functions → Secrets
--         then run: ALTER DATABASE postgres SET app.cron_secret = '<same value>';
SELECT cron.schedule(
  'morning-digest-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://jfztyhuagxruhawchfem.supabase.co/functions/v1/morning-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);
