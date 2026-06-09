import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Opens a location in the device's maps app/site.
 * @param query A free-text address ("Aquatic Center") or coordinates ("47.37,8.54").
 *
 * iOS: window.open('_system') reliably launches the Apple Maps app.
 * Android: the WebView's window.open('_system') is unreliable across WebView
 *   versions, so we use @capacitor/browser (Custom Tab), which dependably opens
 *   Google Maps and offers to hand off to the native Maps app.
 */
export async function openInMaps(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const q = encodeURIComponent(trimmed);
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') {
    window.open(`https://maps.apple.com/?q=${q}`, '_system');
    return;
  }

  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;

  if (platform === 'android') {
    try {
      await Browser.open({ url: googleUrl });
    } catch {
      window.open(googleUrl, '_system');
    }
    return;
  }

  // Web
  window.open(googleUrl, '_blank');
}
