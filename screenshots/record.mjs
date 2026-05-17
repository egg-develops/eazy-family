/**
 * App Store preview video recorder — Eazy.Family
 * Usage:  node screenshots/record.mjs
 * Output: screenshots/video/eazy-family-preview.mp4
 *
 * Scenes (~28s):
 *  1. Home — greeting/weather visible, scroll down through modules, scroll back up
 *  2. Tap orb → EZCapture → mock voice "Add Cherry tomatoes, Organic whole milk, Greek yogurt"
 *  3. Create → AI parsing → Preview → Confirm → Shopping page (items added)
 *  4. Orb swipe-up menu demo — scroll through all items, land on Shopping
 *  5. Tap orb → mock voice "Add task to Pay school fees, due Friday" → Create → Confirm
 *  6. Orb swipe-up → Rituals → tick Morning Routine + 15 min Exercise
 *  7. Orb swipe-up → Home → long-press drag orb to left, right, then settle center-bottom
 *  8. Title card: "Your voice. One button. Every calendar. Every list. Family in sync."
 */

import { chromium } from 'playwright';
import { createClient }  from '@supabase/supabase-js';
import sharp             from 'sharp';
import { execSync }      from 'child_process';
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL     = 'https://eazy.family';
const EMAIL        = process.env.DEMO_EMAIL    || 'hello@eazy.family';
const PASSWORD     = process.env.DEMO_PASSWORD || 'EZ.Simpsons2026';
const SUPABASE_URL = 'https://jfztyhuagxruhawchfem.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0';
const TODAY        = '2026-05-17';
const VP_W         = 430;
const VP_H         = 932;
const FFMPEG       = '/opt/homebrew/bin/ffmpeg';

const VIDEO_RAW_DIR = path.join(__dirname, 'video-raw');
const VIDEO_OUT_DIR = path.join(__dirname, 'video');
mkdirSync(VIDEO_RAW_DIR, { recursive: true });
mkdirSync(VIDEO_OUT_DIR,  { recursive: true });

// ── Browser init scripts (injected before any page load) ──────────────────────

