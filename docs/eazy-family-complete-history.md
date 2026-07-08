# Eazy.Family — Complete Work & Engineering History

**Last updated:** 8 July 2026
**Purpose:** A single, self-contained record of the work done on Eazy.Family in the
Claude Code CLI, written so it can be pasted into Claude Chat (or read by a future
Claude Code session) to inherit full context. Most of this work happened in the CLI;
this document is the bridge to Chat.

---

## 0. How to use this document
- **Sections 1–2** are the durable mental models — read these first; they explain
  *why* most bugs happened.
- **Section 3** is the work log, grouped by theme with root cause → fix →
  verification.
- **Section 4** is the distilled rulebook (also enforced live in the repo's
  `CLAUDE.md`).
- **Sections 5–6** are open items and where everything lives.

---

## 1. The app at a glance

**Eazy.Family** is a React/TypeScript family-organizer app (`/Users/hq/eazy-family`):
calendar sync, shared shopping/tasks, a voice "EZ" capture button, a family channel,
rituals/journal, community/marketplace, and paid subscriptions.

- **Stack:** Vite + React 18 + TypeScript; Tailwind + shadcn/Radix UI; TanStack
  Query; React Router v6.
- **Mobile:** Capacitor 8 wraps the web build into native iOS + Android (haptics,
  speech-recognition, apple-sign-in, calendar, RevenueCat IAP).
- **Backend:** Supabase — Postgres (with RLS), Auth, Edge Functions (Deno).
  Project ref `jfztyhuagxruhawchfem`.
- **i18n:** 6 full locales (en, de, fr, es, it, pt) as UTF-8 literal JSON, plus a
  sparse `en-GB` override. ~1500 keys each.
- **Delivery:** web via Vercel (auto-deploy on push to `main`); iOS via GitHub
  Actions → TestFlight; Android via GitHub Actions → Play.

**Key files worth knowing:**
- `src/pages/App.tsx` — authenticated shell + home screen (AppHome), the EZ button.
- `src/pages/Lists.tsx` — **THE live tasks + shopping screen** (`/app/todos` and
  `/app/shopping` redirect here). `Shopping.tsx`/`ToDoList.tsx` were dead and were
  **deleted 2026-07-02**.
- `src/pages/Calendar.tsx` — main calendar; events live in **localStorage**, not a
  Supabase table.
- `src/lib/intelligence.ts` — EZ "smart logic" (predictions, conflicts, stale tasks).
- `src/lib/intentClassifier.ts`, `ezCapturePersistence.ts`, `ezCaptureType.ts` —
  EZ capture classification/routing.
- `src/lib/speechLocale.ts`, `localeChrono.ts` — single source of truth for voice
  locale + localized date parsing.
- `src/lib/preferencesSync.ts` — `cloudSet` + `SYNC_KEYS` (cloud-synced localStorage).

---

## 2. Two mental models that explain most bugs

### 2a. Persistence is split three ways
- **Supabase tables:** `tasks` (personal `task`, shared `shared`+`parent_id`,
  `shopping_personal`, shared `shopping`), `families`, `family_members`, `profiles`,
  `family_messages`.
- **localStorage only:** calendar events (`eazy-family-calendar-items`), journal,
  rituals. The Calendar does **not** use a Supabase `events` table (that table is the
  separate community/local-events feature). Reading calendar/conflict data from
  `events` is a recurring bug (see §3B).
- **Cloud-synced localStorage:** keys in `SYNC_KEYS` round-trip through
  `user_preferences` via `cloudSet(key, value)`.

### 2b. A fix in the repo is not a fix on the device
The single biggest time-sink across this project: "we fixed this and it's broken
again" is **almost always a stale client**, not a logic bug. Causes seen and fixed:
- A silently **broken CI pipeline** (npm ci peer-dep failure) meant merged fixes
  never built for weeks.
- **Unmerged branches** — fixes sat 6 commits ahead of `main`, never shipped.
- **Missing CI build env** — Vite inlines `VITE_*` at build time; without repo
  secrets the bundle shipped an undefined Supabase URL → white screen on launch.
- **Service-worker cache** serving old JS; **iOS** archiving a stale `public/`
  bundle.

**Rule:** after a push, "still broken" is a *delivery* question until proven
otherwise — check the build succeeded and the client has the new bundle before
touching code again.

---

## 3. Work log by theme

### A. Store submission, auth, and the release pipeline

