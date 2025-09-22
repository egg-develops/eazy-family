import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  Calendar, 
  MapPin, 
  Camera, 
  Users, 
  ShoppingCart, 
  Settings, 
  Home,
  Bell,
  Search,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  { id: "home", label: "Home", icon: Home, path: "/app" },
  { id: "calendar", label: "Calendar", icon: Calendar, path: "/app/calendar" },
  { id: "events", label: "Events", icon: MapPin, path: "/app/events" },
  { id: "photos", label: "Photos", icon: Camera, path: "/app/photos" },
  { id: "community", label: "Community", icon: Users, path: "/app/community" },
  { id: "marketplace", label: "Market", icon: ShoppingCart, path: "/app/marketplace" },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userInitials, setUserInitials] = useState("EF");

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg text-foreground whitespace-nowrap">
                Eazy.Family
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

      {/* Main Content */}
      <main className="pb-20">
        {isHomePath ? <AppHome /> : <Outlet />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t">
        <div className="max-w-md mx-auto px-2 py-2">
          <div className="flex justify-around items-center">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 ${
                    isActive 
                      ? 'text-primary bg-primary/10' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Floating Action Button */}
      {!isHomePath && (
        <Button
          size="lg"
          className="fixed bottom-24 right-4 gradient-primary text-white border-0 hover:opacity-90 shadow-custom-lg rounded-full w-14 h-14 p-0"
          onClick={() => {
            // TODO: Add quick action based on current page
          }}
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

const AppHome = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <div className="gradient-warm rounded-2xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Good morning! ☀️</h2>
          <p className="text-white/90">Ready to make today amazing for your family?</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center shadow-custom-md">
          <div className="text-2xl font-bold text-primary">3</div>
          <div className="text-sm text-muted-foreground">Upcoming Events</div>
        </Card>
        <Card className="p-4 text-center shadow-custom-md">
          <div className="text-2xl font-bold text-accent">12</div>
          <div className="text-sm text-muted-foreground">New Photos</div>
        </Card>
      </div>

      {/* Today's Highlights */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Today's Highlights</h3>
        
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

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <Search className="w-6 h-6" />
            <span className="text-sm">Find Events</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <Camera className="w-6 h-6" />
            <span className="text-sm">Add Photos</span>
          </Button>
        </div>
      </div>

      {/* Community Updates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Community</h3>
        
        <Card className="p-4 shadow-custom-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 gradient-cool rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">MK</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">Maria K. shared in Daddy Day</h4>
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