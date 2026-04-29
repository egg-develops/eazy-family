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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell, LogOut, RefreshCw, Crown, Shield, Lock, Eye, Languages, Calendar as CalendarIcon, Palette, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReferralSystem } from "@/components/ReferralSystem";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { PrivacySettings } from "@/components/PrivacySettings";
import { validateImageFile } from "@/lib/fileValidation";
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
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { signOut, user } = useAuth();
  const [language, setLanguage] = useState(localStorage.getItem('eazy-family-language') || 'en');

  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    const saved = localStorage.getItem('eazy-family-home-config');
    const parsed = saved ? JSON.parse(saved) : {
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
    return {
      ...parsed,
      topNotifications: parsed.topNotifications || [],
      quickActions: parsed.quickActions || [],
    };
  });

  const [editingGreeting, setEditingGreeting] = useState(homeConfig.greeting);
  const [editingByline, setEditingByline] = useState(homeConfig.byline);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const { theme, setTheme, isDark } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [colorScheme, setColorScheme] = useState(() => {
    return localStorage.getItem('eazy-family-color-scheme') || 'gray';
  });
  const [customColor, setCustomColor] = useState(() => {
    return localStorage.getItem('eazy-family-custom-color') || '#6366f1';
  });
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [loadingSubscription, setLoadingSubscription] = useState(true);

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

  useEffect(() => {
    const root = document.documentElement;
    if (colorScheme === 'custom') {
      const hsl = hexToHSL(customColor);
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
      const hoverL = Math.max(l - 10, 10);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--primary-hover', `${h} ${s}% ${hoverL}%`);
      root.style.setProperty('--accent', hsl);
    } else if (colorScheme === 'gray') {
      root.style.setProperty('--primary', '240 5% 64%');
      root.style.setProperty('--primary-hover', '240 5% 54%');
      root.style.setProperty('--accent', '240 5% 74%');
    }
  }, [colorScheme, customColor]);

  useEffect(() => {
    if (colorScheme === 'custom') {
      const root = document.documentElement;
      const hsl = hexToHSL(customColor);
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
      const hoverL = Math.max(l - 10, 10);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--primary-hover', `${h} ${s}% ${hoverL}%`);
      root.style.setProperty('--accent', hsl);
    }
  }, [customColor, colorScheme]);

  const handleDarkModeToggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    toast({
      title: isDark ? t('settings.appearance.lightEnabled') : t('settings.appearance.darkEnabled'),
      description: t('settings.language.description'),
    });
  };

  const hexToHSL = (hex: string) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
