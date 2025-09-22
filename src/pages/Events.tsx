import { useState } from "react";
import { MapPin, Filter, Clock, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: string;
  ageRange: string;
  price: string;
  image: string;
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Interactive Science Workshop',
    description: 'Hands-on experiments and discoveries for curious minds',
    date: 'Today',
    time: '10:00 AM',
    location: 'Science Museum Zurich',
    type: 'Educational',
    ageRange: '4-8 years',
    price: 'CHF 15',
    image: 'bg-gradient-to-br from-blue-400 to-purple-600'
  },
  {
    id: '2',
    title: 'Family Art & Craft Day',
    description: 'Create beautiful memories together with arts and crafts',
    date: 'Tomorrow',
    time: '2:00 PM',
    location: 'Community Center',
    type: 'Creative',
    ageRange: '2-10 years',
    price: 'Free',
    image: 'bg-gradient-to-br from-pink-400 to-orange-500'
  },
  {
    id: '3',
    title: 'Nature Adventure Walk',
    description: 'Explore local wildlife and learn about nature',
    date: 'This Weekend',
    time: '9:00 AM',
    location: 'Zurich Forest Park',
    type: 'Outdoor',
    ageRange: '3-10 years',
    price: 'CHF 8',
    image: 'bg-gradient-to-br from-green-400 to-blue-500'
  },
];

const Events = () => {
  const [filter, setFilter] = useState<string>('all');
  const [distance, setDistance] = useState<string>('10km');

  const filteredEvents = mockEvents.filter(event => 
    filter === 'all' || event.type.toLowerCase() === filter.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Events</h1>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredEvents.length} events
        </Badge>
      </div>

      {/* Location Banner */}
      <Card className="shadow-custom-md gradient-primary text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Zurich Area</h3>
              <p className="text-white/90 text-sm">
                Showing family-friendly events near you
              </p>
            </div>
            <MapPin className="w-8 h-8 text-white/80" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="flex-1">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="educational">Educational</SelectItem>
            <SelectItem value="creative">Creative</SelectItem>
            <SelectItem value="outdoor">Outdoor</SelectItem>
            <SelectItem value="entertainment">Entertainment</SelectItem>
          </SelectContent>
        </Select>

        <Select value={distance} onValueChange={setDistance}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5km">5km</SelectItem>
            <SelectItem value="10km">10km</SelectItem>
            <SelectItem value="20km">20km</SelectItem>
            <SelectItem value="50km">50km</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Featured Event */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent" />
          Featured Today
        </h3>
        
        <Card className="shadow-custom-lg overflow-hidden">
          <div className={`h-32 ${mockEvents[0].image} flex items-end p-4`}>
            <Badge className="bg-white/90 text-primary">Featured</Badge>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-lg">{mockEvents[0].title}</h4>
                <p className="text-sm text-muted-foreground">
                  {mockEvents[0].description}
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {mockEvents[0].time}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {mockEvents[0].location}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="secondary">{mockEvents[0].ageRange}</Badge>
                  <Badge variant="outline">{mockEvents[0].price}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button className="w-full gradient-primary text-white border-0">
                View Details & Book
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* More Events */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">More Events</h3>
        
        <div className="space-y-4">
          {filteredEvents.slice(1).map((event) => (
            <Card key={event.id} className="shadow-custom-md">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className={`w-20 h-20 rounded-lg ${event.image} flex-shrink-0`} />
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{event.date}</span>
                        <span>•</span>
                        <span>{event.time}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {event.ageRange}
                      </Badge>
                      <span className="font-medium text-primary">{event.price}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Map View Toggle */}
      <Button variant="outline" className="w-full">
        <MapPin className="w-4 h-4 mr-2" />
        View on Map
      </Button>
    </div>
  );
};

export default Events;