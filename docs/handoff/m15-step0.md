# M15 step 0 — S15-a (part a)

Scope: S15-a steps 1–7 only, against `3f9c4d32217b0cd1d2e87690e888936260a9c87c` on 2026-10-14. `RULES_VERSION = 1`, `REMIX_RULES = 1`, `includeFlood = false`, and `RULES_V2_VOYAGE_FROM` is absent. No commits, installs, translations, owner actions, S15-b tables, overlay stubs, flight seams, unlock rows or UI hooks.

## Per-step delivery

1. **Captures before source edits.** The scratch harness produced both v8 goldens, the stored-LevelDef round golden, 32 challenge codes with CH hashes, and 240 late-Daily rows (2026-11-02 through 2027-01-20, taught 52/60/120). The round golden has 1,512 rounds and 22,512 step hashes/event records: P8/13/14/18/22/25/26/28/32/33/36/41/50/51/57/60/64/100 × seven launchers × greedy/decent/aware × plain/Labs-5/Buddy/Calm. Hidden launchers bypass `modifiersFor`; Skipper also receives rebound actions. Inputs are stored, so future re-salts cannot move the replay. The save capture was subsequently corrected from a clean, untouched `git archive HEAD` in scratch: the Feats page ID is `feat`, and its completion is asserted before capture. These are v8 saves from the original build, not synthesized from v9 defaults. The corrected saves have P63 campaign and chapter-7 slot-3 Remix checkpoints, Little Chemist held, all 13 stamps, the requested pair/progress/history fields, album milestones and a completed/claimed Feats page.
2. **Versions and rule sets.** Added `RulesVersion`, supported/latest constants, per-mode rule sets, effective-version selection and the dormant Voyage cutover. v1 lists retain their original order in every mode. v2 holds planned Firemount/Rainbow lists, optional Flood, and campaign-only pebble. Planned IDs are separate contract types until S15-b installs their behavior. `ROUND_RULES_V0` retains its object identity and version 1. Salt tables moved intact to `rulesets.ts`, with their old `levels.ts` exports retained; both versions share the tables until the flip.
3. **Frozen layout inputs.** PP Trouble draws, non-PP `otherTaught`, Daily weather and `laterTwists` now read frozen lists. `otherTaught` intersects the frozen list with the round's runnable list, preventing new IDs from changing layout RNG draws.
4. **Explicit versions.** Threaded versions through all listed generators, Voyage generation/pre-flight/scene, mode scenes, campaign results/help, Remix scene, checkpoint fingerprints, scene fallback and solver defaults. Unstamped levels solve as v1. Rainbow-capable levels receive a fixed `bonusKind` from their own `-v2-bonus` stream in every seed family. There are no overlays or executable new effects yet. `levelMeta` also forwards its explicit version.
5. **Checkpoints and codes.** `restoreRound` keeps its signature and accepts supported versions; `restoreRoundWithVersion` returns the stamp. Round-save format remains 2. Nova validation uses the saved version's thresholds. Checkpoint reconstruction/fingerprints use the stored version, retaining v1's historical Remix fingerprint quirk. Missing checkpoint stamps mean v1, including re-saving under global play 2. The app checkpoint/start paths needed small additional version-only hunks beyond its Remix call to preserve this invariant. Codes use the CH effective version and remain `1-` at play 1 and 2; version-aware decoding passes the saved stamp to the challenge generator at its UI call site.
6. **Freeze guard/tests.** The guard remains exactly **60** campaign rows, plus the full legacy 61–120 fixture. Updated owned v1 fixture builders explicitly request version 1. The unowned `tests/sim/levels.snapshot.test.ts` stays untouched; the owned round-golden suite checks its complete `levels.default.snapshot.json` hash corpus with explicit v1 generation in both play loops, and also under the global play-2 mock. Level, round, Daily (early and late), Voyage and challenge suites exercise both play settings; save goldens migrate/resume at both. The world/flight suites are version-independent and also run with the global play-2 setup. Added conditional Vitest setup and the `RULES_PLAY=2` sim self-test, including a real global-play-2 checkpoint re-save.
7. **Save v9.** Added sanitized/sorted/unique campaign `wonder` entries (1–120), `wonderSeen`, monotonic `rulesSeen`, and `m15Migrated`. Pair cleanup runs only when play exceeds `rulesSeen`, including pairs recorded after v9 installation. Field Guide display uses play-rule pair availability; recording uses round-rule availability. The stamp mask/title requirements, stars and album reward data remain unchanged. Album invariance is tested across all save goldens.

## Capture SHA-256

