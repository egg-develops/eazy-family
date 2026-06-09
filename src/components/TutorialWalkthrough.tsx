import { useState, useMemo } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useTranslation } from 'react-i18next';

function readCSSVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

interface TutorialWalkthroughProps {
  run: boolean;
  onComplete: () => void;
}

export function TutorialWalkthrough({ run, onComplete }: TutorialWalkthroughProps) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  const joyrideColors = useMemo(() => ({
    bgColor: readCSSVar('--card', '#FFFFFF'),
    fgColor: readCSSVar('--foreground', '#1C1C18'),
    borderColor: readCSSVar('--border', '#DAC1BB'),
    primaryColor: readCSSVar('--primary', '#964735'),
    mutedColor: readCSSVar('--muted-foreground', '#7A6660'),
  }), [run]);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{t('tour.walkthrough.welcomeTitle')}</p>
          <p style={{ lineHeight: 1.6, marginBottom: 6 }}>
            {t('tour.walkthrough.welcomeBody')}
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.9rem', opacity: 0.75 }}>
            {t('tour.walkthrough.welcomeHint')}
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
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('tour.walkthrough.ezTitle')}</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            {t('tour.walkthrough.ezBody')}
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: '0.9rem', opacity: 0.85 }}>
            <li>{t('tour.walkthrough.ezItem1')}</li>
            <li>{t('tour.walkthrough.ezItem2')}</li>
            <li>{t('tour.walkthrough.ezItem3')}</li>
            <li>{t('tour.walkthrough.ezItem4')}</li>
          </ul>
          <p style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.7 }}>
            {t('tour.walkthrough.ezHint')}
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
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('tour.walkthrough.overviewTitle')}</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            {t('tour.walkthrough.overviewBody')}
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: '0.9rem', opacity: 0.85 }}>
            <li>{t('tour.walkthrough.overviewItem1')}</li>
            <li>{t('tour.walkthrough.overviewItem2')}</li>
            <li>{t('tour.walkthrough.overviewItem3')}</li>
            <li>{t('tour.walkthrough.overviewItem4')}</li>
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
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('tour.walkthrough.listsTitle')}</p>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            {t('tour.walkthrough.listsBody')}
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.75 }}>
            {t('tour.walkthrough.listsHint')}
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
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{t('tour.walkthrough.doneTitle')}</p>
          <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
            {t('tour.walkthrough.doneBody')}
          </p>
          <ul style={{ paddingLeft: 16, lineHeight: 1.9, fontSize: '0.9rem' }}>
            <li>{t('tour.walkthrough.doneItem1')}</li>
            <li>{t('tour.walkthrough.doneItem2')}</li>
            <li>{t('tour.walkthrough.doneItem3')}</li>
          </ul>
          <p style={{ marginTop: 12, fontSize: '0.85rem', opacity: 0.65 }}>
            {t('tour.walkthrough.doneHint')}
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
          primaryColor: joyrideColors.primaryColor,
          textColor: joyrideColors.fgColor,
          backgroundColor: joyrideColors.bgColor,
          overlayColor: 'rgba(28,20,18,0.5)',
          arrowColor: joyrideColors.bgColor,
          zIndex: 10000,
          width: 340,
        },
        tooltip: { borderRadius: '16px', padding: '20px', border: `1px solid ${joyrideColors.borderColor}` },
        tooltipContent: { padding: '4px 0 8px' },
        buttonNext: {
          backgroundColor: joyrideColors.primaryColor,
          color: '#FFFFFF',
          borderRadius: '999px',
          padding: '8px 20px',
          fontWeight: 600,
          fontSize: '13px',
        },
        buttonBack: { color: joyrideColors.mutedColor, marginRight: 8, fontSize: '13px' },
        buttonSkip: { color: joyrideColors.mutedColor, fontSize: '13px' },
        spotlight: { borderRadius: '16px' },
        beacon: { display: 'none' },
      }}
      locale={{
        back: t('common.back'),
        close: t('common.close'),
        last: t('tour.walkthrough.done'),
        next: t('tour.walkthrough.nextArrow'),
        skip: t('tour.walkthrough.skipTour'),
      }}
    />
  );
}
