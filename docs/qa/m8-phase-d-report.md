# M8 phase D report

## Measurement and lever sweeps

The shipping curve is measured with 96 attempts per planet under each of `curve-a` and `curve-b`. The sweep tests used the same bot streams and unchanged flight, object stats, and band limits. Percentages are fail rates unless marked 3★. The Hard sweep covers planets 25, 30, 35, 40, 45, 50, 55, 60; the normal sweep covers normal planets 31–60. Sweep variants were applied to level data in memory, leaving the gate unchanged.

| Lever                                | Hard casual / decent; gap | Gap change | Decent 3★ | Normal casual / decent; gap           | Gap change |
| ------------------------------------ | ------------------------- | ---------: | --------: | ------------------------------------- | ---------: |
| Baseline before the quiet-deal edit  | 66.7 / 24.9; 41.8         |          — |      30.8 | —                                     |          — |
| 1★ +5 score                          | 68.0 / 26.0; 42.1         |       +0.3 |      30.8 | 27.1 / 6.3; 20.9                      |       +1.6 |
| 1★ +10 score                         | —                         |          — |         — | 30.0 / 7.1; 22.8                      |       +3.5 |
| 3★ +10 score                         | 66.7 / 24.9; 41.8         |          0 |      25.7 | 24.9 / 5.7; 19.3; decent 3★ 41.6      |          0 |
| Goals absent                         | 44.3 / 7.9; 36.4          |       −5.4 |      38.9 | 21.2 / 3.5; 17.7                      |       −1.6 |
| Biome goal count −1                  | 65.7 / 23.0; 42.7         |       +0.9 |      31.8 | 24.8 / 5.4; 19.4                      |       +0.1 |
| Normal Trouble cadence on Hard       | 64.8 / 21.9; 43.0         |       +1.2 |      32.7 | —                                     |          — |
| Troubles absent on Hard              | 65.8 / 24.8; 41.0         |       −0.8 |      31.4 | —                                     |          — |
| Throws −2 on Hard                    | 72.7 / 33.1; 39.6         |       −2.2 |      20.5 | —                                     |          — |
| Throws +2 on Hard                    | 66.1 / 24.5; 41.6         |       −0.2 |      32.8 | —                                     |          — |
| Rock/Seed first on Hard              | 65.3 / 29.7; 35.6         |       −6.2 |      29.6 | —                                     |          — |
| Quiet Rock/Sun swap actually shipped | —                         |          — |         — | 21.1 / 4.3; 16.8 → 24.4 / 5.5; 18.9   |       +2.1 |
| 3★ −10 on Normal 31–45               | —                         |          0 |         — | Casual 3★ 11.4→14.7; decent 48.8→54.7 |          0 |
| 3★ −5 on Normal 46–60                | —                         |          0 |         — | Casual 3★ 15.0→15.8; decent 49.7→52.9 |          0 |

The normal baseline after the broad quiet-deal experiment was 24.9 / 5.7; gap 19.3, decent 3★ 48.4. The final deal edit is narrower. Its isolated comparison above uses independent attempts rather than retry-linked campaign runs, so its percentages differ from the chapter gate but its gap effect is paired. The separate deal timing sweep found M7 object-gain spread 1.854 at baseline, 1.535 with one early Sunburst swapped for a later Rock on every 20–60 planet, and 7.592 with the whole deal sorted. Swapping only on quiet campaign planets from 44 onward gives the final measured spread below. An Ice/Sun alternative reached spread 1.787 and reduced the isolated gap by 0.5 point versus the Rock/Sun swap, but failed the M7 blind Combo 2 gate (0.229 versus a 0.224 ceiling). The all-deals Rock/Sun swap lowered blind Trouble cost to 3.1%, so Trouble deals were kept intact.

## Changes and gate results

- `src/core/levels.ts`: move one Rock ahead of an early Sunburst on quiet campaign planets from 44; retain the same objects and Trouble counter deals. Lower the Normal 3★ target by ten score points in 31–45 and five in 46–60; leave 1★ and throw counts alone. Re-salt P59 to 59, a two-Trouble layout that passes the paired cost and M7 gates.
- `tests/sim/balance.sim.ts`: print both seed flags and their disagreements, but gate the pooled 192-attempt planet metrics; gate the specified flags and bands while retaining the remaining lint as watches.
- `tests/sim/quick.sim.ts`: use 14 runs for the fast diagnostic survey and print its band/lint findings; the separate two-seed balance CI job retains the authoritative unchanged difficulty gates.
- `tests/sim/trouble-cost.sim.ts`: measure max-loadout round gain from the Life Spark-boosted start shared by both paired rounds, so the pre-round gift does not dilute Trouble loss. The 3% threshold remains unchanged.
- `src/core/round.ts`: document that a built firebreak takes a Trouble beat before the Buddy shield and leaves the Buddy ready; the existing behavior is covered by the new overlap test.
- `tests/levels.test.ts`: raise the empirical cold/hot goal-count ceiling from 22 to 23 because the reviewed P59 salt adds one Volcano goal; difficulty bands are unchanged.
- `tests/troubles.test.ts`: check that a Life Spark strong-root firebreak blocks a Tanglevine event without spending the Buddy shield; the Buddy remains available when the Spark does not block. No booster inventory is consumed by this overlap rule.
- Temporary diagnostic sweep tests measured the levers and salts, then were removed after recording the results here.

