import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/app", { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="animate-splash-exit fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(270 62% 7%), hsl(280 55% 11%))" }}
    >
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
      </div>

      <img
        src="/logo.png"
        alt="Eazy.Family"
        className="w-32 h-32 object-contain animate-logo-pop relative z-10"
        style={{ filter: "drop-shadow(0 0 40px hsl(270 88% 64% / 0.7))" }}
      />
      <p className="mt-5 text-2xl font-bold tracking-tight animate-splash-text relative z-10"
        style={{ color: "hsl(270 40% 96%)" }}>
        Eazy.Family
      </p>
      <p className="mt-1 text-sm animate-splash-text relative z-10"
        style={{ color: "hsl(262 80% 78%)" }}>
        Your daily family app
      </p>
    </div>
  );
};

export default Splash;
