import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PRIMARY = "#964735";
const INK = "#1c1c18";
const INK_V = "#55433f";
const BG = "rgba(253,249,243,0.95)";
const OUTLINE = "#dac1bb";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function PublicNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const goToSection = (id: string) => {
    setMenuOpen(false);
    if (pathname === "/") {
      scrollToSection(id);
    } else {
      navigate("/");
      setTimeout(() => scrollToSection(id), 120);
    }
  };

  const navLinks = [
    { label: "Features",       action: () => goToSection("features") },
    { label: "Intelligence",   action: () => goToSection("intelligence") },
    { label: "Morning Digest", action: () => goToSection("digest") },
    { label: "Pricing",        action: () => goToSection("pricing") },
    { label: "About",          action: () => { setMenuOpen(false); navigate("/about"); } },
  ];

  return (
    <nav style={{
      background: BG,
      backdropFilter: "blur(12px)",
      borderBottom: `0.5px solid ${OUTLINE}`,
      padding: "0 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "64px",
      position: "sticky",
      top: 0,
      zIndex: 200,
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate("/")}
        style={{
          fontFamily: "'Lora', serif",
          fontSize: "18px",
          fontWeight: 600,
          color: PRIMARY,
          letterSpacing: "-0.02em",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        eazy.family
      </button>

      {/* Desktop links */}
      <ul style={{ display: "flex", gap: "4px", listStyle: "none", margin: 0, padding: 0 }}
        className="hidden md:flex">
        {navLinks.map(l => (
          <li key={l.label}>
            <button
              onClick={l.action}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 400,
                color: INK_V,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "9999px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1ede7"; (e.currentTarget as HTMLElement).style.color = INK; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = INK_V; }}
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop CTAs */}
      <div className="hidden md:flex" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={() => navigate("/auth")}
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: INK_V, background: "none", border: "none", cursor: "pointer", padding: "7px 12px", borderRadius: "9999px" }}
        >
          Sign in
        </button>
        <button
          onClick={() => navigate("/onboarding")}
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, color: "#fff", background: PRIMARY, border: "none", cursor: "pointer", padding: "8px 18px", borderRadius: "9999px" }}
        >
          Download the app
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden"
        onClick={() => setMenuOpen(v => !v)}
        aria-label="Toggle menu"
        style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", color: INK }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {menuOpen
            ? <><path d="M4 4L16 16M4 16L16 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>
            : <><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}
        </svg>
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: "absolute",
          top: "64px",
          left: 0,
          right: 0,
          background: "#fdf9f3",
          borderBottom: `0.5px solid ${OUTLINE}`,
          padding: "12px 20px 20px",
          zIndex: 199,
        }}>
          {navLinks.map(l => (
            <button
              key={l.label}
              onClick={l.action}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 0", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: INK_V, background: "none", border: "none", cursor: "pointer", borderBottom: `0.5px solid #f1ede7` }}
            >
              {l.label}
            </button>
          ))}
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={() => { setMenuOpen(false); navigate("/auth"); }}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: INK_V, background: "none", border: `1px solid ${OUTLINE}`, cursor: "pointer", padding: "10px", borderRadius: "9999px" }}>
              Sign in
            </button>
            <button onClick={() => { setMenuOpen(false); navigate("/onboarding"); }}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#fff", background: PRIMARY, border: "none", cursor: "pointer", padding: "11px", borderRadius: "9999px" }}>
              Download the app
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
