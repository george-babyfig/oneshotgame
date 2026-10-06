# Launch gap report: Comet Garden (com.pocketplanet.game), 5 Oct 2026

I re-checked every surprising claim from the five audits against the repo, read-only. I confirmed these with my own commands: `Info.plist`, `PrivacyInfo.xcprivacy`, the SceneDelegate/MainViewController/storyboard chain and its git history, the icon's alpha channel (`sips`), the missing `store/iap-review/`, `docs/compliance.md`, `docs/qa/release.md` and `e2e/j4*`, the iOS-15.4-only APIs, the save-load fallback, the shop lock, the IAP price mismatch, the Game Center toggle, haptics, purchase reconcile, the CI iOS job, the npm scripts and the site placeholders.

Where auditors disagreed, I settled it from the files:

- Auditor 3 said the Family-Sharing flags in `compliance.md` agree with the code. They don't: the file has no Family Sharing column, and Cosmic Pass has the wrong price.
- Severity changes, explained in §2: the in-app privacy policy, Game Center registration, IAP screenshots and icon alpha move up to BLOCKER. EU trader status moves down to HIGH, because it blocks only EU storefronts.

---

## 1. Verdict

**Comet Garden can't be submitted today, but the gap is short and mostly mechanical.** The kid-safety and privacy base is unusually solid and enforced by tests:

- no network code (`tests/privacy.test.ts:84-138`)
- gated outbound actions (`tests/policy.test.ts:182-223`)
- StoreKit 2 with Ask to Buy and Restore (`src/meta/iap.ts:64-68`, `src/ui/screens/grownups.ts:192`)
- saves with a backup copy and a read-only fallback (`src/meta/profile.ts:556-597`)

**The native iOS shell has never run on a device or been archived, and it carries four defects no test catches:**

1. "Save Image" from the share sheet crashes the app.
2. The privacy manifest is missing the FileTimestamp reason that the Filesystem plugin needs, so the upload would be refused.
3. The Game Center plugin has never been registered, because `SceneDelegate` bypasses `MainViewController`.
4. The App Store icon has an alpha channel.

**App Review also needs:**

- an in-app privacy policy
- IAP review screenshots
- a fast path to the IAPs (today about 15 minutes of play)

**The owner side is at zero:** no developer account, no Paid Apps Agreement, no hosted Support/Privacy URLs, no legal name.

By decision 10 the launch scope also includes M10 (in progress), M10.5, M11, M11.5, M12 and the decision-29 generator fix: about 14 team-weeks at the roadmap's sizes. For scale, M0-M9 total about 30 nominal team-weeks and were committed between 27 Sep and 1 Oct (`git log` dates). **The real critical path is the owner's lead times, not code:** enrolment, agreements, trademark, kid playtests, native translation review, the TestFlight soak and App Review.

**Recommendation:** the studio spends about 2-3 days now on the STUDIO blockers plus the iOS-15 fix, so the first TestFlight build is reviewable. The owner enrols this week.

---

## 2. BLOCKERS (submission refused or likely rejection)

### STUDIO

**B1. Tapping "Save Image" on a shared picture crashes the app.**

- Evidence:
  - `src/ui/postcard.ts:85-90` writes a PNG and calls `Share.share({ files: [file.uri] })`. iOS then offers "Save Image", which needs `NSPhotoLibraryAddUsageDescription`.
  - `ios/App/App/Info.plist:1-71` has no usage-description keys at all.
  - The review notes point the reviewer at sharing (`store/compliance.md:58`), so a crash during review is a 2.1 rejection.
- Fix:
  - Add `NSPhotoLibraryAddUsageDescription` ("Saves your Comet Garden picture to Photos.").
  - Translate it in `en/es/fr/de/pt-BR/ja.lproj/InfoPlist.strings` (the same folders B-H2 needs).
  - Test in the Simulator: gate → share → Save Image, no crash. Add-only photo access doesn't change "Data Not Collected".
- Size: S.

**B2. The privacy manifest is missing the FileTimestamp reason, so the upload would be refused (ITMS-91053).**

- Evidence:
  - `ios/App/App/PrivacyInfo.xcprivacy:11-21` declares only UserDefaults/CA92.1.
  - `node_modules/@capacitor/filesystem/README.md:20` requires `NSPrivacyAccessedAPICategoryFileTimestamp` with reason C617.1.
  - The plugin is linked (`ios/App/CapApp-SPM/Package.swift:17,34`) and used (`postcard.ts:85`).
  - `store/compliance.md:35` wrongly says the manifest "matches".
