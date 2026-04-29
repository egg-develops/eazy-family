import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar, MapPin, Users, ShoppingCart, MessageCircle, Lock,
  ChevronRight, Menu, X, Sparkles, CheckCircle, Globe,
  Apple, Smartphone, ArrowRight,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/download", label: "Get the App" },
];

const features = [
  { icon: Lock,          title: "Secure & Private",          description: "Your family's data stays yours. TLS encryption and strict per-family access controls." },
  { icon: Calendar,      title: "Shared Calendars & Lists",  description: "Sync schedules, to-dos and shopping lists instantly across all devices." },
  { icon: MapPin,        title: "Local Event Discovery",     description: "Find family-friendly activities, markets and events happening near you." },
  { icon: Users,         title: "Parent Community",          description: "Connect with nearby parents, share tips and arrange playdates." },
  { icon: ShoppingCart,  title: "Family Marketplace",        description: "Give away or sell pre-loved kids' items within your local community." },
  { icon: MessageCircle, title: "Family Messaging",          description: "A private space for your family to stay connected every day." },
];

const steps = [
  { n: "01", title: "Create your family", body: "Sign up and set up your family profile in under a minute." },
  { n: "02", title: "Invite everyone",    body: "Share a link or code — family members join instantly." },
  { n: "03", title: "Stay organised",    body: "Manage calendars, lists, events and messages together." },
];

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/app");
  }, [user, loading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* ── Background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
        <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(290 80% 55%), transparent 70%)" }} />
        <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(260 80% 65%), transparent 70%)" }} />
      </div>

      {/* ── Navbar ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-md border-b" : ""}`}
        style={{ backgroundColor: scrolled ? "hsl(270 30% 5% / 0.85)" : "transparent", borderColor: "hsl(270 40% 20% / 0.4)" }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Eazy.Family" className="w-8 h-8" />
            <span className="font-bold text-base" style={{ color: "hsl(270 40% 96%)" }}>Eazy.Family</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <Link key={l.href} to={l.href}
                className="text-sm transition-colors hover:opacity-100 opacity-70"
                style={{ color: "hsl(270 40% 90%)" }}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}
              className="text-sm opacity-70 hover:opacity-100"
              style={{ color: "hsl(270 40% 90%)" }}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/onboarding")}
              className="text-white border-0 text-sm"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              Get Started Free
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu" style={{ color: "hsl(270 40% 85%)" }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t px-5 py-4 space-y-3"
            style={{ backgroundColor: "hsl(270 30% 5% / 0.95)", borderColor: "hsl(270 40% 20%)" }}>
            {NAV_LINKS.map(l => (
              <Link key={l.href} to={l.href}
                className="block py-2 text-sm opacity-80"
                style={{ color: "hsl(270 40% 90%)" }}
                onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <hr style={{ borderColor: "hsl(270 40% 20%)" }} />
            <Button variant="ghost" className="w-full justify-start text-sm opacity-70" onClick={() => navigate("/auth")}>Sign In</Button>
            <Button className="w-full text-white border-0" onClick={() => navigate("/onboarding")}
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              Get Started Free
            </Button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-5 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{ background: "hsl(270 50% 14% / 0.7)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 60% 82%)" }}>
            <Sparkles className="w-3.5 h-3.5" />
            Web app available now · iOS & Android coming soon
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
            style={{ color: "hsl(270 40% 98%)" }}>
            Your family's{" "}
            <span style={{ background: "linear-gradient(135deg, hsl(270 88% 70%), hsl(290 80% 72%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              private digital home
            </span>
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: "hsl(270 30% 72%)" }}>
            Calendars, to-do lists, local events and family messaging — all in one safe, private space built for modern families.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={() => navigate("/onboarding")}
              className="w-full sm:w-auto text-white border-0 px-8 py-6 text-base font-semibold rounded-2xl shadow-xl"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              Get Started — It's Free
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate("/auth")}
              className="w-full sm:w-auto px-8 py-6 text-base rounded-2xl hover:bg-white/5"
              style={{ color: "hsl(270 40% 75%)" }}>
              Sign In
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs" style={{ color: "hsl(270 30% 58%)" }}>
            {["Free to use", "No ads", "Cross-device sync"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "hsl(270 60% 72%)" }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-5" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "hsl(270 40% 96%)" }}>
              Everything your family needs
            </h2>
            <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: "hsl(270 30% 65%)" }}>
              One app replaces the scattered group chats, spreadsheets and reminder apps.
            </p>
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
                    <p className="text-xs leading-relaxed" style={{ color: "hsl(270 30% 65%)" }}>{f.description}</p>
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
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "hsl(270 40% 96%)" }}>
              Up and running in minutes
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
            Available on all your devices
          </h2>
          <p className="text-sm mb-8" style={{ color: "hsl(270 30% 65%)" }}>
            Use the web app now — native iOS and Android apps are coming soon with the same seamless sync.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link to="/download"
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl opacity-50 cursor-not-allowed text-sm font-medium border"
              style={{ background: "hsl(270 50% 14%)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 40% 85%)" }}
              onClick={e => e.preventDefault()}>
              <Apple className="w-5 h-5" />
              App Store — Coming Soon
            </Link>
            <Link to="/download"
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl opacity-50 cursor-not-allowed text-sm font-medium border"
              style={{ background: "hsl(270 50% 14%)", borderColor: "hsl(270 40% 28%)", color: "hsl(270 40% 85%)" }}
              onClick={e => e.preventDefault()}>
              <Smartphone className="w-5 h-5" />
              Google Play — Coming Soon
            </Link>
            <Button onClick={() => navigate("/onboarding")}
              className="text-white border-0 px-6 py-3 text-sm font-medium rounded-xl"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              <Globe className="w-4 h-4 mr-2" />
              Use Web App Now
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto py-10 px-5 border-t" style={{ borderColor: "hsl(270 40% 16%)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Eazy.Family" className="w-7 h-7" />
              <span className="font-semibold text-sm" style={{ color: "hsl(270 40% 80%)" }}>Eazy.Family</span>
            </Link>

            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "hsl(270 30% 58%)" }}>
              <Link to="/about" className="hover:opacity-80">About</Link>
              <Link to="/events" className="hover:opacity-80">Events</Link>
              <Link to="/download" className="hover:opacity-80">Download</Link>
              <Link to="/privacy" className="hover:opacity-80">Privacy Policy</Link>
              <Link to="/terms" className="hover:opacity-80">Terms of Service</Link>
            </nav>

            <p className="text-xs" style={{ color: "hsl(270 30% 45%)" }}>
              © {new Date().getFullYear()} Eazy.Family
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
