import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Change to your own reverse-DNS bundle id before shipping (must match App Store Connect).
  appId: 'com.pocketplanet.game',
  appName: 'Pocket Planet',
  webDir: 'dist',
  backgroundColor: '#0b0a24',
  ios: { contentInset: 'never', scrollEnabled: false, backgroundColor: '#0b0a24' },
  plugins: {
    SplashScreen: { launchShowDuration: 600, launchAutoHide: true, backgroundColor: '#0b0a24', showSpinner: false },
    StatusBar: { style: 'DARK', overlaysWebView: true },
  },
};

export default config;
