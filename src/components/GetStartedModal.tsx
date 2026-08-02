// "Get started" branch used across the marketing site. One CTA everywhere opens
// this (via openGetStarted()), then the visitor picks their platform:
// App Store (iOS), the web app (→ onboarding), or Android (coming soon).
// Mounted once in PublicNav so it's available on every marketing page, and any
// "Get started" button — nav, hero, pricing, footer — opens the same branch.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { track } from "@/lib/analytics";

const APP_STORE_URL = "https://apps.apple.com/app/id6765778216";
const OPEN_EVENT = "eazy:get-started";

const C = { ink: "#1c1c18", inkV: "#55433f", faint: "#87726e", outline: "#dac1bb", primary: "#964735" };
const lora = "'Lora', serif";
const dm = "'DM Sans', sans-serif";

/** Open the platform-choice modal from anywhere on the marketing site. */
export function openGetStarted() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

const AppleGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.05 12.04c-.03-2.85 2.33-4.22 2.44-4.29-1.33-1.94-3.4-2.21-4.13-2.24-1.76-.18-3.43 1.03-4.32 1.03-.89 0-1.89-1.01-3.11-.99-1.6.02-3.08.93-3.9 2.36-1.66 2.88-.43 7.15 1.19 9.49.79 1.15 1.73 2.44 2.96 2.39 1.19-.05 1.64-.77 3.08-.77 1.43 0 1.84.77 3.1.74 1.28-.02 2.09-1.17 2.87-2.33.9-1.34 1.27-2.63 1.29-2.7-.03-.01-2.48-.95-2.51-3.78zM14.6 4.09c.66-.8 1.1-1.9.98-3.01-.95.04-2.1.63-2.78 1.43-.61.71-1.14 1.84-1 2.92 1.06.08 2.14-.54 2.8-1.34z"/></svg>
);
const GlobeGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 2.4 15.5 0 18M12 3c-2.4 2.5-2.4 15.5 0 18"/></svg>
);
const AndroidGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6 18a1 1 0 001 1h1v3a1.5 1.5 0 003 0v-3h2v3a1.5 1.5 0 003 0v-3h1a1 1 0 001-1V9H6v9zM3.5 9A1.5 1.5 0 002 10.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 9zm17 0a1.5 1.5 0 00-1.5 1.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 0020.5 9zM15.5 3.5l1-1.5-.6-.4-1.1 1.6A6 6 0 0012 2.7c-.98 0-1.9.2-2.73.6L8.1 1.6l-.6.4 1 1.5A5.5 5.5 0 006 8h12a5.5 5.5 0 00-2.5-4.5zM9.5 6a.6.6 0 110-1.2.6.6 0 010 1.2zm5 0a.6.6 0 110-1.2.6.6 0 010 1.2z"/></svg>
);

export function GetStartedModal() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener(OPEN_EVENT, onOpen); window.removeEventListener("keydown", onKey); };
  }, []);

  if (!open) return null;

  const rowBase: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 14, border: `1px solid ${C.outline}`, background: "#fff", textDecoration: "none", cursor: "pointer", textAlign: "left", marginBottom: 10 };
  const label: React.CSSProperties = { fontFamily: dm, fontSize: 15, fontWeight: 600, color: C.ink, display: "block" };
  const sub: React.CSSProperties = { fontFamily: dm, fontSize: 12, fontWeight: 400, color: C.faint };

  return (
    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(28,18,12,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 22px", maxWidth: 400, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.32)" }}>
        <div style={{ fontFamily: lora, fontSize: 22, fontWeight: 400, color: C.ink, marginBottom: 4 }}>{t('website.getStarted.title')}</div>
        <div style={{ fontFamily: dm, fontSize: 13, fontWeight: 300, color: C.inkV, marginBottom: 18 }}>{t('website.getStarted.sub')}</div>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => track('app_store_click', { location: 'get_started_modal' })} style={{ ...rowBase, color: C.ink }}>
          <span style={{ color: C.ink, display: "flex" }}><AppleGlyph /></span>
          <span><span style={label}>{t('website.appButtons.appStore')}</span><span style={sub}>iPhone &amp; iPad</span></span>
        </a>
        <button onClick={() => { setOpen(false); navigate('/onboarding?fresh=true'); }} style={{ ...rowBase, color: C.primary }}>
          <span style={{ color: C.primary, display: "flex" }}><GlobeGlyph /></span>
          <span><span style={label}>{t('website.appButtons.webApp')}</span><span style={sub}>{t('website.getStarted.webSub')}</span></span>
        </button>
        <div style={{ ...rowBase, cursor: "default", opacity: 0.55, marginBottom: 0 }}>
          <span style={{ color: C.inkV, display: "flex" }}><AndroidGlyph /></span>
          <span><span style={label}>Android</span><span style={sub}>{t('website.appButtons.androidSoon')}</span></span>
        </div>
      </div>
    </div>
  );
}
