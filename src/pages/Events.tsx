import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Filter, Clock, Heart, Share2, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { error as logError } from "@/lib/logger";

interface NearbyEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: string;
  ageRange: string;
  price: string;
  lat: number;
  lng: number;
  distance?: string;
}

// Sample events for demo
const sampleEvents: NearbyEvent[] = [
  {
    id: "1", title: "Family Fun Day at the Park", description: "Join us for games, face painting, and picnic!",
    date: "Mar 22", time: "10:00 AM", location: "City Park", type: "outdoor",
    ageRange: "All ages", price: "Free", lat: 47.3769, lng: 8.5417, distance: "1.2 km"
  },
  {
    id: "2", title: "Kids Art Workshop", description: "Creative painting session for children aged 4-12",
    date: "Mar 23", time: "2:00 PM", location: "Art Center", type: "creative",
    ageRange: "4-12", price: "CHF 15", lat: 47.3744, lng: 8.5410, distance: "2.5 km"
  },
  {
    id: "3", title: "Story Time at Library", description: "Interactive storytelling for toddlers",
    date: "Mar 24", time: "11:00 AM", location: "Central Library", type: "educational",
    ageRange: "2-6", price: "Free", lat: 47.3780, lng: 8.5400, distance: "0.8 km"
  },
];

const Events = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>('all');
  const [distance, setDistance] = useState<string>('10');
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [events] = useState<NearbyEvent[]>(sampleEvents);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Request browser location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          logError("Location error:", err);
          // Default to Zurich
          setUserLocation({ lat: 47.3769, lng: 8.5417 });
        },
        { timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 47.3769, lng: 8.5417 });
    }
  }, []);

  // Load Mapbox map when showMap toggled
  useEffect(() => {
    if (!showMap || !mapContainerRef.current || !userLocation) return;

    const loadMap = async () => {
      try {
        // Dynamically load mapbox-gl
        const mapboxgl = (await import('mapbox-gl')).default;
        
        // Load CSS
        if (!document.getElementById('mapbox-css')) {
          const link = document.createElement('link');
          link.id = 'mapbox-css';
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
          document.head.appendChild(link);
        }

        // Fetch Mapbox token from edge function
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('mapbox-token');
        if (tokenError || !tokenData?.token) {
          toast({ title: "Map unavailable", description: "Could not load map token", variant: "destructive" });
          return;
        }

        mapboxgl.accessToken = tokenData.token;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [userLocation.lng, userLocation.lat],
          zoom: 13,
        });

        // Add user location marker
        new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([userLocation.lng, userLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>You are here</strong>'))
          .addTo(map);

        // Add event markers
        filteredEvents.forEach(event => {
          const popup = new mapboxgl.Popup().setHTML(
            `<strong>${event.title}</strong><br/>${event.time} • ${event.location}<br/>${event.price}`
          );
          new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat([event.lng, event.lat])
            .setPopup(popup)
            .addTo(map);
        });

        map.addControl(new mapboxgl.NavigationControl());
        mapRef.current = map;
      } catch (error) {
        logError("Map load error:", error);
        toast({ title: "Map error", description: "Could not load map", variant: "destructive" });
      }
    };

    loadMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [showMap, userLocation]);

  const filteredEvents = events.filter(event =>
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
          {filteredEvents.length} events
        </Badge>
      </div>

      {/* Location Banner */}
      <Card className="shadow-custom-md gradient-primary text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {userLocation ? "Your Area" : "Detecting location..."}
              </h3>
              <p className="text-white/90 text-sm">
                Showing events within {distance}km
              </p>
            </div>
            <Navigation className="w-8 h-8 text-white/80" />
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
            <SelectItem value="all">All Types</SelectItem>
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
            <SelectItem value="5">5km</SelectItem>
            <SelectItem value="10">10km</SelectItem>
            <SelectItem value="20">20km</SelectItem>
            <SelectItem value="50">50km</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Map View */}
      {showMap && (
        <div className="relative">
          <div ref={mapContainerRef} className="h-64 md:h-96 rounded-xl overflow-hidden border" />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={() => setShowMap(false)}
            aria-label="Close map"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent" />
          Events Near You
        </h3>

        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <Card key={event.id} className="shadow-custom-md">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    {event.distance && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap ml-2">
                        {event.distance}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {event.date} • {event.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">{event.ageRange}</Badge>
                      <Badge variant="outline" className="text-xs">{event.price}</Badge>
                      <Badge variant="outline" className="text-xs">{event.type}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" aria-label="Favorite">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Share">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="shadow-custom-lg">
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No events nearby</h3>
              <p className="text-sm text-muted-foreground">
                Try increasing the distance or changing filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map View Toggle */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowMap(!showMap)}
      >
        <MapPin className="w-4 h-4 mr-2" />
        {showMap ? "Hide Map" : "View on Map"}
      </Button>
    </div>
  );
};

export default Events;
