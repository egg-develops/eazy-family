// Live verification for multi-entry EZ capture.
//
// EZ parsing behaviour is the model's, not ours, so unit tests cannot prove it
// (CLAUDE.md §5.19). This calls the LIVE `eazy-chat` function with the EXACT
// prompt the app ships — src/lib/ezCapturePrompt.ts, bundled here with esbuild
// rather than copy-pasted, so it can never drift from the shipped version the
// way scripts/repro-ez-parse.mjs did.
//
// Read-only: it parses utterances, it never writes tasks, events or lists.
//
//   node scripts/verify-ez-multi-entry.mjs            # all cases
//   node scripts/verify-ez-multi-entry.mjs --case 2   # one case
import { readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const SUPA = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── the real prompt, bundled from source ─────────────────────────────────────
const bundlePath = join(tmpdir(), `ez-prompt-${process.pid}.mjs`);
execFileSync('npx', [
  'esbuild', 'src/lib/ezCapturePrompt.ts',
  '--bundle', '--format=esm', '--platform=node',
  '--tsconfig=tsconfig.app.json', `--outfile=${bundlePath}`, '--log-level=error',
], { stdio: 'inherit' });
const { buildParsePrompt } = await import(`file://${bundlePath}`);
rmSync(bundlePath, { force: true });

const now = new Date();
const today = now.toISOString().slice(0, 10);
const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

const promptFor = (userLanguage, singleEntryOnly = false) => buildParsePrompt({
  today, dayOfWeek, userLanguage, rosterNames: ['Sofia Rivera', 'Leo Rivera'], singleEntryOnly,
});

async function login() {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'appreview@eazy.family', password: 'EazyReview!2026' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('login failed: ' + JSON.stringify(j));
  return j.access_token;
}

async function parse(token, content, systemPrompt) {
  const res = await fetch(`${SUPA}/functions/v1/eazy-chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ messages: [{ role: 'user', content }], systemPrompt, temperature: 0, maxTokens: 2048 }),
  });
  if (!res.ok) throw new Error(`eazy-chat HTTP ${res.status}: ${await res.text()}`);
  // Same SSE handling as src/lib/sseText.ts
  const text = await res.text();
  let full = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
    try { full += JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content ?? ''; } catch { /* keep-alive */ }
  }
  const cleaned = full.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```$/, '').trim();
  return { raw: cleaned, json: JSON.parse(cleaned) };
}

const titles = e => e.map(x => x.title).join(' | ');
const types = e => e.map(x => x.type).join(' | ');

const CASES = [
  {
    name: 'mixed types split into two entries',
    text: 'add milk to the shopping list and clean the terrace on Tuesday',
    lang: 'English',
    check: (e) => {
      if (e.length !== 2) return `expected 2 entries, got ${e.length}`;
      const shop = e.find(x => x.type?.startsWith('shopping'));
      const task = e.find(x => x.type === 'task');
      if (!shop) return `no shopping entry (types: ${types(e)})`;
      if (!task) return `no task entry (types: ${types(e)})`;
      if (!/milk/i.test(shop.title)) return `shopping title wrong: ${shop.title}`;
      if (!/terrace/i.test(task.title)) return `task title wrong: ${task.title}`;
      if (!task.date) return 'task lost its Tuesday date';
      return null;
    },
  },
  {
    name: 'event + personal shopping: the event must NOT become shopping',
    text: 'dinner at 7 on Friday and add wine to my list',
    lang: 'English',
    check: (e) => {
      if (e.length !== 2) return `expected 2 entries, got ${e.length}`;
      const ev = e.find(x => /dinner/i.test(x.title || ''));
      const wine = e.find(x => /wine/i.test(x.title || ''));
      if (!ev) return `no dinner entry (${titles(e)})`;
      if (ev.type !== 'event') return `dinner came back as ${ev.type}, must be event`;
      if (!wine) return `no wine entry (${titles(e)})`;
      if (!wine.type?.startsWith('shopping')) return `wine came back as ${wine.type}`;
      // Both entries need their own fragment, or the app's keyword guards read
      // the whole sentence and flip the event into a shopping item.
      if (!ev.source || !wine.source) return 'missing per-entry "source" fragment';
      return null;
    },
  },
  {
    name: 'a single item stays a single entry',
    text: 'dentist Tuesday at 3pm',
    lang: 'English',
    check: (e) => {
      if (e.length !== 1) return `expected 1 entry, got ${e.length} (${titles(e)})`;
      if (e[0].type !== 'event') return `expected event, got ${e[0].type}`;
      if (e[0].time !== '15:00') return `expected 15:00, got ${e[0].time}`;
      return null;
    },
  },
  {
    name: 'same type, same day stays ONE comma-separated entry',
    text: 'add milk, bread and eggs to the shopping list',
    lang: 'English',
    check: (e) => {
      if (e.length !== 1) return `expected 1 entry, got ${e.length} (${titles(e)})`;
      const t = e[0].title.toLowerCase();
      if (!(t.includes('milk') && t.includes('bread') && t.includes('egg'))) return `items lost: ${e[0].title}`;
      return null;
    },
  },
  {
    name: 'German mixed capture',
    text: 'Milch auf die Einkaufsliste und am Dienstag die Terrasse putzen',
    lang: 'German',
    check: (e) => {
      if (e.length !== 2) return `expected 2 entries, got ${e.length} (${titles(e)})`;
      if (!e.some(x => x.type?.startsWith('shopping') && /milch/i.test(x.title))) return `no Milch shopping entry (${titles(e)})`;
      const task = e.find(x => x.type === 'task');
      if (!task) return `no task entry (types: ${types(e)})`;
      if (!/terrasse/i.test(task.title)) return `task title wrong: ${task.title}`;
      if (!/[äöüa-z]/.test(task.title) || /terrace/i.test(task.title)) return `title was translated: ${task.title}`;
      return null;
    },
  },
  {
    name: 'three types in one breath',
    text: 'remind me to call the dentist tomorrow, add bananas to my list, and water the plants',
    lang: 'English',
    check: (e) => {
      if (e.length !== 3) return `expected 3 entries, got ${e.length} (${types(e)} / ${titles(e)})`;
      if (!e.some(x => x.type === 'reminder' || (x.type === 'task' && /dentist/i.test(x.title)))) return `no dentist reminder (${types(e)})`;
      if (!e.some(x => x.type?.startsWith('shopping') && /banana/i.test(x.title))) return 'no bananas shopping entry';
      if (!e.some(x => x.type === 'task' && /plant/i.test(x.title))) return 'no water-the-plants task';
      return null;
    },
  },
  {
    name: 'journal screen (locked type) must never split',
    text: 'today was hard, the kids fought all morning but bedtime was peaceful and I felt proud',
    lang: 'English',
    single: true,
    check: (e) => (e.length === 1 ? null : `expected 1 entry, got ${e.length}`),
  },
];

const only = process.argv.includes('--case') ? Number(process.argv[process.argv.indexOf('--case') + 1]) : null;

const token = await login();
console.log(`today=${today} (${dayOfWeek})\n`);

let failures = 0;
for (const [i, c] of CASES.entries()) {
  const n = i + 1;
  if (only && only !== n) continue;
  process.stdout.write(`${n}. ${c.name}\n   "${c.text}"\n`);
  try {
    const { json } = await parse(token, c.text, promptFor(c.lang, !!c.single));
    const entries = Array.isArray(json?.entries) ? json.entries : (Array.isArray(json) ? json : [json]);
    for (const e of entries) {
      console.log(`     · ${e.type?.padEnd(18)} ${JSON.stringify(e.title)}${e.date ? `  date=${e.date}` : ''}${e.time ? ` time=${e.time}` : ''}${e.assignees?.length ? ` assignees=${e.assignees}` : ''}`);
      if (e.source) console.log(`       source: ${JSON.stringify(e.source)}`);
    }
    const problem = c.check(entries);
    if (problem) { failures++; console.log(`   ✗ FAIL: ${problem}\n`); }
    else console.log('   ✓ pass\n');
  } catch (err) {
    failures++;
    console.log(`   ✗ FAIL: ${err.message}\n`);
  }
}

console.log(failures ? `${failures} case(s) failed` : 'all cases passed');
process.exit(failures ? 1 : 0);
