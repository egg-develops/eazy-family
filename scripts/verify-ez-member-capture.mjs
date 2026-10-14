// Verifies the EZ capture -> account-less member path in the real UI, with real
// touch events: long-press the orb, type an utterance naming a member who has no
// account, let the live eazy-chat parse it, and confirm the committed task carries
// that member's family_members.id in assigned_member_ids.
//
// Needs the dev server on :8080 and migration 20261011000001 applied.
//   node scripts/verify-ez-member-capture.mjs "Zoé"
import { chromium, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

const MEMBER = process.argv[2] || 'Zoé';
const TITLE_HINT = 'tidy';
const UTTERANCE = `${MEMBER} needs to ${TITLE_HINT} her room tomorrow`;

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const SUPA = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

let failures = 0;
const check = (label, pass, detail = '') => {
  console.log(`${pass ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures++;
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });

page.on('console', m => { if (/error|failed/i.test(m.text())) console.log('   [console]', m.text().slice(0, 160)); });

// A parse that fails silently degrades to the local parser and still produces a
// plausible task, so log every non-2xx and every eazy-chat call explicitly.
const calls = [];
page.on('response', async (r) => {
  const u = r.url();
  if (!/supabase|functions\/v1/.test(u)) return;
  const tag = u.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  if (r.status() >= 400) {
    let body = '';
    try { body = (await r.text()).slice(0, 200); } catch {}
    calls.push(`${r.status()} ${r.request().method()} ${tag} ${body}`);
  } else if (/eazy-chat/.test(u)) {
    calls.push(`${r.status()} ${r.request().method()} ${tag}`);
  }
});

try {
  await page.goto('http://localhost:8080/auth');
  await page.fill('input[type="email"]', 'appreview@eazy.family');
  await page.fill('input[type="password"]', 'EazyReview!2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app**', { timeout: 20000 });

  await page.evaluate(() => {
    const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    const uid = k && JSON.parse(localStorage.getItem(k) || '{}')?.user?.id;
    if (uid) localStorage.setItem(`eazy-family-tutorial-completed-${uid}`, 'true');
  });
  await page.goto('http://localhost:8080/app/lists?tab=tasks');
  await page.waitForTimeout(2500);

  // Long press the EZ orb: hold past the 500ms drag threshold, release without
  // moving. src/pages/App.tsx handleEZPointerUp opens EZ Capture on exactly that.
  const orb = await page.evaluate(() => {
    const x = Math.round(window.innerWidth / 2), y = window.innerHeight - 64;
    let t = document.elementFromPoint(x, y);
    while (t && t.tagName !== 'BUTTON' && t !== document.body) t = t.parentElement;
    const r = t?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  check('found the EZ orb', !!orb, orb ? `${Math.round(orb.x)},${Math.round(orb.y)}` : 'not at bottom centre');
  if (!orb) throw new Error('no orb');

  await touch('touchStart', orb.x, orb.y);
  await page.waitForTimeout(750);
  await touch('touchEnd', orb.x, orb.y);

  const ta = page.locator('textarea').first();
  await ta.waitFor({ state: 'visible', timeout: 10000 });
  check('long press opened EZ Capture', true);

  await ta.fill(UTTERANCE);
  console.log(`   utterance: "${UTTERANCE}"`);

  const before = Date.now();
  const createBtn = page.locator('button', { hasText: /^(Add|Create|Send)$/ }).first();
  await createBtn.click();

  // Wait for the commit to land (the done screen replaces the composer).
  await page.waitForTimeout(14000);
  const screen = (await page.locator('body').innerText()).slice(0, 400);
  console.log('   after commit:', screen.replace(/\n+/g, ' | ').slice(0, 220));

  // --- Now assert against the database, not the screen. ---
  const login = async (e, p) => {
    const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p }) });
    const j = await r.json(); if (!j.access_token) throw new Error(e + ': ' + JSON.stringify(j));
    return j.access_token;
  };
  const tok = await login('appreview@eazy.family', 'EazyReview!2026');
  const get = async (q) => (await fetch(`${SUPA}/rest/v1${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${tok}` } })).json();

  const fam = (await get(`/family_members?select=family_id&user_id=not.is.null&limit=1`))[0]?.family_id;
  const members = await get(`/family_members?select=id,user_id,display_name&family_id=eq.${fam}`);
  const target = members.find(m => (m.display_name || '').startsWith(MEMBER));
  check(`${MEMBER} exists as a member with no account`, !!target && target.user_id === null,
    target ? `${target.id} user_id=${target.user_id}` : 'not found');

  const since = new Date(before - 5000).toISOString();
  const fresh = await get(`/tasks?select=id,title,type,assigned_member_ids,assigned_to_users,created_at&created_at=gte.${since}&order=created_at.desc`);
  console.log(`   ${fresh.length} task(s) created during the run`);
  for (const t of fresh) console.log(`     "${t.title}" [${t.type}] members=${JSON.stringify(t.assigned_member_ids)} users=${JSON.stringify(t.assigned_to_users)}`);

  const hit = fresh.find(t => (t.assigned_member_ids || []).includes(target?.id));
  check('the captured task is assigned to the account-less member', !!hit,
    hit ? `"${hit.title}"` : 'no fresh task carries that member id');

  // clean up whatever the capture created
  for (const t of fresh) {
    await fetch(`${SUPA}/rest/v1/tasks?id=eq.${t.id}`, {
      method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${tok}`, Prefer: 'return=minimal' } });
  }
  console.log(`\ncleaned up ${fresh.length} task(s)`);

  console.log('\nnetwork (eazy-chat calls and every non-2xx):');
  for (const c of calls) console.log('  ', c);
  check('the live eazy-chat parse succeeded (not a silent local-parser fallback)',
    calls.some(c => /^200 POST .*eazy-chat/.test(c)),
    calls.find(c => /eazy-chat/.test(c)) ?? 'eazy-chat was never called');
} catch (e) {
  check('run completed', false, e.message);
  try { console.log('   url:', page.url()); } catch {}
} finally {
  await browser.close();
}

console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
