import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, LogOut, RefreshCw, Crown, Shield, Lock, Eye, Languages, Calendar as CalendarIcon, Palette, Moon, Sun, Mail, MessageCircle, Loader2, Check, X, Plus, Trash2 } from "lucide-react";
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
        .upsert({ user_id: user.id, [field]: value }, { onConflict: "user_id" });
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

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4" style={{ overscrollBehavior: "contain" }}>
      {/* Header */}
      <div data-tutorial="settings">
        <h1 className="text-lg sm:text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* 1. Account */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">{t('settings.account.title')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('settings.account.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          <div className="p-3 sm:p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium">{t('settings.account.subscription')}</span>
              {subscriptionTier === 'family' && (
                <Crown className="h-4 w-4 flex-shrink-0" style={{ color: "#FFC861" }} />
              )}
            </div>
            <p className="text-xl sm:text-2xl font-bold capitalize">
              {loadingSubscription ? t('common.loading') : `${subscriptionTier} Plan`}
            </p>
            {subscriptionTier === 'family' && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t('settings.account.allFeaturesUnlocked')}
              </p>
            )}
          </div>

          {subscriptionTier === 'free' && (
            <UpgradeDialog>
              <Button className="w-full gap-2 text-white border-0 h-10 sm:h-11 bg-[#6B3FBF] dark:bg-[#9B7ADE] hover:opacity-90 transition-opacity">
                <Crown className="h-4 w-4 flex-shrink-0" style={{ color: "#FFC861" }} />
                {t('settings.account.upgradeFamily')}
              </Button>
            </UpgradeDialog>
          )}

          {(subscriptionTier === 'family' || subscriptionTier === 'premium') && (
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 h-10 sm:h-11 text-sm"
              onClick={async () => {
                if (confirm('Are you sure you want to cancel your subscription? You will immediately lose access to premium features.')) {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Not authenticated');
                    const { error } = await supabase
                      .from('profiles')
                      .update({ subscription_tier: 'free' })
                      .eq('user_id', user.id);
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
              Cancel / Downgrade to Free
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full h-10 sm:h-11 text-sm"
            onClick={() => navigate('/app/family')}
          >
            {t('settings.account.manageFamily')}
          </Button>
        </CardContent>
      </Card>

      {/* 2. Homepage Customization */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">{t('settings.homepage.title')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('settings.homepage.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="space-y-2" data-tutorial="custom-images">
            <Label className="text-sm sm:text-base">{t('settings.homepage.profileIcon')}</Label>
            <div className="flex items-center gap-3">
              {homeConfig.iconImage
                ? <img src={homeConfig.iconImage} alt="Profile" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border" />
                : <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">None</div>
              }
              <label htmlFor="profile-icon" className="cursor-pointer">
                <span className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-medium bg-background hover:bg-muted transition-colors">
                  {uploadingProfile ? t('common.loading') : homeConfig.iconImage ? 'Change photo' : 'Upload photo'}
                </span>
                <input id="profile-icon" type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'profile'); }}
                  disabled={uploadingProfile} />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm sm:text-base">Background Gallery</Label>
              <span className="text-xs text-muted-foreground">{(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])).length}/4</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((idx) => {
                const imgs = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);
                const img = imgs[idx];
                return (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border bg-muted/50 flex items-center justify-center">
                    {img ? (
                      <>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            const newImgs = imgs.filter((_, i) => i !== idx);
                            saveHomeConfig({ headerImages: newImgs, headerImage: newImgs[0] });
                            deleteStorageFile('user-uploads', img).catch(() => {});
                          }}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </>
                    ) : (
                      <Plus className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                );
              })}
            </div>
            {(homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : [])).length < 4 ? (
              <label htmlFor="header-image" className="cursor-pointer block">
                <span className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-medium bg-background hover:bg-muted transition-colors">
                  {uploadingHeader ? t('common.loading') : 'Add background photo'}
                </span>
                <input id="header-image" type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'header'); e.target.value = ''; }}
                  disabled={uploadingHeader} />
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">Gallery full — delete a photo to add a new one.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Appearance */}
      <Card className="shadow-custom-md" data-tutorial="appearance">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('settings.appearance.title')}
          </CardTitle>
          <CardDescription>Customize how your app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <Label>{isDark ? "Dark Mode" : "Light Mode"}</Label>
            </div>
            <Switch checked={isDark} onCheckedChange={handleDarkModeToggle} />
          </div>
        </CardContent>
      </Card>

      {/* 4. Calendar Integrations */}
      <Card className="shadow-custom-md" data-tutorial="calendar-integrations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t('calendarIntegrations.title')}
          </CardTitle>
          <CardDescription>{t('calendarIntegrations.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {/* Google Calendar */}
          {subscriptionTier === 'family' || subscriptionTier === 'premium' ? (
            <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg ${googleSynced ? 'bg-green-50 dark:bg-green-950/30 border-green-200' : 'bg-card border-border'}`}>
              <div className="w-7 h-7 rounded-md bg-white border flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </div>
              <span className="flex-1 text-sm font-medium">Google Calendar</span>
              <Button size="sm" variant={googleSynced ? 'outline' : 'default'} className={`flex-shrink-0 h-7 text-xs px-2.5 ${googleSynced ? '' : 'gradient-primary text-white border-0'}`} onClick={() => navigate('/app/calendar?sync=1')}>
                {googleSynced ? 'Manage' : 'Connect'}
              </Button>
            </div>
          ) : (
            <UpgradeDialog>
              <div className="flex items-center gap-3 px-3 py-2.5 border rounded-lg bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition">
                <div className="w-7 h-7 rounded-md bg-white border flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <span className="flex-1 text-sm font-medium">Google Calendar</span>
                <Badge className="bg-primary text-primary-foreground flex-shrink-0 text-xs">Premium</Badge>
              </div>
            </UpgradeDialog>
          )}

          {/* Apple Calendar - Coming Soon */}
          <div className="flex items-center gap-3 px-3 py-2.5 border rounded-lg bg-muted/30 border-border/50 opacity-60">
            <div className="w-7 h-7 rounded-md bg-white border flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            </div>
            <span className="flex-1 text-sm font-medium text-muted-foreground">Apple Calendar</span>
            <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap text-xs">Coming Soon</Badge>
          </div>

          {/* Outlook Calendar */}
          <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg ${outlookSynced ? 'bg-grape-100/50 dark:bg-grape-900/30 border-grape-300' : 'bg-card border-border'}`}>
            <div className="w-7 h-7 rounded-md bg-[#0078d4] flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
              <span className="text-white text-xs font-bold leading-none">O</span>
            </div>
            <span className="flex-1 text-sm font-medium">Outlook Calendar</span>
            <Button size="sm" variant={outlookSynced ? 'outline' : 'default'} className={`flex-shrink-0 h-7 text-xs px-2.5 ${outlookSynced ? '' : 'bg-[#0078d4] hover:bg-[#006cbd] text-white border-0'}`} onClick={() => navigate('/app/calendar?sync=1')}>
              {outlookSynced ? 'Manage' : 'Connect'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. Language */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('settings.language.title')}
          </CardTitle>
          <CardDescription>{t('settings.language.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 p-3 sm:p-6">
          {[
            { value: "en", label: t('settings.language.english'), flag: "🇬🇧" },
            { value: "de", label: t('settings.language.german'), flag: "🇩🇪" },
            { value: "fr", label: t('settings.language.french'), flag: "🇫🇷" },
            { value: "it", label: t('settings.language.italian'), flag: "🇮🇹" },
          ].map(({ value, label, flag }) => (
            <button
              key={value}
              onClick={() => handleLanguageChange(value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${
                language === value
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted border border-transparent"
              }`}
            >
              <span className="flex items-center gap-3 text-sm font-medium">
                <span className="text-base">{flag}</span>
                {label}
              </span>
              {language === value && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* 6. Privacy & Security (combined) */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.privacy.title')}
          </CardTitle>
          <CardDescription>{t('settings.privacy.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingPrivacy ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Display name */}
              <div className="space-y-2">
                <Label htmlFor="display-name">{t('privacySettings.displayName')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePrivacyField("display_name", displayName.trim() || null)}
                    placeholder={t('privacySettings.displayNamePlaceholder')}
                    maxLength={100}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    className="flex-shrink-0 text-white border-0 h-10"
                    style={{ background: "#6B3FBF" }}
                    onClick={() => savePrivacyField("display_name", displayName.trim() || null)}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('privacySettings.displayNameHint')}</p>
              </div>

              {/* Share toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share-email">{t('privacySettings.shareEmail')}</Label>
                    <p className="text-sm text-muted-foreground">{t('privacySettings.shareEmailDesc')}</p>
                  </div>
                  <Switch id="share-email" checked={shareEmail} onCheckedChange={(v) => { setShareEmail(v); savePrivacyField("share_email", v); }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share-phone">{t('privacySettings.sharePhone')}</Label>
                    <p className="text-sm text-muted-foreground">{t('privacySettings.sharePhoneDesc')}</p>
                  </div>
                  <Switch id="share-phone" checked={sharePhone} onCheckedChange={(v) => { setSharePhone(v); savePrivacyField("share_phone", v); }} />
                </div>
              </div>
            </>
          )}

          <div className="border-t pt-4 space-y-4">
            {/* Security indicators */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Lock className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{t('settings.privacy.encryption')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.privacy.encryptionDesc')}</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Eye className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{t('settings.privacy.dataVisibility')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.privacy.dataVisibilityDesc')}</p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </div>

            {/* Policy links */}
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => navigate('/privacy')}>
                {t('settings.privacy.privacyPolicy')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Notifications */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>{t('settings.notifications.title')}</CardTitle>
          <CardDescription>{t('settings.notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>{t('settings.notifications.pushNotifications')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.notifications.pushDesc')}</p>
              </div>
            </div>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>{t('settings.notifications.emailNotifications')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.notifications.emailDesc')}</p>
              </div>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* 8. Refer Friends, Get Premium */}
      <div data-tutorial="referral-system">
        <ReferralSystem />
      </div>

      {/* 9 & 10. Replay Feature Tour + Sign Out */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            window.dispatchEvent(new Event("tutorial-start"));
            navigate("/app");
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Replay Feature Tour
        </Button>
        <Button
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t('settings.actions.signOut')}
        </Button>
      </div>

      {/* 11. Contact Us */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5" />
            Contact Us
          </CardTitle>
          <CardDescription>We'd love to hear from you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Feedback & Feature Requests</p>
              <a href="mailto:hello@eazy.family" className="text-sm text-primary hover:underline">hello@eazy.family</a>
              <p className="text-xs text-muted-foreground mt-0.5">Ideas, suggestions, or anything you'd love to see</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-sm">Technical Support</p>
              <a href="mailto:support@eazy.family" className="text-sm text-primary hover:underline">support@eazy.family</a>
              <p className="text-xs text-muted-foreground mt-0.5">Bugs, account issues, or anything not working right</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
