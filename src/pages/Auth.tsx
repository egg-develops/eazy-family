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

  // Pre-fill referral code from URL params
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      setIsSignUp(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app');
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
      // Validate referral code if provided
      if (isSignUp && referralCode.trim() && !referralValid) {
        toast({ 
          title: "Invalid Referral Code", 
          description: "Please enter a valid referral code or leave it empty.", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

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
        if (msg.includes('already registered')) {
          toast({ title: t('auth.error'), description: t('auth.invalidCredentialsDesc'), variant: "destructive" });
        } else if (msg.includes('Invalid login credentials')) {
          toast({ title: t('auth.invalidCredentials'), description: t('auth.invalidCredentialsDesc'), variant: "destructive" });
        } else {
          toast({ title: t('auth.error'), description: msg, variant: "destructive" });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isSignUp ? t('auth.signUp') : t('auth.signIn')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('app.name')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('auth.namePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={100}
              />
            </div>

            {/* Referral Code */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="referral" className="flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  Referral Code (optional)
                </Label>
                <Input
                  id="referral"
                  type="text"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    validateReferralCode(e.target.value);
                  }}
                  maxLength={20}
                />
                {validatingReferral && referralCode && (
                  <p className="text-xs text-muted-foreground">Validating...</p>
                )}
                {referralValid && referralCode && !validatingReferral && (
                  <p className="text-xs text-green-600">✓ Valid referral code! You'll get 1 free month of Premium!</p>
                )}
                {!referralValid && referralCode && !validatingReferral && (
                  <p className="text-xs text-red-600">✗ Invalid referral code</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
