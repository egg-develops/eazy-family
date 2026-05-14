import { useNavigate } from "react-router-dom";
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
  const sec: React.CSSProperties = { padding: "72px 40px", borderBottom: `0.5px solid ${T.outline}` };
  const max: React.CSSProperties = { maxWidth: 860, margin: "0 auto" };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: dm, fontSize: 16, lineHeight: 1.6 }}>
      <PublicNav />

      {/* ── Our Story ── */}
      <section style={sec}>
        <div style={max}>
          <Eyebrow>Our story</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }} className="about-2col">
            <h1 style={{ fontFamily: lora, fontSize: "clamp(30px,5vw,44px)", fontWeight: 400, lineHeight: 1.12, letterSpacing: "-0.025em", color: T.ink, margin: 0 }}>
              Built for the <em style={{ fontStyle: "italic", color: T.primary }}>beautiful</em> chaos of family life.
            </h1>
            <div>
              <p style={{ fontSize: 16, fontWeight: 300, color: T.inkV, lineHeight: 1.75, marginBottom: 0 }}>
                Family life is full of moving parts — schedules that shift, shopping lists that multiply, and conversations split across too many channels.
              </p>
              <blockquote style={{ margin: "24px 0", padding: "16px 0 16px 20px", borderLeft: `2px solid ${T.primaryL}`, fontFamily: lora, fontStyle: "italic", fontSize: 18, color: T.ink, lineHeight: 1.5 }}>
                "Time flies! The days might be long, but the years are short. We built Eazy.Family so you spend less time managing — and more time together."
              </blockquote>
              <p style={{ fontSize: 16, fontWeight: 300, color: T.inkV, lineHeight: 1.75, margin: 0 }}>
                One private, calm space for all of it. No ads, no noise, no strangers. Just your family.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section style={sec}>
        <div style={max}>
          <Eyebrow>What we believe</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32, color: T.ink }}>
            Three values. No compromise.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginTop: 32 }}>
            {[
              { bar: T.primary, title: "Families first", desc: "Every product decision starts with one question: does this make family life meaningfully better?" },
              { bar: T.secondary, title: "Privacy by design", desc: "Your data is encrypted and never sold. We will never run ads. Your family's information is yours alone." },
              { bar: T.tertiary, title: "Built with families", desc: "Real families shape every feature we build. Your feedback is the roadmap." },
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
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 48, alignItems: "start" }} className="story-2col">
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint, position: "sticky", top: 80 }}>
              The longer version
            </div>
            <div style={{ fontSize: 16, fontWeight: 300, color: T.inkV, lineHeight: 1.8 }}>
              <p>We started with a frustration most parents know well: <strong style={{ fontWeight: 500, color: T.ink }}>too many apps, too many channels, too much noise.</strong> The family group chat gets buried. Calendars don't sync. Someone misses the school pickup. The shopping list lives in three different places.</p>
              <p style={{ marginTop: 16 }}>We wanted one place — private, secure, genuinely simple — that brings it all together. And we wanted it to be smart enough to think ahead, so the people using it could think about something else for a change.</p>
              <p style={{ marginTop: 16 }}><strong style={{ fontWeight: 500, color: T.ink }}>Eazy.Family is built around one smart button: the Orbe.</strong> Everything your family needs, one press away, managed by your voice.</p>
              <p style={{ marginTop: 16 }}>Eazy is shaped by the families who use it every day. If that sounds like something you'd want to be part of, join us — you'll help make it better for everyone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div style={{ background: T.ink, padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint }}>Available on Web now · iOS &amp; Android coming soon</div>
        <h2 style={{ fontFamily: lora, fontSize: "clamp(28px,5vw,40px)", fontWeight: 400, color: "#fdf9f3", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 520, margin: 0 }}>
          One button. Your voice. Every calendar. Every list. <em style={{ fontStyle: "italic", color: T.primaryL }}>Your family in sync.</em>
        </h2>
        <p style={{ fontSize: 14, color: T.faint, fontWeight: 300, margin: 0 }}>14-day free trial. Cancel anytime.</p>
        <button
          onClick={() => navigate("/onboarding")}
          style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: T.ink, background: "#fdf9f3", border: "none", padding: "11px 26px", borderRadius: "9999px", cursor: "pointer" }}
        >
          Get started free →
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-2col { grid-template-columns: 1fr !important; gap: 32px !important; }
          .story-2col { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </div>
  );
}
