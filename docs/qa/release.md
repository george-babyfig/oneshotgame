# iOS release checklist

Run this for each release candidate. The native floor is iOS 15.4 and the bundle ID is `com.pocketplanet.game`. An owner with an Apple Developer account must complete signing, App Store Connect, TestFlight, and submission.

## Prepare the candidate

- [ ] Confirm CI and nightly are green, including typecheck, unit tests, `npm run sim:quick`, level lint and runway pre-flight, economy and loadout sims, web journeys, and the native Simulator build.
- [ ] Run J1–J7 at 320×568, 375×667, 390×844, and 430×932 in Chromium and WebKit, in en, es, fr, de, pt-BR, ja, plus pseudo. Check clipping, 44 px tap targets, errors, and overlay count.
- [ ] Check a saved profile from every prior version loads without loss. Run the Scene Bot planets 1–30 and a 50-planet frame time and memory soak.
- [ ] Freeze `package.json` version. The in-app `VERSION` in `src/meta/tuning.ts` must come from that value, and `ios:release` writes it into both Xcode `MARKETING_VERSION` settings.
- [ ] Commit all source changes. Run `npm run ios:release` from a clean tree. It runs `npm ci`, typecheck and Vite build, `cap sync ios`, rejects tester/developer hooks in the copied web bundle, and increments both `CURRENT_PROJECT_VERSION` settings. Review and commit the generated build-number change.
- [ ] Run the printed Release archive command with the signing Team selected. In Xcode Organizer, generate the Privacy Report. Review the app and linked SDK declarations; the app manifest must still list only UserDefaults/CA92.1 and FileTimestamp/C617.1, with no collected data or tracking. A changed manifest needs a fresh privacy review and hash update.
- [ ] Inspect `ios/App/App/public` for the current release assets. Confirm its timestamp and version, and run `sips -g hasAlpha` on the 1024 px App Store icon; it must say `no`.

## Native and human QA

- [ ] On the oldest available iPhone running iOS 15.4 or later (ideally 6s or SE 1st gen) and a current iPhone, test the full first session, save/relaunch, sound and silent switch, haptics, Low Power Mode, airplane mode, VoiceOver smoke, Reduce Motion, larger text, and colour filters.
- [ ] On Simulator SE 3, 13 mini, Pro Max, and iPad compatibility mode, inspect layout and loading. Check iOS 15.4, 17, and the current iOS version when devices are available.
- [ ] In de and ja, launch on a fresh install with the iOS app language set explicitly. Confirm the first screen and parental gate use that language. In a development build, check `Capacitor.isPluginAvailable('GameCenter')` in the WKWebView console; it must be `true`. Sign in using a sandbox Game Center account and check the gated dashboard and achievements.
- [ ] Check `Capacitor.isPluginAvailable('PurchaseJournal')` is `true` and `Capacitor.isPluginAvailable('NativePurchases')` is `false` in the built iOS app. The app-local journal must be the only StoreKit update listener; `npx cap ls ios` should list the nine other Capacitor plugins and exclude `@capgo/native-purchases`.
- [ ] Gate → share a postcard → Save Image; verify Photos receives it and no usage-description crash occurs.
- [ ] Compare all 12 rows of `store/catalogue-sheet.md` with code, StoreKit and `store/compliance.md`: permanent ID, type, USD tier, Family Sharing, fixed contents and six names/descriptions. Verify all 12 product pages have the correct local StoreKit price and contents; each of the three Theme/Pack Wish samplers remains free, and gem singles cost 60–300 gems without a real-money link.
- [ ] In Xcode's shared `App` scheme, use `PocketPlanet.storekit` for Simulator StoreKit tests. On sandbox devices, cover every product's success, cancel, Ask to Buy pending/approved/declined, interrupted purchase, network loss, Screen Time “Don't Allow”, restore after reinstall, Family Sharing restore on a second Apple ID, replayed transactions granting once, and airplane-mode launch after purchase. Check explicit revocation removes only the corresponding looks quietly, preserves spent currency and other earned value, and suppresses new announcements for seven days. Record results and screenshots.
- [ ] In **both** Xcode StoreKit testing and the Apple sandbox, request a gem pack with Ask to Buy, close the app, approve it, then cold launch. Verify the gems appear exactly once and the native PurchaseJournal queue drains after the profile save.
- [ ] In **both** Xcode StoreKit testing and the Apple sandbox, kill the app between payment and the gem grant, then cold launch. Verify one credit, no second credit on another launch, and an empty journal after acknowledgement. Repeat with a non-consumable look. Test a refund then re-buy and Family Sharing revoke then restore while Aurora or Cosmic is equipped; the look must remain equipped whenever a valid entitlement remains.
- [ ] Run a 48-hour TestFlight soak with at least five adult testers; collect only consented on-device tester codes. Resolve all S0 and S1 issues before submission.

## Store and submission

- [ ] Owner: Apple Developer Team, bundle ID with Game Center, Paid Applications Agreement, tax and banking, app record, contact, and hosted Support/Privacy/Marketing URLs are ready. Decide EU trader status and storefront availability.
- [ ] Review the six native Photos permission strings with native speakers. Check the in-app privacy policy, age rating, “Data Not Collected” answers, and Accessibility Nutrition Labels.
- [ ] Obtain owner approval of `store/catalogue-sheet.md` before creating any permanent App Store Connect objects. Capture 12/12 real review images by `store/iap-review/README.md`, compare them with the sheet, upload each to its IAP, and attach all twelve to the app submission. Record the fresh-install path through the parental gate to the Grown-ups shop as a review video. State that the keypad is shuffled, a wrong answer pauses 30 seconds, no PIN exists on fresh install, sandbox is used for review, and the app is iPhone-only.
- [ ] Re-capture current Homeworld, Road, Styles and Grown-ups UI screenshots and the App Preview after the M12 freeze. Retire every Ring, residents and Launch Tower image from the older sets. Check listings, screenshots, product names, prices, event text and review notes in all six languages with native reviewers. Confirm the age-rating questionnaire says **Contests: None** because Game Center 1.0 has achievements only; record Apple's previewed rating.
- [ ] Distribute the signed archive to TestFlight, complete the soak, then submit with manual release and phased release enabled. Record the tag, commit, version, build number, archive path, TestFlight build, and review outcome.
- [ ] For rollback, pause the phased release; prepare a hotfix archive and request expedited review if needed. Remove from sale only if the issue cannot be contained. Check Xcode Organizer crashes weekly after launch.
