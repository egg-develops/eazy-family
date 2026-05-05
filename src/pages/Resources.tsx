import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/PublicNav";
import {
  BookOpen,
  Heart,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Star,
  ShoppingCart,
  Rss,
} from "lucide-react";
import {
  BLOG_POSTS,
  PARENTING_ARTICLES,
  SHOP_CATEGORIES,
  LANG_LABELS,
  SECTION_LABELS,
  amazonUrl,
  type Lang,
} from "@/data/resources-content";

// ─── Brand tokens ────────────────────────────────────────────
const HEADING = { color: "#1A0B2E" };
const MUTED   = { color: "#522793" };
const SUBTLE  = { color: "#8A5FE0" };
const CARD    = { background: "#FFFFFF", border: "1px solid #F0E4FB" } as React.CSSProperties;

// ─── Badge colours ───────────────────────────────────────────
function badgeStyle(badge: string): React.CSSProperties {
  switch (badge) {
    case "Top Pick":        return { background: "#6B3FBF", color: "#FBF8FF" };
    case "Editor's Choice": return { background: "#1A0B2E", color: "#FBF8FF" };
    case "Family Favourite":return { background: "#EE7BB0", color: "#FBF8FF" };
    case "Best Value":      return { background: "#8A5FE0", color: "#FBF8FF" };
    default:                return { background: "#F0E4FB", color: "#522793" };
  }
}

// ─── Render body text (bold / italic markdown → HTML) ────────
function BodyText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split("\n\n");
  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="mb-3 last:mb-0"
          dangerouslySetInnerHTML={{
            __html: para
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\*(.*?)\*/g, "<em>$1</em>"),
          }}
        />
      ))}
    </div>
  );
}

// ─── FAQ data ────────────────────────────────────────────────
const FAQS = [
  {
    q: "Is Eazy.Family free to use?",
    a: "Eazy.Family offers a free tier with core features — shared calendar, lists, and family messaging. Premium plans unlock AI assistance, advanced privacy controls, and unlimited storage. No ads on any plan.",
  },
  {
    q: "Does Eazy.Family work in multiple languages?",
    a: "Yes. Eazy.Family supports English, German, French, and Italian — making it especially well-suited to multilingual families across Switzerland, France, Germany, Italy, and the UK.",
  },
  {
    q: "How is Eazy.Family different from a WhatsApp group?",
    a: "A WhatsApp group is a messaging thread. Eazy.Family is a full family hub: shared calendar, real-time lists, private messaging, AI assistance, and event planning — all in one place, with no ads and strong privacy controls.",
  },
  {
    q: "Is my family's data private?",
    a: "Absolutely. Eazy.Family is designed to be private by default. Your family's calendar, messages, and lists are never used for advertising or shared with third parties. Privacy is a core design principle, not a premium add-on.",
  },
];

