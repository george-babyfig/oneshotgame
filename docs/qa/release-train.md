# Release train — owner checklist

Decisions 81 and 90–93. Tuning and content builds ship every **2 weeks** as patch releases. Feature releases ship every **8 weeks**, aligned to the 56-day Road cadence: 1.1 is M13, 1.2 introduces Road 1, and 1.3 introduces Road 2. Every submission, TestFlight upload and App Store Connect object is an owner action.

## Dates and release metadata

`src/meta/release.ts` carries the major.minor content version and draft `submitOn`; patches such as 1.2.1 keep `RELEASE.version = '1.2'`. The current preparation anchor is **2026-10-14**, not a submission commitment. `package.json` stays **1.0.0** until the owner approves the release bump. The release CLI rejects mismatched major.minor metadata before mutation.

Road 1's opening date remains unset until the owner gives the actual 1.0 launch date. Set `opensOn` to the later of **launch + 56 days** and **RELEASE.submitOn + 28 days**. Each successor opens at least 56 days after the previous Road. Submit its build at least 28 days before opening: 14 days of Road 0 catch-up, 7 days for review and 7 days for phased release. Keep phased release on. An unset date is dormant draft content and is a release hold, never an invented playable date.

B2 checks metadata on every installed Road and lead time only for Roads whose `addedIn` equals `RELEASE.version`. Earlier Roads are skipped for lead-time checks. Ordinary preparation tests report unset current-release dates as **B2 HOLD**. The owner release command below sets `RELEASE_CHECK=1`, so those dates fail the gate before submission.

## Candidate checks

- [ ] Confirm the launch date, final Road name, `submitOn`, `opensOn` and `addedIn` with the owner. Confirm package/version alignment only at release time.
- [ ] Run `npm run typecheck`, `npm test` and `npm run format:check`; run the economy, loadout, readability, privacy, native and journey gates. All six languages must be translated and native-reviewed.
- [ ] Run the **run-date** runway: `RELEASE_CHECK=1 RUNWAY_FROM=$(date -u +%F) npm run runway`. It covers 98 forward days plus the previous/following day for UTC−12/UTC+14: 100 Daily dates at taught 16/28/36, every touching ISO week (at least 15), 7 stops at taught 16/28/36/60/120 in both hemispheres. Save the zero-issue result. PR `runway` uses `RELEASE.submitOn`; nightly uses the run date and separately retains the 120-day/104-week sweep.
- [ ] Preserve every M13 Voyage-week and Daily-date hash, and load all historical save goldens plus the 1.1 v7 capture. Never rewrite a golden to make a failure pass.
- [ ] Check the almanac/override shipped prefixes are unchanged. The frozen boundary is `2027-W03`, covering the M13 goldens through 20 January. New spotlights and salt repairs go only after it. A future bad draw gets an append-only day or week/zero-based-stop salt, followed by the runway and golden checks; generators and frozen layouts remain unchanged. At release, pin the full shipped prefix in `tests/almanac.test.ts` for the next build.
- [ ] Compare the owner-approved catalogue sheet against code, StoreKit, compliance and all six localizations. Test all new products through success/cancel/Ask to Buy/restore/Family Sharing/replay/refund, including a cold launch after approval and kill-before-save. Kid-side Road 1 content stays hidden before `opensOn`; the adult shop remains gated and reviewable from install.
- [ ] Review the App Review notes: fresh install → parental gate → Grown-ups → shop → each new product; explain `Opens {date}` for the Pass, immutable contents, Family Sharing, no expiry and no paid power. Obtain owner approval before creating permanent store products or uploading review images.
- [ ] Review the [Road 1 event draft](../../store/in-app-events/road01.md), final name, six-language copy and art captured with Hide paid looks on. The owner creates/schedules it only after approval. Re-check Apple's maximum 31-day duration and promotion up to 14 days early; do not schedule a 56-day event.
- [ ] Run the M14 cold/warm URL journey in both engines, all six languages and 320×568, 375×667, 390×844, 430×932. Browser tests mock only the native delivery bridge; the app uses its real `main.ts` wiring. Test unlocked returning, locked, session 1, tutorial, active round, active gate, recovery and invalid/purchase URLs. No link opens a purchase or dismisses a gate.
- [ ] Native owner smoke: cold launch with `xcrun simctl terminate booted com.pocketplanet.game` then `xcrun simctl openurl booted 'cometgarden://road'`; repeat `openurl` while the app is warm. Repeat on a fresh install, an unlocked save, a locked save, during a round and while the gate/shop sheet is open. Save evidence. SceneDelegate already forwards both URL contexts and cold connection options to Capacitor; no Associated Domains capability is needed.
- [ ] Complete [the archive and submission checklist](release.md), including TestFlight soak, manual release and phased release. Record version/build, commit/tag, archive, review result and approved schedule. Pause phased release for a regression, then prepare an owner-submitted hotfix.

## Integration outside Package B ownership

The map omits `src/ui/screens/voyage.ts` from every package's owned file list even though it renders and caches Voyage stops. Its calls must pass the saved theme before shipping: `eventFor(v.week, hemisphere, v.theme ?? null)` at both title sites; add `savedTheme: string | null` to `stopLevel`, include it in that helper's cache key, pass it as the sixth `voyageLevel` argument, and supply `v.theme ?? null` at all three `stopLevel` call sites (map thumbnails, stop sheet and round start). Package B exposes these signatures and verifies layouts/rewards with them, but cannot edit the unowned screen. Without this integration, a started week outside the frozen boundary can still render an almanac theme rather than its saved theme. This is a release hold.

The roadmap's §7.4 still needs its old “90 days, 12 weeks” wording updated to **98 days + 2 margin days and every touching ISO week** by the docs owner. Package B owns only the QA and event docs listed above.
