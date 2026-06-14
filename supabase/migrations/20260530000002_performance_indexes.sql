-- Performance indexes for scale
-- All use IF NOT EXISTS so safe to re-run

-- tasks: hottest table — queried by user, completion state, and type on every page load
CREATE INDEX IF NOT EXISTS tasks_user_completed_type_idx
  ON public.tasks (user_id, completed, type);

-- partial index for the morning digest stuck-task query (completed=false tasks only)
CREATE INDEX IF NOT EXISTS tasks_user_type_updated_partial_idx
  ON public.tasks (user_id, type, updated_at)
  WHERE completed = false;

-- events: always queried by user + date range
CREATE INDEX IF NOT EXISTS events_user_start_date_idx
  ON public.events (user_id, start_date);

-- page_views: admin retention queries + top-pages aggregation
CREATE INDEX IF NOT EXISTS page_views_created_at_idx
  ON public.page_views (created_at DESC);

CREATE INDEX IF NOT EXISTS page_views_user_created_idx
  ON public.page_views (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- parse_events: growing with every EZ Capture; queried by user + date in admin
CREATE INDEX IF NOT EXISTS parse_events_user_created_idx
  ON public.parse_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS parse_events_created_at_idx
  ON public.parse_events (created_at DESC);

-- guide_queries: new table, queried by date in admin
CREATE INDEX IF NOT EXISTS guide_queries_created_at_idx
  ON public.guide_queries (created_at DESC);

CREATE INDEX IF NOT EXISTS guide_queries_user_idx
  ON public.guide_queries (user_id);

-- ai_usage_logs: admin queries by date
CREATE INDEX IF NOT EXISTS ai_usage_logs_created_at_idx
  ON public.ai_usage_logs (created_at DESC);

-- group_members: feature adoption query (groups with 2+ members)
CREATE INDEX IF NOT EXISTS group_members_group_id_idx
  ON public.group_members (group_id);
