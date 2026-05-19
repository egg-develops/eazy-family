/**
 * Asset generator — App Icon + Splash screens
 * Usage: node scripts/generate-assets.mjs
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ICON_OUT   = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const SPLASH_1X  = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset/Default@1x~universal~anyany.png');
const SPLASH_2X  = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset/Default@2x~universal~anyany.png');
const SPLASH_3X  = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset/Default@3x~universal~anyany.png');
const FFMPEG     = '/opt/homebrew/bin/ffmpeg';

// ── Icon HTML — Orbe on cream, no wordmark ────────────────────────────────────
const iconHtml = (size) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${size}px; height:${size}px; overflow:hidden;
    background:#FDF9F3;
    display:flex; align-items:center; justify-content:center;
  }
  .wrap {
    position:relative;
    width:${size * 0.82}px;
    height:${size * 0.82}px;
    display:flex; align-items:center; justify-content:center;
  }
  .halo { position:absolute; border-radius:50%; }
  .h1 {
    width:92%; height:92%;
    border:${size * 0.0006}px solid rgba(218,193,187,0.32);
    box-shadow:0 0 ${size*0.05}px rgba(218,193,187,0.22);
    animation:pulse-o 5s ease-in-out infinite;
  }
  .h2 {
    width:73%; height:73%;
    border:${size * 0.001}px solid rgba(150,71,53,0.22);
    box-shadow:0 0 ${size*0.025}px rgba(150,71,53,0.1);
    animation:pulse-m 5s ease-in-out infinite 0.4s;
  }
  .h3 {
    width:56%; height:56%;
    border:${size * 0.0015}px solid rgba(150,71,53,0.32);
    box-shadow:0 0 ${size*0.03}px rgba(150,71,53,0.14),0 0 ${size*0.07}px rgba(218,193,187,0.18);
    animation:pulse-i 5s ease-in-out infinite 0.8s;
  }
  .circle {
    position:absolute;
    width:${size * 0.32}px; height:${size * 0.32}px;
    border-radius:50%;
  }
  .cl {
    background:radial-gradient(circle at 38% 38%, #E8956A, #964735);
    box-shadow:0 ${size*0.012}px ${size*0.05}px rgba(150,71,53,0.3);
    transform:translateX(-${size * 0.085}px);
    animation:cl 5s ease-in-out infinite;
  }
  .cr {
    background:radial-gradient(circle at 62% 38%, #6B9A79, #44664F);
    box-shadow:0 ${size*0.012}px ${size*0.05}px rgba(68,102,79,0.26);
    transform:translateX(${size * 0.085}px);
    animation:cr 5s ease-in-out infinite;
  }
  @keyframes pulse-o { 0%,100%{opacity:.7} 50%{opacity:1} }
  @keyframes pulse-m { 0%,100%{opacity:.6} 50%{opacity:.9} }
  @keyframes pulse-i { 0%,100%{opacity:.8} 50%{opacity:1} }
  @keyframes cl { 0%,100%{transform:translateX(-${size*0.085}px) translateY(0)} 50%{transform:translateX(-${size*0.07}px) translateY(-${size*0.018}px)} }
  @keyframes cr { 0%,100%{transform:translateX(${size*0.085}px) translateY(0)} 50%{transform:translateX(${size*0.07}px) translateY(${size*0.018}px)} }
</style>
</head>
<body>
<div class="wrap">
  <div class="halo h1"></div>
  <div class="halo h2"></div>
  <div class="halo h3"></div>
  <div class="circle cl"></div>
  <div class="circle cr"></div>
</div>
</body>
</html>`;

// ── Splash HTML — Orbe + wordmark + tagline on cream ─────────────────────────
const splashHtml = (size) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${size}px; height:${size}px; overflow:hidden;
    background:#FDF9F3;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:${size * 0.04}px;
  }
  .orbe-wrap {
    position:relative;
    width:${size * 0.44}px;
    height:${size * 0.44}px;
    display:flex; align-items:center; justify-content:center;
  }
  .halo { position:absolute; border-radius:50%; }
  .h1 {
    width:92%; height:92%;
    border:${size * 0.0005}px solid rgba(218,193,187,0.32);
    box-shadow:0 0 ${size*0.03}px rgba(218,193,187,0.22);
  }
  .h2 {
    width:73%; height:73%;
    border:${size * 0.0008}px solid rgba(150,71,53,0.22);
    box-shadow:0 0 ${size*0.015}px rgba(150,71,53,0.1);
  }
  .h3 {
    width:56%; height:56%;
    border:${size * 0.001}px solid rgba(150,71,53,0.32);
    box-shadow:0 0 ${size*0.02}px rgba(150,71,53,0.14);
  }
  .circle {
    position:absolute;
    width:${size * 0.17}px; height:${size * 0.17}px;
    border-radius:50%;
  }
  .cl {
    background:radial-gradient(circle at 38% 38%, #E8956A, #964735);
    box-shadow:0 ${size*0.008}px ${size*0.03}px rgba(150,71,53,0.3);
    transform:translateX(-${size * 0.046}px);
  }
  .cr {
    background:radial-gradient(circle at 62% 38%, #6B9A79, #44664F);
    box-shadow:0 ${size*0.008}px ${size*0.03}px rgba(68,102,79,0.26);
    transform:translateX(${size * 0.046}px);
  }
  .wordmark {
    font-family:'Lora', Georgia, serif;
    font-style:italic;
    font-weight:400;
    font-size:${size * 0.055}px;
    color:#964735;
    letter-spacing:-0.01em;
    margin-top:${size * 0.01}px;
  }
  .tagline {
    font-family:'Lora', Georgia, serif;
    font-style:italic;
    font-weight:400;
    font-size:${size * 0.022}px;
    color:#7A6660;
    letter-spacing:0.01em;
    margin-top:-${size * 0.01}px;
  }
</style>
</head>
<body>
<div class="orbe-wrap">
  <div class="halo h1"></div>
  <div class="halo h2"></div>
  <div class="halo h3"></div>
  <div class="circle cl"></div>
  <div class="circle cr"></div>
</div>
<div class="wordmark">Eazy.Family</div>
<div class="tagline">Your family, in sync.</div>
</body>
</html>`;

async function capture(page, html, size, outPath) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600); // let fonts + animations settle
  await page.screenshot({ path: outPath, type: 'png', clip: { x:0, y:0, width:size, height:size } });
  console.log(`  ✓ ${outPath}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('\nGenerating app icon (1024×1024)…');
  await capture(page, iconHtml(1024), 1024, ICON_OUT);

  console.log('\nGenerating splash screens…');
  await capture(page, splashHtml(683),  683,  SPLASH_1X);
  await capture(page, splashHtml(1366), 1366, SPLASH_2X);
  await capture(page, splashHtml(2049), 2049, SPLASH_3X);

  await browser.close();

  // Also write the public/logo.png used by web + onboarding
  const webLogo = path.join(ROOT, 'public/logo-orbe.png');
  execSync(`cp "${ICON_OUT}" "${webLogo}"`);
  console.log(`\n  ✓ ${webLogo} (copy for web/onboarding)`);

  console.log('\n✅ All assets generated.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
