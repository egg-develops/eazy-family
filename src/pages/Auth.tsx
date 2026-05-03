import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { error as logError } from '@/lib/logger';
import { z } from 'zod';
import { Gift } from 'lucide-react';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
  fullName: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100).optional(),
});

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
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

  // Pre-fill referral code from URL params; open sign-up mode if ?signup=true
  useEffect(() => {
    const ref = searchParams.get('ref');
    const signup = searchParams.get('signup');
    if (ref) {
      setReferralCode(ref);
      setIsSignUp(true);
    } else if (signup === 'true') {
      setIsSignUp(true);
      // Pre-fill name from onboarding data if available
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

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/splash');
    }
  }, [user, authLoading, navigate]);

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralValid(false);
      return;
    }

    setValidatingReferral(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', code.trim())
        .single();

      if (error || !data) {
        setReferralValid(false);
      } else {
        setReferralValid(true);
      }
    } catch (error) {
      logError('Referral validation error:', error);
      setReferralValid(false);
    } finally {
      setValidatingReferral(false);
    }
  };

  // Process referral after successful signup
  const processReferral = async (newUserId: string) => {
    if (!referralCode.trim() || !referralValid) return;
    
    try {
      // Find the referrer by referral code
      const { data: referrer } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referralCode.trim())
        .single();

      if (referrer) {
        // Create referral record
        await supabase.from('referrals').insert({
          referrer_user_id: referrer.user_id,
          referred_user_id: newUserId,
          referral_code: referralCode.trim(),
          status: 'completed',
        });

        toast({
          title: "🎁 Referral Applied!",
          description: "You and your friend both get 1 free month of Premium!",
        });
      }
    } catch (error) {
      logError('Referral processing error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If referral code provided but invalid, just clear it and continue

      const validatedData = authSchema.parse({
        email,
        password,
        fullName: isSignUp ? fullName : undefined,
      });

      let error;
      if (isSignUp) {
        const result = await signUp(validatedData.email, validatedData.password, validatedData.fullName);
        error = result.error;
        
        // Process referral on successful signup
        if (!error && referralCode.trim() && referralValid) {
          // We'll process after user confirms email and signs in
          localStorage.setItem('pending-referral-code', referralCode.trim());
        }
      } else {
        const result = await signIn(validatedData.email, validatedData.password);
        error = result.error;

        // Process any pending referral after sign-in
        if (!error) {
          const pendingRef = localStorage.getItem('pending-referral-code');
          if (pendingRef) {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              await processReferral(currentUser.id);
              localStorage.removeItem('pending-referral-code');
            }
          }
        }
      }

      if (error) {
        const msg = (error as any)?.message || '';
        if (msg.includes('already registered') || msg.includes('User already registered')) {
          toast({ title: "Account already exists", description: "An account with this email already exists. Try signing in instead.", variant: "destructive" });
          setIsSignUp(false);
        } else if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          toast({ title: "Incorrect email or password", description: "Please check your credentials and try again.", variant: "destructive" });
        } else if (msg.includes('Email not confirmed')) {
          toast({ title: "Check your email", description: "Please click the confirmation link we sent you before signing in.", variant: "destructive" });
        } else {
          toast({ title: t('auth.error'), description: msg || "Something went wrong. Please try again.", variant: "destructive" });
        }
      } else if (isSignUp) {
        toast({ title: t('common.success'), description: "Check your email to confirm your account." });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: t('auth.error'), description: error.issues[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(270 62% 7%), hsl(280 55% 11%))" }}>

      {/* Glow blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(290 80% 55%), transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Eazy.Family" className="w-20 h-20 mx-auto mb-4 drop-shadow-2xl"
            style={{ filter: "drop-shadow(0 0 24px hsl(270 88% 64% / 0.6))" }} />
          <h1 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "hsl(270 40% 68%)" }}>
            {isSignUp ? "Join Eazy.Family for free" : "Sign in to Eazy.Family"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: "hsl(270 50% 12% / 0.9)", border: "1px solid hsl(270 40% 22%)", backdropFilter: "blur(12px)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" style={{ color: "hsl(270 40% 80%)" }}>{t('auth.fullName')}</Label>
                <Input id="fullName" type="text" placeholder={t('auth.namePlaceholder')}
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  required maxLength={100}
                  className="h-11 rounded-xl border-0 text-sm"
                  style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: "hsl(270 40% 80%)" }}>{t('auth.email')}</Label>
              <Input id="email" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required maxLength={255}
                className="h-11 rounded-xl border-0 text-sm"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" style={{ color: "hsl(270 40% 80%)" }}>{t('auth.password')}</Label>
              <Input id="password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} maxLength={100}
                className="h-11 rounded-xl border-0 text-sm"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }} />
            </div>

            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="referral" className="flex items-center gap-1.5" style={{ color: "hsl(270 40% 80%)" }}>
                  <Gift className="w-3.5 h-3.5" /> Referral Code (optional)
                </Label>
                <Input id="referral" type="text" placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => { setReferralCode(e.target.value); validateReferralCode(e.target.value); }}
                  maxLength={20}
                  className="h-11 rounded-xl border-0 text-sm"
                  style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }} />
                {validatingReferral && referralCode && (
                  <p className="text-xs" style={{ color: "hsl(270 40% 68%)" }}>Validating...</p>
                )}
                {referralValid && referralCode && !validatingReferral && (
                  <p className="text-xs" style={{ color: "hsl(142 70% 60%)" }}>✓ Valid! You'll get 1 free month of Premium</p>
                )}
                {!referralValid && referralCode && !validatingReferral && (
                  <p className="text-xs text-red-400">✗ Invalid referral code</p>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl text-white font-semibold border-0 mt-2 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
              {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </Button>
          </form>

          <div className="text-center pt-1">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: "hsl(262 80% 78%)" }}>
              {isSignUp
                ? <>Already have an account? <span className="font-semibold">Sign in</span></>
                : <>Don't have an account? <span className="font-semibold">Sign up free</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
