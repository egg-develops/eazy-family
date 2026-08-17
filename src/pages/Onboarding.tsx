import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cloudSet } from '@/lib/preferencesSync';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { GuidedCaptureScreen } from '@/components/onboarding/GuidedCapture';
import { registerPushToken } from '@/lib/pushNotifications';
import i18n from '@/i18n/config';
import { useTranslation } from 'react-i18next';
import { error as logError } from '@/lib/logger';

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
// 0:welcome  1:language  2:account  3:guided-capture  4:notifications  5:invite
const SCREEN_ORDER = [2, 3, 4, 5];
const VALID_SCREENS = [0, 1, 2, 3, 4, 5];

const progressFor = (screen: number) => {
  const idx = SCREEN_ORDER.indexOf(screen);
  return idx >= 0 ? (idx + 1) / SCREEN_ORDER.length : null;
};

// ── State ─────────────────────────────────────────────────────────────────────
interface OBState {
  language: string;
}
const EMPTY: OBState = { language: '' };
const STORAGE_KEY = 'eazy-onboarding-v2';

const load = (): { screen: number; state: OBState } => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      // Discard saved screens from old flow (6-10 are gone)
      if (VALID_SCREENS.includes(parsed.screen)) return parsed;
    }
  } catch {}
  return { screen: 0, state: EMPTY };
};

const save = (screen: number, state: OBState) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen, state }));

