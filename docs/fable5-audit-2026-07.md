# Eazy.Family — Fable 5 Audit & Actions Report

**Period:** late June – 8 July 2026
**Scope:** Mobile UX overhaul (EZ button + homepage), reorder/drag system, a
production reload-loop incident, and Google OAuth verification compliance.
**Delivery channels touched:** web (Vercel), iOS (TestFlight), Android (Play beta),
Supabase Edge Functions.

This report is a plain-language record for Claude Chat. Each item lists the
**symptom**, the **root cause**, the **fix**, how it was **verified**, and its
**status**. Where a fix taught a durable lesson, it's captured in the repo
`CLAUDE.md` and in persistent memory.

---

## 1. Family Agenda — items unclickable, mis-ordered, time-only, "View All" mismatch

- **Symptom:** Agenda items weren't tappable, showed only a time, appeared in a
  seemingly random place, and "View All" couldn't find events the home card showed.
- **Root cause:** The date filter used `d >= now` (current timestamp), which dropped
  events from earlier the same day; the home card and the full view used different
  filter baselines, so their datasets diverged. Items were plain `<div>`s.
- **Fix:** Switched both the home card and `FamilyAgendaView.tsx` to
  `d >= startOfDay(now)` so all of today's events always appear and both sources
  agree. Converted event rows to `<button>`s that deep-link to the calendar via
  `/app/calendar?date=YYYY-MM-DD` (Calendar reads the param on mount).
- **Verified:** Manual review of both surfaces; consistent event sets.
- **Status:** ✅ Shipped.

## 2. EZ Button — gesture remap, toggle, scroll-select, haptics

- **Symptom / request:** The floating "EZ" action button's gestures were
  unintuitive. Desired: **1 tap → radial menu**; **long press → EZ Capture**;
  **long-press + drag → reposition** the button. Plus: tapping again closes the
  menu; sliding a finger over the open menu scroll-selects items (active item turns
  dark brown); elegant haptic variations per action.
- **Root cause / design:** The existing pointer chain already triggered EZ Capture on
  "hold, no move, release"; only the tap branch needed to open the menu. A
  `menuOpenRef` synced to menu state lets the pointer handlers read current state
  without a stale closure, cleanly enabling both "tap to close" and "drag to scroll".
- **Fix:** Reworked `handleEZPointerDown/Move/Up` in `src/pages/App.tsx`; added
  haptic variations (light for dismiss/scroll, heavy for open, tap on navigate).
- **Verified:** Interaction review on device/emulator.
- **Status:** ✅ Shipped.

## 3. Homepage — reorderable, toggleable modules

- **Request:** Reorder the homepage (gallery near top; then rituals, family agenda,
  family channel, today, top tasks) and let users show/hide + reorder modules from
  Settings, mirroring the EZ button's drag UI.
- **Fix:** Extracted every reorderable module into a `renderHomeModule(key)` switch
  driven by a `homeModuleOrder` array persisted to `eazy-home-module-order`
  (missing keys auto-appended for upgrade safety). Settings gained a drag-reorder
  list with per-row visibility toggles; changes broadcast via a custom event.
- **Status:** ✅ Shipped.

## 4. Overdue Tasks module

- **Request:** Stop showing Overdue Tasks at the top on refresh; default it to last,
  and make it a toggleable, reorderable Homepage Module like the rest.
- **Fix:** Added `showStaleTasks` to home config, a `staleTasks` case in the module
  map, default-last ordering, and a Settings entry with translations in all 6
  locales.
- **Status:** ✅ Shipped.

## 5. Duplicate photo gallery on the homepage

- **Symptom:** Two identical galleries rendered.
- **Root cause:** During the reorder work the gallery was moved to a hardcoded spot
  before the tour banner; the later module refactor then *also* rendered it via
  `renderHomeModule('gallery')`. The old hardcoded block was never removed.
- **Fix:** Deleted the stray hardcoded block; gallery now renders only through the
  module map.
- **Lesson recorded:** After extracting inline JSX into a shared render function,
  grep for and delete the old copy. (Now a rule in `CLAUDE.md`.)
- **Status:** ✅ Shipped.

## 6. Grip-drag reordering didn't work on iOS (multi-round fix)

- **Symptom:** The drag handles in Settings (EZ Button + Homepage Modules lists)
  wouldn't drag on device.
- **Root cause (the real one):** React 17+ registers `onTouchStart`/`onTouchMove` as
  **passive** listeners, so `e.preventDefault()` is silently ignored and iOS claims
  the touch for scrolling before the drag can engage. An initial "add
  `preventDefault`" attempt was therefore a no-op.
- **Fix:** Replaced the React touch handlers with **native non-passive listeners**
  (`addEventListener('touchmove', h, { passive: false })`) attached via `useEffect`
  on a container ref, using `data-*` attributes for hit-testing; kept pointer
  handlers for desktop mouse, guarded by `pointerType !== 'touch'`.
- **Incident inside this fix — I broke the build:** While wiring the container div I
  dropped the opening `<Card_>` tag, leaving unbalanced JSX. **`npx tsc --noEmit`
  reported clean** (see item 9) so it looked fine, but every Vercel/CI build failed
  for ~1 hour — meaning users kept receiving the *old* code and the fix appeared to
  "not work". Restored the tag; `npm run build` green.
