-- ====================================
-- Core Features Tables
-- ====================================
-- Add tables for events, photos, groups, and marketplace items

-- Events table - for calendar events that can be shared across families
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  all_day boolean DEFAULT false,
  color text DEFAULT 'hsl(220 70% 50%)',
  repeat text,
  travel_time text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Photos table - for storing photo metadata and references
CREATE TABLE IF NOT EXISTS public.photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  title text,
  storage_path text NOT NULL,
  thumbnail_path text,
  location text,
  date_taken timestamp with time zone,
  tags text[] DEFAULT '{}',
  ai_enhanced boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Groups table - for community groups
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  member_count integer DEFAULT 1,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Group members table - join table for group membership
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Marketplace items table
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price text,
  condition text DEFAULT 'good',
  category text DEFAULT 'other',
  images text[],
  posted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS events_user_id_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_family_id_idx ON public.events(family_id);
CREATE INDEX IF NOT EXISTS events_start_date_idx ON public.events(start_date);

CREATE INDEX IF NOT EXISTS photos_user_id_idx ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS photos_family_id_idx ON public.photos(family_id);
CREATE INDEX IF NOT EXISTS photos_date_taken_idx ON public.photos(date_taken);

CREATE INDEX IF NOT EXISTS groups_creator_id_idx ON public.groups(creator_id);
CREATE INDEX IF NOT EXISTS groups_family_id_idx ON public.groups(family_id);

CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON public.group_members(user_id);

CREATE INDEX IF NOT EXISTS marketplace_items_seller_id_idx ON public.marketplace_items(seller_id);
CREATE INDEX IF NOT EXISTS marketplace_items_family_id_idx ON public.marketplace_items(family_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view their own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id OR family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for photos
CREATE POLICY "Users can view their own photos" ON public.photos
  FOR SELECT USING (auth.uid() = user_id OR family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own photos" ON public.photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" ON public.photos
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" ON public.photos
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for groups
CREATE POLICY "Users can view public groups or groups they're members of" ON public.groups
  FOR SELECT USING (
    is_public OR 
    auth.uid() = creator_id OR 
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own groups" ON public.groups
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own groups" ON public.groups
  FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for group_members
CREATE POLICY "Users can view group members" ON public.group_members
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM public.groups WHERE is_public = true OR auth.uid() = creator_id
    ) OR
    auth.uid() IN (SELECT user_id FROM public.group_members WHERE group_id = group_id)
  );

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for marketplace_items
CREATE POLICY "Users can view marketplace items" ON public.marketplace_items
  FOR SELECT USING (true);

CREATE POLICY "Users can create marketplace items" ON public.marketplace_items
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own marketplace items" ON public.marketplace_items
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own marketplace items" ON public.marketplace_items
  FOR DELETE USING (auth.uid() = seller_id);
