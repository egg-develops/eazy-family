import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { PublicNav } from "@/components/PublicNav";

// Design tokens
const T = {
  bg: "#fdf9f3", warm: "#ffffff", sLow: "#f7f3ed", sMid: "#f1ede7",
  ink: "#1c1c18", inkV: "#55433f", faint: "#87726e", outline: "#dac1bb",
  primary: "#964735", primaryL: "#d97b66", primaryS: "#ffdad3",
  secondary: "#44664f", secondaryS: "#c6eccf",
  tertiary: "#406373", tertiaryS: "#c3e8fb",
};

const lora = "'Lora', serif";
const dm = "'DM Sans', sans-serif";

// Hero Orbe — motion graphic floating on cream, with frosted pulsing halo
const OrbeMorphic = () => (
  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>

      {/* Halo — outermost, slowest pulse */}
      <div className="orbe-halo-outer" style={{
        position: "absolute", width: "90%", height: "90%", borderRadius: "50%",
        border: "0.5px solid rgba(218,193,187,0.3)",
        boxShadow: "0 0 48px rgba(218,193,187,0.2)",
        pointerEvents: "none",
      }} />
      {/* Halo — mid ring */}
      <div className="orbe-halo-mid" style={{
        position: "absolute", width: "72%", height: "72%", borderRadius: "50%",
        border: "1px solid rgba(150,71,53,0.2)",
        boxShadow: "0 0 24px rgba(150,71,53,0.09), inset 0 0 24px rgba(253,249,243,0.1)",
        backdropFilter: "blur(1px)",
        pointerEvents: "none",
      }} />
      {/* Halo — inner frosted ring */}
      <div className="orbe-halo-inner" style={{
        position: "absolute", width: "56%", height: "56%", borderRadius: "50%",
        border: "1.5px solid rgba(150,71,53,0.3)",
        boxShadow: "0 0 32px rgba(150,71,53,0.12), 0 0 64px rgba(218,193,187,0.16)",
        backdropFilter: "blur(2px)",
        pointerEvents: "none",
      }} />

      {/* Left circle — terracotta */}
      <div className="orbe-circle-left" style={{
        position: "absolute", width: "40%", height: "40%", borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, #E8956A, #964735)",
        opacity: 0.84,
        boxShadow: "0 12px 48px rgba(150,71,53,0.28)",
      }} />
      {/* Right circle — sage */}
      <div className="orbe-circle-right" style={{
        position: "absolute", width: "40%", height: "40%", borderRadius: "50%",
        background: "radial-gradient(circle at 60% 40%, #6B9A79, #44664f)",
        opacity: 0.8,
        boxShadow: "0 12px 48px rgba(68,102,79,0.24)",
      }} />

    </div>
  </div>
);

const OrbeMini = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "16px 0" }}>
    <div className="orbe-pulse" style={{ width: 32, height: 32, borderRadius: "50%", background: T.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
      </div>
    </div>
    <span style={{ fontFamily: lora, fontStyle: "italic", fontSize: 11, color: T.primary }}>Eazy</span>
  </div>
);

const OrbeTini = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "12px 0" }}>
    <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff" }} />
      </div>
    </div>
  </div>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.primary, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.primary, flexShrink: 0, display: "inline-block" }} />
    {children}
  </div>
);

