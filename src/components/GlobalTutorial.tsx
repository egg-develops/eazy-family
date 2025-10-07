import { useEffect, useState } from "react";
import { TutorialWalkthrough } from "@/components/TutorialWalkthrough";

export const GlobalTutorial = () => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const checkFlag = () => {
      const shouldRun = localStorage.getItem('eazy-family-tutorial-run') === 'true';
      setRun(shouldRun);
    };

    checkFlag();

    const onStart = () => checkFlag();
    window.addEventListener('tutorial-start', onStart as EventListener);

    return () => {
      window.removeEventListener('tutorial-start', onStart as EventListener);
    };
  }, []);

  const handleComplete = () => {
    localStorage.removeItem('eazy-family-tutorial-run');
    setRun(false);
  };

  return <TutorialWalkthrough run={run} onComplete={handleComplete} />;
};