import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            {t('website.waitlist.eyebrow')}
          </div>
          <h1 style={{ fontFamily: lora, fontSize: "clamp(28px,5vw,40px)", fontWeight: 400, lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 20, color: T.ink }}>
            {t('website.waitlist.headline')} <em style={{ fontStyle: "italic", color: T.primary }}>{t('website.waitlist.headlineEm')}</em> {t('website.waitlist.headlineSub')}
          </h1>
          <p style={{ fontSize: 17, fontWeight: 300, color: T.inkV, lineHeight: 1.65, marginBottom: 36 }}>
            {t('website.waitlist.sub')}
          </p>
          <div style={{ display: "flex", gap: 8, maxWidth: 440, margin: "0 auto 10px" }}>
            <input
              type="email"
              placeholder={t('website.waitlist.emailPlaceholder')}
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
              {loading ? t('website.waitlist.joiningBtn') : t('website.waitlist.joinBtn')}
            </button>
          </div>
          <p style={{ fontSize: 12, color: T.faint }}>{t('website.waitlist.noSpam')}</p>
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14, borderTop: `0.5px solid ${T.outline}`, paddingTop: 40 }}>
            {([t('website.waitlist.quote1'), t('website.waitlist.quote2'), t('website.waitlist.quote3')] as string[]).map(item => (
              <p key={item} style={{ fontFamily: lora, fontStyle: "italic", fontSize: 16, color: T.inkV, margin: 0 }}>{item}</p>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "64px 40px", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.secondaryS, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="24" height="20" viewBox="0 0 24 20" fill="none"><path d="M2 10L9 17L22 2" stroke={T.secondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{ fontFamily: lora, fontSize: 32, fontWeight: 400, color: T.ink, marginBottom: 14 }}>{t('website.waitlist.successHeadline')}</h2>
          <p style={{ fontSize: 15, fontWeight: 300, color: T.inkV, lineHeight: 1.65, marginBottom: 24 }}>
            {t('website.waitlist.successSub')}
          </p>
          {referralCode && (
            <>
              <p style={{ fontSize: 16, color: T.ink, marginBottom: 14, lineHeight: 1.5 }}>
                {t('website.waitlist.referralPrompt')}<br />{t('website.waitlist.referralPrompt2')}
              </p>
              <div style={{ background: T.primaryS, border: `1px solid rgba(150,71,53,0.2)`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: T.primary, wordBreak: "break-all" }}>
                {referralLink}
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(referralLink)}
                style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", padding: "11px 22px", borderRadius: "9999px", cursor: "pointer" }}
              >
                {t('website.waitlist.copyLink')}
              </button>
            </>
          )}
          {!referralCode && (
            <button
              onClick={() => {}}
              style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: "#fff", background: T.primary, border: "none", padding: "11px 22px", borderRadius: "9999px", cursor: "pointer" }}
            >
              {t('website.waitlist.shareLink')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
