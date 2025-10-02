import { useEffect } from "react";
import { CheckCircle, Star, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";

interface GamificationEvent {
  type: 'list_created' | 'event_added' | 'photo_shared' | 'streak' | 'milestone';
  title: string;
  points: number;
}

export const triggerGamification = (event: GamificationEvent) => {
  // Vibration feedback (if supported)
  if ('vibrate' in navigator) {
    navigator.vibrate([50, 30, 50]);
  }

  const icons = {
    list_created: CheckCircle,
    event_added: Star,
    photo_shared: Trophy,
    streak: Zap,
    milestone: Trophy,
  };

  const Icon = icons[event.type];

  toast.custom(
    (t) => (
      <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-4 shadow-lg animate-scale-in">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold">{event.title}</p>
            <p className="text-sm opacity-90">+{event.points} points</p>
          </div>
        </div>
      </div>
    ),
    {
      duration: 3000,
    }
  );

  // Update points in localStorage
  const currentPoints = parseInt(localStorage.getItem('eazy-family-points') || '0');
  localStorage.setItem('eazy-family-points', (currentPoints + event.points).toString());
};

export const useGamification = () => {
  return { triggerGamification };
};
