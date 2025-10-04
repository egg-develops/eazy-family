import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ColorPicker } from "@/components/ui/color-picker";

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
  const [language, setLanguage] = useState(localStorage.getItem('eazy-family-language') || 'en');

  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    const saved = localStorage.getItem('eazy-family-home-config');
    const parsed = saved ? JSON.parse(saved) : {
      greeting: "Good morning! ☀️",
      byline: "Let's make today amazing",
      showCalendar: true,
      showWeather: true,
      showGreeting: true,
      topNotifications: ["Upcoming Events", "New Photos"],
      quickActions: ["Find Events", "Add Photos"],
      iconImage: undefined,
      headerImage: undefined,
    };
    // Ensure arrays are always initialized
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
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('eazy-family-dark-mode') === 'true';
  });
  const [colorScheme, setColorScheme] = useState(() => {
    return localStorage.getItem('eazy-family-color-scheme') || 'gray';
  });
  const [customColor, setCustomColor] = useState(() => {
    return localStorage.getItem('eazy-family-custom-color') || '#6366f1';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Apply saved color scheme on mount
    const root = document.documentElement;
    if (colorScheme === 'custom') {
      const hsl = hexToHSL(customColor);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--accent', hsl);
    } else if (colorScheme === 'gray') {
      root.style.setProperty('--primary', '240 5% 64%');
      root.style.setProperty('--accent', '240 5% 74%');
    }
  }, []);

  useEffect(() => {
    // Update CSS variables when custom color changes
    if (colorScheme === 'custom') {
      const root = document.documentElement;
      const hsl = hexToHSL(customColor);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--accent', hsl);
    }
  }, [customColor, colorScheme]);

  const handleDarkModeToggle = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    localStorage.setItem('eazy-family-dark-mode', newValue.toString());
    toast({
      title: newValue ? "Dark mode enabled" : "Light mode enabled",
      description: "Your theme preference has been saved.",
    });
  };

  const hexToHSL = (hex: string) => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
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
    localStorage.setItem('eazy-family-color-scheme', scheme);
    
    // Update CSS variables based on color scheme
    const root = document.documentElement;
    if (scheme === 'gray') {
      root.style.setProperty('--primary', '240 5% 64%');
      root.style.setProperty('--accent', '240 5% 74%');
    } else if (scheme === 'custom') {
      const hsl = hexToHSL(customColor);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--accent', hsl);
    }
    
    toast({
      title: "Color scheme updated",
      description: scheme === 'gray' ? 'Switched to gray theme.' : 'Using custom color.',
    });
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    localStorage.setItem('eazy-family-custom-color', color);
    // No need to update CSS here - the useEffect will handle it
  };

  const availableQuickActions = [
    { id: "Find Events", label: "Find Events" },
    { id: "Add Photos", label: "Add Photos" },
    { id: "Calendar", label: "Calendar" },
    { id: "Community", label: "Community" },
    { id: "To-Do List", label: "To-Do List" },
    { id: "Shopping List", label: "Shopping List" },
  ];

  const saveHomeConfig = (updates: Partial<HomeConfig>) => {
    const newConfig = { ...homeConfig, ...updates };
    setHomeConfig(newConfig);
    localStorage.setItem('eazy-family-home-config', JSON.stringify(newConfig));
    toast({
      title: "Settings saved",
      description: "Your homepage has been updated",
    });
  };

  const handleGreetingEdit = () => {
    saveHomeConfig({ greeting: editingGreeting });
  };

  const handleBylineEdit = () => {
    saveHomeConfig({ byline: editingByline });
  };

  const handleFileUpload = async (file: File, type: 'profile' | 'header') => {
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
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload image",
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
    let newActions = enabled 
      ? [...homeConfig.quickActions, actionId]
      : homeConfig.quickActions.filter(a => a !== actionId);
    
    // Limit to 4 actions
    if (newActions.length > 4) {
      toast({
        title: "Limit reached",
        description: "You can only have up to 4 quick actions.",
        variant: "destructive",
      });
      return;
    }
    
    saveHomeConfig({ quickActions: newActions });
  };

  const handleNotificationToggle = (notificationId: string, enabled: boolean) => {
    let newNotifications = enabled 
      ? [...homeConfig.topNotifications, notificationId]
      : homeConfig.topNotifications.filter(n => n !== notificationId);
    
    // Limit to 2 notifications
    if (newNotifications.length > 2) {
      toast({
        title: "Limit reached",
        description: "You can only have up to 2 top notifications.",
        variant: "destructive",
      });
      return;
    }
    
    saveHomeConfig({ topNotifications: newNotifications });
  };

  const handleLogout = () => {
    localStorage.removeItem('eazy-family-onboarding');
    toast({
      title: "Signed out",
      description: "You've been signed out successfully",
    });
    navigate('/');
  };

  const handleRerunOnboarding = () => {
    localStorage.removeItem('eazy-family-onboarding');
    navigate('/onboarding');
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('eazy-family-language', newLanguage);
    toast({
      title: "Language updated",
      description: "Your language preference has been saved.",
    });
  };

  const handleUpgrade = () => {
    toast({
      title: "Upgrade to Pro",
      description: "Pro features coming soon!",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences</p>
      </div>

      {/* Homepage Customization */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>Homepage Customization</CardTitle>
          <CardDescription>Personalize your home screen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Greeting Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Greeting Block</Label>
              <p className="text-sm text-muted-foreground">Display greeting message on homepage</p>
            </div>
            <Switch
              checked={homeConfig.showGreeting}
              onCheckedChange={() => saveHomeConfig({ showGreeting: !homeConfig.showGreeting })}
            />
          </div>

          {/* Greeting */}
          {homeConfig.showGreeting && (
            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting Message</Label>
              <div className="flex gap-2">
                <Input
                  id="greeting"
                  value={editingGreeting}
                  onChange={(e) => setEditingGreeting(e.target.value)}
                  placeholder="Good morning! ☀️"
                />
                <Button onClick={handleGreetingEdit}>Save</Button>
              </div>
            </div>
          )}

          {/* Byline */}
          {homeConfig.showGreeting && (
            <div className="space-y-2">
              <Label htmlFor="byline">Byline</Label>
              <div className="flex gap-2">
                <Input
                  id="byline"
                  value={editingByline}
                  onChange={(e) => setEditingByline(e.target.value)}
                  placeholder="Let's make today amazing"
                />
                <Button onClick={handleBylineEdit}>Save</Button>
              </div>
            </div>
          )}

          {/* Profile Icon Upload */}
          <div className="space-y-2">
            <Label htmlFor="profile-icon">Profile Icon</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="profile-icon"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'profile');
                }}
                disabled={uploadingProfile}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium"
              />
              {uploadingProfile && <span className="text-sm text-muted-foreground">Uploading...</span>}
            </div>
            {homeConfig.iconImage && (
              <img src={homeConfig.iconImage} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
            )}
          </div>

          {/* Header Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="header-image">Header Image</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="header-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'header');
                }}
                disabled={uploadingHeader}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium"
              />
              {uploadingHeader && <span className="text-sm text-muted-foreground">Uploading...</span>}
            </div>
            {homeConfig.headerImage && (
              <img src={homeConfig.headerImage} alt="Header" className="w-full h-32 rounded-lg object-cover" />
            )}
          </div>

          {/* Weather Card Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Weather Card</Label>
              <p className="text-sm text-muted-foreground">Display weather information on homepage</p>
            </div>
            <Switch
              checked={homeConfig.showWeather}
              onCheckedChange={() => saveHomeConfig({ showWeather: !homeConfig.showWeather })}
            />
          </div>

          {/* Calendar Section Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Calendar Section</Label>
                <p className="text-sm text-muted-foreground">Show calendar with day/week/month views on homepage</p>
              </div>
              <Switch
                checked={homeConfig.showCalendar}
                onCheckedChange={handleCalendarToggle}
              />
            </div>

            {/* Show Calendar Preview when enabled */}
            {homeConfig.showCalendar && (
              <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                <p className="text-sm font-medium">Calendar Preview</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Day
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Week
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Month
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Full calendar with day, week, and month views will be shown on your homepage
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Label>Quick Actions (Max 4)</Label>
            <p className="text-sm text-muted-foreground">
              Choose up to 4 quick actions to display on your homepage
            </p>
            <div className="grid grid-cols-1 gap-3">
              {availableQuickActions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={homeConfig.quickActions.includes(action.id)}
                    onCheckedChange={(checked) => 
                      handleQuickActionToggle(action.id, checked as boolean)
                    }
                    disabled={!homeConfig.quickActions.includes(action.id) && homeConfig.quickActions.length >= 4}
                  />
                  <span className="font-medium">{action.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Notifications */}
          <div className="space-y-3">
            <Label>Top Notifications (Max 2)</Label>
            <p className="text-sm text-muted-foreground">
              Choose up to 2 notification cards to display on your homepage
            </p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "Upcoming Events", label: "Upcoming Events" },
                { id: "New Photos", label: "New Photos" },
                { id: "Pending Tasks", label: "Pending Tasks" },
                { id: "Shopping List", label: "Shopping List" },
              ].map((notification) => (
                <div key={notification.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={homeConfig.topNotifications.includes(notification.id)}
                    onCheckedChange={(checked) => 
                      handleNotificationToggle(notification.id, checked as boolean)
                    }
                    disabled={!homeConfig.topNotifications.includes(notification.id) && homeConfig.topNotifications.length >= 2}
                  />
                  <span className="font-medium">{notification.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your subscription and family</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Free Plan</p>
              <p className="text-sm text-muted-foreground">Basic features included</p>
            </div>
            <UpgradeDialog>
              <Button className="gap-2 gradient-primary text-white border-0">
                <Crown className="h-4 w-4" />
                Upgrade to Family Plan
              </Button>
            </UpgradeDialog>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/app/family')}
          >
            Manage Family Members
          </Button>

          {/* Calendar Integrations */}
          <div className="space-y-3">
            <Label>Calendar Integrations</Label>
            <p className="text-sm text-muted-foreground">Connect your external calendars</p>
            <div className="space-y-2">
              <UpgradeDialog>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Apple Calendar (Premium)
                </Button>
              </UpgradeDialog>
              <UpgradeDialog>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Google Calendar (Premium)
                </Button>
              </UpgradeDialog>
              <UpgradeDialog>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Outlook Calendar (Premium)
                </Button>
              </UpgradeDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  {isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
                </p>
              </div>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

          {/* Color Scheme Selection */}
          <div className="space-y-4">
            <div>
              <Label>Color Scheme</Label>
              <p className="text-sm text-muted-foreground">Choose your preferred color accent</p>
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
                  <ColorPicker 
                    value={customColor} 
                    onChange={handleCustomColorChange}
                  />
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
            Language
          </CardTitle>
          <CardDescription>Choose your preferred language</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={language} onValueChange={handleLanguageChange} className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="en" />
              <Label htmlFor="en" className="cursor-pointer">English</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="de" id="de" />
              <Label htmlFor="de" className="cursor-pointer">Deutsch (German)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fr" id="fr" />
              <Label htmlFor="fr" className="cursor-pointer">Français (French)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="it" id="it" />
              <Label htmlFor="it" className="cursor-pointer">Italiano (Italian)</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>Control your data and privacy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Lock className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">End-to-End Encryption</p>
                <p className="text-xs text-muted-foreground">Your data is encrypted and secure</p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Eye className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">Data Visibility</p>
                <p className="text-xs text-muted-foreground">Only you and your family can see your data</p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </div>

          <div className="pt-4 border-t space-y-1">
            <Button variant="ghost" className="w-full justify-start text-sm">
              View Privacy Policy
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm">
              Download My Data
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm text-destructive">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Get instant updates</p>
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
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
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
      <ReferralSystem />

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
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Settings;