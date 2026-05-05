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

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const NAV_LINKS = [
    { href: "/about",     label: t("website.nav.about") },
    { href: "/events",    label: t("website.nav.events") },
    { href: "/resources", label: t("website.nav.resources") },
    { href: "/download",  label: t("website.nav.getApp") },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "shadow-sm border-b" : ""}`}
      style={{
        backgroundColor: scrolled ? "rgba(251, 248, 255, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : undefined,
        borderColor: "#F0E4FB",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/logo.png" alt="Eazy.Family" className="w-8 h-8" />
          <span className="font-semibold text-sm hidden sm:inline" style={{ color: "#1A0B2E" }}>Eazy.Family</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`text-sm transition-colors ${isActive(l.href) ? "font-medium" : "opacity-60 hover:opacity-90"}`}
              style={{ color: "#1A0B2E" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher variant="auto" />
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}
            className="text-sm" style={{ color: "#522793" }}>
            {t("website.nav.signIn")}
          </Button>
          <Button size="sm" onClick={() => navigate("/onboarding")}
            className="text-white border-0 text-sm rounded-xl"
            style={{ background: "#6B3FBF" }}>
            {t("website.nav.getStarted")}
          </Button>
        </div>

        {/* Mobile: language + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher variant="auto" />
          <button
            className="p-2" onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu" style={{ color: "#522793" }}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-5 py-4 space-y-2"
          style={{ backgroundColor: "#FBF8FF", borderColor: "#F0E4FB" }}
        >
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`block py-2.5 text-sm ${isActive(l.href) ? "font-medium" : "opacity-70"}`}
              style={{ color: "#1A0B2E" }}
            >
              {l.label}
            </Link>
          ))}
          <hr className="my-2" style={{ borderColor: "#F0E4FB" }} />
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => navigate("/auth")}
            style={{ color: "#522793" }}>
            {t("website.nav.signIn")}
          </Button>
          <Button className="w-full text-white border-0 rounded-xl" onClick={() => navigate("/onboarding")}
            style={{ background: "#6B3FBF" }}>
            {t("website.nav.getStarted")}
          </Button>
        </div>
      )}
    </header>
  );
}
