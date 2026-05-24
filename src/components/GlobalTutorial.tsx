import { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { FeatureTour } from "@/components/FeatureTour";

export const GlobalTutorial = () => {
  const [showSlides, setShowSlides] = useState(false);

  useEffect(() => {
    // Show Features Tour on first sign-in (until explicitly completed)
    const completed = localStorage.getItem("eazy-family-tutorial-completed") === "true";
    if (!completed) {
      localStorage.setItem("eazy-family-first-launch", "true");
      setShowSlides(true);
    }
  }, []);

  useEffect(() => {
    // "tutorial-slides" event from Settings "Features Tour" row
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
    localStorage.setItem("eazy-family-tutorial-completed", "true");
    setShowSlides(false);
  };

  return showSlides ? <FeatureTour onDone={handleDone} /> : null;
};
