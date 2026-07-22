import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Apple, Smartphone, CheckCircle, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { track } from "@/lib/analytics";
import { PublicNav } from "@/components/PublicNav";

const HEADING = { color: "#1C1C18" };
const MUTED   = { color: "#964735" };
const SUBTLE  = { color: "#7A6660" };
const CARD    = { background: "#FFFFFF", border: "1px solid #EBE8E2" };

export default function Download() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const webFeatures = [
    t("website.download.wf1"),
    t("website.download.wf2"),
    t("website.download.wf3"),
    t("website.download.wf4"),
    t("website.download.wf5"),
    t("website.download.wf6"),
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FDF9F3", color: "#1C1C18" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #DAC1BB, transparent 70%)" }} />
      </div>

      <PublicNav />

      <main className="flex-1 max-w-3xl mx-auto px-5 pt-32 pb-16 space-y-14">

        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="font-serif text-3xl sm:text-4xl font-light" style={HEADING}>
            {t("website.download.heroHeadline")}
          </h1>
          <p className="text-base" style={MUTED}>
            {t("website.download.heroSub")}
          </p>
        </section>

        {/* App store buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* iOS — live on the App Store */}
          <a href="https://apps.apple.com/app/id6765778216" target="_blank" rel="noopener noreferrer"
            onClick={() => track('app_store_click', { location: 'download_page' })}
            className="rounded-2xl p-6 text-center space-y-4 block transition-transform hover:-translate-y-0.5" style={CARD}>
            <Apple className="w-10 h-10 mx-auto" style={{ color: "#964735" }} />
            <div>
              <p className="font-medium text-sm" style={HEADING}>{t("website.download.iosLabel")}</p>
              <p className="text-xs mt-1" style={SUBTLE}>{t("website.download.iosSub")}</p>
            </div>
            <div className="px-4 py-2 rounded-xl text-xs font-medium text-white"
              style={{ background: "#964735" }}>
              App Store
            </div>
          </a>

          {/* Android */}
          <div className="rounded-2xl p-6 text-center space-y-4 opacity-50" style={CARD}>
            <Smartphone className="w-10 h-10 mx-auto" style={{ color: "#DAC1BB" }} />
            <div>
              <p className="font-medium text-sm" style={HEADING}>{t("website.download.androidLabel")}</p>
              <p className="text-xs mt-1" style={SUBTLE}>{t("website.download.androidSub")}</p>
            </div>
            <div className="px-4 py-2 rounded-xl text-xs font-medium border"
              style={{ borderColor: "#EBE8E2", color: "#7A6660" }}>
              Google Play
            </div>
          </div>

          {/* Web — active */}
          <div className="rounded-2xl p-6 text-center space-y-4"
            style={{ background: "#EBE8E2", border: "1px solid #DAC1BB" }}>
            <Globe className="w-10 h-10 mx-auto" style={{ color: "#964735" }} />
            <div>
              <p className="font-medium text-sm" style={HEADING}>{t("website.download.webLabel")}</p>
              <p className="text-xs mt-1" style={MUTED}>{t("website.download.webSub")}</p>
            </div>
            <Button onClick={() => navigate("/onboarding")} className="w-full text-white border-0 text-xs py-2 rounded-xl"
              style={{ background: "#964735" }}>
              {t("website.download.webCta")}
            </Button>
          </div>
        </section>

        {/* Web features */}
        <section className="rounded-2xl p-6 space-y-4" style={CARD}>
          <h2 className="font-medium text-base" style={HEADING}>
            {t("website.download.featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {webFeatures.map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm" style={MUTED}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#964735" }} />
                {f}
              </div>
            ))}
          </div>
        </section>

        {/* Notify me */}
        <section className="text-center rounded-3xl p-10 space-y-4"
          style={{ background: "#F7F3ED", border: "1px solid #EBE8E2" }}>
          <Bell className="w-8 h-8 mx-auto" style={{ color: "#DAC1BB" }} />
          <h2 className="font-serif text-lg font-light" style={HEADING}>
            {t("website.download.notifyTitle")}
          </h2>
          <p className="text-sm" style={MUTED}>
            {t("website.download.notifySub")}
          </p>
          <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-sm rounded-2xl"
            style={{ background: "#964735" }}>
            {t("website.download.notifyCta")}
          </Button>
        </section>
      </main>

      <footer className="py-10 px-5 border-t" style={{ borderColor: "#EBE8E2" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Eazy.Family" className="w-7 h-7" />
            <span className="font-medium text-sm" style={HEADING}>Eazy.Family</span>
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
          <p className="text-xs" style={{ color: "#DAC1BB" }}>© {new Date().getFullYear()} Eazy.Family</p>
        </div>
      </footer>
    </div>
  );
}
