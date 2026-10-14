# Implementation plan: members, recurrence, calendar on the server

**Date:** 2026-10-11
**Source:** `rea-nori-product-analysis-2026-10-11.md` items 1 to 3
**Item 4 (per-item reminders)** is in `fixes-backlog.md`, deliberately after this work.

Three changes, one dependency chain. All SQL here is for **manual apply in the Supabase dashboard** — never `supabase db push` (CLAUDE.md §5.16). Migration files go in `supabase/migrations/` for the record only.

---

## 0. Two decisions, and one order change

**We do not need a `family_roles` table.** `family_members` is already one row per person, with `display_name`, `full_name`, a `role` enum and a **nullable `user_id`**. It is Nori's "role" concept under another name. The reason placeholder members don't work is one RLS predicate, not the schema (see Phase 1). Building a parallel roles table would duplicate an identity we already have.

**We do not reuse the legacy `events` table.** It exists (16 rows), but it is the community/local-events feature, has no `family_id`, and is the table that silently broke conflict detection and the morning digest (CLAUDE.md §5.8). A new `calendar_events` table avoids inheriting that confusion. Leave `events` alone; deprecate it separately.

**Order changed from the analysis doc.** I had recurrence third. It should be second, because of something the Add Event form already does:

> `src/pages/Calendar.tsx` renders a **Repeat picker** (`calendar.repeat`, including a "custom" option), stores the choice on the event as `repeat`, and **nothing ever expands it**. A user who picks "Weekly" today gets exactly one event.

That makes recurrence a visible broken promise rather than a new feature, and the expansion helper is a pure function over the item shape, so writing it before the storage move costs almost no rework.

Final order: **members → recurrence → calendar on the server**.

---

## Phase 1 — Members without accounts (≈2 to 3 days)

### The actual bug

```
policy "Users can view limited family member data in their family"
  USING (user_id <> auth.uid() AND user_belongs_to_family(auth.uid(), family_id))
```

`NULL <> uuid` is `NULL`, not `TRUE` (verified against the database, not reasoned). A member row with `user_id IS NULL` satisfies neither this policy nor the "own record" one, so a placeholder member is invisible to **everyone, including the parent who created it**. That is CLAUDE.md §5.14 in one line, and the `user_id <> auth.uid()` clause buys nothing: RLS is row-level, so excluding your own row from a "limited data" policy never limited any columns.

**This is live, not hypothetical: production holds 7 active `family_members` rows with `user_id IS NULL`.** Real families have added people who then vanished from the roster. The policy change below makes those 7 rows appear. Check them before applying — if any are duplicates or test rows, clean them up first, because they will become visible to their families the moment the policy lands.

The back-compat surface is small: only 5 tasks currently carry any assignee at all.

### SQL

```sql
-- 1. Make placeholder members visible to their own family.
drop policy if exists "Users can view limited family member data in their family"
  on public.family_members;

create policy "Users can view members of their family"
  on public.family_members for select
  using (user_belongs_to_family((select auth.uid()), family_id));

-- 2. Let tasks be owned by a member row rather than only by an account.
alter table public.tasks
  add column if not exists assigned_member_ids uuid[],
  add column if not exists created_by_member_id uuid
    references public.family_members(id) on delete set null,
  add column if not exists completed_by_member_id uuid
    references public.family_members(id) on delete set null,
  add column if not exists completed_at timestamptz;

create index if not exists tasks_assigned_member_ids_idx
  on public.tasks using gin (assigned_member_ids);
```

**RLS impact.** Every active family member can now SELECT every member row of their own family, placeholders included. No new columns are exposed (the table already carried `email`/`phone`, and the previous policy already returned them for other members). INSERT/UPDATE/DELETE are unchanged. Cross-member visibility: a child-role account can read the roster, which it already could.

