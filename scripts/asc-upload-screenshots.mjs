// Upload localized iPhone screenshots to App Store Connect for a given locale.
// Usage:  node scripts/asc-upload-screenshots.mjs es-ES
//         node scripts/asc-upload-screenshots.mjs pt-PT
//
// Screenshots must exist in screenshots/store-<short>/ (e.g. store-es/, store-pt/).
// Uploads to the PREPARE_FOR_SUBMISSION (editable) version's localization.
// Deletes existing APP_IPHONE_65 screenshot set first to avoid duplicates.

import { readFileSync, createReadStream, readdirSync, statSync } from 'fs';
import { sign as cs } from 'crypto';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const LOCALE = process.argv[2];
if (!LOCALE) { console.error('Usage: node asc-upload-screenshots.mjs <locale>  e.g. es-ES or pt-PT'); process.exit(1); }

// Map locale → screenshot folder suffix
const LANG_MAP = { 'es-ES': 'es', 'pt-PT': 'pt', 'de-DE': 'de', 'fr-FR': 'fr', 'it': 'it', 'en-US': '' };
const shortLang = LANG_MAP[LOCALE];
if (shortLang === undefined) { console.error('Unknown locale:', LOCALE); process.exit(1); }
const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots', shortLang ? `store-${shortLang}` : 'store');

const P8 = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fastlane', 'AuthKey_4H662N6NAJ.p8'), 'utf8');
const b = x => Buffer.from(x).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function makeToken() {
  const nn = Math.floor(Date.now() / 1e3);
  const si = b(JSON.stringify({ alg: 'ES256', kid: '4H662N6NAJ', typ: 'JWT' })) + '.' +
             b(JSON.stringify({ iss: '7f91d7a9-3944-4240-9843-2fae66b465f4', iat: nn, exp: nn + 600, aud: 'appstoreconnect-v1' }));
  return `${si}.${b(cs('sha256', Buffer.from(si), { key: P8, dsaEncoding: 'ieee-p1363' }))}`;
}

async function api(method, url, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${url}`, {
    method,
    headers: { Authorization: `Bearer ${makeToken()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${url} → ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

function md5(filePath) {
  const hash = createHash('md5');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

async function uploadSlices(filePath, uploadOperations) {
  const buf = readFileSync(filePath);
  for (const op of uploadOperations) {
    const slice = buf.slice(op.offset, op.offset + op.length);
    const headers = {};
    for (const h of op.requestHeaders) headers[h.name] = h.value;
    const r = await fetch(op.url, { method: op.method, headers, body: slice });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Upload slice failed: ${r.status} ${t.slice(0, 200)}`);
    }
  }
}

async function main() {
  console.log(`\nUploading screenshots for ${LOCALE} from ${SHOT_DIR}\n`);

  // 1. Find editable version
  const versions = await api('GET', '/v1/apps/6765778216/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED&limit=5');
  const ver = versions.data?.[0];
  if (!ver) { console.error('No editable version found. Create a new version in ASC first.'); process.exit(1); }
  console.log(`Version: ${ver.attributes.versionString} (${ver.id})`);

  // 2. Find localization for LOCALE
  const locs = await api('GET', `/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations?limit=20`);
  const loc = locs.data?.find(l => l.attributes.locale === LOCALE);
  if (!loc) { console.error(`No localization found for ${LOCALE}. Available: ${locs.data?.map(l => l.attributes.locale).join(', ')}`); process.exit(1); }
  console.log(`Localization ID: ${loc.id}`);

  // 3. Check for existing APP_IPHONE_65 screenshot set and delete it
  const sets = await api('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=20`);
  const existing = sets.data?.find(s => s.attributes.screenshotDisplayType === 'APP_IPHONE_65');
  if (existing) {
    console.log(`Deleting existing APP_IPHONE_65 set (${existing.id})…`);
    await api('DELETE', `/v1/appScreenshotSets/${existing.id}`);
    console.log('  Deleted.');
  }

  // 4. Create new screenshot set
  const newSet = await api('POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: 'APP_IPHONE_65' },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } },
    },
  });
  const setId = newSet.data.id;
  console.log(`Created screenshot set: ${setId}`);

  // 5. Upload each screenshot in order
  const files = readdirSync(SHOT_DIR)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => join(SHOT_DIR, f));

  console.log(`Found ${files.length} screenshots to upload.`);

  for (const filePath of files) {
    const fileName = filePath.split('/').pop();
    const fileSize = statSync(filePath).size;
    console.log(`\n  Uploading ${fileName} (${(fileSize / 1024).toFixed(0)} KB)…`);

    // Reserve slot
    const reserved = await api('POST', '/v1/appScreenshots', {
      data: {
        type: 'appScreenshots',
        attributes: { fileName, fileSize },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
      },
    });
    const screenshotId = reserved.data.id;
    const ops = reserved.data.attributes.uploadOperations;

    // Upload chunks
    await uploadSlices(filePath, ops);

    // Mark as uploaded
    const checksum = md5(filePath);
    await api('PATCH', `/v1/appScreenshots/${screenshotId}`, {
      data: {
        type: 'appScreenshots',
        id: screenshotId,
        attributes: { uploaded: true, sourceFileChecksum: checksum },
      },
    });
    console.log(`  ✓ ${fileName} uploaded (md5: ${checksum.slice(0, 8)}…)`);
  }

  console.log(`\n✓ All ${files.length} screenshots uploaded for ${LOCALE}.\nVerify in App Store Connect → your version → ${LOCALE} localization.\n`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
