import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Filter, Clock, Heart, Share2, Navigation, X, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

// Community discovery events (curated local events)
const d = (n: number) => new Date(Date.now() + n * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' });
const communityEvents: NearbyEvent[] = [
  {
    id: "c1", title: "Family Fun Day at the Park",
    description: "Games, face painting, bouncy castle, and picnic zones for the whole family!",
    date: d(2), time: "10:00 AM",
    location: "Lindenhügel Park, Hauptstrasse 12, 8001 Zürich",
    type: "outdoor", ageRange: "All ages", price: "Free", lat: 47.3769, lng: 8.5417
  },
  {
    id: "c2", title: "Kids Art Workshop",
    description: "Creative painting and clay sculpting session for children aged 4–12. Aprons provided!",
    date: d(3), time: "2:00 PM",
    location: "Stadthaus Art Centre, Stadthausquai 17, 8001 Zürich",
    type: "creative", ageRange: "4–12", price: "CHF 15", lat: 47.3744, lng: 8.5410
  },
  {
    id: "c3", title: "Story Time at the Library",
    description: "Interactive storytelling and puppet shows for toddlers and preschoolers.",
    date: d(4), time: "11:00 AM",
    location: "Pestalozzi Bibliothek, Zähringerplatz 6, 8001 Zürich",
    type: "educational", ageRange: "2–6", price: "Free", lat: 47.3780, lng: 8.5400
  },
  {
    id: "c4", title: "Family Bike Tour",
    description: "Easy 10 km guided family bike tour along the lake. Bike rentals available on-site.",
    date: d(5), time: "9:00 AM",
    location: "Mythenquai 9, 8002 Zürich (lakeside)",
    type: "outdoor", ageRange: "5+", price: "Free", lat: 47.3618, lng: 8.5310
  },
  {
    id: "c5", title: "Junior Cooking Class",
    description: "Kids learn to make pizza from scratch with professional chefs. Parents welcome to watch!",
    date: d(6), time: "3:00 PM",
    location: "Kochschule Zürich, Hohlstrasse 163, 8004 Zürich",
    type: "educational", ageRange: "7–14", price: "CHF 25", lat: 47.3758, lng: 8.5188
  },
  {
    id: "c6", title: "Open-Air Movie Night",
    description: "Family-friendly film screening under the stars. BYO blankets and snacks!",
    date: d(7), time: "8:30 PM",
    location: "Alpamare Platz, Gwattstrasse 33, 8800 Thalwil",
    type: "entertainment", ageRange: "All ages", price: "CHF 10", lat: 47.2944, lng: 8.5617
  },
  {
    id: "c7", title: "Nature Scavenger Hunt",
    description: "Forest scavenger hunt with clues, prizes, and a nature guide. Rain or shine!",
    date: d(9), time: "10:30 AM",
    location: "Uetliberg Forest, Uetlibergstrasse, 8143 Stallikon",
    type: "outdoor", ageRange: "4–12", price: "Free", lat: 47.3531, lng: 8.4897
  },
  {
    id: "c8", title: "Family Yoga in the Park",
    description: "Gentle yoga session designed for parents and children together. Mats provided.",
    date: d(10), time: "9:30 AM",
    location: "Irchelpark, Winterthurerstrasse 190, 8057 Zürich",
    type: "wellness", ageRange: "All ages", price: "Free", lat: 47.4025, lng: 8.5480
  },
  {
    id: "c9", title: "Children's Science Fair",
    description: "Interactive exhibits and experiments covering robots, space, and wildlife. Hands-on fun!",
    date: d(12), time: "10:00 AM",
    location: "Museum für Gestaltung, Ausstellungsstrasse 60, 8005 Zürich",
    type: "educational", ageRange: "6–16", price: "CHF 12 / child", lat: 47.3866, lng: 8.5262
  },
  {
    id: "c10", title: "Weekend Farmers' Market",
    description: "Local produce, artisan foods, and kids' activities every Saturday morning.",
    date: d(14), time: "8:00 AM",
    location: "Helvetiaplatz, 8004 Zürich",
    type: "community", ageRange: "All ages", price: "Free entry", lat: 47.3726, lng: 8.5298
  },
  {
    id: "c11", title: "Baby & Toddler Swim",
    description: "Supervised water play for babies 6 months – 3 years with certified swim instructors.",
    date: d(15), time: "10:00 AM",
    location: "Hallenbad City, Sihlstrasse 71, 8001 Zürich",
    type: "wellness", ageRange: "0–3", price: "CHF 8", lat: 47.3749, lng: 8.5366
  },
  {
    id: "c12", title: "Family Board Game Afternoon",
    description: "Drop in for a relaxed afternoon of board games, hot chocolate, and community fun.",
    date: d(16), time: "2:00 PM",
    location: "Spielzeugmuseum, Fortunagasse 15, 8001 Zürich",
    type: "entertainment", ageRange: "All ages", price: "Free", lat: 47.3716, lng: 8.5428
  },
];

const Events = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>('all');
  const [distance, setDistance] = useState<string>('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dbEvents, setDbEvents] = useState<NearbyEvent[]>([]);
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
          setUserLocation({ lat: 47.3769, lng: 8.5417 });
        },
        { timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 47.3769, lng: 8.5417 });
    }
  }, []);

  // Load user's own events from DB
  useEffect(() => {
    if (!user?.id) return;
    const loadDbEvents = async () => {
      try {
        const { data } = await supabase
          .from('events')
          .select('id, title, description, start_date, location, type')
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(20);

        if (data) {
          const mapped: NearbyEvent[] = data.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description || '',
            date: new Date(e.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            time: new Date(e.start_date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
            location: e.location || 'Your area',
            type: e.type || 'personal',
            ageRange: 'All ages',
            price: 'Free',
            lat: 47.3769,
            lng: 8.5417,
          }));
          setDbEvents(mapped);
        }
      } catch (err) {
        logError("Failed to load DB events:", err);
      }
    };
    loadDbEvents();
  }, [user?.id]);

  // Load Leaflet map (OpenStreetMap — no API key required)
  useEffect(() => {
    if (!showMap || !mapContainerRef.current || !userLocation) return;

    let map: any = null;

    const loadMap = async () => {
      try {
        const L = (await import('leaflet')).default;

        // Load Leaflet CSS once
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Fix default marker icons (Leaflet webpack issue)
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        map = L.map(mapContainerRef.current!).setView(
          [userLocation.lat, userLocation.lng], 13
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // User location marker (blue)
        const blueIcon = L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: blueIcon })
          .addTo(map)
          .bindPopup('<strong>You are here</strong>');

        // Event markers (purple/brand)
        const eventIcon = L.divIcon({
          className: '',
          html: '<div style="width:12px;height:12px;border-radius:50%;background:#7c3aed;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        filteredEvents.forEach(event => {
          L.marker([event.lat, event.lng], { icon: eventIcon })
            .addTo(map)
            .bindPopup(`<strong>${event.title}</strong><br/>${event.time} · ${event.location}<br/>${event.price}`);
        });

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

  const allEvents = [...dbEvents, ...communityEvents];

  const filteredEvents = allEvents.filter(event => {
    const typeMatch = filter === 'all' || event.type.toLowerCase() === filter.toLowerCase();
    if (!typeMatch) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!event.title.toLowerCase().includes(q) && !event.location.toLowerCase().includes(q) && !(event.description || '').toLowerCase().includes(q)) return false;
    }
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

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
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          Events Near You
          {dbEvents.length > 0 && (
            <Badge variant="secondary" className="text-xs">{dbEvents.length} from your calendar</Badge>
          )}
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
                      {dbEvents.some(e => e.id === event.id) && (
                        <Badge className="text-xs gradient-primary text-white border-0">My Event</Badge>
                      )}
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
