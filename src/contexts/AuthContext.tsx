import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { error as logError } from "@/lib/logger";
import { loadCloudPreferences, setPreferenceUserId, clearLocalPreferences } from "@/lib/preferencesSync";
import { syncWidgetToken, clearWidgetToken } from "@/plugins/widgetBridge";
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { configureRC, identifyRCUser, resetRCUser, getRCIsPremium, getRCIsTrial, getRCTrialDaysLeft } from '@/lib/revenuecat';


// Dev bypass - set to true to skip authentication
const DEV_BYPASS_AUTH = false;

const DEMO_USER: User = {
  id: 'demo-user-id',
  email: 'demo@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  subscriptionTier: string | null;
  isPremium: boolean;
  isTrial: boolean;
  trialDaysLeft: number | null;
  isGuest: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(DEV_BYPASS_AUTH ? DEMO_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(true); // default true; native overrides via RC
  const [isTrial, setIsTrial] = useState(true); // default trial; becomes false once RC confirms paid
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(DEV_BYPASS_AUTH ? false : true);
  const navigate = useNavigate();

  const fetchSubscriptionTier = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.subscription_tier) {
      setSubscriptionTier(data.subscription_tier);
    }
  };

  const refreshSubscription = async () => {
    if (DEV_BYPASS_AUTH) {
      setSubscriptionTier('family');
      return;
    }
    if (user?.id) {
      await fetchSubscriptionTier(user.id);
    }
    if (Capacitor.isNativePlatform()) {
      const [premium, trial, daysLeft] = await Promise.all([getRCIsPremium(), getRCIsTrial(), getRCTrialDaysLeft()]);
      setIsPremium(premium);
      setIsTrial(trial);
      setTrialDaysLeft(daysLeft);
    }
  };

  useEffect(() => {
    // For dev bypass, still try to fetch subscription from the first profile
    if (DEV_BYPASS_AUTH) {
      refreshSubscription();
      return;
    }

    // Configure RevenueCat early (before session resolves) so it's ready
    configureRC();

    // Re-check session when tab becomes visible (iOS Safari pauses JS timers, preventing token refresh)
    // Only update state if we actually get a valid response — don't null-out user on network errors
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
          if (error) return; // network error — keep current state
          if (session) {
            setSession(session);
            setUser(session.user);
            fetchSubscriptionTier(session.user.id);
            // Re-check RevenueCat entitlement so trial expirations that
            // occurred while the app was backgrounded are caught immediately.
            if (Capacitor.isNativePlatform()) {
              const [premium, trial, daysLeft] = await Promise.all([getRCIsPremium(), getRCIsTrial(), getRCTrialDaysLeft()]);
              setIsPremium(premium);
              setIsTrial(trial);
              setTrialDaysLeft(daysLeft);
            }
          } else {
            // Only sign out if we got a definitive null (not a network failure)
            setSession(null);
            setUser(null);
            setSubscriptionTier(null);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Backup: if no auth event fires within 3s, unblock loading anyway
    const fallback = setTimeout(() => setLoading(false), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(fallback);
        setLoading(false); // always unblock on any auth event

        if (event === 'INITIAL_SESSION') {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchSubscriptionTier(session.user.id);
            loadCloudPreferences(session.user.id);
            if (session.access_token) {
              syncWidgetToken(session.access_token, session.user.id);
            }
            if (Capacitor.isNativePlatform()) {
              await identifyRCUser(session.user.id);
              const [premium, trial, daysLeft] = await Promise.all([getRCIsPremium(), getRCIsTrial(), getRCTrialDaysLeft()]);
              setIsPremium(premium);
              setIsTrial(trial);
              setTrialDaysLeft(daysLeft);
            }
          }
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchSubscriptionTier(session.user.id);
          if (event === 'SIGNED_IN') {
            localStorage.setItem('eazy-has-signed-in', '1');
            loadCloudPreferences(session.user.id);
            if (session.access_token) {
              syncWidgetToken(session.access_token, session.user.id);
            }
            if (Capacitor.isNativePlatform()) {
              identifyRCUser(session.user.id).then(() =>
                Promise.all([getRCIsPremium(), getRCIsTrial(), getRCTrialDaysLeft()]).then(([premium, trial, daysLeft]) => {
                  setIsPremium(premium);
                  setIsTrial(trial);
                  setTrialDaysLeft(daysLeft);
                })
              );
            }
          }
        } else {
          setSubscriptionTier(null);
          setPreferenceUserId(null);
          if (event === 'SIGNED_OUT') {
            clearWidgetToken();
            if (Capacitor.isNativePlatform()) {
              resetRCUser().catch(() => {});
              setIsPremium(false);
              setIsTrial(true);
              setTrialDaysLeft(null);
            }
          }
        }

        // Create profile if it doesn't exist (atomic upsert to prevent race condition)
        if (session?.user && event === 'SIGNED_IN') {
          const fullName = session.user.user_metadata?.full_name;
          supabase.from('profiles').upsert(
            {
              user_id: session.user.id,
              email: session.user.email,
              full_name: fullName,
              display_name: fullName,
              share_email: false,
              share_phone: false,
            },
            { onConflict: 'user_id' }
          ).then(({ error }) => {
            if (error) {
              logError('Profile upsert failed', error.message);
            }
          });
        }
      }
    );

    // Handle OAuth deep-link callback on native
    let urlListener: { remove: () => void } | null = null;
    let stateListener: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {

      const handleDeepLink = async (url: string) => {
        const isRecovery = url.includes('type=recovery');

        if (url.includes('code=')) {
          // PKCE flow: exchange the auth code for a session
          try {
            const code = new URL(url).searchParams.get('code');
            if (code) await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            logError('OAuth deep link exchange failed', e);
          }
        } else if (url.includes('access_token')) {
          // Implicit flow fallback: parse tokens from hash fragment
          try {
            const hash = url.split('#')[1] ?? '';
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          } catch (e) {
            logError('OAuth implicit session restore failed', e);
          }
        }

        if (isRecovery) {
          navigate('/auth/reset-password', { replace: true });
        } else if (url.includes('code=') || url.includes('access_token')) {
          navigate('/app', { replace: true });
        }
      };

      // Warm-start: app already running when deep link fires
      CapApp.addListener('appUrlOpen', ({ url }) => handleDeepLink(url))
        .then(h => { urlListener = h; });

      // Cold-start: app was killed and launched directly from the deep link intent
      CapApp.getLaunchUrl().then(result => {
        if (result?.url) handleDeepLink(result.url);
      });

      // Refresh session when app returns to foreground after being killed/suspended —
      // WKWebView doesn't always fire visibilitychange reliably on iPadOS
      CapApp.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) return;
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) return;
        if (session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
      }).then(h => { stateListener = h; });
    }

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      urlListener?.remove();
      stateListener?.remove();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://eazy.family/auth',
        data: {
          full_name: fullName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      localStorage.setItem('eazy-has-signed-in', '1');
      navigate('/app');
    }

    return { error };
  };

  const signOut = async () => {
    clearLocalPreferences();
    await supabase.auth.signOut();
    setSubscriptionTier(null);
    navigate(Capacitor.isNativePlatform() ? '/auth' : '/');
  };

  const isGuest = !!user && !user.email;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      subscriptionTier,
      isPremium,
      isTrial,
      trialDaysLeft,
      isGuest,
      signUp,
      signIn,
      signOut,
      refreshSubscription,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
