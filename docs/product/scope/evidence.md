# Evidence for the product scope

## Audits of the current game (JSON, one per area)

### Audit: core-gameplay

```json
{
 "area": "core-gameplay",
 "summary": "Core loop today: a planet is a ring of 24 sectors, each with four numbers (land 0-5, water 0-5, heat -3..3, life 0-3). Six flung objects (rock, ice, seed, magma, storm, sun) add fixed increments to a 3-sector or 7-sector footprint (world.ts:192-236). A priority function turns those numbers into one of 17 biomes (world.ts:91-106). Then settle() spawns or removes 36 creatures by adjacency recipes (16 single-biome, 12 pair, 6 trio, 2 planet-wide), at most one of each species per planet (world.ts:357-389). Score (\"life\") is computed from the END STATE only: biome values + creature points (8/20/45/120 by rarity) + 3 per distinct biome (world.ts:391-401). Nothing is remembered between throws except the terrain and a single Supernova meter. All six objects fly identically (one gravity constant, no per-object physics) and have no numeric stats. Their effects are hard-coded in one switch.\n\nDifficulty is 100% target-driven. Star targets are 42-96% of the gain that a perfect-aim greedy solver reaches (levels.ts:197-204, 285-297). On top of that: 0-2 goals (from planet 6) derived from what that same solver built (levels.ts:211-244), a throw count that rises from 9 to 16 by planet 28 (levels.ts:261), and physics or start-state twists (levels.ts:33-48). Twists only affect aim (fast spin, moons, wind, heavy, wobble, boss) or the starting terrain (hot, frozen, ocean). No twist changes what an object does. The Comet Guardian only blocks shots and is optional. Nothing on the planet ever fights back.\n\nINTERACTION MATRIX (measured by running world.ts: kind hits the centre of a sector of the given biome on an otherwise barren planet, splash 0, no Supernova; result = biome of the hit sector; '=' unchanged, '+' higher-value biome, '-' lower-value, '~' same value)\nfrom | rock | ice | seed | magma | storm | sun\nbarren | mountain+ | ocean+ | forest+ | desert+ | barren= | meadow+\nocean | swamp+ | ocean= | reef+ | desert~ | ocean= | reef+\nreef | marsh~ | reef= | reef= | savanna- | reef= | reef=\nicesheet | tundra~ | icesheet= | icesheet= | swamp+ | ocean~ | reef+\nsprings | volcano~ | ocean- | springs= | desert- | ocean- | springs=\nmeadow | highland+ | reef+ | forest+ | savanna+ | meadow= | jungle+\nforest | highland- | reef~ | forest= | savanna- | forest= | jungle+\njungle | highland- | reef- | jungle= | savanna- | forest- | savanna-\nmountain | mountain= | swamp+ | highland+ | volcano+ | mountain= | highland+\nhighland | highland= | marsh+ | highland= | volcano- | highland= | highland=\ndesert | volcano+ | ocean~ | savanna+ | desert= | barren- | savanna+\nsavanna | volcano- | reef+ | savanna= | savanna= | meadow- | savanna=\ntundra | tundra= | icesheet~ | taiga+ | barren- | barren- | meadow+\ntaiga | taiga= | icesheet- | taiga= | meadow- | meadow- | forest+\nswamp | swamp= | ocean- | marsh+ | volcano~ | ocean- | marsh+\nmarsh | marsh= | reef~ | marsh= | volcano- | reef~ | marsh=\nvolcano | volcano= | swamp~ | volcano= | volcano= | mountain- | volcano=\nTally of the 17 cells per object (same/up/down/side): rock 7/4/3/3, ice 3/5/4/5, seed 10/7/0/0, magma 3/4/8/2, storm 7/0/8/2, sun 6/10/1/0. Seed never hurts; sun almost never; magma and storm are the destructive tools; storm never upgrades the centre sector.\n\nSynergies that exist: (1) order-sensitive terrain recipes that accumulate on one sector, e.g. rock then ice gives swamp and seed on top gives marsh, ice twice gives icesheet, sun on meadow gives jungle. There is no bonus for them; they only exist because state accumulates. (2) Creature adjacency recipes, the richest layer: 12 pairs, 6 trios (e.g. Sky Dragon = volcano between mountain and highland), Leviathan (6 ocean/reef in a row) and World Tree (every sector life>=1 plus a forest). (3) The +3 variety bonus per distinct biome. (4) Supernova, a universal buff. Nothing cross-links shots: the \"x N\" chain counter is cosmetic (game.ts:837-847), and Momentum is a pre-level meta perk.\n\nNegative interactions: there is no harmful object, hazard or enemy action. The only negatives are implicit terrain overwrites that make creatures \"wander off\" (settle() returns `lost` but the UI never reads it; only a pink negative number shows, game.ts:860). Across 851 simulated greedy-play throws on planets 1-60 (all 24 sectors enumerated each throw), 21-49% of the options were net-negative, and 39-74% cost at least one creature. Worst case was -250. But the aim preview shows the delta, so avoiding them is trivial and they add no difficulty.\n\nWhere decisions are thin: the aim preview prints the resulting biome, creature and +/- life number for the spot under your finger (game.ts:1446-1488), so the \"best move\" is a read-off. On average 4.3 sectors tie for the best delta and 5.4 are within 90% of it. 17% of greedy-best throws gain 3 life or less (40% for storm). A noise-free greedy bot reaches 3 stars on 55 of 55 sampled planets, and the \"sharp\" sim bot 3-stars 70-83% of normal planets. There is, however, hidden depth that nothing rewards. A 30-wide beam search using the free swap of current and next object beat the solver that sets the targets by +32% of gain on average (-1% to +74% across 12 sampled planets, with no aim error or goals modelled). The life bar stops at 112% of the 3-star target (game.ts:334-336), so exceeding it earns nothing but the bestLife stat.",
 "systems": [
  {
   "name": "Sector model and biome resolver",
   "howItWorks": "Each of 24 sectors holds land 0-5, water 0-5, heat -3..3, life 0-3. touch() clamps after every change. biomeOf() is a fixed priority chain: water>land gives icesheet (heat<=-2), springs (heat>=2), reef (life>=1) or ocean; otherwise volcano (heat>=2 and land>=3), savanna or desert (heat>=2), taiga or tundra (heat<=-2), marsh or swamp (water>=2), highland or mountain (land>=3), jungle or forest (life>=2, jungle if heat>=1), meadow (life==1), else barren. These four sector numbers are never shown to the player; only the biome colour and name popups are. Biome value is 0-6 (BIOMES table), jungle highest (6), reef and forest 5.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/core/world.ts"
   ]
  },
  {
   "name": "Objects (kinds) and impact footprints",
   "howItWorks": "KindDef has only id, name, emoji, colour, desc and unlock level (world.ts:109-125): rock and ice at planet 1, seed 2, magma 4, storm 7, sun 11. There are no numeric stats. Effects are hard-coded in applyKind (world.ts:192-236). Rock: centre land+2, neighbours ±1 land+1. Ice: centre water+2 and heat-1, ±1 water+1. Magma: centre heat+2, land+1, water-1, ±1 heat+1. Seed: centre life+2, ±1 life+1 (only on land or water). Storm: 7 sectors wide (±3), water+1 and heat pulled toward 0. Sun: 7 sectors wide, heat+1 and life+1 on habitable. 'Wide Impact' (5000 dust) adds +1 radius to all; a Supernova adds +1 radius. Flight physics are identical for every object (GM=5.2e7 for all, game.ts:153, 681-692); the projectile art is the only difference. Queue weights: rock 4, ice 4, seed 4, magma 3, storm 2, sun 1.5, with a 1.6x debut boost (levels.ts:263-279). Measured average best single-throw gain under greedy play on planets 6-60: sun 45.9, storm 30.7 (but 40% of uses are dead, i.e. +3 or less), seed 29.1, magma 25.3, ice 22.5, rock 16.4 (11.4 in the second half of a level). The most frequent object is the weakest.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/core/world.ts",
    "/home/user/oneshotgame/src/core/levels.ts",
    "/home/user/oneshotgame/src/ui/game.ts"
   ]
  },
  {
   "name": "Creature recipes and settle()",
   "howItWorks": "36 species in four tiers (world.ts:286-351): 16 common (one biome), 12 uncommon (biome next to another), 6 rare (biome between two others), 2 legendary (planet-wide). Rarer species are checked first, may displace a common one from a sector, and each species can exist at most once per planet (present set, world.ts:367-386). After every impact, settle() removes creatures whose test now fails (`lost`) and spawns new ones. Creatures are pure score (8/20/45/120 points) and a Lifebook/quest/festival trigger; they have no stats, needs, moods or effect on shots. `lost` is computed but never surfaced in UI (grep finds no consumer outside world.ts). announce() fires onSpecies for every re-spawn, so destroying and re-creating a creature re-triggers sightings, festival spots and nova charge.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/core/world.ts",
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/ui/app.ts"
   ]
  },
  {
   "name": "Scoring and star targets",
   "howItWorks": "lifeScore = sum of biome values + species rarity points + 3 per distinct non-barren biome, computed from the final planet only (world.ts:391-401). There is no cumulative or combo scoring and no time or accuracy component in the campaign. Star targets = start + (greedyOptimum - start) x fraction, where f1 = 0.42+0.22*ease, f2 = 0.66+0.15*ease, f3 = 0.84+0.09*ease (+ up to 0.05 sawtooth and +0.02/0.03 for hard/super, capped 0.97). ease reaches 1 by planet 21 (levels.ts:197-204, 285-297). So from planet 21, 3 stars means 93% of the solver's gain (95-96% on hard/super). The solver is greedy, has no lookahead, and never uses the free swap. Goals gate every star (starsEarned, levels.ts:97-99).",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/core/world.ts",
    "/home/user/oneshotgame/src/core/levels.ts"
   ]
  },
  {
   "name": "Level generator, solver, goals and twists",
   "howItWorks": "makeLevel(n, seedPrefix) is deterministic from the seed (levels.ts:247-315). It picks a twist (every 5th planet always; 25% of others from planet 8; boss every 10th), the throw count min(16, 9+floor(n/4)), a weighted queue (planets 1-2 scripted), a start planet (a few random lakes, or hot/frozen/ocean), and then runs greedyPlan (levels.ts:170-191) to set targets and goals. The solver models Supernova charging but not swap, lab bonus, splash upgrade, or any twist physics (moons, wind, spin). Goals (from planet 6; 60% of normal planets, 1 on hard, 2 on super): a biome count of 70-80% of what the solver made, or a creature that appeared (rarest for super). Because they come from the greedy path, following the highest preview number nearly always satisfies them. Difficulty tiers: hard on every 5th planet, super on the 9th of each chapter from planet 19 (levels.ts:107-112). Twists: fast, tiny, moon, hot, frozen, ocean, plus wind (12+), heavy (16+), wobble (20+), twin (24+), boss. Retry and 'Restart planet' regenerate the identical level, so the start state and full queue are memorisable (app.ts:422, game.ts:1137).",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/core/levels.ts",
    "/home/user/oneshotgame/src/ui/app.ts",
    "/home/user/oneshotgame/tests/levels.test.ts",
    "/home/user/oneshotgame/tests/difficulty.sim.ts"
   ]
  },
  {
   "name": "Aim, physics and landing preview",
   "howItWorks": "Pull-back drag maps to velocity (PULL_TO_SPEED 6.2, MAX_PULL 150). The shot is integrated in 4 substeps per frame under central gravity (twist 'heavy' x1.45, 'wind' adds a constant 170 px/s^2 sideways). Landing sector is computed with the planet's rotation (game.ts:694-698). The aim dotted line has 16/28/44/90 steps by Aim Guide level (SCOPE_STEPS, game.ts:156) and predicts spin during flight (rotAhead). Where the line ends, drawLanding() (game.ts:1446-1488) shows the biome the sector will become, the first creature that will spawn and the net life delta (including Lab bonus and Supernova). It does not show creatures that will be lost, neighbour changes, or goal progress. Skill = timing and aim precision; choice of target is guided by the preview. Swap (tap the next bubble) is free and unlimited (game.ts:514-523), so the player effectively picks among the first two queued objects. Only cur and next are visible.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/ui/game.ts"
   ]
  },
  {
   "name": "Supernova (the only in-level power-up)",
   "howItWorks": "Meter fills by novaCharge = regions whose biome changed + 2 per creature spawned (x1.5 rounded up with Lab Lv3 on that object; x2 during the meteor-shower sky event outside competitive modes), capped at NOVA_CHARGE = 10 (world.ts:186-189, levels.ts:194, game.ts:819-823). Even net-destructive changes charge it. At 10, the next throw auto-fires as a Supernova (game.ts:658-663): it does not fire only when the player opts in, but the player can pick which object by swapping. Effect: +1 radius and +1 life on every habitable sector within radius 2 (world.ts:163-165, 416), 2 damage to a Comet Guardian (game.ts:737-740). The meter is not spent if the shot misses or is blocked, and it is off for planets 1-2 in the tutorial (game.ts:1492). In greedy play it is earned in about 1.7 throws at 6 charge per throw and fires about 3.7 times per level (216 novas in 58 planets, on average at throw 7). A Supernova gains about 40 life versus 22 for the best ordinary throw on the same turn. It feels great audiovisually (gold ring, 50-particle burst, glow, 'SUPERNOVA READY') but it is frequent, automatic and identical for every object, so it is a tempo buff, not a decision.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/core/world.ts",
    "/home/user/oneshotgame/src/core/levels.ts",
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/meta/lab.ts"
   ]
  },
  {
   "name": "Object Lab (per-object upgrades)",
   "howItWorks": "Each of the 6 objects levels 1-5 for 400/1200/3000/7000 dust (11,600 per object, 69,600 for all six). Every object gets the same four perks (lab.ts:20-27, world.ts:173-179): Lv2 Bloom +2 life per region changed, Lv3 Charge (Supernova meter x1.5), Lv4 Magnet +6 per creature spawned, Lv5 Starfall +3 on every landing. The bonus is added to the score as a running total (`this.bonus`, game.ts:811-848), never reverses, and is not part of the planet, so it never changes terrain. It is excluded from Daily, Rush and Challenge for fairness (app.ts:389-390). makeLevel knows nothing about Lab levels. Measured for a greedy bot on planets 6-60, average (score / 3-star target) at all-objects Lab Lv1/2/3/4/5 = 1.08 / 1.36 / 1.43 / 1.89 / 2.02, with the Lab bonus worth 0%, 25%, 26%, 77% and 90% of the 3-star target. Because Bloom and Magnet count regions changed and creatures spawned rather than net gain, churn pays: alternating ice and magma on one sector at Lab 5 paid +5 to +21 per throw even on throws where planet life fell by 13 (throw sequence tested in scratch).",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/meta/lab.ts",
    "/home/user/oneshotgame/src/core/world.ts",
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/ui/app.ts"
   ]
  },
  {
   "name": "Boosters, permanent upgrades, continues, Momentum, Meteor Finale",
   "howItWorks": "Pre-level boosters (config.ts:63-69): Comet Shower +3 throws (180 dust or 25 gems), Life Spark starts sectors 3, 11 and 19 at life 1 (150 or 20; fixed positions, game.ts:220-223), Star Scope full-length aim line (120 or 15). Permanent stardust upgrades (config.ts:72-98): Aim Guide (3 tiers, 250/700/1600), Extra Throws (+1 to +3, 400/1200/3000), Wide Impact (+1 radius, 5000), Vault (offline income cap 4/8/12/24h). Momentum win-streak grants +1/+1/+2 throws and free Spark at tier 2 and Scope at tier 3 (momentum.ts:14-19). Continue: +5 throws for 40/70/110 gems, max 3 per level, hidden in competitive and Rush, with a 'So close! N%' bar when 75%+ of the way (game.ts:986-1075, config.ts:8-9). Meteor Finale: leftover throws convert to +15 dust each once at least 1 star is held (game.ts:479-512). There is no in-level consumable, undo, queue-peek, reroll or hold slot. Star Scope duplicates the permanent Aim Guide and Momentum tier 3.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/meta/momentum.ts",
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/ui/flows/prelevel.ts",
    "/home/user/oneshotgame/src/ui/app.ts"
   ]
  },
  {
   "name": "Moons, Comet Guardian and physics twists",
   "howItWorks": "Moon Guard, Twin Moons and the Guardian are circles that intercept shots (game.ts:553-576, 734-753). A blocked shot is simply wasted ('Blocked!'). The Guardian (planet 10 and every 10th; last Voyage stop) has BOSS_HP = 3; each hit consumes a throw and does nothing to the planet, and a Supernova deals 2 (levels.ts:51, game.ts:735-745, 1206-1222). Defeating it once pays 30 gems + 500 dust (results.ts:8, 57-63) and is optional for the win. It is therefore the only real risk/reward choice in a level (spend 2-3 of ~14 throws for the biggest one-time reward), but it never attacks or changes the planet. Wind, heavy, wobble and fast spin change aim only.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/core/levels.ts",
    "/home/user/oneshotgame/src/ui/flows/results.ts"
   ]
  }
 ],
 "gaps": [
  "No cross-shot synergy or combo rule: nothing rewards Ice-then-Seed adjacency, matching kinds, or a specific sequence. The x N chain counter is display-only (game.ts:837-847).",
  "No explicit negative interaction or hazard: no harmful object, no decay, drought, wildfire, pollution, meteor or enemy that acts on the planet. The Guardian and moons only block a shot.",
  "Objects have no stats or identity: no mass, speed, curve, pierce, footprint or element tags in KindDef; identical flight physics; identical Lab perks for all six objects (lab.ts:20-27).",
  "No in-level power-ups, pickups, consumables, undo, queue reroll/hold, or hint tool. The only in-level spend is the +5 throws continue.",
  "Creatures do not affect gameplay: fixed points by rarity, at most one of each species per planet, no needs, moods, abilities or buffs to shots.",
  "Creature loss is invisible: settle() returns `lost` but no UI consumes it, so 'X wandered off' feedback never appears and the player can't see fragile rare creatures. The aim preview omits losses, neighbour changes and goal progress.",
  "No reward for mastery beyond 3 stars: the life bar caps at 112% of the 3-star target (game.ts:334-336); no perfect/par tier, no bonus objectives, no accuracy or tempo scoring in the campaign.",
  "Target solver is far weaker than a skilled player (greedy, no swap, no lookahead, no Lab, no splash upgrade, no twist physics), and difficulty.sim.ts play() also ignores twists, swap and beam-style planning, so twist difficulty is untuned.",
  "Difficulty has only four levers (target fraction, goals derived from the same solver, throw count, aim-only twists); no lever changes the rules, the deal, or opposition.",
  "Level state is fully deterministic and memorisable: identical start and queue on every retry or restart, and only the first two queued objects are visible."
 ],
 "painPoints": [
  {
   "issue": "The best move is usually a read-off, not a decision: the landing preview prints the resulting biome, creature and life delta for the spot you are aiming at, so play reduces to 'aim at the biggest number'.",
   "severity": "high",
   "evidence": "game.ts:1446-1488 (drawLanding includes labBonus and nova). Enumerating all 24 sectors on every greedy throw of planets 1-60 (851 throws): ~4.3 sectors tie for the best delta, ~5.4 are within 90% of it, and best-minus-median delta averages 19 life. Sim (tests/difficulty.sim.ts, RUNS=20): the 'sharp' greedy bot 3-stars 83%/88% of normal/hard on planets 1-10 and 70-78% on 21-60 normal; the 'decent' bot 3-stars 71% on planets 1-10 normal."
  },
  {
   "issue": "Real strategic depth exists but is invisible and unrewarded. Swap plus 2-3 throws of planning beats the solver that sets 3-star targets by about a third, yet the game shows no multi-step information and pays nothing above 3 stars.",
   "severity": "high",
   "evidence": "Beam search (width 30, free swap, my scratch script) vs greedyPlan on 12 sampled planets: mean +32% of gain (-1% on planet 30, +74% on planet 40, +66% on planet 12, +47% on planet 50); a width-1 swap-aware greedy is also +2% to +49% on 9 of 12. Targets: 3-star = 93-96% of greedy gain from planet 21 (levels.ts:197-204); bar ends at 112% of 3-star (game.ts:334-336); the beam result exceeded the 3-star target on every sampled planet."
  },
  {
   "issue": "Stardust's main sink, the Object Lab, adds flat life that outruns static targets, so the marquee upgrade path trivialises the campaign instead of adding new play. The perks also reward churn over net progress and inflate the preview number.",
   "severity": "high",
   "evidence": "makeLevel has no Lab input (levels.ts:247). Greedy score / 3-star target across planets 6-60: 1.08 (Lv1), 1.36 (Lv2), 1.43 (Lv3), 1.89 (Lv4), 2.02 (Lv5). Lab bonus = 0/25/26/77/90% of the 3-star target. Sim 'decent+lab3' 3-stars 98% of planets 1-10 and 89-93% of hard planets. Churn: ice/magma alternation on one sector at Lab 5 paid +5, +5, +11, +21 and 11 per throw while planet life moved -13, -1, -11 (labBonus, world.ts:173-179; preview mixes it in at game.ts:1469)."
  },
  {
   "issue": "Negative outcomes exist only as accidental overwrites, are common, and are unexplained. They cannot serve as a difficulty lever because the preview lets anyone avoid them, and the player is never told a creature left.",
   "severity": "medium",
   "evidence": "Across 851 greedy-play throws: net-negative options are 30.6% rock, 29.5% ice, 21.2% seed, 32.8% magma, 49.3% storm, 37.7% sun; options that make a creature wander off are 39-74% (sun 73.6%, storm 62.3%); worst single option -250 (magma), -199 (sun), -188 (ice). `lost` in ImpactResult (world.ts:408) is never read outside world.ts; land() only prints a pink delta (game.ts:860)."
  },
  {
   "issue": "Object roles are unbalanced and not distinct. The most common object is the weakest and sun dominates; storm is a high-variance object that never upgrades its centre sector.",
   "severity": "medium",
   "evidence": "Average best gain per throw: sun 45.9, storm 30.7 (40% of uses are +3 or less), seed 29.1, magma 25.3, ice 22.5, rock 16.4 (11.4 in the second half). Queue weights rock 4, ice 4, seed 4, magma 3, storm 2, sun 1.5 (levels.ts:263). Storm changes the centre biome upward in 0 of 17 cases and downward in 8; magma downward in 8 of 17 (matrix). Overall 17% of greedy-best throws gain 3 life or less."
  },
  {
   "issue": "The Supernova is the game's only power-up, but it is too frequent and too automatic to feel like a decision: it fills in under 2 throws for a greedy player, fires on the very next throw, is identical for all objects, and even destructive throws charge it.",
   "severity": "medium",
   "evidence": "216 Supernovas in 58 sampled planets (about 3.7 per level; greedy average charge 6.0 of 10 per throw; first fire around throw 7). Gain 40.4 vs 21.7 for the best ordinary throw. game.ts:658 (auto-fire when charge>=10), game.ts:819-823, world.ts:186-189, levels.ts:194. Lab Lv3 and the meteor-shower event make it even faster (x1.5, x2)."
  },
  {
   "issue": "Difficulty comes only from bigger targets, solver-derived goals, throw count and aim-only twists; none of these adds a new decision, and twist difficulty is untuned.",
   "severity": "medium",
   "evidence": "TUNE (levels.ts:197-204); pickGoals derives goals from the solver's plan (levels.ts:211-244) and tests assert the greedy plan meets them (tests/levels.test.ts); twists list levels.ts:33-48; difficulty.sim.ts play() (lines 5-37) has no twist, swap or moon model. The docs state difficulty was tuned by simulation, not by hand (docs/handoff/05-status-and-next.md:30). Sim fail rates for the 'decent' bot: 0-3% on planets 1-10 rising to 8-19% normal and 65% super on planets 11-20."
  },
  {
   "issue": "Boosters and the paid continue are weakly differentiated and lean on 'so close' framing. Star Scope duplicates the permanent Aim Guide and Momentum tier 3; Life Spark's three fixed sectors ignore the level's goals; only Comet Shower and the +5 throws continue change outcomes. The near-miss bar and rising gem price (40/70/110) is close to a dark-pattern for a 6+ audience.",
   "severity": "medium",
   "evidence": "config.ts:63-69, 8-9; game.ts:220-224 (Spark sectors 3, 11, 19), game.ts:1024-1075 ('So close! N% there' bar shown at 75%+, 'gem' continue button), momentum.ts:14-19."
  },
  {
   "issue": "Deterministic levels make retries a memory test: same start planet, same full queue, and a free 'Restart planet'.",
   "severity": "low",
   "evidence": "makeLevel is seeded (levels.ts:247-249); levelEnded restarts with makeLevel(n) (app.ts:421-430); pause menu 'Restart planet' has no cost (game.ts:1137-1142); only cur and next are visible (game.ts:169-170)."
  },
  {
   "issue": "Creatures (the 'characters') have no in-level role and their sightings can be farmed. Creature points are one-time per species per planet; re-spawn after loss re-fires sightings, festival spots, Magnet +6 and +2 nova charge.",
   "severity": "low",
   "evidence": "world.ts:367-386 (one per species), 354 (fixed points); game.ts:884-902 announce() calls onSpecies for every spawn including re-spawns; app.ts:362-370 (stats, sight, festival spot, quest track); docs/handoff/05-status-and-next.md:28 already flags Zen festival farming."
  },
  {
   "issue": "The 'combo' feel is cosmetic: chain of 3+ positive throws only prints 'x N' and raises a sound pitch.",
   "severity": "low",
   "evidence": "game.ts:182, 837-847 (chain used only for callout text and sfx.combo)."
  }
 ],
 "opportunities": [
  "Make combos real and cheap to add: extend impact() with short-term state (last kind, last sector, chain length) held in level state, and add pair rules that need no new art, e.g. Ice then Seed within 2 sectors triggers a Bloom bonus, Magma beside Ice makes Steam/hot springs with a bonus, three positive throws in a row give the next throw +1 radius. Wire the existing chain counter (game.ts:837-847) to a real multiplier and show the pair in the aim preview.",
  "Give objects real stats and identity: add numeric fields to KindDef (mass/gravity pull, launch speed, footprint width, element tags) so flight differs per object (rock heavy and straight, seed floaty, ice fast, storm drifts). Replace the shared four Lab perks with one distinct perk line per object that changes rules (e.g. Rock Lv3 landslide extends a mountain range), not flat +life.",
  "Add kid-safe negative interactions as telegraphed, deterministic, counterable hazards rather than harm to creatures: Drought or Wildfire creeping from hot sectors, Frost creep, a Guardian that lobs a telegraphed dust cloud on a sector, debris that scars one sector at end of turn (shown one throw ahead). Creatures only ever 'wander off' and return. Storm becomes the 'cleanse' counter and gets a purpose. Hard and super planets then add hazards instead of just bigger targets.",
  "Surface `lost` and risk: toast/animate 'X wandered off' from ImpactResult.lost, mark fragile rare creatures, and show neighbour changes, creature loss and goal progress in the aim preview (possibly the Star Scope booster upgrades preview detail so it becomes an information tool rather than a longer line).",
  "Turn the Supernova into a decision: player taps to spend it, holds up to 2 charges, charge scales with combos and adjacency instead of raw region count (so destruction stops charging it), and each object gets its own nova effect. This also gives a natural non-gambling premium hook (a fixed-price, previewable nova skin or preset).",
  "Reward the hidden depth: add a 4th 'Master' tier and/or par objectives set by a stronger solver (beam search with swap, ~11s for 12 planets in my script) while keeping greedy for stars 1-3. Add bonus objectives ('use a Supernova on a rare', 'no wasted throw', 'chain x4') that pay stardust, and extend the life bar past 112% so extra optimisation is visible.",
  "Make the Lab and boosters scale-aware: give makeLevel a recommended-Lab tag or scale targets when Lab bonuses apply in campaign, or convert late Lab tiers into rule-changing perks; make Life Spark seed goal-relevant sectors; give Star Scope real information (2-step preview) instead of duplicating Aim Guide. Fix the churn bonus by paying Bloom/Magnet on net life gained and excluding the bonus from the preview number when the throw is net-negative.",
  "Rebalance kinds and deal: raise Rock's payoff (or give it a late-game role such as wall/shield against hazards), give Storm a real job (cleanse/cool), lower Sun's single-throw dominance or its frequency, and skew the deal on hard levels towards awkward mixes. Add 1-2 new objects later in the chapters (only original designs) once hazards exist.",
  "Add queue resource decisions: reveal 3-4 upcoming objects, add a single 'hold' slot, and vary retries (e.g. seed suffix per attempt or a daily-fixed variant) so retry is not memorisation, while keeping Daily/Challenge identical for fairness.",
  "Upgrade the balance tooling before building: extend tests/difficulty.sim.ts to model swap, Supernova hold/choice, twist physics (moon block probability, wind, wobble), Lab levels and hazards; add a beam-search 'par' and a decision-entropy metric (number of near-best sectors) to guard that new mechanics create real choices. Keep the invariant in tests/levels.test.ts that every planet is beatable."
 ]
}
```

### Audit: economy-data: currencies (gems, stardust, materials, boosters, event tokens), so

