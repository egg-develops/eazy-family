-- AI usage logging
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ai usage" ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all ai usage" ON public.ai_usage_logs FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid()) = true);
CREATE POLICY "Service role insert ai usage" ON public.ai_usage_logs FOR INSERT WITH CHECK (true);

-- Page view tracking
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert page views" ON public.page_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all page views" ON public.page_views FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid()) = true);

-- Storage stats function (reads storage.objects using SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_storage_stats()
RETURNS TABLE(bucket TEXT, file_count BIGINT, total_bytes BIGINT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT bucket_id::TEXT, COUNT(*), COALESCE(SUM((metadata->>'size')::bigint), 0)
  FROM storage.objects WHERE metadata IS NOT NULL GROUP BY bucket_id;
$$;
