-- Admin SELECT policy on parse_events (data already being inserted, just not visible to admin)
CREATE POLICY "parse_events_admin_select"
  ON public.parse_events FOR SELECT
  USING ((SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid()) = true);

-- Guide queries: log every EZ Guide question for roadmap/UX analysis
CREATE TABLE IF NOT EXISTS public.guide_queries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guide_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guide_queries_insert"
  ON public.guide_queries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "guide_queries_admin_select"
  ON public.guide_queries FOR SELECT
  USING ((SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid()) = true);

-- Admin SELECT on user_preferences (for digest opt-in + language distribution)
CREATE POLICY "user_preferences_admin_select"
  ON public.user_preferences FOR SELECT
  USING ((SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid()) = true);

-- Efficient server-side aggregates for admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'users_with_tasks',     (SELECT COUNT(DISTINCT user_id) FROM public.tasks),
    'users_with_captures',  (SELECT COUNT(DISTINCT user_id) FROM public.parse_events),
    'multi_member_groups',  (
      SELECT COUNT(*) FROM (
        SELECT group_id FROM public.group_members GROUP BY group_id HAVING COUNT(*) >= 2
      ) sub
    ),
    'dau', (SELECT COUNT(DISTINCT user_id) FROM public.page_views
            WHERE user_id IS NOT NULL AND created_at >= NOW() - INTERVAL '1 day'),
    'wau', (SELECT COUNT(DISTINCT user_id) FROM public.page_views
            WHERE user_id IS NOT NULL AND created_at >= NOW() - INTERVAL '7 days'),
    'mau', (SELECT COUNT(DISTINCT user_id) FROM public.page_views
            WHERE user_id IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days')
  );
END;
$$;
