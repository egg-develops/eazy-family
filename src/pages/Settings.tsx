import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Calendar, Users, Search, Camera, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface HomeConfig {
  greeting: string;
  showCalendar: boolean;
  quickActions: string[];
  iconImage?: string;
  headerImage?: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    const saved = localStorage.getItem('eazy-family-home-config');
    return saved ? JSON.parse(saved) : {
      greeting: "Good morning! ☀️",
      showCalendar: true,
      quickActions: ["Find Events", "Add Photos"]
    };
  });
  const [tempGreeting, setTempGreeting] = useState(homeConfig.greeting);
  const [tempIconUrl, setTempIconUrl] = useState(homeConfig.iconImage || "");
  const [tempHeaderUrl, setTempHeaderUrl] = useState(homeConfig.headerImage || "");

  const availableQuickActions = [
    { id: "Find Events", label: "Find Events", icon: Search },
    { id: "Add Photos", label: "Add Photos", icon: Camera },
    { id: "Calendar", label: "Calendar", icon: Calendar },
    { id: "Community", label: "Community", icon: Users },
  ];

  const saveHomeConfig = (newConfig: HomeConfig) => {
    setHomeConfig(newConfig);
    localStorage.setItem('eazy-family-home-config', JSON.stringify(newConfig));
  };

  const handleGreetingEdit = () => {
    if (isEditingGreeting) {
      saveHomeConfig({ ...homeConfig, greeting: tempGreeting });
    } else {
      setTempGreeting(homeConfig.greeting);
    }
    setIsEditingGreeting(!isEditingGreeting);
  };

  const handleIconEdit = () => {
    if (isEditingIcon) {
      saveHomeConfig({ ...homeConfig, iconImage: tempIconUrl });
    } else {
      setTempIconUrl(homeConfig.iconImage || "");
    }
    setIsEditingIcon(!isEditingIcon);
  };

  const handleHeaderEdit = () => {
    if (isEditingHeader) {
      saveHomeConfig({ ...homeConfig, headerImage: tempHeaderUrl });
    } else {
      setTempHeaderUrl(homeConfig.headerImage || "");
    }
    setIsEditingHeader(!isEditingHeader);
  };

  const handleCalendarToggle = (enabled: boolean) => {
    saveHomeConfig({ ...homeConfig, showCalendar: enabled });
  };

  const handleQuickActionToggle = (actionId: string, enabled: boolean) => {
    const newActions = enabled 
      ? [...homeConfig.quickActions, actionId]
      : homeConfig.quickActions.filter(action => action !== actionId);
    saveHomeConfig({ ...homeConfig, quickActions: newActions });
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

      {/* Homepage Customization */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>Homepage Customization</CardTitle>
          <CardDescription>
            Personalize your homepage experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Greeting Customization */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Greeting Message</Label>
            <div className="flex items-center gap-2">
              {isEditingGreeting ? (
                <>
                  <Input
                    value={tempGreeting}
                    onChange={(e) => setTempGreeting(e.target.value)}
                    className="flex-1"
                    placeholder="Enter your greeting"
                  />
                  <Button onClick={handleGreetingEdit} size="sm" variant="outline">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditingGreeting(false);
                      setTempGreeting(homeConfig.greeting);
                    }} 
                    size="sm" 
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 p-2 bg-muted rounded-md">
                    {homeConfig.greeting}
                  </div>
                  <Button onClick={handleGreetingEdit} size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Calendar Section Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Calendar Section</Label>
              <p className="text-sm text-muted-foreground">
                Show today's highlights and calendar events on homepage
              </p>
            </div>
            <Switch 
              checked={homeConfig.showCalendar} 
              onCheckedChange={handleCalendarToggle}
            />
          </div>

          {/* Icon Image */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Profile Icon</Label>
            <div className="flex items-center gap-2">
              {isEditingIcon ? (
                <>
                  <Input
                    value={tempIconUrl}
                    onChange={(e) => setTempIconUrl(e.target.value)}
                    className="flex-1"
                    placeholder="Enter image URL"
                  />
                  <Button onClick={handleIconEdit} size="sm" variant="outline">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditingIcon(false);
                      setTempIconUrl(homeConfig.iconImage || "");
                    }} 
                    size="sm" 
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 p-2 bg-muted rounded-md flex items-center gap-2">
                    {homeConfig.iconImage ? (
                      <>
                        <img src={homeConfig.iconImage} alt="Icon" className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-sm truncate">{homeConfig.iconImage}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">No custom icon</span>
                    )}
                  </div>
                  <Button onClick={handleIconEdit} size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Header Image */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Header Background Image</Label>
            <div className="flex items-center gap-2">
              {isEditingHeader ? (
                <>
                  <Input
                    value={tempHeaderUrl}
                    onChange={(e) => setTempHeaderUrl(e.target.value)}
                    className="flex-1"
                    placeholder="Enter image URL"
                  />
                  <Button onClick={handleHeaderEdit} size="sm" variant="outline">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditingHeader(false);
                      setTempHeaderUrl(homeConfig.headerImage || "");
                    }} 
                    size="sm" 
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 p-2 bg-muted rounded-md">
                    {homeConfig.headerImage ? (
                      <span className="text-sm truncate block">{homeConfig.headerImage}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No custom header image</span>
                    )}
                  </div>
                  <Button onClick={handleHeaderEdit} size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Quick Actions</Label>
            <p className="text-sm text-muted-foreground">
              Choose which quick actions to display on your homepage
            </p>
            <div className="grid grid-cols-1 gap-3">
              {availableQuickActions.map((action) => {
                const Icon = action.icon;
                const isEnabled = homeConfig.quickActions.includes(action.id);
                
                return (
                  <div key={action.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={(checked) => 
                        handleQuickActionToggle(action.id, checked as boolean)
                      }
                    />
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{action.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Subscription</h3>
              <p className="text-sm text-muted-foreground">Free Plan</p>
            </div>
            <Badge variant="secondary">Free</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Family Members</h3>
              <p className="text-sm text-muted-foreground">2 adults, 1 child</p>
            </div>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Push Notifications</h3>
              <p className="text-sm text-muted-foreground">Get notified about events and updates</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Email Updates</h3>
              <p className="text-sm text-muted-foreground">Weekly summary and important announcements</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={() => navigate('/onboarding')}>
          Re-run Onboarding
        </Button>
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Settings;