- `tests/fixtures/saves/m-release-1.2.v8.json`: `59573ee6cfdab36cc91cab7dc1be4d27f4d59182ba589e35415174d8dbf687e3` as captured; `d7510820777b5a2f9a042e0a8e9531c431a54a981511b7b2c03e841a99a7ffe4` after Prettier formatting (same JSON content)
- `tests/fixtures/saves/m-remix-checkpoint-1.2.v8.json`: `ed70ea6eb56712a55265c3e200ef9fd063b5c723f0be9545975317575eb5fba6` as captured; `90000f7bb3a8f81685eaed11b269a3f8bb8b45993d6e1417e692c57e71ffa5c9` after Prettier formatting (same JSON content)
- `tests/fixtures/rules/round-v1.json`: `726c26f868d0509b29f25334ced5e7537426bf738b3b4d1e17a7f147f811e8c6`
- `tests/fixtures/challenge/v1-codes.json`: `36ffc9ece9e6534172fbf4af36d03bf58c4727f660f8af269c008609c8db9462`
- `tests/fixtures/daily/frozen-days-late.json`: `a61679d24ff4ef51d605438ffc95b41f13b2a11aeda2cabe3526d4d6f9108275`

Capture harnesses and command logs: `/private/tmp/m15-s15a/`. The first capture used unchanged workspace source. The save-only correction used `/private/tmp/m15-s15a/original/`, exported read-only from the same HEAD. The round JSON is one row per line and is never regenerated by the tests.

## Map/code contradictions and compatibility decisions

- **Frozen Voyage pre-flight:** the map assumes changing pre-flight from implicit `rulesForLevel(L.n)` to the capped stop rules preserves all v1 bytes. It does not: the first check changed frozen Voyage hashes at taught 16 (including 2027-W02 south). Historical v1 generation used capped rules while historical pre-flight used uncapped `n`. v1 pre-flight therefore receives explicit `rulesForLevel(n, 'voyage', n, 1)` to preserve the shipped selection/theme-goal contract; v2 pre-flight receives the stop's own rules. The scene always uses the stop's capped rules. No frozen row was rewritten.
- **Challenge check letter:** its multiplier and alphabet size allow a version-prefix edit to retain the same check letter. Merely accepting every supported prefix made the existing typo test fail. Decoding checks support, checksum **and the CH effective version**, so a non-effective `2-` prefix stays invalid while CH is v1. All 32 real codes remain identical.
- **RoundRules structural compatibility:** its `version` property remains the existing numeric structural type so unowned Lab tests/callers that infer `{version: number}` keep compiling. Public version arguments and `RuleSet.version` use `RulesVersion`; persisted stamps validate against `RULES_SUPPORTED`.
- S15-b still owns the behavior tables, actual overlay composition, extra-throw/flight/UI hooks, unlocks, sticker implementation, dev hook, CI grep change, product/QA docs and glossary work. This part adds no such machinery.

## Strings and numeric invariants

New/changed/removed English UI keys: **0**. No locale files changed. Play stays **1**; latest/supported are **2** / **[1, 2]**; profile format is **9**; round-save format remains **2**; freeze guard remains **60**. v1 salt values, targets, launch content, title sets, stamp bits and economy values are unchanged. Flood is disabled pending T0.

## Verification

All required S15-a checks passed:

| Check                                                                                                                                                                          | Result                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                                                                                                            | Passed after the final source changes.                                                                                                                                                                                                                                                                  |
| `npm test`                                                                                                                                                                     | **133 files passed; 1,422 tests passed, 18 skipped**, 52.69 s locally while sims were running. Log: `npm-test-verified.log`.                                                                                                                                                                            |
| Frozen suites with explicit play loops                                                                                                                                         | Passed inside `npm test`: campaign/legacy/modes/Remix/greedy/constants/default hashes, stored round steps, Daily early/late, Voyage, challenge codes, save migrations/resumes and album invariance.                                                                                                     |
| `RULES_PLAY=2 npx vitest run tests/round-v1.golden.test.ts tests/levels.snapshot.test.ts tests/daily-frozen.test.ts tests/voyage-frozen.test.ts tests/challenge-codes.test.ts` | **5 files / 29 tests passed**, 52.76 s. This additionally proves v1 fixtures survive the actual global shadow switch.                                                                                                                                                                                   |
| `RULES_PLAY=2 npx vitest run tests/rules.snapshot.test.ts tests/flight.snapshot.test.ts`                                                                                       | **2 files / 6 tests passed**. These APIs have no play input; their bytes also match under the test-only global switch.                                                                                                                                                                                  |
| `RULES_PLAY=2 SIM=1 npx vitest run tests/play-version.sim.ts`                                                                                                                  | **2 tests passed**: default rules at P63 are v2; late Daily hashes stay frozen; a v1 checkpoint re-saved with the global default at 2 stays v1.                                                                                                                                                         |
| `TZ=UTC npx vitest run tests/dates.test.ts tests/almanac.test.ts tests/daily-frozen.test.ts tests/voyage-frozen.test.ts`                                                       | **4 files / 19 tests passed**.                                                                                                                                                                                                                                                                          |
| `TZ=UTC SIM=1 npx vitest run tests/sim/calendar-preflight.sim.ts`                                                                                                              | **1 test passed**. The 7-day/1-week quick calendar matrix has 21 Daily layouts and 70 Voyage stops, 0 issues.                                                                                                                                                                                           |
| `npm run sim:quick`                                                                                                                                                            | **5 tests passed**, matching the pre-edit run's 5 passing checks.                                                                                                                                                                                                                                       |
| Quick sim numeric comparison                                                                                                                                                   | Re-ran both the untouched HEAD archive and final workspace with `npm run sim:quick -- --disableConsoleIntercept`. **All 117 metric lines are identical**, excluding only the measured `Quick sim` elapsed time. Normalized SHA-256: `ec4b1f6531ad4670c42f287314ed8bf9af37f05309ab4008614f2a504b911301`. |
| Fixture hashes                                                                                                                                                                 | **32 pre-existing fixture/snapshot files unchanged; all five final capture hashes match**. `tests/sim/levels.default.snapshot.json` is also verified by its per-level hashes in both play loops. No tracked fixture JSON changed.                                                                       |
| Formatting and whitespace                                                                                                                                                      | Package-owned TypeScript/config/handoff files pass Prettier; `git diff --check` passes. Captured fixture bytes were excluded from rewriting.                                                                                                                                                            |