// ── Shared components ─────────────────────────────────────────────────────────
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

  const initialLang = (i18n.language || '').split('-')[0];
  const saved = searchParams.get('fresh')
    ? { screen: 0, state: { ...EMPTY, language: initialLang } }
    : load();

  const [screen, setScreen] = useState(saved.screen);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [state, setState] = useState<OBState>(saved.state);
  const [animKey, setAnimKey] = useState(0);

  // Account screen local state
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);
  const [authError, setAuthError] = useState('');

  const { t } = useTranslation();

  useEffect(() => { save(screen, state); }, [screen, state]);

  // Keep the onboarding flag alive so the auth guard never fires mid-flow
  useEffect(() => {
    if (!user) localStorage.setItem('eazy-needs-onboarding', '1');
  }, [user]);

  const go = useCallback((n: number, direction: 'fwd' | 'back' = 'fwd') => {
    setDir(direction);
    setAnimKey(k => k + 1);
    setScreen(n);
  }, []);

  const set = <K extends keyof OBState>(k: K, v: OBState[K]) =>
    setState(prev => ({ ...prev, [k]: v }));

  // When OAuth completes while on the account screen, advance to guided capture
  useEffect(() => {
    if (screen !== 2 || !user) return;
    const name = (user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0] || 'User';
    localStorage.setItem('eazy-family-onboarding', JSON.stringify({
      userName: name,
      language: state.language,
      userInitials: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'EF',
    }));
    localStorage.removeItem(STORAGE_KEY);
    go(3, 'fwd');
  }, [screen, user]);

  if (!authLoading && user && !localStorage.getItem('eazy-needs-onboarding')) return <Navigate to="/app" replace />;

  // ── Account creation via email ─────────────────────────────────────────────
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
      localStorage.setItem('eazy-family-onboarding', JSON.stringify({
        userName: authName.trim(),
        language: state.language,
        userInitials: authName.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'EF',
      }));
      localStorage.removeItem(STORAGE_KEY);
      go(3, 'fwd');
    } catch {
      setAuthError('Something went wrong. Please try again.');
    } finally {
      setAuthLoading2(false);
    }
  };

  // ── Finish onboarding ──────────────────────────────────────────────────────
  const finish = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('eazy-needs-onboarding');
    localStorage.setItem('eazy-show-upgrade', '1');
    navigate('/app', { replace: true });
  };

  // After guided capture: go to notifications on native, invite on web
  const afterCapture = () => {
    if (Capacitor.isNativePlatform()) go(4, 'fwd');
    else go(5, 'fwd');
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const back = useCallback(() => {
    if (screen <= 0) return;
    go(screen - 1, 'back');
  }, [screen, go]);

  // Only show back on pre-auth screens to avoid going back into the account screen
  // when already signed in (which would re-trigger the OAuth useEffect)
  const showBack = screen >= 1 && !user;

  const progress = progressFor(screen);

  const slideAnim = (screen <= 2)
    ? 'ob-fade'
    : dir === 'fwd' ? 'ob-slide-in-right' : 'ob-slide-in-left';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: SANS,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes ob-slide-in-right { from { transform: translateX(100%); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
        @keyframes ob-slide-in-left  { from { transform: translateX(-100%); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
        @keyframes ob-fade { from { opacity: 0; } to { opacity: 1; } }
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
      {(showBack || (screen >= 2 && screen <= 5)) && (
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
          {/* Mini Orbe */}
          {screen >= 2 && screen <= 5 && (
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
        {screen === 0 && <WelcomeScreen next={() => go(1, 'fwd')} />}
        {screen === 1 && <LanguageScreen state={state} set={set} next={() => go(2, 'fwd')} />}
        {screen === 2 && (
          <AccountScreen
            name={authName} setName={setAuthName}
            email={authEmail} setEmail={setAuthEmail}
            password={authPassword} setPassword={setAuthPassword}
            loading={authLoading2} error={authError}
            onError={setAuthError}
            onSubmit={handleSignUp}
          />
        )}
        {screen === 3 && <GuidedCaptureScreen onComplete={afterCapture} onSkip={afterCapture} />}
        {screen === 4 && <NotificationsScreen onComplete={() => go(5, 'fwd')} onSkip={() => go(5, 'fwd')} />}
        {screen === 5 && <SimpleInviteScreen onFinish={finish} />}
      </div>
    </div>
  );
};

// ── SCREEN 0 — Welcome ────────────────────────────────────────────────────────
const WelcomeScreen = ({ next }: { next: () => void }) => {
  const { t } = useTranslation();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
      <div style={{ animation: 'ob-scale-in 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
        <OrbeMorphic size={200} />
      </div>
      <div style={{ marginTop: 36, animation: 'ob-fade 0.6s ease 0.3s both' }}>
        <p style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.faint, margin: '0 0 8px' }}>{t('onboarding.welcome.eyebrow')}</p>
        <h1 style={{ fontFamily: LORA, fontSize: 40, fontWeight: 400, color: T.ink, margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
          eazy<span style={{ color: T.primary }}>.</span>family
        </h1>
        <p style={{ fontSize: 16, color: T.ink, fontWeight: 500, margin: '0 0 10px', lineHeight: 1.4 }}>
          {t('onboarding.welcome.tagline')}
        </p>
        <p style={{ fontSize: 14, color: T.faint, margin: '0 0 40px', lineHeight: 1.6, maxWidth: 280 }}>
          {t('onboarding.welcome.subtitle')}
        </p>
        <button
          onClick={next}
          style={{
            padding: '15px 40px', borderRadius: 9999, border: 'none',
            background: T.primary, color: '#fff', fontFamily: SANS,
            fontSize: 16, fontWeight: 500, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(150,71,53,0.30)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {t('onboarding.getStarted')}
        </button>
      </div>
    </div>
  );
};

// ── SCREEN 1 — Language ───────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
];

const LanguageScreen = ({ state, set, next }: { state: OBState; set: any; next: () => void }) => {
  const { t } = useTranslation();
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
        <OrbeMorphic size={160} />
        <h1 style={{ fontFamily: LORA, fontSize: 36, fontWeight: 400, fontStyle: 'italic', color: T.ink, marginTop: 24, marginBottom: 6 }}>
          eazy<span style={{ color: T.primary }}>.</span>family
        </h1>
        <p style={{ fontSize: 14, color: T.faint, margin: 0 }}>{t('onboarding.language.title')}</p>
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

// ── SCREEN 2 — Account Creation ───────────────────────────────────────────────
const AccountScreen = ({
  name, setName, email, setEmail, password, setPassword,
  loading, error, onError, onSubmit,
}: {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  loading: boolean; error: string; onError: (msg: string) => void; onSubmit: () => void;
}) => {
  const oauthBrowserOpen = useRef(false);

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
                const rawNonce = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
                const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
                const hashedNonce = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
                const options: SignInWithAppleOptions = {
                  clientId: 'eazy.family.app',
                  redirectURI: 'https://jfztyhuagxruhawchfem.supabase.co/auth/v1/callback',
                  scopes: 'name email',
                  nonce: hashedNonce,
                };
                const result = await SignInWithApple.authorize(options);
                const idToken = result.response.identityToken;
                if (!idToken) throw new Error('No identity token received');
                const appleName = [result.response.givenName, result.response.familyName].filter(Boolean).join(' ').trim();
                const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken, nonce: rawNonce });
                if (error) throw error;
                if (appleName && data?.user) {
                  await supabase.from('profiles').upsert(
                    { user_id: data.user.id, email: data.user.email, full_name: appleName, display_name: appleName },
                    { onConflict: 'user_id' }
                  );
                }
              } catch (err: any) {
                const code = err?.error ?? err?.message ?? '';
                if (code === 'canceled' || code.includes('AuthorizationError error 1001')) return;
                logError('Apple sign-in error:', err);
                onError('Apple sign-in failed. Please try again or use email/password.');
              }
            } else {
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/app` } });
              if (error) onError('Apple sign-in unavailable. Please use email/password.');
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
              if (error) { onError('Google sign-in unavailable. Please use email/password.'); return; }
              if (data?.url) { oauthBrowserOpen.current = true; await Browser.open({ url: data.url, presentationStyle: 'popover' }); }
            } else {
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/app` } });
              if (error) onError('Google sign-in unavailable. Please use email/password.');
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
    </div>
  );
};

// ── SCREEN 4 — Notifications ──────────────────────────────────────────────────
const NotificationsScreen = ({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) => {
  const [requesting, setRequesting] = useState(false);
  const { t } = useTranslation();

  const handleEnable = async () => {
    setRequesting(true);
    try {
      await registerPushToken();
    } catch {}
    onComplete();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 32, textAlign: 'center' }}>
      {/* Bell visual */}
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${T.primaryL}55, ${T.primaryS})`,
        border: `1.5px solid ${T.outline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52,
      }}>
        🔔
      </div>

      <div>
        <h2 style={{ fontFamily: LORA, fontSize: 28, fontWeight: 400, color: T.ink, margin: '0 0 10px', lineHeight: 1.2 }}>
          {t('onboarding.notifications.title')}
        </h2>
        <p style={{ fontSize: 15, color: T.inkV, margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
          {t('onboarding.notifications.sub')}
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PrimaryBtn
          label={requesting ? t('onboarding.accountScreen.pleaseWait') : t('onboarding.notifications.cta')}
          onClick={handleEnable}
          disabled={requesting}
        />
        <button
          onClick={onSkip}
          style={{ background: 'none', border: 'none', fontSize: 14, color: T.faint, cursor: 'pointer', padding: '6px 0', fontFamily: SANS }}
        >
          {t('onboarding.notifications.skip')}
        </button>
      </div>
    </div>
  );
};

// ── SCREEN 5 — Invite ─────────────────────────────────────────────────────────
const SimpleInviteScreen = ({ onFinish }: { onFinish: () => void }) => {
  const { t } = useTranslation();
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = 'https://eazy.family';
    const msg = t('onboarding.simpleInvite.shareMessage', { url });
    try {
      await navigator.share?.({ title: 'Eazy Family', text: msg, url });
      setShared(true);
    } catch {
      try {
        await navigator.clipboard?.writeText(`${msg}`);
        setShared(true);
      } catch {}
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px 52px', gap: 28, textAlign: 'center' }}>
      {/* Two avatars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: -8 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `linear-gradient(135deg, ${T.primaryL}, ${T.primary})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: SANS,
          zIndex: 1, boxShadow: '0 4px 16px rgba(150,71,53,0.25)',
        }}>
          {t('onboarding.you')}
        </div>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.primaryS, zIndex: 2, marginLeft: -8, marginRight: -8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: T.primary, fontWeight: 700 }}>+</span>
        </div>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: T.card, border: `2px dashed ${T.outline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          👤
        </div>
      </div>

      <div>
        <h2 style={{ fontFamily: LORA, fontSize: 28, fontWeight: 400, color: T.ink, margin: '0 0 10px', lineHeight: 1.2 }}>
          {t('onboarding.simpleInvite.title')}
        </h2>
        <p style={{ fontSize: 15, color: T.inkV, margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
          {t('onboarding.simpleInvite.sub')}
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={handleShare}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 9999, border: 'none',
            background: shared ? T.secondary : T.primary, color: '#fff',
            fontFamily: SANS, fontSize: 15, fontWeight: 500, cursor: 'pointer',
            transition: 'background 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {shared ? '✓ ' : ''}{t('onboarding.simpleInvite.shareBtn')}
        </button>

        <button
          onClick={onFinish}
          style={{ background: 'none', border: 'none', fontSize: 14, color: T.faint, cursor: 'pointer', padding: '6px 0', fontFamily: SANS }}
        >
          {t('onboarding.simpleInvite.skip')}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
