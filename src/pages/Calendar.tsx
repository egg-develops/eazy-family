import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Plus, Trash2, AlertCircle, CheckSquare, ShoppingCart, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addDays } from "date-fns";

interface CalendarProps {}

interface CalendarState {
  date: Date;
}

interface EventFilters {
  sports: boolean;
  education: boolean;
  family: boolean;
}

interface TaskFilters {
  completed: boolean;
  priority: "low" | "medium" | "high";
}

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
  { id: "1", title: "Review homework", completed: false, priority: "high", dueDate: new Date(), category: "tasks", createdAt: new Date() },
  { id: "2", title: "Call dentist", completed: false, priority: "medium", category: "tasks", createdAt: new Date() },
];

const mockShoppingTasks: Task[] = [
  { id: "s1", title: "Buy groceries", completed: false, priority: "high", category: "shopping", createdAt: new Date() },
  { id: "s2", title: "Pick up dry cleaning", completed: false, priority: "medium", category: "shopping", createdAt: new Date() },
];

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [shoppingTasks, setShoppingTasks] = useState<Task[]>(mockShoppingTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [todoTab, setTodoTab] = useState("tasks");

  const formatDate = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const filteredEvents = eventFilter === "all" 
    ? mockEvents 
    : mockEvents.filter(event => event.type === eventFilter);

  const getCurrentTasks = () => {
    return todoTab === "tasks" ? tasks : shoppingTasks;
  };

  const setCurrentTasks = (newTasks: Task[]) => {
    if (todoTab === "tasks") {
      setTasks(newTasks);
    } else {
      setShoppingTasks(newTasks);
    }
  };

  const filteredTasks = getCurrentTasks().filter(task => 
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
        category: todoTab,
        createdAt: new Date(),
      };
      setCurrentTasks([...getCurrentTasks(), newTask]);
      setNewTaskTitle("");
    }
  };

  const toggleTask = (id: string) => {
    setCurrentTasks(getCurrentTasks().map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setCurrentTasks(getCurrentTasks().filter(task => task.id !== id));
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
          <CardContent className="px-2 sm:px-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className={`p-1 sm:p-3 border rounded-lg cursor-pointer transition-all ${
                    isToday(day) ? "bg-primary/10 border-primary" : ""
                  } ${isSameDay(day, selectedDate) ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                      {format(day, "EEE")}
                    </p>
                    <p className="text-sm sm:text-lg font-bold">{format(day, "d")}</p>
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
          <CardContent className="px-2 sm:px-6">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground p-1 sm:p-2">
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                return (
                  <div
                    key={index}
                    className={`aspect-square p-1 sm:p-2 border rounded-lg text-center cursor-pointer transition-colors ${
                      !isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""
                    } ${isToday(day) ? "bg-primary/10 border-primary font-bold" : ""} ${
                      isSameDay(day, selectedDate) ? "ring-2 ring-primary" : ""
                    } hover:bg-muted/50`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <p className="text-xs sm:text-sm">{format(day, "d")}</p>
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
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendar
          </h1>
          <p className="text-muted-foreground">Manage your family schedule</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 gradient-primary text-white border-0">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
          <Button className="gap-2 gradient-cool text-white border-0">
            <Plus className="h-4 w-4" />
            Add To-Do
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <Card className="shadow-custom-md w-full">
        <CardContent className="pt-6 px-2 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
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
              <h2 className="text-sm sm:text-lg font-semibold min-w-[180px] sm:min-w-[200px] text-center">
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
                size="sm"
                className={viewMode === "day" ? "gradient-primary text-white border-0" : ""}
              >
                Day
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
                size="sm"
                className={viewMode === "week" ? "gradient-primary text-white border-0" : ""}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                onClick={() => setViewMode("month")}
                size="sm"
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

      {/* To-Do Lists */}
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            To-Do Lists
          </CardTitle>
          <CardDescription>Organize your family tasks and shopping lists</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={todoTab} onValueChange={setTodoTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tasks" className="gap-2">
                <CheckSquare className="w-4 h-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="shopping" className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Shopping
              </TabsTrigger>
              <TabsTrigger value="shared" className="gap-2">
                <Users className="w-4 h-4" />
                Shared
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="text-center p-3">
                  <div className="text-xl font-bold">{tasks.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-xl font-bold text-green-500">{tasks.filter(t => t.completed).length}</div>
                  <div className="text-xs text-muted-foreground">Done</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-xl font-bold text-red-500">0</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-xl font-bold text-blue-500">{tasks.filter(t => !t.completed).length}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </Card>
              </div>

              {/* Add Task */}
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

              {/* Task List */}
              <div className="space-y-2">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
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
                  <div className="text-center py-12">
                    <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tasks yet</p>
                    <p className="text-sm text-muted-foreground">Start by adding your first task</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="shopping" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="text-center p-3">
                  <div className="text-xl font-bold">{shoppingTasks.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-xl font-bold text-green-500">{shoppingTasks.filter(t => t.completed).length}</div>
                  <div className="text-xs text-muted-foreground">Done</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-xl font-bold text-red-500">0</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="text-xl font-bold text-blue-500">{shoppingTasks.filter(t => !t.completed).length}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </Card>
              </div>

              {/* Add Shopping Item */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add shopping item..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTask()}
                />
                <Button onClick={addTask} className="gradient-primary text-white border-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Shopping List */}
              <div className="space-y-2">
                {shoppingTasks.length > 0 ? (
                  shoppingTasks.map((task) => (
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
                      </div>
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
                  <div className="text-center py-12">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No shopping items yet</p>
                    <p className="text-sm text-muted-foreground">Add items to your shopping list</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="shared" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Shared Lists</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Share and sync tasks with family members on your Family Plan
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    Family Plan Feature
                  </Badge>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Calendar Sync */}
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
          
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Calendar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;