```json
{
 "area": "economy-data: currencies (gems, stardust, materials, boosters, event tokens), sources and sinks, difficulty simulation, telemetry. Method: static read of the economy and progression code plus offline bot models I wrote (scratch only, repo untouched; git status clean). All paths are relative to /home/user/oneshotgame; scratch scripts and logs are in /tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/ (sim.log, econ.log, econ.model.ts, catalog.model.ts, fails.model.ts, mats.model.ts, frost.model.ts, events.model.ts, cashflow.mjs).",
 "summary": "HOW THE ECONOMY WORKS TODAY. Two wallets plus side-stores, all local (no server). STARDUST is the soft currency, mostly a passive faucet. GEMS are the premium currency, but most of them are earnable for free. Boosters (shower/spark/scope) are consumables. Materials (stone/dew/leaf/ember/frost) come only from winning campaign levels. Weekly-event tokens, festival spots and Voyage stops are progress meters, not spendable currencies.\n\nSTARDUST SOURCES (numbers). (1) Level win: (25 + 15*stars + 40 on first clear) * {normal 1, hard 2, super 3} + 15 per unused throw (Meteor finale) (economy.ts:83, game.ts:110). Replays pay it again minus the 40. (2) Galaxy idle income: every cleared planet makes 6 + 3*stars + 2*species per hour (economy.ts:10-12) into a vault that caps at 4/8/12/24h (config.ts:99). Measured on a decent-skill bot: about 32-38 stardust/h per planet, and about 65% of that comes from the species count (about 9 to 12 species per planet), so the whole galaxy makes about 324/h after 10 levels, 671/h after 20 and 1,049/h after 30. (3) Homeworld: Mill 40/70/110/160/230 per h at Lv1-5, x3 mills, cap 6h (+2h per Observatory level); expeditions about 120/h x (1 + 0.1*tower level) x rarity; meteor debris 60 each (3 hours apart, 3 max); resident treats are a sink, not a source (homeworld.ts:465-470, 666-674, 704-706). (4) Fixed rewards: chapter chest 200*n; boss 500 (once); Star Road free 10,600 in total and Cosmic Pass lane 13,500; calendar 4,500 per 28-day cycle; Voyage 1,650/week; event 1,200/week; festival 750/month; habitats 4,200; ranks 150*rank (about 31,500 for ranks 1-20); Meteor Rush 0.6*score; Challenge +50 per play; visitors 15-40*rarity each.\n\nSTARDUST SINKS. Object Lab: 400/1200/3000/7000 per object, 11,600 x 6 = 69,600 (lab.ts:12). Galaxy upgrades 15,850 (aim guide 2,550, +throws 4,600, wide impact 5,000, vault 3,700; config.ts:73-98). Homeworld rings 1,500/5,000/12,000/30,000 (48,500, chapter-gated: ring 5 needs chapter 8; homeworld.ts:103-105). Buildings: about 513,000 in total if all are maxed (Mill 8,030 each, Den 13,380, Greenhouse 32,100, Tower 48,150, Grove 107,000 each, Observatory 133,750, decor 200-400). Boosters 120/150/180 each. Resident treats 40 + 30*friend level. Nothing else.\n\nGEM SOURCES. Start with 30. Welcome letter 20. First 3-star on a level +2, first Super Hard clear +5. First discovery of each of 36 species +3 (108 in total). Boss 30. Chapter chest 25 + 5n. Daily quests avg 10.2 each, so 3 quests + 20 bonus = about 50 per day. Calendar avg 15.7 per day (440 per 28 days). Daily Planet 5 + 5*stars. Rush new best +5. Challenge win +10. Weekly event 85, Voyage 45, festival 35. Star Road free 415 and pass lane 880. Album pages 300 + milestones 60. Habitats 315. Constellations 430. Ranks about 1,450 through rank 20. Friendship 5*level, about 70 per resident plus 25 for a best-friend letter. Visitors: 25% chance of ceil(rarity multiplier). Expedition 2 to 6. Grove 1/6 to 1/2.5 per hour. Welcome-back 30 (after 3+ days away). IAP: 80/$0.99, 500/$4.99, 1,200/$9.99, 2,800/$19.99 (80-140 gems per USD), piggy up to 250 for $1.99, Starter $2.99 (300 gems + 15 boosters + Aurora), Cosmic Pass $4.99 (config.ts:26-58).\n\nGEM SINKS. Continue \"+5 throws\" 40/70/110 (max 3 per level; not in timed or competitive modes; config.ts:8, game.ts:989). Boosters 25/20/15. Atmospheres 3 x 150. Keeper cosmetics 11 items at 80-250 (1,510 in total). Homeworld paints 510 in total. Resident accessories 2 x 40. Keeper Statue 120. \"x2 stardust\" collect 10 (home.ts:147). The fixed catalog is about 2,670 gems, which is less than one XL pack (2,800 for $19.99).\n\nEARNINGS PER 10 CAMPAIGN LEVELS (decent bot, 30 runs; casual and sharp bots are within +/-10%).\n- Ch1 (L1-10): stardust about 1,875 + chest 200; gems about 114 (70 of them from first-time species) + chest 30; materials 93; stars about 26; galaxy rate after: 324/h.\n- Ch2 (L11-20): stardust about 1,870 + chest 400; gems about 53 + chest 35; materials 112; stars about 21; galaxy rate after: 671/h.\n- Ch3 (L21-30): stardust about 2,100 + chest 600; gems about 51 + chest 40; materials 122; stars about 25; galaxy rate after: 1,049/h.\n- Each chapter chest also gives 1 of each booster.\n- By L30 the free Star Road lane has paid about 55 gems and 1,280 stardust. The pass lane adds 180 gems, 1,500 stardust and 15 boosters.\n- One vault collect at L30 (4h x about 1,050) is about 4,200 stardust, which is more than all active stardust from chapter 3 (about 2,100 + 600).\n- Independent of level: a daily-active player earns about 100 gems per day (quests 50, calendar 16, Daily Planet about 20, event 12, Voyage 6) and 4-16k stardust per day, mostly idle.\n\nWHAT THEY CAN SPEND IT ON IN CH1-3. About 30-35k of stardust sinks are open by L30 (Lab Lv2-3 on unlocked objects, vault/throws/aim, rings 2-3, first mills/dens/greenhouse/tower). Modelled at 3/6/12 levels per day, the entire Lab plus galaxy-upgrade list (85,450) is bought by day 9/6/4, and all stardust sinks (about 650k, ignoring chapter gating) are absorbed by about day 23/17/11. After that stardust has no use. Gems: a daily player can buy the entire fixed catalog in about 2-4 weeks, so continues and boosters become the only recurring gem sink.\n\nWHICH SINKS ARE THE \"POINT\" OF PLAYING. In order: (1) Object Lab, the only stardust sink that changes a round (+2 life per region at Lv2, faster Supernova charge at Lv3, +6 per creature at Lv4, +3 per landing at Lv5). (2) Star Road/Explorer Rank/collection completion (36 species, 63 stickers, 6 constellations, 16 dyes, about 50 cosmetics). (3) Homeworld rings and buildings, which only feed back into stardust, boosters and gems. Creatures have no mechanical role in a round. Their only economic role is +2 stardust per hour per species per planet.\n\nSIMULATION (npm run sim, about 84s, RUNS=20; each cell is fail% / 3-star% per difficulty n/h/s).\n- L1-10: casual n 3/34 h 18/30 | decent n 0/71 h 3/68 | sharp n 1/83 h 0/88 | decent+Lab3 n 0/98 h 0/93\n- L11-20: casual n 36/21 h 40/13 s 85/0 | decent n 9/46 h 8/30 s 65/5 | sharp n 1/73 h 0/68 s 15/30 | decent+Lab3 n 4/79 h 0/100 s 20/50\n- L21-30: casual n 37/19 h 25/20 s 40/35 | decent n 19/44 h 18/38 s 30/55 | sharp n 14/73 h 15/63 s 0/100 | decent+Lab3 n 22/74 h 0/90 s 10/80\n- L31-45: casual n 32/19 h 35/28 s 90/0 | decent n 17/40 h 15/53 s 65/0 | sharp n 6/70 h 0/80 s 25/35 | decent+Lab3 n 12/80 h 7/93 s 55/30\n- L46-60: casual n 21/34 h 50/32 s 83/5 | decent n 8/47 h 23/57 s 50/35 | sharp n 2/78 h 8/82 s 28/68 | decent+Lab3 n 5/89 h 18/77 s 65/35\n- 40 of 60 levels have goals.\n\nReading: (a) There is a cliff at chapter 2: casual normal fail jumps 3% to 36%, decent 0% to 9%. (b) Hard planets are easier than the author's own target (25-45% for decent, tests/difficulty.sim.ts:39-41): decent hard fail is 3/8/18/15/23%. Super Hard is in or near band, but each cell is a single level (L19, 29, 39, 49, 59), so treat those cells as anecdotes. (c) Lab Lv3 (1,600 stardust per object) lifts decent 3-star from about 45% to 75-89% and drives hard fails to 0-7%. (d) My extra run shows fails from L21 on are mostly goal misses: at Lab3 for L21-30, fail is 17%, all of it goals. Lab therefore cannot fix the failure mode that remains, and levels are sized to the greedy solver at Lab 1 (levels.ts:282-297), so power creep is not compensated. (e) Sim caveat: the bot picks a sector, adds 25% aim error and ignores projectile gravity, wind/heavy/wobble/twin and boss HP, so real fail rates are probably higher. There is no human playtest data.\n\nTELEMETRY. None. src has no fetch, XHR, beacon or SDK. PrivacyInfo.xcprivacy declares NSPrivacyTracking=false and empty collected data types. docs/privacy.html says \"no analytics\". Only coarse local counters exist (Profile.stats, meta.sessions/installed/lastSeen, processedTx). Details are in the systems and opportunities sections below.",
 "systems": [
  {
   "name": "Stardust (soft currency): faucets and sinks",
   "howItWorks": "Faucets: win payout (economy.ts:83), idle galaxy income planetRate = 6+3*stars+2*species per planet per hour into a 4/8/12/24h vault (economy.ts:10-44, config.ts:99), Homeworld mills/expeditions/debris (homeworld.ts:465-470, 666-674, 704-706), and many one-off/periodic rewards (chest 200*n, Star Road, calendar, events, Voyage, festival, habitats, ranks, Rush 0.6*score, Challenge +50). Sinks: Object Lab 69,600 (lab.ts:12), galaxy upgrades 15,850 (config.ts:73-98), Homeworld rings 48,500 and buildings about 513k (homeworld.ts:40-105), boosters 120-180 (config.ts:65-69), resident treats 40+30*lv (homeworld.ts:623). Measured: idle income is about 34 stardust/h per cleared planet, so it overwhelms the active payout (about 190 per level) within the first few days. No dust-to-gem conversion. No expressive sink (all cosmetics are gems, Star Road, rank, habitat, constellation or pass).",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/meta/economy.ts",
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/meta/lab.ts",
    "/home/user/oneshotgame/src/meta/homeworld.ts",
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/ui/screens/upgrades.ts"
   ]
  },
  {
   "name": "Gems (premium currency) and IAP catalogue",
   "howItWorks": "7 StoreKit 2 products via @capgo/native-purchases (iap.ts:24-76): gems 80/$0.99, 500/$4.99, 1200/$9.99, 2800/$19.99 (80.8/100/120/140 gems per USD), Piggy Bank $1.99 (4 gems per win, cap 250, buyable at 40+, shown from level 10), Starter $2.99 (300 gems + 5 of each booster + Aurora atmosphere and suit, offered once after the chapter-1 chest, offers.ts:15), Cosmic Pass $4.99 (premium Star Road lane: 880 gems + 13,500 stardust + 30 boosters + 4 cosmetics + atmosphere + paint + 3rd drone, retroactive). A parental gate (multiplication question) precedes every purchase (app.ts:459, gate.ts). Grants are idempotent by transaction id (economy.ts:128-151); there is no server receipt validation. Free supply is about 100 gems/day for a daily player plus about 4,000+ gems of one-off rewards; the fixed gem catalog is only about 2,670 gems (cosmetics 1,510, atmospheres 450, paints 510, accessories 80, statue 120).",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/meta/iap.ts",
    "/home/user/oneshotgame/src/meta/economy.ts",
    "/home/user/oneshotgame/src/ui/screens/shop.ts",
    "/home/user/oneshotgame/src/ui/flows/offers.ts",
    "/home/user/oneshotgame/src/ui/flows/gate.ts",
    "/home/user/oneshotgame/src/ui/app.ts",
    "/home/user/oneshotgame/README.md"
   ]
  },
  {
   "name": "Continue (+5 throws) and gem-for-stardust conveniences",
   "howItWorks": "When throws run out on a non-competitive, untimed level, the end modal offers '+5 THROWS' for 40/70/110 gems (3 max per level; stars already won are kept via minStars) and shows a 'So close! N% there' meter when progress is at least 75% (game.ts:989-1075, config.ts:8-9). The Home and Welcome-back screens offer 'x2' on the pending vault stardust for 10 gems (home.ts:146-153, offers.ts:13, 55). Real-money equivalent of a continue is about $0.29-0.50 (40 gems) to $0.79-1.36 (110 gems), so a full 3-continue rescue costs about $1.57-2.72. This is the only recurring gem sink and the main pressure point for monetization.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/ui/screens/home.ts",
    "/home/user/oneshotgame/src/ui/flows/offers.ts"
   ]
  },
  {
   "name": "Boosters (Comet Shower +3 throws, Life Spark 3 meadows, Star Scope full aim line)",
   "howItWorks": "Bought before a level with stardust (180/150/120) or in the Shop with gems (25/20/15), which is 7.2-8 stardust per gem (config.ts:65-69, prelevel.ts:60-75, shop.ts:98-110). Free supply: start 1 each; chapter chest 1 each; Star Road; calendar (10 boosters per cycle); daily-quest bonus (1 shower per day); Greenhouse (1/6 to 1/3 per hour per building, 2 max, cap 6h+); expedition 4h gives 1 spark and 8h gives all 3; momentum perks make spark/scope free; Starter Pack +5 each; pass lane +30. Boosters are optional and cheap, so the gem price is dominated and the gem-side sale is close to dead.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/ui/flows/prelevel.ts",
    "/home/user/oneshotgame/src/ui/screens/shop.ts",
    "/home/user/oneshotgame/src/meta/homeworld.ts",
    "/home/user/oneshotgame/src/meta/momentum.ts"
   ]
  },
  {
   "name": "Object Lab and galaxy upgrades (the only power progression)",
   "howItWorks": "Each of 6 objects has Lv1-5 (lab.ts:10-27): Lv2 +2 life per transformed region, Lv3 Supernova charges 50% faster, Lv4 +6 life per creature, Lv5 +3 life on every landing. Costs 400/1200/3000/7000 (11,600 per object, 69,600 in total), gated by the object's unlock level. Applies to the campaign and Zen only; the competitive modes use base stats. Galaxy upgrades: aim guide 250/700/1600, +throws 400/1200/3000, wide impact 5000, vault 300/900/2500. Bot sim: Lab Lv3 moves decent-player 3-star rate from about 45% to 75-89% and hard-planet fails to 0-7%. The level generator sizes star targets against the greedy solver at Lab 1 (levels.ts:282-297), so the Lab silently trivialises the campaign.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/meta/lab.ts",
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/core/world.ts",
    "/home/user/oneshotgame/src/core/levels.ts",
    "/home/user/oneshotgame/src/ui/screens/upgrades.ts"
   ]
  },
  {
   "name": "Homeworld (passive base) economy",
   "howItWorks": "Rings: 6/8/10/12/14 plots; ring n needs chapter [0,0,1,3,5,8] done and [0,0,1500,5000,12000,30000] stardust (homeworld.ts:102-106). Buildings cost base*[1,2.5,6,14,30] and a level needs ring >= level; build time 30s/5m/30m/2h/4h; a campaign win takes 10 min off every active build; gems can never skip timers (homeworld.ts:98-108). Drones: 2 (3 with pass). Producers (cap 6h, +2h per Observatory level): Mill 40-230 stardust/h, Greenhouse 1/6-1/3 booster/h, Grove 1/6-1/2.5 gem/h (homeworld.ts:465-470). Den holds lv+1 residents (max 2 dens = 12). Residents make a request every 6h (40% treat 40+30*lv stardust, 35% pat, 25% decor); each friend level pays 5*level gems (about 70 per resident). Expeditions 1/4/8h pay hours*120*(1+0.1*tower)*rarity stardust, with 2-6 gems and boosters on longer trips. Debris 60 stardust. Full build-out is about 513k stardust plus 48.5k for rings. The highest-tier buildings are poor investments (Grove 107k for at most 0.4 gem/h).",
   "depth": 4,
   "files": [
    "/home/user/oneshotgame/src/meta/homeworld.ts",
    "/home/user/oneshotgame/src/ui/screens/homeworld.ts"
   ]
  },
  {
   "name": "Materials (constellations, bundles, dyes)",
   "howItWorks": "Every campaign win drops materials: one per 2 regions of a land family (stone: mountain/highland; dew: ocean/reef/springs/swamp; leaf: meadow/forest/jungle/marsh/savanna; ember: desert/volcano; frost: icesheet/tundra/taiga) plus 1 per present material at 3 stars (constellations.ts:34-46, results.ts:41-49). It pays on every replay too. Sinks: 6 constellations in strict sequence (otter, mill, ember, frost, tree, crown) with 20 bundles that need dew 53, leaf 82, stone 61, ember 48, frost 46 (290 in total), paying 40-150 gems and a Keeper item each; plus 16 suit dyes needing 84 more (dyes.ts). Measured supply on a decent bot: 9-12 materials per level, with leaf 5.3-7.0, dew 2.3-3.6, stone 1.1-1.8, ember 0.5-0.7 and frost about 0.0 per planet. Greedy 3-star plans yield more than 1 frost on only 5 of the first 120 levels. No level goal asks for frost, and 0 of the first 120 levels use the frozen twist.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/meta/constellations.ts",
    "/home/user/oneshotgame/src/meta/dyes.ts",
    "/home/user/oneshotgame/src/ui/flows/results.ts",
    "/home/user/oneshotgame/src/ui/screens/sky.ts"
   ]
  },
  {
   "name": "Event tokens, Weekly Voyage and monthly Festival meters",
   "howItWorks": "Weekly event (from L8): one of 6 themes rotates by ISO week (events.ts:95-98). Tokens = 1 per changed region in the theme's biomes, 2 per creature for Critter Week, and 4 per NEW star for Starfall Week (results.ts:32). Six tiers at 10/25/45/70/100/140 tokens pay 85 gems + 1,200 stardust + 4 boosters + an atmosphere (events.ts:76-83). Measured tokens per level on a theme-blind bot: Critter 43, Bloom 24, Ocean 8, Volcano 5.4, Frost 2.1, Starfall about 0 once stars are banked, which means the full 140 takes 3, 6, 18, 26, 67 levels or never. Voyage (from L12): 7 stops per week, pays 45 gems + 1,650 stardust + 2 boosters in total (voyage.ts:14-22), with difficulty base = level-4 clamped to 8-55. Festival (from L8): spot 10/25/45 costumed creatures for 35 gems + 750 stardust + sticker + costume; a level spawns about 21.6 creatures, so the month is done in about 2 levels, and Zen Garden counts too.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/meta/events.ts",
    "/home/user/oneshotgame/src/meta/voyage.ts",
    "/home/user/oneshotgame/src/meta/festivals.ts",
    "/home/user/oneshotgame/src/ui/flows/event.ts",
    "/home/user/oneshotgame/src/ui/flows/festival.ts",
    "/home/user/oneshotgame/src/ui/app.ts"
   ]
  },
  {
   "name": "Reward tracks: chapter chests, Star Road + Cosmic Pass, quests, calendar, rank, habitats, sticker album",
   "howItWorks": "Chapter chest: 25+5n gems, 200n stardust, 1 of each booster (progression.ts:51-53). Star Road: 15 tiers from 5 to 260 stars; free lane 415 gems + 10,600 stardust + 15 boosters + items; pass lane 880 gems + 13,500 stardust + 30 boosters (progression.ts:83-99); max 30 stars per chapter, so it ends at about chapter 9-10 (about level 90-105). Quests: 3 random per day from 10 (avg 10.2 gems; completing all pays +20 gems + 1 shower) (progression.ts:146-175). Calendar: 28 stamps that never reset (440 gems, 4,500 stardust, 10 boosters, 2 items; calendar.ts:7-36). Explorer Rank: rewards 20+5r gems, 150r stardust and boosters, and gates Daily/Rush/Zen/Challenge modes at ranks 2-5 (rank.ts:80-95). Habitats 6 sets, 315 gems + 4,200 stardust. Album: 63 stickers, pages 300 gems, +10 gems per 10 stickers (stickers.ts:103-120). Almost all rewards are gems, stardust or boosters, so it is one flat reward vocabulary.",
   "depth": 4,
   "files": [
    "/home/user/oneshotgame/src/meta/progression.ts",
    "/home/user/oneshotgame/src/meta/calendar.ts",
    "/home/user/oneshotgame/src/meta/rank.ts",
    "/home/user/oneshotgame/src/meta/habitats.ts",
    "/home/user/oneshotgame/src/meta/stickers.ts",
    "/home/user/oneshotgame/src/meta/inbox.ts",
    "/home/user/oneshotgame/src/meta/modes.ts"
   ]
  },
  {
   "name": "Difficulty model and simulation harness",
   "howItWorks": "makeLevel builds a seeded level: throws = min(16, 9+floor(n/4)); every 5th level is Hard (x2 stardust), and from L19 every 9th of a chapter is Super Hard (x3); every chapter's 10th is a Comet Guardian boss (3 HP); goals appear from L6 (40 of the first 60 levels have them); wind/heavy/wobble/twin twists join at L12/16/20/24 (levels.ts:54-321). Star targets are a share of the greedy-solver optimum (f1 0.42-0.64, f2 0.66-0.81, f3 0.84-0.93, plus a per-chapter sawtooth and hard/super bumps; TUNE at levels.ts:197-204). tests/difficulty.sim.ts plays levels 1-60 with 4 bot profiles (casual, decent, sharp, decent+Lab3), each 20 runs per level, and prints fail%/3-star% per band and difficulty. It ran in 84s. It is a difficulty sim only: it does not model stardust/gem/material supply, and it ignores projectile physics, twists and boss HP.",
   "depth": 4,
   "files": [
    "/home/user/oneshotgame/src/core/levels.ts",
    "/home/user/oneshotgame/tests/difficulty.sim.ts",
    "/home/user/oneshotgame/tests/levels.test.ts",
    "/home/user/oneshotgame/tests/economy.test.ts",
    "/home/user/oneshotgame/vitest.config.ts"
   ]
  },
  {
   "name": "Analytics, telemetry and privacy posture",
   "howItWorks": "No network code for analytics exists in src (no fetch/XHR/beacon/SDK). ios/App/App/PrivacyInfo.xcprivacy declares no tracking and no collected data types (only the UserDefaults required-reason API). docs/privacy.html states no accounts, ads, analytics or tracking. README says to answer 'Data Not Collected'. The only measurement is a set of local counters in Profile: stats (throws, plays, wins, bestLife, creatures, threeStars, dailies, rushBest, rushPlays, zenThrows, challenges, hardWins, bestStreak), meta (installed, lastSeen, sessions, rated, starterOffered, notifAsked), the last 200 processedTx ids, and per-object fling counts. Game Center leaderboards (stars, life, rush, daily) and achievements are Apple-hosted. stats.plays increments at level start (app.ts:404) and modes.ts:95, and stats.wins increments on win, so the global fail count is only plays minus wins; there is no per-level attempt, fail, continue, session-length or earn/spend ledger.",
   "depth": 1,
   "files": [
    "/home/user/oneshotgame/ios/App/App/PrivacyInfo.xcprivacy",
    "/home/user/oneshotgame/docs/privacy.html",
    "/home/user/oneshotgame/src/meta/profile.ts",
    "/home/user/oneshotgame/src/ui/app.ts",
    "/home/user/oneshotgame/src/meta/achievements.ts",
    "/home/user/oneshotgame/README.md"
   ]
  }
 ],
 "gaps": [
  "No earn/spend ledger. Nobody can tell which source produced how many gems or stardust, or where currency is stranded. There is no per-level attempts/fails/continues/time-to-clear log, so balancing is blind (profile.ts stats are global only; plays-wins is the only fail proxy).",
  "No economy simulator. tests/difficulty.sim.ts models fail rates only; there is no test or script that projects currency supply against sinks or asserts healthy ranges. economy.test.ts checks mechanics, not balance. The scratch models in the scope folder (econ.model.ts, catalog.model.ts, cashflow.mjs) are the first attempt and could be promoted to tests/economy.sim.ts.",
  "No real player data at all: everything here is bot-derived. The bot ignores projectile aim/gravity, wind, heavy, wobble and twin twists, boss HP and human error patterns, so it likely understates real fail rates. Human playtest and TestFlight feedback are needed to calibrate.",
  "No late-game sink: stardust runs out of purchases after about 2-3.5 weeks (modelled), gems after about 2-4 weeks, materials after about level 40 apart from frost. The campaign is endless but the reward structure is finite (Star Road ends at 260 stars, roughly chapter 9-10; ranks generate but pay small amounts).",
  "No currency or resource for a Clash-style base mode. Homeworld has production but no troops, upgrades with combat effect, attack or defence, and nothing that puts stardust, creatures or materials at stake, so the base has no reason to exist beyond stardust growth.",
  "No dust-priced expressive/cosmetic tier. All identity items (Keeper suits, hats, launchers, trails, atmospheres, paints, accessories) are gems, Star Road, rank, habitat or constellation, so stardust cannot be used for self-expression and gems are only used for cosmetics and continues.",
  "No recurring or seasonal monetization: Cosmic Pass is a one-time non-consumable (retroactive), Starter is one-time; there are no fixed-price cosmetic bundles, expansion packs or seasonal passes (listed only as an idea in docs/handoff/05-status-and-next.md).",
  "No central tuning file: config.ts header says everything tweakable is there, but PIGGY_MIN/PIGGY_FROM_LEVEL (shop.ts:11-13), DOUBLE_DUST_GEMS/WELCOME_BACK (offers.ts:11-13), FINISH_DUST_PER_THROW (game.ts:110), BOSS_REWARD (results.ts:8), LAB_COST (lab.ts:12), ring and building costs (homeworld.ts), quest gems (progression.ts), Rush/Challenge payouts (modes.ts) and debris are spread over 10+ files.",
  "No per-event balance data or design targets. EVENT_TIERS is identical for every event even though tokens per level differ by 20x between themes.",
  "No level-goal support for materials. No goal ever asks for frost or ember lands, and the 'frozen' twist did not appear in the first 120 levels, so the material economy depends on off-meta play."
 ],
 "painPoints": [
  {
   "issue": "Stardust income is dominated by the idle galaxy formula, which is unbounded and grows linearly with the endless campaign, so active play and most sinks stop mattering within days.",
   "severity": "high",
   "evidence": "economy.ts:10-12 (6+3*stars+2*species per planet per hour). Measured about 34/h per planet: 324/h after L10, 671/h after L20, 1,049/h after L30, so about 3,500/h at L100. One 4h vault collect at L30 is about 4,200, more than the entire active stardust of chapter 3 (about 2,100 + 600 chest; econ.log). Modelled (cashflow.mjs, no Homeworld production): the Lab plus galaxy upgrades (85,450) are all bought by day 9/6/4 at 3/6/12 levels per day. Species count drives about 65% of the rate."
  },
  {
   "issue": "Stardust's biggest sinks mostly make more stardust (vault, mills, rings, observatory), and only the Object Lab changes a round. After the Lab is maxed there is nothing worth buying, so 'why collect stardust?' has no answer.",
   "severity": "high",
   "evidence": "Power sinks total about 85k (lab.ts:12, config.ts:73-98). Homeworld total about 562k (rings 48.5k, buildings 513k; homeworld.ts:40-105), but the top tiers are poor value: Grove 107,000 per unit for at most 0.4 gem/h (payback impossible against booster/gem prices), Observatory 133,750 for +2h cap per level. Modelled: all stardust sinks are absorbed by about day 23/17/11 (3/6/12 levels per day) and then stardust is dead. No stardust-to-gem or dust-priced cosmetic exists."
  },
  {
   "issue": "The gem catalog is tiny relative to free gem supply, so gem packs have almost nothing to sell. The fixed gem catalog costs about one XL pack, and realistic IAP revenue per payer is capped near the Starter plus Pass (about $8) plus small continue spending.",
   "severity": "high",
   "evidence": "Fixed gem sinks: cosmetics 1,510 + atmospheres 450 + paints 510 + accessories 80 + statue 120 = about 2,670 gems (catalog.model.ts) versus 2,800 gems for $19.99 (config.ts:47-54). Free supply: about 100 gems/day (quests 50.6, calendar 15.7, Daily Planet about 20, event 12, Voyage 6.4, festival 1.2) plus one-offs: Star Road 415, pass 880, album 360, habitats 315, constellations 430, ranks 1-20 1,450, chapters 1-12 690, bosses 360, species 108, friendships up to about 3,400. Best value is the Pass at 176 gems per USD, which beats every pack (80-140)."
  },
  {
   "issue": "Difficulty flattens with the Lab, and the level generator ignores it. Hard planets are easier than the designer's target. There is also a difficulty cliff at chapter 2 for weaker players.",
   "severity": "high",
   "evidence": "sim.log: decent+Lab3 3-star is 98/79/74/80/89% versus decent 71/46/44/40/47%, and hard-planet fail is 0-7% at Lab3. Decent hard fails are 3/8/18/15/23% versus the 25-45% target in tests/difficulty.sim.ts:39-41. Casual normal fails go 3% (L1-10) to 36% (L11-20) and 37% (L21-30). Star targets are computed from the greedy optimum with no Lab input (levels.ts:282-297). fails.model.ts: at Lab3 in L21-30, fail is 17% and all of it is goal misses, so Lab cannot help the failures that remain."
  },
  {
   "issue": "Material economy is unbalanced and the constellation chain is strictly sequential, so frost (and ember) starves the fourth constellation and blocks the last two, which hold the biggest rewards.",
   "severity": "high",
   "evidence": "Needs: 290 materials for constellations (dew 53, leaf 82, stone 61, ember 48, frost 46) plus 84 for dyes (constellations.ts:69-214, dyes.ts:18-33). Greedy 3-star drops per planet over 120 levels: leaf 6.8, dew 4.1, stone 1.95, ember 0.78, frost 0.08 (frost.model.ts). Only 5 of 120 levels give more than 1 frost, no goal ever targets a frost land, and 0 of the first 120 levels use the frozen twist. unlockedConstellation (constellations.ts:219) requires the previous constellation lit, so Snow Whale (frost 22 needed, 80 gems is Tree, Crown pays 150 gems and Star Crown) is behind a wall unless the player deliberately builds tundra/taiga/ice sheets. Needs a human playtest to confirm."
  },
  {
   "issue": "Weekly event and festival balance is wildly uneven, so they are either a checkbox or unreachable, and the reward is identical either way.",
   "severity": "medium",
   "evidence": "events.model.ts (theme-blind decent bot, L8-40): Critter Week 43 tokens/level so 140 takes 3.2 levels; Bloom 23.7 (5.9 levels); Ocean 7.9 (17.8); Volcano 5.4 (26); Frost 2.1 (67); Starfall pays only for NEW stars (results.ts:32), about 0 once stars are banked. All pay the same 85 gems + 1,200 stardust (events.ts:76-83). Festival needs 45 spots but a level spawns 21.6 creatures, so it is done in about 2 levels, and Zen Garden also counts (noted in docs/handoff/05-status-and-next.md)."
  },
  {
   "issue": "Inconsistent exchange rates create arbitrage and make several prices meaningless. 'x2 stardust' costs 10 gems for the whole pending vault, about 420 stardust per gem at L30, while boosters cost 7.2-8 stardust per gem and treats about 17 stardust per gem.",
   "severity": "medium",
   "evidence": "home.ts:146-153 and offers.ts:13,55 (DOUBLE_DUST_GEMS = 10, pending about 4,200 at L30). Boosters 120/150/180 stardust versus 15/20/25 gems (config.ts:65-69). Gems can be turned into stardust (x2) and stardust into boosters (prelevel.ts:67), so the gem price of boosters is dominated, and the whole Lab (82k) is worth roughly 200 gems of x2 collections (about $1.5-2.5). This makes both the power curve and the gem sale trivially cheap."
  },
  {
   "issue": "Continue pricing plus the 'So close!' meter leans on loss aversion at the moment of failure, in a game whose audience includes children aged 6+. It is also weak monetization because daily players out-earn it.",
   "severity": "medium",
   "evidence": "game.ts:1060-1075 shows 'So close! {p}% there' at 75% or more progress next to a gem button; continue costs 40/70/110 gems (config.ts:8), about $0.29-1.36 each and $1.57-2.72 for three. Casual bots fail 36-40% of normal levels from L11 (sim.log), so frequent triggers. A daily player earns about 100 gems/day, so 40 gems is effectively free. Compliant with the non-negotiables (fixed price, no timers), but a review risk in the Kids Category."
  },
  {
   "issue": "Star Road is finite and shallow at the top, and Cosmic Pass is a one-shot sale. After about 260 stars (chapter 9-10) there is no track, and pass owners get nothing more.",
   "severity": "medium",
   "evidence": "STAR_ROAD ends at 260 stars (progression.ts:83-99); max 30 stars per chapter and decent bots average about 25, so it ends around level 90-105. Pass (config.ts:57, $4.99) pays 880 gems + 13,500 stardust + 30 boosters retroactively, so its value is fully claimable by about chapter 10 with no recurring revenue. ROADMAP/handoff list seasonal passes only as an idea."
  },
  {
   "issue": "Replay farming and uncapped inflation. Every win replay pays stardust and materials, Super Hard replays pay x3, and Challenge always pays +50 stardust. Minor today because the idle faucet dwarfs it, but it can hurt any future rebalance.",
   "severity": "low",
   "evidence": "economy.ts:83 pays (25+15*stars)*difficulty on every replay (only the +40 is first-clear); results.ts:41-49 adds material drops on every win; modes.ts:140 gives +50 stardust per Challenge play; gems are protected (3-star bonus only once, economy.ts:84). Frost and ember cannot be farmed by replay because the drop is deterministic for the same result."
  },
  {
   "issue": "Tuning is scattered and undocumented, so balance changes are risky. There are no guard-rail tests on currency flow.",
   "severity": "medium",
   "evidence": "config.ts:1 claims it holds everything you would tweak, but PIGGY_MIN (shop.ts:11), WELCOME_BACK_* and DOUBLE_DUST_GEMS (offers.ts:11-13), FINISH_DUST_PER_THROW (game.ts:110), BOSS_REWARD (results.ts:8), LAB_COST (lab.ts:12), RING_*/BUILDING costs (homeworld.ts:98-108), quest gems (progression.ts:146-175) and mode payouts (modes.ts:100-142) sit elsewhere. tests/economy.test.ts asserts individual mechanics only."
  },
  {
   "issue": "No measurement means every fix above is a guess about live behaviour. The privacy label forbids collection, but no on-device instrumentation exists either.",
   "severity": "medium",
   "evidence": "No fetch/XHR/beacon in src. PrivacyInfo.xcprivacy: NSPrivacyTracking=false, NSPrivacyCollectedDataTypes empty. profile.ts stats are global counters; no per-level, per-source or per-session data exists. Only the IAP receipts in App Store Connect and Game Center provide outside signals."
  },
  {
   "issue": "Creatures ('the characters') have no mechanical role in a round, and their economic role (2 stardust per hour per species per planet) is invisible to the player, so the 36-species collection does not feed the fun of the game.",
   "severity": "medium",
   "evidence": "planetRate uses species.length only (economy.ts:10-12); the buddy is cosmetic (buddy.ts); residents only give friendship gems (homeworld.ts:588-598) and expedition loot with a rarity multiplier of 1/1.25/1.5 (homeworld.ts:666-674); the round score is life only. Species make about 65% of measured galaxy income but the player is never shown that."
  }
 ],
 "opportunities": [
  "Add an on-device Economy Ledger, without breaking 'Data Not Collected'. Store in Profile: earn/spend totals per currency per source (level win, replay, chest, quest, calendar, event, Voyage, homeworld, IAP, continue, booster, cosmetic...), per-level {tries, fails, continues, bestStars, bestScore, throwsUsed}, per-day active flag (retention from meta.installed/lastSeen/sessions already exists), wallet snapshots at session start (stock-to-income ratio shows pile-up), feature opens and purchase-funnel steps (shop opened, gate shown, gate passed, purchase cancelled/completed). Nothing leaves the device. Expose a hidden 'Balance report' (long-press version number) with a Share-sheet export for TestFlight testers and the owner; verify against Apple's definition of 'collect' before shipping any export to a developer inbox. Use App Store Connect sales/IAP reports and Apple's opt-in App Analytics for aggregate conversion, and Game Center for score distributions.",
  "Turn the scratch models into a CI economy sim (tests/economy.sim.ts): bots play L1-100 and assert budget bands, for example 'no material below X per 10 levels', 'gem income per day within Y', 'time to exhaust power sinks is at least 21 days for a 6 level/day player', 'event tier reachable in 8-14 levels for every theme'. Run it next to the difficulty sim (83s) and fail CI on drift. Include physics (the real aim/gravity model) to close the bot-vs-human gap, then calibrate with playtests.",
  "Fix the stardust faucet: make the galaxy rate concave (for example 6 + 3*stars + 1*species only for the best N planets, or sqrt scaling), or move most idle income into the Homeworld (Mill) so it competes with buildings. Keep the vault at 4/8/12/24h. Target: active play is at least 30-40% of stardust income and the power sinks (85k) take 4-8 weeks, not 4-9 days.",
  "Give stardust a purpose beyond the Lab: (a) dust-priced expressive tier (Keeper accessories, launcher skins, planet paints at 500-5,000 dust) while keeping premium sets on gems; (b) a stardust 'Outpost/defense' economy for the Clash-style mode (troop/shot loadout unlocks, synergy tiers, walls, repair costs, so stardust is spent and lost, not just banked); (c) a prestige loop ('Remix stars' already planned) that resets Lab tiers for a permanent multiplier without a new currency; (d) retire or reprice Grove/Observatory tiers so the top tier is worth its cost.",
  "Make the Lab a synergy system instead of flat life: replace flat +life with distinct perks (for example ice + magma steam clouds, seed + storm bloom chain, sun + rock crystal), and scale star targets to the player's average Lab level (or add level 'pressure' such as wind/heavy/wobble stacks and goal-locked stars) so power progression stays a fun choice rather than a difficulty removal. Add counters that the Lab can offset: negative interactions (volcano scorch, over-flood, ice-lock) with Lab-tier resistances.",
  "Fix difficulty pacing with data: smooth the chapter-2 cliff (casual normal fail 3% to 36%) by phasing goals in over L6-L16 instead of 30% to 70% of levels; raise Hard bump so decent players fail 25-40% (they now fail 3-23%); give goal-miss failures a helper (a 'goal hint' or a booster that targets goals, such as a Goal Compass that reveals the best sector) so Lab and score boosters are not the only levers.",
  "Rebalance materials: make frost and ember reachable (frost/ember goals in about 15% of levels, twist-linked drop bonuses such as 'frozen' or 'hot' twists giving x2 of the matching material, a Voyage stop that pays frost, or a 'Frost Week' bonus), relax the strict constellation order (any two adjacent constellations open at once), and add a material sink for late game (Lab perk crafting or Homeworld decor costs), so materials do not pile up after level 40.",
  "Normalise events: derive tier thresholds per theme from measured tokens per level (target 8-14 levels, so Volcano roughly x2.4, Ocean x1.6, Frost x6, Critter x0.3, Bloom x0.55), have Starfall count 3-star replays or 'stars above target' instead of only new stars, and stop Zen Garden counting toward the festival. Consider a weekly leaderboard-free 'streak of themes' meta so weeks feel different.",
  "Re-anchor the gem exchange rates. Price 'x2 stardust' at roughly 1 gem per 100 pending stardust (or remove it), keep boosters on stardust only (or make the gem price about 2x the stardust price in a common unit), and publish an internal 'gem = N stardust' table so every offer can be compared.",
  "New kid-safe revenue that adds sinks without loot boxes, timers or ads: (1) fixed-price cosmetic bundles ('Suit + launcher + trail' sets at $1.99-4.99, previewable, Source 'iap'), (2) quarterly Seasonal Pass (8-10 weeks, 15-25 tiers, fixed price, free lane included, no FOMO reset of owned items) to replace the one-shot Cosmic Pass, (3) Homeworld theme packs (building skins, paints, ground/sea palettes) and Clash-mode 'shot skins', (4) a one-time 'Supporter' tier that adds a badge and drones, (5) expansion-style packs that add new synergy shots or biome sets. Keep the parental gate (app.ts:459), fixed prices and 'you see exactly what you get'.",
  "Give characters a role that spends and earns: make creature synergies matter in rounds (buddy or resident 'aura' perks such as +1 throw on coastal planets, cheaper Supernova charge, or biome-specific bonuses), show 'this planet makes ✨X/h thanks to N creatures' on the results screen, and let expeditions bring back materials or shot-parts so the collection loop feeds the mode that needs it.",
  "Continue/booster safety and quality: cap the 'So close!' nudge for younger profiles (or show it only after the first failure of a level), add a free 'retry with hint' path, cap paid continues per day, and keep prices fixed. Track continue usage in the ledger to check whether it is a tuning tool or a wall.",
  "Centralise tuning: create src/meta/tuning.ts (or extend config.ts) with all reward/price/cost constants, and add a test that snapshots totals (sum of Star Road, Lab, ring costs, quest yields) so any change shows up as an intentional diff in review. This also lets the sim import the exact numbers."
 ]
}
```

