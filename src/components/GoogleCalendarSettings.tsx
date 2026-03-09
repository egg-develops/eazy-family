import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const GoogleCalendarSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    integrations,
    loading,
    syncing,
    error,
    initiateOAuth,
    syncCalendar,
    disconnectCalendar,
  } = useGoogleCalendar();

  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const handleConnect = () => {
    try {
      initiateOAuth();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to initiate OAuth',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    try {
      await syncCalendar();
      toast({
        title: 'Success',
        description: 'Google Calendar synced successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to sync calendar',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      setDisconnecting(integrationId);
      await disconnectCalendar(integrationId);
      toast({
        title: 'Success',
        description: 'Google Calendar disconnected',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to disconnect',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(null);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-custom-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('settings.googleCalendar.title') || 'Google Calendar'}
          </CardTitle>
          <CardDescription>
            {t('settings.googleCalendar.description') || 'Connect your Google Calendar to sync events'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-custom-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t('settings.googleCalendar.title') || 'Google Calendar'}
        </CardTitle>
        <CardDescription>
          {t('settings.googleCalendar.description') || 'Connect your Google Calendar to sync events'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {integrations.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('settings.googleCalendar.notConnected') || 'No Google Calendar connected yet'}
            </p>
            <Button
              onClick={handleConnect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('settings.googleCalendar.connect') || 'Connect Google Calendar'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="p-4 border rounded-lg space-y-3 bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="font-medium text-sm">{integration.provider_account_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.googleCalendar.connected') || 'Connected'}{' '}
                      {integration.created_at &&
                        format(new Date(integration.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {t('settings.googleCalendar.active') || 'Active'}
                  </Badge>
                </div>

                {integration.last_synced_at && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.googleCalendar.lastSynced') || 'Last synced'}:{' '}
                    {format(new Date(integration.last_synced_at), 'MMM d, yyyy HH:mm')}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSync}
                    disabled={syncing}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {syncing ? (t('common.syncing') || 'Syncing') : (t('settings.googleCalendar.sync') || 'Sync')}
                  </Button>
                  <Button
                    onClick={() => handleDisconnect(integration.id)}
                    disabled={disconnecting === integration.id}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {disconnecting === integration.id
                      ? (t('common.disconnecting') || 'Disconnecting')
                      : (t('settings.googleCalendar.disconnect') || 'Disconnect')}
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={handleConnect}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('settings.googleCalendar.connectAnother') || 'Connect Another Calendar'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