The quick sim retains the baseline's **30 diagnostic lint flags and 9 band misses**; it adds none. Other matching metrics include the 18-point aware/blind three-star gap, 19.791666666666668 frost per ten, 0 surprise bonks, and the Trouble teaching aggregate (blind 5.8%, aware −0.5%, max loadout 4.3%). These are baseline observations, not new tuning.

Logs, normalized metric text, the comparison script/result, pre-existing hash manifest, capture hashes and both capture harnesses are retained in `/private/tmp/m15-s15a/`. CI wall time cannot be measured from this local session; the integrator should check the PR verify budget. Playwright was not run, as instructed.

## Files

- Core: `src/core/{rules-version,rulesets,round,levels}.ts`.
- Meta: `src/meta/{profile,modes,remix,voyage,help}.ts`.
- UI version/pair call sites only: `src/ui/{app,game,fx}.ts`, `src/ui/flows/{modes,results}.ts`, `src/ui/screens/{voyage,fieldguide}.ts`.
- Updated owned tests: `tests/{round,saves,migrate,resume,levels.snapshot,daily-frozen,voyage-frozen}.test.ts`.
- New tests: `tests/{round-v1.golden,challenge-codes,album-invariance,fieldguide-pairs}.test.ts`, `tests/setup/play-v2.ts`, `tests/play-version.sim.ts`; conditional setup only in `vitest.config.ts`.
- Five captured fixtures listed above, and this handoff.

Pre-existing modifications to `docs/handoff/05-status-and-next.md` and the untracked build-map documents were left untouched. Formatting ran only on this package's files; no global `npm run format` was used because it could rewrite unowned work and captured JSON bytes.

# M15 step 0 — S15-b (part b)

Scope: tables, seams and generic UI hooks, on `5e8637307bc5f5910187e489618e0ce7b3220194` (S15-a committed), 14 October 2026. No commits, installs, translations, owner actions or play flip. `RULES_VERSION = 1`, `REMIX_RULES = 1`, `includeFlood = false`; Voyage's cutover remains absent. The v1 freeze guard remains 60.

**Status: owned implementation built; package completion waits for the four-file ownership patch below.** The map omitted two exhaustive ID maps and a launch-only reaction test from S15's ownership. App ownership allows only its Remix rules hunk, but its generation, final settlement and checkpoint restore paths also need the exposed hooks. Those four workspace files are unchanged from HEAD. A review copy contains the exact proposed patch and is tested separately. Do not mark S15-b green or start A15–D15 until that patch is applied and workspace checks are repeated.

## Per-bullet delivery

