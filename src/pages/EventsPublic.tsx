import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Star, ArrowRight, Music, Palette, BookOpen, TreePine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicNav } from "@/components/PublicNav";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://eazy.family/#organization",
      "name": "Eazy.Family",
      "url": "https://eazy.family",
      "logo": "https://eazy.family/logo.png",
      "description": "Family organisation app and children's events platform",
      "sameAs": [],
    },
    {
      "@type": "WebPage",
      "@id": "https://eazy.family/events#webpage",
      "url": "https://eazy.family/events",
      "name": "Children's Events — Eazy.Family",
      "description": "Family-friendly events for children: music, arts, storytelling and outdoor adventures near you.",
      "isPartOf": { "@id": "https://eazy.family/#website" },
      "about": { "@id": "https://eazy.family/#organization" },
    },
    {
      "@type": "EventSeries",
      "name": "Eazy.Family Children's Events",
      "organizer": { "@id": "https://eazy.family/#organization" },
      "description": "A growing programme of live, in-person events for children and families.",
      "url": "https://eazy.family/events",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "audience": {
        "@type": "Audience",
        "name": "Families with children",
      },
    },
  ],
};

export default function EventsPublic() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "events-schema";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
    return () => { document.getElementById("events-schema")?.remove(); };
  }, []);

  const eventTypes = [
    { icon: Music,    title: t("website.events.e1t"), desc: t("website.events.e1d") },
    { icon: Palette,  title: t("website.events.e2t"), desc: t("website.events.e2d") },
    { icon: BookOpen, title: t("website.events.e3t"), desc: t("website.events.e3d") },
    { icon: TreePine, title: t("website.events.e4t"), desc: t("website.events.e4d") },
  ];

  const stats = [
    { icon: MapPin,   stat: t("website.events.stat1v"), label: t("website.events.stat1l") },
    { icon: Users,    stat: t("website.events.stat2v"), label: t("website.events.stat2l") },
    { icon: Calendar, stat: t("website.events.stat3v"), label: t("website.events.stat3l") },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
        <div className="absolute top-1/2 -right-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(290 80% 55%), transparent 70%)" }} />
      </div>

      <PublicNav />

      <main className="flex-1 max-w-5xl mx-auto px-5 pt-32 pb-16 space-y-20">

        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{ background: "hsl(270 50% 14% / 0.7)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 60% 82%)" }}>
            <MapPin className="w-3.5 h-3.5" />
            {t("website.events.badge")}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
            style={{ color: "hsl(270 40% 98%)" }}>
            <span style={{ background: "linear-gradient(135deg, hsl(270 88% 70%), hsl(290 80% 72%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("website.events.heroHeadline")}
            </span>
          </h1>

          <p className="text-base leading-relaxed" style={{ color: "hsl(270 30% 70%)" }}>
            {t("website.events.heroSub")}
          </p>

          <Button onClick={() => navigate("/onboarding")}
            className="text-white border-0 px-8 py-5 text-sm font-semibold rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            {t("website.events.ctaPrimary")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </section>

        {/* Event types */}
        <section>
          <h2 className="text-xl font-bold text-center mb-8" style={{ color: "hsl(270 40% 96%)" }}>
            {t("website.events.whatToExpect")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {eventTypes.map(e => {
              const Icon = e.icon;
              return (
                <div key={e.title} className="rounded-2xl p-5 text-center space-y-3"
                  style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
                  <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm" style={{ color: "hsl(270 40% 96%)" }}>{e.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "hsl(270 30% 65%)" }}>{e.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {stats.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.stat} className="space-y-2">
                <Icon className="w-6 h-6 mx-auto opacity-60" style={{ color: "hsl(270 60% 72%)" }} />
                <p className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>{item.stat}</p>
                <p className="text-sm" style={{ color: "hsl(270 30% 65%)" }}>{item.label}</p>
              </div>
            );
          })}
        </section>

        {/* Coming soon CTA */}
        <section className="rounded-3xl p-10 text-center space-y-5"
          style={{ background: "hsl(270 50% 10% / 0.9)", border: "1px solid hsl(270 40% 22%)" }}>
          <Star className="w-8 h-8 mx-auto opacity-60" style={{ color: "hsl(270 60% 72%)" }} />
          <h2 className="text-xl font-bold" style={{ color: "hsl(270 40% 98%)" }}>
            {t("website.events.comingSoonTitle")}
          </h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: "hsl(270 30% 65%)" }}>
            {t("website.events.comingSoonSub")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-sm rounded-2xl"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              {t("website.events.comingSoonCta")}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} style={{ color: "hsl(270 40% 70%)" }}>
              {t("website.events.exploreApp")}
            </Button>
          </div>
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
