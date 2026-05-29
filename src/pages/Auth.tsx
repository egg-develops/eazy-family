import { useState, useEffect } from 'react';
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
  // On native, default to sign-up — new installs are almost always new users.
  // Returning users can tap "Already have an account" to switch to sign-in.
  const hasExistingSession = !!localStorage.getItem('eazy-family-language') ||
    !!localStorage.getItem('eazy-family-onboarding');
  const [isSignUp, setIsSignUp] = useState(
    Capacitor.isNativePlatform() && !hasExistingSession
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://eazy.family/auth/reset-password',
      });
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
        toast({ title: t('common.success'), description: t('auth.signUpSuccess') });
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
                  className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${TC}, ${TL})` }}>
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
              className="w-full h-12 rounded-xl text-white font-semibold text-sm mt-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${TC}, ${TL})` }}>
              {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </button>
          </form>

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