- **Verified:** Wrote `scripts/test-grip-drag.mjs` — Playwright + Chrome DevTools
  Protocol **emulated touch** against the production build, logging in with the
  review account and dismissing the feature-tour overlay. Both lists drag-reorder
  and persist. (This is now the `verify-ui` skill.)
- **Status:** ✅ Shipped and verified end-to-end.

## 7. Reorder-list UX polish

- **Requests:** (a) Settings list order was inverted relative to the radial menu;
  (b) the dragged item didn't look selected; (c) the per-row letter chips were
  redundant.
- **Fixes:** (a) The menu column renders `flex-col-reverse`, so I reversed
  `orderedMenuItems` to make the Settings top-to-bottom order match the visible
  menu. (b) Replaced the faded-opacity drag state (which read as *disabled*) with a
  bold inset brand-brown ring + tint + slight scale-up. (c) Removed the initial
  chips; rows show the name only.
- **Verified:** Re-ran the emulated-touch harness; reorder still persists.
- **Status:** ✅ Shipped.

## 8. Production incident — infinite page reload loop

- **Symptom:** "App extremely buggy, pages won't stop self-refreshing" after several
  rapid deploys.
- **Root cause (two compounding bugs):**
  1. **Service-worker cache poisoning** — the SW cached *any* 200 response under
     asset URLs. After a deploy, requests for old chunk hashes were SPA-rewritten to
     `index.html` (200, `text/html`); the SW stored that HTML under the `.js` URL and
     served it forever, so every dynamic import of that chunk failed.
  2. **Unguarded reload** — `lazyWithRetry` called `window.location.reload()` with no
     loop guard, so the poisoned cache produced an endless reload cycle before the
     ErrorBoundary's guarded fallback could engage.
- **Fix:** SW now never caches `text/html` under asset URLs, deletes already-poisoned
  entries, and bumped its cache to **v7** to purge existing poison. `lazyWithRetry`
  now allows **one** reload/minute/tab, purges SW registrations + CacheStorage
  first, then propagates to the ErrorBoundary instead of looping.
- **Verified:** `npm run build` green; SW logic reviewed against the deploy-rewrite
  behavior.
- **Lesson recorded:** "App keeps refreshing" ⇒ suspect SW cache poisoning + an
  unguarded auto-reload first; rapid successive deploys are the trigger. Any
  auto-reload must be guarded and purge caches. (In `CLAUDE.md` + memory.)
- **Status:** ✅ Shipped.

## 9. Tooling discovery — `tsc --noEmit` is a no-op here

- **Finding:** The root `tsconfig.json` uses `"files": []` + project references, so
  bare `npx tsc --noEmit` type-checks **zero files** and always exits clean. It gave
  a false "compiles" signal on the item-6 build break.
- **Action:** Standardized on **`npm run build`** as the compile/typecheck gate;
  documented in `CLAUDE.md`; recorded in memory.

## 10. Google OAuth verification — English consent screen

- **Symptom:** Google's verification team re-requested the demo video with three
  requirements; it read like they'd ignored the prior submission.
- **Root cause:** The tell was their line about the consent screen's bottom-left
  **language selector being set to English**. Our authorize URL pinned no UI
  language, so the consent screen rendered in the signed-in account's locale and the
  reviewers couldn't confirm the scope text matched the requested scope
  (`calendar.events.readonly`).
- **Fix:** Added **`hl=en`** to the authorize URL in the
  `google-calendar-auth` edge function; **deployed** to prod and **verified live**
  via curl (`hl=['en']`, correct scope, `prompt=consent`). Extended
  `record-google-oauth.mjs` to linger ~15s post-redirect so the imported (green)
  Google events + "N events imported" toast are captured — demonstrating the scope
  in use (requirement #3).
- **Status:** ✅ Code shipped & function deployed. **User action pending:**
  re-record the demo from a real Terminal, confirm the English selector on camera,
  upload unlisted to YouTube, reply to Google. (Ensure the demo Google account is a
  listed OAuth test user, or you'll hit access-blocked instead of consent.)

---

## Cross-cutting themes

- **Stale-client is the dominant time sink.** Multiple "it didn't work" reports were
  delivery problems (failed build, SW cache), not code problems. The new rule:
  after a push, a "still broken" report is a delivery question until proven
  otherwise.
- **Verify against the real runtime.** Emulated-touch testing caught what desktop
  clicking and code reasoning could not. Verification harnesses are now first-class.
- **Deploys have side effects.** Rapid deploys expose stale-cache bugs; edge
  functions must be deployed and curled, not assumed; CI auto-bumps versionCode
  (rebase before push).

## Artifacts produced
- `CLAUDE.md` — operating manual for future model sessions.
- `scripts/test-grip-drag.mjs` — emulated-touch verification harness (reusable
  template).
- Edge function `google-calendar-auth` updated + deployed (`hl=en`).
- `public/service-worker.js` v7 (cache-poison fix); `src/App.tsx` guarded
  `lazyWithRetry`.
- Persistent memory entries: tsc-noop, SW-poison-reload-loop, Google-OAuth English
  consent — plus updates to the review-account and OAuth-recording references.
