# M8 phase E report — Kid-first curve

## Decision 28 and implementation

On 30 September 2026, the owner chose **Kid-first**: “Keep casual Hard fail ≤ 50% by easing Hard goals; accept that careful players find Hard a bit easier (their fail floor drops to ~12%, 3★ band unchanged). Also: decent floor 5% on normal 31-60, Super decent floor 25%. Hard stays a real challenge, never a wall for a 6-year-old.” Decision 28 is recorded in ROADMAP-v2 §10. Phase D found pooled Hard 25+ casual fail 61.1%, decent fail 24.1%, and decent 3★ 31.1%; removing goals reached 44.3% casual fail but 7.9% decent fail. Normal 31–60 decent fail was 5.5% against its old 8% floor; Super Hard was 29.4% against its old 35% floor. The decision accepts the smaller decent fail floors while keeping the casual and 3★ bounds.

ROADMAP-v2 §7.5, FLIGHT.md §4.2, and the sim gates now use Hard 25+ casual fail ≤50%, decent fail 12–45%, decent 3★ 25–45%; normal 31–60 decent fail 5–18%; Super Hard casual fail ≤70%, decent fail 25–60%, decent 3★ 15–35%. First Hard remains casual fail ≤40%, decent fail 18–32%, decent 3★ 25–45%. No other band threshold was changed. All ten named pooled 1–60 lint flags gate the CI balance test; 61–120 remain Watch.

Hard 25+ now selects one biome with the widest gain shared by the aware and blind solvers, requires 40% of its supported count, and does not add a second rare-biome or species goal. Super Hard's supported biome count factor fell from 80% to 65%. These goals remain visible and buildable from the dealt objects. Trouble frequency, per-difficulty beat cadence, object rules, flight physics, and bot noise remain unchanged. Normal 11–20 1★ fraction rose from 0.04 to 0.08, with a five-point 3★ easing; its chapter fail floor is still 5%. Planet 14's Vent lesson asks for three ocean sectors, one more than its start, which both solver paths exceed. Reviewed score offsets and salts on individual planets remove the remaining pooled flags without changing the gates.

The final `LEVEL_SALT` table in `src/core/levels.ts` is the authoritative list of substitutions on 1–60. Salts re-reviewed during phase E include the swap lesson P2=118, Vent lesson P14=43, P23=339, P25=79, Tanglevine lesson P28=6, P45=109, and two-Trouble P49=118; phase D's P59=59 remains. P23 has 1★ +15 and 3★ −10; P28 has 1★ −20 and 3★ −15. P45=109 replaces a layout with excessive best-available dead throws. P2 preserves the intended swap lesson. P3 has a ten-point 3★ easing to keep practice inside its band.

| Final active salts (planet:salt) | Values                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1–20                             | 1:3, 2:118, 4:1, 5:2, 7:29, 8:5, 9:35, 10:33, 11:25, 12:22, 13:94, 14:43, 15:100, 16:2, 17:11, 18:26, 19:1, 20:42    |
| 21–40                            | 21:6, 22:11, 23:339, 24:21, 25:79, 27:17, 28:6, 29:98, 30:15, 31:11, 32:13, 34:35, 35:37, 36:49, 38:31, 39:60, 40:17 |
| 41–60                            | 41:3, 42:49, 44:16, 45:109, 48:11, 49:118, 50:23, 51:6, 52:1, 53:23, 54:10, 55:9, 56:29, 58:10, 59:59, 60:4          |

## Measured curve

Both shipping master seeds use 96 campaign attempts per planet and policy; percentages below are pooled over `curve-a` and `curve-b`. The separate obstacle and timed-round suites exercise full flight. Cells are casual fail / 3★ and decent fail / 3★. “Before” is phase D, under the old bands. The distinct-layout shadow sweep uses ten Normal or thirty Hard/Super salts per slot and two attempts each. It remains a gate.

| Normal planets           | Casual phase D → E (fail / 3★ %) | Decent phase D → E (fail / 3★ %) |
| ------------------------ | -------------------------------- | -------------------------------- |
| 1–3                      | 0 / 30.8 → 0 / 26.7              | 0 / 58.4 → 0 / 55.4              |
| 4–10                     | 10.4 / 17.0 → 11.8 / 22.1        | 1.1 / 49.4 → 2.6 / 50.2          |
| 11–20                    | 14.0 / 15.3 → 15.7 / 18.9        | 2.9 / 46.4 → 5.1 / 49.6          |
| 21–30                    | 23.0 / 19.1 → 21.2 / 16.1        | 7.7 / 47.1 → 7.2 / 46.9          |
| 31–45 (diagnostic split) | 22.7 / 15.2 → 24.6 / 18.1        | 6.1 / 55.1 → 5.5 / 55.3          |
| 46–60 (diagnostic split) | 23.3 / 16.4 → 23.0 / 14.4        | 4.7 / 53.1 → 4.8 / 54.5          |
| **31–60 gated band**     | **23.0 / 15.8 → 23.8 / 16.3**    | **5.5 / 54.2 → 5.2 / 54.9**      |

