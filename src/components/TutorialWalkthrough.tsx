import { useState } from 'react';
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
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Welcome to Eazy.Family 👋</p>
          <p style={{ lineHeight: 1.6, marginBottom: 6 }}>
            Your family's private hub — calendar, tasks, shopping, messaging, and AI in one place.
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.9rem', opacity: 0.75 }}>
            Let's find the three most important things on screen.
          </p>
        </div>
      ),
    },

    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>EZ Button ✨</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            The glowing button on your screen is EZ — your family command center. <strong>Tap to add anything</strong> by voice or text:
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: '0.9rem', opacity: 0.85 }}>
            <li>Events &amp; reminders</li>
            <li>Shopping items</li>
            <li>Tasks &amp; to-dos</li>
            <li>Journal entries</li>
          </ul>
          <p style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.7 }}>
            Press EZ and swipe up to open the menu. Long-press to move it anywhere on your screen.
          </p>
        </div>
      ),
    },

    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Your Daily Overview 📋</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            Your home screen shows everything at a glance:
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: '0.9rem', opacity: 0.85 }}>
            <li>Today's events and upcoming schedule</li>
            <li>Top tasks and overdue reminders</li>
            <li>Smart AI suggestions from Eazy</li>
            <li>Family Channel messages</li>
          </ul>
        </div>
      ),
    },

    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Tasks &amp; Shopping 🛒</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            Your top tasks are here on the home screen. Use EZ or go to the <strong>To-Do's</strong> or <strong>Shopping</strong> tabs for full lists.
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.75 }}>
            Shared lists update in real time across your whole family.
          </p>
        </div>
      ),
    },

    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>You're all set! 🎉</p>
          <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
            A few more things to explore:
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.9, fontSize: '0.9rem' }}>
            <li><strong>Family tab</strong> — invite members with a link</li>
            <li><strong>Rituals</strong> — build daily family habits</li>
            <li><strong>Settings</strong> — sync calendars, upload photos, change language</li>
          </ul>
          <p style={{ marginTop: 12, fontSize: '0.85rem', opacity: 0.65 }}>
            Replay this tour any time from the bottom of Settings.
          </p>
        </div>
      ),
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    if (type === 'step:after' && index < steps.length - 1) {
      setStepIndex(index + 1);
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
      callback={handleCallback}
      disableScrolling={false}
      styles={{
        options: {
          primaryColor: '#964735',
          textColor: '#1C1C18',
          backgroundColor: '#FFFFFF',
          overlayColor: 'rgba(28,20,18,0.5)',
          arrowColor: '#FFFFFF',
          zIndex: 10000,
          width: 340,
        },
        tooltip: { borderRadius: '16px', padding: '20px', border: '1px solid #DAC1BB' },
        tooltipContent: { padding: '4px 0 8px' },
        buttonNext: {
          backgroundColor: '#964735',
          color: '#FFFFFF',
          borderRadius: '999px',
          padding: '8px 20px',
          fontWeight: 600,
          fontSize: '13px',
        },
        buttonBack: { color: '#7A6660', marginRight: 8, fontSize: '13px' },
        buttonSkip: { color: '#7A6660', fontSize: '13px' },
        spotlight: { borderRadius: '16px' },
        beacon: { display: 'none' },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done ✓',
        next: 'Next →',
        skip: 'Skip tour',
      }}
    />
  );
}
