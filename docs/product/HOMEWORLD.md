# Pocket Planet: The Homeworld

**Status:** design for build, pending the owner answers in section 15. It expands [ROADMAP-v2.md](ROADMAP-v2.md) section 4e and follows every rule decided there, unless section 15 flags a change with a recommendation.
**Written:** 28 September 2026 by the lead game designer for the Homeworld.
**Sibling doc:** [FLIGHT.md](FLIGHT.md) owns the launcher roster, launcher stats and flight feel. This doc owns only the **Launch Bay** building, its levels, and how launchers are earned and tuned there.
**Built from:** ROADMAP-v2 sections 1, 3, 4b-4h, 5, 6, 7.5 and 8; the Homeworld audit `[HW]` and base-builder research `[R2]` in [scope/evidence.md](scope/evidence.md); proposals `meta-homeworld-1` to `-9` in [scope/proposals.md](scope/proposals.md) and all five critiques of them in [scope/critiques.md](scope/critiques.md); and the current code (`src/meta/homeworld.ts`, `src/ui/screens/homeworld.ts`, `src/ui/art/structures.ts`, `src/meta/buddy.ts`, `src/meta/seasons.ts`). Tags such as `[HW]`, `[R2]` and `[C:originality]` mean the same as in ROADMAP-v2.

**How to read it.** Section 0 is the one-page summary. Sections 1-2 are the fantasy and the world. Sections 3-6 are the content: buildings, friends, Homeworld Levels and Landmarks. Sections 7-8 are how it connects to everything else and what a visit feels like. Section 9 is challenge without raids. Section 10 is the economy. Sections 11-13 are looks, screens and safety. Section 14 is the build plan. Section 15 lists the questions only the owner can answer.

**The owner asked for:** "that homeworld fully and completely fleshed out and made to be in depth on roadmap", with "more exploration into the passive side of this, maybe like clash of clans or something where you can expand your planet, watch it grow and do stuff for it". The adopted answer to "what is the point of the game?" is **"I make homes for creatures, and they help me."** The Homeworld is where that sentence is literally true.

---

## 0. Headline decisions

