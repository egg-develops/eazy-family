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

  // Haversine distance in km
  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredEvents = events.filter(event => {
    const typeMatch = filter === 'all' || event.type.toLowerCase() === filter.toLowerCase();
    if (!typeMatch) return false;
    if (!userLocation) return true;
    const km = calcDistance(userLocation.lat, userLocation.lng, event.lat, event.lng);
    return km <= parseInt(distance);
  }).map(event => {
    if (!userLocation) return event;
    const km = calcDistance(userLocation.lat, userLocation.lng, event.lat, event.lng);
    return { ...event, distance: `${km.toFixed(1)} km` };
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center" />
          <h1 className="text-lg sm:text-2xl font-bold">{t('events.title')}</h1>
        </div>
        <Badge variant="secondary" className="text-xs sm:text-sm whitespace-nowrap">
          {filteredEvents.length} events
        </Badge>
      </div>

      {/* Location Banner */}
      <Card className="shadow-custom-md gradient-primary text-white">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">
                {userLocation ? "Your Area" : "Detecting location..."}
              </h3>
              <p className="text-white/90 text-xs sm:text-sm">
                Showing events within {distance}km
              </p>
            </div>
            <Navigation className="w-6 h-6 sm:w-8 sm:h-8 text-white/80 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:flex-1 min-h-[44px] text-xs sm:text-sm">
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
          <SelectTrigger className="w-full sm:w-32 min-h-[44px] text-xs sm:text-sm">
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
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0" />
          Events Near You
        </h3>

        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <Card key={event.id} className="shadow-custom-md">
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base">{event.title}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    {event.distance && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">
                        {event.distance}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{event.date} • {event.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{event.ageRange}</Badge>
                      <Badge variant="outline" className="text-xs">{event.price}</Badge>
                      <Badge variant="outline" className="text-xs">{event.type}</Badge>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" aria-label="Favorite" className="min-h-[44px] min-w-[44px]">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Share" className="min-h-[44px] min-w-[44px]">
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
            <CardContent className="p-6 sm:p-8 text-center">
              <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="font-medium text-sm sm:text-base mb-2">No events nearby</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Try increasing the distance or changing filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map View Toggle */}
      <Button
        variant="outline"
        className="w-full text-xs sm:text-sm min-h-[44px]"
        onClick={() => setShowMap(!showMap)}
      >
        <MapPin className="w-4 h-4 mr-2" />
        {showMap ? "Hide Map" : "View on Map"}
      </Button>
    </div>
  );
};

export default Events;
