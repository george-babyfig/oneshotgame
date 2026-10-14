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

## M13 dormant wide layout (14 October 2026)

Decision 78 keeps `TARGETED_DEVICE_FAMILY = 1`. No device-family or entitlement change is part of this layout pass. The browser shell toggles `body.wide` when **both** viewport dimensions are at least 700 px, including on resize. Standard screens stay centred at 520 px; Homeworld uses 58% of the two-column space for its canvas and 42% for the scrollable panel.

The round uses `logicalViewport`: phone dimensions through 430×932 pass through unchanged; larger windows cap each axis to 430×932 and scale the canvas and HUD together in CSS. Input, popup exclusion zones and banner placement use logical coordinates. Round geometry and flight physics never receive the tablet dimensions. Existing level/rules/flight snapshots must remain unchanged.

Automated coverage:

- `tests/ipad.test.ts`: all four phone sizes, both tablet sizes, the 700×700 boundary, frame-to-phone resize and the iPhone-only native device family.
- `e2e/ipad.spec.ts`: 820×1180 and 1024×1366 in Chromium and WebKit; centred Home, Homeworld canvas/panel separation, Trip sheet, 44 px visible targets, round/HUD bounds, actual pointer input through the scale, and resizing back to 390×844.
- Tablet projects match **only** `ipad.spec.ts`; phone projects exclude it. PR runs English `webkit-820x1180`. Nightly runs both sizes and engines in all six shipped languages.

**Package B checks:** the eight iPad unit cases pass, the fifteen existing level/rules/flight snapshot cases pass without fixture changes, and `sim:quick` passes all five checks (107.17 s). Typecheck and the separately compiled iPad spec/config pass. The Trip glossary translation gate remains red until the lead finishes consistent Trip wording in the five locale dictionaries, including the pre-M13 welcome letter’s generic “trip”.

**Verification status:** the browser spec is authored but not run in the package sandbox (the lead runs Playwright). This is not simulator qualification. Before submission, re-check the M13 build on iPad mini, iPad Air 11-inch and iPad Pro 13-inch in iPhone compatibility mode, record build/OS identifiers and screenshots, and exercise rotation/window resizing, Trip postcard sharing through Gate v2, VoiceOver and Reduce Motion. The earlier launch-candidate evidence above remains the only native iPad check recorded here.

## 14 October 2026: after M13, three iPad simulators

- **Build:** the M13 tree (trips, friend Wishes, dormant iCloud backup, dormant wide layout). `npm run build`, `cap sync`, a Debug build, installed with `simctl` on iPad (A16), iPad mini (A17 Pro) and iPad Pro 13-inch (M5), all on iPadOS 26.
- **Fresh install:** planet 1 opens in the iPhone-shaped window on every iPad. The round keeps phone geometry: the 430×932 logical frame applies only to windows 700×700 or larger, and the compatibility window is smaller than that. Screenshot: [ipad/m13-ipad-pro13-planet1.jpg](ipad/m13-ipad-pro13-planet1.jpg).
- **A seeded planet-45 save from 1.0 (v6):** it migrates to v7 on launch and shows the long-absence "While you were away" card with visitor gifts. Collect all and Back are fully visible. Screenshots: [ipad/m13-ipad-mini-away.jpg](ipad/m13-ipad-mini-away.jpg), [ipad/m13-ipad-pro13-away.jpg](ipad/m13-ipad-pro13-away.jpg).
- **The dormant wide layout itself** (820×1180 and 1024×1366, Chromium and WebKit): checked by `e2e/ipad.spec.ts` in the browser matrix, which passes.
- **Still to tap through on iPad:** the gate, purchase, share and Game Center sheets, as listed above.