### Audit: Homeworld: the passive Clash-of-Clans-style base (src/meta/homeworld.ts, src/ui/

```json
{
 "area": "Homeworld: the passive Clash-of-Clans-style base (src/meta/homeworld.ts, src/ui/screens/homeworld.ts) and its tie-ins to seasons, constellations, festivals, inbox, buddy and the level loop",
 "summary": "WHAT IT IS. A separate spinning globe (not the planets you build in levels) that unlocks at campaign level 5 (homeworld.ts:109,328; entry button home.ts:134). It has 6 plots at Ring 1, growing to 8/10/12/14 at Rings 2-5 (homeworld.ts:103). Rings need a finished chapter (0/0/1/3/5/8 = levels 11/31/51/81 for rings 2-5, lines 104,440-449) and 1,500/5,000/12,000/30,000 stardust (line 105). A building's level can never exceed the ring (line 381), so at Ring 1 everything is level 1.\n\nWHAT A PLAYER CAN DO. (1) Tap an empty plot and build one of 10 things, all fixed-price and deterministic: Stardust Mill (150 dust, max 3), Critter Den (250, max 2), Greenhouse (600, Ring 2, max 2), Launch Tower (900, Ring 2, max 1), Crystal Grove (2,000, Ring 3, max 2), Observatory (2,500, Ring 3, max 1), and 4 decorations (Fountain 300, Lantern 200, Comet Flowers 400, Keeper Statue 120 gems), lines 40-95. (2) Upgrade structures to level 5 (cost multipliers 1/2.5/6/14/30, line 101). Each upgrade needs a drone (2 drones, 3 with the $4.99 Cosmic Pass, line 338) and takes 30s/5m/30m/2h/4h (line 100), which is 6.6 drone-hours per structure and about 72 drone-hours for all 11 structures. No gem skip exists; each campaign win takes 10 minutes off every active build (line 108; results.ts:65-69). (3) Tap a ready producer to collect it. (4) Move a building to any empty plot, free and instant (line 430). (5) Clear meteor rocks that fall on empty plots every 3h, up to 3, for +60 dust and no penalty (lines 704-729). (6) Open the Residents sheet (homeworld.ts UI 787-923), Expedition sheet (925-1023), Expand sheet (1069-1102), Paint sheet (1105-1144), Photo mode with share frames (1146-1267), and Star Atlas link (586).\n\nWHAT IT PRODUCES. Only three raw yields, all capped, and nothing is refined or consumed inside the base. Mills make 40/70/110/160/230 dust per hour. Greenhouses make one booster (shower/spark/scope on a fixed cycle the player cannot choose) every 6/5/4/3.5/3 hours. Groves make one gem every 6/5/4/3/2.5 hours (lines 465-469, 496, 516-517). Producers hold 6 hours, or up to 16 hours with a level-5 Observatory (lines 470-475). The design intent is 2-3 check-ins a day (lines 7-8). Residents: any Lifebook creature you have seen can move into a Den for free (invite, line 567). Den room is level+1 per den, so at most 12 residents of the 36 species. Each resident gets one deterministic request per 6-hour period (lines 608-627): 40% treat (70-190 dust), 35% pat (free), 25% a nearby decoration. A request gives 1-2 friendship points plus floor(charm/4). Friendship levels come at 3/8/15/25 points and pay 10/15/20/25 gems (70 gems per creature, once) plus a memento at level 5 (lines 544, 588-598). Expeditions are one at a time, from one Tower: 1h/4h/8h unlock at Tower level 1/2/3. They pay hours x 120 x (1 + 0.1 x towerLv) dust, times 1.25 for rare or 1.5 for legendary creatures. The 4h run adds 2 gems and a spark; the 8h run adds 6 gems and one of each booster (lines 654-701). The destination is a random planet from your own galaxy, used only for the postcard picture (line 680).\n\nWHAT IT COSTS. Maxing everything is about 511k dust of structures, 48.5k for rings, 2.4k of decorations and 120 gems, roughly 562k dust (computed from BUILDINGS, COST_K and RING_COST with a scratch script). By comparison the Object Lab is 69.6k for all six shots (lab.ts:12) and the permanent upgrades total about 15.9k (config.ts:73-98).\n\nHOW IT CONNECTS TO THE LEVEL LOOP (thin and mostly one-way). Levels to Homeworld: wins speed builds up by 10 minutes; discovered creatures become invite candidates; finished chapters unlock rings; level drops feed Star Atlas materials, and relit constellations are drawn in the Homeworld sky (UI 257-266); festival costumes appear on residents (UI 141-143). Homeworld to levels: only the Greenhouse and 4h/8h expedition boosters feed the pre-level booster row (prelevel.ts:49-77), and dust and gems flow into the same Lab, upgrades and continue purchases that galaxy dust already funds. Nothing on the Homeworld reaches the level scene: sceneOpts (app.ts:337-397) passes lab, upgrades, boosters, skin, buddy and festival costume, but no Homeworld stat. The buddy that cheers in levels is cosmetic and is picked from sightings, not from residents (buddy.ts, game.ts:1548).\n\nWHY IT FEELS SO SIMPLE / \"WHAT IS THE POINT\". (a) It is a closed loop. Mills make dust to build mills, rings and decorations, and the only outward sinks (Lab, boosters, vault) are the ones the existing galaxy vault already feeds. (b) It has no verbs beyond tap-to-collect and tap-to-build, and no decisions. Everything gets built eventually, layout has no effect, and nothing can go wrong. (c) It has no goals. There are no Homeworld quests, achievements or Explorer Rank goals (the QuestEvent list has no home event, progression.ts:133; the 27 Game Center achievements have none), and the only milestone is Ring 5. (d) Residents are pets: no traits, roles or stats, even though the game has 36 species with rarity and biome recipes (world.ts:240-250). (e) It shares no nouns with the core game. The six shots, 17 biomes and combo/goal skill loop never appear in it, so the fun of flinging never gets stronger from base play. (f) Growth is barely visible: the globe radius grows with ring (UI 233), structures scale by 0.82 + 0.06 x level with a pennant (structures.ts:52), and no power number appears on the Passport, home screen or any leaderboard. (g) Seasons, day/night, constellations and festival costumes are decoration only. (h) It is finite while the campaign is endless: Ring 5 and level-5 buildings are the end.\n\nAudit basis: I read the two files in full, plus results.ts, economy.ts, config.ts, lab.ts, constellations.ts, seasons.ts, visitors.ts, inbox.ts, buddy.ts, rank.ts, stickers.ts, platform.ts, offers.ts, home.ts, app.ts sceneOpts, structures.ts, tests/homeworld.test.ts and ROADMAP.md. No repo files were modified.",
 "systems": [
  {
   "name": "Buildings, plots and drones (build/upgrade/move)",
   "howItWorks": "10 building types on radial plots. Decorations are placed instantly with no drone. Structures need one of 2 drones (3 with the Cosmic Pass) and finish after 30s/5m/30m/2h/4h per level. Building level is capped by ring. Upgrading banks the current production, then pauses the producer until the timer ends. While upgrading, dens, towers and observatories keep working at the previous level (effLevel). Move is free and instant, so plot position has no gameplay meaning and there is no adjacency, zoning or synergy. At Ring 5 there are 14 plots for 11 structures plus 9 decorations, which forces some choice but no interaction between buildings. Tapping a plot with output auto-collects it.",
   "depth": 3,
   "files": [
    "src/meta/homeworld.ts:40-109",
    "src/meta/homeworld.ts:333-435",
    "src/ui/screens/homeworld.ts:193-220",
    "src/ui/screens/homeworld.ts:590-728"
   ]
  },
  {
   "name": "Rings / expansion",
   "howItWorks": "Five rings with 6/8/10/12/14 plots. Ring N needs chapter RING_CHAPTER[N] finished (0,0,1,3,5,8 chapters) and RING_COST dust (1.5k/5k/12k/30k). Ring also gates the highest building level and which buildings exist (Ring 2: Greenhouse, Tower, Flowers; Ring 3: Grove, Observatory). Ring 5 is the end state, reached around level 81. The Expand sheet lists new plots, level cap, new buildings and the chapter requirement.",
   "depth": 2,
   "files": [
    "src/meta/homeworld.ts:102-106",
    "src/meta/homeworld.ts:437-458",
    "src/ui/screens/homeworld.ts:1069-1102"
   ]
  },
  {
   "name": "Producers, caps and the Observatory",
   "howItWorks": "Mill = dust, Greenhouse = boosters, Grove = gems, each on a per-hour rate table by level. Output accrues from the building's `since` timestamp up to a cap of 6h (+2h per Observatory level, max 16h). collect() pays whole units and carries the fractional remainder. The greenhouse booster type comes from a deterministic cycle keyed on since-hour + plot + index, so the player cannot pick which booster they get. Three mills at level 5 give 690 dust/h. Two groves at level 5 give roughly 19 gems/day if collected each cap. Two greenhouses at level 5 with a level-5 Observatory yield about 10 boosters per 16h collect.",
   "depth": 2,
   "files": [
    "src/meta/homeworld.ts:460-541",
    "src/ui/screens/homeworld.ts:181-191",
    "src/ui/screens/homeworld.ts:655-674"
   ]
  },
  {
   "name": "Residents, Critter Den, friendship and requests",
   "howItWorks": "A Den houses level+1 creatures (max 2 dens, 12 residents). Any species in the Lifebook can be invited for free, including legendaries; sending one home preserves its friendship. Each resident has one deterministic request per 6h period (treat/pat/decor). Fulfilling gives 2 fp for a treat, else 1, plus floor(charm/4) (max charm 17 gives +4). Friendship levels at 3/8/15/25 fp pay 5 x level gems once, and level 5 gives a memento (feeds Explorer Rank goals and the memento_10 achievement). The inbox adds a 25-gem best-friend letter per species. Lifetime gems per species are about 95, so up to about 3,420 across 36 species. Nicknames come from a kid-safe list and accessories come from friendship, gems (40) or festivals. The species' rarity only matters as a 1.25x/1.5x expedition multiplier.",
   "depth": 2,
   "files": [
    "src/meta/homeworld.ts:111-225",
    "src/meta/homeworld.ts:543-651",
    "src/ui/screens/homeworld.ts:787-923",
    "src/meta/inbox.ts:75-90",
    "src/meta/inbox.ts:185-196"
   ]
  },
  {
   "name": "Launch Tower and Expeditions",
   "howItWorks": "One Tower (max 1), one expedition at a time. The Tower's level unlocks 1h/4h/8h runs. The player picks a resident and a duration, and loot is a formula: dust = hours x 120 x (1+0.1 x towerLv) x rarity, plus gems and boosters at 4h and 8h. An 8h run at Tower 5 gives about 1,440 dust, 6 gems and 3 boosters. That is roughly 66 gem-equivalents when boosters are priced at the shop's 15-25 gems each. On return the player sees a shareable postcard 'Greetings from <galaxy planet>'. The destination is a random galaxy planet and only decorates the postcard. There is no choice, risk or outcome variance, and friendship is +2/+2/+3.",
   "depth": 2,
   "files": [
    "src/meta/homeworld.ts:227-233",
    "src/meta/homeworld.ts:653-701",
    "src/ui/screens/homeworld.ts:925-1067"
   ]
  },
  {
   "name": "Meteor debris (the 'defence' stand-in)",
   "howItWorks": "Every 3h (catch-up loop while away), a rock falls on a random empty plot, capped at 3 outstanding. A rock blocks building on that plot until tapped, which pays 60 dust. Buildings are never hit and nothing is lost by ignoring rocks, so it is a chore with no stakes. Debris cannot appear once all plots are built.",
   "depth": 1,
   "files": [
    "src/meta/homeworld.ts:703-729",
    "src/ui/screens/homeworld.ts:204-215",
    "src/ui/screens/homeworld.ts:587-589"
   ]
  },
  {
   "name": "Charm and decorations",
   "howItWorks": "Fountain(2), Lantern(1), Comet Flowers(2), Keeper Statue(4, costs 120 gems) add charm. Charm's only effect is +1 friendship point per 4 charm on request fulfilment. Residents can also ask for a specific decoration. Decorations need no drone and are placed instantly. There is no placement freedom beyond the 6-14 fixed radial plots.",
   "depth": 1,
   "files": [
    "src/meta/homeworld.ts:54-94",
    "src/meta/homeworld.ts:553-555",
    "src/meta/homeworld.ts:645"
   ]
  },
  {
   "name": "Level-loop linkage (both directions)",
   "howItWorks": "To Homeworld: unlock at planet 5; each campaign win (not the competitive modes) subtracts 10 minutes from every in-progress build, which only matters for level-3+ upgrades (30m, 2h, 4h; levels 1-2 finish in 30s/5m anyway); chapters gate rings; discoveries gate invites; drops feed the sky. From Homeworld: booster stock and dust/gems only. No Homeworld stat is passed to LevelScene. Homeworld collection also does not fire the 'collect' quest event (only galaxy collectDust does) and is absent from the welcome-back flow.",
   "depth": 1,
   "files": [
    "src/ui/flows/results.ts:65-69",
    "src/meta/homeworld.ts:412-422",
    "src/ui/app.ts:337-397",
    "src/ui/flows/prelevel.ts:49-77",
    "src/meta/economy.ts:37-44",
    "src/ui/flows/offers.ts:43-83"
   ]
  },
  {
   "name": "Cosmetic and expressive layer (paint, accessories, nicknames, photo, postcards)",
   "howItWorks": "12 paints (some free, 60-150 gems, 2 pass-only), 16 resident accessories (4 friendship, 2 at 40 gems, 10 festival-only), 32 nicknames, Photo mode with 5 frames (Golden is pass-only) and a shareable expedition postcard. This is the best-executed part of the screen and the only current Homeworld revenue surface (gem paints and accessories, plus pass gold items).",
   "depth": 2,
   "files": [
    "src/meta/homeworld.ts:134-223",
    "src/meta/homeworld.ts:257-309",
    "src/ui/screens/homeworld.ts:1105-1325"
   ]
  },
  {
   "name": "Ambient tie-ins: seasons, day/night, constellations, festivals, inbox, buddy",
   "howItWorks": "The canvas draws a sun or moon from the device clock, seasonal particles, meteor streaks at night, and relit constellations from Star Atlas in fixed sky slots. Residents without an accessory wear the month's festival costume. Inbox sends a Homeworld welcome letter (300 dust), a first-resident letter, and a best-friend letter with 25 gems. Buddy reuses resident accessories in levels. All of this is presentation. It changes no production, requests, costs or level stats.",
   "depth": 1,
   "files": [
    "src/ui/screens/homeworld.ts:257-306",
    "src/ui/screens/homeworld.ts:405",
    "src/meta/seasons.ts",
    "src/meta/constellations.ts:33-52",
    "src/meta/inbox.ts:51-59",
    "src/meta/buddy.ts",
    "src/ui/flows/festival.ts"
   ]
  },
  {
   "name": "Presentation and interaction (canvas globe + bottom panel)",
   "howItWorks": "Drag to spin, tap a plot. The globe is drawn per frame with residents wandering, the Keeper strolling, idle drones orbiting, ready bubbles, floating text and particles. The bottom panel switches between an overview (stats, Collect all, Residents, Expedition, Expand, Paint, Photo, Star Atlas), an empty-plot build menu, and a building detail. The panel re-renders on a state signature each second. This is polished and readable but has no income-per-hour summary, no 'next goal' surface, and only a 4-line welcome modal.",
   "depth": 3,
   "files": [
    "src/ui/screens/homeworld.ts:145-784"
   ]
  },
  {
   "name": "Retention and progression hooks around the Homeworld",
   "howItWorks": "A home-screen badge counts ready producers, finished builds, returned expedition, waiting requests and debris. That is the only prompt. Local notifications cover only the galaxy vault and the daily gift. There are no Homeworld quests, achievements, Explorer Rank goals or Game Center boards. The only hard-coded milestone is the 'Worldbuilder' sticker at Ring 5, and Passport shows no Homeworld stat.",
   "depth": 1,
   "files": [
    "src/meta/homeworld.ts:731-743",
    "src/ui/screens/home.ts:134",
    "src/ui/platform.ts:26-56",
    "src/meta/progression.ts:133",
    "src/meta/stickers.ts:45",
    "src/meta/passport.ts:208"
   ]
  },
  {
   "name": "Monetisation touchpoints",
   "howItWorks": "Gem-priced paints (60-150), two accessories (40 each), Keeper Statue (120 gems). Cosmic Pass ($4.99) adds a third drone, two gold paints and a gold photo frame. There are no timer skips (by design), and every purchase goes through app.buy with its parental gate. Meanwhile the base is a net faucet of free value (grove gems, expedition gems and boosters, friendship gems), and that faucet is not modelled against the gem packs.",
   "depth": 1,
   "files": [
    "src/meta/homeworld.ts:268-281",
    "src/meta/homeworld.ts:135-153",
    "src/meta/homeworld.ts:338-340",
    "src/ui/screens/pass.ts:100",
    "src/meta/config.ts:26-58"
   ]
  }
 ],
 "gaps": [
  "PURPOSE OF PRODUCTION: dust is produced to buy more dust producers, rings and decorations. There is no in-base consumer (no feeding, crafting, recipes, refinement, upkeep or storage-versus-spend tension). Star Atlas materials (stone/dew/leaf/ember/frost) are never used by any Homeworld building.",
  "RESOURCE CHAINS: only three raw yields (dust, booster, gem) with no conversion or dependency between buildings. Nothing needs the output of another building, so there is no supply chain and no bottleneck to solve.",
  "GATING BEYOND NUMBERS: the only real gates are ring (chapter + dust) and drones. There is no tech tree, no prerequisite buildings, and no gate tied to the game's own content (Lifebook habitats, biome discoveries, boss defeats, Lab levels, hard-planet wins). The Habitat sets in habitats.ts could gate buildings but are unused here.",
  "BUILDING EFFECTS ON PLAY: no building alters a shot, a land transformation, throws, score or star thresholds. The six shots (rock, ice, seed, magma, storm, sun), 17 biomes and 36 species are absent from the base's rules, so it does not deepen the core game.",
  "SYNERGIES AND NEGATIVE INTERACTIONS: no adjacency bonuses, no element pairing (heat vs cold, wet vs dry), no resident-to-building matching, and no penalties (blocked, cooled or slowed buildings). Layout is meaningless because moveBuilding is free and instant (homeworld.ts:430) and all plots are equal.",
  "DEFENDING / THREATS: nothing can go wrong. Debris only blocks a plot and pays 60 dust when tapped (lines 704-729). There is no timed hazard, damage/repair state, or skill-based defence that could reuse the aiming mechanic.",
  "ATTACKING / PVE OBJECTIVES: no expeditions-as-missions, base-versus-boss encounters, or challenges launched from the base. Comet Guardians live only in the level loop and are unconnected to the Homeworld.",
  "UNITS / ARMY EQUIVALENT: residents are not deployable units. They have no stats, roles, traits or upgrade path beyond 5 heart levels, and species rarity is used only as an expedition dust multiplier. Any seen creature can move in for free with no habitat requirement.",
  "VISIBLE POWER GROWTH: no Homeworld level, prosperity or power score, no skyline or building tier evolution beyond scale 0.82 + 0.06 x level and a pennant (structures.ts:52), no planet growth beyond ring 5, and no before/after view. It appears nowhere on Passport, Star Map or home screen except the Ring 5 sticker.",
  "GOALS, QUESTS AND ACHIEVEMENTS: no Homeworld quest type, no build-order or story chain, no Homeworld achievements (0 of 27 Game Center ones), and no Explorer Rank goals other than mementos. The 4-line intro is the only guidance.",
  "LIVE-OPS INTEGRATION: weekly event, festival (costumes only), Weekly Voyage and the meteor-shower calendar do not touch production, buildings or requests. There are no seasonal buildings, limited-time crops or Homeworld event track. Season and day/night are cosmetic only.",
  "SOCIAL: nothing. No visiting or viewing another player's Homeworld (not even a share-code snapshot like the existing challenge codes in modes.ts), no gifting or cheering, no cooperative or community goal (which could be date-seeded with no server), and no leaderboard. The only outward features are shareable photos and postcards.",
  "ENDGAME / PRESTIGE: finite (Ring 5, level-5 buildings, 36 species) while the campaign is endless. No Ring 6+, orbital layer, remix/prestige, collections or seasonal reset gives long-term purpose.",
  "PASSIVE-ENGINE CONSOLIDATION: two parallel offline dust engines (galaxy vault 4-24h cap, planetRate = 6 + 3 x stars + 2 x species per planet; Homeworld mills 6-16h cap) are collected on different screens. Only the galaxy one has a gem double and quest/welcome-back integration.",
  "RE-ENGAGEMENT: no push reminder for producers full, builds done or expedition back (platform.ts:26-56 only schedules vault and daily gift). The 6h cap plus one request per 6h period are the only pacing levers.",
  "ONBOARDING / INFORMATION ARCHITECTURE: no guided first build, no 'what to do next' panel, no per-hour income or time-to-full summary, no Homeworld progress screen or checklist, and no explanation of why the base matters.",
  "REVENUE HOOKS (kid-safe): no fixed-price, previewable Homeworld content packs (building skins or architecture themes, decor sets, seasonal dressing), no Homeworld cosmetic lane in the Pass, and no themed bundles. The current gem-priced paints and accessories are the entire surface.",
  "ECONOMY MODELLING: no tests or sim for Homeworld faucets versus sinks or versus IAP. tests/homeworld.test.ts covers rules only, not balance. Free gems (about 3.4k lifetime from residents, groves, expeditions) and boosters are not priced against the gem packs or the continue costs (40/70/110).",
  "SPECIES / HABITAT TIE-IN: residents ignore biome recipes, rarity, Lifebook habitat sets and sightings, so collecting creatures in levels has no interesting counterpart in the base beyond a free room slot."
 ],
 "painPoints": [
  {
   "issue": "No purpose or goal structure: nothing tells the player why the Homeworld matters, and nothing rewards progress in it beyond more of the same currencies.",
   "severity": "high",
   "evidence": "Only onboarding is a 4-line modal (src/ui/screens/homeworld.ts:769-783). QuestEvent has no home event (src/meta/progression.ts:133). Homeworld code never calls track(). None of the 27 Game Center achievements (store/gamecenter.md) or Explorer Rank hand goals (src/meta/rank.ts:37-47, except mementos) mention it. The only milestone is the Ring 5 sticker (src/meta/stickers.ts:45)."
  },
  {
   "issue": "Closed economic loop: production feeds construction of more production. The outward sinks (Object Lab, boosters, vault upgrades) are already funded by galaxy stardust, so the base is just a faster faucet, not a new reason to play.",
   "severity": "high",
   "evidence": "Mill/Greenhouse/Grove yield dust/boosters/gems (src/meta/homeworld.ts:462-469). Max build-out is about 562k dust versus 69.6k for the Lab (src/meta/lab.ts:12) and about 15.9k for upgrades (src/meta/config.ts:73-98). Three level-5 mills make 690 dust/h, about equal to 30 three-star galaxy planets (630/h via planetRate, src/meta/economy.ts:10-12), and one mill collect (up to 3,680) is worth about 33 level wins (110 dust per first 3-star clear, economy.ts:83)."
  },
  {
   "issue": "Homeworld is disconnected from the skill loop: no building, resident or ring changes a shot, land transformation, throw count, score or star threshold.",
   "severity": "high",
   "evidence": "sceneOpts passes lab, upgrades, boosters, skin, buddy and festival costume but no Homeworld field (src/ui/app.ts:337-397). The only outputs that reach a level are Greenhouse/expedition boosters and dust/gems via prelevel.ts:49-77. The 10-minute win speed-up (src/ui/flows/results.ts:65-69, homeworld.ts:108) helps the base, not the level."
  },
  {
   "issue": "Residents are cosmetic pets with no gameplay identity: free to invite, any seen species (legendaries included), no traits, roles or habitat needs, and identical behaviour across 36 species.",
   "severity": "high",
   "evidence": "invite() only checks seen + room (src/meta/homeworld.ts:567-575). Species rarity/biome recipes (src/core/world.ts:240-250) are used only for a 1.25x/1.5x expedition dust bonus (homeworld.ts:666-669). Requests are generic treat/pat/decor (lines 617-627). Buddy is chosen from sightings, not residents (src/meta/buddy.ts:14-16)."
  },
  {
   "issue": "No stakes or meaningful decisions: nothing can fail or be lost, all buildings get built eventually, layout does not matter, and no choice has a trade-off that changes outcomes.",
   "severity": "high",
   "evidence": "Debris is harmless and caps at 3 (homeworld.ts:704-729). moveBuilding is free and instant (line 430). Caps only idle production (line 470). Expedition outcome is a formula with one choice, duration (lines 666-674). Upgrades are strictly beneficial, so all 11 structures get maxed (about 72 drone-hours)."
  },
  {
   "issue": "Early Homeworld is a dead end: at Ring 1 everything is level 1 (level N needs ring N), so between planet 5 and the first ring expansion (chapter 1 finished = planet 11 plus 1,500 dust) the player only places 30-second level-1 builds and waits.",
   "severity": "medium",
   "evidence": "canUpgrade rejects with 'ring' when b.lv+1 > ring (src/meta/homeworld.ts:381). HOME_UNLOCK_LEVEL = 5 (line 109). RING_CHAPTER[2] = 1 and RING_COST[2] = 1500 (lines 104-105). Ring 1 offers only mill/den/fountain/lantern/statue (lines 41-42, 54-94)."
  },
  {
   "issue": "Two overlapping offline dust engines with inconsistent integration: the galaxy vault has a home-screen Collect button, a gems-for-double option, a 'collect' quest and welcome-back handling. The Homeworld's mills have none of these.",
   "severity": "medium",
   "evidence": "collectDust fires track('collect') (src/meta/economy.ts:37-44) but Homeworld collect() does not (src/meta/homeworld.ts:505-526). The x2-for-gems button is home.ts:147-157. The welcome-back flow reports only galaxyRate (src/ui/flows/offers.ts:43-83). Quest 'Collect stardust N times' (progression.ts:153) ignores the base."
  },
  {
   "issue": "Free-value faucets are unmodelled against monetisation: expeditions, groves and friendship pay gems and boosters, which are the same goods sold (gem packs) and used to unblock hard levels (continues 40/70/110 gems, boosters 15-25 gems each).",
   "severity": "medium",
   "evidence": "8h expedition at Tower 5 pays 6 gems + shower/spark/scope (src/meta/homeworld.ts:671-673), roughly 66 gem-equivalents at BOOSTERS prices (src/meta/config.ts:65-69). Greenhouse x2 at level 5 with a level-5 Observatory gives about 10 boosters per 16h collect (lines 465-475). Friendship pays 70 gems per species plus 25 from the inbox letter (homeworld.ts:588-598, inbox.ts:75-90), about 3.4k lifetime. Max charm (17, +4 fp/request, lines 553, 645) shortens the friendship track to roughly a day per creature. No sim or test covers this."
  },
  {
   "issue": "Cosmic Pass sells the third build drone, a permanent 50% build-parallelism advantage; that sits uneasily with the 'no pay-to-skip timers' non-negotiable and needs an explicit owner decision.",
   "severity": "medium",
   "evidence": "drones(p) returns p.pass ? 3 : 2 (src/meta/homeworld.ts:338-340), advertised in src/ui/screens/pass.ts:100. Decor is exempt from drone limits (line 360)."
  },
  {
   "issue": "Weak visible power growth: no Homeworld level or prosperity metric, buildings look almost the same across levels, and it is absent from Passport, home screen and leaderboards, so effort is invisible to the player and to friends.",
   "severity": "medium",
   "evidence": "Structure scale k = 0.82 + lv x 0.06 plus a pennant (src/ui/art/structures.ts:52,70). Globe radius = 0.2 + ring x 0.028 (src/ui/screens/homeworld.ts:233). Passport stats list only mementos (src/meta/passport.ts:208). The only reference outside the screen is the Ring 5 sticker and photo caption 'Ring N' (stickers.ts:45, UI 1210)."
  },
  {
   "issue": "Expeditions and requests read as timers and chores rather than play: single tower, single expedition, no destination choice, decorative planet; one request per resident per 6h that can be unfulfillable (treat unaffordable, decoration not built) yet still lights the home badge.",
   "severity": "medium",
   "evidence": "Tower max 1 and one h.expedition slot (src/meta/homeworld.ts:44,239,678). Destination is a random galaxy planet for the postcard only (line 680). homeBadge counts requestsWaiting regardless of feasibility (lines 649-651,740). Decor request blocks with 'Build a {name} first' (UI 811)."
  },
  {
   "issue": "Seasons, day/night, constellations and festival costumes are ornamental, so the richest recent content (rounds 3-6) does not influence Homeworld play or revenue.",
   "severity": "medium",
   "evidence": "Sky slots and constellation drawing (src/ui/screens/homeworld.ts:127-135,257-266), day/night (275-304), season overlay (405) change no production, request or cost. Materials are consumed only by Star Atlas bundles (src/meta/constellations.ts:227-242). Festival costume is applied at draw time only (UI 141-143,381)."
  },
  {
   "issue": "No re-engagement outside the app: notifications cover the galaxy vault and daily gift only, so completed builds, full producers and returned expeditions have no return trigger; with 6h caps a player who checks twice a day forfeits much of the potential yield.",
   "severity": "medium",
   "evidence": "scheduleReminders schedules ID_VAULT and ID_GIFT only (src/ui/platform.ts:26-56). Caps: 6h base to 16h (src/meta/homeworld.ts:470-475). The design note (lines 7-8) targets 2-3 check-ins a day."
  },
  {
   "issue": "Timers are not authoritative: there is no server, and clock changes are handled only for the galaxy vault, not for Homeworld state. Moving the clock forward finishes builds and fills producers. Moving it backward freezes producers and builds until real time catches up.",
   "severity": "low",
   "evidence": "fixClock patches only p.lastCollect (src/meta/economy.ts:23-25). Building.since/done and Expedition.ends have no guard (src/meta/homeworld.ts:111-118,227-233,483-488)."
  },
  {
   "issue": "Greenhouse output type is a hidden pseudo-random cycle, so the player cannot choose which booster they get.",
   "severity": "low",
   "evidence": "BOOSTER_CYCLE index = (floor(since/H) + plot + i) % 3 (src/meta/homeworld.ts:496,516-517). It is deterministic and free, so it does not break the no-random-paid-rewards rule, but it reads as arbitrary."
  },
  {
   "issue": "Dead field and small correctness smells in the module.",
   "severity": "low",
   "evidence": "HomeState.started is written (src/meta/homeworld.ts:244,320) and never read anywhere in src. ready()/isFull()/collect() accept a `now` argument but call capHours(h) without it, so the Observatory level is evaluated at Date.now() (lines 485,492,523), which is harmless in production but makes time-travel tests inaccurate."
  }
 ],
 "opportunities": [
  "GIVE THE BASE A RULE THAT TOUCHES THE FLING (highest impact, medium effort): one Homeworld building per shot (Quarry=rock, Reservoir=ice, Nursery=seed, Forge=magma, Weather Station=storm, Solar Array=sun). Each building level adds a small persistent, non-competitive stat to that shot (impact size, splash, Supernova charge, life per creature), stacking with Object Lab perks (lab.ts) and gated off in Daily, Rush and Challenge using the existing `competitive` flag (app.ts:390). This makes Homeworld dust and time convert into visible fling power.",
  "ADD SYNERGIES AND NEGATIVE INTERACTIONS ON THE RING: adjacent plots (i+-1, already computable from plotAngle) trigger pairings that reuse level-loop combo logic. Examples: Forge next to Reservoir produces Steam (bonus to storm), Nursery next to Solar Array grows faster, while Forge next to Nursery scorches (output halved). Position finally matters; keep moves free and previewable so kids can experiment, and show effects as tooltips before placing.",
  "GIVE RESIDENTS JOBS, USING THE 36 SPECIES: assign a resident to a building as its specialist. A species whose biome recipe (SpeciesDef.home) matches the building's element gives a bonus, and rarity scales it. Habitat sets (habitats.ts) could unlock new buildings, connecting Lifebook discovery to base power. Some residents dislike neighbours, an optional gentle negative interaction that still cannot destroy anything.",
  "MAKE THE LOOP BIDIRECTIONAL AND VISIBLE: (a) after a win, show the Homeworld dividend ('Forge +2 life on Magma this level'); (b) let levels feed the base beyond the 10-minute nudge, e.g. level goals such as 'grow 4 seas' fill a Homeworld 'commission' bar; (c) show a Homeworld Prosperity/Power number on the home screen, Passport and Star Map so growth is legible.",
  "ADD A GOAL LAYER: a Homeworld quest chain and 'Mission Control commissions' delivered by the existing Inbox (letters with build-order objectives and gifts), Homeworld daily quests including a fix so Homeworld collects count toward the 'collect' quest, Homeworld achievements and Game Center entries (the 27-achievement cap in store/gamecenter.md needs a test update), and Explorer Rank goals (Ring, Prosperity, best friends).",
  "ADD SKILL-BASED DEFENCE, NOT RAIDS: a short 'Meteor Watch' round that reuses the aiming and physics scene, where the player flings deflectors at incoming meteors to protect the Homeworld before they land. Success gives a bonus; a miss only pauses (never destroys) an affected building until repaired with dust, which reuses the debris hook. It stays single-player, kid-safe and 1-2 minutes, and keeps the base tied to the core skill.",
  "UPGRADE EXPEDITIONS INTO DECISIONS: choose a destination from your own galaxy planets, where the planet's actual biomes and species decide the loot theme (e.g. a Seaside planet returns 'dew' materials for Star Atlas), so the levels you beat matter. Add a second tower or slot via the Tower's level (earned, not sold), and paired-resident teams with complementary species. Offer a 'safe' vs 'bold' choice without randomness. Use planet echoes so the postcard tells a story.",
  "MERGE THE PASSIVE ENGINES: treat galaxy planets as outposts collected by the Homeworld; one 'Collect all' on the home screen; count Homeworld collects toward the 'collect' quest; add Homeworld output to the welcome-back flow; and re-price the galaxy x2-for-gems option to cover both. This removes the confusion of two competing dust counters.",
  "VISIBLE GROWTH AND ENDGAME: building visuals with real tier changes (hut to tower), a skyline and lit windows at night, ring 6+ 'orbit' layers, and a Homeworld Season (monthly reset of a cosmetic-only ladder built on festivals.ts and the Cosmic Pass infrastructure) so the base is not finished at Ring 5, mirroring the endless campaign and the Remix idea.",
  "LIGHT SOCIAL WITHOUT A SERVER: shareable Homeworld codes (like encodeChallenge in modes.ts) so a friend can open a read-only snapshot and leave a free cheer or gift; a Game Center leaderboard for Prosperity; and a date-seeded community goal ('everyone's Nurseries this week') whose totals are only a local target. Keep everything opt-in and without free text.",
  "KID-SAFE REVENUE ATTACHED TO THE BASE: fixed-price, previewable cosmetic sets that do not change stats: building skin themes (Crystal, Candy, Frost architecture), decoration and paint sets, a seasonal cosmetic lane, a Homeworld photo/postcard frame pack. All parental-gated in app.buy and shown on the actual Homeworld before purchase. Avoid selling drones, extra slots, timer skips or power. Also make the owner decision on the Pass's third drone (keep, or convert it into cosmetics plus convenience such as a Collect-all queue).",
  "BALANCE THE FREE FAUCETS BEFORE ADDING POWER: build a Homeworld economy simulator (like `npm run sim`) covering mills/greenhouses/groves/expeditions/friendship against Lab, boosters, continues and gem packs. Cap or taper booster output when stock is high, fix the friendship-charm scaling (+4 fp/request at charm 17), and make sure new stat buildings cannot make campaign levels trivial, which would remove the reason to buy boosters or continues.",
  "RETENTION AND ONBOARDING: a guided first hour (highlight plot, first build, first resident, first expedition), a 'next goal' card in the overview panel with income/hour and time-to-full, an opt-in single daily notification bundling 'builds done / expedition back / producers full' that respects the existing 'no more than once a day, never at night' promise (platform.ts:69), and a Homeworld progress screen.",
  "HOUSEKEEPING: remove HomeState.started; pass `now` through capHours in ready/isFull/collect; extend fixClock-style guards to Building.since/done and Expedition.ends; make the badge count only fulfillable requests; let the player choose the booster type a Greenhouse grows (a free, non-random choice); add i18n entries in es/fr/de/pt-BR/ja for every new string (CI enforces this)."
 ]
}
```