- Fix:
  - Add the entry and update `PRIVACY_MANIFEST_SHA256` (`tests/privacy.test.ts:44`) with a privacy-review note.
  - After the first archive, run Xcode Organizer → Generate Privacy Report.
- Size: S.

**B3. The Game Center plugin has never been registered on iOS, so the visible "Game Center: sign in" button always fails.**

- Evidence:
  - `ios/App/App/SceneDelegate.swift:11` sets `rootViewController = CAPBridgeViewController()`.
  - Only `MainViewController.capacitorDidLoad` registers `GameCenterPlugin` (`ios/App/App/MainViewController.swift:4-7`). The storyboard names it (`Base.lproj/Main.storyboard:14`), but SceneDelegate replaces the window.
  - Capacitor auto-registers only `packageClassList` (`node_modules/@capacitor/ios/Capacitor/Capacitor/CapacitorBridge.swift:323-340`), and GameCenterPlugin isn't in it (`ios/App/App/capacitor.config.json`).
  - Git history: SceneDelegate came in `e33cb30`, MainViewController in `1313a8e`, so this has never worked on a device.
  - The button shows on every iOS device (`src/ui/gamecenter.ts:16`, `available()` is a platform check). After the gate it shows "Game Center didn't sign in…" (`src/ui/flows/settings.ts:224-230`).
  - The review notes tell the reviewer the feature exists (`compliance.md:58`), so this is a 2.1 rejection.
- Fix:
  - Change `SceneDelegate.swift:11` to `MainViewController()`.
  - Check in the Simulator with a sandbox Game Center account.
  - Add a dev-build check of `Capacitor.isPluginAvailable('GameCenter')`.
  - Correct `store/gamecenter.md:3`.
- Size: S.

**B4. The app has no privacy policy inside it (Guideline 5.1.1(i): the policy must also be reachable in the app).**

- Evidence:
  - `src/locales/_keys.json` has no "privacy" or "policy" string (grep).
  - The only privacy text is a one-line footer (`settings.ts:143`).
  - Grown-ups Help has no policy and no contact (`grownups.ts:195-200`).
- Fix:
  - Add a "Privacy" block to Grown-ups → Help: the short policy in 6 languages, the support email and the policy URL as plain text, so nothing links out.
  - Add a policy test.
- Size: S.

**B5. The App Store icon has an alpha channel (upload validation ITMS-90717).**

- Evidence: `AppIcon.appiconset/AppIcon-512@2x.png` is 1024² RGBA and `sips` reports `hasAlpha: yes`. The source is `resources/render-art.cjs:131-134` (`toDataURL`).
- Fix: flatten to RGB in `render-art.cjs` and regenerate. Every pixel is already opaque, so it looks identical.
- Size: S.

**B6. The IAP review screenshots don't exist.**

- Evidence: `compliance.md:40` and `APP_STORE_CONNECT.md:44` require them; `store/iap-review/` doesn't exist (`ls`). An IAP can't leave "Missing Metadata" without one.
- Fix: capture the gated Grown-ups shop per product in the Simulator into `store/iap-review/`. Re-shoot after M12 adds products.
- Size: S.

**B7. App Review must play about 15 minutes to reach the IAPs. "Unable to locate the in-app purchases" is a common 2.1 rejection.**

- Evidence:
  - `src/ui/screens/shop.ts:20-26` locks the shop until `p.chapters.length`.
  - `compliance.md:62` asks the reviewer to finish planets 1-10.
  - The charter in ROADMAP §6.4 (line ~688) only forbids offers "in the first session or before planet 5", and the Grown-ups shop is something a parent opens on purpose, not an offer pushed at the child.
- Fix (STUDIO + OWNER decision):
  - Recommended: open the Grown-ups shop from first launch, behind the gate, while keeping every kid-side rule in §6.4.
  - In every case: record a Simulator video of the path to attach in App Review Information, and rewrite the notes (`compliance.md:54-64`). The notes should mention the shuffled keypad, the 30 s pause after a wrong answer, that no PIN is set on a fresh install, that review uses sandbox (drop the `.storekit` sentence) and that the app is iPhone-only.
- Size: S.

**B8. The store docs give the wrong price for Cosmic Pass. That counts as S0 under the roadmap's own rule ("a wrong price" blocks the release, §7.7).**

