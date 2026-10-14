# M14 Package S: step-0 contract

14 October 2026. Base: untouched 1.1 candidate HEAD `d40c96714634dca881db6c824612be7e83ae0bba`. No commit, index change, installs, dependencies, StoreKit products, submissions or outbound actions. A-D implementation remains separate. Save v8 is the only enabled change; no Road 1 content, calendar override, Landmark, release announcement or new Styles dot is installed.

## Captures first

Both v7 saves were written before any game source edit, with a temporary Vitest capture harness (retained at `/private/tmp/m14-step0/capture-v7.test.ts`). The harness asserted `PROFILE_VERSION === 7`, used `makeLevel` / `solve2` and `applyLevelWin`, then the real `grantRoadPass`, `claimRoad`, `startTrip`, `settleTrips`, `recordHomeworldWin`, `ensureWishes` and `ensureVoyage` operations. Homeworld buildings and residents were seeded as fixture setup; game rewards, Road claims, planet sector encoding, trip promises, friend-slot Wishes and saved Voyage theme came from the actual 1.1 code.

- `tests/fixtures/saves/k-release-1.1.v7.json`: planet 41; 40 solved campaign entries; Road 0 at 120 points, 40 earning keys and 12 reached free/paid tier claims; Pass owned; a returned 1-hour trip and an 8-hour trip in flight, each with frozen yield; friend Wishes; `2026-W46` with saved `critter` theme. Capture clock: 10 November 2026, 12:00 UTC.
- `tests/fixtures/road/road0-unfinished-at-road1.v7.json`: the same career continued through planet 50, Road 0 at 150 points, last earning day `2026-12-27`. This is a **scenario date**, with a hypothetical next Road opening on `2026-12-28`; no actual launch/opening date was supplied. B9/B10 tests should time-travel this frozen save to the chosen `opensOn - 1`, rather than rewrite the fixture.
- Untouched-code calendar check: `npx vitest run tests/voyage-frozen.test.ts tests/daily-frozen.test.ts` passed all 3 tests (29.87 s). Existing frozen hash fixtures and all older save fixtures were left untouched.

Prettier only changed whitespace in the new captures. Final SHA-256:

| Capture              | SHA-256                                                            |
| -------------------- | ------------------------------------------------------------------ |
| Rich 1.1 v7          | `d4f297fe8745dc57194e089d7d6ef7afa38f90e364927fd21b461e29227c73d3` |
| Unfinished Road 0 v7 | `ca2d726911028d863a2fbd0e300cf4033bbb34c9f6bec0ab34f8c0082b8a4b86` |

## Scope and contracts

