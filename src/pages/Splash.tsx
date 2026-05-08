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
      style={{ background: "linear-gradient(160deg, #3D1A13, #5E2D1F)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #964735, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #D97B66, transparent 70%)" }} />
      </div>

      <img
        src="/logo.png"
        alt="Eazy.Family"
        className="w-32 h-32 object-contain animate-logo-pop relative z-10"
        style={{ filter: "drop-shadow(0 0 40px rgb(150 71 53 / 0.6))" }}
      />
      <p className="mt-5 font-serif text-2xl font-light tracking-tight animate-splash-text relative z-10"
        style={{ color: "#FDF9F3" }}>
        eazy<span style={{ color: "#D97B66" }}>.</span>family
      </p>
      <p className="mt-1 text-sm animate-splash-text relative z-10"
        style={{ color: "#B5A09A" }}>
        Your daily family app
      </p>
    </div>
  );
};

export default Splash;