// Mock SpeechRecognition — delivers a phrase word-by-word when window._speechPhrase is set
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
          setTimeout(step, 120 + Math.random() * 50);
        };
        setTimeout(step, 180);
      };
      poll();
    }
    stop()  { this._stopped = true; this.onend && this.onend(); }
    abort() { this._stopped = true; }
  }
  window.SpeechRecognition        = MockSR;
  window.webkitSpeechRecognition  = MockSR;
})();
`;

// Mock AI fetch — returns canned parsed JSON instantly (after fake 1.3s spinner)
const AI_FETCH_MOCK = `
(function () {
  const _orig = window.fetch.bind(window);
  window.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('/functions/v1/eazy-chat')) {
      await new Promise(r => setTimeout(r, 700));
      const body   = JSON.parse(opts && opts.body ? opts.body : '{}');
      const text   = ((body.messages && body.messages[0] && body.messages[0].content) || '').toLowerCase();
      let parsed;
      if (text.includes('tomatoes') || text.includes('milk') || text.includes('yogurt') || text.includes('grocery')) {
        parsed = { type: 'shopping', title: 'Cherry tomatoes, Organic whole milk, Greek yogurt',
                   date: null, time: null, endTime: null, location: null,
                   assignees: null, reminder: null, notes: null, mood: null };
      } else if (text.includes('school fees') || text.includes('pay school') || (text.includes('task') && text.includes('fees'))) {
        parsed = { type: 'task', title: 'Pay school fees',
                   date: '2026-05-22', time: null, endTime: null, location: null,
                   assignees: null, reminder: 'Day before', notes: 'Due Friday', mood: null };
      } else {
        parsed = { type: 'task', title: (body.messages && body.messages[0] && body.messages[0].content) || 'New item',
                   date: null, time: null, endTime: null, location: null,
                   assignees: null, reminder: null, notes: null, mood: null };
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

// ── Seed demo data (same as capture.mjs) ──────────────────────────────────────
const FAMILY_RENAME = { Homer:'Tom', Marge:'Sarah', Bart:'Liam', Lisa:'Zoe', Maggie:'Emma' };
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
  const { data: auth, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error || !auth.user) { console.warn('Seed: auth failed —', error?.message); return; }
  const userId  = auth.user.id;

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

  let memberIds = [];
  if (familyId) {
    const { data: upd } = await sb.from('family_members')
      .select('user_id').eq('family_id', familyId).eq('is_active', true);
    memberIds = (upd || []).filter(m => m.user_id !== userId).map(m => m.user_id);
  }

  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'task');
  for (let i = 0; i < DEMO_TASKS.length; i++) {
    const shared = memberIds.length > 0 ? [memberIds[i % memberIds.length]] : null;
    await sb.from('tasks').insert({ ...DEMO_TASKS[i], user_id: userId, completed: false, shared_with: shared });
  }

  // Clear old shopping items so the voice-added ones stand out
  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'shopping');

  const calendarEvents = [
    { id: 'demo-c1', title: "Dentist — Liam",      startDate: new Date(TODAY+'T10:00:00').toISOString(), endDate: new Date(TODAY+'T11:00:00').toISOString(), allDay: false, location: "City Dental Clinic", type: "event", color: "#964735" },
    { id: 'demo-c2', title: "Zoe's dance recital", startDate: new Date(TODAY+'T18:00:00').toISOString(), endDate: new Date(TODAY+'T19:30:00').toISOString(), allDay: false, location: "Community Hall",    type: "event", color: "#EE7BB0" },
    { id: 'demo-c3', title: "Swimming Lesson",      startDate: new Date("2026-05-19T14:00:00").toISOString(), endDate: new Date("2026-05-19T15:00:00").toISOString(), allDay: false, location: "Aquatic Center", type: "event", color: "#964735" },
    { id: 'demo-c4', title: "Children's Museum",    startDate: new Date("2026-05-21T10:00:00").toISOString(), endDate: new Date("2026-05-21T12:00:00").toISOString(), allDay: false, type: "event", color: "#FFC861" },
    { id: 'demo-c5', title: "Dinner @ Grandma's",  startDate: new Date("2026-05-23T18:30:00").toISOString(), endDate: new Date("2026-05-23T21:00:00").toISOString(), allDay: false, type: "event", color: "#44664F" },
  ];
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-calendar-items', p_value: calendarEvents });

  // Some pre-seeded shopping items to make the list look populated before voice adds 3 more
  const existingShoppingItems = [
    { title: 'Sourdough bread',    type: 'shopping', user_id: userId, completed: false },
    { title: 'Free-range eggs',    type: 'shopping', user_id: userId, completed: false },
    { title: 'Almond butter',      type: 'shopping', user_id: userId, completed: false },
    { title: 'Orange juice',       type: 'shopping', user_id: userId, completed: true  },
    { title: 'Sparkling water ×6', type: 'shopping', user_id: userId, completed: true  },
  ];
  await Promise.all(existingShoppingItems.map(item => sb.from('tasks').insert(item)));

  console.log('  Seed complete.');
  await sb.auth.signOut();
}

// ── Page helpers ──────────────────────────────────────────────────────────────

async function waitAndSettle(page, ms = 700) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
}

async function seedLocalStorage(page) {
  await page.evaluate((today) => {
    // Calendar events (localStorage copy — cloud already has them)
    const events = [
      { id: 'demo-c1', title: "Dentist — Liam",      startDate: new Date(today+'T10:00:00').toISOString(), endDate: new Date(today+'T11:00:00').toISOString(), allDay: false, location: "City Dental Clinic", type: "event", color: "#964735" },
      { id: 'demo-c2', title: "Zoe's dance recital", startDate: new Date(today+'T18:00:00').toISOString(), endDate: new Date(today+'T19:30:00').toISOString(), allDay: false, location: "Community Hall",    type: "event", color: "#EE7BB0" },
      { id: 'demo-c3', title: "Swimming Lesson",      startDate: new Date("2026-05-19T14:00:00").toISOString(), allDay: false, type: "event", color: "#964735" },
    ];
    localStorage.setItem('eazy-family-calendar-items', JSON.stringify(events));
    // Clear completed rituals — we'll tick them live in the video
    localStorage.removeItem('eazy-completed-rituals-today');
    // Reset orb to default center-bottom position
    localStorage.removeItem('eazy-button-pos');
  }, TODAY);
}

