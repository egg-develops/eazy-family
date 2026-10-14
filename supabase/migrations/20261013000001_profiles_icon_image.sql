-- Add profiles.icon_image: the member avatar the rest of the family can read.
--
-- SUPERSEDED by 20261013000002_family_members_icon_image.sql. This was applied to
-- production on 2026-10-13 and the column still exists, but nothing reads or writes
-- it: the premise below ("profiles exposes a subset of columns to family members")
-- is wrong. profiles_select is own-row-or-admin, so an avatar here is readable only
-- by the person who set it. The avatar now lives on family_members. Kept as the
-- record of what was applied; the newer file has the drop statement.
--
-- APPLY MANUALLY in the Supabase SQL editor. Do NOT `supabase db push`
-- (CLAUDE.md §5.16). This file exists so the change is in version control.
--
-- Background. The client read and wrote TWO columns that have never existed on
-- profiles: `home_config` and `family_id`. Reads returned 42703, writes PGRST204.
-- PostgREST fails the WHOLE select when one column is unknown, so everything else
-- in those selects was collateral damage: three silent failures, none of which
-- looked anything like a missing column.
--   1. App.tsx selected 'home_config, family_id' — BOTH phantom — so
--      setSeedFamilyId never ran, and useWelcomeSeed gates its family inserts on
--      `if (familyId)` (src/hooks/useWelcomeSeed.ts:261): a brand new family
--      silently never received its welcome content. The family link actually lives
--      on family_members.family_id, so that read now queries family_members.
--   2. Settings.tsx selected 'display_name, home_config' -> null, so setDisplayName
--      never ran: Settings showed a stale or empty name.
--   3. Lists.tsx selected 'user_id, display_name, home_config' -> undefined, so
--      member avatars never rendered.
--
-- The fix was mostly client-side, because home config did not belong on profiles
-- at all: 'eazy-family-home-config' is a SYNC_KEYS entry in
-- src/lib/preferencesSync.ts, so it already persists to `user_preferences` and is
-- restored on login on any device. profiles.home_config was a duplicate source of
-- truth. Those reads and writes are gone.
--
-- What genuinely needed a column is the avatar. Lists.tsx draws OTHER members'
-- pictures, and `user_preferences` is RLS-scoped to its owner, so one member can
-- never read another's avatar from there. Hence one narrow column instead of
-- mirroring all 17 HomeConfig fields into a table the family can read. The table
-- it belongs in is family_members, not this one: see 20261013000002.
alter table public.profiles
  add column if not exists icon_image text;

comment on column public.profiles.icon_image is
  'Member avatar (data URI or URL), mirrored from HomeConfig.iconImage. Lives here, not in user_preferences, because other family members must be able to read it.';

-- RLS impact: no policy change, and none was enough. profiles restricts BOTH reads
-- and writes to the owner, so this column was never family-readable. That is the
-- error 20261013000002 fixes.
