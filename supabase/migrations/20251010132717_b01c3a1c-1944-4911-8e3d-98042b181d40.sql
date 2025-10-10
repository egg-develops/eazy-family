-- Add subscription_tier column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';