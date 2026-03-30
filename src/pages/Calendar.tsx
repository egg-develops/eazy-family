import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Plus, X, RefreshCw, Check, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
    const parsed = JSON.parse(saved);
    return parsed.map((item: unknown) => {
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
      color: "hsl(220 70% 50%)"
    },
    { 
      id: "2", 
      title: "Children's Museum", 
      startDate: new Date(2025, 9, 3, 10, 0),
      endDate: new Date(2025, 9, 3, 12, 0), 
      allDay: false, 
      location: "Interactive Art Exhibition",
      type: "event",
      color: "hsl(45 90% 65%)"
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
  
  useEffect(() => {
    localStorage.setItem('eazy-family-calendar-items', JSON.stringify(items));
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
  
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState("");
  const [reminderPriority, setReminderPriority] = useState<"low" | "medium" | "high">("medium");

  // Handle Google Calendar OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state === 'google_calendar_sync') {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      handleGoogleCallback(code);
    }
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
        localStorage.setItem('eazy-google-calendar-events', JSON.stringify(mapped));
        localStorage.setItem('eazy-google-calendar-synced', 'true');
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

  const handleDismissSyncBanner = () => {
    localStorage.setItem('eazy-calendar-sync-dismissed', 'true');
    setShowSyncBanner(false);
  };

  const allItems = [...items, ...googleEvents];

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
        color: "hsl(220 70% 50%)"
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

  const renderMonthCalendar = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
    const weekDaysLong = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <Card className="shadow-custom-md">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">{format(selectedDate, "MMMM yyyy")}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => setSelectedDate(new Date())}
              >
                {t('calendar.today')}
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2 sm:pb-3 overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-full">
            {weekDays.map((day, idx) => (
              <div key={idx} className="text-center text-xs sm:text-sm font-semibold text-foreground p-1 sm:p-2">
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{weekDaysLong[idx]}</span>
              </div>
            ))}
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const dayItems = getItemsForDate(day);
              const hasItems = dayItems.length > 0;
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={day.toISOString()}
                  className={`
                    aspect-square p-0.5 sm:p-2 flex flex-col items-center justify-center 
                    cursor-pointer transition-all rounded-lg relative text-xs sm:text-base
                    ${!isCurrentMonth ? "text-muted-foreground/40" : "text-foreground"}
                    ${isTodayDate ? "bg-primary text-primary-foreground font-bold ring-2 ring-primary" : ""}
                    ${isSelected && !isTodayDate ? "bg-accent" : ""}
                    ${!isTodayDate && !isSelected ? "hover:bg-muted" : ""}
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  <span className="text-sm sm:text-base">{format(day, "d")}</span>
                  {hasItems && (
                    <div className="flex gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 absolute bottom-0.5 sm:bottom-1">
                      {dayItems.slice(0, 3).map((item, idx) => (
                        <div 
                          key={idx} 
                          className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                          style={{ backgroundColor: item.type === "event" ? item.color : "hsl(var(--primary))" }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
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

      {/* Calendar Sync Dialog for Premium Users */}
      <Dialog open={showCalendarSyncDialog} onOpenChange={setShowCalendarSyncDialog}>
        <DialogContent className="max-w-md w-[95%] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              {t('calendar.syncYourCalendars')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('calendar.selectCalendarToSync')}
            </p>
            <div className="space-y-3">
              {/* Google Calendar — Available */}
              {googleSynced ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-green-500/40 bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-base font-bold text-red-500 shadow-sm">G</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Google Calendar</p>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[10px] font-semibold">
                          <Check className="h-2.5 w-2.5" /> Connected
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{googleEvents.length} events synced</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleGoogleConnect} disabled={isSyncing}>
                      {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDisconnectGoogle}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-base font-bold text-red-500 shadow-sm">G</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Google Calendar</p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">Available</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Two-way sync with Google Calendar</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={handleGoogleConnect} disabled={isSyncing} className="gradient-primary text-white border-0">
                      {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Connect'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Apple Calendar — Coming Soon */}
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">Apple Calendar</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">Coming Soon</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70">iCloud calendar integration</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outlook Calendar — Coming Soon */}
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center shadow-sm">
                      <span className="text-white text-xs font-bold">O</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">Outlook Calendar</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">Coming Soon</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70">Microsoft 365 integration</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-4 w-4 text-primary" />
              <span>Premium feature unlocked</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            {t('calendar.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('calendar.subtitle')}</p>
        </div>
        <ParticleButton 
          className="gap-2 gradient-primary text-white border-0 w-full sm:w-auto"
          onClick={() => {
            setDialogTab("event");
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('calendar.new')}</span>
          <span className="sm:hidden">New</span>
        </ParticleButton>
      </div>

      {/* Month Calendar */}
      {renderMonthCalendar()}

      {/* Events & Reminders List */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 sm:p-6">
          {getItemsForDate(selectedDate).length > 0 ? (
            getItemsForDate(selectedDate).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleEditItem(item)}
              >
                {item.type === "event" ? (
                  <>
                    <div 
                      className="w-1 h-full rounded-full mt-1"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{item.title}</h4>
                          {item.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </p>
                          )}
                          {item.repeat && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t('calendar.repeats')}: {item.repeat}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          {item.allDay ? (
                            <span>{t('calendar.allDay')}</span>
                          ) : (
                            <div className="text-right">
                              <div>{format(item.startDate, "HH:mm")}</div>
                              <div>{format(item.endDate, "HH:mm")}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      {t('common.delete')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleReminder(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                        {item.title}
                      </h4>
                      {item.dueTime && (
                        <p className="text-sm text-muted-foreground">{item.dueTime}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      {t('common.delete')}
                    </Button>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('calendar.noEventsForDay')}</p>
          )}
        </CardContent>
      </Card>

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

              <div className="space-y-2">
                <Input
                  placeholder={t('calendar.location')}
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full text-xs sm:text-sm min-h-[44px]"
                />
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
                      onChange={(e) => setEventStartDate(new Date(e.target.value))}
                      className="flex-1 min-w-0"
                    />
                    {!eventAllDay && (
                      <Input
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        className="w-24 flex-shrink-0"
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
                      className="flex-1 min-w-0"
                    />
                    {!eventAllDay && (
                      <Input
                        type="time"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                        className="w-24 flex-shrink-0"
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
