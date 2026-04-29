import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Apple, Smartphone, CheckCircle, RefreshCw, Bell, Zap } from "lucide-react";

const webFeatures = [
  "Full cross-device sync",
  "Shared calendars & to-do lists",
  "Family messaging",
  "Local event discovery",
  "AI-powered Eazy Assistant",
  "Install as PWA from your browser",
];

export default function Download() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b px-5 h-16 flex items-center justify-between"
        style={{ backgroundColor: "hsl(270 30% 5% / 0.85)", borderColor: "hsl(270 40% 18%)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Eazy.Family" className="w-7 h-7" />
          <span className="font-bold text-sm" style={{ color: "hsl(270 40% 96%)" }}>Eazy.Family</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} style={{ color: "hsl(270 40% 75%)" }}>Sign In</Button>
          <Button size="sm" onClick={() => navigate("/onboarding")} className="text-white border-0"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 py-16 space-y-14">

        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "hsl(270 40% 98%)" }}>
            Get Eazy.Family
          </h1>
          <p className="text-base" style={{ color: "hsl(270 30% 68%)" }}>
            Available on web now. Native iOS and Android apps are on the way.
          </p>
        </section>

        {/* App store buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* iOS */}
          <div className="rounded-2xl p-6 text-center space-y-4 opacity-50"
            style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
            <Apple className="w-10 h-10 mx-auto" style={{ color: "hsl(270 40% 80%)" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "hsl(270 40% 90%)" }}>iOS App</p>
              <p className="text-xs mt-1" style={{ color: "hsl(270 30% 60%)" }}>Coming Soon</p>
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
              <p className="font-semibold text-sm" style={{ color: "hsl(270 40% 90%)" }}>Android App</p>
              <p className="text-xs mt-1" style={{ color: "hsl(270 30% 60%)" }}>Coming Soon</p>
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
              <p className="font-semibold text-sm" style={{ color: "hsl(270 40% 96%)" }}>Web App</p>
              <p className="text-xs mt-1" style={{ color: "hsl(270 60% 72%)" }}>Available Now</p>
            </div>
            <Button onClick={() => navigate("/onboarding")} className="w-full text-white border-0 text-xs py-2"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              Open Web App
            </Button>
          </div>
        </section>

        {/* Web features */}
        <section className="rounded-2xl p-6 space-y-4"
          style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 20%)" }}>
          <h2 className="font-bold text-base" style={{ color: "hsl(270 40% 96%)" }}>
            Everything's available on web right now
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
            Get notified when the apps launch
          </h2>
          <p className="text-sm" style={{ color: "hsl(270 30% 65%)" }}>
            Create a free account and we'll email you when iOS and Android apps are ready.
          </p>
          <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-sm rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            Create Free Account
          </Button>
        </section>
      </main>

      <footer className="py-8 px-5 border-t text-center text-xs" style={{ borderColor: "hsl(270 40% 16%)", color: "hsl(270 30% 45%)" }}>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-3" style={{ color: "hsl(270 30% 55%)" }}>
          <Link to="/" className="hover:opacity-80">Home</Link>
          <Link to="/about" className="hover:opacity-80">About</Link>
          <Link to="/events" className="hover:opacity-80">Events</Link>
          <Link to="/privacy" className="hover:opacity-80">Privacy</Link>
          <Link to="/terms" className="hover:opacity-80">Terms</Link>
        </nav>
        © {new Date().getFullYear()} Eazy.Family
      </footer>
    </div>
  );
}