| S15-b bullet               | Delivery / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REACTIONS data             | `ReactionDef` carries named-land `triggers`, `radius`, sector `effect`, `charge`, `priority`, Field Guide copy and an optional extra source. All five launch effects and their evaluation order are preserved. `REACTION_PRIORITY` is steam → rainGarden → wildflowers → glacier → firemount → rainbow → scorch → flood. The launch `REACTION_IDS` inventory stays five entries; rule sets choose executable IDs. The three B15 rows are disabled data stubs with the specified triggers, radii 1/2/1 and charge 3/3/0. B15 replaces their empty effects and removes `enabled: false`; Flood remains excluded from shipping rules.                                                                       |
| TROUBLE_BEHAVIOUR          | Exhaustive record over vent/vine/frost/pebble: clear context, perk resolver or `null`, Calm flag, Buddy traits, effect, repaint, firebreak, target, forecast, shape/VO, help forms, aim/act/settled copy and feel/source art. Forecast and stepping use the same target/effect/repaint functions. Source colors and glyphs, trait badges, help and aim labels read data. Legacy guard attribution, including the pre-clear Rinse decision and the historical post-clear Weed Burner check, stays intact. Pebble's stub has `perk: null`, no Buddy counters and a distinct pentagon. A Rain Cloud Supernova never emits a pebble Lab Guard event.                                                         |
| Extra throw plumbing       | Optional `extraUsed`, `extraSource`, `bonusKind` and slot metadata are absent on normal v1 core states. `grantExtraThrow` returns `{source, kind}`, enforces the shared once-only flag and uses the fixed object. `StepResult.extraThrow` is optional. Contact effects precede landing reactions, so the first source wins. Scene and solver append the fixed object to the playable budget, including an already pre-dealt final object; the harness also models this extra budget. Repeated events cannot add a second throw.                                                                                                                                                                          |
| Badge / toast hooks        | `LevelScene.showExtraThrow(source)` binds the HUD helper. The generic consumer handles `StepResult.extraThrow`; B15/C15 do not need to edit HUD or re-grant the throw. Badge sits within the count's numeric line, so it adds no counter row. One replaceable `role=status` toast and a spoken label identify Rainbow or a mote. No animated badge or Wonder HUD target.                                                                                                                                                                                                                                                                                                                                 |
| Next reach preview         | `wideNext` widens `stepRound` and therefore the existing landing preview, consumes on a landed or missed next throw, and uses reach cap 4. Rinse uses the actual widened Rain Cloud footprint. `previewReach` and the scene method expose the capped numeric footprint; HUD describes and labels the next throw. Tests compare preview and transition and check the cap.                                                                                                                                                                                                                                                                                                                                 |
| English / VO placeholders  | `M15_STRINGS` / `M15_DEFERRED_KEYS` provide 25 draft/reused keys, including source toasts, badge, reach, pickup names and Pebble forecast VO. 24 are newly added to `_keys.json`; Rainbow already exists. No translations were written.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| world / flight seam        | `FlightWorld.pickups` uses viewport pixels. `FlightHit` gains `{kind:'pickup', index}`; pass-through contacts go in optional `FlightResult.touched`, never terminal `hit`. Swept segment contacts are ordered and deduplicated across frame chunks through `FlightLaunch.touched`. No pickup world means no added result/state fields. Whole and chunked flight agree and land normally after contacts.                                                                                                                                                                                                                                                                                                  |
| RoundAction.pickups        | Optional `(Pickup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | MoteDef)[]`carries own-flight contacts. **Undefined means sector model; an empty array means physical flight touched nothing.** Scene and physical harness preserve that distinction, including contacts before a miss. Area footprints are never pickup contacts. A15 can inspect the clear context even when`landed` is false; launch counters still require a landing. |
| overlayV2                  | Campaign-only composition calls reactionOverlay → pebbleOverlay → moteOverlay, guarded by version and PP seed. `OverlayCtx.seed` is the salted random seed; no layout RNG is handed to an overlay. Start/queue/Troubles are re-read before solving targets/goals. An overlay can supply its own goal array. Stubs return the input unchanged.                                                                                                                                                                                                                                                                                                                                                            |
| RoundAssists / Wonder seam | Scene records continues, power/aim boosters, help, hints, practice, Gentle and full aim, own/in-rule/ignored budgets and the score when the own budget closes, including a resolved miss or a voluntary early finish. Momentum/Shower and later ignored throws cannot overwrite that judged score. Resume merges previously used assists with current assist settings. Settlement accepts a final `WonderRound` or step-evidence fallback and calls the inert `recordWonder` stub only for a completed 3-star campaign budget. Wonder stickers are an empty stub. **The candidate App patch passes the final record and restores the saved hooks; those call sites are still pending in the workspace.** |
| Field Guide / play rules   | Pair lookup, unknown-versus-Nothing-happens display and discovered reaction lists use the play rule set. New Field Guide lines come from reaction data. Launch stamp/title sets stay fixed. S15-a's round-rule pair recording and flip cleanup remain in force.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Unlock rows                | 42 Wonder has `sincePlay: 1`, no intro/button/letter and requires `lateOpen` plus P42; this preserves Wonder's independence from the flip. 52 Pebble, 56 Motes, 63 Firemount and 67 Rainbow require play 2. Flood 74 exists only with includeFlood. `unlocksForPlay`, `unlocked` and `debutsAt` accept explicit play arguments. One intro/letter/button per planet is tested through 120.                                                                                                                                                                                                                                                                                                                |
| Late arrivals              | `lateArrivalIntro` checks actual Trouble/mote presence, reachable object pairs and start or makeable trigger lands. A Rainbow-reachable fixed bonus is included in the queue. Cost order is Pebble, then Flood, then upside in debut order. Seen ideas wait for another round containing them. A 52–120 synthetic corpus always chooses an unseen pebble first. M15 cards use existing local coach history and skip the legacy Inbox-letter callback. Old M3 migration does not pre-mark new rule intros as seen.                                                                                                                                                                                        |
| Stickers / album           | `LAUNCH_FUSION_IDS` is four entries; `FUSION_IDS` is the compatibility alias. `REACTION_STICKERS` is pinned to that list. Firemount/Rainbow stickers are explicit bonus rows, visible by play rules, with existing once-only discovery dust. Empty `WONDER_STICKERS` is spread in. Bonus rows never enter pages or milestone gems. All save goldens compare album readiness, Feats completion and claimed pages at both plays; extra discoveries do not change launch title/stamp requirements or album gems.                                                                                                                                                                                            |
| TEACH lint                 | `TeachRow` and `teachRows` compose launch rows plus the A15/B15/C15 stub arrays. Launch predicates are preserved. Lint accepts explicit play and builds each checked level with it. A15 fills TEACH 52, C15 56, B15 63/67 and gated 74. No false TEACH claim is made before their overlays exist.                                                                                                                                                                                                                                                                                                                                                                                                        |
| flying.ts                  | The harness converts the same planet-relative pickup geometry into viewport pixels and accepts an explicit pickup override. Physical contacts enter round actions; motes are remembered between throws.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Clash counts               | `harness.ts` counts by `REACTIONS[id].kind`, not scorch ID. Its rule defaults derive version and mode from the level. Legacy quick-sim metrics remain identical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Glossary                   | Firemount, Rainbow and Flood noun rows use `since: 'M15'`. BUILT is unchanged. The never-list still rejects actual source calls and translations; only the exact deferred M15 English inventory key is exempt while its milestone is unbuilt.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Dev hook / CI              | Main's DEV block sets `window.__rulesPlay` from `?rules=2`. Owned entry-point defaults use `rulesPlay()`, which reads that hook only inside a DEV branch. The proposed App generation hunk preserves saved versions and lets a fresh campaign use it. CI's production dev-tool grep adds __rulesPlay. Production candidate build contains none of the prohibited hook names.                                                                                                                                                                                                                                                                                                                             |
| Docs                       | ROADMAP-v2 §10 appends decisions 97–110 after 96 and the existing amendments, all open/default applied. FLIGHT amends Pebble's 52/60 placement, catch originality and the post-freeze scope of rules; the two unspecced candidates are dropped. QA sheet has blank T0 rows 52/56/58/60/63/64/67/74, comprehension, face cards, paired launcher aim/bounce tallies and the non-waivable Flood/launcher checks. No owner results are invented.                                                                                                                                                                                                                                                             |

