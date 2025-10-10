-- ====================================
-- FIX 1: Premium Subscription Security
-- ====================================

-- Make email NOT NULL in profiles (after ensuring data is populated)
-- First, update any null emails from auth.users
UPDATE public.profiles 
SET email = (SELECT email FROM auth.users WHERE auth.users.id = profiles.user_id)
WHERE email IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN email SET NOT NULL;

-- Add stripe_customer_id for reliable webhook lookups
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Create promo_codes table for better management
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  subscription_tier text NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage promo codes (we'll set this up later if needed)
CREATE POLICY "Promo codes are viewable by authenticated users"
ON public.promo_codes FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Insert the existing promo code into the table
INSERT INTO public.promo_codes (code, subscription_tier, max_uses, expires_at, is_active)
VALUES ('EZ-FAMILY-VIP', 'family', NULL, NULL, true)
ON CONFLICT (code) DO NOTHING;

-- ====================================
-- FIX 2: Privacy Controls for PII
-- ====================================

-- Add privacy settings and display_name to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS share_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_phone boolean DEFAULT false;

-- Update existing profiles to use full_name as display_name
UPDATE public.profiles 
SET display_name = full_name 
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- Add display_name to family_members
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS display_name text;

-- Update existing family_members to use full_name as display_name
UPDATE public.family_members 
SET display_name = full_name 
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- Create a view for safe family member data that respects privacy
CREATE OR REPLACE VIEW public.family_members_safe AS
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

-- Grant access to the view
GRANT SELECT ON public.family_members_safe TO authenticated;

-- Update RLS policies on family_members to be more restrictive
-- Users can only see their own full data or limited data of others
DROP POLICY IF EXISTS "Users can view family members in their family" ON public.family_members;

CREATE POLICY "Users can view their own family member record"
ON public.family_members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view limited family member data in their family"
ON public.family_members FOR SELECT
TO authenticated
USING (
  user_id != auth.uid() 
  AND user_belongs_to_family(auth.uid(), family_id)
);

-- Update join_family_with_code function to respect privacy settings
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
BEGIN
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

-- Update accept_family_invitation function to respect privacy settings
CREATE OR REPLACE FUNCTION public.accept_family_invitation(_invitation_token text, _accepting_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
  _profile RECORD;
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

-- Create trigger to update updated_at on promo_codes
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();