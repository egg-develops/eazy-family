import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Star, ArrowRight, Music, Palette, BookOpen, TreePine } from "lucide-react";

const eventTypes = [
  { icon: Music,    title: "Music & Movement",  desc: "Interactive sessions for babies, toddlers and young children." },
  { icon: Palette,  title: "Arts & Crafts",     desc: "Creative workshops designed to spark imagination at every age." },
  { icon: BookOpen, title: "Storytelling",       desc: "Live reading sessions and theatrical stories for little ears." },
  { icon: TreePine, title: "Outdoor Adventures", desc: "Guided nature walks, scavenger hunts and outdoor play." },
];

// JSON-LD structured data for GEO / local event SEO
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

  // Inject JSON-LD into <head>
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "events-schema";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
    return () => { document.getElementById("events-schema")?.remove(); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
        <div className="absolute top-1/2 -right-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(290 80% 55%), transparent 70%)" }} />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b px-5 h-16 flex items-center justify-between"
        style={{ backgroundColor: "hsl(270 30% 5% / 0.85)", borderColor: "hsl(270 40% 18%)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Eazy.Family" className="w-7 h-7" />
          <span className="font-bold text-sm" style={{ color: "hsl(270 40% 96%)" }}>Eazy.Family</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm opacity-70" style={{ color: "hsl(270 40% 90%)" }}>
          <Link to="/about" className="hover:opacity-100">About</Link>
          <Link to="/events" className="opacity-100 font-medium">Events</Link>
          <Link to="/download" className="hover:opacity-100">Download</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} style={{ color: "hsl(270 40% 75%)" }}>Sign In</Button>
          <Button size="sm" onClick={() => navigate("/onboarding")} className="text-white border-0"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-5 py-16 space-y-20">

        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{ background: "hsl(270 50% 14% / 0.7)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 60% 82%)" }}>
            <MapPin className="w-3.5 h-3.5" />
            Live events coming to a location near you
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
            style={{ color: "hsl(270 40% 98%)" }}>
            Real-world events for{" "}
            <span style={{ background: "linear-gradient(135deg, hsl(270 88% 70%), hsl(290 80% 72%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              curious children
            </span>
          </h1>

          <p className="text-base leading-relaxed" style={{ color: "hsl(270 30% 70%)" }}>
            Eazy.Family Events is our in-person programme of children's activities — music, arts, storytelling and outdoor adventures, designed to bring families together in the real world.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => navigate("/onboarding")}
              className="w-full sm:w-auto text-white border-0 px-8 py-5 text-sm font-semibold rounded-2xl"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              Register for Updates
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        {/* Event types */}
        <section>
          <h2 className="text-xl font-bold text-center mb-8" style={{ color: "hsl(270 40% 96%)" }}>
            What to expect
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

        {/* Why */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: MapPin,    stat: "Local",      label: "Events in your neighbourhood" },
            { icon: Users,     stat: "All ages",   label: "From newborns to age 10" },
            { icon: Calendar,  stat: "Regular",    label: "Weekly and monthly sessions" },
          ].map(item => {
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
            Events launching soon
          </h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: "hsl(270 30% 65%)" }}>
            We're finalising our first locations. Create a free account to be the first to know when events go live in your area.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-sm rounded-2xl"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              Get Early Access
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} style={{ color: "hsl(270 40% 70%)" }}>
              Explore the App
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 px-5 border-t text-center text-xs" style={{ borderColor: "hsl(270 40% 16%)", color: "hsl(270 30% 45%)" }}>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-3" style={{ color: "hsl(270 30% 55%)" }}>
          <Link to="/" className="hover:opacity-80">Home</Link>
          <Link to="/about" className="hover:opacity-80">About</Link>
          <Link to="/download" className="hover:opacity-80">Download</Link>
          <Link to="/privacy" className="hover:opacity-80">Privacy</Link>
          <Link to="/terms" className="hover:opacity-80">Terms</Link>
        </nav>
        © {new Date().getFullYear()} Eazy.Family
      </footer>
    </div>
  );
}
