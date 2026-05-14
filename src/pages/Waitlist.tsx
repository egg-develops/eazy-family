import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { supabase } from "@/integrations/supabase/client";

const T = {
  bg: "#fdf9f3", warm: "#ffffff", outline: "#dac1bb",
  ink: "#1c1c18", inkV: "#55433f", faint: "#87726e",
  primary: "#964735", primaryS: "#ffdad3",
  secondary: "#44664f", secondaryS: "#c6eccf",
};
const lora = "'Lora', serif";
const dm = "'DM Sans', sans-serif";

export default function Waitlist() {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get("ref") ?? undefined;

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (!email || !email.includes("@")) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("waitlist")
        .insert({ email: email.trim(), referred_by: referredBy ?? null })
        .select("referral_code")
        .single();
      setReferralCode(data?.referral_code ?? "");
    } catch {
      // Still show confirmation even if insert fails (e.g. duplicate)
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  const referralLink = `https://eazy.family/waitlist?ref=${referralCode}`;

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: dm, minHeight: "100vh" }}>
      <PublicNav />

      {!submitted ? (
        <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center", padding: "80px 40px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.primary, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.primary, display: "inline-block" }} />
            Coming soon to iOS &amp; Android
          </div>
          <h1 style={{ fontFamily: lora, fontSize: "clamp(28px,5vw,40px)", fontWeight: 400, lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 20, color: T.ink }}>
            The family group chat is not a plan. And <em style={{ fontStyle: "italic", color: T.primary }}>synced calendars</em> won't solve it.
          </h1>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, lineHeight: 1.65, marginBottom: 36 }}>
            Eazy.Family is a voice-first family hub built around one button — the Orbe. Every calendar synced. Every task shared. Every list updated by voice. And every morning, a digest that thinks ahead so you don't have to.
          </p>
          <div style={{ display: "flex", gap: 8, maxWidth: 440, margin: "0 auto 10px" }}>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && join()}
              style={{ flex: 1, fontFamily: dm, fontSize: 15, padding: "13px 20px", border: `1px solid ${T.outline}`, borderRadius: "9999px", background: T.warm, color: T.ink, outline: "none" }}
            />
            <button
              onClick={join}
              disabled={loading}
              style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", cursor: "pointer", padding: "11px 20px", borderRadius: "9999px", whiteSpace: "nowrap", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Joining…" : "Join the waitlist →"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: T.faint }}>No spam. One email when we launch.</p>
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14, borderTop: `0.5px solid ${T.outline}`, paddingTop: 40 }}>
            {[
              "\u201cYour Sunday evening planning ritual ends here.\u201d",
              "\u201cThe invisible task list \u2014 finally visible.\u201d",
              "\u201cOne shared shopping list. Updated by voice. Smarter every week.\u201d",
            ].map(t => (
              <p key={t} style={{ fontFamily: lora, fontStyle: "italic", fontSize: 16, color: T.inkV, margin: 0 }}>{t}</p>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "64px 40px", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.secondaryS, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="24" height="20" viewBox="0 0 24 20" fill="none"><path d="M2 10L9 17L22 2" stroke={T.secondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{ fontFamily: lora, fontSize: 32, fontWeight: 400, color: T.ink, marginBottom: 14 }}>You're on the list.</h2>
          <p style={{ fontSize: 15, fontWeight: 300, color: T.inkV, lineHeight: 1.65, marginBottom: 24 }}>
            We'll send one email the moment Eazy launches on iOS and Android. No noise before that.
          </p>
          {referralCode && (
            <>
              <p style={{ fontSize: 16, color: T.ink, marginBottom: 14, lineHeight: 1.5 }}>
                Know another family who'd love this?<br />Share your link and get a free month when they subscribe.
              </p>
              <div style={{ background: T.primaryS, border: `1px solid rgba(150,71,53,0.2)`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: T.primary, wordBreak: "break-all" }}>
                {referralLink}
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(referralLink)}
                style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", padding: "11px 22px", borderRadius: "9999px", cursor: "pointer" }}
              >
                Copy your link →
              </button>
            </>
          )}
          {!referralCode && (
            <button
              onClick={() => {}}
              style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", padding: "11px 22px", borderRadius: "9999px", cursor: "pointer" }}
            >
              Share your link →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
