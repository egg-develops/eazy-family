import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export async function registerPushToken(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  let perm;
  try {
    perm = await PushNotifications.requestPermissions();
  } catch {
    return false;
  }
  if (perm.receive !== 'granted') return false;

  try {
    await PushNotifications.register();
  } catch {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), 12000);
    const done = (val: boolean) => { clearTimeout(timeoutId); resolve(val); };

    PushNotifications.addListener('registration', async (token) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { done(false); return; }
        const platform = Capacitor.getPlatform() as 'ios' | 'android';
        await supabase.from('push_tokens').upsert(
          { user_id: user.id, token: token.value, platform, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,platform' }
        );
        done(true);
      } catch {
        done(false);
      }
    }).catch(() => done(false));

    PushNotifications.addListener('registrationError', () => {
      done(false);
    }).catch(() => done(false));
  });
}