The 31–45 and 46–60 rows are diagnostic splits of the single gated 31–60 band. All five gated normal chapter rows and the practice row pass. The 31–45 decent 3★ split is 55.3%, 0.3 point above the combined band's upper bound; the actual gated 31–60 mean is 54.9%.

| Tier                | Phase D → E casual fail % | Phase D → E decent fail % | Phase D → E decent 3★ % | Revised gate             |
| ------------------- | ------------------------: | ------------------------: | ----------------------: | ------------------------ |
| First Hard (15, 20) |               43.5 → 38.5 |               19.8 → 19.5 |             35.9 → 31.0 | C ≤40; D 18–32; D3 25–45 |
| Hard 25+            |               61.1 → 43.9 |               24.1 → 13.8 |             31.1 → 42.3 | C ≤50; D 12–45; D3 25–45 |
| Super Hard          |               54.3 → 59.6 |               29.4 → 26.8 |             24.0 → 20.7 | C ≤70; D 25–60; D3 15–35 |

Pooled lint on 1–60 is **zero** for WALL, CLIFF, GOAL-TRAP, STACK, BONK-HEAVY, EASY, TRIVIAL, EASY-EARLY, FLAT, and SLACK. Phase D pooled counts were respectively 2, 8, 10, 0, 0, 9, 0, 5, 0, and 1. The two master seeds still disagree on 22 individual flags, so the pooled estimate remains the shipping gate and the seed disagreement is reported. Planets 61–120 remain Watch: CLIFF 16, WALL 17, EASY 10, GOAL-TRAP 7, STACK 2, SLACK 2; all other flags zero. Phase D Watch counts were 14, 17, 16, 9, 2, and 2 respectively.

The full balance job took **456.2 s** including the 32-pair Trouble-cost test, within the ten-minute CI limit, but exits red on eight retained shadow gates:

| Shadow layout check      | Measured |   Gate |
| ------------------------ | -------: | -----: |
| Practice casual 3★       |    51.7% | 25–45% |
| Normal 4–10 decent 3★    |    55.7% | 40–55% |
| Normal 11–20 decent 3★   |    58.6% | 40–55% |
| Normal 21–30 casual fail |    25.7% | 14–22% |
| Normal 31–60 casual fail |    35.7% | 16–25% |
| First Hard decent fail   |    15.0% | 18–32% |
| First Hard decent 3★     |    46.7% | 25–45% |
| Super Hard decent 3★     |    37.3% | 15–35% |

These shadows are distinct layouts, not the final reviewed campaign salts. The phase-D lever sweep and phase-E shadow variants show the coupling: removing Normal 31–60 goals still leaves shadow casual fail at 30.0%; removing goals plus lowering 1★ by ten reaches 25.5% casual but drops decent fail to 4.3%, below the owner's 5% floor. On the first Hard planets, raising the shadow decent fail floor would also press the shipping casual tier already at 38.5% toward its 40% ceiling. The gates are unchanged and remain red rather than being downgraded to watches.

## Other gates and remaining work

| Gate                                       | Result                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trouble cost, six planets × 32 paired runs | Blind loss **5.1%** (≥5%); aware loss **−1.0%** (≤8%); max-loadout loss **4.3%** (≥3%). P14's ocean recipe changes the bot's choices, so P28's reviewed Tanglevine layout carries enough blind cost while retaining the Normal every-third-throw cadence.                |
| M7 object and reaction bands               | Object-gain spread **1.672** (≤1.8); best-available dead throws **9.76%** (≤10%); aware Combo 2/3/4 **46.4/18.2/9.4%**, blind Combo 2 **18.2%**; all other M7 gates pass.                                                                                                |
| Obstacles and flight                       | All five teaching obstacles pass their bonk bands; surprise bonks **0**. The obstacle flight test's median is **83.0 s**. The separate 160-round, full-flight sample across planets 21–60 has median **80.1 s**, inside 60–100 s.                                        |
| Solver and practice                        | `solve0` reaches at least 1★ on all planets 1–120. Practice planets 1–3 have zero failures for casual, decent, and sharp on both seeds; pooled casual/decent/sharp 3★ is **26.7/55.4/84.7%**, inside their bands. The planet-2 swap and planet-3 discovery lessons pass. |
| Unit, types, build                         | `npm test`: **578 passed, 2 skipped**. `npm run typecheck` and `npm run build` pass.                                                                                                                                                                                     |
| Smoke and CI time                          | `npm run sim:baseline`: **80.2 s**, five tests pass and `tests/sim/baseline.json` refreshed. `npm run sim:quick`: **79.9 s**, below its 90 s limit. The full balance job is **456.2 s**, below ten minutes; its eight shadow failures still make that job red.           |

`UPDATE_FIXTURES=1 npm test` regenerated the intended `campaign-PP`, `constants`, `greedy-PP`, `modes`, and `levels.default` fixtures after the final recipe, salt, and target changes. The temporary sweep tests were removed. New player-facing English strings: none. No locale JSON or `package.json` was edited in phase E.
