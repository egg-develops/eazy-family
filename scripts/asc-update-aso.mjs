// Update App Store listing ASO metadata (name, subtitle, keywords) via ASC API.
// Run this ONCE after creating a new version (e.g. 1.0.3) in App Store Connect —
// before submitting for review — to apply all optimized copy in one shot.
//
// Usage:
//   node scripts/asc-update-aso.mjs [--dry-run]
//
// Dry-run prints the PATCH payloads without sending them.
// Requires: fastlane/AuthKey_4H662N6NAJ.p8 (already in repo)
//
// What it updates:
//   appInfoLocalizations  → name, subtitle  (require version review to change)
//   appStoreVersionLocalizations → keywords (require version review to change)
//
// It does NOT touch: description, whatsNew, promotional text, screenshots.
// Run `node scripts/asc-builds.mjs` or check App Store Connect to find the
// version localization IDs for the version you're submitting.

import { readFileSync } from 'fs';
import { sign as cs } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DRY = process.argv.includes('--dry-run');
const P8 = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fastlane', 'AuthKey_4H662N6NAJ.p8'), 'utf8');
const b = x => Buffer.from(x).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

function makeToken() {
  const nn = Math.floor(Date.now() / 1e3);
  const si = b(JSON.stringify({ alg: 'ES256', kid: '4H662N6NAJ', typ: 'JWT' })) + '.' +
             b(JSON.stringify({ iss: '7f91d7a9-3944-4240-9843-2fae66b465f4', iat: nn, exp: nn + 600, aud: 'appstoreconnect-v1' }));
  return `${si}.${b(cs('sha256', Buffer.from(si), { key: P8, dsaEncoding: 'ieee-p1363' }))}`;
}

async function api(method, url, body) {
  const tok = makeToken();
  const opts = { method, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (DRY) { console.log(`[DRY] ${method} ${url}\n${body ? JSON.stringify(body, null, 2) : ''}\n`); return null; }
  const r = await fetch(`https://api.appstoreconnect.apple.com${url}`, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j?.errors?.map(e => e.detail) ?? j)}`);
  return j;
}

// ─── Optimized copy ─────────────────────────────────────────────────────────
// Name/subtitle live in appInfoLocalizations (permanent, requires review).
// Keywords live in appStoreVersionLocalizations (per-version, requires review).
// All names/subtitles ≤30 chars. All keyword strings ≤100 chars.

const APP_INFO_COPY = {
  'en-US': { name: 'Eazy.Family - Voice AI Planner',  subtitle: 'Synced Calendars, Tasks, Lists' },
  'de-DE': { name: 'Eazy.Family – Familienplaner',  subtitle: 'KI-Planer für deine Familie' },
  'fr-FR': { name: 'Eazy.Family – Agenda Familial',  subtitle: 'Planning IA pour la famille' },
  'it':    { name: 'Eazy.Family – Organizer IA',     subtitle: 'Organizer IA per la famiglia' },
  'es-ES': { name: 'Eazy.Family – Agenda Familiar',  subtitle: 'Organizador IA para tu familia' },
  'pt-PT': { name: 'Eazy.Family – Organizador',      subtitle: 'Organizador IA para a família' },
};

const VERSION_KEYWORDS = {
  'en-US': 'family calendar,shared calendar,family planner,grocery list,chore chart,household planner,family ai',
  'de-DE': 'Familienkalender,Familienplaner,Einkaufsliste,To-do-Liste,Aufgabenliste,KI-Assistent,Haushaltsplan',
  'fr-FR': 'calendrier familial,liste de courses,agenda partagé,organisateur famille,tâches,assistant IA,repas',
  'it':    'organizer famiglia,calendario familiare,lista della spesa,to-do list,assistente IA,faccende,agenda',
  'es-ES': 'organizador familiar,calendario compartido,lista de la compra,lista de tareas,asistente IA,hogar,voz',
  'pt-PT': 'organizador familiar,calendário partilhado,lista de tarefas,lista de compras,assistente IA,rotinas',
};

// Validate char limits before doing anything
let ok = true;
for (const [loc, c] of Object.entries(APP_INFO_COPY)) {
  if (c.name.length > 30)     { console.error(`OVER 30: name[${loc}] = ${c.name.length} chars`); ok = false; }
  if (c.subtitle.length > 30) { console.error(`OVER 30: subtitle[${loc}] = ${c.subtitle.length} chars`); ok = false; }
}
for (const [loc, kw] of Object.entries(VERSION_KEYWORDS)) {
  if (kw.length > 100) { console.error(`OVER 100: keywords[${loc}] = ${kw.length} chars`); ok = false; }
}
if (!ok) { console.error('\nFix char overflows above before running.'); process.exit(1); }
console.log('Char limits OK.\n');

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Discover the latest editable version
  const appVers = await api('GET', '/v1/apps/6765778216/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED&limit=5');
  if (!appVers) return; // dry-run short-circuits here
  const editableVersion = appVers.data?.[0];
  if (!editableVersion) {
    console.error('No editable version found. Create a new version in App Store Connect first.');
    process.exit(1);
  }
  console.log(`Targeting version: ${editableVersion.attributes.versionString} (${editableVersion.id})\n`);

  // 2. Update appInfoLocalizations (name + subtitle)
  // Find the editable appInfo (PREPARE_FOR_SUBMISSION), not the live one
  const appInfosResp = await api('GET', '/v1/apps/6765778216/appInfos?limit=5');
  const editableAppInfo = appInfosResp.data?.find(d => d.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION');
  if (!editableAppInfo) { console.error('No editable appInfo found.'); process.exit(1); }
  console.log(`Using appInfo: ${editableAppInfo.id} (${editableAppInfo.attributes.appStoreState})\n`);
  const infoLocs = await api('GET', `/v1/appInfos/${editableAppInfo.id}/appInfoLocalizations?limit=20`);
  for (const loc of infoLocs.data) {
    const copy = APP_INFO_COPY[loc.attributes.locale];
    if (!copy) { console.log(`  skip appInfoLoc: ${loc.attributes.locale} (no copy defined)`); continue; }
    console.log(`  PATCH appInfoLoc ${loc.attributes.locale}: name="${copy.name}" subtitle="${copy.subtitle}"`);
    await api('PATCH', `/v1/appInfoLocalizations/${loc.id}`, {
      data: { type: 'appInfoLocalizations', id: loc.id, attributes: { name: copy.name, subtitle: copy.subtitle } }
    });
  }

  // 3. Update appStoreVersionLocalizations (keywords only)
  const verLocs = await api('GET', `/v1/appStoreVersions/${editableVersion.id}/appStoreVersionLocalizations?limit=20`);
  for (const loc of verLocs.data) {
    const kw = VERSION_KEYWORDS[loc.attributes.locale];
    if (!kw) { console.log(`  skip verLoc: ${loc.attributes.locale} (no keywords defined)`); continue; }
    console.log(`  PATCH verLoc ${loc.attributes.locale}: keywords="${kw}" (${kw.length} chars)`);
    await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: { keywords: kw } }
    });
  }

  console.log('\nDone. Verify in App Store Connect before submitting for review.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
