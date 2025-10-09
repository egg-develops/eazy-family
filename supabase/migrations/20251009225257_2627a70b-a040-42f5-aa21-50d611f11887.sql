-- Fix the INSERT policy for family_members to allow creating a new family
-- The current policy requires user_belongs_to_family which won't work for creating a NEW family
-- We need to allow users to insert themselves as the first member of a new family

DROP POLICY IF EXISTS "Users can insert family members into their family" ON public.family_members;

CREATE POLICY "Users can insert family members into their family"
ON public.family_members
FOR INSERT
WITH CHECK (
  -- Allow if the user is inserting themselves (creating a new family)
  auth.uid() = user_id
  OR
  -- OR if they already belong to the family they're adding someone to
  user_belongs_to_family(auth.uid(), family_id)
);