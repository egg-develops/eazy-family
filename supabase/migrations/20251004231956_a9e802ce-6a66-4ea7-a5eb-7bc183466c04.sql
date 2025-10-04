-- Fix family_invitations RLS to prevent token theft
-- Only allow users to view invitations they created or that are specifically for them

-- Drop existing invitation policies
DROP POLICY IF EXISTS "Users can view invitations for their family" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can update invitations for their family" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can delete invitations for their family" ON public.family_invitations;

-- Create secure SELECT policy: users can only view invitations they sent or that match their email/phone
CREATE POLICY "Users can view invitations they sent or received" 
ON public.family_invitations 
FOR SELECT 
USING (
  auth.uid() = inviter_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.email = family_invitations.invitee_email 
      OR profiles.phone = family_invitations.invitee_phone
    )
  )
);

-- Create secure UPDATE policy: only the inviter can update
CREATE POLICY "Users can update invitations they sent" 
ON public.family_invitations 
FOR UPDATE 
USING (auth.uid() = inviter_id)
WITH CHECK (auth.uid() = inviter_id);

-- Create secure DELETE policy: only the inviter can delete
CREATE POLICY "Users can delete invitations they sent" 
ON public.family_invitations 
FOR DELETE 
USING (auth.uid() = inviter_id);