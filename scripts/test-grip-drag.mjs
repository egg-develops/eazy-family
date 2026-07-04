// Verifies grip-drag reordering in Settings with emulated touch (CDP touch events).
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });

await page.goto('http://localhost:8080/auth');
await page.fill('input[type="email"]', 'appreview@eazy.family');
await page.fill('input[type="password"]', 'EazyReview!2026');
await page.click('button[type="submit"]');
await page.waitForURL('**/app**', { timeout: 20000 });

// mark the feature tour as completed so its z-50 overlay doesn't cover the page
await page.evaluate(() => {
  const uid = Object.keys(localStorage).find(k => k.startsWith('sb-'))
    && JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))) || '{}')?.user?.id;
  if (uid) localStorage.setItem(`eazy-family-tutorial-completed-${uid}`, 'true');
});
await page.goto('http://localhost:8080/app/settings');
await page.waitForSelector('[data-home-grip]', { timeout: 15000 });
await page.waitForTimeout(500);

async function dragTest(gripSel, itemSel, storageKey) {
  const before = await page.evaluate(k => localStorage.getItem(k), storageKey);
  const grip = page.locator(gripSel).first();
  await grip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const g = await grip.boundingBox();
  const target = await page.locator(itemSel).nth(2).boundingBox();
  const sx = g.x + g.width / 2, sy = g.y + g.height / 2;
  const ey = target.y + target.height / 2;
  const hit = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.tagName + '.' + (el.className?.baseVal ?? el.className ?? '') : 'null';
  }, [sx, sy]);
  await touch('touchStart', sx, sy);
  await page.waitForTimeout(120);
  const engaged = await page.evaluate(sel =>
    [...document.querySelectorAll(sel)].some(r => getComputedStyle(r).opacity !== '1'), itemSel);
  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', sx, sy + ((ey - sy) * i) / 8);
    await page.waitForTimeout(40);
  }
  await touch('touchEnd', 0, 0);
  await page.waitForTimeout(300);
  const after = await page.evaluate(k => localStorage.getItem(k), storageKey);
  console.log(`${storageKey}: hit=${hit.slice(0, 60)} engaged=${engaged}`);
  console.log(`  before=${before}`);
  console.log(`  after =${after}`);
  console.log(before !== after ? `  ✅ reorder persisted` : `  ❌ unchanged`);
}

await dragTest('[data-home-grip]', '[data-home-item]', 'eazy-home-module-order');
await dragTest('[data-ez-grip]', '[data-ez-item]', 'eazy-ez-menu-order');
await browser.close();
