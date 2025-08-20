import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Event {
  id: string;
  title: string;
  time: string;
  type: 'personal' | 'family' | 'child';
  color: string;
  location?: string;
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

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [filter, setFilter] = useState<'all' | 'personal' | 'family' | 'child'>('all');

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

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
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
    </div>
  );
};

export default Calendar;