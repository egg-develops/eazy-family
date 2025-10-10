import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TutorialWalkthrough } from "@/components/TutorialWalkthrough";

export const GlobalTutorial = () => {
  const [run, setRun] = useState(false);
  const location = useLocation();

  // Only show tutorial on the homepage
  const isHomepage = location.pathname === '/app';

  useEffect(() => {
    if (!isHomepage) {
      setRun(false);
      return;
    }

    const checkFlag = () => {
      const completed = localStorage.getItem('eazy-family-tutorial-completed') === 'true';
      const shouldRun = localStorage.getItem('eazy-family-tutorial-run') === 'true';
      setRun(shouldRun && !completed);
    };

    checkFlag();

    const onStart = () => checkFlag();
    window.addEventListener('tutorial-start', onStart as EventListener);

    return () => {
      window.removeEventListener('tutorial-start', onStart as EventListener);
    };
  }, [isHomepage]);

  const handleComplete = () => {
    localStorage.removeItem('eazy-family-tutorial-run');
    localStorage.setItem('eazy-family-tutorial-completed', 'true');
    setRun(false);
  };

  if (!isHomepage) return null;

  return <TutorialWalkthrough run={run} onComplete={handleComplete} />;
};