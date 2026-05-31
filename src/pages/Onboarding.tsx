import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cloudSet } from '@/lib/preferencesSync';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { VoiceDemo } from '@/components/onboarding/VoiceDemo';
import { DigestMock } from '@/components/onboarding/DigestMock';
import i18n from '@/i18n/config';
import { useTranslation } from 'react-i18next';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#FDF9F3',
  card: '#FFFFFF',
  ink: '#1C1C18',
  inkV: '#55433F',
  faint: '#87726E',
  outline: '#DAC1BB',
  primary: '#964735',
  primaryL: '#D97B66',
  primaryS: '#FFDAD3',
  secondary: '#44664F',
  secondaryS: '#C6ECCF',
};
const LORA = "'Lora', 'Georgia', serif";
const SANS = "'DM Sans', 'Inter', system-ui, sans-serif";

// ── Screen constants ──────────────────────────────────────────────────────────
// 0:language 2:pain-setup 3:family 4:pain-point 5:voice 6:digest 7:summary 8:paywall 9:account 10:location
const TOTAL_PROGRESS_SCREENS = 8; // screens 2-9
const progressFor = (screen: number) =>
  screen >= 2 && screen <= 9 ? (screen - 1) / TOTAL_PROGRESS_SCREENS : null;

// ── State ─────────────────────────────────────────────────────────────────────
interface OBState {
  language: string;
  currentApproach: string;
  familySize: string;
  mainPainPoint: string;
  voiceFrequency: string;
  location: string;
}

const EMPTY: OBState = { language: '', currentApproach: '', familySize: '', mainPainPoint: '', voiceFrequency: '', location: '' };

const STORAGE_KEY = 'eazy-onboarding-v2';

const load = (): { screen: number; state: OBState } => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { screen: 0, state: EMPTY };
};

const save = (screen: number, state: OBState) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen, state }));

