/**
 * iPad App Store screenshot capture — Eazy.Family
 * Usage:  SHOT_LANG=de node screenshots/capture-ipad.mjs   (German → *-ipad-de/)
 *         node screenshots/capture-ipad.mjs                 (English → *-ipad/)
 * Target: iPad Pro 12.9"/13" — 2048×2732 (1024×1366 CSS @ DPR 2). This IS the
 * App Store dimension, so framed output is uploadable directly (no finalize).
 * Screens: 01-home, 02-orb, 03-calendar, 04-shopping, 05-family.
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG = process.env.SHOT_LANG || 'en';

const BASE_URL = 'https://eazy.family';
const EMAIL = process.env.DEMO_EMAIL || 'hello@eazy.family';
const PASSWORD = process.env.DEMO_PASSWORD || 'EZ.Simpsons2026';
const SUPABASE_URL = 'https://jfztyhuagxruhawchfem.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0';

const VP_W = 1024, VP_H = 1366, DPR = 2;
const SCR_W = VP_W * DPR, SCR_H = VP_H * DPR; // 2048×2732
const UA = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const PAGE_BG = '#FDF9F3';

const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const evISO = (day, h, m = 0) => { const d = new Date(TODAY); d.setDate(d.getDate() + day); d.setHours(h, m, 0, 0); return d.toISOString(); };

const SUFFIX = LANG === 'en' ? '' : `-${LANG}`;
const OUT_RAW = path.join(__dirname, `raw-ipad${SUFFIX}`);
const OUT_FRAMED = path.join(__dirname, `framed-ipad${SUFFIX}`);
mkdirSync(OUT_RAW, { recursive: true });
mkdirSync(OUT_FRAMED, { recursive: true });

const RENAME = { Homer: 'Tom', Marge: 'Sarah', Bart: 'Liam', Lisa: 'Zoe', Maggie: 'Emma' };

const CONTENT = {
  en: {
    tasks: ['School pickup — Zoe & Liam', 'Book pediatrician checkup (Liam)', 'Soccer practice gear for Zoe', 'Pay school fees (due Friday)', 'Car service appointment'],
    cal: [
      { id: 'demo-c1', title: 'Dentist — Liam', location: 'City Dental Clinic', color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: "Zoe's dance recital", location: 'Community Hall', color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Swimming Lesson', location: 'Aquatic Center', color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: "Children's Museum", location: null, color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: "Family dinner @ Grandma's", location: null, color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    shopping: ['Bananas', 'Cherry tomatoes', 'Organic whole milk', 'Free-range eggs', 'Cheddar cheese', 'Chicken breast', 'Sourdough bread', 'Coffee beans', 'Orange juice', 'Dish soap'],
    shared: [{ title: 'Book family holiday', day: 3 }, { title: 'Sign school permission slip', day: 1 }, { title: 'Buy birthday gift for Emma', day: 5 }],
    orb: 'Create a task to plan anniversary dinner and add flowers and cake to our shopping list.',
    dismiss: ['Skip', "Let's go"],
  },
  de: {
    tasks: ['Zoe & Liam von der Schule abholen', 'Kinderarzt-Termin buchen (Liam)', 'Fußballausrüstung für Zoe', 'Schulgebühren zahlen (bis Freitag)', 'Termin Autoservice'],
    cal: [
      { id: 'demo-c1', title: 'Zahnarzt — Liam', location: 'Zahnklinik', color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: 'Zoes Tanzaufführung', location: 'Gemeindesaal', color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Schwimmkurs', location: 'Schwimmbad', color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: 'Kindermuseum', location: null, color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: 'Abendessen bei Oma', location: null, color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    shopping: ['Bananen', 'Kirschtomaten', 'Bio-Vollmilch', 'Freilandeier', 'Cheddar-Käse', 'Hähnchenbrust', 'Sauerteigbrot', 'Kaffeebohnen', 'Orangensaft', 'Spülmittel'],
    shared: [{ title: 'Familienurlaub buchen', day: 3 }, { title: 'Einverständniserklärung Schule unterschreiben', day: 1 }, { title: 'Geburtstagsgeschenk für Emma kaufen', day: 5 }],
    orb: 'Erstelle eine Aufgabe, um das Jahrestag-Dinner zu planen, und füge Blumen und Kuchen zur Einkaufsliste hinzu.',
    dismiss: ['Überspringen', "Los geht's", 'Weiter', 'Fertig'],
  },
};
const C = CONTENT[LANG] || CONTENT.en;
const POOL = ['Sarah', 'Liam', 'Zoe', 'Tom'];

function frameSVG() {
  const W = SCR_W, H = SCR_H, R = 52;
  const pillW = 420, pillH = 72, pillR = 36, pillX = (W - pillW) / 2, pillY = 32;
  const barW = 560, barH = 14, barR = 7, barX = (W - barW) / 2, barY = H - 52;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><mask id="corners"><rect width="${W}" height="${H}" fill="white"/><rect width="${W}" height="${H}" rx="${R}" fill="black"/></mask></defs>
  <rect width="${W}" height="${H}" fill="${PAGE_BG}" mask="url(#corners)"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R}" fill="none" stroke="rgba(180,155,140,0.45)" stroke-width="1"/>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillR}" fill="#0d0d0d"/>
  <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barR}" fill="rgba(0,0,0,0.22)"/></svg>`;
}
async function applyFrame(rawPath, outPath) {
  const frame = await sharp(Buffer.from(frameSVG())).png().toBuffer();
  await sharp(rawPath).resize(SCR_W, SCR_H, { fit: 'fill' }).composite([{ input: frame, top: 0, left: 0 }]).flatten({ background: PAGE_BG }).png().toFile(outPath);
  console.log(`   ✓ ${path.basename(outPath)}`);
}

async function seedData() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: auth, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error || !auth.user) { console.warn('Seed auth failed:', error?.message); return; }
  const userId = auth.user.id;
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-language', p_value: LANG });

  const { data: membership } = await sb.from('family_members').select('family_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const familyId = membership?.family_id;
  let memberIds = [];
  if (familyId) {
    const { data: members } = await sb.from('family_members').select('id, user_id, name').eq('family_id', familyId).eq('is_active', true);
    for (const m of (members || [])) { if (RENAME[m.name]) await sb.from('family_members').update({ name: RENAME[m.name] }).eq('id', m.id); }
    memberIds = (members || []).filter(m => m.user_id !== userId).map(m => m.user_id);
  }

  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'task');
  for (const title of C.tasks) await sb.from('tasks').insert({ title, type: 'task', user_id: userId, completed: false });

  await sb.from('tasks').delete().eq('user_id', userId).in('type', ['shopping', 'shopping_personal']);
  for (const title of C.shopping) await sb.from('tasks').insert({ title, type: 'shopping_personal', user_id: userId, completed: false });

  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'shared');
  for (const s of C.shared) await sb.from('tasks').insert({ title: s.title, type: 'shared', user_id: userId, completed: false, due_date: evISO(s.day, 9, 0), assigned_to: memberIds.length ? memberIds[s.day % memberIds.length] : null, family_id: familyId || null });

  const cal = C.cal.map((e, i) => ({ id: e.id, title: e.title, startDate: evISO(e.day, e.h, e.m || 0), endDate: evISO(e.day, e.h, (e.m || 0) + e.dur), allDay: false, ...(e.location ? { location: e.location } : {}), type: 'event', color: e.color, attendees: POOL.slice(0, 2 + (i % 2)) }));
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-calendar-items', p_value: cal });

  console.log(`Seed complete (lang=${LANG}).`);
  await sb.auth.signOut();
}

async function seedCalendar(page) {
  const cal = C.cal.map((e, i) => ({ id: e.id, title: e.title, startDate: evISO(e.day, e.h, e.m || 0), endDate: evISO(e.day, e.h, (e.m || 0) + e.dur), allDay: false, ...(e.location ? { location: e.location } : {}), type: 'event', color: e.color, attendees: POOL.slice(0, 2 + (i % 2)) }));
  await page.evaluate((events) => localStorage.setItem('eazy-family-calendar-items', JSON.stringify(events)), cal);
}

async function main() {
  console.log(`Seeding demo data (lang=${LANG})…`);
  await seedData();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: VP_W, height: VP_H }, deviceScaleFactor: DPR, userAgent: UA });
  const page = await context.newPage();

  console.log('Logging in…');
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app**', { timeout: 25000 });
  await page.waitForTimeout(2000);
  await page.evaluate((lng) => { localStorage.setItem('eazy-family-language', lng); localStorage.setItem('eazy-tour-banner-dismissed', 'true'); }, LANG);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  await page.goto(`${BASE_URL}/app`); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
  await seedCalendar(page);

  const go = async (url, ms = 2800) => { await page.goto(url); await page.waitForLoadState('networkidle'); await page.waitForTimeout(ms); await page.evaluate(() => window.scrollTo(0, 0)); };
  const shot = async (name) => { const raw = path.join(OUT_RAW, `${name}.png`); await page.screenshot({ path: raw, fullPage: false }); await applyFrame(raw, path.join(OUT_FRAMED, `${name}.png`)); };
  const dismiss = async () => { for (const txt of C.dismiss) { const el = page.locator(`button:has-text("${txt}")`).first(); if (await el.isVisible({ timeout: 600 }).catch(() => false)) { await el.click(); await page.waitForTimeout(300); } } };
  const step = async (label, fn) => { console.log(label); try { await fn(); } catch (e) { console.warn(`   ! ${label} skipped: ${String(e.message || e).split('\n')[0]}`); } };

  await step('\n[1/5] Home', async () => { await go(`${BASE_URL}/app`, 2500); await dismiss(); await page.evaluate(() => window.scrollTo(0, 0)); await shot('01-home'); });
  await step('[2/5] Orb', async () => {
    await go(`${BASE_URL}/app`, 1800); await dismiss();
    const box = await page.locator('[data-tutorial="orb"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up();
    await page.waitForTimeout(1600);
    const inp = page.locator('textarea').last();
    await inp.waitFor({ state: 'visible', timeout: 8000 });
    await inp.fill(C.orb); await page.waitForTimeout(500);
    await shot('02-orb');
  });
  await step('[3/5] Calendar', async () => { await go(`${BASE_URL}/app/calendar`, 3000); await shot('03-calendar'); });
  await step('[4/5] Shopping', async () => { await go(`${BASE_URL}/app/shopping`, 2800); await shot('04-shopping'); });
  await step('[5/5] Family Page', async () => { await go(`${BASE_URL}/app/family-agenda`, 2800); await shot('05-family'); });

  await browser.close();
  console.log(`\nDone.\n  Framed: screenshots/framed-ipad${SUFFIX}/`);
}
main().catch(e => { console.error(e); process.exit(1); });
