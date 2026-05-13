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
  const [isDragMode, setIsDragMode] = useState(false);
  const [buttonPos, setButtonPos] = useState<{ left: number; bottom: number } | null>(() => {
    try { const s = localStorage.getItem('eazy-button-pos'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSwipeMenuRef = useRef(false);
  const isDragModeRef = useRef(false);
  const dragMovedRef = useRef(false);
  const currentPointerYRef = useRef(0);
  const currentPointerXRef = useRef(0);
  const swipeStartYRef = useRef(0);
  const longPressOriginYRef = useRef(0);
  const prevActiveIndexRef = useRef(-1);
  const ezButtonRef = useRef<HTMLButtonElement>(null);

  const snapButtonPos = (left: number, bottom: number): { left: number; bottom: number } => {
    const w = window.innerWidth;
    const anchors = [24, w / 2 - 32, w - 88];
    const nearestLeft = anchors.reduce((a, b) => Math.abs(a - left) < Math.abs(b - left) ? a : b);
    return { left: nearestLeft, bottom: Math.max(16, Math.min(window.innerHeight - 80, bottom)) };
  };

  const openMenu = () => {
    setMenuOpen(true);
    requestAnimationFrame(() => setMenuVisible(true));
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setTimeout(() => setMenuOpen(false), 200);
  };

  const handleEZPointerDown = (e: React.PointerEvent) => {
    isSwipeMenuRef.current = false;
    isDragModeRef.current = false;
    dragMovedRef.current = false;
    currentPointerYRef.current = e.clientY;
    currentPointerXRef.current = e.clientX;
    swipeStartYRef.current = e.clientY;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    // Long hold → enter drag mode
    longPressTimer.current = setTimeout(() => {
      if (!isSwipeMenuRef.current) {
        isDragModeRef.current = true;
        setIsDragMode(true);
        haptic('heavy');
      }
    }, 500);
  };

  const handleEZPointerMove = (e: React.PointerEvent) => {
    currentPointerYRef.current = e.clientY;
    currentPointerXRef.current = e.clientX;

    // Drag mode — move the button
    if (isDragModeRef.current) {
      dragMovedRef.current = true;
      const newLeft = e.clientX - 32;
      const newBottom = window.innerHeight - e.clientY - 32;
      const pos = {
        left: Math.max(8, Math.min(window.innerWidth - 72, newLeft)),
        bottom: Math.max(16, Math.min(window.innerHeight - 80, newBottom)),
      };
      setButtonPos(pos);
      return;
    }

    const swipeDelta = swipeStartYRef.current - e.clientY;

    if (!isSwipeMenuRef.current) {
      // Detect upward swipe — open menu
      if (swipeDelta > 20) {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        isSwipeMenuRef.current = true;
        longPressOriginYRef.current = swipeStartYRef.current;
        haptic('heavy');
        openMenu();
      }
      return;
    }

    // Menu open — track which item the finger is over
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

    if (isDragModeRef.current) {
      isDragModeRef.current = false;
      setIsDragMode(false);
      if (dragMovedRef.current) {
        // Snap to nearest horizontal anchor, preserve vertical position
        setButtonPos(prev => {
          if (!prev) return prev;
          const snapped = snapButtonPos(prev.left, prev.bottom);
          localStorage.setItem('eazy-button-pos', JSON.stringify(snapped));
          return snapped;
        });
        haptic('light');
      } else {
        // Long press, no move → EZ Capture
        haptic('medium');
        setEzOpen(true);
      }
      return;
    }

    if (isSwipeMenuRef.current) {
      if (activeMenuIndex >= 0) navigate(menuItems[activeMenuIndex].path);
      closeMenu();
      setActiveMenuIndex(-1);
      prevActiveIndexRef.current = -1;
      isSwipeMenuRef.current = false;
    } else {
      // Tap → EZ Capture
      haptic('medium');
      setEzOpen(true);
    }
  };

  const handleEZPointerCancel = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    isSwipeMenuRef.current = false;
    isDragModeRef.current = false;
    dragMovedRef.current = false;
    setIsDragMode(false);
    setActiveMenuIndex(-1);
    prevActiveIndexRef.current = -1;
    closeMenu();
  };

  // Cancel timer on leave only if neither swipe menu nor drag mode is active.
  const handleEZPointerLeave = () => {
    if (!isSwipeMenuRef.current && !isDragModeRef.current && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Non-passive touchmove to block page scroll during swipe-up or drag.
  useEffect(() => {
    const el = ezButtonRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (isSwipeMenuRef.current || isDragModeRef.current) e.preventDefault();
    };
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
    { label: 'Settings', icon: Settings, path: '/app/settings' },
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
  const isFamilyAgendaPath = currentPath === "/app/family-agenda";
  const isHelpPath = currentPath === "/app/help";
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Header — hidden on Calendar (it has its own) */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: '#FDF9F3', borderBottom: '1px solid #DAC1BB', paddingTop: 'max(0px, env(safe-area-inset-top))', display: (isCalendarPath || isFamilyAgendaPath || isHelpPath) ? 'none' : undefined }}>
        <div className="flex items-center justify-center px-4 h-14 max-w-7xl mx-auto">
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
                { path: '/app/family-agenda', label: 'Family' },
                { path: '/app/messaging', label: 'Messages' },
                { path: '/app/events', label: 'Events' },
                { path: '/app/community', label: 'Community' },
              ];
              return allNav.find(n => currentPath.startsWith(n.path))?.label ?? 'Eazy.Family';
            })()}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden" style={{ paddingTop: (isCalendarPath || isFamilyAgendaPath || isHelpPath) ? 0 : '3.5rem', paddingBottom: (isCalendarPath || isFamilyAgendaPath || isHelpPath) ? 0 : undefined }}>
        {(isCalendarPath || isFamilyAgendaPath || isHelpPath) ? (
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

      {/* EZ Button + menu */}
      <div
        className="lg:hidden fixed z-50"
        style={buttonPos
          ? { bottom: `${buttonPos.bottom}px`, left: `${buttonPos.left}px`, transition: isDragMode ? 'none' : 'left 0.25s ease, bottom 0.25s ease' }
          : { bottom: 'calc(32px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)' }
        }
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
              boxShadow: isDragMode
                ? '0 0 0 8px rgba(150,71,53,0.2), 0 12px 32px rgba(150,71,53,0.6)'
                : menuOpen
                  ? '0 0 0 6px rgba(150,71,53,0.25), 0 8px 24px rgba(150,71,53,0.5)'
                  : '0 0 0 6px rgba(122,158,175,0.25), 0 8px 24px rgba(150,71,53,0.4)',
              transform: isDragMode ? 'scale(1.12)' : undefined,
              transition: isDragMode ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
              touchAction: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <img src="/logo.png" alt="EZ" className="w-8 h-8 object-contain" style={{ filter: 'brightness(10)' }} />
          </button>
        </div>
      </div>


      {/* EZ Capture Overlay */}
      {ezOpen && <EZCapture onClose={() => setEzOpen(false)} defaultType={
        currentPath.includes('/shopping') ? 'shopping' :
        currentPath.includes('/todos') ? 'task' :
        currentPath.includes('/calendar') ? 'event' :
        'event'
      } />}
    </div>
  );
};

