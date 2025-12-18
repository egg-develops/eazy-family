-- Fix SECURITY DEFINER views by recreating with security_invoker=true
-- This ensures the views respect the caller's permissions and RLS policies

-- Fix family_members_safe view
DROP VIEW IF EXISTS public.family_members_safe;
CREATE VIEW public.family_members_safe
WITH (security_invoker=true)
AS
SELECT 
  fm.id,
  fm.family_id,
  fm.user_id,
  fm.role,
  fm.inviter_id,
  fm.is_active,
  fm.joined_at,
  fm.created_at,
  fm.updated_at,
  COALESCE(fm.display_name, 'Family Member') as display_name,
  CASE 
    WHEN p.share_email = true THEN fm.email 
    ELSE NULL 
  END as email,
  CASE 
    WHEN p.share_phone = true THEN fm.phone 
    ELSE NULL 
  END as phone,
  p.share_email,
  p.share_phone
FROM public.family_members fm
LEFT JOIN public.profiles p ON fm.user_id = p.user_id;

GRANT SELECT ON public.family_members_safe TO authenticated;

-- Fix family_invitations_safe view
DROP VIEW IF EXISTS public.family_invitations_safe;
CREATE VIEW public.family_invitations_safe
WITH (security_invoker=true)
AS
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

GRANT SELECT ON public.family_invitations_safe TO authenticated;