let s = 0;
const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
    cloudSet('eazy-family-color-scheme', scheme);
    
    const root = document.documentElement;
    if (scheme === 'gray') {
      root.style.setProperty('--primary', '240 5% 64%');
      root.style.setProperty('--primary-hover', '240 5% 54%');
      root.style.setProperty('--accent', '240 5% 74%');
    } else if (scheme === 'custom') {
      const hsl = hexToHSL(customColor);
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
      const hoverL = Math.max(l - 10, 10);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--primary-hover', `${h} ${s}% ${hoverL}%`);
      root.style.setProperty('--accent', hsl);
    }
    
    toast({
      title: t('settings.appearance.colorScheme'),
      description: t('settings.appearance.colorSchemeDesc'),
    });
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    cloudSet('eazy-family-custom-color', color);
  };

  const availableQuickActions = [
    { id: "Find Events", label: t('events.findEvents') },
    { id: "Calendar", label: t('nav.calendar') },
    { id: "Community", label: t('nav.community') },
    { id: "To-Do List", label: t('calendar.todoList') },
    { id: "Shopping List", label: t('home.shoppingList') },
  ];

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
    // Validate file before upload
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
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      if (type === 'profile') {
        saveHomeConfig({ iconImage: publicUrl });
      } else {
        saveHomeConfig({ headerImage: publicUrl });
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

  const handleCalendarToggle = () => {
    saveHomeConfig({ showCalendar: !homeConfig.showCalendar });
  };

  const handleQuickActionToggle = (actionId: string, enabled: boolean) => {
    const newActions = enabled 
      ? [...homeConfig.quickActions, actionId]
      : homeConfig.quickActions.filter(a => a !== actionId);
    
    if (newActions.length > 4) {
      toast({
        title: t('common.error'),
        description: t('settings.homepage.quickActionsDesc'),
        variant: "destructive",
      });
      return;
    }
    
    saveHomeConfig({ quickActions: newActions });
  };

  const handleNotificationToggle = (notificationId: string, enabled: boolean) => {
    const newNotifications = enabled 
      ? [...homeConfig.topNotifications, notificationId]
      : homeConfig.topNotifications.filter(n => n !== notificationId);
    
    if (newNotifications.length > 2) {
      toast({
        title: t('common.error'),
        description: t('settings.homepage.topNotificationsDesc'),
        variant: "destructive",
      });
      return;
    }
    
    saveHomeConfig({ topNotifications: newNotifications });
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: t('settings.actions.signOut'),
      description: t('common.success'),
    });
  };

  const handleRerunOnboarding = () => {
    localStorage.removeItem('eazy-family-onboarding');
    navigate('/onboarding');
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

  const handleUpgrade = () => {
    toast({
      title: t('settings.account.upgradePro'),
      description: t('upgrade.description'),
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      {/* Header */}
      <div data-tutorial="settings">
        <h1 className="text-lg sm:text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Homepage Customization */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">{t('settings.homepage.title')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('settings.homepage.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Profile Icon Upload */}
          <div className="space-y-2" data-tutorial="custom-images">
            <Label htmlFor="profile-icon" className="text-sm sm:text-base">{t('settings.homepage.profileIcon')}</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Input
                id="profile-icon"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'profile');
                }}
                disabled={uploadingProfile}
                className="flex-1 file:mr-2 sm:file:mr-4 file:py-2 file:px-2 sm:file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-medium h-10 sm:h-11"
              />
              {uploadingProfile && <span className="text-xs sm:text-sm text-muted-foreground">{t('common.loading')}</span>}
            </div>
            {homeConfig.iconImage && (
              <img src={homeConfig.iconImage} alt="Profile" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0" />
            )}
          </div>

          {/* Header Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="header-image" className="text-sm sm:text-base">{t('settings.homepage.headerImage')}</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Input
                id="header-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'header');
                }}
                disabled={uploadingHeader}
                className="flex-1 file:mr-2 sm:file:mr-4 file:py-2 file:px-2 sm:file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-medium h-10 sm:h-11"
              />
              {uploadingHeader && <span className="text-xs sm:text-sm text-muted-foreground">{t('common.loading')}</span>}
            </div>
            {homeConfig.headerImage && (
              <img src={homeConfig.headerImage} alt="Header" className="w-full h-24 sm:h-32 rounded-lg object-cover flex-shrink-0" />
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3" data-tutorial="quick-actions">
            <Label className="text-sm sm:text-base">{t('settings.homepage.quickActionsMax')}</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('settings.homepage.quickActionsDesc')}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {availableQuickActions.map((action) => (
                <div key={action.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg">
                  <Checkbox
                    checked={homeConfig.quickActions.includes(action.id)}
                    onCheckedChange={(checked) => 
                      handleQuickActionToggle(action.id, checked as boolean)
                    }
                    disabled={!homeConfig.quickActions.includes(action.id) && homeConfig.quickActions.length >= 4}
                    className="flex-shrink-0"
                  />
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Notifications */}
          <div className="space-y-3" data-tutorial="top-notifications">
            <Label className="text-sm sm:text-base">{t('settings.homepage.topNotifications')}</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('settings.homepage.topNotificationsDesc')}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {[
                { id: "Upcoming Events", label: t('home.upcomingEvents') },
                { id: "Pending Tasks", label: t('home.pendingTasks') },
                { id: "Shopping List", label: t('home.shoppingList') },
              ].map((notification) => (
                <div key={notification.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg">
                  <Checkbox
                    checked={homeConfig.topNotifications.includes(notification.id)}
                    onCheckedChange={(checked) => 
                      handleNotificationToggle(notification.id, checked as boolean)
                    }
                    disabled={!homeConfig.topNotifications.includes(notification.id) && homeConfig.topNotifications.length >= 2}
                    className="flex-shrink-0"
                  />
                  <span className="font-medium text-sm">{notification.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">{t('settings.account.title')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('settings.account.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          {/* Subscription Status */}
          <div className="p-3 sm:p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium">{t('settings.account.subscription')}</span>
              {subscriptionTier === 'family' && (
                <Crown className="h-4 w-4 text-primary flex-shrink-0" />
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
              <Button className="w-full gap-2 gradient-primary text-white border-0 h-10 sm:h-11">
                <Crown className="h-4 w-4 flex-shrink-0" />
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
                    toast({
                      title: "Subscription Cancelled",
                      description: "Your plan has been downgraded to Free.",
                    });
                  } catch (err) {
                    logError('Cancel subscription error:', err);
                    toast({
                      title: "Error",
                      description: "Failed to cancel subscription. Please try again.",
                      variant: "destructive",
                    });
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

      {/* Calendar Integrations */}
      <Card className="shadow-custom-md" data-tutorial="calendar-integrations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t('calendarIntegrations.title')}
          </CardTitle>
          <CardDescription>{t('calendarIntegrations.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Google Calendar */}
          {subscriptionTier === 'family' || subscriptionTier === 'premium' ? (
            <div className={`flex items-center justify-between p-3 border rounded-lg ${localStorage.getItem('eazy-google-calendar-synced') === 'true' ? 'bg-green-50 border-green-200' : 'bg-card border-border'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-base font-bold text-red-500 shadow-sm">G</div>
                <div>
                  <h4 className="font-medium text-sm">Google Calendar</h4>
                  <p className="text-xs text-muted-foreground">
                    {localStorage.getItem('eazy-google-calendar-synced') === 'true' ? 'Connected — sync in Calendar tab' : 'Available — connect in Calendar tab'}
                  </p>
                </div>
              </div>
              <Badge className={localStorage.getItem('eazy-google-calendar-synced') === 'true' ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground'}>
                {localStorage.getItem('eazy-google-calendar-synced') === 'true' ? 'Connected' : 'Available'}
              </Badge>
            </div>
          ) : (
            <UpgradeDialog>
              <div className="p-3 border rounded-lg bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-base font-bold text-red-500 shadow-sm">G</div>
                    <div>
                      <h4 className="font-medium text-sm">Google Calendar</h4>
                      <p className="text-xs text-muted-foreground">Upgrade to sync</p>
                    </div>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Premium</Badge>
                </div>
              </div>
            </UpgradeDialog>
          )}

          {/* Apple Calendar - Coming Soon */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 border-border/50 opacity-70">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Apple Calendar</h4>
                <p className="text-xs text-muted-foreground/70">iCloud integration</p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>

          {/* Outlook Calendar */}
          <div className={`flex items-center justify-between p-3 border rounded-lg ${localStorage.getItem('eazy-outlook-calendar-synced') === 'true' ? 'bg-blue-50 border-blue-200' : 'bg-card border-border'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">O</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">Outlook Calendar</h4>
                <p className="text-xs text-muted-foreground">
                  {localStorage.getItem('eazy-outlook-calendar-synced') === 'true' ? 'Connected — sync in Calendar tab' : 'Available — connect in Calendar tab'}
                </p>
              </div>
            </div>
            <Badge className={localStorage.getItem('eazy-outlook-calendar-synced') === 'true' ? 'bg-blue-600 text-white' : 'bg-[#0078d4] text-white'}>
              {localStorage.getItem('eazy-outlook-calendar-synced') === 'true' ? 'Connected' : 'Available'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <PrivacySettings />

      {/* Appearance Settings */}
      <Card className="shadow-custom-md" data-tutorial="appearance">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('settings.appearance.title')}
          </CardTitle>
          <CardDescription>{t('settings.appearance.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <Label>{t('settings.appearance.darkMode')}</Label>
                <p className="text-sm text-muted-foreground">
                  {isDark ? t('settings.appearance.darkEnabled') : t('settings.appearance.lightEnabled')}
                </p>
              </div>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

          {/* Color Scheme Selection */}
          <div className="space-y-4">
            <div>
              <Label>{t('settings.appearance.colorScheme')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.appearance.colorSchemeDesc')}</p>
            </div>
            
            <RadioGroup value={colorScheme} onValueChange={handleColorSchemeChange} className="space-y-3">
              <div className="relative">
                <RadioGroupItem value="gray" id="gray" className="peer sr-only" />
                <Label
                  htmlFor="gray"
                  className="flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full" style={{ background: 'hsl(240 5% 64%)' }}></div>
                  <span className="text-sm font-medium">Gray (Default)</span>
                </Label>
              </div>
              
              <div className="relative">
                <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                <Label
                  htmlFor="custom"
                  className="flex flex-col gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <label htmlFor="color-picker" className="cursor-pointer">
                        <div
                          className="size-8 cursor-pointer rounded-lg border-2 border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
                          style={{ backgroundColor: customColor }}
                        />
                      </label>
                      <Input
                        id="color-picker"
                        type="color"
                        value={customColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{t('settings.appearance.customColor')}</span>
                      <Input
                        type="text"
                        value={customColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        placeholder="#000000"
                        className="font-mono mt-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('settings.language.title')}
          </CardTitle>
          <CardDescription>{t('settings.language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={language} onValueChange={handleLanguageChange} className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="en" />
              <Label htmlFor="en" className="cursor-pointer">{t('settings.language.english')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="de" id="de" />
              <Label htmlFor="de" className="cursor-pointer">{t('settings.language.german')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fr" id="fr" />
              <Label htmlFor="fr" className="cursor-pointer">{t('settings.language.french')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="it" id="it" />
              <Label htmlFor="it" className="cursor-pointer">{t('settings.language.italian')}</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.privacy.title')}
          </CardTitle>
          <CardDescription>{t('settings.privacy.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
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

          <div className="pt-4 border-t space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sm"
              onClick={() => navigate('/privacy')}
            >
              {t('settings.privacy.privacyPolicy')}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sm"
              onClick={() => {
                toast({
                  title: t('settings.privacy.downloadData'),
                  description: t('common.success'),
                });
              }}
            >
              {t('settings.privacy.downloadData')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
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
            <Switch
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>{t('settings.notifications.emailNotifications')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.notifications.emailDesc')}</p>
              </div>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Referral System */}
      <div data-tutorial="referral-system">
        <ReferralSystem />
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleRerunOnboarding}
        >
          <RefreshCw className="h-4 w-4" />
          Re-run Onboarding
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => { localStorage.setItem('eazy-family-tutorial-run', 'true'); window.dispatchEvent(new Event('tutorial-start')); }}
        >
          <RefreshCw className="h-4 w-4" />
          Re-run Tutorial
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
    </div>
  );
};

export default Settings;
