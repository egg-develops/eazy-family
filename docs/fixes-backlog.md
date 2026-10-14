# Eazy.Family — fixes backlog

How this works: add items under **Open** (one line each is fine — a screen, what's
wrong, and ideally what "good" looks like). I move them to **Done** with the commit
once shipped, and leave notes on anything that needs a decision. Pasting a list in
chat works too; I'll fold it in here.

Status: `[ ]` open · `[~]` in progress / needs input · `[x]` done

---

## Open

### Reminders (from the Nori teardown, 2026-10-11)
- [ ] **Per-item reminders with offsets and channels.** Today the only reminder is
  the Done screen's "tomorrow 09:00", which writes a separate calendar item — there
  is no reminder *on* a task or event. Target shape (Nori's, minus the parts that
  cost money): `reminders: [{ offsetMinutes, channel }]`, several per item,
  `channel ∈ app | email`. **Ship `app` via Capacitor local notifications and
  `email` via the existing digest function; skip SMS and phone-call channels** —
  they carry per-message cost and consent obligations we don't want in CH/EU.
  Needs: a `reminders jsonb` column on `tasks` and on the new `calendar_events`
  table (see `docs/plan-roles-recurrence-calendar-2026-10-11.md`), a scheduling
  pass that re-arms local notifications on app start, and a server-side sweep for
  the email channel. `push_tokens` already exists and is empty — wire it or drop it.
  Do this **after** the calendar move, so reminders are written against the server
  store once rather than against localStorage and then again.

### Family Channel
- [~] **Manual message entry is a poor experience.** Needs specifics — is it the
  input being cramped/awkward, keyboard covering it, no send affordance, or the
  compose flow itself? Tell me the exact pain and the ideal, and I'll redesign the
  composer. (Composer is `FamilyAgenda.tsx` ~772.)
- [x] **EZ button overlaps the channel composer.** Now hidden globally whenever a
  text field is focused (keyboard up), so it never covers what you're typing —
  covers the channel composer and every other input. `App.tsx` `typing` state +
  focusin/focusout. Verified with emulated touch.
- [ ] **Long-press-to-move the EZ button doesn't work** ("above the threshold").
  Investigate the reposition gesture in `App.tsx` (`handleEZPointerDown/Move/Up`,
  `isDragModeRef`) — likely a drag threshold or a top/safe-area clamp preventing
  moving it up past the composer. Relates to the item above.
- [x] **Delete messages via swipe-left.** Swipe your own message left to reveal a
  delete button (journal-style). Added author-deletes-own RLS on family_messages,
  optimistic remove + realtime DELETE handling. `FamilyAgenda.tsx`.

### Shopping
- [x] **Qty pill too large → item-name truncation.** Replaced the always-on
  `− N +` pill with a compact tappable qty chip (shows `1` subtly / `×N` when >1)
  that expands to the stepper only for the tapped row. Frees ~60px per row for the
  name. — `Lists.tsx`

---

## Done
- 2026-07-15 Shopping qty chip.
- 2026-07-15 Hide EZ button while typing (channel composer + all inputs).
- 2026-07-16 i18n: German→informal du (146), Portuguese você→tu fixes.
- 2026-07-16 Swipe-left to delete your own channel messages.
- 2026-07-17 Capture Apple Sign-in name; relay-email name fallback (no more garbage names).
- 2026-07-17 Voice assignment: nickname/short-form assignee matching (Cathi→Catharina).
