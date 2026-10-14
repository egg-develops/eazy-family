# REA teardown #2: Nori's whole product, and where Eazy.Family should move

**Date:** 2026-10-11
**Target:** Nori (heynori.com) web client, complete bundle
**Companion:** `rea-nori-voice-teardown-2026-10-11.md` (voice capture and parsing)

The first teardown covered one feature. This one covers the product: every backend route the web client calls, the domain model behind it, and the architecture choices. Findings are stated as architecture and parameters; no Nori code is reproduced.

---

## 1. Method and coverage

The first pass only had the 58 assets the shell page loads. This pass reconstructed the **chunk id → content hash map out of the webpack runtime** and pulled all **341 lazily-loaded chunks** as well: 399 files, ~18 MB, the whole client including screens a logged-out visitor never reaches.

That matters, because the API client (`1534-*`) is a lazy chunk. It is the single most informative file in the app: it holds the typed client for every backend route.

Two corrections to guard against over-reading a keyword scan:
- An early scan flagged "Ably" in 11 files. **There is no Ably**: the hits were `probably` / `variably`. Nori has no third-party realtime pub/sub.
- The MQTT/WebSocket hits are the **AWS IoT Device SDK** (`IotJobsClientv2`, mqtt5), bundled for their hardware Hub, not for app data sync.

Everything below is from the shipped bundle unless marked inferred. Server behaviour, prompts and IAM policies remain invisible.

---

## 2. Their domain model

This is the real story. Nori's data model is considerably richer than ours, and most of the gap is modelling rather than AI.

### Roles are first class, and that is the keystone

`/families/{id}/roles` is full CRUD. A role is a family member as a *thing in the model*, not an account:
- Tasks carry `assigneeRoleIds`, `creatorRoleId`, `completedByRole` (and separately `completedByUser`).
- Join codes are minted per role, with an expiry: `POST /families/{id}/join_code {family_role_id}`. Inviting by email also names a role.
- The client keeps `ROLE_ORDER` and `UNVISIBLE_ROLE` locally, so a household can order and hide roles.

So a 7-year-old can own tasks, complete them and appear on the calendar without an account, and a login can be attached later by redeeming a role-scoped code. **This is the exact problem our `family_members.user_id = null` hack ran into** (RLS is null-unsafe, so placeholder members are invisible: CLAUDE.md §5.14).

### Tasks

Fields observed on the task model: `title, listId, description, privacyLevel, taskType, tag, icon, credit, due, rrule, assigneeRoleIds, reminders[], attachments[], creatorRoleId, isCompleted, completedAt, completedByRole, completedByUser, isDeleted`.

- `due` is a tagged union: `{kind:"timed", endAt}` or `{kind:"all_day", endOn}`. No ambiguity between "Friday" and "Friday 17:00".
- `rrule` — recurring tasks, not just events.
- `reminders: [{method, minutesOffset}]` — several per task, each with a channel: **app, sms, email, call**.
- `credit` with an `icon_task_credit_star` asset: a points/allowance system for chores.
- `privacyLevel`: `Protected` (0) or `FamilyShared` (1), defaulting to shared.
- `attachments` with file key, name and mime type.
- Soft delete (`isDeleted`), so undo and history survive.
- Task lists are their own resource (`/task-lists` CRUD), plus client-side `FOLDER_ORDER` / `CATEGORY_ORDER`.

Read endpoints are shaped per surface rather than one generic list: `/tasks/list-view`, `/tasks/calendar-view`, `/tasks/owner-view/daily`, and **`/tasks/agent-view`** — a projection built for the LLM to read. Writes include `POST/PATCH/DELETE /tasks/batch`.

### Calendar

- Multiple calendars per family (`/calendar/calendars`), with colour themes (a palette enum of ~17 named colours in "vibrant" and "elegance" families).
- Events carry `recurrenceMasterId` and `occurrenceTime`, and `/calendar/event_occurrences/` expands a series **server-side**.
- Editing a recurring event offers the standard scope choice: `CURRENT | ALL | FUTURE`.
- Events have `attendees`, `attachments`, `location`, `allDay`, `privacyLevel`, and `source` (`Internal` vs external) with `externalEventId` for two-way sync.
- Separate agenda endpoints for a person and for the family: `/calendar/agenda`, `/calendar/family/agenda`.

### External calendar sync, with failure states modelled

`/calendar_sync/google/auth`, `/calendar_sync/outlook/auth`, `/calendar_sync/apple/accounts`, plus `/calendar_sync/accounts` for managing connections. The connection state enum is the interesting part: `init`, `auth_revoked`, `auth_scope_insufficient`, `auth_restricted`. They surface *why* a sync stopped rather than failing quietly.

### Lists, recipes, meals

- Shopping: `/shopping_lists`, `/shoppings/add`, `/shoppings/update`, and `/shoppings/batch_add_by_detail` (one call adds many parsed items — the natural partner to a multi-item voice capture).
- Recipes: `/recipes/gen` (from a URL, pasted content, or an image), collect/uncollect, family recipes, `/recipes/recommend`, tags, and **`/recipes/allergy_tags`** tied to allergies stored on the family profile.
- Meal plans: Breakfast / Lunch / Dinner / Other, `/mealplans/create`, `add_recipes`, `add_recipe_to_mealplans`.

### Family, onboarding, billing

