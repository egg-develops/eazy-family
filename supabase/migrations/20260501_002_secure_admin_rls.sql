-- Protect is_admin: prevent users from granting themselves admin via a self-update.
-- The WITH CHECK ensures the new row's is_admin value equals the existing value,
-- so only the service role (which bypasses RLS) can change it.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Allow admins to read all profiles so the /admin dashboard stats are accurate.
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid()) = true
);