### Audit: UX journeys and QA walkthrough: first session, mid-game navigation, and the mome

```json
{
 "area": "UX journeys and QA walkthrough: first session, mid-game navigation, and the moment-to-moment \"why am I doing this\" (Playwright, iPhone 14 viewport 390x664 and 320x568, dev server 127.0.0.1:5173). Screenshots: /tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/",
 "summary": "I walked the real app on a fresh profile and on a mid-game profile (level 24, 500 gems, 5000 dust, plus 23 synthetic finished planets and 15 creatures so the galaxy is not empty). 77 screenshots are in the scope directory. TODAY'S JOURNEY: a new install skips any title or story and drops straight into Planet 1 (app.ts:150). That is a hollow donut planet with a lava core, a pull-back launcher, 6 throws and a green \"life\" bar with 3 star marks (targets 65/95/120). Coach text exists only for levels 1-3 (coach.ts:3-16). A win shows \"Planet added to your galaxy\" with stardust, gems and creature counts plus one muted sentence, \"It now makes 19/hour for you, even while you're away\" (results.ts:88). That sentence is the only place the purpose of stardust is stated. Levels 1-2 skip the pre-level sheet. From level 3 every level is Play, then a pre-level sheet (targets, goals, 6 objects, 3 boosters), then Launch. The first arrival on Home is covered by a full-screen 28-day Star Calendar login grid (flows/daily.ts:40), and the next Home visit by a Passport naming popup (home.ts:187-192). Home is a hub of about 21 tap targets: settings, avatar, two currency pills, season and festival chips, 4 to 9 side buttons stacked over the galaxy canvas, Collect (+x2), a big Play button, and 4 bottom tabs (Star Map, Lifebook, Upgrades, Shop) with badges. Around it are modals (Quests, Rank, Inbox, Modes, Event, Festival) and full screens (Star Map, Star Road and Cosmic Pass, Homeworld, Voyage, Lifebook, Sticker Album, Upgrades, Shop, Passport, Workshop, Star Atlas). Every Back button returns to Home, not to the parent screen (app.ts:311; verified Album to Home and Workshop to Home). MOMENT-TO-MOMENT: the player chooses an angle and optionally swaps between only the current and next object. Each landing changes land and creatures pop in (the \"NEW CREATURE +3 gems\" card and Supernova ring are good feedback). The only stated objective is filling a \"life\" number past star marks before throws run out. Creatures and the Keeper have no role in a throw beyond adding life points. Stardust is a passive idle income from finished planets (6 + 3*stars + 2*species per hour each, economy.ts:10-12) that buys flat stat upgrades, so a new player never gets a felt answer to \"what is all this for\". Positives verified: parental gate appears on purchase (a 7x8 multiplication quiz), all prices are fixed and shown, no ads or energy timers, de/fr/ja home screens at 320px show no text overflow, the Lifebook silhouettes with \"Lives in Meadow\" hints are a strong pull, and level pacing is about 1 minute. Test limits: Chromium not WebKit, no audio or haptics, mid-game profile is synthetic (Passport shows 0 objects flung), and 390x664 is shorter than a real iPhone 14 (844), so vertical crowding is somewhat worse than on device. 320x568 is a genuine SE-1 size.",
 "systems": [
  {
   "name": "First-run onboarding (L1 and L2)",
   "howItWorks": "Fresh profile boots straight into a tutorial Planet 1 with no title, story or permission framing. L1 has 6 throws and star targets 65/95/120 life. L2 has 8 throws (targets 105/155/190) and introduces the Seed Pod. Coach tips fire by throws-used on levels 1-3 only. The tutorial win skips the pre-level sheet and 'Next' goes straight to L2. A random-play first-timer can lose L1 (my bot got 34/65 life) and sees 'Out of throws, +5 THROWS 40 gems, you have 33'. Winning L2 then 'Galaxy' leads to the Star Calendar popup, and the Passport naming popup follows on the next Home visit.",
   "depth": 2,
   "files": [
    "/home/user/oneshotgame/src/ui/app.ts",
    "/home/user/oneshotgame/src/meta/coach.ts",
    "/home/user/oneshotgame/src/core/levels.ts",
    "/home/user/oneshotgame/src/ui/flows/results.ts",
    "/home/user/oneshotgame/src/ui/flows/daily.ts",
    "/home/user/oneshotgame/src/ui/screens/home.ts"
   ]
  },
  {
   "name": "Core throw loop and level HUD",
   "howItWorks": "Pull back anywhere and release to fling. Gravity bends the shot. Each landing transforms sectors (17 biomes), which spawns creatures (36 species). HUD shows throws left, 'life' score bar with 3 star marks, goal chips (from planet 6), twist chip, Hard/Super Hard badge, Supernova ring around the launcher, and 'tap to swap' between only the current and next object. One-line object description at the bottom. Boss levels add a Comet Guardian. Decision space per throw is angle plus a two-slot swap. Floating labels give feedback ('Mountain', 'Nice!', '+13', 'Crag Goat - NEW!').",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/core/world.ts",
    "/home/user/oneshotgame/src/core/levels.ts"
   ]
  },
  {
   "name": "Pre-level sheet, results and fail sheet",
   "howItWorks": "Pre-level modal shows chapter and planet name, difficulty chip, twist chip, goals, 3 star targets, unlocked object icons, Momentum banner, 3 toggle boosters (Comet Shower, Life Spark, Star Scope, owned count or dust price), then Launch. Results modal shows stars, stardust, 3-star gem bonus, creature count, 'makes X/hour' sentence, materials, nudge banners (Road, chest, quest), Share postcard, Galaxy and Next. Fail modal shows the star shortfall, a 'So close' bar at 75% or more, and '+5 THROWS' at 40/70/110 gems.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/ui/flows/prelevel.ts",
    "/home/user/oneshotgame/src/ui/flows/results.ts",
    "/home/user/oneshotgame/src/ui/game.ts",
    "/home/user/oneshotgame/src/meta/config.ts"
   ]
  },
  {
   "name": "Home hub and navigation",
   "howItWorks": "Top bar (settings, avatar to Passport, dust pill to Upgrades, gems pill to Shop), title, season and festival chips, a galaxy canvas with absolutely-positioned side button rails (left: Quests, Star Road, Rank, Inbox; right: Homeworld, Modes, Voyage, Event, Piggy), Collect and x2 row, Play, and 4 bottom tabs. Hub badges: Star Road, Inbox, Voyage, festival chip, event ring, Star Map dot, OFFER, star and creature counts. Six hubs open as modals over Home and about 13 open as full screens. All Back buttons go to Home. Workshop is only reachable via avatar, Passport, Workshop.",
   "depth": 4,
   "files": [
    "/home/user/oneshotgame/src/ui/screens/home.ts",
    "/home/user/oneshotgame/src/ui/app.ts",
    "/home/user/oneshotgame/src/styles.css",
    "/home/user/oneshotgame/src/ui/screens/passport.ts"
   ]
  },
  {
   "name": "Progression stack (Star Map, Star Road, Quests, Rank, Modes, Voyage, Event, Festival, Inbox, Calendar)",
   "howItWorks": "Star Map shows 10-planet chapters as a locked ladder with Hard (flame) and Super Hard (skull) markers and a chapter chest. Star Road is a star-milestone track with a paid Cosmic Pass lane and a hero ad at the top. Daily quests are generic counters (fling 25, complete 3 planets, earn 6 stars) with a 3-quest bonus. Explorer Rank has three counters per rank and gates Daily at rank 2, Rush 3, Zen 4 and Challenge 5. Weekly Voyage is 7 stops. Weekly Event and monthly Festival are token ladders. Inbox holds Mission Control letters with gifts. Star Calendar is a 28-day stamp grid.",
   "depth": 4,
   "files": [
    "/home/user/oneshotgame/src/ui/screens/starmap.ts",
    "/home/user/oneshotgame/src/ui/screens/road.ts",
    "/home/user/oneshotgame/src/ui/flows/quests.ts",
    "/home/user/oneshotgame/src/ui/flows/rank.ts",
    "/home/user/oneshotgame/src/ui/flows/modes.ts",
    "/home/user/oneshotgame/src/ui/screens/voyage.ts",
    "/home/user/oneshotgame/src/ui/flows/event.ts",
    "/home/user/oneshotgame/src/ui/flows/festival.ts",
    "/home/user/oneshotgame/src/ui/flows/inbox.ts",
    "/home/user/oneshotgame/src/ui/flows/daily.ts"
   ]
  },
  {
   "name": "Stardust idle economy and Upgrades",
   "howItWorks": "Each finished planet earns 6 + 3*stars + 2*species stardust per hour into a vault capped at 4h (upgradable to 24h). Mid-game (23 planets) that is 516/h, so a 4h Collect is 2,064, versus 110 for a first-clear 3-star win and about 70 for a repeat. Sinks: Object Lab (400/1200/3000/7000 per object, six objects), Galaxy upgrades (Aim Guide 250-1600, Extra Throws 400-3000, Wide Impact 5000, Vault 300-2500), boosters, Homeworld buildings. Lab perks are the same four flat bonuses on every object (Bloom +2 life per region, Charge +50% Supernova, Magnet +6 per creature, Starfall +3 per landing).",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/meta/economy.ts",
    "/home/user/oneshotgame/src/meta/lab.ts",
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/ui/screens/upgrades.ts"
   ]
  },
  {
   "name": "Collection and expression (Lifebook, Sticker Album, Workshop, Passport, Star Atlas, Buddy)",
   "howItWorks": "Lifebook lists 36 creatures by rarity as silhouettes with 'Lives in X' hints and +3 gems per discovery. Sticker Album (63) and Scrapbook are reached from Lifebook. Passport shows rank, stars, badges and stats. Workshop has 7 tabs (Suit, Hat, Launcher, Trail, Emote, Dye, Buddy) and 3 outfit slots. Star Atlas turns level-drop materials (stone, dew, leaf, ember, frost) into constellation bundles and is reached from inside Homeworld.",
   "depth": 4,
   "files": [
    "/home/user/oneshotgame/src/ui/screens/lifebook.ts",
    "/home/user/oneshotgame/src/ui/screens/album.ts",
    "/home/user/oneshotgame/src/ui/screens/workshop.ts",
    "/home/user/oneshotgame/src/ui/screens/passport.ts",
    "/home/user/oneshotgame/src/ui/screens/sky.ts",
    "/home/user/oneshotgame/src/meta/constellations.ts"
   ]
  },
  {
   "name": "Homeworld (passive base)",
   "howItWorks": "Opens with a 4-bullet welcome modal, then a spinning green planet with faint empty plots, 2 drones, 0 residents, 0 charm, and six buttons (Collect all, Residents, Expedition, Expand, Paint, Photo) plus Star Atlas. Tap a plot to pick a building (Stardust Mill 150, Critter Den 250, others gated by ring). Drones build on timers, and each campaign win speeds them by 10 minutes. It has no threat, no visible next goal and no link to the moment-to-moment loop beyond that speed-up.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/ui/screens/homeworld.ts",
    "/home/user/oneshotgame/src/meta/homeworld.ts"
   ]
  },
  {
   "name": "Monetisation surfaces",
   "howItWorks": "Shop: one-time Starter Pack $2.99 (300 gems, 5 of each booster, Aurora atmosphere), Piggy bank $1.99, gem packs $0.99-$19.99, Cosmic Pass $4.99. In-game: +5 throws for 40/70/110 gems on loss, x2 Collect for 10 gems, boosters for dust or gems, Workshop suits at 120 gems. Parental gate (multiplication quiz) fires on the buy tap (verified). The Starter Pack is designed as a post-chapter-1 offer (offers.ts:15) but is visible in the Shop and flagged 'OFFER' on Home from minute 3.",
   "depth": 3,
   "files": [
    "/home/user/oneshotgame/src/ui/screens/shop.ts",
    "/home/user/oneshotgame/src/ui/flows/offers.ts",
    "/home/user/oneshotgame/src/ui/flows/gate.ts",
    "/home/user/oneshotgame/src/meta/config.ts",
    "/home/user/oneshotgame/src/ui/game.ts"
   ]
  }
 ],
 "gaps": [
  "No stated purpose: nowhere does the game say what the player is building toward (a galaxy? a homeworld? a Lifebook?). No title, story beat or goal line in the first 5 minutes.",
  "Synergies are invisible: no recipe or combo reference in-level, no preview of what the current object will do to the sector under the aim line beyond a one-time L3 tip, no combo or chain meter, and only current+next object visible (no queue view, no hold slot).",
  "No negative interactions in play: twists (Fast Spin, Wobbly Spin, tiny, moon, hot, frozen, ocean) are pre-level modifiers, and the only in-level antagonist is the boss Comet Guardian. Failure is 'not enough life', never a mistake you can see and fix mid-round.",
  "No per-object identity in upgrades: all six objects share the same four flat Lab perks, with no branches, choices, builds or loadouts.",
  "Coach and tutorials stop after level 3: nothing teaches Supernova, goals (L6), boosters, twists, Hard/Super Hard, the boss, Momentum, the Object Lab or Homeworld beyond a static modal. 'How to play' is buried in Settings (settings.ts:69).",
  "No 'next best action' on Home: with 15+ badges and buttons there is no single suggested next step (for example 'Build your Stardust Mill' or 'You are 2 creatures from Rank 2').",
  "No stakes or loop between Homeworld and levels: nothing to defend or protect, no objectives that ask for specific play.",
  "No back-stack: sub-screens always return to Home, so Lifebook to Album to Back skips Lifebook.",
  "No goal detail on demand: goal chips have only a title tooltip (game.ts:434) and the pre-level chips have no tap handler (prelevel.ts:28-40), so 'Sunbird' does not say how to make one.",
  "Not tested: landscape/iPad layout, larger text sizes, colour-blind biome legibility, VoiceOver, real WebKit, audio and haptics, a Homeworld with buildings and residents, Expeditions and Buddy flows, and Challenge/Daily/Rush end-to-end."
 ],
 "painPoints": [
  {
   "issue": "There is no answer to 'why am I doing this'. The HUD goal is filling an abstract 'life' number past 3 star marks. Stardust, gems, stars, materials and planets are each explained (if at all) in one muted sentence or a tooltip, and creatures and the Keeper have no role in a throw beyond adding life points. A new player cannot say what the game is for after 10 minutes.",
   "severity": "high",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/a01-first-launch.png (no title, 'life' unexplained), b02-l1-win-b.png (only stardust explanation is the small muted line, results.ts:88), b07-after-stamp.png (Collect 0 / 33 per hour), coach.ts:3-16 (coach covers only L1-3), c08-fresh-upgrades.png (400 stardust for +2 life)."
  },
  {
   "issue": "Cold open straight into a failable Planet 1 with no title or story. A first-timer flinging naively got 34 of 65 life in 6 throws and hit 'Out of throws, Just 31 life short of a star', with a blue '+5 THROWS 40 gems, you have 33' button. That is a gem-spend prompt on the very first level, when the player cannot afford it and has no clue why the round failed. The 'Fill the life bar past the star marks' tip arrives only on throw 4 (coach.ts:6).",
   "severity": "high",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/a06-level1-end.png and a05-level1-mid.png; app.ts:150; makeLevel(1) = 6 throws, stars [65,95,120]; config.ts:8 CONTINUE_COSTS = [40,70,110]."
  },
  {
   "issue": "Home is overloaded: about 21 tap targets on the mid-game screen, up to 9 side buttons stacked over the galaxy (which is the reward view), 6+ different badge styles (numeric dots on Star Road/Inbox/Voyage, festival ring chip, gold Event ring, OFFER pill, 56 star pill, 15/36 pill, red dot on Star Map icon), an unread Inbox of 6 letters, and two competing CTAs (yellow Collect vs orange Play). Each new feature adds another rail button.",
   "severity": "high",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/e01-mid-rich-home.png (Star Road and Rank buttons sit on top of planets), e00-mid-spec-only-home.png, m01-home-piggy-iphone14vp.png (9 rail buttons fill the whole panel); home.ts:123-176."
  },
  {
   "issue": "At 320x568 (iPhone SE 1st gen) the side button rails are taller than the galaxy panel and are clipped. The Inbox button is cut off so only its unread badge floats at the frame edge, the Event button is cut off, and planets are hidden behind the buttons. Measured: the galaxy panel is 182px tall, the left rail is 214px, and the panel has overflow:hidden, so 2 of 8 buttons are clipped on a fresh account. On 390x664 the 9-button case fits by only 6px.",
   "severity": "high",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/k01-se-mid-home.png and d03-se-mid-home.png and d02-se-fresh-home.png (Inbox clipped even on a fresh profile); styles.css:235-243 (.galaxy-wrap flex:1, overflow hidden), 1191-1215 and 2202-2215 (.side rails)."
  },
  {
   "issue": "Login-calendar popup blocks the first real look at Home. After winning Planet 2 and tapping Galaxy, the player sees a full-screen 28-day Star Calendar grid (28 reward cells, 4 highlighted gold) with a 'Stamp day 1' button before ever seeing their galaxy. A Passport naming popup follows on the next Home visit. Both fire in the first 3 minutes, and again on every cold launch.",
   "severity": "high",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/b06-home-after-2.png, o01-passport-setup.png; home.ts:187-192; flows/daily.ts:40; f00-mid-launch.png (same calendar on every mid-game cold start)."
  },
  {
   "issue": "Combos and synergies are invisible, so depth is low. The player sees only the current and next object (a single 'tap to swap' bubble), cannot see the queue, and recipes ('a forest next to an ocean brings otters') live in the Lifebook. New object kinds stop at level 11 (seed 2, magma 4, storm 7, sun 11, world.ts:119-124) and after that only twists vary. Star targets plateau (L30: 315/365/390; L50: 250/290/310), so the campaign does not escalate.",
   "severity": "high",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/i02-level24-start.png and i04-level24-mid.png (single swap bubble, one-line object text); c10-fresh-prelevel.png (object icons carry no labels); coach.ts:13-16; levels.ts makeLevel star tables (via page import)."
  },
  {
   "issue": "Stardust economy inversion and thin upgrades. Idle income dwarfs active play: a 4h vault Collect is 2,064 stardust at level 24, while a first-clear 3-star win pays 110 (about 70 on replays). The biggest sink, the Object Lab, costs 11,600 per object (69,600 total) but gives the same four flat bonuses on every object (+2, +50% charge, +6, +3 life), with the same text repeated on six cards. Upgrades look like 'numbers go up' with no build choice.",
   "severity": "high",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/h04-upgrades-bottom.png, c08-fresh-upgrades.png, e01-mid-rich-home.png ('Collect 2,064, Vault full'); lab.ts:14-25; economy.ts:10-16 and 77-83."
  },
  {
   "issue": "Goal chips do not tell you how to achieve the goal. 'Sunbird 0/1' (a legendary needing planet-wide conditions) is a bare icon and name. In-level chips use only a title tooltip (useless on touch), pre-level chips have no tap handler, and the only way to find the recipe is to leave the level and open Lifebook.",
   "severity": "medium",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/i01-prelevel-24.png, i02-level24-start.png, j01-prelevel-29.png; game.ts:434 (title: name); prelevel.ts:28-40."
  },
  {
   "issue": "Tutorial stops at level 3 and 'How to play' is buried behind the gear icon. Supernova, goals (planet 6), boosters, twists, Momentum, Hard/Super Hard and boss rules, the Object Lab and the Homeworld are introduced only by chips or a static modal. The Comet Guardian on planet 30 just appears as an angry purple ball with 'hit it 3 times!'.",
   "severity": "medium",
   "evidence": "coach.ts:3-16; settings.ts:69, 91-104; /tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/j04-boss-after3.png and g17-settings.png."
  },
  {
   "issue": "Hidden and deep navigation with an always-home Back. The Workshop (the main non-random cosmetic sales surface) is 3 taps deep (avatar, Passport, Workshop). Star Atlas is inside Homeworld, the Sticker Album inside Lifebook, Buddy inside a Workshop tab, and the Cosmic Pass inside Shop or Star Road. Back always goes to Home, so Album to Back and Workshop to Back both landed on Home (verified). Six hubs are modals and thirteen are full screens.",
   "severity": "medium",
   "evidence": "app.ts:306-312; passport.ts:130; homeworld.ts:586; lifebook.ts:110; /tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/g14-passport.png, g15-workshop.png, g16-album.png."
  },
  {
   "issue": "Currency and resource sprawl. The Profile tracks stardust, gems, life score, level stars, Star Road stars, 5 materials (stone, dew, leaf, ember, frost), 3 booster counts, per-event tokens (volcano, acorn), festival spots, piggy gems, Momentum streak, Explorer Rank and drones. The results modal introduces 'Materials' on planet 1 with no explanation. 'Stars' means both per-level rating and Star Road progress. A 6+ audience faces about 10 counters.",
   "severity": "medium",
   "evidence": "profile.ts:59-151; /tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/b02-l1-win-b.png (Materials), g19-sky.png (Star Atlas), g04-event.png, g13-festival.png, c02-fresh-road.png."
  },
  {
   "issue": "Dead ends and false-live buttons early. The Modes button opens 4 padlocks in the first sessions (Daily needs Rank 2, Rush 3, Zen 4, Challenge 5). Disabled CTAs (Collect 0, Rank up!, Homeworld 'Collect all', Claim) keep the same big muddy-orange fill as live ones, so they read as broken. Collect is the second-largest control on Home while it shows 0.",
   "severity": "medium",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/c05-fresh-modes.png, c03-fresh-rank.png, b07-after-stamp.png, h01-homeworld-after-intro.png; modes.ts; home.ts:85-103."
  },
  {
   "issue": "Pre-level sheet is cramped and the boosters are undocumented. On the Super Hard planet at 390x664 and much worse at 320x568 the sheet scrolls internally (scrollHeight 600 vs 472) and the Launch button overlaps the Boosters row, hiding it. Nothing explains what Comet Shower (+3 throws), Life Spark or Star Scope do (that text is only in the Shop), or that the tiles toggle. Two taps are needed between levels (Next, then Launch).",
   "severity": "medium",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/k02-se-prelevel-29.png and j01-prelevel-29.png and i01-prelevel-24.png; prelevel.ts:52-80."
  },
  {
   "issue": "Homeworld (the Clash-style base) has no visible purpose or next step on entry. It opens with a welcome modal and an empty planet with faint plots, 0/0 residents, 0 charm, a disabled Collect all, and six buttons plus Star Atlas. There is no goal, no threat, no timer to care about, and no tie to the level except a 10-minute drone speed-up after wins. Buildings cost 150-300 stardust when the player has 5,000, so nothing is scarce.",
   "severity": "medium",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/g02-homeworld.png, h01-homeworld-after-intro.png, h02-homeworld-tap-plot.png; results.ts (drone nudge); homeworld.ts:586."
  },
  {
   "issue": "Monetisation surfaces appear before value is shown. The Starter Pack is on the Shop top and 'OFFER' on the Home tab from minute 3 (offers.ts:15 designs it for after chapter 1). The Star Road opens with a full-bleed Cosmic Pass ad ($4.99, 880 gems) above the free track. The 40-gem continue appears on planet 1. The 'Vault full! Upgrade it to store more' text leads to an Upgrades page 1,596px long where the Vault card is the last item.",
   "severity": "medium",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/c09-fresh-shop.png, c02-fresh-road.png, h04-upgrades-bottom.png, a06-level1-end.png; upgrades.ts; offers.ts:15-17."
  },
  {
   "issue": "Visual overlaps in play. The tutorial line 'Pull back and release to fling' is partly covered by the pointing hand and launcher. The floating labels 'Mountain' and 'Nice!' render on top of each other. A new creature triggers two notices at once (banner card plus faint floating 'Crag Goat - NEW!'). On Hard and Super Hard planets the 2-star and 3-star marks on the life bar nearly collide.",
   "severity": "low",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/a01-first-launch.png, a03-first-fling-flight.png, a04-first-fling-landed.png, k03-se-level-29.png, j04-boss-after3.png."
  },
  {
   "issue": "Shop 'ONE-TIME' ribbon on the Starter Pack is clipped ('ONE-T'). The class .ribbon is defined three times (a corner ribbon at styles.css:1008 and two pill-style rules at 3168 and 3201), so the later rules override padding and background but the rotated corner position remains.",
   "severity": "low",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/c09-fresh-shop.png; styles.css:1008, 3168, 3201."
  },
  {
   "issue": "Daily quests and Explorer Rank goals are generic volume counters ('Fling 25 objects', 'Complete 3 planets', 'Earn 6 stars', 'Discover 2 creatures'). They do not steer the player toward new mechanics, combos or unexplored modes, and quests reset on a countdown ('New quests in 4h 57m').",
   "severity": "low",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/c01-fresh-quests.png, c03-fresh-rank.png; quests.ts."
  },
  {
   "issue": "Parental gate is a single 7 x 8 multiplication question with four choices. It works and fires before the App Store sheet, but a 9-10 year old in the 6+ audience can answer it and guessing is 25% right.",
   "severity": "low",
   "evidence": "/tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/p01-buy-gate.png; flows/gate.ts."
  }
 ],
 "opportunities": [
  "Give the game one sentence of purpose in the first 30 seconds: a 5-second title beat ('Grow tiny planets, welcome creatures, build your Homeworld') and make L1 unfailable (guarantee 1 star, or add 2 free throws). Replace the gem-continue prompt on L1-3 with a friendly retry.",
  "Defer all popups: no login calendar or Passport naming until after planet 5 or session 2, and turn the calendar into a non-blocking chip. That removes the two worst first-session interruptions.",
  "Add a single 'Next Up' card on Home (for example 'Build your Stardust Mill', '2 creatures to Rank 2') and cut the rails: group Quests, Rank, Voyage, Event, Festival and Inbox into one 'Missions' hub with one badge, and Lifebook, Album, Workshop, Star Atlas and Buddy into one 'Collection' tab. Show Modes only after Rank 2.",
  "Make the 320px layout safe: convert the side rails to a horizontal chip strip or a bottom sheet under 700px tall or 360px wide, so nothing can clip as features are added.",
  "Turn the throw into a puzzle you can read: show the next 3 objects, add a 'recipe hint' line that names the outcome of the aimed sector (for example 'Ice + Mountain = Glacier'), a combo chain meter, and tappable goal chips that open the recipe and a 'why not yet' hint. This is the surface where the requested synergies, boosts and negative interactions (hazards, decay, cooling) can be taught.",
  "Give each object an identity in the Lab: replace the identical +2/+50%/+6/+3 ladder with per-object branches (Rock: Quake, Ice: Freeze chain, Seed: Overgrow, Magma: Eruption, Storm: Flood, Sun: Bloom) so upgrades change how you play and the Lab becomes the 'why' for stardust.",
  "Rebalance idle versus active stardust so a good round matters (active wins pay a meaningful share of a vault collect) and let the Homeworld be the visible destination for stardust, with goals such as ring gates and building milestones shown on Home.",
  "Fix the responsive and consistency bugs: a back-stack (Album to Lifebook, Workshop to Passport, Atlas to Homeworld), tappable Workshop entry on Home or the avatar long-press, muted disabled-CTA style with a 'ready in Xh' label, the duplicate .ribbon CSS, an overlap-safe floating label queue, and a sticky-safe pre-level sheet with booster descriptions.",
  "Extend the coach past level 3 with just-in-time one-line teachers (first Supernova, first goal, first Hard planet, first boss, first Lab visit) driven by the same COACH table, and surface 'How to play' from the pre-level sheet.",
  "Time monetisation to value: hide the OFFER badge until the post-chapter-1 moment, move the Cosmic Pass hero below the first free tiers, and make the 'So close' continue the only gem prompt inside a round (still fixed-price, no random rewards)."
 ]
}
```

