import { useState } from "react";
import { useTranslation } from "react-i18next";
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
    id: "1",
    title: "Children's Science Workshop",
    description: "Explore the wonders of science with hands-on experiments",
    date: "2025-10-15",
    time: "14:00 - 16:00",
    location: "Zurich Science Center",
    type: "educational",
    ageRange: "6-12 years",
    price: "CHF 15",
    image: "bg-blue-200"
  },
  {
    id: "2",
    title: "Family Painting Class",
    description: "Create beautiful artwork together as a family",
    date: "2025-10-18",
    time: "10:00 - 12:00",
    location: "Art Studio Zurich",
    type: "creative",
    ageRange: "4+ years",
    price: "CHF 20",
    image: "bg-pink-200"
  },
  {
    id: "3",
    title: "Outdoor Adventure Day",
    description: "Hiking and nature exploration for families",
    date: "2025-10-20",
    time: "09:00 - 17:00",
    location: "Uetliberg, Zurich",
    type: "outdoor",
    ageRange: "5+ years",
    price: "Free",
    image: "bg-green-200"
  },
  {
    id: "4",
    title: "Movie Night: Family Edition",
    description: "Watch a fun family-friendly movie together",
    date: "2025-10-22",
    time: "18:00 - 20:00",
    location: "Kino Zurich",
    type: "entertainment",
    ageRange: "All ages",
    price: "CHF 12",
    image: "bg-purple-200"
  }
];

const Events = () => {
  const { t } = useTranslation();
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
          <h1 className="text-2xl font-bold">{t('events.title')}</h1>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredEvents.length} {t('events.eventsCount')}
        </Badge>
      </div>

      {/* Location Banner */}
      <Card className="shadow-custom-md gradient-primary text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Zurich Area</h3>
              <p className="text-white/90 text-sm">
                {t('events.showing')}
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
            <SelectItem value="all">{t('events.filters.all')}</SelectItem>
            <SelectItem value="educational">{t('events.filters.educational')}</SelectItem>
            <SelectItem value="creative">{t('events.filters.creative')}</SelectItem>
            <SelectItem value="outdoor">{t('events.filters.outdoor')}</SelectItem>
            <SelectItem value="entertainment">{t('events.filters.entertainment')}</SelectItem>
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
          {t('events.featuredToday')}
        </h3>
        
        {filteredEvents.length > 0 ? (
          <Card className="shadow-custom-lg overflow-hidden">
            <div className={`h-32 ${filteredEvents[0].image} flex items-end p-4`}>
              <Badge className="bg-white/90 text-primary">{t('events.featured')}</Badge>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-lg">{filteredEvents[0].title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {filteredEvents[0].description}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {filteredEvents[0].time}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {filteredEvents[0].location}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{filteredEvents[0].ageRange}</Badge>
                    <Badge variant="outline">{filteredEvents[0].price}</Badge>
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
                  {t('events.viewDetails')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-custom-lg">
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Discover events in your area</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Family-friendly events and activities available near you
              </p>
              <Button 
                className="gradient-primary text-white border-0"
                onClick={() => setFilter('all')}
              >
                <MapPin className="w-4 h-4 mr-1" />
                Find Events Near Me
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* More Events */}
      {filteredEvents.length > 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('events.moreEvents')}</h3>
          
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
      )}

      {/* Map View Toggle */}
      <Button variant="outline" className="w-full">
        <MapPin className="w-4 h-4 mr-2" />
        {t('events.viewOnMap')}
      </Button>
    </div>
  );
};

export default Events;