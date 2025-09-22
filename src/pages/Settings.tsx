import { useState } from "react";
import { Settings as SettingsIcon, User, Bell, Shield, Globe, Palette, CreditCard, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    events: true,
    community: true,
    marketplace: false,
    photos: true
  });
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("light");

  // Mock user data from onboarding
  const userData = {
    initials: "EF",
    children: [
      { initials: "SM", age: "5" },
      { initials: "LM", age: "3" }
    ],
    location: "zurich",
    subscriptionTier: "free"
  };

  const handleLogout = () => {
    localStorage.removeItem('eazy-family-onboarding');
    navigate('/');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Profile Section */}
      <Card className="shadow-custom-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="gradient-primary text-white text-xl font-bold">
                {userData.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Family Account</h3>
              <p className="text-sm text-muted-foreground">
                {userData.children.length} children • {userData.location}
              </p>
              <Badge 
                variant={userData.subscriptionTier === 'free' ? 'secondary' : 'default'}
                className="mt-2"
              >
                {userData.subscriptionTier === 'free' ? 'Free Plan' : userData.subscriptionTier}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="gradient-primary rounded-lg p-4 text-white">
            <h4 className="font-semibold mb-2">Upgrade to Premium</h4>
            <p className="text-white/90 text-sm mb-3">
              Unlimited photo storage, group participation, and marketplace access
            </p>
            <Button variant="secondary" size="sm">
              View Plans
            </Button>
          </div>

          {/* Current Plan Features */}
          <div className="space-y-2">
            <h5 className="font-medium text-sm">Current Plan Includes:</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Profile creation & directory browsing</li>
              <li>• Store photos for 7 days</li>
              <li>• View marketplace & observe groups</li>
              <li>• Personal shopping & to-do lists</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Edit Profile</span>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Manage Children</span>
            <Button variant="ghost" size="sm">
              {userData.children.length} children
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Privacy Settings</span>
            <Button variant="ghost" size="sm">
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Event Reminders</span>
            <Switch 
              checked={notifications.events}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, events: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Community Updates</span>
            <Switch 
              checked={notifications.community}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, community: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Marketplace Activity</span>
            <Switch 
              checked={notifications.marketplace}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketplace: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Photo Memories</span>
            <Switch 
              checked={notifications.photos}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, photos: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Language</span>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Theme</span>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Distance Units</span>
            <Select defaultValue="km">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers</SelectItem>
                <SelectItem value="miles">Miles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Two-Factor Authentication</span>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Data Export</span>
            <Button variant="ghost" size="sm">
              Request
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Delete Account</span>
            <Button variant="ghost" size="sm" className="text-destructive">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Help Center</span>
            <Button variant="ghost" size="sm">
              Visit
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Contact Support</span>
            <Button variant="ghost" size="sm">
              Email
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">App Version</span>
            <span className="text-sm text-muted-foreground">1.0.0</span>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button 
        variant="outline" 
        className="w-full text-destructive hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default Settings;