import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { error as logError } from "@/lib/logger";
import { identifyUser, resetAnalytics } from "@/lib/analytics";
import { loadCloudPreferences, setPreferenceUserId, clearLocalPreferences, clearAllLocalUserData } from "@/lib/preferencesSync";

// Wipe the previous account's local data when a DIFFERENT user appears on this
// device/browser. Prevents cross-account bleed (journal, rituals, calendar,
// channel messages were all unscoped localStorage). Must run BEFORE we hydrate
// the new user's cloud preferences. Returns nothing; updates the boundary marker.
function enforceUserBoundary(userId: string) {
  try {
    const prev = localStorage.getItem('eazy-last-user-id');
    if (prev && prev !== userId) clearAllLocalUserData();
    localStorage.setItem('eazy-last-user-id', userId);
  } catch {
    // best-effort
  }
}
import { syncWidgetToken, clearWidgetToken } from "@/plugins/widgetBridge";
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { configureRC, identifyRCUser, resetRCUser, getRCIsPremium, getRCIsTrial, getRCTrialDaysLeft, getRCPremiumUntil } from '@/lib/revenuecat';


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

  const refreshNativeSubscriptionState = async (userId?: string) => {
    const [premium, trial, daysLeft] = await Promise.all([getRCIsPremium(), getRCIsTrial(), getRCTrialDaysLeft()]);

    let uid = userId;
    if (!uid) {
      try { uid = (await supabase.auth.getUser()).data.user?.id; } catch { /* ignore */ }
    }

    // Family premium sharing: sync THIS user's real entitlement expiry to the
    // server (client is authoritative — the RC webhook is unreliable), then, if
    // this user isn't individually premium, check whether any active member of
    // their family is currently paying and, if so, grant premium.
    let familyPremium = false;
    if (uid) {
      try {
        const until = premium ? await getRCPremiumUntil() : null;
        await supabase.rpc('set_my_premium_until', { _until: until ? until.toISOString() : null });
      } catch (e) { logError('[premium] set_my_premium_until failed:', e); }
      if (!premium) {
        try {
          const { data } = await supabase.rpc('family_has_active_premium', { _user_id: uid });
          familyPremium = data === true;
        } catch (e) { logError('[premium] family_has_active_premium failed:', e); }
      }
    }

    setIsPremium(premium || familyPremium);
    // A family-granted member has full access, not their own trial.
    setIsTrial(premium ? trial : (familyPremium ? false : trial));
    setTrialDaysLeft(daysLeft);
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
      await refreshNativeSubscriptionState(user?.id);
    }
  };

  useEffect(() => {
    // For dev bypass, still try to fetch subscription from the first profile
    if (DEV_BYPASS_AUTH) {
      refreshSubscription();
      return;
    }

    // Configure RevenueCat early. Store the promise so auth handlers can
    // await it before calling identifyRCUser — calling logIn() on an
    // unconfigured SDK causes getOfferings() to hang indefinitely.
    const rcReady = configureRC().catch(err => logError('[RC] configureRC failed:', err));

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
              await refreshNativeSubscriptionState(session.user.id);
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
            enforceUserBoundary(session.user.id);
            fetchSubscriptionTier(session.user.id);
            loadCloudPreferences(session.user.id);
            if (session.access_token) {
              syncWidgetToken(session.access_token, session.user.id);
            }
            if (Capacitor.isNativePlatform()) {
              await rcReady; // ensure configure() has completed before logIn()
              await identifyRCUser(session.user.id);
              await refreshNativeSubscriptionState(session.user.id);
            }
          }
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchSubscriptionTier(session.user.id);
          if (event === 'SIGNED_IN') {
            enforceUserBoundary(session.user.id);
            identifyUser(session.user.id);
            localStorage.setItem('eazy-has-signed-in', '1');
            loadCloudPreferences(session.user.id);
            if (session.access_token) {
              syncWidgetToken(session.access_token, session.user.id);
            }
            if (Capacitor.isNativePlatform()) {
              rcReady
                .then(() => identifyRCUser(session.user.id))
                .then(() => refreshNativeSubscriptionState(session.user.id));
            }
          }
        } else {
          setSubscriptionTier(null);
          setPreferenceUserId(null);
          if (event === 'SIGNED_OUT') {
            clearWidgetToken();
            resetAnalytics();
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
            // Create-only: don't overwrite an existing profile on every sign-in
            // (that reset display_name / share_email / share_phone customizations).
            { onConflict: 'user_id', ignoreDuplicates: true }
          ).then(({ error }) => {
            if (error) {
              logError('Profile upsert failed', error.message);
            }
            // Auto-provision a family so the family features work out of the box.
            // Idempotent; skip while the user is joining an existing family via an
            // invite link (that flow creates the membership itself).
            if (!localStorage.getItem('pending-invite-code')) {
              supabase.rpc('ensure_user_has_family').then(({ error: famErr }) => {
                if (famErr) logError('ensure_user_has_family failed', famErr.message);
              });
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
        }
        // No explicit navigate for OAuth success — let onAuthStateChange update user
        // state first, then Onboarding/Auth components redirect naturally (avoids
        // ProtectedRoute seeing stale user=null before React flushes the state update)
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
          await fetchSubscriptionTier(session.user.id);
          await rcReady;
          await refreshNativeSubscriptionState();
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
