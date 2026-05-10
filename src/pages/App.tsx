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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(-1);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const currentPointerYRef = useRef(0);
  const longPressOriginYRef = useRef(0);
  const prevActiveIndexRef = useRef(-1);
  const ezButtonRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    setMenuOpen(true);
    requestAnimationFrame(() => setMenuVisible(true));
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setTimeout(() => setMenuOpen(false), 200);
  };

  const handleEZPointerDown = (e: React.PointerEvent) => {
    isLongPressRef.current = false;
    currentPointerYRef.current = e.clientY;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    longPressTimer.current = setTimeout(() => {
      isLongPressRef.current = true;
      longPressOriginYRef.current = currentPointerYRef.current;
      haptic('heavy');
      openMenu();
    }, 500);
  };

  const handleEZPointerMove = (e: React.PointerEvent) => {
    currentPointerYRef.current = e.clientY;
    if (!isLongPressRef.current) return;
    const deltaY = longPressOriginYRef.current - e.clientY;
    const newIndex = deltaY < 40 ? -1 : Math.min(Math.floor((deltaY - 40) / 56), menuItems.length - 1);
    if (newIndex !== prevActiveIndexRef.current) {
      prevActiveIndexRef.current = newIndex;
      setActiveMenuIndex(newIndex);
      if (newIndex >= 0) haptic('light');
    }
  };

  const handleEZPointerUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (isLongPressRef.current) {
      if (activeMenuIndex >= 0) navigate(menuItems[activeMenuIndex].path);
      closeMenu();
      setActiveMenuIndex(-1);
      prevActiveIndexRef.current = -1;
      isLongPressRef.current = false;
    } else {
      haptic('medium');
      setEzOpen(true);
    }
  };

  const handleEZPointerCancel = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    isLongPressRef.current = false;
    setActiveMenuIndex(-1);
    prevActiveIndexRef.current = -1;
    closeMenu();
  };

  // Only cancel long-press timer on leave if the gesture hasn't fired yet.
  // Once isLongPressRef is true, pointer capture keeps events coming — leave is irrelevant.
  const handleEZPointerLeave = () => {
    if (!isLongPressRef.current && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Non-passive touchmove listener attached imperatively so we can call preventDefault()
  // and block the page scroll while the slide-up gesture is active.
  useEffect(() => {
    const el = ezButtonRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => { if (isLongPressRef.current) e.preventDefault(); };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  const JournalIcon = ({ color }: { color: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="13" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M17 3h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-1" stroke={color} strokeWidth="1.8"/>
      <line x1="8" y1="8" x2="13" y2="8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="13" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="8" y1="16" x2="11" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="17.5" cy="10" r="1.5" fill={color}/>
    </svg>
  );

  type MenuItem = {
    label: string;
    path: string;
    icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    customIcon?: (color: string) => React.ReactNode;
  };

  const menuItems: MenuItem[] = [
    { label: 'Home', icon: Home, path: '/app' },
    { label: 'Calendar', icon: Calendar, path: '/app/calendar' },
    { label: 'Tasks', icon: CheckSquare, path: '/app/todos' },
    { label: 'Shopping', icon: ShoppingCart, path: '/app/shopping' },
    { label: 'Rituals', customIcon: (c) => <JournalIcon color={c} />, path: '/app/rituals' },
  ];

  const navigationItems = [
    { id: "home", label: t('nav.home'), icon: Home, path: "/app" },
    { id: "calendar", label: t('nav.calendar'), icon: Calendar, path: "/app/calendar" },
    { id: "todos", label: "To-Do's", icon: CheckSquare, path: "/app/todos" },
    { id: "shopping", label: "Shopping", icon: ShoppingCart, path: "/app/shopping" },
    { id: "rituals", label: "Rituals", icon: Home, path: "/app/rituals" },
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

  useEffect(() => {
    const blockImageContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') e.preventDefault();
    };
    document.addEventListener('contextmenu', blockImageContextMenu);
    return () => document.removeEventListener('contextmenu', blockImageContextMenu);
  }, []);

  const currentPath = location.pathname;
  const isHomePath = currentPath === "/app" || currentPath === "/app/";
  const isCalendarPath = currentPath === "/app/calendar";
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Header — hidden on Calendar (it has its own) */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: '#FDF9F3', borderBottom: '1px solid #DAC1BB', paddingTop: 'max(0px, env(safe-area-inset-top))', display: isCalendarPath ? 'none' : undefined }}>
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
      <main className="flex-1 overflow-x-hidden" style={{ paddingTop: isCalendarPath ? 0 : '3.5rem', paddingBottom: isCalendarPath ? 0 : undefined }}>
        {isCalendarPath ? (
          <Outlet />
        ) : (
          <div className="max-w-7xl mx-auto px-4 pb-24 pt-3">
            {isHomePath ? <AppHome /> : <Outlet />}
          </div>
        )}
      </main>

      {/* Long press menu backdrop */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: menuVisible ? 'rgba(28,28,24,0.4)' : 'transparent', transition: 'background 0.2s' }}
          onClick={closeMenu}
        />
      )}

      {/* EZ Button + menu — floats above nav strip */}
      <div
        className="lg:hidden fixed z-50"
        style={{ bottom: 'calc(32px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)' }}
      >
        <div className="relative flex items-center justify-center">
          {/* Menu items — above button, bottom-to-top */}
          {menuOpen && (
            <div
              className="absolute flex flex-col-reverse items-center gap-2"
              style={{ bottom: '76px', left: '50%', transform: 'translateX(-50%)', pointerEvents: menuVisible ? 'auto' : 'none' }}
            >
              {menuItems.map((item, i) => {
                const isActive = activeMenuIndex === i;
                const delay = i * 40;
                const iconColor = isActive ? '#fff' : '#964735';
                const iconEl = item.customIcon
                  ? item.customIcon(iconColor)
                  : item.icon ? <item.icon className="w-4 h-4" style={{ color: iconColor }} /> : null;
                return (
                  <button
                    key={item.path}
                    onClick={() => { closeMenu(); haptic('tap'); navigate(item.path); }}
                    className={`${isActive ? 'ez-menu-pill-active' : 'ez-menu-pill'} flex items-center rounded-full font-semibold text-sm`}
                    style={{
                      width: '160px',
                      padding: '12px 16px',
                      boxShadow: isActive
                        ? '0 4px 20px rgba(150,71,53,0.4)'
                        : '0 4px 16px rgba(28,28,24,0.15)',
                      transform: isActive ? 'scale(1.06)' : (menuVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.9)'),
                      opacity: menuVisible ? 1 : 0,
                      transition: `transform 0.15s ease ${delay}ms, opacity 0.2s ease ${delay}ms, background-color 0.1s ease`,
                    }}
                  >
                    <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iconEl}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{item.label}</span>
                    <span style={{ width: '20px', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}

          <button
            ref={ezButtonRef}
            onPointerDown={handleEZPointerDown}
            onPointerMove={handleEZPointerMove}
            onPointerUp={handleEZPointerUp}
            onPointerLeave={handleEZPointerLeave}
            onPointerCancel={handleEZPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            className="relative flex items-center justify-center rounded-full select-none"
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)',
              boxShadow: menuOpen
                ? '0 0 0 6px rgba(150,71,53,0.25), 0 8px 24px rgba(150,71,53,0.5)'
                : '0 0 0 6px rgba(122,158,175,0.25), 0 8px 24px rgba(150,71,53,0.4)',
              touchAction: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <img src="/logo.png" alt="EZ" className="w-8 h-8 object-contain" style={{ filter: 'brightness(10)' }} />
          </button>
        </div>
      </div>

      {/* Nav strip — 32px background bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-49"
        style={{
          background: '#FDF9F3',
          borderTop: '1px solid #DAC1BB',
          height: 'calc(32px + env(safe-area-inset-bottom))',
        }}
      />

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

const getWeatherEmoji = (code: number): string => {
  if (code === 113) return "☀️";
  if (code === 116) return "⛅";
  if ([119, 122].includes(code)) return "☁️";
  if ([143, 248, 260].includes(code)) return "🌫️";
  if ([176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(code)) return "🌧️";
  if ([179, 182, 311, 314, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return "❄️";
  if ([200, 386, 389, 392, 395].includes(code)) return "⛈️";
  return "🌤️";
};

interface HourlySlot { hour: number; emoji: string; temp: number; }

const HomeWeatherInline = ({
  expanded,
  onToggle,
  onHourly,
}: {
  expanded: boolean;
  onToggle: () => void;
  onHourly: (slots: HourlySlot[]) => void;
}) => {
  const [emoji, setEmoji] = useState('');
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = localStorage.getItem('weather-locations');
        if (!saved) return;
        const locs = JSON.parse(saved);
        if (!locs?.length) return;
        const loc = locs[0];
        const query = loc.lat !== 0 ? `${loc.lat},${loc.lon}` : loc.name;
        const res = await fetch(`https://wttr.in/${encodeURIComponent(query)}?format=j1`);
        if (!res.ok) return;
        const data = await res.json();
        const current = data.current_condition?.[0];
        if (current) {
          setTemp(Math.round(parseFloat(current.temp_C)));
          setEmoji(getWeatherEmoji(parseInt(current.weatherCode, 10)));
        }
        const slots: HourlySlot[] = (data.weather?.[0]?.hourly || []).map((h: any) => ({
          hour: Math.floor(parseInt(h.time, 10) / 100),
          emoji: getWeatherEmoji(parseInt(h.weatherCode, 10)),
          temp: Math.round(parseFloat(h.tempC)),
        }));
        const now = new Date().getHours();
        const sorted = [...slots.filter(s => s.hour >= now), ...slots.filter(s => s.hour < now)].slice(0, 6);
        onHourly(sorted);
      } catch { /* silent */ }
    };
    load();
  }, []);

  if (!emoji && temp === null) return null;

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors"
      style={{
        background: expanded ? '#964735' : '#F1EDE7',
        border: '1px solid #DAC1BB',
      }}
    >
      <span className="text-base leading-none">{emoji}</span>
      {temp !== null && (
        <span className="text-sm font-semibold" style={{ color: expanded ? '#fff' : '#1C1C18' }}>
          {temp}°
        </span>
      )}
    </button>
  );
};

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
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [weatherHourly, setWeatherHourly] = useState<HourlySlot[]>([]);
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

      {/* Morning greeting + weather */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-lg" style={{ color: '#1C1C18' }}>
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
          </p>
          <HomeWeatherInline
            expanded={weatherExpanded}
            onToggle={() => setWeatherExpanded(p => !p)}
            onHourly={setWeatherHourly}
          />
        </div>

        {/* Hourly forecast — drops below full row, toggle via pill */}
        {weatherExpanded && weatherHourly.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}>
            <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {weatherHourly.map((slot, i) => {
                const isNow = i === 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 px-5 py-3">
                    <span className="text-xs font-semibold" style={{ color: isNow ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                      {isNow ? 'Now' : `${slot.hour}:00`}
                    </span>
                    <span className="text-xl leading-none">{slot.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: '#fff' }}>{slot.temp}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Today's Rituals card */}
      <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#F7F3ED', border: '1px solid #DAC1BB' }}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6660' }}>Today's Rituals</p>
          <p className="font-bold text-lg" style={{ color: '#1C1C18' }}>
            {(() => {
              const completed: string[] = JSON.parse(localStorage.getItem('eazy-completed-rituals-today') || '[]');
              const total: Ritual[] = (() => { try { const s = localStorage.getItem('eazy-rituals-list'); return s ? JSON.parse(s) : []; } catch { return []; } })();
              const totalCount = total.length || 5;
              return `${completed.length} / ${totalCount} Done!`;
            })()}
          </p>
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