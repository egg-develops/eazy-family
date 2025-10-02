import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, LogOut, RefreshCw, Crown, Shield, Lock, Eye, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HomeConfig {
  greeting: string;
  byline: string;
  showCalendar: boolean;
  quickActions: string[];
  iconImage?: string;
  headerImage?: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    const saved = localStorage.getItem('eazy-family-home-config');
    return saved ? JSON.parse(saved) : {
      greeting: "Good morning! ☀️",
      byline: "Let's make today amazing",
      showCalendar: true,
      quickActions: ["Find Events", "Add Photos"],
      iconImage: undefined,
      headerImage: undefined,
    };
  });

  const [editingGreeting, setEditingGreeting] = useState(homeConfig.greeting);
  const [editingByline, setEditingByline] = useState(homeConfig.byline);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const availableQuickActions = [
    { id: "Find Events", label: "Find Events" },
    { id: "Add Photos", label: "Add Photos" },
    { id: "Calendar", label: "Calendar" },
    { id: "Community", label: "Community" },
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
    const newActions = enabled 
      ? [...homeConfig.quickActions, actionId]
      : homeConfig.quickActions.filter(a => a !== actionId);
    saveHomeConfig({ quickActions: newActions });
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
          {/* Greeting */}
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

          {/* Byline */}
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

          {/* Calendar Section Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Calendar Section</Label>
              <p className="text-sm text-muted-foreground">Show calendar on homepage</p>
            </div>
            <Switch
              checked={homeConfig.showCalendar}
              onCheckedChange={handleCalendarToggle}
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Label>Quick Actions</Label>
            <p className="text-sm text-muted-foreground">
              Choose which quick actions to display on your homepage
            </p>
            <div className="grid grid-cols-1 gap-3">
              {availableQuickActions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={homeConfig.quickActions.includes(action.id)}
                    onCheckedChange={(checked) => 
                      handleQuickActionToggle(action.id, checked as boolean)
                    }
                  />
                  <span className="font-medium">{action.label}</span>
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
            <Button onClick={handleUpgrade} className="gap-2 gradient-primary text-white border-0">
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
          <Button variant="outline" className="w-full">
            Manage Family Members
          </Button>
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