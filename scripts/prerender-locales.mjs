// Post-build: generate static per-locale marketing shells for localized SEO.
//
// The site is a client-rendered SPA, so a single index.html can't give search
// engines (or JS-less AI crawlers) localized <head>/hreflang. This runs after
// `vite build` and:
//   1. injects hreflang alternates into the root (English) dist/index.html
//   2. writes dist/<loc>/index.html for each language subdirectory, with a
//      localized <title>, description, canonical, OG tags and <html lang>.
//
// Vercel then serves /de, /de/* → /de/index.html (see vercel.json), and the SPA
// reads the URL prefix to render that language (see src/i18n/config.ts).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const ORIGIN = 'https://eazy.family';

// hreflang → path. Region variants share one language URL; x-default is English.
const HREFLANG = [
  ['x-default', '/'], ['en', '/'], ['en-GB', '/'], ['en-US', '/'],
  ['de', '/de/'], ['de-CH', '/de/'], ['de-DE', '/de/'], ['de-AT', '/de/'],
  ['fr', '/fr/'], ['fr-CH', '/fr/'], ['fr-FR', '/fr/'],
  ['it', '/it/'], ['it-CH', '/it/'], ['it-IT', '/it/'],
  ['es', '/es/'], ['es-ES', '/es/'],
  ['pt', '/pt/'], ['pt-PT', '/pt/'],
];

// Localized home-page SEO copy (title ≤60, description ≤160).
const SEO = {
  de: {
    title: 'Eazy.Family — Die sprachgesteuerte Familien-App',
    desc: 'Familienkalender, Aufgaben und Einkaufslisten an einem Ort — per Sprache gesteuert. Ein Knopf, und die ganze Familie ist endlich organisiert.',
    ogLocale: 'de_DE',
  },
  fr: {
    title: 'Eazy.Family — L’appli famille pilotée à la voix',
    desc: 'Calendrier familial, tâches et listes de courses au même endroit, pilotés à la voix. Un seul bouton, et toute la famille est enfin organisée.',
    ogLocale: 'fr_FR',
  },
  it: {
    title: 'Eazy.Family — L’app per la famiglia a comando vocale',
    desc: 'Calendario di famiglia, attività e liste della spesa in un unico posto, controllati con la voce. Un pulsante e tutta la famiglia è finalmente organizzata.',
    ogLocale: 'it_IT',
  },
  es: {
    title: 'Eazy.Family — La app familiar controlada por voz',
    desc: 'Calendario familiar, tareas y listas de la compra en un solo lugar, controlados por voz. Un botón y toda la familia por fin organizada.',
    ogLocale: 'es_ES',
  },
  pt: {
    title: 'Eazy.Family — A app de família comandada por voz',
    desc: 'Calendário da família, tarefas e listas de compras num só lugar, comandados por voz. Um botão e toda a família finalmente organizada.',
    ogLocale: 'pt_PT',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hreflangTags = HREFLANG
  .map(([lang, path]) => `    <link rel="alternate" hreflang="${lang}" href="${ORIGIN}${path}" />`)
  .join('\n');

function injectHreflang(html) {
  // Idempotent: only add once, right before </head>.
  if (html.includes('hreflang=')) return html;
  return html.replace('</head>', `${hreflangTags}\n  </head>`);
}

// --- 1. Root (English): add hreflang alternates ---
const rootPath = join(DIST, 'index.html');
let root = readFileSync(rootPath, 'utf8');
root = injectHreflang(root);
writeFileSync(rootPath, root);
console.log('✓ root index.html — hreflang added');

// --- 2. Per-locale shells ---
for (const [loc, s] of Object.entries(SEO)) {
  let html = readFileSync(rootPath, 'utf8'); // start from the hreflang'd root
  html = html
    .replace('<html lang="en">', `<html lang="${loc}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(s.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(s.desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${ORIGIN}/${loc}/$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${ORIGIN}/${loc}/$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(s.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(s.desc)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(s.title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(s.desc)}$2`);

  // og:locale — add if absent, else replace.
  if (html.includes('property="og:locale"')) {
    html = html.replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${s.ogLocale}$2`);
  } else {
    html = html.replace('<meta property="og:type"', `<meta property="og:locale" content="${s.ogLocale}" />\n    <meta property="og:type"`);
  }

  const dir = join(DIST, loc);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`✓ /${loc}/index.html — "${s.title}"`);
}

console.log('Localized SEO shells generated.');
