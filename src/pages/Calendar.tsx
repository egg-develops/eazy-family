import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Plus, X, RefreshCw, Check, Loader2, Building2, Copy, ExternalLink, Mic, MicOff, Sparkles, LayoutGrid, Search, Settings, AlignLeft, Paperclip } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addDays, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cloudSet } from "@/lib/preferencesSync";
import { error as logError } from "@/lib/logger";
import * as chrono from "chrono-node";
import {
  requestCalendarAccess,
  fetchAppleEvents as fetchAppleCalendarEvents,
  createAppleEvent,
  updateAppleEvent,
  deleteAppleEvent,
} from "@/lib/appleCalendar";

const TAGS = {
  school:   { label: "School",   bg: "#F1EDE7", border: "#964735", dot: "#964735" },
  travel:   { label: "Travel",   bg: "#DDEEFF", border: "#64A0F0", dot: "#64A0F0" },
  birthday: { label: "Birthday", bg: "#FFE4F0", border: "#D97B66", dot: "#D97B66" },
  personal: { label: "Personal", bg: "#FFFBE6", border: "#FFC861", dot: "#FFC861" },
} as const;
type EventTag = keyof typeof TAGS;

interface Event {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  repeat?: string;
  travelTime?: string;
  type: "event";
  color: string;
  tag?: EventTag;
  appleCalendarId?: string;
}

interface Reminder {
  id: string;
  title: string;
  dueDate?: Date;
  dueTime?: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  type: "reminder";
  notes?: string;
}

type CalendarItem = Event | Reminder;

const getInitialItems = (): CalendarItem[] => {
  const saved = localStorage.getItem('eazy-family-calendar-items');
  if (saved) {
    let parsed: unknown;
    try { parsed = JSON.parse(saved); } catch { localStorage.removeItem('eazy-family-calendar-items'); return []; }
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).map((item: unknown) => {
  if (typeof item === "object" && item !== null) {
    const e = item as {
  id?: string;
  title?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  dueDate?: string | Date;
  [key: string]: unknown;
};

    return {
      ...item,
      startDate: e.startDate ? new Date(e.startDate) : undefined,
      endDate: e.endDate ? new Date(e.endDate) : undefined,
      dueDate: e.dueDate ? new Date(e.dueDate) : undefined,
        };
  }

  return null;
}).filter(Boolean);
  }

  return [
    {
      id: "1",
      title: "Swimming Lesson",
      startDate: new Date(2025, 9, 2, 14, 0),
      endDate: new Date(2025, 9, 2, 15, 0),
      allDay: false,
      location: "Aquatic Center",
      type: "event",
      color: "#964735"
    },
    {
      id: "2",
      title: "Children's Museum",
      startDate: new Date(2025, 9, 3, 10, 0),
      endDate: new Date(2025, 9, 3, 12, 0),
      allDay: false,
      location: "Interactive Art Exhibition",
      type: "event",
      color: "#FFC861"
    },
    {
      id: "3",
      title: "Review homework",
      completed: false,
      priority: "high",
      dueDate: new Date(2025, 9, 2),
      type: "reminder"
    },
    {
      id: "4",
      title: "Call dentist",
      completed: false,
      priority: "medium",
      type: "reminder"
    }
  ];
};

