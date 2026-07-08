# CLAUDE.md — Eazy.Family operating manual

You are working in a production family-organizer app with paying users and live
App Store / Play / Google-OAuth review processes. Small mistakes here don't cause
compile errors — they ship broken code to real devices, or worse, *look* shipped
while users stay on old code. Read this before touching anything.

---

## 1. What this app is (orientation)

- **Frontend:** React 18 + TypeScript, Vite, React Router v6, TanStack Query,
  Radix UI primitives, Tailwind. Single-page app.
- **Mobile:** Capacitor 8 wraps the web build into native iOS + Android. Plugins:
  haptics, speech-recognition, apple-sign-in, calendar, RevenueCat (IAP).
- **Backend:** Supabase — Postgres (with RLS), Auth, Edge Functions
  (`supabase/functions/**`, Deno). Project ref `jfztyhuagxruhawchfem`.
- **i18n:** `i18next` in **6 languages** — en, de, fr, es, it, pt
  (`src/i18n/locales/*.json`). Default/base is `en`.
- **Delivery:** web via **Vercel** (auto-deploy on push to `main`); iOS via
  **GitHub Actions → TestFlight**; Android via **GitHub Actions → Play beta**.

---

## 2. The delivery model — internalize this or you will waste the user's time

**A fix committed to the repo is NOT a fix on the user's device.** The single most
common failure in this project is declaring a fix done when the user is still
running old code. There are three independent delivery channels, each with its own
lag and its own cache:

| Channel | How the new code arrives | Trap |
|---|---|---|
| **Web** (eazy.family / www.eazy.family) | Vercel builds on push to `main`; a **service worker** caches assets | User sees old bundle until SW updates + reload. A failed Vercel build silently serves the last good one. |
| **iOS** | `.github/workflows/ios-beta.yml` builds a new TestFlight build | User must install the new build number. Old build = old code. |
| **Android** | `.github/workflows/android-beta.yml` builds a Play beta | Same. versionCode must be unique. |

**Rule:** After you push, a report of "still broken" is a *delivery* question until
proven otherwise. Before editing code again, confirm (a) the relevant CI/Vercel
build **succeeded**, and (b) the user is on the new bundle/build. See §7.

---

## 3. Build, typecheck, test — the real gates

- **`npm run build`** is the ONLY reliable compile+typecheck gate. It runs Vite +
  esbuild and catches JSX/syntax/type-shape errors.
- **`npx tsc --noEmit` is a NO-OP in this repo.** The root `tsconfig.json` has
  `"files": []` plus project references, so bare `tsc` type-checks **zero files**
  and always exits clean. It once "passed" a commit with unbalanced JSX that broke
  every deploy. If you want tsc, use `npx tsc -b`. Otherwise trust `npm run build`.
- **`npm test`** — Vitest. Unit tests live in `src/lib/*.test.ts` (locale, intent
  classification, ez-capture, family channel, file validation). Run them when you
  touch anything in `src/lib`.
- **`npm run lint`** — ESLint.

**Never claim a change compiles without having run `npm run build` (exit 0).**

---

## 4. Conventions

### Followed in this codebase (match them)
- **Styling:** inline `style={{ ... }}` with `hsl(var(--token))` CSS variables for
  themeable color; Tailwind classes for layout/spacing. Brand color is `#964735`
  (`--primary` = `14 51% 40%`). Don't invent new hex values when a token exists.
- **Icons:** `lucide-react`, imported by name.
- **i18n:** every user-facing string goes through `t('...')`. Keys are namespaced
  (`home.*`, `settings.*`, `calendar.*`, `familyAgenda.*`, `nav.*`).
- **Persistence is split** (memorize this):
  - **Supabase tables:** `tasks` (personal/shared/shopping via `type` + `parent_id`),
    `families`, `family_members`, `profiles`, `family_messages`.
  - **localStorage ONLY:** calendar events (`eazy-family-calendar-items`), journal
    (`eazy-journal-entries`), rituals (`eazy-rituals`). The Calendar page does NOT
    use a Supabase `events` table.
  - **Cloud-synced localStorage:** keys in `SYNC_KEYS` (`src/lib/preferencesSync.ts`)
    round-trip through the `user_preferences` table via `cloudSet(key, value)`.
    Use `cloudSet` (not raw `setItem`) for anything that should follow the user
    across devices.
- **Lazy pages:** heavy screens are `lazyWithRetry(() => import(...))` in
  `src/App.tsx`. Keep new heavy pages out of the entry chunk.
- **Git:** feature work → descriptive commit whose body states **root cause + why
  the fix works**. CI appends its own versionCode-bump commits.

