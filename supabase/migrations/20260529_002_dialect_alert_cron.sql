-- Nightly cron: scan parse_events for de-CH correction patterns and
-- alert when any phrase has been corrected ≥ 3 times in 7 days.
-- Prereq: CRON_SECRET must be set in Edge Function secrets and as:
--   ALTER DATABASE postgres SET app.cron_secret = '<value>';

SELECT cron.schedule(
  'dialect-alert-nightly',
  '0 22 * * *',   -- 22:00 UTC = 23:00 CET / 00:00 CEST
  $$
  SELECT net.http_post(
    url     := 'https://jfztyhuagxruhawchfem.supabase.co/functions/v1/dialect-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);
