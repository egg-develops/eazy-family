import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { error as logError } from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logError(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FDF9F3' }}>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold" style={{ color: '#1C1C18' }}>404</h1>
        <p className="text-lg" style={{ color: '#7A6660' }}>Page not found</p>
        <a href="/" className="text-sm font-semibold underline" style={{ color: '#964735' }}>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
