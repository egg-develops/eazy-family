import { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { FeatureTour } from "@/components/FeatureTour";
import { useAuth } from "@/contexts/AuthContext";

export const GlobalTutorial = () => {
  const { user } = useAuth();
  const [showSlides, setShowSlides] = useState(false);

  // Show tour on first sign-in — keyed to user ID so each account gets its own first-run
  useEffect(() => {
    if (!user) return;
    const key = `eazy-family-tutorial-completed-${user.id}`;
    if (localStorage.getItem(key) !== "true") {
      setShowSlides(true);
    }
  }, [user?.id]);

  useEffect(() => {
    // "tutorial-slides" event from Settings / homepage banner
    const onSlides = () => setShowSlides(true);
    window.addEventListener("tutorial-slides", onSlides as EventListener);
    return () => window.removeEventListener("tutorial-slides", onSlides as EventListener);
  }, []);

  // Escape key / hardware back button to dismiss
  useEffect(() => {
    if (!showSlides) return;
    const close = () => setShowSlides(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    let backHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', close).then(h => { backHandle = h; });
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      backHandle?.remove();
    };
  }, [showSlides]);

  const handleDone = () => {
    if (user) localStorage.setItem(`eazy-family-tutorial-completed-${user.id}`, "true");
    setShowSlides(false);
  };

  return showSlides ? <FeatureTour onDone={handleDone} /> : null;
};
