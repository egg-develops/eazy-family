import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    return parsed.map((item: any) => ({
      ...item,
      startDate: item.startDate ? new Date(item.startDate) : undefined,
      endDate: item.endDate ? new Date(item.endDate) : undefined,
      dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
    }));
  }
  
  // Default items for October 2025
  return [
    { 
      id: "1", 
      title: "Swimming Lesson", 
      startDate: new Date(2025, 9, 2, 14, 0), // Oct 2, 2025, 2:00 PM
      endDate: new Date(2025, 9, 2, 15, 0), 
      allDay: false, 
      location: "Aquatic Center",
      type: "event",
      color: "hsl(220 70% 50%)"
    },
    { 
      id: "2", 
      title: "Children's Museum", 
      startDate: new Date(2025, 9, 3, 10, 0), // Oct 3, 2025, 10:00 AM
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
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [items, setItems] = useState<CalendarItem[]>(getInitialItems);
  
  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('eazy-family-calendar-items', JSON.stringify(items));
  }, [items]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"event" | "reminder">("event");
  
  // Form states for Event
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventStartDate, setEventStartDate] = useState<Date>(new Date());
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndDate, setEventEndDate] = useState<Date>(new Date());
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventRepeat, setEventRepeat] = useState("never");
  const [eventTravelTime, setEventTravelTime] = useState("none");
  
  // Form states for Reminder
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState("");
  const [reminderPriority, setReminderPriority] = useState<"low" | "medium" | "high">("medium");

  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
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
  };

  const resetReminderForm = () => {
    setReminderTitle("");
    setReminderDate(undefined);
    setReminderTime("");
    setReminderPriority("medium");
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim()) return;
    
    const newEvent: Event = {
      id: Date.now().toString(),
      title: eventTitle,
      startDate: eventStartDate,
      endDate: eventEndDate,
      allDay: eventAllDay,
      location: eventLocation || undefined,
      repeat: eventRepeat !== "never" ? eventRepeat : undefined,
      travelTime: eventTravelTime !== "none" ? eventTravelTime : undefined,
      type: "event",
      color: "hsl(220 70% 50%)"
    };
    
    setItems([...items, newEvent]);
    resetEventForm();
    setIsDialogOpen(false);
    toast({
      title: "Event Added",
      description: `${eventTitle} has been added to your calendar.`,
    });
  };

  const handleAddReminder = () => {
    if (!reminderTitle.trim()) return;
    
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
    resetReminderForm();
    setIsDialogOpen(false);
    toast({
      title: "Reminder Added",
      description: `${reminderTitle} has been added to your reminders.`,
    });
  };

  const renderMonthCalendar = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{format(selectedDate, "MMMM yyyy")}</CardTitle>
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
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-7 gap-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
              <div key={idx} className="text-center text-xs font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const dayItems = getItemsForDate(day);
              const hasItems = dayItems.length > 0;
              
              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square p-1 flex flex-col items-center justify-start cursor-pointer transition-colors rounded-lg ${
                    !isCurrentMonth ? "text-muted-foreground opacity-50" : ""
                  } ${isToday(day) ? "bg-primary text-primary-foreground font-bold" : ""} ${
                    isSameDay(day, selectedDate) && !isToday(day) ? "ring-2 ring-primary" : ""
                  } hover:bg-muted`}
                  onClick={() => setSelectedDate(day)}
                >
                  <p className="text-sm">{format(day, "d")}</p>
                  {hasItems && (
                    <div className="flex gap-0.5 mt-1">
                      {dayItems.slice(0, 3).map((item, idx) => (
                        <div 
                          key={idx} 
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: item.type === "event" ? item.color : "hsl(var(--primary))" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendar
          </h1>
          <p className="text-muted-foreground">Manage your family schedule</p>
        </div>
        <Button 
          className="gap-2 gradient-primary text-white border-0"
          onClick={() => {
            setDialogTab("event");
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {/* Month Calendar */}
      {renderMonthCalendar()}

      {/* Events & Reminders List */}
      <Card className="shadow-custom-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {getItemsForDate(selectedDate).length > 0 ? (
            getItemsForDate(selectedDate).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
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
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          {item.allDay ? (
                            <span>all-day</span>
                          ) : (
                            <div className="text-right">
                              <div>{format(item.startDate, "HH:mm")}</div>
                              <div>{format(item.endDate, "HH:mm")}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleReminder(item.id)}
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
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No events or reminders</p>
          )}
        </CardContent>
      </Card>

      {/* Add Event/Reminder Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>New</DialogTitle>
          </DialogHeader>
          
          <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as "event" | "reminder")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="event">Event</TabsTrigger>
              <TabsTrigger value="reminder">Reminder</TabsTrigger>
            </TabsList>

            <TabsContent value="event" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  placeholder="Title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Location or Video Call"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="all-day">All-day</Label>
                <Switch
                  id="all-day"
                  checked={eventAllDay}
                  onCheckedChange={setEventAllDay}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Starts</Label>
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
                  <Label>Ends</Label>
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
                <Label>Travel Time</Label>
                <Select value={eventTravelTime} onValueChange={setEventTravelTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="15min">15 minutes</SelectItem>
                    <SelectItem value="30min">30 minutes</SelectItem>
                    <SelectItem value="1hour">1 hour</SelectItem>
                    <SelectItem value="2hours">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select value={eventRepeat} onValueChange={setEventRepeat}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="daily">Every Day</SelectItem>
                    <SelectItem value="weekly">Every Week</SelectItem>
                    <SelectItem value="monthly">Every Month</SelectItem>
                    <SelectItem value="yearly">Every Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    resetEventForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-primary text-white border-0"
                  onClick={handleAddEvent}
                >
                  Add
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="reminder" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  placeholder="Title"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Input
                  type="date"
                  value={reminderDate ? format(reminderDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setReminderDate(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>

              {reminderDate && (
                <div className="space-y-2">
                  <Label>Due Time (Optional)</Label>
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={reminderPriority} onValueChange={(v) => setReminderPriority(v as "low" | "medium" | "high")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    resetReminderForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-primary text-white border-0"
                  onClick={handleAddReminder}
                >
                  Add
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
