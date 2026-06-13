// Reproduce the EZ Capture parse pipeline exactly: call the eazy-chat edge fn
// with EZCapture's systemContext, for the two failing phrases, and print what
// the AI actually returns (type/title/date/time).
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const SUPA = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const today = new Date();
const yyyy = today.toISOString().slice(0, 10);
const dow = today.toLocaleDateString('en-US', { weekday: 'long' });
const userLanguage = 'English';

// Verbatim from EZCapture.tsx parseWithAIInner systemContext
const systemContext = `You are an NLP parser for a family scheduling app. Parse the user's input and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

User's input language: ${userLanguage}. Parse date/time expressions correctly for this language. Keep the title in the user's language — do not translate to English.

TYPE CLASSIFICATION — pick exactly one:
- "shopping": items to BUY for the family/shared list. Triggered by: "our shopping list", "the shopping list", "family list", "grocery list", or no possessive ("buy milk", "pick up bread").
- "shopping_personal": items to BUY for YOUR OWN personal list. Triggered by: "my shopping list", "my list", "my groceries", "for me". Example: "add wine to my list" → shopping_personal.
- "task": actions or chores to DO. Triggered by: clean, wash, water, organise, fix, repair, mow, vacuum, call, email, book, finish, return, tidy, take out, drop off — and their equivalents in ${userLanguage}. IMPORTANT: "Clean the terrace", "water the plants", "call dentist" are TASKS, not shopping items — even if phrased as "add X to my list".
- "event": time-specific appointment, meeting, or occurrence with a date/time.
- "reminder": "remind me to X".
- "ritual": habit, gratitude, or reflection entry.
- "journal": diary or feelings entry.

JSON fields:
- type: one of the types above
- title: ONLY the core subject — NEVER include date, time, location, command words, or list-destination phrases. Strip ALL of: leading verbs ("add", "create", "schedule", "remind me to", "put", "book" and equivalents in ${userLanguage}), trailing destinations ("to my shopping list", "to our shopping list", "to the list", "to my list", "on the calendar", "on the schedule" and equivalents in ${userLanguage}), date/time phrases. For type "shopping" or "shopping_personal", ALWAYS separate multiple items with commas. For type "task", separate multiple tasks with commas.
- date: "YYYY-MM-DD" or null. Resolve ALL date references including ordinals. Today is ${yyyy} — resolve to the NEXT occurrence if the date has not yet passed, otherwise the following month.
- time: "HH:MM" 24h or null.
- endTime: "HH:MM" 24h or null
- location: string or null
- assignees: array of first names or null
- reminder: human-readable string or null
- notes: string or null
- mood: string or null (journal only)

Today is ${yyyy} (${dow}). Date resolution rules:
- "this week" = a date within the 7 days starting from today (${yyyy}), not before today.
- "next week" = a date 7–14 days from today.
- "this weekend" = the nearest upcoming Saturday.
- Never resolve a relative date to a date in the past.

Return ONLY the raw JSON object.`;

const phrases = [
  'Add peanut butter to our shared shopping list',
  'add fix broken shelf to our tasks',
  // controls
  'buy milk',
  'clean the terrace',
];

async function login() {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'appreview@eazy.family', password: 'EazyReview!2026' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('login failed: ' + JSON.stringify(j));
  return j.access_token;
}

async function parse(token, content) {
  const res = await fetch(`${SUPA}/functions/v1/eazy-chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content }], systemPrompt: systemContext }),
  });
  if (!res.ok) return { error: `HTTP ${res.status}: ${await res.text()}` };
  // stream SSE
  const text = await res.text();
  let full = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
      try { full += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? ''; } catch {}
    }
  }
  const cleaned = full.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  try { return { raw: full, parsed: JSON.parse(cleaned) }; }
  catch { return { raw: full, parseError: true }; }
}

const token = await login();
console.log('today:', yyyy, dow, '\n');
for (const p of phrases) {
  const r = await parse(token, p);
  if (r.error) { console.log(`✗ ${p}\n   ${r.error}\n`); continue; }
  if (r.parseError) { console.log(`⚠ ${p}\n   AI did not return JSON. raw:\n   ${r.raw}\n`); continue; }
  const { type, title, date, time } = r.parsed;
  console.log(`PHRASE: ${p}`);
  console.log(`   AI type=${JSON.stringify(type)} title=${JSON.stringify(title)} date=${JSON.stringify(date)} time=${JSON.stringify(time)}\n`);
}
