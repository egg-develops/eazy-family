import { Navigate, useNavigate } from "react-router-dom";
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

// Orbe sizes
const OrbeLg = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", margin: "48px 0 12px" }}>
    <div className="orbe-pulse" style={{
      width: 96, height: 96, borderRadius: "50%", background: T.primary,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
      </div>
    </div>
    <span style={{ fontFamily: lora, fontStyle: "italic", fontSize: 13, color: T.faint }}>The Orbe</span>
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

const CtaDark = ({ onStart }: { onStart: () => void }) => (
  <div style={{ background: T.ink, padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint }}>Available on Web now · iOS &amp; Android coming soon</div>
    <h2 style={{ fontFamily: lora, fontSize: "clamp(28px,5vw,40px)", fontWeight: 400, color: "#fdf9f3", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 520, margin: 0 }}>
      One button. Your voice. Every calendar. Every list. <em style={{ fontStyle: "italic", color: T.primaryL }}>Your family in sync.</em>
    </h2>
    <p style={{ fontSize: 14, color: T.faint, fontWeight: 300, margin: 0 }}>14-day free trial. Cancel anytime.</p>
    <button
      onClick={onStart}
      style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: T.ink, background: "#fdf9f3", border: "none", padding: "11px 26px", borderRadius: "9999px", cursor: "pointer" }}
    >
      Get started free →
    </button>
  </div>
);

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const sec: React.CSSProperties = { padding: "72px 40px", borderBottom: `0.5px solid ${T.outline}` };
  const max: React.CSSProperties = { maxWidth: 860, margin: "0 auto" };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: dm, fontSize: 16, lineHeight: 1.6 }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section style={{ ...sec, paddingBottom: 56 }}>
        <div style={max}>
          <Eyebrow>Available on Web · iOS &amp; Android coming soon</Eyebrow>
          <h1 style={{ fontFamily: lora, fontSize: "clamp(34px,5vw,52px)", fontWeight: 400, lineHeight: 1.12, letterSpacing: "-0.025em", maxWidth: 680, marginBottom: 20, color: T.ink }}>
            Imagine every family calendar, every task, every list — all running on your voice.
          </h1>
          <p style={{ fontSize: 18, fontWeight: 300, color: T.inkV, maxWidth: 520, lineHeight: 1.65, marginBottom: 32 }}>
            Eazy.Family brings it all together in one elegant — and surprisingly intelligent — button.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
            <button
              onClick={() => document.getElementById("orbe-section")?.scrollIntoView({ behavior: "smooth" })}
              style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", cursor: "pointer", padding: "11px 22px", borderRadius: "9999px", letterSpacing: "0.01em", transition: "all 0.15s" }}
            >
              Meet the Orbe →
            </button>
            <button
              onClick={() => navigate("/onboarding")}
              style={{ fontFamily: dm, fontSize: 14, fontWeight: 400, color: T.primary, background: "none", border: `1px solid ${T.outline}`, cursor: "pointer", padding: "10px 22px", borderRadius: "9999px", transition: "all 0.15s" }}
            >
              Download the app
            </button>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {["Secure & Private", "Your data is never sold", "Works across all devices"].map(t => (
              <span key={t} style={{ fontSize: 12, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: T.secondaryS, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CheckSvg />
                </span>
                {t}
              </span>
            ))}
          </div>
          {/* Language availability row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: T.faint }}>Available in</span>
            {[
              { flag: "🇬🇧", label: "English" },
              { flag: "🇩🇪", label: "Deutsch" },
              { flag: "🇫🇷", label: "Français" },
              { flag: "🇮🇹", label: "Italiano" },
            ].map(({ flag, label }) => (
              <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: T.inkV, background: T.sMid, border: `0.5px solid ${T.outline}`, borderRadius: "9999px", padding: "3px 10px" }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{flag}</span>
                {label}
              </span>
            ))}
          </div>
          <OrbeLg />
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section style={sec} id="features">
        <div style={max}>
          <Eyebrow>Sound familiar?</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            Your family group chat is not a plan.<br />And synced calendars won't solve it.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginTop: 32 }}>
            {[
              {
                bar: T.primary,
                q: "\"You shouldn't need 20 minutes to plan your family's week.\"",
                problem: "Your calendar. Their calendar. The school newsletter. The WhatsApp thread. Every week the same ritual — four sources to build a picture of your week, that still isn't clear.",
                solution: "Shows every family member's schedule in one view, prepares you for each, and flags conflicts before they happen.",
              },
              {
                bar: T.secondary,
                q: "\"Every family has two task lists. The one they made. And the one living in everyone's head.\"",
                problem: "You're thinking about the leaking tap. He's thinking about the car service. Nobody's mentioned the birthday present that needs ordering by Thursday.",
                solution: "Gives every task a place — shared or personal, assigned or open — so nothing gets missed.",
              },
              {
                bar: T.tertiary,
                q: "\"It's in your head, his texts, and on three different notes apps.\"",
                problem: "You're at the store. They're standing in front of the fridge. You guessed on the olive oil and come home to see they already bought bananas!",
                solution: "Keeps one shared list, updated by voice, visible to everyone, intelligent enough to suggest what you're probably running out of.",
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
          <Eyebrow>One button. Everything.</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            You're done navigating menus and screens!<br />It's one button from now on.
          </h2>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, maxWidth: 480, lineHeight: 1.65, marginBottom: 40 }}>
            Press the Orbe. Your whole family's day opens up — schedules, tasks, shopping. Add anything by voice. Let Eazy handle the rest.
          </p>
          {/* Feature grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 1, background: T.outline, border: `0.5px solid ${T.outline}`, borderRadius: 16, overflow: "hidden", marginTop: 32 }}>
            {[
              { bg: T.primaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" fill="#964735"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="#964735" opacity=".4"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="#964735" opacity=".4"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="#964735"/></svg>, title: "Calendar", desc: "Every family member. Every platform. Always in sync." },
              { bg: T.secondaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2.5" stroke="#44664f" strokeWidth="1.5" fill="none"/><path d="M6 10L9 13L14 7" stroke="#44664f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Tasks", desc: "Shared, personal, assigned. Everything visible, nothing forgotten." },
              { bg: T.tertiaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h8M4 15h6" stroke="#406373" strokeWidth="1.5" strokeLinecap="round"/></svg>, title: "Shopping", desc: "One list for everyone. Updated by voice. Organised by category, smarter every week." },
              { bg: T.primaryS, ico: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#964735" strokeWidth="1.5" fill="none"/><path d="M10 6v4l3 3" stroke="#964735" strokeWidth="1.5" strokeLinecap="round"/></svg>, title: "Rituals", desc: "Daily habits and family routines, tracked with a simple check-in." },
            ].map(f => (
              <div key={f.title} style={{ background: T.warm, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: f.bg, flexShrink: 0 }}>{f.ico}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{f.title}</div>
                <div style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: lora, fontStyle: "italic", fontSize: 20, color: T.ink, marginTop: 40, lineHeight: 1.45, maxWidth: 520 }}>
            "The Orbe doesn't just organise your family. It thinks ahead."
          </p>
        </div>
      </section>

      {/* ── Intelligence ── */}
      <section style={sec} id="intelligence">
        <div style={max}>
          <Eyebrow>Family Intelligence</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            Most apps wait for you to tell them what to do.<br />Eazy doesn't.
          </h2>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, maxWidth: 480, lineHeight: 1.65, marginBottom: 40 }}>
            Behind every press of the Orbe, Eazy is quietly working — learning your family's patterns, solving problems before they happen, and thinking ahead so you don't have to.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24, marginTop: 32 }} className="intel-grid">
            {[
              { pip: T.primary, title: "Conflict Detection", problem: "Soccer pickup at 3pm. Dentist at 3pm. Different calendars, nobody noticed.", solution: "Eazy catches it before it's too late." },
              { pip: T.tertiary, title: "Shopping Intelligence", problem: "You're running low on olive oil.", solution: "Eazy knows — because it's tracking how often you shop for your essentials. The suggestions are waiting before you open the app." },
              { pip: T.secondary, title: "Task Escalation", problem: "That broken thing has been on the list for two weeks. The birthday present needs ordering by Thursday.", solution: "Eazy notices what's been sitting too long — before it becomes an issue." },
              { pip: T.primaryL, title: "Pattern Recognition", problem: "The more your family uses Eazy, the smarter it gets. Shopping cycles, task habits, schedule rhythms…", solution: "Eazy focuses on how to support your family." },
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
              → Meet the Morning Digest
            </button>
          </p>
        </div>
      </section>

      {/* ── Morning Digest ── */}
      <section style={{ ...sec, background: T.sLow }} id="digest">
        <div style={max}>
          <Eyebrow>Every morning</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12, color: T.ink }}>
            Before your day starts, Eazy already has.
          </h2>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, maxWidth: 480, lineHeight: 1.65, marginBottom: 40 }}>
            One notification. No noise — just a clear picture of your family's day.
          </p>
          <div className="digest-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 32 }}>
            {[
              { label: "Today's Schedule", body: "Every family member. Every commitment. Conflicts flagged, travel time accounted for, nothing missing." },
              { label: "One Thing", body: "The single most important task your family needs to handle today. Not a list. Just the one thing that matters most." },
              { label: "Household Pulse", body: "What's open, what's overdue, what's been sitting too long. Eazy notices and organises it." },
              { label: "Shopping Intelligence", body: "Three items you're probably running low on. Based on your household patterns. Add them with one tap." },
              { label: "The Wins", body: "Your personal morning routine — 5 days straight! The family event is planned. Small things that deserve a moment." },
              { label: "Coming Up", body: "The birthday is in 6 days. The car service you keep moving. What's worth preparing for before it sneaks up." },
            ].map(d => (
              <div key={d.label} style={{ background: T.warm, border: `0.5px solid ${T.outline}`, borderRadius: 16, padding: "28px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: T.primary, marginBottom: 8 }}>{d.label}</div>
                <p style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.65, margin: 0 }}>{d.body}</p>
              </div>
            ))}
          </div>
          <blockquote style={{ fontFamily: lora, fontStyle: "italic", fontSize: 18, color: T.ink, marginTop: 40, maxWidth: 540, lineHeight: 1.6, borderLeft: `2px solid ${T.primaryL}`, paddingLeft: 20 }}>
            "The Morning Digest isn't about motivating. It organises. It remembers. It notices the things you might have missed when life moves fast."
          </blockquote>
          <p style={{ fontFamily: dm, fontSize: 18, fontWeight: 500, color: T.ink, marginTop: 16 }}>That's a family chief of staff.</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={sec}>
        <div style={max}>
          <Eyebrow>Get started</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32, color: T.ink }}>
            You're set up in under two minutes.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 32, marginTop: 32 }}>
            {[
              { n: "01", title: "Create your space", desc: "Sign up, name your family, invite your partners and members. Everyone gets their own login. Apple or Android, everyone syncs instantly." },
              { n: "02", title: "Connect your calendars", desc: "Google, Outlook, Apple — connect whatever each person uses. Eazy pulls every calendar into one shared family view. No switching. No double entry." },
              { n: "03", title: "Press the Orbe", desc: "Add anything by voice or text — events, tasks, shopping items. Eazy routes it to the right place. Your family sees it instantly." },
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
              <div style={{ fontFamily: lora, fontSize: 22, fontWeight: 400, color: T.ink, marginBottom: 6 }}>Download Eazy.</div>
              <div style={{ fontSize: 13, color: T.inkV, fontWeight: 300 }}>Available on Web · iOS &amp; Android coming soon · English, German, French, Italian</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={{ fontFamily: dm, fontSize: 13, color: T.faint, background: "#fff", border: `1px solid rgba(150,71,53,0.15)`, padding: "9px 16px", borderRadius: "9999px", cursor: "default", opacity: 0.6 }}>App Store — coming soon</button>
              <button style={{ fontFamily: dm, fontSize: 13, color: T.faint, background: "#fff", border: `1px solid rgba(150,71,53,0.15)`, padding: "9px 16px", borderRadius: "9999px", cursor: "default", opacity: 0.6 }}>Google Play — coming soon</button>
              <button onClick={() => navigate("/onboarding")} style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: "#fff", background: T.primary, border: "none", padding: "9px 18px", borderRadius: "9999px", cursor: "pointer" }}>Get started on Web →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={sec} id="pricing">
        <div style={max}>
          <Eyebrow>Pricing</Eyebrow>
          <h2 style={{ fontFamily: lora, fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32, color: T.ink }}>
            One plan. Try it free for 14 days.
          </h2>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            {/* Family */}
            <div style={{ background: T.primaryS, border: `0.5px solid ${T.primary}`, borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 16, maxWidth: 480, width: "100%" }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "#fff", background: T.primary, padding: "4px 12px", borderRadius: "9999px", width: "fit-content" }}>14-Day Free Trial</div>
              <div style={{ fontFamily: lora, fontSize: 22, fontWeight: 400, color: T.ink }}>Family</div>
              <div style={{ fontFamily: lora, fontSize: 40, fontWeight: 400, color: T.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>$3.75 <span style={{ fontFamily: dm, fontSize: 15, fontWeight: 300, color: T.inkV, letterSpacing: 0 }}>/ month</span></div>
              <div style={{ fontSize: 13, fontWeight: 300, color: T.inkV, lineHeight: 1.6 }}>Billed annually at $44.99. Or $4.99 month-to-month.<br />Cancel anytime. Card required, not charged for 14 days.</div>
              <div style={{ height: "0.5px", background: T.outline }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Unlimited calendars, lists & family members", "Full intelligence layer — conflict detection, shopping frequency, task escalation", "Morning Digest — daily & email", "Full voice AI — Orbe & assistant", "One free month for every family you refer"].map(f => (
                  <div key={f} style={{ fontSize: 13, fontWeight: 300, color: T.inkV, display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5 }}>
                    <PfCheck />{f}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "auto", paddingTop: 4 }}>
                <button onClick={() => navigate("/onboarding")} style={{ width: "100%", fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", cursor: "pointer", padding: "11px 22px", borderRadius: "9999px", textAlign: "center" }}>
                  Start your free trial →
                </button>
              </div>
              <div style={{ textAlign: "center", fontSize: 12, color: T.faint, marginTop: -8 }}>Cancel before day 14 and you won't be charged.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <CtaDark onStart={() => navigate("/onboarding")} />

      <style>{`
        @media (max-width: 720px) { .digest-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 480px) { .digest-grid { grid-template-columns: 1fr !important; } }
        .intel-grid { grid-template-columns: repeat(2,1fr) !important; }
        @media (max-width: 600px) { .intel-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
