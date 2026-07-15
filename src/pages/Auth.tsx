import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { error as logError } from '@/lib/logger';
import { z } from 'zod';
import { Gift } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';

const TC = '#964735';
const TL = '#D97B66';
const BG = '#F7F3ED';
const CARD = '#FFFFFF';
const BORDER = '#DAC1BB';
const INPUT_BG = '#FAF7F3';
const INK = '#1C1C18';
const MUTED = '#7A6660';
const DIVIDER = '#F1EDE7';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
  fullName: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100).optional(),
});

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  // On native, default to sign-up for first-time installs, sign-in for returning users.
  // eazy-has-signed-in is written on first successful sign-in and never cleared,
  // so it survives sign-out (unlike language/onboarding which clearLocalPreferences removes).
  const hasSignedInBefore = !!localStorage.getItem('eazy-has-signed-in');
  const [isSignUp, setIsSignUp] = useState(
    Capacitor.isNativePlatform() && !hasSignedInBefore
  );
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState(false);
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const ref = searchParams.get('ref');
    const signup = searchParams.get('signup');
    if (ref) {
      setReferralCode(ref);
      setIsSignUp(true);
    } else if (signup === 'true') {
      setIsSignUp(true);
      try {
        const saved = localStorage.getItem('eazy-family-onboarding');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.userName && parsed.userName !== 'User') {
            setFullName(parsed.userName);
          }
        }
      } catch {}
    }
  }, [searchParams]);

  // Close the in-app browser when a native OAuth (Google) round-trip completes.
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

  // Continue with Apple — native uses an identity token + nonce (Supabase validates
  // the nonce: SHA-256 hash to Apple, raw value to the token exchange). Mirrors the
  // working flow in Onboarding so returning Apple users can sign back in here too.
  const handleAppleSignIn = async () => {
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
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken, nonce: rawNonce });
        if (error) throw error;
      } catch (err: any) {
        const code = err?.error ?? err?.message ?? '';
        if (code === 'canceled' || code.includes('AuthorizationError error 1001')) return;
        logError('Apple sign-in error:', err);
        toast({ title: t('auth.error'), description: t('auth.somethingWrong'), variant: 'destructive' });
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/app` } });
      if (error) toast({ title: t('auth.error'), description: t('auth.somethingWrong'), variant: 'destructive' });
    }
  };

  const handleGoogleSignIn = async () => {
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'eazy-family://app', skipBrowserRedirect: true } });
      if (error) { toast({ title: t('auth.error'), description: t('auth.somethingWrong'), variant: 'destructive' }); return; }
      if (data?.url) { oauthBrowserOpen.current = true; await Browser.open({ url: data.url, presentationStyle: 'popover' }); }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/app` } });
      if (error) toast({ title: t('auth.error'), description: t('auth.somethingWrong'), variant: 'destructive' });
    }
  };

  if (!authLoading && user) return <Navigate to="/app" replace />;

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) { setReferralValid(false); return; }
    setValidatingReferral(true);
    try {
      const { data, error } = await supabase
        .from('profiles').select('user_id').eq('referral_code', code.trim()).single();
      setReferralValid(!error && !!data);
    } catch (error) {
      logError('Referral validation error:', error);
      setReferralValid(false);
    } finally {
      setValidatingReferral(false);
    }
  };

  const processReferral = async (newUserId: string) => {
    if (!referralCode.trim() || !referralValid) return;
    try {
      const { data: referrer } = await supabase
        .from('profiles').select('user_id').eq('referral_code', referralCode.trim()).single();
      if (referrer) {
        await supabase.from('referrals').insert({
          referrer_user_id: referrer.user_id,
          referred_user_id: newUserId,
          referral_code: referralCode.trim(),
          status: 'completed',
        });
        toast({ title: t('auth.referralApplied'), description: t('auth.referralAppliedDesc') });
      }
    } catch (error) {
      logError('Referral processing error:', error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast({ title: t('auth.emailFirst'), variant: "destructive" }); return; }
    setLoading(true);
    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'eazy-family://auth/reset-password'
        : 'https://eazy.family/auth/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      toast({ title: t('auth.resetFailed'), description: err?.message || t('auth.somethingWrong'), variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validatedData = authSchema.parse({
        email, password,
        fullName: isSignUp ? fullName : undefined,
      });

      let error;
      if (isSignUp) {
        const result = await signUp(validatedData.email, validatedData.password, validatedData.fullName);
        error = result.error;
        if (!error && referralCode.trim() && referralValid) {
          localStorage.setItem('pending-referral-code', referralCode.trim());
        }
      } else {
        const result = await signIn(validatedData.email, validatedData.password);
        error = result.error;
        if (!error) {
          const pendingRef = localStorage.getItem('pending-referral-code');
          if (pendingRef) {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              await processReferral(currentUser.id);
              localStorage.removeItem('pending-referral-code');
            }
          }
          // Redirect to join family if an invite link was opened before sign-in
          const pendingInvite = localStorage.getItem('pending-invite-code');
          if (pendingInvite) {
            navigate(`/join-family?code=${pendingInvite}`);
            return;
          }
        }
      }

      if (error) {
        const msg = (error as any)?.message || '';
        if (msg.includes('already registered') || msg.includes('User already registered')) {
          toast({ title: t('auth.accountExists'), description: t('auth.accountExistsDesc'), variant: "destructive" });
          setIsSignUp(false);
        } else if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          toast({ title: t('auth.incorrectCredentials'), description: t('auth.incorrectCredentialsDesc'), variant: "destructive" });
        } else if (msg.includes('Email not confirmed')) {
          toast({ title: t('auth.checkEmail'), description: t('auth.checkEmailDesc'), variant: "destructive" });
        } else {
          toast({ title: t('auth.error'), description: msg || t('auth.somethingWrong'), variant: "destructive" });
        }
      } else if (isSignUp) {
        // If they arrived via a family invite link, complete the join instead of
        // dropping them into solo onboarding — otherwise the pending code is lost
        // and the new member never joins the family (or inherits its subscription).
        const pendingInvite = localStorage.getItem('pending-invite-code');
        if (pendingInvite) {
          navigate(`/join-family?code=${pendingInvite}`);
          return;
        }
        localStorage.setItem('eazy-needs-onboarding', '1');
        navigate('/onboarding');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: t('auth.error'), description: error.issues[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: INPUT_BG,
    border: `1px solid ${BORDER}`,
    color: INK,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: BG }}>

      {/* Soft background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #DAC1BB, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D97B66, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Eazy.Family" className="w-20 h-20 mx-auto mb-4"
            style={{ filter: "drop-shadow(0 4px 16px rgb(150 71 53 / 0.2))" }} />
          <h1 className="text-2xl font-bold" style={{ color: INK }}>
            {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
          </h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            {isSignUp ? t('auth.joinFree') : t('auth.signInSubtitle')}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}>

          {/* Forgot password mode */}
          {isForgotPassword && (
            resetSent ? (
              <div className="text-center space-y-3 py-2">
                <p className="text-2xl">📬</p>
                <p className="font-semibold text-sm" style={{ color: INK }}>{t('auth.resetInboxTitle')}</p>
                <p className="text-sm" style={{ color: MUTED }}>{t('auth.resetInboxDesc')} <strong>{email}</strong></p>
                <button type="button" onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                  className="w-full h-11 rounded-xl font-semibold text-sm mt-2"
                  style={{ background: `linear-gradient(135deg, ${TC}, ${TL})`, color: '#fff' }}>
                  {t('auth.backToSignIn')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm" style={{ color: MUTED }}>{t('auth.resetPrompt')}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-sm font-medium" style={{ color: INK }}>{t('auth.email')}</Label>
                  <Input id="reset-email" type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required maxLength={255}
                    className="h-11 rounded-xl text-sm"
                    style={inputStyle} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${TC}, ${TL})` }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t('auth.sending') : t('auth.sendResetLink')}
                </button>
                <div className="pt-1" style={{ borderTop: `1px solid ${DIVIDER}` }}>
                  <button type="button" onClick={() => setIsForgotPassword(false)}
                    className="w-full text-center text-sm pt-3 hover:opacity-80 transition-opacity"
                    style={{ color: MUTED }}>
                    {t('auth.backToSignIn')}
                  </button>
                </div>
              </form>
            )
          )}

          {!isForgotPassword && (
          <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium" style={{ color: INK }}>{t('auth.fullName')}</Label>
                <Input id="fullName" type="text" placeholder={t('auth.namePlaceholder')}
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  required maxLength={100}
                  className="h-11 rounded-xl text-sm"
                  style={inputStyle} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: INK }}>{t('auth.email')}</Label>
              <Input id="email" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required maxLength={255}
                className="h-11 rounded-xl text-sm"
                style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: INK }}>{t('auth.password')}</Label>
              <Input id="password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} maxLength={100}
                className="h-11 rounded-xl text-sm"
                style={inputStyle} />
            </div>

            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="referral" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: INK }}>
                  <Gift className="w-3.5 h-3.5" style={{ color: TC }} /> {t('auth.referralCode')}
                  <span style={{ color: MUTED }} className="font-normal">({t('auth.referralOptional')})</span>
                </Label>
                <Input id="referral" type="text" placeholder={t('auth.referralPlaceholder')}
                  value={referralCode}
                  onChange={(e) => { setReferralCode(e.target.value); validateReferralCode(e.target.value); }}
                  maxLength={20}
                  className="h-11 rounded-xl text-sm"
                  style={inputStyle} />
                {referralCode && (
                  <p className="text-xs" style={{ color: referralValid ? '#44664F' : MUTED }}>
                    {validatingReferral ? t('auth.referralChecking') : referralValid ? t('auth.referralValid') : t('auth.referralNotFound')}
                  </p>
                )}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm mt-2 transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${TC}, ${TL})` }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </button>
          </form>

          {/* Social sign-in */}
          <div className="flex items-center gap-2.5 py-1">
            <div className="flex-1 h-px" style={{ background: BORDER }} />
            <span className="text-xs" style={{ color: MUTED }}>{t('auth.or', 'or')}</span>
            <div className="flex-1 h-px" style={{ background: BORDER }} />
          </div>

          <div className="space-y-2.5">
            <button type="button" onClick={handleAppleSignIn}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: '#000', color: '#fff' }}>
              <svg width="16" height="16" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49.1 191.4-49.1zM553.5 54.4c-21.2 23.7-58.6 42.8-91.3 42.8-3.9 0-7.7-.4-11.6-1-1.3-3.5-1.9-7.1-1.9-10.6 0-24.4 10.7-50.5 30.4-68.7 26.4-24.4 68-42.8 105-44.1 1.3 4.2 1.9 8.4 1.9 13.5 0 24.4-9.7 49.1-32.5 68.1z"/></svg>
              {t('onboarding.accountScreen.withApple')}
            </button>
            <button type="button" onClick={handleGoogleSignIn}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: CARD, color: INK, border: `1.5px solid ${BORDER}` }}>
              <svg width="16" height="16" viewBox="0 0 488 512"><path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>
              {t('onboarding.accountScreen.withGoogle')}
            </button>
          </div>

          <div className="pt-1 space-y-2" style={{ borderTop: `1px solid ${DIVIDER}` }}>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-sm pt-3 hover:opacity-80 transition-opacity"
              style={{ color: MUTED }}>
              {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
            </button>
            {!isSignUp && (
              <button type="button" onClick={() => setIsForgotPassword(true)}
                className="w-full text-center text-sm hover:opacity-80 transition-opacity pb-1"
                style={{ color: MUTED }}>
                {t('auth.forgotPassword')}
              </button>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
