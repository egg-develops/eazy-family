import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface TutorialWalkthroughProps {
  run: boolean;
  onComplete: () => void;
}

export function TutorialWalkthrough({ run, onComplete }: TutorialWalkthroughProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to EaZy Family! Let\'s take a quick tour of the key features to help you get started.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="settings"]',
      content: 'Access all your settings here to customize your EaZy Family experience.',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="custom-images"]',
      content: 'Upload custom profile and header images to personalize your family hub.',
      placement: 'right',
    },
    {
      target: '[data-tutorial="weather-calendar"]',
      content: 'Toggle Weather and Calendar widgets on your homepage for quick access to important information.',
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
      target: 'body',
      content: 'That\'s it! You\'re all set to start using EaZy Family. You can always restart this tour from Settings.',
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    if (type === 'step:after') {
      setStepIndex(index + 1);
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
