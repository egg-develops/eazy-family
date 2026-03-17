
-- Create referrals table to track referral codes used on signup
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

-- Add referral_code column to profiles for storing each user's referral code
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies: users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view referrals they made" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users can view referrals for them" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referred_user_id);

-- Allow inserts from authenticated users (when signing up with referral code)
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_user_id);

-- Allow updates for reward processing
CREATE POLICY "Users can update own referrals" ON public.referrals
  FOR UPDATE TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);
