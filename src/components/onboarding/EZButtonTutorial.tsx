import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const T = {
  bg: '#FDF9F3', card: '#FFFFFF', ink: '#1C1C18', inkV: '#55433F',
  faint: '#87726E', outline: '#DAC1BB', primary: '#964735',
  primaryL: '#D97B66', primaryS: '#FFDAD3', secondary: '#44664F',
};
const LORA = "'Lora', 'Georgia', serif";
const SANS = "'DM Sans', 'Inter', system-ui, sans-serif";

const STEP_DURATION = 3800;

// ── The actual EZ orb (matches App.tsx exactly) ───────────────────────────────
const EZOrb = ({ style, pressed }: { style?: React.CSSProperties; pressed?: boolean }) => (
  <div style={{
    width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)',
    boxShadow: pressed
      ? '0 0 0 10px rgba(150,71,53,0.18), 0 12px 28px rgba(150,71,53,0.55)'
      : '0 0 0 6px rgba(122,158,175,0.22), 0 8px 20px rgba(150,71,53,0.42)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: pressed ? 'scale(0.88)' : 'scale(1)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    ...style,
  }}>
    <img src="/logo.png" alt="EZ" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'brightness(10)' }} />
  </div>
);

// ── Finger pointer icon ────────────────────────────────────────────────────────
const FingerIcon = ({ color = T.ink }: { color?: string }) => (
  <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
    <path d="M7 12V4a2 2 0 0 1 4 0v8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M11 12V9a2 2 0 0 1 4 0v3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 12v1a2 2 0 0 1 4 0v3c0 4-2 7-7 7H9c-3 0-5-2-5-5v-3a1 1 0 0 1 1-1h2V4a2 2 0 0 1 4 0v8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={`${color}18`}/>
  </svg>
);

// ── DEMO 1: Long press + drag ─────────────────────────────────────────────────
const DragDemo = () => (
  <>
    <style>{`
      @keyframes ez-orb-drag {
        0%,5%  { transform: translate(0,0) scale(1); }
        12%    { transform: translate(0,0) scale(0.87); }
        18%    { transform: translate(0,0) scale(0.87); }
        38%    { transform: translate(60px,-38px) scale(0.93); }
        58%    { transform: translate(-52px,42px) scale(0.93); }
        75%    { transform: translate(44px,50px) scale(0.93); }
        88%    { transform: translate(0,0) scale(1); }
        100%   { transform: translate(0,0) scale(1); }
      }
      @keyframes ez-finger-drag {
        0%,5%  { transform: translate(28px,28px); opacity: 0; }
        8%     { opacity: 1; }
        12%    { transform: translate(28px,28px) scale(0.9); }
        38%    { transform: translate(88px,-10px) scale(0.9); opacity: 1; }
        58%    { transform: translate(-24px,70px) scale(0.9); opacity: 1; }
        75%    { transform: translate(72px,78px) scale(0.9); opacity: 1; }
        86%    { transform: translate(28px,28px); opacity: 1; }
        92%    { transform: translate(28px,28px); opacity: 0; }
        100%   { transform: translate(28px,28px); opacity: 0; }
      }
      @keyframes ez-ghost-pulse {
        0%,40%,100% { opacity: 0.25; }
        55%         { opacity: 0.6; }
      }
    `}</style>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ghost targets */}
      {[
        { top: 18, right: 22 }, { bottom: 28, left: 18 }, { bottom: 18, right: 16 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', width: 46, height: 46, borderRadius: '50%',
          border: `2px dashed ${T.primary}`,
          animation: `ez-ghost-pulse ${STEP_DURATION}ms ease ${i * 0.25}s infinite`,
          ...pos,
        }} />
      ))}
      {/* Animated orb */}
      <div style={{ animation: `ez-orb-drag ${STEP_DURATION}ms ease-in-out infinite`, zIndex: 2 }}>
        <EZOrb />
      </div>
      {/* Finger cursor */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', zIndex: 3, pointerEvents: 'none',
        animation: `ez-finger-drag ${STEP_DURATION}ms ease-in-out infinite`,
        transformOrigin: 'top left',
      }}>
        <FingerIcon color={T.primary} />
      </div>
    </div>
  </>
);

// ── DEMO 2: Swipe up → quick menu ────────────────────────────────────────────
const MENU_ITEMS = [
  { icon: '📅', label: 'Event' },
  { icon: '✓',  label: 'Task',     color: T.primary },
  { icon: '🛒', label: 'Shopping' },
];

