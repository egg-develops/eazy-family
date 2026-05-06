import { Navigate, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { PublicNav } from "@/components/PublicNav";
import {
  Calendar, MapPin, Users, MessageCircle, Lock,
  ChevronRight, CheckCircle, Globe, Apple, Smartphone, Sparkles,
} from "lucide-react";

const ICON_BG = { background: "#6B3FBF" };
const CARD_STYLE = { background: "#FFFFFF", border: "1px solid #F0E4FB" };
const HEADING = { color: "#1A0B2E" };
const MUTED = { color: "#522793" };
const SUBTLE = { color: "#8A5FE0" };

export default function Index() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const features = [
    { icon: Lock,          title: t("website.home.f1t"), desc: t("website.home.f1d") },
    { icon: Sparkles,      title: t("website.home.f5t"), desc: t("website.home.f5d") },
    { icon: Calendar,      title: t("website.home.f2t"), desc: t("website.home.f2d") },
    { icon: MessageCircle, title: t("website.home.f6t"), desc: t("website.home.f6d") },
    { icon: Users,         title: t("website.home.f4t"), desc: t("website.home.f4d") },
    { icon: MapPin,        title: t("website.home.f3t"), desc: t("website.home.f3d") },
  ];

  const steps = [
    { n: "01", title: t("website.home.s1t"), body: t("website.home.s1b") },
    { n: "02", title: t("website.home.s2t"), body: t("website.home.s2b") },
    { n: "03", title: t("website.home.s3t"), body: t("website.home.s3b") },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FBF8FF", color: "#1A0B2E" }}>

      {/* Soft background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #C7AEEF, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #EE7BB0, transparent 70%)" }} />
        <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #C7AEEF, transparent 70%)" }} />
      </div>

      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-5 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1]"
            style={{ color: "#1A0B2E" }}>
            One <em>Eazy</em> place for your family
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed" style={MUTED}>
            {t("website.home.heroSub")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={() => navigate("/onboarding")}
              className="w-full sm:w-auto text-white border-0 px-8 py-6 text-base font-medium rounded-2xl"
              style={{ background: "#6B3FBF" }}>
              {t("website.home.ctaPrimary")}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate("/auth")}
              className="w-full sm:w-auto px-8 py-6 text-base rounded-2xl"
              style={{ color: "#522793" }}>
              {t("website.home.ctaSecondary")}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs" style={HEADING}>
            {[t("website.home.check1"), t("website.home.check2"), t("website.home.check3")].map(text => (
              <span key={text} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-light" style={HEADING}>
              {t("website.home.featuresTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="rounded-2xl p-5 flex gap-4" style={CARD_STYLE}>
                  <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={ICON_BG}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1" style={HEADING}>{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={SUBTLE}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-light" style={HEADING}>
              {t("website.home.howTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map(s => (
              <div key={s.n} className="text-center space-y-3">
                <div className="text-4xl font-serif font-light" style={{ color: "#C7AEEF" }}>{s.n}</div>
                <h3 className="font-medium text-sm" style={HEADING}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={SUBTLE}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section className="py-20 px-5">
        <div className="max-w-2xl mx-auto text-center rounded-3xl p-10"
          style={{ background: "#F8F1FF", border: "1px solid #F0E4FB" }}>
          <h2 className="font-serif text-2xl sm:text-3xl font-light mb-3" style={HEADING}>
            {t("website.home.downloadTitle")}
          </h2>
          <p className="text-sm mb-8" style={MUTED}>
            {t("website.home.downloadSub")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="flex items-center gap-2.5 px-5 py-3 rounded-xl opacity-40 text-sm font-medium border cursor-not-allowed"
              style={{ background: "#F0E4FB", borderColor: "#C7AEEF", color: "#522793" }}>
              <Apple className="w-4 h-4" />{t("website.home.appStore")}
            </span>
            <span className="flex items-center gap-2.5 px-5 py-3 rounded-xl opacity-40 text-sm font-medium border cursor-not-allowed"
              style={{ background: "#F0E4FB", borderColor: "#C7AEEF", color: "#522793" }}>
              <Smartphone className="w-4 h-4" />{t("website.home.googlePlay")}
            </span>
            <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-5 py-3 text-sm font-medium rounded-xl"
              style={{ background: "#6B3FBF" }}>
              <Globe className="w-4 h-4 mr-2" />{t("website.home.useWebApp")}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto py-10 px-5 border-t" style={{ borderColor: "#F0E4FB" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Eazy.Family" className="w-7 h-7" />
            <span className="font-medium text-sm" style={{ color: "#1A0B2E" }}>Eazy.Family</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={SUBTLE}>
            <Link to="/about" className="hover:opacity-80">{t("website.nav.about")}</Link>
            <Link to="/events" className="hover:opacity-80">{t("website.nav.events")}</Link>
            <Link to="/resources" className="hover:opacity-80">{t("website.nav.resources")}</Link>
            <Link to="/download" className="hover:opacity-80">{t("website.nav.getApp")}</Link>
            <Link to="/privacy" className="hover:opacity-80">Privacy Policy</Link>
            <Link to="/terms" className="hover:opacity-80">Terms of Service</Link>
            <a href="https://x.com/eazy_family" target="_blank" rel="noopener noreferrer" className="hover:opacity-80" aria-label="Eazy.Family on X">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </nav>
          <p className="text-xs" style={{ color: "#C7AEEF" }}>© {new Date().getFullYear()} Eazy.Family</p>
        </div>
      </footer>
    </div>
  );
}
