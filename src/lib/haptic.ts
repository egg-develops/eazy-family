import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

type HapticStyle = 'light' | 'tap' | 'medium' | 'heavy' | 'capture' | 'success' | 'error';

export const haptic = async (style: HapticStyle = 'light') => {
  try {
    switch (style) {
      case 'tap':
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'capture':
        // Distinct double-pulse for opening EZ Capture
        await Haptics.impact({ style: ImpactStyle.Medium });
        await new Promise(r => setTimeout(r, 80));
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch {
    // Falls back gracefully on web — Capacitor stubs return resolved promises
  }
};
