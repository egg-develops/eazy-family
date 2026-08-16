/**
 * Finalize App Store screenshots to the correct store dimensions and build the
 * marketing hero. The live listing uses the 6.5" slot at 1242×2688, so every
 * delivered image must be exactly that size (the raw captures are 1290×2796 and
 * the bezel-framed comps were 1580×3200 — both wrong for upload).
 *
 * Usage:  SHOT_LANG=de node screenshots/finalize.mjs
 * Input:  screenshots/raw-<lang>/*.png  (1290×2796 bare captures)
 * Output: screenshots/store-<lang>/*.png (1242×2688, framed + hero)
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG = process.env.SHOT_LANG || 'de';

// ── Store target (6.5" — APP_IPHONE_65) ───────────────────────────────────────
const OUT_W = 1242, OUT_H = 2688;
const BG = '#F0ECE6';

// Bezel frame canvas (built at capture scale, then fitted to OUT_*)
const SCR_W = 1290, SCR_H = 2796;
const FR_W = 1580, FR_H = 3200;
const SCR_X = Math.round((FR_W - SCR_W) / 2), SCR_Y = 200;

const IN_RAW = path.join(__dirname, `raw-${LANG}`);
const OUT    = path.join(__dirname, `store-${LANG}`);
fs.mkdirSync(OUT, { recursive: true });

// ── Marketing copy per language ───────────────────────────────────────────────
const HERO = {
  de: { headline: 'Sag es. Eazy erledigt es.', sub: 'Eine Taste für Kalender, Aufgaben und Listen.',
        spoken: '„Plane das Jahrestag-Dinner und setze Blumen und Kuchen auf die Einkaufsliste."',
        chipA: 'Kalender · Jahrestag-Dinner', chipB: 'Einkaufsliste · Blumen, Kuchen', listening: 'Eazy hört zu …' },
  fr: { headline: 'Dites-le. Eazy s’en charge.', sub: 'Un bouton pour agenda, tâches et listes.',
        spoken: '« Planifie le dîner d’anniversaire et ajoute des fleurs et un gâteau à la liste de courses. »',
        chipA: 'Agenda · Dîner d’anniversaire', chipB: 'Liste de courses · Fleurs, gâteau', listening: 'Eazy écoute …' },
  it: { headline: 'Dillo. Eazy lo fa.', sub: 'Un pulsante per calendario, attività e liste.',
        spoken: '«Pianifica la cena dell’anniversario e aggiungi fiori e torta alla lista della spesa.»',
        chipA: 'Calendario · Cena anniversario', chipB: 'Lista della spesa · Fiori, torta', listening: 'Eazy ascolta …' },
  en: { headline: 'Say it. Eazy does it.', sub: 'One button for calendar, tasks and lists.',
        spoken: '”Plan the anniversary dinner and add flowers and cake to the shopping list.”',
        chipA: 'Calendar · Anniversary dinner', chipB: 'Shopping list · Flowers, cake', listening: 'Eazy is listening …' },
  es: { headline: 'Dilo. Eazy lo hace.', sub: 'Un botón para agenda, tareas y listas.',
        spoken: '«Planifica la cena de aniversario y añade flores y tarta a la lista de la compra.»',
        chipA: 'Agenda · Cena de aniversario', chipB: 'Lista de la compra · Flores, tarta', listening: 'Eazy escucha …' },
  pt: { headline: 'Diz. O Eazy trata.', sub: 'Um botão para agenda, tarefas e listas.',
        spoken: '«Planeia o jantar de aniversário e adiciona flores e bolo à lista de compras.»',
        chipA: 'Agenda · Jantar de aniversário', chipB: 'Lista de compras · Flores, bolo', listening: 'Eazy está a ouvir …' },
};
const H = HERO[LANG] || HERO.en;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Word-wrap into <tspan> lines (librsvg in sharp has no foreignObject).
function wrapTspans(text, { x, y, lineH, maxChars, size, weight = 600, fill = '#2B2320' }) {
  const words = text.split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  const spans = lines.map((ln, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineH}">${esc(ln)}</tspan>`).join('');
  return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${spans}</text>`;
}

// ── Bezel SVGs ────────────────────────────────────────────────────────────────
function shadowSVG() {
  return `<svg width="${FR_W}" height="${FR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="b" x="-12%" y="-6%" width="128%" height="116%"><feGaussianBlur stdDeviation="44"/></filter></defs>
  <rect x="40" y="68" width="1500" height="3120" rx="155" fill="rgba(0,0,0,0.5)" filter="url(#b)"/></svg>`;
}
function bezelSVG() {
  const diW = 378, diH = 108, diX = FR_W / 2 - diW / 2, diY = SCR_Y + 33;
  const hiW = 360, hiH = 15, hiX = FR_W / 2 - hiW / 2, hiY = SCR_Y + SCR_H - 90;
  return `<svg width="${FR_W}" height="${FR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs><mask id="h"><rect width="${FR_W}" height="${FR_H}" fill="white"/><rect x="${SCR_X}" y="${SCR_Y}" width="${SCR_W}" height="${SCR_H}" rx="55" fill="black"/></mask></defs>
  <rect x="40" y="40" width="1500" height="3120" rx="155" fill="#1C1C1E" mask="url(#h)"/>
  <rect x="40" y="40" width="1500" height="3120" rx="155" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" mask="url(#h)"/>
  <rect x="${diX}" y="${diY}" width="${diW}" height="${diH}" rx="54" fill="#080808"/>
  <rect x="${hiX}" y="${hiY}" width="${hiW}" height="${hiH}" rx="7" fill="rgba(255,255,255,0.35)"/>
  <rect x="23" y="520" width="16" height="76" rx="8" fill="#2A2A2D"/>
  <rect x="23" y="636" width="16" height="118" rx="8" fill="#2A2A2D"/>
  <rect x="23" y="796" width="16" height="118" rx="8" fill="#2A2A2D"/>
  <rect x="1541" y="700" width="16" height="156" rx="8" fill="#2A2A2D"/></svg>`;
}
async function frameBuffer(screenBuf) {
  const [sh, bz] = await Promise.all([
    sharp(Buffer.from(shadowSVG())).png().toBuffer(),
    sharp(Buffer.from(bezelSVG())).png().toBuffer(),
  ]);
  return sharp({ create: { width: FR_W, height: FR_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sh, top: 0, left: 0 }, { input: screenBuf, top: SCR_Y, left: SCR_X }, { input: bz, top: 0, left: 0 }])
    .png().toBuffer();
}

// Fit a framed (transparent) comp onto the OUT_W×OUT_H store canvas, centered.
async function toStoreCanvas(framedBuf, { scale = 0.786, bg = BG, topBias = 0 } = {}) {
  const w = Math.round(FR_W * scale);
  const resized = await sharp(framedBuf).resize(w).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const left = Math.round((OUT_W - meta.width) / 2);
  const top = Math.round((OUT_H - meta.height) / 2) + topBias;
  return sharp({ create: { width: OUT_W, height: OUT_H, channels: 4, background: bg } })
    .composite([{ input: resized, top: Math.max(0, top), left }])
    .flatten({ background: bg }).png().toBuffer();
}

// ── Plain framed store shots ──────────────────────────────────────────────────
async function buildPlain(name) {
  const raw = path.join(IN_RAW, `${name}.png`);
  if (!fs.existsSync(raw)) return false;
  const framed = await frameBuffer(raw);
  const out = await toStoreCanvas(framed);
  await sharp(out).toFile(path.join(OUT, `${name}.png`));
  console.log(`   ✓ ${name}.png (1242×2688)`);
  return true;
}

// ── Marketing hero (Option B): headline + phone with a graphical EZ card ──────
function ezCardSVG() {
  // Overlaid on the raw 1290×2796 home screen, lower third.
  const x = 70, w = 1150, y = 1560, h = 1000, r = 56;
  return `<svg width="${SCR_W}" height="${SCR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="orb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#964735"/><stop offset="1" stop-color="#D97B66"/></linearGradient>
    <filter id="cs" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="34" flood-color="rgba(80,30,20,0.28)"/></filter>
  </defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#FFFFFF" filter="url(#cs)"/>
  <circle cx="${x + 110}" cy="${y + 118}" r="62" fill="url(#orb)"/>
  <circle cx="${x + 110}" cy="${y + 118}" r="25" fill="#FFFFFF"/>
  <text x="${x + 210}" y="${y + 104}" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#1C1C1E">EZ</text>
  <text x="${x + 210}" y="${y + 160}" font-family="Arial, sans-serif" font-size="36" fill="#8A7A73">${esc(H.listening)}</text>
  ${wrapTspans(H.spoken, { x: x + 60, y: y + 268, lineH: 74, maxChars: 34, size: 54 })}
  <rect x="${x + 56}" y="${y + 662}" width="${w - 112}" height="126" rx="32" fill="#FBEFE9"/>
  <circle cx="${x + 120}" cy="${y + 725}" r="30" fill="#964735"/>
  <text x="${x + 174}" y="${y + 740}" font-family="Arial, sans-serif" font-size="42" font-weight="600" fill="#5A2E22">${esc(H.chipA)}</text>
  <rect x="${x + 56}" y="${y + 810}" width="${w - 112}" height="126" rx="32" fill="#EFF3EF"/>
  <circle cx="${x + 120}" cy="${y + 873}" r="30" fill="#44664F"/>
  <text x="${x + 174}" y="${y + 888}" font-family="Arial, sans-serif" font-size="42" font-weight="600" fill="#2E4636">${esc(H.chipB)}</text>
</svg>`;
}
function heroBgSVG() {
  return `<svg width="${OUT_W}" height="${OUT_H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FBEEE7"/><stop offset="0.55" stop-color="#F3E7DF"/><stop offset="1" stop-color="#EADBCF"/>
  </linearGradient></defs>
  <rect width="${OUT_W}" height="${OUT_H}" fill="url(#bg)"/></svg>`;
}
function heroTextSVG() {
  // Split the headline on its first sentence break so it sits on two balanced
  // lines at a large size without clipping the 1242-wide canvas.
  const m = H.headline.match(/^(.*?[.!?])\s+(.*)$/);
  const l1 = m ? m[1] : H.headline;
  const l2 = m ? m[2] : '';
  const cx = OUT_W / 2;
  return `<svg width="${OUT_W}" height="${OUT_H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="238" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="94" font-weight="700" fill="#964735">${esc(l1)}</text>
  ${l2 ? `<text x="${cx}" y="352" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="94" font-weight="700" fill="#964735">${esc(l2)}</text>` : ''}
  <text x="${cx}" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" fill="#6B5B52">${esc(H.sub)}</text></svg>`;
}
async function buildHero() {
  const raw = path.join(IN_RAW, '01-home.png');
  if (!fs.existsSync(raw)) { console.warn('   ! hero: no raw home shot'); return; }
  // 1. EZ card over the home screen
  const card = await sharp(Buffer.from(ezCardSVG())).png().toBuffer();
  const screen = await sharp(raw).composite([{ input: card, top: 0, left: 0 }]).png().toBuffer();
  // 2. bezel it
  const framed = await frameBuffer(screen);
  // 3. compose onto gradient hero canvas, phone pushed down to leave room for headline
  const phoneW = Math.round(FR_W * 0.64);           // ~1011
  const phone = await sharp(framed).resize(phoneW).png().toBuffer();
  const pm = await sharp(phone).metadata();
  const bg = await sharp(Buffer.from(heroBgSVG())).png().toBuffer();
  const text = await sharp(Buffer.from(heroTextSVG())).png().toBuffer();
  const out = await sharp(bg)
    .composite([
      { input: text, top: 0, left: 0 },
      { input: phone, top: 520, left: Math.round((OUT_W - pm.width) / 2) },
    ])
    .flatten({ background: BG }).png().toBuffer();
  await sharp(out).toFile(path.join(OUT, '02-orb.png'));
  console.log('   ✓ 02-orb.png (hero, 1242×2688)');
}

async function main() {
  console.log(`Finalizing store shots (lang=${LANG}) → store-${LANG}/`);
  for (const n of ['01-home', '03-calendar', '04-shopping', '05-family', '06-rituals', '07-tasks']) await buildPlain(n);
  await buildHero();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
