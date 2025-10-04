-- Fix family_members and family_invitations RLS policies to properly restrict access

-- Create a security definer function to check if a user belongs to a family
CREATE OR REPLACE FUNCTION public.user_belongs_to_family(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = _family_id
      AND user_id = _user_id
      AND is_active = true
  )
$$;

-- Drop existing insecure policies on family_members
DROP POLICY IF EXISTS "Users can view family members in their family" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert family members they invite" ON public.family_members;
DROP POLICY IF EXISTS "Users can update family members in their family" ON public.family_members;
DROP POLICY IF EXISTS "Users can delete family members they invited" ON public.family_members;

-- Create secure policies for family_members
CREATE POLICY "Users can view family members in their family" 
ON public.family_members 
FOR SELECT 
USING (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Users can insert family members into their family" 
ON public.family_members 
FOR INSERT 
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Users can update family members in their family" 
ON public.family_members 
FOR UPDATE 
USING (public.user_belongs_to_family(auth.uid(), family_id))
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Users can delete family members from their family" 
ON public.family_members 
FOR DELETE 
USING (public.user_belongs_to_family(auth.uid(), family_id));

-- Drop existing insecure policies on family_invitations
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can delete invitations they sent" ON public.family_invitations;

-- Create secure policies for family_invitations
CREATE POLICY "Users can view invitations for their family" 
ON public.family_invitations 
FOR SELECT 
USING (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Users can create invitations for their family" 
ON public.family_invitations 
FOR INSERT 
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Users can update invitations for their family" 
ON public.family_invitations 
FOR UPDATE 
USING (public.user_belongs_to_family(auth.uid(), family_id))
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Users can delete invitations for their family" 
ON public.family_invitations 
FOR DELETE 
USING (public.user_belongs_to_family(auth.uid(), family_id));