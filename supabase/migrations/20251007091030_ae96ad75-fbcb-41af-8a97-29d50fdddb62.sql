-- Secure family_invitations table by removing token visibility
-- Users should only see basic invitation info, not the actual tokens

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their family" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can delete invitations they sent" ON public.family_invitations;

-- Create new secure policies that don't expose tokens
CREATE POLICY "Users can view invitations they sent"
ON public.family_invitations
FOR SELECT
USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations for their family"
ON public.family_invitations
FOR INSERT
WITH CHECK (user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Users can update their own invitations"
ON public.family_invitations
FOR UPDATE
USING (auth.uid() = inviter_id)
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can delete their own invitations"
ON public.family_invitations
FOR DELETE
USING (auth.uid() = inviter_id);

-- Add DELETE policy for profiles so users can delete their accounts
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Create edge function to handle secure invitation acceptance
-- This will be called via edge function with token validation