const SwipeDemo = () => (
  <>
    <style>{`
      @keyframes ez-swipe-arrow {
        0%,20%  { transform: translateY(12px); opacity: 0; }
        38%     { transform: translateY(0px);  opacity: 1; }
        55%     { transform: translateY(-22px); opacity: 0; }
        100%    { transform: translateY(-22px); opacity: 0; }
      }
      @keyframes ez-menu-slide {
        0%,35%  { transform: translateY(16px) scaleY(0.7); opacity: 0; transform-origin: bottom; }
        55%     { transform: translateY(0) scaleY(1); opacity: 1; transform-origin: bottom; }
        80%     { transform: translateY(0) scaleY(1); opacity: 1; }
        95%     { transform: translateY(16px) scaleY(0.7); opacity: 0; }
        100%    { transform: translateY(16px) scaleY(0.7); opacity: 0; }
      }
      @keyframes ez-menu-item-in {
        0%,40%  { opacity: 0; transform: translateX(-8px); }
        60%     { opacity: 1; transform: translateX(0); }
        80%     { opacity: 1; }
        95%     { opacity: 0; }
        100%    { opacity: 0; }
      }
    `}</style>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 20 }}>
      {/* Menu pills */}
      <div style={{
        width: 160, marginBottom: 12, borderRadius: 16,
        background: T.card, border: `1px solid ${T.outline}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
        animation: `ez-menu-slide ${STEP_DURATION}ms ease infinite`,
      }}>
        {MENU_ITEMS.map((item, i) => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            borderBottom: i < MENU_ITEMS.length - 1 ? `1px solid ${T.outline}` : undefined,
            animation: `ez-menu-item-in ${STEP_DURATION}ms ease ${i * 0.06}s infinite`,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: item.color || T.inkV, fontFamily: SANS }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Swipe arrow */}
      <div style={{
        marginBottom: 6,
        animation: `ez-swipe-arrow ${STEP_DURATION}ms ease infinite`,
      }}>
        <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
          <path d="M9 22L9 4M9 4L3 10M9 4L15 10" stroke={T.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Orb */}
      <EZOrb />
    </div>
  </>
);

// ── DEMO 3: Long tap → voice ──────────────────────────────────────────────────
const VoiceDemo = () => (
  <>
    <style>{`
      @keyframes ez-ring-expand {
        0%,20%  { transform: scale(1); opacity: 0; }
        30%     { opacity: 0.55; }
        80%,100%{ transform: scale(2.6); opacity: 0; }
      }
      @keyframes ez-ring-expand-2 {
        0%,30%  { transform: scale(1); opacity: 0; }
        40%     { opacity: 0.4; }
        90%,100%{ transform: scale(2.6); opacity: 0; }
      }
      @keyframes ez-voice-press {
        0%,5%   { transform: scale(1); }
        18%     { transform: scale(0.86); }
        35%,100%{ transform: scale(1); }
      }
      @keyframes ez-mic-pop {
        0%,22%  { transform: translateY(0) scale(0.4); opacity: 0; }
        40%     { transform: translateY(-88px) scale(1.1); opacity: 1; }
        55%,80% { transform: translateY(-84px) scale(1); opacity: 1; }
        95%     { transform: translateY(-84px) scale(0.6); opacity: 0; }
        100%    { transform: translateY(0) scale(0.4); opacity: 0; }
      }
    `}</style>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Expanding rings */}
      {[0, 1].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: 64, height: 64, borderRadius: '50%',
          border: `2px solid ${T.primary}`,
          animation: `${i === 0 ? 'ez-ring-expand' : 'ez-ring-expand-2'} ${STEP_DURATION}ms ease infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Mic badge that pops up */}
      <div style={{
        position: 'absolute',
        width: 48, height: 48, borderRadius: '50%',
        background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(150,71,53,0.4)',
        animation: `ez-mic-pop ${STEP_DURATION}ms cubic-bezier(0.34,1.56,0.64,1) infinite`,
        zIndex: 3,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>

      {/* Orb (pressed effect) */}
      <div style={{ animation: `ez-voice-press ${STEP_DURATION}ms ease infinite`, zIndex: 2 }}>
        <EZOrb />
      </div>
    </div>
  </>
);

// ── Main screen ───────────────────────────────────────────────────────────────
const STEPS = ['drag', 'swipe', 'voice'] as const;

export const EZButtonTutorialScreen = ({
  onComplete,
}: {
  onComplete: () => void;
}) => {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const { t } = useTranslation();

  // Auto-advance through steps
  useEffect(() => {
    if (step >= STEPS.length - 1) return;
    const id = setTimeout(() => {
      setStep(s => s + 1);
      setAnimKey(k => k + 1);
    }, STEP_DURATION);
    return () => clearTimeout(id);
  }, [step]);

  const advance = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      setAnimKey(k => k + 1);
    }
  }, [step]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 24px 40px', gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontFamily: LORA, fontSize: 26, fontWeight: 400, color: T.ink, margin: '0 0 6px', lineHeight: 1.2 }}>
          {t('onboarding.ezTutorial.title')}
        </h2>
        <p style={{ fontSize: 14, color: T.faint, margin: 0 }}>
          {t('onboarding.ezTutorial.sub')}
        </p>
      </div>

      {/* Animation area — tap anywhere to advance */}
      <div
        onClick={advance}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28,
          cursor: step < STEPS.length - 1 ? 'pointer' : 'default',
        }}
      >
        {/* Demo container */}
        <div style={{
          position: 'relative', width: 220, height: 220,
          background: T.card, borderRadius: 28, border: `1px solid ${T.outline}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {step === 0 && <DragDemo key={`drag-${animKey}`} />}
          {step === 1 && <SwipeDemo key={`swipe-${animKey}`} />}
          {step === 2 && <VoiceDemo key={`voice-${animKey}`} />}
        </div>

        {/* Step label */}
        <div style={{
          width: '100%', background: T.primaryS, borderRadius: 16,
          padding: '14px 20px', border: `1px solid ${T.outline}`,
          textAlign: 'center',
          minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: T.ink, margin: 0, lineHeight: 1.45 }}>
            {t(`onboarding.ezTutorial.step${step + 1}Label`)}
          </p>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 8, height: 8, borderRadius: 9999,
              background: i <= step ? T.primary : T.outline,
              transition: 'width 0.35s ease, background 0.35s ease',
            }} />
          ))}
        </div>

        {step < STEPS.length - 1 && (
          <p style={{ fontSize: 12, color: T.faint, margin: 0 }}>
            {t('onboarding.ezTutorial.tapToContinue')}
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onComplete}
        style={{
          width: '100%', padding: '15px 24px', borderRadius: 9999, border: 'none',
          background: step === STEPS.length - 1 ? T.primary : `${T.primary}55`,
          color: '#fff', fontFamily: SANS, fontSize: 15, fontWeight: 500,
          cursor: 'pointer', transition: 'background 0.3s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {t('onboarding.ezTutorial.cta')}
      </button>
    </div>
  );
};
