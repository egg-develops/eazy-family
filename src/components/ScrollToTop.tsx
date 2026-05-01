import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    // Fire-and-forget page view log
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("page_views").insert({ user_id: user.id, path: pathname }).then(() => {});
    });
  }, [pathname]);

  return null;
}
