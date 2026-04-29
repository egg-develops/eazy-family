import { useState, useEffect, useRef } from "react";
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
  Search,
  CheckSquare,
  Menu,
  Cloud,
  X,
  RefreshCw,
  MessageCircle,
  Trash2,
  ImagePlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { EazyAssistant } from "@/components/EazyAssistant";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Checkbox } from "@/components/ui/checkbox";
import { WeatherWidget } from "@/components/WeatherWidget";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile } from "@/lib/fileValidation";
import { error as logError } from "@/lib/logger";
import { haptic } from "@/lib/haptic";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";

const AppLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userInitials, setUserInitials] = useState("EF");

  const navigationItems = [
    { id: "home", label: t('nav.home'), icon: Home, path: "/app" },
    { id: "calendar", label: t('nav.calendar'), icon: Calendar, path: "/app/calendar" },
    { id: "todos", label: "To-Do's", icon: CheckSquare, path: "/app/todos" },
    { id: "events", label: t('nav.events'), icon: MapPin, path: "/app/events" },
    
    { id: "community", label: t('nav.community'), icon: Users, path: "/app/community" },
    { id: "messaging", label: "Messages", icon: MessageCircle, path: "/app/messaging" },
    { id: "settings", label: t('nav.settings'), icon: Settings, path: "/app/settings" },
  ];

  useEffect(() => {
    // Check if user has completed onboarding (skip for authenticated users)
    const onboardingData = localStorage.getItem('eazy-family-onboarding');
    if (onboardingData) {
      const data = JSON.parse(onboardingData);
      setUserInitials(data.userInitials || "EF");
    }
  }, []);

  const currentPath = location.pathname;
  const isHomePath = currentPath === "/app" || currentPath === "/app/";
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Hamburger Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background border shadow-lg z-50">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-3 cursor-pointer transition-colors ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app')}
              className="flex items-center gap-3 hover:bg-transparent p-0"
            >
              {(() => {
                const savedConfig = localStorage.getItem('eazy-family-home-config');
                const config = savedConfig ? JSON.parse(savedConfig) : {};
                const iconUrl = config.iconImage;
                
                return iconUrl ? (
                  <img src={iconUrl} alt="User icon" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <img src="/logo.png" alt="Eazy.Family" className="w-10 h-10 rounded-xl object-contain flex-shrink-0" />
                );
              })()}
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg text-foreground whitespace-nowrap">
                  {t('app.name')}
                </h1>
              </div>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16 pb-24 lg:pb-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {isHomePath ? <AppHome /> : <Outlet />}
        </div>
      </main>

      {/* Bottom Navigation - Mobile and Tablet */}
      <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 bg-card/95 backdrop-blur-md rounded-full px-4 py-3 shadow-custom-lg border border-border/50">
          {/* Menu Icon - Opens Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-12 w-12 rounded-full bg-muted/50 hover:bg-muted"
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-card border shadow-lg mb-2">
              {navigationItems.slice(1).map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => { haptic('tap'); navigate(item.path); }}
                    className={isActive(item.path) ? "bg-primary/10 text-primary font-medium" : ""}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Home Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { haptic('tap'); navigate("/app"); }}
            className={`h-12 w-12 rounded-full transition-all ${
              isHomePath 
                ? "bg-primary text-primary-foreground shadow-md scale-105" 
                : "bg-muted/50 hover:bg-muted"
            }`}
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </nav>
    </div>
  );
};

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

interface HomeCalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  location?: string;
  itemType?: 'event' | 'reminder' | 'task';
}

const AppHome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [snippetDay, setSnippetDay] = useState<Date | null>(null);
  const [calendarTasks, setCalendarTasks] = useState<HomeCalendarEvent[]>([]);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(() => {
    // Rotate carousel index on every homepage visit
    const key = 'eazy-carousel-visit-index';
    const prev = parseInt(sessionStorage.getItem(key) || '0', 10);
    const next = (prev + 1) % 4; // max 4 images
    sessionStorage.setItem(key, String(next));
    return next;
  });
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    const saved = localStorage.getItem('eazy-family-home-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        showGreeting: parsed.showGreeting !== false,
        topNotifications: parsed.topNotifications || ["Upcoming Events", "Pending Tasks"],
        quickActions: parsed.quickActions || [],
      };
    }
    // Default config when nothing is saved
    return {
      greeting: t('app.greeting'),
      byline: t('app.byline'),
      showCalendar: true,
      showWeather: true,
      showGreeting: true,
      topNotifications: ["Upcoming Events", "Pending Tasks"],
      quickActions: ["Find Events"]
    };
  });
  
  // Get calendar items from localStorage (events + reminders)
  const getCalendarItems = (): HomeCalendarEvent[] => {
    try {
      const saved = localStorage.getItem('eazy-family-calendar-items');
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item: unknown): HomeCalendarEvent | null => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;

          // Handle events (startDate) and reminders (dueDate)
          let startDate: Date | null = null;
          if (record.type === "event") {
            const raw = record.startDate;
            startDate = raw instanceof Date ? raw : typeof raw === "string" ? new Date(raw) : null;
          } else if (record.type === "reminder") {
            const raw = record.dueDate;
            startDate = raw instanceof Date ? raw : typeof raw === "string" ? new Date(raw) : null;
          }

          if (!startDate || Number.isNaN(startDate.getTime())) return null;

          const rawEndDate = record.endDate;
          const endDate =
            rawEndDate instanceof Date ? rawEndDate
              : typeof rawEndDate === "string" ? new Date(rawEndDate)
              : undefined;

          return {
            id: typeof record.id === "string" ? record.id : `${startDate.toISOString()}-${record.title ?? "item"}`,
            title: typeof record.title === "string" ? record.title : "Event",
            startDate,
            endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : undefined,
            allDay: typeof record.allDay === "boolean" ? record.allDay : false,
            location: typeof record.location === "string" ? record.location : undefined,
            itemType: record.type === "reminder" ? "reminder" : "event",
          };
        })
        .filter((event): event is HomeCalendarEvent => event !== null);
    } catch {
      return [];
    }
  };

  const [pendingTasksCount, setPendingTasksCount] = useState(0);

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
    const fetchPendingTasks = async () => {
      try {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('completed', false)
          .eq('type', 'task');
        setPendingTasksCount(count || 0);
      } catch {
        // silently fail
      }
    };
    fetchPendingTasks();
  }, []);

  // Sync tasks/reminders with due dates into the homepage calendar
  useEffect(() => {
    if (!user) return;
    const fetchTasksForCalendar = async () => {
      try {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, due_date, type')
          .not('due_date', 'is', null)
          .eq('completed', false)
          .in('type', ['task', 'shared']);
        if (data) {
          const events: HomeCalendarEvent[] = data
            .filter(t => t.due_date)
            .map(t => ({
              id: `task-${t.id}`,
              title: t.title,
              startDate: new Date(t.due_date!),
              itemType: 'task' as const,
            }));
          setCalendarTasks(events);
        }
      } catch {
        // silently fail
      }
    };
    fetchTasksForCalendar();
  }, [user]);

  const calendarEvents = [...getCalendarItems(), ...calendarTasks];

  const todayEvents = calendarEvents.filter((event) => {
    const today = new Date();
    return event.startDate.toDateString() === today.toDateString();
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const upcomingEventsCount = calendarEvents.filter((event) => event.startDate >= startOfToday).length;

  const saveConfig = (newConfig: HomeConfig) => {
    setHomeConfig(newConfig);
    cloudSet('eazy-family-home-config', JSON.stringify(newConfig));
    if (user) {
      supabase.from('profiles').update({ home_config: newConfig }).eq('user_id', user.id).then(() => {});
    }
  };

  const removeCalendar = () => {
    saveConfig({ ...homeConfig, showCalendar: false });
  };

  const removeWeather = () => {
    saveConfig({ ...homeConfig, showWeather: false });
  };

  const addCalendar = () => {
    saveConfig({ ...homeConfig, showCalendar: true });
  };

  const addWeather = () => {
    saveConfig({ ...homeConfig, showWeather: true });
  };

  const handleHeaderImageUpload = async (file: File) => {
    const validationResult = validateImageFile(file);
    if (!validationResult.valid) {
      logError('File validation failed:', validationResult.error);
      return;
    }

    try {
      const { supabase } = await import("@/integrations/supabase/client");
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

      const currentImages = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);
      const updatedImages = [...currentImages, publicUrl].slice(-4); // max 4
      const newConfig = { ...homeConfig, headerImage: updatedImages[0], headerImages: updatedImages };
      saveConfig(newConfig);
    } catch (error) {
      logError('Upload error:', error);
    }
  };

  const handleDeleteHeaderImage = (index: number) => {
    const currentImages = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);
    const updated = currentImages.filter((_, i) => i !== index);
    saveConfig({ ...homeConfig, headerImage: updated[0] ?? null, headerImages: updated });
    setCarouselIndex(0);
  };

  // Header carousel rotation
  const headerImages = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);

  // Clamp visit-based index to actual image count
  useEffect(() => {
    if (headerImages.length > 0) {
      setCarouselIndex(prev => prev % headerImages.length);
    }
  }, [headerImages.length]);

  // Auto-rotate every 5 seconds when multiple images
  useEffect(() => {
    if (headerImages.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % headerImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [headerImages.length]);

  return (
    <div className="space-y-6">
      {/* Hero Image Carousel */}
      <input
        ref={headerImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleHeaderImageUpload(file);
        }}
      />
      {headerImages.length > 0 ? (
        <div className="relative rounded-2xl overflow-hidden bg-muted w-full" style={{ aspectRatio: '16/9' }}>
          {headerImages.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Hero ${i + 1}`}
              className={`carousel-image ${i === carouselIndex % headerImages.length ? 'active' : ''}`}
              style={{ objectFit: 'contain', objectPosition: 'center' }}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          {headerImages.length > 1 && (
            <div className="carousel-dots">
              {headerImages.map((_, i) => (
                <button
                  key={i}
                  className={`carousel-dot ${i === carouselIndex % headerImages.length ? 'active' : ''}`}
                  onClick={() => setCarouselIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setShowGalleryDialog(true)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-background/50 hover:bg-background/70 rounded-full text-foreground transition-colors z-10"
            title="Manage images"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => headerImageInputRef.current?.click()}
          className="relative rounded-2xl overflow-hidden bg-primary flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity group w-full"
          style={{ aspectRatio: '16/9' }}
        >
          <div className="text-center text-primary-foreground">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-80 group-hover:opacity-100 transition-opacity" />
            <p className="font-semibold text-lg">Add Hero Image</p>
          </div>
        </div>
      )}

      {/* Gallery Management Dialog */}
      <Dialog open={showGalleryDialog} onOpenChange={setShowGalleryDialog}>
        <DialogContent className="w-[95%] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Hero Images</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3 py-2">
            {headerImages.map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-muted">
                <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-contain" />
                <button
                  onClick={() => handleDeleteHeaderImage(i)}
                  className="absolute top-1.5 right-1.5 p-1 bg-destructive/80 hover:bg-destructive rounded-full text-white transition-colors"
                  aria-label="Delete image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {headerImages.length < 4 && (
              <button
                onClick={() => headerImageInputRef.current?.click()}
                className="aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">Add Photo</span>
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGalleryDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eazy Assistant */}
      <div data-tutorial="eazy-assistant">
        <EazyAssistant />
      </div>

      {/* Add Widget Buttons */}
      {(!homeConfig.showCalendar || !homeConfig.showWeather) && (
        <div className="grid grid-cols-2 gap-3">
          {!homeConfig.showCalendar && (
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2 border-2 border-blue-500/30 hover:border-blue-500 transition-all"
              onClick={addCalendar}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Calendar</span>
            </Button>
          )}
          {!homeConfig.showWeather && (
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2 border-2 border-cyan-500/30 hover:border-cyan-500 transition-all"
              onClick={addWeather}
            >
              <Cloud className="w-5 h-5" />
              <span className="text-sm">Weather</span>
            </Button>
          )}
        </div>
      )}

      {/* Weather Widget */}
      {homeConfig.showWeather && (
        <WeatherWidget onRemove={removeWeather} />
      )}

      {/* Today's Highlights */}
      {homeConfig.showCalendar && (
        <Card className="p-4 shadow-custom-md border-2 border-blue-500/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-3 ${calendarView === 'week' ? 'bg-background shadow-sm' : ''}`}
                    onClick={() => setCalendarView('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-3 ${calendarView === 'month' ? 'bg-background shadow-sm' : ''}`}
                    onClick={() => setCalendarView('month')}
                  >
                    Month
                  </Button>
                </div>
                <button
                  onClick={removeCalendar}
                  className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                  aria-label="Remove calendar"
                >×</button>
              </div>
            </div>

            {calendarView === 'week' && (() => {
              const now = new Date();
              const weekStart = new Date(now);
              // Start week on Monday
              const day = now.getDay();
              const diff = day === 0 ? -6 : 1 - day;
              weekStart.setDate(now.getDate() + diff);
              const weekDays = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                return d;
              });
              const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              return (
                <Card className="p-4 shadow-custom-md">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {weekDays.map((d, i) => {
                      const isToday = d.toDateString() === now.toDateString();
                      const dayEvents = calendarEvents.filter(e => e.startDate.toDateString() === d.toDateString());
                      return (
                        <button
                          key={i}
                          onClick={() => { if (dayEvents.length > 0) setSnippetDay(d); else navigate('/app/calendar'); }}
                          className={`p-2 rounded flex flex-col items-center transition-colors ${isToday ? 'bg-blue-500 text-white' : 'hover:bg-muted/70'}`}
                        >
                          <div className="text-xs opacity-70">{labels[i]}</div>
                          <div className="text-sm font-semibold">{d.getDate()}</div>
                          {dayEvents.length > 0 && (
                            <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isToday ? 'bg-white' : 'bg-blue-500'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })()}

            {calendarView === 'month' && (() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth();
              const today = now.getDate();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
              const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
                i < firstDay ? null : i - firstDay + 1
              );
              return (
                <Card className="p-4 shadow-custom-md">
                  <h4 className="font-semibold mb-3">{monthName}</h4>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} className="text-muted-foreground p-1">{d}</div>
                    ))}
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} />;
                      const cellDate = new Date(year, month, day);
                      const dayEvents = calendarEvents.filter(e => e.startDate.toDateString() === cellDate.toDateString());
                      const isToday = day === today;
                      return (
                        <button
                          key={i}
                          onClick={() => { if (dayEvents.length > 0) setSnippetDay(cellDate); else navigate('/app/calendar'); }}
                          className={`p-1 rounded flex flex-col items-center transition-colors ${isToday ? 'bg-blue-500 text-white font-bold' : 'hover:bg-muted/70'}`}
                        >
                          {day}
                          {dayEvents.length > 0 && (
                            <div className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-white' : 'bg-blue-500'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })()}

            {/* Day snippet popover */}
            {snippetDay && (() => {
              const dayEvts = calendarEvents.filter(e => e.startDate.toDateString() === snippetDay.toDateString());
              return (
                <Card className="p-4 shadow-custom-md border-l-4 border-l-blue-500 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">{snippetDay.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground">{dayEvts.length} item{dayEvts.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={() => setSnippetDay(null)} className="text-muted-foreground hover:text-foreground p-1">×</button>
                  </div>
                  <div className="space-y-2 mb-3">
                    {dayEvts.slice(0, 4).map(evt => (
                      <div key={evt.id} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${evt.itemType === 'task' ? 'bg-orange-400' : evt.itemType === 'reminder' ? 'bg-purple-400' : 'bg-blue-500'}`} />
                        <span className="text-sm truncate">{evt.title}</span>
                        {!evt.allDay && evt.itemType !== 'task' && (
                          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                            {evt.startDate.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                    {dayEvts.length > 4 && <p className="text-xs text-muted-foreground">+{dayEvts.length - 4} more</p>}
                  </div>
                  <Button size="sm" onClick={() => { setSnippetDay(null); navigate('/app/calendar'); }} className="w-full">
                    Open Calendar
                  </Button>
                </Card>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      {homeConfig.topNotifications && homeConfig.topNotifications.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {homeConfig.topNotifications.includes("Upcoming Events") && (
            <Card 
              className="p-4 text-center shadow-custom-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/app/calendar')}
            >
              <div className="text-2xl font-bold text-primary">{upcomingEventsCount}</div>
              <div className="text-sm text-muted-foreground">{t('home.upcomingEvents')}</div>
            </Card>
          )}
          {homeConfig.topNotifications.includes("Pending Tasks") && (
            <Card
              className="p-4 text-center shadow-custom-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/app/todos')}
            >
              <div className="text-2xl font-bold text-orange-600">{pendingTasksCount}</div>
              <div className="text-sm text-muted-foreground">Pending Tasks</div>
            </Card>
          )}
          {homeConfig.topNotifications.includes("Shopping List") && (
            <Card 
              className="p-4 text-center shadow-custom-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/app/todos')}
            >
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground">Shopping Items</div>
            </Card>
          )}
        </div>
      )}


      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('home.quickActions')}</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {homeConfig.quickActions && homeConfig.quickActions.map((action, index) => {
            const getIcon = (actionName: string) => {
              switch (actionName) {
                case "Find Events": return Search;
                case "Calendar": return Calendar;
                case "Community": return Users;
                case "To-Do List": return Calendar;
                case "Shopping List": return ShoppingCart;
                default: return Search;
              }
            };
            
            const ActionIcon = getIcon(action);
            const handleActionClick = () => {
              switch (action) {
                case "Find Events":
                  navigate('/app/events');
                  break;
                case "Calendar":
                  navigate('/app/calendar');
                  break;
                case "Community":
                  navigate('/app/community');
                  break;
                case "To-Do List":
                case "Shopping List":
                  navigate('/app/todos');
                  break;
              }
            };
            
            return (
              <Button 
                key={index} 
                variant="outline" 
                className="h-auto p-4 flex flex-col gap-2 border-2 border-primary/30 hover:border-primary transition-all"
                onClick={handleActionClick}
              >
                <ActionIcon className="w-5 h-5" />
                <span className="text-sm">{action}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Quick To-Do's Widget */}
      <QuickToDos />

      {/* Community Updates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('home.community')}</h3>
        
        <Card 
          className="p-4 shadow-custom-md cursor-pointer hover:shadow-custom-lg transition-shadow"
          onClick={() => navigate('/app/community')}
        >
          <div className="flex flex-col items-center text-center py-4">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <h4 className="font-medium text-sm mb-1">No community updates yet</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Join groups to connect with other families
            </p>
            <Button 
              size="sm" 
              className="gradient-primary text-white border-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/community');
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Explore Community
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Quick To-Do's Component
const QuickToDos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quickTasks, setQuickTasks] = useState<Array<{id: string, title: string, completed: boolean}>>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    loadQuickTasks();
  }, []);

  const loadQuickTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('type', 'task')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setQuickTasks(data || []);
    } catch (error) {
      logError('Error loading quick tasks:', error);
    }
  };

  const toggleTask = async (id: string) => {
    const task = quickTasks.find(t => t.id === id);
    if (!task) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', id);

      if (error) throw error;
      loadQuickTasks();
    } catch (error) {
      logError('Error toggling task:', error);
    }
  };

  const clearCompletedTasks = async () => {
    const completedIds = quickTasks.filter(t => t.completed).map(t => t.id);
    if (completedIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', completedIds);

      if (error) throw error;
      
      loadQuickTasks();
      toast({
        title: "Completed tasks cleared",
        description: `${completedIds.length} task(s) removed.`,
      });
    } catch (error) {
      logError('Error clearing completed tasks:', error);
      toast({
        title: "Error",
        description: "Could not clear completed tasks.",
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: newTaskTitle,
          type: 'task',
          user_id: user?.id || '',
        }]);

      if (error) throw error;

      setNewTaskTitle("");
      setIsAddDialogOpen(false);
      loadQuickTasks();
      
      toast({
        title: "Task Added",
        description: `"${newTaskTitle}" has been added to your list.`,
      });
    } catch (error) {
      logError('Error adding task:', error);
      toast({
        title: "Error",
        description: "Could not add task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const hasCompletedTasks = quickTasks.some(t => t.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quick To-Do's</h3>
        {hasCompletedTasks && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearCompletedTasks}
            className="h-8 w-8 p-0"
            title="Clear completed tasks"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <Card className="p-4 shadow-custom-md">
        <div className="space-y-3">
          {quickTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3">
              <Checkbox 
                id={task.id} 
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
              />
              <label 
                htmlFor={task.id} 
                className={`text-sm flex-1 cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}
              >
                {task.title}
              </label>
            </div>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add To-Do
          </Button>
        </div>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-task-title">Task Title</Label>
              <Input
                id="quick-task-title"
                placeholder="Enter task description..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppLayout;