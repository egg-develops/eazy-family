import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { error as logError } from "@/lib/logger";
import { loadCloudPreferences, setPreferenceUserId } from "@/lib/preferencesSync";


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
  const [loading, setLoading] = useState(DEV_BYPASS_AUTH ? false : true);
  const navigate = useNavigate();

  const isPremium = subscriptionTier === 'family' || subscriptionTier === 'premium';

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
      // In dev mode, set premium tier for testing
      setSubscriptionTier('family');
      return;
    }
    
    if (user?.id) {
      await fetchSubscriptionTier(user.id);
    }
  };

  useEffect(() => {
    // For dev bypass, still try to fetch subscription from the first profile
    if (DEV_BYPASS_AUTH) {
      refreshSubscription();
      return;
    }

    // Check for existing session FIRST
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSubscriptionTier(session.user.id);
        loadCloudPreferences(session.user.id);
      }
      setLoading(false);
    });

    // Re-check session when tab becomes visible (iOS Safari pauses JS timers, preventing token refresh)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) fetchSubscriptionTier(session.user.id);
          else setSubscriptionTier(null);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchSubscriptionTier(session.user.id);
          if (event === 'SIGNED_IN') loadCloudPreferences(session.user.id);
        } else {
          setSubscriptionTier(null);
          setPreferenceUserId(null);
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

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
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
      navigate('/app');
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscriptionTier(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      subscriptionTier, 
      isPremium, 
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
