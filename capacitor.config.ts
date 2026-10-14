import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Registered iOS bundle ID; keep it in sync with Xcode and App Store Connect.
  appId: 'com.pocketplanet.game',
  appName: 'Comet Garden',
  webDir: 'dist',
  backgroundColor: '#0b0a24',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: '#0b0a24',
    // The third-party StoreKit listener finishes updates before a profile grant can be saved.
    // PurchaseJournalPlugin owns StoreKit on iOS. includePlugins excludes the installed
    // @capgo/native-purchases until the owner decides whether to remove that dependency.
    // Keep this allowlist when syncing; add any new native plugin here deliberately.
    // tests/privacy.test.ts guards src imports and the generated iOS Swift package.
    includePlugins: [
      '@capacitor-community/in-app-review',
      '@capacitor/app',
      '@capacitor/filesystem',
      '@capacitor/haptics',
      '@capacitor/local-notifications',
      '@capacitor/preferences',
      '@capacitor/share',
      '@capacitor/splash-screen',
      '@capacitor/status-bar',
    ],
  },
  plugins: {
    SplashScreen: { launchShowDuration: 600, launchAutoHide: true, backgroundColor: '#0b0a24', showSpinner: false },
    StatusBar: { style: 'DARK', overlaysWebView: true },
  },
};

export default config;