interface HomeConfig {
  greeting: string;
  byline: string;
  showCalendar: boolean;
  showWeather: boolean;
  showGreeting: boolean;
  showRituals?: boolean;
  showTasks?: boolean;
  showFamilyChannel?: boolean;
  showGallery?: boolean;
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
    const fetchWeather = async (query: string) => {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(query)}?format=j1`);
        if (!res.ok) return;
        const data = await res.json();
        const current = data.current_condition?.[0];
        if (current) {
          setTemp(Math.round(parseFloat(current.temp_C)));
          setEmoji(getWeatherEmoji(parseInt(current.weatherCode, 10)));
        }
        const now = new Date().getHours();
        const slots: HourlySlot[] = (data.weather?.[0]?.hourly || []).map((h: any) => ({
          hour: Math.floor(parseInt(h.time, 10) / 100),
          emoji: getWeatherEmoji(parseInt(h.weatherCode, 10)),
          temp: Math.round(parseFloat(h.tempC)),
        }));
        const sorted = [...slots.filter(s => s.hour >= now), ...slots.filter(s => s.hour < now)].slice(0, 8);
        onHourly(sorted);
      } catch { /* silent */ }
    };

    const load = async () => {
      // Try stored location first
      try {
        const saved = localStorage.getItem('weather-locations');
        if (saved) {
          const locs = JSON.parse(saved);
          if (locs?.length) {
            const loc = locs[0];
            const query = (loc.lat && loc.lat !== 0) ? `${loc.lat},${loc.lon}` : (loc.name || 'auto');
            await fetchWeather(query);
            return;
          }
        }
      } catch { /* ignore */ }

      // Try geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
          () => fetchWeather('auto'),
          { timeout: 5000 }
        );
      } else {
        fetchWeather('auto');
      }
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
      <span style={{ fontSize: '1.1rem', lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{emoji}</span>
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
  const [sharedItems, setSharedItems] = useState<Array<{ id: string; title: string; type: string; initials: string; color: string }>>([]);
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [weatherHourly, setWeatherHourly] = useState<HourlySlot[]>([]);
  const [showInviteBanner, setShowInviteBanner] = useState(() =>
    !localStorage.getItem('eazy-family-invite-dismissed')
  );
  const inviteTouchY = useRef(0);
  const inviteTouchX = useRef(0);

  // Re-read config when Settings page saves changes
  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('eazy-family-home-config');
        if (saved) setHomeConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}
    };
    window.addEventListener('eazy-home-config-updated', handler);
    return () => window.removeEventListener('eazy-home-config-updated', handler);
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
    const fetchPendingTasks = async () => {
      try {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('completed', false)
          .eq('type', 'task');
        setPendingTasksCount(count || 0);
      } catch { /* silent */ }
    };
    fetchPendingTasks();
  }, []);

  useEffect(() => {
    if (!user) return;
    const COLORS = ['#D97B66', '#44664F', '#6E8FE5', '#EE7BB0', '#964735'];
    supabase.from('tasks').select('id, title, type, user_id').eq('type', 'shared').eq('completed', false).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => {
        setSharedItems((data || []).map((t, i) => ({
          id: t.id, title: t.title, type: 'task',
          initials: (t.user_id || 'U').slice(0, 2).toUpperCase(),
          color: COLORS[i % COLORS.length],
        })));
      });
  }, [user]);

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
          {homeConfig.showWeather !== false && (
            <HomeWeatherInline
              expanded={weatherExpanded}
              onToggle={() => setWeatherExpanded(p => !p)}
              onHourly={setWeatherHourly}
            />
          )}
        </div>

        {/* Hourly forecast — drops below full row, toggle via pill */}
        {homeConfig.showWeather !== false && weatherExpanded && weatherHourly.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}>
            <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-x' } as React.CSSProperties}>
              {weatherHourly.map((slot, i) => {
                const isNow = i === 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 px-5 py-3">
                    <span className="text-xs font-semibold" style={{ color: isNow ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                      {isNow ? 'Now' : `${slot.hour}:00`}
                    </span>
                    <span style={{ fontSize: '1.25rem', lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{slot.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: '#fff' }}>{slot.temp}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Today's Rituals card */}
      {homeConfig.showRituals !== false && <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#F7F3ED', border: '1px solid #DAC1BB' }}>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6660' }}>Today's Rituals</p>
          <p className="font-bold text-sm" style={{ color: '#1C1C18' }}>
            {(() => {
              const completed: string[] = JSON.parse(localStorage.getItem('eazy-completed-rituals-today') || '[]');
              const total: unknown[] = (() => { try { const s = localStorage.getItem('eazy-rituals-list'); return s ? JSON.parse(s) : []; } catch { return []; } })();
              const totalCount = total.length || 5;
              return `${completed.length}/${totalCount} Done!`;
            })()}
          </p>
        </div>
        <button
          onClick={() => navigate('/app/rituals')}
          className="px-4 py-2 rounded-full text-sm font-semibold text-white flex-shrink-0"
          style={{ background: '#964735' }}
        >
          Rituals
        </button>
      </div>}

      {/* Today / Next Up */}
      {homeConfig.showCalendar !== false && (() => {
        const now = new Date();
        const todayStr = now.toDateString();
        const todayEvts = calendarEvents
          .filter(e => e.startDate.toDateString() === todayStr)
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        if (todayEvts.length > 0) {
          return (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #DAC1BB' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1EDE7' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6660' }}>Today</p>
                <button onClick={() => navigate('/app/calendar')} className="text-xs font-semibold" style={{ color: '#964735' }}>Calendar</button>
              </div>
              {todayEvts.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < todayEvts.length - 1 ? '1px solid #F1EDE7' : 'none', background: '#FFFFFF' }}>
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: e.itemType === 'task' ? '#6E8FE5' : '#964735' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1C1C18' }}>{e.title}</p>
                    <p className="text-xs" style={{ color: '#7A6660' }}>{format(e.startDate, 'h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        const upcoming = calendarEvents
          .filter(e => e.startDate > now)
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
        if (upcoming) {
          return (
            <button onClick={() => navigate('/app/calendar')} className="w-full rounded-2xl p-4 text-left" style={{ background: '#FFFFFF', border: '1px solid #DAC1BB' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A6660' }}>Next Up</p>
              <p className="font-bold text-sm" style={{ color: '#1C1C18' }}>{upcoming.title}</p>
              <p className="text-xs mt-0.5" style={{ color: '#7A6660' }}>
                {upcoming.startDate.toDateString() === todayStr ? 'Today' : format(upcoming.startDate, 'EEE MMM d')} · {format(upcoming.startDate, 'h:mm a')}
              </p>
            </button>
          );
        }
        return (
          <button onClick={() => navigate('/app/calendar')} className="w-full rounded-2xl p-4 text-left" style={{ background: '#FFFFFF', border: '1px solid #DAC1BB' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A6660' }}>Today</p>
            <p className="text-sm" style={{ color: '#7A6660' }}>Nothing scheduled — enjoy your day!</p>
          </button>
        );
      })()}

      {/* Top Tasks */}
      {homeConfig.showTasks !== false && (
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DAC1BB', background: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1EDE7' }}>
          <p className="font-bold text-sm" style={{ color: '#1C1C18' }}>Top Tasks</p>
          <button onClick={() => navigate('/app/todos')} className="text-xs font-semibold" style={{ color: '#964735' }}>View All</button>
        </div>
        <QuickToDos navigate={navigate} />
      </div>
      )}

      {/* Family Channel */}
      {homeConfig.showFamilyChannel !== false && (() => {
        type ChannelMsg = { authorName: string; authorInitials: string; authorColor: string; content?: string; type: string; timestamp: string };
        let recentMsgs: ChannelMsg[] = [];
        try {
          const all: ChannelMsg[] = JSON.parse(localStorage.getItem('eazy-family-channel-messages') || '[]');
          recentMsgs = all.slice(-3).reverse();
        } catch { /* ignore */ }
        const msgPreview = (m: ChannelMsg) =>
          m.type === 'text' ? (m.content || '') :
          m.type === 'voice' ? '🎤 Voice message' :
          m.type === 'image' ? '📷 Photo' :
          m.type === 'location' ? '📍 Location' :
          m.type === 'poll' ? '📊 Poll' :
          m.type === 'document' ? '📄 Document' : 'New message';
        return (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DAC1BB', background: '#FFFFFF' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1EDE7' }}>
              <p className="font-bold text-sm" style={{ color: '#1C1C18' }}>Family Channel</p>
              <button onClick={() => navigate('/app/family-agenda')} className="text-xs font-semibold" style={{ color: '#964735' }}>Open</button>
            </div>
            {recentMsgs.length > 0 ? (
              recentMsgs.map((msg, i) => (
                <button key={i} onClick={() => navigate('/app/family-agenda')}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left"
                  style={{ borderBottom: i < recentMsgs.length - 1 ? '1px solid #F7F3ED' : 'none' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: msg.authorColor || '#964735' }}>
                    {msg.authorInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#1C1C18' }}>{msg.authorName}</p>
                    <p className="text-xs truncate" style={{ color: '#7A6660' }}>{msgPreview(msg)}</p>
                  </div>
                  <p className="text-xs flex-shrink-0" style={{ color: '#B5A09A' }}>
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </p>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-sm" style={{ color: '#7A6660' }}>No messages yet — start the conversation.</p>
                <button onClick={() => navigate('/app/family-agenda')} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full inline-block" style={{ background: '#F1EDE7', color: '#964735' }}>Open Channel</button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Gallery */}
      {homeConfig.showGallery !== false && headerImages.length > 0 && headerImages[0] !== '/hero-default.png' && (
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
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);

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
      setShowInlineAdd(false);
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
          <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 mx-3 my-1.5 rounded-2xl" style={{ background: '#F7F3ED' }}>
            <button
              onClick={() => toggleTask(task.id)}
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all"
              style={{ borderColor: task.completed ? '#964735' : '#C4AEA8', background: task.completed ? '#964735' : 'transparent' }}
            >
              {task.completed && <span className="text-white" style={{ fontSize: '9px', lineHeight: 1 }}>✓</span>}
            </button>
            <span
              className={`text-sm flex-1 ${task.completed ? 'line-through' : ''}`}
              style={{ color: task.completed ? '#7A6660' : '#1C1C18' }}
            >
              {task.title}
            </span>
          </div>
        ))}
        {quickTasks.length === 0 && !showInlineAdd && (
          <div className="px-4 py-4 text-center">
            <p className="text-sm" style={{ color: '#7A6660' }}>No tasks yet.</p>
          </div>
        )}
        {showInlineAdd && (
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: quickTasks.length ? '1px solid #F1EDE7' : 'none' }}>
            <input
              ref={inlineInputRef}
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') { setShowInlineAdd(false); setNewTaskTitle(''); }
              }}
              placeholder="Task name…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#1C1C18' }}
              autoFocus
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0"
              style={{ background: newTaskTitle.trim() ? '#964735' : '#DAC1BB', color: '#fff' }}
            >
              Add
            </button>
            <button onClick={() => { setShowInlineAdd(false); setNewTaskTitle(''); }} className="text-xs flex-shrink-0" style={{ color: '#7A6660' }}>✕</button>
          </div>
        )}
        {!showInlineAdd && (
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
            style={{ color: '#964735' }}
            onClick={() => setShowInlineAdd(true)}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>
      <ErrorBoundary>
        <GlobalTutorial />
      </ErrorBoundary>
    </div>
  );
};

export default AppLayout;