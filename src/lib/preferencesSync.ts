import { supabase } from "@/integrations/supabase/client";

// Keys that sync to Supabase and are restored on login from any device
const SYNC_KEYS = new Set([
  'eazy-family-home-config',
  'theme',
  'eazy-family-language',
  'eazy-family-color-scheme',
  'eazy-family-custom-color',
  'weather-locations',
  'eazy-google-calendar-events',
  'eazy-google-calendar-synced',
  'eazy-outlook-calendar-events',
  'eazy-outlook-calendar-synced',
  'eazy-family-calendar-items',
  'eazy-family-points',
  'eazy-morning-digest',
  'eazy-morning-digest-email',
  'eazy-family-channel-messages',
]);

let _userId: string | null = null;

export function setPreferenceUserId(userId: string | null) {
  _userId = userId;
}

/** Load all cloud preferences and hydrate localStorage. Call once after login. */
export async function loadCloudPreferences(userId: string) {
  setPreferenceUserId(userId);
  try {
    const { data } = await supabase
      .from('user_preferences')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    const cloudData = (data?.data ?? {}) as Record<string, unknown>;
    const loadedKeys: string[] = [];

    // Cloud → localStorage only. Never push local state up — that happens
    // explicitly via cloudSet() when the user makes a change.
    for (const [key, value] of Object.entries(cloudData)) {
      if (value !== null && value !== undefined) {
        if (sessionStorage.getItem('_local_' + key)) continue;
        const stored = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stored);
        loadedKeys.push(key);
      }
    }

    // Notify components so they re-read from localStorage
    if (loadedKeys.length > 0) {
      window.dispatchEvent(new CustomEvent('eazy-prefs-loaded', { detail: { keys: loadedKeys } }));
      if (loadedKeys.includes('eazy-family-home-config')) {
        window.dispatchEvent(new CustomEvent('eazy-home-config-updated'));
      }
    }
  } catch {
    // Non-fatal — app works with local values
  }
}

/** Clear all synced keys from localStorage. Call on sign-out to prevent cross-account contamination. */
export function clearLocalPreferences() {
  for (const key of SYNC_KEYS) {
    localStorage.removeItem(key);
    try { sessionStorage.removeItem('_local_' + key); } catch {}
  }
}

/** Write to localStorage immediately and sync to Supabase in the background. */
export function cloudSet(key: string, value: string) {
  localStorage.setItem(key, value);
  // Mark as locally-modified this session so loadCloudPreferences doesn't
  // overwrite with stale cloud data if the Supabase write hasn't committed yet.
  try { sessionStorage.setItem('_local_' + key, '1'); } catch {}
  if (!_userId || !SYNC_KEYS.has(key)) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value;
  }

  supabase.rpc('upsert_preference', {
    p_user_id: _userId,
    p_key: key,
    p_value: parsed as never,
  }).then(() => {/* silent */});
}
