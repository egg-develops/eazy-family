import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function PublicNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const NAV_LINKS = [
    { href: "/about",    label: t("website.nav.about") },
    { href: "/events",   label: t("website.nav.events") },
    { href: "/download", label: t("website.nav.getApp") },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-md border-b" : ""}`}
      style={{ backgroundColor: scrolled ? "hsl(270 30% 5% / 0.9)" : "transparent", borderColor: "hsl(270 40% 20% / 0.4)" }}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/logo.png" alt="Eazy.Family" className="w-8 h-8" />
          <span className="font-bold text-sm hidden sm:inline" style={{ color: "hsl(270 40% 96%)" }}>Eazy.Family</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`text-sm transition-colors ${isActive(l.href) ? "opacity-100 font-medium" : "opacity-60 hover:opacity-90"}`}
              style={{ color: "hsl(270 40% 92%)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher variant="dark" />
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}
            className="text-sm opacity-70 hover:opacity-100" style={{ color: "hsl(270 40% 90%)" }}>
            {t("website.nav.signIn")}
          </Button>
          <Button size="sm" onClick={() => navigate("/onboarding")}
            className="text-white border-0 text-sm"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            {t("website.nav.getStarted")}
          </Button>
        </div>

        {/* Mobile: language + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher variant="dark" />
          <button
            className="p-2" onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu" style={{ color: "hsl(270 40% 85%)" }}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-5 py-4 space-y-2"
          style={{ backgroundColor: "hsl(270 30% 5% / 0.97)", borderColor: "hsl(270 40% 20%)" }}
        >
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`block py-2.5 text-sm ${isActive(l.href) ? "font-medium opacity-100" : "opacity-75"}`}
              style={{ color: "hsl(270 40% 90%)" }}
            >
              {l.label}
            </Link>
          ))}
          <hr className="my-2" style={{ borderColor: "hsl(270 40% 18%)" }} />
          <Button variant="ghost" className="w-full justify-start text-sm opacity-70" onClick={() => navigate("/auth")}
            style={{ color: "hsl(270 40% 90%)" }}>
            {t("website.nav.signIn")}
          </Button>
          <Button className="w-full text-white border-0" onClick={() => navigate("/onboarding")}
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            {t("website.nav.getStarted")}
          </Button>
        </div>
      )}
    </header>
  );
}
