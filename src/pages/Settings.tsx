import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Bell, LogOut, RefreshCw, Crown, Shield, Lock, Moon, Sun, Mail, MessageCircle, Loader2, Check, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReferralSystem } from "@/components/ReferralSystem";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { validateImageFile } from "@/lib/fileValidation";
import { compressAndUpload, deleteStorageFile } from "@/lib/imageUpload";
import { error as logError } from "@/lib/logger";

interface HomeConfig {
  greeting: string;
  byline: string;
  showCalendar: boolean;
  showWeather: boolean;
  showGreeting: boolean;
  topNotifications: string[];
  quickActions: string[];
  iconImage?: string;
  headerImage?: string;
  headerImages?: string[];
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { signOut, user } = useAuth();
  const [language, setLanguage] = useState(localStorage.getItem('eazy-family-language') || 'en');

  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    try {
      const saved = localStorage.getItem('eazy-family-home-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          topNotifications: parsed.topNotifications || [],
          quickActions: parsed.quickActions || [],
        };
      }
    } catch {
      localStorage.removeItem('eazy-family-home-config');
    }
    return {
      greeting: "Good morning! ☀️",
      byline: "Let's make today amazing",
      showCalendar: true,
      showWeather: true,
      showGreeting: true,
      topNotifications: ["Upcoming Events"],
      quickActions: ["Find Events"],
      iconImage: undefined,
      headerImage: undefined,
    };
  });

  const [editingGreeting, setEditingGreeting] = useState(homeConfig.greeting);
  const [editingByline, setEditingByline] = useState(homeConfig.byline);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  // Journal display settings
  const [journalSettings, setJournalSettings] = useState<{ showOnRituals: boolean; displayCount: number }>(() => {
    try {
      const s = localStorage.getItem('eazy-journal-settings');
      if (s) return JSON.parse(s);
    } catch {}
    return { showOnRituals: true, displayCount: 3 };
  });
  const saveJournalSettings = (next: { showOnRituals: boolean; displayCount: number }) => {
    setJournalSettings(next);
    localStorage.setItem('eazy-journal-settings', JSON.stringify(next));
  };
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const { setTheme, isDark } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [googleSynced, setGoogleSynced] = useState(() => localStorage.getItem('eazy-google-calendar-synced') === 'true');
  const [outlookSynced, setOutlookSynced] = useState(() => localStorage.getItem('eazy-outlook-calendar-synced') === 'true');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Privacy settings state
  const [displayName, setDisplayName] = useState("");
  const [shareEmail, setShareEmail] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('user_id', user.id)
            .single();

          if (data) {
            setSubscriptionTier(data.subscription_tier || 'free');
          }
        }
      } catch (error) {
        logError('Error fetching subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, []);

  useEffect(() => {
    const loadPrivacySettings = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, share_email, share_phone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setDisplayName(data.display_name || "");
          setShareEmail(data.share_email ?? false);
          setSharePhone(data.share_phone ?? false);
        }
      } catch (error) {
        logError("Error loading privacy settings:", error);
      } finally {
        setLoadingPrivacy(false);
      }
    };
    loadPrivacySettings();
  }, [user]);

  // Re-hydrate state when cloud preferences arrive
  useEffect(() => {
    const handler = () => {
      const lang = localStorage.getItem('eazy-family-language');
      if (lang) { setLanguage(lang); i18n.changeLanguage(lang); }
      const savedConfig = localStorage.getItem('eazy-family-home-config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setHomeConfig(prev => ({ ...prev, ...parsed }));
          setEditingGreeting(parsed.greeting || '');
          setEditingByline(parsed.byline || '');
        } catch { localStorage.removeItem('eazy-family-home-config'); }
      }
      setGoogleSynced(localStorage.getItem('eazy-google-calendar-synced') === 'true');
      setOutlookSynced(localStorage.getItem('eazy-outlook-calendar-synced') === 'true');
    };
    window.addEventListener('eazy-prefs-loaded', handler);
    return () => window.removeEventListener('eazy-prefs-loaded', handler);
  }, []);

  // Sync home_config from Supabase on mount
  useEffect(() => {
    if (!user) return;
    const syncFromSupabase = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('home_config')
          .eq('user_id', user.id)
          .single();
        if (data?.home_config && typeof data.home_config === 'object') {
          setHomeConfig(prev => {
            const merged = { ...prev, ...(data.home_config as Partial<HomeConfig>) };
            cloudSet('eazy-family-home-config', JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        // Column may not exist yet — fall back to localStorage silently
      }
    };
    syncFromSupabase();
  }, [user]);

  const handleDarkModeToggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const saveHomeConfig = (updates: Partial<HomeConfig>) => {
    const newConfig = { ...homeConfig, ...updates };
    setHomeConfig(newConfig);
    cloudSet('eazy-family-home-config', JSON.stringify(newConfig));
    if (user) {
      supabase.from('profiles').update({ home_config: newConfig }).eq('user_id', user.id).then(() => {});
    }
    toast({
      title: t('common.success'),
      description: t('settings.homepage.description'),
    });
  };

  const handleGreetingEdit = () => {
    saveHomeConfig({ greeting: editingGreeting });
  };

  const handleBylineEdit = () => {
    saveHomeConfig({ byline: editingByline });
  };

  const handleFileUpload = async (file: File, type: 'profile' | 'header') => {
    const validationResult = validateImageFile(file);
    if (!validationResult.valid) {
      toast({
        title: t('common.error'),
        description: validationResult.error,
        variant: "destructive",
      });
      return;
    }

    if (type === 'profile') setUploadingProfile(true);
    else setUploadingHeader(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      const publicUrl = await compressAndUpload(file, 'user-uploads', filePath);

      if (type === 'profile') {
        const oldUrl = homeConfig.iconImage;
        saveHomeConfig({ iconImage: publicUrl });
        if (oldUrl) deleteStorageFile('user-uploads', oldUrl).catch(() => {});
      } else {
        const currentImages = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);
        const newImages = [...currentImages, publicUrl];
        saveHomeConfig({ headerImages: newImages, headerImage: newImages[0] });
      }
    } catch (error) {
      logError('Upload error:', error);
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: "destructive",
      });
    } finally {
      if (type === 'profile') setUploadingProfile(false);
      else setUploadingHeader(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: t('settings.actions.signOut'),
      description: t('common.success'),
    });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      await signOut();
    } catch (err: any) {
      logError('Error deleting account:', err);
      toast({ title: "Error", description: err?.message || "Could not delete account. Please contact support@eazy.family", variant: "destructive" });
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    cloudSet('eazy-family-language', newLanguage);
    toast({
      title: t('settings.language.title'),
      description: t('settings.language.description'),
    });
  };

  const savePrivacyField = async (field: string, value: boolean | string | null) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("user_id", user.id);
      if (error) throw error;
      if (field === "display_name") {
        await supabase.from("family_members").update({ display_name: value || null }).eq("user_id", user.id);
      }
      toast({ title: "Saved", description: "Your settings have been updated." });
    } catch (err: any) {
      logError("Error saving privacy setting:", err);
      const msg = err?.message || err?.details || JSON.stringify(err) || "Unknown error";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  };

  const CARD = '#FFFFFF';
  const BORDER = '#DAC1BB';
  const DIVIDER = '#F1EDE7';
  const TC = '#964735';
  const SAGE = '#44664F';
  const SAGE_BG = '#EEF4F0';
  const SAGE_BORDER = '#C8DDD0';
  const MUTED = '#7A6660';
  const INK = '#1C1C18';

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-wide px-1 mb-1" style={{ color: MUTED }}>{children}</p>
  );

  const SettingsCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl overflow-hidden ${className ?? ''}`} style={{ background: CARD, border: `1px solid ${BORDER}` }}>{children}</div>
  );

  const Row = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
    <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: last ? 'none' : `1px solid ${DIVIDER}` }}>{children}</div>
  );

  const RowLabel = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="flex-1 min-w-0 mr-3">
      <p className="text-sm font-medium" style={{ color: INK }}>{title}</p>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-5 py-2" style={{ overscrollBehavior: "contain" }}>

      {/* 1. Account */}
      <div className="space-y-2">
        <SectionLabel>Account</SectionLabel>
        <SettingsCard>
          <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Plan</p>
              <p className="font-bold text-lg capitalize" style={{ color: INK }}>
                {loadingSubscription ? '…' : `${subscriptionTier} Plan`}
              </p>
            </div>
            {subscriptionTier === 'family'
              ? <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#FFF7E0', color: '#B88A00', border: '1px solid #FFD76A' }}><Crown className="w-3 h-3" />Family</span>
              : <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#F1EDE7', color: MUTED, border: `1px solid ${BORDER}` }}>Free</span>
            }
          </div>
          {subscriptionTier === 'free' && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
              <UpgradeDialog>
                <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: TC }}>
                  <Crown className="w-4 h-4" style={{ color: '#FFC861' }} />
                  Upgrade to Family Plan
                </button>
              </UpgradeDialog>
            </div>
          )}
          {(subscriptionTier === 'family' || subscriptionTier === 'premium') && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
              <button
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: '#FFF0EE', color: '#C0392B', border: '1px solid #FFCDD0' }}
                onClick={async () => {
                  if (confirm('Are you sure you want to cancel your subscription? You will immediately lose access to premium features.')) {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error('Not authenticated');
                      const { error } = await supabase.from('profiles').update({ subscription_tier: 'free' }).eq('user_id', user.id);
                      if (error) throw error;
                      setSubscriptionTier('free');
                      toast({ title: "Subscription Cancelled", description: "Your plan has been downgraded to Free." });
                    } catch (err) {
                      logError('Cancel subscription error:', err);
                      toast({ title: "Error", description: "Failed to cancel subscription. Please try again.", variant: "destructive" });
                    }
                  }
                }}
              >
                Cancel Subscription
              </button>
            </div>
          )}
          <Row last>
            <RowLabel title="Family Members" subtitle="Manage your family group" />
            <button className="text-sm font-semibold" style={{ color: TC }} onClick={() => navigate('/app/family')}>Manage →</button>
          </Row>
        </SettingsCard>
      </div>

      {/* 2. Profile & Gallery */}
      <div className="space-y-2" data-tutorial="custom-images">
        <SectionLabel>Profile</SectionLabel>
        <SettingsCard>
          <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            {homeConfig.iconImage
              ? <img src={homeConfig.iconImage} alt="Profile" className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${BORDER}` }} />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: '#D97B66' }}>EF</div>
            }
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: INK }}>Profile Photo</p>
            </div>
            <label htmlFor="profile-icon" className="cursor-pointer">
              <span className="text-sm font-semibold" style={{ color: TC }}>{uploadingProfile ? 'Uploading…' : homeConfig.iconImage ? 'Change' : 'Upload'}</span>
              <input id="profile-icon" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'profile'); e.target.value = ''; }}
                disabled={uploadingProfile} />
            </label>
          </div>
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: INK }}>Background Gallery</p>
              <span className="text-xs font-medium" style={{ color: MUTED }}>{(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])).length}/4</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[0, 1, 2, 3].map((idx) => {
                const imgs = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);
                const img = imgs[idx];
                return (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden flex items-center justify-center" style={{ background: '#F1EDE7', border: `1px solid ${BORDER}` }}>
                    {img ? (
                      <>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => { const newImgs = imgs.filter((_, i) => i !== idx); saveHomeConfig({ headerImages: newImgs, headerImage: newImgs[0] }); deleteStorageFile('user-uploads', img).catch(() => {}); }}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(28,28,24,0.6)' }}>
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </>
                    ) : <Plus className="w-3.5 h-3.5" style={{ color: MUTED }} />}
                  </div>
                );
              })}
            </div>
            {(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])).length < 4 ? (
              <label htmlFor="header-image" className="cursor-pointer">
                <span className="text-sm font-semibold" style={{ color: TC }}>{uploadingHeader ? 'Uploading…' : '+ Add background photo'}</span>
                <input id="header-image" type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'header'); e.target.value = ''; }}
                  disabled={uploadingHeader} />
              </label>
            ) : <p className="text-xs" style={{ color: MUTED }}>Gallery full — delete a photo to add a new one.</p>}
          </div>
        </SettingsCard>
      </div>

      {/* 3. Appearance */}
      <div className="space-y-2" data-tutorial="appearance">
        <SectionLabel>Appearance</SectionLabel>
        <SettingsCard>
          <Row last>
            <div className="flex items-center gap-3 flex-1">
              {isDark ? <Moon className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} /> : <Sun className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />}
              <RowLabel title={isDark ? 'Dark Mode' : 'Light Mode'} subtitle="Adjust the app's color theme" />
            </div>
            <Switch checked={isDark} onCheckedChange={handleDarkModeToggle} />
          </Row>
        </SettingsCard>
      </div>

      {/* 4. Calendar Integrations */}
      <div className="space-y-2" data-tutorial="calendar-integrations">
        <SectionLabel>Calendar Integrations</SectionLabel>
        <SettingsCard>
          {/* Google */}
          {subscriptionTier === 'family' || subscriptionTier === 'premium' ? (
            <Row>
              <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center shadow-sm flex-shrink-0 mr-3 overflow-hidden">
                <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </div>
              <RowLabel title="Google Calendar" subtitle={googleSynced ? 'Connected' : 'Not connected'} />
              <button className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: googleSynced ? SAGE_BG : '#F1EDE7', color: googleSynced ? SAGE : TC, border: `1px solid ${googleSynced ? SAGE_BORDER : BORDER}` }} onClick={() => navigate('/app/calendar?sync=1')}>
                {googleSynced ? 'Manage' : 'Connect'}
              </button>
            </Row>
          ) : (
            <UpgradeDialog>
              <Row>
                <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center shadow-sm flex-shrink-0 mr-3 overflow-hidden">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <RowLabel title="Google Calendar" subtitle="Requires Family plan" />
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FFF7E0', color: '#B88A00', border: '1px solid #FFD76A' }}>Premium</span>
              </Row>
            </UpgradeDialog>
          )}
          {/* Apple */}
          <Row>
            <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center shadow-sm flex-shrink-0 mr-3 overflow-hidden">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            </div>
            <RowLabel title="Apple Calendar" subtitle="Coming soon" />
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#F1EDE7', color: MUTED, border: `1px solid ${BORDER}` }}>Soon</span>
          </Row>
          {/* Outlook */}
          <Row last>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 mr-3 overflow-hidden" style={{ background: '#0078d4' }}>
              <span className="text-white text-xs font-bold">O</span>
            </div>
            <RowLabel title="Outlook Calendar" subtitle={outlookSynced ? 'Connected' : 'Not connected'} />
            <button className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: outlookSynced ? SAGE_BG : '#E8F0FB', color: outlookSynced ? SAGE : '#0078d4', border: `1px solid ${outlookSynced ? SAGE_BORDER : '#BFCFEE'}` }} onClick={() => navigate('/app/calendar?sync=1')}>
              {outlookSynced ? 'Manage' : 'Connect'}
            </button>
          </Row>
        </SettingsCard>
      </div>

      {/* 5. Language */}
      <div className="space-y-2">
        <SectionLabel>Language</SectionLabel>
        <SettingsCard>
          {[
            { value: "en", label: t('settings.language.english'), flag: "🇬🇧" },
            { value: "de", label: t('settings.language.german'), flag: "🇩🇪" },
            { value: "fr", label: t('settings.language.french'), flag: "🇫🇷" },
            { value: "it", label: t('settings.language.italian'), flag: "🇮🇹" },
          ].map(({ value, label, flag }, i, arr) => (
            <button key={value} onClick={() => handleLanguageChange(value)}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left"
              style={{ borderBottom: i < arr.length - 1 ? `1px solid ${DIVIDER}` : 'none', background: language === value ? SAGE_BG : 'transparent' }}
            >
              <span className="flex items-center gap-3 text-sm font-medium" style={{ color: INK }}>
                <span className="text-base">{flag}</span>{label}
              </span>
              {language === value && <Check className="w-4 h-4 flex-shrink-0" style={{ color: SAGE }} />}
            </button>
          ))}
        </SettingsCard>
      </div>

      {/* 6. Privacy & Security */}
      <div className="space-y-2">
        <SectionLabel>Privacy & Security</SectionLabel>
        <SettingsCard>
          {loadingPrivacy ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} /></div>
          ) : (
            <>
              <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                <p className="text-sm font-medium mb-2" style={{ color: INK }}>Display Name</p>
                <div className="flex gap-2">
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && savePrivacyField("display_name", displayName.trim() || null)}
                    placeholder="Your display name"
                    maxLength={100}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: '#F7F3ED', border: `1.5px solid ${BORDER}`, color: INK }}
                  />
                  <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0" style={{ background: TC }}
                    onClick={() => savePrivacyField("display_name", displayName.trim() || null)}>Save</button>
                </div>
                <p className="text-xs mt-1.5" style={{ color: MUTED }}>{t('privacySettings.displayNameHint')}</p>
              </div>
              <Row>
                <RowLabel title="Share Email with Family" subtitle={t('privacySettings.shareEmailDesc')} />
                <Switch checked={shareEmail} onCheckedChange={v => { setShareEmail(v); savePrivacyField("share_email", v); }} />
              </Row>
              <Row>
                <RowLabel title="Share Phone with Family" subtitle={t('privacySettings.sharePhoneDesc')} />
                <Switch checked={sharePhone} onCheckedChange={v => { setSharePhone(v); savePrivacyField("share_phone", v); }} />
              </Row>
              <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderTop: `1px solid ${DIVIDER}`, borderBottom: `1px solid ${DIVIDER}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SAGE_BG }}>
                  <Lock className="w-4 h-4" style={{ color: SAGE }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: INK }}>{t('settings.privacy.encryption')}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{t('settings.privacy.encryptionDesc')}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: SAGE_BG, color: SAGE, border: `1px solid ${SAGE_BORDER}` }}>On</span>
              </div>
              <Row last>
                <RowLabel title="Privacy Policy" />
                <button className="text-sm font-semibold" style={{ color: TC }} onClick={() => navigate('/privacy')}>View →</button>
              </Row>
            </>
          )}
        </SettingsCard>
      </div>

      {/* 7. Journal */}
      <div className="space-y-2">
        <SectionLabel>Journal</SectionLabel>
        <SettingsCard>
          <Row last={!journalSettings.showOnRituals}>
            <RowLabel title="Show on Rituals page" subtitle="Display journal entries below your daily rituals" />
            <Switch checked={journalSettings.showOnRituals} onCheckedChange={v => saveJournalSettings({ ...journalSettings, showOnRituals: v })} />
          </Row>
          {journalSettings.showOnRituals && (
            <div className="px-4 py-3.5">
              <p className="text-xs font-medium mb-2.5" style={{ color: MUTED }}>Entries to display</p>
              <div className="flex gap-2 flex-wrap">
                {[3, 5, 10, -1].map(count => (
                  <button key={count} onClick={() => saveJournalSettings({ ...journalSettings, displayCount: count })}
                    className="px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
                    style={{ background: journalSettings.displayCount === count ? TC : '#F1EDE7', color: journalSettings.displayCount === count ? '#fff' : '#55433F', border: `1px solid ${journalSettings.displayCount === count ? TC : BORDER}` }}>
                    {count === -1 ? 'All' : count}
                  </button>
                ))}
              </div>
            </div>
          )}
        </SettingsCard>
      </div>

      {/* 8. Notifications */}
      <div className="space-y-2">
        <SectionLabel>Notifications</SectionLabel>
        <SettingsCard>
          <Row>
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
              <RowLabel title="Push Notifications" subtitle={t('settings.notifications.pushDesc')} />
            </div>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </Row>
          <Row last>
            <div className="flex items-center gap-3 flex-1">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
              <RowLabel title="Email Notifications" subtitle={t('settings.notifications.emailDesc')} />
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </Row>
        </SettingsCard>
      </div>

      {/* 9. Refer Friends */}
      <div data-tutorial="referral-system">
        <ReferralSystem />
      </div>

      {/* 10. Actions */}
      <div className="space-y-2">
        <SectionLabel>App</SectionLabel>
        <SettingsCard>
          <Row>
            <div className="flex items-center gap-3 flex-1">
              <RefreshCw className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
              <RowLabel title="Replay Feature Tour" />
            </div>
            <button className="text-sm font-semibold" style={{ color: TC }} onClick={() => { window.dispatchEvent(new Event("tutorial-start")); navigate("/app"); }}>Start →</button>
          </Row>
          <Row last>
            <div className="flex items-center gap-3 flex-1">
              <LogOut className="w-4 h-4 flex-shrink-0" style={{ color: '#C0392B' }} />
              <p className="text-sm font-medium" style={{ color: '#C0392B' }}>{t('settings.actions.signOut')}</p>
            </div>
            <button className="text-sm font-semibold" style={{ color: '#C0392B' }} onClick={handleLogout}>Sign Out</button>
          </Row>
        </SettingsCard>
      </div>

      {/* 11. Contact */}
      <div className="space-y-2">
        <SectionLabel>Contact Us</SectionLabel>
        <SettingsCard>
          <Row>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SAGE_BG }}><MessageCircle className="w-3.5 h-3.5" style={{ color: SAGE }} /></div>
              <RowLabel title="Feedback & Ideas" subtitle="hello@eazy.family" />
            </div>
            <a href="mailto:hello@eazy.family" className="text-sm font-semibold" style={{ color: TC }}>Email →</a>
          </Row>
          <Row last>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FFF0EE' }}><Shield className="w-3.5 h-3.5" style={{ color: '#C0392B' }} /></div>
              <RowLabel title="Technical Support" subtitle="support@eazy.family" />
            </div>
            <a href="mailto:support@eazy.family" className="text-sm font-semibold" style={{ color: TC }}>Email →</a>
          </Row>
        </SettingsCard>
      </div>

      {/* 12. Delete Account */}
      <div className="space-y-2">
        <SectionLabel>Danger Zone</SectionLabel>
        <SettingsCard>
          {!showDeleteConfirm ? (
            <Row last>
              <RowLabel title="Delete My Account" subtitle="Permanently removes all data. Cannot be undone." />
              <button className="text-sm font-semibold" style={{ color: '#C0392B' }} onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            </Row>
          ) : (
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm font-medium" style={{ color: '#C0392B' }}>This will permanently delete all your data, family members, and messages.</p>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#F1EDE7', color: MUTED, border: `1px solid ${BORDER}` }} onClick={() => setShowDeleteConfirm(false)} disabled={deletingAccount}>Cancel</button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#C0392B' }} onClick={handleDeleteAccount} disabled={deletingAccount}>
                  {deletingAccount ? "Deleting…" : "Yes, Delete Everything"}
                </button>
              </div>
            </div>
          )}
        </SettingsCard>
      </div>
    </div>
  );
};

export default Settings;
