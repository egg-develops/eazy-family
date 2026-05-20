import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { PublicNav } from "@/components/PublicNav";

const T = {
  bg: "#fdf9f3", warm: "#ffffff", sLow: "#f7f3ed",
  ink: "#1c1c18", inkV: "#55433f", faint: "#87726e", outline: "#dac1bb",
  primary: "#964735", primaryL: "#d97b66",
  secondary: "#44664f", tertiary: "#406373",
};
const lora = "'Lora', serif";
const dm = "'DM Sans', sans-serif";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.primary, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.primary, flexShrink: 0, display: "inline-block" }} />
    {children}
  </div>
);

export default function About() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sec: React.CSSProperties = { padding: "72px 40px", borderBottom: `0.5px solid ${T.outline}` };
  const max: React.CSSProperties = { maxWidth: 860, margin: "0 auto" };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: dm, fontSize: 16, lineHeight: 1.6 }}>
      <PublicNav />

      {/* ── Our Story ── */}
      <section style={sec}>
        <div style={max}>
          <Eyebrow>{t('website.about.storyEyebrow')}</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }} className="about-2col">
            <h1 style={{ fontFamily: lora, fontSize: "clamp(30px,5vw,44px)", fontWeight: 400, lineHeight: 1.12, letterSpacing: "-0.025em", color: T.ink, margin: 0 }}>
              {t('website.about.storyHeadline')} <em style={{ fontStyle: "italic", color: T.primary }}>{t('website.about.storyHeadlineEm')}</em> {t('website.about.storyHeadlineSub')}
            </h1>
            <div>
              <p style={{ fontSize: 16, fontWeight: 300, color: T.inkV, lineHeight: 1.75, marginBottom: 0 }}>
                {t('website.about.storyP1')}
              </p>
              <blockquote style={{ margin: "24px 0", padding: "16px 0 16px 20px", borderLeft: `2px solid ${T.primaryL}`, fontFamily: lora, fontStyle: "italic", fontSize: 18, color: T.ink, lineHeight: 1.5 }}>
                {t('website.about.storyQuote')}
              </blockquote>
              <p style={{ fontSize: 16, fontWeight: 300, color: T.inkV, lineHeight: 1.75, margin: 0 }}>
                {t('website.about.storyP2')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section style={sec}>
        <div style={max}>
          <Eyebrow>{t('website.about.valuesEyebrow')}</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32, color: T.ink }}>
            {t('website.about.valuesHeadline')}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginTop: 32 }}>
            {[
              { bar: T.primary, title: t('website.about.value1Title'), desc: t('website.about.value1Desc') },
              { bar: T.secondary, title: t('website.about.value2Title'), desc: t('website.about.value2Desc') },
              { bar: T.tertiary, title: t('website.about.value3Title'), desc: t('website.about.value3Desc') },
            ].map(v => (
              <div key={v.title} style={{ background: T.warm, border: `0.5px solid ${T.outline}`, borderRadius: 16, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ width: 28, height: 3, borderRadius: 9999, background: v.bar }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{v.title}</div>
                <p style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.65, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story ── */}
      <section style={sec}>
        <div style={max}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint, marginBottom: 32 }}>
            {t('website.about.longerVersionLabel')}
          </div>
          <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 16, fontWeight: 400, color: "#1c1c18", lineHeight: 1.8, margin: 0 }}>
              {t('website.about.longP1')} <strong style={{ fontWeight: 700 }}>{t('website.about.longP1Strong')}</strong> {t('website.about.longP1Rest')}
            </p>
            <p style={{ fontSize: 16, fontWeight: 400, color: "#1c1c18", lineHeight: 1.8, margin: 0 }}>
              {t('website.about.longP2')}
            </p>
            <p style={{ fontSize: 16, fontWeight: 400, color: "#1c1c18", lineHeight: 1.8, margin: 0 }}>
              <strong style={{ fontWeight: 700 }}>{t('website.about.longP3Strong')}</strong> {t('website.about.longP3Rest')}
            </p>
            <p style={{ fontSize: 16, fontWeight: 400, color: "#1c1c18", lineHeight: 1.8, margin: 0 }}>
              {t('website.about.longP4')}
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div style={{ background: T.ink, padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#dac1bb" }}>{t('website.about.ctaEyebrow')}</div>
        <h2 style={{ fontFamily: lora, fontSize: "clamp(28px,5vw,40px)", fontWeight: 400, color: "#fdf9f3", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 520, margin: 0 }}>
          {t('website.about.ctaHeadline')} <em style={{ fontStyle: "italic", color: T.primaryL }}>{t('website.about.ctaHeadlineEm')}</em>
        </h2>
        <p style={{ fontSize: 14, color: "#c8b4af", fontWeight: 400, margin: 0 }}>{t('website.about.ctaSub')}</p>
        <button
          onClick={() => navigate("/onboarding")}
          style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: T.ink, background: "#fdf9f3", border: "none", padding: "11px 26px", borderRadius: "9999px", cursor: "pointer" }}
        >
          {t('website.about.ctaButton')}
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-2col { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </div>
  );
}
