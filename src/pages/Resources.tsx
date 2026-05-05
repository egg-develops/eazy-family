import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Heart, ShoppingBag, ArrowRight, ExternalLink, Rss } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicNav } from "@/components/PublicNav";

const HEADING = { color: "#1A0B2E" };
const MUTED   = { color: "#522793" };
const SUBTLE  = { color: "#8A5FE0" };
const CARD    = { background: "#FFFFFF", border: "1px solid #F0E4FB" };

/* EZ Shop product categories — Amazon affiliate */
const SHOP_CATEGORIES = [
  {
    label: "Family Planners",
    items: [
      { name: "Large Family Wall Calendar", tag: "large+family+wall+calendar" },
      { name: "Weekly Family Planner Notepad", tag: "weekly+family+planner+notepad" },
      { name: "Family Command Centre Board", tag: "family+command+centre+board" },
    ],
  },
  {
    label: "Kids Activities",
    items: [
      { name: "STEM Activity Kits", tag: "stem+activity+kits+kids" },
      { name: "Arts & Crafts Sets", tag: "kids+arts+crafts+set" },
      { name: "Outdoor Play Equipment", tag: "kids+outdoor+play+equipment" },
    ],
  },
  {
    label: "Smart Home",
    items: [
      { name: "Smart Display for Kitchen", tag: "smart+display+kitchen+family" },
      { name: "Shared Family Tablet", tag: "family+shared+tablet" },
      { name: "Alexa Echo Dot Kids", tag: "echo+dot+kids+edition" },
    ],
  },
];

/* Replace with your actual Amazon affiliate tag */
const AFFILIATE_TAG = "eazyfamily-21";

function amazonUrl(searchTag: string) {
  return `https://www.amazon.com/s?k=${searchTag}&tag=${AFFILIATE_TAG}`;
}

/* Parenting tips — static content */
const PARENTING_TIPS = [
  {
    title: "The 10-minute family check-in",
    body: "Before dinner, gather for a quick round-table: one thing that went well, one thing that was hard. It builds emotional vocabulary and connection.",
    tag: "Routine",
  },
  {
    title: "Age-appropriate chores build confidence",
    body: "Children as young as 2 can help sort laundry or put away toys. Responsibility early on builds self-esteem — not just helpfulness.",
    tag: "Wellbeing",
  },
  {
    title: "Batch your admin into one weekly session",
    body: "School forms, activity registrations, birthday parties — block 30 minutes every Sunday to process everything at once. Your week will feel lighter.",
    tag: "Organisation",
  },
  {
    title: "The shared calendar is the family's second brain",
    body: "When every family member can see what's happening, the mental load is distributed. Nobody carries the schedule alone.",
    tag: "Tech",
  },
];

