// Records a Google Calendar OAuth consent-screen demo video for Google's
// verification team. It launches REAL Chrome, auto-drives the app up to the
// Google consent screen, then waits for YOU to complete the genuine account
// pick + "Allow" (the only part that must be human), then keeps recording until
// you're back in the app. The whole session is saved as a .webm video.
//
// Usage:
//   node scripts/record-google-oauth.mjs            # auto-drive app, you do consent
//   MANUAL=1 node scripts/record-google-oauth.mjs   # record only; you drive everything
//   APP_EMAIL=you@x.com APP_PASSWORD=... node scripts/record-google-oauth.mjs
//
// IMPORTANT for the video to pass: when the Google consent screen appears,
// expand/show the scope ("View events on all your calendars") so it is readable.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('recordings');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.APP_BASE || 'https://eazy.family';
const EMAIL = process.env.APP_EMAIL || 'appreview@eazy.family';
const PASSWORD = process.env.APP_PASSWORD || 'EazyReview!2026';
const MANUAL = process.env.MANUAL === '1';
const HUMAN_TIMEOUT = 6 * 60 * 1000; // 6 min to complete the Google consent

const banner = (msg) => console.log(`\n${'='.repeat(64)}\n${msg}\n${'='.repeat(64)}\n`);

const browser = await chromium.launch({
  channel: 'chrome',                 // real Chrome → far less likely to trip Google's bot check
  headless: false,
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

try {
  if (MANUAL) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    banner(
      'MANUAL MODE — recording has started.\n' +
      'Do the whole flow yourself in the Chrome window:\n' +
      '  1) Sign in to the app\n' +
      '  2) Settings → Calendar → Connect Google Calendar\n' +
      '  3) Pick your Google account and complete the CONSENT screen\n' +
      '     (expand the scope so "View events on all your calendars" is visible)\n' +
      '  4) Let it return to the app and import events\n' +
      'The script auto-stops when you land back on /app/calendar.'
    );
  } else {
    // 1) Sign in to the app
    banner('Signing in to the app…');
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await page.waitForURL('**/app**', { timeout: 30_000 });

    // 2) Open the Calendar sync dialog and start the Google connect
    banner('Opening Calendar → Connect Google Calendar…');
    await page.goto(`${BASE}/app/calendar?sync=1`, { waitUntil: 'domcontentloaded' });
    const googleBtn = page.getByRole('button', { name: /google/i }).first();
    await googleBtn.waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(1200); // let the dialog settle on camera
    await googleBtn.click();

    banner(
      'YOUR TURN — complete the Google consent in the Chrome window:\n' +
      '  • Choose your Google account\n' +
      '  • The consent screen is forced to English (hl=en). Confirm the\n' +
      '    LANGUAGE SELECTOR in the bottom-left corner reads "English" — if\n' +
      '    not, click it and pick English (Google requires this on camera).\n' +
      '  • Make the scope visible/expanded so the text is readable:\n' +
      '    "View events on all your calendars" (calendar.events.readonly)\n' +
      '  • Click Continue / Allow\n' +
      `Recording continues automatically (waiting up to ${HUMAN_TIMEOUT / 60000} min)…`
    );
  }

  // Wait for the human to finish and Google to redirect back into the app.
  await page.waitForURL(/eazy\.family\/(.*\/)?app\/calendar/, { timeout: HUMAN_TIMEOUT });
  banner(
    'Back in the app — DEMONSTRATING THE SCOPE IN USE.\n' +
    'Keep the Chrome window focused; the recording lingers ~15s so the\n' +
    'imported Google Calendar events (shown in green) are clearly visible.\n' +
    'If they are not on screen yet, scroll/tap into a day that has events\n' +
    'so the video proves the app USES the calendar.events.readonly data.'
  );
  // Linger so the "N events imported" toast + the green Google events on the
  // calendar are unmistakably captured — this is Google's requirement #3
  // (app functionality that utilizes the requested scope).
  await page.waitForTimeout(15000);
} catch (err) {
  console.error('\n[!] Flow did not complete:', err?.message || err);
  console.error('    The partial recording is still being saved.');
} finally {
  // Closing the context flushes the video file to disk.
  await context.close();
  await browser.close();
  const video = await page.video()?.path().catch(() => null);
  banner(`Video saved in: ${OUT}\n${video ? `File: ${video}` : 'Look for the newest .webm there.'}\n` +
    'Convert to MP4 if needed:\n  ffmpeg -i <file>.webm -c:v libx264 -pix_fmt yuv420p demo-google-oauth.mp4\n' +
    'Then upload as an UNLISTED YouTube video and paste the link into the reply.');
}
