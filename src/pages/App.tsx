import { useState, useEffect, useRef } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalTutorial } from "@/components/GlobalTutorial";
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
  CloudSun,
  X,
  RefreshCw,
  MessageCircle,
  Trash2,
  ImagePlus
} from "lucide-react";
import { EZCapture } from "@/components/EZCapture";
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
import { compressAndUpload, deleteStorageFile } from "@/lib/imageUpload";
import { error as logError } from "@/lib/logger";
import { haptic } from "@/lib/haptic";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";
import { format } from "date-fns";

const AppLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userInitials, setUserInitials] = useState("EF");
  const [ezOpen, setEzOpen] = useState(false);

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
    try {
      const onboardingData = localStorage.getItem('eazy-family-onboarding');
      if (onboardingData) {
        const data = JSON.parse(onboardingData);
        setUserInitials(data.userInitials || "EF");
      }
    } catch {}
  }, []);

  const currentPath = location.pathname;
  const isHomePath = currentPath === "/app" || currentPath === "/app/";
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: '#FDF9F3', borderBottom: '1px solid #DAC1BB', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
          {/* Left: user avatar → home */}
          <button onClick={() => navigate('/app')} className="flex-shrink-0">
            {(() => {
              let iconUrl: string | undefined;
              try { const s = localStorage.getItem('eazy-family-home-config'); if (s) iconUrl = JSON.parse(s)?.iconImage; } catch {}
              return iconUrl
                ? <img src={iconUrl} alt="Profile" className="w-9 h-9 rounded-full object-cover" style={{ border: '2px solid #D97B66' }} />
                : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#D97B66' }}>{userInitials.slice(0,2)}</div>;
            })()}
          </button>
          {/* Center: page title */}
          <h1 className="font-bold text-base" style={{ color: '#1C1C18' }}>
            {isHomePath ? 'Eazy.Family' : (() => {
              const allNav = [
                { path: '/app/calendar', label: 'Calendar' },
                { path: '/app/todos', label: 'Tasks' },
                { path: '/app/shopping', label: 'Shopping' },
                { path: '/app/family', label: 'Family' },
                { path: '/app/rituals', label: 'Rituals' },
                { path: '/app/settings', label: 'Settings' },
                { path: '/app/messaging', label: 'Messages' },
                { path: '/app/events', label: 'Events' },
                { path: '/app/community', label: 'Community' },
              ];
              return allNav.find(n => currentPath.startsWith(n.path))?.label ?? 'Eazy.Family';
            })()}
          </h1>
          {/* Right: settings gear */}
          <button onClick={() => navigate('/app/settings')} className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full" style={{ background: '#F1EDE7' }}>
            <Settings className="w-4 h-4" style={{ color: '#7A6660' }} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 lg:pb-6 overflow-x-hidden" style={{ paddingTop: '3.5rem' }}>
        <div className="max-w-7xl mx-auto px-4 pb-6 pt-3">
          {isHomePath ? <AppHome /> : <Outlet />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          background: '#FDF9F3',
          borderTop: '1px solid #DAC1BB',
          height: '80px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Calendar */}
        <button
          onClick={() => { haptic('tap'); navigate('/app/calendar'); }}
          className="flex flex-col items-center justify-center w-12 h-12"
        >
          <Calendar className="w-6 h-6" style={{ color: isActive('/app/calendar') ? '#964735' : '#B5A09A' }} />
        </button>

        {/* Tasks */}
        <button
          onClick={() => { haptic('tap'); navigate('/app/todos'); }}
          className="flex flex-col items-center justify-center w-12 h-12"
        >
          <CheckSquare className="w-6 h-6" style={{ color: isActive('/app/todos') ? '#964735' : '#B5A09A' }} />
        </button>

        {/* EZ Button — center, elevated */}
        <div className="relative flex items-center justify-center" style={{ marginBottom: '20px' }}>
          <button
            onClick={() => { haptic('medium'); setEzOpen(true); }}
            className="relative flex items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)',
              boxShadow: '0 0 0 6px rgba(122,158,175,0.25), 0 8px 24px rgba(150,71,53,0.4)',
            }}
          >
            <img src="/logo.png" alt="EZ" className="w-8 h-8 object-contain" style={{ filter: 'brightness(10)' }} />
          </button>
        </div>

        {/* Shopping */}
        <button
          onClick={() => { haptic('tap'); navigate('/app/shopping'); }}
          className="flex flex-col items-center justify-center w-12 h-12"
        >
          <ShoppingCart className="w-6 h-6" style={{ color: isActive('/app/shopping') ? '#964735' : '#B5A09A' }} />
        </button>

        {/* Family */}
        <button
          onClick={() => { haptic('tap'); navigate('/app/family'); }}
          className="flex flex-col items-center justify-center w-12 h-12"
        >
          <Users className="w-6 h-6" style={{ color: isActive('/app/family') ? '#964735' : '#B5A09A' }} />
        </button>
      </nav>

      {/* EZ Capture Overlay */}
      {ezOpen && <EZCapture onClose={() => setEzOpen(false)} />}
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
    try {
      const saved = localStorage.getItem('eazy-family-home-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const headerImages = parsed.headerImages || (parsed.headerImage ? [parsed.headerImage] : []);
        return {
          ...parsed,
          showGreeting: parsed.showGreeting !== false,
          topNotifications: parsed.topNotifications || ["Upcoming Events", "Pending Tasks"],
          quickActions: parsed.quickActions || [],
          headerImages: headerImages.length > 0 ? headerImages : ["/hero-default.png"],
          headerImage: headerImages[0] || "/hero-default.png",
        };
      }
    } catch {
      localStorage.removeItem('eazy-family-home-config');
    }
    // Default config when nothing is saved
    return {
      greeting: t('app.greeting'),
      byline: t('app.byline'),
      showCalendar: true,
      showWeather: true,
      showGreeting: true,
      topNotifications: ["Upcoming Events", "Pending Tasks"],
      quickActions: ["Find Events"],
      headerImage: "/hero-default.png",
      headerImages: ["/hero-default.png"],
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
  const [showInviteBanner, setShowInviteBanner] = useState(() =>
    !localStorage.getItem('eazy-family-invite-dismissed')
  );
  const inviteTouchY = useRef(0);
  const inviteTouchX = useRef(0);

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
    const currentImages = homeConfig.headerImages || (homeConfig.headerImage ? [homeConfig.headerImage] : []);
    if (currentImages.length >= 4) return; // already at max

    const validationResult = validateImageFile(file);
    if (!validationResult.valid) {
      logError('File validation failed:', validationResult.error);
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      const publicUrl = await compressAndUpload(file, 'user-uploads', filePath);

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
    const removed = currentImages[index];
    const updated = currentImages.filter((_, i) => i !== index);
    saveConfig({ ...homeConfig, headerImage: updated[0] ?? null, headerImages: updated });
    setCarouselIndex(0);
    if (removed) deleteStorageFile('user-uploads', removed).catch(() => {});
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
    <div className="space-y-4 pb-4">

      {/* Hidden file input for gallery management */}
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

      {/* Gallery Management Dialog */}
      <Dialog open={showGalleryDialog} onOpenChange={setShowGalleryDialog}>
        <DialogContent className="w-[95%] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Hero Images ({headerImages.length}/4)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3 py-2">
            {headerImages.map((img, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden bg-muted" style={{ height: '72px' }}>
                <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeleteHeaderImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-destructive/80 hover:bg-destructive rounded-full text-white transition-colors"
                  aria-label="Delete image"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {headerImages.length < 4 && (
              <button
                onClick={() => headerImageInputRef.current?.click()}
                className="rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                style={{ height: '72px' }}
              >
                <ImagePlus className="w-4 h-4" />
                <span className="text-xs">Add</span>
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGalleryDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Morning greeting */}
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#B5A09A' }}>
          {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
        </p>
        <h1 className="text-2xl font-bold leading-tight" style={{ color: '#1C1C18' }}>
          {homeConfig.greeting || 'Your Family'}
        </h1>
        <p className="text-sm" style={{ color: '#7A6660' }}>
          {homeConfig.byline || 'The house is quiet, and your day is beautifully mapped out.'}
        </p>
      </div>

      {/* Today's Rituals card */}
      <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#F7F3ED', border: '1px solid #DAC1BB' }}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6660' }}>Today's Rituals</p>
          <p className="font-bold text-lg" style={{ color: '#1C1C18' }}>
            {(() => {
              const completed = JSON.parse(localStorage.getItem('eazy-completed-rituals-today') || '[]');
              return `You're at ${Math.round((completed.length / 5) * 100)}% completion`;
            })()}
          </p>
          <p className="text-xs" style={{ color: '#7A6660' }}>3 of 5 family connection moments shared. The evening storytime is next.</p>
        </div>
        <button
          onClick={() => navigate('/app/rituals')}
          className="px-4 py-2 rounded-full text-sm font-semibold text-white flex-shrink-0"
          style={{ background: '#964735' }}
        >
          Open Rituals
        </button>
      </div>

      {/* Next Up */}
      {(() => {
        const all = calendarEvents.filter(e => e.startDate >= new Date()).sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
        const next = all[0];
        if (!next) return null;
        return (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFFFFF', border: '1px solid #DAC1BB' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6660' }}>Next Up</p>
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: '#1C1C18' }}>{next.title}</p>
              <p className="text-sm" style={{ color: '#7A6660' }}>
                {next.startDate.toDateString() === new Date().toDateString() ? 'Today' : format(next.startDate, 'EEE MMM d')} · {format(next.startDate, 'h:mm a')}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Top Tasks */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DAC1BB', background: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1EDE7' }}>
          <p className="font-bold text-sm" style={{ color: '#1C1C18' }}>Top Tasks</p>
          <button onClick={() => navigate('/app/todos')} className="text-xs font-semibold" style={{ color: '#964735' }}>View All</button>
        </div>
        <QuickToDos navigate={navigate} />
      </div>

      {/* Family Feed */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DAC1BB', background: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1EDE7' }}>
          <p className="font-bold text-sm" style={{ color: '#1C1C18' }}>Family Feed</p>
          <button className="text-xs font-semibold" style={{ color: '#964735' }}>View All</button>
        </div>
        <div className="divide-y" style={{ borderColor: '#F1EDE7' }}>
          {todayEvents.slice(0, 3).map(event => (
            <div key={event.id} className="flex items-start gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: '#F1EDE7' }}>📅</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#1C1C18' }}>{event.title}</p>
                <p className="text-xs" style={{ color: '#7A6660' }}>{format(event.startDate, 'h:mm a')}</p>
              </div>
            </div>
          ))}
          {todayEvents.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm" style={{ color: '#7A6660' }}>Nothing yet today. A calm start.</p>
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      {headerImages.length > 0 && headerImages[0] !== '/hero-default.png' && (
        <div className="rounded-2xl overflow-hidden relative aspect-video" style={{ border: '1px solid #DAC1BB' }}>
          <img src={headerImages[carouselIndex % headerImages.length]} alt="Family" className="w-full h-full object-cover" />
          <button
            onClick={() => setShowGalleryDialog(true)}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(253,249,243,0.9)' }}
          >
            <Camera className="w-4 h-4" style={{ color: '#964735' }} />
          </button>
        </div>
      )}
    </div>
  );
};

// Quick To-Do's Component
const QuickToDos = ({ navigate }: { navigate?: (path: string) => void }) => {
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
    <div>
      <div className="divide-y" style={{ borderColor: '#F1EDE7' }}>
        {quickTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3">
            <Checkbox
              id={task.id}
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
            />
            <label
              htmlFor={task.id}
              className={`text-sm flex-1 cursor-pointer ${task.completed ? 'line-through' : ''}`}
              style={{ color: task.completed ? '#7A6660' : '#1C1C18' }}
            >
              {task.title}
            </label>
            {hasCompletedTasks && task.completed && (
              <button onClick={clearCompletedTasks} className="text-xs" style={{ color: '#DAC1BB' }}>✓</button>
            )}
          </div>
        ))}
        {quickTasks.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-sm" style={{ color: '#7A6660' }}>No tasks yet. Tap below to add one.</p>
          </div>
        )}
        <button
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
          style={{ color: '#964735' }}
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add To-Do
        </button>
      </div>

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
                autoFocus
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)}
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
      <ErrorBoundary>
        <GlobalTutorial />
      </ErrorBoundary>
    </div>
  );
};

export default AppLayout;