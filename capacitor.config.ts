import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eazy.family.app',
  appName: 'Eazy Family',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    WidgetBridge: {},
  },
};

export default config;
