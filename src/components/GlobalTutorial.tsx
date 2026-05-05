import { useEffect, useState } from "react";
import { FeatureTour } from "@/components/FeatureTour";

export const GlobalTutorial = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      const completed = localStorage.getItem("eazy-family-tutorial-completed") === "true";
      const shouldRun = localStorage.getItem("eazy-family-tutorial-run") === "true";
      const firstLaunch = localStorage.getItem("eazy-family-first-launch");

      if (!firstLaunch && !completed) {
        localStorage.setItem("eazy-family-first-launch", "true");
        setShow(true);
        return;
      }
      if (shouldRun) {
        localStorage.removeItem("eazy-family-tutorial-run");
        setShow(true);
      }
    };

    check();

    const onStart = () => {
      localStorage.removeItem("eazy-family-tutorial-completed");
      localStorage.removeItem("eazy-family-tutorial-run");
      setShow(true);
    };
    window.addEventListener("tutorial-start", onStart as EventListener);
    return () => window.removeEventListener("tutorial-start", onStart as EventListener);
  }, []);

  const handleDone = () => {
    localStorage.setItem("eazy-family-tutorial-completed", "true");
    setShow(false);
  };

  if (!show) return null;
  return <FeatureTour onDone={handleDone} />;
};