const WheelCol = ({ items, idx, setIdx, width }: { items: string[]; idx: number; setIdx: (i: number) => void; width: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const ITEM_H = 40;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'instant' as ScrollBehavior });
  }, []);
  const onScroll = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const clamped = Math.max(0, Math.min(Math.round(ref.current.scrollTop / ITEM_H), items.length - 1));
      setIdx(clamped);
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
    }, 100);
  };
  return (
    <div ref={ref} onScroll={onScroll}
      style={{ height: ITEM_H * 5, overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', width: `${width}px`, flexShrink: 0, msOverflowStyle: 'none' } as React.CSSProperties}>
      <div style={{ height: ITEM_H * 2 }} />
      {items.map((item, i) => (
        <div key={i} onClick={() => { setIdx(i); ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' }); }}
          style={{ height: ITEM_H, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === idx ? '15px' : '13px', fontWeight: i === idx ? 600 : 400, color: i === idx ? 'hsl(var(--foreground))' : Math.abs(i-idx)===1 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', transition: 'color 0.1s' }}>
          {item}
        </div>
      ))}
      <div style={{ height: ITEM_H * 2 }} />
    </div>
  );
};

const EZWheelPicker = ({
  dateItems, hourItems, minItems, ampmItems,
  dayIdx, setDayIdx, hourIdx, setHourIdx, minIdx, setMinIdx, ampmIdx, setAmPmIdx,
}: {
  dateItems: string[]; hourItems: string[]; minItems: string[]; ampmItems: string[];
  dayIdx: number; setDayIdx: (i: number) => void;
  hourIdx: number; setHourIdx: (i: number) => void;
  minIdx: number; setMinIdx: (i: number) => void;
  ampmIdx: number; setAmPmIdx: (i: number) => void;
}) => (
  <div style={{ borderTop: '1px solid #F1EDE7', position: 'relative', background: 'hsl(var(--muted))', overflow: 'hidden' }}>
    {/* Center selection highlight */}
    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '40px', transform: 'translateY(-50%)', background: 'rgba(150,71,53,0.07)', pointerEvents: 'none', zIndex: 1 }} />
    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', padding: '0 8px' }}>
      <WheelCol items={dateItems} idx={dayIdx} setIdx={setDayIdx} width={110} />
      <WheelCol items={hourItems} idx={hourIdx} setIdx={setHourIdx} width={48} />
      <WheelCol items={minItems} idx={minIdx} setIdx={setMinIdx} width={48} />
      <WheelCol items={ampmItems} idx={ampmIdx} setIdx={setAmPmIdx} width={48} />
    </div>
  </div>
);

const Calendar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | '3day' | 'day' | 'year'>('month');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllAgenda, setShowAllAgenda] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartRef.current.y);
    swipeStartRef.current = null;
    if (Math.abs(dx) < 55 || dy > Math.abs(dx) * 0.75) return;
    const fwd = dx < 0;
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (calendarView === 'month') d.setMonth(d.getMonth() + (fwd ? 1 : -1));
      else if (calendarView === 'week') d.setDate(d.getDate() + (fwd ? 7 : -7));
      else if (calendarView === '3day') d.setDate(d.getDate() + (fwd ? 3 : -3));
      else if (calendarView === 'day') d.setDate(d.getDate() + (fwd ? 1 : -1));
      else if (calendarView === 'year') d.setFullYear(d.getFullYear() + (fwd ? 1 : -1));
      return d;
    });
  };
  const [showViewPicker, setShowViewPicker] = useState(false);
  const [items, setItems] = useState<CalendarItem[]>(getInitialItems);
  const [showSyncBanner, setShowSyncBanner] = useState(() => {
    return localStorage.getItem('eazy-calendar-sync-dismissed') !== 'true';
  });
  const [showCalendarSyncDialog, setShowCalendarSyncDialog] = useState(false);
  const [googleSynced, setGoogleSynced] = useState(() => {
    return localStorage.getItem('eazy-google-calendar-synced') === 'true';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<CalendarItem[]>(() => {
    const saved = localStorage.getItem('eazy-google-calendar-events');
    if (saved) {
      try {
        return JSON.parse(saved).map((e: any) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
        }));
      } catch { return []; }
    }
    return [];
  });

  const [outlookAdminConsentNeeded, setOutlookAdminConsentNeeded] = useState(false);
  const [outlookAdminConsentUrl, setOutlookAdminConsentUrl] = useState('');
  const [outlookSynced, setOutlookSynced] = useState(() => {
    return localStorage.getItem('eazy-outlook-calendar-synced') === 'true';
  });
  const [isSyncingOutlook, setIsSyncingOutlook] = useState(false);
  const [outlookEvents, setOutlookEvents] = useState<CalendarItem[]>(() => {
    const saved = localStorage.getItem('eazy-outlook-calendar-events');
    if (saved) {
      try {
        return JSON.parse(saved).map((e: any) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
        }));
      } catch { return []; }
    }
    return [];
  });

  const [appleCalendarEnabled, setAppleCalendarEnabled] = useState(() =>
    localStorage.getItem('eazy-apple-calendar-enabled') === 'true'
  );
  const [appleEvents, setAppleEvents] = useState<Event[]>([]);
  const [isSyncingApple, setIsSyncingApple] = useState(false);

  useEffect(() => {
    if (!appleCalendarEnabled) { setAppleEvents([]); return; }
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const trackedIds = new Set(
      items
        .filter((i): i is Event => i.type === 'event' && !!(i as Event).appleCalendarId)
        .map(i => i.appleCalendarId!)
    );
    fetchAppleCalendarEvents(monthStart, monthEnd).then(evs => {
      setAppleEvents(
        evs
          .filter(e => !trackedIds.has(e.id))
          .map(e => ({
            id: `apple-device-${e.id}`,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
            allDay: e.isAllDay,
            location: e.location,
            type: 'event' as const,
            color: '#555555',
          }))
      );
    }).catch(err => logError('fetchAppleCalendarEvents:', err));
  }, [appleCalendarEnabled, selectedDate.getFullYear(), selectedDate.getMonth()]);

  const handleAppleCalendarConnect = async () => {
    setIsSyncingApple(true);
    const granted = await requestCalendarAccess();
    if (granted) {
      setAppleCalendarEnabled(true);
      localStorage.setItem('eazy-apple-calendar-enabled', 'true');
      setShowCalendarSyncDialog(false);
      toast({ title: 'Apple Calendar connected!' });
    } else {
      toast({ title: 'Permission denied', description: 'Allow calendar access in iOS Settings → Eazy Family.', variant: 'destructive' });
    }
    setIsSyncingApple(false);
  };

  const handleDisconnectApple = () => {
    setAppleCalendarEnabled(false);
    setAppleEvents([]);
    localStorage.removeItem('eazy-apple-calendar-enabled');
    toast({ title: 'Apple Calendar disconnected' });
  };

  useEffect(() => {
    cloudSet('eazy-family-calendar-items', JSON.stringify(items));
  }, [items]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"event" | "reminder">("event");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [customRepeatNumber, setCustomRepeatNumber] = useState("1");
  const [customRepeatUnit, setCustomRepeatUnit] = useState<"days" | "weeks" | "months">("weeks");

  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventStartDate, setEventStartDate] = useState<Date>(new Date());
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndDate, setEventEndDate] = useState<Date>(new Date());
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventRepeat, setEventRepeat] = useState("never");
  const [eventTravelTime, setEventTravelTime] = useState("none");
  const [eventTag, setEventTag] = useState<EventTag | null>(null);

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState("");
  const [reminderPriority, setReminderPriority] = useState<"low" | "medium" | "high">("medium");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [eventNotes, setEventNotes] = useState('');
  const [eventReminder, setEventReminder] = useState('15min');
  const [startDayIdx, setStartDayIdx] = useState(30);
  const [startHourIdx, setStartHourIdx] = useState(8);
  const [startMinIdx, setStartMinIdx] = useState(0);
  const [startAmPmIdx, setStartAmPmIdx] = useState(0);
  const [endDayIdx, setEndDayIdx] = useState(30);
  const [endHourIdx, setEndHourIdx] = useState(9);
  const [endMinIdx, setEndMinIdx] = useState(0);
  const [endAmPmIdx, setEndAmPmIdx] = useState(0);

  // Voice-to-calendar state
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const calendarRecognitionRef = useRef<any>(null);

  // Re-hydrate synced state when cloud preferences arrive
  useEffect(() => {
    const handler = () => {
      setGoogleSynced(localStorage.getItem('eazy-google-calendar-synced') === 'true');
      setOutlookSynced(localStorage.getItem('eazy-outlook-calendar-synced') === 'true');
      const saved = localStorage.getItem('eazy-google-calendar-events');
      if (saved) { try { setGoogleEvents(JSON.parse(saved)); } catch {} }
      const savedOutlook = localStorage.getItem('eazy-outlook-calendar-events');
      if (savedOutlook) { try { setOutlookEvents(JSON.parse(savedOutlook).map((e: any) => ({ ...e, startDate: new Date(e.startDate), endDate: new Date(e.endDate) }))); } catch {} }
      // Re-hydrate local calendar items from cloud (cross-device sync)
      const savedItems = localStorage.getItem('eazy-family-calendar-items');
      if (savedItems) {
        try {
          const parsed = JSON.parse(savedItems).map((item: any) => ({
            ...item,
            startDate: item.startDate ? new Date(item.startDate) : undefined,
            endDate: item.endDate ? new Date(item.endDate) : undefined,
            dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          })).filter(Boolean);
          setItems(parsed);
        } catch {}
      }
    };
    window.addEventListener('eazy-prefs-loaded', handler);
    return () => window.removeEventListener('eazy-prefs-loaded', handler);
  }, []);

  // Refresh items when EZCapture saves a new calendar event
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem('eazy-family-calendar-items');
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved).map((item: any) => ({
          ...item,
          startDate: item.startDate ? new Date(item.startDate) : undefined,
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        })).filter(Boolean);
        setItems(parsed);
      } catch {}
    };
    window.addEventListener('eazy-calendar-updated', handler);
    return () => window.removeEventListener('eazy-calendar-updated', handler);
  }, []);

  // Auto-open sync dialog when navigated from Settings with ?sync=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sync') === '1') {
      setShowCalendarSyncDialog(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Handle OAuth callbacks (Google + Outlook)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');
    const oauthErrorDesc = params.get('error_description') || '';

    if (!code && !oauthError) return;
    window.history.replaceState({}, '', window.location.pathname);

    // Microsoft returned an error before we even got a code
    if (oauthError && state === 'outlook_calendar_sync') {
      handleOutlookOAuthError(oauthError, oauthErrorDesc);
      return;
    }

    if (state === 'google_calendar_sync') handleGoogleCallback(code!);
    if (state === 'outlook_calendar_sync') handleOutlookCallback(code!);
  }, []);

  const handleGoogleConnect = async () => {
    setIsSyncing(true);
    try {
      const redirectUri = window.location.origin + '/app/calendar';
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url', redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
      setIsSyncing(false);
    }
  };

  const handleGoogleCallback = async (code: string) => {
    setIsSyncing(true);
    try {
      const redirectUri = window.location.origin + '/app/calendar';
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'exchange_code', code, redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.events) {
        const mapped: CalendarItem[] = data.events.map((e: any) => ({
          id: `gcal-${e.id}`,
          title: e.title,
          startDate: new Date(e.start),
          endDate: new Date(e.end),
          allDay: e.allDay || false,
          location: e.location,
          type: 'event' as const,
          color: 'hsl(142 70% 45%)',
        }));
        setGoogleEvents(mapped);
        cloudSet('eazy-google-calendar-events', JSON.stringify(mapped));
        cloudSet('eazy-google-calendar-synced', 'true');
        setGoogleSynced(true);
        setShowCalendarSyncDialog(false);
        toast({ title: t('calendar.syncSuccess') || 'Google Calendar synced!', description: `${mapped.length} events imported.` });
      }
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleEvents([]);
    setGoogleSynced(false);
    localStorage.removeItem('eazy-google-calendar-events');
    localStorage.removeItem('eazy-google-calendar-synced');
    toast({ title: 'Google Calendar disconnected' });
  };

  // ── Outlook Calendar ────────────────────────────────────────────────────────

  const isAdminConsentError = (msg: string) =>
    msg.includes('AADSTS65001') ||   // user/admin hasn't consented
    msg.includes('AADSTS90094') ||   // admin consent required by policy
    msg.includes('AADSTS900941') ||  // admin consent required
    msg.includes('admin_consent_required') ||
    msg.includes('consent_required') ||
    msg.includes('unauthorized_client');

  const showAdminConsentDialog = async () => {
    try {
      const redirectUri = `${window.location.origin}/app/calendar/outlook-callback`;
      const { data } = await supabase.functions.invoke('outlook-calendar-auth', {
        body: { action: 'get_admin_consent_url', redirect_uri: redirectUri },
      });
      setOutlookAdminConsentUrl(data?.url || '');
    } catch { /* ignore — we still show the dialog without the URL */ }
    setOutlookAdminConsentNeeded(true);
  };

  const handleOutlookOAuthError = (error: string, description: string) => {
    const combined = `${error} ${description}`;
    if (isAdminConsentError(combined)) {
      showAdminConsentDialog();
    } else {
      toast({
        title: 'Outlook connection failed',
        description: description || error,
        variant: 'destructive',
      });
    }
  };

  const handleOutlookConnect = async () => {
    setIsSyncingOutlook(true);
    try {
      const redirectUri = `${window.location.origin}/app/calendar/outlook-callback`;
      const { data, error } = await supabase.functions.invoke('outlook-calendar-auth', {
        body: { action: 'get_auth_url', redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
      setIsSyncingOutlook(false);
    }
  };

  const applyOutlookEvents = (rawEvents: any[]) => {
    const mapped: CalendarItem[] = rawEvents.map((e: any) => ({
      id: `outlook-${e.id}`,
      title: e.title,
      startDate: new Date(e.start),
      endDate: new Date(e.end || e.start),
      allDay: e.allDay || false,
      location: e.location,
      type: 'event' as const,
      color: 'hsl(210 80% 52%)', // Outlook blue
    }));
    setOutlookEvents(mapped);
    cloudSet('eazy-outlook-calendar-events', JSON.stringify(mapped));
    cloudSet('eazy-outlook-calendar-synced', 'true');
    setOutlookSynced(true);
    return mapped;
  };

  const handleOutlookCallback = async (code: string) => {
    setIsSyncingOutlook(true);
    try {
      const redirectUri = `${window.location.origin}/app/calendar/outlook-callback`;
      const { data, error } = await supabase.functions.invoke('outlook-calendar-auth', {
        body: { action: 'exchange_code', code, redirect_uri: redirectUri },
      });
      if (error) throw error;
      // Edge function may surface AADSTS errors as a message field
      if (data?.error && isAdminConsentError(data.error)) {
        showAdminConsentDialog();
        return;
      }
      if (data?.events) {
        const mapped = applyOutlookEvents(data.events);
        setShowCalendarSyncDialog(false);
        toast({ title: 'Outlook Calendar synced!', description: `${mapped.length} events imported.` });
      }
    } catch (err: any) {
      if (isAdminConsentError(err.message || '')) {
        showAdminConsentDialog();
      } else {
        toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
      }
    } finally {
      setIsSyncingOutlook(false);
    }
  };

  const handleOutlookResync = async () => {
    setIsSyncingOutlook(true);
    try {
      const { data, error } = await supabase.functions.invoke('outlook-calendar-auth', {
        body: { action: 'resync' },
      });
      if (error) throw error;
      if (data?.events) {
        const mapped = applyOutlookEvents(data.events);
        toast({ title: 'Outlook synced!', description: `${mapped.length} events updated.` });
      }
    } catch (err: any) {
      // If session expired, clear and prompt reconnect
      if (err.message?.includes('expired')) {
        setOutlookSynced(false);
        setOutlookEvents([]);
        localStorage.removeItem('eazy-outlook-calendar-synced');
        localStorage.removeItem('eazy-outlook-calendar-events');
      }
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncingOutlook(false);
    }
  };

  const handleDisconnectOutlook = async () => {
    try {
      await supabase.functions.invoke('outlook-calendar-auth', { body: { action: 'disconnect' } });
    } catch { /* best effort */ }
    setOutlookEvents([]);
    setOutlookSynced(false);
    localStorage.removeItem('eazy-outlook-calendar-events');
    localStorage.removeItem('eazy-outlook-calendar-synced');
    toast({ title: 'Outlook Calendar disconnected' });
  };

  const handleDismissSyncBanner = () => {
    localStorage.setItem('eazy-calendar-sync-dismissed', 'true');
    setShowSyncBanner(false);
  };

  const allItems = [...items, ...googleEvents, ...outlookEvents, ...appleEvents];

  const getItemsForDate = (date: Date) => {
    return allItems.filter(item => {
      if (item.type === "event") {
        return isSameDay(item.startDate, date);
      } else {
        return item.dueDate ? isSameDay(item.dueDate, date) : false;
      }
    });
  };

  const toggleReminder = (id: string) => {
    setItems(items.map(item =>
      item.id === id && item.type === "reminder"
        ? { ...item, completed: !item.completed }
        : item
    ));
  };

  // Generate 90-day range of date strings centered on today
  const DATE_ITEMS = (() => {
    const items: string[] = [];
    const base = new Date(); base.setHours(0,0,0,0);
    for (let d = -30; d < 60; d++) {
      const dt = new Date(base); dt.setDate(base.getDate() + d);
      items.push(format(dt, 'MMM d'));
    }
    return items;
  })();
  const HOUR_ITEMS = ['12','1','2','3','4','5','6','7','8','9','10','11'];
  const MIN_ITEMS = Array.from({length:60},(_,i) => String(i).padStart(2,'0'));
  const AMPM_ITEMS = ['AM','PM'];

  const parsePicker = (date: Date, timeStr: string) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(date); d.setHours(0,0,0,0);
    const diff = Math.round((d.getTime()-today.getTime())/86400000);
    const dayIdx = Math.max(0, Math.min(diff+30, 89));
    const parts = timeStr.split(':');
    const hh = parseInt(parts[0]||'9'); const mm = parseInt(parts[1]||'0');
    const h12 = hh===0?12:hh>12?hh-12:hh;
    const hourIdx = h12===12?0:h12;
    return { dayIdx, hourIdx, minIdx: Math.min(mm,59), ampmIdx: hh>=12?1:0 };
  };

  const pickerToDateTime = (dayIdx: number, hourIdx: number, minIdx: number, ampmIdx: number): [Date, string] => {
    const base = new Date(); base.setHours(0,0,0,0);
    base.setDate(base.getDate()+dayIdx-30);
    const h12 = hourIdx===0?12:hourIdx;
    const ampm = ampmIdx===0?'AM':'PM';
    let h24 = h12;
    if (ampm==='AM'&&h12===12) h24=0;
    if (ampm==='PM'&&h12!==12) h24=h12+12;
    return [new Date(base), `${String(h24).padStart(2,'0')}:${String(minIdx).padStart(2,'0')}`];
  };

  useEffect(()=>{
    if (!showStartPicker) return;
    const {dayIdx,hourIdx,minIdx,ampmIdx} = parsePicker(eventStartDate,eventStartTime);
    setStartDayIdx(dayIdx); setStartHourIdx(hourIdx); setStartMinIdx(minIdx); setStartAmPmIdx(ampmIdx);
  },[showStartPicker]);

  useEffect(()=>{
    if (!showStartPicker) return;
    const [d,t] = pickerToDateTime(startDayIdx,startHourIdx,startMinIdx,startAmPmIdx);
    setEventStartDate(d); setEventStartTime(t);
  },[startDayIdx,startHourIdx,startMinIdx,startAmPmIdx]);

  useEffect(()=>{
    if (!showEndPicker) return;
    const {dayIdx,hourIdx,minIdx,ampmIdx} = parsePicker(eventEndDate,eventEndTime);
    setEndDayIdx(dayIdx); setEndHourIdx(hourIdx); setEndMinIdx(minIdx); setEndAmPmIdx(ampmIdx);
  },[showEndPicker]);

  useEffect(()=>{
    if (!showEndPicker) return;
    const [d,t] = pickerToDateTime(endDayIdx,endHourIdx,endMinIdx,endAmPmIdx);
    setEventEndDate(d); setEventEndTime(t);
  },[endDayIdx,endHourIdx,endMinIdx,endAmPmIdx]);

  const resetEventForm = () => {
    setEventTitle("");
    setEventLocation("");
    setEventAllDay(false);
    setEventStartDate(selectedDate);
    setEventStartTime("09:00");
    setEventEndDate(selectedDate);
    setEventEndTime("10:00");
    setEventRepeat("never");
    setEventTravelTime("none");
    setEventTag(null);
    setEditingItemId(null);
    setCustomRepeatNumber("1");
    setCustomRepeatUnit("weeks");
  };

  const resetReminderForm = () => {
    setReminderTitle("");
    setReminderDate(undefined);
    setReminderTime("");
    setReminderPriority("medium");
    setEditingItemId(null);
  };

  const startCalendarVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice not supported", description: "Try typing your event instead.", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      setIsListeningVoice(false);

      // Parse date/time from transcript
      const parsed = chrono.parse(transcript, new Date(), { forwardDate: true });
      const dateResult = parsed[0]?.start.date();
      const titleText = parsed.length > 0
        ? transcript.replace(parsed[0].text, "").replace(/^\s*(add|create|schedule|set up|put|book)\s*/i, "").trim()
        : transcript.replace(/^\s*(add|create|schedule|set up|put|book)\s*/i, "").trim();

      resetEventForm();
      setEventTitle(titleText || transcript);
      if (dateResult) {
        setEventStartDate(dateResult);
        setEventEndDate(dateResult);
        if (parsed[0]?.start.isCertain("hour")) {
          setEventStartTime(format(dateResult, "HH:mm"));
          const end = new Date(dateResult);
          end.setHours(end.getHours() + 1);
          setEventEndTime(format(end, "HH:mm"));
        }
      }
      setDialogTab("event");
      setIsDialogOpen(true);
    };

    recognition.onerror = (event: any) => {
      setIsListeningVoice(false);
      if (event.error !== "no-speech") {
        toast({ title: "Voice error", description: "Could not capture speech. Try again.", variant: "destructive" });
      }
    };

    recognition.onend = () => setIsListeningVoice(false);

    calendarRecognitionRef.current = recognition;
    recognition.start();
    setIsListeningVoice(true);
  };

  const stopCalendarVoice = () => {
    calendarRecognitionRef.current?.stop();
    calendarRecognitionRef.current = null;
    setIsListeningVoice(false);
  };

  const handleEditItem = (item: CalendarItem) => {
    setEditingItemId(item.id);
    if (item.type === "event") {
      setDialogTab("event");
      setEventTitle(item.title);
      setEventLocation(item.location || "");
      setEventAllDay(item.allDay);
      setEventStartDate(item.startDate);
      setEventStartTime(format(item.startDate, "HH:mm"));
      setEventEndDate(item.endDate);
      setEventEndTime(format(item.endDate, "HH:mm"));
      setEventRepeat(item.repeat || "never");
      setEventTravelTime(item.travelTime || "none");
      setEventTag(item.tag || null);
    } else {
      setDialogTab("reminder");
      setReminderTitle(item.title);
      setReminderDate(item.dueDate);
      setReminderTime(item.dueTime || "");
      setReminderPriority(item.priority || "medium");
    }
    setIsDialogOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    const target = items.find(i => i.id === id);
    if (target?.type === 'event') {
      const appleId = (target as Event).appleCalendarId;
      if (appleId) deleteAppleEvent(appleId);
    }
    setItems(items.filter(item => item.id !== id));
    toast({
      title: t('calendar.deleted'),
      description: t('calendar.itemRemoved'),
    });
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) return;

    const [startHours, startMinutes] = eventStartTime.split(':').map(Number);
    const [endHours, endMinutes] = eventEndTime.split(':').map(Number);

    const startDateTime = new Date(eventStartDate);
    if (!eventAllDay) {
      startDateTime.setHours(startHours, startMinutes);
    }

    const endDateTime = new Date(eventEndDate);
    if (!eventAllDay) {
      endDateTime.setHours(endHours, endMinutes);
    }

    const repeatValue = eventRepeat === "custom"
      ? `${t('calendar.every')} ${customRepeatNumber} ${t(`calendar.${customRepeatUnit}`)}`
      : eventRepeat !== "never" ? eventRepeat : undefined;

    if (editingItemId) {
      const existing = items.find(i => i.id === editingItemId) as Event | undefined;
      if (appleCalendarEnabled && existing?.appleCalendarId) {
        updateAppleEvent(existing.appleCalendarId, {
          title: eventTitle,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay: eventAllDay,
          location: eventLocation || undefined,
        });
      }
      setItems(items.map(item =>
        item.id === editingItemId && item.type === "event"
          ? {
              ...item,
              title: eventTitle,
              startDate: startDateTime,
              endDate: endDateTime,
              allDay: eventAllDay,
              location: eventLocation || undefined,
              repeat: repeatValue,
              travelTime: eventTravelTime !== "none" ? eventTravelTime : undefined,
              tag: eventTag || undefined,
              color: eventTag ? TAGS[eventTag].border : item.color,
            }
          : item
      ));
      toast({
        title: t('calendar.eventUpdated'),
        description: `${eventTitle} ${t('calendar.hasBeenUpdated')}`,
      });
    } else {
      let appleCalendarId: string | undefined;
      if (appleCalendarEnabled) {
        const aid = await createAppleEvent({
          title: eventTitle,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay: eventAllDay,
          location: eventLocation || undefined,
        });
        appleCalendarId = aid ?? undefined;
      }
      const newEvent: Event = {
        id: Date.now().toString(),
        title: eventTitle,
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: eventAllDay,
        location: eventLocation || undefined,
        repeat: repeatValue,
        travelTime: eventTravelTime !== "none" ? eventTravelTime : undefined,
        type: "event",
        color: eventTag ? TAGS[eventTag].border : "#964735",
        tag: eventTag || undefined,
        appleCalendarId,
      };

      setItems([...items, newEvent]);
      toast({
        title: t('calendar.eventAdded'),
        description: `${eventTitle} ${t('calendar.hasBeenAdded')}`,
      });
    }

    resetEventForm();
    setIsDialogOpen(false);
  };

  const handleAddReminder = () => {
    if (!reminderTitle.trim()) return;

    if (editingItemId) {
      setItems(items.map(item =>
        item.id === editingItemId && item.type === "reminder"
          ? {
              ...item,
              title: reminderTitle,
              dueDate: reminderDate,
              dueTime: reminderTime || undefined,
              priority: reminderPriority,
            }
          : item
      ));
      toast({
        title: t('calendar.reminderUpdated'),
        description: `${reminderTitle} ${t('calendar.hasBeenUpdated')}`,
      });
    } else {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        title: reminderTitle,
        dueDate: reminderDate,
        dueTime: reminderTime || undefined,
        completed: false,
        priority: reminderPriority,
        type: "reminder"
      };

      setItems([...items, newReminder]);
      toast({
        title: t('calendar.reminderAdded'),
        description: `${reminderTitle} ${t('calendar.hasBeenAdded')}`,
      });
    }

    resetReminderForm();
    setIsDialogOpen(false);
  };

  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

  const getEventsForDateAndHour = (day: Date, hour: number) =>
    items.filter(item => {
      if (item.type !== "event") return false;
      const d = new Date(item.startDate);
      return isSameDay(d, day) && d.getHours() === hour;
    });

  const renderTimeGrid = (days: Date[]) => {
    const columnWidth = days.length === 1 ? "w-full" : days.length === 3 ? "w-1/3" : "w-1/7";
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
        {/* Column headers */}
        <div className="flex border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="w-12 flex-shrink-0" />
          {days.map(day => {
            const isTodayDate = isToday(day);
            return (
              <div key={day.toISOString()} className="flex-1 text-center py-2.5 text-xs font-medium" style={{ color: isTodayDate ? "#964735" : "hsl(var(--muted-foreground))" }}>
                <div>{format(day, "EEE")}</div>
                <div
                  className="w-7 h-7 mx-auto mt-0.5 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: isTodayDate ? "#964735" : "transparent", color: isTodayDate ? "#fff" : "hsl(var(--foreground))" }}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
        {/* Time slots */}
        <div className="overflow-y-auto max-h-[60vh]">
          {HOURS.map(hour => (
            <div key={hour} className="flex min-h-[52px] border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="w-12 flex-shrink-0 text-right pr-2 pt-1">
                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {hour === 12 ? "12pm" : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                </span>
              </div>
              {days.map(day => {
                const events = getEventsForDateAndHour(day, hour);
                return (
                  <div key={day.toISOString()} className="flex-1 border-l px-0.5 pt-0.5 space-y-0.5" style={{ borderColor: "hsl(var(--border))" }}>
                    {events.map(item => {
                      if (item.type !== "event") return null;
                      const tagStyle = item.tag && TAGS[item.tag] ? TAGS[item.tag] : { bg: "#F1EDE7", border: "#964735", label: "Event" };
                      return (
                        <div
                          key={item.id}
                          className="text-[10px] rounded px-1 py-0.5 leading-tight cursor-pointer truncate"
                          style={{ background: tagStyle.bg, borderLeft: `2px solid ${tagStyle.border}`, color: "hsl(var(--foreground))" }}
                          onClick={() => handleEditItem(item)}
                        >
                          {item.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayCalendar = () => {
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
    const weekStart = startOfWeek(selectedDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div className="space-y-3">
        {/* Mini week strip for navigation */}
        <div className="rounded-2xl p-3" style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
          <div className="mb-2">
            <h2 className="font-serif text-lg font-light" style={{ color: "hsl(var(--foreground))" }}>
              {format(selectedDate, "MMMM")}{" "}
              <em style={{ color: "#964735" }}>'{format(selectedDate, "yy")}</em>
            </h2>
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium py-1" style={{ color: "hsl(var(--muted-foreground))" }}>{d}</div>
            ))}
            {weekDates.map(day => {
              const isTodayDate = isToday(day);
              const isSel = isSameDay(day, selectedDate);
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className="flex items-center justify-center h-7">
                  <span
                    className="w-6 h-6 text-xs font-medium rounded-full flex items-center justify-center"
                    style={{
                      background: isTodayDate ? "#964735" : isSel ? "#F1EDE7" : "transparent",
                      color: isTodayDate ? "#fff" : isSel ? "#964735" : "hsl(var(--foreground))",
                    }}
                  >{format(day, "d")}</span>
                </button>
              );
            })}
          </div>
        </div>
        {renderTimeGrid([selectedDate])}
      </div>
    );
  };

  const render3DayCalendar = () => {
    const days = [subDays(selectedDate, 1), selectedDate, addDays(selectedDate, 1)];
    return (
      <div className="space-y-3">
        <div className="px-1">
          <h2 className="font-serif text-lg font-light" style={{ color: "hsl(var(--foreground))" }}>
            {format(days[0], "MMM d")} – {format(days[2], "d")}
          </h2>
        </div>
        {renderTimeGrid(days)}
      </div>
    );
  };

  const renderWeekCalendar = () => {
    const weekStart = startOfWeek(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div className="space-y-3">
        <div className="px-1">
          <h2 className="font-serif text-lg font-light" style={{ color: "hsl(var(--foreground))" }}>
            {format(days[0], "MMM d")} – {format(days[6], "MMM d")}
          </h2>
        </div>
        {renderTimeGrid(days)}
      </div>
    );
  };

  const renderMonthCalendar = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    return (
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
        {/* Header: "May '26" style */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl font-light" style={{ color: "hsl(var(--foreground))" }}>
            {format(selectedDate, "MMMM")}{" "}
            <em style={{ color: "#964735" }}>'{format(selectedDate, "yy")}</em>
          </h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#F7F3ED]"
              style={{ border: "1px solid hsl(var(--border))" }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: "#964735" }} />
            </button>
            <button
              onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#F7F3ED]"
              style={{ border: "1px solid hsl(var(--border))" }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: "#964735" }} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium py-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((day) => {
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const dayItems = getItemsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className="relative flex flex-col items-center pt-1.5 px-0.5 pb-4 min-h-[52px] transition-colors"
                style={{ opacity: isCurrentMonth ? 1 : 0.3 }}
              >
                <span
                  className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none"
                  style={{
                    background: isTodayDate ? "#964735" : isSelected ? "#F1EDE7" : "transparent",
                    color: isTodayDate ? "#fff" : isSelected ? "#964735" : "hsl(var(--foreground))",
                  }}
                >
                  {format(day, "d")}
                </span>
                {dayItems.length > 0 && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col gap-px">
                    {dayItems.slice(0, 3).map((item, idx) => {
                      const color = item.type === "event"
                        ? (item.tag && TAGS[item.tag] ? TAGS[item.tag].border : item.color)
                        : "#FFC861";
                      return (
                        <div key={idx} className="h-0.5 rounded-full" style={{ backgroundColor: color, width: `${Math.min(100, 55 + idx * 15)}%` }} />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          {(Object.entries(TAGS) as [EventTag, typeof TAGS[EventTag]][]).map(([key, tag]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ background: tag.dot }} />
              <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{tag.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Infer user initials from localStorage for avatar
  const userInitials = (() => { try { const s = localStorage.getItem('eazy-family-onboarding'); return s ? (JSON.parse(s).userInitials || 'EF') : 'EF'; } catch { return 'EF'; } })();
  const userIconUrl = (() => { try { const s = localStorage.getItem('eazy-family-home-config'); return s ? JSON.parse(s)?.iconImage : undefined; } catch { return undefined; } })();

  const selectedDayEvents = getItemsForDate(selectedDate)
    .filter(i => i.type === 'event')
    .sort((a, b) => new Date((a as Event).startDate).getTime() - new Date((b as Event).startDate).getTime());

  const renderYearCalendar = () => {
    const year = selectedDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);
    return (
      <div className="px-3 pt-2 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {months.map(monthIdx => {
            const monthDate = new Date(year, monthIdx, 1);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);
            const startDt = startOfWeek(monthStart);
            const endDt = endOfWeek(monthEnd);
            const days = eachDayOfInterval({ start: startDt, end: endDt });
            const hasEventInMonth = allItems.some(item => {
              const d = item.type === 'event' ? (item as Event).startDate : (item as Reminder).dueDate;
              if (!d) return false;
              const dt = new Date(d);
              return dt.getMonth() === monthIdx && dt.getFullYear() === year;
            });
            return (
              <button
                key={monthIdx}
                onClick={() => { const d = new Date(year, monthIdx, 1); setSelectedDate(d); setCalendarView('month'); }}
                className="rounded-2xl p-3 text-left transition-all active:scale-95"
                style={{
                  background: selectedDate.getMonth() === monthIdx ? '#964735' : 'hsl(var(--card))',
                  border: `1px solid ${selectedDate.getMonth() === monthIdx ? '#964735' : 'hsl(var(--border))'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: selectedDate.getMonth() === monthIdx ? '#FFFFFF' : 'hsl(var(--foreground))' }}>
                    {format(monthDate, 'MMM')}
                  </p>
                  {hasEventInMonth && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: selectedDate.getMonth() === monthIdx ? '#D97B66' : '#D97B66' }} />
                  )}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {days.slice(0, 35).map((day, i) => {
                    const isCurrentMonth = day.getMonth() === monthIdx;
                    const isTodayDate = isToday(day);
                    return (
                      <div
                        key={i}
                        className="w-full aspect-square flex items-center justify-center rounded-sm"
                        style={{
                          fontSize: '7px',
                          color: !isCurrentMonth ? 'transparent' : isTodayDate ? '#FFFFFF' : selectedDate.getMonth() === monthIdx ? 'rgba(255,255,255,0.8)' : 'hsl(var(--foreground))',
                          background: isTodayDate && isCurrentMonth ? '#D97B66' : 'transparent',
                          fontWeight: isTodayDate ? 700 : 400,
                        }}
                      >
                        {isCurrentMonth ? format(day, 'd') : ''}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'hsl(var(--background))', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>

      {/* Own Header */}
      <div className="flex items-center justify-between px-4 h-14" style={{ background: 'hsl(var(--background))' }}>
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-base" style={{ color: 'hsl(var(--foreground))' }}>{format(selectedDate, 'MMMM yyyy')}</h1>
          <button
            onClick={() => setShowViewPicker(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded"
          >
            <LayoutGrid className="w-4 h-4" style={{ color: '#964735' }} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isToday(selectedDate) && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#964735', color: '#FFFFFF' }}
            >
              Today
            </button>
          )}
          <button
            onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: showSearch ? '#964735' : 'hsl(var(--muted))' }}
          >
            <Search className="w-4 h-4" style={{ color: showSearch ? '#fff' : 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 pb-2">
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events…"
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none"
            style={{ background: 'hsl(var(--muted))', border: '1.5px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          />
          {searchQuery.trim() && (
            <div className="mt-2 rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
              {allItems
                .filter(i => i.title?.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 8)
                .map((item, idx, arr) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: 'hsl(var(--card))', borderBottom: idx < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color || '#964735' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{item.title}</p>
                      {item.startDate && (
                        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {new Date(item.startDate).toLocaleDateString('en-CH', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              {allItems.filter(i => i.title?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No events found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* View picker dropdown */}
      {showViewPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowViewPicker(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 z-50 w-44 rounded-2xl shadow-lg overflow-hidden" style={{ top: '56px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            {(['day', 'week', '3day', 'month', 'year'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setCalendarView(v); setShowViewPicker(false); }}
                className="w-full px-4 py-3 text-sm flex items-center justify-center"
                style={{
                  background: calendarView === v ? '#964735' : 'transparent',
                  color: calendarView === v ? '#FFFFFF' : 'hsl(var(--foreground))',
                  fontWeight: calendarView === v ? 600 : 400,
                  borderBottom: '1px solid hsl(var(--border))',
                }}
              >
                {v === '3day' ? '3 Day' : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Scrollable content — swipe left/right to navigate */}
      <div
        className="flex-1 overflow-y-auto pb-48"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >

      {/* Year header row */}
      {calendarView === 'year' && (
        <div className="flex items-center justify-center px-4 mb-3">
          <p className="font-bold text-base" style={{ color: 'hsl(var(--foreground))' }}>{selectedDate.getFullYear()}</p>
        </div>
      )}

      {/* Calendar Grid — full width */}
      {calendarView === 'month' && (() => {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const startDt = startOfWeek(monthStart);
        const endDt = endOfWeek(monthEnd);
        const days = eachDayOfInterval({ start: startDt, end: endDt });
        const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
        return (
          <div className="px-1">
            <div className="grid grid-cols-7 mb-1">
              {weekDays.map((d, i) => (
                <div key={i} className="text-center text-sm font-semibold py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map(day => {
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                const hasEvents = getItemsForDate(day).length > 0;
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className="relative flex flex-col items-center py-1 min-h-[60px]"
                    style={{ opacity: isCurrentMonth ? 1 : 0.25 }}
                  >
                    <span
                      className="w-10 h-10 flex items-center justify-center rounded-full text-xl font-bold"
                      style={{
                        background: isTodayDate ? '#964735' : isSelected ? 'hsl(var(--muted))' : 'transparent',
                        color: isTodayDate ? '#FFFFFF' : isWeekend && isCurrentMonth ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                        fontWeight: isTodayDate ? 800 : isSelected ? 700 : 600,
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {hasEvents && (
                      <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: isTodayDate ? '#D97B66' : '#964735' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Year view */}
      {calendarView === 'year' && renderYearCalendar()}

      {/* Non-month, non-year views */}
      {calendarView !== 'month' && calendarView !== 'year' && (
        <div className="px-4">
          {calendarView === 'week' && renderWeekCalendar()}
          {calendarView === '3day' && render3DayCalendar()}
          {calendarView === 'day' && renderDayCalendar()}
        </div>
      )}

      {/* Family Agenda section */}
      {calendarView !== 'year' && (
        <div className="mt-5 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg" style={{ color: 'hsl(var(--foreground))' }}>Family Agenda</h2>
            {allItems.filter(i => i.type === 'event').length > 5 && (
              <button onClick={() => setShowAllAgenda(p => !p)} className="text-xs font-semibold" style={{ color: '#964735' }}>
                {showAllAgenda ? 'SHOW LESS' : 'VIEW ALL'}
              </button>
            )}
          </div>
          {showAllAgenda ? (
            <div className="space-y-2">
              {allItems.filter(i => i.type === 'event').map((item) => {
                const ev = item as Event;
                const initials = ev.title.slice(0, 1).toUpperCase();
                return (
                  <div key={ev.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: ev.color || '#964735' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>{ev.title}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{ev.allDay ? 'All day' : format(ev.startDate, 'EEE MMM d · hh:mm aa')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
              onTouchStart={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
              onTouchEnd={e => e.stopPropagation()}
            >
              {allItems.filter(i => i.type === 'event').slice(0, 5).map((item) => {
                const ev = item as Event;
                const initials = ev.title.slice(0, 1).toUpperCase();
                return (
                  <div key={ev.id} className="flex-shrink-0 w-36 rounded-2xl p-3 space-y-1" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: ev.color || '#964735' }}>
                        {initials}
                      </div>
                      <span className="text-xs font-medium truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{ev.title.split(' ')[0]}</span>
                    </div>
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'hsl(var(--foreground))' }}>{ev.title}</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{ev.allDay ? 'All day' : format(ev.startDate, 'hh:mm aa')}</p>
                  </div>
                );
              })}
              {allItems.filter(i => i.type === 'event').length === 0 && (
                <div className="w-36 rounded-2xl p-3 flex items-center justify-center" style={{ background: 'hsl(var(--muted))', border: '1px dashed #DAC1BB' }}>
                  <p className="text-xs text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>No events yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Day Detail — selected date events */}
      {calendarView !== 'year' && (
        <div className="mt-5 px-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-lg" style={{ color: 'hsl(var(--foreground))' }}>
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
              </h2>
            </div>
            <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {selectedDayEvents.length} EVENT{selectedDayEvents.length !== 1 ? 'S' : ''}
            </span>
          </div>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDayEvents.map((item) => {
                const ev = item as Event;
                const timeStr = ev.allDay ? 'All day' : format(ev.startDate, 'hh:mm\naa');
                const tagStyle = ev.tag && TAGS[ev.tag] ? TAGS[ev.tag] : { bg: '#FDF3EE', border: '#D97B66', dot: '#D97B66', label: 'Event' };
                return (
                  <div key={ev.id}
                    className="flex gap-3 rounded-2xl p-4"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', cursor: ev.id.startsWith('apple-device-') ? 'default' : 'pointer' }}
                    onClick={() => !ev.id.startsWith('apple-device-') && handleEditItem(ev)}
                  >
                    <div className="text-right flex-shrink-0 w-12">
                      <span className="text-xs font-semibold whitespace-pre-line" style={{ color: ev.color || '#964735' }}>{timeStr}</span>
                    </div>
                    <div className="w-px self-stretch" style={{ background: ev.color || '#964735', borderRadius: '1px' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{ev.title}</p>
                      {ev.location && <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{ev.location}</p>}
                      {ev.id.startsWith('apple-device-') && <p className="text-[10px] mt-1 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Apple Calendar</p>}
                    </div>
                    {!ev.id.startsWith('apple-device-') && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteItem(ev.id); }}
                        className="opacity-30 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'hsl(var(--card))', border: '1px dashed #DAC1BB' }}>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Nothing scheduled. A clear, open day.</p>
            </div>
          )}

          <button
            onClick={() => { resetEventForm(); setEventStartDate(selectedDate); setEventEndDate(selectedDate); setDialogTab('event'); setIsDialogOpen(true); }}
            className="mt-3 w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ border: '1px dashed #DAC1BB', color: '#964735' }}
          >
            <Plus className="w-4 h-4" /> Add event
          </button>
        </div>
      )}

      </div>{/* end scrollable */}


      {/* Outlook Admin Consent Dialog */}
      <Dialog open={outlookAdminConsentNeeded} onOpenChange={setOutlookAdminConsentNeeded}>
        <DialogContent className="max-w-md w-[95%] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#0078d4]" />
              IT Admin Approval Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Your organisation's IT policy requires an administrator to approve Eazy.Family before you can connect your work Outlook calendar.
            </p>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/40">
              <p className="font-semibold">What to do:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li>Copy the message below and send it to your IT admin</li>
                <li>Once they approve, come back and try connecting again</li>
              </ol>
            </div>

            {/* Copyable message for IT */}
            <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Message for your IT admin</p>
              <p className="text-xs leading-relaxed select-all">
                Hi, I'd like to connect my work Outlook calendar to Eazy.Family (eazy.family).
                The app requires admin consent in Azure AD.
                Please approve it at: <span className="font-mono break-all">{outlookAdminConsentUrl || 'https://eazy.family/admin-consent'}</span>
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const msg = `Hi, I'd like to connect my work Outlook calendar to Eazy.Family (eazy.family). The app requires admin consent in Azure AD. Please approve it at: ${outlookAdminConsentUrl || 'https://eazy.family/admin-consent'}`;
                  navigator.clipboard.writeText(msg);
                  toast({ title: 'Copied to clipboard' });
                }}>
                <Copy className="h-3.5 w-3.5" /> Copy Message
              </Button>
            </div>

            {outlookAdminConsentUrl && (
              <Button
                variant="outline"
                className="w-full gap-2 border-[#0078d4]/40 text-[#0078d4]"
                onClick={() => window.open(outlookAdminConsentUrl, '_blank')}>
                <ExternalLink className="h-4 w-4" />
                Open Admin Consent Page
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Using a personal Outlook.com account instead?{' '}
              <button className="underline" onClick={() => { setOutlookAdminConsentNeeded(false); handleOutlookConnect(); }}>
                Try again
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Sync Dialog for Premium Users */}
      <Dialog open={showCalendarSyncDialog} onOpenChange={setShowCalendarSyncDialog}>
        <DialogContent className="max-w-sm w-[92%] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" style={{ color: "#6E8FE5" }} />
              {t('calendar.syncYourCalendars')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Connect a calendar to import your events.</p>

            {/* Google Calendar */}
            <div className={`p-3 rounded-xl border ${googleSynced ? 'border-green-400/40 bg-green-50 dark:bg-green-950/20' : 'border-border'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-sm font-bold text-red-500 shadow-sm flex-shrink-0">G</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    {googleSynced ? `${googleEvents.length} ${t('calendar.eventsSynced')}` : t('calendar.twoWaySync')}
                  </p>
                </div>
                {googleSynced && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full flex-shrink-0">✓ On</span>
                )}
              </div>
              {googleSynced ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={handleGoogleConnect} disabled={isSyncing}>
                    {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3" /> {t('calendar.resync')}</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30" onClick={handleDisconnectGoogle}>
                    {t('calendar.disconnect')}
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full h-8 text-xs text-white border-0" style={{ background: "#964735" }} onClick={handleGoogleConnect} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : t('calendar.connectGoogle')}
                </Button>
              )}
            </div>

            {/* Outlook Calendar */}
            <div className={`p-3 rounded-xl border ${outlookSynced ? 'border-blue-400/40 bg-blue-50 dark:bg-blue-950/20' : 'border-border'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white text-xs font-bold">O</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Outlook Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    {outlookSynced ? `${outlookEvents.length} ${t('calendar.eventsSynced')}` : t('calendar.microsoft365')}
                  </p>
                </div>
                {outlookSynced && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full flex-shrink-0">✓ On</span>
                )}
              </div>
              {outlookSynced ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={handleOutlookResync} disabled={isSyncingOutlook}>
                    {isSyncingOutlook ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3" /> {t('calendar.resync')}</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30" onClick={handleDisconnectOutlook}>
                    {t('calendar.disconnect')}
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full h-8 text-xs text-white border-0 bg-[#0078d4] hover:bg-[#106ebe]" onClick={handleOutlookConnect} disabled={isSyncingOutlook}>
                  {isSyncingOutlook ? <Loader2 className="h-3 w-3 animate-spin" /> : t('calendar.connectOutlook')}
                </Button>
              )}
            </div>

            {/* Apple Calendar */}
            <div className={`p-3 rounded-xl border ${appleCalendarEnabled ? 'border-gray-400/40 bg-gray-50 dark:bg-gray-900/20' : 'border-border'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Apple Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    {appleCalendarEnabled ? `${appleEvents.length} events from device` : 'Two-way sync with EventKit'}
                  </p>
                </div>
                {appleCalendarEnabled && (
                  <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex-shrink-0">✓ On</span>
                )}
              </div>
              {appleCalendarEnabled ? (
                <Button size="sm" variant="outline" className="w-full h-8 text-xs text-destructive border-destructive/30" onClick={handleDisconnectApple}>
                  {t('calendar.disconnect')}
                </Button>
              ) : (
                <Button size="sm" className="w-full h-8 text-xs text-white border-0" style={{ background: "#555555" }} onClick={handleAppleCalendarConnect} disabled={isSyncingApple}>
                  {isSyncingApple ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Connect Apple Calendar'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Event Overlay */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'hsl(var(--muted))', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 flex-shrink-0" style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
            <button onClick={() => { resetEventForm(); setIsDialogOpen(false); setShowStartPicker(false); setShowEndPicker(false); setEventNotes(''); }} className="text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('common.cancel')}</button>
            <h2 className="font-bold text-base" style={{ color: 'hsl(var(--foreground))' }}>{editingItemId ? t('calendar.editEvent') : t('calendar.newEvent')}</h2>
            <button onClick={dialogTab==='event'?handleAddEvent:handleAddReminder} className="text-sm font-semibold" style={{ color: '#964735' }}>
              {editingItemId ? t('common.update') : t('common.add')}
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 px-4 pb-32">

            {/* Title */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('calendar.titleLabel')}</p>
                <input
                  className="w-full text-base outline-none"
                  style={{ background: 'transparent', color: 'hsl(var(--foreground))' }}
                  placeholder={dialogTab === 'event' ? t('calendar.eventTitle') : t('calendar.reminderTitle')}
                  value={dialogTab === 'event' ? eventTitle : reminderTitle}
                  onChange={e => dialogTab === 'event' ? setEventTitle(e.target.value) : setReminderTitle(e.target.value)}
                />
              </div>
            </div>

            {dialogTab === 'event' ? (
              <>
                {/* Starts */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  <button className="w-full flex items-center justify-between px-4 py-3.5"
                    onClick={() => { setShowStartPicker(p => !p); setShowEndPicker(false); }}>
                    <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('calendar.starts')}</span>
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-sm font-medium" style={{ background: 'hsl(var(--muted))', color: '#964735' }}>{format(eventStartDate, 'MMM d, yyyy')}</span>
                      <span className="px-2.5 py-1 rounded-lg text-sm font-medium" style={{ background: 'hsl(var(--muted))', color: '#964735' }}>{(() => { try { return format(new Date(`2000-01-01T${eventStartTime}`), 'h:mm a'); } catch { return eventStartTime; } })()}</span>
                    </div>
                  </button>
                  {showStartPicker && (
                    <EZWheelPicker
                      dateItems={DATE_ITEMS} hourItems={HOUR_ITEMS} minItems={MIN_ITEMS} ampmItems={AMPM_ITEMS}
                      dayIdx={startDayIdx} setDayIdx={setStartDayIdx}
                      hourIdx={startHourIdx} setHourIdx={setStartHourIdx}
                      minIdx={startMinIdx} setMinIdx={setStartMinIdx}
                      ampmIdx={startAmPmIdx} setAmPmIdx={setStartAmPmIdx}
                    />
                  )}
                </div>

                {/* Ends */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  <button className="w-full flex items-center justify-between px-4 py-3.5"
                    onClick={() => { setShowEndPicker(p => !p); setShowStartPicker(false); }}>
                    <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('calendar.ends')}</span>
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-sm font-medium" style={{ background: 'hsl(var(--muted))', color: '#964735' }}>{format(eventEndDate, 'MMM d, yyyy')}</span>
                      <span className="px-2.5 py-1 rounded-lg text-sm font-medium" style={{ background: 'hsl(var(--muted))', color: '#964735' }}>{(() => { try { return format(new Date(`2000-01-01T${eventEndTime}`), 'h:mm a'); } catch { return eventEndTime; } })()}</span>
                    </div>
                  </button>
                  {showEndPicker && (
                    <EZWheelPicker
                      dateItems={DATE_ITEMS} hourItems={HOUR_ITEMS} minItems={MIN_ITEMS} ampmItems={AMPM_ITEMS}
                      dayIdx={endDayIdx} setDayIdx={setEndDayIdx}
                      hourIdx={endHourIdx} setHourIdx={setEndHourIdx}
                      minIdx={endMinIdx} setMinIdx={setEndMinIdx}
                      ampmIdx={endAmPmIdx} setAmPmIdx={setEndAmPmIdx}
                    />
                  )}
                </div>

                {/* Reminder */}
                <div className="rounded-2xl px-4 py-3.5 flex items-center justify-between" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('calendar.reminder')}</span>
                  <select value={eventReminder} onChange={e => setEventReminder(e.target.value)}
                    className="text-sm font-medium outline-none rounded-lg px-2.5 py-1"
                    style={{ background: 'hsl(var(--muted))', color: '#964735', border: 'none', appearance: 'none', paddingRight: '24px', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23964735\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}>
                    <option value="none">{t('calendar.none')}</option>
                    <option value="5min">{t('calendar.5minBefore')}</option>
                    <option value="15min">{t('calendar.15minBefore')}</option>
                    <option value="30min">{t('calendar.30minBefore')}</option>
                    <option value="1hour">{t('calendar.1hourBefore')}</option>
                    <option value="1day">{t('calendar.1dayBefore')}</option>
                  </select>
                </div>

                {/* Location */}
                <div className="rounded-2xl flex items-center gap-3 px-4 py-3.5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <input className="flex-1 outline-none text-sm" style={{ background: 'transparent', color: 'hsl(var(--foreground))' }}
                    placeholder={t('calendar.location')} value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
                </div>

                {/* Notes */}
                <div className="rounded-2xl flex items-start gap-3 px-4 py-3.5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  <AlignLeft className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <textarea className="flex-1 outline-none text-sm resize-none" style={{ background: 'transparent', color: 'hsl(var(--foreground))', minHeight: '60px' }}
                    placeholder={t('calendar.notesPlaceholder')} value={eventNotes} onChange={e => setEventNotes(e.target.value)} />
                </div>

                {/* Attachment */}
                <div className="rounded-2xl flex items-center gap-3 px-4 py-3.5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  <Paperclip className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <span className="flex-1 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('calendar.addAttachment')}</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--border))' }} />
                </div>
              </>
            ) : (
              <>
                {/* Reminder form */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  <div className="px-4 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{t('calendar.dueDate')}</span>
                    <input type="date" value={reminderDate ? format(reminderDate, "yyyy-MM-dd") : ""}
                      onChange={e => setReminderDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="text-sm outline-none rounded-lg px-2 py-1" style={{ background: 'hsl(var(--muted))', color: '#964735', border: 'none' }} />
                  </div>
                  {reminderDate && (
                    <div className="px-4 py-3.5 flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{t('calendar.time')}</span>
                      <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                        className="text-sm outline-none rounded-lg px-2 py-1" style={{ background: 'hsl(var(--muted))', color: '#964735', border: 'none' }} />
                    </div>
                  )}
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  {(['low','medium','high'] as const).map((p, i, arr) => (
                    <button key={p} onClick={() => setReminderPriority(p)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                      style={{ background: reminderPriority===p ? '#964735' : 'transparent', color: reminderPriority===p ? '#fff' : 'hsl(var(--foreground))', borderBottom: i<arr.length-1 ? '1px solid hsl(var(--border))' : 'none', fontWeight: reminderPriority===p ? 600 : 400 }}>
                      {t(`calendar.${p}`)} {t('calendar.priority')}
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