## Exact exposed signatures and imports

```ts
// src/core/v2/overlay.ts; OverlayCtx is also exported by src/meta/m15types.ts
interface OverlayCtx {
  seed: string; // salted random seed, for an overlay's own suffixed stream
  rules: RoundRules;
  includeFlood: boolean;
}
export function overlayV2(L: LevelDef, ctx: OverlayCtx): LevelDef;

// src/core/v2/pebble.ts
export const PEBBLE_BEHAVIOUR: TroubleBehaviour;
export function pebbleOverlay(L: LevelDef, ctx: OverlayCtx): LevelDef;
export function pebbleHang(L: LevelDef, target: number, spinPhase: number): Pickup | null;

// src/core/v2/reactions.ts; ReactionDef comes from src/core/round.ts
export const V2_REACTIONS: Record<'firemount' | 'rainbow' | 'flood', ReactionDef>;
export function reactionOverlay(L: LevelDef, ctx: OverlayCtx): LevelDef;

// src/core/v2/motes.ts; MoteDef is re-exported there
export const MOTE_RULES: { readonly teach: 56; readonly from: 58; readonly reach: 1; readonly cap: 1 };
export function moteOverlay(L: LevelDef, ctx: OverlayCtx): LevelDef;
export function applyMote(state: RoundState, mote: MoteDef): void;

// src/meta/m15types.ts; Pickup is also re-exported by src/core/flight.ts
export type MoteDef = { kind: 'throw' | 'wide'; x: number; y: number; r: number };
export type Pickup = { kind: 'pebble' | 'mote'; x: number; y: number; r: number };
export type ExtraThrowSource = 'rainbow' | 'mote';
export interface RoundAssists {
  continues: number;
  powerBooster: boolean;
  aimBooster: boolean;
  help: boolean;
  hints: boolean;
  practice: boolean;
  gentle: boolean;
  fullAim: boolean;
  ownThrows: number;
  inRuleExtras: number;
  ignoredExtras: number;
  judgedScore?: number;
}
export interface WonderRound {
  n: number;
  score: number;
  version: RulesVersion;
  assists: RoundAssists;
}

// src/core/round.ts
export function grantExtraThrow(state: RoundState, source: ExtraThrowSource): StepResult['extraThrow'];
// Optional StepResult.extraThrow: { source: ExtraThrowSource; kind: Kind }
// Optional RoundAction.pickups: (Pickup | MoteDef)[]
// Optional RoundState.extraUsed, extraSource, extraAt, wideNext, bonusKind, motesTaken, assists
// LevelDef.pebbleCloud?: {x: number; y: number}; LevelDef.motes?: MoteDef[]

// src/ui/game.ts: bound hooks, as B15/C15 will call them
class LevelScene {
  showExtraThrow(source: ExtraThrowSource): void;
  previewReach(extra: number): number;
  consumeExtraThrow(result: StepResult): void;
  restoreRoundHooks(state: RoundState): void;
  closeWonderBudget(force?: boolean): void;
  roundAssists(): RoundAssists;
  roundWonder(score: number): WonderRound;
}
// src/ui/hud.ts: stateless implementation used by the bound hook
export function showExtraThrow(scene: LevelScene, source: ExtraThrowSource): void;
// src/ui/aimtag.ts
export function previewReach(extra: number, base?: number): number;

// src/meta/wonder.ts; RoundAssists is re-exported here, by game.ts and roundSettlement.ts
export const WONDER_STICKERS: Sticker[]; // empty until D15
export function recordWonder(p: Profile, n: number, score: number, version: RulesVersion, assists: RoundAssists): { first: boolean };

// tests/sim/teach/index.ts
export interface TeachRow {
  n: number;
  idea: string;
  check: (level: LevelDef) => boolean;
  sincePlay?: RulesVersion;
}
export function teachRows(play?: RulesVersion): TeachRow[];
// PEBBLE_TEACH, MOTE_TEACH and REACTION_TEACH are currently empty TeachRow[] arrays.

// src/meta/unlocks.ts
export function unlocksForPlay(play?: RulesVersion): Unlock[];
export function lateArrivalIntro(L: LevelDef, seen: ReadonlySet<string>, rules?: RoundRules, play?: RulesVersion): Unlock | undefined;

// src/core/rulesets.ts, main.ts
export function rulesPlay(): RulesVersion;
// DEV only: window.__rulesPlay: 1 | 2
```