// ── Helpers ───────────────────────────────────────────────────────────────────
const OptionCard = ({
  label, sub, emoji, selected, onClick, multiSelect,
}: {
  label: string; sub?: string; emoji?: string; selected: boolean; onClick: () => void; multiSelect?: boolean;
}) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', textAlign: 'left',
      padding: '14px 16px',
      borderRadius: 16,
      border: `1.5px solid ${selected ? T.primary : T.outline}`,
      background: selected ? T.primaryS : T.card,
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer',
      transition: 'border-color 0.15s ease, background 0.15s ease',
      WebkitTapHighlightColor: 'transparent',
    }}
  >
    {emoji && <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: T.ink, display: 'block', lineHeight: 1.3 }}>{label}</span>
      {sub && <span style={{ fontSize: 12, color: T.faint, display: 'block', marginTop: 2 }}>{sub}</span>}
    </div>
    {multiSelect ? (
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
        border: `1.5px solid ${selected ? T.primary : T.outline}`,
        background: selected ? T.primary : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
    ) : (
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${selected ? T.primary : T.outline}`,
        background: selected ? T.primary : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
      </div>
    )}
  </button>
);

const PrimaryBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%', padding: '15px 24px',
      borderRadius: 9999, border: 'none',
      background: disabled ? T.outline : T.primary,
      color: '#fff', fontFamily: SANS, fontSize: 15, fontWeight: 500,
      cursor: disabled ? 'default' : 'pointer',
      transition: 'background 0.2s ease, transform 0.1s ease',
      WebkitTapHighlightColor: 'transparent',
    }}
    onTouchStart={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
    onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
  >
    {label}
  </button>
);

const OrbeMorphic = ({ size = 120 }: { size?: number }) => (
  <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="orbe-halo-outer" style={{ position: 'absolute', width: '90%', height: '90%', borderRadius: '50%', border: '0.5px solid rgba(218,193,187,0.35)', boxShadow: '0 0 40px rgba(218,193,187,0.2)' }} />
    <div className="orbe-halo-mid"   style={{ position: 'absolute', width: '72%', height: '72%', borderRadius: '50%', border: '1px solid rgba(150,71,53,0.22)', boxShadow: '0 0 20px rgba(150,71,53,0.1)', backdropFilter: 'blur(1px)' }} />
    <div className="orbe-halo-inner" style={{ position: 'absolute', width: '56%', height: '56%', borderRadius: '50%', border: '1.5px solid rgba(150,71,53,0.3)', boxShadow: '0 0 28px rgba(150,71,53,0.12)' }} />
    <div className="orbe-circle-left"  style={{ position: 'absolute', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, #E8956A, #964735)', opacity: 0.84, boxShadow: '0 8px 32px rgba(150,71,53,0.3)' }} />
    <div className="orbe-circle-right" style={{ position: 'absolute', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle at 60% 40%, #6B9A79, #44664f)', opacity: 0.80, boxShadow: '0 8px 32px rgba(68,102,79,0.24)' }} />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const saved = searchParams.get('fresh') ? { screen: 0, state: EMPTY } : load();
  const [screen, setScreen] = useState(saved.screen);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [state, setState] = useState<OBState>(saved.state);
  const [animKey, setAnimKey] = useState(0);

  // Auth screen state
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);
  const [authError, setAuthError] = useState('');

  // Location
  const [locationInput, setLocationInput] = useState('');

  const { t } = useTranslation();

  useEffect(() => { save(screen, state); }, [screen, state]);

  // Keep the flag alive for the entire onboarding session so the
  // authenticated-user redirect on line 201 never fires mid-flow.
  useEffect(() => {
    if (!user) localStorage.setItem('eazy-needs-onboarding', '1');
  }, [user]);

  const go = useCallback((n: number, direction: 'fwd' | 'back' = 'fwd') => {
    setDir(direction);
    setAnimKey(k => k + 1);
    setScreen(n);
  }, []);

  const next = useCallback(() => go(screen + 1, 'fwd'), [screen, go]);
  const back = useCallback(() => go(screen === 2 ? 0 : screen - 1, 'back'), [screen, go]);

  const set = <K extends keyof OBState>(k: K, v: OBState[K]) =>
    setState(prev => ({ ...prev, [k]: v }));

  // Auto-skip account screen if user already signed up via Auth page
  useEffect(() => {
    if (screen !== 9 || !user) return;
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    localStorage.setItem('eazy-family-onboarding', JSON.stringify({
      userName: name,
      language: state.language,
      userInitials: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'EF',
    }));
    localStorage.removeItem(STORAGE_KEY);
    go(10, 'fwd');
  }, [screen, user]);


  if (!authLoading && user && !localStorage.getItem('eazy-needs-onboarding')) return <Navigate to="/app" replace />;

  const progress = progressFor(screen);
  const showBack = screen >= 2;

  // ── Slide animation style ──────────────────────────────────────────────────
  const slideAnim = screen === 0 || screen === 5 || screen === 9
    ? 'ob-fade'
    : dir === 'fwd' ? 'ob-slide-in-right' : 'ob-slide-in-left';

  // ── Personalised summary cards ─────────────────────────────────────────────
  const summaryCards = (() => {
    const cards: { emoji: string; headline: string; body: string }[] = [];

    if (state.mainPainPoint === 'scheduling') {
      cards.push({ emoji: '🗓', headline: t('onboarding.summaryScreen.schedulingHeadline'), body: t('onboarding.summaryScreen.schedulingBody') });
    } else if (state.mainPainPoint === 'shopping') {
      cards.push({ emoji: '🛒', headline: t('onboarding.summaryScreen.shoppingHeadline'), body: t('onboarding.summaryScreen.shoppingBody') });
    } else if (state.mainPainPoint === 'tasks') {
      cards.push({ emoji: '✅', headline: t('onboarding.summaryScreen.tasksHeadline'), body: t('onboarding.summaryScreen.tasksBody') });
    } else if (state.mainPainPoint === 'overview') {
      cards.push({ emoji: '🌅', headline: t('onboarding.summaryScreen.overviewHeadline'), body: t('onboarding.summaryScreen.overviewBody') });
    } else {
      cards.push({ emoji: '✨', headline: t('onboarding.summaryScreen.defaultHeadline'), body: t('onboarding.summaryScreen.defaultBody') });
    }

    if (state.familySize !== 'just-me') {
      cards.push({ emoji: '👨‍👩‍👧', headline: t('onboarding.summaryScreen.syncHeadline'), body: t('onboarding.summaryScreen.syncBody') });
    }

    if (state.voiceFrequency !== 'rarely') {
      cards.push({ emoji: '🎤', headline: t('onboarding.summaryScreen.voiceHeadline'), body: t('onboarding.summaryScreen.voiceBody') });
    } else {
      cards.push({ emoji: '⚡', headline: t('onboarding.summaryScreen.fastHeadline'), body: t('onboarding.summaryScreen.fastBody') });
    }

    return cards.slice(0, 3);
  })();

  // ── Account creation ───────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) return;
    setAuthLoading2(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: { data: { full_name: authName.trim() } },
      });
      if (error) { setAuthError(error.message); return; }
      const finalData = {
        userName: authName.trim(),
        location: locationInput || state.location,
        language: state.language,
        userInitials: authName.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'EF',
      };
      localStorage.setItem('eazy-family-onboarding', JSON.stringify(finalData));
      localStorage.removeItem(STORAGE_KEY);
      go(10, 'fwd');
    } catch {
      setAuthError('Something went wrong. Please try again.');
    } finally {
      setAuthLoading2(false);
    }
  };

  // ── Guest / skip-account flows (Apple Guideline 5.1.1v) ───────────────────
  const [skipLoading, setSkipLoading] = useState(false);

  const handleSkipAccount = async () => {
    if (skipLoading) return;
    setSkipLoading(true);
    const guestData = {
      userName: authName.trim() || 'Guest',
      location: state.location,
      language: state.language,
      userInitials: authName.trim()
        ? authName.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'GU',
    };
    localStorage.setItem('eazy-family-onboarding', JSON.stringify(guestData));
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('eazy-needs-onboarding');
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // onAuthStateChange fires SIGNED_IN → user becomes truthy → Onboarding redirects to /app
    } catch {
      // Anonymous sign-in unavailable — navigate directly; the app handles unauthenticated state
      navigate('/app');
    } finally {
      setSkipLoading(false);
    }
  };

  const handleRestorePurchase = async () => {
    localStorage.setItem('eazy-family-onboarding', JSON.stringify({
      userName: 'Guest',
      language: state.language,
      userInitials: 'GU',
    }));
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('eazy-needs-onboarding');
    try {
      await supabase.auth.signInAnonymously();
    } catch {
      navigate('/app');
    }
  };

  // ── Finish ─────────────────────────────────────────────────────────────────
  const finish = () => {
    if (locationInput || state.location) {
      cloudSet('eazy-family-location', locationInput || state.location);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('eazy-needs-onboarding');
    navigate('/app');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: SANS,
      overflow: 'hidden',
    }}>
      {/* Injected keyframes */}
      <style>{`
        @keyframes ob-slide-in-right { from { transform: translateX(100%); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
        @keyframes ob-slide-in-left  { from { transform: translateX(-100%); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
        @keyframes ob-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ob-card-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ob-scale-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* Progress bar */}
      {progress !== null && (
        <div style={{ height: 3, background: `${T.outline}60`, position: 'relative', flexShrink: 0 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            background: T.primary,
            width: `${progress * 100}%`,
            transition: 'width 0.4s ease',
            borderRadius: '0 9999px 9999px 0',
          }} />
        </div>
      )}

      {/* Nav row */}
      {(showBack || (screen >= 2 && screen <= 8)) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0', flexShrink: 0 }}>
          {showBack ? (
            <button
              onClick={back}
              style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: T.inkV, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          ) : <div />}
          {/* Mini Orbe top right from screen 2 */}
          {screen >= 2 && screen <= 8 && (
            <div className="orbe-pulse" style={{ width: 28, height: 28, borderRadius: '50%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, #E8956A, #964735)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', width: '55%', height: '55%', borderRadius: '50%', background: 'radial-gradient(circle at 60% 40%, #6B9A79, #44664f)', opacity: 0.55, right: '10%' }} />
            </div>
          )}
        </div>
      )}

      {/* Screen content */}
      <div
        key={animKey}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column',
          animation: `${slideAnim} 0.32s ease-out both`,
        }}
      >
        {screen === 0 && <LanguageScreen state={state} set={set} next={() => go(2, 'fwd')} />}
        {screen === 2 && <PainSetupScreen state={state} set={set} next={next} />}
        {screen === 3 && <FamilySizeScreen state={state} set={set} next={next} />}
        {screen === 4 && <PainPointScreen state={state} set={set} next={next} />}
        {screen === 5 && <VoiceDemoScreen state={state} set={set} next={next} />}
        {screen === 6 && <DigestScreen state={state} next={next} />}
        {screen === 7 && <SummaryScreen summaryCards={summaryCards} next={next} />}
        {screen === 8 && <PaywallScreen next={next} back={back} onRestore={handleRestorePurchase} />}
        {screen === 9 && (
          <AccountScreen
            name={authName} setName={setAuthName}
            email={authEmail} setEmail={setAuthEmail}
            password={authPassword} setPassword={setAuthPassword}
            loading={authLoading2} error={authError}
            onSubmit={handleSignUp}
            onSkip={handleSkipAccount}
            skipDisabled={skipLoading}
          />
        )}
        {screen === 10 && (
          <LocationInviteScreen
            location={locationInput} setLocation={setLocationInput}
            onFinish={finish}
          />
        )}
      </div>
    </div>
  );
};

