import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Registered iOS bundle ID; keep it in sync with Xcode and App Store Connect.
  appId: 'com.pocketplanet.game',
  appName: 'Comet Garden',
  webDir: 'dist',
  backgroundColor: '#0b0a24',
  ios: { contentInset: 'never', scrollEnabled: false, backgroundColor: '#0b0a24' },
  plugins: {
    SplashScreen: { launchShowDuration: 600, launchAutoHide: true, backgroundColor: '#0b0a24', showSpinner: false },
    StatusBar: { style: 'DARK', overlaysWebView: true },
  },
};

export default config;
