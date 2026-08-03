// App Store Connect daily digest — downloads + proceeds by day and country,
// for close monitoring of the Apple Search Ads campaigns.
//
// Usage:  ASC_VENDOR_NUMBER=XXXXXXXX node scripts/asc-daily-digest.mjs [days]
//   Vendor number: App Store Connect → Payments and Financial Reports (top-left,
//   numeric, e.g. 8xxxxxxx) or Sales and Trends. Not a secret.
//
// Pulls the last N daily SALES SUMMARY reports (data lags ~1 day), aggregates
// this app's units by country, and highlights the ad-target markets (CH/US/GB).
import { readFileSync } from 'node:fs';
import { sign as cs } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP_ID = '6765778216';
const VENDOR = process.env.ASC_VENDOR_NUMBER;
const DAYS = Number(process.argv[2] || 7);
const HILITE = ['CH', 'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'PT', 'AT'];

if (!VENDOR) {
  console.error('Set ASC_VENDOR_NUMBER (App Store Connect → Payments and Financial Reports).');
  process.exit(1);
}

const P8 = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fastlane', 'AuthKey_4H662N6NAJ.p8'), 'utf8');
const b = x => Buffer.from(x).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function token() {
  const nn = Math.floor(Date.now() / 1e3);
  const si = `${b(JSON.stringify({ alg: 'ES256', kid: '4H662N6NAJ', typ: 'JWT' }))}.${b(JSON.stringify({ iss: '7f91d7a9-3944-4240-9843-2fae66b465f4', iat: nn, exp: nn + 600, aud: 'appstoreconnect-v1' }))}`;
  return `${si}.${b(cs('sha256', Buffer.from(si), { key: P8, dsaEncoding: 'ieee-p1363' }))}`;
}

const ymd = d => d.toISOString().slice(0, 10);

async function reportFor(date) {
  const qs = new URLSearchParams({
    'filter[frequency]': 'DAILY', 'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY', 'filter[vendorNumber]': VENDOR,
    'filter[reportDate]': date, 'filter[version]': '1_1',
  });
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${qs}`, {
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/a-gzip' },
  });
  if (res.status === 404) return null; // no data / date not ready yet
  if (!res.ok) { console.warn(`  ${date}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`); return null; }
  const buf = Buffer.from(await res.arrayBuffer());
  const tsv = gunzipSync(buf).toString('utf8');
  const [head, ...rows] = tsv.split('\n').filter(Boolean);
  const cols = head.split('\t');
  const ix = name => cols.indexOf(name);
  const iUnits = ix('Units'), iCountry = ix('Country Code'), iApple = ix('Apple Identifier'),
        iProc = ix('Developer Proceeds'), iType = ix('Product Type Identifier'), iCur = ix('Currency of Proceeds');
  const byCountry = {}; let total = 0; let proceeds = 0; let procCur = '';
  for (const line of rows) {
    const c = line.split('\t');
    if (c[iApple] !== APP_ID) continue;
    const units = parseInt(c[iUnits] || '0', 10) || 0;
    const type = c[iType] || '';
    // App downloads/updates = product types starting with 1/7/F; IAP/sub have others.
    const isInstall = /^(1|7|F)/.test(type);
    if (isInstall) { byCountry[c[iCountry]] = (byCountry[c[iCountry]] || 0) + units; total += units; }
    const p = parseFloat(c[iProc] || '0') || 0;
    if (p) { proceeds += p * units; procCur = c[iCur] || procCur; }
  }
  return { byCountry, total, proceeds, procCur };
}

async function main() {
  console.log(`\nApp Store daily digest — app ${APP_ID} — last ${DAYS} days\n${'='.repeat(52)}`);
  const totals = {}; let grand = 0; let grandProc = 0; let curLabel = '';
  for (let i = 1; i <= DAYS; i++) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - i);
    const date = ymd(d);
    const r = await reportFor(date);
    if (!r) { console.log(`${date}: —`); continue; }
    const hi = HILITE.filter(c => r.byCountry[c]).map(c => `${c} ${r.byCountry[c]}`).join('  ');
    const others = Object.entries(r.byCountry).filter(([c]) => !HILITE.includes(c)).reduce((s, [, n]) => s + n, 0);
    console.log(`${date}:  ${String(r.total).padStart(4)} installs   ${hi}${others ? `   other ${others}` : ''}${r.proceeds ? `   +${r.proceeds.toFixed(2)} ${r.procCur}` : ''}`);
    for (const [c, n] of Object.entries(r.byCountry)) totals[c] = (totals[c] || 0) + n;
    grand += r.total; grandProc += r.proceeds; curLabel = r.procCur || curLabel;
  }
  console.log('-'.repeat(52));
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c} ${n}`).join('  ');
  console.log(`TOTAL: ${grand} installs   ${grandProc ? `${grandProc.toFixed(2)} ${curLabel} proceeds` : 'no proceeds'}`);
  console.log(`By country: ${top}\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
