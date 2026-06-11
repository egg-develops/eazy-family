// One-off: seed the App Review demo account with realistic family data.
// Server-side data only (tasks, shopping, family). Calendar/journal/rituals are
// localStorage and must be seeded in-app (see review-seed code path).
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const SUPA = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = 'appreview@eazy.family';
const PASS = 'EazyReview!2026';

let TOKEN, UID;
const h = () => ({ apikey: KEY, Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' });

async function rest(path, opts = {}) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers: { ...h(), Prefer: 'return=representation', ...(opts.headers || {}) } });
  const text = await r.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} → ${r.status}: ${text}`);
  return body;
}
async function rpc(fn, args = {}) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h(), body: JSON.stringify(args) });
  const t = await r.text(); if (!r.ok) throw new Error(`rpc ${fn} → ${r.status}: ${t}`);
  try { return JSON.parse(t); } catch { return t; }
}

const today = new Date();
const dstr = (offset) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().split('T')[0]; };

async function main() {
  // 1) login
  const lr = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const lj = await lr.json();
  if (!lj.access_token) throw new Error('login failed: ' + JSON.stringify(lj));
  TOKEN = lj.access_token; UID = lj.user.id;
  console.log('✓ logged in', UID);

  // 1b) idempotency — wipe tasks so re-runs reseed cleanly (keep family/membership)
  try { await rest(`tasks?user_id=eq.${UID}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); } catch (e) { console.log('  (tasks cleanup skipped:', e.message, ')'); }
  console.log('✓ cleared prior tasks');

  // 2) profile
  await rest('profiles?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ user_id: UID, email: EMAIL, full_name: 'Alex Rivera', display_name: 'Alex', share_email: false, share_phone: false }]) });
  console.log('✓ profile');

  // 3) family — reuse the user's existing family if present (idempotent; avoids orphans)
  let familyId, inviteCode;
  const existing = await rest(`family_members?user_id=eq.${UID}&is_active=eq.true&select=family_id`);
  if (Array.isArray(existing) && existing.length) {
    familyId = existing[0].family_id; inviteCode = '(existing)';
    console.log('✓ reusing family', familyId);
  } else {
    try { inviteCode = await rpc('generate_family_invite_code'); } catch { inviteCode = 'EAZY' + Math.random().toString(36).slice(2, 6).toUpperCase(); }
    familyId = crypto.randomUUID();
    await rest('families', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ id: familyId, name: 'The Rivera Family', invite_code: inviteCode, created_by: UID }]) });
    await rest('family_members', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ family_id: familyId, user_id: UID, role: 'parent', inviter_id: UID,
        full_name: 'Alex Rivera', display_name: 'Alex Rivera', email: EMAIL, is_active: true }]) });
    console.log('✓ created family', familyId, inviteCode);
  }

  // Note: only the real (self) member is visible to the app — the family_members
  // SELECT policy is null-unsafe for user_id=null rows and the safe view reads
  // display_name. A single-member family is the realistic state before others
  // join; pending invitees would go through family_invitations, not fake rows.

  // 4) personal to-dos
  const personalTodos = [
    { title: '🦷 Call the dentist to book a checkup', due: dstr(1) },
    { title: '🏫 Sign Mia\'s school permission slip', due: dstr(0) },
    { title: '🚗 Renew car insurance', due: dstr(4) },
    { title: '🎁 Buy a birthday gift for Grandma', due: dstr(6) },
    { title: '📚 Return library books', due: dstr(2), completed: true },
    { title: '💡 Pay the electricity bill', due: dstr(3) },
  ];
  await rest('tasks', { method: 'POST', body: JSON.stringify(personalTodos.map(t => ({
    title: t.title, type: 'task', user_id: UID, completed: !!t.completed, due_date: t.due }))) });
  console.log('✓ personal todos');

  // 6) personal shopping
  const personalShopping = ['Milk 🥛', 'Eggs', 'Whole-grain bread', 'Coffee ☕', 'Toothpaste', 'Bananas 🍌'];
  await rest('tasks', { method: 'POST', body: JSON.stringify(personalShopping.map((title, i) => ({
    title, type: 'shopping_personal', user_id: UID, completed: i === 1 }))) });
  console.log('✓ personal shopping');

  // 7) shared shopping (family)
  const sharedShopping = ['Apples for the week 🍎', 'Pasta & tomato sauce', 'Chicken for Sunday dinner', 'Dishwasher tablets 🧽', 'Kids\' snacks', 'Olive oil'];
  await rest('tasks', { method: 'POST', body: JSON.stringify(sharedShopping.map((title, i) => ({
    title, type: 'shopping', user_id: UID, family_id: familyId, completed: i === 2 }))) });
  console.log('✓ shared shopping');

  // 8) shared to-do list + items
  const [list] = await rest('tasks', { method: 'POST', body: JSON.stringify([{
    title: 'Family To-Dos 🏡', type: 'shared', user_id: UID, family_id: familyId, completed: false }]) });
  const sharedTodos = [
    '📅 Plan the weekend trip to the lake',
    '🧹 Saturday chores — who does what',
    '🍽️ Decide the dinner menu for the week',
    '⚽ Drop Leo at football practice (Sat 10am)',
    '🎂 Organize Grandma\'s birthday party',
  ];
  await rest('tasks', { method: 'POST', body: JSON.stringify(sharedTodos.map((title, i) => ({
    title, type: 'shared', user_id: UID, family_id: familyId, parent_id: list.id, completed: i === 1 }))) });
  console.log('✓ shared list + items');

  console.log('\nDONE. Family:', familyId, '| invite:', inviteCode);
}
main().catch(e => { console.error('✗', e.message); process.exit(1); });
