import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Cloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

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

export const WeatherWidget = ({ onRemove }: { onRemove: () => void }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  useEffect(() => {
    const savedLocations = localStorage.getItem('weather-locations');
    if (savedLocations) {
      const parsed = JSON.parse(savedLocations);
      setLocations(parsed);
      if (parsed.length > 0) {
        fetchWeather(parsed[0].lat, parsed[0].lon);
      }
    } else {
      detectLocation();
    }
  }, []);

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchLocationName(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Unable to detect location. Please add manually.");
          setLoading(false);
        }
      );
    } else {
      toast.error("Geolocation not supported");
      setLoading(false);
    }
  };

  const fetchLocationName = async (lat: number, lon: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: { lat, lon, type: 'reverse' }
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const location: WeatherLocation = {
          id: `${lat}-${lon}`,
          name: data[0].name,
          lat,
          lon
        };
        
        const newLocations = [location];
        setLocations(newLocations);
        localStorage.setItem('weather-locations', JSON.stringify(newLocations));
        fetchWeather(lat, lon);
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      toast.error("Error loading weather data");
      setLoading(false);
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: { lat, lon }
      });

      if (error) throw error;
      
      if (data.main) {
        setWeatherData({
          temp: Math.round(data.main.temp),
          description: data.weather[0].description,
          icon: getWeatherEmoji(data.weather[0].main),
          humidity: data.main.humidity,
          windSpeed: data.wind.speed
        });
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      toast.error("Error loading weather data");
    } finally {
      setLoading(false);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsAddingLocation(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: { query: searchQuery, type: 'search' }
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const location: WeatherLocation = {
          id: `${data[0].lat}-${data[0].lon}`,
          name: data[0].name,
          lat: data[0].lat,
          lon: data[0].lon
        };
        
        const newLocations = [...locations, location];
        setLocations(newLocations);
        localStorage.setItem('weather-locations', JSON.stringify(newLocations));
        setSearchQuery("");
        toast.success(`Added ${location.name}`);
      } else {
        toast.error("Location not found");
      }
    } catch (error) {
      console.error("Error searching location:", error);
      toast.error("Error searching location");
    } finally {
      setIsAddingLocation(false);
    }
  };

  const removeLocation = (id: string) => {
    const newLocations = locations.filter(loc => loc.id !== id);
    setLocations(newLocations);
    localStorage.setItem('weather-locations', JSON.stringify(newLocations));
    
    if (newLocations.length === 0) {
      setWeatherData(null);
      detectLocation();
    } else if (currentLocationIndex >= newLocations.length) {
      setCurrentLocationIndex(0);
      fetchWeather(newLocations[0].lat, newLocations[0].lon);
    }
  };

  const switchLocation = (index: number) => {
    setCurrentLocationIndex(index);
    fetchWeather(locations[index].lat, locations[index].lon);
  };

  const getWeatherEmoji = (condition: string) => {
    const conditions: Record<string, string> = {
      Clear: "☀️",
      Clouds: "☁️",
      Rain: "🌧️",
      Drizzle: "🌦️",
      Thunderstorm: "⛈️",
      Snow: "❄️",
      Mist: "🌫️",
      Fog: "🌫️",
      Haze: "🌫️"
    };
    return conditions[condition] || "🌤️";
  };

  if (loading && !weatherData) {
    return (
      <Card className="p-6 shadow-custom-md gradient-cool relative overflow-hidden">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Cloud className="w-8 h-8" />
            <div>
              <h3 className="font-semibold text-lg">{t('home.weather')}</h3>
              <p className="text-sm opacity-90">Loading...</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const currentLocation = locations[currentLocationIndex];

  return (
    <Card className="p-6 shadow-custom-md gradient-cool relative overflow-hidden">
      <button 
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors z-10"
        aria-label="Remove weather"
      >
        ×
      </button>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-semibold text-lg">{t('home.weather')}</h3>
            </div>
            {currentLocation && (
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                <p className="text-sm opacity-90">{currentLocation.name}</p>
              </div>
            )}
            {weatherData && (
              <>
                <h3 className="text-4xl font-bold">{weatherData.temp}°C</h3>
                <p className="text-sm opacity-90 capitalize">{weatherData.description}</p>
              </>
            )}
          </div>
          {weatherData && (
            <div className="text-3xl">{weatherData.icon}</div>
          )}
        </div>

        {locations.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {locations.map((loc, index) => (
              <div key={loc.id} className="relative group">
                <Button
                  variant={index === currentLocationIndex ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => switchLocation(index)}
                  className="text-white hover:bg-white/20 whitespace-nowrap"
                >
                  {loc.name}
                </Button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLocation(loc.id);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 gap-2"
            >
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
