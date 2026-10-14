# M13 step 0 (package S): verification and handoff

Moved here from ROADMAP-v2 §10 (the roadmap keeps decisions, not build logs).

M13 package S (14 October 2026): step-0 contracts and the 1.0 baseline are prepared; A-D implementation and release acceptance remain pending. Calendar hashes use the provisional 1.1 submitOn of 2026-10-14, through 2027-01-20; extend the untouched-1.0 capture if submission moves later. No M13 trip or backup behaviour is enabled by S.

## Verification and handoff (14 October 2026)

**Status: contracts implemented; hold A-D start / merge acceptance because A0 is red.** Nothing in S changes live trip or backup behaviour. Game changes are save v7, real `sec` capture on replacement, and a saved theme for newly opened Voyage weeks. `saveProfile` is unchanged. The trip and backup functions are dormant stubs; B/C still retire the old player-facing Expedition strings and add the Trip glossary row. All five translation dictionaries are untouched.

**Capture provenance.** The rich v6 golden and calendar hashes were first captured before any game edit at HEAD `2a61ed15a1e07dcfb1c085ba133a8f996d1c17f3`. The fixture was completed with a non-Pass theme entitlement through the archived untouched 1.0 purchase writer (Pass ownership itself uses `pass` / `roadPassEntitlements`, not `meta.productEntitlements`). It includes a 4-hour trip, 30 galaxy entries including a colourless entry, friendship 2/9/24, unfinished previous-day Wishes, Road 0 at 60 with its Pass, notifications and Game Center enabled, nonzero clocks, and two completed Voyage stops. The first capture tests (95 tests including saves and calendar) passed on 1.0. Calendar coverage is 2026-W45 through 2027-01-20: 120 week/hemisphere/taught hashes (840 stops) and 240 date/taught hashes. The map supplies no 1.1 submitOn, so 2026-10-14 is provisional; a later date needs an extended 1.0 capture.

**A0 provenance and policy.** Final baseline is generated with the new `career.ts` against an archived untouched copy of that HEAD, with both economy seeds. Regular's effective Bay levels 1/2/3/4 arrive on days **8/12/16/36**. Thus A1's seven-day window is days **16-22**; the day-14 assertion remains a Watch. The bot respects the actual planet-21 UI build gate, reserves a Bay plot, retains the existing first Greenhouse before planet 20, prioritizes affordable Labs then Bay trip tiers, saves for a visible Homeworld level once its chapter is open (Bay tiers exempt), invites to effective Den capacity, and sends the longest 1.0 option at Regular/Payer's final visit. The cloned friendship route witnesses now update resident friends as well as moved-out friends; full Dens exposed the old assumption that the witness friend was absent. No game reward or gate was adjusted.

| Persona | All Labs 5, old → A0 | Homeworld 5, old → A0 | Beacon, old → A0 | Free gems/day, old → A0 | Final dust, old → A0 | Final gems, old → A0 |
| ------- | -------------------- | --------------------- | ---------------- | ----------------------- | -------------------- | -------------------- |
| Regular | 33 → 34              | 47 → 53               | 49 → 54          | 100.367 → 107.567       | 1,655 → 27,023       | 8,943 → 9,591        |
| Engaged | 20 → 19              | 30 → 31               | 30 → 32          | 105.267 → 114.433       | 124,227 → 147,829    | 9,384 → 10,209       |
| Payer   | 33 → 36              | 47 → 54               | 50 → 55          | 97.867 → 105.389        | 1,145 → 26,929       | 15,313 → 15,990      |