### Add these (Fable-5 conventions the codebase would benefit from)
- **Stage explicitly. Never `git add -A`.** The working tree accumulates untracked
  build artifacts (`build/`, `*.aab`, `*.apks`, `screenshots/`, `recordings/`,
  `dist/`). `git add -A` will sweep 100+ junk files into a commit. Always
  `git add <specific paths>`.
- **After extracting code into a shared render function, grep for the old inline
  copy and delete it.** (A duplicated gallery shipped exactly because the old block
  was left behind.)
- **Every new i18n key lands in all 6 locale files in the same change** — never
  en-only. A missing key renders the raw key string to the user.
- **Any auto-reload / retry path must be guarded** (time- or count-limited) and
  should purge caches first, or it loops forever.

---

## 5. Mistakes a weaker model will make here — and the rule that prevents each

1. **Trusting `tsc --noEmit`.** It checks nothing (§3). → **Verify with `npm run build`.**
2. **Editing `Shopping.tsx` / `ToDoList.tsx`.** They are **DEAD code**. The live
   shopping/list/to-do UI is **`src/pages/Lists.tsx`**. → **All list/shopping/to-do
   changes go in `Lists.tsx`.**
3. **Dynamic-importing RevenueCat** (`await import('@revenuecat/...')`). The chunk
   hangs on Android and breaks the Upgrade flow. → **Static `import` at top of file
   only.**
4. **Declaring a fix done because the code is correct.** The user may be on a stale
   client (§2). → **After push, confirm the build/deploy succeeded and state how the
   user gets the new bundle.**
5. **Using React's `onTouchStart`/`onTouchMove` with `e.preventDefault()`** to stop
   scroll. React registers these as **passive** listeners; `preventDefault()` is a
   silent no-op. → **Attach non-passive listeners via
   `el.addEventListener('touchmove', h, { passive: false })` in a `useEffect`.**
6. **Caching any 200 response under an asset URL in the service worker.** After a
   deploy, old chunk URLs get SPA-rewritten to `index.html` (200, text/html);
   caching that poisons the cache → infinite reload loop. → **Never cache
   `text/html` under a `.js`/`.css` URL; bump `CACHE_NAME` when shipping SW logic.**
7. **Using `\b` in a regex for accented-language text.** JS `\b` is ASCII-only, so
   it fails on `é`, `ü`, etc. → **Use `(?<!\p{L})…(?!\p{L})` with the `/u` flag.**
8. **Reading calendar/conflict data from a Supabase `events` table.** Calendar
   events live in localStorage `eazy-family-calendar-items` (§4). → **Know the
   persistence split before writing a query.**
9. **Reading the speech/voice locale from `i18nextLng`.** Wrong key. → **Read
   `eazy-family-language`.**
10. **Making cloud-preference load non-authoritative.** If load doesn't clear keys
    absent from the cloud, one account's data bleeds into the next login. → **On
    cloud-pref load, clear local keys the cloud doesn't have.**
11. **Manually bumping Android `versionCode` by +1.** CI auto-bumps by +1 on every
    build (`android-beta.yml`), so a manual +1 collides with a code CI will consume →
    "versionCode already used" on Play. → **Manual bumps jump by +10.**
12. **Hardcoding IAP price or currency.** Currency follows the App Store *account
    region*, not locale/IP. → **Render RevenueCat `priceString` verbatim; never
    hardcode "$" or a number.**
13. **Resolving the family roster from async React state during capture/assignment.**
    Module-cached screens re-enter before state hydrates → wrong/empty assignee. →
    **Resolve the roster inline (`ensureRoster`), not from state.**
14. **Inserting `family_members` rows with `user_id = null`** as fake roster members.
    RLS SELECT is null-unsafe so they're invisible. → **Set `display_name`; route
    pending non-real members through `family_invitations`.**
15. **Applying a global 44px min tap-target CSS rule.** It bloats every control. →
    **Gate size behind the "Larger touch targets" toggle and the `.tap-pad` class.**
16. **`supabase db push` to apply a migration.** The CLI migration history is out of
    sync and it would unsafely replay ~25 migrations. → **Provide SQL for manual
    apply via the dashboard; never push.**
17. **Apple Sign-in "invalid audience".** The native `aud` is the bundle id
    `eazy.family.app`, which must be in Supabase's Client IDs (not just the
    `.signin` Services ID); the native flow needs a nonce. → **Add the bundle id to
    Supabase Client IDs.**

---

## 6. Quality bar per deliverable (checkable, not adjectives)

**A bug fix is done when ALL of these are true:**
- [ ] `npm run build` exits 0.
- [ ] The fix was verified against the **actual runtime** (browser, emulated-touch
      harness, or device) — not just reasoned about. State how you verified.
- [ ] Root cause is identified and written in the commit body (not just symptom).
- [ ] The delivery path is named: which of web/iOS/Android is affected, and the
      cache-bust/step the user needs to see it.
- [ ] Only intended files are staged (`git status` shows no stray artifacts).

