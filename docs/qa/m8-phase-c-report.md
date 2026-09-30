# M8 phase C report

**Measurement.** Campaign flags use 96 attempts per planet and policy under master seeds `curve-a` and `curve-b`; 13 flags still disagree, so stability is red. Shadows use 10 Normal and 30 Hard/Super layouts per slot, two attempts each. The parallel CI `balance` job gates both curve sides and 32-pair Trouble cost; local simulations took 463 + 16 seconds, before CI setup. `sim:quick` took 85.7 seconds with 16 attempts.

**Spec fix (§4.4).** “Decent reaches its final star count (3★ when it finishes with 3★) with 40% or more of its throws left on average among clears.” The previous SLACK test measured reaching 1★, the deliberately easy kid floor, and flagged 39 planets. Rounds still play every throw and award stars at the end. SLACK is now 1 flag under each 96-run seed.

**Levers.** Changed 16 campaign salts. Star fractions now add 0.04 to 1★ in 11–20, 0.02 in 31–45, 0.04 from 46, excluding obstacle lessons; 3★ loses 0.02 from 21. Normal biome goals ask for 55% of the shared greedy/blind result (was 70%); Hard asks 65% (was 70%). Species goals favor common, deal-supported creatures and are selected 15%/30% on Normal/Hard (was 50%). Goal rates remain 30%/45%/60% by chapter; Trouble chance and cadence are unchanged. No Combo rule or band changed.

Normal fail%/3★, phase B → two-seed phase C mean (C casual, D decent):

| Planets | C             | D            |
| ------- | ------------- | ------------ |
| 1–10    | 8/19 → 7/21   | 1/55 → 1/52  |
| 11–20   | 8/20 → 15/18  | 1/54 → 3/50  |
| 21–30   | 27/16 → 23/19 | 11/38 → 8/48 |
| 31–45   | 25/9 → 20/13  | 3/46 → 5/52  |
| 46–60   | 15/11 → 20/18 | 2/58 → 3/57  |

First Hard C fail 42–44% (limit 40); D fail 20–22%/3★ 37–40%. Hard 25+ C fail 61% (limit 50), D fail 24%/3★ 31–32%. Super C fail 44–45%, D fail 20–23%/3★ 30–33%. Shadow D fail is 7.5% first Hard, 24% Hard 25+, 27.7% Super: all below their floors. Practice shipping bands and lesson tests pass; shadow casual 3★ is 50% (ceiling 45%). Sharp remains Watch.

**Lint.** 1–60 `curve-a`/`curve-b`: WALL 1/1, CLIFF 5/7, GOAL-TRAP 12/11, EASY 10/8, EASY-EARLY 6/6, SLACK 1/1; STACK, BONK-HEAVY, TRIVIAL, FLAT 0. 61–120 Watch: WALL 19, CLIFF 14, GOAL-TRAP 6, STACK 2, EASY 15, TRIVIAL 1, SLACK 2; other flags 0.

**Other gates.** Trouble cost at 32 paired runs: blind loss 5.7%, aware −0.6%, max loadout 2.6% (**red**, needs ≥3%). Spark, five bonus throws, Buddy shield and Lab together erase part of the cost; settling also awards charge, occasionally making a Trouble beneficial. Combo 2/3/4 rates are 46/17/6%, blind Combo 2 is 22%: green. M7 object-gain spread is **1.848** (limit 1.8); other M7 and obstacle gates, zero surprise bonks, Solver 0 1★ on 1–120, and reach pass. The M7.5 Scene Bot agreement gate is absent and unverified. Full-flight median 21–60 is 80.7 s. `npm test`: 569 passed, 2 skipped; typecheck, build and formatting pass. `sim:baseline` wrote `baseline.json`; regenerated `campaign-PP`, `constants`, `greedy-PP`, `modes`, and `levels.default` fixtures with `UPDATE_FIXTURES=1`. New/changed player-facing English strings: **none**.

**Still red; not shippable.** Goal misses dominate decent failures, while easing goals drops fail rates below chapter floors; shadows are too hard for casual play after 21. Salt screening alone did not solve that coupling. Next: calibrate goals against several playable recipes, retune score pressure across shipping and shadow layouts, and constrain stacked pre-round help without consuming a paid booster. All gates remain on. Child T0 and oldest-device frame time remain unverified.
