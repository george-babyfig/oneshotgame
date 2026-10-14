# Build map: M15, M16 and M17

Lead architect's plan. Written 14 October 2026 against HEAD `3f9c4d3` on branch `claude/eager-planck-yfnmzf`. Read-only: no repo file was edited. The only command that ran against the repo was one scratch probe, which printed the planets 40-80 layout and the unlock rows 36-120; `git status` stayed clean.

**Revision 2 (same day).** All 36 points of the adversarial critique were checked against the code at `3f9c4d3`. 32 were applied as written (some with additions), 4 were applied with a stated change (points 5, 6, 10 and 18), and none were rejected outright. The verdict for each point, with the evidence, is in the **Critique log** at the end. The biggest changes are:

- per-mode Trouble lists, so Space Pebble can't leak into Voyage;
- an explicit play-version argument on every generator, checkpoint and code entry point, and v2 runs of the frozen suites in PR;
- v1 rows 61-120 are frozen at the flip, not in S15;
- Wonder has no HUD notch, and all new stickers are bonus stickers;
- the Collector's Edition (CE) gets its own `saleFrom` gate and a contents quote;
- a Road 2 content track (R2), wave W1.5;
- `HOMEWORLD_MAX_LEVEL` stays the open level;
- the Landmark queue gets `eligibleOn`;
- Homeworld Levels 7-10 no longer need unreviewed planets.

Abbreviations:

- RM = `docs/product/ROADMAP-v2.md`
- FL = `docs/product/FLIGHT.md`
- HW = `docs/product/HOMEWORLD.md`
- `file:line` = a reference at HEAD
- **Now** = safe to build today, dormant or behind a flag
- **Deferred** = waits for the named owner action

---

## §0 Read this first

### 0.1 Facts that changed since the specs were written

