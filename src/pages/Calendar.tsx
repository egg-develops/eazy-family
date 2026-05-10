import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Plus, X, RefreshCw, Check, Loader2, Building2, Copy, ExternalLink, Mic, MicOff, Sparkles, LayoutGrid, Search, Settings } from "lucide-react";
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
import * as chrono from "chrono-node";

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

const Calendar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | '3day' | 'day' | 'year'>('month');
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

  const allItems = [...items, ...googleEvents, ...outlookEvents];

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

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast({
      title: t('calendar.deleted'),
      description: t('calendar.itemRemoved'),
    });
  };

  const handleAddEvent = () => {
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
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FDF9F3", border: "1px solid #EBE8E2" }}>
        {/* Column headers */}
        <div className="flex border-b" style={{ borderColor: "#EBE8E2" }}>
          <div className="w-12 flex-shrink-0" />
          {days.map(day => {
            const isTodayDate = isToday(day);
            return (
              <div key={day.toISOString()} className="flex-1 text-center py-2.5 text-xs font-medium" style={{ color: isTodayDate ? "#964735" : "#7A6660" }}>
                <div>{format(day, "EEE")}</div>
                <div
                  className="w-7 h-7 mx-auto mt-0.5 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: isTodayDate ? "#964735" : "transparent", color: isTodayDate ? "#fff" : "#1C1C18" }}
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
            <div key={hour} className="flex min-h-[52px] border-b" style={{ borderColor: "#F7F3ED" }}>
              <div className="w-12 flex-shrink-0 text-right pr-2 pt-1">
                <span className="text-[10px]" style={{ color: "#B5A09A" }}>
                  {hour === 12 ? "12pm" : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                </span>
              </div>
              {days.map(day => {
                const events = getEventsForDateAndHour(day, hour);
                return (
                  <div key={day.toISOString()} className="flex-1 border-l px-0.5 pt-0.5 space-y-0.5" style={{ borderColor: "#EBE8E2" }}>
                    {events.map(item => {
                      if (item.type !== "event") return null;
                      const tagStyle = item.tag && TAGS[item.tag] ? TAGS[item.tag] : { bg: "#F1EDE7", border: "#964735", label: "Event" };
                      return (
                        <div
                          key={item.id}
                          className="text-[10px] rounded px-1 py-0.5 leading-tight cursor-pointer truncate"
                          style={{ background: tagStyle.bg, borderLeft: `2px solid ${tagStyle.border}`, color: "#1C1C18" }}
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
        <div className="rounded-2xl p-3" style={{ background: "#FDF9F3", border: "1px solid #EBE8E2" }}>
          <div className="mb-2">
            <h2 className="font-serif text-lg font-light" style={{ color: "#1C1C18" }}>
              {format(selectedDate, "MMMM")}{" "}
              <em style={{ color: "#964735" }}>'{format(selectedDate, "yy")}</em>
            </h2>
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium py-1" style={{ color: "#7A6660" }}>{d}</div>
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
                      color: isTodayDate ? "#fff" : isSel ? "#964735" : "#1C1C18",
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
          <h2 className="font-serif text-lg font-light" style={{ color: "#1C1C18" }}>
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
          <h2 className="font-serif text-lg font-light" style={{ color: "#1C1C18" }}>
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
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#FDF9F3", border: "1px solid #EBE8E2" }}>
        {/* Header: "May '26" style */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl font-light" style={{ color: "#1C1C18" }}>
            {format(selectedDate, "MMMM")}{" "}
            <em style={{ color: "#964735" }}>'{format(selectedDate, "yy")}</em>
          </h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#F7F3ED]"
              style={{ border: "1px solid #DAC1BB" }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: "#964735" }} />
            </button>
            <button
              onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#F7F3ED]"
              style={{ border: "1px solid #DAC1BB" }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: "#964735" }} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium py-1.5" style={{ color: "#7A6660" }}>
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
                    color: isTodayDate ? "#FFFFFF" : isSelected ? "#964735" : "#1C1C18",
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
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3" style={{ borderTop: "1px solid #EBE8E2" }}>
          {(Object.entries(TAGS) as [EventTag, typeof TAGS[EventTag]][]).map(([key, tag]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ background: tag.dot }} />
              <span className="font-medium" style={{ color: "#1C1C18" }}>{tag.label}</span>
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
                  background: selectedDate.getMonth() === monthIdx ? '#964735' : '#FFFFFF',
                  border: `1px solid ${selectedDate.getMonth() === monthIdx ? '#964735' : '#EBE8E2'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: selectedDate.getMonth() === monthIdx ? '#FFFFFF' : '#1C1C18' }}>
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
                          color: !isCurrentMonth ? 'transparent' : isTodayDate ? '#FFFFFF' : selectedDate.getMonth() === monthIdx ? 'rgba(255,255,255,0.8)' : '#1C1C18',
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
    <div className="flex flex-col min-h-screen" style={{ background: '#FDF9F3', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>

      {/* Own Header */}
      <div className="flex items-center justify-between px-4 h-14" style={{ background: '#FDF9F3' }}>
        <button onClick={() => navigate('/app')} className="flex-shrink-0">
          {userIconUrl
            ? <img src={userIconUrl} alt="Profile" className="w-9 h-9 rounded-full object-cover" style={{ border: '2px solid #D97B66' }} />
            : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#D97B66' }}>{userInitials.slice(0,2)}</div>}
        </button>
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-base" style={{ color: '#1C1C18' }}>{format(selectedDate, 'MMMM yyyy')}</h1>
          <button
            onClick={() => setShowViewPicker(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded"
          >
            <LayoutGrid className="w-4 h-4" style={{ color: '#964735' }} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: '#F1EDE7' }}>
            <Search className="w-4 h-4" style={{ color: '#7A6660' }} />
          </button>
          <button onClick={() => navigate('/app/settings')} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: '#F1EDE7' }}>
            <Settings className="w-4 h-4" style={{ color: '#7A6660' }} />
          </button>
        </div>
      </div>

      {/* View picker dropdown */}
      {showViewPicker && (
        <div className="absolute left-1/2 -translate-x-1/2 z-50 w-44 rounded-2xl shadow-lg overflow-hidden" style={{ top: '56px', background: '#FFFFFF', border: '1px solid #EBE8E2' }}>
          {(['day', 'week', '3day', 'month', 'year'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setCalendarView(v); setShowViewPicker(false); }}
              className="w-full text-left px-4 py-3 text-sm flex items-center justify-between"
              style={{ color: calendarView === v ? '#964735' : '#1C1C18', fontWeight: calendarView === v ? 600 : 400, borderBottom: '1px solid #F1EDE7' }}
            >
              {v === '3day' ? '3 Day' : v.charAt(0).toUpperCase() + v.slice(1)}
              {calendarView === v && <Check className="w-3.5 h-3.5" style={{ color: '#964735' }} />}
            </button>
          ))}
        </div>
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
          <p className="font-bold text-base" style={{ color: '#1C1C18' }}>{selectedDate.getFullYear()}</p>
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
                <div key={i} className="text-center text-sm font-semibold py-2" style={{ color: '#B5A09A' }}>{d}</div>
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
                        background: isTodayDate ? '#964735' : isSelected ? '#F1EDE7' : 'transparent',
                        color: isTodayDate ? '#FFFFFF' : isWeekend && isCurrentMonth ? '#7A6660' : '#1C1C18',
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
            <h2 className="font-bold text-lg" style={{ color: '#1C1C18' }}>Family Agenda</h2>
            <button className="text-xs font-semibold" style={{ color: '#964735' }}>VIEW ALL</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {allItems.filter(i => i.type === 'event').slice(0, 5).map((item) => {
              const ev = item as Event;
              const initials = ev.title.slice(0, 1).toUpperCase();
              return (
                <div key={ev.id} className="flex-shrink-0 w-36 rounded-2xl p-3 space-y-1" style={{ background: '#FFFFFF', border: '1px solid #EBE8E2' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: ev.color || '#964735' }}>
                      {initials}
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: '#7A6660' }}>{ev.title.split(' ')[0]}</span>
                  </div>
                  <p className="text-sm font-semibold leading-tight" style={{ color: '#1C1C18' }}>{ev.title}</p>
                  <p className="text-xs" style={{ color: '#B5A09A' }}>{ev.allDay ? 'All day' : format(ev.startDate, 'hh:mm aa')}</p>
                </div>
              );
            })}
            {allItems.filter(i => i.type === 'event').length === 0 && (
              <div className="w-36 rounded-2xl p-3 flex items-center justify-center" style={{ background: '#F7F3ED', border: '1px dashed #DAC1BB' }}>
                <p className="text-xs text-center" style={{ color: '#B5A09A' }}>No events yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Day Detail — selected date events */}
      {calendarView !== 'year' && (
        <div className="mt-5 px-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-lg" style={{ color: '#1C1C18' }}>
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
              </h2>
            </div>
            <span className="text-sm" style={{ color: '#7A6660' }}>
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
                    className="flex gap-3 rounded-2xl p-4 cursor-pointer"
                    style={{ background: '#FFFFFF', border: '1px solid #EBE8E2' }}
                    onClick={() => handleEditItem(ev)}
                  >
                    <div className="text-right flex-shrink-0 w-12">
                      <span className="text-xs font-semibold whitespace-pre-line" style={{ color: ev.color || '#964735' }}>{timeStr}</span>
                    </div>
                    <div className="w-px self-stretch" style={{ background: ev.color || '#964735', borderRadius: '1px' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: '#1C1C18' }}>{ev.title}</p>
                      {ev.location && <p className="text-xs mt-0.5" style={{ color: '#B5A09A' }}>{ev.location}</p>}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteItem(ev.id); }}
                      className="opacity-30 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" style={{ color: '#7A6660' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ background: '#FFFFFF', border: '1px dashed #DAC1BB' }}>
              <p className="text-sm" style={{ color: '#B5A09A' }}>Nothing scheduled. A clear, open day.</p>
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

      {/* Voice capture bar — pinned above nav */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
          style={{ background: '#FFFFFF', border: '1px solid #EBE8E2', boxShadow: '0 4px 24px rgba(28,20,18,0.1)' }}>
          <button
            onClick={isListeningVoice ? stopCalendarVoice : startCalendarVoice}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: isListeningVoice ? '#D97B66' : 'transparent' }}
          >
            <Mic className="w-5 h-5" style={{ color: isListeningVoice ? '#FFFFFF' : '#964735' }} />
          </button>
          <p className="flex-1 text-sm" style={{ color: '#B5A09A' }}>
            {isListeningVoice ? 'Listening…' : 'Add event by voice…'}
          </p>
          <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: '#B5A09A' }} />
          <button
            onClick={() => { resetEventForm(); setDialogTab('event'); setIsDialogOpen(true); }}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#964735' }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

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
                    {googleSynced ? `${googleEvents.length} events synced` : "Two-way sync"}
                  </p>
                </div>
                {googleSynced && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full flex-shrink-0">✓ On</span>
                )}
              </div>
              {googleSynced ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={handleGoogleConnect} disabled={isSyncing}>
                    {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3" /> Resync</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30" onClick={handleDisconnectGoogle}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full h-8 text-xs text-white border-0" style={{ background: "#964735" }} onClick={handleGoogleConnect} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Connect Google Calendar'}
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
                    {outlookSynced ? `${outlookEvents.length} events synced` : "Microsoft 365 & Outlook.com"}
                  </p>
                </div>
                {outlookSynced && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full flex-shrink-0">✓ On</span>
                )}
              </div>
              {outlookSynced ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={handleOutlookResync} disabled={isSyncingOutlook}>
                    {isSyncingOutlook ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3" /> Resync</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30" onClick={handleDisconnectOutlook}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full h-8 text-xs text-white border-0 bg-[#0078d4] hover:bg-[#106ebe]" onClick={handleOutlookConnect} disabled={isSyncingOutlook}>
                  {isSyncingOutlook ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Connect Outlook Calendar'}
                </Button>
              )}
            </div>

            {/* Apple Calendar — Coming Soon */}
            <div className="p-3 rounded-xl border border-border/50 bg-muted/20 opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Apple Calendar</p>
                  <p className="text-xs text-muted-foreground/70">Coming soon — iCloud integration</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event/Reminder Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95%] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('calendar.new')}</DialogTitle>
          </DialogHeader>

          <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as "event" | "reminder")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="event">{t('calendar.event')}</TabsTrigger>
              <TabsTrigger value="reminder">{t('calendar.reminder')}</TabsTrigger>
            </TabsList>

            <TabsContent value="event" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  placeholder={t('calendar.eventTitle')}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm min-h-[44px]"
                />
              </div>

              {/* Tag picker */}
              <div className="space-y-2">
                <Label>Tag</Label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEventTag(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${eventTag === null ? "border-gray-400 bg-gray-100" : "border-transparent bg-muted hover:border-gray-300"}`}
                  >
                    None
                  </button>
                  {(Object.entries(TAGS) as [EventTag, typeof TAGS[EventTag]][]).map(([key, tag]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEventTag(key)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5"
                      style={{
                        background: eventTag === key ? tag.bg : "transparent",
                        borderColor: eventTag === key ? tag.border : "#DAC1BB",
                        color: eventTag === key ? tag.border : "#7A6660",
                      }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: tag.dot }} />
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('calendar.location')}
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="flex-1 text-xs sm:text-sm min-h-[44px]"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 flex-shrink-0"
                    onClick={() => {
                      const q = eventLocation.trim() || "";
                      const url = q
                        ? `https://maps.google.com/?q=${encodeURIComponent(q)}`
                        : "https://maps.google.com/";
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    title="Open in Maps"
                  >
                    <MapPin className="h-4 w-4" style={{ color: "#6E8FE5" }} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="all-day">{t('calendar.allDay')}</Label>
                <Switch
                  id="all-day"
                  checked={eventAllDay}
                  onCheckedChange={setEventAllDay}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t('calendar.starts')}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={format(eventStartDate, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const newStart = new Date(e.target.value);
                        setEventStartDate(newStart);
                        if (newStart >= eventEndDate) {
                          const newEnd = new Date(newStart);
                          newEnd.setHours(newEnd.getHours() + 1);
                          setEventEndDate(newEnd);
                        }
                      }}
                      className="flex-1 min-w-0 h-11 min-h-[44px]"
                    />
                    {!eventAllDay && (
                      <Input
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        className="w-24 flex-shrink-0 h-11 min-h-[44px]"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('calendar.ends')}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={format(eventEndDate, "yyyy-MM-dd")}
                      onChange={(e) => setEventEndDate(new Date(e.target.value))}
                      className="flex-1 min-w-0 h-11 min-h-[44px]"
                    />
                    {!eventAllDay && (
                      <Input
                        type="time"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                        className="w-24 flex-shrink-0 h-11 min-h-[44px]"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('calendar.travelTime')}</Label>
                <Select value={eventTravelTime} onValueChange={setEventTravelTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('calendar.none')}</SelectItem>
                    <SelectItem value="15min">15 {t('calendar.minutes')}</SelectItem>
                    <SelectItem value="30min">30 {t('calendar.minutes')}</SelectItem>
                    <SelectItem value="1hour">1 {t('calendar.hour')}</SelectItem>
                    <SelectItem value="2hours">2 {t('calendar.hours')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('calendar.repeat')}</Label>
                <Select value={eventRepeat} onValueChange={setEventRepeat}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t('calendar.never')}</SelectItem>
                    <SelectItem value="daily">{t('calendar.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('calendar.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('calendar.monthly')}</SelectItem>
                    <SelectItem value="yearly">{t('calendar.yearly')}</SelectItem>
                    <SelectItem value="custom">{t('calendar.custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {eventRepeat === "custom" && (
                <div className="space-y-2">
                  <Label>{t('calendar.custom')}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={customRepeatNumber}
                      onChange={(e) => setCustomRepeatNumber(e.target.value)}
                      className="w-20"
                    />
                    <Select value={customRepeatUnit} onValueChange={(v) => setCustomRepeatUnit(v as "days" | "weeks" | "months")}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">{t('calendar.days')}</SelectItem>
                        <SelectItem value="weeks">{t('calendar.weeks')}</SelectItem>
                        <SelectItem value="months">{t('calendar.months')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm min-h-[44px]"
                  onClick={() => {
                    resetEventForm();
                    setIsDialogOpen(false);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <ParticleButton
                  className="flex-1 gradient-primary text-white border-0 text-xs sm:text-sm min-h-[44px]"
                  onClick={handleAddEvent}
                >
                  {editingItemId ? t('calendar.updateEvent') : t('calendar.addEvent2')}
                </ParticleButton>
              </div>
            </TabsContent>

            <TabsContent value="reminder" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  placeholder={t('calendar.reminderTitle')}
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('calendar.dueDate')}</Label>
                <Input
                  type="date"
                  value={reminderDate ? format(reminderDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setReminderDate(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>

              {reminderDate && (
                <div className="space-y-2">
                  <Label>{t('calendar.time')}</Label>
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('calendar.priority')}</Label>
                <Select value={reminderPriority} onValueChange={(v) => setReminderPriority(v as "low" | "medium" | "high")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('calendar.low')}</SelectItem>
                    <SelectItem value="medium">{t('calendar.medium')}</SelectItem>
                    <SelectItem value="high">{t('calendar.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm min-h-[44px]"
                  onClick={() => {
                    resetReminderForm();
                    setIsDialogOpen(false);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <ParticleButton
                  className="flex-1 gradient-primary text-white border-0 text-xs sm:text-sm min-h-[44px]"
                  onClick={handleAddReminder}
                >
                  {editingItemId ? t('calendar.updateReminder') : t('calendar.addReminder')}
                </ParticleButton>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
