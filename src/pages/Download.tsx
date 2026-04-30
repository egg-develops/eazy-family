import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Apple, Smartphone, CheckCircle, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicNav } from "@/components/PublicNav";

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
      </div>

      <PublicNav />

      <main className="flex-1 max-w-3xl mx-auto px-5 pt-32 pb-16 space-y-14">

        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "hsl(270 40% 98%)" }}>
            {t("website.download.heroHeadline")}
          </h1>
          <p className="text-base" style={{ color: "hsl(270 30% 68%)" }}>
            {t("website.download.heroSub")}
          </p>
        </section>

        {/* App store buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* iOS */}
          <div className="rounded-2xl p-6 text-center space-y-4 opacity-50"
            style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
            <Apple className="w-10 h-10 mx-auto" style={{ color: "hsl(270 40% 80%)" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "hsl(270 40% 90%)" }}>{t("website.download.iosLabel")}</p>
              <p className="text-xs mt-1" style={{ color: "hsl(270 30% 60%)" }}>{t("website.download.iosSub")}</p>
            </div>
            <div className="px-4 py-2 rounded-xl text-xs font-medium border"
              style={{ borderColor: "hsl(270 40% 28%)", color: "hsl(270 40% 60%)" }}>
              App Store
            </div>
          </div>

          {/* Android */}
          <div className="rounded-2xl p-6 text-center space-y-4 opacity-50"
            style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
            <Smartphone className="w-10 h-10 mx-auto" style={{ color: "hsl(270 40% 80%)" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "hsl(270 40% 90%)" }}>{t("website.download.androidLabel")}</p>
              <p className="text-xs mt-1" style={{ color: "hsl(270 30% 60%)" }}>{t("website.download.androidSub")}</p>
            </div>
            <div className="px-4 py-2 rounded-xl text-xs font-medium border"
              style={{ borderColor: "hsl(270 40% 28%)", color: "hsl(270 40% 60%)" }}>
              Google Play
            </div>
          </div>

          {/* Web */}
          <div className="rounded-2xl p-6 text-center space-y-4"
            style={{ background: "hsl(270 50% 12% / 0.9)", border: "1px solid hsl(270 60% 35%)" }}>
            <Globe className="w-10 h-10 mx-auto" style={{ color: "hsl(270 70% 72%)" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "hsl(270 40% 96%)" }}>{t("website.download.webLabel")}</p>
              <p className="text-xs mt-1" style={{ color: "hsl(270 60% 72%)" }}>{t("website.download.webSub")}</p>
            </div>
            <Button onClick={() => navigate("/onboarding")} className="w-full text-white border-0 text-xs py-2"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              {t("website.download.webCta")}
            </Button>
          </div>
        </section>

        {/* Web features */}
        <section className="rounded-2xl p-6 space-y-4"
          style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
          <h2 className="font-bold text-base" style={{ color: "hsl(270 40% 96%)" }}>
            {t("website.download.featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {webFeatures.map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "hsl(270 30% 75%)" }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(270 60% 72%)" }} />
                {f}
              </div>
            ))}
          </div>
        </section>

        {/* Notify me */}
        <section className="text-center rounded-3xl p-10 space-y-4"
          style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 22%)" }}>
          <Bell className="w-8 h-8 mx-auto opacity-60" style={{ color: "hsl(270 60% 72%)" }} />
          <h2 className="font-bold text-lg" style={{ color: "hsl(270 40% 98%)" }}>
            {t("website.download.notifyTitle")}
          </h2>
          <p className="text-sm" style={{ color: "hsl(270 30% 65%)" }}>
            {t("website.download.notifySub")}
          </p>
          <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-sm rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            {t("website.download.notifyCta")}
          </Button>
        </section>
      </main>

      <footer className="py-10 px-5 border-t" style={{ borderColor: "hsl(270 40% 16%)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Eazy.Family" className="w-7 h-7" />
            <span className="font-semibold text-sm" style={{ color: "hsl(270 40% 80%)" }}>Eazy.Family</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "hsl(270 30% 58%)" }}>
            <Link to="/about" className="hover:opacity-80">{t("website.nav.about")}</Link>
            <Link to="/events" className="hover:opacity-80">{t("website.nav.events")}</Link>
            <Link to="/download" className="hover:opacity-80">{t("website.nav.getApp")}</Link>
            <Link to="/privacy" className="hover:opacity-80">Privacy Policy</Link>
            <Link to="/terms" className="hover:opacity-80">Terms of Service</Link>
          </nav>
          <p className="text-xs" style={{ color: "hsl(270 30% 45%)" }}>© {new Date().getFullYear()} Eazy.Family</p>
        </div>
      </footer>
    </div>
  );
}
