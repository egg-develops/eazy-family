-- Fix infinite recursion in profiles RLS caused by SELECT policy subquery referencing profiles.
-- The "Admins can view all profiles" SELECT policy used a subquery on profiles,
-- which itself triggers the SELECT policy again → infinite recursion.
--
-- Fix: use auth.jwt() claim instead of a subquery for admin check,
-- and simplify UPDATE policy to avoid any self-referencing subquery.

-- Drop all existing profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Simple, non-recursive SELECT: each user sees their own row; admins see all
CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'is_admin')::boolean = true
);

-- INSERT: users can only insert their own profile
CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own profile; no self-referencing subquery
CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: users can delete their own profile
CREATE POLICY "profiles_delete"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- Ensure all existing profiles have is_admin = false (not NULL)
UPDATE public.profiles SET is_admin = false WHERE is_admin IS NULL;
