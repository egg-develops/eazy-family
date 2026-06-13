// Query App Store Connect for recent build upload/processing status.
import { readFileSync } from 'node:fs';
import { createSign, sign as cryptoSign } from 'node:crypto';

const KEY_ID = '4H662N6NAJ';
const ISSUER = '7f91d7a9-3944-4240-9843-2fae66b465f4';
const APP_ID = '6765778216';
const P8 = readFileSync(new URL('../fastlane/AuthKey_4H662N6NAJ.p8', import.meta.url), 'utf8');

const b64url = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
const payload = b64url(JSON.stringify({ iss: ISSUER, iat: now, exp: now + 1000, aud: 'appstoreconnect-v1' }));
const signingInput = `${header}.${payload}`;
const sig = cryptoSign('sha256', Buffer.from(signingInput), { key: P8, dsaEncoding: 'ieee-p1363' });
const jwt = `${signingInput}.${b64url(sig)}`;

const api = async (path) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, { headers: { Authorization: `Bearer ${jwt}` } });
  const body = await r.json();
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(body)}`);
  return body;
};

const data = await api(`/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=10&fields[builds]=version,processingState,uploadedDate,expired,usesNonExemptEncryption`);
if (!data.data.length) { console.log('No builds found for this app.'); process.exit(0); }
console.log('Recent builds (newest first):\n');
for (const b of data.data) {
  const a = b.attributes;
  console.log(`  build ${a.version}  | ${a.processingState.padEnd(10)} | uploaded ${a.uploadedDate} | expired=${a.expired}`);
}
