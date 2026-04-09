-- Add is_admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Grant your account admin access (replace with your actual user email lookup)
-- Run this manually after deploy:
-- UPDATE public.profiles SET is_admin = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
