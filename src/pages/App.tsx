import { useState, useEffect, useRef, Fragment } from "react";
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
  Home,
  Search,
  Menu,
  CloudSun,
  X,
  RefreshCw,
  MessageCircle,
  Trash2,
  ImagePlus,
  AlertTriangle,
  Clock,
  Users,
  CheckSquare
} from "lucide-react";
import { useConflictDetection } from "@/hooks/useConflictDetection";
import { useStaleTaskDetection } from "@/hooks/useStaleTaskDetection";
import { useWelcomeSeed } from "@/hooks/useWelcomeSeed";
import { seedReviewLocalData } from "@/lib/reviewSeed";
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
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile } from "@/lib/fileValidation";
import { compressAndUpload, deleteStorageFile } from "@/lib/imageUpload";
import { error as logError } from "@/lib/logger";
import { haptic } from "@/lib/haptic";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";
import { Capacitor } from "@capacitor/core";
import { voiceService } from "@/services/VoiceService";
import { format, addDays, startOfDay, isToday, isTomorrow } from "date-fns";
import { de as deLocale, fr as frLocale, it as itLocale, es as esLocale, pt as ptLocale, type Locale } from "date-fns/locale";

const getAppTitle = () => { try { const c = JSON.parse(localStorage.getItem('eazy-family-home-config') || '{}'); return c.appTitle || 'Eazy.Family'; } catch { return 'Eazy.Family'; } };

const AppLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userInitials, setUserInitials] = useState("EF");
  const [appTitle, setAppTitle] = useState(getAppTitle);
  const [ezOpen, setEzOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(-1);
  const [isDragMode, setIsDragMode] = useState(false);
  const [buttonPos, setButtonPos] = useState<{ left: number; bottom: number } | null>(() => {
    try { const s = localStorage.getItem('eazy-button-pos'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [ezIconOnly, setEzIconOnly] = useState(() => localStorage.getItem('eazy-ez-icon-only') === 'true');
  const [ezMenuOrder, setEzMenuOrder] = useState<string[] | null>(() => {
    try { const s = localStorage.getItem('eazy-ez-menu-order'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuOpenRef = useRef(false);
  const isSwipeMenuRef = useRef(false);
  const isDragModeRef = useRef(false);
  const dragMovedRef = useRef(false);
  const currentPointerYRef = useRef(0);
  const currentPointerXRef = useRef(0);
  const swipeStartYRef = useRef(0);
  const longPressOriginYRef = useRef(0);
  const prevActiveIndexRef = useRef(-1);
  const ezButtonRef = useRef<HTMLButtonElement>(null);
  // Prevents false swipe-up detection during initial hydration/auth re-renders.
  // Swipe mode is only allowed once the component has been stable for 600ms.
  const interactionReadyRef = useRef(false);


  const openMenu = () => {
    setMenuOpen(true);
    // setTimeout(fn, 0) is more reliable than rAF on first load when the
    // browser is busy — rAF can be held until the next paint which may be
    // delayed, causing the slide-up animation to stutter.
    setTimeout(() => setMenuVisible(true), 0);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setTimeout(() => setMenuOpen(false), 200);
  };

  const handleEZTap = () => {
    // Same EZ window everywhere — on the Family Channel it opens in message mode
    // (see the EZCapture mount below), not a separate component.
    setEzOpen(true);
  };

  const handleEZPointerDown = (e: React.PointerEvent) => {
    if (menuOpenRef.current) {
      // Menu is open — this touch scrolls through items or toggles the menu off.
      isSwipeMenuRef.current = true;
      isDragModeRef.current = false;
      dragMovedRef.current = false;
      currentPointerYRef.current = e.clientY;
      currentPointerXRef.current = e.clientX;
      swipeStartYRef.current = e.clientY;
      longPressOriginYRef.current = e.clientY;
      prevActiveIndexRef.current = -1;
      haptic('light');
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }
    isSwipeMenuRef.current = false;
    isDragModeRef.current = false;
    dragMovedRef.current = false;
    currentPointerYRef.current = e.clientY;
    currentPointerXRef.current = e.clientX;
    swipeStartYRef.current = e.clientY;
    haptic('tap');
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    // Long hold → enter drag mode; release without move → EZ Capture
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
      const itemH = ezIconOnly ? 64 : 48;
      const menuH = orderedMenuItems.length * itemH + Math.max(0, orderedMenuItems.length - 1) * 8;
      const maxBottom = Math.max(16, window.innerHeight - 76 - menuH - 24);
      const pos = {
        left: Math.max(8, Math.min(window.innerWidth - 72, newLeft)),
        bottom: Math.max(16, Math.min(maxBottom, newBottom)),
      };
      setButtonPos(pos);
      return;
    }

    const swipeDelta = swipeStartYRef.current - e.clientY;

    if (!isSwipeMenuRef.current) {
      // Require a more intentional upward swipe (40px) and only after the
      // component has settled — prevents first-touch jitter opening the menu.
      if (interactionReadyRef.current && swipeDelta > 40) {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        isSwipeMenuRef.current = true;
        longPressOriginYRef.current = swipeStartYRef.current;
        haptic('heavy');
        openMenu();
      }
      return;
    }

    // Menu open — track which item the finger is over (always upward swipe)
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
        setButtonPos(prev => {
          if (!prev) return prev;
          localStorage.setItem('eazy-button-pos', JSON.stringify(prev));
          return prev;
        });
        haptic('light');
      } else {
        // Long press, no move → EZ Capture (or channel tray on Family Channel)
        haptic('capture');
        handleEZTap();
      }
      return;
    }

    if (isSwipeMenuRef.current) {
      if (activeMenuIndex >= 0) {
        haptic('tap');
        navigate(orderedMenuItems[activeMenuIndex].path);
      } else {
        haptic('light'); // dismiss / toggle off with no item selected
      }
      closeMenu();
      setActiveMenuIndex(-1);
      prevActiveIndexRef.current = -1;
      isSwipeMenuRef.current = false;
    } else {
      // Tap on closed menu → open
      haptic('heavy');
      openMenu();
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

  // Keep menuOpenRef in sync so pointer handlers always read the current value.
  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

  // Mark interaction as ready after 600ms — prevents false swipe detection
  // during initial hydration and auth state re-renders.
  useEffect(() => {
    const t = setTimeout(() => { interactionReadyRef.current = true; }, 600);
    return () => clearTimeout(t);
  }, []);

  // Sync EZ button prefs when Settings changes them
  useEffect(() => {
    const handler = () => {
      setEzIconOnly(localStorage.getItem('eazy-ez-icon-only') === 'true');
      try { const s = localStorage.getItem('eazy-ez-menu-order'); setEzMenuOrder(s ? JSON.parse(s) : null); } catch {}
    };
    window.addEventListener('ez-prefs-changed', handler);
    return () => window.removeEventListener('ez-prefs-changed', handler);
  }, []);

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

  const CartCheckIcon = ({ color }: { color: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M2 3h2l3 12h10a2 2 0 0 0 2-1.5l1.5-6.5a.75.75 0 0 0-.75-.75H7" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 7h14" stroke={color} strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="9.5" cy="20.5" r="1.5" stroke={color} strokeWidth="1.75"/>
      <circle cx="16.5" cy="20.5" r="1.5" stroke={color} strokeWidth="1.75"/>
      <path d="M10 13l2 2 3.5-3.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

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
    { label: t('nav.home'), icon: Home, path: '/app' },
    { label: t('nav.calendar'), icon: Calendar, path: '/app/calendar' },
    { label: t('nav.family'), icon: Users, path: '/app/family-agenda' },
    { label: t('nav.lists'), icon: CheckSquare, path: '/app/lists' },
    { label: t('nav.rituals'), customIcon: (c) => <JournalIcon color={c} />, path: '/app/rituals' },
    { label: t('nav.settings'), icon: Settings, path: '/app/settings' },
  ];

  // Apply saved order from Settings
  const orderedMenuItems = ezMenuOrder
    ? (ezMenuOrder.map(p => menuItems.find(m => m.path === p)).filter(Boolean) as MenuItem[])
    : menuItems;

  useEffect(() => {
    try {
      const onboardingData = localStorage.getItem('eazy-family-onboarding');
      if (onboardingData) {
        const data = JSON.parse(onboardingData);
        setUserInitials(data.userInitials || "EF");
      }
    } catch {}
    const onConfigUpdate = () => setAppTitle(getAppTitle());
    window.addEventListener('eazy-home-config-updated', onConfigUpdate);
    return () => window.removeEventListener('eazy-home-config-updated', onConfigUpdate);
  }, []);

  // Eagerly warm mic permission on web only — native uses the Capacitor
  // speech plugin (via VoiceService) which prompts lazily on first use.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (localStorage.getItem('eazy-mic-asked')) return;
    voiceService.prewarmWebPermission().then((ok) => {
      if (ok) localStorage.setItem('eazy-mic-asked', '1');
    });
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
  const isFamilyChannelPath = currentPath === "/app/family-channel";
  const isHelpPath = currentPath === "/app/help";
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Header — hidden on Calendar (it has its own) */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: 'hsl(var(--background))', borderBottom: '1px solid hsl(var(--border))', paddingTop: 'max(0px, env(safe-area-inset-top))', display: (isCalendarPath || isFamilyAgendaPath || isFamilyChannelPath || isHelpPath) ? 'none' : undefined }}>
        <div className="flex items-center justify-center px-4 h-14 max-w-7xl mx-auto">
          {/* Center: page title */}
          <h1 className="font-bold text-2xl" style={{ color: 'hsl(var(--foreground))' }}>
            {isHomePath ? appTitle : (
              [
                { path: '/app/calendar', label: t('nav.calendar') },
                { path: '/app/lists', label: t('nav.lists') },
                { path: '/app/family', label: t('nav.family') },
                { path: '/app/rituals', label: t('nav.rituals') },
                { path: '/app/settings', label: t('nav.settings') },
                { path: '/app/help', label: t('nav.help') },
              ].find(n => currentPath.startsWith(n.path))?.label ?? 'Eazy.Family'
            )}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden" style={{ paddingTop: (isCalendarPath || isFamilyAgendaPath || isFamilyChannelPath || isHelpPath) ? 0 : '3.5rem', paddingBottom: (isCalendarPath || isFamilyAgendaPath || isFamilyChannelPath || isHelpPath) ? 0 : undefined }}>
        {(isCalendarPath || isFamilyAgendaPath || isFamilyChannelPath || isHelpPath) ? (
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
          className="fixed inset-0 z-40"
          style={{ background: menuVisible ? 'rgba(28,28,24,0.4)' : 'transparent', transition: 'background 0.2s' }}
          onClick={closeMenu}
        />
      )}

      {/* EZ Button + menu */}
      <div
        className="fixed z-50"
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
              style={{
                bottom: '76px',
                // Horizontal: clamp so menu never clips screen edges
                left: (() => {
                  const MENU_W = ezIconOnly ? 64 : 160;
                  const PAD = 8;
                  const btnLeft = buttonPos?.left ?? (window.innerWidth / 2 - 32);
                  const ideal = btnLeft + 32 - MENU_W / 2;
                  const clamped = Math.max(PAD, Math.min(window.innerWidth - MENU_W - PAD, ideal));
                  return `${clamped - btnLeft}px`;
                })(),
                pointerEvents: menuVisible ? 'auto' : 'none',
              }}
            >
              {orderedMenuItems.map((item, i) => {
                const isActive = activeMenuIndex === i;
                const delay = i * 22;
                const iconColor = isActive ? '#fff' : '#964735';
                const iconEl = item.customIcon
                  ? item.customIcon(iconColor)
                  : item.icon ? <item.icon className={ezIconOnly ? 'w-5 h-5' : 'w-4 h-4'} style={{ color: iconColor }} /> : null;
                return (
                  <button
                    key={item.path}
                    onClick={() => { closeMenu(); haptic('tap'); navigate(item.path); }}
                    className={`${isActive ? 'ez-menu-pill-active' : 'ez-menu-pill'} flex items-center justify-center rounded-full font-semibold text-sm`}
                    style={{
                      width: ezIconOnly ? '64px' : '160px',
                      height: ezIconOnly ? '64px' : undefined,
                      padding: ezIconOnly ? '0' : '12px 16px',
                      boxShadow: isActive
                        ? '0 4px 20px rgba(150,71,53,0.4)'
                        : '0 4px 16px rgba(28,28,24,0.15)',
                      transform: isActive ? 'scale(1.06)' : (menuVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.9)'),
                      opacity: menuVisible ? 1 : 0,
                      transition: `transform 0.15s ease ${delay}ms, opacity 0.2s ease ${delay}ms, background-color 0.1s ease`,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '20px' }}>{iconEl}</span>
                    {!ezIconOnly && <span style={{ flex: 1, textAlign: 'center' }}>{item.label}</span>}
                    {!ezIconOnly && <span style={{ width: '20px', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Compass arrows — visible only in drag mode, outside the halo */}
          {isDragMode && (
            <>
              {[
                { deg: 0,   x: '50%',  y: '-46px', tx: '-50%', ty: '0'    },
                { deg: 180, x: '50%',  y: 'auto',  tx: '-50%', ty: '0',  bottom: '-46px' },
                { deg: 270, x: '-46px',y: '50%',   tx: '0',    ty: '-50%' },
                { deg: 90,  x: 'auto', y: '50%',   tx: '0',    ty: '-50%', right: '-46px' },
              ].map(({ deg, x, y, tx, ty, bottom, right }, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: right ? undefined : x,
                    right: right ?? undefined,
                    top: bottom ? undefined : y,
                    bottom: bottom ?? undefined,
                    transform: `translate(${tx}, ${ty}) rotate(${deg}deg)`,
                    opacity: 0.72,
                    animation: 'ez-compass-in 0.2s ease both',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <path d="M2 8L7 2L12 8" stroke="#964735" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              ))}
            </>
          )}

          <button
            ref={ezButtonRef}
            data-tutorial="orb"
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
              willChange: 'transform',
              WebkitUserSelect: 'none',
            }}
          >
            <img src="/logo.png" alt="EZ" className="w-8 h-8 object-contain" style={{ filter: 'brightness(10)' }} />
          </button>
        </div>
      </div>


      {/* EZ Capture Overlay */}
      {ezOpen && <ErrorBoundary><EZCapture onClose={() => setEzOpen(false)}
        channelMode={currentPath.includes('family-channel')}
        defaultType={
        currentPath.includes('family-channel') ? 'journal' :
        currentPath.includes('/lists') && new URLSearchParams(window.location.search).get('tab') === 'shopping' ? 'shopping' :
        currentPath.includes('/lists') ? 'task' :
        currentPath.includes('/calendar') ? 'event' :
        currentPath.includes('/rituals') ? 'journal' :
        'event'
      } /></ErrorBoundary>}

      {/* Global tutorial — must live at AppLayout level so it hears events from any page */}
      <GlobalTutorial />
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
  showFamilyAgenda?: boolean;
  showStaleTasks?: boolean;
  topNotifications: string[];
  quickActions: string[];
  iconImage?: string;
  headerImage?: string;
  headerImages?: string[];
  appTitle?: string;
}

const DEFAULT_HOME_MODULE_ORDER = ['gallery', 'rituals', 'familyAgenda', 'familyChannel', 'calendar', 'tasks', 'staleTasks'];

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
  if ([143, 248, 260].includes(code)) return "☁️";
  if ([176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(code)) return "🌧️";
  if ([179, 182, 311, 314, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return "❄️";
  if ([200, 386, 389, 392, 395].includes(code)) return "⛅";
  return "⛅";
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
    const CACHE_KEY = 'eazy-weather-cache';
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    const applyData = (data: any) => {
      const current = data.current_condition?.[0];
      if (!current) return;
      const nowTemp = Math.round(parseFloat(current.temp_C));
      const nowEmoji = getWeatherEmoji(parseInt(current.weatherCode, 10));
      setTemp(nowTemp);
      setEmoji(nowEmoji);
      const currentHour = new Date().getHours();
      const mapHourly = (arr: any[], offset = 0): HourlySlot[] =>
        (arr || []).map((h: any) => ({
          hour: Math.floor(parseInt(h.time, 10) / 100) + offset,
          emoji: getWeatherEmoji(parseInt(h.weatherCode, 10)),
          temp: Math.round(parseFloat(h.tempC)),
        }));
      const todaySlots = mapHourly(data.weather?.[0]?.hourly).filter((s: HourlySlot) => s.hour > currentHour);
      const tomorrowSlots = mapHourly(data.weather?.[1]?.hourly, 24);
      onHourly([{ hour: currentHour, emoji: nowEmoji, temp: nowTemp }, ...[...todaySlots, ...tomorrowSlots].slice(0, 5)]);
    };

    const fetchWeather = async (query: string) => {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(query)}?format=j1`);
        if (!res.ok) return;
        const data = await res.json();
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
        applyData(data);
      } catch { /* silent */ }
    };

    const load = async () => {
      // Return cached result if fresh (avoids re-fetch on every home navigation)
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) { applyData(data); return; }
        }
      } catch {}

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
        background: expanded ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <span style={{ fontSize: '1.1rem', lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{emoji}</span>
      {temp !== null && (
        <span className="text-sm font-semibold" style={{ color: expanded ? '#fff' : 'hsl(var(--foreground))' }}>
          {temp}°
        </span>
      )}
    </button>
  );
};

const AppHome = () => {
  const { t, i18n } = useTranslation();
  const dateFnsLocale: Locale | undefined = ({ de: deLocale, fr: frLocale, it: itLocale, es: esLocale, pt: ptLocale } as Record<string, Locale>)[i18n.language.split('-')[0]];
  const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: dateFnsLocale });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [snippetDay, setSnippetDay] = useState<Date | null>(null);
  const [calendarTasks, setCalendarTasks] = useState<HomeCalendarEvent[]>([]);
  const [supabaseEvents, setSupabaseEvents] = useState<HomeCalendarEvent[]>([]);
  const [initialQuickTasks, setInitialQuickTasks] = useState<Array<{id: string, title: string, completed: boolean, due_date?: string | null}>>([]);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [showTourBanner, setShowTourBanner] = useState(() =>
    localStorage.getItem('eazy-tour-banner-dismissed') !== 'true'
  );
  const dismissTourBanner = () => {
    setShowTourBanner(false);
    localStorage.setItem('eazy-tour-banner-dismissed', 'true');
  };
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
            const raw = record.dueDate ?? record.startDate;
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

  const { conflicts } = useConflictDetection();
  const { staleTasks } = useStaleTaskDetection();
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [seedFamilyId, setSeedFamilyId] = useState<string | null>(null);
  useWelcomeSeed(user?.id, seedFamilyId, i18n.language);
  // App Review demo: seed local-only calendar/journal/ritual data on the
  // reviewer's device (no-op for everyone except the review account).
  useEffect(() => { seedReviewLocalData(user?.email); }, [user?.email]);
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

  const [homeModuleOrder, setHomeModuleOrder] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('eazy-home-module-order');
      if (s) {
        const saved: string[] = JSON.parse(s);
        const missing = DEFAULT_HOME_MODULE_ORDER.filter(k => !saved.includes(k));
        return [...saved, ...missing];
      }
    } catch {}
    return [...DEFAULT_HOME_MODULE_ORDER];
  });

  useEffect(() => {
    const handler = () => {
      try {
        const s = localStorage.getItem('eazy-home-module-order');
        if (s) {
          const saved: string[] = JSON.parse(s);
          const missing = DEFAULT_HOME_MODULE_ORDER.filter(k => !saved.includes(k));
          setHomeModuleOrder([...saved, ...missing]);
        }
      } catch {}
    };
    window.addEventListener('eazy-home-module-order-changed', handler);
    return () => window.removeEventListener('eazy-home-module-order-changed', handler);
  }, []);

  // Fetch pending task count independently (no user ID needed, RLS handles scoping)
  useEffect(() => {
    supabase.from('tasks').select('*', { count: 'exact', head: true })
      .eq('completed', false).in('type', ['task', 'shared'])
      .then(({ count }) => setPendingTasksCount(count || 0))
      .catch(() => {});
  }, []);

  // Fetch all user-scoped home data in parallel — one round-trip instead of four
  useEffect(() => {
    if (!user) return;
    const COLORS = ['#D97B66', '#44664F', '#6E8FE5', '#EE7BB0', '#964735'];
    Promise.all([
      supabase.from('profiles').select('home_config, family_id').eq('user_id', user.id).single(),
      supabase.from('tasks').select('id, title, type, user_id').eq('type', 'shared').eq('completed', false).order('created_at', { ascending: false }).limit(5),
      supabase.from('tasks').select('id, title, due_date, type').not('due_date', 'is', null).eq('completed', false).in('type', ['task', 'shared']),
      supabase.from('events').select('id, title, start_date, end_date, all_day, location').order('start_date', { ascending: true }).limit(90),
      supabase.from('tasks').select('*').eq('type', 'task').eq('completed', false).order('created_at', { ascending: false }).limit(3),
    ]).then(([profilesRes, sharedRes, calTasksRes, eventsRes, quickTasksRes]) => {
      if (profilesRes.data?.home_config && typeof profilesRes.data.home_config === 'object') {
        setHomeConfig(prev => {
          const merged = { ...prev, ...(profilesRes.data.home_config as Partial<HomeConfig>) };
          cloudSet('eazy-family-home-config', JSON.stringify(merged));
          return merged;
        });
      }
      if (profilesRes.data?.family_id) setSeedFamilyId(profilesRes.data.family_id);
      if (sharedRes.data) {
        setSharedItems(sharedRes.data.map((t, i) => ({
          id: t.id, title: t.title, type: 'task',
          initials: (t.user_id || 'U').slice(0, 2).toUpperCase(),
          color: COLORS[i % COLORS.length],
        })));
      }
      if (calTasksRes.data) {
        setCalendarTasks(calTasksRes.data.filter(t => t.due_date).map(t => ({
          id: `task-${t.id}`,
          title: t.title,
          startDate: new Date(t.due_date!),
          itemType: 'task' as const,
        })));
      }
      if (eventsRes.data) {
        setSupabaseEvents(eventsRes.data.map(e => ({
          id: `supabase-${e.id}`,
          title: e.title,
          startDate: new Date(e.start_date),
          endDate: e.end_date ? new Date(e.end_date) : undefined,
          allDay: e.all_day ?? false,
          location: e.location ?? undefined,
          itemType: 'event' as const,
        })));
      }
      if (quickTasksRes.data) setInitialQuickTasks(quickTasksRes.data);
    }).catch(() => {});
  }, [user]);

  const calendarEvents = [...getCalendarItems(), ...calendarTasks, ...supabaseEvents];

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
  // Only real uploads shown in carousel/gallery display
  const galleryImages = headerImages.filter((img: string) => img && img !== '/hero-default.png');

  // Clamp visit-based index to actual image count
  useEffect(() => {
    if (galleryImages.length > 0) {
      setCarouselIndex(prev => prev % galleryImages.length);
    }
  }, [galleryImages.length]);

  // Auto-rotate every 5 seconds when multiple images
  useEffect(() => {
    if (galleryImages.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % galleryImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [galleryImages.length]);

  const renderHomeModule = (key: string) => {
    switch (key) {
      case 'gallery':
        return homeConfig.showGallery !== false && (
          galleryImages.length > 0 ? (
            <div
              className="rounded-2xl overflow-hidden relative aspect-video"
              style={{ border: '1px solid hsl(var(--border))' }}
              onClick={() => setShowGalleryDialog(true)}
            >
              <img src={galleryImages[carouselIndex % galleryImages.length]} alt="Family" className="w-full h-full object-cover" />
              {galleryImages.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {galleryImages.map((_, i) => (
                    <div key={i} className="rounded-full" style={{ width: i === carouselIndex % galleryImages.length ? '16px' : '5px', height: '5px', background: i === carouselIndex % galleryImages.length ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s ease' }} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowGalleryDialog(true)} className="group w-full rounded-2xl flex items-center justify-between gap-4 p-4 transition-all hover:-translate-y-0.5" style={{ border: '1px solid #DAC1BB', background: 'linear-gradient(135deg, #FFFFFF 0%, #FDF3EE 100%)', boxShadow: '0 8px 24px rgba(150,71,53,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: '#FFDAD3', color: '#964735' }}>
                  <ImagePlus className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{t('home.addPhotos')}</p>
              </div>
              <Plus className="w-4 h-4" style={{ color: '#964735' }} />
            </button>
          )
        );

      case 'rituals':
        return homeConfig.showRituals !== false && (
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('home.ritualsSection')}</p>
              <p className="font-bold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                {(() => {
                  const completed: string[] = (() => { try { const stored = localStorage.getItem('eazy-completed-rituals-today'); if (!stored) return []; const parsed = JSON.parse(stored); if (Array.isArray(parsed)) return parsed; if (parsed.date === new Date().toDateString()) return parsed.ids || []; return []; } catch { return []; } })();
                  const total: unknown[] = (() => { try { const s = localStorage.getItem('eazy-rituals-list'); return s ? JSON.parse(s) : []; } catch { return []; } })();
                  return `${completed.length}/${total.length || 5} ${t('rituals.done')}`;
                })()}
              </p>
            </div>
            <button onClick={() => navigate('/app/rituals')} className="px-4 py-2 rounded-full text-sm font-semibold text-white flex-shrink-0" style={{ background: '#964735' }}>{t('rituals.title')}</button>
          </div>
        );

      case 'familyAgenda':
        return homeConfig.showFamilyAgenda !== false && (() => {
          const now = new Date();
          const cutoff = addDays(now, 60);
          const rawEvents: any[] = (() => { try { return JSON.parse(localStorage.getItem('eazy-family-calendar-items') || '[]'); } catch { return []; } })();
          const agendaEvents = rawEvents.filter(e => { if (!e.attendees?.length) return false; const d = new Date(e.startDate); return d >= startOfDay(now) && d <= cutoff; }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 5);
          const dateLabel = (d: Date) => isToday(d) ? t('home.today') : isTomorrow(d) ? t('home.tomorrow') : fmt(d, 'EEE, MMM d');
          return (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <p className="font-bold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('home.familyAgenda')}</p>
                <button onClick={() => navigate('/app/family-agenda')} className="text-xs font-semibold" style={{ color: '#964735' }}>{t('home.viewAll')}</button>
              </div>
              {agendaEvents.length > 0 ? agendaEvents.map((ev, i) => {
                const d = new Date(ev.startDate);
                return (
                  <button key={ev.id || i} onClick={() => navigate('/app/calendar?date=' + format(d, 'yyyy-MM-dd'))} className="w-full px-4 py-2.5 flex items-center gap-3 text-left" style={{ borderBottom: i < agendaEvents.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: ev.color || '#964735' }}>{ev.title.slice(0, 1).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>{ev.title}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{dateLabel(d)}{ev.allDay ? '' : ` · ${fmt(d, 'p')}`}</p>
                    </div>
                  </button>
                );
              }) : (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('home.noSharedEvents')}</p>
                  <button onClick={() => navigate('/app/family-agenda')} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full inline-block" style={{ background: 'hsl(var(--muted))', color: '#964735' }}>{t('home.openFamilyPage')}</button>
                </div>
              )}
            </div>
          );
        })();

      case 'familyChannel':
        return homeConfig.showFamilyChannel !== false && (() => {
          type ChannelMsg = { authorName: string; authorInitials: string; authorColor: string; content?: string; type: string; timestamp: string };
          let recentMsgs: ChannelMsg[] = [];
          try { const all: ChannelMsg[] = JSON.parse(localStorage.getItem('eazy-family-channel-messages') || '[]'); recentMsgs = all.slice(-3).reverse(); } catch { /* ignore */ }
          const msgPreview = (m: ChannelMsg) => m.type === 'text' ? (m.content || '') : m.type === 'voice' ? t('home.voiceMessage') : m.type === 'image' ? t('home.photoMessage') : m.type === 'location' ? t('home.locationMessage') : m.type === 'poll' ? t('home.pollMessage') : m.type === 'document' ? t('home.documentMessage') : t('home.newMessage');
          return (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <p className="font-bold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('home.familyChannel')}</p>
                <button onClick={() => navigate('/app/family-channel')} className="text-xs font-semibold" style={{ color: '#964735' }}>{t('home.open')}</button>
              </div>
              {recentMsgs.length > 0 ? recentMsgs.map((msg, i) => (
                <button key={i} onClick={() => navigate('/app/family-channel')} className="w-full px-4 py-2.5 flex items-center gap-3 text-left" style={{ borderBottom: i < recentMsgs.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: msg.authorColor || '#964735' }}>{msg.authorInitials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{msg.authorName}</p>
                    <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{msgPreview(msg)}</p>
                  </div>
                  <p className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>{fmt(new Date(msg.timestamp), 'p')}</p>
                </button>
              )) : (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('home.noMessages')}</p>
                  <button onClick={() => navigate('/app/family-channel')} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full inline-block" style={{ background: 'hsl(var(--muted))', color: '#964735' }}>{t('home.openChannel')}</button>
                </div>
              )}
            </div>
          );
        })();

      case 'calendar':
        return homeConfig.showCalendar !== false && (() => {
          const now = new Date();
          const todayStr = now.toDateString();
          const todayEvts = calendarEvents.filter(e => e.startDate.toDateString() === todayStr).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
          if (todayEvts.length > 0) {
            return (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('calendar.today')}</p>
                  <button onClick={() => navigate('/app/calendar')} className="text-xs font-semibold" style={{ color: '#964735' }}>{t('nav.calendar')}</button>
                </div>
                {todayEvts.map((e, i) => (
                  <button key={e.id} onClick={() => navigate('/app/calendar')} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: i < todayEvts.length - 1 ? '1px solid hsl(var(--border))' : 'none', background: 'hsl(var(--card))' }}>
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: e.itemType === 'task' ? '#6E8FE5' : '#964735' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{e.title}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{fmt(e.startDate, 'p')}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          }
          const upcoming = calendarEvents.filter(e => e.startDate > now).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
          if (upcoming) {
            return (
              <button onClick={() => navigate('/app/calendar')} className="w-full rounded-2xl p-4 text-left" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('home.nextUp')}</p>
                <p className="font-bold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{upcoming.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{upcoming.startDate.toDateString() === todayStr ? t('calendar.today') : fmt(upcoming.startDate, 'EEE MMM d')} · {fmt(upcoming.startDate, 'p')}</p>
              </button>
            );
          }
          return (
            <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('calendar.today')}</p>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('home.noEventsToday')}</p>
              <button onClick={() => navigate('/app/calendar')} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full inline-block" style={{ background: 'hsl(var(--muted))', color: '#964735' }}>{t('home.openCalendar')}</button>
            </div>
          );
        })();

      case 'tasks':
        return homeConfig.showTasks !== false && (
          <div data-tutorial="home-tasks" className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <p className="font-bold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('home.topTasks')}</p>
              <button onClick={() => navigate('/app/lists')} className="text-xs font-semibold" style={{ color: '#964735' }}>{t('home.viewAll')}</button>
            </div>
            <QuickToDos navigate={navigate} initialTasks={initialQuickTasks} />
          </div>
        );

      case 'staleTasks':
        return homeConfig.showStaleTasks !== false && staleTasks.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
              <p className="text-xs font-bold uppercase tracking-wide flex-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('home.overdueTasks')}</p>
              <button onClick={() => navigate('/app/lists')} className="text-xs font-semibold" style={{ color: '#964735' }}>{t('home.viewAll')}</button>
            </div>
            {staleTasks.slice(0, 3).map((task, i) => (
              <button key={task.id} onClick={() => navigate('/app/lists')} className="w-full px-4 py-3 text-left flex items-center gap-3" style={{ borderBottom: i < Math.min(staleTasks.length, 3) - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: task.isEscalated ? '#C4621A' : 'hsl(var(--border))' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{task.title}</p>
                  <p className="text-xs" style={{ color: task.isEscalated ? '#C4621A' : '#7A6660' }}>{task.isEscalated ? t('home.stuckFor') : t('home.noActivityFor')} {task.daysSinceUpdate}d{task.isEscalated ? ` ${t('home.delegateOrDrop')}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

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
                  className="tap-pad absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-destructive/80 hover:bg-destructive rounded-full text-white transition-colors"
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
      <div className="space-y-2" data-tutorial="home-greeting">
        <div className="flex items-center justify-between">
          <p className="font-bold text-lg" style={{ color: 'hsl(var(--foreground))' }}>
            {new Date().getHours() < 12 ? t('home.goodMorning') : new Date().getHours() < 17 ? t('home.goodAfternoon') : t('home.goodEvening')}
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
                      {isNow ? t('home.now') : `${slot.hour % 24}:00`}
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

      {/* Feature Tour Banner */}
      {showTourBanner && (
        <div
          className="rounded-2xl relative overflow-hidden"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          <button
            onClick={dismissTourBanner}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-4 pt-4 pb-4 pr-12">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="" className="w-6 h-6 object-contain" style={{ filter: 'none' }} />
              <p className="font-bold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                {t('home.tourBannerTitle')}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {([
                ['📅', t('home.tourBannerFeature1')],
                ['✅', t('home.tourBannerFeature2')],
                ['🟠', t('home.tourBannerFeature3')],
                ['🌅', t('home.tourBannerFeature4')],
              ] as [string, string][]).map(([icon, text]) => (
                <div key={text} className="flex items-center gap-2">
                  <span style={{ fontSize: '0.875rem', lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{icon}</span>
                  <span className="text-xs leading-snug" style={{ color: 'hsl(var(--muted-foreground))' }}>{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => window.dispatchEvent(new Event('tutorial-slides'))}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #964735 0%, #D97B66 100%)' }}
            >
              {t('home.takeTour')}
            </button>
          </div>
        </div>
      )}

      {/* Conflict Alert — always visible at top when present, not user-reorderable */}
      {conflicts.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFF8F0', border: '1px solid #EDCFB8' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C4621A' }} />
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C4621A' }}>{conflicts.length > 1 ? t('home.scheduleConflicts') : t('home.scheduleConflict')}</p>
          </div>
          {conflicts.map((c, i) => {
            const conflictTime = (d: Date) => fmt(d, 'EEE, MMM d · p');
            return (
              <button key={i} onClick={() => navigate('/app/calendar')} className="w-full px-4 py-3 text-left" style={{ borderBottom: i < conflicts.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{c.eventA.title} <span style={{ color: '#C4621A' }}>{t('home.overlaps')}</span> {c.eventB.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{conflictTime(c.eventA.start)}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Reorderable homepage modules */}
      {homeModuleOrder.map(key => (
        <Fragment key={key}>{renderHomeModule(key)}</Fragment>
      ))}

    </div>
  );
};

// Quick To-Do's Component
const QuickToDos = ({ navigate, initialTasks = [] }: { navigate?: (path: string) => void; initialTasks?: Array<{id: string, title: string, completed: boolean, due_date?: string | null}> }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [quickTasks, setQuickTasks] = useState(initialTasks);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Sync when parent's Promise.all resolves (initialTasks goes from [] to real data)
  useEffect(() => {
    if (initialTasks.length > 0) setQuickTasks(initialTasks);
  }, [initialTasks]);

  const loadQuickTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('type', 'task')
        .eq('completed', false)
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
    const nowCompleted = !task.completed;

    // Optimistic update — show tick immediately
    setQuickTasks(prev => prev.map(t => t.id === id ? { ...t, completed: nowCompleted } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: nowCompleted })
        .eq('id', id);

      if (error) throw error;
      // Reload after a short delay so user sees the completed state before item disappears
      if (nowCompleted) setTimeout(loadQuickTasks, 800);
      else loadQuickTasks();
    } catch (error) {
      logError('Error toggling task:', error);
      // Roll back optimistic update on failure
      setQuickTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !nowCompleted } : t));
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
      toast({ title: t('home.tasksRemoved') });
    } catch (error) {
      logError('Error clearing completed tasks:', error);
      toast({ title: t('common.error'), description: t('home.couldNotClear'), variant: "destructive" });
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
        title: t('home.taskAdded'),
      });
    } catch (error) {
      logError('Error adding task:', error);
      toast({ title: t('common.error'), description: t('home.couldNotAdd'), variant: "destructive" });
    }
  };

  const hasCompletedTasks = quickTasks.some(task => task.completed);

  return (
    <div>
      <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
        {quickTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 mx-3 my-1.5 rounded-2xl" style={{ background: 'hsl(var(--muted))' }}>
            <button
              onClick={() => toggleTask(task.id)}
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all appearance-none p-0"
              style={{ borderColor: task.completed ? '#964735' : 'hsl(var(--border))', background: task.completed ? '#964735' : 'transparent' }}
            >
              {task.completed && <span className="text-white" style={{ fontSize: '12px', lineHeight: 1 }}>✓</span>}
            </button>
            <span
              className={`text-[15px] flex-1 ${task.completed ? 'line-through' : ''}`}
              style={{ color: task.completed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' }}
            >
              {task.title}
            </span>
          </div>
        ))}
        {quickTasks.length === 0 && !showInlineAdd && (
          <div className="px-4 py-4 text-center">
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('home.noTasksYet')}</p>
          </div>
        )}
        {showInlineAdd && (
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: quickTasks.length ? '1px solid hsl(var(--border))' : 'none' }}>
            <input
              ref={inlineInputRef}
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') { setShowInlineAdd(false); setNewTaskTitle(''); }
              }}
              placeholder={t('home.taskPlaceholder')}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: 'hsl(var(--foreground))' }}
              autoFocus
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0"
              style={{ background: newTaskTitle.trim() ? '#964735' : '#DAC1BB', color: '#fff' }}
            >
              {t('common.add')}
            </button>
            <button onClick={() => { setShowInlineAdd(false); setNewTaskTitle(''); }} className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>✕</button>
          </div>
        )}
        {!showInlineAdd && (
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
            style={{ color: '#964735' }}
            onClick={() => setShowInlineAdd(true)}
          >
            <Plus className="w-4 h-4" />
            {t('home.addTaskBtn')}
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLayout;