| #   | Decision                                                                                                                                                                                                                 | Where   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 1   | The Homeworld has three verbs: **build** (Labs, Launch Bay, homes), **befriend** (friends move in, live a day, help you) and **grow** (the planet itself gets bigger, greener and brighter). Every verb feeds the fling. | 1       |
| 2   | Nothing on the Homeworld makes stardust. Mills, Groves, the Observatory and meteor rocks are gone. The Homeworld adds **zero idle stardust**, so the idle band depends only on the Vault.                                | 3, 10   |
| 3   | **Landmarks** are the big, multi-step "do stuff for it" goals: five at launch (Sprout Garden, Skyglass, Sky Bridge, Comet Pier, Keeper's Beacon). Each stage is a round feat plus Essences. No timers, never expire.     | 6       |
| 4   | The **Launch Bay** replaces the Launch Tower: one building for launchers (earned, tuned, tried) and, from M13, trips. It keeps the plot count decided in 4e.                                                             | 3.5, 15 |
| 5   | Friends have a **day**: routines follow the real clock, season and a date-seeded weather, with personalities that come from their trait. They never get hungry, sad, bored or leave on their own.                        | 4       |
| 6   | Your **Buddy** is chosen from friends who live on your Homeworld. The Den is where helpers come from.                                                                                                                    | 4.6, 15 |
| 7   | The **Greenhouse** grows 1 booster per 6 campaign, Voyage or Zen wins (you choose the type), instead of every 12 hours, so it fits the booster band.                                                                     | 3.4, 15 |
| 8   | The ground between plots shows **lands you grew** in rounds, and friends play on their home land. The Homeworld literally becomes a home for them.                                                                       | 2.2     |
| 9   | Homeworld Levels 6-10 come after launch (new milestone M17). They add homes, room and sky, never more shot power, so every power band stays green.                                                                       | 5       |
| 10  | Clash of Clans is borrowed as method only: one visible growth number, meta spend that changes the next round, capped stores. No raids, defences, armies, HQ building or skips.                                           | 9       |
| 11  | New milestones: **M10.5 Launch Bay**, **M11.5 Homeworld Life** (both launch candidate) and **M17 Homeworld Horizons** (after launch).                                                                                    | 14      |

---

## 1. Purpose and fantasy

### 1.1 The one line

**For a child:** "I make homes for creatures, and they help me."
**For the Homeworld tab:** "Your Homeworld is where your friends live and where your shots learn new tricks." (ROADMAP-v2 4e, unchanged.)
**For a store screenshot:** "Grow tiny planets. Welcome creatures. Build them a home."

### 1.2 The fantasy

You are the Keeper. Out on the planets you fling rocks, comets, seeds, magma, rain and sunlight, and lands appear. Creatures move in. The ones you love most come home with you, to a small planet of your own. There they have a day: the Tide Otter naps in the forest you grew for it, the Ember Newt warms its toes by a lantern, the Pine Owl hoots at night. You build them a Den, a Greenhouse and six Labs, and each Lab teaches one of your shots a new trick. When the next planet is hard, a friend comes along as your Buddy and protects its favourite land. Over weeks your Homeworld grows: more room, a glowing sky, a bridge to a floating isle, a beacon that lights up the whole ring. Nothing on it can be lost.

### 1.3 Why play? The Homeworld's answers

| A child asks                         | The Homeworld answers                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| "Why do I play planets?"             | To grow lands, which become Essences, which build Labs and Landmarks. And to meet creatures, who become friends.  |
| "Why do I come to the Homeworld?"    | To see my friends, make a shot stronger, choose my Buddy, finish a Landmark stage, and dress up my planet.        |
| "What's the stardust for?"           | Labs, Homeworld Levels, homes and looks. It is fuel. Friends and Landmarks are the point.                         |
| "What do I do next?"                 | Next Up, inside the base, always names one thing and what it gives you.                                           |
| "Is it finished?" (day 60 and after) | No: more Landmarks every Star Road, launcher tunes, 36 friends to host, and (after launch) Homeworld Levels 6-10. |

### 1.4 How every Homeworld system feeds the fling

Pillar 3 says everything you grow comes back to the fling. Every row below either changes the next round or visibly grows something the player owns, and most do both.

| Homeworld system | What it changes in the next round                                                                           | Modes where it applies (the `RoundModifiers` allowlist) | Where the child sees it                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Six Labs         | Each Lab level changes one rule for one object (Power, Fusion reach, Guard perk, Supernova reach, top form) | Campaign, Voyage, Zen                                   | Object card, landing card, "Homeworld helped" line |
| Launch Bay       | Which launcher you fling with, and its tune (stats from FLIGHT.md)                                          | Campaign, Voyage, Zen                                   | Pre-level overlay chip, "Homeworld helped" line    |
| Greenhouse       | One chosen booster before a round (Comet Shower, Life Spark, Star Scope)                                    | Campaign, Voyage, Zen                                   | Booster row                                        |
| Dens and friends | Your Buddy comes from here: trait once per planet, help-ladder throws                                       | Campaign, Voyage, Zen                                   | Buddy chip, shield puff, "Homeworld helped" line   |
| Wishes           | A named goal for the round, voiced by a creature                                                            | Campaign, Voyage, Zen, Daily Planet (never Remix)       | Missions tab, thought bubbles on the Homeworld     |
| Landmarks        | A named feat to aim for; the Comet Pier also earns a launcher                                               | Counts in Campaign, Voyage, Zen, Daily Planet           | Landmark card, Next Up, results line               |
| Homeworld Level  | Raises the Lab cap (Lab level ≤ Homeworld Level + 1) and opens buildings                                    | (a cap, not a bonus)                                    | Level badge on the tab, Passport and Star Map      |
| Trips (M13)      | Essences of the planet you visit, mostly frost and ember                                                    | (outside rounds)                                        | Postcard, Lab cards                                |

All player-side bonuses go through the one power budget (4b): the max-legal-loadout bot, with every Lab, top form, launcher tune, Buddy and booster switched on, may add at most 15 points to the decent-aware 3-star rate on normal planets 21-60. The Launch Bay's tunes share that budget with the Labs (section 3.5).

### 1.5 The loop in one line

```
Fling → lands and creatures → Essences, stardust, new friends → Labs, Launch Bay, Buddy, Landmarks → the next fling is better and your Homeworld is bigger → fling again
```

---

## 2. The world

### 2.1 The map

The Homeworld is a small round planet seen face-on, as today (drag to spin, tap a plot). It has five parts. There is **no central building**: the middle of the planet is ground and sea, never a headquarters [C:originality].

| Part                  | What it is                                                                                                                                             | Grows with                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **The rim**           | Plots where buildings and decorations stand, evenly spaced around the edge                                                                             | Homeworld Level: 6/8/10/12/14 plots (decided) |
| **Land gaps**         | The strip of ground between two plots. Each gap shows one land you grew in rounds (2.2). One gap per plot.                                             | Plots                                         |
| **Landmark sites**    | Five fixed spots on the rim, each between two plot groups, where a Landmark rises. A site takes no plot. It shows a signpost until its Landmark opens. | One site per Homeworld Level                  |
| **The sky band**      | Everything around the planet: day and night, the sun and moon, weather, relit constellations, the atmosphere glow, the ring of light, drones           | Homeworld Level, Star Atlas, the real clock   |
| **The Floating Isle** | A small island that hovers beside the planet once the Sky Bridge Landmark is finished. It has 3 decoration spots (not plots) and friends visit it.     | The Sky Bridge Landmark                       |

**Geometry (starting values).** Planet radius = `min(w, h) × (0.2 + level × 0.028)` as today, so Level 5 is 70% bigger across than Level 1. The rim holds plots at equal angles; Landmark sites are drawn 1.4× the size of a building and sit on the rim between plot `k` and `k+1` for fixed `k` (site 1 after plot 1, site 2 after plot 4 and so on), so adding plots never moves a Landmark. Landmark sites do not count toward the plot table.

### 2.2 Lands on the Homeworld (the lands you grew)

This is how "homes for creatures" becomes visible. The ground between plots is not generic grass: each land gap shows one of the 17 lands, chosen from lands you have grown.

- The game counts, per land, how many sectors you finished a winning round with (campaign, Voyage, Zen), as a new `grown` tally in the profile. A land becomes **available** for the Homeworld once you have grown it on 10 sectors in total.
- By default each gap shows your most-grown available lands, spread so no land sits next to itself. Tap a gap to pick another available land. It is free, instant and undoable. Barren is never offered.
- A friend whose home land is on the Homeworld spends its day on that gap (4.3) and does its "home" idle (a happy wiggle, M6.5 pose). A friend with no matching gap lives by its Den and is just as happy; it only has no special spot. There is no bonus, no penalty and no number.
- A small leaf icon on the Friends sheet shows "Tide Otter's home land (Forest) is on your Homeworld". That is all the UI there is.
- Lands on the Homeworld have **no effect on rounds**. They are looks plus friend behaviour. Adjacency effects between buildings were cut [P:meta-homeworld-5], and lands do not bring them back.

Why it matters: it turns the 17 lands and the Lifebook recipes into something a child arranges and sees every visit, and it gives a reason to grow a land you rarely grow ("I want a Reef so Reef Darter has a home"). Wishes and Landmarks may point at it ("Grow 12 Meadow or Forest sectors") but never require it to be placed.

### 2.3 Day and night

Driven by `nightness()` in `seasons.ts` from the local clock, as today (full night 22:00-04:00, twilight 18:00-22:00 and 04:00-07:00).

| Time of day | Sky                                         | Friends                                                | Buildings                                        |
| ----------- | ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Morning     | Pale gold sky, the sun rises on the left    | Stretch, wake by the Den, first ones out to their land | Greenhouse panes steam up, drones yawn awake     |
| Day         | Blue sky, drifting clouds from Level 2      | Out on their lands, visiting each other, playing       | Labs puff small coloured smoke in their element  |
| Evening     | Pink to violet, the moon rises              | Gather at the Fountain or Lanterns if built            | Windows light up, Lanterns glow                  |
| Night       | Dark sky, constellations and meteor streaks | Most sleep in the Den (a soft "z"), night friends wake | Lit windows, the Beacon (if built) sweeps slowly |

**Night friends.** Pine Owl, Aurora Wolf and Glimfish are awake at night and do their best idles then. A child who opens the game at 20:00 still sees someone to wave at. Nobody is ever "asleep, come back later": tapping a sleeping friend makes it open one eye, wave and go back to sleep, and every sheet (dress-up, Buddy, friendship) still works.

### 2.4 Real seasons

From `seasonOf(date, hemisphere)`, which already respects the hemisphere setting.

| Season | Ground and sky                                            | Friend behaviour                                       | Seasonal dressing                            |
| ------ | --------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| Spring | Blossom petals drift (today's particles), greener palette | Weedproof friends tend flowers                         | Blossom garlands on Labs                     |
| Summer | Warmer light, longer day tint                             | Swimmers splash in the sea, Fireproof friends sunbathe | Bunting on the Den                           |
| Autumn | Falling leaves, amber land edges                          | Friends kick leaf piles                                | Acorn and leaf wreaths                       |
| Winter | Snow on roofs and the rim                                 | Frostproof friends make snowballs and snow angels      | Lights on buildings; a snow cap on Landmarks |

**Rule:** seasons change looks and routines only. No season-only reward, building, currency or Landmark. Nothing is missed by not visiting in a season.

### 2.5 Weather

A new, tiny date-seeded system (`src/meta/weather.ts`): `weatherOn(date, hemisphere)` picks one of five weathers from `rngFrom('WX-' + yyyy-mm-dd)`, weighted by season. Everyone in a hemisphere sees the same weather that day, like the Daily Planet, with no server.

| Weather | Chance (spring / summer / autumn / winter) | What you see                                                                         | What friends do                                                              |
| ------- | ------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Clear   | 45 / 60 / 40 / 35                          | Default sky                                                                          | Normal routines                                                              |
| Breezy  | 20 / 15 / 30 / 15                          | Clouds race, flags and flowers sway                                                  | Birds glide, friends chase leaves                                            |
| Drizzle | 25 / 10 / 25 / 10                          | Light rain streaks; puddles on land gaps; a rainbow for the last 2 hours of daylight | Swimmers and frogs dance in puddles, others wear the Rain Hat if they own it |
| Snow    | 0 / 0 / 0 / 35                             | Snowflakes, white roofs                                                              | Frostproof friends play, others huddle by the Lanterns                       |
| Starry  | 10 / 15 / 5 / 5 (night only; else Clear)   | Extra shooting stars                                                                 | Night friends stargaze with the Skyglass                                     |

**Rule:** weather never harms, dims, slows or pays. It is there so the Homeworld looks different on different days and so friends have something to react to. On the real meteor-shower dates in `SKY_EVENTS` the night sky shows that shower, with its name in photo mode; it pays nothing, so nobody misses anything.

---

## 3. Buildings

### 3.1 Rules for every building

1. **Plots.** One building or decoration per plot. Plots by Homeworld Level: 6/8/10/12/14 (decided). Moving is free and instant, as today. Placement never changes a number.
2. **Drones.** 2 drones, and a third free for everyone at Homeworld Level 3 (decided). Decorations and Lab level-ups need no drone.
3. **Build times.** Buildings other than Labs use today's ladder: level 1 in 30 seconds, then 5 minutes, 30 minutes, 2 hours and 4 hours. Each campaign win takes 10 minutes off every active build (today's `WIN_SPEEDUP`). Times show as a clock time ("Ready at 14:30"), never a countdown (M0).
4. **Never skipped with money or gems.** There is no skip button of any kind.
5. **Lab level-ups are instant** once paid (decided): there is never a timer on shot power.
6. **Building level cap.** A building's level can't be more than the Homeworld Level, except Labs, which can be Homeworld Level + 1 (decided).
7. **While upgrading, a building keeps working at its old level** (today's `effLevel`).
8. **Art.** Every building is drawn in code (`structures.ts`). A building's own level adds details (a pennant at 3, a gold star at 5, as today). The **Homeworld Level** sets the material tier for every building at once: Levels 1-2 painted wood, 3-4 stone and glass, 5 crystal trim (M6.5 "a Homeworld building art tier per Homeworld Level"). It is the whole planet maturing, not one headquarters levelling [C:originality].
9. **Costs** in this section are starting values. `tests/economy.sim.ts` tunes them into the bands in 10.4.

### 3.2 The roster at launch

| Building      | Max | Opens at               | Build cost (✨)               | Levels | Needs a drone | Changes in rounds                                                    |
| ------------- | --- | ---------------------- | ----------------------------- | ------ | ------------- | -------------------------------------------------------------------- |
| Rock Lab      | 1   | Homeworld opens (P5)   | First Lab free, then 300 each | 1-5    | Build only    | Rock's Power, Fusion reach, Firewall, Supernova reach, Pebble Shower |
| Ice Lab       | 1   | Homeworld opens        | 300                           | 1-5    | Build only    | Ice Comet (Vent Cooler, Rime Comet)                                  |
| Seed Lab      | 1   | Seed Pod unlocked (P2) | 300                           | 1-5    | Build only    | Seed Pod (Strong Roots, Grove Pod)                                   |
| Magma Lab     | 1   | Magma unlocked (P4)    | 300                           | 1-5    | Build only    | Magma (Weed Burner, Obsidian Flow)                                   |
| Rain Lab      | 1   | Rain Cloud (P7)        | 300                           | 1-5    | Build only    | Rain Cloud (Rinse, Monsoon)                                          |
| Sun Lab       | 1   | Sunburst (P11)         | 300                           | 1-5    | Build only    | Sunburst (Frost Melter, Solar Flare)                                 |
| Den           | 2   | Homeworld opens        | 250                           | 1-5    | Yes           | Houses friends; your Buddy comes from here                           |
| Greenhouse    | 2   | Homeworld Level 2      | 600                           | 1-3    | Yes           | One chosen booster per 6 wins                                        |
| Launch Bay    | 1   | Homeworld Level 2      | 800                           | 1-5    | Yes           | Launchers: choose, tune, try; trips from M13                         |
| Fountain      | 2   | Homeworld opens        | 300                           | –      | No            | Looks only                                                           |
| Lantern       | 3   | Homeworld opens        | 200                           | –      | No            | Looks only                                                           |
| Comet Flowers | 3   | Homeworld Level 2      | 400                           | –      | No            | Looks only                                                           |
| Keeper Statue | 1   | Homeworld opens        | 120 gems                      | –      | No            | Looks only                                                           |

Retired (decided in 4e, plus one here): Stardust Mill, Crystal Grove, Observatory, charm, resident requests, **meteor rocks** (the 3-hourly debris on empty plots: a chore with no stakes `[HW]`), and the **Launch Tower** (merged into the Launch Bay; see 15).

**Plot plan at Level 5:** 6 Labs + 2 Dens + 2 Greenhouses + 1 Launch Bay = 11, leaving 3 plots for decorations, plus 3 spots on the Floating Isle. That is the same arithmetic as 4e ("6 Labs, 2 Dens, 2 Greenhouses and a Tower plus decorations").

### 3.3 The six Labs

The ladder, costs and perks are decided in ROADMAP-v2 4b and not repeated in full. Summary: level 2 Power (400 ✨ + 10), 3 Fusion reach (1,200 + 25), 4 Guard perk (3,000 + 50), 5 Supernova reach (7,000 + 90), then a top form unlocked by a feat. Essences: Rock stone, Ice frost, Seed leaf, Magma ember, Rain dew, Sun leaf.

What this doc adds:

| Topic                | Rule                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Lab card         | Top: the object, its three stat bars and its job. Middle: "For your next throw" with the level's one-line effect. Bottom: the next level's cost with a pouch bar per colour, or the reason it is locked in plain words ("Grow your Homeworld to Level 3"). |
| Perk visibility      | A perk row is shown only once its system has been taught (decided). Before that the row reads "A new trick, later".                                                                                                                                        |
| Top form             | Shown as a silhouette with its feat counter ("Steam 4/10"). When the feat completes during a round, the form is revealed on that planet; the Lab shows an on/off switch afterwards.                                                                        |
| Art per level        | Lv1 a small workshop with the object's badge; Lv2 a chimney that puffs the element colour; Lv3 a second floor; Lv4 a shield emblem (the Guard perk); Lv5 a glowing dome; top form: the object orbits the roof.                                             |
| Friend reaction      | When a Lab levels up, friends whose trait matches the element run over and cheer (Fireproof friends for Magma and Sun, Swimmers for Ice and Rain, Weedproof for Seed, Frostproof for Rock and Ice).                                                        |
| First hour (decided) | At planet 5: "Build your first Lab" suggests the object you threw most, is free and takes 30 seconds. Then "Invite a friend". 100 ✨ fixed reward shown up front.                                                                                          |

### 3.4 Den and Greenhouse

**Den** (up to 2; room = level + 1 each; 12 friends at most at launch, decided).

| Den level | Room | Upgrade cost (✨) | Build time | Art                                         |
| --------- | ---- | ----------------- | ---------- | ------------------------------------------- |
| 1         | 2    | 250               | 30 s       | A burrow with a round door and a grass roof |
| 2         | 3    | 630               | 5 min      | A window with a flower box                  |
| 3         | 4    | 1,500             | 30 min     | A second round door and a chimney           |
| 4         | 5    | 3,500             | 2 h        | A little balcony where one friend sits      |
| 5         | 6    | 7,500             | 4 h        | A lit sign with the friends' portraits      |

Den rules: a full Den never turns a creature away with sad copy. The invite list says "Make room: upgrade a Den" instead. Friends in a Den are drawn around the planet, not inside it; the Den is where they sleep at night.

**Greenhouse** (up to 2, decided). It holds boosters and you choose the type (decided). This doc changes how it refills: **one booster per 6 campaign, Voyage or Zen wins**, instead of every 12 hours (see 15, question 2: two Greenhouses on a 12-hour clock give a Regular player 4 boosters a day, 0.67 per planet, which alone breaks the 0.5 booster band).

| Greenhouse level | Holds | Wins per booster | Upgrade cost (✨) | Build time | Art                                |
| ---------------- | ----- | ---------------- | ----------------- | ---------- | ---------------------------------- |
| 1                | 1     | 6                | 600               | 30 s       | A glass dome with three sprouts    |
| 2                | 2     | 6                | 1,500             | 5 min      | A taller dome, a watering drone    |
| 3                | 3     | 6                | 3,600             | 30 min     | A crystal dome with glowing plants |

- Choose Comet Shower, Life Spark or Star Scope on the Greenhouse card. Changing the choice never loses progress.
- A growing plant inside the dome shows progress (a sprout, then a bud, then a flower on the 6th win). No bar, no clock.
- Levels raise **storage only**, so the rate is flat: 2 Greenhouses give at most 1 booster per 3 wins (0.33 per planet), leaving room in the 0.5 band for chapter chests, the Star Road and Momentum.
- A full Greenhouse just stops growing; nothing is lost, and the Collect chip shows it.

### 3.5 The Launch Bay

**Purpose:** "Where your launchers live, where you tune them and where you try them." From M13 it also sends friends on trips. It replaces today's Launch Tower (see 15, question 1): one rocket-themed building instead of two with nearly the same name, and the plot arithmetic in 4e stays the same.

**Scope split with FLIGHT.md.** FLIGHT.md designs the launchers: how many, their names, their flight stats and what each tune step changes. This doc designs the building: its levels, how launchers are earned into it, how tunes are paid for and capped, the "Try it" practice, and the rules any launcher must follow.

**Launch Bay levels**

| Bay level | Needs          | Upgrade cost (✨) | Build time | Opens                                                                              | Art                                               |
| --------- | -------------- | ----------------- | ---------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1         | Homeworld Lv 2 | 800               | 30 s       | Holds every launcher you've earned; choose one; "Try it"; every launcher at Tune 1 | A launch pad with a gantry and one rack           |
| 2         | Homeworld Lv 2 | 2,000             | 5 min      | Tune 2; trips of 1 hour (M13)                                                      | A second rack, blinking runway lights             |
| 3         | Homeworld Lv 3 | 4,800             | 30 min     | Tune 3; trips of 4 hours (M13)                                                     | A control booth with a friend at the window       |
| 4         | Homeworld Lv 4 | 11,200            | 2 h        | Trips of 8 hours (M13)                                                             | A radar dish and a hangar door                    |
| 5         | Homeworld Lv 5 | 24,000            | 4 h        | Tune 4                                                                             | Crystal trim; the pad lights in your trail colour |

**Tunes.** Each launcher has four tune steps. Tune 1 is what you get when you earn it. Each further step changes one named thing about that launcher (FLIGHT.md writes the line, for example "Thumper: the aim line grows from 16 to 19 steps"). Tune-ups are **instant** once paid, like Labs: no timer on power.

| Tune | Cost (✨) | Essences (the launcher's colour) | Bay level needed |
| ---- | --------- | -------------------------------- | ---------------- |
| 1    | earned    | –                                | 1                |
| 2    | 1,500     | 15                               | 2                |
| 3    | 4,000     | 35                               | 3                |
| 4    | 9,000     | 60                               | 5                |

FLIGHT.md assigns each launcher **one Essence colour, taken from leaf, dew or stone only**. Frost and ember are the scarce colours and are kept for the Ice Lab, the Magma Lab and Homeworld Levels (10.3). At least two launchers should use leaf, the surplus colour.

**How launchers are earned (never sold).** A launcher is only ever earned by play. The allowed earn channels, and a proposed schedule for FLIGHT.md to fill with names:

| Slot | Earned by                                                         | Typical day (Regular) | Channel type  |
| ---- | ----------------------------------------------------------------- | --------------------- | ------------- |
| 1    | Everyone starts with it                                           | 0                     | Default       |
| 2    | The chapter 2 chest (contents shown before it opens)              | about 3               | Chapter chest |
| 3    | A flight feat from FLIGHT.md, counted in campaign, Voyage and Zen | about 7-12            | Feat          |
| 4    | The Comet Pier Landmark (6.3)                                     | about 20-30           | Landmark      |
| 5    | Completing any 3 Lifebook habitat sets                            | about 25-40           | Collection    |
| 6    | The chapter 10 chest (after the planet-100 Comet Guardian)        | about 17-20           | Chapter chest |

**Adopted schedule:** ROADMAP-v2 uses FLIGHT.md 1.5's version of this table (the Swoop from the chapter 3 chest, the Pinpoint from the chapter 5 chest, the Skipper from the chapter 6 chest, and every launcher joining at the later of its channel and its ladder planet, from planet 31). The chapter 2 and chapter 10 chests above are the alternative in ROADMAP-v2 decision 11.

Forbidden channels: real money, gems, stardust purchase, random chests, the Cosmic Pass paid lane, time-limited events, and anything that expires. The Star Road free lane may carry launcher **skins** (looks), never launchers.

**Launcher looks vs launchers.** A launcher (earned, with stats) and a launcher skin (looks) are different things. Skins come from Styles, can be earned or bought, apply on top of any launcher and never change flight. Today's Starter Crew "launcher" becomes a skin (see 15, question 7). The readability CI rule from M12 applies: a skin may not change the aim line, the object's silhouette or the launch strength indicator.

**Try it.** The Bay card has a "Try it" button on every launcher, including ones you can't afford to tune yet ("Try Tune 3"). It opens a practice planet: planet 1's layout, 8 throws, no rewards, no stars, no ledger earnings, and leaving is one tap. It uses the same round scene with a `practice` mode flag. It lets a child feel a launcher before choosing it, which is the whole point of the building.

**Rules any launcher must follow** (this doc's contract with FLIGHT.md):

1. It goes through `RoundModifiers` with the per-mode allowlist: on in campaign, Voyage and Zen; off in Daily Planet, Meteor Rush, Challenge and Remix (those use the starter launcher at Tune 1, with the player's skin, so every player flies the same).
2. It counts in the max-legal-loadout band together with Labs (at most +15 points to the decent-aware 3-star rate on normal planets 21-60; decent Hard fail at least 20%).
3. The solver never uses it, so star targets stay beatable with the starter launcher.
4. It never adds throws, never reveals the next objects beyond Star Scope's rule, never changes Trouble timing, and never changes per-object gravity (cut in 4b).
5. Switching launchers is free, instant and remembered. The pre-level overlay shows the chosen launcher as a chip next to the Buddy chip; tapping it opens a 1-row picker.

**Trips (M13), inside the Launch Bay.** The decided M13 rules apply, now launched from the Bay: pick one of your planets; the game picks the best friend and shows the yield before you send; 1/4/8 hours by Bay level; one at a time; about 8-10 frost from an 8-hour trip with a match; a postcard of the real planet, shared through the gate. Additions: the return time shows as a clock time; each campaign win takes 10 minutes off (as for builds); the friend is drawn on the pad waving goodbye and in the postcard on return; trips pay Essences and at most 3 gems, **no stardust** (so trips add nothing to idle stardust).

### 3.6 Decorations

Decorations are looks only (charm is retired). They go on plots or, after the Sky Bridge, on the Floating Isle's 3 spots.

| Source                  | Examples at launch                                                                 | Price                   |
| ----------------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| Base set                | Fountain, Lantern, Comet Flowers                                                   | 200-400 ✨              |
| Gem singles             | Keeper Statue (120), plus Road singles such as a Swing, a Kite Post, a Bubble Arch | 60-300 gems             |
| Stardust looks          | Picnic Blanket, Star Lamp, Topiary Otter                                           | 5,000-50,000 ✨ (M11.7) |
| Earned in play          | Sprout Garden gift (Sprout Flowers), best-friend keepsakes (4.4), Wish samplers    | Free                    |
| Homeworld Themes (paid) | Skins of the base set (Tidepool Fountain, Comet Candy Lantern)                     | Inside a $2.99 Theme    |

Friends react to decorations (4.3): they gather at the Fountain in the evening, swing on the Swing, fly kites at the Kite Post on Breezy days. The reaction is the reward.

---

## 4. Friends

### 4.1 Moving in

- **Who:** any creature you have seen, as today; there is no building or habitat gate (the critics cut "needs its Workshop first").
- **How:** Friends sheet → "Invite", or tap the creature's card in the Lifebook → "Invite home". The Den must have room.
- **The moment (M6.5 celebration, under 2 s; 4 s the first time):** a small bubble-ship arrives from the sky, lands on the creature's home land gap (or by the Den), the creature hops out, looks around and waves. Friends already living there wave back. A banner: "Tide Otter moved in!"
- **Moving out:** "Take a trip home" (the Friends sheet). Copy: "Tide Otter goes back to its planet for a while. It will remember you." Friendship is kept (today's `friends` record). Nothing is lost and it can come back any time.
- **First friend (decided):** at planet 5 the first creature you met moves in as step 2 of the first hour.

### 4.2 Homes

Each friend has three places, all derived, none stored:

1. **Its bed:** the Den it belongs to (the first Den with room when it moved in).
2. **Its home land:** the land gap showing the first land in its Lifebook recipe (`SpeciesDef.home[0]`; legendaries: the gap with the most life for World Tree Spirit, the sea for Leviathan). If no gap shows it, the friend's home spot is its Den.
3. **Its favourite decoration:** set by personality (4.3). If you own one, the friend visits it in the evening.

### 4.3 Daily life, routines and personalities

Routines are **derived from the clock, weather and season**, never stored and never timed. A routine is a short loop of idle animations and walks along the rim, drawn with the M6.5 creature kit (idle loop plus happy, surprised and wave poses). There is no "needs" meter of any kind.

**Personalities come from the trait**, so a child can predict them ("Newts live on volcanoes, so they love warm lanterns"). These labels are internal; the player sees only the trait icon.

| Trait (personality) | Home lands                                 | Favourite decoration | Day                                          | Evening                              | Weather and season                                 |
| ------------------- | ------------------------------------------ | -------------------- | -------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| Fireproof (sunny)   | Volcano, Desert, Savanna, Hot Springs      | Lantern              | Sunbathes, does little hops on warm lands    | Warms its toes by a Lantern          | Loves summer; in Snow it wears a scarf and huddles |
| Swimmer (splashy)   | Ocean, Reef, Marsh, Swamp                  | Fountain             | Splashes at the sea edge, floats on its back | Blows bubbles at the Fountain        | Drizzle: dances in puddles                         |
| Weedproof (leafy)   | Forest, Jungle, Meadow, Highland           | Comet Flowers        | Tends flowers, naps under trees              | Picnics near flowers                 | Spring: carries petals; Autumn: kicks leaf piles   |
| Frostproof (frosty) | Tundra, Taiga, Ice Sheet, Mountain         | Keeper Statue        | Climbs the tallest building and looks out    | Stargazes (at the Skyglass if built) | Winter and Snow: snowballs, snow angels            |
| Calm (dreamy)       | Planet-wide (World Tree Spirit, Leviathan) | Any Landmark         | Floats slowly around the whole rim, glowing  | Sits on the Beacon or the Isle       | Starry: its glow pulses with the shooting stars    |

**The day, as a schedule** (local time, from `nightness`):

| Time        | Everyone                                                                           |
| ----------- | ---------------------------------------------------------------------------------- |
| 04:00-07:00 | Night friends head home; others stir                                               |
| 07:00-10:00 | Wake, stretch, walk to their home land                                             |
| 10:00-17:00 | Day routine by personality; two friends may meet and play together                 |
| 17:00-21:00 | Evening routine; groups gather at decorations                                      |
| 21:00-04:00 | Sleep at the Den (soft "z"); night friends (Pine Owl, Aurora Wolf, Glimfish) awake |

**Friends playing together.** Every few seconds, two friends on neighbouring gaps may meet and do a shared animation (high-five, chase, share a snack). Pairs are picked deterministically from the minute and their ids, so a screenshot is repeatable in tests. Best friends of the Keeper follow the Keeper for a few steps when it walks by.

**Tapping a friend** always does something: it turns, does its happy pose, and a small card opens with its name (or nickname), trait icon, friendship bar, its Wish if it has one, and buttons: Dress up, Name, Make Buddy, Trip home. Tapping gives **no reward**. There is no daily greeting, pat or chore (cut: Hearts and daily greetings [C:kid safety] [C:originality]).

### 4.4 Friendship

Decided in 4e: friendship grows from its Wishes (+2), wins with it as your Buddy (+1) and, from M13, trips (+1 to +3). No daily cap, no greeting chore, no "come back tomorrow". Levels at 3/8/15/25 points pay 5 × level gems once and accessories; the best-friend letter pays 25 gems.

| Friendship level | Points | Gift (paid at once)                                        | Also unlocks                                                                                                  |
| ---------------- | ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1                | 0      | –                                                          | –                                                                                                             |
| 2                | 3      | 10 gems, the Bow                                           | Its name shows a small heart on the Friends sheet                                                             |
| 3                | 8      | 15 gems, the Flower                                        | Its **signature move**: one species-specific idle (Tide Otter juggles pebbles, Crag Goat leaps between roofs) |
| 4                | 15     | 20 gems, the Scarf                                         | It waves at the Keeper from anywhere on the rim                                                               |
| 5 (best friends) | 25     | 25 gems, the Tiny Crown, the letter (25 gems), its memento | Its **keepsake** becomes a free decoration (for example the Otter's Pebble Pile)                              |

- The gems are paid the moment the friendship point arrives, usually on the results card. The **celebration** (the friend dancing, the accessory reveal) plays on the next Homeworld visit, and the Homeworld badge counts it as something to see. The value is never held back to force a visit.
- Keepsakes are 36 free decorations, one per species, earned only. They make the "all friends" goal visible on the Homeworld.

### 4.5 Wishes on the Homeworld

Wishes are decided in 4e and built in M4 (three a day, date-seeded, rewards up front, never expire, one free swap, feats from rounds, never "fling 25 objects"). The Homeworld shows them:

- A friend who has a Wish shows a thought bubble with the icon of what it wants (a land, a Fusion, a Trouble). Tapping it opens the Wish card in Missions.
- A Wish from a creature that doesn't live with you is shown as a postcard pinned on the Den door.
- From M13, Wishes come first from friends who live with you, asking for their home-land feats (decided).
- **No Wish ever asks for a Homeworld chore** (collect, place, tap a friend). Wishes are always about rounds.

### 4.6 The Buddy

- **Who:** any friend who lives on your Homeworld (see 15, question 3; today the Buddy comes from creatures seen 5 times). This makes "invite them to your Den → your Buddy helps" (4e loop 2) literal.
- **Choosing:** on the pre-level overlay, one chip, suggested from the forecast ("Ember Vent ahead: Ember Newt is fireproof"), remembered, 0 extra taps (decided in M8). Also from the friend's card: "Make Buddy".
- **In the round (decided):** once per planet its trait skips the first action of the matching Trouble; it brings 2 throws on the 3rd fail; it cheers; +1 friendship per win with it.
- **On the Homeworld:** the Buddy walks beside the Keeper, wears a small scarf in the Keeper's colour, and when you come back from a win it runs up with a victory hop.
- **Before any friend lives with you** (only possible before planet 5, when the Buddy doesn't help yet), no Buddy is shown.

### 4.7 Dress-up

- Accessories: 4 from friendship, 2 gem singles (40 each, as today), 10 festival keepsakes (never sold), plus Theme outfits (paid looks, 2 per Theme) and Road outfits.
- Nicknames from the fixed kid-safe list (today's 32 `NICKNAMES`), never free text.
- With no accessory picked, a friend wears this month's festival costume (as today).
- The Buddy wears the same accessory in rounds. A paid outfit is never hidden: if the family bought it, it shows wherever that friend appears.
- Readability: an outfit may never cover more than the top third of a creature's silhouette, so the Lifebook silhouette stays recognisable.

### 4.8 How friends react to what you do

| You do                                  | Friends do (under 2 s, skippable, Reduce Motion: a fade and one pose) |
| --------------------------------------- | --------------------------------------------------------------------- |
| Open the Homeworld after a win          | The Buddy runs to the Keeper and hops; one random friend waves        |
| Open after 3-star                       | Everyone does the happy pose once                                     |
| A Lab levels up                         | Friends with the matching trait run over and cheer                    |
| A new friend moves in                   | Everyone waves; the newcomer waves back                               |
| A Landmark stage is built               | Friends carry tiny flags to the site (visual only) and cheer          |
| A Landmark is finished                  | A party at the site: confetti, every friend dances, the Keeper bows   |
| Homeworld Level up                      | The skyline change plays, then a short parade around the rim          |
| You plant a new land in a gap           | The friend whose home land it is runs to it and does its home wiggle  |
| You place a decoration                  | The nearest friend with that favourite decoration comes to look       |
| A friendship level celebration is ready | That friend stands by the Keeper with a gift bow                      |
| You open photo mode                     | Friends turn toward the camera and pose                               |

### 4.9 Kid-safety rules for friends

1. No hunger, thirst, dirt, boredom, illness, sadness or loneliness meters. No "your friends miss you".
2. Friends never leave on their own, never fight, never get hurt, never need anything from the player.
3. No daily greeting, daily cap, streak or "come back tomorrow". Nothing decays while you are away.
4. Tapping a friend never pays, so there is no reason to tap-farm.
5. Words: "moved in", "trip home", "sleeping", "best friends". Never "died", "lost", "abandoned", "starving".
6. Every Wish and every friendship point comes from rounds, never from a Homeworld chore.

---

## 5. Homeworld Levels

The Homeworld Level is the planet growing, not a building (decided). Levelling up needs a finished chapter, stardust and Essences only; skill feats never gate a level (decided). The level shows on the Homeworld tab, the Passport and the Star Map. Money never buys a level.

### 5.1 Levels 1-5 (launch)

Requirements and the first four "opens" columns are decided in 4e; the visible-change and Landmark columns are added here.

| Level | Needs                                                | Opens (decided)                                                             | Also opens (this doc)                       | The visible change                                                                                      |
| ----- | ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1     | Planet 5                                             | 6 plots, Labs up to level 2, the Den                                        | Land gaps; Landmark site 1 (from planet 29) | A small planet of meadow and bare rock, one lake, painted-wood buildings                                |
| 2     | Chapter 1 done, 1,500 ✨, 20 leaf, 20 dew            | 8 plots, Labs up to level 3, Greenhouse, Launch Tower, a new ground palette | Launch Bay (instead of the Tower); site 2   | The planet grows; clouds drift across the sky; lakes become a sea with small waves                      |
| 3     | Chapter 3 done, 5,000 ✨, 40 stone, 30 ember         | 10 plots, Labs up to level 4, the third drone (free), an atmosphere glow    | Site 3                                      | A soft blue atmosphere halo; buildings turn to stone and glass; a third drone joins the orbit           |
| 4     | Chapter 5 done, 12,000 ✨, 40 frost, 40 dew, 40 leaf | 12 plots, Labs up to level 5                                                | Site 4; a small moon                        | A little moon rises and orbits slowly; night friends wave at it                                         |
| 5     | Chapter 8 done, 30,000 ✨, 60 of each Essence        | 14 plots, a ring of light, top-tier building art                            | Site 5                                      | A ring of light circles the planet; crystal trim on every building; the Homeworld glows on the Star Map |

**The level-up sheet** (replaces today's Expand sheet): a picture of the planet now and at the next level side by side; the checklist (chapter, stardust, each Essence as a bar); and "What opens" as icons with one line each. The Level-up button is active only when everything is ticked. Pressing it plays the skyline change (section 12.5) and names what opened.

**Band (decided):** a Regular player reaches Level 5 no earlier than day 28. This doc adds a Watch band: Regular reaches Level 5 no later than day 60, so it is never a wall.

### 5.2 Levels 6-10 (after launch, milestone M17)

These levels add **homes, room and sky, never shot power**. The Lab cap stays at level 5 with top forms; the Launch Bay stays at Tune 4. So no power band can move.

| Level | Needs                                                                         | Opens                                                                             | The visible change                                               |
| ----- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 6     | Chapter 11 done, 40,000 ✨, 80 each of stone, dew, leaf; 40 ember, 40 frost   | 16 plots; a third Den (18 friends); Landmark site 6 (Moon Garden)                 | The moon grows a garden; friends visit it at night by a moonbeam |
| 7     | Chapter 14 done, 50,000 ✨, 100 each of stone, dew, leaf; 50 ember, 50 frost  | 18 plots; a second Floating Isle (3 more decoration spots); site 7                | A second isle and a rope bridge between the isles                |
| 8     | Chapter 17 done, 65,000 ✨, 120 each of stone, dew, leaf; 60 ember, 60 frost  | 20 plots; a fourth Den (24 friends); site 8                                       | A cloud ring in the sky that friends can hop across              |
| 9     | Chapter 20 done, 80,000 ✨, 140 each of stone, dew, leaf; 70 ember, 70 frost  | 22 plots; site 9                                                                  | An aurora at night in the colour of your Homeworld paint         |
| 10    | Chapter 24 done, 100,000 ✨, 160 each of stone, dew, leaf; 80 ember, 80 frost | 24 plots; site 10; your Homeworld appears as a small bright world on the Star Map | A second ring of light; a gold crown of stars on the Beacon      |

**Band (M17):** Regular reaches Level 10 no earlier than day 120. Every level still needs chapters, stardust and Essences only.

---

## 6. Landmarks: the big goals

The owner asked for "do stuff for it" long-term goals. Landmarks are that: big, multi-step builds that each transform a part of the planet, fed by what you do in rounds.

### 6.1 Rules

1. **One site per Homeworld Level.** A Landmark opens when its site's Homeworld Level is reached and the previous Landmark is finished. At most one Landmark is in progress at a time, so the child always knows which one.
2. **Stages.** Each Landmark has 3-4 stages. Every stage but the last is a **round feat** in the same words as Wishes (lands, creatures, Fusions, Troubles, stars, Supernovas). The last stage is a **delivery** of Essences, and only leaf, dew or stone. Landmarks never ask for frost or ember (10.3).
3. **Play-gated, never wait-gated.** No timers anywhere. A stage completes the moment its feat is met; the build plays the next time you open the Homeworld (tap the glowing site). Feats count in campaign, Voyage, Zen and Daily Planet, never in Remix, Meteor Rush or Challenge.
4. **Sized for 2-5 rounds.** For a Regular player each feat stage takes 1-3 days of normal play. The economy sim gates it (10.4).
5. **Never a skill wall.** Every feat has an "or" route of equal effort, and no feat asks for a Super Hard win or a Hard win without an alternative. A feat is only offered once its system has been taught (the unlock ladder).
6. **Progress counts across the Wishes.** A throw can advance a Wish and a Landmark at once. Progress counts only first arrivals and new bests, like Wishes (M0 churn rules).
7. **Never expire, never decay.** Progress is kept forever. There is nothing to lose.
8. **Rewards shown up front.** Each stage's reward is on the card before you start. There is no random or mystery reward.
9. **No money.** Nothing on a Landmark can be bought, skipped or sped up.

### 6.2 Launch Landmarks

**Landmark 1: Sprout Garden** (site 1, opens at planet 29 as the ladder's intro; Homeworld Level 1; moved from 26, which teaches Combo in FLIGHT.md)
_A walled garden beside the Den that fills with flowers, where friends picnic at noon._

| Stage | Ask (or)                                             | Taught at | Reward            |
| ----- | ---------------------------------------------------- | --------- | ----------------- |
| 1     | Grow 12 Meadow or Forest sectors                     | P2        | 100 ✨            |
| 2     | Welcome 8 creatures to your planets (first arrivals) | P3        | 10 gems           |
| 3     | Make 3 Wildflowers, or make 3 Rain Gardens           | P13 / P22 | 150 ✨            |
| 4     | Bring 15 leaf                                        | –         | The garden blooms |

Finished: Sprout Flowers decoration (free), the "Green Thumb" title, a noon picnic routine for every friend.

**Landmark 2: Skyglass** (site 2; Homeworld Level 2) — "build an observatory that reveals a constellation"
_A brass telescope on a little hill. At night it swings to point at the stars._

| Stage | Ask (or)                                          | Taught at | Reward             |
| ----- | ------------------------------------------------- | --------- | ------------------ |
| 1     | Earn 12 new stars                                 | P1        | 100 ✨             |
| 2     | Fire 6 Supernovas                                 | P9        | 10 gems            |
| 3     | Make Steam 4 times, or make 4 Fusions of any kind | P8        | 150 ✨             |
| 4     | Bring 20 stone and 15 dew                         | –         | The Skyglass opens |

Finished: reveals a **seventh constellation, "The Keeper's Kite"**, which only the Skyglass can find. It joins the Star Atlas with its bundles (leaf, dew and stone only) and its own reward (a kite trail look). At night, tapping the Skyglass shows the names of your lit constellations. Sticker: "Stargazer".

**Landmark 3: Sky Bridge** (site 3; Homeworld Level 3) — "a bridge to a new island"
_A rope-and-plank bridge that reaches out to a small floating isle beside your planet._

| Stage | Ask (or)                                                       | Taught at | Reward                  |
| ----- | -------------------------------------------------------------- | --------- | ----------------------- |
| 1     | Grow 15 Mountain or Highland sectors                           | P1        | 150 ✨                  |
| 2     | Make 3 Glaciers, or grow 10 Tundra, Taiga or Ice Sheet sectors | P25       | 15 gems                 |
| 3     | Cool 4 Ember Vents, or clear 4 Tanglevines                     | P14 / P28 | 200 ✨                  |
| 4     | Bring 40 stone and 20 dew                                      | –         | The bridge and the Isle |

Finished: the **Floating Isle** with 3 decoration spots; friends cross the bridge to visit it; the "Bridge Builder" title.

**Landmark 4: Comet Pier** (site 4; Homeworld Level 4)
_A pier out over the sea with a launch rail at the end, where your launchers are shown off._

| Stage | Ask (or)                                       | Taught at | Reward                  |
| ----- | ---------------------------------------------- | --------- | ----------------------- |
| 1     | Win 3 Hard planets, or 3-star 6 Normal planets | P15       | 200 ✨                  |
| 2     | Settle 8 Troubles of any kind                  | P14       | 15 gems                 |
| 3     | Make 10 Fusions                                | P8        | 250 ✨                  |
| 4     | Bring 40 leaf and 30 dew                       | –         | The pier and a launcher |

Finished: **launcher slot 4** (3.5); "Try it" can now also be played from the end of the pier; the "Harbour Keeper" title.

**Landmark 5: Keeper's Beacon** (site 5; Homeworld Level 5)
_A tall lighthouse of crystal. Its light sweeps the rim at night and lights the ring of light._

| Stage | Ask (or)                                                                  | Taught at | Reward            |
| ----- | ------------------------------------------------------------------------- | --------- | ----------------- |
| 1     | Meet 3 kinds of creature you haven't met, or 3-star 5 planets             | P3        | 250 ✨            |
| 2     | Become best friends with any friend, or reach friendship 3 with 4 friends | P5        | 20 gems           |
| 3     | Light 2 constellations in the Star Atlas                                  | P23       | 300 ✨            |
| 4     | Bring 50 leaf, 50 stone and 50 dew                                        | –         | The Beacon lights |

Finished: a one-time lantern parade of every friend around the rim (the biggest Showtime moment on the Homeworld, up to 6 s the first time, skippable); the Beacon music theme on the Homeworld; a free gold photo frame; the "Keeper of Light" title. Stages that are already true when the Landmark opens (for example, you already have a best friend) complete at once and celebrate on the first visit.

### 6.3 After launch

- **Landmarks 6-10** open with Homeworld Levels 6-10 in M17. Working titles: Moon Garden, Coral Steps, Cloud Swing, Crystal Grotto, Star Harbour. Same rules.
- **One new Landmark per Star Road** (from Road 1, M14): a free, play-gated Landmark whose feats use the Road's weekly Voyage themes, with a decoration and a title as its gift. It stays open after the Road ends (Past Roads rule: nothing expires). It is the long-tail "do stuff for it" content for day 60 and after, and it costs only code-drawn art and about 10 strings per Road.

---

## 7. Loops and synergies

### 7.1 With the core round

| Link            | Homeworld → round                                 | Round → Homeworld                                           |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| Labs            | Objects gain Power, reach, Guard perks, top forms | Essences from the lands you grew; top-form feats            |
| Launch Bay      | The chosen launcher and its tune                  | Launchers from chests, feats, the Comet Pier, habitat sets  |
| Greenhouse      | One chosen booster                                | Grows one booster per 6 wins                                |
| Buddy           | Trait once per planet; help-ladder throws         | +1 friendship per win with it                               |
| Wishes          | A named goal for the round                        | Gems, stardust, Road points, +2 friendship                  |
| Landmarks       | A named feat to aim for                           | Stage progress; Essences delivered                          |
| Homeworld lands | (looks only)                                      | The `grown` tally from winning rounds                       |
| Builds          | –                                                 | Each campaign win takes 10 minutes off every build and trip |

**The "Homeworld helped" line** on results (decided: one line). If several things helped, it shows the first in this order: a Lab Guard perk stopped a Trouble; the Buddy's trait acted; a top form fired; a launcher tune made a difference (FLIGHT.md defines when); a Lab Power level; a booster from the Greenhouse. Below it, at most one Homeworld progress line: "Sprout Garden: 9/12 Meadow or Forest" or "+6 leaf for your Seed Lab".

### 7.2 With the rest of the game

| System        | How it touches the Homeworld                                                                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Star Atlas    | Lit constellations shine in the Homeworld sky (today). The Skyglass reveals the seventh constellation. The Beacon's stage 3 asks for 2 lit constellations.                                                                                    |
| Lifebook      | Every friend comes from it; "Invite home" from any creature card; habitat sets count toward launcher slot 5; keepsakes appear on each species' page.                                                                                          |
| Festivals     | Friends without an accessory wear the month's costume (today). During a festival the Homeworld gets that festival's dressing (bunting, lanterns) and friends do one festival dance in the evening. No festival reward lives on the Homeworld. |
| Seasons       | Looks and routines only (2.4).                                                                                                                                                                                                                |
| Weekly Voyage | Counts for Wishes and Landmark feats. The week's theme shows as a flag on the Launch Bay.                                                                                                                                                     |
| Daily Planet  | Counts for Wishes and Landmark feats; no Homeworld bonus applies inside it.                                                                                                                                                                   |
| Remix         | Nothing from the Homeworld applies (decided). A gold Remix frame for a chapter may hang on the Keeper's Beacon as a small gold star per chapter: looks only, never a gate (REMIX.md).                                                         |
| Star Road     | Wishes give Road points (decided); Landmarks do not, so the daily cap stays simple. The free lane carries decorations, paints and launcher skins; the Cosmic Pass lane carries Homeworld looks.                                               |
| Passport      | Shows the Homeworld Level, Landmarks finished (0-5) and best friends (n/36).                                                                                                                                                                  |
| Inbox         | One letter when a Landmark opens and one when it finishes. No prices ever.                                                                                                                                                                    |
| Visitors      | Visiting creatures (M0 rules) are drawn walking on the rim when you open the Homeworld; their gift is in the away card.                                                                                                                       |

---

## 8. A visit: things to do in 1-3 minutes

### 8.1 The shape of a visit

| Step | What happens                                                                                                                        | Time     | Always there?   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------- |
| 1    | The camera eases in; the Buddy runs to the Keeper; any waiting celebration plays (friendship level, finished build, Landmark stage) | 2-5 s    | Yes             |
| 2    | **Collect** chip, if anything is ready: Greenhouse boosters, a trip back (M13)                                                      | 2 s      | Sometimes       |
| 3    | **Next Up** strip names one thing ("Rock Lab level 3: 12 stone to go")                                                              | 0 s      | Yes             |
| 4    | Spend: level a Lab, tune a launcher, build or upgrade, level up the planet                                                          | 10-30 s  | When affordable |
| 5    | Friends: tap a friend, see its Wish bubble, dress it up, pick your Buddy                                                            | 10-60 s  | Yes             |
| 6    | Arrange: move a building, plant a land in a gap, place a decoration                                                                 | 10-60 s  | Optional        |
| 7    | Landmark: look at the next stage, tap a glowing site to build a finished stage                                                      | 5-20 s   | From P29        |
| 8    | Photo mode, then a big "Play" button back to the next planet                                                                        | optional | Yes             |

### 8.2 No nagging timers

- The Homeworld tab badge counts only things you can act on right now: a celebration waiting, a Greenhouse booster, a trip back, an affordable level-up, a Landmark stage to build. At most one number.
- No Homeworld notification of any kind (the M0 rule: at most one bundled, grown-up-enabled notice a day).
- No countdowns anywhere; build and trip times show a clock time.
- Nothing fills up and "wastes": the Greenhouse fills by wins, and a full one simply waits.
- No "come back in N hours" copy. The last line of the panel is always "Play planet N".

### 8.3 After day 60

A Regular player is around planet 200-250 with Homeworld Level 5, most Labs at 5 and some top forms. What is left, all of it play-driven:

1. **Friends:** 36 species, 12 homes. Rotating who lives with you, reaching best friends and collecting 36 keepsakes takes months (about 95 gems of gifts per friend).
2. **Launch Bay:** four tunes on up to six launchers (up to 87,000 ✨ and 660 Essences) and launcher feats from FLIGHT.md.
3. **Top forms:** the six feats.
4. **Landmarks:** one new Landmark per Star Road (6.3).
5. **Looks:** stardust looks at 5,000-50,000 ✨, gem singles from each Road, lands to plant, decorations for the Isle.
6. **After launch:** Homeworld Levels 6-10 and Landmarks 6-10 (M17).

---

## 9. Challenge without raids

### 9.1 What is recognisably Clash of Clans, and what we do instead

The owner's reference is borrowed as **method only** (ROADMAP-v2 section 3 guardrail).

| Recognisably Clash of Clans                                     | What we do instead                                                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| The Town Hall: one central building whose level caps everything | No central building. The Homeworld Level is the planet itself growing (decided).                                       |
| Raids on other players' bases; loot stolen from you             | None. Single-player, nothing can be taken, and no one else's Homeworld is ever shown.                                  |
| Defences, walls, traps and a defence log                        | None. Negative interactions live inside the round as Troubles (4d), fair and forecast.                                 |
| Training an army that is spent in each attack                   | Rounds are free and your shots are never used up ("the next round is always free").                                    |
| Builders with long timers and gems to finish now                | Drones with short timers (30 s to 4 h), no skip at all, and wins speed builds up. Shot power (Labs, tunes) is instant. |
| Shields, clans, trophies, leagues, clan wars                    | None. No leaderboards that show other children's names.                                                                |
| Storages full of loot that attackers target                     | Nothing on the Homeworld stores stardust.                                                                              |
| "Upgrade the laboratory before defences" priority               | Kept as a method: the Labs and the Launch Bay change your next round, so spending on them feels good right away.       |
| One visible number for progress                                 | Kept as a method: the Homeworld Level, shown as the planet.                                                            |

**Describe it without our nouns:** "A small planet you decorate, where the animals you have befriended live and go about their day. Workshops on it make your throwing objects stronger, paid for with materials from the land you shaped. Big building projects unlock as you complete play goals." It names no hit.

### 9.2 Where the challenge is

The Homeworld has stakes without loss. The challenge is in choices and in goals that stretch your play:

1. **Scarce colours.** Frost and ember are scarce, so "Ice Lab level 4 or Homeworld Level 4?" is a real choice. The Lab card and the level-up sheet show both costs side by side, and Next Up suggests the one closer to done.
2. **Room.** 14 plots for 11 buildings at Level 5, and 12 homes for 36 friends. Who lives with you decides which Buddies you can bring, so the Friends sheet shows each friend's trait icon for planning around the Troubles you meet.
3. **Landmark feats that teach.** "Cool 4 Ember Vents or clear 4 Tanglevines" pushes a child to try a counter they haven't used. The challenge happens in the round, where it is fun.
4. **Launcher choice.** Which launcher, at which tune, for which planet; "Try it" makes it a hands-on choice.
5. **Optional, after launch (M16 experiment, unchanged):** a reward-only terraforming round on the Homeworld, for example growing a land patch for the Isle with your normal shots. It can only ever pay; nothing gets worse if you skip it.

**Never on the Homeworld:** damage, dimming, repairs, weather fronts, decay, fines, lost buildings, lost friends, a threat on a calendar, or a reason to check in before something bad happens. All were proposed and cut [P:meta-homeworld-6].

---

## 10. Economy

All numbers are starting values from a desk model, not the economy sim. The sim (`tests/economy.sim.ts`, M1) sets the final numbers against the bands.

### 10.1 Faucets that touch the Homeworld

| Faucet                       | Pays                                              | Regular player, per day (model)                                      | Idle or active                   |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| Campaign, Voyage, Zen wins   | Stardust (ROADMAP formula), Essences              | about 800-1,000 ✨; leaf ~40, stone ~15, dew ~15, ember ~5, frost ~4 | Active                           |
| Wishes (decided)             | 12 gems, 50 ✨, 1 Road point each; +15 gems for 3 | 150 ✨, about 50 gems                                                | Active                           |
| Landmark stages              | 100-300 ✨ or 10-20 gems per stage                | about 40 ✨ and 2 gems averaged over a Landmark                      | Active                           |
| Friendship levels            | 70 gems per friend over 4 levels, +25 letter      | about 5-10 gems                                                      | Active (from Wishes, Buddy wins) |
| Greenhouses                  | 1 booster per 6 wins each                         | up to 2 boosters                                                     | Active                           |
| Trips (M13)                  | That planet's Essences, at most 3 gems            | about 3-5 frost or ember, 1-3 gems                                   | Idle (Essences only)             |
| Homeworld stardust producers | –                                                 | **0** (Mills, Groves, meteor rocks retired)                          | –                                |
| The Vault (on Home, M11.2)   | Stardust, capped by Vault level                   | capped at 1.5 × active by the band                                   | Idle                             |

### 10.2 Sinks on the Homeworld

| Sink                               | Stardust                                   | Essences                                          | Gems                                              |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| Six Labs to level 5 (decided)      | 1,500 to build + 69,600 to level           | 175 each of stone, frost, ember, dew; 350 leaf    | –                                                 |
| Homeworld Levels 2-5 (decided)     | 48,500                                     | leaf 120, dew 120, stone 100, ember 90, frost 100 | –                                                 |
| Dens (2 × level 5)                 | 26,760                                     | –                                                 | –                                                 |
| Greenhouses (2 × level 3)          | 11,400                                     | –                                                 | –                                                 |
| Launch Bay (level 5)               | 42,800                                     | –                                                 | –                                                 |
| Launcher tunes (6 launchers)       | 87,000                                     | 660 of leaf, dew, stone                           | –                                                 |
| Landmarks 1-5                      | –                                          | leaf 105, stone 110, dew 115                      | –                                                 |
| Decorations (base set)             | 2,400                                      | –                                                 | Keeper Statue 120                                 |
| Looks                              | Stardust looks 5,000-50,000 each (endless) | Suit dyes, Star Atlas                             | Gem singles 60-300; paints 60-150; accessories 40 |
| **Launch total (excluding looks)** | **about 290,000 ✨**                       | **about 2,600**                                   |                                                   |

At about 1,800-2,500 ✨ a day (active plus capped idle) a Regular player needs 120-160 days to buy every functional Homeworld sink, and stardust looks go on from there. Stardust never runs out of uses.

### 10.3 The colour budget

Demand from Labs, Homeworld Levels, Landmarks and tunes against model supply for a Regular player (6 planets a day, frost at the M7 band midpoint of 0.65 per planet).

| Colour | Labs | HW Levels 2-5 | Landmarks | Tunes (share) | Total demand | Supply / day | Days to cover    | Role                                   |
| ------ | ---- | ------------- | --------- | ------------- | ------------ | ------------ | ---------------- | -------------------------------------- |
| Leaf   | 350  | 120           | 105       | ~260          | ~835         | ~40          | ~21              | Surplus: soaked by Landmarks and tunes |
| Stone  | 175  | 100           | 110       | ~200          | ~585         | ~15          | ~39              | Steady                                 |
| Dew    | 175  | 120           | 115       | ~200          | ~610         | ~15          | ~41              | Steady                                 |
| Ember  | 175  | 90            | 0         | 0             | 265          | ~5           | ~53              | Scarce: Labs and levels only           |
| Frost  | 175  | 100           | 0         | 0             | 275          | ~4 (+trips)  | ~70 before trips | Scarce: binding                        |

**Rules that follow:** Landmarks and launcher tunes use only leaf, dew and stone, so they never compete with the Ice Lab, Magma Lab or Homeworld Levels for scarce colours. Frost is the binding colour; at the band midpoint it would push Homeworld Level 5 toward day 60-70 before trips exist. See 15, question 5.

### 10.4 Bands

| Band                                                | Target                                                                    | Type  | From  | Status                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------- | ----- | ----- | --------------------------------------------------------------------------------------- |
| Idle vs active stardust (Regular, days 1-60)        | idle ≤ 1.5× active every day                                              | Gate  | M11   | Decided. The Homeworld adds 0 idle stardust; only the Vault counts (see 15, question 6) |
| Homeworld Level 5                                   | Regular no earlier than day 28                                            | Gate  | M11   | Decided                                                                                 |
| Homeworld Level 5, upper bound                      | Regular no later than day 60                                              | Watch | M11   | New                                                                                     |
| All Labs level 5                                    | Regular no earlier than day 28; Engaged ≥ 30% sooner                      | Gate  | M10   | Decided                                                                                 |
| Every currency has something to buy                 | on day 60                                                                 | Gate  | M11   | Decided; section 8.3 lists the sinks                                                    |
| Boosters                                            | ≤ 0.5 per planet (Regular)                                                | Gate  | M11   | Decided; Greenhouses alone give ≤ 0.33                                                  |
| Max legal loadout (Labs + tunes + Buddy + boosters) | ≤ +15 points 3-star; decent Hard fail ≥ 20%                               | Gate  | M10.5 | Decided band, now including launcher tunes                                              |
| Landmark stage pacing                               | Regular: each feat stage in 1-3 active days; no stage > 5 days            | Gate  | M11.5 | New                                                                                     |
| Landmark 5 finished                                 | Regular no earlier than day 35                                            | Watch | M11.5 | New                                                                                     |
| Colour stranding                                    | no Lab or level waits > 10 days for one colour while another colour > 300 | Watch | M11.5 | New                                                                                     |
| Homeworld Level 10                                  | Regular no earlier than day 120                                           | Gate  | M17   | New                                                                                     |
| Paying gets power sooner                            | 0 days                                                                    | Gate  | M5    | Decided; launchers and tunes included                                                   |

**Why these pass.** (1) Idle: the Homeworld's only non-play faucet is trips, which pay Essences and a few gems, not stardust. (2) Level 5 no earlier than day 28: chapter 8 arrives around day 14-16, but 48,500 ✨ of levels compete with 71,100 ✨ of Labs and 26,760 ✨ of Dens, so the model puts Level 5 at day 35-50. (3) Stranded currency: stardust has functional sinks past day 120 and looks after; gems have singles every Road; leaf, dew and stone have tunes and new Landmarks; frost and ember always have Labs or levels until both are done, and after that the Star Atlas.

---

## 11. Customisation and Styles

| Looks slot     | Free                                      | Earned                                              | Paid (USD, Grown-ups only)                                |
| -------------- | ----------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Ground paint   | Meadow, Dune, Snowdrift                   | Candy, Ember, Crystal (gems); Road free lane        | Theme paints; Aurora (Starter Crew)                       |
| Sea paint      | Ocean Blue, Lagoon                        | Rose Water, Nebula (gems)                           | Theme paints; Liquid Gold (Cosmic Road lane)              |
| Atmosphere     | Default blue                              | Road free lane                                      | Aurora (Starter Crew), Cosmic (Road lane)                 |
| Building skins | Default, with art tier by Homeworld Level | –                                                   | Homeworld Themes: all 6 Labs, Den, Greenhouse, Launch Bay |
| Decorations    | Base set                                  | Keepsakes, Landmark gifts, gem and stardust singles | Theme decoration skins (3 per Theme)                      |
| Friend outfits | Friendship accessories                    | Festival keepsakes, gem accessories                 | 2 per Theme                                               |
| Launcher skins | Default                                   | Road free lane                                      | Starter Crew, Planet Packs                                |
| Photo frames   | 4 today                                   | Beacon gold frame                                   | Cosmic Road lane                                          |

Rules (from ROADMAP-v2 section 6):

- Paid items are looks only and change no number, timer, friend behaviour or round.
- Try-on shows it on the child's own Homeworld until they tap Done; no timer; never next to Buy; no price on the kid side.
- One item, one price, one currency. Themes are USD only; gem items are separate singles.
- Every Theme has one free sampler earned from a Wish.
- Building skins keep the Lab's element badge and colour stripe, so a child can always tell the Rock Lab from the Ice Lab.
- No paid look glows, sparkles or animates more than earned looks of the same slot.
- The Launch Tower's Theme skin becomes the Launch Bay's skin (M12 scope row).

---

## 12. Screens and UX

### 12.1 Layout at 320×568

```
┌──────────────────────────────┐  0
│ ‹  Homeworld   Lv 3  [pouch] │  44   header: back, title, level badge, Essence pouch
├──────────────────────────────┤
│  ☾        · ✦ ·        (sky) │
│        ___/‾‾‾‾\___          │
│     /  Lab  Den  Lab  \      │  250  canvas: drag to spin, tap plot/friend/site
│    |   (friends walk)  |     │
│     \__ Bay __ GH __ /       │
├──────────────────────────────┤ 294
│ ★ Next Up: Rock Lab Lv3 · 12🪨│  36   Next Up strip (one line, tap = go there)
├──────────────────────────────┤ 330
│ [Collect 2]  [Friends 7/9]   │
│ Your shots: ● ● ● ● ● ●      │  190  panel (scrolls); state depends on selection
│ Level 4: ■■■□ chapter · ✨ · │
│ [Paint] [Photo] [Star Atlas] │
├──────────────────────────────┤ 520
│ Play  Missions  HW  Coll  Sty│  48   tab bar
└──────────────────────────────┘ 568
```

- The canvas keeps at least 250 px; the planet's radius is capped so Level 5 still fits with the Isle (the Isle tucks in at the upper right).
- The panel scrolls; nothing is absolutely positioned (M4 rule). Every tap target is at least 44 px.
- The Essence pouch opens a small sheet: five colours with counts and "What uses it" per colour.
- **Larger phones (375×667 and up):** canvas grows to 45% of the height (up to 380 px at 390×844); the panel shows two rows of shots and the level checklist without scrolling. At 430×932 friends are drawn 10% bigger.
- **iPad (M13 layout pass):** canvas left, panel right.

### 12.2 Panel states

| Selection          | Panel shows                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing (overview) | Collect chip; Friends; "Your shots" (six Lab icons with level and a one-line "for your next throw"); the next level's checklist; the current Landmark with its stage bar; Paint, Photo, Star Atlas |
| Empty plot         | Build list: only what can be built now, then greyed rows that say why ("Homeworld Level 2")                                                                                                        |
| A Lab              | The Lab card (3.3)                                                                                                                                                                                 |
| Launch Bay         | Launchers in a row (earned ones in colour, others as silhouettes with how to earn them), tune buttons, Try it, and Trips (M13)                                                                     |
| Den, Greenhouse    | Level, what it does, upgrade; Den lists its friends; Greenhouse shows the plant and the booster choice                                                                                             |
| A friend           | The friend card (4.3)                                                                                                                                                                              |
| A land gap         | Its land and the list of available lands                                                                                                                                                           |
| A Landmark site    | Stages with ticks, the current ask with progress, rewards, "Build" when a stage is ready                                                                                                           |
| Moving             | "Tap an empty plot", Cancel                                                                                                                                                                        |

### 12.3 The overview panel (M11.5)

ROADMAP-v2 M11.5 asks for "what each building does for your next throw, the next level's checklist, and one Next Up inside the base". The "Your shots" row is that: six Lab icons, each with its level and one line ("Rock: Power 3 · Firewall"). A Lab not yet built shows a "+" and "Build your Magma Lab".

### 12.4 Next Up inside the base

A pure function in `src/meta/nextup.ts` (M4), called with `context: 'homeworld'`. First match wins:

1. A celebration waiting (friendship level, finished build, finished Landmark stage) → "See what's new".
2. A Landmark stage ready to build → "Build Skyglass stage 3".
3. A Homeworld Level ready → "Grow your Homeworld to Level 4".
4. A Lab level affordable now → "Rock Lab level 3 is ready".
5. A launcher tune affordable now → "Tune your Thumper".
6. The level checklist item closest to done → "Level 4: 12 more frost (Glacier makes frost lands)".
7. The Landmark's current ask → "Sprout Garden: 3 more Wildflowers".
8. "Play planet N".

Never an offer, a price in money, or a reason to wait.

### 12.5 Animations and celebrations (M6.5 motion kit)

Every moment uses the M6.5 motion kit: skippable with a tap, under 2 s (first time up to 4 s; the Beacon parade up to 6 s once), a paired sound and haptic, a Reduce Motion version (a fade and one pose), at most 3 full-screen flashes a second, and never used to sell.

| Moment                | Show                                                                               | Sound / haptic         |
| --------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| Open the Homeworld    | Zoom from the galaxy into the planet; the Buddy runs to the Keeper                 | Soft chime / light     |
| Build placed          | Drones swoop in, scaffold springs up with an overshoot                             | Clank / light          |
| Build done            | Scaffold pops off in confetti; the building squashes and settles; pennant waves    | Ta-da / success        |
| Lab level-up          | The object flies into the Lab, the chimney puffs its colour, the new line types on | Element sound / medium |
| Top form revealed     | The object orbits the Lab roof in its new form; its silhouette flips to colour     | Fanfare / heavy        |
| Launcher tuned        | The launcher on the pad does a test fling of a sparkle; the tune pip fills         | Whoosh / medium        |
| New launcher earned   | A rocket drops it onto the pad under a spotlight                                   | Fanfare / success      |
| Friend moves in       | Bubble-ship lands, friend hops out and waves; everyone waves back                  | Pop / light            |
| Friendship level      | Friend holds a gift bow; the accessory unwraps onto it                             | Sparkle / success      |
| Best friends          | Heart burst; the letter flies into the Inbox; the keepsake appears                 | Chord / success        |
| Greenhouse ready      | The plant blooms into the booster icon, which flies to the booster count           | Bloom / light          |
| Landmark stage        | Friends carry flags to the site; the next section rises with dust puffs            | Build / medium         |
| Landmark finished     | Full reveal with a camera pan and a party                                          | Theme sting / heavy    |
| Homeworld Level up    | Skyline change: the planet grows, the new sky element appears, then a parade       | Rising chord / heavy   |
| Plant a land in a gap | The gap ripples into the new land; its friend runs over                            | Rustle / light         |

### 12.6 Accessibility

- VoiceOver: every plot, friend, gap and site has a label ("Plot 3, Rock Lab level 2, tap for details"). A "List view" button in the panel lists all plots and friends as rows, so the Homeworld is fully usable without the canvas.
- Text size: the panel follows the Standard/Large/Extra large setting (M3); the canvas never carries essential text.
- Colour: Essence colours always come with their icon; the level checklist uses ticks, not colour alone.

---

## 13. Kid-safety, originality and the noun budget

### 13.1 Kid-safety checklist

| Check                                                                                        | Result                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Anything sold that changes play (levels, launchers, tunes, boosters, friends, builds, speed) | None                                                                     |
| Random or mystery rewards                                                                    | None; weather and friend pairs are date- or clock-seeded and pay nothing |
| Countdowns, "hurry", "last chance"                                                           | None; clock times only                                                   |
| Loss while away (decay, damage, fronts, repairs)                                             | None                                                                     |
| Guilt copy ("miss you", "lonely", "hungry")                                                  | None; string lint (M0) covers the new strings                            |
| Daily chores or caps that build a habit                                                      | None; no greeting, no tap reward, no daily cap                           |
| Notifications                                                                                | None from the Homeworld                                                  |
| Other players' names or bases                                                                | None                                                                     |
| Sharing                                                                                      | Photo mode and postcards through Gate v2 only                            |
| Offers on the Homeworld                                                                      | None; paid looks appear only as "Try on" in Styles                       |
| Gentle planets                                                                               | Unaffected; the Homeworld has no hazards                                 |

### 13.2 Originality

| Feature                    | Nearest hit                     | What is recognisably theirs                                                      | What we do instead                                                                                                       |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| The base and its level     | Clash of Clans                  | Town Hall, raids, defences, army, builders with gem skips                        | The planet grows; no HQ; no raids or defences; no skips (9.1)                                                            |
| Friends with a day         | Animal Crossing                 | Villagers who talk in dialogue, ask favours, move out by themselves, daily chats | No dialogue trees, no favours, never move out, routines come from their trait and home land                              |
| The Buddy and friendship   | Pokemon GO                      | Buddy hearts with a daily cap, Good/Great/Ultra/Best tiers, a Best Buddy boost   | Friendship from play only, no cap, the trait acts once per planet at any level                                           |
| Landmarks                  | Royal Match, Homescapes         | Spending level stars on decoration tasks; a story with cliffhangers              | Stages ask for our land, reaction and Trouble feats; no star spending; no story; built from Essences you grew            |
| Launch Bay tunes           | Hill Climb Racing's garage      | Per-part upgrade bars (engine, suspension, tyres) bought with coins, many levels | One four-step tune per launcher, each step names what it changes, paid with what you grew; "Try it" on a practice planet |
| Trips                      | Idle-game expeditions (generic) | –                                                                                | Sent to planets you grew; the yield is that planet's lands                                                               |
| Friends on their home land | (none found)                    | –                                                                                | Our own: the 17 lands and 36 recipes arranged on your own planet                                                         |

Every player-facing string goes through the terms lint (M1) in six languages.

### 13.3 Noun budget

| Change             | Noun                                                                                                     | Earns its place or retires                                   | First met                              |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| New                | **Landmarks** (and five proper names)                                                                    | The owner's "do stuff for it" goals; retires **meteor rock** | Planet 29                              |
| New (rename)       | **Launch Bay**                                                                                           | Retires **Launch Tower** (one building instead of two)       | Homeworld Level 2 (about planet 12-20) |
| New (content name) | Floating Isle                                                                                            | A place, like a land name; arrives through a Landmark        | Sky Bridge                             |
| Verb, not a noun   | Tune, Try it                                                                                             | –                                                            | Launch Bay                             |
| Not new            | Friends, Den, Greenhouse, Buddy, Wishes, Labs, Essences, decorations, keepsake (memento), lands          | Already in 4h                                                | –                                      |
| Retired            | Meteor rock, Launch Tower (plus the 4e list: Mills, Groves, Observatory, charm, resident requests, Ring) | –                                                            | –                                      |

**By planet 20 the count is unchanged at 18** (under the cap of 20): Landmarks debut at planet 29, and the Launch Bay replaces a noun (Launch Tower) that isn't in the planet-20 list. The unlock ladder gains one row: planet 29, "Landmarks: your first big build" (planet 26 teaches Combo, FLIGHT.md 2.4). FLIGHT.md places the launcher intro at planet 31, and ROADMAP-v2 4h counts both docs' nouns against the same budget.

---

## 14. Build plan

### 14.1 What already-planned milestones carry

These rows are additions to milestones in ROADMAP-v2 section 8; the milestones keep their goals.

| Milestone  | Homeworld rows it carries                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 (built) | Clock guards, actionable-only badge, clock-time build labels                                                                                                  |
| M3         | The away card includes Greenhouse boosters and trip returns; it says nothing about stardust from the Homeworld (there is none)                                |
| M4         | The Homeworld tab; Next Up (`nextup.ts`) with a `homeworld` context; Wishes show as thought bubbles; the badge rule                                           |
| M6.5       | Creature idle loops and poses used by routines; the building art tier per Homeworld Level; the Homeworld Level-up skyline change; the motion kit used in 12.5 |
| M8         | Buddy chosen from friends living on the Homeworld (`buddy.ts`); traits shown on the Friends sheet                                                             |
| M10        | Six Labs, Essences, the Lab card, the first hour at planet 5                                                                                                  |
| M11        | Homeworld Level, retirements (plus meteor rocks), Greenhouse filled by wins, the overview panel, stardust looks                                               |
| M12        | Theme skins for the Launch Bay instead of the Tower; launcher skins in the cosmetic slots; the readability CI covers launcher skins                           |
| M13        | Trips run from the Launch Bay; friends-first Wishes                                                                                                           |
| M14        | One Landmark per Star Road from Road 1                                                                                                                        |
| M16        | The optional reward-only terraforming round (unchanged experiment)                                                                                            |

### 14.2 New milestones

| Milestone | Goal                                               | Size | Launch?      | Headline gate                                                     | Place in order                                                                                                                       |
| --------- | -------------------------------------------------- | ---- | ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| M10.5     | Launch Bay: launchers earned, tuned and tried      | M    | Yes          | Max legal loadout band with tunes; 0 paid launchers               | After M10 (reuses Lab UI and modifiers); merged with FLIGHT.md's proposal into ROADMAP-v2's one M10.5 "Launchers and the Launch Bay" |
| M11.5     | Homeworld Life: friends' days, lands and Landmarks | L    | Yes          | Landmark pacing band; 60 fps with 12 friends on the oldest device | After M11, before M12                                                                                                                |
| M17       | Homeworld Horizons: Levels 6-10                    | M    | After launch | Homeworld Level 10 no earlier than day 120                        | After M15                                                                                                                            |

### M10.5: Launch Bay (launch candidate)

**Goal.** Launchers become part of the Homeworld: earned by play, tuned with what you grew, tried before you choose, and counted in the one power budget.

| #      | Scope                                                                                                                                                    | Files                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 10.5.1 | **The building.** Launch Bay replaces the Launch Tower (type, art, levels 1-5, costs, build times); today's expeditions keep working from it until M13.  | `src/meta/homeworld.ts`, `src/ui/art/structures.ts`, `src/ui/screens/homeworld.ts` |
| 10.5.2 | **Launcher ownership and earn channels** (3.5): the six slots, chapter chests, feats, Landmark and habitat routes; derived from progress where possible. | new `src/meta/launchbay.ts`, `src/meta/progression.ts`, `src/meta/habitats.ts`     |
| 10.5.3 | **Tunes:** four steps, instant once paid, capped by Bay level, costs through the wallet, colour from the launcher's data (leaf, dew or stone only).      | `src/meta/launchbay.ts`, `src/meta/wallet.ts`, `src/meta/tuning.ts`                |
| 10.5.4 | **In the round:** launcher and tune through `RoundModifiers` with the allowlist; the pre-level launcher chip; the "Homeworld helped" line.               | `src/core/modifiers.ts`, `src/ui/flows/prelevel.ts`, `src/ui/flows/results.ts`     |
| 10.5.5 | **Try it:** a `practice` round mode (planet 1 layout, 8 throws, no rewards, no ledger earnings).                                                         | `src/ui/game.ts`, `src/ui/app.ts`, `src/meta/ledger.ts`                            |
| 10.5.6 | **Skins vs launchers:** launcher skins apply over any launcher; Starter Crew's launcher becomes a skin.                                                  | `src/meta/cosmetics.ts`, `src/ui/art/keeper.ts`                                    |

**Acceptance.** Max legal loadout (every Lab, top form, launcher at Tune 4, Buddy, boosters) adds at most 15 points to the decent-aware 3-star rate on normal planets 21-60, and decent Hard fail stays at least 20%. No product, gem or stardust price grants a launcher (store test). Competitive modes and Remix use the starter launcher at Tune 1. "Try it" pays nothing and writes no earnings. J5 passes.

**Test plan.** Unit: earn channels, tune caps and costs, allowlist per mode, practice mode pays nothing, skin never changes stats. Sim: max-loadout band, solver unchanged (targets ignore launchers). Playwright: J5 extended with the Bay; 320×568 in 6 languages. Simulator: "Try it" round on the oldest device; haptics on tune.

**Strings.** About 35 (building, tunes, earn routes, Try it), plus FLIGHT.md's launcher names and tune lines.

**Team.** Codex in two packages (building and tunes; round wiring and practice mode). The data analyst runs the loadout band (heavy). Reviewers: economy and kid safety (lead lens: nothing sold), originality, correctness.

### M11.5: Homeworld Life (launch candidate)

**Goal.** The Homeworld becomes a living home: friends have a day shaped by their trait, the clock, the season and the weather; the lands you grew cover the planet; and five Landmarks give long, play-gated goals.

| #      | Scope                                                                                                                                                                                              | Files                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 11.5.1 | **Split the 1,332-line Homeworld screen** into canvas, panel and sheets, with no visible change, before adding features.                                                                           | `src/ui/screens/homeworld.ts` → new `src/ui/screens/homeworld/canvas.ts`, `panel.ts`, `sheets.ts`          |
| 11.5.2 | **Routines:** the schedule (4.3), personalities by trait, night friends, friend pairs, reactions (4.8), all derived from the clock and pure.                                                       | new `src/meta/friends.ts`, `src/ui/art/critters.ts`, `src/ui/screens/homeworld/canvas.ts`                  |
| 11.5.3 | **Weather** (2.5) and seasonal dressing (2.4).                                                                                                                                                     | new `src/meta/weather.ts`, `src/meta/seasons.ts`, `src/ui/art/seasons.ts`                                  |
| 11.5.4 | **Lands on the Homeworld:** the `grown` tally, land gaps, the picker, friends on their home land.                                                                                                  | `src/meta/profile.ts`, `src/meta/homeworld.ts`, `src/ui/art/planet.ts`, `src/ui/screens/homeworld/*`       |
| 11.5.5 | **Landmarks engine:** sites, stages, feat counting from `stepRound` events (first arrivals and new bests only), "or" routes, taught-gating, deliveries, rewards, Inbox letters.                    | new `src/meta/landmarks.ts`, `src/core/round.ts` (events only), `src/meta/unlocks.ts`, `src/meta/inbox.ts` |
| 11.5.6 | **Landmark content and art:** Sprout Garden, Skyglass (plus the seventh constellation), Sky Bridge and the Floating Isle, Comet Pier, Keeper's Beacon; each with 4 build stages in code-drawn art. | new `src/ui/art/landmarks.ts`, `src/meta/constellations.ts`, `src/ui/screens/sky.ts`                       |
| 11.5.7 | **Friendship extras:** signature moves at level 3, keepsakes at level 5, celebrations held for the next visit (value paid at once).                                                                | `src/meta/homeworld.ts`, `src/meta/visitors.ts` (mementos), `src/ui/screens/homeworld/sheets.ts`           |
| 11.5.8 | **Next Up inside the base** (12.4), the list view for VoiceOver, the level-up sheet with before and after pictures, the celebrations in 12.5.                                                      | `src/meta/nextup.ts`, `src/ui/screens/homeworld/panel.ts`, `src/ui/motion.ts`                              |
| 11.5.9 | **Passport and Star Map:** Landmarks finished and best friends on the Passport; the Homeworld glow on the Star Map at Level 5.                                                                     | `src/meta/passport.ts`, `src/ui/screens/passport.ts`, `src/ui/screens/starmap.ts`                          |

**Acceptance.** Economy sim: a Regular player finishes each Landmark feat stage in 1-3 active days, no stage takes more than 5, and Landmark 5 is not finished before day 35. No Landmark ever asks for frost or ember, or for a system not yet taught (lint over the unlock table). Routines are deterministic for a given clock (screenshot test). 60 fps (p95 frame 16 ms) with 12 friends, 5 Landmarks, weather and the Isle on the oldest test device. J5 passes at morning, night, winter and drizzle with an injected clock. Nothing clipped at 320×568 in 6 languages. T0: 4 of 5 children can say what their Homeworld is for and name one thing a friend does there; 3 of 5 can find the next Landmark step unaided.

**Test plan.** Unit: routine schedule and night friends; weather seeding and season weights; `grown` tally and land availability; Landmark counting, "or" routes, first-arrival rules, never expiring, one-time rewards, taught-gating; friendship celebrations never withhold value; Next Up order. Sim: Landmark pacing bands; colour-stranding watch. Playwright: J5 (injected clock and date), J2 (Back from every Homeworld sheet), layout at 4 sizes. Simulator: frame time; Reduce Motion; VoiceOver list view; a screen recording of each celebration (Showtime rule).

**Strings.** About 110: Landmarks (5 names, 20 stage asks, rewards, 10 letters) about 50; land picker, friend card, weather names and panel states about 40; titles and stickers about 20.

**Team.** Codex in three packages (screen split and routines; lands and weather; Landmarks), in that order because the split comes first. The data analyst sizes Landmark pacing (medium). The QA analyst owns J5 and the recordings. Reviewers: kid safety (lead lens: no chores, no guilt), originality, UX and i18n.

### M17: Homeworld Horizons (after launch)

**Goal.** The Homeworld keeps growing after Level 5: more homes for more friends, a bigger sky and five more Landmarks, with no new shot power.

| #    | Scope                                                                                                       | Files                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 17.1 | **Homeworld Levels 6-10** (5.2): requirements, plots to 24, Dens 3 and 4 (24 friends), the visible changes. | `src/meta/homeworld.ts`, `src/ui/screens/homeworld/*`, `src/ui/art/structures.ts` |
| 17.2 | **Landmarks 6-10** with art and content.                                                                    | `src/meta/landmarks.ts`, `src/ui/art/landmarks.ts`                                |
| 17.3 | **Moon Garden and the second Isle**; the Homeworld as a small world on the Star Map at Level 10.            | `src/ui/screens/homeworld/canvas.ts`, `src/ui/screens/starmap.ts`                 |
| 17.4 | **Bands:** Level 10 no earlier than day 120; power bands unchanged (no power added).                        | `tests/economy.sim.ts`, `tests/sim/*`                                             |

**Acceptance.** Every band in 7.5 and 10.4 is still green. The Lab cap stays 5 and Tune stays 4. Level 10 no earlier than day 120 for Regular. 60 fps with 24 friends on the oldest device (friends beyond 14 drawn at half animation rate if needed). Save goldens from 1.0 and 1.1 load.

**Test plan.** Unit: level requirements, Den capacity to 24, Landmark content lint. Sim: economy bands over 180 days. Playwright: J5 at Level 10. Simulator: frame time with 24 friends.

**Strings.** About 45.

**Team.** Codex in two packages (levels and art; Landmarks). The data analyst checks the 180-day economy. Reviewers: economy and kid safety, UX.

### 14.3 Data model (for engineers)

Additive fields only, so `migrate()` deep-merges defaults (pre-launch saves may be reset as in M11.6).

| Field             | Type                                                               | Notes                                                    |
| ----------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `home.level`      | number                                                             | Renames `home.ring`                                      |
| `home.gaps`       | `(BiomeId \| null)[]`                                              | One per plot; `null` = automatic choice                  |
| `home.landmarks`  | `Record<id, { stage: number; progress: number[]; done?: number }>` | Progress per ask route                                   |
| `home.greenhouse` | `Record<plot, { wins: number; held: number; type: BoosterId }>`    | Replaces the time-based `since` for Greenhouses          |
| `home.bay`        | `{ chosen: string; tunes: Record<launcherId, 1-4> }`               | Launchers owned are derived from progress where possible |
| `home.seen`       | `{ celebrations: string[] }`                                       | Celebrations waiting for the next visit                  |
| `stats.grown`     | `Partial<Record<BiomeId, number>>`                                 | Sectors finished per land on winning rounds              |
| Removed           | `home.debris`, `home.lastDebris`, resident `lastReq`               | Retired systems                                          |

---

## 15. Open questions for the owner

Each item either changes a rule decided in ROADMAP-v2 or needs the owner's taste. The recommendation is what this doc assumes. ROADMAP-v2 section 10 carries these, merged with FLIGHT.md's, as decisions 18-27.

| #   | Question                                                                                                                                                                                            | Recommendation                                                                                                                                                                                          | If you don't answer                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | **Merge the Launch Tower into the new Launch Bay** (4e keeps a Launch Tower for trips).                                                                                                             | Yes. Two rocket buildings with nearly the same name confuse a 7-year-old, a separate Bay would break the 4e plot arithmetic (11 buildings + 3 decorations at Level 5), and trips launch rockets anyway. | Merged.                             |
| 2   | **The Greenhouse fills by wins (1 booster per 6 campaign, Voyage or Zen wins), not every 12 hours** (4e and M11.4 say 12 hours).                                                                    | Yes. Two Greenhouses on a 12-hour clock give a Regular player 0.67 boosters per planet, which alone breaks the decided 0.5 band. Filling by wins is play-gated and has no clock.                        | Fills by wins.                      |
| 3   | **Your Buddy is chosen from friends living on your Homeworld** (today it's any creature seen 5 times).                                                                                              | Yes. It makes "they help me" literal and gives the Den a job. Friends can be invited freely, so no child loses a favourite.                                                                             | From friends.                       |
| 4   | **Landmarks as a new noun** (the critics deferred "Monuments", a set-complete trophy).                                                                                                              | Yes, from planet 29. They are your "do stuff for it" goals, they are play-gated rather than trophies, and they retire "meteor rock". The planet-20 noun count stays at 18.                              | Built in M11.5.                     |
| 5   | **Frost at Homeworld Levels 4 and 5** (40 + 60 frost) against a frost supply of 0.3-1.0 per planet before trips.                                                                                    | Let the economy sim decide in M11. If Level 5 lands after day 60 for Regular, lower frost to 25 at Level 4 and 40 at Level 5 rather than raising frost drops again.                                     | The sim decides; fallback as said.  |
| 6   | **The Vault's idle stardust** (M11.2: 40-120 an hour, 4-12 hours of storage). At Vault 5 a Regular player collecting 3 times a day could reach about 2,880 a day, above 1.5 × active (about 1,600). | Make the Vault fuelled by wins: each campaign win adds 2 hours of Vault production, up to 12 banked. Idle then can't outrun play by construction. This is outside the Homeworld but decides its band.   | M11 tunes the flat rate in the sim. |
| 7   | **Starter Crew's "launcher" becomes a launcher skin** (looks only), because launchers now have stats and are earned only.                                                                           | Yes. It keeps "money buys looks, never power".                                                                                                                                                          | A skin.                             |
| 8   | **Build M11.5 before launch** (it makes the launch candidate about 2-3 team-weeks longer).                                                                                                          | Yes. "What is the Homeworld for?" must be answered at launch, and friends having a day is the answer a child sees. If time is short, ship routines and lands at launch and Landmarks 3-5 in 1.1.        | Before launch.                      |
| 9   | **Homeworld Levels 6-10 after launch add homes and looks, never shot power.**                                                                                                                       | Yes. It keeps every power band green forever and matches the fantasy (more homes for more friends).                                                                                                     | As recommended.                     |
| 10  | **Friends sleep at night on the real clock.**                                                                                                                                                       | Yes, gently: three night friends stay awake, every button still works, and there is never "come back later" copy.                                                                                       | As recommended.                     |
