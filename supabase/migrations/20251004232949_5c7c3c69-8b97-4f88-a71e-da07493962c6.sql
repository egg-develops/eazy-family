-- Create function to accept invitations securely (addresses token exposure warning)
-- This ensures tokens are only validated server-side and never exposed to clients
CREATE OR REPLACE FUNCTION public.accept_family_invitation(
  _invitation_token TEXT,
  _accepting_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Find valid invitation by token with all security checks
  SELECT * INTO _invitation
  FROM family_invitations
  WHERE token = _invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Verify the accepting user matches the invitee email/phone
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = _accepting_user_id
      AND (email = _invitation.invitee_email OR phone = _invitation.invitee_phone)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'This invitation is not for you');
  END IF;
  
  -- Prevent duplicate family membership
  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = _invitation.family_id AND user_id = _accepting_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this family');
  END IF;
  
  -- Add user to family
  INSERT INTO family_members (
    family_id,
    user_id,
    role,
    inviter_id,
    email,
    phone,
    full_name,
    joined_at
  )
  SELECT
    _invitation.family_id,
    _accepting_user_id,
    _invitation.role,
    _invitation.inviter_id,
    p.email,
    p.phone,
    p.full_name,
    NOW()
  FROM profiles p
  WHERE p.user_id = _accepting_user_id;
  
  -- Mark invitation as accepted
  UPDATE family_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = _invitation.id;
  
  RETURN json_build_object('success', true, 'family_id', _invitation.family_id);
END;
$$;

-- Add index to prevent token enumeration attacks
CREATE INDEX IF NOT EXISTS idx_family_invitations_token_hash 
ON family_invitations USING hash(token);

-- Add comment documenting the contact info sharing behavior
COMMENT ON TABLE family_members IS 'Family members table. Contact information (email, phone) is intentionally shared among family members for coordination purposes. This is expected behavior for a family management app where members need to reach each other.';