- Family profile: name, email, **location (address + lat/lng)**, **allergies**, avatar; `join_by_code`, `join_email`, `leave`.
- **Email-to-task**: `/families/{id}/setting/add_create_task_email` (plus edit/remove) maintains an allow-list of sender addresses that may create tasks by email.
- Onboarding is a **server-persisted step number** (`GET/POST /users/onboarding`), so it resumes on any device.
- Billing is Stripe-native: plans, checkout session, cancel, re-subscribe, manage payment method, `sync_subscription`, `query_payment_status`, and a family-level subscription.
- Growth plumbing in the client: `UTM_CONVERSION_DATA` (attribution captured client-side), `GRAY_CONFIG` (gray-release / feature flags), `BETA_JOIN_CODE`.
- Odd one out: `SUPERNORI_HA_URL` / `SUPERNORI_HA_TOKEN` — a Home Assistant integration.

### Stack choices

Push is **OneSignal** (linked by external id). Analytics is **Segment + Amplitude + Sentry + Microsoft Clarity + gtag**. The Hub (`/authorize_device`, `CUSTOM_DEVICE_ID`) is provisioned over **AWS IoT**.

---

## 3. The weakness: Nori is not offline in any sense

Searched for and **not found** anywhere in 399 chunks: a service worker, Workbox, an IndexedDB data store, a write queue, or background sync. `navigator.onLine` appears once. No polling or refetch interval either; realtime is scoped to the agent's SSE turn stream, so another member's change shows up on the next fetch.

Their own comparison page concedes "cloud AI requires internet". The bundle agrees: lose connectivity and the product is a shell.

Our localStorage-first core is clumsy in other ways, but it means a parent in a car park with one bar can still read the list and tick things off. **That is the single clearest place where we are structurally ahead, and it is worth making explicit rather than accidental.**

---

## 4. Gap table

| Capability | Nori | Eazy.Family today |
|---|---|---|
| Members without accounts | Roles are first class; tasks assigned to roles | Only real `user_id` rows; placeholder members invisible under RLS |
| Recurring events/tasks | `rrule` on both, server-side occurrence expansion, CURRENT/ALL/FUTURE edits | **None.** Marketing copy promises "recurring reminders" |
| Reminders | Several per task, `minutesOffset`, channels app/sms/email/call | One crude "tomorrow 09:00" calendar item on the Done screen |
| Calendar storage | Server, multi-calendar, attendees, attachments, privacy | **localStorage** (`eazy-family-calendar-items`); no cross-device sync |
| External calendar sync | Google / Outlook / Apple, two-way via `externalEventId`, explicit auth-failure states | Google / Outlook / Apple connect flows exist; no two-way identity on items |
| Task structure | Lists, tags, icons, attachments, privacy, soft delete, batch ops | `type` + `parent_id`, assignees, due date |
| Chore rewards | `credit` points per task | None (rituals are the nearest thing) |
| Email intake | Allow-listed senders create tasks by email | None |
| Recipes / meal plans | Full subsystem incl. allergy tags and AI recipe import | None |
| Offline | **None** | localStorage core keeps working |
| Voice languages | English only | **6 languages** |
| Multi-item capture | `combined_*` agent tools, `batch_add_by_detail` | Shipped today (this engagement) |
| Onboarding | Server-persisted, resumable | Local only |
| Push | OneSignal | Capacitor local notifications + email digest |

---

## 5. What I would do, in order

**1. Roles for members without accounts — medium, unblocks the most.**
A `family_roles` table (name, colour, avatar, order, visible) with tasks and events referencing `role_id` alongside `user_id`, and join codes minted per role. This removes the `user_id = null` RLS trap, lets kids own and complete tasks, and makes every later feature (credits, per-role agendas, role-scoped reminders) possible. Everything else on this list is easier afterwards.

**2. Recurrence — medium/high, and we already advertise it.**
`rrule` on events and tasks, expansion in a shared helper, and the CURRENT/ALL/FUTURE edit scope. Our own store copy promises "recurring reminders" that the product does not implement; that is the gap I would close first on principle. `rrule.js` plus our existing chrono parsing gets most of the way, and EZ capture can then accept "every Tuesday".

**3. Move the calendar into Supabase — high effort, highest structural payoff.**
The localStorage calendar is our deepest debt: no cross-device sync, and per memory it has already caused two silent failures (conflict detection and the morning digest read the wrong source). A `calendar_events` table with RLS mirrors the tasks model we already run, and keeps a localStorage cache as the offline layer so we *keep* the offline advantage instead of trading it away. Do this after roles, before recurrence, if you want the recurrence work to land once rather than twice.

**4. Real reminders — small/medium.**
`reminders[{offsetMinutes, channel}]` per task and event. Ship `app` (Capacitor local notifications) and `email` (we already have the digest function); skip sms and call, which carry cost and consent burden for little gain in our market.

**5. Email-to-task — medium, high delight.**
An allow-listed sender address per family, an inbound-email provider pointed at a Supabase function, and the existing parser does the rest. School letters and appointment confirmations become tasks without anyone typing. This reuses the parse pipeline we just rebuilt.

**6. Chore credits — small, and distinctly "family".**
A `credit` integer on tasks plus a per-role running total. It pairs naturally with Rituals, and it is the kind of thing parents tell other parents about.

**7. Sync-account failure states — small reliability win.**
Model `auth_revoked` / `auth_scope_insufficient` / `auth_restricted` and surface them in Settings. A silently dead calendar connection is one of the fastest ways to lose a paying family.

**8. Batch shopping adds — small.**
One insert call for many parsed items, matching the multi-entry capture that now exists.

**9. Resumable onboarding — small.**
Persist the onboarding step in `user_preferences` so switching device mid-signup does not restart it.

### Do not copy

The hardware Hub and its AWS IoT provisioning; Home Assistant; sms and phone-call reminders; browser-held cloud credentials (teardown #1); a chat thread as the primary surface; and their offline story, which does not exist.

### Double down on

Offline tolerance, six-language voice and UI, Swiss-German dialect handling, and the do-then-suggest capture flow. Nori has none of those, and two of them are hard for them to retrofit: their entire product assumes a live connection and an English speaker.