Geometry convention: stored `MoteDef` and `pebbleHang` are relative to the planet centre, in planet-radius units. `FlightWorld.pickups` is in pixels. Scene/harness convert using `cx + x*R`, `cy + y*R`, `r*R`. `spinPhase` is the rotation angle. `levelPickups(L, target, spinPhase, pebbleActive?)` is the shared geometry adapter; it places mote entries first and the active pebble last. `FlightResult.touched` is `Extract<FlightHit, {kind:'pickup'}>[]`; `FlightLaunch.touched` stores deduplicated indices.

C15's applyMote stub does nothing today. It should call grantExtraThrow for a throw mote or set wideNext for a wide mote. The scene supplies the actual MoteDef contact. Star solvers supply no mote contacts, while they do model the fixed Rainbow extra; the Wonder planner supplies its own sector contacts. Undefined/empty pickup arrays deliberately distinguish model and physical flight for A15.

### Supporting rule and table contracts

The S15-a imports remain available. These definitions are executable together with the new table rows:

```ts
// src/core/rulesets.ts
export interface RuleSet {
  version: RulesVersion;
  reactions: readonly RuleReactionId[];
  troubles: Readonly<Record<RoundMode, readonly RuleTroubleId[]>>;
  layoutTroubles: readonly Exclude<TroubleId, 'pebble'>[];
  layoutObstacles: readonly ObstacleId[];
  salt: { level: Partial<Record<number, number>>; raw: Partial<Record<number, number>> };
  pebbleTeach?: number;
  guardianPebblesFrom?: number;
  pebbleSubstituteFrom?: number;
  motesTeach?: number;
  motesFrom?: number;
  extraThrowCap: 0 | 1;
  novaThresholds: readonly number[];
}
export function effectiveVersion(n: number, mode: RoundMode, taught: number, play: RulesVersion): RulesVersion;
export function voyagePlay(week: string, play?: RulesVersion): RulesVersion;
// src/meta/voyage.ts
export function voyageRules(week: string, n: number, taught: number, play?: RulesVersion): RoundRules;
// src/core/round.ts
export function rulesForLevel(n: number, mode?: RoundMode, taught?: number, play?: RulesVersion): RoundRules;
export function restoreRound(json: string): RoundState | null;
export function restoreRoundWithVersion(json: string): { state: RoundState; rulesVersion: RulesVersion } | null;
// src/core/levels.ts
export function makeLevel(n: number, seedPrefix?: string, o?: LevelOptions): LevelDef;
export function rulesForSeed(seed: string, play?: RulesVersion): RoundRules;
// LevelOptions.rulesVersion?: RulesVersion
```

`TroubleBehaviour` and `TroubleClearContext` are exported from `src/core/troubles.ts`. Clear context includes `state: RoundState`, `planet`, the **cloned** mutable `trouble`, `action`, optional `reaction`, `nova`, `distance`, `guard`, `rainReach`, and `landed`. A15 can distinguish Guardian pebbles through `state.guardianHp`; v2 boss scenes and solvers supply it. Every launch row owns its Rain Cloud Supernova counter, so the Pebble row can use its own target geometry instead of a hardcoded source-distance shortcut. The previous round state is evidence and must stay untouched; only the cloned Trouble is mutable.

The table interface exposes `clear(ctx)`, `perk(ctx) | null`, `calm`, `buddy`, `effect(planet, trouble, at)`, `repaint(planet, trouble)`, `firebreak(planet, sector, guard?)`, `target(planet, trouble)`, `forecast`, `forecastShape`, optional `forecastLabel`, `helpLine`, `aimTag`, `actLine`, `settledLine`, `feel`, `sourceGlyph`, `sourceColor`, `actKind` and `settleOnClear`. Exhaustiveness is enforced by the record type, with behavioral checks and the frozen round replay. Existing `LAB_TEACH` and `GUARD_OF` are unchanged.