## Market research (JSON)

### Research: combos and hazards

```json
{
 "findings": [
  {
   "game": "Candy Crush Saga / Royal Match (special-piece pair combos)",
   "mechanic": "Combine two specials for a bigger, pair-specific effect",
   "whatItIs": "Special pieces are made by shaped matches. Swapping two specials together triggers a unique combo instead of two separate effects. Striped+Striped clears a row and a column. Striped+Wrapped clears a 3-wide cross. Color Bomb+Striped converts a whole color into stripes. Color Bomb+Color Bomb clears the board. Royal Match uses the same idea with rockets, TNT and light balls.",
   "lesson": "Depth comes from an N x N pair matrix on a small set of pieces, not from adding pieces. Each pair has one distinct, big, telegraphed payoff. The 'aha' is discovering that two things you already own do something new. Players plan one move ahead to set up the pair, so the skill is spatial and ordering, not memory. Keep the roster small (3-5 specials) so the whole matrix fits in a player's head or a one-screen chart.",
   "applyIdea": "Fusion Landings. Pocket Planet has 6 kinds (rock, ice, magma, seed, storm, sun), so 15 unordered pairs plus 6 same-kind 'Echoes'. Ship 6 named Fusions first. If a throw lands within 2 sectors of the previous throw's landing and the kinds form a pair, the Fusion fires on top of both normal effects. Examples: Ice+Magma = Steam Vent (rain over 5 sectors and heat pulled to 0); Seed+Sun = Bloom (+1 life across 5 sectors); Rock+Magma = Volcano ridge; Storm+Sun = Rainbow (raises the chance a rare species moves in). Cue: a glowing arc links the two impact points, a one-word banner shows, and the aim preview shows a small 'Fusion?' chip when the current aim would trigger one, so it is plannable. It is deterministic (no RNG), free, never sold. A Fusion chart lives in the Lifebook. Rare payoff: a Supernova landed on a Fusion pair is the 'Color Bomb x Color Bomb' moment. Cost control: about 6 names x 5 locales, and greedyPlan can search pairs since they are deterministic, so level feasibility tests still hold.",
   "sources": [
    "https://candycrush.zendesk.com/hc/en-us/articles/211939685-Creating-and-combining-Special-Candies",
    "https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/",
    "https://candycrush.fandom.com/wiki/Colour_Bomb_(special_candy)",
    "https://www.bluestacks.com/blog/game-guides/candy-crush/ccs-booster-guide-en.html",
    "https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey"
   ],
   "confidence": "high"
  },
  {
   "game": "Genshin Impact (elemental reactions and gauge)",
   "mechanic": "Two-element reactions with a decaying 'aura' and order-dependent amplification",
   "whatItIs": "An attack leaves an element aura on a target. A second, different element consumes it and triggers a named reaction. Amplifying reactions (Vaporize, Melt) multiply the triggering hit by 1.5x or 2.0x depending on which element hit second. Others, such as Overload, don't care about order. Auras are measured in gauge units (attacks apply roughly 1, 1.5, 2, 4 or 8) and decay over time. Damage numbers are color-coded by element (white = physical, yellow = crit, colored = elemental), so players can read what happened without a tooltip.",
   "lesson": "Three transferable rules. (1) The state that enables a combo is visible and expires, which adds a timing skill layer without adding buttons. (2) 'Which came first' matters for some pairs and not others, which gives a cheap, learnable ordering puzzle. (3) Color-coding the feedback does the teaching, so the rules don't need a manual. A community-built gauge model exists, but only the qualitative model (aura, consume, decay) is worth borrowing.",
   "applyIdea": "Afterglow. Each landing leaves a tinted ring on the 1-3 sectors it touched: warm for magma or sun, cool for ice, blue for storm, green for seed. The ring shrinks over the next 3 throws like a fuel gauge. If a different kind lands on a sector with a live ring, the reaction amplifies (+50% to the new effect, shown as a gold floater). The order matters for some pairs: Ice onto a Magma glow = strong Steam; Magma onto an Ice glow = weaker Thaw. This gives one readable 'do it in this order' lesson per pair without a tutorial wall. Cap of 2 rings per sector. Floating numbers use the kind's color, and gold when amplified. Pure display state on top of the existing Sector fields (land, water, heat, life), so profile migration is trivial. Keep it out of competitive modes that exclude Lab bonuses unless the Afterglow is identical for all players.",
   "sources": [
    "https://www.thegamer.com/genshin-impact-elemental-reactions-ranked/",
    "https://www.inverse.com/gaming/genshin-impact-elemental-reactions-explained-melt-vaporize-swirl-superconduct",
    "https://genshin-impact.fandom.com/wiki/Elemental_Gauge_Theory",
    "https://genshin-impact.fandom.com/wiki/Elemental_Reaction",
    "https://game8.co/games/Genshin-Impact/archives/297558"
   ],
   "confidence": "medium"
  },
  {
   "game": "Divinity: Original Sin 2 (elemental surfaces)",
   "mechanic": "Persistent terrain states that remember earlier actions and double as hazard counters",
   "whatItIs": "Spells leave surfaces on the ground: water, oil, poison, blood, ice, steam. The next action reads the surface. Fire + water makes steam that removes burning. Lightning on water electrifies everyone standing in it. Freezing water makes slippery ice that knocks creatures down. The board itself is the combo memory, and the same surface can be a weapon or a shield.",
   "lesson": "Store combo state in the world, not in a hidden combo counter. Players can then read it, plan around it, and use it defensively as well as offensively. It also unifies combos and hazards in one rule set: a hazard is just a surface with a known counter.",
   "applyIdea": "Sector Conditions. Add a fifth per-sector tag that persists for the round: Soaked, Scorched, Frosted, Overgrown, Dusty. Each is a visible tint or icon on the planet limb. They do two jobs. As combo fuel: Seed on a Soaked sector gets +1 life; Storm on Scorched cancels the condition and adds a Steam puff. As hazard armor: a Soaked sector cannot catch Wildfire and blocks its spread, which makes water a natural firebreak (see the spreading-hazard finding). Toggle conditions in the same settle() pass as biomes so save data and greedyPlan stay pure functions. Free and deterministic. Add a Conditions strip to the Lifebook so the 5 conditions are teachable in one page.",
   "sources": [
    "https://www.gamepressure.com/originalsinii/environmental-effects-and-combinations/zea274",
    "https://divinityoriginalsin.wiki.fextralife.com/Environmental_Effects",
    "https://forums.larian.com/ubbthreads.php?ubb=showflat&Number=640589"
   ],
   "confidence": "medium"
  },
  {
   "game": "Angry Birds 2 / Peggle (in-run earned power and shot order)",
   "mechanic": "A visible shot queue plus an escalating performance meter, and one character-specific power triggered by a marked target",
   "whatItIs": "Angry Birds 2 shows the next 3 birds or spells as cards. Filling the Destruct-O-Meter by smashing things awards an extra card, and the meter demands more each time it fills. The order of cards changes the plan. Peggle gives each of its 'Masters' one magic power, activated when the ball hits one of the randomly chosen green pegs, so the power is earned inside the round by aiming, not bought. Bjorn's power draws a guide line that shows where the ball will go.",
   "lesson": "In-run power should be earned by doing the core verb well. Three levers make it feel skillful: a visible queue (order = decision), an escalating threshold (so a bonus is exciting, never runaway), and a single marked 'trigger target' (so a power is a small aiming goal). Angry Birds 2 also lets players pay in-game currency for extra cards when pigs survive; that is a pressure-sale point to avoid in a kid-safe design.",
   "applyIdea": "Two linked pieces. (1) Throw Queue and Surge: show the next 3 kinds, allow one free swap of the next two per level (so Fusion setups become a puzzle), and add a Surge meter filled by sectors changed and creatures welcomed. Each fill grants one bonus 'Wild Pod' throw (any kind you choose) and the next fill needs about 1.5x more, capped at 2 bonus throws per level to hold the 1-2 minute round. Never sold. (2) Buddy Power: each Buddy species (buddy.ts) contributes one small active power charged by landing on 1-2 seeded 'Glow Sectors' per level, e.g. Scope (free preview of the next landing), Wide Splash (+1 radius for one throw), Steady (cancel wind once). Gives the 'characters' a gameplay job and stays free forever; only Buddy cosmetics are sold.",
   "sources": [
    "https://angrybirds2.rovio.com/hc/en-us/articles/360000492848-What-are-the-cards-and-how-do-they-work-",
    "https://angrybirds.fandom.com/wiki/Destruct-O-Meter",
    "https://peggle.fandom.com/wiki/Game_Mechanics",
    "https://peggle.fandom.com/wiki/Bjorn",
    "https://www.gamedeveloper.com/design/why-is-peggle-so-addictive-"
   ],
   "confidence": "high"
  },
  {
   "game": "Peglin / Slay the Spire / Balatro (relics, orb variety, and a legible score formula) plus Worms (weapon roster)",
   "mechanic": "Run-level rule-modifier items with tradeoffs, feeding one visible multiplier formula",
   "whatItIs": "Peglin builds a deck of orbs; relics are passive rule changes that make certain orb combos shine (for example, one gives 2 extra copies of each orb but halves damage, another turns all bombs into 2x-damage red bombs). Slay the Spire relics such as Dead Branch change the whole strategy of a run. Balatro funnels everything into Chips x Mult, so two x3 jokers give x9 and three give x27, with layered animation and audio so arithmetic feels like fireworks. Balance is tuned mostly by changing numbers. Worms shows the same principle for projectiles: 50+ weapons, all variants of the same arc-and-blast physics, each with a one-line comedic identity.",
   "lesson": "Players feel clever when a modifier changes the rules of the run rather than adding raw numbers. Tradeoff items (a bonus with a cost) create harder-but-chosen negatives, so difficulty rises by player choice. A single visible formula (A x B) keeps stacking legible, and the tally animation is the reward. Variety of projectile 'flavors' needs one shared verb; the fun is one-line rules.",
   "applyIdea": "Expedition Run: a 5-planet mode where, between planets, the player picks 1 of 3 Charms from a seeded pool. Charms are free run rewards and can never be bought (random-but-free draft is compatible with the no-paid-random rule; state that in the design doc). The end score shows one formula, Life Points x Harmony, with each Charm labeled as +Land Points, +Harmony, or a tradeoff. Tradeoff Charms: 'Wide Wonders: +1 splash on all objects, -1 throw'; 'Cold Snap: ice cools neighbors an extra step, seeds need water'. Harmony is capped at x4 for legibility. Completing depth 5 gives a fixed stardust amount. Add a small 'Odd Objects' pool of Worms-style novelty shots (Skipping Stone bounces once along the ring, Boomerang Comet lands twice, Twin Seeds) that appear as run rewards and as the weekly rotation. Playable in about 6-8 minutes total, still in the waiting-room rhythm since each planet is a normal round.",
   "sources": [
    "https://indiecator.org/2022/05/18/indietail-peglin/",
    "https://peglin.wiki.gg/wiki/Upgrade",
    "https://peglin.wiki.gg/wiki/Critical_Peg",
    "https://www.gamedeveloper.com/game-platforms/watch-casey-yano-break-down-the-design-decisions-behind-i-slay-the-spire-i-",
    "https://dood.gg/en/balatro/guides/scoring-guide/",
    "https://rogueliker.com/balatro-interview/",
    "https://blakecrosley.com/guides/design/balatro",
    "https://www.gamesradar.com/annelid-antics-how-worms-made-an-art-of-refining-a-timeless-genre/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Vampire Survivors / Survivor.io / Archero / Bloons TD 6 (evolutions and upgrade paths)",
   "mechanic": "Evolutions gated by a catalyst, additive projectile modifiers, and a cross-path cap on upgrade trees",
   "whatItIs": "Vampire Survivors: max a weapon (level 8), hold the matching passive item, then open a boss chest after 10 minutes and the weapon evolves; the passive stays. Survivor.io needs weapon level 5 plus the right support skill, and a boss golden chest triggers it. Archero's skills are additive projectile modifiers (Multishot, Ricochet, Piercing, Bouncy Wall) that multiply each other's value. Bloons TD 6 gives every tower 3 upgrade paths with tiers 0-5, but the cross-path rule allows only one path to tier 5 and one to tier 2 (a '5-2-0' build), so builds are choices, not completions.",
   "lesson": "Same action feels different when (a) a hidden but discoverable recipe transforms it, (b) modifiers stack multiplicatively, and (c) caps force a build identity. Reveal the evolution as a reward moment (boss chest), not a menu click. Cross-path caps keep a tree small, replayable and balanceable.",
   "applyIdea": "Object Lab 2.0. (1) Three paths per kind: Reach (splash radius), Power (bigger land, water, heat or life change), Echo (a lingering or chained secondary effect). Cross-path cap 5-2-0, with free, unlimited respec so kids never feel locked in and there is nothing to buy to fix a mistake. (2) Evolutions: at Lab level 5 plus a matching Catalyst species (seen 5+ times in the Lifebook), the object evolves into a named variant, revealed after a Comet Guardian defeat. Example: Rock + Cliff Goat = Meteor Cluster (splits into 3 small impacts); Ice + Snow Owl = Glacier Comet (leaves Frosted); Seed + Bee = Grove Pod. Recipes are shown as locked silhouettes on the Lab screen. Campaign only; competitive modes keep excluding the Lab (existing rule). Paid side: only cosmetic trails and skins per path, fixed price and previewable, never tiers.",
   "sources": [
    "https://vampire.survivors.wiki/w/Evolution",
    "https://www.pcgamesn.com/vampire-survivors/weapon-evolutions",
    "https://www.bluestacks.com/blog/game-guides/survivor-io/sio-skills-evolution-guide-en.html",
    "https://www.levelwinner.com/archero-strategy-guide-best-builds-skill-combos-and-weapons-to-crush-your-enemies/",
    "https://bloons.fandom.com/wiki/Crosspathing",
    "https://mobilegamemaster.com/btd6-crosspathing-guide/"
   ],
   "confidence": "high"
  },
  {
   "game": "Royal Match / Candy Crush (power-ups earned vs bought)",
   "mechanic": "Two tiers: skill-created in-round power-ups (free) and pre-round boosters (earned by momentum and events, or bought)",
   "whatItIs": "Special pieces are created on the board by skill and are free. Royal Match splits boosters into pre-game boosters (rockets, TNT, light balls placed at the start) and in-game boosters (hammer, arrows, cannon, jester's hat) used during the round. Players earn boosters by winning streaks and events, and third-party trackers describe events paying 10,000-15,000 coins each and team battles about 6,000 coins, so a diligent free player rarely needs to buy. Coins buy boosters. Royal Match instantly shuffles instead of forcing a booster when there is no move, rewarding effort.",
   "lesson": "Keep the 'exciting' power-ups skill-created and free. Sell only convenience, in fixed, previewable bundles. Make earned boosters flow steadily so purchase is never the only route. Streak-based earning drives retention but can pressure players when a loss breaks it; a softer version (pause, don't reset) suits kids.",
   "applyIdea": "Pre-round boosters stay as they are (Shower, Spark, Scope) but formalize a two-tier economy: Tier 1, skill-made (Fusions, Surge, Buddy Power) free and never sold; Tier 2, pre-round consumables earned from Momentum (existing momentum.ts): 3 two-star clears in a row fills the meter and grants a choice of one pre-round booster. A failed round pauses the streak and never resets it. Revenue path: fixed-price Booster Packs, e.g. 'Starter Trio: 3 Showers + 3 Sparks + 3 Scopes', with the exact contents shown before purchase, behind the parental gate. Also a Season Toolkit pack with a cosmetic. No randomized packs, no ads, no pay-to-skip. Aim for a free player to get about 1 booster per 3-4 rounds, so the packs are a convenience, not a wall.",
   "sources": [
    "https://dreamgames.helpshift.com/hc/en/3-royal-match/faq/8-using-boosters/",
    "https://oldcynic.com/royal-match-tips-and-tricks-cheats-for-new-players",
    "https://oldcynic.com/royal-match-free-coins-50k-on-f2p-account",
    "https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey",
    "https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis"
   ],
   "confidence": "medium"
  },
  {
   "game": "Reus / Dorfromantik (adjacency synergies)",
   "mechanic": "Bonuses from what sits next to what, plus a 'perfect placement' reward",
   "whatItIs": "Reus is a planet-shaping game: giants create biomes (forest, swamp, desert), you place resources, villages appear, and every producer has a synergy with another producer. Placing a pit viper (+5 wealth) next to a critter unlocks an extra +15 wealth in Reus 2. Dorfromantik has tiles with edge terrains; when all 6 edges match neighbors it's a 'perfect placement', the tile lights up and you immediately get an extra tile. Quests show as outlines in the distance and unlock new tile designs.",
   "lesson": "Adjacency is the cleanest synergy for a spatial game. It needs no new UI beyond a highlight, players see it with their eyes, and it turns 'characters' into things whose placement matters. A 'perfect' bonus rewards tidy play, not just big play.",
   "applyIdea": "Neighbors and Perfect Landing. The planet is a ring of 24 sectors, so every sector has exactly two neighbors. (1) Friend pairs: authored species pairs like Otter + Beaver (Dam Buddies) or Bee + Meadow Fox that give a Harmony bonus and a small Homeworld production boost when they live in adjacent sectors. The Lifebook shows a 'likes' line per species, and the throw preview highlights sectors that would complete a pair. That directly answers 'what is the point of the characters'. (2) Perfect Landing: if a throw leaves the landing sector and both neighbors in matching or compatible biomes, the game grants +1 throw once per round (Dorfromantik style). Quests: optional 'Neighbors' goals from planet 6 goal set ('Seat 2 Friend Pairs'), solved by greedyPlan like other goals. Free, deterministic.",
   "sources": [
    "https://firesquid.games/wikis/reus-2",
    "https://game-wisdom.com/analysis/reus-terraforming-strategy",
    "https://en.wikipedia.org/wiki/Dorfromantik",
    "https://www.switchbladegaming.com/cozy-games/dorfromantik-guide/",
    "https://9puz.com/2589-dorfromantik-guide/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Candy Crush / Two Dots / Royal Match (spreading hazards and obstacles)",
   "mechanic": "A hazard that spreads each turn you ignore it, with a counter-blocker and a readable 'contained' state",
   "whatItIs": "Candy Crush chocolate spawns a new square for every move that doesn't clear it; liquorice swirls and pancakes stop it from spreading, so blockers are also level-design tools. Two Dots fire spreads to an adjacent dot each move unless you match beside it or catch it in an explosion, and difficulty comes from combining obstacles (fire + anchors is notoriously hard). Royal Match's production obstacles (mailbox, top hat) shut off once enough material is produced, and the game tells you when you can stop matching next to them, so you don't have to count.",
   "lesson": "Spreading hazards create urgency without a timer: the clock is the board. The recipe is a visible spread rule, a counter the player owns, a state that visibly stops ('contained'), and difficulty by combining two hazards, not by adding a third mechanic. Introduce one hazard at a time (Two Dots waited until level 61 for fire).",
   "applyIdea": "Creep Hazards, gentle and toy-like, no lose-your-stuff punishment. Wildfire: after every 2 throws, a Scorched sector adds +1 heat to a neighbor unless that neighbor is Soaked or water >= 2 (natural firebreak); shown as a flickering ring with a dotted arrow toward the next sector, one throw before it spreads. Deep Freeze: a frozen patch expands by one sector per 2 throws unless heated. Dust Drift: barren land spreads over green. Counters are the existing kinds (ice, storm, magma, sun), so no new objects are needed. When contained, the ring turns green and the HUD says 'Wildfire settled'. Limit to one hazard per planet at first, two after planet 30. Hazards can push a sector out of a species' habitat so it leaves (the game's settle() already returns a 'lost' list), which makes protection the stake, not stardust. Failure is always a free retry: no lives, no timers.",
   "sources": [
    "https://candycrush.fandom.com/wiki/Chocolate",
    "https://candycrush.fandom.com/wiki/Blocker",
    "https://candycrush.zendesk.com/hc/en-us/articles/360000754717-Which-Blockers-can-I-find-in-the-game",
    "https://twodots.fandom.com/wiki/Game_mechanics",
    "https://roseplusman.com/a-very-unofficial-guide-to-two-dots/two-dots-obstacles-fire/",
    "https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey"
   ],
   "confidence": "high"
  },
  {
   "game": "Into the Breach / Slay the Spire (telegraphed threats)",
   "mechanic": "Show every upcoming enemy action before the player commits",
   "whatItIs": "In Into the Breach, all enemy attacks are telegraphed in advance in a minimalist turn-based grid, so the player solves a puzzle with perfect information. The developers wanted less randomness than FTL and wanted every failure to feel like the player's own fault. Slay the Spire shows enemy intent icons above their heads so players can anticipate the next attack. (The search results confirmed the intent icons exist; the developers' stated rationale for them was not verified in what I could read.)",
   "lesson": "Hard is fine if it is fair and readable. Telegraphing turns randomness into information, which makes losses feel instructive rather than cheap, and lets a designer raise difficulty without raising frustration. It is especially good for kids and for waiting-room play, where a surprise fail feels unfair.",
   "applyIdea": "Forecast strip: a thin row under the HUD listing the next 2 hazard beats in icons, e.g. 'Comet in 2 throws at the amber sector', 'Heat wave next throw'. Hazard schedules are generated from the level seed, so they are deterministic, greedyPlan can simulate them, and the star targets stay provably beatable (the existing feasibility tests keep working). Reuse the same forecast format for the Daily 'Weather Report' seeded by date, so a shared daily planet has the same storms for everyone. No RNG hazards ever fire without a forecast. Accessibility: each forecast has an icon shape plus color, and a text tooltip for color-blind players.",
   "sources": [
    "https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-",
    "https://subsetgames.com/presskit/sheet.php?p=into_the_breach",
    "https://gameinformer.com/games/into_the_breach/b/pc/archive/2018/02/26/game-informer-review-into-the-breach.aspx",
    "https://www.gamedeveloper.com/game-platforms/watch-casey-yano-break-down-the-design-decisions-behind-i-slay-the-spire-i-"
   ],
   "confidence": "medium"
  },
  {
   "game": "Plants vs. Zombies / Pikmin (enemy types as locks, creatures as keys)",
   "mechanic": "Each hazard or enemy type teaches exactly one counter, and each unit type has fixed immunities",
   "whatItIs": "PvZ's Night zombies each teach a different answer: the Pole Vaulting Zombie jumps the first plant (so a Tall-nut stops it), the Newspaper Zombie hides behind a shield that some plants bypass, and the Screen Door Zombie needs penetrating attacks. Pikmin does it with creature types: Red is immune to fire, Yellow to electricity, White to poison, Blue moves through water, and Glow Pikmin is immune to all four, with Purple as a strong, slow all-rounder. Hazard = lock; creature type = key.",
   "lesson": "A small roster of hazards, each with one clear counter, teaches strategy without text. Giving every unit a distinct immunity or role means a collection matters to play, not just to display. Introduce them one at a time with a low-stakes first encounter.",
   "applyIdea": "Give the 36 species a job. Each species gets one of 5 traits: Fire-proof, Frost-proof, Drought-proof, Storm-proof, Steady (ignores wind). A Fire-proof Lava Newt survives a Wildfire and can act as a Fire Warden that blocks the spread on its sector; a Frost-proof Snow Owl keeps a sector from freezing further. The Lifebook shows each species' trait badge and a 'Best against' line. A hazard roster of 5-6, each with one counter object: Wildfire (ice or storm), Deep Freeze (magma or sun), Dust Drift (seed or storm), Flood (magma or rock), Meteor Shower (rock to build a shield ridge), Gale (Wind twist, 'Steady' species). One new hazard per ~5 planets with a solo teaching planet. Collection then feeds strategy: players choose which Buddy to bring based on the planet forecast. The traits are free and unlocked by play, and cosmetics remain the only paid layer.",
   "sources": [
    "https://strategywiki.org/wiki/Plants_vs._Zombies/Zombies",
    "https://www.pikminwiki.com/Hazard",
    "https://tvtropes.org/pmwiki/pmwiki.php/Characters/PlantsVsZombies1Zombies"
   ],
   "confidence": "high"
  },
  {
   "game": "Hades (Pact of Punishment / Heat) and Vampire Survivors (Curse)",
   "mechanic": "Player-chosen, stackable difficulty modifiers with proportional rewards",
   "whatItIs": "After beating Hades, the Pact of Punishment offers 15 modifiers, each with ranks that add Heat points. Heat makes enemies tougher, adds new abilities or hazards, or adds restrictions such as time limits. The maximum theoretical Heat is 64. Bounties pay out for bosses beaten at or above a target Heat, and Heat 5, 10 and 15 gate access to later biomes. Because modifiers are modular and combinable, difficulty is personalized instead of a single Easy/Hard toggle. Vampire Survivors' Curse stat buffs enemy speed, health and spawn rate (base 100%) but also produces more experience gems, so risk and reward are coupled.",
   "lesson": "Move negative interactions into opt-in dials where each dial has a visible cost and a visible payout. Modularity lets one player tune to 'a little harder' and another to 'brutal'. Reward the challenge with status and cosmetics, not power the base game needs. Cap the total so a run stays bounded.",
   "applyIdea": "Weather Dial, a post-clear replay option on any 3-star planet. The player picks up to 3 of about 8 modifiers, each worth 1-2 Heat: Solar Wind, Fast Spin, Tiny World, Fewer Throws (-1), Fog of Aim (shorter preview), Hazard Fast (spread every throw), Sticky Fusion (Fusion window shrinks), and Foggy Forecast (only 1 beat shown). Most map to existing TWISTS, so they are cheap to build. Payout: a gold Heat pip on the planet, a Passport title and stickers at Heat 3/6/9, and a stardust bonus scaled by Heat; never a stronger consumable. Total Heat cap of 9 so rounds still land in 1-2 minutes. It slots in with the planned Remix mode (Remix stars). Optional, so young players are never forced into negatives; the mandatory campaign only ramps hazards with the forecast.",
   "sources": [
    "https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards",
    "https://www.gameskinny.com/tips/hades-pact-of-punishment-conditions-bounties-heat-explained/",
    "https://hadesguides.com/hades/guides/pact-of-punishment",
    "https://vampire.survivors.wiki/w/Curse"
   ],
   "confidence": "high"
  }
 ],
 "benchmarks": [
  {
   "metric": "Candy Crush special+special combo payoffs",
   "value": "Striped+Wrapped clears 3 rows and 3 columns (3x a Striped+Striped); Color Bomb+Color Bomb clears the entire board; Color Bomb+Striped converts a whole color to stripes",
   "source": "https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/ ; https://candycrush.zendesk.com/hc/en-us/articles/211939685-Creating-and-combining-Special-Candies"
  },
  {
   "metric": "Genshin gauge units per attack and decay",
   "value": "Attacks apply about 1, 1.5, 2, 4 or 8 gauge units; decay rate A/B/C = 9.5 / 6 / 4.25 seconds per unit; Vaporize/Melt amplify by 1.5x or 2.0x depending on which element triggers",
   "source": "https://genshin-impact.fandom.com/wiki/Elemental_Gauge_Theory ; https://www.thegamer.com/genshin-impact-elemental-reactions-ranked/"
  },
  {
   "metric": "Balatro multiplier stacking and sales",
   "value": "Two x3 jokers = x9, three = x27; over 5 million copies sold by January 2025",
   "source": "https://dood.gg/en/balatro/guides/scoring-guide/ ; https://www.gematsu.com/2025/01/balatro-sales-top-five-million"
  },
  {
   "metric": "Vampire Survivors evolution gate and sales",
   "value": "Weapon level 8 + matching passive + boss chest after the 10-minute mark; nearly 2 million copies in the first month of full release, about 6 million estimated on Steam",
   "source": "https://www.pcgamesn.com/vampire-survivors/weapon-evolutions ; https://levvvel.com/statistics/vampire-survivors/"
  },
  {
   "metric": "Survivor.io evolution gate",
   "value": "Weapon level 5 + required passive support skill + boss golden chest",
   "source": "https://www.bluestacks.com/blog/game-guides/survivor-io/sio-skills-evolution-guide-en.html"
  },
  {
   "metric": "Bloons TD 6 upgrade-tree cap",
   "value": "3 paths, tiers 0-5, only one path to tier 5 and one to tier 2 (5-2-0 rule)",
   "source": "https://bloons.fandom.com/wiki/Crosspathing ; https://mobilegamemaster.com/btd6-crosspathing-guide/"
  },
  {
   "metric": "Hades Pact of Punishment scale",
   "value": "15 unique modifiers, theoretical max Heat 64; Heat 5/10/15 unlock later biomes; boss bounties (Diamond, Ambrosia, Titan Blood) re-earnable per Heat point",
   "source": "https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards ; https://www.gameskinny.com/tips/hades-pact-of-punishment-conditions-bounties-heat-explained/"
  },
  {
   "metric": "Vampire Survivors Curse",
   "value": "Base 100%; raises enemy speed, health and spawn rate and increases XP opportunity (risk/reward)",
   "source": "https://vampire.survivors.wiki/w/Curse"
  },
  {
   "metric": "Angry Birds 2 card and meter design",
   "value": "3 cards visible at a time; the Destruct-O-Meter demands more destruction each time it fills; spells come from chests and offers; shuffle or extra cards can be bought with gems",
   "source": "https://angrybirds.fandom.com/wiki/Destruct-O-Meter ; https://angrybirds2.rovio.com/hc/en-us/articles/360000492848-What-are-the-cards-and-how-do-they-work-"
  },
  {
   "metric": "Peglin bomb and upgrade rules",
   "value": "Bomb detonates on the second hit for 50 damage to all enemies on screen; Upgrade adds a flat bonus not affected by damage or crit modifiers; Critical Peg applies retroactively to the whole chain",
   "source": "https://peglin.wiki.gg/wiki/Critical_Peg ; https://peglin.wiki.gg/wiki/Upgrade"
  },
  {
   "metric": "Two Dots hazard pacing",
   "value": "Fire introduced at level 61 and spreads each move unless matched beside or exploded; Ice takes 3 hits",
   "source": "https://roseplusman.com/a-very-unofficial-guide-to-two-dots/two-dots-obstacles-fire/ ; https://twodots.fandom.com/wiki/Game_mechanics"
  },
  {
   "metric": "Dorfromantik perfect placement",
   "value": "All 6 tile edges match neighbors = 'perfect placement', the tile lights up and grants an extra tile",
   "source": "https://en.wikipedia.org/wiki/Dorfromantik ; https://www.switchbladegaming.com/cozy-games/dorfromantik-guide/"
  },
  {
   "metric": "Reus 2 adjacency synergy example",
   "value": "Pit viper gives +5 wealth; placed next to a critter it unlocks an extra +15 wealth",
   "source": "https://firesquid.games/wikis/reus-2"
  },
  {
   "metric": "Pikmin hazard/immunity matrix",
   "value": "4 hazards (fire, water, electric, poison) each with a matching immune type (Red, Blue, Yellow, White); Glow Pikmin immune to all four",
   "source": "https://www.pikminwiki.com/Hazard"
  },
  {
   "metric": "Royal Match free booster flow (third-party estimate)",
   "value": "Events pay roughly 10,000-15,000 coins each; Team Battle wins about 6,000 coins; boosters split into pre-game and in-game types",
   "source": "https://oldcynic.com/royal-match-tips-and-tricks-cheats-for-new-players ; https://oldcynic.com/royal-match-free-coins-50k-on-f2p-account ; https://dreamgames.helpshift.com/hc/en/3-royal-match/faq/8-using-boosters/"
  },
  {
   "metric": "Match-3 market scale (search summary, not a primary source)",
   "value": "Royal Match reported over $1.4B IAP revenue and Candy Crush Saga over $1.1B in 2025",
   "source": "https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis ; https://www.blog.udonis.co/mobile-marketing/mobile-games/candy-crush"
  },
  {
   "metric": "Research-method caveat",
   "value": "WebFetch was blocked by the network proxy for fandom wikis, gamedeveloper.com, deconstructoroffun.com, gamepressure.com and others. Every claim above comes from WebSearch result snippets, so treat numbers as leads to verify before quoting externally. Confidence is marked medium where a claim rested on a single community wiki or third-party site, and the Slay the Spire intent-icon rationale specifically was not confirmed.",
   "source": "n/a (methodology note)"
  }
 ]
}
```

