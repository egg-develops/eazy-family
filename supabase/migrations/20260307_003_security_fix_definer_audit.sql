-- ====================================
-- SECURITY FIX 4: Audit & Harden SECURITY DEFINER Functions
-- ====================================
-- Add explicit RLS checks to SECURITY DEFINER functions to prevent privilege escalation

-- Fix: accept_family_invitation - Add explicit row-level access check
CREATE OR REPLACE FUNCTION public.accept_family_invitation(_invitation_token text, _accepting_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
  _profile RECORD;
  _user_id uuid;
BEGIN
  -- Verify the calling user's identity via auth context
  _user_id := auth.uid();
  
  -- SECURITY: Only the authenticated user can accept invitations for themselves
  IF _accepting_user_id != _user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

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
  SELECT * INTO _profile
  FROM profiles
  WHERE user_id = _accepting_user_id
    AND (email = _invitation.invitee_email OR phone = _invitation.invitee_phone);
    
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'This invitation is not for you');
  END IF;
  
  -- Prevent duplicate family membership
  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = _invitation.family_id AND user_id = _accepting_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this family');
  END IF;

  -- Add user to family with privacy settings respected
  INSERT INTO family_members (
    family_id,
    user_id,
    role,
    inviter_id,
    email,
    phone,
    full_name,
    display_name,
    joined_at
  )
  VALUES (
    _invitation.family_id,
    _accepting_user_id,
    _invitation.role,
    _invitation.inviter_id,
    CASE WHEN _profile.share_email THEN _profile.email ELSE NULL END,
    CASE WHEN _profile.share_phone THEN _profile.phone ELSE NULL END,
    CASE WHEN (_profile.share_email OR _profile.share_phone) THEN _profile.full_name ELSE NULL END,
    _profile.display_name,
    NOW()
  );
  
  -- Mark invitation as accepted
  UPDATE family_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = _invitation.id;
  
  RETURN json_build_object('success', true, 'family_id', _invitation.family_id);
END;
$$;

-- Fix: join_family_with_code - Add explicit user identity verification
CREATE OR REPLACE FUNCTION public.join_family_with_code(_invite_code text, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _family RECORD;
  _existing_member RECORD;
  _profile RECORD;
  _caller_id uuid;
BEGIN
  -- SECURITY: Verify caller is the user they claim to be
  _caller_id := auth.uid();
  IF _user_id != _caller_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Find family by invite code
  SELECT * INTO _family
  FROM families
  WHERE invite_code = upper(trim(_invite_code));
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;
  
  -- Check if user is already a member
  SELECT * INTO _existing_member
  FROM family_members
  WHERE family_id = _family.id AND user_id = _user_id;
  
  IF FOUND THEN
    IF _existing_member.is_active THEN
      RETURN json_build_object('success', false, 'error', 'You are already a member of this family');
    ELSE
      -- Reactivate membership
      UPDATE family_members
      SET is_active = true, joined_at = NOW()
      WHERE id = _existing_member.id;
      
      RETURN json_build_object('success', true, 'family_id', _family.id, 'family_name', _family.name);
    END IF;
  END IF;
  
  -- Get user profile with privacy settings
  SELECT * INTO _profile FROM profiles WHERE user_id = _user_id;
  
  -- Add user to family, only sharing data if privacy settings allow
  INSERT INTO family_members (
    family_id,
    user_id,
    role,
    inviter_id,
    email,
    phone,
    full_name,
    display_name,
    joined_at
  )
  VALUES (
    _family.id,
    _user_id,
    'member',
    _family.created_by,
    CASE WHEN _profile.share_email THEN _profile.email ELSE NULL END,
    CASE WHEN _profile.share_phone THEN _profile.phone ELSE NULL END,
    CASE WHEN (_profile.share_email OR _profile.share_phone) THEN _profile.full_name ELSE NULL END,
    _profile.display_name,
    NOW()
  );
  
  RETURN json_build_object('success', true, 'family_id', _family.id, 'family_name', _family.name);
END;
$$;

-- Revoke direct promo_codes SELECT from authenticated users (was removed in FIX 1)
-- Ensure no SELECT policy exists on promo_codes for authenticated users
REVOKE ALL ON TABLE public.promo_codes FROM authenticated;

-- Grant execute on the atomic promo code function (authenticated users call via edge function)
GRANT EXECUTE ON FUNCTION public.validate_and_increment_promo_code(text, uuid) TO authenticated;

-- Log all SECURITY DEFINER function calls for audit trail
CREATE OR REPLACE FUNCTION public.audit_log_entry(
  _function_name text,
  _user_id uuid,
  _action text,
  _details json
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function can be called by SECURITY DEFINER functions to log sensitive operations
  -- Helps detect unauthorized access attempts or misuse
  INSERT INTO audit_logs (function_name, user_id, action, details, created_at)
  VALUES (_function_name, _user_id, _action, _details, NOW())
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_log_entry(text, uuid, text, json) TO authenticated;
