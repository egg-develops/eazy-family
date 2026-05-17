import { useEffect, useState } from "react";
import { FeatureTour } from "@/components/FeatureTour";
import { TutorialWalkthrough } from "@/components/TutorialWalkthrough";

export const GlobalTutorial = () => {
  const [showSlides, setShowSlides] = useState(false);
  const [showJoyride, setShowJoyride] = useState(false);

  useEffect(() => {
    // First-ever launch → show slide tour
    const completed = localStorage.getItem("eazy-family-tutorial-completed") === "true";
    const firstLaunch = localStorage.getItem("eazy-family-first-launch");
    if (!firstLaunch && !completed) {
      localStorage.setItem("eazy-family-first-launch", "true");
      setShowSlides(true);
      return;
    }

    // Legacy flag left over from before the split
    if (localStorage.getItem("eazy-family-tutorial-run") === "true") {
      localStorage.removeItem("eazy-family-tutorial-run");
      setShowJoyride(true);
    }
  }, []);

  useEffect(() => {
    // "tutorial-start" event from Settings "Replay interactive tour" → joyride
    const onStart = () => {
      setShowSlides(false);
      setShowJoyride(true);
    };
    // "tutorial-slides" event from Settings "Watch intro slides" → slides
    const onSlides = () => {
      setShowJoyride(false);
      setShowSlides(true);
    };
    window.addEventListener("tutorial-start", onStart as EventListener);
    window.addEventListener("tutorial-slides", onSlides as EventListener);
    return () => {
      window.removeEventListener("tutorial-start", onStart as EventListener);
      window.removeEventListener("tutorial-slides", onSlides as EventListener);
    };
  }, []);

  const handleSlidesDone = () => {
    localStorage.setItem("eazy-family-tutorial-completed", "true");
    setShowSlides(false);
  };

  const handleJoyrideDone = () => {
    setShowJoyride(false);
  };

  return (
    <>
      {showSlides && <FeatureTour onDone={handleSlidesDone} />}
      {showJoyride && <TutorialWalkthrough run={showJoyride} onComplete={handleJoyrideDone} />}
    </>
  );
};
