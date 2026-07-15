-- New-signup experience: a family organizer where ~80% of users had no family,
-- so Family Agenda / Channel / shared lists / family voice capture were all inert
-- until the user happened to visit the Family screen and tap "Create Family".
-- Auto-provision a family on first sign-in (idempotent; the client skips it while
-- a user is joining someone else's family via an invite link).
CREATE OR REPLACE FUNCTION public.ensure_user_has_family()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid  uuid := auth.uid();
  _fid  uuid;
  _name text;
  _fam  text;
  _code text;
BEGIN
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Already in an active family → no-op (idempotent).
  SELECT family_id INTO _fid
    FROM family_members
   WHERE user_id = _uid AND is_active = true
   ORDER BY created_at DESC
   LIMIT 1;
  IF _fid IS NOT NULL THEN
    RETURN _fid;
  END IF;

  SELECT NULLIF(trim(COALESCE(display_name, full_name)), '')
    INTO _name FROM profiles WHERE user_id = _uid;
  _fam  := CASE WHEN _name IS NULL THEN 'My Family' ELSE _name || '''s Family' END;
  _code := public.generate_family_invite_code();

  INSERT INTO families (name, invite_code, created_by)
  VALUES (_fam, _code, _uid)
  RETURNING id INTO _fid;

  INSERT INTO family_members (family_id, user_id, role, inviter_id, display_name, joined_at, is_active)
  VALUES (_fid, _uid, 'parent', _uid, _name, now(), true);

  RETURN _fid;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_user_has_family() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_has_family() TO authenticated;
