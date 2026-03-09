
-- ============================================
-- 1. Events table
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  all_day boolean DEFAULT false,
  location text,
  type text DEFAULT 'event',
  color text DEFAULT 'hsl(220 70% 50%)',
  repeat text,
  travel_time text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON public.events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events (user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events (start_date);

-- ============================================
-- 2. Photos table
-- ============================================
CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  description text,
  file_path text NOT NULL,
  file_url text NOT NULL,
  album text,
  tags text[],
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos" ON public.photos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own photos" ON public.photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own photos" ON public.photos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own photos" ON public.photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_photos_user_id ON public.photos (user_id);

-- ============================================
-- 3. Groups table
-- ============================================
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  image_url text,
  created_by uuid NOT NULL,
  is_public boolean DEFAULT true,
  member_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups" ON public.groups FOR SELECT TO authenticated USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update their groups" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can delete their groups" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups (created_by);

-- ============================================
-- 4. Group members table
-- ============================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members (user_id);

-- ============================================
-- 5. Marketplace items table
-- ============================================
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric(10,2),
  category text,
  condition text,
  image_url text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketplace items" ON public.marketplace_items FOR SELECT TO authenticated USING (status = 'active' OR user_id = auth.uid());
CREATE POLICY "Users can create marketplace items" ON public.marketplace_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own items" ON public.marketplace_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own items" ON public.marketplace_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_user_id ON public.marketplace_items (user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON public.marketplace_items (status);
