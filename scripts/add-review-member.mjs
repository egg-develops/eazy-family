// Add a real second family member to the App Review account's family, so we can
// test cross-member features (shared channel, assignment) with two logins.
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]; }));
const SUPA = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FAMILY_ID = 'c0a8aed1-97ae-4001-801a-10cac8d61ec5';
const ADMIN = { email: 'appreview@eazy.family', pass: 'EazyReview!2026' };
const NEW = { email: 'sofia.rivera@eazy.family', pass: 'EazyReview!2026', name: 'Sofia Rivera', role: 'parent' };

const login = async (email, password) => {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method:'POST', headers:{apikey:KEY,'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
  const j = await r.json(); if (!j.access_token) throw new Error('login '+email+': '+JSON.stringify(j)); return { id: j.user.id, token: j.access_token };
};
const h = (tok, extra={}) => ({ apikey:KEY, Authorization:`Bearer ${tok}`, 'Content-Type':'application/json', ...extra });

// 1) ensure the auth user exists
let sofia;
{
  const r = await fetch(`${SUPA}/auth/v1/signup`, { method:'POST', headers:{apikey:KEY,'Content-Type':'application/json'}, body: JSON.stringify({ email: NEW.email, password: NEW.pass }) });
  const j = await r.json();
  if (j.user?.id && j.access_token) { sofia = { id: j.user.id, token: j.access_token }; console.log('✓ auth user', sofia.id); }
  else { sofia = await login(NEW.email, NEW.pass); console.log('✓ existing user', sofia.id); }
}

// 2) Sofia creates her own profile FIRST (family_members.user_id → profiles FK)
{
  const r = await fetch(`${SUPA}/rest/v1/profiles?on_conflict=user_id`, { method:'POST', headers: h(sofia.token, {Prefer:'resolution=merge-duplicates,return=minimal'}),
    body: JSON.stringify([{ user_id: sofia.id, display_name: NEW.name, email: NEW.email }]) });
  console.log(r.ok ? '✓ Sofia profile' : '✗ profile: '+r.status+' '+await r.text());
}

// 3) admin adds Sofia to the family (RLS: a member may insert others)
const admin = await login(ADMIN.email, ADMIN.pass);
const existing = await (await fetch(`${SUPA}/rest/v1/family_members?family_id=eq.${FAMILY_ID}&user_id=eq.${sofia.id}&select=id`, { headers: h(admin.token) })).json();
if (!existing.length) {
  const r = await fetch(`${SUPA}/rest/v1/family_members`, { method:'POST', headers: h(admin.token, {Prefer:'return=minimal'}),
    body: JSON.stringify([{ family_id: FAMILY_ID, user_id: sofia.id, full_name: NEW.name, role: NEW.role, is_active: true, inviter_id: admin.id }]) });
  if (!r.ok) throw new Error('member insert: '+r.status+' '+await r.text());
  console.log('✓ added Sofia to the family');
} else { console.log('✓ Sofia already a member'); }

// 4) verify cross-member visibility
const seen = await (await fetch(`${SUPA}/rest/v1/family_members?family_id=eq.${FAMILY_ID}&select=full_name,role&is_active=eq.true`, { headers: h(sofia.token) })).json();
console.log('✓ Sofia sees family members:', JSON.stringify(seen));
console.log('\nDONE. Second login → ' + NEW.email + ' / ' + NEW.pass);
