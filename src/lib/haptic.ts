// Haptic feedback via Web Vibration API (Android/supported browsers)
// iOS Safari does not expose vibration — silently ignored there

type HapticStyle = 'light' | 'medium' | 'success' | 'error' | 'tap';

const patterns: Record<HapticStyle, number | number[]> = {
  tap: 30,
  light: 50,
  medium: 80,
  success: [40, 60, 40],
  error: [80, 60, 80],
};

export const haptic = (style: HapticStyle = 'light') => {
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(patterns[style]);
  } catch {
    // Silently ignore if not supported
  }
};
