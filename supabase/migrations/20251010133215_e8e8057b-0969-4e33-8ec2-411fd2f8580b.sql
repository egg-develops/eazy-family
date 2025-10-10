-- Create families table if not exists
CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on families table
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Create policies for families table
CREATE POLICY "Users can view families they belong to"
  ON public.families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.is_active = true
    )
  );

CREATE POLICY "Users can create their own family"
  ON public.families
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family members can update their family"
  ON public.families
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.is_active = true
    )
  );

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION public.generate_family_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 6 character code (uppercase letters and numbers)
    new_code := upper(substr(md5(random()::text), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM families WHERE invite_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to join family with invite code
CREATE OR REPLACE FUNCTION public.join_family_with_code(
  _invite_code text,
  _user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _family RECORD;
  _existing_member RECORD;
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
    _family.id,
    _user_id,
    'member',
    _family.created_by,
    p.email,
    p.phone,
    p.full_name,
    NOW()
  FROM profiles p
  WHERE p.user_id = _user_id;
  
  RETURN json_build_object('success', true, 'family_id', _family.id, 'family_name', _family.name);
END;
$$;