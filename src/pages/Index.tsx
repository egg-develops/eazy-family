import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { PublicNav } from "@/components/PublicNav";
import {
  Calendar, MapPin, Users, ShoppingCart, MessageCircle, Lock,
  ChevronRight, CheckCircle, Globe, Apple, Smartphone, Sparkles,
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user) navigate("/app");
  }, [user, loading, navigate]);

  const features = [
    { icon: Lock,          title: t("website.home.f1t"), desc: t("website.home.f1d") },
    { icon: Calendar,      title: t("website.home.f2t"), desc: t("website.home.f2d") },
    { icon: MapPin,        title: t("website.home.f3t"), desc: t("website.home.f3d") },
    { icon: Users,         title: t("website.home.f4t"), desc: t("website.home.f4d") },
    { icon: ShoppingCart,  title: t("website.home.f5t"), desc: t("website.home.f5d") },
    { icon: MessageCircle, title: t("website.home.f6t"), desc: t("website.home.f6d") },
  ];

  const steps = [
    { n: "01", title: t("website.home.s1t"), body: t("website.home.s1b") },
    { n: "02", title: t("website.home.s2t"), body: t("website.home.s2b") },
    { n: "03", title: t("website.home.s3t"), body: t("website.home.s3b") },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
        <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(290 80% 55%), transparent 70%)" }} />
        <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(260 80% 65%), transparent 70%)" }} />
      </div>

      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-5 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{ background: "hsl(270 50% 14% / 0.7)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 60% 82%)" }}>
            <Sparkles className="w-3.5 h-3.5" />
            {t("website.home.badge")}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
            style={{ color: "hsl(270 40% 98%)" }}>
            <span style={{ background: "linear-gradient(135deg, hsl(270 88% 70%), hsl(290 80% 72%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("website.home.heroHeadline")}
            </span>
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "hsl(270 30% 72%)" }}>
            {t("website.home.heroSub")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={() => navigate("/onboarding")}
              className="w-full sm:w-auto text-white border-0 px-8 py-6 text-base font-semibold rounded-2xl shadow-xl"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              {t("website.home.ctaPrimary")}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate("/auth")}
              className="w-full sm:w-auto px-8 py-6 text-base rounded-2xl hover:bg-white/5"
              style={{ color: "hsl(270 40% 75%)" }}>
              {t("website.home.ctaSecondary")}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs" style={{ color: "hsl(270 30% 58%)" }}>
            {[t("website.home.check1"), t("website.home.check2"), t("website.home.check3")].map(text => (
              <span key={text} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "hsl(270 60% 72%)" }} />
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
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
              {t("website.home.featuresTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="rounded-2xl p-5 flex gap-4"
                  style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
                  <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: "hsl(270 40% 96%)" }}>{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "hsl(270 30% 65%)" }}>{f.desc}</p>
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
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
              {t("website.home.howTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map(s => (
              <div key={s.n} className="text-center space-y-3">
                <div className="text-4xl font-bold opacity-20" style={{ color: "hsl(270 88% 70%)" }}>{s.n}</div>
                <h3 className="font-semibold" style={{ color: "hsl(270 40% 96%)" }}>{s.title}</h3>
                <p className="text-sm" style={{ color: "hsl(270 30% 65%)" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section className="py-20 px-5">
        <div className="max-w-2xl mx-auto text-center rounded-3xl p-10"
          style={{ background: "hsl(270 50% 10% / 0.9)", border: "1px solid hsl(270 40% 22%)" }}>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "hsl(270 40% 98%)" }}>
            {t("website.home.downloadTitle")}
          </h2>
          <p className="text-sm mb-8" style={{ color: "hsl(270 30% 65%)" }}>
            {t("website.home.downloadSub")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="flex items-center gap-2.5 px-5 py-3 rounded-xl opacity-40 text-sm font-medium border cursor-not-allowed"
              style={{ background: "hsl(270 50% 14%)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 40% 85%)" }}>
              <Apple className="w-4 h-4" />{t("website.home.appStore")}
            </span>
            <span className="flex items-center gap-2.5 px-5 py-3 rounded-xl opacity-40 text-sm font-medium border cursor-not-allowed"
              style={{ background: "hsl(270 50% 14%)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 40% 85%)" }}>
              <Smartphone className="w-4 h-4" />{t("website.home.googlePlay")}
            </span>
            <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-5 py-3 text-sm font-medium rounded-xl"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              <Globe className="w-4 h-4 mr-2" />{t("website.home.useWebApp")}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto py-10 px-5 border-t" style={{ borderColor: "hsl(270 40% 16%)" }}>
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
