-- Fix two bugs in join_family_with_code that broke joining a family by invite code:
--   1) It inserted role 'member', which is NOT a valid family_member_role enum
--      value (parent|child|grandparent|caretaker|other) → every join threw
--      `invalid input value for enum family_member_role: "member"` → the app
--      showed "Failed to join family". role gates no permissions and the family
--      creator uses 'parent', so joiners now default to 'parent'.
--   2) The app assumes ONE active family per user (family_members lookups use
--      .maybeSingle(), which errors on 2 rows). A user who onboarded first has an
--      auto-created family, so joining a second one left them in two active
--      families and broke family features. Joining now deactivates the user's
--      other active memberships so exactly one stays active.
CREATE OR REPLACE FUNCTION public.join_family_with_code(_invite_code text, _user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _family RECORD;
  _existing_member RECORD;
  _profile RECORD;
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  IF _user_id != _caller_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO _family FROM families WHERE invite_code = upper(trim(_invite_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- The app supports one active family per user; leave any others on join.
  UPDATE family_members SET is_active = false
   WHERE user_id = _user_id AND family_id <> _family.id AND is_active = true;

  SELECT * INTO _existing_member FROM family_members
  WHERE family_id = _family.id AND user_id = _user_id;

  IF FOUND THEN
    IF _existing_member.is_active THEN
      RETURN json_build_object('success', false, 'error', 'You are already a member of this family');
    ELSE
      UPDATE family_members SET is_active = true, joined_at = NOW() WHERE id = _existing_member.id;
    END IF;
  ELSE
    SELECT * INTO _profile FROM profiles WHERE user_id = _user_id;

    INSERT INTO family_members (
      family_id, user_id, role, inviter_id, email, phone, full_name, display_name, joined_at
    )
    VALUES (
      _family.id, _user_id, 'parent', _family.created_by,
      CASE WHEN _profile.share_email THEN _profile.email ELSE NULL END,
      CASE WHEN _profile.share_phone THEN _profile.phone ELSE NULL END,
      CASE WHEN (_profile.share_email OR _profile.share_phone) THEN _profile.full_name ELSE NULL END,
      _profile.display_name, NOW()
    );
  END IF;

  RETURN json_build_object('success', true, 'family_id', _family.id, 'family_name', _family.name);
END;
$function$;