### Research: what gives a base-builder its purpose

```json
{
 "findings": [
  {
   "game": "Clash of Clans",
   "mechanic": "Town Hall as the single progress gate; lab, army and heroes before defenses; storage caps",
   "whatItIs": "Core-to-meta: attacks earn gold, elixir and dark elixir. Those pay for upgrades, and the Town Hall is the one building that opens new buildings, higher building levels, troops and defenses. Meta-to-core: army camps, the Laboratory and heroes decide which troops you can field, so every spend changes the next attack. Priority guides consistently say to upgrade offense first (Laboratory, army camps, Clan Castle, heroes) and defenses later, because long-term progress comes from repeated offensive success. Visibility: the Town Hall level is one big number everyone reads as 'how far you are'. Storage capacity and a loot cap tied to Town Hall level keep hoarding and loss bounded, and a separate Treasury protects bonus loot.",
   "lesson": "A base has a point when every rung of the ladder has a named input from the core loop and a felt output in the next round, and when one gate number collapses all the sub-systems into a single visible level. Stardust alone is not a purpose. It only means something when it is the price of a rung that changes how the next shot plays. Caps and gates set the pacing. Timers are only one way to pace, and Pocket Planet has to use the others.",
   "applyIdea": "Make Homeworld Ring the one gate number and show it on the Home screen and the Passport. Each ring requires a named core-loop 'signature feat' (for example 'grow 3 different biomes on one planet' or 'clear a Hard planet') in addition to a stardust price, so stardust is fuel and the feat is the real gate. Every Homeworld building must pay out as a felt shot-level change, and each one needs a one-line 'what changes in your next throw' preview: Object Lab already upgrades shots, so add a Launch Tower that adds a visible extra aim-preview bounce, and an Observatory that shows one extra landing-preview dot. Keep the existing producer caps (check in 2-3 times a day). Paid gems never buy a ring. Rings open only through play, and all previews are free.",
   "sources": [
    "https://clashofclans.fandom.com/wiki/Town_Hall",
    "https://www.clashos.in/guides/clash-of-clans-upgrade-guide.html",
    "https://houseofclashers.com/home-village/strategy-guide/loot-calculation",
    "https://clashofclans.fandom.com/wiki/Treasury"
   ],
   "confidence": "medium"
  },
  {
   "game": "Clash of Clans: Builder Base",
   "mechanic": "Frictionless attack side, friction only on the upgrade side",
   "whatItIs": "Supercell's second base has a loop of attack with troops, get resources, upgrade troops, then level the Builder Hall. Troops cost no resources and retrain automatically after each battle (about 1 minute per army camp, at most 5 minutes for all camps), so you can attack again straight away. The Deconstructor of Fun analysis credits this removal of resource and timer friction with letting players focus on attack strategy without fear of wasting resources. Upgrade timers and costs stay on the base side. Progress is visible as troop levels, Builder Hall level and star or trophy counts.",
   "lesson": "The core action should carry zero setup cost, and any waiting belongs on the meta side, where the player is not blocked from playing. This matches a waiting-room game: open, fling, feel good. Meta friction should never sit in front of the next round.",
   "applyIdea": "Codify a 'no round tax' rule for the whole roadmap. Starting a round never consumes a resource, a booster charge or a timer. Every meta cost (rings, upgrades, restorations) is paid from rewards the round has already returned. Boosters stay optional pre-round choices. All Homeworld waiting is background time the player never has to sit through, and campaign wins speed active builds up (already built) instead of gems. Show a small 'next round is free, always' line in the parent-facing store text, and use it as an onboarding promise.",
   "sources": [
    "https://www.deconstructoroffun.com/blog/2017/6/18/the-good-bad-ugly-of-clash-of-clans-builder-base",
    "https://www.pocketgamer.biz/deconstructing-clash-of-clans-the-builder-base/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Royal Match",
   "mechanic": "One unbuyable star per level spent on a deliberately light castle-decoration meta",
   "whatItIs": "Core-to-meta: each completed level pays one star. Stars cannot be purchased, so the only way to advance the castle is to play. The stars are spent on pre-set decoration tasks in static rooms, each task costs one or more stars, and finishing every task in an area gives an Area Chest and unlocks the next area. Meta-to-core: the meta is a brief rewarding interlude that leads straight back into the puzzle, and it never overshadows the core. Dream Games reportedly A/B/C tested a no-meta variant (a permanent castle background) and an episode meta (a background that changes after a set number of levels) against the light decoration system before settling on it. Progress is visible as a room that visibly changes for a given star spend.",
   "lesson": "Test how heavy the meta should be. The winner was the lightest one that still gave a reason to play beyond the next level. A meta is a sink for a scarce, unbuyable token with a pre-authored, visible payoff. It does not need economy depth to work. The same source notes that most puzzle players seek relaxation, which argues against piling systems on.",
   "applyIdea": "Pocket Planet already pays 1-3 level stars, so give them a job with a visible before and after. Add a Restoration list per Homeworld ring: 5-6 authored tasks that cost level stars (never gems), each visibly transforming part of the planet (a dry crater becomes a pond, a bare ridge becomes an orchard), and a free deterministic 'Area Chest' whose contents are shown before you finish. Add an analytics flag so the team can A/B a light meta against the current fuller Homeworld: measure D1, D7 and D30, sessions per day and round completion, and run the test for kid-safe cohorts only in aggregate, with no per-child profiling.",
   "sources": [
    "https://royalmatch.fandom.com/wiki/Stars_%26_Tasks",
    "https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/",
    "https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b"
   ],
   "confidence": "medium"
  },
  {
   "game": "Homescapes / Gardenscapes",
   "mechanic": "Stars fund renovation tasks with a choice of options, wrapped in a serialized story with cliffhangers",
   "whatItIs": "Core-to-meta: beating a match-3 level pays a star (and coins), and stars are needed to complete tasks and move the story forward. Each renovation task offers several options to choose from (stairs, door, flooring, wallpaper), which makes the home personal. Meta-to-core: the motivation to play the next level is to find out what happens to the characters. Analyses call the cliffhanger structure a retention and monetization hook, because some players will pay to see the story move faster. Progress is visible as rooms and areas that change, plus a story that advances.",
   "lesson": "Characters matter when they want something and the player's play visibly moves their story. The 'pay to find out what happens' hook is exactly the monetization pattern this project has to avoid. The kid-safe substitute is that the story only ever advances through play and costs nothing, with paid content limited to fixed-price, previewable cosmetics.",
   "applyIdea": "Give each species a 3-beat mini-arc in the Lifebook and Homeworld, driven by one string template rather than 36 hand-written scripts: beat 1 'wants {land}', beat 2 'asks for {item}', beat 3 'throws a party' with a small cosmetic reward. Beats advance from things the player already does (sightings, spending level stars, friendship). Offer a two-way aesthetic choice at each beat (both options free, both previewable) so the planet feels personal. Use the existing translation pipeline with placeholders so five locales stay cheap, and draw beats as picture panels rather than long text, which suits readers aged 6+.",
   "sources": [
    "https://www.blog.udonis.co/mobile-marketing/mobile-games/homescapes-monetization",
    "https://gardenscapes.fandom.com/wiki/Lives,_Stars_and_Coins",
    "https://playrix.helpshift.com/hc/en/14-homescapes/section/148-tasks-areas/?s=match-3-elements&f=portals&p=ios"
   ],
   "confidence": "medium"
  },
  {
   "game": "Hay Day / Township",
   "mechanic": "Orders give production a purpose; storage caps and population caps are the throttles",
   "whatItIs": "Core-to-meta: the loop is grow crops, process them in machines, fill orders (trucks, boats, planes, trains), and earn coins and XP. Orders are the demand that makes production meaningful, and high-value orders give large XP. Meta-to-core: XP level-ups unlock new crops, animals, machines and decorations, and in Township community buildings raise the population cap (a town starts at 75) so more housing and factories can be built. Storage is a hard throttle: in Hay Day a full silo stops crops and a full barn stops machine output until you upgrade storage. Progress is visible as a growing farm or town and as unlock tables by level.",
   "lesson": "Production without demand is just a counter. Orders that ask for the outputs of the core loop give every core action a destination. Caps (storage, population) are what make it a decision rather than a click. Their paid skips (skipping wait time or a full storage) are the mechanic to leave out.",
   "applyIdea": "Add a deterministic date-seeded 'Order Board' on the Homeworld (no server; generated from the date like dailies) with 3 slots, unlocked by Critter Den count. Orders ask for things the core loop already produces, such as 'spot 2 new creatures in Meadow', 'clear a planet with a Storm shot combo' or 'finish a level with a storm and an ice hit'. Rewards are shown up front, there is no timer, and there is no paid refresh. A skipped order is simply replaced tomorrow. Producers and orders together give players a reason to open the Homeworld once or twice a day. Cap the board so a missed day is never a loss (nothing expires that was already earned).",
   "sources": [
    "https://www.gamedeveloper.com/business/game-monetization-design-analysis-of-hay-day",
    "https://hayday.fandom.com/wiki/Storage_Buildings",
    "https://support.supercell.com/hay-day/en/articles/silo-barn-tackle-box.html",
    "https://township.fandom.com/wiki/Community_Buildings",
    "https://mwgamers.com/blog/township-guide-2025/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Neko Atsume",
   "mechanic": "Player steers who visits with placed food and goodies; visits happen while the app is closed",
   "whatItIs": "Core-to-meta: there is no core loop; the whole game is a yard, and tips (silver and gold fish) come from cats that visited. Meta: you choose food and goodies (toys and furniture) and place them; every goody suits several Regular Cats (52 of them), while the 36 Rare Cats have specific preferred goodies and appear more often with pricier food and goodies. Cats visit only while the app is closed, and food works as an unlabelled timer, so players check back more often to see more. Progress is visible as a cat collection book, and the emotional payoff is seeing a cat, with the fish being a means to an end. There is no end game.",
   "lesson": "The meta is the pull when the payoff is seeing a character do something adorable, and the player has a legible lever over which characters appear. Studies of idle-game engagement note that checking frequency and habit matter more than time spent. Note that rare-cat appearance in the original is probabilistic. It is free there, but it would be a gambling-adjacent pattern beside real-money purchases, so the design idea must be borrowed deterministically.",
   "applyIdea": "Add 'Lures' to the Homeworld: place one free land patch and one goody per Den, and the seeded schedule (date plus placement) deterministically decides which species stops by while the app is closed. Each species' liking is discoverable in the Lifebook ('Foxes like Meadow and lanterns'), so players plan rather than gamble. The visit is shown as a 'guest at the door' card with a tip of stardust and a postcard. This gives the 36 species a point beyond the album: they are the reason to arrange the planet. Never sell lures for real money. Keep them stardust-priced and previewed.",
   "sources": [
    "https://alexiamandeville.medium.com/game-design-breakdown-the-simplicity-of-neko-atsume-a8616a937a47",
    "https://nekoatsume.fandom.com/wiki/Cats",
    "https://nekoatsume.fandom.com/wiki/Rare_Cats_Guide",
    "https://eprints.whiterose.ac.uk/135461/1/BusyDoingNothingWhatDoPlayersDoInIdleGames.pdf"
   ],
   "confidence": "medium"
  },
  {
   "game": "Cats & Soup",
   "mechanic": "Collected characters staff stations and earn while you are away; you come back to collect and invest",
   "whatItIs": "Core-to-meta: the idle kitchen has cats working at stations (soup, juice, grill) and earning gold offline; you return to collect and spend gold on upgrades and new stations. Meta-to-core: there is no separate skill loop, so the meta is the game, with cats each having unique abilities. Collectibles include cats, food items, equipment, furniture and skins, and cats can be dressed and photographed. Progress is visible as new stations and a fuller, cuter kitchen, with cats in costumes.",
   "lesson": "Characters get a job. A character with an ability at a station is more than a collectible, and when it also has a cosmetic layer (costumes, photos) it becomes both useful and expressive. Offline earnings are the friendly return-visit hook when they are capped instead of decaying.",
   "applyIdea": "Give residents an explicit job and a one-line ability so 'the characters' have a purpose beyond the album. A resident stationed at a Mill/Greenhouse/Grove adds a small, stated production bonus or a shot-level perk. Species affinity (for example a Meadow species at the Greenhouse) creates a small synergy, and a mismatched pairing just gives no bonus (never a penalty that punishes a child). The Workshop already has cosmetics; extend it so a costume is purely cosmetic and previewable, and capture 'photo mode' for resident portraits that can be shared as a sticker, with the parental gate on sharing.",
   "sources": [
    "https://mechanicsofmagic.com/2024/04/06/mda-cats-and-soup/",
    "https://dev.to/jpdengler/exploring-the-charming-uiux-design-of-catssoup-3l9a",
    "https://apps.fandom.com/wiki/Cats_and_Soup"
   ],
   "confidence": "medium"
  },
  {
   "game": "Cookie Run: Kingdom",
   "mechanic": "Kingdom produces the materials that level battle characters; landmarks give passive battle stats; castle level gates",
   "whatItIs": "Core-to-meta: battles pay rewards and unlock content, while the kingdom side runs production. Raw-material buildings feed craft buildings, goods fill train orders, and the train pays back coins, EXP and Rarities. Meta-to-core: Cookie Houses make EXP Star Jellies used to level cookies (about one Lv.1 jelly per 5 minutes at level 1, and each upgrade doubles the cap), landmarks give passive ATK, DEF and HP bonuses that apply in battle, and a higher castle level allows more and better houses. Neglecting the kingdom starves cookie levelling. Analysts describe a split in which the simulation layer drives growth and early retention, and the battle and collection layer drives mid and late retention and monetization. The game's much-criticised Ancient+ update, which forced players to re-summon characters they had already maxed out, shows the cost of using the meta to reset player investment.",
   "lesson": "The strongest coupling is a direct material flow: the base produces the exact thing that levels the characters used in the core loop, plus small passive bonuses that show up in play. But monetizing that flow through random pulls and invalidating earned progress is a trust-breaker that kid-safe design must avoid outright.",
   "applyIdea": "Make the Homeworld the level-up source for shot types. A Greenhouse or Crystal Grove produces 'Shot Essence' for each of the six objects, spent (stardust plus essence, deterministic and previewable) to level that shot's synergy effects from the Object Lab. Add 2-3 landmark decorations with a bounded passive perk that applies in levels (for example 'Moon Lantern: +1 aim-preview bounce on Night planets'), capped so star targets remain feasible under the existing greedyPlan simulation. Never gacha the shots and never reset earned levels. Publish a promise that earned upgrades are permanent.",
   "sources": [
    "https://www.deconstructoroffun.com/blog/2022/4/24/cookie-run-kingdom",
    "https://naavik.co/game-deconstruction/cookie-run-kingdom/",
    "https://cookierunkingdom.fandom.com/wiki/Cookie_Upgrading",
    "https://gamerant.com/cookie-run-kingdom-how-get-more-star-jelly/",
    "https://www.levelwinner.com/cookie-run-kingdom-progression-and-battle-guide-everything-you-need-to-know/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Monopoly GO",
   "mechanic": "Building sets (5 landmarks per board) plus a Net Worth number that unlocks permanent buffs",
   "whatItIs": "Core-to-meta: rolling dice around the board earns cash, which is spent to build and upgrade landmarks (each board has 5, each landmark has 6 levels, and completing one gives roughly 10-20 dice). Completing the set gives the biggest rewards and moves you to the next board. Upgrades also raise Net Worth, which unlocks permanent buffs such as larger shield capacity, better daily login rewards and higher starting cash. Houses produced by landmark upgrades land on property tiles and merge into hotels, and completing a colour set lights it up. Meta-to-core: rewards are more dice (more core attempts), so the meta feeds the core loop directly. Progress is visible through five buildings that visibly level up, colour sets that light up and boards that change.",
   "lesson": "A small fixed set of items with a clear 'set complete' moment beats an open-ended tree for pacing, and a single accumulating score that unlocks permanent perks makes every purchase feel like it counts. The dark side is that the dice function as energy, random outcomes drive spending, and social attack or steal mechanics and event-token pressure are all excluded by this project's rules.",
   "applyIdea": "Introduce 'Planet Radiance', one visible number built from all Homeworld structures, rings and restorations. Radiance thresholds unlock permanent, bounded, sidegrade perks that change how a round plays (an extra preview dot, a starting sparkle on one shot type) and never add throws or bypass star targets. Group buildings into 5-piece 'sets' per ring and show a set-complete celebration animation (no gambling framing, no spin wheels, no dice). Skip the social steal layer entirely. Retro-fit Star Atlas constellations to count toward Radiance so existing content gains a reason to exist.",
   "sources": [
    "https://gamesalchemy.substack.com/p/54-deconstructing-monopoly-go-through",
    "https://pocketgamer.biz/feature/82065/deconstructing-monopoly-go",
    "https://theriagames.com/guide/monopoly-go-landmark-guide/",
    "https://gamerant.com/monopoly-go-tips-for-completing-boards/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Merge Mansion",
   "mechanic": "The meta consumes specific items produced on the core board, plus a serialized mystery",
   "whatItIs": "Core-to-meta: instead of paying with a generic currency, renovation tasks require named items that come from the merge board (for example garden gloves, screws, a shovel). Once all the required items exist on the board you fulfill the order and return to the renovation layer. Orders tied to a task are the same for every player. Meta-to-core: the task list tells the player what to build next on the board, so the meta steers core play, while spawning costs energy that limits sessions (an energy mechanic this project must not copy). A second narrative layer unfolds a mansion mystery with periodic story events that end on cliffhangers. Progress is visible as unlocked areas of the mansion and story beats.",
   "lesson": "When the meta asks for particular outputs of the core loop, every core action gets a meta meaning and players self-direct their play (which is what the owner means by 'the point of the game'). This works without energy. It only needs the ask to be legible and achievable in a session or two.",
   "applyIdea": "Turn Homeworld builds into 'Commissions' that require named core feats instead of a generic stardust price: 'Build the Greenhouse: spot 2 forest creatures and land 3 Seed hits in a row.' Feats double as tutorials for the new synergy system (combos, elemental pairings, hazards), so the meta teaches the deeper core without a tutorial screen. Keep feats achievable in 2-3 rounds, show progress as a small pip bar on the Home screen, and keep stardust as a smaller top-up cost. This directly answers 'what is stardust for': it finishes the job, while feats decide what to play.",
   "sources": [
    "https://www.blog.udonis.co/mobile-marketing/mobile-games/merge-mansion-monetization",
    "https://merge-mansion.fandom.com/wiki/Tasks",
    "https://balancy.co/blog/2023/04/25/how-to-set-up-liveops-in-merge-games-case-merge-mansion/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Pikmin Bloom",
   "mechanic": "A meta that rewards behavior you already do, and records it as a visible trail and postcards",
   "whatItIs": "Core-to-meta: walking (steps synced from Apple Health or Google Fit) grows seedlings, which the player raises and feeds with nectar to make flowers bloom. The petals are used to plant flowers along your route as you walk, leaving a colourful trail on the map. Meta-to-core: Pikmin bring back postcards from expeditions, more than 600 kinds of Decor Pikmin take on costumes based on where their seedling was found, and weekly step and flower-planting challenges can be joined with up to 4 friends or strangers. Progress is visible as trails on the map, a postcard collection and a Pikmin roster.",
   "lesson": "The meta doesn't have to add a new activity. It can turn something the player already does into a keepsake. Memory artifacts (postcards, trails, costumes tied to where you were) are progress visualization that is personal and shareable, and they cost nothing to give away.",
   "applyIdea": "Add a 'Postcard Wall' to the Homeworld: every 3-star finish stamps a small painted postcard of that planet's final landscape (reuse the code-drawn art from drawSticker), and each planet keeps its best. The wall shows a season's worth of play at a glance, and a postcard can be shared through the parental-gated share sheet. A weekly cooperative goal can be simulated without a server (Buddy and neighbours 'plant' toward a seeded target using the player's own weekly stars), so nobody depends on other people to see it fill. Postcards cost no money and have no randomness.",
   "sources": [
    "https://www.pikminwiki.com/Pikmin_Bloom",
    "https://www.nintendolife.com/reviews/mobile/pikmin-bloom",
    "https://pikminbloom.com/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Pokemon GO",
   "mechanic": "Buddy system: one chosen companion, capped daily hearts, four tiers, a small battle boost at the top tier",
   "whatItIs": "Core-to-meta: walking with a buddy earns candy (the walking distance depends on species, and an Excited mood halves it), and playing with it earns hearts. Meta-to-core: hearts pass through tier thresholds (Good at 1, Great at 70, Ultra at 150, Best at 300), with up to 10 hearts a day (20 when Excited). Souvenirs appear as cosmetics at Ultra, and Best Buddy gives a CP boost worth about one level in raids, gyms and battles, but only while that Pokemon is your buddy. Mood decays over time and resets when you swap buddies. Progress is visible through a heart meter, tier badges and the buddy's presence on the map. Community guidance notes that shorter feedback loops (a 1 km buddy versus a 5 km buddy) are better for habit formation.",
   "lesson": "A relationship with one chosen character gives the meta an emotional purpose. A daily cap turns it into a habit rather than a grind, and a small permanent power benefit at the top tier connects the bond back to the core. Mood decay is the part to soften: punishing absence is not kid-safe.",
   "applyIdea": "Extend the existing Buddy so it has a heart meter with a daily cap (10 hearts, earned from rounds played with that buddy) and 4 tiers. At Ultra the buddy gives a cosmetic souvenir; at Best Buddy it gives a bounded 'affinity' perk: on planets containing its favourite land, one of its preferred shot types gets a small bonus (for example a wider sparkle radius). Replace decay with a positive-only 'Excited' state on the first round of a new day (double hearts) so there is no penalty for missing days. Make the perk apply to the Remix and Hard planets too, tested under greedyPlan so star targets stay feasible.",
   "sources": [
    "https://pokemongohub.net/post/guide/buddy-adventure-guide-everything-you-need-to-know/",
    "https://pokemongo.fandom.com/wiki/Buddy_Pok%C3%A9mon",
    "https://nintendocentral.com/are-buddy-pokemon-coming-to-pokemon-go/",
    "https://www.pokemon.com/us/strategy/tips-to-make-the-most-of-buddy-adventure-in-pokemon-go"
   ],
   "confidence": "high"
  }
 ],
 "benchmarks": [
  {
   "metric": "Research method caveat",
   "value": "WebFetch was blocked for every host tried (gamedeveloper.com, deconstructoroffun.com, pocketgamer.biz, naavik.co, medium.com, fandom wikis, substack), so every finding rests on WebSearch result snippets, not full-page reads. Named numbers come from those snippets and should be re-verified before they go into a deck or a public document.",
   "source": "n/a (session tool limits)"
  },
  {
   "metric": "Clash of Clans lifetime in-app revenue",
   "value": "About $5.8B as of January 2025; about $253.9M in 2025; roughly 95-106M monthly players",
   "source": "https://www.statista.com/statistics/557510/clash-of-clans-and-clash-royale-sales-revenue/ ; https://www.businessofapps.com/data/clash-of-clans-statistics/"
  },
  {
   "metric": "Clash of Clans engagement",
   "value": "Average player opens the app about 4 times a day for about 13 minutes per session; Dec 2024 peak of about 105.9M MAU and 29M DAU",
   "source": "https://levvvel.com/statistics/clash-of-clans/ ; https://www.businessofapps.com/data/clash-of-clans-statistics/"
  },
  {
   "metric": "Clash of Clans Builder Base attack friction",
   "value": "Troops cost no resources and retrain automatically; each army camp refreshes in 1 minute, at most 5 minutes for all camps",
   "source": "https://www.deconstructoroffun.com/blog/2017/6/18/the-good-bad-ugly-of-clash-of-clans-builder-base"
  },
  {
   "metric": "Royal Match revenue",
   "value": "About $1.4B in 2024 (+56% year on year), over $3B lifetime; 51% of all match-3 IAP revenue in 2024",
   "source": "https://www.businessofapps.com/data/royal-match-statistics/ ; https://mobilegamer.biz/dream-games-royal-match-has-passed-3bn-says-appfigures/ ; https://www.pocketgamer.biz/royal-match-earned-51-of-all-match-3-revenue-in-2024/"
  },
  {
   "metric": "Royal Match meta rules",
   "value": "1 star per completed level, stars are not purchasable, all tasks in an area give an Area Chest and unlock the next area; meta variants (no meta, episode meta, light decoration) were A/B/C tested and the light decoration won",
   "source": "https://royalmatch.fandom.com/wiki/Stars_%26_Tasks ; https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/"
  },
  {
   "metric": "Homescapes revenue",
   "value": "Passed $1B lifetime at about $4.60 per download (2019); first-year revenue about $420M; reported about $6B lifetime spend in later coverage",
   "source": "https://www.pocketgamer.biz/playrix-homescapes-1-billion-dollars-lifetime-revenue/ ; https://sensortower.com/blog/homescapes-revenue ; https://www.gamigion.com/homescapes-reaches-6b-in-lifetime-user-spending/"
  },
  {
   "metric": "Gardenscapes revenue",
   "value": "About $436M in 2025, about $4.47B lifetime in the latest coverage found",
   "source": "https://www.blog.udonis.co/statistics/gardenscapes"
  },
  {
   "metric": "Monopoly GO scale and set size",
   "value": "Passed $2B in revenue; 5 landmarks per board, roughly 10-20 dice per completed landmark, so about 50-100 dice per board from landmarks alone",
   "source": "https://pocketgamer.biz/feature/82065/deconstructing-monopoly-go ; https://theriagames.com/guide/monopoly-go-landmark-guide/ ; https://gamerant.com/monopoly-go-tips-for-completing-boards/"
  },
  {
   "metric": "Pokemon GO buddy tiers",
   "value": "Hearts to reach Good/Great/Ultra/Best: 1/70/150/300; daily heart cap 10 (20 when Excited); Best Buddy boost about one CP level",
   "source": "https://pokemongohub.net/post/guide/buddy-adventure-guide-everything-you-need-to-know/ ; https://pokemongo.fandom.com/wiki/Buddy_Pok%C3%A9mon"
  },
  {
   "metric": "Pikmin Bloom early traction and content depth",
   "value": "2 million downloads in two weeks (about 864,000 from Japan); 600+ types of Decor Pikmin",
   "source": "https://www.shacknews.com/article/127676/pikmin-bloom-crosses-2-million-downloads ; https://www.pikminwiki.com/Pikmin_Bloom"
  },
  {
   "metric": "Neko Atsume collection size",
   "value": "88 cats across the games: 52 regular, 36 rare; cats visit only while the app is closed",
   "source": "https://nekoatsume.fandom.com/wiki/Cats"
  },
  {
   "metric": "Cookie Run: Kingdom production rates",
   "value": "Cookie House makes 1 Lv.1 EXP Star Jelly every 5 minutes at level 1 and each upgrade doubles its cap; battle-stat landmarks recommended to level 10",
   "source": "https://gamerant.com/cookie-run-kingdom-how-get-more-star-jelly/ ; https://www.levelwinner.com/cookie-run-kingdom-progression-and-battle-guide-everything-you-need-to-know/"
  },
  {
   "metric": "Township population and gating",
   "value": "Town starts with 75 population; community buildings raise the population cap; zoo unlocks at level 24; from level 60 new community buildings need special tools",
   "source": "https://township.fandom.com/wiki/Community_Buildings ; https://mwgamers.com/blog/township-guide-2025/"
  },
  {
   "metric": "Hybrid-casual model",
   "value": "Accessible core to acquire users, deeper meta to generate LTV (qualitative; no D30 uplift figure found in the sources reached)",
   "source": "https://thinkingdata.io/blog/breaking-down-the-evolution-of-hypercasual-mobile-games-to-hybridcasual/"
  }
 ]
}
```

