import { useTranslation } from 'react-i18next';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SyncedCalendarEventsDisplayProps {
  className?: string;
}

export const SyncedCalendarEventsDisplay = ({ className }: SyncedCalendarEventsDisplayProps) => {
  const { t } = useTranslation();
  const { syncedEvents, loading, error } = useGoogleCalendar();

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </Card>
    );
  }

  if (syncedEvents.length === 0) {
    return null;
  }

  // Get upcoming synced events (next 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const upcomingSyncedEvents = syncedEvents
    .filter(event => {
      const eventStart = new Date(event.start_date);
      return eventStart >= now && eventStart <= sevenDaysFromNow;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5);

  if (upcomingSyncedEvents.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold">{t('calendar.syncedEvents') || 'Synced Google Calendar Events'}</h3>
      </div>
      <div className="space-y-2">
        {upcomingSyncedEvents.map((event) => (
          <Card key={event.id} className="p-3 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    Google Calendar
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {event.all_day
                      ? format(new Date(event.start_date), 'MMM d')
                      : format(new Date(event.start_date), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: event.color || 'hsl(220 70% 50%)' }}
              />
            </div>
            {event.location && (
              <p className="text-xs text-muted-foreground mt-2">{event.location}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
