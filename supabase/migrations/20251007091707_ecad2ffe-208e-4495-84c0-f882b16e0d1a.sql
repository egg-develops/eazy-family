-- Add comment to document the secure invitation pattern
COMMENT ON TABLE public.family_invitations IS 
'Invitation tokens are intentionally NOT exposed via SELECT queries. 
Invitations must be accepted through the accept-invitation edge function 
which validates tokens server-side using the service role, preventing token exposure.
This is a secure-by-design pattern.';

-- Ensure the RLS policies are correct (they already are, but let's verify)
-- Users can only see invitations they sent (not tokens of invitations they received)
-- This prevents token enumeration attacks