### Research: kid-safe revenue levers and benchmarks

```json
{
 "findings": [
  {
   "game": "Toca Boca World (Spin Master)",
   "mechanic": "Fixed-price, previewable content-pack shop with no ads, no chat and no randomised items",
   "whatItIs": "A free-to-download creative sandbox for young kids. Revenue comes from real-money packs (locations, furniture packs, character-creator sets, themed bundles) at fixed prices from about $0.99 up to about $50, with bundles discounted against buying packs separately. It is single-player, COPPA-compliant and has no third-party ads. Estimates (AppRank, July 2026) put it near $8.0M a month, down from a $17M/month peak in 2021 and about $9M in Dec 2024. It is reported as about 82% of Toca Boca's revenue and about 50M MAU (Spin Master figure quoted by Naavik). Naavik's read: kids' monetisation is deliberately limited, whale-driven F2P is impossible, and the future is subscriptions that bundle safe IPs.",
   "lesson": "Kid-safe revenue scales with catalogue breadth, not depth per payer. It comes from many small, visible, identity-expressing products that a parent can understand at a glance. The peak-to-now decline shows the catalogue has to keep growing or revenue erodes as it ages.",
   "applyIdea": "Add Planet Packs, themed cosmetic bundles for Homeworld. Example: Coral Reef, with 6 building skins, 2 dyes, a resident accessory set, a Passport banner and a Sticker Album page. Fixed USD prices of $1.99, $2.99 and $4.99. Each pack opens a full-screen preview where the child tries it on their own Homeworld before anything is bought. Every pack has one free sampler item earned through play. Sell packs directly as non-consumables in real money, not via gems, which also avoids the virtual-currency issues in the EU finding below. A Lifebook wishlist lets a child tap 'Ask a grown-up' to share a pack image to a parent. Ship one new pack per festival month to keep the catalogue growing, since the sprites are already drawn per month.",
   "sources": [
    "https://apprank.io/toca-boca-world",
    "https://tracxn.com/d/companies/toca-boca/__FoVZSuNxXSouC5QHg0e-KVypgCPQR1F16mYAVu8vQ4g",
    "https://naavik.co/weekly-digest/the-future-of-kids-gaming/",
    "https://toca-life-world.fandom.com/wiki/Shop",
    "https://www.gamigion.com/toca-boca-hits-1b-in-user-spending/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Toca Boca Days (Spin Master)",
   "mechanic": "Kid-safe multiplayer live-service, shut down after a 16-month soft launch",
   "whatItIs": "Toca Boca's multiplayer kids game was soft-launched in markets such as Australia, New Zealand, Sweden and Canada. It was pulled from download and its servers went offline on 25 Aug 2025. The official reason was to 'focus on other areas'. Trade coverage links this to high user-acquisition cost and weaker-than-hoped returns, which is inference and not stated by Toca. Caution on the brief's premise: I found no evidence that Days had a subscription. The Toca subscription is Piknik (Toca Boca Jr plus Sago Mini apps), covered in the next finding. For context, Liftoff's 2025 casual report puts iOS CPI at $1.41 and D30 ROAS at 47%.",
   "lesson": "A server-backed kid-safe live-service carries ops and UA costs that the audience's limited spending cannot easily repay. Validate LTV before building anything that needs servers or paid growth.",
   "applyIdea": "Keep the 'Clash of Clans-style' pillar server-less. Use asynchronous, date-seeded social features: visit a seeded 'Neighbour Planet of the Day', or swap share codes. Do not build live multiplayer. Treat organic channels (Kids Category placement, Apple featuring, family word of mouth, share cards) as the growth engine. Judge every new meta system by whether it adds a sellable collection or household surface. Keep ownership derived from progress, as it is today, so a future offline 'Complete' edition or wind-down is cheap (see the Collector's Edition finding).",
   "sources": [
    "https://www.pocketgamer.biz/toca-boca-days-shuts-down-after-16-months-in-soft-launch/",
    "https://tocaboca.helpshift.com/hc/en/18-toca-boca-days/faq/260-discontinuation-of-toca-boca-days/?p=ios",
    "https://naavik.co/weekly-digest/the-future-of-kids-gaming/",
    "https://liftoff.ai/2025-casual-gaming-apps-report/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Piknik (Sago Mini / Toca Boca Jr), Pok Pok Playroom, Animal Crossing Pocket Camp Club, Pokemon Sleep",
   "mechanic": "Content-drop subscription, sold as legible tiers with a free trial",
   "whatItIs": "Piknik costs $11.99 a month with a 30-day free-trial promotion and bundles about seven preschool apps. Sago Mini reports subscribers in key international markets up 80% YoY, and about a 31% conversion lift from testing trial length and onboarding. Pok Pok Playroom is $6.99 a month or $45.99 a year after a 7-day trial, with App Store tiers up to a $89.99 lifetime. Pocket Camp Club sold three tiers at $0.99, $2.99 and $7.99, about $12 for all of them. Pokemon Sleep Premium is about $10 a month or $50 for six months, and the game made over $100M in its first year. Apple 3.1.2(a) requires ongoing value, a period of at least 7 days, and availability on all the user's devices. 3.1.2(c) requires the price and what you get to be clearly described before the ask.",
   "lesson": "Subscriptions fit kid-safe games because there is no per-item pressure and parents understand them. They only work with a monthly reason to stay, so they need a content cadence. Test trial length and onboarding before price, since that is where Sago Mini found its biggest lift.",
   "applyIdea": "Explorer Club, an optional subscription with a $3.99/mo and $29.99/yr hypothesis. That sits below Pok Pok because the content volume is lower, and near Google Play Pass's $4.99/$29.99. Use a 7-day trial and Family Sharing. The monthly drop reuses systems that already exist: one festival costume set, one habitat backdrop, a Passport banner, a Sticker Album page and a Club postcard from expeditions. Perks are cosmetic, collection or convenience only. Never lock gameplay or existing purchases, and never shorten timers. Everything earned during club months stays owned after lapsing, using the derived-ownership architecture. Put a plain 'what you get for the price' screen before the parental gate. All purchase and subscription copy must be translated into es, fr, de, pt-BR and ja.",
   "sources": [
    "https://playpiknik.com/get-piknik",
    "https://hip2save.com/deals/piknik/",
    "https://mixpanel.com/customers/how-sago-mini-uses-mixpanel-to-accelerate-experimentation/",
    "https://www.cubbyathome.com/pok-pok-playroom-kids-app-review-80027995",
    "https://apps.apple.com/app/id1550204730",
    "https://animalcrossingworld.com/2019/11/pocket-camp-club-paid-subscription-plans-benefits-and-prices-fully-detailed/",
    "https://www.gamespot.com/articles/new-animal-crossing-pocket-camp-subscription-increases-monthly-cost-to-12-for-all-access/1100-6500033/",
    "https://www.nintendolife.com/news/2024/07/pokemon-sleep-has-reportedly-made-usd100-million-in-its-first-year",
    "https://gamerant.com/pokemon-sleep-premium-pass-benefits-cost-info/",
    "https://developer.apple.com/app-store/review/guidelines/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Clash of Clans (Supercell), Gold Pass",
   "mechanic": "Low-priced monthly season pass on a base-builder",
   "whatItIs": "Gold Pass launched in 2019 at $4.99 and was raised to $6.99 in 2023, and it now has 40 tiers. Sensor Tower's headline is that weekly revenue rose 145% after it debuted, with about $27M in the first week, about $3.9M a day and about 2.5x player spending in the first seven days. Its rewards mix hero skins with resource boosts and magic items, so part of it sells speed. That part is not allowed here.",
   "lesson": "On a base-builder, a cheap monthly pass monetises the broad middle of payers better than large packs do. The structure is what to copy: monthly cadence, many tiers, low price, retroactive rewards. The pay-for-speed content is what to leave out.",
   "applyIdea": "Homeworld Season, the monthly pass for the passive-base mode, with about 30 tiers and a free lane plus a premium lane at $2.99 to $4.99. Premium rewards are cosmetic (building skins, ring paints, drone trails, resident hats, dyes) plus non-timer convenience (a helper drone that auto-gathers finished producers, saving taps without changing any timer, and extra decoration plots). Season quests are Homeworld actions such as sending an expedition, befriending a resident, or completing a resident's request. There is no streak loss. Rewards pay out retroactively, as Cosmic Pass does today. There are no tier skips for money, which keeps the no-pay-to-skip rule intact. Pair it with the Archive described in the next finding.",
   "sources": [
    "https://sensortower.com/blog/clash-of-clans-gold-pass",
    "https://supercell.com/en/games/clashofclans/blog/news/changes-to-gold-pass-2/",
    "https://www.sportskeeda.com/esports/supercell-hikes-clash-clans-gold-pass-price-new-price-rewards"
   ],
   "confidence": "medium"
  },
  {
   "game": "Season and battle passes across mobile (Brawl Stars, Clash Royale, Fortnite, top hybrid-casual titles)",
   "mechanic": "Seasonal pass with an evergreen 'Archive' instead of expiring FOMO",
   "whatItIs": "The ESA/YouGov 2026 survey says 26% of US players aged 8 and over have bought a season or battle pass. GameRefinery found passes in about 60% of the top 20% grossing mobile games, and over 70% of top-grossing games offer at least one pass under $10. AppMagic says nearly all top hybrid-casual games had a Season Pass by mid-2025. Prices: Brawl Pass $8.99 and Plus $12.99 (up from $6.99 and $9.99); the Fortnite pass is 800 V-Bucks, about $8.99. Pass Royale is credited with raising ARPU by over 70%. Deconstructor of Fun notes that passes take a little revenue from a large share of payers, unlike most tools that take a lot from a few. Regulators treat expiring items and timers as pressure. The Dutch ACM fined Epic over countdown timers and 'buy it now' wording. Epic now shows the date an item leaves the shop in place of a ticking timer. The UK ICO says purchases must not be presented as one-time-only or necessary to progress.",
   "lesson": "The pass's value is breadth: it moves the many small spenders. Its usual engine is loss-aversion and FOMO, which regulators now read as a dark pattern for children. Keep the breadth and remove the scarcity.",
   "applyIdea": "Turn the single permanent Cosmic Pass into 8-week Star Road Seasons at about $3.99 (hypothesis; kid-safe pricing sits under the $8.99 norm). Add an Archive: any past season's premium lane can be bought later at the same fixed price, so nothing is ever lost. Show 'Season changes on {date}' as plain text, never a countdown. Make a full lane completable at about one level a day, which fits 1-2 minute sessions. Keep Cosmic Pass owners whole by mapping the current pass to 'Season 0'.",
   "sources": [
    "https://rec0ded88.com/statistics/battle-pass-spending/",
    "https://www.pocketgamer.biz/gamerefinery-battle-pass-implementation-in-top-grossing-mobile-games/",
    "https://www.gamerefinery.com/battle-pass-trend-mobile-games/",
    "https://gamedevreports.substack.com/p/appmagic-mobile-games-monetization",
    "https://www.sportskeeda.com/mobile-games/brawl-stars-brawl-pass-rework-new-prices-features",
    "https://esports.gg/news/fortnite/how-fortnite-battle-pass-works/",
    "https://www.blog.udonis.co/mobile-marketing/mobile-games/clash-royale-player-count",
    "https://www.deconstructoroffun.com/blog/2022/6/4/battle-passes-analysis",
    "https://nltimes.nl/2026/01/14/rotterdam-court-upholds-eu11-million-fine-fortnite-developer-epic-games",
    "https://ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/toolkits/age-appropriate-design/nudge-techniques/"
   ],
   "confidence": "medium"
  },
  {
   "game": "F2P starter packs and first-purchase ladders (Deconstructor of Fun, Mistplay, survival-analysis case study)",
   "mechanic": "Low-priced first purchase followed by a visible second rung",
   "whatItIs": "In Deconstructor of Fun's poll, 96.3% of respondents would price a starter pack under $10 and 59.2% under $5. The article warns that pushing conversion with $2.99 packs can under-serve players who would buy $19.99 or more. Typical payer conversion is 2-5%, and strong titles reach 6-8%. A single-title survival analysis found about 47% of payers convert on day 0, about 75% by day 3 and about 82.5% by day 7. Mistplay finds 79% of mobile players make their first purchase within the first month. AppMagic notes that most revenue comes from low-priced currency packs and failure-triggered offers, which are exactly the pressure patterns kid-safety rules discourage. Pocket Planet's $2.99 Starter Pack already appears after the first chapter chest with no countdown.",
   "lesson": "The first purchase is a trust event, so price it low. But give that buyer somewhere to go next, and never fire the offer at a moment of failure.",
   "applyIdea": "Keep three always-visible fixed rungs with no countdown, no 'last chance' and no fail-screen prompt. Starter Crew at $2.99 (exists). Explorer Bundle at about $6.99: one Planet Pack of choice plus one season premium lane. Collector's Edition at about $14.99 (see next finding). Trigger the offers only from local, non-profiling milestones: Starter after the first chest, Explorer after the first resident request is fulfilled. Every offer shows its full contents, its USD price, and the words 'never expires'. Keep the current $1.99 piggy bank and the 'continue' purchases out of any failure moment.",
   "sources": [
    "https://www.deconstructoroffun.com/blog/2024/4/8/free-to-play-starter-pack-pricing-when-conversion-is-king-we-may-price-too-low",
    "https://www.appstorys.com/blog-Mobile-Game-Conversion-Rate-Strategies",
    "https://www.sciencedirect.com/science/article/pii/S1875952126001175",
    "https://gamedevreports.substack.com/p/mistplay-paying-users-in-mobile-games",
    "https://gamedevreports.substack.com/p/appmagic-mobile-games-monetization"
   ],
   "confidence": "medium"
  },
  {
   "game": "Animal Crossing: Pocket Camp Complete (Nintendo), plus platform subscriptions (Apple Arcade, Google Play Pass)",
   "mechanic": "One-time 'Complete' edition and platform-bundle licensing as the kid-safe endgame",
   "whatItIs": "Nintendo shut the free-to-play Pocket Camp on 28 Nov 2024. On 2 Dec 2024 it released Pocket Camp Complete for $9.99: a paid, offline app with the in-app purchases removed (Leaf Tickets gone), some Club-exclusive content folded in, and save transfer. Alto's Odyssey on Android went free with a $5 ad-free unlock. Google Play Pass is $4.99 a month or $29.99 a year. Apple Arcade developers report payouts shrinking and projects being cancelled (MobileGamer.biz, Game Developer).",
   "lesson": "'Pay once, get everything' is the cleanest story for parents and the cleanest sunset path. Platform subscriptions are a hedge but their payouts are shrinking, so do not depend on them.",
   "applyIdea": "Collector's Edition, one non-consumable at about $14.99 to $19.99 (hypothesis; the $9.99 Pocket Camp Complete price is the anchor). It has an itemised full-screen contents list: every cosmetic released to date, every Archive season lane, a Collector title and Passport banner, and an exclusive shareable sticker sheet. It is Family Shareable and grants no power. It deliberately excludes future seasons, which protects recurring revenue. Later, a stripped 'Complete' build with no IAP and no timers is what Apple Arcade and Play Pass pitches want.",
   "sources": [
    "https://www.macrumors.com/2024/12/02/animal-crossing-pocket-camp-complete/",
    "https://en.wikipedia.org/wiki/Google_Play_Pass",
    "https://mobilegamer.biz/inside-apple-arcade-axed-games-declining-payouts-disillusioned-studios-and-an-uncertain-future/",
    "https://www.gamedeveloper.com/business/apple-arcade-devs-allege-smell-of-death-amid-payout-reductions-and-canceled-projects",
    "https://en.wikipedia.org/wiki/Alto%27s_Odyssey"
   ],
   "confidence": "medium"
  },
  {
   "game": "Apple Family Sharing, Ask to Buy and offer codes; parent-buyer behaviour (ESA 2026)",
   "mechanic": "Household purchases: Family Sharing, a parent-facing store, and gifting",
   "whatItIs": "Apple Family Sharing covers auto-renewable subscriptions and non-consumable IAPs, shared with up to five family members. Consumables such as gems are not shareable. Apple says it helps attract subscribers, engagement and retention. Guideline 3.1.1 allows gifting IAP items, with refunds only to the original purchaser. WWDC25 extended offer codes to all IAP types (consumable, non-consumable, non-renewing). Ask to Buy sends child purchase requests to the family organiser. ESA 2026 reports that about 54% of parents purchase in-game content for their kids, roughly 9 in 10 require approval for kids' purchases, and about 70% of parents of kids 12 and under use parental controls.",
   "lesson": "The buyer is the parent. Design the store around a grown-up's trust and the household, not around the child's impulse.",
   "applyIdea": "First, mark Cosmic Pass, seasons, Collector's Edition and the Club as Family Shareable, so one purchase serves siblings, who each keep their own save. Second, build a Parent Corner behind the gate: an itemised shop in USD, purchase history, a self-set monthly spend cap, a Restore Purchases button, and plain instructions for Ask to Buy, Screen Time and refunds. Third, use a no-server gift flow: the child's 'Ask a grown-up' wishlist card, shared by image, lets a parent buy in-app. I found no native StoreKit recipient-gift API, so real gifting without a server is my inference and needs checking. Do not sell codes outside IAP without confirming with Apple first, because that is a 3.1.1 risk.",
   "sources": [
    "https://developer.apple.com/news/?id=4zbvn7u9",
    "https://developer.apple.com/app-store/review/guidelines/",
    "https://developer.apple.com/videos/play/wwdc2025/241/",
    "https://developer.apple.com/news/?id=db58g7r0",
    "https://www.theesa.com/issues/in-game-purchases/",
    "https://www.theesa.com/trust-safety/parent-controls/"
   ],
   "confidence": "medium"
  },
  {
   "game": "Hybrid-casual market (Royal Match, Township and peers) as the benchmark for a no-ads game",
   "mechanic": "Revenue stack economics once ads are removed",
   "whatItIs": "Blended hybrid-casual ARPDAU runs about $0.15 to $0.50, versus about $0.03 to $0.08 for hypercasual, and IAP is only 40-50% of that revenue. The rest is ads. Casual puzzle ARPPU is about $8 to $15 a month. Casual retention on Android is roughly D1 28-32%, D7 9-12% and D30 3.5-5%. Liftoff puts casual iOS CPI at $1.41 with D30 ROAS of 47%. AppsFlyer finds subscriptions' share of revenue in games running IAP, ads and subscriptions rose from about 4% (Jan 2025) to about 7% (early 2026), while ads fell from about 63% to about 56%. Sensor Tower says hybrid-casual was the only segment to grow IAP in H1 2026, when overall mobile IAP fell 2% to about $40B. AppMagic reports that ad-skip tickets outsell no-ads deals, and that most revenue comes from cheap currency packs and failure-triggered offers.",
   "lesson": "Removing ads takes out about half of the benchmark stack. A kid-safe game cannot make the difference up by pushing harder on IAP, because the top-earning tactics (failure offers, currency packs) are the ones regulators target. The levers left are breadth (passes), recurring revenue (subscription), durable editions and retention. Paid UA at iOS casual CPIs will not pay back on those ARPDAUs.",
   "applyIdea": "Plan from a revenue stack and not a single whale curve: Season pass as the broad base, Club as recurring, Planet Packs as the catalogue, Collector's Edition as the durable premium. Assume the IAP-only slice of a typical hybrid-casual ARPDAU (roughly $0.06 to $0.25) is a ceiling, not a target. Measure without third-party SDKs using App Store Connect (units, proceeds, subscription retention, Sales and Trends) plus an on-device funnel ledger that is never transmitted. Run price and trial tests by staggered app versions and territory pricing. Keep 'continue' as an earned-gem action and do not attach a real-money prompt to the fail screen.",
   "sources": [
    "https://blog.playio.co/arpdau-benchmarks-mobile-games",
    "https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre",
    "https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/",
    "https://liftoff.ai/2025-casual-gaming-apps-report/",
    "https://www.appsflyer.com/resources/reports/app-marketing-monetization-report/",
    "https://respawn.outlookindia.com/gaming/gaming-news/mobile-gaming-iap-revenue-drops-2-as-ad-spend-surges-in-2026",
    "https://gamedevreports.substack.com/p/appmagic-mobile-games-monetization"
   ],
   "confidence": "medium"
  },
  {
   "game": "Fortnite (Epic Games): FTC 2022 settlement and Dutch ACM 2024-2026 ruling",
   "mechanic": "Enforcement precedent on checkout dark patterns and children's shop pressure",
   "whatItIs": "On 19 Dec 2022 the FTC announced $520M: a $275M COPPA penalty plus $245M in refunds for dark patterns. The FTC alleged that the preview button sat next to the purchase button so a misplaced tap charged the player instantly. It also alleged unwanted charges while the game woke from sleep or loaded, hidden cancel and refund options, and blocking players who disputed charges from their purchases. More than $72M in refunds had been sent by Dec 2024. In the Netherlands, the ACM fined Epic a total of EUR 1,125,000 (two fines of EUR 562,500, for 'get it now' wording and for misleading countdown timers). The Rotterdam court upheld the fine on 14 Jan 2026 and Epic did not appeal. Epic removed countdown timers worldwide and now shows the date an item leaves. A Dutch consumer group filed a claim in Sept 2026 for over EUR 100M.",
   "lesson": "Enforcement targets interface detail (button adjacency, timers, wording, lockouts), not the price list. The checkout flow is the compliance surface, so a design checklist beats a legal memo.",
   "applyIdea": "Adopt a Checkout Charter. (1) The Try-on and Preview controls are never adjacent to Buy. (2) No purchase can fire from a wake, loading or blank tap: it needs a gate solve, then a sheet showing the item image, contents and USD price, then the native StoreKit sheet. (3) No countdown timers, no 'buy now' or 'last chance' wording. If anything leaves, show a plain date. (4) Never lock or shame an account after a refund or dispute. (5) Restore Purchases and 'how to request a refund' are always visible in Parent Corner. (6) All of this text is translated into all five languages.",
   "sources": [
    "https://www.ftc.gov/news-events/news/press-releases/2022/12/fortnite-video-game-maker-epic-games-pay-more-half-billion-dollars-over-ftc-allegations",
    "https://www.ftc.gov/business-guidance/blog/2022/12/245-million-ftc-settlement-alleges-fortnite-owner-epic-games-used-digital-dark-patterns-charge",
    "https://techcrunch.com/2024/12/09/ftc-distributes-72m-to-fortnite-customers-tricked-into-making-unwanted-purchases",
    "https://www.acm.nl/en/publications/acm-imposes-fine-epic-unfair-commercial-practices-aimed-children-fortnite-game",
    "https://nltimes.nl/2026/01/14/rotterdam-court-upholds-eu11-million-fine-fortnite-developer-epic-games",
    "https://www.aroged.com/2026/09/25/fortnite-dutch-class-action-seeks-damages-of-over-e100-million/"
   ],
   "confidence": "high"
  },
  {
   "game": "EU, Belgium, Netherlands, UK and PEGI rules on loot boxes and virtual currencies",
   "mechanic": "Regulatory direction: paid random items banned or age-gated, and in-game currency under attack for minors",
   "whatItIs": "Belgium treats paid loot boxes as illegal gambling (criminal fines reported up to EUR 800,000). The Dutch ACM proposes an EU-wide ban on loot boxes, paid or unpaid, and wants the fitness check to ask whether in-game currencies for children have any consumer benefit. The CPC Network principles of 21 Mar 2025 require the real-money price of digital content to be shown, prohibit practices that oblige purchase of virtual currency or force bundles that leave leftovers, and warn against time-limited pressure on children. The European Parliament's IMCO committee voted in Oct 2025 (32 for, 5 against, 9 abstentions) to ask the Commission to prohibit loot boxes, in-app currencies, pay-to-progress and pay-to-win in games likely accessed by minors. The Digital Fairness Act proposal has not been tabled; as of a 23 Sept 2026 MLex report, it is tentatively eyed for November. From June 2026 PEGI gives any newly submitted game with paid random items a default PEGI 16. Apple's 2025 age-rating overhaul (13+, 16+, 18+) asks developers to declare purchasable loot boxes. The UK ICO's Children's Code guidance says purchases should not be one-time-only or necessary to progress, buy buttons should be neutral, and cooling-off refunds should be considered.",
   "lesson": "The owner's no-random-paid-rewards rule is already the compliant position. The exposure is the currency layer: gem packs, bundle leftovers, 'Best value' tags and accumulate-to-unlock mechanics such as the piggy bank.",
   "applyIdea": "Audit the seven current StoreKit products. Move real-money spending to direct-priced items, meaning non-consumables and fixed bundles, and keep gems as an earn-only soft currency. If gem packs stay, show the USD price beside every gem price and make sure every gem sink can be met exactly, with no leftover. Consider dropping 'Popular' and 'Best value' tags on gem packs. Get a legal read on the $1.99 piggy bank, which uses an accumulate-then-pay loss-aversion mechanic. Answer 'no purchasable loot boxes' in Apple's questionnaire. Being ready now costs little if the DFA lands with an in-app-currency restriction.",
   "sources": [
    "https://gamblingclub.be/en/netherlands-calls-europe-ban-loot-boxes/",
    "https://igamingexpress.com/dutch-minister-calls-for-eu-wide-ban-on-loot-boxes-in-video-games/",
    "https://www.twobirds.com/en/insights/2026/netherlands/netherlands-acms-position-on-the-digital-fairness-act",
    "https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/",
    "https://www.gleisslutz.com/en/know-how/new-guidelines-game-currencies-digital-consumer-protection-and-expanding-taboo-dark-patterns",
    "https://www.lewissilkin.com/en/insights/2025/11/03/european-parliamentary-committee-pushes-for-tougher-rules-to-make-online-services-102lrvb",
    "https://www.europarl.europa.eu/news/en/press-room/20251013IPR30892/new-eu-measures-needed-to-make-online-services-safer-for-minors",
    "https://www.mlex.com/mlex/articles/2529049/eu-digital-fairness-act-on-consumer-protection-tentatively-eyed-for-november",
    "https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories",
    "https://techcrunch.com/2025/07/25/apple-broadens-app-stores-age-rating-system",
    "https://www.rpclegal.com/snapshots/data-protection/spring-2023/ico-publishes-guidance-on-compliance-of-game-design-with-the-childrens-code/"
   ],
   "confidence": "high"
  },
  {
   "game": "Apple Kids Category, COPPA (2025 amendments), UK Children's Code and Texas SB 2420",
   "mechanic": "Store and privacy guardrails that shape how revenue can be measured and sold",
   "whatItIs": "Apple 1.3: Kids Category apps must not include links out, purchasing opportunities or other distractions unless reserved for a designated area behind a parental gate. Apple's kids page says gates should be adult-level tasks, with voiceover prompts for pre-literate children. Kids apps must not send personal or device information to third parties, even in adult sections, unless a parent explicitly consents. Guideline 5.1.4 says apps intended primarily for kids should not include third-party analytics or advertising. Apple's other IAP rules: purchased in-game currency may not expire, restore must work, and 3.1.2 subscriptions must last at least seven days and provide ongoing value. The FTC's amended COPPA Rule was published 22 Apr 2025, took effect 23 Jun 2025, and required compliance by 22 Apr 2026. It adds separate consent for third-party disclosure and requires written security and retention policies. The UK ICO announced on 1 Dec 2025 a review of ten popular children's mobile games (privacy defaults, geolocation, targeted ads). Apple activated Texas SB 2420 age assurance on 4 Jun 2026 (Declared Age Range API). Under Apple's Small Business Program the commission is 15% below $1M proceeds; subscriptions pay 70% in year one and 85% after, or from day one for Small Business Program members.",
   "lesson": "No third-party SDKs means no third-party funnel analytics, so the business has to be steered with first-party aggregate data. The parental gate is a design surface too, not only a checkbox for review.",
   "applyIdea": "Keep the App Privacy label at 'Data Not Collected'. Confirm the @capgo/native-purchases plugin talks only to StoreKit and not to any vendor service (RevenueCat-style backends would be third-party). The current gate asks 6-9 x 6-9 with four choices, which a 9-11 year old can solve and a child can guess 1 time in 4. Strengthen it to an adult-level task with a variable format, for example typing a spelled-out number or a two-step hold-and-answer, with a voiceover prompt, and re-verify it in the 6-8 and 9-11 age bands. Enrol in the Small Business Program. Write the 'what you get' text for every product and translate it.",
   "sources": [
    "https://developer.apple.com/app-store/review/guidelines/",
    "https://developer.apple.com/app-store/kids-apps/",
    "https://developer.apple.com/app-store/small-business-program/",
    "https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/",
    "https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule",
    "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2025/12/children-s-online-privacy-in-mobile-games-under-spotlight/",
    "https://www.macrumors.com/2026/06/03/apple-app-store-texas-sb-2420/"
   ],
   "confidence": "high"
  }
 ],
 "benchmarks": [
  {
   "metric": "Typical F2P payer conversion (share of players who ever buy)",
   "value": "2-5% is healthy; below 1% signals offer or pricing problems; strong starter-pack titles 6-8%, mid-core up to 8-12%",
   "source": "https://www.appstorys.com/blog-Mobile-Game-Conversion-Rate-Strategies"
  },
  {
   "metric": "Season/battle pass ever purchased, US players aged 8+ (ESA 2026 Essential Facts, YouGov n=13,545)",
   "value": "26%",
   "source": "https://rec0ded88.com/statistics/battle-pass-spending/ (secondary summary of the ESA report)"
  },
  {
   "metric": "Battle pass presence in top-grossing mobile games (GameRefinery)",
   "value": "about 60% of the top 20% grossing titles; over 70% of top-grossing games offer at least one pass under $10",
   "source": "https://www.pocketgamer.biz/gamerefinery-battle-pass-implementation-in-top-grossing-mobile-games/ ; https://www.gamerefinery.com/battle-pass-trend-mobile-games/"
  },
  {
   "metric": "Season pass adoption among top hybrid-casual games, mid-2025 (AppMagic)",
   "value": "nearly all top hybrid-casual games featured a Season Pass",
   "source": "https://gamedevreports.substack.com/p/appmagic-mobile-games-monetization"
  },
  {
   "metric": "Battle pass share of revenue and premium-track conversion (vendor summaries)",
   "value": "roughly 10-40% of top F2P revenue; 15-20% premium-track conversion cited for a well-timed pass; 4-8 week seasons, 50-100 tiers, $5-15. Low confidence: vendor blogs, not audited",
   "source": "https://blog.playio.co/battle-pass-monetization ; https://www.redappletech.com/blog/battle-passes-and-in-app-purchases"
  },
  {
   "metric": "Clash of Clans Gold Pass launch effect (Sensor Tower)",
   "value": "weekly revenue +145% after debut; about 2.5x player spending in first 7 days; about $3.9M/day and about $27M in the first week; price $4.99 at 2019 launch, $6.99 from 2023",
   "source": "https://sensortower.com/blog/clash-of-clans-gold-pass ; https://www.sportskeeda.com/esports/supercell-hikes-clash-clans-gold-pass-price-new-price-rewards"
  },
  {
   "metric": "Pass Royale effect on Clash Royale spend per user",
   "value": "reported +70% average in-game spend per user (low confidence, secondary source)",
   "source": "https://www.blog.udonis.co/mobile-marketing/mobile-games/clash-royale-player-count"
  },
  {
   "metric": "Premium pass price points",
   "value": "Brawl Pass $8.99 / Plus $12.99 (was $6.99 / $9.99); Fortnite Battle Pass 800 V-Bucks, about $8.99; Clash of Clans Gold Pass $6.99 (from $4.99)",
   "source": "https://www.sportskeeda.com/mobile-games/brawl-stars-brawl-pass-rework-new-prices-features ; https://esports.gg/news/fortnite/how-fortnite-battle-pass-works/ ; https://www.sportskeeda.com/esports/supercell-hikes-clash-clans-gold-pass-price-new-price-rewards"
  },
  {
   "metric": "Kid and family subscription prices",
   "value": "Piknik $11.99/mo (30-day free trial promo); Pok Pok $6.99/mo or $45.99/yr after 7-day trial, up to $89.99 lifetime tier; Google Play Pass $4.99/mo or $29.99/yr; Pocket Camp Club tiers $0.99 / $2.99 / $7.99 (about $12 all-access); Pokemon Sleep Premium about $10/mo or $50 per 6 months",
   "source": "https://playpiknik.com/get-piknik ; https://www.cubbyathome.com/pok-pok-playroom-kids-app-review-80027995 ; https://apps.apple.com/app/id1550204730 ; https://en.wikipedia.org/wiki/Google_Play_Pass ; https://animalcrossingworld.com/2019/11/pocket-camp-club-paid-subscription-plans-benefits-and-prices-fully-detailed/ ; https://gamerant.com/pokemon-sleep-premium-pass-benefits-cost-info/"
  },
  {
   "metric": "Sago Mini / Piknik subscription growth and test result",
   "value": "subscribers in key international markets +80% YoY; about 31% conversion improvement from testing trial length and onboarding",
   "source": "https://mixpanel.com/customers/how-sago-mini-uses-mixpanel-to-accelerate-experimentation/"
  },
  {
   "metric": "Pokemon Sleep first-year revenue (Sensor Tower via Nintendo Life)",
   "value": "over $100M in about a year; Japan $73M, US $15M",
   "source": "https://www.nintendolife.com/news/2024/07/pokemon-sleep-has-reportedly-made-usd100-million-in-its-first-year"
  },
  {
   "metric": "Toca Boca World revenue estimate (AppRank, July 2026)",
   "value": "about $8.0M/month (about $96M/yr pace); peak $17M/month in 2021, about $9M in Dec 2024; about 82% of Toca Boca revenue; about 50M MAU (Spin Master figure via Naavik); shop packs from about $0.99 to about $50",
   "source": "https://apprank.io/toca-boca-world ; https://tracxn.com/d/companies/toca-boca/__FoVZSuNxXSouC5QHg0e-KVypgCPQR1F16mYAVu8vQ4g ; https://naavik.co/weekly-digest/the-future-of-kids-gaming/ ; https://toca-life-world.fandom.com/wiki/Shop"
  },
  {
   "metric": "Pocket Camp Complete one-time edition",
   "value": "$9.99, paid and offline with IAP removed; launched 2 Dec 2024 after F2P shutdown on 28 Nov 2024",
   "source": "https://www.macrumors.com/2024/12/02/animal-crossing-pocket-camp-complete/"
  },
  {
   "metric": "Starter-pack price expectations (Deconstructor of Fun poll)",
   "value": "96.3% would price under $10; 59.2% under $5; article warns $2.99 offers can leave money on the table with larger spenders",
   "source": "https://www.deconstructoroffun.com/blog/2024/4/8/free-to-play-starter-pack-pricing-when-conversion-is-king-we-may-price-too-low"
  },
  {
   "metric": "First-purchase timing",
   "value": "single-title case study: about 47% of payers on day 0, about 75% by day 3, about 82.5% by day 7 (low confidence, one game); Mistplay: 79% of mobile players make their first purchase within the first month",
   "source": "https://www.sciencedirect.com/science/article/pii/S1875952126001175 ; https://gamedevreports.substack.com/p/mistplay-paying-users-in-mobile-games"
  },
  {
   "metric": "Hybrid-casual blended ARPDAU and revenue mix",
   "value": "about $0.15-0.50 versus about $0.03-0.08 for hypercasual; IAP about 40-50% of hybrid-casual revenue, rest ads",
   "source": "https://blog.playio.co/arpdau-benchmarks-mobile-games ; https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre"
  },
  {
   "metric": "Casual ARPPU and D90 purchase revenue per payer (aggregator roundups, unverified against original reports)",
   "value": "casual puzzle ARPPU about $8-15 per month; D90 purchase revenue per paying user about $7.26 casual, $9.80 midcore, $11.40 casino",
   "source": "https://appfollow.io/blog/mobile-game-kpis ; https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre"
  },
  {
   "metric": "Casual retention on Android (aggregator, unverified)",
   "value": "D1 28-32%, D7 9-12%, D30 3.5-5%",
   "source": "https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/"
  },
  {
   "metric": "Casual game UA economics (Liftoff/Singular, Feb 2024 to Feb 2025)",
   "value": "CPI $1.41 iOS / $0.14 Android; average D30 ROAS 47% iOS / 15% Android",
   "source": "https://liftoff.ai/2025-casual-gaming-apps-report/"
  },
  {
   "metric": "Subscription share of revenue in games running IAP, ads and subscriptions (AppsFlyer)",
   "value": "about 4% (Jan 2025) to about 7% (early 2026); ads about 63% to about 56%",
   "source": "https://www.appsflyer.com/resources/reports/app-marketing-monetization-report/"
  },
  {
   "metric": "Mobile game market size and spend concentration (AppMagic 2025)",
   "value": "mobile games $57.1B (+3.4%); casual +2.3%; Puzzle $8.2B; share of App Store D90 payers spending over $100 rose from 22% (2024) to 32% (2025); most revenue from low-priced currency packs and failure-triggered offers",
   "source": "https://gamedevreports.substack.com/p/appmagic-mobile-games-monetization"
  },
  {
   "metric": "Mobile IAP trend (Sensor Tower)",
   "value": "2025 gaming IAP about $82B (+1.3%); H1 2026 IAP about $40B (-2%); hybrid-casual the only segment growing IAP",
   "source": "https://gamedevreports.substack.com/p/sensor-tower-the-state-of-the-mobile ; https://respawn.outlookindia.com/gaming/gaming-news/mobile-gaming-iap-revenue-drops-2-as-ad-spend-surges-in-2026"
  },
  {
   "metric": "Parent buying behaviour (ESA 2026)",
   "value": "about 54% of parents purchase in-game content for their kids; about 9 in 10 require approval; about 70% of parents of kids 12 and under use parental controls",
   "source": "https://www.theesa.com/issues/in-game-purchases/ ; https://www.theesa.com/trust-safety/parent-controls/"
  },
  {
   "metric": "Apple commission",
   "value": "15% on IAP under the Small Business Program (under $1M proceeds), otherwise 30%; subscriptions 70% year one, 85% after (85% from day one for Small Business Program members)",
   "source": "https://developer.apple.com/app-store/small-business-program/ ; https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/"
  },
  {
   "metric": "Apple Family Sharing for IAP",
   "value": "subscriptions and non-consumables only; up to 5 family members; consumables not shareable",
   "source": "https://developer.apple.com/news/?id=4zbvn7u9"
  },
  {
   "metric": "Apple offer codes (WWDC25)",
   "value": "now supported for consumables, non-consumables and non-renewing subscriptions as well as auto-renewables; win-back offers since iOS 18",
   "source": "https://developer.apple.com/videos/play/wwdc2025/241/ ; https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/"
  },
  {
   "metric": "FTC v. Epic Games (19 Dec 2022)",
   "value": "$520M total: $275M COPPA penalty plus $245M refunds for dark patterns; more than $72M in refunds sent by Dec 2024",
   "source": "https://www.ftc.gov/news-events/news/press-releases/2022/12/fortnite-video-game-maker-epic-games-pay-more-half-billion-dollars-over-ftc-allegations ; https://techcrunch.com/2024/12/09/ftc-distributes-72m-to-fortnite-customers-tricked-into-making-unwanted-purchases"
  },
  {
   "metric": "Dutch ACM v. Epic Games",
   "value": "EUR 1,125,000 (2 x EUR 562,500: 'get it now' wording and misleading countdown timers); upheld by Rotterdam court 14 Jan 2026; timers removed worldwide; consumer-group claim over EUR 100M filed Sept 2026",
   "source": "https://www.acm.nl/en/publications/acm-imposes-fine-epic-unfair-commercial-practices-aimed-children-fortnite-game ; https://nltimes.nl/2026/01/14/rotterdam-court-upholds-eu11-million-fine-fortnite-developer-epic-games ; https://www.aroged.com/2026/09/25/fortnite-dutch-class-action-seeks-damages-of-over-e100-million/"
  },
  {
   "metric": "Amended COPPA Rule",
   "value": "published 22 Apr 2025; effective 23 Jun 2025; compliance deadline 22 Apr 2026",
   "source": "https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule"
  },
  {
   "metric": "EU Digital Fairness Act status and EU loot box and currency stance",
   "value": "CPC in-game currency principles 21 Mar 2025; IMCO vote Oct 2025 (32-5-9) to ban loot boxes, in-app currencies, pay-to-progress in games for minors; Commission proposal not yet tabled, tentatively November 2026 (MLex, 23 Sept 2026)",
   "source": "https://www.lewissilkin.com/en/insights/2025/11/03/european-parliamentary-committee-pushes-for-tougher-rules-to-make-online-services-102lrvb ; https://www.mlex.com/mlex/articles/2529049/eu-digital-fairness-act-on-consumer-protection-tentatively-eyed-for-november ; https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/"
  },
  {
   "metric": "PEGI 2026 change",
   "value": "from June 2026, new submissions with paid random items default to PEGI 16 (some PEGI 18)",
   "source": "https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories"
  },
  {
   "metric": "Apple age-rating overhaul",
   "value": "13+, 16+, 18+ added on 24 Jul 2025; developers declare purchasable loot boxes; questionnaire deadline 31 Jan 2026",
   "source": "https://techcrunch.com/2025/07/25/apple-broadens-app-stores-age-rating-system ; https://developer.apple.com/news/?id=ks775ehf"
  }
 ]
}
```