// ── SCREEN 0 — Language ───────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
];

const LanguageScreen = ({ state, set, next }: { state: OBState; set: any; next: () => void }) => {
  const select = (code: string) => {
    set('language', code);
    i18n.changeLanguage(code);
    cloudSet('eazy-family-language', code);
    localStorage.setItem('eazy-family-language', code);
    setTimeout(next, 280);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <OrbeMorphic size={80} />
        <h1 style={{ fontFamily: LORA, fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: T.ink, marginTop: 20, marginBottom: 6 }}>
          eazy.family
        </h1>
        <p style={{ fontSize: 14, color: T.faint, margin: 0 }}>Choose your language</p>
      </div>
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => select(lang.code)}
            style={{
              width: '100%', padding: '14px 18px',
              borderRadius: 16,
              border: `1.5px solid ${state.language === lang.code ? T.primary : T.outline}`,
              background: state.language === lang.code ? T.primaryS : T.card,
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s, background 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 24 }}>{lang.flag}</span>
            <span style={{ fontSize: 16, fontWeight: 500, color: T.ink }}>{lang.native}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── SCREEN 2 — Pain Setup ─────────────────────────────────────────────────────
const PainSetupScreen = ({ state, set, next }: { state: OBState; set: any; next: () => void }) => {
  const { t } = useTranslation();
  const APPROACHES = [
    { value: 'chat', label: t('onboarding.painSetup.chat'), emoji: '📱' },
    { value: 'calendars', label: t('onboarding.painSetup.calendars'), emoji: '📅' },
    { value: 'notes', label: t('onboarding.painSetup.notes'), emoji: '📝' },
    { value: 'wing', label: t('onboarding.painSetup.wing'), emoji: '🤷' },
  ];
  const select = (v: string) => { set('currentApproach', v); setTimeout(next, 320); };
  return (
    <div style={{ padding: '28px 24px 40px' }}>
      <h2 style={{ fontFamily: LORA, fontSize: 24, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.25 }}>
        {t('onboarding.painSetup.title')}
      </h2>
      <div style={{ marginBottom: 28 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {APPROACHES.map(a => (
          <OptionCard key={a.value} emoji={a.emoji} label={a.label} selected={state.currentApproach === a.value} onClick={() => select(a.value)} />
        ))}
      </div>
    </div>
  );
};

// ── SCREEN 3 — Family Size ─────────────────────────────────────────────────────
const FamilySizeScreen = ({ state, set, next }: { state: OBState; set: any; next: () => void }) => {
  const { t } = useTranslation();
  const FAMILY_SIZES = [
    { value: 'just-me', label: t('onboarding.familySize.justMe'), emoji: '🙋' },
    { value: 'partner', label: t('onboarding.familySize.partner'), emoji: '👫' },
    { value: 'kids', label: t('onboarding.familySize.kids'), emoji: '👨‍👩‍👧‍👦' },
    { value: 'extended', label: t('onboarding.familySize.extended'), emoji: '👨‍👩‍👧‍👦' },
    { value: 'caretakers', label: t('onboarding.familySize.caretakers'), emoji: '🤝' },
  ];
  const select = (v: string) => { set('familySize', v); setTimeout(next, 320); };
  return (
    <div style={{ padding: '28px 24px 40px' }}>
      <h2 style={{ fontFamily: LORA, fontSize: 24, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.25 }}>
        {t('onboarding.familySize.title')}
      </h2>
      <p style={{ fontSize: 14, color: T.faint, marginBottom: 28 }}>{t('onboarding.familySize.sub')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FAMILY_SIZES.map(f => (
          <OptionCard key={f.value} emoji={f.emoji} label={f.label} selected={state.familySize === f.value} onClick={() => select(f.value)} />
        ))}
      </div>
    </div>
  );
};

// ── SCREEN 4 — Pain Point ─────────────────────────────────────────────────────
const PainPointScreen = ({ state, set, next }: { state: OBState; set: any; next: () => void }) => {
  const { t } = useTranslation();
  const PAIN_POINTS = [
    { value: 'scheduling', label: t('onboarding.painPoint.schedulingLabel'), sub: t('onboarding.painPoint.schedulingSub'), emoji: '🗓' },
    { value: 'shopping', label: t('onboarding.painPoint.shoppingLabel'), sub: t('onboarding.painPoint.shoppingSub'), emoji: '🛒' },
    { value: 'tasks', label: t('onboarding.painPoint.tasksLabel'), sub: t('onboarding.painPoint.tasksSub'), emoji: '✅' },
    { value: 'overview', label: t('onboarding.painPoint.overviewLabel'), sub: t('onboarding.painPoint.overviewSub'), emoji: '🌅' },
    { value: 'unsure', label: t('onboarding.painPoint.unsureLabel'), sub: t('onboarding.painPoint.unsureSub'), emoji: '🤔' },
  ];
  const select = (v: string) => { set('mainPainPoint', v); setTimeout(next, 320); };
  return (
    <div style={{ padding: '28px 24px 40px' }}>
      <h2 style={{ fontFamily: LORA, fontSize: 24, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.25 }}>
        {t('onboarding.painPoint.title')}
      </h2>
      <p style={{ fontSize: 14, color: T.faint, marginBottom: 28 }}>{t('onboarding.painPoint.sub')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PAIN_POINTS.map(p => (
          <OptionCard key={p.value} emoji={p.emoji} label={p.label} sub={p.sub} selected={state.mainPainPoint === p.value} onClick={() => select(p.value)} />
        ))}
      </div>
    </div>
  );
};

// ── SCREEN 5 — Voice Demo ─────────────────────────────────────────────────────
const VoiceDemoScreen = ({ state, set, next }: { state: OBState; set: any; next: () => void }) => {
  const { t } = useTranslation();
  const VOICE_FREQ = [
    { value: 'always', label: t('onboarding.voiceDemo.always') },
    { value: 'sometimes', label: t('onboarding.voiceDemo.sometimes') },
    { value: 'rarely', label: t('onboarding.voiceDemo.rarely') },
    { value: 'try', label: t('onboarding.voiceDemo.try') },
  ];
  return (
    <div style={{ padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: LORA, fontSize: 24, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.25 }}>
          {t('onboarding.voiceDemo.title')}
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {VOICE_FREQ.map(f => (
          <OptionCard key={f.value} label={f.label} selected={state.voiceFrequency === f.value} onClick={() => set('voiceFrequency', f.value)} />
        ))}
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.faint, marginBottom: 12 }}>
          {t('onboarding.voiceDemo.seeIt')}
        </p>
        <VoiceDemo language={state.language || 'en'} />
      </div>

      <PrimaryBtn label={t('onboarding.voiceDemo.cta')} onClick={next} disabled={!state.voiceFrequency} />
    </div>
  );
};

// ── SCREEN 6 — Morning Digest ─────────────────────────────────────────────────
const DigestScreen = ({ state, next }: { state: OBState; next: () => void }) => {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: LORA, fontSize: 24, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.25 }}>
          {t('onboarding.digestScreen.title')}
        </h2>
        <p style={{ fontSize: 14, color: T.faint, margin: 0 }}>
          {t('onboarding.digestScreen.sub')}
        </p>
      </div>
      <DigestMock language={state.language || 'en'} />
      <PrimaryBtn label={t('onboarding.digestScreen.cta')} onClick={next} />
    </div>
  );
};

