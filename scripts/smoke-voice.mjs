/**
 * Voice intent smoke test — hits the live eazy-chat edge function and verifies
 * that 20 canonical phrases parse to the correct type + a sensible title.
 *
 * Usage:
 *   node scripts/smoke-voice.mjs
 *
 * Uses the demo account. Requires DEMO_EMAIL / DEMO_PASSWORD env vars or
 * falls back to the well-known defaults.
 */

import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const SUPABASE_URL    = 'https://jfztyhuagxruhawchfem.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0';
const DEMO_EMAIL      = process.env.DEMO_EMAIL    ?? 'hello@eazy.family';
const DEMO_PASSWORD   = process.env.DEMO_PASSWORD ?? 'EZ.Simpsons2026';

// ── Test cases ───────────────────────────────────────────────────────────────
// Each entry: [phrase, expectedType, titleMustContain (lowercase), allowedTypes?]
// allowedTypes: list of acceptable types (for genuinely ambiguous phrases)
const CASES = [
  // Shopping – shared (family/our/no possessive)
  ['add coffee to our shopping list',                  'shopping',          'coffee'],
  ['buy milk and eggs',                                'shopping',          'milk'],
  ['grab bread from the store',                        'shopping',          'bread'],
  ['pick up peanut butter',                            'shopping',          'peanut butter'],
  ['add cottage cheese to the grocery list',           'shopping',          'cottage cheese'],
  ['add avocado to the family list',                   'shopping',          'avocado'],
  ['we need olive oil',                                'shopping',          'olive oil'],

  // Shopping – personal ("my list")
  ['add cottage cheese to my shopping list',           'shopping_personal', 'cottage cheese'],
  ['add wine to my list',                              'shopping_personal', 'wine'],
  ['put oat milk on my grocery list',                  'shopping_personal', 'oat milk'],
  ['get protein bars for me',                          'shopping_personal', 'protein'],
  ['add deodorant to my groceries',                    'shopping_personal', 'deodorant'],

  // Task verb + "my list" → task, NOT shopping_personal
  ['add clean the terrace to my list',                 'task',              'terrace'],
  ['add water the plants to my list',                  'task',              'water'],

  // Task
  ['clean the kitchen',                                'task',              'clean'],
  ['call the dentist',                                 'task',              'dentist'],
  ['mow the lawn',                                     'task',              'lawn'],
  ['fix the leaky tap',                                'task',              'tap'],

  // Event
  ["doctor's appointment tomorrow at 3pm",             'event',             'doctor'],
  ['lunch with Sarah on Friday',                       'event',             'sarah'],
  ["Mia's birthday party next Saturday",               'event',             'birthday'],
  ['meeting at 10am',                                  'event',             'meeting'],

  // Reminder
  ['remind me to call mom this evening',               'reminder',          'call'],
  ["don't forget to pay the rent",                     'reminder',          'rent'],

  // Journal / Ritual — AI may reasonably classify gratitude as either
  ['today I felt really grateful for the kids',        'journal',           'grateful',  ['journal', 'ritual']],
  ['dear diary, tough morning today',                  'journal',           'morning'],

  // Ritual
  ['morning routine: 10 minutes of meditation',        'ritual',            'meditation'],
  ['daily habit: read 20 pages before bed',            'ritual',            'read'],
];

