-- Move the member avatar to family_members, where the family can actually read it.
--
-- APPLY MANUALLY in the Supabase SQL editor. Do NOT `supabase db push`
-- (CLAUDE.md §5.16). This file exists so the change is in version control.
--
-- This supersedes 20261013000001_profiles_icon_image.sql, which put the avatar on
-- profiles on the assumption that profiles is partly family-readable. It is not.
-- Verified against production:
--   select policyname, qual from pg_policies where tablename='profiles';
--   profiles_select -> (auth.uid() = user_id) OR (auth.jwt()->>'is_admin')::bool
-- Own row or an admin, nothing else, and RLS is row-level so there is no
-- "subset of columns" to expose. Reading the roster as the review account returns
-- 1 of 2 member profile rows: an avatar on profiles can only ever be read back by
-- the person who set it, which is the one thing it is not for.
--
-- family_members is the right home for three reasons:
--   1. It is already family-readable and family-writable (SELECT and UPDATE both
--      use user_belongs_to_family), as of 20261011000001.
--   2. Lists.tsx already selects the member row, so the avatar comes back in the
--      query that is being made anyway: one round trip instead of two.
--   3. A member with no account has no profiles row at all, so an avatar on
--      profiles could never cover the placeholder members that
--      20261011000001 just made visible. Here they get one.
alter table public.family_members
  add column if not exists icon_image text;

comment on column public.family_members.icon_image is
  'Member avatar (data URI or URL). For members with an account it mirrors HomeConfig.iconImage, which is otherwise owner-scoped in user_preferences. Account-less members can carry one too.';

-- RLS impact: none. No policy changes. The new column follows the existing
-- family_members policies, so every active member of a family can read and write
-- it for that family, exactly as they already can for display_name and role.
--
-- Ship order: either order is safe. Lists.tsx falls back to a nameless avatar if
-- the column is missing, and the write is fire-and-forget with a logged error.
--
-- profiles.icon_image (20261013000001) is now unused. It is harmless and left in
-- place; drop it whenever convenient:
--   alter table public.profiles drop column if exists icon_image;