## Map/code contradictions resolved or held

1. **Owned-file omissions, held for approval.** Widening the public IDs requires `COUNTERS.pebble = []` in buddy.ts and three placeholder colors in the art map. The unowned reactions test enumerates all data rows but asserts only launch teaching; it must restrict that assertion to RULESETS[1] with explicit v1 arguments. App also bypasses the dev default through an explicit global constant and does not call the new restore/final-record hooks. See the exact pending patch below.
2. **Bonus before Rainbow.** A throw mote can debut at 56, eleven planets before Rainbow. The old S15-a bonus deal covered Rainbow families only. The generator now also deals from the same `-v2-bonus` stream when an overlay supplies an Extra Throw mote, before solving. Wide-only motes require no bonus object. No current v1 or calendar fixture gains a key or RNG draw.
3. **Queue meaning.** Level queues already hold reserve objects beyond the planet's budget. Literal `queue.push(bonus)` would never deal that object at the new final throw. The generic consumer puts it at the end of the playable budget, updates cur/next when already dealt, and saves its slot. Once judging closes, ignored-throw extras cannot move that score.
4. **Wonder gate.** The map says every new ladder row waits for play 2, but also says Wonder can ship on v1 independently of the flip (decisions 105/110 and D15's contract). The P42 row therefore explicitly allows play 1, has no intro/button/letter and creates no visible S15 feature. All round-content rows remain play 2. This lets D15 use the common unlocked/lateOpen gate without duplicating or bypassing it.
5. **Draft glossary keys.** `_keys.json` must contain deferred Star Motes while BUILT must exclude M15; the never-list otherwise rejects that English inventory. The exception is exact and inventory-only, scoped to M15 deferred keys. It does not permit actual source calls or translations and does not touch BUILT or M12–M14 work.
6. **Daily type.** The public TroubleId now includes pebble, but a Daily can never run it. DailyLevel narrows its Trouble IDs to the frozen list; runtime weather and hashes are unchanged. This avoids changing the launch-only weather map in the unowned features test.
7. **Save shadow tests.** The original loadSave helper explicitly loaded play 1, then its idempotence assertions migrated again with the global play-2 default. The helper now defaults to the actual test play, and the default-profile expectation stamps that play; the explicit 1/2 golden loops remain. V2 restore expectations include the specified backfilled fields (extraUsed, integral wideNext, and Pebble target/count); no fixture is regenerated.

## Pending compatibility patch

Review artifact: `/private/tmp/m15-s15b/required-compatibility.patch` (not applied to this workspace).

- `src/meta/buddy.ts`: one empty pebble counter row; no new Buddy trait.
- `src/ui/art/reactions.ts`: three dormant placeholder colors, including a red Flood; B15 owns final icons/art.
- `tests/reactions.test.ts`: the five launch-pair teaching assertion explicitly uses the frozen v1 list and v1 rules.
- `src/ui/app.ts`: import rulesPlay for a fresh campaign while retaining saved versions; pass the final WonderRound to settlement; call restoreRoundHooks after restoring counters. Optional calls preserve headless/legacy scene doubles.

The review tree is `/private/tmp/m15-s15b/review-tree`, with current owned files plus only those hunks. Workspace copies of all four files were compared byte-for-byte with HEAD. During review setup the patch was briefly applied in the workspace by mistake, immediately reversed, then applied only in scratch; no such hunks remain here.

## Deferred English inventory

**24 added keys, 0 removed or changed keys, no translations.** `Rainbow` is reused and is the 25th value in M15_DEFERRED_KEYS. These values are listed by m15strings.ts and `_keys.json`; the latter retains every previous key.

- "A pebble made a little dent"
- "A pebble makes a little dent in the marked land."
- "Catch a Space Pebble on the way to the land. Mountains stop it."
- "Catch a Star Mote for an extra throw or a wider next throw."
- "Catch it with your throw. Mountains stop pebbles."
- "Extra Throw"
- "Extra throw from {source}"
- "Firemount"
- "Flood"
- "Flood is good for sea friends, but forests become marsh."
- "Next throw reach: {n}"
- "Rainbow added one throw!"
- "Rock finds hot land, or Magma finds a mountain, to make Firemount."
- "Space Pebble"
- "Space Pebble over sector {n}, lands in {k} throws"
- "Star Mote"
- "Star Mote added one throw!"
- "Star Mote: Extra Throw"
- "Star Mote: Wide Shot"
- "Star Motes"
- "Sunburst finds wet land, or Rain Cloud finds dry land, to make Rainbow."
- "The next throw reaches wider."
- "Wide Shot"
- "Wonder"

## Verification log (part b)

Logs and manifests live in `/private/tmp/m15-s15b/`; they are package logs, not roadmap entries. Verification distinguishes the owned workspace from the review candidate. The pending patch is required for the workspace's typecheck and launch-only reaction test.

| Check                                                         | Result                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace `npm run typecheck`                                 | **Blocked by exactly two ownership gaps**: buddy's missing pebble row and the reaction-art map's three missing IDs. Log: `workspace-typecheck-ready.log`. No other type errors.                                                                                                                                                                                                                     |
| Review candidate `npm run build`                              | Passed (`tsc --noEmit && vite build`), log `build-complete.log`. Also explicitly ran `npm run typecheck` in the review tree; passed.                                                                                                                                                                                                                                                                |
| Workspace `npm test`                                          | 130 files pass; 1,429 tests pass, 18 skip, 11 fail. Ten failures are the 24 deferred keys in five locale assertions imported by two test files; the eleventh is the unowned launch-only reaction enumeration. `workspace-npm-final.log`.                                                                                                                                                            |
| Review candidate `npm test`                                   | **131 files pass; 1,432 tests pass, 18 skip; only the ten expected missing-translation assertions fail.** No non-translation failures. `review-complete.log` (52.29 s).                                                                                                                                                                                                                             |
| `RULES_PLAY=2` frozen/save/album/Guide matrix                 | **12 files, 249 tests passed**. Round replay, default/legacy/campaign/mode/Remix/greedy/constants level fixtures, Daily early/late, Voyage, challenge, world/flight, all save formats/resumes, album and Field Guide. `shadow-final.log` (53.23 s), plus the final five-file round/save/album/Guide shadow pass: 189 tests in `shadow-complete.log`. The snapshot builders explicitly request v1.   |
| Latest Trouble/round contract pass                            | **4 files, 68 passed, 1 skipped**, including the stored round replay, table dispatch, pickup/extra/reach/Guardian context contracts. `round-ready.log`.                                                                                                                                                                                                                                             |
| `RULES_PLAY=2 SIM=1 npx vitest run tests/play-version.sim.ts` | **2 passed**: the global shadow selects v2 at 63, keeps late Daily hashes and re-saves an old checkpoint as v1. `play-version-complete.log`.                                                                                                                                                                                                                                                        |
| `TZ=UTC` calendar/date suites                                 | **4 files, 19 passed**: dates, almanac, frozen Daily and frozen Voyage. `calendar-utc.log` (33.20 s).                                                                                                                                                                                                                                                                                               |
| `TZ=UTC SIM=1` calendar pre-flight                            | **1 passed**: 21 Daily layouts, 70 Voyage stops, 0 issues. `calendar-preflight-utc.log`.                                                                                                                                                                                                                                                                                                            |
| `npm run sim:quick -- --disableConsoleIntercept`              | **5 passed**. Final run `quick-ready.log`: all **117** normalized metric lines equal the before-edit baseline, including 30 existing lint flags and 9 band misses. Normalized SHA-256 `ec4b1f6531ad4670c42f287314ed8bf9af37f05309ab4008614f2a504b911301`. `quick-ready-comparison.json`.                                                                                                            |
| Frozen file bytes                                             | **34** files from S15-a's frozen-file manifest compare byte-for-byte with current HEAD; **30** files in the S15-b starting fixture/snapshot manifest are unchanged. No fixture JSON was edited. The old S15-a scratch manifest's pre-format save digests are not used as a new baseline; its handoff already records the corrected save captures. `head-fixture-check.json`, `fixture-hashes.json`. |
| Album / Field Guide / noun cap                                | Passed in the full candidate and shadow runs; all saved album claims/pages/readiness stay invariant and the planet-20 noun suite remains green.                                                                                                                                                                                                                                                     |
| Production dev hooks                                          | Candidate production JS/HTML scanned: **0** matches for `Balance Report\|__app\|__i18n\|__scene\|__gate\|__rulesPlay`. `dev-hook-check.json`.                                                                                                                                                                                                                                                       |
| English inventory                                             | **24 added, 0 removed**, no locale translations changed. `key-diff.json`, `keys-final.log`. Rainbow is reused.                                                                                                                                                                                                                                                                                      |
| Formatting / whitespace                                       | Only owned files formatted; fixture bytes excluded. `git diff --check` passes. Final owned-file Prettier check recorded separately.                                                                                                                                                                                                                                                                 |

The final HUD guard hides a next-throw reach line when no throw remains. Core restore backfills Pebble target/count and rejects a fractional reach flag. The passive budget-close hook also covers v1 misses that do not tick Troubles, and voluntary early finishes, without changing scores or rewards. The review candidate was refreshed for the final hook and table changes; the latest targeted check covers their contracts. The direct App final-record/restore wiring and the dev-generation call are part of the review patch, not an assertion that the workspace already contains them.

No Playwright run, CI wall-time measurement, child playtest, translation or production ship was performed. The lead still owns 320×568/six-language rendered UI and VoiceOver/Reduce Motion e2e checks, A15–D15 behavior/sims, their v2 snapshots, and integration/flip gates. The new features remain dormant.
