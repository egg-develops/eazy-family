/**
 * App Store preview video recorder — Eazy.Family
 * Usage:  node screenshots/record.mjs
 * Output: screenshots/video/eazy-family-preview.mp4
 *
 * Scenes (~22s):
 *  1. Home — greeting visible, slow scroll down through modules
 *  2. Long-press orb → EZCapture → Shopping tag → mic → speak shopping items → confirm
 *  3. Orb swipe-up menu → scroll to Shopping → items visible in place
 *  4. Long-press orb → EZCapture → Event tag → mic → speak dentist event → confirm
 *  5. Orb swipe-up menu → scroll to Calendar → dentist visible on agenda
 *  6. Home screen (end)
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL     = 'https://eazy.family';
const EMAIL        = process.env.DEMO_EMAIL    || 'hello@eazy.family';
const PASSWORD     = process.env.DEMO_PASSWORD || 'EZ.Simpsons2026';
const SUPABASE_URL = 'https://jfztyhuagxruhawchfem.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0';
const TODAY        = '2026-05-18';
const VP_W         = 430;
const VP_H         = 932;
const FFMPEG       = '/opt/homebrew/bin/ffmpeg';

const VIDEO_RAW_DIR = path.join(__dirname, 'video-raw');
const VIDEO_OUT_DIR = path.join(__dirname, 'video');
mkdirSync(VIDEO_RAW_DIR, { recursive: true });
mkdirSync(VIDEO_OUT_DIR, { recursive: true });

// ── Mock SpeechRecognition ────────────────────────────────────────────────────
const SPEECH_MOCK = `
(function () {
  class MockSR {
    constructor() {
      this.continuous     = true;
      this.interimResults = true;
      this.lang           = 'en-US';
      this.onresult       = null;
      this.onend          = null;
      this.onerror        = null;
      this._stopped       = false;
    }
    start() {
      this._stopped = false;
      window._activeSR = this;
      const poll = () => {
        if (this._stopped) return;
        const phrase = window._speechPhrase;
        if (!phrase) { setTimeout(poll, 80); return; }
        window._speechPhrase = null;
        const words = phrase.split(' ');
        let soFar = '';
        let i = 0;
        const step = () => {
          if (this._stopped) return;
          if (i >= words.length) { this.onend && this.onend(); return; }
          soFar += (soFar ? ' ' : '') + words[i++];
          if (this.onresult) {
            const result = { 0: { transcript: soFar, confidence: 0.95 }, length: 1, isFinal: i >= words.length };
            this.onresult({ results: [result], resultIndex: 0 });
          }
          setTimeout(step, 130 + Math.random() * 40);
        };
        setTimeout(step, 180);
      };
      poll();
    }
    stop()  { this._stopped = true; this.onend && this.onend(); }
    abort() { this._stopped = true; }
  }
  window.SpeechRecognition       = MockSR;
  window.webkitSpeechRecognition = MockSR;
})();
`;

// ── AI fetch mock — instant response, no parsing delay shown ─────────────────
const AI_FETCH_MOCK = `
(function () {
  const _orig = window.fetch.bind(window);
  window.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('/functions/v1/eazy-chat')) {
      const body = JSON.parse(opts && opts.body ? opts.body : '{}');
      const text = ((body.messages && body.messages[0] && body.messages[0].content) || '').toLowerCase();
      let parsed;
      if (text.includes('dentist') || text.includes('thursday') || text.includes('calendar')) {
        parsed = { type: 'event', title: 'Dentist',
                   date: '2026-05-21', time: '10:00', endTime: '11:00',
                   location: null, assignees: null, reminder: null, notes: null, mood: null };
      } else {
        parsed = { type: 'shopping', title: 'Cherry tomatoes, Greek yogurt',
                   date: null, time: null, endTime: null,
                   location: null, assignees: null, reminder: null, notes: null, mood: null };
      }
      const json = JSON.stringify(parsed);
      const sse  = 'data: ' + JSON.stringify({ choices: [{ delta: { content: json } }] }) + '\\n\\ndata: [DONE]\\n\\n';
      const enc  = new TextEncoder().encode(sse);
      const s    = new ReadableStream({ start(c) { c.enqueue(enc); c.close(); } });
      return new Response(s, { ok: true, status: 200, headers: { 'content-type': 'text/event-stream' } });
    }
    return _orig(url, opts);
  };
})();
`;

// ── Seed demo data ────────────────────────────────────────────────────────────
const FAMILY_RENAME = { Homer: 'Tom', Marge: 'Sarah', Bart: 'Liam', Lisa: 'Zoe', Maggie: 'Emma' };

async function seedData() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: auth, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error || !auth.user) { console.warn('Seed: auth failed —', error?.message); return; }
  const userId   = auth.user.id;

  const { data: myMembership } = await sb.from('family_members')
    .select('family_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const familyId = myMembership?.family_id;

  if (familyId) {
    const { data: members } = await sb.from('family_members')
      .select('id, name').eq('family_id', familyId).eq('is_active', true);
    for (const m of (members || [])) {
      const newName = FAMILY_RENAME[m.name];
      if (newName) await sb.from('family_members').update({ name: newName }).eq('id', m.id);
    }
  }

  // Seed tasks
  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'task');
  const tasks = [
    { title: 'School pickup — Zoe & Liam',      type: 'task' },
    { title: 'Book pediatrician checkup (Liam)', type: 'task' },
    { title: 'Soccer practice gear for Zoe',     type: 'task' },
    { title: 'Pay school fees (due Friday)',      type: 'task' },
    { title: 'Car service appointment',           type: 'task' },
  ];
  for (const t of tasks) {
    await sb.from('tasks').insert({ ...t, user_id: userId, completed: false });
  }

  // Seed calendar events in cloud
  const calendarEvents = [
    { id: 'demo-c1', title: "Dentist — Liam",      startDate: new Date(TODAY+'T10:00:00').toISOString(), endDate: new Date(TODAY+'T11:00:00').toISOString(), allDay: false, location: "City Dental Clinic", type: "event", color: "#964735" },
    { id: 'demo-c2', title: "Zoe's dance recital", startDate: new Date(TODAY+'T18:00:00').toISOString(), endDate: new Date(TODAY+'T19:30:00').toISOString(), allDay: false, location: "Community Hall",    type: "event", color: "#EE7BB0" },
    { id: 'demo-c3', title: "Swimming Lesson",      startDate: new Date("2026-05-20T14:00:00").toISOString(), endDate: new Date("2026-05-20T15:00:00").toISOString(), allDay: false, location: "Aquatic Center", type: "event", color: "#964735" },
    { id: 'demo-c4', title: "Children's Museum",    startDate: new Date("2026-05-21T10:00:00").toISOString(), endDate: new Date("2026-05-21T12:00:00").toISOString(), allDay: false, type: "event", color: "#FFC861" },
    { id: 'demo-c5', title: "Dinner @ Grandma's",  startDate: new Date("2026-05-23T18:30:00").toISOString(), endDate: new Date("2026-05-23T21:00:00").toISOString(), allDay: false, type: "event", color: "#44664F" },
  ];
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-calendar-items', p_value: calendarEvents });

  // Pre-seed a few shopping items so the list looks populated before voice adds more
  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'shopping');
  const shopping = [
    { title: 'Sourdough bread',    type: 'shopping', user_id: userId, completed: false },
    { title: 'Free-range eggs',    type: 'shopping', user_id: userId, completed: false },
    { title: 'Almond butter',      type: 'shopping', user_id: userId, completed: false },
    { title: 'Orange juice',       type: 'shopping', user_id: userId, completed: true  },
    { title: 'Sparkling water ×6', type: 'shopping', user_id: userId, completed: true  },
  ];
  await Promise.all(shopping.map(item => sb.from('tasks').insert(item)));

  console.log('  Seed complete.');
  await sb.auth.signOut();
}

// ── Log in off-screen, return Playwright storageState ─────────────────────────
async function loginAndGetState(browser) {
  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const ctx  = await browser.newContext({ viewport: { width: VP_W, height: VP_H }, userAgent: UA });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app**', { timeout: 25000 });
  await page.waitForTimeout(1500);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

// ── Page helpers ──────────────────────────────────────────────────────────────

async function waitAndSettle(page, ms = 700) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
}

async function initLocalStorage(page) {
  await page.evaluate((today) => {
    // Seed calendar events into localStorage (calendar page reads this)
    const events = [
      { id: 'demo-c1', title: "Dentist — Liam",      startDate: new Date(today+'T10:00:00').toISOString(), endDate: new Date(today+'T11:00:00').toISOString(), allDay: false, location: "City Dental Clinic", type: "event", color: "#964735" },
      { id: 'demo-c2', title: "Zoe's dance recital", startDate: new Date(today+'T18:00:00').toISOString(), endDate: new Date(today+'T19:30:00').toISOString(), allDay: false, location: "Community Hall",    type: "event", color: "#EE7BB0" },
      { id: 'demo-c3', title: "Swimming Lesson",      startDate: new Date("2026-05-20T14:00:00").toISOString(), allDay: false, type: "event", color: "#964735" },
    ];
    localStorage.setItem('eazy-family-calendar-items', JSON.stringify(events));
    localStorage.removeItem('eazy-completed-rituals-today');
    localStorage.removeItem('eazy-button-pos');
  }, TODAY);
}

// Get orb center coordinates
async function orbCenter(page) {
  const b = await page.locator('[data-tutorial="orb"]').boundingBox({ timeout: 5000 });
  if (!b) throw new Error('Orb button not found');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

// Hold for 620ms (past the 500ms long-press threshold) then release with no movement.
// This triggers drag mode visually, then on pointerup (no movement) → opens EZCapture.
async function longPressOrb(page) {
  const { x, y } = await orbCenter(page);
  await page.evaluate(({ x, y }) => {
    const orb = document.querySelector('[data-tutorial="orb"]');
    if (!orb) return;
    const opts = { bubbles: true, cancelable: true, composed: true, pointerId: 1, clientX: x, clientY: y };
    orb.dispatchEvent(new PointerEvent('pointerdown', opts));
    return new Promise(r => setTimeout(() => {
      orb.dispatchEvent(new PointerEvent('pointerup', opts));
      r();
    }, 620));
  }, { x, y });
  await page.waitForTimeout(400); // wait for EZCapture to open
}

// Swipe orb upward to open nav menu, sweep all the way to Settings then come back
// down to targetIndex at a natural pace (STEP_MS=28 ≈ 360px/s).
// menuItems: Home(0) Calendar(1) Tasks(2) Shopping(3) Rituals(4) Settings(5)
async function swipeOrbMenu(page, targetIndex) {
  const { x, y } = await orbCenter(page);
  await page.evaluate(({ x, y, targetIndex }) => {
    const TOP_DELTA    = 360; // sweeps past Settings (threshold ~320)
    const TARGET_DELTA = 40 + targetIndex * 56 + 28;
    const STEP_MS      = 28;  // natural pace ~360px/s (down from the original 14ms)

    const dispatch = (type, clientY) => {
      const orb = document.querySelector('[data-tutorial="orb"]');
      if (!orb) return;
      orb.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 1, clientX: x, clientY,
      }));
    };

    return new Promise(resolve => {
      dispatch('pointerdown', y);

      let d = 0;
      // Phase 1: sweep upward
      const sweepUp = () => {
        dispatch('pointermove', y - d);
        d += 10;
        if (d <= TOP_DELTA) { setTimeout(sweepUp, STEP_MS); }
        else { setTimeout(comeDown, 350); } // brief pause at top
      };
      // Phase 2: sweep back down to target
      let d2 = TOP_DELTA;
      const comeDown = () => {
        dispatch('pointermove', y - d2);
        d2 -= 10;
        if (d2 >= TARGET_DELTA) { setTimeout(comeDown, STEP_MS); }
        else {
          setTimeout(() => {
            dispatch('pointerup', y - TARGET_DELTA);
            resolve();
          }, 250);
        }
      };
      setTimeout(sweepUp, 50);
    });
  }, { x, y, targetIndex });
  await page.waitForTimeout(400);
}

// Smooth scroll helper
async function smoothScroll(page, from, to, durationMs = 800) {
  const steps = Math.ceil(durationMs / 20);
  for (let i = 0; i <= steps; i++) {
    const pos = from + (to - from) * (i / steps);
    await page.evaluate((y) => window.scrollTo(0, y), pos);
    await page.waitForTimeout(20);
  }
}

// Silently dismiss any onboarding/tutorial overlay
async function dismissTutorial(page) {
  for (const sel of ['button:has-text("Skip")', 'button:has-text("Let\'s go")', 'button[aria-label="Skip tour"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 300 }).catch(() => false)) {
      await el.click();
      await page.waitForTimeout(150);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding demo data…');
  await seedData();

  const browser = await chromium.launch({ headless: true });

  console.log('Logging in (off-screen, not recorded)…');
  const storageState = await loginAndGetState(browser);

  // Clean previous raw recording
  try {
    readdirSync(VIDEO_RAW_DIR).filter(f => f.endsWith('.webm')).forEach(f =>
      unlinkSync(path.join(VIDEO_RAW_DIR, f)),
    );
  } catch {}

  // Recording context — starts already authenticated via storageState
  const context = await browser.newContext({
    viewport: { width: VP_W, height: VP_H },
    deviceScaleFactor: 1,
    recordVideo: { dir: VIDEO_RAW_DIR, size: { width: VP_W, height: VP_H } },
    storageState,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  });

  await context.addInitScript(SPEECH_MOCK);
  await context.addInitScript(AI_FETCH_MOCK);

  const page = await context.newPage();

  // ── Scene 1: Home — slow scroll from greeting to bottom of modules ───────────
  console.log('Scene 1: Home scroll');
  await page.goto(`${BASE_URL}/app`);
  await waitAndSettle(page, 200);    // minimal wait — get on screen fast
  await initLocalStorage(page);
  await dismissTutorial(page);
  await page.waitForTimeout(100);
  await smoothScroll(page, 0, 520, 2500); // slow reveal of all modules
  await page.waitForTimeout(400);

  // ── Scene 2: Long-press orb → Shopping tag → mic → speak → confirm (~5.5s) ──
  console.log('Scene 2: Shopping voice');
  await longPressOrb(page); // 620ms hold → drag mode visual → release → EZCapture opens

  // Select Shopping tag (EZCapture defaults to 'event' from /app)
  const shoppingTag = page.locator('button').filter({ hasText: 'Shopping' }).first();
  if (await shoppingTag.isVisible({ timeout: 2000 }).catch(() => false)) {
    await shoppingTag.click({ force: true });
    await page.waitForTimeout(350);
  }

  // Click the mic button (small button inside textarea)
  const micBtn = page.locator('button').filter({ has: page.locator('.lucide-mic') }).first();
  await micBtn.waitFor({ state: 'visible', timeout: 4000 });
  await micBtn.click({ force: true });
  await page.waitForTimeout(200);

  // Deliver speech phrase word-by-word via mock SR
  await page.evaluate(() => {
    window._speechPhrase = 'Add Cherry tomatoes and Greek yogurt to our shopping list';
  });
  await page.waitForTimeout(1900); // time for phrase delivery (~12 words × ~140ms)
  await micBtn.click({ force: true }); // stop mic
  await page.waitForTimeout(400);

  // Ensure textarea has text (fallback if speech mock timing was off)
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta && !ta.value.trim()) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'Add Cherry tomatoes and Greek yogurt to our shopping list');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(200);

  // Create → AI resolves instantly → Confirm screen
  await page.locator('button:has-text("Create")').click({ force: true });
  await page.locator('button:has-text("Confirm & Save")').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(250);
  await page.locator('button:has-text("Confirm & Save")').click({ force: true });
  await page.waitForURL('**/shopping**', { timeout: 8000 });
  await waitAndSettle(page, 500);

  // ── Scene 3: Orb swipe-up → Shopping — items visible in place (~3s) ──────────
  console.log('Scene 3: Orb menu → Shopping');
  await swipeOrbMenu(page, 3); // Shopping index = 3

  // ── Scene 4: Long-press orb → Event tag → mic → speak → confirm (~5.5s) ─────
  console.log('Scene 4: Event voice');
  // We are on /shopping — EZCapture will default to 'shopping', so click Event
  await longPressOrb(page);

  const eventTag = page.locator('button').filter({ hasText: 'Event' }).first();
  if (await eventTag.isVisible({ timeout: 2000 }).catch(() => false)) {
    await eventTag.click({ force: true });
    await page.waitForTimeout(350);
  }

  const micBtn2 = page.locator('button').filter({ has: page.locator('.lucide-mic') }).first();
  await micBtn2.waitFor({ state: 'visible', timeout: 4000 });
  await micBtn2.click({ force: true });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    window._speechPhrase = 'Add Dentist on calendar this Thursday 10am';
  });
  await page.waitForTimeout(2200);
  await micBtn2.click({ force: true }); // stop mic
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta && !ta.value.trim()) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'Add Dentist on calendar this Thursday 10am');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(200);

  await page.locator('button:has-text("Create")').click({ force: true });
  await page.locator('button:has-text("Confirm & Save")').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(250);
  await page.locator('button:has-text("Confirm & Save")').click({ force: true });
  // EZCapture.handleConfirm for 'event' navigates to /app/calendar
  await page.waitForURL('**/calendar**', { timeout: 8000 }).catch(() => {});
  await waitAndSettle(page, 900);

  // ── Scene 5: Orb swipe-up → Calendar → Dentist event on agenda ───────────────
  console.log('Scene 5: Orb menu → Calendar');
  await swipeOrbMenu(page, 1); // Calendar index = 1
  await page.waitForURL('**/calendar**', { timeout: 5000 }).catch(() => {});
  await waitAndSettle(page, 2200); // hold on calendar so dentist event is readable

  // ── Scene 6: End on Home screen ──────────────────────────────────────────────
  console.log('Scene 6: Home');
  await page.goto(`${BASE_URL}/app`);
  await waitAndSettle(page, 2500);

  // ── Stop recording ────────────────────────────────────────────────────────────
  console.log('Stopping recording…');
  await context.close();
  await browser.close();

  // ── Post-process with ffmpeg ──────────────────────────────────────────────────
  const webmFiles = readdirSync(VIDEO_RAW_DIR).filter(f => f.endsWith('.webm'));
  if (!webmFiles.length) { console.error('No WebM file found in', VIDEO_RAW_DIR); process.exit(1); }
  const rawVideo  = path.join(VIDEO_RAW_DIR, webmFiles[0]);
  const finalVideo = path.join(VIDEO_OUT_DIR, 'eazy-family-preview.mp4');
  console.log(`Raw video: ${rawVideo}`);

  // Scale WebM → 886×1920 H.264, trim to 27s (App Store max 30s)
  console.log('Scaling to App Store dimensions (886×1920), trimming to 27s…');
  execSync([
    FFMPEG, '-y',
    '-i', JSON.stringify(rawVideo),
    '-t', '27',
    '-vf', '"scale=886:1920:force_original_aspect_ratio=decrease,pad=886:1920:(ow-iw)/2:(oh-ih)/2:color=#FDF9F3"',
    '-r', '30',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-an',
    JSON.stringify(finalVideo),
  ].join(' '), { stdio: 'inherit' });

  console.log(`\n✓ App Store preview video saved:\n  ${finalVideo}`);
}

main().catch(e => { console.error(e); process.exit(1); });