| Scope                    | Implemented in S                                                                                                                                                                                                                                                                                                                         | Handed to                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| B16, save contract       | v8 / `m14Migrated`; `roadSeenDay` defaults to empty and migrates to the latest of a valid saved high-water mark, `roadDay.day` and today on old saves. v8 reloads preserve the mark without advancing it to a different day. Point events advance it without moving it back.                                                             | A wires observation on open/resume and uses the mark for availability. |
| Decision 95, save growth | Shared newest 600 unique valid earning keys, unioned with every per-Road array. Per-Road arrays retained empty; the profile writer caps the shared list. Standalone `grantRoadPoints` retains capped local dedupe for its existing API.                                                                                                  | A keeps this representation while implementing sharing.                |
| Homeworld save contract  | Separate typed `home.roadLandmarks`, default `{}`, sanitized with the existing LandmarkState rules, with existing sites untouched.                                                                                                                                                                                                       | D                                                                      |
| Shared types             | `ThemeSpec`, `RoadContent`, `RoadLandmarkId`, `RoadLandmarkDef`, `AlmanacRow`, exclusive day-or-week/stop `CalendarOverride`, `ReleaseInfo`; `ROAD_EARNING_KEY_LIMIT = 600`. `ProductDef.roadId?` / `opensOn?`.                                                                                                                          | A-D                                                                    |
| Road metadata            | Road 0 carries `addedIn: '1.0'`, inert Road 1 carries `'1.2'`. `RoadDefinition.addedIn?` allows the existing synthetic legacy definition in the unowned `tests/roadpoints.test.ts` to compile; installed definitions carry the value. B2 must reject missing metadata on installed Roads.                                                | A/B                                                                    |
| Content copy             | Static `CONTENT_FRAGMENTS = [road01]` merged into all six runtime dictionaries. `tests/helpers/locales.ts` exports `allStrings(lang)` and scans all on-disk fragments. i18n, policy, terms and glossary now inspect fragments, including English-only content before translation. Empty `road01.json` has all six languages.             | C fills fragment; store/storedocs switches remain C's scope.           |
| Copy contract            | Nine deferred literal English keys, no translations; existing `Past Roads` reused. Nothing renders in S.                                                                                                                                                                                                                                 | Lead translates; A/B/D wire callbacks.                                 |
| Road stubs               | `roadForProduct(id: string): RoadId \| undefined` maps the real `com.pocketplanet.game.road00` ID only; unknown/non-Pass IDs return undefined. `anyRoadReady(p: Profile): boolean` checks the existing playable catalogue.                                                                                                               | A                                                                      |
| Cosmetics                | `themed(spec: ThemeSpec): Cosmetic[]` preserves the installed Tidepool and Comet Candy factories exactly (16 fixed looks each), while accepting data. `stylesNewDot(p: Profile, day: string): boolean` keeps the existing seen-release test; `STYLES_RELEASE` remains `m12` until A installs M14 surfaces.                               | A                                                                      |
| Release stub             | `RELEASE: ReleaseInfo = {version: '1.2', submitOn: '2026-10-14'}`; submission date is explicitly a draft build anchor, not an owner submission.                                                                                                                                                                                          | B confirms anchor and release version.                                 |
| Almanac stubs            | Empty `ALMANAC`, `CALENDAR_OVERRIDES`; `ALMANAC_FROZEN_THROUGH = ''` awaiting B's pinned boundary. `almanacTheme(week: string, hemisphere: Hemisphere, fallback: string): string` returns fallback. `calendarSalt(dayOrWeek: string, stop?: number): number` returns 0; stop index is zero-based. No generator/event call sites changed. | B                                                                      |
| Content stub             | `ROAD01: RoadContent`, `ROAD01_THEME: ThemeSpec`; empty tiers, looks, products, singles, stardust and samplers. `road01.ts` imports only the shared types and nothing from cosmetics. It is absent from the playable catalogue.                                                                                                          | C fills data; A wires catalogue and looks.                             |
| Landmark stub            | Empty `ROAD_LANDMARKS`; `roadLandmarkMail(p: Profile): number` returns 0. The eventual hook adds eligible mail idempotently and returns the count for `checkMail`. No Inbox call site changed in S.                                                                                                                                      | D defines, A calls.                                                    |
| Decisions/docs           | Roadmap §10 decisions **80-96**, after M13's amendments, each “open, default applied”; §5.5 and §6.1/§6.2 corrected; HW §6.3 records the separate Landmark queue and rules.                                                                                                                                                              | Lead integration                                                       |

The map names the almanac, content object and mail hook but does not specify complete lookup/mail return signatures or Landmark gift-field names. The table above makes those contracts concrete: Road Landmark gift fields are `decoration` and `title` cosmetic IDs. A-D should use these names rather than define competing interfaces. Theme colors are a readonly three-color tuple; content arrays are readonly and spread into runtime catalogues.

## Exact English strings

Nine **new** keys, no changed or removed keys, and no changes to `de/es/fr/ja/pt.json`:

1. `Road Landmarks`
2. `Your {road} looks`
3. `{landmark} is ready to build`
4. `You can build {landmark} on the Floating Isle. Its steps stay open.`
5. `{landmark} is complete!`
6. `{landmark} is complete. Your {decoration} and {title} are ready.`
7. `What's new in {version}`
8. `Your Road is in Missions`
9. `Opens {date}`

`Past Roads` already existed and is reused unchanged. Generic callbacks live in `release.ts` (`M14_STRINGS`) and `roadLandmarks.ts` (`ROAD_LANDMARK_STRINGS`); `_keys.json` includes every new literal. The early commentary estimate of eight new keys was corrected to nine after counting the four letter templates.

## Map mismatches and downstream work