// ── SCREEN 7 — Summary ────────────────────────────────────────────────────────
const SummaryScreen = ({ summaryCards, next }: { summaryCards: any[]; next: () => void }) => {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: LORA, fontSize: 24, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.25 }}>
          {t('onboarding.summaryScreen.title')}
        </h2>
        <p style={{ fontSize: 14, color: T.faint, margin: 0 }}>{t('onboarding.summaryScreen.sub')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {summaryCards.map((card, i) => (
          <div
            key={card.headline}
            style={{
              background: T.card, borderRadius: 18, padding: '18px 20px',
              border: `1px solid ${T.outline}`,
              boxShadow: '0 2px 12px rgba(28,20,18,0.06)',
              animation: `ob-card-in 0.4s ease both`,
              animationDelay: `${i * 0.15}s`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{card.emoji}</span>
              <div>
                <p style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 600, color: T.ink }}>{card.headline}</p>
                <p style={{ margin: 0, fontSize: 13, color: T.faint, lineHeight: 1.5 }}>{card.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PrimaryBtn label={t('onboarding.summaryScreen.cta')} onClick={next} />
    </div>
  );
};

// ── SCREEN 8 — Features overview ──────────────────────────────────────────────
const PaywallScreen = ({ next, back, onRestore }: { next: () => void; back: () => void; onRestore: () => void }) => {
  const { t } = useTranslation();
  const FEATURES = [
    { emoji: '🎤', text: t('onboarding.paywall.voiceFeature') },
    { emoji: '🛒', text: t('onboarding.paywall.listsFeature') },
    { emoji: '🌅', text: t('onboarding.paywall.digestFeature') },
    { emoji: '⚡', text: t('onboarding.paywall.conflictsFeature') },
    { emoji: '👨‍👩‍👧', text: t('onboarding.paywall.familyFeature') },
  ];
  return (
    <div style={{ padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <OrbeMorphic size={80} />
        <h2 style={{ fontFamily: LORA, fontSize: 26, fontWeight: 400, color: T.ink, marginTop: 16, marginBottom: 8, lineHeight: 1.2 }}>
          {t('onboarding.paywall.title')}
        </h2>
        <p style={{ fontSize: 14, color: T.faint, margin: 0, lineHeight: 1.5 }}>
          {t('onboarding.paywall.trialSub')}
        </p>
      </div>

      {/* Feature list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FEATURES.map(f => (
          <div key={f.text} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: T.card, borderRadius: 16, padding: '14px 16px',
            border: `1px solid ${T.outline}`,
          }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{f.emoji}</span>
            <span style={{ fontSize: 14, color: T.inkV, lineHeight: 1.4 }}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryBtn label={t('onboarding.paywall.cta')} onClick={next} />
        <a
          href="/auth"
          style={{ textAlign: 'center', fontSize: 13, color: T.faint, padding: '4px 0', textDecoration: 'none', fontFamily: SANS }}
        >
          {t('onboarding.paywall.alreadyHave')} <span style={{ color: T.primary, fontWeight: 500 }}>{t('onboarding.paywall.signIn')}</span>
        </a>
      </div>
    </div>
  );
};

// ── SCREEN 9 — Account Creation ───────────────────────────────────────────────
const AccountScreen = ({
  name, setName, email, setEmail, password, setPassword,
  loading, error, onSubmit, onSkip, skipDisabled,
}: {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  loading: boolean; error: string; onSubmit: () => void; onSkip: () => void; skipDisabled?: boolean;
}) => {
  const oauthBrowserOpen = useRef(false);

  // Close SFSafariViewController when OAuth completes on native
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && oauthBrowserOpen.current) {
        oauthBrowserOpen.current = false;
        Browser.close().catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 52, padding: '0 16px',
    borderRadius: 14, border: `1.5px solid ${T.outline}`,
    background: '#FAFAF8', color: T.ink,
    fontSize: 15, fontFamily: SANS, outline: 'none',
    boxSizing: 'border-box',
  };

  const { t } = useTranslation();

  return (
    <div style={{ padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h2 style={{ fontFamily: LORA, fontSize: 26, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.2 }}>
          {t('onboarding.accountScreen.title')}
        </h2>
        <p style={{ fontSize: 14, color: T.faint, margin: 0 }}>{t('onboarding.accountScreen.sub')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input style={inputStyle} placeholder={t('onboarding.accountScreen.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" />
        <input style={inputStyle} placeholder={t('onboarding.accountScreen.emailPlaceholder')} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <input style={inputStyle} placeholder={t('onboarding.accountScreen.passwordPlaceholder')} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
      </div>

      {error && <p style={{ fontSize: 13, color: '#BA1A1A', margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryBtn
          label={loading ? t('onboarding.accountScreen.creating') : t('onboarding.accountScreen.cta')}
          onClick={onSubmit}
          disabled={loading || !name.trim() || !email.trim() || password.length < 8}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: T.outline }} />
          <span style={{ fontSize: 12, color: T.faint }}>or</span>
          <div style={{ flex: 1, height: 1, background: T.outline }} />
        </div>

        {/* Apple sign in */}
        <button
          onClick={async () => {
            if (Capacitor.isNativePlatform()) {
              try {
                const options: SignInWithAppleOptions = {
                  clientId: 'eazy.family.app',
                  redirectURI: 'https://jfztyhuagxruhawchfem.supabase.co/auth/v1/callback',
                  scopes: 'name email',
                };
                const result = await SignInWithApple.authorize(options);
                const idToken = result.response.identityToken;
                if (!idToken) throw new Error('No identity token received');
                const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken });
                if (error) throw error;
              } catch (err: any) {
                const code = err?.error ?? err?.message ?? '';
                if (code === 'canceled' || code.includes('AuthorizationError error 1001')) return;
                console.error('Apple sign-in error:', err);
                setAuthError('Apple sign-in failed. Please try again or use email/password.');
              }
            } else {
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/app` } });
              if (error) setAuthError('Apple sign-in unavailable. Please use email/password.');
            }
          }}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 9999,
            background: '#000', border: 'none', color: '#fff',
            fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: SANS,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49.1 191.4-49.1zM553.5 54.4c-21.2 23.7-58.6 42.8-91.3 42.8-3.9 0-7.7-.4-11.6-1-1.3-3.5-1.9-7.1-1.9-10.6 0-24.4 10.7-50.5 30.4-68.7 26.4-24.4 68-42.8 105-44.1 1.3 4.2 1.9 8.4 1.9 13.5 0 24.4-9.7 49.1-32.5 68.1z"/></svg>
          {t('onboarding.accountScreen.withApple')}
        </button>

        {/* Google sign in */}
        <button
          onClick={async () => {
            if (Capacitor.isNativePlatform()) {
              const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'eazy-family://app', skipBrowserRedirect: true } });
              if (error) { setAuthError('Google sign-in unavailable. Please use email/password.'); return; }
              if (data?.url) { oauthBrowserOpen.current = true; await Browser.open({ url: data.url, presentationStyle: 'popover' }); }
            } else {
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/app` } });
              if (error) setAuthError('Google sign-in unavailable. Please use email/password.');
            }
          }}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 9999,
            background: T.card, border: `1.5px solid ${T.outline}`, color: T.ink,
            fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: SANS,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 488 512"><path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>
          {t('onboarding.accountScreen.withGoogle')}
        </button>
      </div>

      <p style={{ fontSize: 13, color: T.faint, textAlign: 'center', margin: 0 }}>
        {t('onboarding.accountScreen.alreadyHave')}{' '}
        <a href="/auth" style={{ color: T.primary, textDecoration: 'none', fontWeight: 500 }}>{t('onboarding.accountScreen.signIn')}</a>
      </p>

      <button
        onClick={onSkip}
        disabled={skipDisabled}
        style={{ background: 'none', border: 'none', fontSize: 13, color: T.faint, cursor: skipDisabled ? 'default' : 'pointer', padding: '4px 0', textDecoration: 'underline', fontFamily: SANS, opacity: skipDisabled ? 0.6 : 1 }}
      >
        {skipDisabled ? t('onboarding.accountScreen.pleaseWait') : t('onboarding.accountScreen.skipAccount')}
      </button>
    </div>
  );
};

