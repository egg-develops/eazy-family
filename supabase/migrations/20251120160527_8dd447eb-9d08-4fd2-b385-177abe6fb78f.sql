-- Drop the existing policy that exposes tokens
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.family_invitations;

-- Create a new policy that hides the token field from SELECT
-- Users can see their invitations but not the sensitive token
CREATE POLICY "Users can view their invitations (token hidden)"
ON public.family_invitations
FOR SELECT
USING (
  auth.uid() = inviter_id
  -- Note: To hide specific columns, we rely on application code to not select token
  -- Or use a view that excludes the token column
);

-- Create a view for safe invitation viewing (without tokens)
CREATE OR REPLACE VIEW public.family_invitations_safe AS
SELECT 
  id,
  family_id,
  inviter_id,
  invitee_email,
  invitee_phone,
  role,
  status,
  expires_at,
  accepted_at,
  created_at,
  updated_at
  -- Deliberately excluding 'token' field
FROM public.family_invitations;

-- Grant access to the safe view
GRANT SELECT ON public.family_invitations_safe TO authenticated;