import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Plus, Trash2, AlertCircle } from "lucide-react";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addDays } from "date-fns";

interface Event {
  title: string;
  time: string;
  type: string;
  color: string;
  location?: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  category?: string;
  createdAt: Date;
}

const mockEvents: Event[] = [
  { title: "Soccer Practice", time: "4:00 PM", type: "sports", color: "bg-blue-500", location: "Central Park" },
  { title: "Piano Lesson", time: "5:30 PM", type: "education", color: "bg-purple-500", location: "Music School" },
  { title: "Family Dinner", time: "7:00 PM", type: "family", color: "bg-green-500" },
];

const mockTasks: Task[] = [
  { id: "1", title: "Buy groceries", completed: false, priority: "high", dueDate: new Date(), category: "shopping", createdAt: new Date() },
  { id: "2", title: "Call dentist", completed: false, priority: "medium", category: "health", createdAt: new Date() },
  { id: "3", title: "Review homework", completed: true, priority: "low", category: "education", createdAt: new Date() },
];

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const formatDate = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const filteredEvents = eventFilter === "all" 
    ? mockEvents 
    : mockEvents.filter(event => event.type === eventFilter);

  const filteredTasks = tasks.filter(task => 
    !task.dueDate || isSameDay(task.dueDate, selectedDate)
  );

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        completed: false,
        priority: "medium",
        dueDate: selectedDate,
        createdAt: new Date(),
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle("");
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const getPriorityIcon = (priority: string) => {
    return <AlertCircle className={`h-4 w-4 ${getPriorityColor(priority)}`} />;
  };

  const renderDayView = () => {
    return (
      <div className="space-y-4">
        <Card className="shadow-custom-md">
          <CardHeader>
            <CardTitle className="text-xl">Today's Schedule</CardTitle>
            <CardDescription>{formatDate(selectedDate)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`w-1 h-full ${event.color} rounded-full`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{event.title}</h4>
                      <span className="text-sm text-muted-foreground">{event.time}</span>
                    </div>
                    {event.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No events scheduled</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <Card className="shadow-custom-md">
          <CardHeader>
            <CardTitle>Week View</CardTitle>
            <CardDescription>
              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isToday(day) ? "bg-primary/10 border-primary" : ""
                  } ${isSameDay(day, selectedDate) ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(day, "EEE")}
                    </p>
                    <p className="text-lg font-bold">{format(day, "d")}</p>
                    <div className="mt-2 space-y-1">
                      {mockEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-1 rounded ${event.color} text-white truncate`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="space-y-4">
        <Card className="shadow-custom-md">
          <CardHeader>
            <CardTitle>Month View</CardTitle>
            <CardDescription>{format(selectedDate, "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div
                    key={index}
                    className={`aspect-square p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                      !isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""
                    } ${isToday(day) ? "bg-primary/10 border-primary font-bold" : ""} ${
                      isSameDay(day, selectedDate) ? "ring-2 ring-primary" : ""
                    } hover:bg-muted/50`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <p className="text-sm">{format(day, "d")}</p>
                    {isCurrentMonth && mockEvents.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {mockEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            className={`w-1 h-1 rounded-full ${event.color}`}
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendar
          </h1>
          <p className="text-muted-foreground">Manage your family schedule</p>
        </div>
        <Button className="gap-2 gradient-primary text-white border-0">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* View Mode Selector */}
      <Card className="shadow-custom-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
                  else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
                  else newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center">
                {viewMode === "day" && formatDate(selectedDate)}
                {viewMode === "week" && `${format(startOfWeek(selectedDate), "MMM d")} - ${format(endOfWeek(selectedDate), "MMM d, yyyy")}`}
                {viewMode === "month" && format(selectedDate, "MMMM yyyy")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
                  else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
                  else newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                onClick={() => setViewMode("day")}
                className={viewMode === "day" ? "gradient-primary text-white border-0" : ""}
              >
                Day
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
                className={viewMode === "week" ? "gradient-primary text-white border-0" : ""}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                onClick={() => setViewMode("month")}
                className={viewMode === "month" ? "gradient-primary text-white border-0" : ""}
              >
                Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={eventFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setEventFilter("all")}
          className={eventFilter === "all" ? "gradient-primary text-white border-0" : ""}
        >
          All Events
        </Button>
        <Button
          variant={eventFilter === "sports" ? "default" : "outline"}
          size="sm"
          onClick={() => setEventFilter("sports")}
          className={eventFilter === "sports" ? "gradient-primary text-white border-0" : ""}
        >
          Sports
        </Button>
        <Button
          variant={eventFilter === "education" ? "default" : "outline"}
          size="sm"
          onClick={() => setEventFilter("education")}
          className={eventFilter === "education" ? "gradient-primary text-white border-0" : ""}
        >
          Education
        </Button>
        <Button
          variant={eventFilter === "family" ? "default" : "outline"}
          size="sm"
          onClick={() => setEventFilter("family")}
          className={eventFilter === "family" ? "gradient-primary text-white border-0" : ""}
        >
          Family
        </Button>
      </div>

      {/* Calendar Views */}
      {viewMode === "day" && renderDayView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "month" && renderMonthView()}

      {/* Calendar Sync */}
      <div className="max-w-2xl">
        <Card className="shadow-custom-md">
          <CardHeader>
            <CardTitle>Calendar Sync</CardTitle>
            <CardDescription>Connected calendars</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="font-medium text-sm">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">sarah@email.com</p>
                </div>
              </div>
              <Badge variant="secondary">Connected</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div>
                  <p className="font-medium text-sm">Outlook Calendar</p>
                  <p className="text-xs text-muted-foreground">family@outlook.com</p>
                </div>
              </div>
              <Badge variant="secondary">Connected</Badge>
            </div>

            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* To-Do List */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle>To-Do List</CardTitle>
          <CardDescription>Tasks for {format(selectedDate, "MMMM d")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTask()}
            />
            <Button onClick={addTask} className="gradient-primary text-white border-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <div className="flex-1">
                    <p className={`${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    {task.category && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {task.category}
                      </Badge>
                    )}
                  </div>
                  {getPriorityIcon(task.priority)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No tasks for this day</p>
            )}
          </div>

          {tasks.filter(t => t.completed).length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {tasks.filter(t => t.completed).length} completed task(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;