// Get orb button centre coordinates (re-computed after every drag)
async function orbCenter(page) {
  const b = await page.locator('[data-tutorial="orb"]').boundingBox({ timeout: 5000 });
  if (!b) throw new Error('Orb button not found');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

// Simple tap — opens EZCapture (direct dispatch ensures React handler fires)
async function tapOrb(page) {
  const { x, y } = await orbCenter(page);
  await page.evaluate(({ x, y }) => {
    const orb = document.querySelector('[data-tutorial="orb"]');
    if (!orb) return;
    const opts = { bubbles: true, cancelable: true, composed: true, pointerId: 1, clientX: x, clientY: y };
    orb.dispatchEvent(new PointerEvent('pointerdown', opts));
    return new Promise(r => setTimeout(() => {
      orb.dispatchEvent(new PointerEvent('pointerup', opts));
      r();
    }, 90));
  }, { x, y });
  await page.waitForTimeout(600);
}

// Dispatch a PointerEvent directly on the orb element (bypasses capture limitations)
async function orbPointerEvent(page, type, clientX, clientY) {
  await page.evaluate(({ type, clientX, clientY }) => {
    const orb = document.querySelector('[data-tutorial="orb"]');
    if (!orb) return;
    orb.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 1, clientX, clientY,
    }));
  }, { type, clientX, clientY });
}

// Swipe up to open nav menu, scroll through all items, release on targetIndex
// menuItems order: Home(0) Calendar(1) Tasks(2) Shopping(3) Rituals(4) Settings(5)
// deltaY: item N activates at 40 + N*56 from longPressOriginY
async function swipeOrbMenu(page, targetIndex) {
  const { x, y } = await orbCenter(page);

  // Run the entire swipe as a self-contained JS animation inside the page so that
  // all pointermove events are guaranteed to reach React's orb handlers even in headless mode
  await page.evaluate(({ x, y, targetIndex }) => {
    const TOP_DELTA    = 360; // sweeps past Settings (threshold 320)
    const TARGET_DELTA = 40 + targetIndex * 56 + 28;

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
      // Phase 1: sweep upward (10px per 14ms ≈ 700px/s — visually smooth)
      const sweepUp = () => {
        dispatch('pointermove', y - d);
        d += 10;
        if (d <= TOP_DELTA) { setTimeout(sweepUp, 14); }
        else { setTimeout(comeDown, 250); } // brief pause at Settings
      };
      // Phase 2: sweep back down to target
      let d2 = TOP_DELTA;
      const comeDown = () => {
        dispatch('pointermove', y - d2);
        d2 -= 10;
        if (d2 >= TARGET_DELTA) { setTimeout(comeDown, 14); }
        else {
          setTimeout(() => {
            dispatch('pointerup', y - TARGET_DELTA);
            resolve();
          }, 200);
        }
      };

      setTimeout(sweepUp, 50);
    });
  }, { x, y, targetIndex });

  await page.waitForTimeout(800);
}

