import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Users, Zap, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicNav } from "@/components/PublicNav";

export default function About() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const values = [
    { icon: Heart,  title: t("website.about.v1t"), body: t("website.about.v1b") },
    { icon: Shield, title: t("website.about.v2t"), body: t("website.about.v2b") },
    { icon: Users,  title: t("website.about.v3t"), body: t("website.about.v3b") },
    { icon: Zap,    title: t("website.about.v4t"), body: t("website.about.v4b") },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
      </div>

      <PublicNav />

      <main className="flex-1 max-w-4xl mx-auto px-5 pt-32 pb-16 space-y-20">

        {/* Mission */}
        <section className="text-center max-w-2xl mx-auto space-y-5">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "hsl(270 40% 98%)" }}>
            {t("website.about.heroHeadline")}
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "hsl(270 30% 68%)" }}>
            {t("website.about.heroSub")}
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-xl font-bold mb-8 text-center" style={{ color: "hsl(270 40% 96%)" }}>
            {t("website.about.valuesTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {values.map(v => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="rounded-2xl p-5 flex gap-4"
                  style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
                  <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1" style={{ color: "hsl(270 40% 96%)" }}>{v.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "hsl(270 30% 65%)" }}>{v.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Story */}
        <section className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
            {t("website.about.storyTitle")}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(270 30% 68%)" }}>
            {t("website.about.storyP1")}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(270 30% 68%)" }}>
            {t("website.about.storyP2")}
          </p>
        </section>

        {/* CTA */}
        <section className="text-center rounded-3xl p-10"
          style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 22%)" }}>
          <h2 className="text-xl font-bold mb-3" style={{ color: "hsl(270 40% 98%)" }}>
            {t("website.about.ctaTitle")}
          </h2>
          <p className="text-sm mb-6" style={{ color: "hsl(270 30% 65%)" }}>
            {t("website.about.ctaSub")}
          </p>
          <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-base rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            {t("website.about.ctaButton")} <ArrowRight className="w-4 h-4 ml-2" />
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
            <Link to="/" className="hover:opacity-80">{t("website.nav.about")}</Link>
            <Link to="/events" className="hover:opacity-80">{t("website.nav.events")}</Link>
            <Link to="/download" className="hover:opacity-80">{t("website.nav.getApp")}</Link>
            <Link to="/privacy" className="hover:opacity-80">Privacy Policy</Link>
            <Link to="/terms" className="hover:opacity-80">Terms of Service</Link>
            <a href="https://x.com/eazy_family" target="_blank" rel="noopener noreferrer" className="hover:opacity-80" aria-label="Eazy.Family on X">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </nav>
          <p className="text-xs" style={{ color: "hsl(270 30% 45%)" }}>© {new Date().getFullYear()} Eazy.Family</p>
        </div>
      </footer>
    </div>
  );
}