- Evidence:
  - `compliance.md:50` says road00 is "$4.99, Cosmic Road looks".
  - The code says $3.99 "Cosmic Pass: Cosmic Road" (`src/meta/tuning.ts:96,114`), and so does `ios/App/PocketPlanet.storekit` (checked).
  - `compliance.md:42-50` has no Family Sharing column, but the app promises Family Sharing (`grownups.ts:198`), and switching it on in App Store Connect can't be undone.
- Fix:
  - Correct the row now and add a "Family Sharing: On" column for startercrew and road00.
  - Add a vitest that parses `compliance.md` against `PRODUCTS` (ID, type, price).
- Size: S.

### OWNER

**B9. No Apple Developer Program membership and no signing Team.**

- Evidence: `project.pbxproj` has no `DEVELOPMENT_TEAM` (signing is Automatic at :319 and :342); `docs/handoff/05-status-and-next.md:119-120`.
- Fix:
  - Choose individual or organization first (an organization needs a D-U-N-S number and shows the company as seller).
  - Enrol, pick the Team in Xcode and register the App ID `com.pocketplanet.game` with Game Center. Bundle IDs are unique worldwide, so register it early; if it's taken, tell the studio at once.

**B10. The Paid Applications Agreement, tax and banking aren't done.**

- Evidence:
  - `store/APP_STORE_CONNECT.md:5-10` (§0) never mentions them; only `README.md:95` does.
  - Without them StoreKit returns no products, the shop shows "Price unavailable" (`shop.ts:36`), and IAPs can't be submitted.
- Fix: complete them in App Store Connect → Business before creating any product. Studio adds the step to `APP_STORE_CONNECT.md` §0.

**B11. The Support, Privacy and Marketing URLs don't exist, and the contact and legal name are placeholders.**

- Evidence:
  - `site/support.html:68-72` and `:164` show `support@YOUR-DOMAIN`.
  - `site/privacy.html:161` and the footers of all 5 pages show "OWNER NAME"; `press.html:75` shows "DEVELOPER NAME".
  - `compliance.md:66-71` and `APP_STORE_CONNECT.md:32,55` hold `<your-site>` placeholders.
- Fix: host `site/` (options in `site/README.md`), open a real mailbox, and send the studio the domain, email, legal name and copyright line. Studio then fills every placeholder and canonical TODO.

**B12. No App Store Connect app record and no App Review contact.**

- Evidence: `APP_STORE_CONNECT.md:12-23` and `:59`.
- Fix: create the record now to reserve "Comet Garden" (fallback "Comet Garden: Tiny Worlds"). This also gives the Apple ID number the Rate fallback needs.

---

## 3. HIGH, MEDIUM and LOW gaps (deduplicated)

### HIGH: STUDIO

