/**
 * iPad EZ-voice marketing hero (02-orb) at 2048×2732, matching the iPhone hero.
 * The live EZ overlay won't auto-capture, so compose it: the German home screen
 * + a graphical EZ-capture card, framed as iPad, under a localized headline.
 * Usage: SHOT_LANG=de node screenshots/ipad-hero.mjs
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG = process.env.SHOT_LANG || 'de';
const SUFFIX = LANG === 'en' ? '' : `-${LANG}`;

const OUT_W = 2048, OUT_H = 2732;            // iPad store size
const SCR_W = 2048, SCR_H = 2732;            // raw iPad screen
const BG = '#F0ECE6', PAGE_BG = '#FDF9F3';

const HERO = {
  de: { headline: 'Sag es. Eazy erledigt es.', sub: 'Eine Taste für Kalender, Aufgaben und Listen.',
        spoken: '„Plane das Jahrestag-Dinner und setze Blumen und Kuchen auf die Einkaufsliste."',
        chipA: 'Kalender · Jahrestag-Dinner', chipB: 'Einkaufsliste · Blumen, Kuchen', listening: 'Eazy hört zu …' },
  en: { headline: 'Say it. Eazy does it.', sub: 'One button for calendar, tasks and lists.',
        spoken: '“Plan the anniversary dinner and add flowers and cake to the shopping list.”',
        chipA: 'Calendar · Anniversary dinner', chipB: 'Shopping list · Flowers, cake', listening: 'Eazy is listening …' },
}[LANG] || null;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrapTspans(text, { x, y, lineH, maxChars, size, weight = 600, fill = '#2B2320' }) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  const spans = lines.map((ln, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineH}">${esc(ln)}</tspan>`).join('');
  return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${spans}</text>`;
}

// EZ card overlaid on the iPad home screen (2048×2732 coords), centered lower third.
function ezCardSVG() {
  const w = 1360, h = 760, x = (SCR_W - w) / 2, y = 1640, r = 60;
  return `<svg width="${SCR_W}" height="${SCR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="orb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#964735"/><stop offset="1" stop-color="#D97B66"/></linearGradient>
    <filter id="cs" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="20" stdDeviation="38" flood-color="rgba(80,30,20,0.26)"/></filter>
  </defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#FFFFFF" filter="url(#cs)"/>
  <circle cx="${x + 118}" cy="${y + 120}" r="64" fill="url(#orb)"/>
  <circle cx="${x + 118}" cy="${y + 120}" r="26" fill="#FFFFFF"/>
  <text x="${x + 224}" y="${y + 104}" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#1C1C1E">EZ</text>
  <text x="${x + 224}" y="${y + 162}" font-family="Arial, sans-serif" font-size="38" fill="#8A7A73">${esc(HERO.listening)}</text>
  ${wrapTspans(HERO.spoken, { x: x + 64, y: y + 268, lineH: 66, maxChars: 46, size: 50 })}
  <rect x="${x + 60}" y="${y + 500}" width="${w - 120}" height="110" rx="30" fill="#FBEFE9"/>
  <circle cx="${x + 124}" cy="${y + 555}" r="28" fill="#964735"/>
  <text x="${x + 178}" y="${y + 570}" font-family="Arial, sans-serif" font-size="40" font-weight="600" fill="#5A2E22">${esc(HERO.chipA)}</text>
  <rect x="${x + 60}" y="${y + 630}" width="${w - 120}" height="110" rx="30" fill="#EFF3EF"/>
  <circle cx="${x + 124}" cy="${y + 685}" r="28" fill="#44664F"/>
  <text x="${x + 178}" y="${y + 700}" font-family="Arial, sans-serif" font-size="40" font-weight="600" fill="#2E4636">${esc(HERO.chipB)}</text>
</svg>`;
}
function ipadFrameSVG() {
  const W = SCR_W, H = SCR_H, R = 52;
  const pillW = 420, pillH = 72, pillR = 36, pillX = (W - pillW) / 2, pillY = 32;
  const barW = 560, barH = 14, barR = 7, barX = (W - barW) / 2, barY = H - 52;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><mask id="corners"><rect width="${W}" height="${H}" fill="white"/><rect width="${W}" height="${H}" rx="${R}" fill="black"/></mask></defs>
  <rect width="${W}" height="${H}" fill="${PAGE_BG}" mask="url(#corners)"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R}" fill="none" stroke="rgba(180,155,140,0.45)" stroke-width="1"/>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillR}" fill="#0d0d0d"/>
  <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barR}" fill="rgba(0,0,0,0.22)"/></svg>`;
}
function heroBgSVG() {
  return `<svg width="${OUT_W}" height="${OUT_H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBEEE7"/><stop offset="0.55" stop-color="#F3E7DF"/><stop offset="1" stop-color="#EADBCF"/></linearGradient></defs>
  <rect width="${OUT_W}" height="${OUT_H}" fill="url(#bg)"/></svg>`;
}
function heroTextSVG() {
  const m = HERO.headline.match(/^(.*?[.!?])\s+(.*)$/);
  const l1 = m ? m[1] : HERO.headline, l2 = m ? m[2] : '', cx = OUT_W / 2;
  return `<svg width="${OUT_W}" height="${OUT_H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="120" font-weight="700" fill="#964735">${esc(l1)}</text>
  ${l2 ? `<text x="${cx}" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="120" font-weight="700" fill="#964735">${esc(l2)}</text>` : ''}
  <text x="${cx}" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" fill="#6B5B52">${esc(HERO.sub)}</text></svg>`;
}

async function main() {
  if (!HERO) { console.error('no hero copy for lang', LANG); process.exit(1); }
  const raw = path.join(__dirname, `raw-ipad${SUFFIX}`, '01-home.png');
  // 1. EZ card over the home screen
  const card = await sharp(Buffer.from(ezCardSVG())).png().toBuffer();
  const screen = await sharp(raw).resize(SCR_W, SCR_H, { fit: 'fill' }).composite([{ input: card, top: 0, left: 0 }]).png().toBuffer();
  // 2. iPad frame (rounded corners + pill)
  const frame = await sharp(Buffer.from(ipadFrameSVG())).png().toBuffer();
  const framed = await sharp(screen).composite([{ input: frame, top: 0, left: 0 }]).png().toBuffer();
  // 3. compose onto gradient canvas, screen scaled below the headline
  const scrW = 1500;
  const scaled = await sharp(framed).resize(scrW).png().toBuffer();
  const sm = await sharp(scaled).metadata();
  const bg = await sharp(Buffer.from(heroBgSVG())).png().toBuffer();
  const text = await sharp(Buffer.from(heroTextSVG())).png().toBuffer();
  const out = path.join(__dirname, `framed-ipad${SUFFIX}`, '02-orb.png');
  await sharp(bg).composite([
    { input: text, top: 0, left: 0 },
    { input: scaled, top: 590, left: Math.round((OUT_W - sm.width) / 2) },
  ]).flatten({ background: BG }).png().toFile(out);
  console.log('✓ 02-orb.png (iPad hero, 2048×2732) →', out);
}
main().catch(e => { console.error(e); process.exit(1); });
