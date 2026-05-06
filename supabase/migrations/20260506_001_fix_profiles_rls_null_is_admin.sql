-- Fix: profiles update policy fails when is_admin is NULL (NULL = false evaluates to NULL, not true)
-- Use IS NOT DISTINCT FROM to handle NULL safely, and coalesce in subquery
UPDATE public.profiles SET is_admin = false WHERE is_admin IS NULL;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(is_admin, false) IS NOT DISTINCT FROM (
    SELECT COALESCE(p.is_admin, false) FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);
