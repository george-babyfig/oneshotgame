# iPad compatibility check (1.0)

Comet Garden ships iPhone-only (`TARGETED_DEVICE_FAMILY = 1`). Apple still reviews iPhone apps on iPad, where they run in an iPhone-shaped window. This file records what has been checked there.

## 14 October 2026: simulator, launch-candidate build

- **Build:** commit `6030900` (launch polish waves 1-2), Debug, `xcodebuild` for the iPad (A16) simulator (iPadOS 26), installed with `simctl`.
- **Fresh install:** the app opens straight into planet 1. The HUD, coach card, planet, launcher and object row all fit the window, and nothing is clipped. Screenshot: [ipad/ipad-compat-planet1.jpg](ipad/ipad-compat-planet1.jpg).
- **Mid-game save (planet 45, seeded through Capacitor Preferences):** Home lays out like a 390-wide iPhone. The top bar, galaxy, Vault, Next Up, PLAY and the five tabs are all visible, and the tab bar clears the window's bottom edge. The iPadOS window controls sit in the status-bar strip and don't overlap the game. Screenshot: [ipad/ipad-compat-home.jpg](ipad/ipad-compat-home.jpg).
- **Not yet exercised on iPad** (these need taps; the simulator control is waiting for the owner's one-time permission, or use TestFlight on a real iPad):
  - Gate v2 and Grown-ups;
  - the StoreKit purchase and restore sheets;
  - the share sheet (postcards and photos, behind the gate);
  - Game Center;
  - rotating the iPad while a round is in progress;
  - resizing the window under iPadOS windowing.

The 320×568 and 390×844 browser matrix (Chromium and WebKit, 6 languages) covers the layouts this window uses.