- **Sign in with Apple (fixed the repeated 2.1(a) rejections).** Native Apple login
  broke unless *both*: (1) the app **bundle id `eazy.family.app`** is in Supabase's
  Apple provider **Client IDs** (the native identity token's `aud` is the bundle id,
  not the web Services ID `eazy.family.app.signin`); (2) the native flow passes a
  **nonce** (SHA-256 to Apple, raw to `signInWithIdToken`). Added the Apple/Google
  buttons to `Auth.tsx` too (returning users were previously locked out).
- **StoreKit currency "wrong currency" reports.** Not a bug: subscription price
  currency follows the **App Store account region** of the Apple ID on the device
  (US sandbox testers see USD in Zürich). Fix in `UpgradeDialog.tsx`: display
  StoreKit's `priceString` verbatim and derive "save X" from native prices — never
  mix a hardcoded CHF constant with a native price (that showed "$44.99/yr" next to
  "Save CHF 15").
- **Pre-submission cold-path checklist.** Auth providers + IAP depend on config
  *outside* the codebase and a *fresh* identity, so automation can't cover them.
  Before every submit: fresh install + brand-new account per provider (de-authorize
  Apple first), test Apple/Google/email/guest sign-in, and confirm the paywall loads
  prices + a sandbox purchase completes. **Time-bomb:** the Apple client secret in
  Supabase is a JWT valid ≤6 months — when it expires, *every* Apple login fails.