const CheckSvg = ({ color = T.secondary }: { color?: string }) => (
  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

const PfCheck = () => (
  <span style={{ width: 14, height: 14, borderRadius: "50%", background: T.secondaryS, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
    <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke={T.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </span>
);

const CtaDark = ({ onStart, eyebrow, headline, headlineEm, sub, button }: { onStart: () => void; eyebrow: string; headline: string; headlineEm: string; sub: string; button: string }) => (
  <div style={{ background: T.ink, padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint }}>{eyebrow}</div>
    <h2 style={{ fontFamily: lora, fontSize: "clamp(28px,5vw,40px)", fontWeight: 400, color: "#fdf9f3", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 520, margin: 0 }}>
      {headline} <em style={{ fontStyle: "italic", color: T.primaryL }}>{headlineEm}</em>
    </h2>
    <p style={{ fontSize: 14, color: T.faint, fontWeight: 300, margin: 0 }}>{sub}</p>
    <button
      onClick={onStart}
      style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: T.ink, background: "#fdf9f3", border: "none", padding: "11px 26px", borderRadius: "9999px", cursor: "pointer" }}
    >
      {button}
    </button>
  </div>
);

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const sec: React.CSSProperties = { padding: "72px 40px", borderBottom: `0.5px solid ${T.outline}` };
  const max: React.CSSProperties = { maxWidth: 860, margin: "0 auto" };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: dm, fontSize: 16, lineHeight: 1.6 }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section style={{ borderBottom: `0.5px solid ${T.outline}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 1200, margin: "0 auto", alignItems: "center" }} className="hero-grid">
          {/* Left: text */}
          <div style={{ padding: "72px 48px 72px max(40px, 5vw)" }}>
            <Eyebrow>{t('website.hero.eyebrow')}</Eyebrow>
            <h1 style={{ fontFamily: lora, fontSize: "clamp(30px,4.5vw,48px)", fontWeight: 400, lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 20, color: T.ink }}>
              {t('website.hero.headline')}
            </h1>
            <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, lineHeight: 1.65, marginBottom: 32 }}>
              {t('website.hero.sub')}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
              <button
                onClick={() => document.getElementById("orbe-section")?.scrollIntoView({ behavior: "smooth" })}
                style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", cursor: "pointer", padding: "11px 22px", borderRadius: "9999px", letterSpacing: "0.01em", transition: "all 0.15s" }}
              >
                {t('website.hero.meetOrbe')}
              </button>
              <button
                onClick={() => navigate("/onboarding")}
                style={{ fontFamily: dm, fontSize: 14, fontWeight: 400, color: T.primary, background: "none", border: `1px solid ${T.outline}`, cursor: "pointer", padding: "10px 22px", borderRadius: "9999px", transition: "all 0.15s" }}
              >
                {t('website.hero.downloadApp')}
              </button>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
              {([t('website.hero.check1'), t('website.hero.check2'), t('website.hero.check3')] as string[]).map(item => (
                <span key={item} style={{ fontSize: 12, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", background: T.secondaryS, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckSvg />
                  </span>
                  {item}
                </span>
              ))}
            </div>
            {/* Language availability row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: T.faint }}>{t('website.hero.availableIn')}</span>
              {[
                { flag: "🇺🇸", label: "EN" }, { flag: "🇬🇧", label: "EN-GB" },
                { flag: "🇩🇪", label: "DE" }, { flag: "🇫🇷", label: "FR" }, { flag: "🇮🇹", label: "IT" },
              ].map(({ flag, label }) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: T.inkV, background: T.sMid, border: `0.5px solid ${T.outline}`, borderRadius: "9999px", padding: "3px 8px" }}>
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{flag}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
          {/* Right: motion graphic — fills full column height */}
          <div className="hero-orbe-wrap" style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <OrbeMorphic />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section style={sec} id="features">
        <div style={max}>
          <Eyebrow>{t('website.pain.eyebrow')}</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            {t('website.pain.headline')}<br />{t('website.pain.headlineSub')}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginTop: 32 }}>
            {[
              {
                bar: T.primary,
                q: t('website.pain.card1Quote'),
                problem: t('website.pain.card1Problem'),
                solution: t('website.pain.card1Solution'),
              },
              {
                bar: T.secondary,
                q: t('website.pain.card2Quote'),
                problem: t('website.pain.card2Problem'),
                solution: t('website.pain.card2Solution'),
              },
              {
                bar: T.tertiary,
                q: t('website.pain.card3Quote'),
                problem: t('website.pain.card3Problem'),
                solution: t('website.pain.card3Solution'),
              },
            ].map((c, i) => (
              <div key={i} style={{ background: T.warm, border: `0.5px solid ${T.outline}`, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
                <div style={{ height: 3, borderRadius: 9999, width: 32, background: c.bar, marginBottom: 16, flexShrink: 0 }} />
                <p style={{ fontFamily: lora, fontSize: 16, fontWeight: 400, lineHeight: 1.4, color: T.inkV, marginBottom: 14 }}>{c.q}</p>
                <p style={{ fontSize: 14, fontWeight: 300, color: T.inkV, lineHeight: 1.65 }}>{c.problem}</p>
                <OrbeMini />
                <p style={{ fontSize: 14, fontWeight: 400, color: T.ink, lineHeight: 1.65 }}>{c.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Orbe ── */}
      <section style={{ ...sec, background: T.primaryS }} id="orbe-section">
        <div style={max}>
          <Eyebrow>{t('website.orbe.eyebrow')}</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            {t('website.orbe.headline')}<br />{t('website.orbe.headlineSub')}
          </h2>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, maxWidth: 480, lineHeight: 1.65, marginBottom: 40 }}>
            {t('website.orbe.sub')}
          </p>
          {/* Feature grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 1, background: T.outline, border: `0.5px solid ${T.outline}`, borderRadius: 16, overflow: "hidden", marginTop: 32 }}>
            {[
              { bg: T.primaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" fill="#964735"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="#964735" opacity=".4"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="#964735" opacity=".4"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="#964735"/></svg>, title: t('website.orbe.calendarTitle'), desc: t('website.orbe.calendarDesc') },
              { bg: T.secondaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2.5" stroke="#44664f" strokeWidth="1.5" fill="none"/><path d="M6 10L9 13L14 7" stroke="#44664f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: t('website.orbe.tasksTitle'), desc: t('website.orbe.tasksDesc') },
              { bg: T.tertiaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h8M4 15h6" stroke="#406373" strokeWidth="1.5" strokeLinecap="round"/></svg>, title: t('website.orbe.shoppingTitle'), desc: t('website.orbe.shoppingDesc') },
              { bg: T.primaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#964735" strokeWidth="1.5" fill="none"/><path d="M10 6v4l3 3" stroke="#964735" strokeWidth="1.5" strokeLinecap="round"/></svg>, title: t('website.orbe.ritualsTitle'), desc: t('website.orbe.ritualsDesc') },
            ].map(f => (
              <div key={f.title} style={{ background: T.warm, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: f.bg, flexShrink: 0 }}>{f.ico}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{f.title}</div>
                <div style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: lora, fontStyle: "italic", fontSize: 20, color: T.ink, marginTop: 40, lineHeight: 1.45, maxWidth: 520 }}>
            {t('website.orbe.quote')}
          </p>
        </div>
      </section>

      {/* ── Intelligence ── */}
      <section style={sec} id="intelligence">
        <div style={max}>
          <Eyebrow>{t('website.intelligence.eyebrow')}</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            {t('website.intelligence.headline')}<br />{t('website.intelligence.headlineSub')}
          </h2>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, maxWidth: 480, lineHeight: 1.65, marginBottom: 40 }}>
            {t('website.intelligence.sub')}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24, marginTop: 32 }} className="intel-grid">
            {[
              { pip: T.primary, title: t('website.intelligence.card1Title'), problem: t('website.intelligence.card1Problem'), solution: t('website.intelligence.card1Solution') },
              { pip: T.tertiary, title: t('website.intelligence.card2Title'), problem: t('website.intelligence.card2Problem'), solution: t('website.intelligence.card2Solution') },
              { pip: T.secondary, title: t('website.intelligence.card3Title'), problem: t('website.intelligence.card3Problem'), solution: t('website.intelligence.card3Solution') },
              { pip: T.primaryL, title: t('website.intelligence.card4Title'), problem: t('website.intelligence.card4Problem'), solution: t('website.intelligence.card4Solution') },
            ].map((c, i) => (
              <div key={i} style={{ background: T.warm, border: `0.5px solid ${T.outline}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.pip, flexShrink: 0 }} />
                  {c.title}
                </div>
                <p style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.65 }}>{c.problem}</p>
                <OrbeTini />
                <p style={{ fontSize: 13, fontWeight: 400, color: T.ink, lineHeight: 1.65 }}>{c.solution}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, fontWeight: 300, color: T.inkV, marginTop: 28, lineHeight: 1.65 }}>
            This is where Eazy.Family becomes something your family can actually depend on. And it's delivered to you every morning.{" "}
            <button onClick={() => document.getElementById("digest")?.scrollIntoView({ behavior: "smooth" })}
              style={{ color: T.primary, fontWeight: 400, background: "none", border: "none", cursor: "pointer", textDecoration: "none", fontFamily: dm, fontSize: 15 }}>
              {t('website.intelligence.digestLink')}
            </button>
          </p>
        </div>
      </section>

      {/* ── Morning Digest ── */}
      <section style={{ ...sec, background: T.sLow }} id="digest">
        <div style={max}>
          <Eyebrow>{t('website.digest.eyebrow')}</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            {t('website.digest.headline')}
          </h2>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, maxWidth: 480, lineHeight: 1.65, marginBottom: 40 }}>
            {t('website.digest.sub')}
          </p>
          <div className="digest-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 32 }}>
            {[
              { label: t('website.digest.card1Label'), body: t('website.digest.card1Body') },
              { label: t('website.digest.card2Label'), body: t('website.digest.card2Body') },
              { label: t('website.digest.card3Label'), body: t('website.digest.card3Body') },
              { label: t('website.digest.card4Label'), body: t('website.digest.card4Body') },
              { label: t('website.digest.card5Label'), body: t('website.digest.card5Body') },
              { label: t('website.digest.card6Label'), body: t('website.digest.card6Body') },
            ].map(d => (
              <div key={d.label} style={{ background: T.warm, border: `0.5px solid ${T.outline}`, borderRadius: 16, padding: "28px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: T.primary, marginBottom: 8 }}>{d.label}</div>
                <p style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.65, margin: 0 }}>{d.body}</p>
              </div>
            ))}
          </div>
          <blockquote style={{ fontFamily: lora, fontStyle: "italic", fontSize: 18, color: T.ink, marginTop: 40, maxWidth: 540, lineHeight: 1.6, borderLeft: `2px solid ${T.primaryL}`, paddingLeft: 20 }}>
            {t('website.digest.blockquote')}
          </blockquote>
          <p style={{ fontFamily: dm, fontSize: 18, fontWeight: 500, color: T.ink, marginTop: 16 }}>{t('website.digest.chiefOfStaff')}</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={sec}>
        <div style={max}>
          <Eyebrow>{t('website.howItWorks.eyebrow')}</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32, color: T.ink }}>
            {t('website.howItWorks.headline')}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 32, marginTop: 32 }}>
            {[
              { n: t('website.howItWorks.step1Number'), title: t('website.howItWorks.step1Title'), desc: t('website.howItWorks.step1Desc') },
              { n: t('website.howItWorks.step2Number'), title: t('website.howItWorks.step2Title'), desc: t('website.howItWorks.step2Desc') },
              { n: t('website.howItWorks.step3Number'), title: t('website.howItWorks.step3Title'), desc: t('website.howItWorks.step3Desc') },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: lora, fontSize: 44, fontWeight: 400, color: T.outline, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.n}</div>
                <div style={{ height: "0.5px", background: T.outline, margin: "4px 0" }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{s.title}</div>
                <p style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ background: T.primaryS, borderRadius: 16, padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap", marginTop: 40 }}>
            <div>
              <div style={{ fontFamily: lora, fontSize: 22, fontWeight: 400, color: T.ink, marginBottom: 6 }}>{t('website.howItWorks.downloadTitle')}</div>
              <div style={{ fontSize: 13, color: T.inkV, fontWeight: 300 }}>{t('website.howItWorks.downloadSub')}</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={{ fontFamily: dm, fontSize: 13, color: T.faint, background: "#fff", border: `1px solid rgba(150,71,53,0.15)`, padding: "9px 16px", borderRadius: "9999px", cursor: "default", opacity: 0.6 }}>{t('website.howItWorks.appStore')}</button>
              <button style={{ fontFamily: dm, fontSize: 13, color: T.faint, background: "#fff", border: `1px solid rgba(150,71,53,0.15)`, padding: "9px 16px", borderRadius: "9999px", cursor: "default", opacity: 0.6 }}>{t('website.howItWorks.googlePlay')}</button>
              <button onClick={() => navigate("/onboarding")} style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: "#fff", background: T.primary, border: "none", padding: "9px 18px", borderRadius: "9999px", cursor: "pointer" }}>{t('website.howItWorks.getStartedWeb')}</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={sec} id="pricing">
        <div style={max}>
          <Eyebrow>{t('website.pricing.eyebrow')}</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32, color: T.ink }}>
            {t('website.pricing.headline')}
          </h2>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            {/* Family */}
            <div style={{ background: T.primaryS, border: `0.5px solid ${T.primary}`, borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 16, maxWidth: 480, width: "100%" }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "#fff", background: T.primary, padding: "4px 12px", borderRadius: "9999px", width: "fit-content" }}>{t('website.pricing.badge')}</div>
              <div style={{ fontFamily: lora, fontSize: 22, fontWeight: 400, color: T.ink }}>{t('website.pricing.planName')}</div>
              <div style={{ fontFamily: lora, fontSize: 40, fontWeight: 400, color: T.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>{t('website.pricing.price')} <span style={{ fontFamily: dm, fontSize: 15, fontWeight: 300, color: T.inkV, letterSpacing: 0 }}>{t('website.pricing.perMonth')}</span></div>
              <div style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.6 }}>{t('website.pricing.billingNote')}<br />{t('website.pricing.billingNote2')}</div>
              <div style={{ height: "0.5px", background: T.outline }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {([t('website.pricing.feature1'), t('website.pricing.feature2'), t('website.pricing.feature3'), t('website.pricing.feature4'), t('website.pricing.feature5')] as string[]).map(f => (
                  <div key={f} style={{ fontSize: 13, fontWeight: 300, color: T.inkV, display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5 }}>
                    <PfCheck />{f}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "auto", paddingTop: 4 }}>
                <button onClick={() => navigate("/onboarding")} style={{ width: "100%", fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", cursor: "pointer", padding: "11px 22px", borderRadius: "9999px", textAlign: "center" }}>
                  {t('website.pricing.startTrial')}
                </button>
              </div>
              <div style={{ textAlign: "center", fontSize: 12, color: T.faint, marginTop: -8 }}>{t('website.pricing.cancelNote')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <CtaDark
        onStart={() => navigate("/onboarding")}
        eyebrow={t('website.cta.eyebrow')}
        headline={t('website.cta.headline')}
        headlineEm={t('website.cta.headlineEm')}
        sub={t('website.cta.sub')}
        button={t('website.cta.button')}
      />

      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-orbe-wrap { padding-bottom: 85vw !important; max-height: 380px; }
        }
        @media (max-width: 720px) { .digest-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 480px) { .digest-grid { grid-template-columns: 1fr !important; } }
        .intel-grid { grid-template-columns: repeat(2,1fr) !important; }
        @media (max-width: 600px) { .intel-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