**A new/changed UI is done when:**
- [ ] It matches an existing component's idiom (spacing, radius, tokens, haptics).
- [ ] Every new string has a key in **all 6** locale files (en, de, fr, es, it, pt).
- [ ] No text truncation; sizing follows the chunky-elegant preference (roomier end).
- [ ] It behaves with the "Larger touch targets" toggle both off and on.
- [ ] Touch interactions verified on an emulated mobile viewport, not just desktop.

**An edge-function change is done when:**
- [ ] It is **deployed** (`supabase functions deploy <name> --project-ref jfzty…`).
- [ ] It is **verified live** — curl the endpoint and assert the new behavior in the
      response. (Repo ≠ prod for functions.)

**A DB migration is done when:**
- [ ] The SQL is provided for **manual** dashboard apply (never `db push`).
- [ ] RLS impact is stated (who can now SELECT/INSERT/UPDATE/DELETE).
- [ ] Cross-member visibility was reasoned about ("does the other family member see
      this?").

**A store/OAuth review artifact is done when:**
- [ ] It satisfies each numbered requirement in the reviewer's message explicitly.
- [ ] For Google OAuth video: consent screen is in **English** (`hl=en`), the exact
      scope text is visible, and the app is shown **using** the granted data.

---

## 7. When uncertain — escalation rules

**Default posture: be autonomous.** If you can find out yourself, do — don't ask the
user for steps you can take (read files, run scripts, curl endpoints, emulate a
device). Don't use multiple-choice popups to pick scope/approach; choose the
sensible plan, state it in one line, and execute.

**Diagnostic order when a fix "doesn't work":**
1. Did the CI/Vercel build actually **succeed**? (`gh run list`, check Vercel.) A
   broken build means the user never received the fix — this is the first suspect.
2. Is the user on the **new bundle/build**? (Web: SW cache / hard reload. Native:
   build number.) 
3. Only after 1–2 are cleared: reconsider the code.

**Verify before you claim.** If a claim is checkable with a script or a browser,
check it. "I think it works" is not a deliverable; "I ran X and observed Y" is.

**Escalate to the user ONLY when:**
- The action is **destructive or irreversible** and you didn't create the target
  (deleting data, force-pushing shared history, dropping tables).
- The action is **outward-facing / publishing**: submitting to App Store / Play,
  replying to a reviewer, sending email, posting to an external service.
- You need a **secret or credential** you cannot derive (a login, an API token, an
  interactive `gcloud`/Apple auth). Suggest the `! <command>` route so its output
  lands in the session.
- It's a genuine **product decision with no sensible default** (pricing, copy tone,
  which of two equally valid UX directions).

**Never auto-run without asking:** DB migrations (§5.16), store submissions,
anything that emails or notifies real users.

**Do NOT ask about:** which file to edit, whether to run the build, how to name a
commit, whether to add i18n keys to all locales — these have known answers above.

---

## 8. Toolbox — verified commands & assets

- **Ship a change:** `npm run build` → stage specific paths → commit (root-cause
  body) → `git pull --rebase origin main` (CI may have bumped versionCode;
  `--autostash` if the tree is dirty) → `git push`. See the `ship` skill.
- **Verify a UI/touch change:** Playwright + CDP emulated touch against the built
  app, logging in with the review account and dismissing the feature-tour overlay.
  See the `verify-ui` skill and `scripts/test-grip-drag.mjs` as a template.
- **Add/audit translations:** see the `i18n` skill.
- **Deploy an edge function:** `supabase functions deploy <name> --project-ref
  jfztyhuagxruhawchfem`, then curl to confirm.
- **Review/demo account:** `appreview@eazy.family` / `EazyReview!2026` (and
  `sofia.rivera@eazy.family` / same password for 2-member tests). Seed scripts:
  `scripts/seed-review-account.mjs`, `src/lib/reviewSeed.ts`.
- **Record Google OAuth demo:** `node scripts/record-google-oauth.mjs` **from a real
  Terminal** (the embedded `!` runner shows no GUI window).
- **iOS bundle freshness check:** `npm run ios:check`.

### Engagement history
Narrative reports of completed work live in `docs/`. Read these for context on what
was changed and why (root cause → fix → verification):
- `docs/eazy-family-complete-history.md` — **the full engineering history** of the
  project (auth/store, EZ capture + smart logic, UI system, delivery incidents,
  security hardening, Google OAuth). Start here.
- `docs/fable5-audit-2026-07.md` — narrower dated audit for the late-June–8-Jul-2026
  engagement (a subset of the history above).

When something non-obvious bites you and the fix isn't derivable from the code,
record it in the user's memory (`/Users/hq/.claude/projects/-Users-hq/memory/`) and
add a line to `MEMORY.md` — that's how this manual stays current.
