import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Menu, X, ChevronDown, BookOpen, Baby, ShoppingBag } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

const RESOURCES_ITEMS = [
  { href: "/resources#blog",      icon: BookOpen,     label: "Blog" },
  { href: "/resources#parenting", icon: Baby,         label: "Parenting" },
  { href: "/resources#shop",      icon: ShoppingBag,  label: "EZ Shop" },
];

export function PublicNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setResourcesOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) => pathname === href || pathname === href.split("#")[0];

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
        {/* Branded wordmark */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/logo.png" alt="Eazy.Family" className="w-8 h-8" />
          <span className="font-serif text-base hidden sm:inline" style={{ color: "#1A0B2E" }}>
            <em className="not-italic" style={{ fontStyle: "italic" }}>Eazy</em>
            <span style={{ color: "#EE7BB0" }}>.</span>
            <span>Family</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/about"
            className={`text-sm transition-colors ${isActive("/about") ? "font-medium" : "opacity-60 hover:opacity-90"}`}
            style={{ color: "#1A0B2E" }}
          >
            {t("website.nav.about")}
          </Link>
          <Link
            to="/events"
            className={`text-sm transition-colors ${isActive("/events") ? "font-medium" : "opacity-60 hover:opacity-90"}`}
            style={{ color: "#1A0B2E" }}
          >
            {t("website.nav.events")}
          </Link>

          {/* Resources dropdown */}
          <div
            ref={resourcesRef}
            className="relative"
            onMouseEnter={() => setResourcesOpen(true)}
            onMouseLeave={() => setResourcesOpen(false)}
          >
            <button
              onClick={() => navigate("/resources")}
              className={`flex items-center gap-1 text-sm transition-colors ${isActive("/resources") ? "font-medium" : "opacity-60 hover:opacity-90"}`}
              style={{ color: "#1A0B2E" }}
            >
              {t("website.nav.resources")}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`} />
            </button>

            {resourcesOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-2xl shadow-xl border overflow-hidden min-w-[180px] animate-fade-in"
                style={{ background: "#FFFFFF", borderColor: "#F0E4FB" }}
              >
                {RESOURCES_ITEMS.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-grape-50"
                      style={{ color: "#1A0B2E" }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#6B3FBF" }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            to="/download"
            className={`text-sm transition-colors ${isActive("/download") ? "font-medium" : "opacity-60 hover:opacity-90"}`}
            style={{ color: "#1A0B2E" }}
          >
            {t("website.nav.getApp")}
          </Link>
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
          {[
            { href: "/about",     label: t("website.nav.about") },
            { href: "/events",    label: t("website.nav.events") },
            { href: "/download",  label: t("website.nav.getApp") },
          ].map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`block py-2.5 text-sm ${isActive(l.href) ? "font-medium" : "opacity-70"}`}
              style={{ color: "#1A0B2E" }}
            >
              {l.label}
            </Link>
          ))}

          {/* Resources expandable section in mobile */}
          <div>
            <button
              className="block py-2.5 text-sm opacity-70 w-full text-left font-medium"
              style={{ color: "#1A0B2E" }}
              onClick={() => navigate("/resources")}
            >
              {t("website.nav.resources")}
            </button>
            <div className="pl-4 space-y-1">
              {RESOURCES_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-2 py-2 text-sm opacity-70"
                    style={{ color: "#1A0B2E" }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

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
