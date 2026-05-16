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
]);

let _userId: string | null = null;

export function setPreferenceUserId(userId: string | null) {
  _userId = userId;
}

/** Push all local SYNC_KEYS that are missing from the cloud record up to Supabase. */
async function uploadMissingLocalPrefs(userId: string, cloudKeys: Set<string>) {
  for (const key of SYNC_KEYS) {
    if (cloudKeys.has(key)) continue; // cloud already has this key — skip
    const local = localStorage.getItem(key);
    if (!local) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(local); } catch { parsed = local; }
    // Fire-and-forget per key
    supabase.rpc('upsert_preference', {
      p_user_id: userId,
      p_key: key,
      p_value: parsed as never,
    }).then(() => {/* silent */});
  }
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
    const cloudKeys = new Set(Object.keys(cloudData));
    const loadedKeys: string[] = [];

    // Cloud → localStorage (cloud wins, unless user explicitly changed the key
    // this session — in which case the local write is newer than the cloud copy)
    for (const [key, value] of Object.entries(cloudData)) {
      if (value !== null && value !== undefined) {
        if (sessionStorage.getItem('_local_' + key)) continue;
        const stored = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stored);
        loadedKeys.push(key);
      }
    }

    // localStorage → cloud (upload any local keys not yet in cloud)
    uploadMissingLocalPrefs(userId, cloudKeys);

    // Notify components so they re-read from localStorage
    if (loadedKeys.length > 0) {
      window.dispatchEvent(new CustomEvent('eazy-prefs-loaded', { detail: { keys: loadedKeys } }));
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