- **iOS TestFlight CI failure modes that are Apple/GitHub-side (don't "fix" code):**
  (1) "required agreement missing/expired" — only the Account Holder can sign it in
  ASC; takes 15–60 min to propagate. (2) altool reports failure but the binary
  actually uploaded (Apple 500 on the status poll) — check TestFlight before
  re-running to avoid duplicates. (3) "job not acquired by runner" — GitHub capacity;
  just re-run.
- **Android versionCode discipline.** CI auto-bumps `versionCode` by **+1** on every
  build and commits it back with `[skip ci]`. A manual **+1 collides** with a code CI
  will consume ("versionCode already used" on Play) — so **manual bumps jump by +10**.
  The CI bump-back step was also fixed to `git pull --rebase --autostash` (the web
  build left unstaged changes that aborted the rebase after upload).

### B. EZ voice capture & "smart logic"

- **EZ capture was hard-locking to calendar Events.** In `EZCapture.tsx`,
  `userLockedType` was seeded from `defaultType` (which falls through to `'event'` on
  Home), suppressing the classifier — so "add bananas to my shopping list" became an
  Event. Fix in `ezCaptureType.ts`: `defaultType` seeds only the starting type;
  `userLockedType` stays null (auto-classify). **Lesson:** the classifier unit tests
  were always green because they bypass the component lock — reproduce EZ bugs in the
  actual UI, not just the classifier.
- **Roster race on "assign to X".** Assignment/shared-shopping/@mention capture
  degraded to a personal item with no assignee — a **load race**: `EZCapture` loaded
  the family roster in an async effect, and a quick capture fired before it resolved.
  Fix: resolve inline via `ensureRoster()` (queries `family_members` on demand), not
  from React state. Same "re-fetch on mount" class fixed elsewhere with module caches
  (channel, upgrade offerings).
- **Voice locale key mismatch.** Non-English voice produced phonetic-English garbage
  because `getUserLocale()` read `i18nextLng` (never written) instead of
  `eazy-family-language` (what the Settings toggle writes). **Rule:** anything
  locale-dependent reads `eazy-family-language`. Consolidated into
  `src/lib/speechLocale.ts`.
- **Cross-account settings bleed.** `loadCloudPreferences` was additive-only, so
  signing in as user B kept user A's language. Fix: login now reconciles **every**
  `SYNC_KEY` authoritatively — apply if present in the new user's cloud row, **clear
  if absent** (respecting `_local_` this-session markers).
- **JS `\b` is ASCII-only.** Multilingual regexes silently failed on accented words
  ("para mí", "amanhã", "lunedì") → e.g. Spanish personal-scope items routed to the
  shared list. **Rule:** use `(?<!\p{L})…(?!\p{L})` with `/u`, never `\b`, for
  de/fr/it/es/pt text.
- **Smart logic corrected:**
  - *Shopping predictions* fired on noisy history (new accounts showed junk). Raised
    the bar (≥3 purchases over ≥14 days, regular cadence, ≥25% past due) + emoji/case
    normalization; a fresh account now shows nothing.
  - *Conflict detection was dead* — it queried the Supabase `events` table instead of
    the real localStorage calendar. Fixed to read `eazy-family-calendar-items` and
    recompute on calendar/prefs events.
  - *Category guessing* was English-only (everything fell to Other/Personal) → now
    matches keywords across all 6 languages.
- **Morning digest overhaul.** Read the real localStorage calendar (was querying the
  community `events` table → always "Nothing scheduled"); made `CRON_SECRET` required
  with a Bearer header on the pg_cron job (the endpoint had been effectively public);
  added per-user timezone via a new `eazy-timezone` SYNC_KEY.

### C. UI / UX system

- **Global 44px tap-target rule was inflating every control.** A
  `@media (pointer: coarse)` rule forced all buttons to 44×44px on *touch devices
  only* — so it looked perfect on the dev machine and broke only on phones, which is
  why component-level shrinks "never stuck." Fix: gated the 44px behind
  `html.large-tap-targets` (default off), added a **"Larger touch targets"** Settings
  toggle (cloud-synced), and a `.tap-pad` utility that gives tiny controls a ≥24px hit
  area without changing their look. (44px is WCAG AAA/aspirational; 24px is the AA
  baseline.)
- **Chunky-elegant sizing preference.** The user wants bigger fonts/controls while
  staying elegant — size to the roomier end, never truncate.
- **EZ button gesture system.** Remapped to: **1 tap → radial menu**; **long press →
  EZ Capture**; **long-press + drag → reposition** the button. Added tap-again to
  close, finger-slide to scroll-select menu items (active item highlights), and
  elegant per-action haptics.
- **Homepage became reorderable + toggleable.** Extracted modules into a
  `renderHomeModule(key)` switch driven by `homeModuleOrder` (persisted, with missing
  keys auto-appended for upgrade safety); Settings got a drag-reorder list with
  per-module visibility toggles. Added the **Overdue Tasks** module (default last).
- **Family Agenda fixes.** Items weren't tappable and used a `d >= now` filter that
  dropped earlier-today events (and made "View All" disagree with the home card).
  Fixed to `d >= startOfDay(now)` on both surfaces; rows became buttons that deep-link
  to the calendar date.
- **Grip-drag reordering (multi-round).** The Settings reorder handles wouldn't drag
  on iOS. Root cause: **React registers `onTouchStart/Move` as passive**, so
  `preventDefault()` is a silent no-op and iOS claims the touch for scroll. Fix:
  native non-passive listeners (`addEventListener(..., { passive: false })`) via
  `useEffect` on a container ref, with `data-*` attributes for hit-testing; pointer
  handlers kept for desktop, guarded by `pointerType !== 'touch'`. Then polished:
  reversed the Settings order to match the (flex-col-reverse) menu, replaced the
  faded "dragging" style (read as disabled) with a bold ring + tint + scale, and
  removed redundant letter chips. Verified with a Playwright + CDP emulated-touch
  harness (`scripts/test-grip-drag.mjs`).
- **Duplicate gallery** removed (a hardcoded block left behind after the module
  refactor also rendered it via the module map).

### D. Delivery / infra incidents & tooling

- **Broken CI pipeline** (npm ci peer-dep conflict) silently failed every push for
  ~a week → switched to `npm install --legacy-peer-deps`, matching Vercel/Android.
- **White screen from missing build env** → added `VITE_*` repo secrets + an `env:`
  block to both mobile workflows.
- **iOS stale bundle** → always `npm run ios:release` before archiving;
  `npm run ios:check` guards freshness.
- **Production reload loop (this engagement).** "Pages won't stop self-refreshing"
  after rapid deploys. Two compounding bugs: (1) the service worker cached *any* 200
  under asset URLs — after a deploy, old chunk URLs got SPA-rewritten to `index.html`
  (200, text/html) and were cached under the `.js` URL, poisoning the cache so every
  import failed; (2) `lazyWithRetry` called `window.location.reload()` with no guard
  → infinite loop. Fix: SW never caches text/html under asset URLs, deletes poisoned
  entries, cache bumped to v7; `lazyWithRetry` now reloads at most once/minute/tab,
  purges SW + caches first, then falls through to the ErrorBoundary.
- **`tsc --noEmit` is a no-op here.** The root `tsconfig` has `"files": []` + project
  references, so bare `tsc` checks **zero files** and always passes — it "passed" a
  commit with unbalanced JSX that broke every deploy for ~1 hour. **Gate on
  `npm run build`.**
- **Capacitor iOS `Package.swift` breakage** (CLI derived `.iOS(.v18)` from the
  widget target under tools 5.9) fixed durably via a `patch-package` patch, not
  hand-edits.

### E. Google OAuth verification (in progress)

Google's verification team re-requested the Calendar OAuth demo video. The real gap
was their note about the consent screen's **bottom-left language selector being set
to English** — our authorize URL pinned no UI language, so the consent screen
rendered in the account locale and reviewers couldn't confirm the scope text.
**Fix:** added `hl=en` to the authorize URL in the `google-calendar-auth` edge
function (deployed + verified live via curl); extended `record-google-oauth.mjs` to
linger post-redirect so the imported (green) Google events + "N events imported"
toast are captured (demonstrating the scope in use). **User action pending:**
re-record from a real Terminal, confirm the English selector on camera, upload
unlisted to YouTube, reply to Google (ensure the demo account is a listed OAuth test
user).

### F. Security & performance hardening (2026-07-03)

- Deleted unauth/abandoned edge functions (one could wipe all users' purchase
  history); gated the telegram bot.
- Rebuilt storage policies (authenticated-only uploads, owner-scoped access, no
  public listing).
- Rewrote 73 RLS policies to `(SELECT auth.uid())` (initplan perf fix).
- Cut the entry bundle ~1075 → ~670 kB (per-language locale code-split; Admin/
  Onboarding lazy-loaded).
- Migrations applied via `supabase db query`, **not `db push`** (CLI history is out
  of sync).

---

## 4. Distilled rulebook (enforced in the repo `CLAUDE.md`)

- Verify compiles with **`npm run build`**, never bare `tsc --noEmit`.
- All list/shopping/to-do work goes in **`Lists.tsx`** (the others are deleted).
- **Static-import** RevenueCat only (dynamic import hangs Android).
- After a push, treat "still broken" as a **delivery** problem first.
- Non-passive touch needs `addEventListener(..., { passive: false })`, not React's
  passive `onTouchStart`.
- Never cache `text/html` under asset URLs in the SW; **guard every auto-reload**.
- Use `(?<!\p{L})…(?!\p{L})/u`, never `\b`, for accented-language regex.
- Calendar/conflict data is in **localStorage `eazy-family-calendar-items`**, not
  Supabase `events`.
- Locale-dependent code reads **`eazy-family-language`**; login reconciles SYNC_KEYS
  **authoritatively** (clear absent keys).
- Manual Android `versionCode` bumps jump **+10** (CI does +1).
- Render RevenueCat `priceString` **verbatim**; never hardcode currency.
- Resolve the family roster **inline** (`ensureRoster`) in capture handlers.
- Add every new i18n key to **all 6 locales** in the same change.
- Migrations: hand SQL for **manual** apply, never `db push`.
- Stage explicit paths; **never `git add -A`** (the tree collects build artifacts).
- Auth providers + IAP must get a **manual cold-path device test** before any store
  submit — automation can't cover them.

---

## 5. Known-open items
- **Google OAuth video** — code shipped; user must re-record + reply (see §3E).
- **Android voice "never starts"** for at least one tester despite correct manifest;
  needs `adb logcat` / device model to pin down (suspect device-side speech service).
- **Lint debt** — ~107 errors left intentionally (mostly `no-explicit-any`).

## 6. Where things live
- **Operating manual (auto-loaded by Claude Code):** `CLAUDE.md` (repo root).
- **Skills:** `.claude/skills/{ship,verify-ui,i18n}/SKILL.md`.
- **This history + the dated audit:** `docs/`.
- **Review/demo accounts:** `appreview@eazy.family` / `EazyReview!2026`;
  `sofia.rivera@eazy.family` / same (2-member tests).
- **Handy scripts:** `scripts/seed-review-account.mjs`, `scripts/test-grip-drag.mjs`,
  `scripts/record-google-oauth.mjs`, `scripts/asc-builds.mjs`,
  `scripts/check-ios-bundle-fresh.sh`.
- **Durable lessons** also live in Claude Code's persistent memory
  (`/Users/hq/.claude/projects/-Users-hq/memory/`), indexed in `MEMORY.md`.
