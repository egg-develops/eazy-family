---
name: verify-ui
description: >
  Prove a UI or touch interaction actually works in Eazy.Family by driving the
  BUILT app in an emulated mobile browser (Playwright + Chrome DevTools Protocol
  touch), logging in with the review account and dismissing the feature-tour
  overlay. Use before claiming any mobile UI / gesture / drag change is done —
  desktop clicking and code reasoning miss touch-only and cache bugs.
---

# Skill: verify-ui

"I think it works" is not a deliverable. This skill turns UI/gesture changes into
"I ran X against the built app and observed Y." It exists because touch bugs (e.g.
passive-listener drag failures) are invisible to desktop clicks and to reasoning.

## When to use
- Any change to touch gestures, drag/reorder, the EZ button, the service worker,
  lazy-loading, or homepage/module layout.
- Reproducing a "doesn't work on device" report.
- Regression-checking after UX polish.

## Key facts
- **Test against the production build**, not `vite dev`. The dev server has failed
  to boot with esbuild dep-optimizer errors in this repo; `vite preview` on the
  build is reliable. Real touch also only matters on the real bundle.
  ```bash
  npm run build && npx vite preview --port 8080   # run preview in the background
  ```
- **Review account:** `appreview@eazy.family` / `EazyReview!2026`
  (second member `sofia.rivera@eazy.family` / same password for 2-member tests).
- **Emulated touch:** Playwright's `page.tap()`/mouse is not enough for custom
  non-passive touch handlers. Inject real touch via CDP
  `Input.dispatchTouchEvent`.
- **The feature-tour overlay** (`FeatureTour`, a `z-50` fixed modal) covers Settings
  on a fresh profile and will absorb your taps. Dismiss it by setting its per-user
  completion flag before navigating:
  `localStorage.setItem('eazy-family-tutorial-completed-<uid>', 'true')`.
- **Scroll targets into view** before computing tap coordinates — off-screen
  elements return null hits and silently pass/fail wrong.
- WebKit's `new Touch(...)` constructor throws (`Illegal constructor`) under
  Playwright; use CDP touch on Chromium instead of synthesizing `TouchEvent` in
  WebKit.

## Template (adapt from `scripts/test-grip-drag.mjs`)
```js
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
});

// 1. Log in
await page.goto('http://localhost:8080/auth');
await page.fill('#email', 'appreview@eazy.family');
await page.fill('#password', 'EazyReview!2026');
await page.getByRole('button', { name: /sign in/i }).first().click();
await page.waitForURL('**/app**', { timeout: 20000 });

// 2. Kill the tour overlay so it can't eat taps
await page.evaluate(() => {
  const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const uid = k && JSON.parse(localStorage.getItem(k) || '{}')?.user?.id;
  if (uid) localStorage.setItem(`eazy-family-tutorial-completed-${uid}`, 'true');
});

// 3. Go to the surface under test, scroll target into view, drive real touch
await page.goto('http://localhost:8080/app/settings');
await page.waitForSelector('[data-home-grip]');
const grip = page.locator('[data-home-grip]').first();
await grip.scrollIntoViewIfNeeded();
const g = await grip.boundingBox();
// ... touchStart → several touchMove steps → touchEnd ...

// 4. Assert on OBSERVABLE state (persisted order, DOM, storage) — not on "it looked right"
const after = await page.evaluate(() => localStorage.getItem('eazy-home-module-order'));
console.log(after);
await browser.close();
```

## Assert on ground truth
Check something that can't lie: the persisted `localStorage` value changed, the DOM
reordered, the expected toast text appeared, the network request fired. Log a clear
`✅ / ❌` line per check.

## Hygiene
- Put throwaway probes in `scripts/` (Playwright resolves there) and **delete them**
  when done; keep only reusable harnesses like `test-grip-drag.mjs`.
- Stop the preview server (`pkill -f "vite preview"`) when finished.
- If a debug run wrote artifacts (`recordings/`, screenshots), do not let them into a
  commit — stage explicitly.

## Definition of done
- [ ] Ran against `vite preview` of a fresh `npm run build`.
- [ ] Logged in as the review account and dismissed the tour overlay.
- [ ] Drove the interaction with real (CDP) touch, targets scrolled into view.
- [ ] Asserted on observable state and printed a pass/fail line.
- [ ] Probe scripts deleted; preview stopped; no stray artifacts staged.
