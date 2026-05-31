import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const BG    = "#F7F3ED";
const INK   = "#1C1C18";
const MUTED = "#7A6660";
const TC    = "#964735";
const SANS  = "'DM Sans', system-ui, sans-serif";

const Splash = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    navigate(user ? "/app" : "/onboarding", { replace: true });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: BG, overflow: "hidden",
        fontFamily: SANS,
        padding: "40px 28px",
      }}
    >
      {/* ── Orbe motion graphic ── */}
      <div
        style={{
          position: "relative",
          width: 280, height: 280,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.82)",
          transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(218,193,187,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="orbe-halo-outer" style={{
          position: "absolute", width: "90%", height: "90%", borderRadius: "50%",
          border: "0.5px solid rgba(218,193,187,0.35)",
          boxShadow: "0 0 56px rgba(218,193,187,0.22), 0 0 100px rgba(218,193,187,0.08)",
        }} />
        <div className="orbe-halo-mid" style={{
          position: "absolute", width: "72%", height: "72%", borderRadius: "50%",
          border: "1px solid rgba(150,71,53,0.22)",
          boxShadow: "0 0 28px rgba(150,71,53,0.10), inset 0 0 20px rgba(253,249,243,0.08)",
          backdropFilter: "blur(1px)",
        }} />
        <div className="orbe-halo-inner" style={{
          position: "absolute", width: "56%", height: "56%", borderRadius: "50%",
          border: "1.5px solid rgba(150,71,53,0.30)",
          boxShadow: "0 0 36px rgba(150,71,53,0.14), 0 0 72px rgba(218,193,187,0.16)",
          backdropFilter: "blur(2px)",
        }} />
        <div className="orbe-circle-left" style={{
          position: "absolute", width: "40%", height: "40%", borderRadius: "50%",
          background: "radial-gradient(circle at 38% 38%, #ECA07A, #964735)",
          opacity: 0.86,
          boxShadow: "0 10px 52px rgba(150,71,53,0.32)",
        }} />
        <div className="orbe-circle-right" style={{
          position: "absolute", width: "40%", height: "40%", borderRadius: "50%",
          background: "radial-gradient(circle at 62% 38%, #6B9A79, #44664F)",
          opacity: 0.82,
          boxShadow: "0 10px 52px rgba(68,102,79,0.26)",
        }} />
      </div>

      {/* ── Text ── */}
      <div
        style={{
          textAlign: "center",
          marginTop: 40,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s",
        }}
      >
        <p style={{
          fontFamily: SANS,
          fontSize: 13,
          letterSpacing: "0.05em",
          color: MUTED,
          margin: "0 0 6px",
          textTransform: "uppercase",
        }}>
          Welcome to
        </p>

        <h1 style={{
          fontFamily: "'Lora', 'Georgia', serif",
          fontSize: 40,
          fontWeight: 400,
          color: INK,
          margin: "0 0 14px",
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}>
          eazy<span style={{ color: TC }}>.</span>family
        </h1>

        <p style={{
          fontFamily: SANS,
          fontSize: 16,
          color: INK,
          margin: "0 0 10px",
          fontWeight: 500,
          lineHeight: 1.4,
        }}>
          The smart app for day-to-day family life
        </p>

        <p style={{
          fontFamily: SANS,
          fontSize: 14,
          color: MUTED,
          lineHeight: 1.65,
          maxWidth: 260,
          margin: "0 auto 36px",
        }}>
          Answer a few questions to<br />customize your experience
        </p>

        {/* ── CTA ── */}
        <button
          onClick={handleStart}
          style={{
            padding: "15px 40px",
            borderRadius: 9999,
            border: "none",
            background: TC,
            color: "#fff",
            fontFamily: SANS,
            fontSize: 16,
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.01em",
            boxShadow: "0 4px 20px rgba(150,71,53,0.30)",
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(150,71,53,0.36)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(150,71,53,0.30)";
          }}
        >
          Let's get started
        </button>
      </div>
    </div>
  );
};

export default Splash;