## Round 7 research already done: Remix (optional New Game+ for finished chapters). Treat it as designed (full spec in docs/product/REMIX.md) and fit it into the plan rather than redesigning it

SCOPE. Remix has one tier per chapter. It is built on the existing makeLevel / greedyPlan / pickGoals in src/core/levels.ts and needs no new art pipeline and no new currency. Stacked Ascension-style tiers (Remix+, Remix++) are deferred, because stacked modifiers become walls for young players [26].

1. UNLOCK RULE
- A chapter's Remix opens when that chapter's boss planet (planet 10c) is cleared at any star count, which is the same moment the chapter is marked finished. It is never gated on 3 stars, and nothing opens it early for money [6][7][8].
- How players find it: a quiet gold "Remix" chip on finished chapter cards in the Star Map, plus a single Inbox letter the first time any Remix opens. No pop-up, no push notification, no red dot. It is never shown when the child pauses, quits or ends a session [28].

2. WHAT A REMIXED PLANET IS
- Generation: remixLevel(n) = makeLevel(n, 'RX', { goals: true, boss: n % 10 === 0, remix: true }). It is a pure function of the planet number and a fixed salt, so nothing is hand-built and Remix grows with the endless campaign for free [9]. Seeds are fixed and never re-rolled per attempt, so a retry is always the same planet. One code change is needed: difficultyOf() and the chapter sawtooth currently treat any non-'PP' prefix as 'normal'. The remix flag must keep Hard at slot 5, Super Hard at slot 9 and the Comet Guardian at slot 10, so each remixed chapter keeps its own curve.
- What stays familiar: the same chapter, slot, planet name, hue, available kinds in the tray and difficulty slot. What reads as "remixed": a new seed (different start land, deal order and spin), a dusk sky palette with a thin gold rim on the planet, and the Voyage/festival music played through a variant (a filter or tempo change on the themes we already have) [5][15].
- Exactly ONE twist per planet [1][2][3]. It is drawn deterministically from the seed and named on the pre-level card before the first throw (prelevel.ts already shows the TWISTS name and description, and those strings are already localized). The v1 deck is the existing twists plus one new tray twist, "Short Supply": one kind is removed from the deal and the solver re-runs on the changed queue. Order runs from gentle to hard: slots 1-4 draw start-state or size twists (Scorched, Snowball, Water World, Tiny World), slots 5-9 draw physics twists (Solar Wind, Dense Core, Wobbly Spin, Twin Moons, Moon Guard, Fast Spin), and slot 10's twist is the Comet Guardian. No timers, no stacked penalties, no permanent-placement rules. Twist names and parameters are our own.
- Always-on goal: every remixed planet has exactly ONE goal, including chapter 1, where classic planets have none before planet 6. pickGoals takes it from the solver's own plan, so it is reachable. It is shown as an icon, with optional voiceover for pre-literate players [4][30]. In v1.1, add "inverted" goals such as "finish with no volcano" once the solver can check them.
- Tougher targets, shifted one notch: Remix 1 star = the classic 2-star share of the greedy optimum; Remix 2 stars = halfway between the classic 2- and 3-star shares; Remix 3 stars = the classic 3-star share (the 0.97 cap is unchanged). All three come from greedyPlan on the remix seed itself (with the Short Supply queue when that twist is drawn), never from a multiplier over classic targets [12]. Caveat (our own inference): the solver assumes perfect aim, and physics twists make aiming harder without changing the land plan. So do not push 3 stars higher; the twist and the goal carry the extra challenge.
- Power: Remix uses exactly the classic rules the solver already models. It adds no power and pays none out.

3. REWARDS (no new currency, nothing sold)
- Remix stars: the familiar 1-3 star scale drawn in gold. They have their own counter ("Remix x/30" per chapter, with a total on the Passport) and never count toward Star Road, chapter chests, Explorer Rank, daily quests or Momentum, so Remix never feels required. Each planet's best-ever result is saved the moment a level ends. A failed attempt removes nothing, and all 10 remixed planets are open at once.
- Chapter frame ladder: an outline once any remixed planet is played, silver when all 10 are cleared (at least 1 star each), gold at 30/30. The frame shows on the Star Map chapter card and on the Passport, where the child looks on every launch [13]. It changes art only.
- Passport titles: a chapter title at silver that names the chapter, not talent (for example "Chapter 4 Remixed"). Add 2-3 account-wide titles for total Remix stars across any chapters (for example "Orbit Tinkerer"), so kids choose where to master rather than needing perfection everywhere [41]. Titles are derived in titlesOwned() from stored stars, so they cannot disappear.
- Small fixed extras: one deed sticker in the in-game Sticker Album for the first gold frame, and a gold marker on each 3-star remixed planet. Add 3 progressive Game Center achievements (First Remix, Remix a Boss chapter, Gold Frames 1/5/10) with centred, text-free 1024 px art [31]. No leaderboard.
- Permanence: store profile.remix[chapter] = { v: REMIX_RULES, best: [10 values] } with a save migration. Stars only go up (max of old and new). A later retune changes future targets only and never lowers stored stars, frames or titles [10][11].
- Remix pays no gems, dust or materials. The shop sells nothing that looks like Remix (no gold frame, no skip).

4. STAR MAP PRESENTATION
- A finished chapter card gets a Classic | Remix toggle. The Remix side shows the same 10-planet row in dusk colours, with twist-chip icons, gold stars, x/30 and the frame state. The current and teaser chapters show no Remix.
- Pre-level card: twist chip, goal icon and the three targets, all before the first throw.
- Result screen: only "Next remix planet" and "Map". No shop button, no "unlock more", and the next planet never starts automatically [19]. The gold-frame end card is calm: "Chapter remixed! Nice spot for a break." [27]
- Do not show a Remix percentage on every chapter card; progress lives in the Remix view and the Passport. Zen Garden already exists as the calm alternative, so Remix never needs to be the default next step.

5. PITFALLS FOR KIDS 6+
- No first-try conditions, limited tries, expiry, streaks, timers beyond the normal ~1-minute level, or continue offers [23][24][25].
- Copy praises the shot and suggests a new angle; never "Failed" or "not good enough". Remix is labelled "Bonus", and finishing the classic campaign counts as full completion [29].
- Remix never touches classic stars, chapter completion or campaign progress, and never gates the campaign.
- No sad or pleading creatures and no countdowns when Remix is declined [28].
- Keep Remix out of the date-seeded daily, weekly and monthly calendar: no weekly "Remix rules" planet and no date-exclusive remix medals.
- One goal per planet, shown as an icon first. Twists come from our own parameters so no other game's mode is cloned.

6. ONE-DEVELOPER BUILD ORDER
- Step 1: remixLevel, the target shift, the Short Supply twist, the profile.remix migration, and vitest checks. The checks: the same n always gives the same level; for chapters 1-50, every remixed planet has one twist and one goal that greedyPlan meets, targets strictly increase and 3 stars stays within the solver cap; stored stars never drop on replay or after a TUNE change.
- Step 2: the Star Map toggle, pre-level chip, result card, dusk palette with gold rim, and the music variant.
- Step 3: frames, titles, achievements, the album sticker, and strings for the 5 locales.
- Deferred: inverted goals, a "visitor creature" twist, choosing 1 of 2 twist chips, Remix+, and a parental-area early unlock.