export default function Resources() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FBF8FF", color: "#1A0B2E" }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #C7AEEF, transparent 70%)" }} />
        <div className="absolute bottom-1/3 -right-20 w-[300px] h-[300px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #EE7BB0, transparent 70%)" }} />
      </div>

      <PublicNav />

      <main className="flex-1 max-w-5xl mx-auto px-5 pt-32 pb-16 space-y-20">

        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight" style={HEADING}>
            {t("website.resources.heroHeadline")}
          </h1>
          <p className="text-base leading-relaxed" style={MUTED}>
            {t("website.resources.heroSub")}
          </p>
        </section>

        {/* ── Section tabs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Rss,         label: "Blog",       anchor: "#blog",      bg: "#F0E4FB", color: "#6B3FBF" },
            { icon: Heart,       label: "Parenting",  anchor: "#parenting", bg: "#FCE0EC", color: "#EE7BB0" },
            { icon: ShoppingBag, label: "EZ Shop",    anchor: "#shop",      bg: "#DCE6F8", color: "#6E8FE5" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <a key={s.label} href={s.anchor}
                className="rounded-2xl p-5 flex items-center gap-4 group transition-shadow hover:shadow-md"
                style={CARD}>
                <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={HEADING}>{s.label}</p>
                  <p className="text-xs" style={SUBTLE}>Jump to section →</p>
                </div>
              </a>
            );
          })}
        </div>

        {/* ── Blog ── */}
        <section id="blog" className="scroll-mt-24 space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "#F0E4FB" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F0E4FB" }}>
              <Rss className="w-4 h-4" style={{ color: "#6B3FBF" }} />
            </div>
            <h2 className="font-serif text-xl font-light" style={HEADING}>Blog</h2>
          </div>

          <div className="rounded-3xl p-10 text-center space-y-4" style={{ background: "#F8F1FF", border: "1px solid #F0E4FB" }}>
            <BookOpen className="w-8 h-8 mx-auto" style={{ color: "#C7AEEF" }} />
            <h3 className="font-serif text-lg font-light" style={HEADING}>Articles coming soon</h3>
            <p className="text-sm max-w-md mx-auto" style={MUTED}>
              We're writing guides on family organisation, digital wellbeing, and making the most of Eazy.Family.
              Sign up to be notified when we publish.
            </p>
            <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-6 py-4 text-sm rounded-2xl"
              style={{ background: "#6B3FBF" }}>
              Create a free account for updates
            </Button>
          </div>
        </section>

        {/* ── Parenting ── */}
        <section id="parenting" className="scroll-mt-24 space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "#F0E4FB" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FCE0EC" }}>
              <Heart className="w-4 h-4" style={{ color: "#EE7BB0" }} />
            </div>
            <h2 className="font-serif text-xl font-light" style={HEADING}>Parenting</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PARENTING_TIPS.map(tip => (
              <div key={tip.title} className="rounded-2xl p-5 space-y-2" style={CARD}>
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "#FCE0EC", color: "#EE7BB0" }}>
                  {tip.tag}
                </span>
                <h3 className="font-medium text-sm leading-snug" style={HEADING}>{tip.title}</h3>
                <p className="text-xs leading-relaxed" style={SUBTLE}>{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── EZ Shop ── */}
        <section id="shop" className="scroll-mt-24 space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "#F0E4FB" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#DCE6F8" }}>
              <ShoppingBag className="w-4 h-4" style={{ color: "#6E8FE5" }} />
            </div>
            <h2 className="font-serif text-xl font-light" style={HEADING}>EZ Shop</h2>
            <span className="text-xs ml-auto" style={SUBTLE}>
              Affiliate links — we may earn a small commission at no cost to you.
            </span>
          </div>

          <div className="space-y-8">
            {SHOP_CATEGORIES.map(cat => (
              <div key={cat.label}>
                <h3 className="text-sm font-medium mb-3" style={MUTED}>{cat.label}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cat.items.map(item => (
                    <a
                      key={item.name}
                      href={amazonUrl(item.tag)}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="rounded-xl p-4 flex items-center justify-between gap-2 group transition-shadow hover:shadow-sm"
                      style={CARD}
                    >
                      <span className="text-sm" style={HEADING}>{item.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity"
                        style={{ color: "#6B3FBF" }} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center rounded-3xl p-10"
          style={{ background: "#F8F1FF", border: "1px solid #F0E4FB" }}>
          <h2 className="font-serif text-xl font-light mb-3" style={HEADING}>
            {t("website.resources.ctaTitle")}
          </h2>
          <p className="text-sm mb-6" style={SUBTLE}>
            {t("website.resources.ctaSub")}
          </p>
          <Button onClick={() => navigate("/onboarding")} className="text-white border-0 px-8 py-5 text-base rounded-2xl"
            style={{ background: "#6B3FBF" }}>
            {t("website.resources.ctaButton")} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </section>
      </main>

      <footer className="py-10 px-5 border-t" style={{ borderColor: "#F0E4FB" }}>
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
          <p className="text-xs" style={{ color: "#C7AEEF" }}>© {new Date().getFullYear()} Eazy.Family</p>
        </div>
      </footer>
    </div>
  );
}