// Long-press orb then drag to (toX, toY), snaps to nearest anchor on release
async function dragOrb(page, toX, toY) {
  const { x, y } = await orbCenter(page);

  await page.evaluate(({ fromX, fromY, toX, toY }) => {
    const dispatch = (type, clientX, clientY) => {
      const orb = document.querySelector('[data-tutorial="orb"]');
      if (!orb) return;
      orb.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 1, clientX, clientY,
      }));
    };

    return new Promise(resolve => {
      dispatch('pointerdown', fromX, fromY);

      setTimeout(() => {  // wait for 700ms long-press trigger
        let i = 0;
        const steps = 30;
        const moveStep = () => {
          const cx = fromX + (toX - fromX) * i / steps;
          const cy = fromY + (toY - fromY) * i / steps;
          dispatch('pointermove', cx, cy);
          i++;
          if (i <= steps) { setTimeout(moveStep, 24); }
          else {
            setTimeout(() => { dispatch('pointerup', toX, toY); resolve(); }, 200);
          }
        };
        moveStep();
      }, 700);
    });
  }, { fromX: x, fromY: y, toX, toY });

  await page.waitForTimeout(700);
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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding demo data…');
  await seedData();

  // Clean up any previous raw recording
  try {
    readdirSync(VIDEO_RAW_DIR).filter(f => f.endsWith('.webm')).forEach(f =>
      unlinkSync(path.join(VIDEO_RAW_DIR, f)),
    );
  } catch {}

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VP_W, height: VP_H },
    deviceScaleFactor: 1,
    recordVideo: { dir: VIDEO_RAW_DIR, size: { width: VP_W, height: VP_H } },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  });

  await context.addInitScript(SPEECH_MOCK);
  await context.addInitScript(AI_FETCH_MOCK);

  const page = await context.newPage();

  // Login
  console.log('Logging in…');
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app**', { timeout: 20000 });
  await waitAndSettle(page, 1500);

  // ── Scene 1: Home — scroll down to reveal modules, scroll back (≈2.5s) ───────
  console.log('Scene 1: Home scroll');
  await page.goto(`${BASE_URL}/app`);
  await waitAndSettle(page, 1000);
  await seedLocalStorage(page);

  for (const sel of ['button:has-text("Skip")', 'button:has-text("Let\'s go")', 'button[aria-label="Skip tour"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) { await el.click(); await page.waitForTimeout(200); }
  }

  await smoothScroll(page, 0, 340, 900);
  await page.waitForTimeout(400);
  await smoothScroll(page, 340, 0, 600);
  await page.waitForTimeout(300);

  // ── Scene 2: Shopping voice input (≈5.5s) ────────────────────────────────────
  console.log('Scene 2: Shopping voice');
  await tapOrb(page);

  const micBtn = page.locator('button').filter({ has: page.locator('.lucide-mic') }).first();
  await micBtn.waitFor({ state: 'visible', timeout: 4000 });
  await micBtn.click({ force: true });

  // Queue phrase for mock SR (13 words × ~135ms ≈ 1.8s typing effect)
  await page.evaluate(() => {
    window._speechPhrase = 'Add Cherry tomatoes Organic whole milk and Greek yogurt to our shopping list';
  });
  await page.waitForTimeout(2800);   // wait for delivery
  await micBtn.click({ force: true });
  await page.waitForTimeout(400);

  // ── Scene 3: Create → AI parse → Preview → Confirm → Shopping (≈3s) ─────────
  console.log('Scene 3: Create & confirm');
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta && !ta.value.trim()) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'Add Cherry tomatoes, Organic whole milk, and Greek yogurt to our shopping list');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Create")').click({ force: true });
  await page.locator('button:has-text("Confirm & Save")').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Confirm & Save")').click({ force: true });
  await page.waitForURL('**/shopping**', { timeout: 8000 });
  await waitAndSettle(page, 1000);

  // ── Scene 4: Shopping page visible then orb menu sweep (≈4s) ─────────────────
  console.log('Scene 4: Shopping + orb menu demo');
  await smoothScroll(page, 0, 0, 150);
  await page.waitForTimeout(900);

  await swipeOrbMenu(page, 3); // sweep up/down, land on Shopping
  await page.waitForTimeout(500);

  // ── Scene 5: Task voice input (≈5.5s) ────────────────────────────────────────
  console.log('Scene 5: Task voice');
  await tapOrb(page);

  const micBtn2 = page.locator('button').filter({ has: page.locator('.lucide-mic') }).first();
  await micBtn2.waitFor({ state: 'visible', timeout: 4000 });
  await micBtn2.click({ force: true });

  await page.evaluate(() => {
    window._speechPhrase = 'add task Pay school fees due Friday';
  });
  await page.waitForTimeout(2000);
  await micBtn2.click({ force: true });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta && !ta.value.trim()) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'Pay school fees, due Friday');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Create")').click({ force: true });
  await page.locator('button:has-text("Confirm & Save")').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Confirm & Save")').click({ force: true });
  await page.waitForURL('**/todos**', { timeout: 8000 });
  await waitAndSettle(page, 600);

  // ── Scene 6: Orb → Rituals → tick two rituals (≈3s) ─────────────────────────
  console.log('Scene 6: Rituals');
  await swipeOrbMenu(page, 4);
  await page.waitForURL('**/rituals**', { timeout: 5000 });
  await waitAndSettle(page, 600);

  await page.locator('button:has-text("Morning Routine")').first().click({ force: true });
  await page.waitForTimeout(600);
  await page.locator('button:has-text("15 min Exercise")').first().click({ force: true });
  await page.waitForTimeout(700);

  // ── Scene 7: Orb → Home → drag orb left then back to center (≈3.5s) ─────────
  console.log('Scene 7: Home + orb drag');
  await swipeOrbMenu(page, 0);
  await page.waitForURL(/\/app\/?$/, { timeout: 5000 });
  await waitAndSettle(page, 700);

  // Long-press drag to left side, then back to center-bottom
  await dragOrb(page, 56, VP_H - 130);   // snap to left anchor
  await page.waitForTimeout(300);
  await dragOrb(page, 215, VP_H - 64);  // snap back to center-bottom
  await page.waitForTimeout(1000);

  // ── Done — stop recording ─────────────────────────────────────────────────────
  console.log('Stopping recording…');
  await context.close();
  await browser.close();

  // ── Post-process with ffmpeg ──────────────────────────────────────────────────
  const webmFiles = readdirSync(VIDEO_RAW_DIR).filter(f => f.endsWith('.webm'));
  if (!webmFiles.length) { console.error('No WebM file found in', VIDEO_RAW_DIR); process.exit(1); }
  const rawVideo = path.join(VIDEO_RAW_DIR, webmFiles[0]);
  console.log(`Raw video: ${rawVideo}`);

  const scaledMp4  = path.join(VIDEO_RAW_DIR, 'scaled.mp4');
  const titleCard  = path.join(VIDEO_RAW_DIR, 'title.mp4');
  const finalVideo = path.join(VIDEO_OUT_DIR,  'eazy-family-preview.mp4');

  // 1. Scale WebM → 886×1920 H.264, trimmed to 30s
  console.log('Scaling to App Store dimensions (886×1920)…');
  execSync([
    FFMPEG, '-y',
    '-i', JSON.stringify(rawVideo),
    '-t', '27',  // trim to 27s (title card adds 3s = 30s App Store max)
    '-vf', '"scale=886:1920:force_original_aspect_ratio=decrease,pad=886:1920:(ow-iw)/2:(oh-ih)/2:color=#FDF9F3"',
    '-r', '30',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    JSON.stringify(scaledMp4),
  ].join(' '), { stdio: 'inherit' });

  // 2. Generate 3-second title card PNG with sharp (drawtext requires libfreetype)
  console.log('Generating title card…');
  const titlePng = path.join(VIDEO_RAW_DIR, 'title.png');
  const titleSvg = `<svg width="886" height="1920" xmlns="http://www.w3.org/2000/svg">
    <rect width="886" height="1920" fill="#1C1C18"/>
    <text x="443" y="900" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="52" fill="white">Your voice. One button.</text>
    <text x="443" y="980" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="52" fill="white">Every calendar. Every list.</text>
    <text x="443" y="1085" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="bold" fill="#D97B66">Family in sync.</text>
  </svg>`;
  await sharp(Buffer.from(titleSvg)).png().toFile(titlePng);

  // Convert title PNG to 3s video by looping it
  execSync([
    FFMPEG, '-y',
    '-loop', '1', '-i', JSON.stringify(titlePng),
    '-t', '3', '-r', '30',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    JSON.stringify(titleCard),
  ].join(' '), { stdio: 'inherit' });

  // 3. Concatenate main video + title card
  console.log('Concatenating…');
  const concatList = path.join(VIDEO_RAW_DIR, 'concat.txt');
  writeFileSync(concatList, `file '${scaledMp4}'\nfile '${titleCard}'\n`);

  execSync([
    FFMPEG, '-y',
    '-f', 'concat', '-safe', '0', '-i', JSON.stringify(concatList),
    '-c', 'copy',
    JSON.stringify(finalVideo),
  ].join(' '), { stdio: 'inherit' });

  console.log(`\n✓ App Store preview video saved:\n  ${finalVideo}`);
}

main().catch(e => { console.error(e); process.exit(1); });
