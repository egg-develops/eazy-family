import { useState, useEffect } from "react";
import { cloudSet } from "@/lib/preferencesSync";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Cloud, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { error as logError } from "@/lib/logger";

interface WeatherLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

// Uses wttr.in — free, no API key required
const fetchWttr = async (query: string): Promise<WeatherData> => {
  const res = await fetch(`https://wttr.in/${encodeURIComponent(query)}?format=j1`);
  if (!res.ok) throw new Error("Weather service unavailable");
  const data = await res.json();
  const current = data.current_condition?.[0];
  if (!current) throw new Error("No weather data");
  return {
    temp: Math.round(parseFloat(current.temp_C)),
    description: current.weatherDesc?.[0]?.value || "",
    icon: getWeatherEmoji(parseInt(current.weatherCode, 10)),
    humidity: parseInt(current.humidity, 10),
    windSpeed: Math.round(parseFloat(current.windspeedKmph)),
  };
};

const getWeatherEmoji = (code: number): string => {
  if (code === 113) return "☀️";
  if (code === 116) return "⛅";
  if ([119, 122].includes(code)) return "☁️";
  if ([143, 248, 260].includes(code)) return "🌫️";
  if ([176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(code)) return "🌧️";
  if ([179, 182, 311, 314, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return "❄️";
  if ([200, 386, 389, 392, 395].includes(code)) return "⛈️";
  return "🌤️";
};

export const WeatherWidget = ({ onRemove }: { onRemove: () => void }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('weather-locations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocations(parsed);
          fetchWeather(parsed[0]);
          return;
        }
      } catch { /* fall through */ }
    }
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!("geolocation" in navigator)) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const location: WeatherLocation = {
          id: `${latitude}-${longitude}`,
          name: "Your location",
          lat: latitude,
          lon: longitude,
        };
        // Reverse-geocode with wttr.in naming
        fetch(`https://wttr.in/${latitude},${longitude}?format=j1`)
          .then(r => r.json())
          .then(data => {
            const area = data.nearest_area?.[0];
            if (area) {
              location.name = area.areaName?.[0]?.value || area.region?.[0]?.value || "Your location";
            }
          })
          .catch(() => {})
          .finally(() => {
            const locs = [location];
            setLocations(locs);
            cloudSet('weather-locations', JSON.stringify(locs));
            fetchWeather(location);
            setIsDetecting(false);
          });
      },
      (err) => {
        logError("Geolocation error:", err);
        setIsDetecting(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const fetchWeather = async (location: WeatherLocation) => {
    setLoading(true);
    try {
      const data = await fetchWttr(`${location.lat},${location.lon}`);
      setWeatherData(data);
    } catch (err) {
      logError("Weather fetch error:", err);
      toast.error("Couldn't load weather. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsAddingLocation(true);
    try {
      // Validate city exists by fetching weather
      const data = await fetchWttr(searchQuery.trim());
      const location: WeatherLocation = {
        id: searchQuery.trim().toLowerCase(),
        name: searchQuery.trim(),
        lat: 0,
        lon: 0,
      };
      const newLocations = [...locations.filter(l => l.id !== location.id), location];
      setLocations(newLocations);
      cloudSet('weather-locations', JSON.stringify(newLocations));
      setWeatherData(data);
      setCurrentLocationIndex(newLocations.length - 1);
      setSearchQuery("");
      toast.success(`Added ${location.name}`);
    } catch (err) {
      logError("Search location error:", err);
      toast.error("City not found. Try a different name.");
    } finally {
      setIsAddingLocation(false);
    }
  };

  // For text-search locations we query by name; for coord locations by coords
  const fetchWeatherForIndex = async (index: number, locs: WeatherLocation[]) => {
    const loc = locs[index];
    setLoading(true);
    try {
      const query = loc.lat !== 0 ? `${loc.lat},${loc.lon}` : loc.name;
      const data = await fetchWttr(query);
      setWeatherData(data);
    } catch {
      toast.error("Couldn't load weather for this location.");
    } finally {
      setLoading(false);
    }
  };

  const switchLocation = (index: number) => {
    setCurrentLocationIndex(index);
    fetchWeatherForIndex(index, locations);
  };

  const removeLocation = (id: string) => {
    const newLocations = locations.filter(l => l.id !== id);
    setLocations(newLocations);
    cloudSet('weather-locations', JSON.stringify(newLocations));
    if (newLocations.length === 0) {
      setWeatherData(null);
    } else {
      const newIndex = Math.min(currentLocationIndex, newLocations.length - 1);
      setCurrentLocationIndex(newIndex);
      fetchWeatherForIndex(newIndex, newLocations);
    }
  };

  const currentLocation = locations[currentLocationIndex];

  // No saved locations — show city search as primary UI
  if (locations.length === 0) {
    return (
      <Card className="p-6 shadow-custom-md border-2 border-cyan-500/30 relative overflow-hidden">
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors z-10"
          aria-label="Remove weather"
        >×</button>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-cyan-500" />
            <h3 className="font-semibold text-lg">{t('home.weather')}</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter city name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchLocation()}
              autoFocus
            />
            <Button onClick={searchLocation} disabled={isAddingLocation}>
              {isAddingLocation ? "..." : "Go"}
            </Button>
          </div>
          {isDetecting && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Detecting your location...
            </p>
          )}
        </div>
      </Card>
    );
  }

  if (loading && !weatherData) {
    return (
      <Card className="p-6 shadow-custom-md border-2 border-cyan-500/30 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <Cloud className="w-8 h-8 text-cyan-500" />
          <div>
            <h3 className="font-semibold text-lg">{t('home.weather')}</h3>
            <p className="text-sm opacity-70">Loading...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-custom-md border-2 border-cyan-500/30 relative overflow-hidden">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors z-10"
        aria-label="Remove weather"
      >×</button>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 text-cyan-500 flex-shrink-0" />
              <h3 className="font-semibold text-lg">{t('home.weather')}</h3>
            </div>
            {currentLocation && (
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                <p className="text-sm opacity-70">{currentLocation.name}</p>
              </div>
            )}
            {weatherData && (
              <>
                <h3 className="text-4xl font-bold">{weatherData.temp}°C</h3>
                <p className="text-sm opacity-70 capitalize">{weatherData.description}</p>
              </>
            )}
          </div>
          {weatherData && <div className="text-3xl">{weatherData.icon}</div>}
        </div>

        {locations.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {locations.map((loc, index) => (
              <div key={loc.id} className="relative group">
                <Button
                  variant={index === currentLocationIndex ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => switchLocation(index)}
                  className="whitespace-nowrap"
                >
                  {loc.name}
                </Button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeLocation(loc.id); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs"
                  aria-label={`Remove ${loc.name}`}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="hover:bg-muted gap-2">
              <Cloud className="w-4 h-4" />
              {t('home.addLocation')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('home.addLocation')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter city name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                />
                <Button onClick={searchLocation} disabled={isAddingLocation}>
                  {isAddingLocation ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};
