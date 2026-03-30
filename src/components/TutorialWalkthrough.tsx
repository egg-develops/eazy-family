import { useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useNavigate } from 'react-router-dom';

interface TutorialWalkthroughProps {
  run: boolean;
  onComplete: () => void;
}

export function TutorialWalkthrough({ run, onComplete }: TutorialWalkthroughProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();

  const steps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to Eazy Family! Let\'s take a quick tour of the key features to help you get started.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="eazy-assistant"]',
      content: 'Meet Eazy Assistant - your AI-powered family helper! Ask questions, add items to your shopping list by voice, or get help planning.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="settings"]',
      content: 'Access all your settings here to customize your Eazy Family experience.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="custom-images"]',
      content: 'Upload custom profile and header images to personalize your homepage.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="calendar-integrations"]',
      content: 'Connect your Google Calendar to sync all your events in one place. Apple and Outlook coming soon!',
      placement: 'right',
    },
    {
      target: '[data-tutorial="appearance"]',
      content: 'Customize your app\'s appearance with dark mode, custom colors, and more.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="referral-system"]',
      content: '🎁 Your personal referral code is right here! Share it with friends — you both earn 1 free month of Premium when they sign up.',
      placement: 'top',
    },
    {
      target: 'body',
      content: '📱 Share Eazy.Family with Friends! Copy your referral code from Settings and send it via WhatsApp, iMessage, or email. Every friend who joins earns you free Premium.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: '🎉 You\'re all set! Eazy.Family is ready to keep your family organized and connected. Replay this tour anytime from the "Re-run Tutorial" button at the bottom of Settings.',
      placement: 'center',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    if (type === 'step:after') {
      // Navigate to settings before the settings steps
      if (index === 1) {
        navigate('/app/settings');
        let attempts = 0;
        const interval = setInterval(() => {
          const el = document.querySelector('[data-tutorial="settings"]');
          attempts++;
          if (el || attempts >= 30) {
            clearInterval(interval);
            setStepIndex(index + 1);
          }
        }, 200);
        return;
      }
      // Navigate back to homepage before the share/final steps
      if (index === 6) {
        navigate('/app');
        setTimeout(() => setStepIndex(index + 1), 500);
        return;
      }
      if (index < steps.length - 1) {
        setStepIndex(index + 1);
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'hsl(var(--background))',
          zIndex: 10000,
        },
        tooltip: { borderRadius: '8px', padding: '16px' },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '6px',
          padding: '8px 16px',
        },
        buttonBack: { color: 'hsl(var(--muted-foreground))' },
        buttonSkip: { color: 'hsl(var(--muted-foreground))' },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
