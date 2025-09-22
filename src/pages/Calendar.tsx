import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Filter, ChevronLeft, ChevronRight, CheckSquare, Square, Clock, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Event {
  id: string;
  title: string;
  time: string;
  type: 'personal' | 'family' | 'child';
  color: string;
  location?: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  category: 'personal' | 'family' | 'child';
  createdAt: Date;
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Swimming Lesson',
    time: '14:00',
    type: 'child',
    color: 'bg-blue-500',
    location: 'Aquatic Center'
  },
  {
    id: '2',
    title: 'Grocery Shopping',
    time: '16:30',
    type: 'family',
    color: 'bg-green-500',
    location: 'Migros'
  },
  {
    id: '3',
    title: 'Pediatrician Appointment',
    time: '09:00',
    type: 'child',
    color: 'bg-red-500',
    location: 'Dr. Mueller'
  },
];

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Buy birthday gift for Emma',
    completed: false,
    priority: 'high',
    dueDate: new Date(),
    category: 'family',
    createdAt: new Date()
  },
  {
    id: '2',
    title: 'Schedule dentist appointment',
    completed: false,
    priority: 'medium',
    category: 'child',
    createdAt: new Date()
  },
  {
    id: '3',
    title: 'Meal prep for the week',
    completed: true,
    priority: 'low',
    category: 'family',
    createdAt: new Date()
  },
];

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [filter, setFilter] = useState<'all' | 'personal' | 'family' | 'child'>('all');
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const filteredEvents = mockEvents.filter(event => 
    filter === 'all' || event.type === filter
  );

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'completed') return task.completed;
    if (taskFilter === 'active') return !task.completed;
    return true;
  });

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      priority: 'medium',
      category: 'family',
      createdAt: new Date()
    };
    
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckSquare className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Calendar</h1>
        </div>
        <Button size="sm" className="gradient-primary text-white border-0">
          <Plus className="w-4 h-4 mr-1" />
          Add Event
        </Button>
      </div>

      {/* Date Navigation */}
      <Card className="shadow-custom-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="font-semibold">{formatDate(selectedDate)}</h2>
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            {['day', 'week', 'month'].map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode as any)}
                className={viewMode === mode ? 'gradient-primary text-white border-0' : ''}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-auto min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="child">Children</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Integration Status */}
      <Card className="shadow-custom-md border-l-4 border-l-warning">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Calendar Sync</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Google, iCloud, or Outlook calendar
              </p>
            </div>
            <Button variant="outline" size="sm">
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Events */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Today's Schedule</h3>
        
        {filteredEvents.length > 0 ? (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="shadow-custom-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${event.color}`} />
                    <div className="flex-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">{event.time}</span>
                        {event.location && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        event.type === 'child' ? 'bg-blue-100 text-blue-700' :
                        event.type === 'family' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {event.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-custom-md">
            <CardContent className="p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No events today</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your schedule is clear! Perfect time for spontaneous family fun.
              </p>
              <Button className="gradient-primary text-white border-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Add Suggestions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quick Add</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <CalendarIcon className="w-5 h-5" />
            <span className="text-sm">Doctor Visit</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
            <CalendarIcon className="w-5 h-5" />
            <span className="text-sm">Activity</span>
          </Button>
        </div>
      </div>

      {/* To-Do Section */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            To-Do List
          </h3>
          <div className="flex items-center gap-2">
            <Select value={taskFilter} onValueChange={(value: any) => setTaskFilter(value)}>
              <SelectTrigger className="w-auto min-w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Add New Task */}
        <Card className="shadow-custom-md">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                className="flex-1"
              />
              <Button onClick={addTask} className="gradient-primary text-white border-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        {filteredTasks.length > 0 ? (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <Card key={task.id} className={`shadow-custom-md transition-opacity ${task.completed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex-1">
                      <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          <span className="text-xs capitalize">{task.priority}</span>
                        </div>
                        {task.dueDate && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              Due today
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        task.category === 'child' ? 'bg-blue-100 text-blue-700' :
                        task.category === 'family' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {task.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTask(task.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-custom-md">
            <CardContent className="p-8 text-center">
              <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">
                {taskFilter === 'completed' ? 'No completed tasks' : 
                 taskFilter === 'active' ? 'No active tasks' : 'No tasks yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {taskFilter === 'completed' ? 'Complete some tasks to see them here.' :
                 taskFilter === 'active' ? 'All tasks are completed! Great job.' :
                 'Stay organized by adding your daily tasks and to-dos.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Task Stats */}
        {tasks.length > 0 && (
          <Card className="shadow-custom-md bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {tasks.filter(t => t.completed).length} of {tasks.length} completed
                </span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Calendar;