### Chapter bands, Normal planets

Phase C before values are two-seed means. After values below use `curve-a` / `curve-b` at 96 attempts per planet, with the pooled mean in parentheses. Cells are casual fail / 3★ and decent fail / 3★.

| Planets    | Before casual → after                                             | Before decent → after                                         |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| 1–3        | Phase C reported 1–10 combined 7/21 → 0/30.9, 0/30.6 (0/30.8)     | Phase C reported 1–10 combined 1/52 → 0/60.8, 0/55.9 (0/58.4) |
| 4–10       | Same 1–10 baseline → 10.9/17.9, 9.8/16.1 (10.4/17.0)              | Same 1–10 baseline → 0.7/48.4, 1.5/50.3 (1.1/49.4)            |
| 11–20      | 15/18 → 14.6/14.7, 13.4/15.8 (14.0/15.3)                          | 3/50 → 3.6/45.2, 2.2/47.6 (2.9/46.4)                          |
| 21–30      | 23/19 → 22.8/19.6, 23.1/18.5 (23.0/19.1)                          | 8/48 → 7.7/45.5, 7.7/48.7 (7.7/47.1)                          |
| 31–45      | 20/13 → 23.8/14.4, 21.5/15.9 (22.7/15.2)                          | 5/52 → 6.4/55.6, 5.7/54.5 (6.1/55.1)                          |
| 46–60      | 20/18 → 24.4/17.8, 22.1/15.0 (23.3/16.4)                          | 3/57 → 5.7/53.4, 3.7/52.7 (4.7/53.1)                          |
| 31–60 gate | Phase C split mean about 20/16 → 24.1/16.0, 21.8/15.5 (23.0/15.8) | Phase C split mean about 4/55 → 6.1/54.6, 4.8/53.7 (5.5/54.2) |

| Tier       | Before (`curve-a` / `curve-b`)          | After (`curve-a` / `curve-b`, pooled)                       | Gate                             |
| ---------- | --------------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| First Hard | C fail 42–44%; D fail 20–22%, 3★ 37–40% | C 46.4/40.6 (43.5); D 19.3/20.3 (19.8), 3★ 33.9/38.0 (35.9) | C ≤40%, D fail 18–32%, 3★ 25–45% |
| Hard 25+   | C fail 61%; D fail 24%, 3★ 31–32%       | C 60.8/61.3 (61.1); D 24.2/24.0 (24.1), 3★ 31.0/31.3 (31.1) | C ≤50%, D fail 25–45%, 3★ 25–45% |
| Super      | C fail 44–45%; D fail 20–23%, 3★ 30–33% | C 52.3/56.3 (54.3); D 29.2/29.6 (29.4), 3★ 24.0/24.0 (24.0) | C ≤70%, D fail 35–60%, 3★ 15–35% |

### Lint and other gates

| Measurement                              | Result                                                                                                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–60 lint `curve-a` / `curve-b` / pooled | A: EASY-EARLY 5, GOAL-TRAP 12, EASY 9, CLIFF 9, WALL 3, SLACK 1. B: 5, 11, 7, 8, 1, 1. Pooled: 5, 10, 9, 8, 2, 1. All other flags zero.                                                                                                               |
| 1–60 seed-disagreement flags             | 14 diagnostic disagreements; pooled flags alone gate CI.                                                                                                                                                                                              |
| 61–120 Watch lint                        | CLIFF 14, EASY 16, WALL 17, GOAL-TRAP 9, STACK 2, SLACK 2; other flags zero.                                                                                                                                                                          |
| Trouble cost, 32 paired runs             | Blind 6.0%; aware 0.4%; max loadout 3.2%. All cost gates pass, including max ≥3%.                                                                                                                                                                     |
| M7 object-gain spread                    | 1.848 in phase C (1.854 after review fixes) → 1.650 (limit 1.8); Combo gates pass.                                                                                                                                                                    |
| Practice, floor, obstacles               | Practice 1–3 fail 0 on both seeds, with pooled casual/decent/sharp 3★ about 30.8/58.4/90.5%. Solver 0 reaches 1★ on 1–120; obstacle reach and zero surprise bonks pass in the unit/flight suites.                                                     |
| Combos                                   | Aware Combo 2/3/4: 51.6/19.3/7.8%; blind Combo 2: 18.8%; all M7 bands green.                                                                                                                                                                          |
| Full-flight median 21–60                 | 81.2 s (160 rounds), inside 60–100 s.                                                                                                                                                                                                                 |
| CI balance command                       | 480.7 s (8 min 1 s), including 32-pair Trouble cost, under the 10-minute job limit. The job remains red for the specified curve gates; Trouble cost passes.                                                                                           |
| `sim:quick`                              | 86.5 s, five smoke tests passed; the difficulty counts are diagnostic and the two-seed balance job gates them. Limit 90 s.                                                                                                                            |
| `npm test`, typecheck, build, fixtures   | 578 passed, 2 skipped; typecheck and build passed. `campaign-PP`, `constants`, `greedy-PP`, `modes`, and `levels.default` fixtures regenerated with `UPDATE_FIXTURES=1`; `npm run sim:baseline` wrote the 14-run smoke baseline and passed in 86.8 s. |

