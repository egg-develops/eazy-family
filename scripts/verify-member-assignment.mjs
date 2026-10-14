// Verifies phase 1 of docs/plan-roles-recurrence-calendar-2026-10-11.md against
// the live database: a family member with no account is visible to their family,
// and a task can be assigned to them.
//
// Run AFTER applying supabase/migrations/20261011000001_*.sql.
// Self-cleaning: every row it creates on the review account is deleted again.
//
//   node scripts/verify-member-assignment.mjs
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const SUPA = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const login = async (email, password) => {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`login failed for ${email}: ${JSON.stringify(j)}`);
  return { token: j.access_token, userId: j.user.id };
};

const rest = (token) => async (method, pathAndQuery, body, prefer) => {
  const res = await fetch(`${SUPA}/rest/v1${pathAndQuery}`, {
    method,
    headers: {
      apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      Prefer: prefer ?? (method === 'POST' ? 'return=representation' : 'return=minimal'),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  return { status: res.status, ok: res.ok, json, text };
};

let failures = 0;
const check = (label, pass, detail = '') => {
  console.log(`${pass ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures++;
};

const me = await login('appreview@eazy.family', 'EazyReview!2026');
const api = rest(me.token);

// Which family am I in?
const mine = await api('GET', `/family_members?select=family_id&user_id=eq.${me.userId}&is_active=eq.true&limit=1`);
const familyId = mine.json?.[0]?.family_id;
check('review account is in a family', !!familyId, familyId ?? mine.text.slice(0, 120));
if (!familyId) process.exit(1);

const createdMemberIds = [];
const createdTaskIds = [];

try {
  // 1. Create a member with no account.
  const name = `Probe Child ${Date.now() % 100000}`;
  // `return=minimal` on purpose: with `return=representation`, Postgres has to
  // satisfy the SELECT policy for the RETURNING clause, so a row the policy
  // cannot see fails the whole insert with 42501. That is a second symptom of
  // the same NULL-unsafe predicate, and it is why the app must insert the
  // member first and read it back separately.
  const created = await api('POST', '/family_members', {
    family_id: familyId, user_id: null, role: 'child', inviter_id: me.userId,
    is_active: true, display_name: name, full_name: name,
  }, 'return=minimal');
  check('can insert a member with user_id NULL', created.ok, created.text.slice(0, 160));

  const found = await api('GET', `/family_members?select=id,user_id,display_name&family_id=eq.${familyId}&display_name=eq.${encodeURIComponent(name)}`);
  const memberId = found.json?.[0]?.id;
  if (memberId) createdMemberIds.push(memberId);
  check('the inserted member can be read back', !!memberId,
    memberId ?? 'not visible — is the SELECT policy migration applied?');
  if (!memberId) throw new Error('inserted member is not readable; stopping');

  // 2. The RLS fix: it must come back in the roster. Before migration
  //    20261011000001 this returned nothing, because `NULL <> auth.uid()` is NULL.
  const roster = await api('GET', `/family_members?select=id,user_id,display_name&family_id=eq.${familyId}&is_active=eq.true`);
  const visible = (roster.json ?? []).some(m => m.id === memberId);
  check('account-less member is visible in the roster', visible,
    visible ? `${roster.json.length} members` : 'RLS still filters it — is the migration applied?');

  // 3. The same through the view the Family screen reads.
  const safe = await api('GET', `/family_members_safe?select=id,user_id,display_name&family_id=eq.${familyId}&is_active=eq.true`);
  check('and through family_members_safe', (safe.json ?? []).some(m => m.id === memberId));

  // 4. Assign a task to them.
  const parentList = await api('GET', `/tasks?select=id&type=eq.shared&family_id=eq.${familyId}&parent_id=is.null&limit=1`);
  const parentId = parentList.json?.[0]?.id ?? null;
  const task = await api('POST', '/tasks', {
    title: 'Probe: take out the bins', type: parentId ? 'shared' : 'task',
    user_id: me.userId, completed: false,
    assigned_member_ids: [memberId],
    ...(parentId ? { family_id: familyId, visible_to: 'family', parent_id: parentId } : {}),
  });
  check('can assign a task to a member with no account', task.ok, task.text.slice(0, 160));
  const taskId = task.json?.[0]?.id;
  if (taskId) createdTaskIds.push(taskId);

  // 5. Read it back with the assignment intact.
  if (taskId) {
    const back = await api('GET', `/tasks?select=id,assigned_member_ids,assigned_to_users&id=eq.${taskId}`);
    const row = back.json?.[0];
    check('assignment round-trips', row?.assigned_member_ids?.[0] === memberId,
      JSON.stringify(row?.assigned_member_ids));
  }

  // 6. The other parent sees the shared task and can resolve the assignee.
  try {
    const other = await login('sofia.rivera@eazy.family', 'EazyReview!2026');
    const otherApi = rest(other.token);
    const otherRoster = await otherApi('GET', `/family_members?select=id&family_id=eq.${familyId}&is_active=eq.true`);
    const sameFamily = (otherRoster.json ?? []).length > 0;
    if (!sameFamily) {
      console.log('ℹ️  second account is not in this family — skipping the cross-member check');
    } else {
      check('second parent also sees the account-less member',
        (otherRoster.json ?? []).some(m => m.id === memberId));
    }
  } catch (e) {
    console.log(`ℹ️  skipped cross-member check: ${e.message}`);
  }
} finally {
  for (const id of createdTaskIds) await api('DELETE', `/tasks?id=eq.${id}`);
  for (const id of createdMemberIds) await api('DELETE', `/family_members?id=eq.${id}`);
  console.log(`\ncleaned up ${createdTaskIds.length} task(s), ${createdMemberIds.length} member(s)`);
}

console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