`assigned_member_ids` has no FK (Postgres can't FK an array element); a weekly sweep or an `on delete` trigger on `family_members` should strip removed ids.

### Code

| File | Change |
|---|---|
| `src/lib/ezCapturePersistence.ts` | `resolveAssignees` returns member ids, not user ids; match on `display_name \|\| full_name` for every active member, with or without `user_id`. Keep the fuzzy/nickname matching as is. |
| `src/components/EZCapture.tsx` | `ensureRoster` stops filtering on `m.user_id`; writes `assigned_member_ids`. |
| `src/pages/Lists.tsx` | Assignee pills resolve from member ids, falling back to `assigned_to_users` for old rows. |
| `src/pages/FamilyProfile.tsx` | Add/edit a member with no account (name, role, colour); "invite to claim this profile" issues a `family_invitations` row bound to that member id. |

**Back-compat:** keep writing `assigned_to_users` for one release so an older client still shows assignments. Read both, prefer member ids.

### Verification
- SQL: as the review account, select the roster and assert a placeholder row is returned (it is not today).
- UI: assign a capture to a child with no account, confirm the pill renders for both parents, and that the child's name survives a reload on a second device.
- Add the failing utterance to `intentClassifier.test.ts` per CLAUDE.md.

---

## Phase 2 — Recurrence (≈3 to 4 days)

### Model

Store an RFC 5545 **`rrule` string**, not our ad-hoc `repeat` word. Map the existing `repeat` values on read (`weekly` → `FREQ=WEEKLY`), so stored events keep working and the picker starts meaning something.

```ts
// on the item (localStorage today, calendar_events in phase 3)
rrule?: string;              // "FREQ=WEEKLY;BYDAY=TU"
recurrenceUntil?: string;    // ISO, optional end
exDates?: string[];          // occurrences deleted individually
overrides?: Record<string, Partial<Event>>; // keyed by occurrence start ISO
```

### Expansion

New `src/lib/recurrence.ts`, store-agnostic on purpose:

```ts
expandOccurrences(items: CalendarItem[], rangeStart: Date, rangeEnd: Date): CalendarItem[]
```

Adds `rrule` (the npm package) as a dependency. Every consumer that currently reads the raw array for a date range must go through it — there are exactly four, and missing one is how this feature half-ships:

1. `src/pages/Calendar.tsx` (all views)
2. `src/pages/FamilyAgendaView.tsx`
3. `src/hooks/useConflictDetection.ts`
4. `supabase/functions/morning-digest` — Deno, so it needs the same expansion server-side. Until Phase 3 lands it reads the calendar blob out of `user_preferences`; port the helper or inline a minimal weekly/daily expander there.

### Edit scope

Editing or deleting an occurrence of a series asks the standard question: **this occurrence / this and future / all**. Implementation: `CURRENT` writes an `overrides[occurrenceISO]` entry (or an `exDates` entry for delete), `FUTURE` ends the master with `UNTIL` and creates a new series from that date, `ALL` edits the master.

Three new i18n keys in all six locales: `calendar.recurrenceScope.current`, `.future`, `.all`.

### EZ capture

Add `rrule` to the parse prompt (`src/lib/ezCapturePrompt.ts`) so "football every Tuesday at 5" becomes a series in one capture, and extend `scripts/verify-ez-multi-entry.mjs` with recurrence cases in English and German.

### Tests

`src/lib/recurrence.test.ts`: weekly across a DST boundary, monthly on the 31st, `COUNT` and `UNTIL`, an exdate, an override that moves one occurrence, and an all-day series. These are pure functions, so unit tests are meaningful here (unlike the model-driven EZ behaviour).

---

## Phase 3 — Calendar on the server (≈1 to 1.5 weeks, the risky one)

### Why it is worth the risk

Today's calendar is `localStorage['eazy-family-calendar-items']`, and that key is in `SYNC_KEYS`, so **the entire array round-trips through `user_preferences.data` as one blob, per user**. Two consequences people are living with right now:

- Two devices editing on the same day overwrite each other's whole calendar: last writer wins, silently.
- Family members never see each other's events at all, because preferences are per user.

### Schema

```sql
create table if not exists public.calendar_events (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid references public.families(id) on delete cascade,
  created_by           uuid not null references auth.users(id),
  created_by_member_id uuid references public.family_members(id) on delete set null,
  kind                 text not null default 'event' check (kind in ('event','reminder')),
  title                text not null,
  notes                text,
  location             text,
  start_at             timestamptz not null,
  end_at               timestamptz,
  all_day              boolean not null default false,
  due_time             text,                 -- reminders keep their HH:MM display value
  completed            boolean not null default false,
  priority             text check (priority in ('low','medium','high')),
  color                text,
  tag                  text,
  custom_tag           text,
  travel_time          text,
  visible_to           text not null default 'everyone'
                         check (visible_to in ('everyone','parents','me')),
  attendee_member_ids  uuid[],
  attendee_user_ids    uuid[],               -- kept for a lossless import
  rrule                text,
  recurrence_until     timestamptz,
  ex_dates             timestamptz[],
  overrides            jsonb,
  source               text not null default 'internal'
                         check (source in ('internal','google','outlook','apple')),
  external_id          text,
  apple_calendar_id    text,
  attachments          jsonb,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists calendar_events_family_start_idx
  on public.calendar_events (family_id, start_at) where deleted_at is null;
create index if not exists calendar_events_creator_start_idx
  on public.calendar_events (created_by, start_at) where deleted_at is null;

alter table public.calendar_events enable row level security;

create policy "view own calendar events"
  on public.calendar_events for select
  using ((select auth.uid()) = created_by);

create policy "view family calendar events"
  on public.calendar_events for select
  using (
    family_id is not null
    and visible_to <> 'me'
    and user_belongs_to_family((select auth.uid()), family_id)
    and (
      visible_to = 'everyone'
      or (visible_to = 'parents' and exists (
            select 1 from public.family_members fm
            where fm.user_id = (select auth.uid())
              and fm.family_id = calendar_events.family_id
              and fm.role = any (array['parent','grandparent']::family_member_role[])
              and fm.is_active))
    )
  );

create policy "insert own calendar events"
  on public.calendar_events for insert
  with check (
    (select auth.uid()) = created_by
    and (family_id is null or user_belongs_to_family((select auth.uid()), family_id))
  );

create policy "update family calendar events"
  on public.calendar_events for update
  using (
    (select auth.uid()) = created_by
    or (family_id is not null and visible_to <> 'me'
        and user_belongs_to_family((select auth.uid()), family_id))
  )
  with check (
    (select auth.uid()) = created_by
    or (family_id is not null and visible_to <> 'me'
        and user_belongs_to_family((select auth.uid()), family_id))
  );

create policy "delete family calendar events"
  on public.calendar_events for delete
  using (
    (select auth.uid()) = created_by
    or (family_id is not null and visible_to <> 'me'
        and user_belongs_to_family((select auth.uid()), family_id))
  );
```

**RLS impact.** `visible_to = 'me'` is creator-only; `'parents'` is parent/grandparent only; `'everyone'` is the whole family. Any family member can edit or delete a shared event, matching how shared tasks already behave — if that is too permissive for deletes, tighten the delete policy to creator-plus-parents before applying.

### Import of existing data

The authoritative copy of each user's calendar is the blob in `user_preferences`. Count first:

```sql
select count(*) as users_with_calendar,
       sum(jsonb_array_length(data->'eazy-family-calendar-items')) as items
from public.user_preferences
where jsonb_typeof(data->'eazy-family-calendar-items') = 'array';
```

Then import in one pass (ids that aren't UUIDs get fresh ones; the family comes from the user's active membership):

```sql
insert into public.calendar_events
  (id, family_id, created_by, kind, title, notes, location,
   start_at, end_at, all_day, due_time, completed, color, tag, custom_tag,
   travel_time, visible_to, attendee_user_ids, apple_calendar_id, rrule)
select
  case when e->>'id' ~ '^[0-9a-f-]{36}$' then (e->>'id')::uuid else gen_random_uuid() end,
  fm.family_id,
  up.user_id,
  coalesce(e->>'type','event'),
  coalesce(e->>'title','(untitled)'),
  e->>'notes', e->>'location',
  coalesce((e->>'startDate')::timestamptz, (e->>'dueDate')::timestamptz),
  (e->>'endDate')::timestamptz,
  coalesce((e->>'allDay')::boolean, false),
  e->>'dueTime',
  coalesce((e->>'completed')::boolean, false),
  e->>'color', e->>'tag', e->>'customTag', e->>'travelTime',
  case e->>'visibleTo' when 'parents' then 'parents' when 'me' then 'me' else 'everyone' end,
  (select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(e->'attendees','[]'::jsonb)) x
     where x ~ '^[0-9a-f-]{36}$'),
  e->>'appleCalendarId',
  null
from public.user_preferences up
cross join lateral jsonb_array_elements(up.data->'eazy-family-calendar-items') e
left join lateral (
  select family_id from public.family_members
  where user_id = up.user_id and is_active limit 1
) fm on true
where jsonb_typeof(up.data->'eazy-family-calendar-items') = 'array'
  and coalesce(e->>'startDate', e->>'dueDate') is not null
on conflict (id) do nothing;
```

Run it inside a transaction on a **branch first**, compare counts, then apply to production. Items that exist only on a device and never synced are picked up by the client-side import below.

### Client

New `src/lib/calendarStore.ts`, the only module that talks to `calendar_events`, exposing the **existing `CalendarItem` shape** so Calendar, Agenda, conflict detection and EZ capture keep their current code paths:

- Read: fetch the family's range, write through to `localStorage` as a **cache** (same key, so an offline cold start still renders).
- Write: optimistic local update, then insert/update; on failure, append to an outbox (`eazy-calendar-outbox`) and flush on reconnect and on app resume.
- One-time per device: import any local items whose id is not on the server, then set `eazy-calendar-migrated-v1`.
- Subscribe to Supabase realtime on `calendar_events` for the family, the same pattern `family_messages` already uses, so the other parent's event appears without a refresh.

**Remove `eazy-family-calendar-items` from `SYNC_KEYS` in the same release.** If the blob sync stays, `user_preferences` will keep clobbering the cache and the two mechanisms will fight. This is the single most likely way to lose data in this phase.

Then `morning-digest` and `useConflictDetection` read from the table instead of the blob, which also retires the bug class in CLAUDE.md §5.8.

### Rollback

Keep the blob writes for one release behind `VITE_CALENDAR_SERVER=0`, so a bad release is a flag flip plus a rebuild rather than a data recovery. The imported rows are additive; nothing is deleted from `user_preferences` until a later cleanup release.

---

## Sequencing and effort

| Phase | Work | Rough effort | Gate before shipping |
|---|---|---|---|
| 1 | Members without accounts | 2 to 3 days | Placeholder visible to both parents on two devices |
| 2 | Recurrence | 3 to 4 days | All four consumers expand; `recurrence.test.ts` green; the Repeat picker finally does something |
| 3 | Calendar on the server | 1 to 1.5 weeks | Import counts match; realtime cross-device; offline create then reconnect flushes |

Each phase is independently shippable. Phase 2 before Phase 3 means the expansion helper is written once against a stable item shape; Phase 1 before either means assignment and attendees can reference members from the start, instead of being retrofitted twice.

Per-item reminders (item 4) sit after Phase 3 in `fixes-backlog.md`, for the same reason: write them against the server store or write them twice.