// ── System prompt (mirrors EZCapture.tsx) ───────────────────────────────────
function buildSystemPrompt() {
  const today     = format(new Date(), 'yyyy-MM-dd');
  const dayOfWeek = format(new Date(), 'EEEE');
  return `You are an NLP parser for a family scheduling app. Parse the user's input and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

TYPE CLASSIFICATION — pick exactly one:
- "shopping": items to BUY for the family/shared list. Triggered by: "our shopping list", "the shopping list", "family list", "grocery list", or no possessive ("buy milk", "pick up bread").
- "shopping_personal": items to BUY for YOUR OWN personal list. Triggered by: "my shopping list", "my list", "my groceries", "for me". Example: "add wine to my list" → shopping_personal.
- "task": actions or chores to DO. Triggered by: clean, wash, water, organise, fix, repair, mow, vacuum, call, email, book, finish, return, tidy, take out, drop off. IMPORTANT: "Clean the terrace", "water the plants", "call dentist" are TASKS, not shopping items — even if phrased as "add X to my list".
- "event": time-specific appointment, meeting, or occurrence with a date/time.
- "reminder": "remind me to X".
- "ritual": habit, gratitude, or reflection entry.
- "journal": diary or feelings entry.

JSON fields:
- type: one of the types above
- title: ONLY the core subject — NEVER include date, time, location, command words, or list-destination phrases. Strip ALL of: leading verbs ("add", "create", "schedule", "remind me to", "put", "book"), trailing destinations ("to my shopping list", "to our shopping list", "to the list", "to my list", "on the calendar", "on the schedule"), date/time phrases. Examples: "Add peanut butter to our shopping list" → title "peanut butter", type "shopping". "Add cottage cheese to my shopping list" → title "cottage cheese", type "shopping_personal". "Add clean the terrace and water the plants to my list" → title "Clean the terrace, Water the plants", type "task". "Remind me to call dentist tomorrow" → title "Call dentist", type "reminder". "Doctor appointment next Thursday at 4pm" → title "Doctor appointment", type "event". For type "shopping" or "shopping_personal", ALWAYS separate multiple items with commas. For type "task", separate multiple tasks with commas.
- date: "YYYY-MM-DD" or null. Resolve ALL date references including ordinals like "the 29th", "29th", "May 5th". Today is ${today} — resolve to the NEXT occurrence if the date has not yet passed in the current month, otherwise the following month.
- time: "HH:MM" 24h or null. "4 o'clock pm" → "16:00", "half past 3" → "15:30", "3pm" → "15:00".
- endTime: "HH:MM" 24h or null
- location: string or null
- assignees: array of first names or null
- reminder: human-readable string like "1 week before" or null
- notes: string or null
- mood: string or null (journal only)

Today is ${today} (${dayOfWeek}). Return ONLY the raw JSON object.`;
}

// ── Call the edge function ───────────────────────────────────────────────────
async function parsePhrase(phrase, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/eazy-chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: phrase }],
      systemPrompt: buildSystemPrompt(),
    }),
  });

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let leftover = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = leftover + decoder.decode(value, { stream: true });
    const lines  = chunk.split('\n');
    leftover = lines.pop() ?? '';  // last incomplete line
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const data = JSON.parse(line.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) full += content;
        } catch {}
      }
    }
  }

  // Strip markdown code fences and control characters except tabs/newlines
  const cleaned = full
    .trim()
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    // Remove literal control characters inside strings (keep \t \n \r as JSON escapes)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  return JSON.parse(cleaned);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

console.log('Signing in as demo account…');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
});
if (authError || !authData.session) {
  console.error('Auth failed:', authError?.message);
  process.exit(1);
}
const { access_token } = authData.session;
console.log('Signed in. Running', CASES.length, 'smoke tests…\n');

let passed = 0;
let failed = 0;
const failures = [];

for (const [phrase, expectedType, titleContains, allowedTypes] of CASES) {
  process.stdout.write(`  "${phrase}"\n    → `);
  try {
    const result = await parsePhrase(phrase, access_token);
    const acceptedTypes = allowedTypes ?? [expectedType];
    const typeOk  = acceptedTypes.includes(result.type);
    const titleOk = result.title?.toLowerCase().includes(titleContains);
    const ok = typeOk && titleOk;

    if (ok) {
      console.log(`✅ type=${result.type}  title="${result.title}"`);
      passed++;
    } else {
      const reason = !typeOk
        ? `expected type in [${acceptedTypes.join('|')}] got "${result.type}"`
        : `title "${result.title}" missing "${titleContains}"`;
      console.log(`❌ ${reason}  (full: type=${result.type}, title="${result.title}")`);
      failed++;
      failures.push({ phrase, expectedType, titleContains, result, reason });
    }
  } catch (err) {
    console.log(`💥 ERROR: ${err.message}`);
    failed++;
    failures.push({ phrase, error: err.message });
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${CASES.length}`);

if (failures.length > 0) {
  console.log('\nFailed cases:');
  for (const f of failures) {
    console.log(`  • "${f.phrase}"`);
    if (f.error) console.log(`    Error: ${f.error}`);
    else console.log(`    ${f.reason}`);
  }
  process.exit(1);
}
