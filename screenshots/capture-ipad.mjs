/**
 * iPad App Store screenshot capture — Eazy.Family
 * Usage:  node screenshots/capture-ipad.mjs
 * Output: screenshots/raw-ipad/     (bare 2048×2732 PNG)
 *         screenshots/framed-ipad/  (iPad-framed, App Store ready)
 *
 * Target: iPad Pro 12.9" / 13" — 2048×2732 px portrait
 * Viewport: 1024×1366 CSS px @ DPR 2 → 2048×2732 physical
 *
 * Screens: 01-home, 02-orb, 03-calendar, 04-shopping
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL     = 'https://eazy.family';
const EMAIL        = process.env.DEMO_EMAIL    || 'hello@eazy.family';
const PASSWORD     = process.env.DEMO_PASSWORD || 'EZ.Simpsons2026';

const SUPABASE_URL = 'https://jfztyhuagxruhawchfem.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0';

// iPad Pro 12.9" / 13" — 1024×1366 CSS px @ DPR 2 = 2048×2732
const VP_W  = 1024;
const VP_H  = 1366;
const DPR   = 2;
const SCR_W = VP_W * DPR;  // 2048
const SCR_H = VP_H * DPR;  // 2732
const TODAY = '2026-05-18';

// iPad user agent (Safari on iPadOS 17)
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const OUT_RAW    = path.join(__dirname, 'raw-ipad');
const OUT_FRAMED = path.join(__dirname, 'framed-ipad');
mkdirSync(OUT_RAW,    { recursive: true });
mkdirSync(OUT_FRAMED, { recursive: true });

// ── iPad frame overlay SVG ────────────────────────────────────────────────────
// Overlaid on top of the raw screenshot (2048×2732).
// - Fills the four corners with the page background to create rounded-corner clip
// - Adds a subtle device-edge border
// - Adds the Face ID / camera pill centred at the top
// - Adds the home-bar swipe indicator at the bottom
const PAGE_BG = '#FDF9F3'; // matches app background

function frameSVG() {
  const W = SCR_W;
  const H = SCR_H;
  const R = 52;           // outer corner radius (matches iPad Pro radius at this scale)

  // Camera pill dimensions (centred, near top)
  const pillW = 420, pillH = 72, pillR = 36;
  const pillX = (W - pillW) / 2;
  const pillY = 32;

  // Home indicator
  const barW = 560, barH = 14, barR = 7;
  const barX = (W - barW) / 2;
  const barY = H - 52;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Mask that isolates just the four corner regions outside the rounded rect -->
    <mask id="corners">
      <rect width="${W}" height="${H}" fill="white"/>
      <rect width="${W}" height="${H}" rx="${R}" fill="black"/>
    </mask>
  </defs>

  <!-- Fill the corner slivers with the page background colour -->
  <rect width="${W}" height="${H}" fill="${PAGE_BG}" mask="url(#corners)"/>

  <!-- Subtle device-edge border (1px, slightly warm) -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R}"
        fill="none" stroke="rgba(180,155,140,0.45)" stroke-width="1"/>

  <!-- Face ID / front-camera pill -->
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillR}"
        fill="#0d0d0d"/>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillR}"
        fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- Home indicator bar -->
  <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barR}"
        fill="rgba(0,0,0,0.22)"/>
</svg>`;
}

// ── Apply frame to a raw screenshot ──────────────────────────────────────────
async function applyFrame(rawPath, outPath) {
  const frameBuffer = await sharp(Buffer.from(frameSVG())).png().toBuffer();

  await sharp(rawPath)
    .resize(SCR_W, SCR_H, { fit: 'fill' })
    .composite([{ input: frameBuffer, top: 0, left: 0 }])
    .flatten({ background: PAGE_BG })
    .png()
    .toFile(outPath);

  console.log(`   ✓  ${path.basename(outPath)}`);
}

// ── Seed demo data ────────────────────────────────────────────────────────────
async function seedData() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: auth, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error || !auth.user) { console.warn('Seed: auth failed —', error?.message); return; }
  const userId   = auth.user.id;
  const RENAME   = { Homer: 'Tom', Marge: 'Sarah', Bart: 'Liam', Lisa: 'Zoe', Maggie: 'Emma' };

  const { data: membership } = await sb.from('family_members')
    .select('family_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (membership?.family_id) {
    const { data: members } = await sb.from('family_members')
      .select('id, name').eq('family_id', membership.family_id).eq('is_active', true);
    for (const m of (members || [])) {
      const n = RENAME[m.name];
      if (n) await sb.from('family_members').update({ name: n }).eq('id', m.id);
    }
  }

  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'task');
  const tasks = [
    { title: 'School pickup — Zoe & Liam',      type: 'task' },
    { title: 'Book pediatrician checkup (Liam)', type: 'task' },
    { title: 'Soccer practice gear for Zoe',     type: 'task' },
    { title: 'Pay school fees (due Friday)',      type: 'task' },
    { title: 'Car service appointment',           type: 'task' },
  ];
  for (const t of tasks) await sb.from('tasks').insert({ ...t, user_id: userId, completed: false });

  const calendarEvents = [
    { id: 'demo-c1', title: "Dentist — Liam",      startDate: new Date(TODAY+'T10:00:00').toISOString(), endDate: new Date(TODAY+'T11:00:00').toISOString(), allDay: false, location: "City Dental Clinic", type: "event", color: "#964735" },
    { id: 'demo-c2', title: "Zoe's dance recital", startDate: new Date(TODAY+'T18:00:00').toISOString(), endDate: new Date(TODAY+'T19:30:00').toISOString(), allDay: false, location: "Community Hall",    type: "event", color: "#EE7BB0" },
    { id: 'demo-c3', title: "Swimming Lesson",      startDate: new Date("2026-05-20T14:00:00").toISOString(), endDate: new Date("2026-05-20T15:00:00").toISOString(), allDay: false, location: "Aquatic Center", type: "event", color: "#964735" },
    { id: 'demo-c4', title: "Children's Museum",    startDate: new Date("2026-05-21T10:00:00").toISOString(), endDate: new Date("2026-05-21T12:00:00").toISOString(), allDay: false, type: "event", color: "#FFC861" },
    { id: 'demo-c5', title: "Dinner @ Grandma's",  startDate: new Date("2026-05-23T18:30:00").toISOString(), endDate: new Date("2026-05-23T21:00:00").toISOString(), allDay: false, type: "event", color: "#44664F" },
  ];
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-calendar-items', p_value: calendarEvents });

  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'shopping');
  const shopping = [
    { title: 'Cherry tomatoes',    type: 'shopping', user_id: userId, completed: false },
    { title: 'Greek yogurt',       type: 'shopping', user_id: userId, completed: false },
    { title: 'Free-range eggs',    type: 'shopping', user_id: userId, completed: false },
    { title: 'Sourdough bread',    type: 'shopping', user_id: userId, completed: false },
    { title: 'Almond butter',      type: 'shopping', user_id: userId, completed: false },
    { title: 'Organic whole milk', type: 'shopping', user_id: userId, completed: false },
    { title: 'Sparkling water ×6', type: 'shopping', user_id: userId, completed: true  },
    { title: 'Orange juice',       type: 'shopping', user_id: userId, completed: true  },
  ];
  await Promise.all(shopping.map(item => sb.from('tasks').insert(item)));

  console.log('  Seed complete.');
  await sb.auth.signOut();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function seedCalendar(page) {
  await page.evaluate((today) => {
    const events = [
      { id: 'demo-c1', title: "Dentist — Liam",      startDate: new Date(today+'T10:00:00').toISOString(), endDate: new Date(today+'T11:00:00').toISOString(), allDay: false, location: "City Dental Clinic", type: "event", color: "#964735" },
      { id: 'demo-c2', title: "Zoe's dance recital", startDate: new Date(today+'T18:00:00').toISOString(), endDate: new Date(today+'T19:30:00').toISOString(), allDay: false, location: "Community Hall",    type: "event", color: "#EE7BB0" },
      { id: 'demo-c3', title: "Swimming Lesson",      startDate: new Date("2026-05-20T14:00:00").toISOString(), allDay: false, type: "event", color: "#964735" },
    ];
    localStorage.setItem('eazy-family-calendar-items', JSON.stringify(events));
    localStorage.removeItem('eazy-completed-rituals-today');
  }, TODAY);
}

async function go(page, url, ms = 2800) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
  // Scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function dismiss(page) {
  for (const sel of ['button:has-text("Skip")', 'button:has-text("Let\'s go")', 'button[aria-label="Skip tour"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 600 }).catch(() => false)) { await el.click(); await page.waitForTimeout(300); }
  }
}

async function shot(page, name) {
  const raw = path.join(OUT_RAW, `${name}.png`);
  await page.screenshot({ path: raw, fullPage: false });
  await applyFrame(raw, path.join(OUT_FRAMED, `${name}.png`));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding demo data…');
  await seedData();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport:          { width: VP_W, height: VP_H },
    deviceScaleFactor: DPR,
    userAgent:         UA,
  });
  const page = await context.newPage();

  // ── Login ─────────────────────────────────────────────────────────────────
  console.log('Logging in…');
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app**', { timeout: 25000 });
  await page.waitForTimeout(2000);
  console.log('Logged in.');

  // Seed calendar data once (persists across navigations in same context)
  await page.goto(`${BASE_URL}/app`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await seedCalendar(page);

  // ── 1: Home ───────────────────────────────────────────────────────────────
  console.log('\n[1/4] Home');
  await go(page, `${BASE_URL}/app`, 2500);
  await dismiss(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, '01-home');

  // ── 2: Orb / EZCapture ───────────────────────────────────────────────────
  console.log('[2/4] Orb / EZCapture');
  await go(page, `${BASE_URL}/app`, 1800);
  await dismiss(page);
  // Open EZCapture by clicking the orb
  await page.locator('[data-tutorial="orb"]').click();
  await page.waitForTimeout(900);
  // Fill in a compelling demo prompt
  const orbInput = page.locator('textarea').last();
  await orbInput.waitFor({ state: 'visible', timeout: 4000 });
  await orbInput.fill('Plan anniversary dinner and add flowers and cake to our shopping list.');
  await page.waitForTimeout(500);
  await shot(page, '02-orb');

  // ── 3: Calendar ──────────────────────────────────────────────────────────
  console.log('[3/4] Calendar');
  await go(page, `${BASE_URL}/app/calendar`, 3000);
  await shot(page, '03-calendar');

  // ── 4: Shopping ──────────────────────────────────────────────────────────
  console.log('[4/4] Shopping');
  await go(page, `${BASE_URL}/app/shopping`, 2800);
  await shot(page, '04-shopping');

  await browser.close();
  console.log(`\nAll done.\n  Raw:    screenshots/raw-ipad/\n  Framed: screenshots/framed-ipad/`);
}

main().catch(e => { console.error(e); process.exit(1); });