// ─── JSON-LD schema ──────────────────────────────────────────
function buildSchema() {
  const allBlogItems = (["en", "de", "fr", "it"] as Lang[]).flatMap((lang, langIdx) =>
    BLOG_POSTS[lang].map((post, postIdx) => ({
      "@type": "ListItem",
      position: langIdx * 4 + postIdx + 1,
      item: {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        keywords: post.keywords,
        inLanguage: lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : "it-IT",
        datePublished: post.date,
        author: { "@type": "Organization", name: "Eazy.Family" },
        publisher: { "@type": "Organization", name: "Eazy.Family", url: "https://eazy.family" },
      },
    }))
  );

  const allParentingItems = (["en", "de", "fr", "it"] as Lang[]).flatMap((lang, langIdx) =>
    PARENTING_ARTICLES[lang].map((article, artIdx) => ({
      "@type": "ListItem",
      position: langIdx * 4 + artIdx + 1,
      item: {
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        inLanguage: lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : "it-IT",
        author: { "@type": "Organization", name: "Eazy.Family" },
      },
    }))
  );

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Resources & Family Blog — Eazy.Family",
      description:
        "Family organisation tips, parenting guides, and curated product picks — all from the team behind Eazy.Family.",
      url: "https://eazy.family/resources",
      inLanguage: ["en-GB", "de-DE", "fr-FR", "it-IT"],
      publisher: {
        "@type": "Organization",
        name: "Eazy.Family",
        url: "https://eazy.family",
        logo: { "@type": "ImageObject", url: "https://eazy.family/logo.png" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Eazy.Family",
      url: "https://eazy.family",
      description: "Family organizer app — calendar, lists, messaging, and AI assistance in one private hub.",
      foundingDate: "2024",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Eazy.Family Blog Posts",
      description: "Family organisation and wellbeing articles in English, German, French, and Italian.",
      numberOfItems: allBlogItems.length,
      itemListElement: allBlogItems,
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Eazy.Family Parenting Guides",
      description: "Practical parenting articles across four languages.",
      numberOfItems: allParentingItems.length,
      itemListElement: allParentingItems,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ];
}

// ─── Main component ──────────────────────────────────────────
export default function Resources() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("en");
  const [openBlog, setOpenBlog] = useState<string | null>(null);
  const [openParenting, setOpenParenting] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Reset expanded items when language changes
  useEffect(() => {
    setOpenBlog(null);
    setOpenParenting(null);
  }, [lang]);

  // JSON-LD schema injection
  useEffect(() => {
    document.title = "Resources & Family Blog — Eazy.Family";

    const existing = document.getElementById("resources-schema");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = "resources-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(buildSchema());
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById("resources-schema");
      if (el) el.remove();
    };
  }, []);

  const blogPosts      = BLOG_POSTS[lang];
  const parentingArts  = PARENTING_ARTICLES[lang];

  return (
    <div style={{ backgroundColor: "#FBF8FF", minHeight: "100vh" }}>

      {/* ── Background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #C7AEEF, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #EE7BB0, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 -left-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #C7AEEF, transparent 70%)" }}
        />
      </div>

      <PublicNav />

      <main className="max-w-5xl mx-auto px-5 pt-32 pb-20 space-y-16">

        {/* ── Hero ── */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{ background: "#F0E4FB", borderColor: "#C7AEEF", color: "#6B3FBF" }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Family knowledge hub
          </div>
          <h1
            className="font-serif text-4xl sm:text-5xl leading-tight"
            style={HEADING}
          >
            Resources &amp; Family Blog
          </h1>
          <p className="text-base leading-relaxed" style={MUTED}>
            Practical guides, parenting ideas, and curated picks to make family
            life a little smoother.
          </p>
        </section>

        {/* ── Language toggle ── */}
        <div className="flex gap-2 flex-wrap justify-center">
          {(["en", "de", "fr", "it"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={
                lang === l
                  ? { background: "#6B3FBF", color: "#FBF8FF" }
                  : { background: "#F0E4FB", color: "#522793" }
              }
            >
              <Globe className="w-3 h-3" />
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>

        {/* ── Section anchor tabs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["blog", "parenting", "shop"] as const).map((section) => {
            const icons = { blog: Rss, parenting: Heart, shop: ShoppingBag };
            const Icon = icons[section];
            const descs = {
              blog: "Articles & guides",
              parenting: "Practical advice",
              shop: "Curated picks",
            };
            return (
              <a
                key={section}
                href={`#${section}`}
                className="rounded-2xl p-5 flex items-center gap-4 group transition-shadow hover:shadow-md"
                style={CARD}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#F0E4FB" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#6B3FBF" }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={HEADING}>
                    {SECTION_LABELS[section][lang]}
                  </p>
                  <p className="text-xs" style={SUBTLE}>
                    {descs[section]}
                  </p>
                </div>
                <ArrowRight
                  className="w-4 h-4 ml-auto opacity-40 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#6B3FBF" }}
                />
              </a>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            BLOG SECTION
        ══════════════════════════════════════════════ */}
        <section id="blog" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-2">
            <Rss className="w-5 h-5" style={{ color: "#6B3FBF" }} />
            <h2 className="font-serif text-2xl" style={HEADING}>
              {SECTION_LABELS.blog[lang]}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {blogPosts.map((post) => {
              const isOpen = openBlog === post.slug;
              return (
                <article
                  key={post.slug}
                  className="rounded-2xl p-5 space-y-3 transition-shadow hover:shadow-md"
                  style={CARD}
                >
                  {/* Tag */}
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "#F0E4FB", color: "#6B3FBF" }}
                  >
                    {post.tag}
                  </span>

                  {/* Title */}
                  <h3
                    className="font-medium text-sm leading-snug"
                    style={HEADING}
                  >
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs leading-relaxed" style={SUBTLE}>
                    {post.excerpt}
                  </p>

                  {/* Toggle button */}
                  <button
                    onClick={() =>
                      setOpenBlog(isOpen ? null : post.slug)
                    }
                    className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: "#6B3FBF" }}
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Read less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" /> Read more
                      </>
                    )}
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div
                      className="pt-3 border-t text-xs leading-relaxed"
                      style={{ borderColor: "#F0E4FB", color: "#522793" }}
                    >
                      <BodyText text={post.body} />
                    </div>
                  )}

                  {/* Meta */}
                  <div
                    className="flex items-center gap-2 text-xs pt-1"
                    style={{ color: "#C7AEEF" }}
                  >
                    <span>{post.date}</span>
                    <span>·</span>
                    <span>{post.readTime} read</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            PARENTING SECTION
        ══════════════════════════════════════════════ */}
        <section id="parenting" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: "#EE7BB0" }} />
            <h2 className="font-serif text-2xl" style={HEADING}>
              {SECTION_LABELS.parenting[lang]}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parentingArts.map((article) => {
              const isOpen = openParenting === article.slug;
              return (
                <article
                  key={article.slug}
                  className="rounded-2xl p-5 space-y-3 transition-shadow hover:shadow-md"
                  style={CARD}
                >
                  {/* Tag */}
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "#FDE8F2", color: "#EE7BB0" }}
                  >
                    {article.tag}
                  </span>

                  {/* Title */}
                  <h3
                    className="font-medium text-sm leading-snug"
                    style={HEADING}
                  >
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs leading-relaxed" style={SUBTLE}>
                    {article.excerpt}
                  </p>

                  {/* Toggle */}
                  <button
                    onClick={() =>
                      setOpenParenting(isOpen ? null : article.slug)
                    }
                    className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: "#EE7BB0" }}
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Read less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" /> Read more
                      </>
                    )}
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div
                      className="pt-3 border-t text-xs leading-relaxed"
                      style={{ borderColor: "#FDE8F2", color: "#522793" }}
                    >
                      <BodyText text={article.body} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            EZ SHOP SECTION
        ══════════════════════════════════════════════ */}
        <section id="shop" className="space-y-8 scroll-mt-24">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" style={{ color: "#6B3FBF" }} />
              <h2 className="font-serif text-2xl" style={HEADING}>
                {SECTION_LABELS.shop[lang]}
              </h2>
            </div>
            <p className="text-xs max-w-sm leading-relaxed" style={{ color: "#C7AEEF" }}>
              Eazy.Family may earn a small commission from qualifying Amazon
              purchases at no extra cost to you. We only recommend things we'd
              genuinely use.
            </p>
          </div>

          {SHOP_CATEGORIES.map((cat) => (
            <div key={cat.category} className="space-y-4">
              {/* Category header */}
              <h3
                className="font-medium text-base flex items-center gap-2"
                style={HEADING}
              >
                <span>{cat.emoji}</span>
                {cat.category}
              </h3>

              {/* Product grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cat.items.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-2xl p-5 flex flex-col gap-3 transition-shadow hover:shadow-md"
                    style={CARD}
                  >
                    {/* Badge */}
                    <span
                      className="self-start text-xs px-2 py-0.5 rounded-full font-medium"
                      style={badgeStyle(product.badge)}
                    >
                      {product.badge}
                    </span>

                    {/* Name */}
                    <h4
                      className="font-medium text-sm leading-snug"
                      style={HEADING}
                    >
                      {product.name}
                    </h4>

                    {/* Tagline */}
                    <p className="text-xs leading-relaxed flex-1" style={SUBTLE}>
                      {product.tagline}
                    </p>

                    {/* Amazon button */}
                    <a
                      href={amazonUrl(product.searchQuery)}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-opacity hover:opacity-90"
                      style={{ background: "#6B3FBF", color: "#FBF8FF" }}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Shop on Amazon
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ══════════════════════════════════════════════
            FAQ SECTION
        ══════════════════════════════════════════════ */}
        <section className="space-y-4 scroll-mt-24">
          <h2 className="font-serif text-2xl" style={HEADING}>
            Frequently asked questions
          </h2>

          <div className="space-y-2">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden transition-shadow hover:shadow-sm"
                  style={CARD}
                >
                  <button
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span className="font-medium text-sm" style={HEADING}>
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#6B3FBF" }} />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#6B3FBF" }} />
                    )}
                  </button>
                  {isOpen && (
                    <div
                      className="px-5 pb-4 text-sm leading-relaxed border-t"
                      style={{ borderColor: "#F0E4FB", color: "#522793" }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            CTA
        ══════════════════════════════════════════════ */}
        <section
          className="rounded-3xl p-10 text-center space-y-5"
          style={{ background: "#6B3FBF" }}
        >
          <h2 className="font-serif text-2xl sm:text-3xl" style={{ color: "#FBF8FF" }}>
            Ready to organise your family life?
          </h2>
          <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: "#C7AEEF" }}>
            Calendar, lists, messaging, and AI assistance — all in one private
            hub. No ads, ever.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              onClick={() => navigate("/auth")}
              className="rounded-xl px-6 py-2.5 font-medium text-sm"
              style={{ background: "#FBF8FF", color: "#6B3FBF" }}
            >
              Get started free
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Link
              to="/about"
              className="text-sm font-medium underline underline-offset-2"
              style={{ color: "#C7AEEF" }}
            >
              Learn more
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer
        className="border-t mt-8 py-10 px-5"
        style={{ borderColor: "#F0E4FB", background: "#FBF8FF" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div className="space-y-1">
            <p className="font-serif font-semibold text-base" style={HEADING}>
              Eazy.Family
            </p>
            <p className="text-xs" style={{ color: "#C7AEEF" }}>
              © {new Date().getFullYear()} Eazy.Family. All rights reserved.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-4 text-xs font-medium" style={MUTED}>
            <Link to="/" className="hover:opacity-70 transition-opacity">Home</Link>
            <Link to="/about" className="hover:opacity-70 transition-opacity">About</Link>
            <Link to="/events" className="hover:opacity-70 transition-opacity">Events</Link>
            <Link to="/resources" className="hover:opacity-70 transition-opacity">Resources</Link>
            <Link to="/download" className="hover:opacity-70 transition-opacity">Download</Link>
            <Link to="/privacy" className="hover:opacity-70 transition-opacity">Privacy</Link>
            <Link to="/terms" className="hover:opacity-70 transition-opacity">Terms</Link>
          </nav>
        </div>
      </footer>

    </div>
  );
}
