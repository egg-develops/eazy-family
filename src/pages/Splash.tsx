import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/app", { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="animate-splash-exit fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <img
        src="/logo.png"
        alt="Eazy.Family"
        className="w-28 h-28 object-contain animate-logo-pop"
      />
      <p className="mt-5 text-2xl font-bold tracking-tight animate-splash-text">
        Eazy.Family
      </p>
      <p className="mt-1 text-sm text-muted-foreground animate-splash-text">
        Your daily family app
      </p>
    </div>
  );
};

export default Splash;
