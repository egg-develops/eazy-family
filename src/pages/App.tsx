import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Bell, 
  Plus, 
  Settings,
  Calendar,
  MapPin,
  Camera,
  Users,
  ShoppingCart,
  Home,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";

const AppLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userInitials, setUserInitials] = useState("EF");

  const navigationItems = [
    { id: "home", label: t('nav.home'), icon: Home, path: "/app" },
    { id: "calendar", label: t('nav.calendar'), icon: Calendar, path: "/app/calendar" },
    { id: "events", label: t('nav.events'), icon: MapPin, path: "/app/events" },
    { id: "photos", label: t('nav.photos'), icon: Camera, path: "/app/photos" },
    { id: "community", label: t('nav.community'), icon: Users, path: "/app/community" },
    { id: "marketplace", label: t('nav.marketplace'), icon: ShoppingCart, path: "/app/marketplace" },
  ];

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingData = localStorage.getItem('eazy-family-onboarding');
    if (!onboardingData) {
      navigate('/onboarding');
      return;
    }

    const data = JSON.parse(onboardingData);
    setUserInitials(data.userInitials || "EF");
  }, [navigate]);

  const currentPath = location.pathname;
  const isHomePath = currentPath === "/app" || currentPath === "/app/";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {(() => {
                const savedConfig = localStorage.getItem('eazy-family-home-config');
                const config = savedConfig ? JSON.parse(savedConfig) : {};
                const iconUrl = config.iconImage;
                
                return iconUrl ? (
                  <img src={iconUrl} alt="User icon" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{userInitials}</span>
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg text-foreground whitespace-nowrap">
                  {t('app.name')}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <Badge className="absolute -top-1 -right-1 w-2 h-2 p-0 bg-accent" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/settings')}>
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 pt-16 pb-32 md:pb-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {isHomePath ? <AppHome /> : <Outlet />}
          </div>
        </main>

        {/* Action Bar - Mobile Only (above bottom nav) */}
        <nav className="md:hidden fixed bottom-16 left-0 right-0 glass-effect border-t border-b">
          <div className="max-w-md mx-auto px-4 py-2 flex justify-center">
            <ExpandableTabs
              tabs={[
                { title: t('nav.settings'), icon: Settings },
                { title: t('common.notifications'), icon: Bell },
                { title: t('common.add'), icon: Plus },
              ]}
              onChange={(index) => {
                if (index === 0) navigate('/app/settings');
                // index 1 for notifications (future)
                // index 2 for add action (future)
              }}
            />
          </div>
        </nav>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-effect border-t">
          <div className="max-w-md mx-auto px-2 py-2">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex justify-center min-w-max px-2">
                <ExpandableTabs
                  tabs={navigationItems.map(item => ({
                    title: item.label,
                    icon: item.icon,
                  }))}
                  onChange={(index) => {
                    if (index !== null) {
                      navigate(navigationItems[index].path);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
};

interface HomeConfig {
  greeting: string;
  byline: string;
  showCalendar: boolean;
  quickActions: string[];
  iconImage?: string;
  headerImage?: string;
}

const AppHome = () => {
  const { t } = useTranslation();
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    const saved = localStorage.getItem('eazy-family-home-config');
    return saved ? JSON.parse(saved) : {
      greeting: t('app.greeting'),
      byline: t('app.byline'),
      showCalendar: true,
      quickActions: ["Find Events", "Add Photos"]
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <div 
          className="gradient-warm rounded-2xl p-6 text-center bg-cover bg-center relative overflow-hidden"
          style={homeConfig.headerImage ? { 
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${homeConfig.headerImage})` 
          } : {}}
        >
          <h2 className="text-2xl font-bold text-white mb-2 relative z-10">{homeConfig.greeting}</h2>
          <p className="text-white/90 relative z-10">{homeConfig.byline}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center shadow-custom-md">
          <div className="text-2xl font-bold text-primary">3</div>
          <div className="text-sm text-muted-foreground">{t('home.upcomingEvents')}</div>
        </Card>
        <Card className="p-4 text-center shadow-custom-md">
          <div className="text-2xl font-bold text-accent">12</div>
          <div className="text-sm text-muted-foreground">{t('home.newPhotos')}</div>
        </Card>
      </div>

      {/* Today's Highlights */}
      {homeConfig.showCalendar && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('home.todayHighlights')}</h3>
          
          <Card className="p-4 shadow-custom-md border-l-4 border-l-primary">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <h4 className="font-medium">Swimming Lesson</h4>
                <p className="text-sm text-muted-foreground">2:00 PM - Aquatic Center</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-custom-md border-l-4 border-l-accent">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-accent" />
              <div className="flex-1">
                <h4 className="font-medium">Children's Museum</h4>
                <p className="text-sm text-muted-foreground">Interactive Art Exhibition</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('home.quickActions')}</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {homeConfig.quickActions.map((action, index) => {
            const getIcon = (actionName: string) => {
              switch (actionName) {
                case "Find Events": return Search;
                case "Add Photos": return Camera;
                case "Calendar": return Calendar;
                case "Community": return Users;
                default: return Search;
              }
            };
            
            const ActionIcon = getIcon(action);
            
            return (
              <Button key={index} variant="outline" className="h-auto p-4 flex flex-col gap-2">
                <ActionIcon className="w-6 h-6" />
                <span className="text-sm">{action}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Community Updates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('home.community')}</h3>
        
        <Card className="p-4 shadow-custom-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 gradient-cool rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">MK</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">Maria K. {t('home.sharedIn')} Daddy Day</h4>
              <p className="text-sm text-muted-foreground mt-1">
                "Great playground at Seefeld Park! Kids loved the new equipment 🎪"
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">Daddy Day</Badge>
                <span className="text-xs text-muted-foreground">2h ago</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AppLayout;