| #   | Gap                                                                                                                                                                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | **iOS 15.0-15.3 wipes the save on every launch.** These APIs need Safari 15.4, and the build adds no polyfills.                                                                            | Deployment target 15.0 (`project.pbxproj:253,304,322,345`); `vite.config.ts:5` targets es2020 (no polyfills). `Object.hasOwn` in `migrate()` (`src/meta/profile.ts:482,484,485,521,533`; 4 calls already in HEAD), `structuredClone` (`src/meta/voyage.ts:68,98`), `.at(-1)` (`src/ui/flows/results.ts:54`, `src/core/troubles.ts:95`). `loadProfile` catches the TypeError and returns defaults with `readOnly=false` (`profile.ts:566-574`); the next save overwrites the main save and the backup (`profile.ts:585`). | Raise `IPHONEOS_DEPLOYMENT_TARGET` to 15.4. Every iOS 15 device can update, so the 6s/SE1 floor in §7.8 stays. Or replace the 3 APIs. Add a lint that bans APIs newer than the floor. Set Vite `build.target: ['es2020','safari15']`.                                                                                                         |
| H2  | **The bundle declares only English.** The App Store will list 1 language, and `navigator.language` in WKWebView probably reports `en` on a German or Japanese iPhone.                      | `Info.plist:7-8` (no `CFBundleLocalizations`); `knownRegions` is (en, Base) (`project.pbxproj:136-139`); only `Base.lproj` exists. `src/i18n.ts:69-73` detects the language from `navigator.language` only.                                                                                                                                                                                                                                                                                                              | Add `CFBundleLocalizations` (en, es, fr, de, pt-BR, ja), the regions and `<lang>.lproj/InfoPlist.strings`. Check in the Simulator in de and ja: the first screen and the gate must be in that language.                                                                                                                                       |
| H3  | **The privacy policy text is incomplete.**                                                                                                                                                 | `site/privacy.html:79-83` (and the `docs/privacy.html` copy): no retention or deletion, no Game Center, no operator, a wrong list of what shares contain (the Passport image carries the explorer name and number, `src/meta/passport.ts:360-364`), nothing on support emails or site server logs.                                                                                                                                                                                                                       | Add, in 6 languages: retention; how to delete (Reset progress at `settings.ts:176-193`, Clear play history at `grownups.ts:201-205`, deleting the app); Game Center as Apple's opt-in service; an accurate share list; that support emails are used only to reply, then deleted; the operator. Keep the `docs/` and `site/` copies identical. |
| H4  | **Release pipeline: an archive can ship a stale or tester build.**                                                                                                                         | `ios/App/App/public` is gitignored and dated 30 Sep, before M9 (`ios/.gitignore:4`). The generated `capacitor.config.json` still says "Pocket Planet". The build number is fixed at 1 (`pbxproj:320,343`). No release script (`package.json:6-25`). The tester build uses the same bundle ID (`vite.config.ts:6`). `docs/qa/release.md` doesn't exist (ROADMAP:934).                                                                                                                                                     | Add an `ios:release` script: refuse a dirty tree, `npm ci`, build, `cap sync`, grep `ios/App/App/public` for tester and dev hooks, bump `CURRENT_PROJECT_VERSION`, tag. Write `docs/qa/release.md` from §7.7. Link it from `APP_STORE_CONNECT.md` step 6.                                                                                     |
| H5  | **Game Center scope for 1.0 is unsettled.** It can't be switched off, the dashboard isn't gated after sign-in, and the daily leaderboard conflicts with the "Contests: Infrequent" answer. | `settings.ts:224-237` only ever sets `gameCenter = true`; `settings.ts:236` opens the dashboard ungated (`GameCenterPlugin.swift:84-95`). `compliance.md:20` vs `store/gamecenter.md` (`lb.daily` resets every day). Decision 5 (ROADMAP:1530) recommends achievements and the player's own rank.                                                                                                                                                                                                                        | Recommended: ship 1.0 with achievements only, no leaderboards, so Contests is "None", 4+ is safe and no other children's nicknames appear. Add a Game Center off switch and gate the dashboard. Owner confirms.                                                                                                                               |
| H6  | **No J4 Modes journey:** Daily, Rush, Zen and the Challenge round trip are never played end to end.                                                                                        | `e2e/` has no j4 (`ls`); ROADMAP:925 requires it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Write `e2e/j4.spec.ts` (gate fail means no share; `rushBest` saves; Zen persists across a reload; encode and decode a code; a bad code), in en and pseudo at 320×568, and add it to CI.                                                                                                                                                       |
| H7  | **Screenshots and the App Preview show Homeworld UI that M10-M11 retire** (Ring, residents, Launch Tower).                                                                                 | `store/screenshots-v2/*/6.9/0[56]-6-world`; the last ~4 s of the App Preview; `store/tools/shots.mjs:170`. Guideline 2.3.3.                                                                                                                                                                                                                                                                                                                                                                                              | Re-capture shot 6 and the end of the preview after M11.5 (inside M12.6). Also export an English set of 8 stills in case the preview isn't used.                                                                                                                                                                                               |

### HIGH: OWNER

| #   | Gap                                                                                                                     | Evidence                                                                                                               | Fix                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H8  | **Nothing has run on hardware, TestFlight or the StoreKit sandbox.**                                                    | `05-status-and-next.md:106`; ROADMAP §7.7:934 (oldest and newest device, StoreKit matrix, 48-h soak) and §7.8:936-948. | Oldest iPhone on iOS 15 plus a current one; sandbox matrix including Ask to Buy, "Don't Allow" and a Family Sharing restore on a second Apple ID; 48-h soak with at least 5 adult testers. Studio first runs the matrix in the Simulator against `PocketPlanet.storekit`. |
| H9  | **The T0 kid playtests and the Gate v2 check with real children haven't happened.**                                     | `05:98,122`; `gate.ts` number words; `compliance.md:13` answers Parental Controls "Yes".                               | Use the protocol in `docs/qa/playtest-difficulty.md` (no recording) plus the gate check with 9-11-year-olds in en and ja. Studio prepares a stronger fallback: harder "Forgot PIN?" and a non-reading task for ja.                                                        |
| H10 | **No formal trademark search.**                                                                                         | Decision 30 (ROADMAP:1555); `05:117`.                                                                                  | USPTO, EUIPO and JPO before App Store Connect and the art lock.                                                                                                                                                                                                           |
| H11 | **EU DSA trader status is undecided.** It blocks EU storefronts, and a trader's address, phone and email are published. | No mention in `store/` or `docs/` (grep).                                                                              | Decide (IAP sales almost certainly make you a trader) and which address to publish. An organization account or a business address keeps a home address off the page.                                                                                                      |