| A9 inherited check (Regular unless noted)          | Default seed                   | Second seed (`night2`)                                           |
| -------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| Idle ≤1.5× on every active day 1-60                | PASS, max 0.971×               | PASS, max 0.73×                                                  |
| Homeworld 5 ≥day 28; ≤day 60 Watch                 | PASS, day 53                   | PASS, day 54                                                     |
| All Labs 5 ≥day 28                                 | PASS, day 34                   | PASS, day 38                                                     |
| Engaged Labs ≥30% sooner                           | PASS, day 19 (44.1% sooner)    | PASS, day 19 (50% sooner)                                        |
| Every currency has a day-60 sink                   | PASS, all seven                | PASS, all seven                                                  |
| Free gems ≥95/active day                           | PASS, 107.567                  | PASS, 106.1                                                      |
| Free boosters ≤0.5/campaign win                    | **FAIL, 0.657315 (328/499)**   | **FAIL, 0.663**                                                  |
| Greenhouses ≤1/3/campaign win                      | PASS, 0.074148                 | PASS, 0.071                                                      |
| Purchases vs no-purchase twin: Labs / HW5 / Beacon | PASS, 36 / 54 / 55 for both    | PASS, 40 / 53 / 54 for both (separate exact paired Beacon check) |
| Replays ≤30% of Essences (Watch)                   | PASS, 15.9%                    | PASS, 20.3%                                                      |
| Road 0 free lane, 42-56 days                       | PASS, day 53                   | PASS, day 55                                                     |
| Road 0 new gem sinks ≥0.8× days 1-56 supply        | **FAIL, 5200/6953 = 0.747879** | **FAIL, 5200/6612 = 0.786449**                                   |
| Colour-stranding Watch                             | 0 days                         | 0 days                                                           |

Regular balances (frost / ember): day 60 **153 / 26**, day 90 **467 / 59**. 1.0 trips pay zero frost and ember, so trip earnings after their last sink are zero. Modern trip supply and its A1-A8 gates belong to A. The two A0 failures are a contradiction in the requested untouched-1.0 baseline: bringing the 1.0 three-booster 8-hour trips forward raises the booster ratio, and inviting all residents plus early trip gems raises free supply beyond the existing 5,200-gem Road catalogue. Fixing those by changing 1.0 rewards, the catalogue, the inherited thresholds, or by silently sending fewer/shorter trips would violate this package's stated contract.

**Other map mismatches / handoff details.** The Bay's planet gate is in `launchBayBuildable`, not `canBuild`; ignoring the UI gate exposes Expedition/launchers in the noun audit. The literal “Bay before Greenhouses” order conflicts with the launch noun fixture’s existing early Greenhouse, so that first pre-21 Greenhouse is preserved. Existing fixtures already extend beyond a-i (noun-budget, pre-stats and Voyage-seen saves). The release regex blocker is already fixed in today's `assertVersionSource`; S does not run the mutating release script. Existing `fc-screens.test.ts:175` and `meta-polish.test.ts:122` assign a 2-hour in-memory legacy trip; `Trip.hours` stays numeric for those callers while new APIs take `TripHours` (1/4/8) and migration rejects any other saved length. World Tree Spirit’s current canvas spot stays unchanged until B wires `homeLandFor`. `report.json` is gitignored in this repo; the regenerated 1.0 baseline is present on disk, and the lead must explicitly include that artifact when integrating.

**Frozen English additions (62; no changed or removed English keys in S).** Named deferred `t()` / `tp()` callbacks live in `src/meta/m13strings.ts`; `_keys.json` is regenerated. B/C remove retired keys only when their live uses are replaced. The five locale dictionaries still need every key below:

