// Writes the Supabase token to localStorage under a well-known key.
// AppDelegate reads this key from the WKWebView and syncs to App Group UserDefaults.

const TOKEN_KEY = 'eazy_widget_token';
const USER_KEY  = 'eazy_widget_user';

export function syncWidgetToken(accessToken: string, userId: string) {
  try {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, userId);
  } catch {
    // Private browsing or storage unavailable
  }
}

export function clearWidgetToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}
