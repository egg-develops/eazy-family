import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Users, Zap, ArrowRight } from "lucide-react";

const values = [
  { icon: Heart,   title: "Family First",   body: "Every decision we make starts with one question: does this make family life better?" },
  { icon: Shield,  title: "Privacy by Design", body: "We never sell your data. Your family's information is encrypted and only accessible to you." },
  { icon: Users,   title: "Community Driven", body: "Built with real parents — their feedback shapes every feature we ship." },
  { icon: Zap,     title: "Simple & Fast",  body: "A tool nobody uses helps nobody. We obsess over making things feel effortless." },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

      {/* Background */}
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

      <main className="flex-1 max-w-4xl mx-auto px-5 py-16 space-y-20">

        {/* Mission */}
        <section className="text-center max-w-2xl mx-auto space-y-5">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "hsl(270 40% 98%)" }}>
            We're building the operating system for modern family life
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "hsl(270 30% 68%)" }}>
            Family life is full of moving parts — schedules, shopping, school runs, playdates, and constant communication. We built Eazy.Family to bring all of that into one private, calm space so families can spend less time managing and more time together.
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-xl font-bold mb-8 text-center" style={{ color: "hsl(270 40% 96%)" }}>What we stand for</h2>
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
          <h2 className="text-xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>The story</h2>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(270 30% 68%)" }}>
            Eazy.Family started from a simple frustration: too many apps, too many group chats, too many spreadsheets just to keep a family organised. We wanted one place — private, fast and beautiful — that the whole family would actually use.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(270 30% 68%)" }}>
            We're a small team building this in the open, shipping fast and listening closely to every family that trusts us with their daily life.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center rounded-3xl p-10"
          style={{ background: "hsl(270 50% 10% / 0.8)", border: "1px solid hsl(270 40% 22%)" }}>
          <h2 className="text-xl font-bold mb-3" style={{ color: "hsl(270 40% 98%)" }}>Ready to try it?</h2>
          <p className="text-sm mb-6" style={{ color: "hsl(270 30% 65%)" }}>Free to use, no credit card required.</p>
          <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-base rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </section>
      </main>

      <footer className="py-8 px-5 border-t text-center text-xs" style={{ borderColor: "hsl(270 40% 16%)", color: "hsl(270 30% 45%)" }}>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-3" style={{ color: "hsl(270 30% 55%)" }}>
          <Link to="/" className="hover:opacity-80">Home</Link>
          <Link to="/events" className="hover:opacity-80">Events</Link>
          <Link to="/download" className="hover:opacity-80">Download</Link>
          <Link to="/privacy" className="hover:opacity-80">Privacy</Link>
          <Link to="/terms" className="hover:opacity-80">Terms</Link>
        </nav>
        © {new Date().getFullYear()} Eazy.Family
      </footer>
    </div>
  );
}
