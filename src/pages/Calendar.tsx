import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Plus, X, RefreshCw, Check, Loader2, Building2, Copy, ExternalLink, Mic, MicOff, Sparkles, LayoutGrid } from "lucide-react";
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
  school:   { label: "School",   bg: "#EDE9F8", border: "#6B3FBF", dot: "#6B3FBF" },
  travel:   { label: "Travel",   bg: "#DDEEFF", border: "#64A0F0", dot: "#64A0F0" },
  birthday: { label: "Birthday", bg: "#FFE4F0", border: "#EE7BB0", dot: "#EE7BB0" },
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
      color: "#6B3FBF"
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | '3day' | 'day'>('month');
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
        color: eventTag ? TAGS[eventTag].border : "#6B3FBF",
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
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAFE", border: "1px solid #F0E4FB" }}>
        {/* Column headers */}
        <div className="flex border-b" style={{ borderColor: "#F0E4FB" }}>
          <div className="w-12 flex-shrink-0" />
          {days.map(day => {
            const isTodayDate = isToday(day);
            return (
              <div key={day.toISOString()} className="flex-1 text-center py-2.5 text-xs font-medium" style={{ color: isTodayDate ? "#6B3FBF" : "#9B7ADE" }}>
                <div>{format(day, "EEE")}</div>
                <div
                  className="w-7 h-7 mx-auto mt-0.5 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: isTodayDate ? "#6B3FBF" : "transparent", color: isTodayDate ? "#fff" : "#1A0B2E" }}
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
            <div key={hour} className="flex min-h-[52px] border-b" style={{ borderColor: "#F8F1FF" }}>
              <div className="w-12 flex-shrink-0 text-right pr-2 pt-1">
                <span className="text-[10px]" style={{ color: "#C4B0E8" }}>
                  {hour === 12 ? "12pm" : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                </span>
              </div>
              {days.map(day => {
                const events = getEventsForDateAndHour(day, hour);
                return (
                  <div key={day.toISOString()} className="flex-1 border-l px-0.5 pt-0.5 space-y-0.5" style={{ borderColor: "#F0E4FB" }}>
                    {events.map(item => {
                      if (item.type !== "event") return null;
                      const tagStyle = item.tag && TAGS[item.tag] ? TAGS[item.tag] : { bg: "#EDE9F8", border: "#6B3FBF", label: "Event" };
                      return (
                        <div
                          key={item.id}
                          className="text-[10px] rounded px-1 py-0.5 leading-tight cursor-pointer truncate"
                          style={{ background: tagStyle.bg, borderLeft: `2px solid ${tagStyle.border}`, color: "#1A0B2E" }}
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
        <div className="rounded-2xl p-3" style={{ background: "#FAFAFE", border: "1px solid #F0E4FB" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-lg font-light" style={{ color: "#1A0B2E" }}>
              {format(selectedDate, "MMMM")}{" "}
              <em style={{ color: "#6B3FBF" }}>'{format(selectedDate, "yy")}</em>
            </h2>
            <div className="flex gap-1">
              <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-purple-50" style={{ border: "1px solid #E8DCF8" }}>
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
              </button>
              <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-purple-50" style={{ border: "1px solid #E8DCF8" }}>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium py-1" style={{ color: "#9B7ADE" }}>{d}</div>
            ))}
            {weekDates.map(day => {
              const isTodayDate = isToday(day);
              const isSel = isSameDay(day, selectedDate);
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className="flex items-center justify-center h-7">
                  <span
                    className="w-6 h-6 text-xs font-medium rounded-full flex items-center justify-center"
                    style={{
                      background: isTodayDate ? "#6B3FBF" : isSel ? "#EDE9F8" : "transparent",
                      color: isTodayDate ? "#fff" : isSel ? "#3D1F8A" : "#1A0B2E",
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
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif text-lg font-light" style={{ color: "#1A0B2E" }}>
            {format(days[0], "MMM d")} – {format(days[2], "d")}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => setSelectedDate(d => subDays(d, 3))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-purple-50" style={{ border: "1px solid #E8DCF8" }}>
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
            </button>
            <button onClick={() => setSelectedDate(d => addDays(d, 3))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-purple-50" style={{ border: "1px solid #E8DCF8" }}>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
            </button>
          </div>
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
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif text-lg font-light" style={{ color: "#1A0B2E" }}>
            {format(days[0], "MMM d")} – {format(days[6], "MMM d")}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => setSelectedDate(d => subDays(d, 7))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-purple-50" style={{ border: "1px solid #E8DCF8" }}>
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
            </button>
            <button onClick={() => setSelectedDate(d => addDays(d, 7))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-purple-50" style={{ border: "1px solid #E8DCF8" }}>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6B3FBF" }} />
            </button>
          </div>
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
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#FAFAFE", border: "1px solid #F0E4FB" }}>
        {/* Header: "May '26" style */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl font-light" style={{ color: "#1A0B2E" }}>
            {format(selectedDate, "MMMM")}{" "}
            <em style={{ color: "#6B3FBF" }}>'{format(selectedDate, "yy")}</em>
          </h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-purple-50"
              style={{ border: "1px solid #E8DCF8" }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: "#6B3FBF" }} />
            </button>
            <button
              onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-purple-50"
              style={{ border: "1px solid #E8DCF8" }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: "#6B3FBF" }} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium py-1.5" style={{ color: "#9B7ADE" }}>
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
                    background: isTodayDate ? "#6B3FBF" : isSelected ? "#EDE9F8" : "transparent",
                    color: isTodayDate ? "#FFFFFF" : isSelected ? "#3D1F8A" : "#1A0B2E",
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
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3" style={{ borderTop: "1px solid #F0E4FB" }}>
          {(Object.entries(TAGS) as [EventTag, typeof TAGS[EventTag]][]).map(([key, tag]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ background: tag.dot }} />
              <span className="font-medium" style={{ color: "#1A0B2E" }}>{tag.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 w-full max-w-full overflow-x-hidden">
      {/* Calendar Sync Banner */}
      {showSyncBanner && (
        <Card className="border-primary/30 bg-primary/5 shadow-custom-md">
          <CardContent className="py-3 px-3 sm:px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm">{t('calendar.syncYourCalendars')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('calendar.syncDescription')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isPremium ? (
                  <Button
                    size="sm"
                    className="gradient-primary text-white border-0 whitespace-nowrap text-xs sm:text-sm h-8 sm:h-9"
                    onClick={() => setShowCalendarSyncDialog(true)}
                  >
                    {t('calendar.connect')}
                  </Button>
                ) : (
                  <UpgradeDialog>
                    <Button size="sm" className="gradient-primary text-white border-0 whitespace-nowrap text-xs sm:text-sm h-8 sm:h-9">
                      {t('calendar.connect')}
                    </Button>
                  </UpgradeDialog>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleDismissSyncBanner}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <Button size="sm" className="w-full h-8 text-xs text-white border-0" style={{ background: "#6B3FBF" }} onClick={handleGoogleConnect} disabled={isSyncing}>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: "#6E8FE5" }} />
            {t('calendar.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('calendar.subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative">
            <Button
              variant="outline"
              className="gap-1.5 h-9 px-3 text-sm"
              onClick={() => setShowViewPicker(v => !v)}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="capitalize">{calendarView === '3day' ? '3 Day' : calendarView}</span>
            </Button>
            {showViewPicker && (
              <div className="absolute right-0 top-10 z-50 w-36 rounded-xl border shadow-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #F0E4FB" }}>
                {(['month', 'week', '3day', 'day'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setCalendarView(v); setShowViewPicker(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-purple-50 flex items-center justify-between"
                    style={{ color: calendarView === v ? "#6B3FBF" : "#1A0B2E", fontWeight: calendarView === v ? 600 : 400 }}
                  >
                    {v === '3day' ? '3 Day' : v.charAt(0).toUpperCase() + v.slice(1)}
                    {calendarView === v && <Check className="h-3.5 w-3.5" style={{ color: "#6B3FBF" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="gap-1.5 h-9 px-3 text-sm"
            onClick={() => setShowCalendarSyncDialog(true)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
            {(googleSynced || outlookSynced) && <span className="w-1.5 h-1.5 rounded-full bg-grape-500 ml-0.5" />}
          </Button>
          <ParticleButton
            className="gap-2 gradient-primary text-white border-0 h-9 px-3 text-sm flex-1 sm:flex-none"
            onClick={() => {
              resetEventForm();
              setDialogTab("event");
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>{t('calendar.new')}</span>
          </ParticleButton>
        </div>
      </div>

      {/* Voice assistant nudge — under header */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: isListeningVoice ? "#F0E4FB" : "#F8F1FF", border: "1px solid #F0E4FB", transition: "background 0.2s" }}>
        <button
          onClick={isListeningVoice ? stopCalendarVoice : startCalendarVoice}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative transition-colors"
          style={{ background: isListeningVoice ? "#EE7BB0" : "#6B3FBF" }}
          aria-label={isListeningVoice ? "Stop listening" : "Start voice input"}
        >
          {isListeningVoice ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
          {!isListeningVoice && <Sparkles className="absolute -top-1 -right-1 w-3 h-3" style={{ color: "#FFC861" }} />}
        </button>
        <div className="flex-1 min-w-0">
          {isListeningVoice ? (
            <p className="text-xs font-medium animate-pulse" style={{ color: "#EE7BB0" }}>Listening…</p>
          ) : (
            <p className="text-xs font-medium" style={{ color: "#1A0B2E" }}>
              Say <span className="italic" style={{ color: "#6B3FBF" }}>"Dentist Oct 10 at 3pm"</span>{" "}— Voice adds it instantly.
            </p>
          )}
        </div>
      </div>

      {/* Calendar View */}
      {calendarView === 'month' && renderMonthCalendar()}
      {calendarView === 'week' && renderWeekCalendar()}
      {calendarView === '3day' && render3DayCalendar()}
      {calendarView === 'day' && renderDayCalendar()}

      {/* Day Events — only in month view */}
      {calendarView === 'month' && <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#FFFFFF", border: "1px solid #F0E4FB" }}>
        {/* Header */}
        <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: "#9B7ADE" }}>
          {isToday(selectedDate) ? "TODAY · " : ""}{format(selectedDate, "EEEE, MMMM d").toUpperCase()}
        </p>
        <h2 className="font-serif text-2xl font-light mb-4" style={{ color: "#1A0B2E" }}>
          {(() => {
            const count = getItemsForDate(selectedDate).length;
            if (count === 0) return "A clear, open day.";
            if (count <= 2) return "A gentle day ahead.";
            if (count <= 4) return "A busy day ahead.";
            return "A full day ahead.";
          })()}
        </h2>

        {getItemsForDate(selectedDate).length > 0 ? (
          <div className="space-y-3">
            {getItemsForDate(selectedDate)
              .sort((a, b) => {
                const aTime = a.type === "event" ? new Date(a.startDate).getTime() : (a.dueDate ? new Date(a.dueDate).getTime() : 0);
                const bTime = b.type === "event" ? new Date(b.startDate).getTime() : (b.dueDate ? new Date(b.dueDate).getTime() : 0);
                return aTime - bTime;
              })
              .map((item) => {
                if (item.type === "event") {
                  const tagStyle = item.tag && TAGS[item.tag] ? TAGS[item.tag] : { bg: "#EDE9F8", border: "#6B3FBF", dot: "#6B3FBF", label: "Event" };
                  const timeStr = item.allDay ? "All day" : format(item.startDate, "HH:mm");
                  return (
                    <div key={item.id} className="flex gap-3 group cursor-pointer" onClick={() => handleEditItem(item)}>
                      <div className="text-right w-10 flex-shrink-0 pt-3">
                        <span className="text-xs font-medium" style={{ color: "#9B7ADE" }}>{timeStr}</span>
                      </div>
                      <div
                        className="flex-1 rounded-xl p-3 transition-opacity hover:opacity-90 relative overflow-hidden"
                        style={{ background: tagStyle.bg, borderLeft: `3px solid ${tagStyle.border}` }}
                      >
                        <p className="font-semibold text-sm" style={{ color: "#1A0B2E" }}>{item.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: tagStyle.border }}>
                          {item.tag ? TAGS[item.tag].label : "Event"}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded"
                          style={{ color: "#EE7BB0" }}
                        >×</button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={item.id} className="flex gap-3 group cursor-pointer" onClick={() => handleEditItem(item)}>
                      <div className="text-right w-10 flex-shrink-0 pt-3">
                        <span className="text-xs font-medium" style={{ color: "#9B7ADE" }}>
                          {item.dueTime || ""}
                        </span>
                      </div>
                      <div
                        className="flex-1 rounded-xl p-3 transition-opacity hover:opacity-90 flex items-center gap-3"
                        style={{ background: "#FFFBE6", borderLeft: "3px solid #FFC861" }}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => toggleReminder(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${item.completed ? "line-through opacity-50" : ""}`} style={{ color: "#1A0B2E" }}>
                            {item.title}
                          </p>
                          <p className="text-xs" style={{ color: "#FFC861" }}>Reminder</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          style={{ color: "#EE7BB0" }}
                        >×</button>
                      </div>
                    </div>
                  );
                }
              })}
          </div>
        ) : (
          <p className="text-sm py-4" style={{ color: "#9B7ADE" }}>{t('calendar.noEventsForDay')}</p>
        )}

        {/* Quick add button */}
        <button
          onClick={() => { resetEventForm(); setDialogTab("event"); setIsDialogOpen(true); }}
          className="mt-4 w-full py-2 rounded-xl text-sm font-medium transition-colors hover:bg-purple-50 flex items-center justify-center gap-2"
          style={{ border: "1px dashed #E8DCF8", color: "#9B7ADE" }}
        >
          <Plus className="w-4 h-4" /> Add event
        </button>
      </div>}

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
                        borderColor: eventTag === key ? tag.border : "#E8DCF8",
                        color: eventTag === key ? tag.border : "#9B7ADE",
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
