-- User preferences table for cross-device sync
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_preferences"
  ON public.user_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Atomic upsert for a single preference key (avoids race-condition overwrites)
CREATE OR REPLACE FUNCTION public.upsert_preference(
  p_user_id UUID,
  p_key TEXT,
  p_value JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, data, updated_at)
  VALUES (p_user_id, jsonb_build_object(p_key, p_value), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    data = public.user_preferences.data || jsonb_build_object(p_key, p_value),
    updated_at = NOW();
END;
$$;