// ── SCREEN 10 — Location + Invite ─────────────────────────────────────────────
const LOCATIONS = ['Switzerland', 'United States', 'Germany', 'Italy', 'France', 'Brazil', 'Portugal', 'Spain', 'Other'];

const LocationInviteScreen = ({
  location, setLocation, onFinish,
}: {
  location: string; setLocation: (v: string) => void; onFinish: () => void;
}) => {
  const { t } = useTranslation();
  const [inviteInput, setInviteInput] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [showOther, setShowOther] = useState(false);

  const handleSend = () => {
    if (!inviteInput.trim()) return;
    const inviteUrl = 'https://eazy.family/onboarding';
    const message = `Hey! I'm using Eazy Family to keep our family organised. Join me here: ${inviteUrl}`;
    if (navigator.share) {
      navigator.share({ title: 'Join me on Eazy Family', text: message, url: inviteUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(message).catch(() => {});
    }
    setInviteSent(true);
    setInviteInput('');
    setTimeout(() => setInviteSent(false), 3000);
  };

  return (
  <div style={{ padding: '28px 24px 52px', display: 'flex', flexDirection: 'column', gap: 28 }}>
    {/* Two Orbe circles = invite visual */}
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: -16, paddingTop: 8 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, #E8956A, ${T.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, boxShadow: '0 4px 16px rgba(150,71,53,0.25)' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: SANS }}>You</span>
      </div>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.outline, border: `2px dashed ${T.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}>
        <span style={{ fontSize: 24, color: T.faint }}>+</span>
      </div>
    </div>

    <div>
      <h2 style={{ fontFamily: LORA, fontSize: 24, fontWeight: 400, color: T.ink, marginBottom: 6, lineHeight: 1.25, textAlign: 'center' }}>
        {t('onboarding.locationInvite.title')}
      </h2>
      <p style={{ fontSize: 14, color: T.faint, margin: 0, textAlign: 'center' }}>
        {t('onboarding.locationInvite.sub')}
      </p>
    </div>

    {/* Location */}
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.faint, marginBottom: 10 }}>{t('onboarding.locationInvite.countryLabel')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LOCATIONS.map(loc => {
          const isOther = loc === 'Other';
          const isActive = isOther ? showOther : location === loc;
          return (
            <button
              key={loc}
              onClick={() => {
                if (isOther) {
                  const next = !showOther;
                  setShowOther(next);
                  if (!next) setLocation('');
                } else {
                  setShowOther(false);
                  setLocation(loc === location ? '' : loc);
                }
              }}
              style={{
                padding: '8px 16px', borderRadius: 9999, fontSize: 13, cursor: 'pointer', fontFamily: SANS,
                border: `1.5px solid ${isActive ? T.primary : T.outline}`,
                background: isActive ? T.primaryS : T.card,
                color: isActive ? T.primary : T.inkV,
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isOther ? t('onboarding.locationInvite.other') : loc}
            </button>
          );
        })}
      </div>
      {showOther && (
        <input
          autoFocus
          placeholder={t('onboarding.locationInvite.otherPlaceholder')}
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={{
            marginTop: 10, width: '100%', height: 44, padding: '0 14px', borderRadius: 12,
            border: `1.5px solid ${T.primary}`, background: '#FAFAF8',
            fontSize: 14, fontFamily: SANS, color: T.ink, outline: 'none', boxSizing: 'border-box',
          }}
        />
      )}
    </div>

    {/* Invite */}
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.faint, marginBottom: 10 }}>{t('onboarding.locationInvite.inviteTitle')}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={inviteInput}
          onChange={e => setInviteInput(e.target.value)}
          placeholder={t('onboarding.locationInvite.invitePlaceholder')}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          style={{
            flex: 1, height: 48, padding: '0 14px', borderRadius: 12,
            border: `1.5px solid ${T.outline}`, background: '#FAFAF8',
            fontSize: 14, fontFamily: SANS, color: T.ink, outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inviteInput.trim()}
          style={{
            height: 48, padding: '0 18px', borderRadius: 12, border: 'none',
            background: inviteInput.trim() ? T.primary : T.outline,
            color: '#fff', fontSize: 14, fontWeight: 500,
            cursor: inviteInput.trim() ? 'pointer' : 'default', fontFamily: SANS, whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
        >
          {inviteSent ? t('onboarding.locationInvite.inviteSent') : t('onboarding.locationInvite.inviteBtn')}
        </button>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      <PrimaryBtn label={t('onboarding.locationInvite.finish')} onClick={onFinish} />
      <button
        onClick={onFinish}
        style={{ background: 'none', border: 'none', fontSize: 13, color: T.faint, cursor: 'pointer', padding: '4px 0', fontFamily: SANS }}
      >
        {t('onboarding.locationInvite.skipInvite', 'I\'ll do this later')}
      </button>
    </div>
  </div>
  );
};

export default Onboarding;
