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
    // ── Step 1: Welcome ──────────────────────────────────────────────────────
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Welcome to Eazy.Family! 👋</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            Your family's private hub for staying <strong>organized and connected</strong> — calendar,
            tasks, shopping, messaging, events, and more.
          </p>
          <p style={{ lineHeight: 1.6, opacity: 0.8, fontSize: '0.9rem' }}>
            Let's take a 2-minute tour of the key features.
          </p>
        </div>
      ),
    },

    // ── Step 2: Eazy Assistant ───────────────────────────────────────────────
    {
      target: '[data-tutorial="eazy-assistant"]',
      placement: 'bottom',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Meet Eazy Assistant 🤖</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            Your AI family helper. Tap a suggestion chip or type anything:
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: '0.9rem', opacity: 0.85 }}>
            <li>"Add milk and eggs to our shopping list"</li>
            <li>"Schedule dentist Monday at 3pm"</li>
            <li>"Quick dinner recipe with 5 ingredients"</li>
          </ul>
          <p style={{ marginTop: 8, fontSize: '0.9rem', opacity: 0.75 }}>
            Works in English, German, French, and Italian.
          </p>
        </div>
      ),
    },

    // ── Step 3: Settings header (navigated to from step 2) ───────────────────
    {
      target: '[data-tutorial="settings"]',
      placement: 'bottom',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Settings ⚙️</p>
          <p style={{ lineHeight: 1.6 }}>
            Everything about your experience lives here — profile, calendar sync, appearance,
            language, privacy, and more. Let's walk through the highlights.
          </p>
        </div>
      ),
    },

    // ── Step 4: Custom Images ────────────────────────────────────────────────
    {
      target: '[data-tutorial="custom-images"]',
      placement: 'bottom',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Personalise Your Home Screen 📸</p>
          <p style={{ lineHeight: 1.6 }}>
            Upload up to <strong>4 rotating hero images</strong> — family photos, a favourite view,
            anything you like. They auto-rotate every 5 seconds on your home screen.
          </p>
          <p style={{ marginTop: 8, fontSize: '0.9rem', opacity: 0.75 }}>
            You can also set a custom greeting and family name at the top.
          </p>
        </div>
      ),
    },

    // ── Step 5: Calendar Integrations ────────────────────────────────────────
    {
      target: '[data-tutorial="calendar-integrations"]',
      placement: 'top',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Calendar Sync 📅</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            Connect <strong>Google Calendar</strong> or <strong>Microsoft Outlook</strong> — both
            are fully live. Your events sync automatically and appear on your home screen widget.
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.75 }}>
            You can also add events directly via Eazy Assistant or the Calendar tab.
          </p>
        </div>
      ),
    },

    // ── Step 6: Appearance ───────────────────────────────────────────────────
    {
      target: '[data-tutorial="appearance"]',
      placement: 'top',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Appearance & Language 🎨</p>
          <p style={{ lineHeight: 1.6 }}>
            Choose <strong>light or dark mode</strong>, pick a colour palette, and set your
            preferred language. Eazy.Family is fully available in English, German, French,
            and Italian — the whole app updates instantly.
          </p>
        </div>
      ),
    },

    // ── Step 7: Referral ─────────────────────────────────────────────────────
    {
      target: '[data-tutorial="referral-system"]',
      placement: 'top',
      content: (
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Invite Friends, Earn Premium 🎁</p>
          <p style={{ lineHeight: 1.6 }}>
            Share your personal referral code with friends and family.
            <strong> You both earn 1 free month of Premium</strong> when they sign up and
            activate it — no limits on how many you can refer.
          </p>
        </div>
      ),
    },

    // ── Step 8: Completion (back on homepage) ────────────────────────────────
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>You're all set! 🎉</p>
          <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
            A few more things to explore on your own:
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.9, fontSize: '0.9rem' }}>
            <li><strong>Family tab</strong> — invite members with a link or email</li>
            <li><strong>To-Do's</strong> — tasks, shopping lists, and shared lists</li>
            <li><strong>Community</strong> — join or create local family groups</li>
            <li><strong>Messaging</strong> — direct messages with family members</li>
          </ul>
          <p style={{ marginTop: 12, fontSize: '0.85rem', opacity: 0.65 }}>
            You can replay this tour anytime from the bottom of Settings.
          </p>
        </div>
      ),
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    if (type === 'step:after') {
      // After step 2 (eazy assistant), navigate to settings and wait for element
      if (index === 1) {
        navigate('/app/settings');
        let attempts = 0;
        const interval = setInterval(() => {
          const el = document.querySelector('[data-tutorial="settings"]');
          attempts++;
          if (el || attempts >= 40) {
            clearInterval(interval);
            setStepIndex(index + 1);
          }
        }, 150);
        return;
      }
      // After step 7 (referral), navigate back to homepage for completion
      if (index === 6) {
        navigate('/app');
        setTimeout(() => setStepIndex(index + 1), 400);
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
          overlayColor: 'rgba(0, 0, 0, 0.55)',
          arrowColor: 'hsl(var(--background))',
          zIndex: 10000,
          width: 340,
        },
        tooltip: { borderRadius: '12px', padding: '20px' },
        tooltipContent: { padding: '4px 0 8px' },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '8px',
          padding: '8px 18px',
          fontWeight: 600,
        },
        buttonBack: { color: 'hsl(var(--muted-foreground))', marginRight: 8 },
        buttonSkip: { color: 'hsl(var(--muted-foreground))' },
        spotlight: { borderRadius: '12px' },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next →',
        skip: 'Skip tour',
      }}
    />
  );
}
