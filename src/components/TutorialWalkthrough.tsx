import { useState, useEffect } from 'react';
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
      target: '[data-tutorial="settings"]',
      content: 'Access all your settings here to customize your Eazy Family experience.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="custom-images"]',
      content: 'Upload custom profile and header images to personalize your Eazy Family.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="weather-calendar"]',
      content: 'Toggle Weather and Calendar widgets on your homepage for quick access.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="quick-actions"]',
      content: 'Choose which Quick Actions appear on your homepage for easy access to frequently used features.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="top-notifications"]',
      content: 'Select Top Notifications to display on your homepage so you never miss important updates.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="calendar-integrations"]',
      content: 'Connect your external calendars (Google, Outlook) to sync all your events in one place.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="appearance"]',
      content: 'Customize your app\'s appearance with themes, colors, and display preferences.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="eazy-assistant"]',
      content: 'Meet Eazy Assistant - your AI-powered family helper! Ask questions, get help with planning, or chat about anything. It\'s here to make managing your family life easier.',
      placement: 'bottom',
    },
    {
      target: 'body',
      content: 'That\'s it! You\'re all set to start using EaZy Family. You can always restart this tour from Settings.',
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type, action } = data;

    if (type === 'step:after') {
      // Navigate to homepage before the Eazy Assistant step
      if (index === 7) {
        navigate('/app');
        // Wait for the Eazy Assistant element to exist before advancing
        let attempts = 0;
        const maxAttempts = 30; // up to ~6s
        const interval = setInterval(() => {
          const el = document.querySelector('[data-tutorial="eazy-assistant"]');
          attempts++;
          if (el || attempts >= maxAttempts) {
            clearInterval(interval);
            setStepIndex(index + 1);
          }
        }, 200);
        return;
      }
      // For all other steps, continue normally
      if (index < steps.length - 1) {
        setStepIndex(index + 1);
      }
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
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
        tooltip: {
          borderRadius: '8px',
          padding: '16px',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '6px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
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
