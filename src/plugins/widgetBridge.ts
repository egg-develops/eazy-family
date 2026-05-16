import { registerPlugin } from '@capacitor/core';

interface WidgetBridgePlugin {
  saveToken(options: { accessToken: string; userId: string }): Promise<void>;
  clearToken(): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge', {
  // Web stub — no-op on non-native platforms
  web: {
    saveToken: async () => {},
    clearToken: async () => {},
  },
});

/** Call this after a successful Supabase login. */
export async function syncWidgetToken(accessToken: string, userId: string) {
  try {
    await WidgetBridge.saveToken({ accessToken, userId });
  } catch {
    // Non-native environment — silently ignore
  }
}

/** Call this on logout. */
export async function clearWidgetToken() {
  try {
    await WidgetBridge.clearToken();
  } catch {
    // Non-native environment — silently ignore
  }
}