- "Trips"
- "Send a friend on a trip"
- "Pick a planet"
- "{friend} is going"
- "{friend} feels at home here"
- "Brings back"
- "Someone else"
- "{friend} is on a trip"
- "{friend} is back from {planet}!"
- "Postcard from {planet}"
- "Share postcard"
- "Trips open at Launch Bay level 2"
- "Longer trips open at Launch Bay level {n}"
- "Win a round, then a friend can go on a trip"
- "A friend can go on a trip"
- "Call {friend} home"
- "Your Buddy stays home to help you"
- "Invite another friend to go on trips"
- "Win a planet to send a trip there"
- "Each win brings your friend home 10 minutes sooner"
- "A friend is back from a trip"
- "{planet}, {stars} stars. Brings {list}"
- "Trip"
- "Trips bring Essences from a planet's lands"
- "All"
- "Waving goodbye"
- "{creature} wishes for two Savannas"
- "{creature} wishes for a sunny Savanna"
- "{creature} wishes for two Ice Sheets"
- "{creature} wishes for a shiny Ice Sheet"
- "{creature} wishes for two Tundras"
- "{creature} wishes for a quiet Tundra"
- "{creature} wishes for two Taigas"
- "{creature} wishes for a snowy Taiga"
- "{creature} wishes for two Swamps"
- "{creature} wishes for a misty Swamp"
- "{creature} wishes for two Marshes"
- "{creature} wishes for a reedy Marsh"
- "Your friend"
- "Progress backup"
- "A copy of this progress is kept in your own iCloud account. We can't see it."
- "Back up to iCloud"
- "Last backup: {date}"
- "Make a backup"
- "Restore progress"
- "This device"
- "Planet {n} · {friends} friends · {date}"
- "Restore this backup? This device's progress is kept so you can undo."
- "Restore"
- "Undo restore"
- "Progress restored."
- "iCloud is off for Comet Garden. A grown-up can turn it on in Settings."
- "This backup is from a newer version. Update Comet Garden to restore it."
- "iCloud backup is full. Remove an old backup to keep backing up."
- "Remove backup"
- "Grown-ups can restore saved progress from iCloud."
- "Erase all progress? Your iCloud backup is kept."
- "This device has purchases that aren't in this backup, so it can't be restored here."
- "+{n} friendship point"
- "+{n} friendship points"
- "{n}-hour trip"
- "{n}-hour trips"

**Validation.** `npm run typecheck`, `npm run build`, `npx prettier --check .`, `git diff --check`, `npm run sim:quick` (5 tests), and the level/rules/flight snapshot run (15 tests) pass. `npm test`: 1,019 passed, 2 skipped; its 10 failures are exclusively the 62 untranslated additions in five locales, reported by both `i18n.test.ts` and the importing `launchers.copy.test.ts`. The 180-day career, `untilLevel` / `onLevel`, all save goldens, calendar goldens, noun suite, and stub/codec tests pass. `SIM_NIGHTLY=1 npm run sim:economy:all` on archived 1.0 fails the two A9 categories on both seeds; all four persona side sims pass. The second-seed explicit purchase pair is equal on Labs 40 / HW5 53 / Beacon 54. No dependency, rule version, gameplay snapshot, translation dictionary or git state was changed by S.

**Files for the handoff.**

- Save contracts: `src/meta/m13types.ts`, `src/meta/galaxyCodec.ts`, `src/meta/tripsLegacy.ts`, `src/meta/profile.ts`, `src/meta/voyage.ts`; step-0 defaults / capture in `src/meta/homeworld.ts` and `src/meta/economy.ts`.
- Dormant APIs / copy: `src/meta/trips.ts`, `src/meta/tuning.ts`, `src/meta/backup.ts`, `src/meta/wishes.ts`, `src/meta/friends.ts`, `src/meta/m13strings.ts`, `src/main.ts`, empty `src/styles/wide.css`, `src/locales/_keys.json`.
- Tests: `tests/saves.test.ts`, `tests/migrate.test.ts`, `tests/galaxycodec.test.ts`, `tests/voyage-frozen.test.ts`, `tests/daily-frozen.test.ts`, `tests/tuning.snapshot.test.ts`, `tests/__snapshots__/tuning.snapshot.test.ts.snap`.
- Captures / sims: `tests/fixtures/saves/j-release-1.0.v6.json`, `tests/fixtures/voyage/frozen-weeks.json`, `tests/fixtures/daily/frozen-days.json`, `tests/sim/economy/career.ts`, ignored `tests/sim/economy/report.json` (v6 A0 profiles with explicit failing A9 metadata).
- Product docs: this roadmap and `docs/product/HOMEWORLD.md`.

The final current-code economy run reproduces every non-profile metric in the untouched-1.0 report exactly for Regular, Engaged and Payer. The A0 artifact retains the original v6 profiles. The same two inherited failure categories remain on both seeds; all four persona side sims pass. No commit, staging, merge, dependency install, release command or native entitlement change was performed.
