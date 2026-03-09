import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const GoogleCalendarCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { handleOAuthCallback } = useGoogleCalendar();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(error === 'access_denied' ? 'Access denied' : error);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        await handleOAuthCallback(code);
        
        toast({
          title: 'Success',
          description: 'Google Calendar connected successfully',
        });

        // Redirect to settings page
        navigate('/app/settings?tab=integrations', { replace: true });
      } catch (err) {
        console.error('Error processing OAuth callback:', err);
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to connect Google Calendar',
          variant: 'destructive',
        });
        navigate('/app/settings', { replace: true });
      } finally {
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate, toast]);

  if (!processing) {
    navigate('/app/settings', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <LoadingSpinner />
        <h1 className="text-xl font-semibold">{t('common.connecting') || 'Connecting...'}</h1>
        <p className="text-sm text-muted-foreground">
          {t('settings.googleCalendar.connecting') || 'Connecting your Google Calendar'}
        </p>
      </Card>
    </div>
  );
};