### MEDIUM: STUDIO

| #   | Gap                                                                                                                                | Evidence                                                                                                                                                                                                     | Fix                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Purchase reconcile can remove a paid non-consumable** if StoreKit's current-entitlements list happens to leave it out.           | `src/ui/app.ts:1314-1328`; `src/meta/iap.ts:81-86`.                                                                                                                                                          | Revoke only on an explicit `revocationDate`. Add an airplane-mode launch after a purchase to the StoreKit matrix. If it reproduces, it's S0.                                                                                                                                    |
| M2  | **If `App.init` throws, the player gets a blank screen with no way out.** `merge()` keeps fields of the wrong type.                | `src/main.ts:25`; `profile.ts:467-475`.                                                                                                                                                                      | try/catch around init; quarantine the raw save (`pp.profile.broken`); try the backup, then defaults; show a "start fresh / try again" screen.                                                                                                                                   |
| M3  | **Save safety.** No pre-migration copy; a newer save is stamped v3; read-only mode is never shown; the failure paths are untested. | `profile.ts:547,553,556-575,585`; only `migrate()` is tested (`tests/saves.test.ts`).                                                                                                                        | A one-time snapshot when `raw.v ≠ PROFILE_VERSION`; refuse to downgrade a newer save; a calm notice when read-only; tests for both copies corrupt and for a throwing read.                                                                                                      |
| M4  | **Memory leak with Reduce Motion on:** creature portraits are never released.                                                      | `src/ui/art/critters.ts:679-683` returns before the sweep at `:701-704`.                                                                                                                                     | Run the detached sweep even with motion off; add a unit test and the planned 50-planet soak (ROADMAP:916).                                                                                                                                                                      |
| M5  | **Sound can stay off for the session.** Audio unlocks once on `pointerdown`, and the "interrupted" state isn't handled.            | `app.ts:207-211`; `src/ui/audio.ts:40-44,55-58`.                                                                                                                                                             | A persistent `pointerup`/`touchend` resume whenever the state isn't `running`. Owner checks after a call or Siri.                                                                                                                                                               |
| M6  | **Per-frame DOM layout reads and full flight re-simulation.**                                                                      | `src/ui/fx.ts:347-356`; `src/ui/preview.ts:37-46,70-80`.                                                                                                                                                     | Cache the HUD rectangles on resize; key the prediction on state, not `scene.time`; throttle drawing while paused.                                                                                                                                                               |
| M7  | **CI would catch none of the blockers.**                                                                                           | `.github/workflows/ci.yml:103-140`: a Debug Simulator build on an unpinned Xcode; Playwright runs only against the dev server (`playwright.config.ts:51-57`); 44 px tap targets aren't strict (`ci.yml:93`). | Pin Xcode 26; add a Release `archive CODE_SIGNING_ALLOWED=NO`; add a vitest for the plist keys and manifest categories; add a smoke test against `vite preview`; set `E2E_STRICT_TAP=1`; add `webkit-320x568`.                                                                  |
| M8  | **VoiceOver gaps.**                                                                                                                | Modals have no `role=dialog` (`src/ui/dom.ts:65-90`); toasts aren't announced (`dom.ts:47-51`); Homeworld plots are canvas-only (`src/ui/screens/homeworld.ts:179,517-578`).                                 | ARIA and focus for modals, `aria-live` toasts, and pull the plot list forward from M11.5.                                                                                                                                                                                       |
| M9  | **Game Center App Store Connect assets are missing, and the 1000-point cap is full.**                                              | `store/gamecenter.md:25,62-64`.                                                                                                                                                                              | Freeze the achievement list after M12, re-point to stay at or under 1000, and write 2 descriptions per achievement in 6 languages plus 1024 px art. Achievements can't be deleted once they ship.                                                                               |
| M10 | **The compliance documents are missing:** COPPA note, Children's Code check, IAP translations.                                     | `docs/compliance.md` is missing (ROADMAP:1415); `compliance.md:38-50` is English only; `compliance.md:16` ("Challenge codes are numbers") is wrong (`src/meta/modes.ts:85`).                                 | Draft `docs/compliance.md` (COPPA retention and security, the Children's Code assessment covering the Golden lane default `profile.ts:388`, one-tap gem spends, the Piggy Bank and continues). Translate IAP names and descriptions, measured. Correct the challenge-code line. |
| M11 | **The "Rate" button can do nothing visible.**                                                                                      | `settings.ts:239-247`; `05:101`.                                                                                                                                                                             | After B12, open `apps.apple.com/app/id<ID>?action=write-review` after the gate, or hide the button until the ID is known.                                                                                                                                                       |
| M12 | **Never checked in iPad compatibility mode.**                                                                                      | `TARGETED_DEVICE_FAMILY=1` (`pbxproj:333`); §7.8:945.                                                                                                                                                        | A Simulator pass through the first session, the gate, the shop and sharing, with screenshots to `docs/qa`.                                                                                                                                                                      |
| M13 | **Version strings are kept in 3 places.**                                                                                          | `package.json:4`, `tuning.ts:7`, `pbxproj:327`.                                                                                                                                                              | One source of truth; show "v1.0.0 (build N)" in Settings.                                                                                                                                                                                                                       |
| M14 | **The listings, site and press kit leave out Remix and later features; the Desktop copy is stale.**                                | `store/listing.md:13-50`; `05:86`.                                                                                                                                                                           | Rewrite in M12.6 within the limits (de promo is 170/170). Add a sync script for the Desktop copy.                                                                                                                                                                               |
| M15 | **The date pre-flight covers 90 days, but the runway rule is 98.**                                                                 | `tests/sim/calendar-preflight.sim.ts:37` vs ROADMAP:899.                                                                                                                                                     | Raise it to 120.                                                                                                                                                                                                                                                                |

