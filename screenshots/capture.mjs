/**
 * App Store screenshot capture — Eazy.Family
 * Usage:  node screenshots/capture.mjs
 * Output: screenshots/raw/  (bare 1290×2796 PNG)
 *         screenshots/framed/ (phone-framed, App Store ready)
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL   = 'https://eazy.family';
const EMAIL      = process.env.DEMO_EMAIL    || 'hello@eazy.family';
const PASSWORD   = process.env.DEMO_PASSWORD || 'EZ.Simpsons2026';

const SUPABASE_URL = 'https://jfztyhuagxruhawchfem.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0';

// App Store 6.7" iPhone (iPhone 15 Pro Max) required dimensions
const VP_W = 430;
const VP_H = 932;
const DPR  = 3;
const SCR_W = VP_W * DPR;  // 1290
const SCR_H = VP_H * DPR;  // 2796

// Phone frame canvas
const FR_W  = 1580;
const FR_H  = 3200;
const SCR_X = Math.round((FR_W - SCR_W) / 2);  // 145
const SCR_Y = 200;

// iOS 17 safe-area-inset-top (iPhone 15 Pro Max) in CSS px
const SAFE_TOP = 59;

// Today's date for calendar events
const TODAY = '2026-05-17';

const OUT_RAW    = path.join(__dirname, 'raw');
const OUT_FRAMED = path.join(__dirname, 'framed');

// ── Demo family name mapping (Simpsons → Millers) ────────────────────────────
const FAMILY_RENAME = {
  'Homer':  'Tom',
  'Marge':  'Sarah',
  'Bart':   'Liam',
  'Lisa':   'Zoe',
  'Maggie': 'Emma',
};

// ── Seed demo tasks + rename family members ───────────────────────────────────
const DEMO_TASKS = [
  { title: 'School pickup — Zoe & Liam',      type: 'task' },
  { title: 'Book pediatrician checkup (Liam)', type: 'task' },
  { title: 'Soccer practice gear for Zoe',     type: 'task' },
  { title: 'Pay school fees (due Friday)',      type: 'task' },
  { title: 'Car service appointment',           type: 'task' },
  { title: 'Grocery order for the weekend',     type: 'task' },
  { title: 'Fix garden gate latch',             type: 'task' },
  { title: 'Book summer camp registration',     type: 'task' },
  { title: 'Plan anniversary dinner',           type: 'task' },
];

async function seedData() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr || !auth.user) { console.warn('Seed: auth failed —', authErr?.message); return; }

  const userId = auth.user.id;

  // Get family membership
  const { data: myMembership } = await sb.from('family_members')
    .select('family_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const familyId = myMembership?.family_id;

  // Rename family members (Simpsons → Millers)
  if (familyId) {
    const { data: members } = await sb.from('family_members')
      .select('id, name').eq('family_id', familyId).eq('is_active', true);
    for (const m of (members || [])) {
      const newName = FAMILY_RENAME[m.name];
      if (newName) {
        await sb.from('family_members').update({ name: newName }).eq('id', m.id);
        console.log(`  Renamed ${m.name} → ${newName}`);
      }
    }
  }

  // Get updated member IDs for task assignment
  let memberIds = [];
  let memberCount = 0;
  if (familyId) {
    const { data: updatedMembers } = await sb.from('family_members')
      .select('user_id').eq('family_id', familyId).eq('is_active', true);
    memberIds = (updatedMembers || []).filter(m => m.user_id !== userId).map(m => m.user_id);
    memberCount = memberIds.length;
  }

  // Re-seed tasks
  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'task');
  for (let i = 0; i < DEMO_TASKS.length; i++) {
    const sharedWith = memberIds.length > 0 ? [memberIds[i % memberIds.length]] : null;
    await sb.from('tasks').insert({ ...DEMO_TASKS[i], user_id: userId, completed: false, shared_with: sharedWith });
  }

  // Push calendar events to cloud so they survive loadCloudPreferences on each page load
  const calendarEvents = [
    { id: 'demo-c1', title: "Dentist — Liam",       startDate: new Date(TODAY + 'T10:00:00').toISOString(), endDate: new Date(TODAY + 'T11:00:00').toISOString(), allDay: false, location: "City Dental Clinic",  type: "event", color: "#964735" },
    { id: 'demo-c2', title: "Zoe's dance recital",  startDate: new Date(TODAY + 'T18:00:00').toISOString(), endDate: new Date(TODAY + 'T19:30:00').toISOString(), allDay: false, location: "Community Hall",      type: "event", color: "#EE7BB0" },
    { id: 'demo-c3', title: "Swimming Lesson",       startDate: new Date("2026-05-19T14:00:00").toISOString(), endDate: new Date("2026-05-19T15:00:00").toISOString(), allDay: false, location: "Aquatic Center", type: "event", color: "#964735" },
    { id: 'demo-c4', title: "Children's Museum",     startDate: new Date("2026-05-21T10:00:00").toISOString(), endDate: new Date("2026-05-21T12:00:00").toISOString(), allDay: false,                             type: "event", color: "#FFC861" },
    { id: 'demo-c5', title: "Dinner @ Grandma's",   startDate: new Date("2026-05-23T18:30:00").toISOString(), endDate: new Date("2026-05-23T21:00:00").toISOString(), allDay: false,                             type: "event", color: "#44664F" },
  ];
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-calendar-items', p_value: calendarEvents });
  console.log('  Calendar events updated in cloud.');

  // Rename Simpsons names in channel messages stored in cloud
  const { data: prefRow } = await sb.from('user_preferences').select('data').eq('user_id', userId).maybeSingle();
  const channelMsgs = prefRow?.data?.['eazy-family-channel-messages'];
  if (Array.isArray(channelMsgs)) {
    const renamed = channelMsgs.map(m => ({
      ...m,
      authorName: FAMILY_RENAME[m.authorName] || m.authorName,
    }));
    await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-channel-messages', p_value: renamed });
    console.log('  Channel messages renamed.');
  }

  // Rename Simpsons names in Supabase events table + spread to future dates (not today)
  const FUTURE_EVENTS = [
    { title: "Hiking trip 🥾",          hour: 9,  min: 0,  daysOut: 2  },
    { title: "Dentist — Liam",           hour: 10, min: 0,  daysOut: 3  },
    { title: "School pickup — Liam",     hour: 15, min: 30, daysOut: 4  },
    { title: "Emma's birthday party 🎂", hour: 16, min: 0,  daysOut: 5  },
    { title: "Swim training — Zoe",      hour: 17, min: 0,  daysOut: 7  },
    { title: "Zoe's dance recital 💃",   hour: 18, min: 0,  daysOut: 8  },
    { title: "Family dinner 🍝",         hour: 19, min: 0,  daysOut: 9  },
    { title: "Parent-Teacher meeting",   hour: 19, min: 30, daysOut: 11 },
    { title: "Grandma's birthday 🎂",    hour: 12, min: 0,  daysOut: 12 },
    { title: "Family film night 🎬",     hour: 20, min: 0,  daysOut: 14 },
  ];
  const { data: existingEvents } = await sb.from('events').select('id');
  for (let i = 0; i < (existingEvents || []).length; i++) {
    const ev = existingEvents[i];
    const tpl = FUTURE_EVENTS[i % FUTURE_EVENTS.length];
    const d = new Date(TODAY);
    d.setDate(d.getDate() + tpl.daysOut);
    d.setHours(tpl.hour, tpl.min, 0, 0);
    await sb.from('events').update({ title: tpl.title, start_date: d.toISOString() }).eq('id', ev.id);
  }
  if (existingEvents?.length) console.log(`  Spread ${existingEvents.length} events to future dates.`);

  console.log(`Seeded ${DEMO_TASKS.length} tasks, ${memberCount} assignees available.`);
  await sb.auth.signOut();
}

// ── Phone frame SVGs ──────────────────────────────────────────────────────────
function shadowSVG() {
  return `<svg width="${FR_W}" height="${FR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="blur" x="-12%" y="-6%" width="128%" height="116%">
      <feGaussianBlur stdDeviation="44"/>
    </filter>
  </defs>
  <rect x="40" y="68" width="1500" height="3120" rx="155" fill="rgba(0,0,0,0.52)" filter="url(#blur)"/>
</svg>`;
}

function bezelSVG() {
  const diW = 378, diH = 108, diX = FR_W / 2 - diW / 2, diY = SCR_Y + 33;
  const hiW = 360, hiH = 15,  hiX = FR_W / 2 - hiW / 2, hiY = SCR_Y + SCR_H - 90;
  return `<svg width="${FR_W}" height="${FR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="hole">
      <rect width="${FR_W}" height="${FR_H}" fill="white"/>
      <rect x="${SCR_X}" y="${SCR_Y}" width="${SCR_W}" height="${SCR_H}" rx="55" fill="black"/>
    </mask>
  </defs>
  <rect x="40" y="40" width="1500" height="3120" rx="155" fill="#1C1C1E" mask="url(#hole)"/>
  <rect x="40" y="40" width="1500" height="3120" rx="155" fill="none"
        stroke="rgba(255,255,255,0.08)" stroke-width="3" mask="url(#hole)"/>
  <rect x="${diX}" y="${diY}" width="${diW}" height="${diH}" rx="54" fill="#080808"/>
  <rect x="${hiX}" y="${hiY}" width="${hiW}" height="${hiH}" rx="7" fill="rgba(255,255,255,0.35)"/>
  <rect x="23" y="520" width="16" height="76"  rx="8" fill="#2A2A2D"/>
  <rect x="23" y="636" width="16" height="118" rx="8" fill="#2A2A2D"/>
  <rect x="23" y="796" width="16" height="118" rx="8" fill="#2A2A2D"/>
  <rect x="1541" y="700" width="16" height="156" rx="8" fill="#2A2A2D"/>
</svg>`;
}

// ── Frame compositing ─────────────────────────────────────────────────────────
async function applyFrame(rawPath, outPath) {
  const [shadowBuf, bezelBuf] = await Promise.all([
    sharp(Buffer.from(shadowSVG())).png().toBuffer(),
    sharp(Buffer.from(bezelSVG())).png().toBuffer(),
  ]);
  await sharp({
    create: { width: FR_W, height: FR_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite([
    { input: shadowBuf, top: 0, left: 0 },
    { input: rawPath,   top: SCR_Y, left: SCR_X },
    { input: bezelBuf,  top: 0, left: 0 },
  ])
  .flatten({ background: '#F0ECE6' })
  .png()
  .toFile(outPath);
  console.log(`   ✓  ${path.basename(outPath)}`);
}

// ── Inject iOS safe area + scroll to top ──────────────────────────────────────
async function emulateSafeArea(page) {
  await page.evaluate((safePx) => {
    document.querySelectorAll('[style]').forEach(el => {
      const s = el.style;
      if (s.paddingTop    && s.paddingTop.includes('env('))    s.paddingTop    = safePx + 'px';
      if (s.marginTop     && s.marginTop.includes('env('))     s.marginTop     = safePx + 'px';
      if (s.top           && s.top.includes('env('))           s.top           = safePx + 'px';
      if (s.paddingBottom && s.paddingBottom.includes('env(')) s.paddingBottom = '34px';
    });
    // Sync <main> paddingTop to the actual fixed header height so content isn't hidden
    const header = document.querySelector('header.fixed');
    const main   = document.querySelector('main');
    if (header && main) {
      main.style.paddingTop = header.getBoundingClientRect().height + 'px';
    }
  }, SAFE_TOP);
  await page.evaluate(() => window.scrollTo(0, 0));
}

// ── Seed localStorage calendar events (both homepage + calendar page read this) ─
async function seedCalendar(page) {
  await page.evaluate((today) => {
    const events = [
      {
        id: 'demo-c1', title: "Dentist — Liam",
        startDate: new Date(today + 'T10:00:00').toISOString(),
        endDate:   new Date(today + 'T11:00:00').toISOString(),
        allDay: false, location: "City Dental Clinic", type: "event", color: "#964735"
      },
      {
        id: 'demo-c2', title: "Zoe's dance recital",
        startDate: new Date(today + 'T18:00:00').toISOString(),
        endDate:   new Date(today + 'T19:30:00').toISOString(),
        allDay: false, location: "Community Hall", type: "event", color: "#EE7BB0"
      },
      {
        id: 'demo-c3', title: "Swimming Lesson",
        startDate: new Date("2026-05-19T14:00:00").toISOString(),
        endDate:   new Date("2026-05-19T15:00:00").toISOString(),
        allDay: false, location: "Aquatic Center", type: "event", color: "#964735"
      },
      {
        id: 'demo-c4', title: "Children's Museum",
        startDate: new Date("2026-05-21T10:00:00").toISOString(),
        endDate:   new Date("2026-05-21T12:00:00").toISOString(),
        allDay: false, type: "event", color: "#FFC861"
      },
      {
        id: 'demo-c5', title: "Family dinner @ Grandma's",
        startDate: new Date("2026-05-23T18:30:00").toISOString(),
        endDate:   new Date("2026-05-23T21:00:00").toISOString(),
        allDay: false, type: "event", color: "#44664F"
      },
    ];
    localStorage.setItem('eazy-family-calendar-items', JSON.stringify(events));
  }, TODAY);
}

// ── Seed localStorage rituals + journal ───────────────────────────────────────
async function seedRitualsAndJournal(page) {
  await page.evaluate(() => {
    // Complete Morning Routine (r1) + 15 min Exercise (r3)
    // Must use .toDateString() to match what the Rituals component compares against
    localStorage.setItem('eazy-completed-rituals-today', JSON.stringify({
      date: new Date().toDateString(),
      ids: ['r1', 'r3'],
    }));

    // Journal entries
    const now = new Date();
    const entries = [
      {
        id: 'j1',
        text: "Family trip was great, all the planning was worth it. A few things we could have done without but in the end all good.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15).toISOString(),
      },
      {
        id: 'j2',
        text: "Need to get back on my evening routine, it really affects my next day. Compared to the last two weeks when I was feeling amazing.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 42).toISOString(),
      },
    ];
    localStorage.setItem('eazy-journal-entries', JSON.stringify(entries));
  });
}

// ── Screens to capture ────────────────────────────────────────────────────────
async function captureScreens(page) {
  // Seed calendar data once (localStorage persists across navigations in same context)
  await page.goto(`${BASE_URL}/app`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await seedCalendar(page);

  const go = async (url, ms = 2800) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(ms);
    await emulateSafeArea(page);
  };

  const shot = async (name) => {
    const raw = path.join(OUT_RAW, `${name}.png`);
    await page.screenshot({ path: raw, fullPage: false });
    await applyFrame(raw, path.join(OUT_FRAMED, `${name}.png`));
  };

  const dismiss = async () => {
    for (const sel of ['button:has-text("Skip")', 'button:has-text("Let\'s go")', 'button[aria-label="Skip tour"]']) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) { await el.click(); await page.waitForTimeout(400); }
    }
  };

  // 1 ── Home (scroll to top so greeting + weather visible)
  console.log('\n[1/7] Home');
  await go(`${BASE_URL}/app`);
  await dismiss();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('01-home');

  // 2 ── Orb / EZCapture with pre-filled text so Create button is active
  console.log('[2/7] Orb / EZCapture');
  await go(`${BASE_URL}/app`);
  await dismiss();
  await page.locator('[data-tutorial="orb"]').click();
  await page.waitForTimeout(900);
  // Type the demo text into the EZCapture input
  const orbInput = page.locator('textarea, input[type="text"]').last();
  await orbInput.fill('Create a task to plan anniversary dinner and add flowers and cake to our shopping list.');
  await page.waitForTimeout(400);
  await shot('02-orb');

  // 3 ── Calendar (today events already seeded to localStorage)
  console.log('[3/7] Calendar');
  await go(`${BASE_URL}/app/calendar`);
  await shot('03-calendar');

  // 4 ── Shopping
  console.log('[4/7] Shopping');
  await go(`${BASE_URL}/app/shopping`);
  await shot('04-shopping');

  // 5 ── Family Channel
  console.log('[5/7] Family Channel');
  await go(`${BASE_URL}/app/family-agenda`);
  await shot('05-channel');

  // 6 ── Rituals (seed completions + journal before navigating so component mounts with data)
  console.log('[6/7] Rituals');
  await seedRitualsAndJournal(page);
  await go(`${BASE_URL}/app/rituals`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('06-rituals');

  // 7 ── Tasks
  console.log('[7/7] Tasks');
  await go(`${BASE_URL}/app/todos`);
  await shot('07-tasks');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding demo data…');
  await seedData();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport:          { width: VP_W, height: VP_H },
    deviceScaleFactor: DPR,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  console.log('Logging in…');
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email',    EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app**', { timeout: 20000 });
  await page.waitForTimeout(2000);
  console.log('Logged in.');

  await captureScreens(page);
  await browser.close();

  console.log(`\nAll done.\n  Raw:    screenshots/raw/\n  Framed: screenshots/framed/`);
}

main().catch(e => { console.error(e); process.exit(1); });
