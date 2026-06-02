# Eazy.Family — Device Test Checklist

Run this on a real device (iOS + Android) before every TestFlight / Play Store submission.
Check each box. A single ❌ blocks the build.

---

## 1. Onboarding

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Fresh install, open app | Onboarding screens appear | ☐ |
| 2 | Complete onboarding, create account | Lands on Home screen | ☐ |
| 3 | Sign out → Sign in with email | Returns to Home | ☐ |

---

## 2. EZ Button — Voice Commands

Tap the EZ button mic once, speak the phrase, verify the result.
**Do not tap the mic a second time — it should auto-process when you stop talking.**

| # | Voice input | Expected type | Expected behaviour | Pass |
|---|-------------|---------------|--------------------|------|
| 1 | "Add peanut butter to my shopping list" | shopping_personal | Appears in My List | ☐ |
| 2 | "Add milk to our shopping list" | shopping (shared) | Appears in Family List | ☐ |
| 3 | "Add a task to clean out the storage closet this week" | task | Appears in To-Do, due date this week | ☐ |
| 4 | "Clean the kitchen tomorrow" | task | Appears in To-Do, due tomorrow | ☐ |
| 5 | "Dentist appointment Friday at 3pm" | event | Appears on Calendar, correct day + time | ☐ |
| 6 | "Add picnic at the park to our family agenda" | event | Appears in Family Agenda view | ☐ |
| 7 | "Remind me to call the school on Monday" | reminder | Appears with Monday date | ☐ |
| 8 | "How do I invite my family?" | guide | Shows in-app help answer | ☐ |

---

## 3. EZ Button — Text Input

| # | Typed input | Expected | Pass |
|---|-------------|----------|------|
| 1 | "buy bread" | shopping pill selected | ☐ |
| 2 | "clean the bathroom" | task pill selected | ☐ |
| 3 | "meeting Tuesday 2pm" | event pill selected | ☐ |
| 4 | Press Create → confirm | Item saved, navigates to correct screen | ☐ |

---

## 4. Upgrade / Paywall

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Settings → Account → tap upgrade | Dialog opens | ☐ |
| 2 | Wait up to 10 seconds | Plans load OR Retry button appears (never infinite spinner) | ☐ |
| 3 | Tap Retry (if shown) | Retries fetch | ☐ |
| 4 | Tap upgrade button (with sandbox account) | Native purchase sheet appears | ☐ |

---

## 5. Voice (Microphone) — All Surfaces

| # | Location | Action | Expected | Pass |
|---|----------|--------|----------|------|
| 1 | EZ Capture | Tap mic, speak, stop talking | Auto-processes without second tap | ☐ |
| 2 | Calendar add event | Tap mic, speak title | Title populated | ☐ |
| 3 | Family Channel | Tap mic, speak message | Message populated | ☐ |
| 4 | EZ Capture | Tap mic, say nothing for 15s | Mic stops automatically | ☐ |

---

## 6. Family Features

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Add shared shopping item | Appears in Family Shopping list | ☐ |
| 2 | Add personal shopping item | Appears in My List only | ☐ |
| 3 | Add "picnic to family agenda" via EZ | Appears in Family Agenda view | ☐ |
| 4 | Family Channel: send a text message | Delivers, appears in thread | ☐ |

---

## 7. Localisation Spot-Check

Switch language in Settings → Language. Verify in each:

| Language | Check | Pass |
|----------|-------|------|
| DE | Calendar month names in German | ☐ |
| FR | Weekday initials in French | ☐ |
| ES | Upgrade dialog fully translated | ☐ |
| IT | EZ Capture placeholder translated | ☐ |

---

## 8. Navigation

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 1 | Swipe up on EZ button | Nav menu slides up | ☐ |
| 2 | Lift finger on Calendar | Navigates to Calendar | ☐ |
| 3 | Lift finger on Family | Navigates to Family | ☐ |
| 4 | Lift finger on Lists | Navigates to Lists | ☐ |

---

## Sign-off

| Field | Value |
|-------|-------|
| Tester | |
| Device (iOS) | |
| Device (Android) | |
| iOS version | |
| Android version | |
| App version / build | |
| Date | |
| Blocker issues found | |