| Fact                                                       | Value at HEAD                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Consequence for M15-M17                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decisions                                                  | RM §10 runs to **96** (with M13 amendments)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | This map records **97-126**, each "open, default applied"                                                                                                                                                                                                                                                                                                                                       |
| Planet-20 noun cap                                         | **21** (decision 60; `tests/nouns.test.ts:513`, EXPECTED_REGULAR = 21 nouns, compared with `toEqual`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | No new counted noun may render at `p.level <= 20`. Star Road opens at 22, Passport at 21, Voyage at 24                                                                                                                                                                                                                                                                                          |
| Round rules                                                | `RULES_VERSION = 1` (`src/core/rules-version.ts:2`), frozen in M8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `RoundRules.version` (`round.ts:28`) is **never read**. Bumping the constant today silently discards every checkpoint (`round.ts:639`, `profile.ts:163/234`), rejects every challenge code (`modes.ts:116`), fails `saves.test.ts:348` (the P33 checkpoint in the f/g goldens) and fails `round.test.ts:97-104`                                                                                 |
| Frozen fixtures                                            | `tests/rules.snapshot.test.ts` covers **world.ts only**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Reactions, Troubles, Combos, Labs and launcher round paths have **no step-level golden**. One must be captured before `round.ts` is touched (S15)                                                                                                                                                                                                                                               |
| Level freeze                                               | `levels.snapshot.test.ts:52-57` keeps rows 1-60 of `campaign-PP.json` and all of `legacy-PP-61-120.json` byte-identical, even under `UPDATE_FIXTURES`                                                                                                                                                                                                                                                                                                                                                                                                                  | Rows 61-120 of `campaign-PP.json` (raw-v2) are updatable today. They are the only curve lever for v1 players (FL §4.9: the 61-120 curves are a Watch that becomes a Gate after one release), so they stay updatable until the **flip PR** freezes them (decision 97). `LEVEL_SALT`/`RAW_LEVEL_SALT` (`levels.ts:159, 217`) are not keyed by version, so S15 makes the salt lookup version-aware |
| Generator reads current rules                              | `buildLevel` uses `rulesForSeed(seed)` (`levels.ts:368-372, 832`). The PP Trouble draw uses `Object.keys(TROUBLES)` (`levels.ts:648`). Every other family draws from `otherTaught = o.rules.troubles` (`levels.ts:628-630`). The obstacle draw loops over every OBSTACLE (`levels.ts:68-76`). The Daily weather uses `Object.keys(TROUBLES)` with `taught = p.level`, which is unbounded (`modes.ts:38`, `flows/modes.ts:101`)                                                                                                                                         | Adding a REACTIONS/TROUBLES/OBSTACLES entry moves frozen planets, shipped Dailies (only for `p.level ≥` the new debut) and Voyage stops. Every list that feeds layout RNG must come from a frozen v1 table, and that includes `otherTaught`                                                                                                                                                     |
| Voyage and Remix read rules blindly                        | Voyage generation calls `rulesForLevel(Math.min(n, taught))` in the default `'campaign'` mode (`voyage.ts:113`). Its pre-flight `solve0`/`solve2` (`voyage.ts:127-128, 144-145`) use the default `rulesForLevel(level.n)` (`levels.ts:300, 363`). The Voyage scene takes rules from `p.level` (`screens/voyage.ts:217`). Other version-blind call sites: `flows/modes.ts:113`, `flows/results.ts:257/260`, `app.ts:831` (Remix scene), `help.ts:102`, `profile.ts:158`, `game.ts:448`. Remix reactions run up to cap 119-120 (`remix.ts:24-31`). Voyage `n` reaches 67 | Without per-mode lists and an explicit version, a v2 list puts the pebble into Voyage from cap 52, and the flip re-rolls frozen Voyage weeks with n ≥ 63, whatever the Voyage cut-over says. Rainbow would fire on RX and VOY levels that have no bonus object                                                                                                                                  |
| Album rewards                                              | Every 10 non-bonus stickers pay 10 gems (`stickers.ts:212-217`, `tuning.ts:1263`). The Feats page pays 60 gems and counts kind `'fusion'` (`stickers.ts:198-199`, `tuning.ts:1260`). `REACTION_STICKERS` derives from `Object.keys(REACTIONS)` (`stickers.ts:86-95`). The 'home' sticker is a non-bonus feat at `HOMEWORLD_MAX_LEVEL` (`stickers.ts:66-72`)                                                                                                                                                                                                            | Every new M15/M17 sticker is `bonus: true`, otherwise it pays gems and blocks or regresses the Feats page                                                                                                                                                                                                                                                                                       |
| Shop listing                                               | `productOpen` returns `true` when `opensOn` is absent (`starroad.ts:142-146`). `opensOn` means kid-side availability only (`m12types.ts:11-12`). The Grown-ups shop renders every `PRODUCTS` entry (`shop.ts:27`), and `canBuy` ignores `productOpen` (`app.ts:1334-1341`)                                                                                                                                                                                                                                                                                             | A CE `ProductDef` is listed, and buyable once Apple returns a price, from the build that adds it. It needs its own sale gate (`saleFrom`)                                                                                                                                                                                                                                                       |
| Homeworld max                                              | `HOMEWORLD_MAX_LEVEL = max(keys(HOME_LEVEL_REQUIREMENTS))` (`tuning.ts:517`). It is read by `canExpand` (`homeworld.ts:437`), `nextup.ts:219/257/325/355`, `panel.ts:194/356/418`, `canvas.ts:515`, `starmap.ts:43-49`, `structures.ts:348`, `sheets.ts:1044`, `stickers.ts:70-71` and `profile.ts:805/1154`                                                                                                                                                                                                                                                           | Adding rows 6-10 to the table opens Level 6 at once. `HOMEWORLD_MAX_LEVEL` must stay equal to the open level                                                                                                                                                                                                                                                                                    |
| Test plumbing                                              | Vitest includes only `tests/**/*.test.ts`, or `*.sim.ts` with `SIM=1`, with a 30 s default `testTimeout` (`vitest.config.ts:5`). `RULES_VERSION` is a `const`. The CI dev-tool check greps only `Balance Report                                                                                                                                                                                                                                                                                                                                                        | __app                                                                                                                                                                                                                                                                                                                                                                                           | __i18n | __scene | __gate` (`ci.yml:25`) | Generators and sims need an explicit naming and run mechanism. A "play version 2" run needs a defined mechanism (§5). A new dev hook needs a `__`-name in the CI grep |
| Launcher roster                                            | Sling/Swoop/Zip/Thumper (decision 51)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Sparkler, Pinpoint and Skipper are hidden. Their data is kept (`launchers.ts:27-29`), `modifiersFor` forces the Sling (`modifiers.ts:49-50`) and their unlock rows are filtered (`unlocks.ts:129-134`). Their return is **T0-blocked**                                                                                                                                                          |
| Unlock ladder                                              | No ladder rows exist after planet 57 (probe: 36 frost, 38 rush, 40 challenge, 41 bubble, 43 zip, 46 mist, 48 thumper, 51 ring, 57 tug)                                                                                                                                                                                                                                                                                                                                                                                                                                 | Planets 61-120 are free for new debuts                                                                                                                                                                                                                                                                                                                                                          |
| Player pace (economy sim, `tests/sim/economy/report.json`) | Regular reaches planet 121 on **day 23** and Engaged on **day 9**. Homeworld L5: Regular day 53, Engaged day 31                                                                                                                                                                                                                                                                                                                                                                                                                                                        | When an update ships, most active players are already past any new debut, so "late arrival" intros are mandatory. Debuts after 60 still reach almost everyone within a month of install                                                                                                                                                                                                         |
| Collector's Edition (CE) prerequisites                     | Themes: Tidepool, Comet Candy and Paper Garden (met). Past Road: **not met**; Road 1 stays dormant until the owner sets `opensOn` (decision 81). Purchase date: **not met**; `PurchaseJournalPlugin.swift:51-58, 188-195` sends only `tx.purchaseDate`, never `originalPurchaseDate`. Decision 84 counts Paper Garden while Road 1 is current, which decision 111 amends                                                                                                                                                                                               | M16 builds the plumbing now. Opening the CE is owner-gated (§0.2 lists five owner items)                                                                                                                                                                                                                                                                                                        |
| Save                                                       | `PROFILE_VERSION = 8` (`profile.ts:461`). Goldens a-l plus `j-release-1.0.v6` and `k-release-1.1.v7`. **No 1.2/v8 golden**                                                                                                                                                                                                                                                                                                                                                                                                                                             | Each S package captures the latest build's golden **before** any edit (the M14 S pattern). Goldens are named by the build they come from (§0.4)                                                                                                                                                                                                                                                 |
| Backup guard                                               | `backup.ts:383` returns `'newer'` and `profile.ts:694` throws `NewerProfileError`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | A v9+ backup restored on a 1.2 device is refused, not corrupted. No new work needed                                                                                                                                                                                                                                                                                                             |
| Game Center                                                | 32 achievements already use Apple's 1000-point cap (`store/gamecenter.md:16`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | No new achievements in M15-M17                                                                                                                                                                                                                                                                                                                                                                  |
| Release train                                              | Decision 92: "tuning and content every 2 weeks"; features every 8 weeks, each with a Road. 1.3 = Road 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Release vehicles are proposed in 0.4. A 1.2.x content train for M15 is permitted (decision 110's alternative)                                                                                                                                                                                                                                                                                   |
| Competitive aim line                                       | Competitive modes already force `scopeLevel 2` (`app.ts:1179`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | This is the precedent for treating the full aim line as an assist (Wonder, decision 105)                                                                                                                                                                                                                                                                                                        |
| Glossary                                                   | `BUILT` ends at M11.5 (`tests/glossary.test.ts:45-62`). 'Wonder' and 'Space Pebble' are registered for M15 (:511-512). 'Star Motes' is on the never list with returnsIn M15 (:785). Every RETIRED row has `retiredIn` ≤ M13 (M12 ×4, M13 ×2), M13 is special-cased (:1051, :1072), and `expect(pending.length).toBeGreaterThan(0)` (:1096) fails once M12 and M13 are built                                                                                                                                                                                            | S15 only registers the Firemount, Rainbow and Flood noun rows (since M15, not yet built). The integration pass adds **only M15** to `BUILT`, after the strings and translations exist. M12-M14 go to a separate glossary task (§7), which also rewrites the pending assertion                                                                                                                   |

### 0.2 What is blocked on the owner, and how the map works around it

| Owner action                                                                                                                 | Blocks                                                                                                                                                                                                                                                                                                                                | What we build now                                                                                                                                                                                                                                                                        | What waits                                                                                                                                                                                              | Unblocks when                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **T0 child playtests** (5 children, 15 minutes, paper notes; RM:1811; FL:543-551). Not run for any milestone                 | (a) Sparkler/Pinpoint/Skipper redesign (decision 51). (b) Flood's "good or bad" readability (RM:149). (c) The M15 milestone-review gate (face card plus "can say what X does", 4 of 5 children). (d) The M16 day/night experiment's go                                                                                                | S15 writes the **T0 protocol rows** into `docs/qa/playtest-difficulty.md`: planets 52, 56, 60, 63, 67, 74, the curve checks 58 and 64, and the aim and bounce tallies for launchers. Package E15 builds the launcher-candidate harness. Flood is built and simmed. Day/night is sim-only | Hidden launchers stay hidden. Flood ships only if T0 clears it, otherwise it moves to rules v3 (decision 102). The v2 flip waits for the T0 review unless the owner waives it in writing (decision 110) | T0 results are recorded in the playtest sheet                                                                                                                                                                                                                                  |
| **1.0 launch date** (decision 81)                                                                                            | Road 1's `opensOn`, which is the later of launch + 56 days and `submitOn` + 28. Everything below derives from it: Road 2's `opensOn` (+ 8 weeks, decision 92), the 1.3 `submitOn` (Road 2 `opensOn` − 28), `RULES_V2_VOYAGE_FROM` (after the 1.3 `submitOn` + 28), the CE's `saleFrom` (= Road 2 `opensOn`) and the Road 3 price step | All dates stay relative constants, and every switch is dormant while its date is absent                                                                                                                                                                                                  | Any absolute date in M15-M17                                                                                                                                                                            | The owner gives the launch date                                                                                                                                                                                                                                                |
| **Road 1 `opensOn`** (decision 81), and then Road 2's                                                                        | The CE "one Past Road" prerequisite                                                                                                                                                                                                                                                                                                   | CE contents, entitlement, UI and catalogue row, all **dormant**. The CE has no `saleFrom`, so it is never listed (§Part 2)                                                                                                                                                               | CE sale                                                                                                                                                                                                 | Road 2's `opensOn` is set: the CE's `saleFrom` is set to the same day (decision 112)                                                                                                                                                                                           |
| **Road 2 content approvals**: name (decision 83 pattern), looks and theme art sign-off                                       | The R2 track's copy freeze. The CE contents at Road 2                                                                                                                                                                                                                                                                                 | R2 builds dormant, like Road 1 (W1.5)                                                                                                                                                                                                                                                    | R2 translation freeze                                                                                                                                                                                   | Owner's yes, or the default applies                                                                                                                                                                                                                                            |
| **App Store Connect** product creation (we create nothing)                                                                   | CE sale. Any price-tier change                                                                                                                                                                                                                                                                                                        | Catalogue sheet row, `.storekit` entry, compliance doc                                                                                                                                                                                                                                   | Live product                                                                                                                                                                                            | The owner approves the sheet and creates the product                                                                                                                                                                                                                           |
| **Sandbox purchase test with a second Apple ID** (Family Sharing, restore)                                                   | Confirming which date StoreKit 2 reports as `originalPurchaseDate` for shared and restored transactions. It is **unconfirmed** whether the sandbox can produce a `familyShared` transaction at all                                                                                                                                    | Plugin fields, fallbacks, unit tests with mocked records                                                                                                                                                                                                                                 | Opening the CE with Family Sharing on                                                                                                                                                                   | The owner runs the sandbox check (decision 113). **Fallback if the sandbox can't share:** the owner creates the CE with Family Sharing **off**, then turns it on (Apple allows on later, never off) after one real shared transaction has been checked in the purchase journal |
| **On-device StoreKit 2 journal verification** (owed since M12: `05-status-and-next.md`, "Not yet verified on real hardware") | The CE's date plumbing rides on `PurchaseJournalPlugin.swift`                                                                                                                                                                                                                                                                         | S16 plugin fields with mocked tests                                                                                                                                                                                                                                                      | Opening the CE                                                                                                                                                                                          | The owner runs the `docs/qa/release.md` StoreKit matrix on a device, plus the new date fields                                                                                                                                                                                  |
| **Gate v2 readability check** with children aged 9-11 (`05-status-and-next.md` known issues and owner to-dos)                | The CE is the highest-priced item behind Gate v2                                                                                                                                                                                                                                                                                      | Nothing new (Gate v2 is unchanged)                                                                                                                                                                                                                                                       | Opening the CE                                                                                                                                                                                          | The owner records the result. If children can read it, Gate v2 is fixed before any CE sale                                                                                                                                                                                     |
| **Oldest-device frame-time test** (still owed from M11.5, RM:1525)                                                           | M17 acceptance: 60 fps with 24 friends                                                                                                                                                                                                                                                                                                | Half-rate animation beyond 14 friends; simulator frame-time harness                                                                                                                                                                                                                      | `HOME_OPEN_LEVEL` 5 → 10 flip                                                                                                                                                                           | The owner reports frame times at 14 and then 24 friends                                                                                                                                                                                                                        |
| **Name approvals** (decision 16 pattern)                                                                                     | Copy freeze for translation                                                                                                                                                                                                                                                                                                           | English drafts plus translator length and meaning checks                                                                                                                                                                                                                                 | Translation freeze                                                                                                                                                                                      | Owner's yes, or the default applies                                                                                                                                                                                                                                            |

**Sequencing principle.** Every milestone ships its machinery **dormant** behind one switch: `RULES_VERSION` (play) for M15, the CE's `saleFrom` for M16 (absent means never listed), and `HOME_OPEN_LEVEL` for M17. That way code, sims and fixtures merge and stay green on the trunk while owner actions are pending, and the switch PR is small and reviewable. This is the same "dormant until dated" pattern Road 1 uses (`road01.ts:591`).

### 0.3 Cross-milestone architecture decisions in one paragraph

**Rule sets are versioned side by side and never replaced.**

- v1 stays executable forever, for checkpoints, challenge codes, Remix/Voyage history and all frozen fixtures.
- v2 (M15) adds content through _data rows_ plus a _campaign overlay_ that runs after the untouched v1 layout.
- A rule set holds **per-mode** Trouble lists. Space Pebble is in the v2 campaign list only.
- A rules object claims version 2 **only when its content differs from v1** for that mode and cap (the "effective version"). As a result:
  - Daily (cap 16), Challenge (14), Rush (14) and Zen (20) stay literally v1;
  - challenge codes keep their `1-` prefix, so 1.x and 1.3 players can share codes;
  - campaign planets 1-51 are v1 even after the flip.
- No caller relies on the global play version implicitly. Every generator, checkpoint, code, scene and pre-flight entry point takes an explicit `play` argument (default `RULES_VERSION`). Voyage derives its version from the stop's week and taught.
- M16's day/night rule is a **v3 candidate that is never in `RULES_SUPPORTED`** until the owner says go.
- M17 changes **no** round rules (decision 26), and its acceptance asserts that every round fixture is unchanged.

### 0.4 Waves and release vehicles (proposed; decisions 110, 112, 118 and 126)

| Wave  | Contents                                                                                                                                                                                                                                                               | Can start                                              | Ships in                                                                                                                                                           |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1    | S15 (two halves), then A15-D15 in parallel, plus E15 (sim-only)                                                                                                                                                                                                        | Now                                                    | 1.3 (Road 2), with the v2 flip if gates are green, names approved and the T0 review is done or waived. Wonder can ship on v1 even if the flip slips                |
| W1.5  | **R2, the Road 2 content track** (SR2 step 0, then AR2 content, then the R2 integration). It runs in parallel with A15-E15 because the files don't overlap (Part 1 §7, "R2")                                                                                           | After S15 merges (both edit `profile.ts` and `app.ts`) | 1.3, dormant until Road 2's `opensOn`. R2 publishes the multi-Road API that A16/B16 consume (decision 118)                                                         |
| W2    | S16. Then A16, B16, C16 (sim-only) and D16 (dormant terraform) in parallel. **S17 starts after A16 merges** (`tuning.ts` and the tuning snapshot). The M16 integration pass, including the terraform hooks in `panel.ts`/`sheets.ts`/`canvas.ts`, merges **before W3** | After the W1 and W1.5 integrations                     | The CE ships in the 1.3 binary, dormant (no `saleFrom`) until Road 2's `opensOn`. M17 machinery stays dormant. The experiments stay sim-only or behind their flags |
| W3    | A17-D17 in parallel                                                                                                                                                                                                                                                    | After S17 and the M16 integration                      | 1.4 (Road 3): the M17 flip after the owner's device test. The CE price moves to $19.99 when Road 3 opens (owner changes it in App Store Connect)                   |
| Later | Flood (if deferred) and the hidden-launcher redesign                                                                                                                                                                                                                   | After T0                                               | The first train after T0 results: rules v3 for Flood, and a **code-reviewed round change** for the launchers (decision 107)                                        |

**One integrator.** The R2, M15, M16 and M17 integration passes never run at the same time. R2 and M15 both edit `stickers.ts`, `app.ts` and the locale files, so whichever finishes second rebases onto the first.

**Save numbering by merge order:**

| Order     | Save version |
| --------- | ------------ |
| M15 (S15) | v9           |
| R2 (SR2)  | v10          |
| M16 (S16) | v11          |
| M17 (S17) | v12          |

- R2 always claims v10. If Road 2 needs no new field, the v10 migration is an identity step, so the numbers in this map stay fixed.
- Each migration also sets an idempotent `m15Migrated`, `r2Migrated`, `m16Migrated` or `m17Migrated` flag. If trains reorder, the numbers follow the merge order.
- **Golden naming follows the build a golden comes from, never a release that may not exist:**
  - `release-X.Y` only for the build that is the X.Y release candidate. For example, `m-release-1.2.v8` comes from `3f9c4d3`, the 1.2 candidate.
  - `trunk-<milestone>-<short sha>` for anything else. For example, `n-trunk-r2-<sha>.v10` is S16's capture.
  - When 1.3 is cut, a `release-1.3.v<N>` golden is captured from that build. If M15, R2 and the CE all ride 1.3, it is v11.

**Team.** Codex implements packages (it cannot run Playwright; Claude runs every e2e). There is a data analyst for sims, three adversarial reviewers (correctness; economy and kid safety; UX and i18n) plus Codex read-only, translator sub-agents per language, and one integration pass per milestone (`docs/handoff/06-workflow.md`).

---

# Part 1: M15, content drop (rules v2, Wonder)

## §1 Goal and acceptance

**Goal (RM:1638).** Bring in:

- Space Pebble and the Comet Guardian's pebbles;
- the Firemount and Rainbow Fusions and the Flood Clash;
- Wonder, a mastery mark above 3 stars set by an offline planner;
- Star Motes.

All of it arrives as a versioned rules change that never drops stored stars, never breaks a 1.x checkpoint or code, and keeps every band green. M15 is size L (about 3 team-weeks; RM:957), excluding T0 and the flip.

**Acceptance (all must hold for the flip PR; owner items are listed separately).**

1. **v1 is untouched.** These stay byte-identical:
   - the new `tests/fixtures/rules/round-v1.json` stepRound golden. It stores the `LevelDef` inputs it played, so a later re-salt cannot move it. It also covers the hidden Sparkler, Pinpoint and Skipper paths;
   - `tests/rules.snapshot.test.ts` and `tests/fixtures/rules/*`;
   - `tests/fixtures/flight/star-sling.json`;
   - `campaign-PP.json` rows 1-60 and `legacy-PP-61-120.json` (as today);
   - `greedy-PP.json`, `levels.default.snapshot.json`, `modes.json`, `remix-RX.json` and `constants.json`;
   - `tests/daily-frozen.test.ts` (taught 16/28/36), plus the new `frozen-days-late.json` rows (taught 52/60/120, captured at `3f9c4d3` before any edit);
   - `tests/voyage-frozen.test.ts` (taught 16-120, n ≤ 67);
   - the 98+2-day runway.

   **Rows 61-120 of `campaign-PP.json`** may change before the flip only through a reviewed `LEVEL_SALT`/`RAW_LEVEL_SALT` row. That PR also regenerates the v2 snapshots and `par.json`. A re-salt of P63 (the golden checkpoint planet) is not allowed. **The flip PR** extends the freeze guard from 60 to 120 rows. From then on, re-salts go to the play version's salt table only (decision 97).

   **Every suite in this item, plus the save goldens and the challenge codes, runs in PR at play version 1 and at play version 2** (an explicit `play` argument; §3), from S15 onward. At play 2, every row above must still be byte-identical. The only exceptions are the generated `*.v2.json` snapshots.

2. **Compatibility.**
   - 100% of saved checkpoints in the goldens resume with the same fingerprint, at play 1 and play 2: the P33 checkpoints in `f-pre-m10.v3` and `g-pre-m105.v3`, plus the new v8 campaign checkpoint at P63 and the v8 Remix checkpoint. A v1 checkpoint finishes under v1.
   - 100% of the codes in the new `tests/fixtures/challenge/v1-codes.json` decode to the same CH level hash, at play 1 and play 2.
   - Codes written by a v2 build still start with `1-`.
3. **v2 difficulty, Gates on the v2 tree:**
   - pressure budget on every planet 1-120 (Normal 1-30 ≤ 2, Normal 31+ ≤ 3, Hard ≤ 4, Super Hard ≤ 5, breather −1; `levels.ts:1012-1021`);
   - 0 CLIFF, WALL, STACK, TRIVIAL and EASY-EARLY flags on 1-60;
   - chapter floor-and-ceiling bands 1-60 green;
   - ≤ 1 intro, letter or button per planet on 1-120;
   - spacing rule FL:517;
   - TEACH lint passes on 52, 56, 63 and 67, and on 74 when `includeFlood` is on;
   - median round 60-100 s on planets 52, 60 and 63-74;
   - Hard and Super Hard floors (decision 34).
4. **Reactions (v2).** Run with `includeFlood` both **true and false**: whichever configuration ships must be green, and both are reported. Planets 20-60 keep today's bands (unchanged by construction). A new block on 61-120 is a Gate. Each metric is v2 against the band. Where v1 61-120 is already outside a band, v2 must be no more than 1 point worse than v1:
   - aware Fusions ≥ 1 per planet;
   - blind Clashes 0.3-0.6 per planet, counted by `kind`, not by id (fix `harness.ts:489`);
   - aware Combo 2 / 3 / 4: 35-60% / 10-30% / 2-10%;
   - blind Combo 2 ≤ half of aware;
   - Supernovas 2-3 per planet;
   - per-object spread ≤ 1.8×;
   - dead throws ≤ 10%;
   - aware vs blind 3-star gap ≥ 10 points;
   - best-sector difference ≥ 10%;
   - casual fail added by Combos ≤ +1 point;
   - frost per ten planets (aware, ≥ 25) 17.8-21.8.

   Watch: the share of rounds on 67-120 that earn Rainbow's extra throw (decent-blind and decent-aware). It shows whether the land triggers keep the extra throw special rather than near-universal.

5. **Troubles (v2, including Space Pebble).**
   - **Gate:** blind cost ≥ 5%, aware ≤ 8%, blind with max loadout ≥ 1% (decision 41), pooled over **P52** (teaching) and **P60** (first Guardian pebbles). This is the same teaching-planet scope as today's gate (`trouble-cost.sim.ts:10-11, 63-68`).
   - **Watch** (nightly, printed): the pebble on substitution planets 61-120. Today's Troubles already measure 0.6% across all Trouble planets and −1.2% off the teaching planets (`05-status-and-next.md` known issues).
   - Surprise losses 0.
6. **Sky.**
   - Reachability 100% (sectors plus pebble and mote positions, for every roster launcher × release time).
   - Scene Bot ≥ 95% agreement between preview and actual on **pebble caught / not caught and landing sector**, and on **mote collected / not collected**. The planets:
     - P52 and P60;
     - P56 plus 2 mote pool planets;
     - the first v2 planet in 61-120 with **a sky obstacle and a pebble**;
     - the first v2 planet in 61-120 with **a mote and a pebble**.

     If the seeded draw yields no such planet, a unit test proves the combination cannot occur.

   - Surprise bonks 0.
   - Casual bonks ≤ 1.0 on P52 and P56, and ≤ 1.5 elsewhere. Decent ≤ 0.8.
   - Solver-0 1-star ≥ 90% on pebble planets.
7. **In-round extra throws.**
   - At most 1 per round from Rainbow and motes combined: 0 violations over the full v2 sim corpus (campaign, Remix and Voyage rows), plus unit tests.
   - Every level whose rules include Rainbow carries a `bonusKind`, in every seed family (unit test over PP, RX and VOY).
   - Star Motes change casual fail by ≤ 1 point (either direction) on planets 56-120.
   - The max-loadout uplift stays ≤ +15 points (decision 54; measured 12.39).
8. **Launchers on v2.**
   - Never-hurts (decision 44).
   - Pick share 8-35% for Swoop, Zip and Thumper on 31-120.
   - Best-launcher uplift +0.5 to +6 points (decision 51).
   - LAUNCHER-LOCK 0 on 1-120.
9. **Wonder.**
   - `par.json` regenerates identically:
     - for 10 sampled planets in PR (`tests/par.test.ts`, with an explicit per-test timeout);
     - for all planets nightly: v1 and v2, 1-120, and v2 with Flood both on and off.
   - Wonder is never awarded on a disqualified attempt (unit matrix).
   - Wonder appears **only when earned**:
     - no HUD notch, no bar extension, no pre-level or "almost" line;
     - no Wonder line while a disqualifying setting (full aim line, Gentle) is on;
     - unit and Playwright checks.
   - Never visible at `p.level <= 20` (noun test).
   - The planner's par and the judging count the same things, including the planet's fixed mote (unit test on a mote planet).
   - Watch: 10-20% of 3-starred planets later earn Wonder (decent and sharp bots).
10. **Economy, measured on the v2 tree** (play version 2 via the shadow mechanism in §5):
    - round frost 17.8-21.8 per 10 planets (RUNS ≥ 8);
    - trip frost 25-33% in the 7 days from Regular's Bay-3 day (≤ 33%, measured days 16-22);
    - decision 65(b)/(c) ≤ 0.5;
    - free gems ≥ 95 per active day (today 100.8 / 98.1);
    - B3 free lane 6-8 weeks;
    - B4 no Road stall;
    - **B5 Road 1 coverage ≥ 0.8** (Gate; decision 86, hard in nightly, `economy.sim.ts:523-525`). ≥ 0.85 stays a printed PR **Watch** (today 0.86 / 0.89);
    - Landmark stages 1-3 active days, none over 5;
    - money never buys growth (decision 55 twin);
    - **album:** for every save golden, at play 1 and 2, the milestone gems ready, the Feats-page completion and `pagesClaimed` are unchanged (every new sticker is `bonus: true`).
11. **Copy and safety.**
    - Noun cap 21 at planet 20.
    - 0 urgency words (`tests/policy.test.ts:16-37`).
    - 0 occurrences of "drown", "attack" or "destroy" in M15 strings, in 6 languages.
    - All new strings go through `t()`/`tp()` and are translated into 6 languages.
    - VoiceOver labels on every new element; Reduce Motion variants; 320×568 layout (Playwright).
    - The dev-only rules hook is absent from `dist/` (CI grep includes `__rulesPlay`).
12. **Saves.**
    - Every golden from a to m loads under v9. Migration is idempotent.
    - The Field Guide cleanup runs when play first becomes 2 (`rulesSeen`), not at v9. A pair tried under v1 after the v9 migration never shows "Nothing happens" for a reaction that exists under the play rules (unit test).
13. **Owner items before the flip** (not CI): names approved (decision 109); T0 review done or waived in writing (decision 110); for Flood, T0 is required (decision 102).

## §2 Scope items

| #     | Item                                                                                                                                                                                                                                                                                  | Status                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 15.1  | **Rules v2 foundation.** Versioned rule sets with per-mode Trouble lists, effective version, an explicit `play` argument on every generator/save/fingerprint/code/scene entry point, version-keyed salt tables, the v1 golden, and frozen suites run at play 1 and 2                  | Now (S15)                                                                                                                                                                            |
| 15.2  | **Space Pebble.** Teaching row at P52 (v2 overlay); campaign substitution from P61. **Campaign only**: the v2 Voyage, Remix and mode lists have no pebble                                                                                                                             | Now. The flip waits for the Scene Bot gate and the T0 review                                                                                                                         |
| 15.3  | **Comet Guardian pebbles** on boss planets ≥ 60, replacing that planet's Trouble. P50 unchanged                                                                                                                                                                                       | Now                                                                                                                                                                                  |
| 15.4  | **Firemount (P63) and Rainbow (P67).** Triggers named by **land type** (no hidden numbers), data-driven effects, teaching deals                                                                                                                                                       | Now                                                                                                                                                                                  |
| 15.5  | **Flood (P74).** Clash, red chip, ends a Combo. Every gate runs with `includeFlood` on and off. The P74 unlock row and teaching deal exist only when it is on                                                                                                                         | Built and simmed now. **Ship is T0-blocked**: if not cleared by the v2 freeze, Flood moves to v3 and v2 ships without it (decision 102)                                              |
| 15.6  | **In-round extra throw.** One shared cap for Rainbow and the +1-throw mote. A fixed bonus object, generated for **every seed family whose rules contain Rainbow**. The solver models Rainbow. S15 also builds the generic HUD badge and toast and the next-throw reach preview        | Now (S15 plumbing and UI hooks; B15/C15 fill data and art)                                                                                                                           |
| 15.7  | **Star Motes.** Teaching row at P56, pool from P58, ≤ 1 per planet, +1 throw or Wide Shot, shown in advance, excluded from star targets (the Wonder planner models them)                                                                                                              | Now                                                                                                                                                                                  |
| 15.8  | **Wonder.** Planner, `par.json` keyed by rules version, eligibility, rewards, Star Map / galaxy / results, ladder row at P42. **No HUD notch**; shown only when earned                                                                                                                | Now. **Independent of the flip**: can ship on v1                                                                                                                                     |
| 15.9  | **Save v9.** `wonder` list, `wonderSeen`, `rulesSeen`, `m15Migrated`, titles grandfathered by definition. The Field Guide pair cleanup is keyed to the play version (`rulesSeen`), not to v9                                                                                          | Now (S15)                                                                                                                                                                            |
| 15.10 | **Late arrival.** At most one intro per round start. It is chosen by what the level actually contains, then by what can cost the child, then by teaching order. Unlock rows are gated by play version                                                                                 | Now (S15 rows; packages fill the copy)                                                                                                                                               |
| 15.11 | **Sparkler, Pinpoint, Skipper**                                                                                                                                                                                                                                                       | **Deferred (T0).** Now: the T0 protocol (S15), their paths in the v1 golden (S15), and the candidate harness (E15). Redesign and return wait for T0, as a code-reviewed round change |
| 15.12 | **Moon-slingshot launcher, comet-tail obstacle**                                                                                                                                                                                                                                      | **Dropped from M15** (decision 108); no build                                                                                                                                        |
| 15.13 | **Hygiene.** Noun rows for Firemount, Rainbow and Flood (S15). The RULES_VERSION comment, and FL:645/RM:1638 amended to "reactions, Troubles, sky objects and pickups, Combo, flight" (S15). Glossary `BUILT` += **M15 only**, at integration. M12-M14 go to a separate glossary task | Now (S15, integration)                                                                                                                                                               |
| 15.14 | **The flip PR.** `RULES_VERSION` 1 → 2, `RULES_V2_VOYAGE_FROM` week, `REMIX_RULES` 2, the v1 freeze guard extended to 120 rows, v1 balance sims moved to nightly                                                                                                                      | **Blocked** on acceptance 1-12 and the owner items in 13                                                                                                                             |

### Rules detail (starting values; packages tune inside the stated ranges and record the final numbers in the handoff)

**Space Pebble (Trouble, pressure 2, v2, campaign only)** — decisions 99 and 100.

- **Source.** A pebble cloud drifts in the sky at a fixed seeded position, stored as `LevelDef.pebbleCloud: { x, y }` (drawn from `${seed}-v2-pebble` and encoded in the v2 snapshot rows). On Guardian planets the source is the Comet Guardian, which "tosses" pebbles; never "attacks". Where a pebble hangs over its target is a pure function, `pebbleHang(L, target, spinPhase)` in `src/core/v2/pebble.ts`, and is unit-tested. No other geometry is stored.
- **Each cycle.** A pebble hangs over a **marked sector**:
  - the target is chosen deterministically: the sector with the most life, ties going to the lowest index, using the same tie rules as `troubleTarget`;
  - it counts down in throws, using the existing cadence (3 on Normal, 2 on Hard and Super Hard; `TroubleState.every`), shown as 3-2-1 or 2-1 in the forecast strip.
- **Impact.** Target sector life −1 and land −1 (floor 0); neighbours unchanged. The ranges for the cost gates are life −1..−2 and land −1..0.
- **Firebreak.** "Mountains stop pebbles." Under the hood this is land ≥ 3 on the target, the same threshold and the same wall icon as today's firebreaks (RM:248), so nobody has to read a number. The pebble bounces off and nothing changes.
- **Counter.** Any throw whose flight passes through the pebble catches it:
  - pass-through: the throw still lands normally (precedent: `FlightResult.breaks`, `flight.ts:65-73`);
  - no score for the catch;
  - the pebble hangs low over its target, so in the sector model "the throw's **own landing** on the target or a neighbour catches it", and the Scene Bot proves ≥ 95% agreement in real flight;
  - area effects never catch. That covers Rock's Pebble Shower top form (side land raises), Fusion and Supernova radii, and Lab forms. Only the thrown object's flight (real flight) or landing sector (sector model) counts. The one exception is the existing Rain Cloud Supernova clear rule below.
- **Settled.**
  - A pebble cloud is settled after **one catch**: +3 Supernova charge, the same as every Trouble settle (`round.ts:558`).
  - Guardian pebbles: a catch clears that pebble only. The Guardian is settled when defeated (3 hits, BOSS_HP = 3).
- **Interactions.**
  - Not a Combo link and does not end a Combo.
  - A Rain Cloud Supernova within 3 of the target clears it (the existing rule).
  - No new trait or Buddy counter. Calm and Buddy delay apply through the existing generic `delayed` path (S15 verifies).
  - No Lab Guard perk counters it. `GUARD_OF` is `Record<Kind, GuardId>`, keyed by object (`labperks.ts:11`), so this is stated in the **perk column of `TROUBLE_BEHAVIOUR`** (`perk: null`). `LAB_TEACH[kind].guard` gains no `'pebble'` entry, and a unit test asserts no `guard` LabEvent ever names `pebble`.
- **Solver.** Models the sector rule exactly. The aware forecast risk uses the new forecast shape.

**Triggers are named lands, never numbers.** This follows the launch reactions, which trigger on visible lands (`round.ts:177-196`; RM §4a rule 1), and the Firebreak rule that nobody should have to read hidden numbers (RM:248). Each list below is disjoint from the launch triggers for the same object, so priority only matters where neighbours differ. B15 sims the trigger rates before tuning the effects.

**Firemount (Fusion, Rock + Magma, debut P63).**

- **Trigger:** Rock on or next to **Volcano, Desert or Hot Springs**, or Magma on or next to **Mountain or Highland**.
- **Effect:** centre land to at least 3 and heat to at least 2, with water ≤ 1 (it becomes a Volcano); ±1 land +1. These are the restated prototype numbers (`proto.ts:41-59`).
- **Charge:** +3.

**Rainbow (Fusion, Rain Cloud + Sunburst, debut P67).**

- **Trigger:** Sunburst on or next to **Marsh, Swamp or Reef**, or Rain Cloud on or next to **Desert or Savanna**. Open Ocean is left out at the start because it is common enough to make the extra throw near-universal. It is added only if the sim shows Rainbow fires on fewer than 1 in 10 decent-aware rounds on 67-120 (Watch in acceptance 4).
- **Effect:** ±2 life +1 on habitable sectors, plus **+1 throw once per round** inside the shared cap.
- **Charge:** +3.

**Flood (Clash, Ice Comet + Rain Cloud, debut P74).**

- **Trigger:** Ice on or next to **Marsh or Swamp**, or Rain Cloud on or next to **Ice Sheet, Tundra or Taiga**.
- **Effect:** ±1 water +2 (narrowed from the prototype's ±3); forest sectors that become wet lose 1 life ("marsh"); ocean sectors gain 1 life ("sea friends love it").
- **Charge:** 0. Ends a Combo (`round.ts:530`).
- **Chip:** red Clash chip.

**Priority (explicit, replacing declaration order).** Fusions first, in teaching order: steam, rainGarden, wildflowers, glacier, firemount, rainbow. Then Clashes in teaching order: scorch, flood. Under v1 the new ids are not in `rules.reactions`, so v1 evaluation is unchanged.

**Star Motes** — decision 104.

- **Teaching row:** P56. P56 is Normal with a breather budget of 2 and no Trouble; probe: `56 normal none goals=1 p=0/2`.
- **Pool:** from P58, 1 in 3 eligible campaign planets (seeded `${seed}-v2-motes`). Never on:
  - teaching rows;
  - boss planets;
  - planets with a sky obstacle.
- **At most 1 per planet.** Its kind is fixed per planet:
  - **Extra Throw** (+1 throw, shared cap of 1);
  - **Wide Shot** (+1 reach on the next throw, inside reach cap 4; FL:70).
- **Shown** on the pre-level card and in the sky before the first throw.
- **Pickup:** collected by passing through it; the shot keeps flying.
- **Excluded** from star targets and the star solvers (pure upside; FL rule "targets ignore help").
- **Modelled by the Wonder planner** with the same sector rule as the pebble: the throw whose own landing is on the mote's sector or a neighbour collects it. Wonder judging then counts the mote's effect as an in-rule extra, so par and judging agree (decision 105).

## §3 Data, save and RULES changes

### RULES_VERSION plan (decisions 97-98)

```ts
// src/core/rules-version.ts
export type RulesVersion = 1 | 2;
export const RULES_SUPPORTED: readonly RulesVersion[] = [1, 2];
export const RULES_LATEST: RulesVersion = 2;
export const RULES_VERSION: RulesVersion = 1; // "play" version; the flip PR sets 2
// src/core/rulesets.ts (new)
export interface RuleSet {
  version: RulesVersion;
  reactions: readonly ReactionId[]; // priority order
  troubles: Readonly<Record<RoundMode, readonly TroubleId[]>>; // what rounds may run, PER MODE (v2: 'pebble' in campaign only)
  layoutTroubles: readonly TroubleId[]; // FROZEN v1 list: the PP draw (levels.ts:648), otherTaught (levels.ts:628) and the Daily weather
  layoutObstacles: readonly ObstacleId[]; // FROZEN v1 list feeding laterTwists
  salt: { level: Partial<Record<number, number>>; raw: Partial<Record<number, number>> }; // v2 points at v1's tables until the flip
  pebbleTeach?: number;
  guardianPebblesFrom?: number;
  pebbleSubstituteFrom?: number;
  motesTeach?: number;
  motesFrom?: number;
  extraThrowCap: 0 | 1;
}
export const RULESETS: Record<RulesVersion, RuleSet>;
export function effectiveVersion(n: number, mode: RoundMode, taught: number, play: RulesVersion): RulesVersion;
export function voyagePlay(week: string, play: RulesVersion = RULES_VERSION): RulesVersion; // 1 before RULES_V2_VOYAGE_FROM
// round.ts
export function rulesForLevel(n, mode = 'campaign', taught = n, version: RulesVersion = RULES_VERSION): RoundRules;
export function restoreRound(json: string): RoundState | null; // KEPT: signature and callers unchanged
export function restoreRoundWithVersion(json: string): { state: RoundState; rulesVersion: RulesVersion } | null; // new
```

- **`ROUND_RULES_V0`.** Pin `version: 1` and keep the object's identity: it is compared by identity at `levels.ts:325, 335, 341, 351, 364`.
- **v1 `RoundRules` JSON is unchanged.** There are no new keys. A v2 rules object adds only `version: 2` and the longer lists. In v1 every mode's Trouble list equals today's `rulesForLevel` output, so `rulesForLevel(min(n, taught))` (campaign) and `rulesForLevel(n, 'voyage', taught)` give identical v1 objects. Moving Voyage to mode `'voyage'` changes no v1 byte.
- **Effective version.** `rulesForLevel` stamps `version: 2` only if the v2 content for (mode, cap) differs from v1. Results:
  - campaign 1-51, Daily, Challenge, Rush and Zen stay v1;
  - Voyage is v2 only when `voyagePlay(week)` is 2 **and** the cap is ≥ 63 (reactions only; the Voyage list has no pebble). `RULES_V2_VOYAGE_FROM` is set in the flip PR to the first week after both `ALMANAC_FROZEN_THROUGH` and the build's `submitOn` + 28 days;
  - Remix is v2 for attempts after the flip, for caps ≥ 63 (reactions only; Remix runs no Troubles). `REMIX_RULES` 2 is recorded in `p.remix[ch].v`. Remix best is a max (`remix.ts:81`), so no stars drop.
- **Space Pebble and motes are campaign-only in M15.** This is enforced by data, not by convention: the pebble is only in `RULESETS[2].troubles.campaign`, and only the PP overlay places motes. `otherTaught` (`levels.ts:628`) reads `layoutTroubles` (in its frozen order) intersected with the level's run list. Under v1 that is byte-identical to today's `o.rules.troubles`, and a Voyage layout can never draw `pebble`. The Daily weather pick uses `RULESETS[1].layoutTroubles`, so shipped Dailies never re-roll at any `taught`.
- **Reactions are "on in every mode" through caps.** Daily, Challenge, Rush and Zen caps never reach 63.
- **Version-blind call sites all take an explicit version** (S15 owns each one):
  - `voyage.ts:113` and its pre-flight `solve0`/`solve2` at `voyage.ts:127-128, 144-145`. They get the stop's own rules: `rulesForLevel(n, 'voyage', taught, voyagePlay(week))`, so the pre-flight can no longer fall back on `rulesForLevel(level.n)`;
  - the Voyage scene, `screens/voyage.ts:217`, through the same `voyageRules(week, n, taught)` helper;
  - `flows/modes.ts:113`, which takes the rules from the level it plays (`L.rulesVersion ?? 1`);
  - `flows/results.ts:257/260`, which takes the rules from `r.level` and the round's mode;
  - `app.ts:831` (the Remix scene: `rulesForLevel(n, 'remix', taught, remixPlay)`);
  - `help.ts:102`, `profile.ts:158` and `game.ts:448`;
  - `levels.ts:300/363`: the default arguments of `solve0`/`solve2` become `rulesForLevel(level.n, 'campaign', level.n, level.rulesVersion ?? 1)`. That means a level that does not say it is v2 is solved as v1.
- **Generator.**
  - `makeLevel(n, prefix, { rulesVersion })` runs the **untouched v1 layout**. The salt lookup is `RULESETS[version].salt`, and v2 shares v1's tables until the flip PR splits them.
  - Then `overlayV2(L)` runs, only for `PP` seeds at an effective version of 2, composing in order:
    1. `reactionOverlay` (teaching deals on 63 and 67, and on 74 when `includeFlood`; each also strips any Trouble there);
    2. `pebbleOverlay` (52 teach; boss ≥ 60 swap; substitution from 61, replace-only, never adding pressure; sets `pebbleCloud`);
    3. `moteOverlay`.
  - **`bonusKind` is not overlay-only.** `makeLevel` deals it for **every seed family** (PP, RX, VOY, and any other) whenever the level's rules contain `rainbow`, from its own stream `${randomSeed}-v2-bonus`, after the layout.
  - Star targets and goals are then recomputed with `solve0`/`solve2` under the level's v2 rules.
  - The overlay and the bonus deal draw **only from new streams** (`${seed}-v2-pebble`, `-v2-motes`, `-v2-bonus`), never from layout `rnd`, `-troubles`, `-goals`, `-short`, `-sky-N` or `-rules`.
  - New `LevelDef` keys are spread in only when present, as `shortKind` is at `levels.ts:710/954`, so `expectShape` (`levels.snapshot.test.ts:125`) and every v1 row stay identical. The keys are `rulesVersion`, `motes`, `bonusKind` and `pebbleCloud`.
- **Round save.**
  - `restoreRound(json)` keeps its signature for `labs.test.ts`, `scene.launchers.test.ts`, `troubles.test.ts` and `round.test.ts`. It now accepts any `RULES_SUPPORTED` value.
  - The new `restoreRoundWithVersion` returns `{ state, rulesVersion }` for `readInterruptedRound`.
  - New optional `RoundState` fields are back-filled in `restoreRound` (`round.ts:645-648`) and absent on v1: `extraUsed`, `wideNext`, and `TroubleState.target`/`count`.
  - `ROUND_SAVE_VERSION` stays 2.
  - Nova threshold validation (`[12, 18]`) is per version.
- **Scene.**
  - `game.ts:447-448` must take rules from the checkpoint's version, never from the current version.
  - `readInterruptedRound(p, play = RULES_VERSION)` rebuilds the level with the checkpoint's version and compares fingerprints (copy the `legacyCampaign` pattern, `profile.ts:222-229`).
  - The fingerprint tuple is `[n, prefix, salt, rulesVersion, hash(rulesForLevel(n, mode, taught, rulesVersion))]`, so v1 tuples are unchanged.
  - The Remix quirk of hashing campaign rules (`profile.ts:140-164`) is kept for v1 and fixed for v2.
- **Challenge codes.**
  - `encodeChallenge(..., play)` writes the CH level's effective version, which is `1` while the cap stays at 14.
  - `decodeChallenge(code, play)` accepts `RULES_SUPPORTED` and passes the version to `challengeLevel`.
- **Explicit `play` arguments (for tests and sims; no env read in shipped code).** These entry points take `play: RulesVersion = RULES_VERSION`, and the frozen suites call them with 1 and with 2:
  - `dailyLevel(day, taught, play)`, `rushLevel`, `zenLevel` and `challengeLevel`;
  - `voyageLevel(..., play)`;
  - `remixLevel(n, p, play)`;
  - `makeLevel(n, prefix, { rulesVersion })`;
  - `encodeChallenge`/`decodeChallenge`;
  - `readInterruptedRound(p, play)`;
  - `migrate(p, { play })`.
- **Stars never drop.** Campaign `p.stars[n] = max` (`economy.ts:261`), Remix max, Daily best max. Planets whose v2 targets move keep their stored stars.
- **`par.json` is keyed by version** (and v2 by `includeFlood`), and is regenerated in the same PR as any ruleset or salt change (critiques.md:1377).

### Save v9 (decision 106)

- `wonder: number[]`: sorted campaign planet numbers, append-only, at most 120 entries. Defaults to `[]`.
- `wonderSeen: boolean`: whether the first-earn explanation has been shown.
- `rulesSeen: RulesVersion`: the highest play version this profile has run. Defaults to 1 and never decreases.
- `m15Migrated`.
- **Field Guide (keyed to the play version, not to v9).**
  - **Display rule** (S15, `fieldguide.ts:139-141`): "Nothing happens" shows only when the **play rule set** has no reaction for the pair. A pair that has a reaction under the play rules shows "?" until it is found, whatever `reactionPairsTried` holds.
  - **Recording rule** (`fx.ts:880-886`): a pair is recorded as tried only if the **round's** rules have no reaction for it.
  - **Cleanup:** on load, if `RULES_VERSION > p.rulesSeen`, drop from `reactionPairsTried` every pair that has a reaction in the play rule set (for v2: `'magma+rock'`, `'storm+sun'`, and `'ice+storm'` when `includeFlood`; keys are sorted kind names, `fieldguide.ts:140`). Then set `rulesSeen = RULES_VERSION`.
  - The cleanup is idempotent. It runs at the flip, not at the v9 migration, so pairs re-recorded under v1 between 1.3 install and the flip are cleaned too.
- **No title flags.** "Little Chemist" (`passport.ts:102`) and "Chain Maker" (`passport.ts:103`) keep their **launch requirement sets**:
  - `FUSION_IDS` is renamed `LAUNCH_FUSION_IDS` and stays 4 entries;
  - the 13-bit stamp mask is append-only and unchanged.
- **Stickers never touch album rewards.**
  - `REACTION_STICKERS` is derived from `LAUNCH_FUSION_IDS`, not from `Object.keys(REACTIONS)`.
  - The Firemount and Rainbow discovery stickers are explicit `V2_REACTION_STICKERS` with `bonus: true`. Each is visible only when the play rule set contains its reaction. Each earns `DISCOVERY_DUST` once.
  - The Wonder stickers (10/50/100) are `bonus: true` (decision 105: 0 currency).
  - Bonus stickers are outside milestone gems (`stickers.ts:212-217`) and outside every page (`pageStickers`), so the Feats page (60 gems) and claimed pages are unchanged at play 1 and 2. The album test in acceptance 10 asserts this.

### Goldens and fixtures

Captured by S15 **before any source edit**, with a temporary capture harness kept in the scratchpad (the M14 S method):

- `tests/fixtures/saves/m-release-1.2.v8.json` (from `3f9c4d3`, the 1.2 candidate) contains:
  - a campaign checkpoint mid-round at P63;
  - Little Chemist held and all 13 Combo stamps;
  - `reactionPairsTried` including `magma+rock`;
  - 3-starred planets 1-60;
  - a Remix chapter 7 best;
  - a Voyage week in progress;
  - a Daily best;
  - a recorded challenge;
  - an album with claimed milestones and a claimed Feats page.
- `tests/fixtures/saves/m-remix-checkpoint-1.2.v8.json` (Remix chapter 7, slot 3, mid-round).
- `tests/fixtures/rules/round-v1.json`: per-step state hash and event list for scripted greedy, decent and aware rounds. The fixture **stores each `LevelDef` it played**, so later re-salts of 61-120 can't move it. The rounds:
  - planets 8, 13, 14, 18, 22, 25, 26, 28, 32, 33, 36, 41, 50, 51, 57, 60, 64 and 100;
  - every launcher on the roster, **plus Sparkler, Pinpoint and Skipper**, set through direct modifiers that bypass `modifiersFor` (`modifiers.ts:49-50`), so the S15 table refactor can't silently change `sparklerPlainUsed`, `skipperBounces` or `skipperLosesPower`;
  - Labs at 0 and 5;
  - Buddy on and off;
  - Calm.
- `tests/fixtures/challenge/v1-codes.json`: 32 codes mapped to CH level hashes.
- `tests/fixtures/daily/frozen-days-late.json`: the `daily-frozen` day range at taught **52, 60 and 120** (where a pebble in `TROUBLES` would re-roll the weather), captured at `3f9c4d3`. The existing `frozen-days.json` is never rewritten.
- New, generated at integration:
  - `campaign-PP.v2.json`, `remix-RX.v2.json` and `voyage-VOY.v2.json` (the frozen Voyage weeks after `RULES_V2_VOYAGE_FROM`, plus a synthetic week at taught 120);
  - their encoding is a new `v2LevelRow` with `LEVEL_KEYS_V2`, which encodes every field: `rulesVersion`, `motes` (`[kind, x, y, r]`), `bonusKind`, `pebbleCloud`, and Troubles as `[id, source]`. This makes motes, the bonus object and pebble geometry visible to the snapshot;
  - the v1 `levelRow`/`LEVEL_KEYS`/`expectShape` stay as they are;
  - the test asserts that v2 PP rows 1-51 equal the v1 rows field for field.

## §4 UI and copy

**Strings: about 64** (RM says about 60). Decision 109 sets the budget at 70.

| Area                                                                                                                                              | Keys (est.) |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Space Pebble (name, rule, counter, intro body, forecast VO, "Caught!", landing-card crater line, Guardian toss line, settled line, Field Guide 2) | 11          |
| Firemount / Rainbow / Flood (3 names, 3 intro bodies, 3 Field Guide lines, Rainbow "+1 throw", Flood two-sided line, 2 discovery sticker names)   | 13          |
| Star Motes (name, "Extra Throw", "Wide Shot", intro, 2 pickup toasts, pre-level line, VO label)                                                   | 8           |
| Wonder (name, first-earn line, results line, Star Map VO, Passport "Wonders", 3 sticker names, Grown-ups help line)                               | 9           |
| Generic extra-throw badge VO and next-throw "wider shot" preview VO (S15 hooks)                                                                   | 2           |
| Late arrival ("New in the sky" title and body) and the Field Guide "New" dot                                                                      | 4           |
| Grown-ups "What's new in 1.3" bullets                                                                                                             | 4           |
| Reduce Motion and VoiceOver variants not covered above                                                                                            | 6           |
| Contingency (Guardian, Remix and Voyage edge lines)                                                                                               | 8           |

**Noun budget impact: 0 at planet 20.** Every debut is at planet 42 or later: Wonder 42, Space Pebble 52, Star Motes 56, Firemount 63, Rainbow 67, Flood 74. Wonder must not render at `p.level <= 20`: gate it with `lateOpen` (`unlocks.ts:14-17`) and the P42 row, and add a nouns test case that a 3-starred P5 at `p.level = 20` shows no Wonder mark, line or ring. Reaction and Trouble names are already "round vocabulary" exclusions (`nouns.test.ts:172-196`).

**Ladder rows.** Each is the only intro on its planet:

- 42 Wonder (no intro; the explanation shows on first earn);
- 52 Space Pebble (intro);
- 56 Star Motes (intro);
- 63 Firemount (intro);
- 67 Rainbow (intro);
- 74 Flood (intro; the row exists only when `includeFlood` is on).

**Rows are gated by play version**, so they are dormant before the flip.

**Late arrivals.** A Regular player is past planet 121 by day 23 (`report.json`), so on their first v2 round all five ideas are "in the rules". Intros are therefore chosen by **what the level actually contains**, never by what the rules allow. At each round start, at most one intro is shown. It is the first unseen idea in this order:

1. the idea is present in this level:
   - a pebble Trouble or Guardian pebbles in `L.troubles`;
   - a mote in `L.motes`;
   - a v2 reaction that is _possible_: both of its objects are in the reachable queue and one of its trigger lands is on the start planet, or can be made by a queued object;
2. among present ideas, the ones that can cost the child come first (Space Pebble, then Flood), then pure upside (Firemount, Rainbow, Star Motes);
3. then teaching order.

Present-but-unexplained ideas beyond the first queue for the next round start where they are present. Ideas not present in a level are never introduced on it. Unit test: no level 52-120 starts with a pebble whose intro is unseen, unless the round's single intro slot went to another _costly_ idea. The forecast strip still shows the pebble countdown in that case.

**Kid-safe checks (reviewers sign off on each).**

- Guardian "tosses"; pebbles "land" and make "a little dent". Friends "move to a safer spot", never "hurt". Flood copy never says "drown" (critiques.md:401).
- Countdowns count **throws**, never seconds. No "hurry", "left!", "last chance" or "before it's too late".
- Motes are fixed per planet and shown before play. There is no picker and no randomness after the planet loads, and nothing sold creates, moves or upgrades a mote.
- Rainbow's throw cannot be bought or boosted.
- Wonder:
  - never sold, through a currency or otherwise (RM:700 #4);
  - 0 gems and 0 stardust (decision 105);
  - no "almost" or "within X%" line (RM:1703);
  - shown only when reached. There is **no HUD notch and no bar extension**: a visible target with a bar filling toward it is the near-miss framing the RM cut list removed. Results reveal Wonder only on the attempt that earns it;
  - while a disqualifying setting (full aim line, Gentle) is on, no Wonder line, hint or "turn this off" message appears anywhere on the kid side. That would be pressure to drop an assist. The explanation lives in the Grown-ups help line. Wonder marks already earned stay on the Star Map, galaxy and Passport, because earned marks are never removed (RM:700);
  - every Wonder sticker is `bonus: true`, so no gems through the album;
  - no Game Center achievement.
- **Originality.** The pebble is caught on the way to the land, not shot down for points (FL:618 is amended in S15).
- **Accessibility.**
  - Forecast-strip shapes for the pebble are distinct from vent, vine and frost without colour.
  - Reduce Motion replaces the pebble descent and mote sparkle with static steps.
  - VoiceOver labels: "Space Pebble over sector {n}, lands in {k} throws", "Star Mote: Extra Throw", "Wonder reached".
  - 320×568: the forecast strip keeps 2 beats, and the pre-level mote icon fits.

## §5 Sims and gates (placement)

| Check                                                                                                                                                                                                                                                                                                                                        | Where                                                                                                                                       | From                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| v1 stepRound golden (with stored LevelDefs and the hidden launchers); rules, flight and level v1 snapshots (rows 1-60 frozen plus legacy; 61-120 frozen at the flip); greedy, modes, remix v1, constants; daily frozen (16/28/36 plus late 52/60/120) and voyage frozen; save goldens a-m; challenge v1 codes; **each at play 1 and play 2** | `npm test` (PR `verify`)                                                                                                                    | S15                               |
| v2 snapshots (`campaign-PP.v2.json`, `remix-RX.v2.json`, `voyage-VOY.v2.json`, encoded with `v2LevelRow`/`LEVEL_KEYS_V2`; PP rows 1-51 equal to v1); `bonusKind` present on every Rainbow level of every family                                                                                                                              | `npm test`                                                                                                                                  | Integration                       |
| Album: milestone gems, Feats-page completion and claimed pages unchanged for every golden at play 1 and 2                                                                                                                                                                                                                                    | `npm test`                                                                                                                                  | S15 (test), D15/B15 keep it green |
| Field Guide: display and recording rules; the `rulesSeen` cleanup at the first play-2 load, idempotent                                                                                                                                                                                                                                       | `npm test`                                                                                                                                  | S15                               |
| Unlocks (≤ 1 intro on 1-120; the 74 row only with `includeFlood`); the late-arrival intro picker; nouns 21; policy; i18n; terms                                                                                                                                                                                                              | `npm test`                                                                                                                                  | Always                            |
| Glossary: unchanged in S15. `BUILT` += M15 at integration (with translations)                                                                                                                                                                                                                                                                | `npm test`                                                                                                                                  | Integration                       |
| `par.json` 10-planet regeneration in `tests/par.test.ts`. The Mac budget is ≤ 60 s, and the test sets an explicit per-test timeout of `180_000` because CI runners are 1.5-2× slower and the default `testTimeout` is 30 s. It runs at v2 with Flood on and off. The Wonder eligibility matrix runs here too                                 | `npm test`                                                                                                                                  | D15                               |
| Pressure budget 1-120 (v1 and v2); TEACH 52/56/63/67 (and 74 with Flood); spacing                                                                                                                                                                                                                                                            | PR `balance-v2` job (new, 30-minute timeout)                                                                                                | Integration                       |
| Chapter bands 1-60 v2; 0 CLIFF/WALL/STACK/TRIVIAL/EASY-EARLY (2 seeds × 96)                                                                                                                                                                                                                                                                  | PR `balance-v2`                                                                                                                             | Integration                       |
| `reactions.sim.ts` v2 (20-60 unchanged plus the 61-120 block), **`includeFlood` true and false**; the Rainbow extra-throw rate Watch                                                                                                                                                                                                         | PR `balance-v2`                                                                                                                             | B15                               |
| `trouble-cost.sim.ts` v2: Gate on **P52 + P60** pooled (32 paired runs each); substitution planets printed as a Watch (nightly)                                                                                                                                                                                                              | PR `balance-v2`; Watch nightly                                                                                                              | A15                               |
| `motes.sim.ts` (casual fail delta ≤ 1; extra-throw cap violations 0 over PP, RX and VOY rows)                                                                                                                                                                                                                                                | PR `balance-v2`                                                                                                                             | C15                               |
| Round time 60-100 s on new planets (`round-time.sim.ts`, covering 52, 56, 60 and 63-74)                                                                                                                                                                                                                                                      | PR `balance-v2`                                                                                                                             | A15                               |
| Scene Bot v2: P52, P60, P56, 2 mote pool planets, one obstacle-plus-pebble planet and one mote-plus-pebble planet from 61-120. ≥ 95%; 0 surprise bonks                                                                                                                                                                                       | PR `e2e` chromium-390x844 (Claude runs it). It uses a dev-only hook (below)                                                                 | A15/C15                           |
| Reach sweep including pickups (100%)                                                                                                                                                                                                                                                                                                         | PR `launchers` job (`sim:launcher-reach`)                                                                                                   | A15/C15                           |
| Launchers never-hurts, pick share, uplift and LAUNCHER-LOCK on v2                                                                                                                                                                                                                                                                            | Nightly with `RULES_PLAY=2` before the flip; PR `launchers` jobs after it                                                                   | Integration                       |
| Max loadout ≤ +15                                                                                                                                                                                                                                                                                                                            | PR `sim:loadout` (v2)                                                                                                                       | Integration                       |
| Economy 90-day (`sim:economy`)                                                                                                                                                                                                                                                                                                               | PR, under play rules and the shipping `includeFlood` value. A nightly v2 shadow run (`RULES_PLAY=2`) before the flip, with Flood on and off | Integration (data analyst)        |
| Economy 180-day (`sim:economy:all`), the M13/M14 gates (B5 ≥ 0.8 hard; ≥ 0.85 Watch), runway                                                                                                                                                                                                                                                 | Nightly; runway also in PR                                                                                                                  | Integration                       |
| Real-flight nightly with pebble and mote hit kinds (`flying-nightly.sim.ts`)                                                                                                                                                                                                                                                                 | Nightly                                                                                                                                     | A15/C15                           |
| Calendar pre-flight with v2 Voyage weeks after the cutover (the pre-flight uses each stop's own rules)                                                                                                                                                                                                                                       | Nightly                                                                                                                                     | Flip PR                           |
| `par.json` full regeneration (v1, v2 with Flood, v2 without Flood × 1-120); Wonder rate Watch 10-20%                                                                                                                                                                                                                                         | Nightly (`npm run par:check`)                                                                                                               | D15                               |
| **After the flip:** v1 `balance`, `reactions` and `trouble-cost` sims move to nightly. v1 cannot change, because the goldens prove it                                                                                                                                                                                                        | —                                                                                                                                           | Flip PR                           |

**How "play version 2" runs before the flip.** Shipped code never reads the environment. There are two mechanisms:

1. **Frozen suites and unit tests (PR):** the explicit `play` argument (§3). Each frozen suite loops `for (const play of [1, 2] as const)` and calls the public entry points with it.
2. **Whole-sim shadow runs (nightly):** `vitest.config.ts` (test config, not shipped) adds `setupFiles: ['tests/setup/play-v2.ts']` when `process.env.RULES_PLAY === '2'`. That file `vi.mock`s `src/core/rules-version` with `{ ...actual, RULES_VERSION: 2 }`.
   - S15 proves the mechanism with `tests/play-version.sim.ts`. Under `RULES_PLAY=2` it asserts `rulesForLevel(63).version === 2` and `dailyLevel(day, 120)` equal to the frozen-late row.
   - If `vi.mock` in a setup file proves unreliable, the sims thread `play` through `career.ts` and the harness instead.

**Commands.**

- `npm run par` = `SIM=1 PAR=write vitest run tests/sim/par.gen.sim.ts`. The `.sim.ts` name is required: vitest only collects `tests/**/*.test.ts`, or `*.sim.ts` under `SIM=1` (`vitest.config.ts:5`). The file sets its own timeout.
- `npm run par:check` is the same without `PAR=write` (nightly).

**Dev-only rules hook.** The Scene Bot's `?rules=2` URL switch sets `window.__rulesPlay`. It sits inside an `if (import.meta.env.DEV)` block (the `main.ts:104` pattern), so Vite folds it out of `dist/`. S15 extends the CI pattern (`ci.yml:25`) to `Balance Report|__app|__i18n|__scene|__gate|__rulesPlay`.

**Time budget.** CI runners are 1.5-2× slower than the Mac (`06-workflow.md`). `balance-v2` gets its own job rather than doubling `balance`. Running the frozen suites twice repeats their runtime (`daily-frozen` and `voyage-frozen` each carry a 120 s timeout). S15 measures the added time on CI. If PR `verify` goes over its budget, the play-2 pass moves to its own parallel PR job, `verify-play2`.

## §6 Conflicts, risks and owner decisions

### Conflicts resolved by this map

1. **P50 stacking.** Boss 1 + vent 2 + pebbles 2 = 5 > 4 (STACK). Fix: P50 stays v1. Guardian pebbles start at P60, where they **replace** the boss planet's Trouble, so pressure stays 3/4 (probe: 60 vent, 70 vine, 80 vine).
2. **Pebble before teaching** (RM:255 and FL:298 vs 4a rule 4). The teaching row is P52 (cleanest slot: `52 normal none - goals=0 p=0/3`); the first Guardian pebbles are at P60.
3. **Rainbow needs a RoundState slot** (`round.ts:50-71`; RM:229 "Rainbow now" is stale). S15 adds the generic extra-throw plumbing.
4. **The spec gap: what counts as a rules change** (RM:1638, FL:645). Decision 97 widens it to reactions, Troubles, sky objects and pickups.
5. **The `else` fall-through traps:**
   - `reactionAt` gives a new id Dry Spell's triggers (`round.ts:183-190, 202, 209-229, 474`);
   - `advanceTroubles` falls through to frost (`round.ts:282-369`);
   - `forecastTroubles` falls through to vine (`troubles.ts:158`);
   - `firebreakBy` falls through to frost (`troubles.ts:61-86`).

   S15 replaces them with exhaustive data tables (`never` checks), proven against the v1 golden.

6. **Hard-coded Trouble ids** in `labperks.ts:7-46`, `help.ts:47-58`, `game.ts:59`, `hud.ts:264`, `art/troubles.ts:12/51/79/91`, `fx.ts:461-463/575/588`, `feel.ts:11-13`, `aimtag.ts:36/57` and `levels.ts:343-345`. S15 moves them to table lookups.
7. **Flight sky shapes exist only with `sky.obstacle`** (`flight.ts:161-170, 193-202`). S15 adds `world.pickups`, independent of obstacles.
8. **Name collisions:**
   - "Rainbow" vs "Rainbow Parrot" (`world.ts:427`);
   - "Space Pebble" vs "Pebble Shower" (`labcopy.ts:61`), the planet-name word "Pebble" (`levels.ts:239`, which can't change because it is in the frozen rows) and the "smooth pebble" memento.

   Decision 109.

9. **Wonder vs the noun cap.** Gated by `lateOpen` and the P42 row.
10. **Daily re-roll** (`modes.ts:38`, unbounded `taught`). Uses the frozen v1 list. The new taught 52/60/120 rows prove it.
11. **`harness.ts:489` counts only `'scorch'` as a Clash.** Count by `kind`.
12. **Voyage leaks and re-rolls** (`voyage.ts:113, 127-128, 144-145`; `levels.ts:628-630`; `screens/voyage.ts:217`). Fixed by per-mode Trouble lists, a frozen `otherTaught`, and the stop's own rules in generation, pre-flight and scene (§3).
13. **Rainbow outside the campaign** (`remix.ts:24-31`, Voyage n ≤ 67). `bonusKind` is dealt in `makeLevel` for every family whose rules contain Rainbow (§3).
14. **API changes that break files a package doesn't own.** `restoreRound` keeps its signature (`restoreRoundWithVersion` is new). Every version-blind `rulesForLevel` call site is in S15's file list (§7).
15. **UI hooks for B15/C15.** `hud.ts`, `aimtag.ts` and `game.ts` belong to S15, which finishes first. S15 therefore ships the generic extra-throw badge and toast and the next-throw reach preview, and B15/C15 only feed them data and art (§7).
16. **Album side effects** (`stickers.ts:86-95, 198-199, 212-217`). All new stickers are `bonus: true`, and `REACTION_STICKERS` is pinned to the launch Fusions (§3).
17. **Glossary pending assertion** (`glossary.test.ts:1096`). S15 doesn't touch `BUILT`. Integration adds M15 only.

### Risks (with levers)

| Risk                                                                                                                                | Lever                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two +3 Fusions push Supernovas above 3 per planet on 61-120                                                                         | Narrow the triggers. Raise the v2 later threshold inside `[12, 18]` (versioned)                                                                                                                                                                                     |
| Flood pushes blind Clashes above 0.6                                                                                                | Narrow Flood's land list (Ice on Swamp only, Rain Cloud on Ice Sheet only)                                                                                                                                                                                          |
| Rainbow's extra throw becomes near-universal                                                                                        | The land triggers leave out Ocean. The Rainbow-rate Watch (acceptance 4). Narrow to Marsh/Swamp if needed                                                                                                                                                           |
| Firemount/Flood lands move frost per ten or the Essence mix (ember, stone, dew). Comet Pier counts every Fusion (`landmarks.ts:41`) | Re-measure the economy on v2. Ember from Firemount helps M17 (noted)                                                                                                                                                                                                |
| Rainbow's extra throw raises solver targets                                                                                         | Expected (rule 7). TEACH and band gates catch any overshoot                                                                                                                                                                                                         |
| Moving-pebble flakiness in the Scene Bot                                                                                            | The pebble hangs low over its target (sector model), with a fixed seeded release-time sample                                                                                                                                                                        |
| Generator time doubles (v2 recomputes targets)                                                                                      | `makeLevel` cache keyed by version (already includes rules JSON)                                                                                                                                                                                                    |
| Wonder par above the HUD bar cap (1.12× of the 3-star target, `hud.ts:232`)                                                         | No longer a risk: Wonder has no HUD presence (decision 105). The bar is untouched                                                                                                                                                                                   |
| T0 never runs                                                                                                                       | Flood moves to v3. The flip needs a written owner waiver (decision 110). The v1 curve lever (re-salting 61-120) stays available until the flip                                                                                                                      |
| T0 decides against Flood after par, Clash and economy numbers are set                                                               | Every gate already runs with `includeFlood` on and off. Turning it off is a one-constant PR that regenerates `par.json` v2 and the v2 snapshots                                                                                                                     |
| The R2 track edits `stickers.ts`, `app.ts` and the locales while M15 is in flight                                                   | R2 is its own wave (W1.5) with exclusive files. D15 keeps `WONDER_STICKERS` in `src/meta/wonder.ts`. The single integrator runs the R2 and M15 integration passes one after the other, and the second rebases. The M15 pass adds a one-line spread to `stickers.ts` |
| The frozen suites pass at play 1 but break at play 2, and nobody notices until the flip                                             | Every frozen suite runs at play 1 and 2 in PR from S15 onward (§5)                                                                                                                                                                                                  |

### Owner decisions to record (each "open, default applied")

| #   | Decision                                           | Recommended default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Alternative                                                                                                                                                        |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 97  | **Rules v2 architecture and the scope of "rules"** | Versioned rule sets side by side, with **per-mode Trouble lists**. v1 executes forever. The effective version is stamped only where content differs. The play switch is `RULES_VERSION`, and every entry point also takes an explicit `play` argument. A rules change is any new or changed reaction, Trouble, sky object or pickup, Combo rule or flight parameter (amend the comment at `rules-version.ts:1`, FL:645 and RM:1638). **v1 campaign rows 61-120 stay re-saltable (the FL §4.9 curve lever) until the flip PR**, which freezes all 120 v1 rows. Salt tables are keyed by version from S15, and after the flip re-salts go to the play version only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Freeze 61-120 in S15 (removes the only v1 curve lever while the flip waits on T0), or unfreeze 1-60 and re-review the whole curve under v2 (bigger, riskier)       |
| 98  | **Which modes adopt v2**                           | Campaign at the flip. Voyage from `RULES_V2_VOYAGE_FROM`, with its version derived from the stop's week and taught (`voyagePlay`), never from the global play version. Remix for attempts after the flip (`REMIX_RULES` 2). Daily, Challenge, Rush and Zen stay v1 through their caps. Challenge codes keep `1-`. Space Pebble, Guardian pebbles and motes are **campaign-only** in M15, enforced by the per-mode lists. Fusions reach Voyage and Remix, so `bonusKind` is dealt in every family. Interrupted 1.x rounds finish under v1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Pebble in Voyage (needs a sky-position deal for VOY seeds and its own calendar pre-flight run)                                                                     |
| 99  | **Space Pebble placement**                         | Teaching row at **P52**. Guardian pebbles on boss planets **from P60**, replacing that planet's Trouble. **P50 unchanged** (amends RM:255 and FL:298). Random substitution from **P61** on 1 in 3 Trouble slots (seeded), replace-only, at most 1 pebble per planet, never on teaching or obstacle-teaching planets. It may share a planet with a later obstacle or with a mote, and the Scene Bot covers both                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | P50 as the debut, replacing its vent (a Hard boss as a teaching planet breaks the teaching rules)                                                                  |
| 100 | **Space Pebble rules and numbers**                 | As in §2 "Rules detail": throw countdown at Trouble cadence; crater life −1 and land −1 (tuning range −1..−2 / −1..0); "mountains stop pebbles" firebreak (land ≥ 3 under the hood, wall icon); pass-through catch by the thrown object only (area effects such as Pebble Shower never catch); one catch settles a cloud and the Guardian settles when defeated; +3 charge; no Combo effect; Rain Cloud Supernova clears it; no new trait; **no Lab Guard (perk column `null` in `TROUBLE_BEHAVIOUR`)**. The cloud position is stored as `LevelDef.pebbleCloud`. The solver uses the sector model, proven by the Scene Bot. Originality: a catch, not a shoot-down; amend FL:618 to "the Guardian and Space Pebbles"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | The sky hit spends the throw (harsher, and harder for the solver)                                                                                                  |
| 101 | **Firemount and Rainbow**                          | Debuts **P63** and **P67** (both v1 Normal with no Trouble). **Triggers named by land type** (Firemount: Rock on Volcano/Desert/Hot Springs, Magma on Mountain/Highland. Rainbow: Sunburst on Marsh/Swamp/Reef, Rain Cloud on Desert/Savanna), simmed before effects are tuned. +3 charge each. Discovery stickers are **bonus stickers** (no album gems, no Feats-page change) with `DISCOVERY_DUST` once each. **No** new Wish templates, Lab feats or Combo stamps in M15                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Numeric triggers (heat ≥ 2, land ≥ 3, water ≥ 1): hidden numbers, and Rainbow becomes near-universal                                                               |
| 102 | **Flood**                                          | Debut **P74** (v1 `74 normal none - goals=0`). Red Clash chip, ends a Combo, ±1 water +2, marsh and sea effects. Triggers: Ice on Marsh/Swamp, Rain Cloud on Ice Sheet/Tundra/Taiga. **Ships only if T0 shows 4 of 5 children can say it is "good for sea friends, bad for forests"**; otherwise it moves to rules v3 and v2 ships without it. Until T0, every reactions, economy and par gate runs with `includeFlood` on and off, and the P74 unlock row and teaching deal exist only when it is on. Copy never says "drown"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | A new "mixed" chip (more art and copy; still needs T0)                                                                                                             |
| 103 | **The in-round extra throw**                       | One shared cap of 1 for Rainbow and the Extra Throw mote; the first source wins. The extra throw deals the level's fixed **bonus object** (`LevelDef.bonusKind`, seeded from `-v2-bonus`, the same for everyone), added to the end of the queue when earned. It is dealt in **every seed family whose rules contain Rainbow** (PP, RX, VOY). The star solver models Rainbow (rule 7) and not motes. The HUD badge, toast and next-throw reach preview are generic S15 hooks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Re-deal the object just thrown                                                                                                                                     |
| 104 | **Star Motes**                                     | Teaching row at **P56**. Pool from **P58**, 1 in 3 eligible campaign planets. Never on bosses, teaching rows or obstacle planets. Kind fixed per planet (Extra Throw or Wide Shot +1 reach, cap 4). Shown in advance. Pass-through pickup. Excluded from star targets; modelled by the Wonder planner. Campaign only in M15                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Motes in Voyage and Remix (identical for everyone; add later)                                                                                                      |
| 105 | **Wonder**                                         | Par = **95%** of a beam planner. The planner settings:<br>• width **30**, swap, reactions, Troubles and pickups via `stepRound`;<br>• the Star Sling, with no Labs or boosters;<br>• **the planet's fixed mote, modelled with the sector rule**;<br>• the planet's own budget plus Rainbow;<br>• **planets 1-120 campaign**, keyed by rules version (and by `includeFlood` for v2). Planets beyond the table show nothing.<br>**Visibility:** **only when earned**. There is no HUD notch, no bar extension and no pre-level line. Results reveal it on the earning attempt, from the **P42** row (`lateOpen`), on 3-starred planets. No Wonder line or hint appears while a disqualifying setting is on. Earned marks stay.<br>**Judging:** on the score when the planet's own throws plus in-rule extras (Rainbow and the mote, which the planner also models) run out. Momentum and Comet Shower throws are ignored rather than disqualifying.<br>**Disqualified by:** continues, power or aim boosters (Life Spark, Star Scope, earned or bought), help-ladder rungs and hints, practice warm-ups, Gentle, and the full aim line (consistent with competitive modes, `app.ts:1179`; RM:1638 "assists").<br>**Allowed:** Labs and launchers (earned progress).<br>**Rewards:** a gold ring on the Star Map and galaxy, Passport "Wonders n", **bonus** stickers at 10/50/100, **0 currency** (album milestones included) and no Game Center.<br>Watch: 10-20% | Allow the full aim line (equity). +25 stardust on the first Wonder (proposals.md:319). A HUD notch on 3-starred replays (rejected: near-miss framing, RM:1703)     |
| 106 | **Titles, stamps, Field Guide and late arrival**   | "Little Chemist" and "Chain Maker" keep their launch requirement sets (grandfathered by definition; no save flag). The stamp mask is append-only. **The Field Guide is keyed to the play version:** "Nothing happens" shows only for pairs with no reaction under the play rules, and the cleanup of tried pairs runs when play first exceeds `rulesSeen` (not at v9). Late arrivals get at most one intro per round start, chosen by what the level contains, then by what can cost the child, then by teaching order. No Inbox letter (avoids "come back" pressure)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Store each tried pair with the rules version it was tried under (a larger save change)                                                                             |
| 107 | **Sparkler, Pinpoint, Skipper**                    | Hidden until **T0** runs the new aim and bounce protocol (written in S15). Now: E15's candidate harness, and their current round paths in `round-v1.json`. After T0, the redesign is a **code-reviewed round change** (their rules live in `round.ts`: `sparklerPlainUsed`, `skipperBounces`, `skipperLosesPower`), re-gated (pick share 8-35%, uplift +0.5 to +6, never-hurts, max loadout ≤ +15). No save, checkpoint (`isLaunchRosterId` check in `readInterruptedRound`) or code can contain a hidden launcher, so the change needs no rules version. Its golden rows are regenerated on purpose in that PR. Players already past 37/53/62 and the ch5/ch6 chests get them retroactively on the next Home visit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Cut them permanently                                                                                                                                               |
| 108 | **Moon-slingshot launcher, comet-tail obstacle**   | **Dropped from M15.** No specs or stats exist, and the bands have no measured headroom. They are candidates for a later content drop (the obstacle would be rules v3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Spec them now and extend M15 by about 1 week                                                                                                                       |
| 109 | **Names and string budget**                        | Approve Space Pebble, Firemount, Rainbow, Flood, Star Motes and Wonder after translator length and meaning checks in 6 languages (decision 16 pattern). Keep "Rainbow" (the Parrot is always qualified). Keep "Space Pebble" (glossary-registered). Budget **70** strings (estimate 64)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Rename to "Sky Pebble" and "Rainbow Burst"                                                                                                                         |
| 110 | **Release vehicle and T0 for the flip**            | M15 rides **1.3 with Road 2** if acceptance 1-12 is green by `submitOn` (Road 2 `opensOn` − 28 days; it derives from the launch date, §0.2). Otherwise 1.3 ships v2 dormant, with Wonder on v1. The T0 review (face card on 52, 56, 60, 63, 67, and 74 if Flood; comprehension 4 of 5) gates the flip unless the owner waives it in writing. Flood and the launchers can't be waived                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Its own 1.2.x content train. Decision 92 allows "tuning and content every 2 weeks", so this is permitted; it costs a separate review cycle and its own save golden |

## §7 Developer packages (Codex)

**Rules for every package:**

- Edit only your owned files.
- Run `npm run format && npm run typecheck && npm test` plus your own sims.
- List new strings; leave translations missing for the lead.
- No commits.
- Codex cannot run Playwright; Claude runs every e2e.
- The v1 golden (`round-v1.json`) and every frozen suite must stay byte-identical after **every** package, at play 1 **and** play 2.
- Never add a `rulesForLevel`/`solve0`/`solve2` call without an explicit version or level-derived rules.

### S15: step 0 (serial; two halves with a checkpoint)

**S15-a: captures and version plumbing.**

1. **Captures first, with no source edits.** SHA-256 for each is recorded in the handoff:
   - the two v8 goldens;
   - `round-v1.json`, with stored LevelDefs and the hidden launchers;
   - `challenge/v1-codes.json`;
   - `daily/frozen-days-late.json` (taught 52/60/120).
2. **Version types and rule sets.**
   - `RulesVersion`, `RULES_SUPPORTED`, `RULES_LATEST` and `rulesets.ts`. v1 equals today's lists in every mode. v2 holds the planned lists, with `pebble` in the campaign list only and Flood behind an `includeFlood` const.
   - `effectiveVersion` and `voyagePlay`.
   - The version parameter on `rulesForLevel`, `rulesForSeed` and `makeLevel`. Version-keyed salt tables, with v2 sharing v1's until the flip.
   - `ROUND_RULES_V0.version` pinned to 1.
3. **Frozen v1 inputs.** The PP layout draw, `otherTaught` and the Daily weather read `layoutTroubles`. `laterTwists` reads `layoutObstacles`.
4. **Explicit versions everywhere.**
   - Every version-blind call site listed in §3 takes the level's or stop's version. That covers Voyage generation, pre-flight and scene, `flows/modes.ts`, `flows/results.ts`, the Remix scene in `app.ts:831`, `help.ts`, `profile.ts`, `game.ts`, and the `solve0`/`solve2` defaults.
   - The public entry points gain the `play` argument.
   - `bonusKind` is dealt in `makeLevel` for every family whose rules contain Rainbow.
5. **Checkpoints and codes.**
   - Fingerprint, `readInterruptedRound` and challenge codes become version-aware, and the scene takes rules from the checkpoint.
   - `restoreRound` keeps its signature; `restoreRoundWithVersion` is new.
6. **Freeze guard and tests.**
   - The `levels.snapshot.test.ts` freeze guard **stays at 60 rows** (the flip PR extends it). Every v1 fixture builder passes an explicit `rulesVersion: 1`.
   - `round.test.ts:97-104` is updated (accepts 1 and 2, rejects 3).
   - The frozen suites loop over play 1 and 2.
   - The `RULES_PLAY=2` setup file and its self-test.
7. **Save v9**, with `rulesSeen` and the Field Guide display, recording and cleanup rules.

**S15-b: tables, seams and generic UI hooks (no behaviour change at play 1).**

- Reaction triggers (as land lists), radius, effects and charge move to REACTIONS data, with an explicit priority.
- Trouble behaviour moves to a `TROUBLE_BEHAVIOUR` table (clear, **perk**, calm, buddy, effect, repaint, firebreak, target, forecast, forecast shape, help line, aim tag, feel) with exhaustive checks.
- **Generic in-round extra-throw plumbing:** `RoundState.extraUsed`, `StepResult.extraThrow` and `LevelDef.bonusKind`, which the scene consumes.
- **Generic UI hooks for B15/C15** (they own none of these files):
  - an extra-throw badge on the throw counter, plus a toast slot (`hud.ts`), driven by `StepResult.extraThrow` and a `source: 'rainbow' | 'mote'` field;
  - a next-throw reach preview (`aimtag.ts`, `game.ts`), driven by `RoundState.wideNext`, that widens the predicted landing footprint by the extra reach;
  - placeholder English strings and VO labels in `m15strings.ts`.
- `world.pickups` and the `FlightHit {kind:'pickup', index}` / `FlightResult.touched` seam.
- `RoundAction.pickups`.
- `overlayV2` composition calling three stubs.
- The `RoundAssists` record passed from `game.ts` to `roundSettlement.ts`, with a `recordWonder` stub call.
- The Field Guide and unlock rows read the play rule set.
- Unlock rows for 42/52/56/63/67, and 74 when `includeFlood` (all gated by play version).
- The late-arrival intro picker in `unlocks.ts` (by level content, then cost to the child, then teaching order).
- Stickers:
  - `REACTION_STICKERS` pinned to `LAUNCH_FUSION_IDS`;
  - the `V2_REACTION_STICKERS` (bonus) and `WONDER_STICKERS` (stub, empty) spreads in `stickers.ts`;
  - the album-invariance test.
- `tests/sim/lint.ts` reads TEACH rows from `tests/sim/teach/*.ts`.
- `tests/sim/flying.ts` supports pickups.
- `harness.ts` counts Clashes by kind.
- Glossary: noun rows only, for Firemount, Rainbow and Flood (`since: 'M15'`). **`BUILT` is not touched.**
- The dev-only `__rulesPlay` hook in the `main.ts:104` DEV block, and the CI grep pattern extended (`ci.yml:25`).
- Docs:
  - decisions 97-110 in RM §10;
  - FL:298/618/645 amendments;
  - the T0 protocol rows in `docs/qa/playtest-difficulty.md`;
  - `docs/handoff/m15-step0.md`;
  - deferred English keys in `src/meta/m15strings.ts` and `src/locales/_keys.json`.

**Owned files.**

- `src/core/{rules-version,rulesets,round,troubles,levels,flight,labperks}.ts`
- new `src/core/v2/overlay.ts`
- stubs `src/core/v2/{pebble,reactions,motes}.ts`
- `src/meta/{profile,modes,remix,voyage,reactions,passport,unlocks,help,roundSettlement,stickers}.ts`
- new `src/meta/{m15types,m15strings}.ts`
- stub `src/meta/wonder.ts`
- `src/ui/{game,fx,feel,aimtag,hud}.ts`. `hud.ts` covers the forecast-shape lookup and the extra-throw badge and toast; `aimtag.ts` and `game.ts` the reach preview
- `src/ui/app.ts` (the Remix rules call at `:831` only)
- `src/ui/flows/{modes,results}.ts` (version-aware rules only; D15 takes `results.ts` after S15)
- `src/ui/screens/voyage.ts` (version-aware rules only)
- `src/main.ts` (the DEV block only)
- `src/ui/art/troubles.ts` (id switches turned into table lookups only)
- `src/ui/screens/fieldguide.ts` (data-driven over the play rule set; the display rule)
- new stubs `src/ui/v2/{pebbleFx,moteFx}.ts`
- `tests/{round,saves,migrate,resume,glossary,unlocks,levels.snapshot,i18n,daily-frozen,voyage-frozen}.test.ts`
- new `tests/{round-v1.golden,challenge-codes,album-invariance,fieldguide-pairs}.test.ts`
- new `tests/setup/play-v2.ts` and `tests/play-version.sim.ts`
- `vitest.config.ts` (the conditional `setupFiles` only)
- `.github/workflows/ci.yml` (the dev-tool grep line only)
- `tests/sim/{harness,lint,flying}.ts`
- new `tests/sim/teach/{index,pebble,motes,reactions}.ts` (stubs)
- the new fixtures listed in §3
- `src/locales/_keys.json`
- `docs/product/{ROADMAP-v2,FLIGHT}.md`
- `docs/qa/playtest-difficulty.md`
- `docs/handoff/m15-step0.md`

**Exposes.** The `RuleSet`, `effectiveVersion`, `voyagePlay` and `voyageRules` API, and the `play` arguments. The overlay stub signatures:

```ts
pebbleOverlay(L: LevelDef, ctx: OverlayCtx): LevelDef
reactionOverlay(L: LevelDef, ctx: OverlayCtx): LevelDef
moteOverlay(L: LevelDef, ctx: OverlayCtx): LevelDef
```

Also:

- `PEBBLE_BEHAVIOUR: TroubleBehaviour` and `V2_REACTIONS: Record<'firemount'|'rainbow'|'flood', ReactionDef>`;
- `applyMote(state: RoundState, mote: MoteDef): void` and `MoteDef = { kind: 'throw'|'wide'; x: number; y: number; r: number }`;
- `Pickup = { kind: 'pebble'|'mote'; x: number; y: number; r: number }`, `LevelDef.pebbleCloud` and the `pebbleHang` signature;
- the HUD hook `showExtraThrow(source)` and the reach-preview hook `previewReach(extra)`;
- the `RoundAssists` type and the `recordWonder(p, n, score, version, assists)` stub;
- `TeachRow`;
- the dev-only `__rulesPlay` hook.

**Done when:**

- every v1 fixture is byte-identical **at play 1 and at play 2**;
- all goldens resume at both;
- the album and Field Guide tests pass;
- `npm test` passes except missing translations for the deferred keys;
- `sim:quick` matches baseline;
- `RULES_PLAY=2 SIM=1 vitest run tests/play-version.sim.ts` passes.

### Parallel packages after S15 (file sets are disjoint)

| Pkg                                       | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Owned files (exclusive)                                                                                                                                                                                                                                                                                                                                                                                                      | Exposes / consumes                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **A15 Space Pebble and Guardian pebbles** | 15.2, 15.3:<br>• behaviour row (perk `null`);<br>• placement (52, boss ≥ 60, substitution ≥ 61) and `pebbleCloud`;<br>• `pebbleHang` geometry;<br>• forecast shape, art, catch FX, Reduce Motion and VO;<br>• Scene Bot rows, including the obstacle+pebble and mote+pebble planets;<br>• the cost gate (P52 + P60) and the substitution Watch;<br>• round-time gate and TEACH 52                                                                                                                                                                     | `src/core/v2/pebble.ts`, `src/ui/v2/pebbleFx.ts`, `src/ui/art/troubles.ts`, new `e2e/scenebot-v2.spec.ts`, new `tests/pebble.test.ts`, `tests/sim/trouble-cost.sim.ts`, `tests/sim/round-time.sim.ts`, `tests/sim/teach/pebble.ts`                                                                                                                                                                                           | Exposes `PEBBLE_BEHAVIOUR`, `pebbleOverlay` and pickup geometry. Consumes S15 seams                           |
| **B15 Firemount, Rainbow, Flood**         | 15.4, 15.5:<br>• data rows and land-list triggers, with trigger-rate sims first;<br>• effects, priority entries and teaching deals 63/67/74;<br>• Rainbow's extra throw via the S15 plumbing and HUD hook;<br>• chips and icons, and discovery sticker art (bonus stickers);<br>• Field Guide lines as REACTIONS data (`fieldguide.ts` is data-driven after S15);<br>• reaction sims 61-120 with Flood on and off, and the Rainbow-rate Watch;<br>• TEACH 63/67/74. Flood stays behind `includeFlood`                                                 | `src/core/v2/reactions.ts`, `src/ui/art/reactions.ts`, new `tests/reactions-v2.test.ts`, `tests/sim/reactions.sim.ts`, `tests/sim/teach/reactions.ts`                                                                                                                                                                                                                                                                        | Exposes `V2_REACTIONS` and `reactionOverlay`. Consumes `showExtraThrow`                                       |
| **C15 Star Motes**                        | 15.7:<br>• placement (56 teach, pool ≥ 58), `applyMote` and Wide Shot through `previewReach`;<br>• pickup geometry, pre-level icon, art, FX, Reduce Motion and VO;<br>• Scene Bot rows and the motes sim (cap violations over PP, RX and VOY);<br>• TEACH 56                                                                                                                                                                                                                                                                                          | `src/core/v2/motes.ts`, `src/ui/v2/moteFx.ts`, new `src/ui/art/motes.ts`, `src/ui/flows/prelevel.ts`, new `e2e/scenebot-motes.spec.ts`, new `tests/motes.test.ts`, new `tests/sim/motes.sim.ts`, `tests/sim/teach/motes.ts`                                                                                                                                                                                                  | Exposes `moteOverlay`, `applyMote` and `MOTE_RULES`. Consumes `showExtraThrow` and `previewReach`             |
| **D15 Wonder**                            | 15.8:<br>• beam planner, modelling the planet's fixed mote with the sector rule;<br>• `npm run par` / `par:check` (`SIM=1 [PAR=write] vitest run tests/sim/par.gen.sim.ts`; no new dependency);<br>• `par.json` (v1, and v2 for the shipping `includeFlood`);<br>• eligibility, recording, rewards (ring, Passport count, **bonus** stickers defined in `wonder.ts`, sticker art);<br>• the results line on the earning attempt only, hidden under disqualifying settings;<br>• Star Map and galaxy ring, VO, and the noun-test case. **No HUD work** | `src/core/par.ts`, `src/core/par.json`, `src/meta/wonder.ts`, `src/ui/flows/results.ts`, `src/ui/screens/starmap.ts`, `src/ui/art/galaxy.ts`, `src/ui/art/stickers.ts` (Wonder art only), `src/ui/screens/passport.ts`, `src/meta/passport.ts` (Wonders count only), `package.json` (two script lines only), `tests/nouns.test.ts` (one case), new `tests/{wonder,par}.test.ts`, new `tests/sim/{par.gen.sim,wonder.sim}.ts` | Exposes `PAR(version, n)`, `wonderEligible(assists)`, `recordWonder` and `WONDER_STICKERS`. Works on v1 alone |
| **E15 (optional) launcher candidates**    | 15.11 prep. A sim-only harness that scores candidate identity parameters for Sparkler, Pinpoint and Skipper against decision 51's gates, on paired seeds. It measures their **current round code paths** (it does not assume a data-only change). No shipped file                                                                                                                                                                                                                                                                                     | new `tests/sim/launcher-candidates.sim.ts`, new `tests/sim/launcher-candidates.data.ts`                                                                                                                                                                                                                                                                                                                                      | Exposes the candidate table format the post-T0 redesign fills                                                 |

### R2: the Road 2 content track (W1.5; decision 118)

Road 2 is what the 1.3 release vehicle, the CE's `saleFrom`, the multi-Road generalisation and the Road 3 price step all depend on. It follows the M14 pattern: content built **dormant** until the owner dates it.

**SR2: step 0 (serial; starts after S15 merges).**

- **Captures:** a golden from the trunk after S15 (`trunk-s15-<sha>.v9`) with Road 1 Pass owned, a Road 1 Landmark in progress and a Road 1 sticker.
- **Contract: generalise single-Road wiring to the catalogue.** The places, listed in Part 2 §6 conflicts:
  - `roadAvailability.ts:8` (`ROAD_CONTENT_ROADS`) and `starroad.ts:142-146` (`productOpen` over every Road);
  - `cosmetics.ts:259, 510-514, 531, 550-561` and `tuning.ts:297, 340`;
  - `roadLandmarks.ts` `roadLandmarkName()`;
  - `wishes.ts:483` and `stickers.ts:123-135`;
  - `grownups.ts:185`, `app.ts:1473` (the Road receipt), `main.ts:109` and `store.test.ts:8`.
- **The `RoadContent` API** published for A16/B16: `ROAD_CONTENT`, `roadProducts(roadId)`, `roadOfProduct(id)`, `roadPastOn(roadId)`, `roadStickerIds()`.
- **Save v10:** an identity migration unless Road 2 needs a field (decision 95 keys Road state by id). Sets `r2Migrated`.
- **Docs:** decision 118's amendment; `docs/handoff/r2-step0.md`.

**AR2: Road 2 content (after SR2).** The content set:

- new `src/meta/content/road02.ts`: the Road, about 7 free looks and 12 Pass looks, the Theme and the Style Single, the Landmark, the almanac spotlight rows and `addedIn: '1.3'`;
- the new locale fragment `src/locales/content/road02.json`, about 90 strings (decision 96);
- `ios/App/PocketPlanet.storekit`, `store/catalogue-sheet.md` and `store/compliance.md` rows (we create nothing in App Store Connect);
- the decision 86 gem-singles sizing on the M15 tree (B5 ≥ 0.8 hard);
- tests.

**Owned files (exclusive in W1.5).** The files listed in the SR2 contract and the AR2 content set, plus `src/meta/profile.ts`, `tests/{store,saves,migrate,roadlandmarks}.test.ts`, the R2 fixtures and `docs/handoff/r2-step0.md`. None of these is owned by A15-E15. `stickers.ts`, `app.ts` and `main.ts` pass from S15 to R2 once S15 has merged.

**R2 integration (the single integrator):** translations of the fragment, the `economy.sim.ts` B3/B4/B5 rows for Road 2, reviewers (economy and kid safety; UX and i18n). The R2 and M15 integration passes never overlap; the second one rebases.

**Owner:** the Road 2 name (decision 83 pattern), the look sign-off and Road 2's `opensOn` (from the launch date).

### Integration pass (Claude, after A-D, and before or after R2's, never at the same time)

- Wiring in `src/ui/app.ts`.
- Intro copy on the unlock rows.
- Translations (5 locale JSONs, by translator sub-agents).
- Glossary: `BUILT` += **M15 only**, after the translations exist.
- Generate the v2 snapshots (PP, RX, VOY).
- `.github/workflows/{ci,nightly}.yml`:
  - add the `balance-v2` job;
  - add the nightly v2 shadow economy and launcher jobs (`RULES_PLAY=2`, Flood on and off);
  - add `par:check`.
- Run Scene Bot v2 and motes and the full e2e.
- Three reviewer lenses plus a Codex read-only review.
- Fix pass.
- RM §8 "✅ built" note.

**Separate glossary task (G, any time after the M15 integration; Codex, about 1 hour).** `BUILT` += M12, M13 and M14. Rewrite the `pending retirements` assertion (`glossary.test.ts:1096`) so that an empty pending list is valid. Fix any strings the newly built retirements expose (for example 'Star Road', retired in M12). The files are `tests/glossary.test.ts` and the strings it flags.

**Flip PR** (later, owner-gated):

- `RULES_VERSION = 2`, `RULES_V2_VOYAGE_FROM` and `REMIX_RULES = 2`;
- the `levels.snapshot.test.ts` freeze guard extended to 120 rows, and v2 salt tables split from v1;
- the final `includeFlood` value, with `par.json` v2 and the v2 snapshots regenerated if it changed;
- v1 sims moved to nightly;
- the release notes and What's new.

---

# Part 2: M16, Collector's Edition and experiments

## §1 Goal and acceptance

**Goal (RM:1640, RM:684, RM:983).**

- The Collector's Edition: "everything released to date except the current and future Roads, fixed at the purchase date". RM:684 says only "$19.99 once its parts are worth at least $33.32; $14.99 if it ships earlier". Contents only, no savings claim. Headline gate: **"Price rule met"**.
- Two experiments behind sim gates: the sunlit and night halves; an optional, reward-only terraforming round.
- The family subscription, revisited only if the owner wants it.
- M16 is size M.

**Parts arithmetic.** Derived from `fallbackPrice` (`tuning.ts` and `road01.ts`), under decision 111's reading.

| CE opens when…                                        | Parts (looks only; current Road's Pass, Theme and Singles excluded; Starter included)                                                         | Price               | Share                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------- |
| Road 1 is current (Road 0 past)                       | Starter 2.99 + Road 0 Pass 3.99 + Tidepool, Comet Candy (Themes) and Crystal Frost (Planet Pack) 3×2.99 + Nebula, Firefly 2×1.99 = **$19.93** | $14.99 would be 75% | ✗ fails the ≤ 60% amendment |
| **Road 2 is current** (Roads 0 and 1 past)            | + Road 1 Pass 3.99 + Paper Garden 2.99 + Crescent Lace 1.99 = **$28.90**                                                                      | **$14.99**          | **51.9%** ✓                 |
| Road 3 is current (Road 2 assumed 3.99 / 2.99 / 1.99) | + 8.97 = **$37.87** ≥ $33.32                                                                                                                  | **$19.99**          | 52.8% ✓                     |

**Two explicit amendments** (recorded in decisions 111 and 112, not derived from the spec):

- **The ≤ 60% rule at $14.99 is new.** RM:684's $33.32 is exactly $19.99 / 0.6, so the spec implies a 60% rule only for $19.99. This map extends the same rule to $14.99 (parts ≥ $24.98). That is what rules out opening at Road 1.
- **Decision 84 is amended.** Decision 84 says that with Road 0 past, Paper Garden "gets M16's Collector's Edition to 3 Themes", which counts Road 1's Theme while Road 1 is current. Decision 111 excludes the current Road's Theme. Under this map the CE opens at Road 2, when Paper Garden is a Past Road's Theme, so the two agree in practice. Decision 84's wording changes to "…once Road 1 is past".

**Acceptance.**

1. **Price rule (CI unit, PR).**
   - At the CE's `saleFrom` and at every later Road `opensOn` in `ROAD_CATALOG`, parts ≥ price / 0.6 (the amendment above).
   - $19.99 only when parts ≥ $33.32.
   - The test prints the recommended tier per Road date for the owner.
2. **Contents.**
   - `collectorsContents(day)` is a pure function of the UTC day and constants.
   - **What the family saw is what they get.**
     - Before `iap.purchase`, the buy flow stores a **contents quote** following the Piggy precedent (`pendingPiggy`, `app.ts:1380`): `pendingCollectors = { shownIds, shownDay }`, where `shownIds = collectorsContents(utcToday())`.
     - The grant is the **union** of `shownIds` and `collectorsContents(utcDay(originalPurchaseDate))`.
     - The frozen CE record stores that union. The backup and restore keep-lists carry the record.
   - **Restore** on a device without the record (no backup) uses the Apple-date list. A sheet/grant difference can only come from the skew window around midnight UTC, a wrong device clock or a Road boundary.
   - Unit tests cover:
     - the device clock ahead of and behind Apple's date, across a Road `opensOn`;
     - a purchase within minutes of midnight UTC;
     - an advanced `roadSeenDay`, which the sheet never reads.
       In every case the grant ⊇ the sheet. A restore with the record is identical; without it, it is the Apple-date list.
   - Items released after the purchase day never join, except through the quote.
   - Consumables and gem- or stardust-priced looks are never included (one currency, §6.6).
3. **Purchase date.**
   - The plugin returns `originalPurchaseDate` in `transactions()`, the journal append and the `purchase()` resolve.
   - `owned()`/`restore()` return `{id, originalPurchasedAt?}`.
   - Old journal records without the field are still accepted (`iap-journal.test.ts`).
   - The device clock is used for CE contents only through the quote, which can only add.
4. **Ownership and refunds.**
   - The CE is a separate entitlement record. A CE refund revokes only the record, and parts bought separately stay.
   - A part refund never removes what the CE still covers.
   - CE-granted Pass lanes are looks-only (`passLooksOnly`; no third drone, `homeworld.ts:317-321`).
   - The restore keep-list (decision 77) and the reset keep-list cover the record.
   - The 7-day quiet period and the spending reminder count the CE.
5. **Charter and kid safety.**
   - **The CE never renders, prices or sells before its `saleFrom`.** This is a unit test plus `prices.spec`. `saleFrom` absent means never.
     - It filters the shop list (`shop.ts:27`), the `prices()` request (`app.ts:292`) and `canBuy`.
     - A verified Apple transaction is **never** dropped by the sale gate. A grant or restore before `saleFrom` (a wrong clock, Family Sharing) still delivers, so a family that paid is never refused.
   - Gate v2 on buy (`e2e/gate.spec.ts`).
   - 0 kid-side prices (`e2e/prices.spec.ts`).
   - Contents sheet, plus a receipt card that says where each item went.
   - Policy 0 hits for "value", "bonus", "save", "N×", "%" and "best".
   - Title ≤ 30 and description ≤ 45 characters in 6 locales (`storedocs.test.ts:63-105`).
   - Catalogue rows match `PocketPlanet.storekit`, `store/catalogue-sheet.md` and `store/compliance.md`.
6. **Economy.**
   - The Payer variant that buys the CE equals the no-purchase twin on Homeworld L5 day, all Labs at 5, and Road finish days (decision 55).
   - **B5 ≥ 0.8** (Gate, decision 86, nightly hard) is unchanged (the CE contains no gems). ≥ 0.85 stays a PR Watch.
   - Free gems ≥ 95 per day.
7. **Experiments.** Each has a named gate report (decisions 115-116), and **neither ships without owner go**:
   - **day/night:**
     - aware-vs-blind gap ≥ 10; casual fail ≤ +1 point; Solver-0 1-star ≥ 90% on 1-120; spread ≤ 1.8×; surprise losses 0; chapter bands and pressure budget; Labs never hurt; max loadout ≤ +15;
     - "sunlit" comes from the **planet's spin phase at impact**, never the real clock. The sector solver and the Scene Bot model that phase (rule 7). A unit test shows that Daily and Challenge levels hash the same at any wall-clock time;
   - **terraform:**
     - the economy reports are identical (currency totals bit-for-bit) with the flag on and the round unused;
     - two **substitution personas** (Regular and Engaged replacing 1 in 5, and 1 in 2, campaign rounds with terraform rounds) report the progress forgone per active day: planets, stars, Essences, stardust and Road points. It must equal the forgone campaign rounds' yield, with no hidden penalty. It is a Watch with a printed table for the owner;
     - 0 timers or notifications.
8. **Saves.** Goldens a-n (n = S16's capture) load under v11.

## §2 Scope items

| #     | Item                                                                                                                                                                                                                                                                                                                                     | Status                                                                                                                                                                                                                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16.1  | **Purchase-date plumbing.** Swift (both record builders plus the `purchase()` resolve), `iap.ts` types and adapter, mock store dates, journal fixture                                                                                                                                                                                    | Now (S16). The sandbox Family Sharing and restore check, and the on-device journal verification, are **owner**                                                                                                                                                                                               |
| 16.2  | **CE contents model.** `collectorsContents(day)`, `partsValue(day)` and `cePriceTier(day)`, generic over `PRODUCTS` and the R2 `RoadContent` API. Road products join when their Road becomes Past at the purchase day. Launch looks products always count. A non-Road product added after the CE ships must carry `releasedOn` (CI lint) | Now (A16)                                                                                                                                                                                                                                                                                                    |
| 16.3  | **CE entitlement.** A separate `meta.collectorsEdition` record frozen at first grant, holding the union of the quote and the Apple-date contents. `ownsProduct`, `owns()`, grant, restore, revoke; keep-lists                                                                                                                            | Now (A16)                                                                                                                                                                                                                                                                                                    |
| 16.4  | **CE catalogue entry.** `kind: 'collectors_edition'`, in `src/meta/content/collectors.ts` (spread into `PRODUCTS`). **`saleFrom`** = Road 2's `opensOn`; absent means never listed, priced or sold. `.storekit` entry, sheet and compliance rows. Family Sharing on, or off until verified (decision 113 fallback)                       | Now, dormant. **App Store Connect creation is owner**                                                                                                                                                                                                                                                        |
| 16.5  | **CE UI.** Grown-ups shop row (filtered by `saleFrom`), computed contents sheet with an "already yours" note (no savings), the `pendingCollectors` quote, receipt "where it went", What's new, buy/restore/reconcile wiring with dates                                                                                                   | Now, dormant (B16)                                                                                                                                                                                                                                                                                           |
| 16.6  | **Opening the CE**                                                                                                                                                                                                                                                                                                                       | **Blocked:**<br>• the launch date, then Road 2's `opensOn` (owner);<br>• the App Store Connect product (owner);<br>• the sandbox check, with the Family Sharing fallback (owner);<br>• on-device StoreKit 2 journal verification (owner);<br>• the Gate v2 readability check with children aged 9-11 (owner) |
| 16.7  | **Experiment: sunlit and night halves.** A sim-only v3 candidate (not in `RULES_SUPPORTED`) with the named gate report. "Sunlit" comes from the planet's spin phase at impact, never the clock                                                                                                                                           | Now, sim-only (C16, W2). **Ship blocked on owner go plus T0 comprehension**                                                                                                                                                                                                                                  |
| 16.8  | **Experiment: reward-only terraforming round** on the Homeworld (grow a land patch on Isle 1 with normal shots; it can only pay; nothing worsens if skipped). The patch geometry lives in a shared `isleLayout.ts` that M17's Isle 2 and decision 123 reuse                                                                              | Now, behind the `TERRAFORM_ENABLED = false` flag (D16, W2). **Ship on owner go**                                                                                                                                                                                                                             |
| 16.9  | **Family subscription**                                                                                                                                                                                                                                                                                                                  | **Not built** (decision 117)                                                                                                                                                                                                                                                                                 |
| 16.10 | **Multi-Road prerequisite.** `ROAD_CONTENT_ROADS`, `productOpen` and the What's new list are generic                                                                                                                                                                                                                                     | **Delivered by the R2 track (W1.5)** before W2. S16 verifies it against the `RoadContent` API                                                                                                                                                                                                                |

## §3 Data, save and RULES changes

- **RULES: none shipped.**
  - Day/night is `src/core/v3/daynight.ts`, a candidate rule set used only by sims. It is not in `RULES_SUPPORTED`, so it cannot reach a player, a checkpoint or a code.
  - "Sunlit" is a pure function of the planet's spin phase at impact (`sunlit(L, rot, sector)`). The real clock is never an input: decision 27's real clock is for friends only, and a clock rule would make Daily and Challenge time-dependent and reward playing at a certain hour.
  - The sector solver and the Scene Bot need a phase model (rule 7). C16 builds it in the candidate.
  - If the owner says go, it becomes `RULES_VERSION` 3 with the same side-by-side pattern, an effective version and a cutover; `par.json` gains `v3`.
- **Plugin and journal.**
  - `JournalRecord.originalPurchasedAt?: number` and `IapEvent.originalPurchasedAt?`.
  - The Swift dictionaries add `"originalPurchaseDate"` in ms.
  - `UserDefaults` `verifiedPurchaseJournal.v1` keeps its key; old entries simply lack the field.
- **Catalogue types** (S16, `m12types.ts`):
  - `ProductKind += 'collectors_edition'`;
  - `ProductDef.releasedOn?: string` (UTC day);
  - **`ProductDef.saleFrom?: string`**, a local day like `opensOn`. For a product that has it, absent means never on sale. It is read by the shop list, the `prices()` request and `canBuy`, never by grant or restore.
  - Existing products don't set it, so their behaviour is unchanged.
- **Save v11** (v10 is R2's).
  - `meta.collectorsEdition?: { txId: string; day: string /* UTC day of originalPurchaseDate */; productIds: string[] /* union of quote and Apple-date contents */ }`, frozen at first grant.
  - `pendingCollectors?: { shownIds: string[]; shownDay: string }`. It is set before `iap.purchase` and cleared on grant, cancel or failure, like `pendingPiggy`.
  - `terraform: { patches: number }`: no dates, no streaks, no timers.
  - `m16Migrated`.
- **Contents day fallback order:** `originalPurchaseDate` → `purchaseDate` → the stored record's `day` → (mock or dev only) the grant day. The quote adds to that list; it never replaces it.
- **Goldens** (named by the build they come from):
  - S16 captures `n-trunk-r2-<sha>.v10.json` from the trunk after the M15 and R2 integrations, before its edits. It has the Road 0 Pass owned, Paper Garden owned and a Road 1 Pass refund history.
  - When 1.3 is cut, `release-1.3.v11.json` is captured from that build for M17.
  - `tests/fixtures/iap/journal-legacy.json`: records without the new field.
  - `tests/fixtures/iap/ce-family.json`: a mocked shared transaction.
  - `tests/fixtures/iap/ce-skew.json`: purchases either side of midnight UTC and of a Road `opensOn`, with the device clock ahead and behind.

## §4 UI and copy

**Strings: about 25.**

- CE: about 15. Title ≤ 30 and description ≤ 45 characters in every language; a contents header "Everything released before {date}"; "Already yours"; 4 receipt lines; a What's new bullet.
- Terraform: about 10. Name, intro, reward preview, 3 result lines, a VO label, an Isle label. Dormant.
- Day/night: 0 (sim-only).

**Noun budget: 0 impact.** CE is Grown-ups only. Terraform opens after Homeworld lands appear (after planet 20, decision 59).

**Kid-safe checks.**

- CE:
  - Grown-ups only, behind Gate v2;
  - the kid side gets only the "New" dot (§6.4), and only from `saleFrom`;
  - fixed price, previewable contents. What the sheet shows is never more than what is granted (the quote);
  - no "value", "bonus", "save" or "N×";
  - one item, one price, one currency;
  - no lock or shame after a refund;
  - no kid-facing offer card (critiques.md:584-587);
  - no exclusive status extras (no Collector title or frame; decision 111).
- Terraform:
  - reward shown before play;
  - never damage, decay, a calendar threat or a check-in reason (HW:638);
  - no notifications;
  - not a Wish target (HW:371).
- Accessibility: Reduce Motion and VoiceOver on the terraform round; the CE contents sheet as a VoiceOver list; 320×568 contents sheet scroll.

## §5 Sims and gates (placement)

| Check                                                                                                                                                                                                                                                                               | Where                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Price-rule unit (with the ≤ 60% amendment), contents purity, the quote-union and clock-skew tests, restore equivalence, refund separability, `passLooksOnly`, the `releasedOn` lint, and **"the CE never renders, prices or sells before `saleFrom`"** (shop, `prices()`, `canBuy`) | PR `npm test`                                                                            |
| `store`, `storedocs`, `m14-product-surfaces` (CE kind maps contents to product ids), `paywall`, `policy`, `iap-journal`, `backup`, `tuning.snapshot`                                                                                                                                | PR `npm test`                                                                            |
| Gate v2 and no kid-side price for the CE; the CE absent before `saleFrom`                                                                                                                                                                                                           | PR `e2e` (`gate.spec`, `prices.spec`; Claude runs)                                       |
| Payer-plus-CE twin, B5 (≥ 0.8 Gate, ≥ 0.85 Watch), free gems                                                                                                                                                                                                                        | PR `sim:economy` (90 days); nightly `sim:economy:all` (180 days)                         |
| Day/night candidate gate report, including the spin-phase solver and the "same hash at any wall-clock time" check                                                                                                                                                                   | New nightly `experiments` job (report only; becomes a PR `balance-v3` job on go)         |
| Terraform: economy identity (flag on, round unused) and the substitution personas (1 in 5 and 1 in 2 rounds) with the progress-forgone table                                                                                                                                        | PR `sim:economy` quick identity check, plus nightly `tests/sim/economy/terraform.sim.ts` |
| Sandbox: `originalPurchaseDate` for buy, restore and Family Sharing (or the decision 113 fallback); on-device journal matrix                                                                                                                                                        | **Owner**, with the M12 sandbox plan (a second test account) and `docs/qa/release.md`    |

## §6 Conflicts, risks and owner decisions

**Conflicts and risks.**

- **Single-Road hard-wiring blocks a multi-Road CE:**
  - `cosmetics.ts:259, 510-514, 531, 550-561`;
  - `starroad.ts:144`;
  - `roadAvailability.ts:8`;
  - `app.ts:1473`;
  - `grownups.ts:185`;
  - `wishes.ts:483`;
  - `stickers.ts:123-135`;
  - `tuning.ts:297, 340`;
  - `roadLandmarks.ts` `roadLandmarkName()`;
  - `main.ts:109`;
  - `store.test.ts:8`.

  **The R2 track (W1.5) owns this** and publishes the `RoadContent` API before W2 (decision 118).

- **A `ProductDef` without `opensOn` is listed and buyable at once** (`starroad.ts:142-146`, `shop.ts:27`, `canBuy` at `app.ts:1334`). Natively it shows "Price unavailable" until Apple returns a price, then it is buyable. Fix: `saleFrom` (§3).
- **Sheet/grant mismatch.** Road status on the sheet uses local `opensOn` and `roadSeenDay` (`roadAvailability.ts:14-16`, `starroad.ts:147-148`), while grants use Apple's UTC day. Fix: the sheet computes from the UTC day (never `roadSeenDay`), the quote is stored, and the grant is the union.
- **`buy()` grants with no purchase date** (`app.ts:1385`), so it uses the device clock (`app.ts:1425`). B16 passes the Apple date.
- **The reconcile path skips old transactions** (`app.ts:1555`) and restore is ids-only (`app.ts:1501-1511`). B16 routes the CE through dated records.
- **Revocation checks only `valid.has(productId)`** (`app.ts:1541-1553`). A16 and B16 make it CE-aware.
- **`store.test.ts:92-102` requires a sampler for themes and packs.** The CE must not use kind `theme`.
- **App Review 3.1.1: date-dependent contents must be explicit.** The product page lists contents as of today; the receipt lists what was granted.
- **USD fallback prices drive the 60% rule.** Storefront tiers differ by country; the owner sets equivalents.
- **Experiments touch frozen rules or the economy.** Day/night stays out of `RULES_SUPPORTED` and off the clock. Terraform pays looks only.
- **Terraform shares Homeworld UI files with M17.** The patch drawing needs `homeworld/canvas.ts`, and the entry point needs `panel.ts`/`sheets.ts`, all of which C17 owns in W3. D16 therefore runs in **W2**, and the M16 integration adds those hooks **before W3** starts. The patch spot is defined in the shared `src/meta/content/isleLayout.ts` (Isle 1 footprint and decoration spots 1-3), which decision 123's Isle 2 layout reuses.
- **The tuning snapshot is shared.** A16's CE `ProductDef` changes the `PRODUCTS` hash in `tests/__snapshots__/tuning.snapshot.test.ts.snap`, and S17 regenerates the same file. **S17 starts after A16 merges.**
- **Name clash:** the sim persona 'Collector' (`career.ts:115`, `collector.sim.ts`) vs Collector's Edition. D16, which owns `career.ts` in W2 for the terraform personas, renames the persona label in reports only.

**Owner decisions.**

| #   | Decision                                                          | Recommended default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Alternative                                                                                                                                          |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 111 | **CE contents and reading**                                       | Every **looks** product released before the purchase day: the launch looks products (Starter Crew included, since it is looks-only), plus every product of Roads that are **Past** on that day. The current Road's Pass, Theme and Singles are excluded (RM "except the current and future Roads"). Excluded: consumables (gems, Piggy) and gem- or stardust-priced looks. **No extras** (no Collector title, frame or Keeper set: paid status). Family Sharing on (permanent; see the decision 113 fallback). **Amends decision 84** to "with Road 1 past, Paper Garden brings the CE to 3 Themes" | Count the current Road's Theme and Single (decision 82 sells them early): $33.88 at Road 2, enough for $19.99. This also keeps decision 84's wording |
| 112 | **CE price and timing**                                           | **On sale from Road 2's `opensOn` at $14.99** (parts $28.90, 52%), via `saleFrom` = Road 2's `opensOn`, which derives from the launch date. **Amendment to RM:684:** the ≤ 60% rule also applies at $14.99 (parts ≥ $24.98), which rules out Road 1 current. Move to **$19.99** at the first Road opening where parts ≥ $33.32 (Road 3 at current shapes, $37.87). The CI test prints the tier, and the owner changes the price in App Store Connect. The ≤ 60% rule becomes a CI gate                                                                                                              | Wait and launch only at $19.99 (Road 3, about 8 weeks later). Or sell at $14.99 from Road 1 as RM:684 literally allows (75%; not recommended)        |
| 113 | **CE date source**                                                | Apple `originalPurchaseDate`, UTC day, frozen in the CE record at first grant, **unioned with the contents quote the family saw**. Fallbacks as in §3. The device clock can only add, through the quote. Before opening, the owner runs the sandbox check for Family Sharing and restore, plus the on-device journal matrix. **If the sandbox cannot produce a `familyShared` transaction:** the owner creates the CE with Family Sharing **off**, and turns it on after one real shared transaction has been checked in the journal. Apple allows turning it on later, never off                   | Use `purchaseDate` (risk: restored or shared dates differ)                                                                                           |
| 114 | **CE refunds and overlap**                                        | Separate record. A refund revokes the CE record only. Parts bought separately are kept, and parts covered by the CE are kept while it is valid. CE Pass lanes are looks-only. The contents sheet notes "already yours" with no price difference. The quiet period and the reminder count it                                                                                                                                                                                                                                                                                                         | Grant parts into `productEntitlements` (simpler, but refunds can't be separated)                                                                     |
| 115 | **Day/night experiment**                                          | **Sim-only v3 candidate in M16.** "Sunlit" comes from the **planet's spin phase at impact, never the real clock**, and the sector solver and Scene Bot model the phase. Named gates as in §1 item 7. Shipping requires owner go **plus** T0 comprehension 4 of 5 ("what does the sunny side do to Ice?"), as `RULES_VERSION` 3 on new planets only, using the M15 compatibility machinery. Not folded into v2                                                                                                                                                                                       | Fold into v2 (couples M15's ship to an unproven rule)                                                                                                |
| 116 | **Terraforming round**                                            | Dormant flag. Opens with Homeworld lands (after planet 20). **Reward: looks only** (an Isle 1 land patch that grows with normal shots, at a spot fixed in the shared `isleLayout.ts`). 0 currency or Essence. Counts for **nothing** (Landmarks, Wishes, Road points, Comet Pier: `PierMode` unchanged). Built on the M10.5 `practice` mode. Noun "Garden Patch" (working; owner approves). Gates: economy identical with the flag on and the round unused; the substitution personas' progress-forgone table (Watch)                                                                               | Pay a small stardust reward (moves the economy bands, needs a gate pass)                                                                             |
| 117 | **Family subscription**                                           | **Not built.** Decision 2 default stands; revisit after Road 1 and Road 2 open on time. If revived later: no Collect-all, no subscriber-only dated drops, no auto-converting trial, and the plugin needs expiry and renewal data                                                                                                                                                                                                                                                                                                                                                                    | Spec it now (an Apple 3.1.2 ongoing-value risk)                                                                                                      |
| 118 | **Road 2 track, generalisation and save numbering across trains** | **The R2 track is an explicit wave (W1.5):**<br>• its own step 0 (SR2), with save **v10**: an identity migration if nothing changes;<br>• a content package (AR2) and an integration pass;<br>• it starts after S15 and runs beside A15-E15;<br>• it generalises single-Road wiring and publishes the `RoadContent` API that A16/B16 consume.<br>Save numbers follow merge order (M15 v9, R2 v10, M16 v11, M17 v12), with idempotent migration flags. Goldens are named by the build they come from                                                                                                 | M16 does the generalisation (collides with Road 2 files)                                                                                             |

## §7 Developer packages (Codex)

### S16: step 0 (serial; after the M15 and R2 integrations)

- **Captures first:** the `n-trunk-r2-<sha>.v10` golden and the three IAP fixtures.
- **Swift:** `ios/App/App/PurchaseJournalPlugin.swift` adds `originalPurchaseDate` to both builders and the `purchase()` resolve. `owned()`/`restore()` return objects.
- **JS adapter:** `src/meta/iap.ts` accepts both legacy `string[]` and the new objects; the mock store gets dates.
- **Types:** `src/meta/m12types.ts` (`ProductKind`, `releasedOn?`, `saleFrom?`); new `src/meta/m16types.ts`.
- **Catalogue seam:** new `src/meta/content/collectors.ts` (an empty `COLLECTORS_PRODUCTS` stub), plus the one spread line in `src/meta/tuning.ts`.
- **Save v11:** `src/meta/profile.ts` (`collectorsEdition`, `pendingCollectors`, `terraform`).
- **Keep-lists:** `src/meta/backup.ts`; `src/ui/flows/settings.ts` (reset keep).
- **Stubs:** `src/meta/collectors.ts`; `src/meta/terraform.ts` (`TERRAFORM_ENABLED = false`); new `src/meta/content/isleLayout.ts` (the Isle 1 footprint, `isleDecor` spots 1-3 and the patch spot, taken from today's `canvas.ts:557` geometry).
- **Tests:** `tests/{iap-journal,saves,migrate,backup}.test.ts`.
- **Docs:** decisions 111-118 in RM §10, with the decision 84 and RM:684 amendments; `docs/handoff/m16-step0.md`.

**Owned files:** exactly those above, plus the new fixtures.

**Exposes:**

```ts
OwnedEntry = { id: string; originalPurchasedAt?: number }
collectorsContents(day: string): string[]   // stub
partsValueCents(day: string): number         // stub
cePriceTier(day: string): '$14.99' | '$19.99' | null   // stub
onSale(def: ProductDef, day: string): boolean          // saleFrom gate
```

Also the `CollectorsRecord`, `CollectorsQuote`, `TerraformState` and `IsleLayout` types.

### Parallel packages after S16 (W2)

| Pkg                                      | Scope                                | Owned files (exclusive)                                                                                                                                                                                                                                                                                                                                                                                   | Exposes / consumes                                                                                                                                                             |
| ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A16 CE model, entitlement, catalogue** | 16.2-16.4                            | `src/meta/collectors.ts`, `src/meta/content/collectors.ts` (the CE `ProductDef` with `saleFrom`), `src/meta/economy.ts`, `src/meta/cosmetics.ts`, `src/meta/purchaseGrants.ts`, `ios/App/PocketPlanet.storekit`, `store/catalogue-sheet.md`, `store/compliance.md`, `tests/{store,storedocs,paywall,m14-product-surfaces,tuning.snapshot}.test.ts` and the tuning `.snap`, new `tests/collectors.test.ts` | Exposes `collectorsContents`, `partsValueCents`, `cePriceTier`, `grantCollectors(p, quote, appleDay)`, `revokeCollectors` and `ownsViaCollectors`. Consumes R2's `RoadContent` |
| **B16 CE UI and app wiring**             | 16.5                                 | `src/ui/screens/shop.ts`, `src/ui/flows/contents.ts`, `src/ui/flows/receipt.ts`, `src/ui/screens/grownups.ts`, `src/ui/app.ts` (the buy quote, grant, `applyOwned`, reconcile, revoke and `prices()` paths only), `src/meta/starroad.ts` (`onSale` wiring), `tests/{m14-purchase-open,grownups}.test.ts`, `e2e/{gate,prices}.spec.ts`                                                                     | Consumes A16 (it can start against the S16 stubs)                                                                                                                              |
| **C16 Day/night candidate (sim-only)**   | 16.7                                 | new `src/core/v3/daynight.ts`, new `tests/daynight.test.ts`, new `tests/sim/daynight.sim.ts`                                                                                                                                                                                                                                                                                                              | Exposes `RULESET_V3_CANDIDATE`, `sunlit(L, rot, sector)` and the gate report. No shipped import                                                                                |
| **D16 Terraforming round (dormant)**     | 16.8, plus the substitution personas | `src/meta/terraform.ts`, new `src/ui/screens/homeworld/terraform.ts`, new `src/ui/art/terraform.ts` (drawing at the `isleLayout` spot), `tests/sim/economy/career.ts` (terraform persona hook and the 'Collector' report label only), new `tests/terraform.test.ts`, new `tests/sim/economy/terraform.sim.ts`                                                                                             | Exposes `openTerraform(app)`, `settleTerraform(p, result)` and `drawPatch(ctx, layout, patches)`                                                                               |

**S17 starts after A16 merges** (Part 3 §7). It runs alongside B16, C16, D16 and the M16 integration; their files are disjoint.

**Integration (Claude, W2; must merge before W3).**

- The Homeworld terraform entry point (flag off) in `panel.ts`/`sheets.ts`, and the `drawPatch` call in `canvas.ts`, so C17 inherits them in W3.
- Translations.
- The CI `experiments` nightly job.
- e2e gate and prices runs.
- Reviews: economy and kid safety are mandatory lenses.
- Hand the owner the catalogue sheet, the Family Sharing fallback note and the opening checklist (16.6).

---

# Part 3: M17, Homeworld Horizons

## §1 Goal and acceptance

**Goal (RM:1642-1659, HW §5.2/§6.3, decision 26).** Homeworld Levels 6-10:

- plots grow to 24;
- Dens 3 and 4 bring room for 24 friends;
- a second Floating Isle;
- Landmarks 6-10 (Moon Garden, Coral Steps, Cloud Swing, Crystal Grotto, Star Harbour);
- the Homeworld becomes a small bright world on the Star Map at Level 10;
- **no new shot power**.

It comes after M15. Size M.

**Level table.** The chapter needs are rescaled by decision 120 so that no unreviewed planet is mandatory. HW:442-446 desk values are shown in brackets. Costs are desk values, which decision 119 may rescale.

| Level | Needs                                                                  | Opens                                                              |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 6     | Chapter 11 (HW 11); 40,000 ✨; 80 stone, dew, leaf; 40 ember; 40 frost | 16 plots, Den 3 (18 friends), site 6 Moon Garden                   |
| 7     | Chapter 12 (HW 14); 50,000; 100; 50; 50                                | 18 plots, Isle 2 (+3 decoration spots), site 7                     |
| 8     | Chapter 12 (HW 17); 65,000; 120; 60; 60                                | 20 plots, Den 4 (24 friends), site 8                               |
| 9     | Chapter 12 (HW 20); 80,000; 140; 70; 70                                | 22 plots, site 9                                                   |
| 10    | Chapter 12 (HW 24); 100,000; 160; 80; 80                               | 24 plots, site 10, Star Map bright world, star crown on the Beacon |

Why the chapter rescale is safe:

- Planets 121-240 have no difficulty gate. `par.json` and trips stop at 120 (`trips.ts:39`).
- Regular reaches planet 121 on day 23 and Engaged on day 9, so the chapter need never binds them. Costs set the pace.
- For slower players, a chapter-24 need would make 120 unreviewed planets mandatory.

**Totals:** 335,000 ✨ (+ 26,760 for Dens 3-4), 600 each of stone, dew and leaf, 300 each of ember and frost.

**Supply today** (Regular, 90 days): about 199k ✨ earned in total, 24k left. Ember 43 / 76 at day 60 / 90, about 1.1 a day after day 60. So L10 at desk values lands far beyond day 200.

**Acceptance.**

1. Every §7.5 band and HW §10.4 band is still green:
   - round frost 17.8-21.8;
   - trips 25-33%;
   - decision 65 ≤ 0.5;
   - free gems ≥ 95 per day;
   - B3/B4;
   - **B5 ≥ 0.8 for Road 1** (Gate, decision 86, nightly hard; ≥ 0.85 is a PR Watch). The extra friendship gems from 24 friends are measured against it;
   - Greenhouse boosters ≤ 0.33 per planet;
   - boosters ≤ 0.5 per planet;
   - idle ≤ 1.5× active;
   - money never buys growth (decision 55 twin, now including Level 10 day).
2. Lab cap 5 and top tune 4 are unchanged (`BUILDING_MAX_LEVEL 5`, `app.ts:1570`).
3. **Homeworld Level 10:** Regular **no earlier than day 120** (Gate, nightly 240-day run) and **no later than day 200** (Watch, decision 119). Colour stranding (no level waits > 10 days for one colour while another is > 300) is a Watch.
4. **Landmarks 6-10:**
   - each feat stage 1-3 active days, none over 5 (Gate, Regular);
   - lint: taught features only, two equal-effort "or" routes, deliveries of leaf, dew or stone only;
   - **0 moments with two Landmarks in progress** across home and Road Landmarks (unit plus sim assertion);
   - the queue order is deterministic from stored `eligibleOn` days, and a backup restore reproduces it (unit).
5. **No round fixture changes.** Every M15 v1/v2 fixture, `par.json` and the Scene Bot outputs are byte-identical (decision 26).
6. **Dormant means dormant.** At `HOME_OPEN_LEVEL = 5`:
   - `canExpand` returns `'max'` at Level 5;
   - every Level-5 visual (`panel.ts`, `canvas.ts`, `starmap.ts`, `structures.ts`, `sheets.ts`, `nextup.ts`) and the 'home' sticker are unchanged;
   - this is unit-tested after S17 and after every W3 package.
7. **No unreviewed planet is mandatory:** every Level 6-10 chapter need is ≤ 12 (unit test over `HOME_LEVEL_REQUIREMENTS`).
8. **60 fps with 24 friends on the oldest device** (owner). Friends beyond 14 animate at half rate; the simulator frame-time harness reports.
9. **320×568:**
   - Playwright J5 at Level 10;
   - no plot, Isle, site, terraform patch or hit target off-canvas;
   - plot hit radius ≥ 28 px (`canvas.ts:812`);
   - the VoiceOver plot list complete (`panel.ts:199`).
10. **Saves.**
    - These goldens load under v12: `j-release-1.0.v6`, `k-release-1.1.v7`, `m-release-1.2.v8`, S16's `n-trunk-r2-<sha>.v10`, `release-1.3.v11` (once 1.3 is cut) and S17's own capture.
    - Level 5 players lose nothing: the 'home' sticker, glow chip, ring of light and crystal tier are kept.
    - Backup ≤ 256 KB raw / 96 KB compressed at 240 days with 24 friends.
11. **Album:** 'home10' is `bonus: true`. Milestone gems and the Feats page are unchanged for every golden.
12. **Strings** are translated into 6 languages. Noun cap 21 unaffected.

## §2 Scope items

| #    | Item                                                                                                                                                                                     | Status                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 17.1 | **Levels 6-10 logic:** requirements, `canExpand`/`expand` to 24 plots, per-level Den max (Den 3 at L6, Den 4 at L8), Den capacity to 24, Isle 2 at L7, checklists, `essenceStillWanted`  | Now, dormant behind `HOME_OPEN_LEVEL = 5`, with `HOMEWORLD_MAX_LEVEL` equal to it |
| 17.2 | **Landmarks 6-10:** content (3 stages, two routes each, rewards 100-300 ✨ or 10-20 gems as for 1-5, shown up front), art, Inbox letters, Passport "Landmarks 0-10"                      | Now, dormant                                                                      |
| 17.3 | **One Landmark queue** across home Landmarks and Road Landmarks, ordered by stored `eligibleOn` (decision 121)                                                                           | Now (S17 contract)                                                                |
| 17.4 | **Moon Garden, Isle 2, Star Map bright world.** Canvas geometry cap and rescale for 320×568 (using `isleLayout.ts`), sites between plots k and k+1, skyline markers 6-10, art tiers 6-10 | Now, dormant                                                                      |
| 17.5 | **Level 5 legacy protections:** pin the 'home' sticker to L5, add a new **bonus** 'home10' sticker, keep the glow chip, ring and crystal tier for ≥ 5, generalise literal "5" strings    | Now (S17 sticker; C17 visuals)                                                    |
| 17.6 | **Economy sim past planet 120 and day 180:** career continues new planets to 240, 240-day nightly; cost tuning                                                                           | Now (D17)                                                                         |
| 17.7 | **24-friend performance:** half-rate animation beyond 14                                                                                                                                 | Now. **Device test is owner**                                                     |
| 17.8 | **The flip PR:** `HOME_OPEN_LEVEL` 5 → 10, which moves `HOMEWORLD_MAX_LEVEL` with it                                                                                                     | **Blocked** on acceptance plus the owner's device test plus names                 |

## §3 Data, save and RULES changes

- **RULES: none.** `RULES_VERSION`, `RULES_SUPPORTED`, `par.json` and every level and round fixture are unchanged (asserted).
- **Data.**
  - `HOME_LEVEL_REQUIREMENTS` 6-10 move to new `src/meta/content/homeLevels.ts`. D17 tunes the values; `tuning.ts` spreads them. The chapter needs follow decision 120.
  - New **`HOMEWORLD_DATA_MAX`** = `max(keys(HOME_LEVEL_REQUIREMENTS))` (10). Only data code reads it: the requirements lint, checklists for previews, and the tests.
  - New `HOME_OPEN_LEVEL = 5`.
  - **`HOMEWORLD_MAX_LEVEL` stays exported and becomes `= HOME_OPEN_LEVEL`** (`tuning.ts:517`). Every existing reader keeps today's behaviour at 5 with no edit, so S17 needs no file that A17/C17 own:
    - `canExpand` (`homeworld.ts:437`);
    - `nextup.ts:219/257/325/355`;
    - `panel.ts:194/356/418`, `canvas.ts:515`, `starmap.ts:43-49`, `structures.ts:348` and `sheets.ts:1044`;
    - the `profile.ts:805/1154` clamps.
  - New `HOME_LEGACY_TOP = 5` for Level-5 visuals. A17 and C17 move each visual reader from `HOMEWORLD_MAX_LEVEL` to `HOME_LEGACY_TOP` or to the new L10 marks, **before the flip**. A grep test fails the flip PR if a UI file still compares to `HOMEWORLD_MAX_LEVEL` for a legacy mark.
  - `RING_PLOTS` = `[0,6,8,10,12,14,16,18,20,22,24]`.
  - `BuildingDef.maxByLevel?: Partial<Record<HomeworldLevel, number>>` (Den: 2 → 3 at L6, 4 at L8).
  - `BUILD_TIME` and `COST_K` are unchanged (building levels stay ≤ 5).
  - `LandmarkId` widens with `moon_garden | coral_steps | cloud_swing | crystal_grotto | star_harbour` (`homeworldLife.ts:5`).
  - LANDMARKS 6-10 live in new `src/meta/content/landmarks2.ts`, spread into LANDMARKS.
  - `tuning.snapshot.test.ts` hashes are regenerated in S17. S17 runs after A16, which also regenerates them.
- **Save v12** (v11 is M16's).
  - `home.isleDecor` length 3 → 6 (`homeworld.ts:183, 258`; `profile.ts:1156-1163` rebuilds at length 6). Spots 4-6 come from `isleLayout.ts` (Isle 2).
  - `home.isles: 1 | 2`.
  - New Landmark keys default automatically (`profile.ts:737-779` iterates `defaultHome().landmarks`).
  - **`eligibleOn?: string`** on every home and Road Landmark state. It is the Road-day (`max(today, roadSeenDay)`) on which the site was first observed eligible, and is never changed afterwards. The migration is deterministic and clock-free:
    - a site in progress (stage 1-3) keeps its place, because in-progress always finishes first;
    - an eligible home Landmark gets `''` (sorts first);
    - an eligible Road Landmark gets its Road's `opensOn` constant;
    - ineligible sites get none.
  - The Landmark order check (`profile.ts:947-948`) is extended.
  - The 'home' sticker is pinned to `HOME_LEGACY_TOP`.
  - `m17Migrated`.
- **Goldens.** S17 captures the latest trunk golden **before edits** (`o-trunk-m16-<sha>.v11`), with:
  - a Level 5 home and 14 friends;
  - Landmarks 1-5 finished and a Road Landmark in progress;
  - an eligible but unstarted Road 2 Landmark;
  - `isleDecor` with 3 placed;
  - the 'home' sticker earned.

## §4 UI and copy

**Strings: about 70** (RM says about 45; M11.5 used about 50 for five Landmarks). Decision 125.

- Level 6-10 opening lines: 10.
- Den 3 and Den 4 lines: 2.
- Isle 2: 3.
- Landmarks 6-10 (names, 3 stage titles, 6 route lines, gift line, letter): about 48.
- Star Map bright world: 2.
- Passport label generalised: 1.
- New sticker: 2.
- VoiceOver: 2.

**Noun budget: 0 impact.** Level 6 needs chapter 11.

**Kid-safe checks.**

- No timers, expiry, decay or chores.
- Rewards shown up front.
- Nothing bought or skipped.
- Delivery of leaf, dew or stone only (never frost or ember).
- No Homeworld notifications.
- Paid looks never brighter than earned ones (HW §12).
- The new sticker pays no gems (bonus).

**Layout and accessibility.**

- Planet radius growth is capped at the Level 5 size: `canvas.ts:382` is `min(w,h)·(0.2+0.028·level)`, which reaches 0.48 at L10 and pushes Isle 2 off-screen at `cx+1.24R`, `canvas.ts:557`. Levels 6-10 grow through rings, Isle 2 and the sky instead.
- Isle 2 and the terraform patch use the shared `isleLayout.ts` footprints. Isle 2's spots 4-6 must not overlap the M16 patch spot on Isle 1 (unit test).
- Sites are placed between plots k and k+1 (replacing `TAU/5` at `canvas.ts:316-319, 265, 867`).
- The skyline colour array is extended (`canvas.ts:502-513`).
- `.hw-mini-planet` classes run to level 10 (`styles.css:5771-5815`).
- The `levelOpening` switch is extended (`sheets.ts:1004-1017`).
- "Labs can reach level {n}" is hidden at r ≥ 5 (`sheets.ts:1077`).
- New-building icons use `maxByLevel` (`sheets.ts:1054`).
- Reduce Motion: no cloud ring or aurora motion.
- The VoiceOver plot list handles 24 plots.

## §5 Sims and gates (placement)

| Check                                                                                                                                                                                                                                                                                                                                                   | Where                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Level requirements (chapter needs ≤ 12), Den capacity to 24, `maxByLevel`, `RING_PLOTS`, the Landmark lint 6-10, the one-in-progress queue and `eligibleOn` order (including restore), legacy L5 visuals, **dormancy at `HOME_OPEN_LEVEL = 5`**, retirements (`retirements.test.ts:65-67`), album invariance ('home10' bonus), round fixtures unchanged | PR `npm test`                                                                        |
| Economy 90-day gates (unchanged, plus "L6 not reached by day 60" sanity)                                                                                                                                                                                                                                                                                | PR `sim:economy`                                                                     |
| **240-day career, planets to 240**: L10 day ≥ 120 (Gate), ≤ 200 (Watch); Landmark 6-10 stage pacing (Gate); colour stranding (Watch); B5 ≥ 0.8 with 24 friends (Gate); the M13/M14 gates re-reported under continuation (Watch for differences)                                                                                                         | Nightly `sim:economy:all` (new 240-day job, 60-minute timeout)                       |
| Profile size at 240 days (≤ 256 KB raw / 96 KB compressed)                                                                                                                                                                                                                                                                                              | Nightly (`profile-size.sim.ts`)                                                      |
| Difficulty lint 121-240 (Watch only; no Homeworld need depends on these planets)                                                                                                                                                                                                                                                                        | Nightly (`levels.lint.sim.ts` with `SIM_NIGHTLY`)                                    |
| J5 at Level 10, 320×568 and 390×844, 6 languages                                                                                                                                                                                                                                                                                                        | PR `e2e` (English) and nightly (6 languages, the existing `-g 'M11.5                 | M13 | M14'`grep extended with`M17`) |
| Simulator frame time with 24 friends                                                                                                                                                                                                                                                                                                                    | Claude in the Simulator (indicative) plus the **owner's oldest device** (acceptance) |

## §6 Conflicts, risks and owner decisions

**Conflicts and risks.**

1. **The sim cannot reach Levels 7-10.**
   - It replays planets ≤ 120 once `p.level > 120` (`career.ts:570`), caps at 180 days (`career.ts:877`), and loops over `[2,3,4,5]` (`career.ts:1055`).
   - It treats Essences as sinks only below L5 (`career.ts:343-347, 469, 565`), and `homeLevelDays` is typed `2|3|4|5` (`career.ts:180`).

   Generalising post-L5 spending moves the existing M13/M14 gates, so it runs as a separate continuation profile (decision 120).

2. **Ember binds:** 300 needed against about 1.1 a day. Decision 119. Note: M15's Firemount adds ember lands, so measure M17 costs on the **v2 tree**.
3. **Landmark 6 vs Road Landmarks.** Both open after the Beacon (`roadLandmarks.ts:89-98`, `landmarks.ts:157-165`), and `roundSettlement.ts:100-107` feeds both, so two could progress at once. That breaks HW §6.1 rule 1 and decision 89. Today `activeLandmark` and `activeRoadLandmark` are computed independently, with no stored eligibility day. Decision 121 adds `eligibleOn`.
4. **Raising the max silently regresses Level 5 players and opens Level 6 early.** `HOMEWORLD_MAX_LEVEL` is derived from the table keys (`tuning.ts:517`). Its readers are A17's and C17's files, and they start after S17:
   - `canExpand` at `homeworld.ts:437`;
   - `stickers.ts:66-72` (the live 'home' sticker would be lost);
   - `starmap.ts:39-50`;
   - `canvas.ts:515-521`;
   - `structures.ts:348`;
   - `panel.ts:194/356/418`;
   - `sheets.ts:1044-1050`;
   - `nextup.ts`.

   Fix: `HOMEWORLD_MAX_LEVEL` stays equal to `HOME_OPEN_LEVEL`, and the data max is `HOMEWORLD_DATA_MAX` (§3). S17 introduces `HOME_LEGACY_TOP`. A17/C17 migrate the readers before the flip.

5. **More friends mean more friendship gems.** Decision 61 A0 showed coverage dropping. Re-check B5 against the ≥ 0.8 Gate. Road 0's 0.776 stays the recorded exception.
6. **Decision 65 amendment (a)** orders trips by what Levels still want, so L6-10 demand shifts trips toward ember and frost. Re-measure A1/A3. `trips.test.ts:366` hard-codes `[2,3,4,5]`.
7. **Update-day jumps.** Launch-cohort players with banked Essences may take several levels on the day of the update. Accepted: levels stay sequential with the existing expand flow, and the gate measures from install day.
8. **Performance owed since M11.5** (RM:1525), now with 24 friends. Half-rate animation beyond 14 is not implemented yet (`canvas.ts:300-308`).
9. **Unreviewed planets would become mandatory.** At HW values, Level 7 needs chapter 14 and Level 10 chapter 24. Planets 121-240 have no difficulty gate, no `par.json` and no trips. Decision 120 rescales the needs to ≤ chapter 12.
10. **Shared files with M16.** The terraform hooks in `canvas.ts`/`panel.ts`/`sheets.ts` merge in the M16 integration, before W3, so C17 inherits them. `career.ts` passes from D16 (W2) to D17 (W3).

**Owner decisions.**

| #   | Decision                                             | Recommended default                                                                                                                                                                                                                                                                                                                                                      | Alternative                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 119 | **Level 6-10 costs**                                 | Start from the HW §5.2 desk values. Decision 22-style fallback: scale stardust and the ember and frost needs so that Regular reaches **L10 between day 120 (Gate) and day 200 (Watch)**, measured on the v2 tree. Chapter needs follow decision 120. Keep the colour-stranding Watch. D17 records the final table                                                        | Keep the desk values (L10 likely after day 250)                                                                                                                                                                                                            |
| 120 | **Sim beyond planet 120 and day 180; chapter needs** | A new career continuation profile plays new planets to 240 over 240 days (nightly) for M17 bands. The existing 90- and 180-day gate runs keep the 120 replay policy. **The Level 6-10 chapter needs are capped at chapter 12** (L6 11, L7-L10 12; amends HW §5.2), so no unreviewed planet is mandatory. Difficulty beyond 120 stays a Watch (the 121-240 lint, nightly) | Keep HW's chapters 14-24 and, before the M17 flip, make 121-240 a Gate: the PR/nightly difficulty lint and chapter bands (FL §4.9 61-120 bands) on 121-240, plus a salt lever for those planets. This is larger work, and it couples M17 to a curve review |
| 121 | **One Landmark queue**                               | A single in-progress Landmark across home and Road Landmarks. An in-progress Landmark always finishes first. Otherwise the queue is ordered by **stored `eligibleOn`** (save v12, with the deterministic clock-free migration in §3); ties go to the home Landmark first. Nothing expires. Amend decision 89's text accordingly                                          | Alternate home and Road. Or a stateless "home first, then Road order" rule, which needs no save field but can pre-empt a long-eligible Road Landmark                                                                                                       |
| 122 | **Level 5 legacy and new Level 10 marks**            | Everything earned at L5 stays: the sticker is pinned, and the glow chip, ring of light and crystal tier remain for ≥ 5. Level 10 adds a new 'home10' sticker (**`bonus: true`**: no album gems, no Feats-page change), a second ring of light and the star crown. Art tiers 6-10 are defined in `structures.ts`                                                          | Recompute the marks at the new max (takes earned items away)                                                                                                                                                                                               |
| 123 | **320×568 geometry**                                 | Cap the planet radius at the L5 size. Growth beyond L5 comes through 24 plots on the rim, Isle 2 placed opposite Isle 1, the cloud ring and the aurora. Below 360 px wide, Isle 2 is drawn inside the canvas at reduced scale. Both Isles' footprints, decoration spots and the M16 terraform patch spot come from the shared `isleLayout.ts`                            | Scroll or zoom the Homeworld canvas                                                                                                                                                                                                                        |
| 124 | **24-friend performance**                            | Friends beyond 14 always animate at half rate, on all devices, for simplicity. The owner's device test is required before the flip                                                                                                                                                                                                                                       | Device-dependent switch                                                                                                                                                                                                                                    |
| 125 | **Names and string budget**                          | Approve the Moon Garden, Coral Steps, Cloud Swing, Crystal Grotto and Star Harbour working titles after translator checks (decision 16 pattern). Budget **70** strings                                                                                                                                                                                                   | Rename after the translator pass                                                                                                                                                                                                                           |
| 126 | **M17 flip and train**                               | `HOME_OPEN_LEVEL` 5 → 10 in **1.4 (Road 3)**, after acceptance plus the owner's device test plus names. Machinery merges dormant earlier                                                                                                                                                                                                                                 | Ship in 1.3 alongside M15 (too much risk in one train)                                                                                                                                                                                                     |

## §7 Developer packages (Codex)

### S17: step 0 (serial; after S16 (`profile.ts`) **and after A16 merges** (`tuning.ts` and the tuning snapshot))

- **Captures first:** the `o-trunk-m16-<sha>.v11` L5 golden.
- **Contract:**
  - widen `LandmarkId` (`src/meta/homeworldLife.ts`) and `HomeworldLevel` (`src/meta/homeworldTypes.ts`);
  - in `src/meta/tuning.ts`:
    - `HOME_OPEN_LEVEL`, `HOMEWORLD_DATA_MAX` and `HOMEWORLD_MAX_LEVEL = HOME_OPEN_LEVEL`;
    - `HOME_LEGACY_TOP`, `RING_PLOTS` and the Den `maxByLevel`;
    - the spreads from `content/homeLevels.ts` and `content/landmarks2.ts`;
  - new `src/meta/content/homeLevels.ts` with the desk costs and the decision 120 chapter needs;
  - new `src/meta/content/landmarks2.ts` (empty stub);
  - `BuildingDef.maxByLevel` type in `src/meta/homeworld.ts` (type plus `defaultHome` keys only).
- **Single queue:** `eligibleOn` stamping and `nextLandmark(p)` in `src/meta/landmarks.ts`, called by `src/meta/roadLandmarks.ts` and `src/meta/roundSettlement.ts`.
- **Legacy:** L5 pins and the bonus 'home10' sticker in `src/meta/stickers.ts`.
- **Save v12:** `src/meta/profile.ts` (v12, `isleDecor` 6, `eligibleOn` migration).
- **Tests:** `tests/{tuning.snapshot,saves,migrate,retirements,landmarks,roadlandmarks}.test.ts`, plus new `tests/m17-dormant.test.ts` (canExpand `'max'` at L5, L5 visuals and sticker unchanged, chapter needs ≤ 12).
- **Docs:** decisions 119-126 in RM §10 and HW §5.2/§6.3 notes (including the chapter amendment); `docs/handoff/m17-step0.md`.

**Owned files:** exactly those above.

**Exposes:** `HOME_OPEN_LEVEL`, `HOMEWORLD_DATA_MAX`, `HOME_LEGACY_TOP`, `nextLandmark(p)`, `maxDens(level)` and the content file shapes.

**Done when:** behaviour is unchanged at `HOME_OPEN_LEVEL = 5` (the dormancy test), every economy gate is identical, and every round fixture is identical.

### Parallel packages after S17 and the M16 integration (W3)

| Pkg                                            | Scope                                                                                                                                                                                   | Owned files (exclusive)                                                                                                                                                                                                                                           | Exposes / consumes                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **A17 Levels 6-10 logic**                      | 17.1. `canExpand` reads `HOME_OPEN_LEVEL`. `nextup.ts` readers move to `HOME_OPEN_LEVEL`/`HOMEWORLD_DATA_MAX` as appropriate                                                            | `src/meta/homeworld.ts` (`canExpand`, `expand`, `canBuild` Den max, `denCapacity`, Isle 2, `setIsleDecoration` 6 spots, `tickHome`), `src/meta/nextup.ts`, `src/meta/passport.ts` ("Landmarks 0-10"), `tests/{homeworld,nextup,trips}.test.ts`                    | Exposes `homeLevelOpen(p, level)`, `isles(p)` and `denCapacity` to 24 |
| **B17 Landmarks 6-10 content and art**         | 17.2                                                                                                                                                                                    | `src/meta/content/landmarks2.ts`, `src/ui/art/landmarks.ts`, `src/meta/inbox.ts` (letters for 6-10 if not generic), new `tests/m17-landmarks.test.ts`                                                                                                             | Exposes `LANDMARKS_6_10`. Consumes `nextLandmark`                     |
| **C17 Homeworld canvas, Star Map, structures** | 17.4, the 17.5 UI, 17.7. Every Level-5 visual reader moves to `HOME_LEGACY_TOP`, and the grep test is added. Isle 2 comes from `isleLayout.ts` and keeps the inherited `drawPatch` hook | `src/ui/screens/homeworld/{canvas,panel,sheets}.ts`, `src/ui/art/structures.ts`, `src/ui/screens/starmap.ts`, `src/meta/content/isleLayout.ts` (Isle 2 spots only), `src/styles.css` (the `.hw-*` block only), `e2e/j5.spec.ts`, `tests/homeworld-screen.test.ts` | Consumes A17 and B17 data through S17 types                           |
| **D17 Economy sims and cost table**            | 17.6, decisions 119-120                                                                                                                                                                 | `tests/sim/economy/career.ts` (after D16), `tests/economy.sim.ts` (M17 block), `tests/sim/profile-size.sim.ts`, `tests/levels.lint.sim.ts` (121-240 Watch), `src/meta/content/homeLevels.ts` (values), `.github/workflows/nightly.yml` (240-day job)              | Exposes the measured L6-10 day table and the final cost values        |

**Integration (Claude).**

- `app.ts` wiring.
- Translations.
- The Simulator frame-time capture.
- J5 runs at 320×568 and 390×844.
- Reviews: economy and kid safety, UX.
- The data analyst's 240-day report.
- Hand the owner the device-test checklist.

**Flip PR:** `HOME_OPEN_LEVEL = 10` (which moves `HOMEWORLD_MAX_LEVEL`), the grep test green, plus the What's new copy.

---

## Appendix: probe of v1 planets 40-80 (scratch, HEAD 3f9c4d3)

`n difficulty twist obstacle troubles goals pressure/budget`:

- **40-49:** 40 hard boss vine 1 3/4 · 41 bubble 0 1/1 · 42 none 1 0/3 · 43 twin 1 2/3 · 44 wind 1 1/3 · 45 hard vent 1 2/4 · 46 mist 0 1/1 · 47 frost 1 2/3 · 48 0 0/3 · 49 super vent+vent 2 5/5
- **50-59:** **50 hard boss vent 1 3/4** · 51 ring 0 2/2 · **52 none - 0 0/3** · 53 vine 1 2/3 · 54 wind 1 1/3 · 55 hard wind frost 1 4/4 · **56 none - 1 0/2** · 57 tug 0 2/2 · 58 twin 1 2/3 · 59 super vent+vine 2 5/5
- **60-69:** **60 hard boss vent 1 3/4** · 61 1 0/2 · 62 frost 0 2/3 · **63 none - 1 0/3** · 64 frost 0 2/3 · 65 hard vent 1 2/4 · 66 rocks 0 1/2 · **67 none - 1 0/3** · 68 0 0/3 · 69 super frost 2 3/5
- **70-80:** **70 hard boss vine 1 3/4** · 71 frost 1 2/2 · 72 bubble 0 1/3 · 73 frost 1 2/3 · **74 none - 0 0/3** · 75 hard fast frost 1 3/4 · 76 0 0/2 · 77 0 0/3 · 78 fast 1 1/3 · 79 super vine 2 3/5 · **80 hard boss vine 1 3/4**

---

## Critique log (revision 2, 14 October 2026)

Every point was checked against `3f9c4d3` with read-only commands; no repo file was edited. The verdicts are:

- **Applied**: the correction was taken as written. Additions are noted.
- **Applied with change**: the defect is real, but the stated fix was adjusted for the reason given.
- **Rejected**: none. No point was wrong on its substance.

| #   | Point                                                             | Verdict                          | Evidence checked                                                                                                                                                                                                                                                                                                  | Where it landed                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pebble leaks into Voyage; frozen weeks re-roll at the flip        | Applied                          | `voyage.ts:113` uses `rulesForLevel(Math.min(n, taught))` in campaign mode. `levels.ts:628-630` draws non-PP Troubles from `o.rules.troubles`. The pre-flight `solve0`/`solve2` (`voyage.ts:127-128, 144-145`) default to `rulesForLevel(level.n)` (`levels.ts:300, 363`). `screens/voyage.ts:217` uses `p.level` | §0.1, §0.3; §3 `RuleSet.troubles` per mode, `voyagePlay`/`voyageRules`, frozen `otherTaught`, explicit pre-flight rules; S15 files (+`screens/voyage.ts`)                                                                                                                                                                                                                                                                                           |
| 2   | Rainbow has no bonus object outside the campaign                  | Applied (first option)           | `remix.ts:24-31` runs reactions with mode `'remix'` up to cap ~119. The map's overlay was PP-only                                                                                                                                                                                                                 | §3: `bonusKind` dealt in `makeLevel` for every family whose rules contain Rainbow; RX and VOY v2 snapshots; acceptance 7                                                                                                                                                                                                                                                                                                                            |
| 3   | Field Guide cleanup runs at v9, not at the flip                   | Applied, plus a display rule     | `fx.ts:880-886` records a pair when no `REACTION_IDS` reaction matches. `app.ts:1002-1006` persists it. `fieldguide.ts:139-141` shows "Nothing happens"                                                                                                                                                           | §3 Save v9: `rulesSeen` high-water mark; the cleanup runs when play first exceeds it; "Nothing happens" only when the play rules have no reaction for the pair; acceptance 12                                                                                                                                                                                                                                                                       |
| 4   | Wonder pays gems via the album; new stickers break the Feats page | Applied                          | `stickers.ts:212-217` (10 gems per 10 non-bonus), `:198-199` (Feats page includes `'fusion'`), `:86-95` (`REACTION_STICKERS` from `REACTIONS`); `tuning.ts:1260, 1263`. The 'home' sticker is a non-bonus feat (`stickers.ts:66-72`)                                                                              | §3 stickers: all new M15/M17 stickers `bonus: true`; `REACTION_STICKERS` pinned to `LAUNCH_FUSION_IDS`; album-invariance test (acceptance 10; M17 acceptance 11)                                                                                                                                                                                                                                                                                    |
| 5   | The CE is not dormant without `opensOn`                           | **Applied with change**          | `starroad.ts:142-146` returns `true` without `opensOn`. `shop.ts:27` lists every product. `canBuy` (`app.ts:1334-1341`) ignores `productOpen`. `m12types.ts:11-12`; decision 82. One correction: natively the row shows "Price unavailable" (`shop.ts`: `priceOf(...)                                             |                                                                                                                                                                                                                                                                                                                                                                                                                                                     | t('Price unavailable')`), not a blank price, until Apple returns one | `ProductDef.saleFrom` filters the shop, `prices()` and `canBuy`, with a test that the CE never renders before Road 2's `opensOn`. **Change:** grant and restore are _not_ filtered, because a verified Apple transaction must always deliver. Refusing a paid item over a device-clock difference would be a kid-safety and refund failure |
| 6   | The CE sheet and grant can differ                                 | **Applied with change**          | `roadAvailability.ts:14-16` (local-day `opensOn`) and `starroad.ts:147-148` (`roadSeenDay`) vs the Apple UTC day                                                                                                                                                                                                  | The grant is the union of the shown quote and the Apple-date list, restore uses the Apple-date list, and the clock-skew tests cover both directions (Part 2 acceptance 2, §3). **Change:** the quote lives in a dedicated `pendingCollectors` field (the `pendingPiggy` precedent, `app.ts:1380`), not in `pendingPurchaseRecords`. That field is a ledger queue for records priced later (`app.ts:1461, 1479-1496`), and it is emptied after flush |
| 7   | The glossary change fails a test                                  | Applied                          | RETIRED rows: M12 ×4 (`glossary.test.ts:709, 734, 737, 738`) and M13 ×2 (`:588, :591`). Special cases at `:1051`/`:1072`. `expect(pending.length).toBeGreaterThan(0)` at `:1096`                                                                                                                                  | S15 doesn't touch `BUILT`. Integration adds M15 only. A separate task G handles M12-M14 and the assertion (it also notes that building M12 exposes 'Star Road')                                                                                                                                                                                                                                                                                     |
| 8   | Frozen fixtures can't catch v2 breakage                           | Applied                          | `daily-frozen.test.ts:13` covers taught 16/28/36 only. `modes.ts:38` and `flows/modes.ts:101` pass an unbounded taught. `RULES_VERSION` is a `const` (`rules-version.ts:2`). `vitest.config.ts:5`                                                                                                                 | The new `frozen-days-late.json` (52/60/120) is captured at HEAD. Every frozen suite runs at play 1 and 2 in PR through explicit `play` arguments. Whole-sim shadow runs use a test-config-only `vi.mock` setup file, with a self-test (§5)                                                                                                                                                                                                          |
| 9   | S17 can't keep Levels 6-10 dormant                                | Applied (first option)           | `tuning.ts:517`; the readers at `homeworld.ts:437`, `panel.ts:194/356/418`, `canvas.ts:515`, `starmap.ts:43-49`, `structures.ts:348`, `sheets.ts:1044`, `nextup.ts:219/257/325/355`, `stickers.ts:70-71` and `profile.ts:805/1154` (grep)                                                                         | `HOMEWORLD_MAX_LEVEL = HOME_OPEN_LEVEL`, plus a new `HOMEWORLD_DATA_MAX`; a dormancy test; the flip-time grep test (Part 3 §3, acceptance 6)                                                                                                                                                                                                                                                                                                        |
| 10  | The Wonder HUD notch breaks "shown only when reached"             | **Applied with change**          | RM:1703 cut-list row ("Wonder shown only when reached"; reason: near-miss framing). The map's own kid-safe list said the same                                                                                                                                                                                     | No notch and no bar extension. Results reveal Wonder only on the earning attempt. No Wonder line or hint while a disqualifying setting is on. D15 drops `hud.ts`. **Change:** Wonder marks _already earned_ stay on the Star Map, galaxy and Passport even while Gentle or the full aim line is on, because earned marks are never removed (RM:700). Only new Wonder messaging is hidden                                                            |
| 11  | No one delivers the Road 2 content track                          | Applied                          | Decision 118 named the track but it had no package. Its single-Road call sites overlap `stickers.ts`, `cosmetics.ts`, `tuning.ts`, `starroad.ts`, `grownups.ts` and `app.ts`                                                                                                                                      | W1.5 **R2** track: SR2 (step 0, save v10, `RoadContent` API), AR2 (content), integration, owned files, owner items. A16/B16 consume its API (§0.4, Part 1 §7, decision 118)                                                                                                                                                                                                                                                                         |
| 12  | v2 level snapshots can't see the new content                      | Applied                          | `levelRow` (`levels.snapshot.test.ts:103-122`) encodes fixed fields; `expectShape` (`:125`) requires exactly `LEVEL_KEYS`                                                                                                                                                                                         | `LevelDef.pebbleCloud`; `v2LevelRow`/`LEVEL_KEYS_V2` encode `rulesVersion`, `motes`, `bonusKind`, `pebbleCloud` and Troubles (§3)                                                                                                                                                                                                                                                                                                                   |
| 13  | The Trouble-cost gate is broader than its precedent               | Applied                          | `trouble-cost.sim.ts:10-11, 63-68` gates the teaching planets only; `05-status-and-next.md:101` (0.6% all, −1.2% on the others)                                                                                                                                                                                   | Gate on P52 + P60 pooled; substitution planets are a nightly Watch (acceptance 5)                                                                                                                                                                                                                                                                                                                                                                   |
| 14  | The B5 number is stricter than the spec                           | Applied                          | Decision 86 (RM:1901); `economy.sim.ts:523-525` (0.8 hard in nightly, 0.85 printed)                                                                                                                                                                                                                               | B5 ≥ 0.8 Gate, ≥ 0.85 Watch in M15, M16 and M17                                                                                                                                                                                                                                                                                                                                                                                                     |
| 15  | S15 API changes break files it doesn't own                        | Applied (both remedies)          | `restoreRound` callers: `labs.test.ts`, `scene.launchers.test.ts`, `troubles.test.ts`, `round.test.ts`, `profile.ts:181`. Version-blind call sites listed (grep)                                                                                                                                                  | `restoreRound` kept; `restoreRoundWithVersion` added. `flows/modes.ts`, `flows/results.ts`, `screens/voyage.ts`, `app.ts:831` and `main.ts` (DEV block) added to S15's files                                                                                                                                                                                                                                                                        |
| 16  | No package owns the HUD and landing-card hooks                    | Applied (first option)           | `hud.ts` was D15's in the parallel wave; `aimtag.ts`/`game.ts` were S15's                                                                                                                                                                                                                                         | S15 ships a generic extra-throw badge and toast (`showExtraThrow`) and a reach preview (`previewReach`); B15/C15 only feed them                                                                                                                                                                                                                                                                                                                     |
| 17  | Late-arrival intros can miss what is on the planet                | Applied, plus a tiebreak         | `report.json` pace (Regular at 121 by day 23)                                                                                                                                                                                                                                                                     | Intros are chosen by level content, then **cost to the child** (pebble, Flood) before pure upside, then teaching order, with a unit test (§4)                                                                                                                                                                                                                                                                                                       |
| 18  | The new triggers use hidden numbers                               | **Applied with change**          | `round.ts:177-196` (biome lists); RM:248; `biomeOf` (`world.ts:91-106`)                                                                                                                                                                                                                                           | Triggers restated as lands and checked to be disjoint from the launch triggers for the same object. **Change:** Rainbow's Sunburst list starts as Marsh/Swamp/Reef **without Ocean**. Ocean is common, so including it would recreate the near-universal extra throw the point warns about. It is added back only if the sim shows Rainbow too rare (a new Watch in acceptance 4)                                                                   |
| 19  | Wonder par and judging disagree on motes                          | Applied (first option)           | The map's planner excluded motes, while judging counted in-rule extras                                                                                                                                                                                                                                            | The planner models the fixed mote with the sector rule. Excluding mote throws from judging couldn't handle Wide Shot, which changes a throw's reach rather than adding one                                                                                                                                                                                                                                                                          |
| 20  | `GUARD_OF.pebble = null` is not valid                             | Applied                          | `labperks.ts:11` (`Record<Kind, GuardId>`); `labcopy.ts:61` (Pebble Shower)                                                                                                                                                                                                                                       | Perk column `null` in `TROUBLE_BEHAVIOUR`; no `LAB_TEACH` guard entry; area effects (Pebble Shower included) never catch (§2 rules detail, decision 100)                                                                                                                                                                                                                                                                                            |
| 21  | Freezing 61-120 removes the v1 curve lever                        | Applied                          | FL:480 and FL:558 (Watch → Gate after one release); `levels.ts:159, 217` are unversioned                                                                                                                                                                                                                          | Rows 61-120 freeze in the flip PR. Version-keyed salt tables from S15. `round-v1.json` stores its LevelDefs. No re-salt of P63 (decision 97, acceptance 1)                                                                                                                                                                                                                                                                                          |
| 22  | Flood's outcome is unknown but the gates assume one               | Applied                          | Decision 102                                                                                                                                                                                                                                                                                                      | Reactions and par run Flood on and off in PR; economy runs both nightly; P74 row, TEACH and T0 card are conditional                                                                                                                                                                                                                                                                                                                                 |
| 23  | The Landmark queue has no data to order by                        | Applied                          | `landmarks.ts:157-165` and `roadLandmarks.ts:88-97` compute independently                                                                                                                                                                                                                                         | `eligibleOn` on each Landmark state in save v12, with a clock-free deterministic migration (decision 121)                                                                                                                                                                                                                                                                                                                                           |
| 24  | Levels 7-10 make unreviewed planets mandatory                     | Applied (the alternative option) | HW §5.2 chapters 14-24; `trips.ts:39` stops at 120; `par.json` stops at 120                                                                                                                                                                                                                                       | Decision 120's default now caps the chapter needs at 12. Gating 121-240 becomes the alternative. Cheaper, and costs (not chapters) pace Regular anyway                                                                                                                                                                                                                                                                                              |
| 25  | The terraform round is under-specified                            | Applied                          | The map's W3 placed D16 beside C17 (`canvas.ts`, `panel.ts`, `sheets.ts`)                                                                                                                                                                                                                                         | Substitution personas with a progress-forgone table; D16 moved to W2 with its integration before W3; a shared `isleLayout.ts` for the patch, Isle 1 and Isle 2                                                                                                                                                                                                                                                                                      |
| 26  | Day/night must not use the real clock                             | Applied                          | Decision 27 (real clock for friends only)                                                                                                                                                                                                                                                                         | "Sunlit" comes from spin phase at impact; solver and Scene Bot phase model; a test that a level hashes the same at any clock time (decision 115)                                                                                                                                                                                                                                                                                                    |
| 27  | `tuning.ts` has two owners in W2                                  | Applied (both remedies)          | The map's W2 rows. The tuning snapshot also hashes `PRODUCTS` (`tuning.snapshot.test.ts:67, 116`), so moving the ProductDef alone would still collide on the `.snap` file                                                                                                                                         | CE ProductDef in `content/collectors.ts`, and S17 starts after A16 merges                                                                                                                                                                                                                                                                                                                                                                           |
| 28  | Owner blockers before opening the CE are missing                  | Applied                          | `05-status-and-next.md:107` (Gate v2 for ages 9-11), `:115` (StoreKit not verified on hardware)                                                                                                                                                                                                                   | Three §0.2 rows and item 16.6. Family Sharing fallback: create the CE with sharing off and turn it on after one verified shared transaction (decision 113)                                                                                                                                                                                                                                                                                          |
| 29  | The launch date matters                                           | Applied                          | Decision 81 (RM:1896)                                                                                                                                                                                                                                                                                             | A new §0.2 row, listing every date that derives from it                                                                                                                                                                                                                                                                                                                                                                                             |
| 30  | Decision 92 is misquoted                                          | Applied                          | RM:1907 "Tuning and content every 2 weeks"                                                                                                                                                                                                                                                                        | Decision 110's alternative is now permitted; §0.1 release-train row                                                                                                                                                                                                                                                                                                                                                                                 |
| 31  | The $14.99 rule is invented; decision 84 conflicts                | Applied                          | RM:684; decision 84 (RM:1899); Paper Garden is Road 1's Theme (`content/road01.ts:12, 528-529`)                                                                                                                                                                                                                   | Both recorded as explicit amendments in decisions 111 and 112 and Part 2 §1                                                                                                                                                                                                                                                                                                                                                                         |
| 32  | Golden naming assumes a release that won't exist                  | Applied                          | The map's `n-release-1.3.v9`                                                                                                                                                                                                                                                                                      | Naming by source build (`release-X.Y` only for that candidate; otherwise `trunk-<milestone>-<sha>`); `release-1.3.v11` captured when 1.3 is cut                                                                                                                                                                                                                                                                                                     |
| 33  | `npm run par` won't run as written                                | Applied                          | `vitest.config.ts:5`; `package.json` sim scripts                                                                                                                                                                                                                                                                  | `tests/sim/par.gen.sim.ts` with `SIM=1` and its own timeout; the PR 10-planet check is `tests/par.test.ts` with a `180_000` per-test timeout                                                                                                                                                                                                                                                                                                        |
| 34  | The CI dev-tool grep misses `?rules=2`                            | Applied                          | `ci.yml:25`; the `main.ts:104` DEV pattern                                                                                                                                                                                                                                                                        | `__rulesPlay` behind `import.meta.env.DEV`; the grep pattern extended (S15)                                                                                                                                                                                                                                                                                                                                                                         |
| 35  | The hidden-launcher return is not data-only                       | Applied (both remedies)          | `RoundState.sparklerPlainUsed`/`skipperBounces` (`round.ts:70-71`); `skipperLosesPower` (`launchers.ts:196`, called at `round.ts:453`); `modifiersFor` (`modifiers.ts:49-51`)                                                                                                                                     | Hidden launchers are in `round-v1.json`; their return is a code-reviewed round change. No save or code can hold them, so no rules version is needed (decision 107)                                                                                                                                                                                                                                                                                  |
| 36  | The Scene Bot misses the risky combinations                       | Applied                          | Probe: P52/P60 have no obstacle; substitution from P61 can share a planet with obstacles or motes                                                                                                                                                                                                                 | One obstacle+pebble planet and one mote+pebble planet added to the ≥ 95% gate (acceptance 6)                                                                                                                                                                                                                                                                                                                                                        |
