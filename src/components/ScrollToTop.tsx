import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait for React to finish rendering the new page before scrolling
      const id = hash.slice(1);
      const tryScroll = (attemptsLeft: number) => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attemptsLeft > 0) {
          setTimeout(() => tryScroll(attemptsLeft - 1), 100);
        }
      };
      setTimeout(() => tryScroll(5), 80);
      return;
    }

    window.scrollTo(0, 0);

    // Fire-and-forget page view log
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("page_views").insert({ user_id: user.id, path: pathname }).then(() => {});
    });
  }, [pathname, hash]);

  return null;
}
