-- Phase 1 of docs/plan-roles-recurrence-calendar-2026-10-11.md
-- Family members who do not have an account yet.
--
-- APPLY MANUALLY in the Supabase SQL editor. Do NOT `supabase db push`
-- (CLAUDE.md §5.16 — the CLI history is out of sync and would replay ~25
-- migrations). This file exists so the change is in version control.
--
-- Ship order: apply this SQL FIRST, then release the client. An older client
-- ignores the new columns; a newer client inserting `assigned_member_ids`
-- against a database without them would fail every capture.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Make account-less members visible to their own family.
--
-- The old policy read:
--   USING (user_id <> auth.uid() AND user_belongs_to_family(auth.uid(), family_id))
-- `NULL <> uuid` evaluates to NULL, not TRUE, so every row with user_id IS NULL
-- matched neither this policy nor the "own record" one: a member added without
-- an account was invisible to everyone, including the parent who created them.
-- (Production currently holds 7 such rows.) The `user_id <> auth.uid()` test
-- also bought nothing — RLS is row-level, so excluding your own row from a
-- "limited data" policy never limited a single column.
--
-- Verified against production (scripts/verify-member-assignment.mjs), the bug
-- has three symptoms, not one. A member row with user_id NULL can be INSERTed,
-- and after that the family can neither read nor manage it:
--   1. SELECT returns nothing, so the person is missing from every roster.
--   2. INSERT ... RETURNING (supabase-js `.insert().select()`, PostgREST's
--      `Prefer: return=representation`) fails outright with 42501, because the
--      RETURNING clause has to satisfy the SELECT policy. Insert without
--      `.select()` succeeds, which is why the 7 orphans exist at all.
--   3. DELETE and UPDATE filtered by id match zero rows, because locating the
--      row goes through the same SELECT policy — so the orphans cannot even be
--      cleaned up from the app. (PostgREST still answers 204, which is what
--      makes this look like it worked.)
-- All three come from the one predicate below, and all three go away with it.
--
-- Visibility impact: every active member of a family can now SELECT every
-- member row of THAT family, placeholders included. No new columns are exposed
-- (email/phone were already returned for other members, and the
-- family_members_safe view still masks them unless the member opted to share).
drop policy if exists "Users can view limited family member data in their family"
  on public.family_members;

create policy "Users can view members of their family"
  on public.family_members for select
  using (user_belongs_to_family((select auth.uid()), family_id));

-- The "own record" policy stays as-is: it still covers reading your own row.

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Let a task be assigned to a member row rather than only to an account.
--
-- `assigned_to_users` (user ids) stays and is still written for one release so
-- an older client keeps rendering assignments. New writes also set
-- `assigned_member_ids`, which can name a member who has no login.
alter table public.tasks
  add column if not exists assigned_member_ids    uuid[],
  add column if not exists created_by_member_id   uuid references public.family_members(id) on delete set null,
  add column if not exists completed_by_member_id uuid references public.family_members(id) on delete set null,
  add column if not exists completed_at           timestamptz;

-- Postgres cannot foreign-key an array element, so a removed member can leave a
-- dangling id behind. The client skips ids it cannot resolve, which is the same
-- thing it already does for a departed user id.
create index if not exists tasks_assigned_member_ids_idx
  on public.tasks using gin (assigned_member_ids);

comment on column public.tasks.assigned_member_ids is
  'family_members.id values. Preferred over assigned_to_users: can name a member with no account.';
