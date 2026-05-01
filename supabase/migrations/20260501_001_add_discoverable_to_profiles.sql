-- Add discoverable_by_location column to profiles for community privacy setting
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discoverable_by_location BOOLEAN DEFAULT false;