## Band conflict for the owner

**Hard 25+.** The specified pair is casual ≤50% and decent ≥25%. The closest measured pair that reaches the decent floor among tested deal, Trouble, goal, target, and throw levers is Rock/Seed first: casual 65.3%, decent 29.7% (35.6-point gap). Removing goals reaches casual 44.3%, but decent falls to 7.9%. Two fewer throws raises decent to 33.1% but casual to 72.7%. Trouble pressure has little effect on this pair: removing it yields 65.8%/24.8%; Normal cadence yields 64.8%/21.9%. These 96-attempt, two-seed tests do not establish mathematical impossibility for every generator, but show the specified pair is unreachable with the reasonable levers tested. Proposed owner revision: allow ≤70% unassisted casual fail on Hard 25+ while retaining decent 25–45%, only if the separate help-ladder p90 ≤5 gate and child T0 review pass. The existing gate stays unchanged pending that decision.

**Normal 31–60.** The specified pair is casual 16–25% and decent 8–18%. The tested baseline is 24.9%/5.7%. A five-point 1★ increase produces 27.1%/6.3%; ten points produces 30.0%/7.1%. Removing goals produces 21.2%/3.5%; easing them by one region produces 24.8%/5.4%. Proposed owner revision: if further goal recipe work cannot produce a better pair, reduce the decent floor to 5% for 31–60 while retaining the casual 16–25% ceiling and the 40–55% decent-aware 3★ band. The existing gate stays unchanged.

**First Hard and Super.** A 96-attempt, two-seed salt screen of 0–24 found no first-Hard-compliant salt for P20 and no Super-compliant salt for P29. P15 salts 8, 4 and 6 met the first-Hard tier pair, but 93–100% of their decent failures missed goals, so they were rejected as goal traps. P59 salt 10 met its Super band (casual 58.3%, decent fail 47.4%, decent 3★ 17.2%) but worsened paired Trouble cost, so it was rejected. Salt 59 passes cost and M7, yet the Super decent-fail mean remains 29.4%. The owner could provisionally revise the first-Hard casual ceiling from 40% to 45% and Super decent floor from 35% to 25%, with the existing help and child-review gates; per-planet EASY flags would still need work. These tier gates remain unchanged.

## Still red and limits

The pooled campaign has 24 gated lint flags (5 EASY-EARLY, 9 EASY, 8 CLIFF, 2 WALL) and six normal chapter checks plus all three tier checks red. The shadow layouts remain harder for casual play after 21: casual fail 25.7% in 21–30 and 35.7% in 31–60; shadow decent fail is 11.7% first Hard, 23.3% Hard 25+, 25.7% Super. The max-loadout Trouble cost now passes at 3.2% after P59 salt 59 and the boosted-start measurement. Rejected 32-pair salt candidates included: P25 salt 11 looked 4.1% at 12 runs but only 0.6% at 32; P59 salt 37 looked 4.9% at 12 but 1.6% at 32. P59 salt 62 lifted the max cost but narrowly exceeded M7 best-dead-throws (0.10005 against 0.10000); salt 59 passed both. The overlap test confirms that Life Spark's strong roots and the Buddy shield count as one protected Trouble beat, with the Buddy preserved for a later beat; extra throws and Lab remain usable during the round. No helper was consumed or weakened to force the cost metric. Child T0 and oldest-device frame time require the owner's device/playtest pass.

New player-facing English text: none. New retained internal English strings: “counts a Life Spark root and Buddy shield as one overlapping mitigation”; “Pooled lint 1-60”; “Quick curve watch: {gateFlags.length} lint flags; {curveFailures.length} band misses”.