### MEDIUM: OWNER

| #   | Gap                                                                                                                                                                                                                                             | Fix                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| M16 | Open decisions: 33 (Remix, ROADMAP:1558); confirm defaults 34-44 (decisions 41-44 exist only in the uncommitted working tree; HEAD `35252d3` records 34-40); give inputs for 22 and 23 before M11; confirm the cut lines (decisions 15 and 25). | Answer before each milestone's review.                |
| M17 | US state app-store age laws (Texas SB 2420 is named at ROADMAP:1472) and a legal sign-off on the COPPA note.                                                                                                                                    | A short legal read, recorded in `docs/compliance.md`. |
| M18 | Native-speaker review (decision 6; `05:103`).                                                                                                                                                                                                   | Book it for after the M12 string freeze.              |
| M19 | Small Business Program (§6.7:732 assumes Apple's 15% rate).                                                                                                                                                                                     | Apply right after B10.                                |
| M20 | The App Store Connect age-rating preview.                                                                                                                                                                                                       | Confirm 4+ after the H5 decision.                     |

### LOW: STUDIO

- **haptics:** `haptic.tick` never fires on iOS because `selectionStart()` is never called (`src/ui/haptics.ts:23`; `node_modules/@capacitor/haptics/ios/Sources/HapticsPlugin/Haptics.swift:19-29`).
- **Number and plural formatting:** forced to en-US (`dom.ts:42`, `motion.ts:94-132`); French plurals (`i18n.ts:107-110`).
- **Gate after Reset progress:** the gate keeps the pre-reset profile object (`settings.ts:187`, `gate.ts:68-70,169-170`).
- **Layouts waived at 320 px:** the gate's hold label and the de Passport grid (`e2e/j3.spec.ts:31-39`, `e2e/prices.spec.ts:33-41`).
- **Resource hygiene:** the HUD `ResizeObserver` is never disconnected (`hud.ts:50`); particles have no cap (`fx.ts:746`); `color-mix` has no fallbacks.
- **Challenge seeds can spell words:** the alphabet includes vowels (`modes.ts:85`).
- **Old name on shared images (new finding):** they are saved as `pocket-planet-<ts>.png` (`postcard.ts:81`), and the cache files are never deleted.
- **Stale shipping docs:** `README.md:89-97`; the `capacitor.config.ts:4` comment; no shared Xcode scheme with the StoreKit config.
- **Store-doc housekeeping:**
  - category wording (`listing.md:5` vs `APP_STORE_CONNECT.md:28`)
  - `measure-listings.py` can't check en and isn't in CI
  - neighbouring storefront locales (es-ES, pt-PT, fr-CA, en-GB)
  - `site/README` details; "seasonal" (`notes.html:115`)
  - In-App Event text for Cosmic Road
  - `OUTBOUND_CALLS` lacks `gcDashboard` (`policy.test.ts:41-54`)
  - the privacy lint doesn't scan `site/`
- **Accessibility Nutrition Label answers:** draft honest ones (Reduced Motion yes, Differentiate Without Color yes, VoiceOver and Larger Text not yet).
- **Support FAQ correction (new finding):** it says progress is "only on this device" (`support.html`). Preferences live in UserDefaults, which iCloud and computer device backups include. Check this on a device, then say so.
- **"For grown-ups" wording in the listing:** rewrite as neutral copy (`listing.md:11,44-48`; Guideline 2.3.8). The owner decides.

### LOW: OWNER

- Turn Mac and Vision Pro availability off for 1.0.
- Leave mainland China out (it needs a game licence).
- Confirm the v2 screenshots and retire `store/screenshots/`.
- Make the repo private and switch the default branch to `main`, after the site is hosted elsewhere (`05:114`).
- Merge PR #2.
- Weekly Xcode Organizer crash check after launch.

---

## 4. Build plan: what's left, in order (sizes from ROADMAP §8; S≈1, M≈2, L≈3 team-weeks)

0. **Finish and commit M10 Labs (L, in progress).** The working tree has 65 files changed (+4,753/−3,401) and nothing has been committed since 2 Oct.
   - Fix the doc contradictions: §7.5:826 and :827 still say "decent Hard fail ≥ 20%" and "blind + max loadout ≥ 3%", against decisions 34 and 41. The M10 acceptance contradicts decision 44. :833 says "today about 100" against 85.8 (decision 40).
   - Update the glossary `BUILT` list.
1. **Launch-hardening sprint (S, about 2-3 days; runs alongside step 0, since it touches mostly `ios/`, `store/` and `site/`).**
   - B1-B8, H1, H2, H4, and the CI guards in M7.
   - This makes the first TestFlight build reviewable the day the owner's account exists.
2. **M10.5 Launchers and the Launch Bay (L).**
   - Use the decision-34 wording in the acceptance (:1350).
   - Add a paired-seed "never hurts" gate per launcher (the decision-44 lesson).
   - Zip earning per decision 42.
   - Rename "Golden Orbit launcher" (`tuning.ts:101`) to a launcher look _before_ any IAP metadata goes into App Store Connect.
   - Cut line: the Skipper and Sparkler move to M15.
3. **Decision-29 generator fix (my estimate: M; the roadmap doesn't size it), in parallel with M11** (different files: `src/core/levels.ts` and `tests/sim/*`).
   - Bring shadow layouts into the §7.5 bands with the Star Sling only, and turn `curve-shadow.sim.ts:33-61` and `balance.sim.ts:194` back into gates.
   - Every planet after 60 and every Remix seed comes from the generator (only planets 1-60 have reviewed salts, `levels.ts:159`), while the listing promises "more than 100 planets that ramp up gently" (`listing.md:39`).
4. **M11 Homeworld Level and a fair economy (M).**
   - Get the owner's input on decisions 22 and 23 first.
   - Fix free gems (85.8 vs 95) and idle income (283×, `05:81`).
   - For 11.6, map tester saves rather than reset them once TestFlight testers exist (§7.7:916 says a save from every version must load).
5. **M11.5 Homeworld Life (L).**
   - Split the screen first (11.5.1); the VoiceOver list view (pull it forward if M8 hasn't).
   - Cut line: Landmarks 3-5 move to 1.1.
   - No Game Center points are left, so settle the achievement plan here.
6. **M12 Star Roads, Styles and launch prep (L).**
   - 12.1-12.5, then freeze the catalogue and hand the owner a final product sheet (12 products, Family Sharing flags, translated names).
   - Freeze the Game Center list.
   - 12.6: re-capture screenshots and the preview, refresh the listings, write `docs/compliance.md` and the In-App Event text, finish `release.md`.
7. **Release candidate (S + owner time).** TestFlight 48-h soak, device and StoreKit matrices, the native translation review, then submit with manual release and phased release on.

Nominal remaining work is about 14-15 team-weeks. At the observed pace (about 30 nominal team-weeks committed in 5 days), the owner's steps in §6 set the date.

---

## 5. What the roadmap left out that a real launch needs (minimal solutions within the kid-safe, no-network, Data Not Collected rules)

1. **Apple business setup.** The Paid Apps Agreement, tax, banking, the Small Business Program, DSA trader status and D-U-N-S for an organization appear nowhere in §0 of `APP_STORE_CONNECT.md` or in §9.1. Add them as checklist steps.
2. **Privacy and contact inside the app.** Offline text in Grown-ups (B4). No links out, so no extra gate is needed.
3. **Release engineering.** One version source, an auto-bumped build number, the `ios:release` guard script, a Release archive in CI, git tags (H4, M7, M13).
4. **Tests for the native configuration.** A vitest asserting the required `Info.plist` keys, the localizations and the manifest API categories. It would have caught B1, B2 and H2.
5. **An App Review kit.** A demo video of the shop path, rewritten notes, IAP screenshots and the review contact (B6, B7, B12).
6. **Error visibility without analytics.**
   - Count JavaScript errors in the existing on-device ledger by coarse message hash, with no personal data.
   - Show them in Grown-ups as a short "diagnostic code" a parent may copy into a support email.
   - Nothing is sent by the app, so "Data Not Collected" holds. Also check Xcode Organizer every week.
7. **Save safety for an app with no server.** A pre-migration snapshot, a refusal to downgrade, quarantine of a broken save, and a recovery screen (M2, M3).
8. **Support operations.**
   - A monitored mailbox with replies ready in 6 languages (refunds via Apple, Ask to Buy, new phone, the gate, deletion) and a response target.
   - **A rule for children's emails:** if a message looks like it comes from a child, reply once (asking for a grown-up) and delete it, within COPPA's one-time-contact allowance.
   - A line in the privacy policy on how long support emails are kept.
9. **Rollback and hotfix without a server.** Phased release with pause, a hotfix branch plus expedited review, removal from sale as a last resort, and a pre-flight of at least 98 days (M15).
10. **Permanent App Store Connect objects.** IAP product IDs can never be reused, Family Sharing can't be switched off once on, and achievements can't be deleted once they ship. Create them only from the frozen M12 sheet.
11. **Reserving the IDs early.** Bundle IDs are unique worldwide and names are reserved only by an app record. Do B9 and B12 now, not at M12.
12. **Accessibility Nutrition Labels and availability choices** (Mac/Vision Pro off, China excluded, neighbouring locales).
13. **Japan in-game currency (for counsel).** Gems sold for money may count as prepaid payment instruments under Japan's Payment Services Act, with duties only above a balance threshold. Record counsel's view in `docs/compliance.md`.

---

## 6. OWNER checklist, in order

1. **Decide individual vs organization seller** and the legal name. If organization, request a D-U-N-S number now (it can take days to weeks).
2. **Enrol in the Apple Developer Program.** Pick the Team in Xcode, which registers `com.pocketplanet.game` with Game Center. If the ID is taken, tell the studio the same day.
3. **Create the App Store Connect app record** ("Comet Garden", fallback "Comet Garden: Tiny Worlds"). Send the studio the Apple ID number.
4. **Sign the Paid Applications Agreement and complete tax and banking.** Then apply to the Small Business Program.
5. **Declare EU trader status** and choose the published address, phone and email.
6. **Order the trademark search** (USPTO, EUIPO, JPO).
7. **Pick a domain and host `site/`, and open a support mailbox.** Send the studio the domain, email, legal name and copyright line.
8. **Decide** whether the shop opens from first launch (B7), the Game Center scope for 1.0 (recommended: achievements only), decision 33, the confirmation of defaults 34-44, input on 22 and 23, the cut lines, and the v2 screenshots.
9. **Set up TestFlight:** an internal group, sandbox testers, a second Apple ID for the Family Sharing test, and an Ask to Buy family.
10. **Run real devices** (the oldest on iOS 15 and a current one, starting with M10 builds): sound, the silent switch, haptics, VoiceOver, airplane mode, Low Power Mode, the StoreKit sandbox matrix, the Game Center sandbox.
11. **Run the T0 kid playtests and the Gate v2 check** with 9-11-year-olds (en and ja), using the paper-only protocol.
12. **Get legal reads:** US state age laws, sign-off on the COPPA note and the Children's Code check, Japan's prepaid-currency rule.
13. **Book and fund the native-speaker review** to start at the M12 string freeze.
14. **After the M12 freeze:**
    - create the 12 IAPs (Family Sharing on for non-consumables) and the Game Center items from the final sheet
    - run the age-rating questionnaire and confirm 4+
    - App Privacy: "Data Not Collected"
    - Accessibility labels
    - availability (China excluded, Mac and Vision Pro off)
    - the App Review contact
15. **Run the 48-hour TestFlight soak** with at least 5 adult testers.
16. **Submit** with manual release and phased release on.
17. **Housekeeping:** make the repo private and switch the default branch to `main` (after the site moves), and merge PR #2.
18. **After launch:** check Xcode Organizer every week, answer the support mailbox within the agreed time, and add the App Store link to the site.
