import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "@/lib/analytics";

// Captures a PostHog $pageview on every SPA route change (the initial load is
// covered too, since this mounts once at startup). No-op until analytics is
// initialised (VITE_POSTHOG_KEY set).
export function RouteAnalytics() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}