- Decision numbers in the map are five behind the roadmap: M14 75-91 → **80-96**. Comments and new decision references use the shifted numbers.
- B15's planet-20 noun maximum is stale: it is **21**, per decision 60. The existing unlocks are Road 22, Passport 21 and Voyage 24. No new surface or intro is enabled here.
- M13's economy amendments replace the map's old trip-share assumptions. Reference free supply is **6,700 / 6,268**, about **100.8 / 98.1 gems per active day**, with friend-slot Wishes paying friendship. Decision 86 uses **≥ 0.85× measured 1.1 supply**, re-measured on the M14 tree and larger of the new-install/cohort windows; at the existing 6,700 reference the singles require ≥ 5,695 gems. This package did not run or regenerate the economy report. D owns that measurement; no Road 0 single was added.
- Today's free lane has seven looks, 150 gems, 12,850 dust, 17 boosters, a 1,000-dust/sticker finale and no free-lane title. The title belongs to the Pass. Roadmap wording now reflects those facts.
- `package.json` and the native release candidate still advertise 1.0.0, despite save v7 / M13 being complete. They are outside S's files; B owns the release bump and version alignment. S did not run the mutating release script.
- The historical release-regex blocker in §0 is already fixed in today's script; its regression test passes. No fix was duplicated.
- Existing save fixtures already extend through **l**, plus `j-release-1.0`; S adds the second k-prefixed fixture rather than assuming a-j is the full list.
- A required `RoadDefinition.addedIn` would break the existing unowned synthetic Road 1 test definition. S exposes it as optional for compatibility, and supplies it on both production/stub definitions. If A makes it mandatory, add `addedIn: '1.2'` to `tests/roadpoints.test.ts`'s `roadOne` in the same change.
- Untouched 1.1's migration removes `voyage.legacyCatchUpPaid` for an unplayed week. The rich golden demonstrates this existing canonicalization; tests preserve its week/theme/progress and wallet without treating that obsolete flag as a new v8 behavior.
- Road 1's real `opensOn`, launch date and frozen almanac boundary are absent from the supplied facts. Stubs do not invent a player-visible date. The unfinished golden's December date and `RELEASE.submitOn` are documented scenario/draft anchors.
- A still implements the point-sharing rule and availability observations at open/resume, generalized purchase/revoke/ownership paths, per-Road captions and Styles availability. B still implements calendar resolution/overrides/runway. C fills content and switches store/storedocs to `allStrings`. D implements Landmark progress/mail. These are deliberately dormant in S.
- A concurrent writer changed `docs/handoff/05-status-and-next.md` during the session. S did not edit or revert it.

## Files

- New: `src/meta/{m14types,release,almanac,roadLandmarks}.ts`, `src/meta/content/road01.ts`, `src/locales/content/road01.json`, `tests/helpers/locales.ts`, both v7 fixtures, this handoff.
- Changed: `src/meta/{m12types,profile,homeworld,cosmetics,starroad}.ts`, `src/i18n.ts`, `src/locales/_keys.json`, `tests/{i18n,policy,terms,glossary,saves,migrate}.test.ts`, `docs/product/{ROADMAP-v2,HOMEWORLD}.md`.

## Verification

- `npm run typecheck`: PASS explicitly after the final code/tests.
- `npm test`: **1,171 passed / 117 passing files, 2 skipped, 10 failed / 2 files, 40.08 s**. Every failure is one of the untranslated nine keys, repeated across the five languages and two i18n entry points. All migration, contract, calendar-hash, policy, terms, glossary, privacy, release-script and remaining unit tests passed; expected missing translations are kept failing for the lead, never waived or filled with English copies. The first full run passed 1,168 tests / 117 files, skipped 2, and failed only 10 translation assertions in `i18n.test.ts` and its importing `launchers.copy.test.ts` (the same 9 new keys × 5 languages, reported twice).
- `npm run sim:quick`: PASS, 5 tests, 102.60 s. Repeated with console interception disabled to retain actual metrics: PASS, 5 tests, 112.52 s. No sim policy, baseline, generator or tuning file changed.
- Level/rules/flight/tuning snapshots: PASS, 15 tests / 4 files, 7.08 s; no snapshot file changed.
- `npx prettier --check .`: PASS repo-wide. `git diff --check`: PASS. S formats only owned files.
- No Playwright run, per the common sandbox rule. No release/deploy action.

Logs are in `/private/tmp/m14-step0/`: `full-test-final.log`, `sim-quick.log`, `sim-quick-numbers.log`, `snapshots.log`, and `prettier-check.log`.

### Sim numbers

The console-enabled quick run used 14 attempts per planet/policy for the curve survey and the unchanged default 8-run reactions sample. Every baseline fail/three-star drift row was **+0/+0**.

| Measure                                                                   | Result                                                |
| ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Frost per ten first clears, aware planets ≥25                             | **19.7917**, inside 17.8-21.8                         |
| Aware / blind three-star rate                                             | **53.125% / 35.2679%**, 18-point reported gap         |
| Aware fusions / blind clashes per planet                                  | **2.6098 / 0.5793**                                   |
| Aware Combo 2 / 3 / 4                                                     | **46.3542% / 18.75% / 7.8125%**                       |
| Supernovas per planet (reaction sample)                                   | **2.7561**                                            |
| Best-available dead throws / object gain spread                           | **9.4951% / 1.7170**                                  |
| Flying bots, median round / surprise bonks                                | **83.0 s / 0**                                        |
| Quick calendar preflight                                                  | **21 Daily layouts + 70 Voyage stops, 0 issues**      |
| Trouble teaching (6 planets ×16 paired runs), blind / aware / max loadout | **5.8% / −0.5% / 4.3%**                               |
| Curve survey diagnostic Watches                                           | **30 lint flags, 9 band misses**, zero baseline drift |

The quick curve's 14-attempt survey is diagnostic in today's code; the separate 96-attempt, two-seed balance job owns the curve Gates. No baseline, tuning or generator was changed to silence these Watches. The 100-day M14 runway remains B's scope.
