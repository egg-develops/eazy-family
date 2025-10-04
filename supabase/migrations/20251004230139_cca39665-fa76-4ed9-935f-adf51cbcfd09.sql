-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create enum for family member roles
CREATE TYPE public.family_member_role AS ENUM ('parent', 'child', 'grandparent', 'caretaker', 'other');

-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Create family_members table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  role family_member_role NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on family_members
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create family_invitations table
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_email TEXT,
  invitee_phone TEXT,
  role family_member_role NOT NULL,
  status invitation_status DEFAULT 'pending',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT email_or_phone_required CHECK (
    invitee_email IS NOT NULL OR invitee_phone IS NOT NULL
  )
);

-- Enable RLS on family_invitations
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (true);

-- Create RLS policies for family_members
CREATE POLICY "Users can view family members in their family"
  ON public.family_members FOR SELECT
  USING (true);

CREATE POLICY "Users can insert family members they invite"
  ON public.family_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update family members in their family"
  ON public.family_members FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete family members they invited"
  ON public.family_members FOR DELETE
  USING (true);

-- Create RLS policies for family_invitations
CREATE POLICY "Users can view invitations they sent"
  ON public.family_invitations FOR SELECT
  USING (true);

CREATE POLICY "Users can create invitations"
  ON public.family_invitations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update invitations they sent"
  ON public.family_invitations FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete invitations they sent"
  ON public.family_invitations FOR DELETE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_invitations_updated_at
  BEFORE UPDATE ON public.family_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_family_invitations_family_id ON public.family_invitations(family_id);
CREATE INDEX idx_family_invitations_token ON public.family_invitations(token);
CREATE INDEX idx_family_invitations_status ON public.family_invitations(status);