# IAP review image capture plan

Capture from the final release candidate after all M12 art and translations are present. Each file is a real Simulator capture of the gated Grown-ups product contents sheet; the current folder has no approved images yet.

1. Build the release candidate with the shared `App` Xcode scheme and `ios/App/PocketPlanet.storekit`. Boot an iPhone 15 Pro Max Simulator at 430 × 932 points, set app language to English (US), and install fresh.
2. Open Settings → Grown-ups. Read the three-digit word challenge, enter it on the shuffled keypad, and hold to continue. A fresh install has no PIN. The shop is available without completing a chapter.
3. For each product in `../catalogue-sheet.md`, tap its price. Pass the purchase gate and stop on the contents sheet **before** tapping Buy. Confirm the name, exact fixed contents, local price, sharing statement, and expiry/consumption statement. For Gem Piggy Bank, use a test save with at least one win so its saved gem count is nonzero.
4. Capture the full Simulator screen with Xcode → Debug → View Debugging → Take Screenshot (or `xcrun simctl io booted screenshot`). Save PNGs here named by the product ID suffix: `gems80.png`, `gems500.png`, `gems1200.png`, `gems2800.png`, `piggy.png`, `startercrew.png`, `road00.png`, `theme.tidepool.png`, `theme.cometcandy.png`, `pack.crystalfrost.png`, `style.nebula.png`, `style.firefly.png`.
5. Inspect each image at full resolution: legible text, no clipped line, one price, no child-side offer, and no purchase confirmation or Apple sheet. Re-capture whenever catalogue copy or art changes. Upload each PNG to its matching IAP review field in App Store Connect only after owner approval.
6. Record a fresh-install review path video: Settings → Grown-ups → pass gate → Shop → a contents sheet → Buy → receipt → Grown-ups → Styles. Show one delivered look. Capture extra clips for the other permanent products; for Cosmic Pass, show Road points unlocking a paid step and the item in Styles. Attach the path with the review notes in `../compliance.md`; do not show a PIN or personal Apple ID.

The release checklist records the 12/12 image audit and real StoreKit sandbox matrix. Simulator screenshots cannot prove a sandbox purchase, Ask to Buy, refund or Family Sharing restore; run those on the owner’s Apple setup.
