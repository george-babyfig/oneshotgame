# Pocket Planet: Flight, Launchers, Sky Obstacles, Combos and Difficulty

**Status:** design for owner sign-off. Nothing here is built yet.
**Written:** 28 September 2026 by the lead systems designer for the core round.
**Builds on:** [ROADMAP-v2.md](ROADMAP-v2.md) (sections 3, 4a-4d, 4h, 5.1, 7.4-7.5, 8 and 9), [REMIX.md](REMIX.md), and the evidence in [scope/](scope/README.md). The Homeworld building that holds launchers, the **Launch Bay**, is owned by [HOMEWORLD.md](HOMEWORLD.md). This document owns the launcher roster, their stats and rules, and states what the Launch Bay must provide (1.6).
**Evidence tags** are the same as ROADMAP-v2: `[CG]` core-gameplay audit, `[R1]` combos and hazards research, `[P:id]` a proposal, `[C:lens]` a critique.

**What the owner asked for**

> "Obviously difficulty needs to be refined and honed in, and combos and such are paramount in this, but I also want to think of things like different launchers that do different things like better curves, faster speed, harder impacts, and then obstacles and things that could like destroy your meteor or asteroid or whatever we're calling it."

> "We want the difficulty progression to be natural, we don't want it too hard at the beginning but also not too easy, as both will cause a user to lose interest."

**The headline decisions**

1. **Launchers are real, chosen before a round, and never switched during it.** Seven launchers, each a sidegrade with one strength and one visible cost. The aim line always draws the true path for the launcher you carry. The standard launcher (the **Star Sling**, today's exact physics) is the default, sets every star target, and is the only launcher in Daily Planet, Meteor Rush, Challenge and Remix. Per-object gravity stays cut: within a round, every object still flies the same way.
2. **Sky obstacles are new twists, not a new category.** Five of them (Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring, Tug Star) act on shots in flight. Troubles stay the only things that act on land. A shot that meets an obstacle goes "Bonk!" or "fizzles"; nothing is destroyed or hurt. A bonk spends the throw, because every bonk is warned before release. Dense Core retires, since the Swoop launcher gives the same feel by choice.
3. **Combos become a real rule.** Back-to-back throws that fire a Fusion or settle a Trouble build a **Combo**. Each step pays terrain and Supernova charge, never a score multiplier. A Supernova that fires a Fusion is the rare big moment.
4. **Difficulty follows one principle: a natural ramp that is never too easy and never too hard.** Every chapter gets both a ceiling and a floor, for three player types. "Too easy" is a lint failure, just like "too hard". Early 3-star rates come down (decent bots 71% today, target 40-55%), the chapter-2 cliff goes (casual fails 3% to 36% today, target a smooth 5-12% then 10-20%), and nothing new stacks into a wall.
5. **Build order.** Combos join M7. A new **M7.5 Sky obstacles and real flight in the sims** lands before the M8 rules freeze, so M8 tunes everything once. A new **M10.5 Launchers and the Launch Bay** lands after M10 (Labs); ROADMAP-v2 merges it with HOMEWORLD.md's Launch Bay milestone into one M10.5. Launchers are player-side modifiers through `RoundModifiers`, like Labs, so they are not a post-freeze rules change.

**Words used in this document**

| Word                | Meaning                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Flight params       | The per-launcher numbers the flight code reads: launch speed, curve, aim-line length, reach change and one special rule.            |
| Pull                | How far the child drags back (0-150 px today). Speed = pull × 6.2 today.                                                            |
| Curve               | How strongly the planet's gravity bends the shot. 1.00 is today's gravity (GM 5.2e7).                                               |
| Aim line            | The dotted path drawn while aiming. Measured in steps; today's standard (the old Aim Guide level 2) is 28 steps.                    |
| Reach               | How many sectors each side of the landing sector an object changes (1 for narrow objects, 3 for Rain Cloud and Sunburst).           |
| Bonk                | A shot touches something solid in the sky (a rock, a ring, a moon) and stops. It replaces "Blocked!".                               |
| Fizzle              | A shot is swallowed by the core of a Tug Star and pops into sparkles.                                                               |
| Link                | Internal term: a throw that fires a Fusion or settles a Trouble. Players only see "Combo".                                          |
| Pressure            | Internal term: how much a planet pushes back (Troubles, twists, obstacles, goals). Each planet has a pressure budget (4.5).         |
| Scene Bot           | The robot that plays real rounds through the real flight code and checks the sim lands on the same sector at least 95% of the time. |
| Timed / untimed bot | A sim bot that waits (up to 3 s) for a clear path before releasing, versus one that releases at once.                               |

---

## 1. Launchers

### 1.1 The learned-aim problem, and how launchers avoid it

ROADMAP-v2 cut per-object gravity and speed because "it breaks the aim children have learned by feel" [C:player advocate]: if the Rock dropped and the Seed Pod floated, a child who swapped objects mid-round would land somewhere unexpected, and the short aim line would not warn them. Launchers change flight too, so they must not bring that problem back. Seven rules keep the child's aim honest:

| #   | Rule                                                                                                                                                                                                                                          | Why it protects learned aim                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | **Chosen before the round, fixed for the whole round.** The launcher chip sits on the pre-level overlay next to the Buddy chip. There is no mid-round switch, and swapping objects never changes flight.                                      | Within a round, every throw flies by one rule, so feel is learned in the first throw or two. |
| 2   | **Every object flies the same way** from a given launcher. Per-object gravity stays cut.                                                                                                                                                      | The cut in ROADMAP-v2 section 9 stands.                                                      |
| 3   | **The aim line always draws the true path** for the launcher carried, with the planet's spin, wind, moons, bounces and moving obstacles. There is one flight function (`src/core/flight.ts`) for the throw, the preview, the solver and bots. | What you see is what flies. Only its length differs, and length is a stated cost.            |
| 4   | **The Star Sling is today's physics, exactly**, and it is the default. It is the only launcher until planet 31, and the only one in competitive modes and Remix.                                                                              | Children learn aim on one launcher for 30 planets, and come back to it every Daily Planet.   |
| 5   | **Bounded differences.** Speed 0.85-1.25× and curve 0.80-1.40× of the Sling, checked by a data test.                                                                                                                                          | A new launcher feels different, not alien.                                                   |
| 6   | **A Sling ghost for the first 3 rounds with a new launcher:** a faint grey dotted line shows where the same pull would go with the Star Sling.                                                                                                | The child sees "Zip goes flatter than my Sling" instead of guessing.                         |
| 7   | **"Try it" in the Launch Bay** (HOMEWORLD.md 3.5): a practice planet with any launcher and tune, free, no stars, no rewards, nothing counted.                                                                                                 | Feel is learned before it matters.                                                           |

**Sidegrades, not upgrades.** Each launcher is better at one thing and worse at another. None raises the ceiling on a normal planet: star targets come from the Star Sling, and a CI gate (1.9) proves every planet stays inside its band with the Sling alone and that no launcher is best everywhere.

**Split between Labs and launchers.** Labs change what an object does on the ground (Power, Trouble perks, top forms). Launchers change how a shot gets there (speed, curve, aim line, bounces) and the size of its footprint (Reach ±1). Launchers never change an object's centre effect or a Trouble's counter rule. One exception, the Sparkler, touches Fusions, because it is the combo launcher.

### 1.2 The rules

1. A player owns the Star Sling from the start. Other launchers join the Launch Bay when both their earn channel and their ladder planet are reached (1.5).
2. The pre-level overlay shows one launcher chip with the last launcher used. Tapping it opens a tray of built launchers, each with its icon, a three-word job and, when it fits this planet's twist, a small leaf badge ("Good for moons"). The badge comes from a fixed table (1.7), never from the solver, so it never gives away the answer.
3. The launcher is fixed until the round ends. Restart keeps it. Retry after a fail reopens the overlay, so a child can try another launcher.
4. Flight params are data (`LauncherDef` in `src/core/launchers.ts`), read by `flight.ts`. The Star Sling's params equal today's constants, and a snapshot test proves it.
5. The aim line length is the launcher's `aimSteps`. The **Full aim line** accessibility assist (ROADMAP-v2 4b) overrides every launcher's length to 90 steps, and the Star Scope booster does the same for one round.
6. The bonk warning (2.2) is computed on the full path whatever the visible length, so a short aim line never hides a bonk.
7. Reach from every source (launcher, Lab level 3 Fusion reach, Supernova, Combo 3) stacks, but an object's footprint is capped at reach 4 (9 sectors).
8. The launcher is a player-side modifier in `RoundModifiers`. It is allowed in the campaign, Voyage and Zen; elsewhere the Star Sling is forced (1.8).

### 1.3 The roster

Seven launchers: the standard plus six sidegrades. All numbers are starting values relative to the Star Sling; M10.5's sims tune them inside the bounds in rule 5.

| Launcher       | Job (3 words)       | Speed | Curve | Aim line (steps) | Reach | Special rule                                                                                                                                                | Strength                                                  | Cost                                                                                        | Debut (ladder) |
| -------------- | ------------------- | ----- | ----- | ---------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------- |
| **Star Sling** | Steady all-rounder  | 1.00  | 1.00  | 28               | +0    | None                                                                                                                                                        | Today's feel; learned by every child                      | None                                                                                        | Planet 1       |
| **Swoop**      | Bends round things  | 0.92  | 1.35  | 28               | +0    | None                                                                                                                                                        | Big curves: round moons, onto the far side of the planet  | Longer flights, so the planet turns further before it lands (harder on Fast or Wobbly Spin) | Planet 31      |
| **Sparkler**   | Fusions go further  | 1.00  | 1.00  | 28               | +0    | A Fusion from this launcher reaches 1 sector further and adds +2 Supernova charge. A throw with no Fusion and no Trouble settled charges 1 less (min 0).    | Combos and Supernovas                                     | Plain throws fill the Supernova meter slower                                                | Planet 37      |
| **Zip**        | Fast and flat       | 1.22  | 0.80  | 28               | +0    | Solar Wind, gusts and Magnet Mist push it half as much                                                                                                      | Short flights: spin, wind and drifting things matter less | Can't bend round a moon; an over-pull flies off the planet                                  | Planet 43      |
| **Thumper**    | Heavy, wide landing | 0.90  | 1.15  | 16               | +1    | Thumps straight through Drift Rocks and the Rubble Ring, breaking them, and keeps flying                                                                    | Wider landings; clears the sky                            | Short aim line; the wide footprint can overwrite a neighbour's land (and its creature)      | Planet 48      |
| **Pinpoint**   | Small and exact     | 1.00  | 1.00  | 90               | -1    | The landing card outlines every sector that will change and every creature that would wander off, before you throw                                          | Precise work: goals, rare creatures, Tiny World           | Smaller footprint (narrow objects change only the centre; Rain Cloud and Sunburst reach 2)  | Planet 53      |
| **Skipper**    | Bounces once        | 0.95  | 1.00  | 28 + the bounce  | +0    | Rebounds once off a moon, a Bubble Moon, a Drift Rock or the Rubble Ring instead of bonking. The aim line shows the bounce. A bounced landing has Power -1. | Moons and rocks stop being walls                          | Bounced landings are weaker; it bounces off the Comet Guardian too, so it can't hit it      | Planet 62      |

Notes on the numbers:

- **Speed** multiplies `PULL_TO_SPEED` (6.2). Zip at 1.22 with a full pull reaches about 30% further; its max pull stays 150 px, so an over-pull overshoots. Thumper's 0.90 and 1.15 curve make it "drop"; with a 16-step line (the old Aim Guide level 1, which many testers played with) the last part of the arc is felt, not seen.
- **Curve** multiplies the gravity the shot feels (GM 5.2e7). Swoop at 1.35 sits just under the retired Dense Core twist (1.45), which is why Dense Core retires (2.1): the same feel becomes a choice.
- **Reach** is added to each object's base reach: narrow objects 1 → 2 (Thumper) or 0 (Pinpoint); Rain Cloud and Sunburst 3 → 4 or 2.
- **Power -1** (Skipper, bounced only) takes 1 off the object's main centre change (Rock land +2 → +1). It never goes below +1.
- No launcher has more than one special rule, so a 7-year-old can say what each one does.

### 1.4 How each launcher feels

Everything must read with the sound off (waiting rooms are muted) and with Reduce Motion on (shake becomes a soft flash).

| Launcher   | Look (base shape, emblem)                  | Release sound       | Trail                                            | Haptic                                         | Landing                                                     |
| ---------- | ------------------------------------------ | ------------------- | ------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------- |
| Star Sling | Round pad, a star emblem                   | Today's twang       | Today's dots                                     | Medium on release                              | As today                                                    |
| Swoop      | Curled arm, a spiral emblem                | A rising "wheee"    | A curling ribbon                                 | Two soft taps on release                       | The ribbon unrolls on the planet                            |
| Sparkler   | Fizzing crown, a four-point sparkle emblem | A fizzy crackle     | Sparkles that brighten with each Combo step      | Light; a success buzz when a Fusion fires      | Extra sparkle ring on a Fusion                              |
| Zip        | Narrow rail, an arrow-chevron emblem       | A short "zip"       | Speed streaks                                    | One sharp light tap                            | A quick puff; no shake                                      |
| Thumper    | Wide, squat drum, a square emblem          | A deep "thoom"      | A thick dust tail                                | Heavy on release and again on landing          | Small screen shake and a dust ring as wide as its footprint |
| Pinpoint   | Slim tripod, a dot-in-circle emblem        | A clean "ping"      | A thin bright line                               | A tiny tick each time the aim crosses a sector | A neat ring exactly on the footprint                        |
| Skipper    | Springy coil, a zigzag emblem              | A "boing" on bounce | A bouncy dotted trail with a star at each bounce | A springy double tap on the bounce             | A softer puff after a bounce (shows the Power -1)           |

The emblem and the band colour on the launcher base are the launcher's identity. They stay visible under every skin (1.6) and are checked by the readability test (M12's `tests/readability.test.ts`, extended in M10.5).

**Mastery** (today: 100/500/2,000 flings per cosmetic launcher, then a gold glow) moves to gameplay launchers: flings with the Swoop count toward the Swoop's mastery, whatever skin it wears. Mastery stars gate tuning (1.5) and give the gold glow. The game is pre-launch, so tester saves reset.

### 1.5 Earning, tuning and the ladder

**Earning.** Launchers are never sold, directly or through a currency. HOMEWORLD.md 3.5 sets the allowed earn channels (a chapter chest, a flight feat, a Landmark, a Lifebook collection); this doc adds one condition: **a launcher joins the Bay at the later of its earn channel and its ladder planet**, because each launcher needs its own intro card (one idea per planet) and no alternate launcher arrives before planet 31 (rule 4 in 1.1). The earn itself is free; the Bay holds it at Tune 1.

| Launcher | Earn channel (HOMEWORLD.md's slots, adjusted)                               | Ladder planet (intro card after the win) | Regular player, about |
| -------- | --------------------------------------------------------------------------- | ---------------------------------------- | --------------------- |
| Swoop    | The chapter 3 chest (planet 30); HOMEWORLD.md proposed the chapter 2 chest  | 31                                       | day 5                 |
| Sparkler | Flight feat: reach Combo 3 on any 3 planets (campaign, Voyage or Zen)       | 37 or later                              | day 6-8               |
| Zip      | The Comet Pier Landmark (HOMEWORLD.md 6.3)                                  | 43 or later                              | day 20-30             |
| Thumper  | Complete any 3 Lifebook habitat sets                                        | 48 or later                              | day 25-40             |
| Pinpoint | The chapter 5 chest (planet 50)                                             | 53                                       | day 9                 |
| Skipper  | The chapter 6 chest (planet 60); HOMEWORLD.md proposed the chapter 10 chest | 62                                       | day 10-11             |

If an earn channel completes before the ladder planet, the launcher waits, shown in the Bay as a silhouette with "Arrives at planet 43". If the ladder planet comes first, the Bay shows the channel's progress ("Comet Pier: 2 of 3 parts"). The planet-31 intro also opens the launcher chip on the pre-level overlay; before that, the chip is hidden (the Bay can exist from Homeworld Level 2 for looks and, from M13, trips).

**Tuning softens the cost, never raises the peak.** Each launcher has four tune steps (HOMEWORLD.md 3.5 sets the stardust and Essence costs and the Bay level each needs). A tune step moves the launcher's cost stat toward the Star Sling's value; it never makes the strength stronger. So a fully tuned launcher is still a sidegrade, and max-tuned launchers fit inside the one power budget (ROADMAP-v2 4b). Each tune step also needs a mastery star, so tuning is play-gated as well as paid.

| Launcher | Tune 2 (mastery ★1: 100 flings)                             | Tune 3 (mastery ★2: 500 flings)                                    | Tune 4 (mastery ★3: 2,000 flings)                         | Essence |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | ------- |
| Swoop    | Speed 0.92 → 0.94 (shorter flights)                         | Speed → 0.96                                                       | Speed → 0.98                                              | dew     |
| Sparkler | The charge penalty skips throws that make a creature arrive | The penalty also skips throws that raise any land                  | The penalty also skips the first plain throw of the round | leaf    |
| Zip      | An over-pull shows a red "too far" tip on the aim line      | Max pull 150 → 145 px, so a full pull overshoots less              | Max pull → 140 px                                         | leaf    |
| Thumper  | Aim line 16 → 19 steps                                      | Aim line → 21 steps                                                | Aim line → 23 steps (still shorter than the Sling's 28)   | stone   |
| Pinpoint | Reach -1 no longer applies to Rain Cloud                    | ... nor to Sunburst                                                | ... nor to Seed Pod                                       | stone   |
| Skipper  | Bounced landings lose Power only for Rock and Magma         | Bounced landings keep full Power on the first bounce of each round | ... on the first two bounces of each round                | dew     |

Essences follow HOMEWORLD.md's rule: only leaf, dew and stone (frost and ember stay scarce for the Ice and Magma Labs), and two launchers use leaf, the surplus colour. Tune 1 is the launcher as earned. No tune step adds reach, speed or curve beyond the untuned strength, and none adds a throw.

**Where launchers enter the unlock ladder** (ROADMAP-v2 5.1; these rows are added to `unlocks.ts`, interleaved with the sky obstacles and Combo in 2.4): planets 31 (the Launch Bay's launchers and the Swoop), 37 (Sparkler), 43 (Zip), 48 (Thumper), 53 (Pinpoint) and 62 (Skipper). All fall after planet 20, so the meta noun budget by planet 20 (CI cap 20) is unchanged; the Launch Bay itself replaces the Launch Tower (HOMEWORLD.md), which was already a counted noun. Each debut is a Normal planet. The intro card appears after the win, on Home; the child can pick the new launcher on the next planet. A launcher earned late (Zip, Thumper) shows its intro card after the first win once it arrives, on the next planet with no other intro.

### 1.6 Skins, money, and what the Launch Bay must provide

**Skins are looks only.** Today's cosmetic launchers (Launch Pad, Twig Sling, Petal Sling, Comet Cannon, World Tree, Crystal Arc, Golden Orbit) become **launcher looks**: a look restyles the frame, colours and trail of whichever launcher you carry. It never changes a stat, and the launcher's emblem and band stay visible. Renames: "Launch Pad" becomes the Star Sling's default look; "Comet Cannon" is renamed "Comet Rail" (no weapon words, 5.2); the word "Sling" is dropped from looks so "Twig Sling" does not read as a different launcher from the Star Sling ("Twig", "Petal", "Comet Rail", "World Tree", "Crystal Arc", "Golden Orbit"). Paid looks (Starter Crew's Aurora, the Cosmic Pass's Golden Orbit) stay paid; they are previewed with Try on in Styles, as ROADMAP-v2 6.4 requires.

**Never sold, directly or through a currency:** launchers, tune levels, mastery, "Try it", flight information. This is added to the never-sold list in ROADMAP-v2 6.5 (item 3). `tests/paywall.test.ts` gains: no product grants a launcher or tune level; every planet can be 3-starred with the Star Sling, no boosters and no continues.

**The Launch Bay interface.** HOMEWORLD.md owns the building: where it sits, its art, its levels and costs, and when it can be built. It must provide:

| #   | The Launch Bay must provide                                                                                                                                                         | Owned by this doc                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | The building (HOMEWORLD.md: from Homeworld Level 2, replacing the Launch Tower), with no timer on launcher power; the planet-31 intro card points to it.                            | The ladder rows and intro card text                          |
| 2   | `launchBay.owned(p): LauncherId[]` (Star Sling always included) and `launchBay.tune(p, id): 1 \| 2 \| 3 \| 4`.                                                                      | `LauncherDef`, flight params and tune effects                |
| 3   | The earn channels in 1.5, each free, with the "later of channel and ladder planet" rule and the silhouette and progress states.                                                     | Which launcher each channel gives; the flight feat's rule    |
| 4   | Tune costs in stardust plus one Essence (column "Essence" above), instant once paid, capped by Bay level, with the mastery star enforced.                                           | The mastery gates and what each tune step does               |
| 5   | "Try it": a practice planet with any owned launcher at any tune (including untuned "Try Tune 3"); free flings that never count as throws, mastery, feats or anything in the ledger. | Flight behaviour in "Try it" (the real `flight.ts`)          |
| 6   | The Bay's economy numbers fed to the economy sim, inside ROADMAP-v2's bands (power sinks, Homeworld Level 5 no earlier than day 28).                                                | The max-loadout gate that includes max-tuned launchers (1.9) |
| 7   | Launcher looks stay in Styles (HOMEWORLD.md agrees: skins apply on top of any launcher and never change flight).                                                                    | The emblem rule and the readability test                     |

The launcher chip, the tray, the Sling ghost and the in-round launcher art are owned here (`src/ui/flows/prelevel.ts`, `src/ui/game.ts` split modules).

### 1.7 How launchers meet objects, Fusions, Troubles, twists and obstacles

Most of these synergies come from the stats alone, not from extra rules. That keeps the rule count at one special per launcher.

| Launcher | Shines with                                                                                                                                                     | Struggles with                                                                              | "Good here" badge (fixed table)                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Swoop    | Moon Guard, Twin Moons, Bubble Moon (bends round them); reaching the far side for a Fusion partner                                                              | Fast Spin, Wobbly Spin (long flights); Tug Star (strong curve plus the tug is hard to read) | Moon Guard, Twin Moons                          |
| Sparkler | Fusion planets (every planet from 25 has 4 Fusions taught); Combo chains; Comet Guardian (Supernovas deal 2)                                                    | Planets with few Fusion partners in the deal; Remix-like sparse queues                      | none (it is a plan, not a counter)              |
| Zip      | Fast Spin, Wobbly Spin, Solar Wind, Magnet Mist, Drift Rocks (less time in their path)                                                                          | Moon Guard, Twin Moons (can't bend round); Tiny World (over-pulls miss)                     | Fast Spin, Wobbly Spin, Solar Wind, Magnet Mist |
| Thumper  | Rock (reach 2 builds a 5-sector mountain range, a long Firewall); Seed Pod (5-sector meadows); Scorched, Snowball, Water World starts; Drift Rocks, Rubble Ring | Planets with rare creatures to protect (wider overwrites); Tiny World                       | Drift Rocks, Rubble Ring                        |
| Pinpoint | Goal planets; Super Hard; Tiny World; rare creature recipes that need one exact sector; cooling a vent without touching the forest next to it                   | Planets where wide coverage matters (Water World); Rain Cloud's Rinse perk loses reach      | Tiny World                                      |
| Skipper  | Moon Guard, Twin Moons, Bubble Moon, Drift Rocks, Rubble Ring (turns walls into bank shots)                                                                     | Comet Guardian planets (it can't hit the Guardian); Tug Star cores still fizzle it          | Bubble Moon                                     |

**Fusions and Combos.** Launchers never trigger or block a Fusion by themselves: the land does (ROADMAP-v2 4a rule 1). Reach changes (Thumper, Pinpoint) change which neighbours a Fusion's object touches, which the landing card shows. The Sparkler's Fusion reach +1 stacks with Lab level 3 and Combo 3, inside the reach cap of 4.

**Troubles.** Counters use the landing centre's distance ("Ice Comet lands within 1 of the vent"), so launchers never change a counter rule. Thumper's wider footprint and Pinpoint's exact one change what else the counter throw does, and the Forecast and landing card show it. Lab Guard perks remain the only Trouble perks.

**Supernova.** A Supernova is "your object, super-sized" (+1 reach) with any launcher, and the reach cap applies. A Thumper Supernova of a Sunburst would be reach 5, so it is capped at 4.

### 1.8 Modes

| Mode                                                 | Launcher                          | Why                                                                         |
| ---------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| Campaign, Weekly Voyage, Zen Garden                  | Your choice                       | Player-side modifier, allowed by the `RoundModifiers` allowlist (like Labs) |
| Daily Planet, Meteor Rush, Challenge a Friend, Remix | Star Sling, forced                | Same for everyone; the allowlist switches every player-side bonus off       |
| Festival spotting, "Try it" in the Bay               | Your choice ("Try it": any owned) | No stakes                                                                   |
| Help ladder hint try, "Show me where"                | Whatever the child is carrying    | The hint pulses sectors, not a pull vector, so it works with any launcher   |

The chip shows the Star Sling with a small lock and the line "Everyone uses the Star Sling here" in the forced modes, so no child thinks their launcher was taken away.

### 1.9 How the solver and sims keep every planet beatable with the Star Sling

- **Targets ignore launchers.** Solver 2.0 and Solver 0 play with the Star Sling (perfect aim, reach +0). Stars 1-3 and goals are set exactly as ROADMAP-v2 describes. So a launcher can only help or trade, never be required.
- **Sim policies** (added to `tests/sim/`, running through the real `flight.ts` with angle, power and release-time noise; 2.5):
  - `sling`: every existing policy (casual, decent-blind, decent-aware, sharp) with the Star Sling. All bands in ROADMAP-v2 7.5 and section 4 here are measured on this policy.
  - `best-launcher`: decent-aware picks, per planet, the launcher with the best expected result from the "Good here" table plus a small offline sweep. This measures uplift.
  - `max legal loadout`: now also carries the best max-tuned launcher.
- **Gates** (from M10.5):

| Band                                                                          | Target                                                                           | Type  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----- |
| Every planet 1-120 inside its difficulty band with the Star Sling only        | Yes (launchers are never required)                                               | Gate  |
| "Launcher lock": a planet out of band with the Sling but in band with another | 0 planets                                                                        | Gate  |
| Best-launcher uplift on its own, decent-aware 3-star, normal planets 21-60    | +2 to +6 points (below +2 means launchers don't matter; above +6 is power creep) | Gate  |
| Max legal loadout uplift (Labs + launcher + everything)                       | ≤ +15 points; decent Hard fail ≥ 20% (ROADMAP-v2's gate, now incl. launchers)    | Gate  |
| Pick share: how often each launcher is the best-launcher bot's pick           | every launcher 8-35% of planets 31-120 after its debut                           | Gate  |
| Reachability sweep: every sector for every launcher × twist × obstacle        | 100% (some pull within 150 px and some release time within 3 s)                  | Gate  |
| Scene Bot landing agreement with each launcher                                | ≥ 95% same sector                                                                | Gate  |
| Median round time, best-launcher, planets 21-60                               | 60-100 s (Thumper's short line and Swoop's long flights must not slow rounds)    | Gate  |
| Launcher use in the ledger (tester builds)                                    | the Star Sling picked on 20-60% of campaign rounds after planet 62               | Watch |

The pick-share gate is the sidegrade test: if one launcher is best on more than 35% of planets, it is an upgrade in disguise and its cost grows; if it is best on fewer than 8%, it is dead weight and its strength grows.

---

## 2. Sky obstacles

### 2.1 Where they fit in the words children already know

The game already has two families of pushback, and sky obstacles join the first one. That keeps the vocabulary to two ideas a 7-year-old can hold:

| Family       | Acts on                 | Already in the game                                                                                                                                 | New here                                                                                 | Retired                                                                           |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Twists**   | Your shot, in the sky   | Fast Spin, Tiny World, Moon Guard, Twin Moons, Solar Wind, Wobbly Spin, Comet Guardian (and the start-state twists Scorched, Snowball, Water World) | Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring, Tug Star; a gusty Solar Wind on Hard | **Dense Core** (its feel is now the Swoop, by choice); "Blocked!" becomes "Bonk!" |
| **Troubles** | The land, on the planet | Ember Vent, Tanglevine, Frost Creep; Space Pebble post-launch                                                                                       | None                                                                                     | —                                                                                 |

The rule of thumb for the Field Guide: "Twists are in the sky and change your throw. Troubles are on the ground and change the land." Space Pebble (M15) sits on the border: it is a Trouble (it craters land) whose counter is hitting it in the sky, and the Field Guide files it under Troubles.

### 2.2 The obstacle contract

Every sky obstacle follows the same contract, modelled on the Trouble contract (ROADMAP-v2 4d):

1. **Visible, always.** It is drawn in the sky from the first frame, with a distinct shape and pattern for colour-blind players. It is named on the pre-level card with a one-line rule.
2. **Deterministic.** Its position is a pure function of the level seed and round time. Round time freezes while paused or in a modal, so nothing moves while a child reads.
3. **Telegraphed per throw.** The aim line bends, bounces and stops exactly as the shot will. If the path (computed at full length, whatever the launcher's visible length) would bonk or fizzle, the launcher ring shows a small red **bonk badge** and, when the contact is within the visible line, a bonk star at that spot. A child never gets a bonk that was not warned.
4. **One rule.** Bonk (stops), deflect (bounces off), bend (pushes sideways) or tug (pulls in, fizzles at the core). Nothing else.
5. **A counter.** Timing (wait for the gap), a launcher, and where it fits, an object or Lab perk. Every obstacle can be beaten with the Star Sling and timing alone.
6. **Kid-safe framing.** The shot goes "Bonk!" and drops sparkles, or "fizzles" into sparkles. Rocks turn to sparkles. Nothing is destroyed, hurt or lost except the throw.
7. **The throw is spent** on a bonk or fizzle, exactly as a Moon Guard block and a miss are today. This is fair because of rule 3, and it is what makes a planet with obstacles a real small challenge. Three protections keep it gentle:
   - **Practice bonk.** On an obstacle's teaching planet, the first bonk of each attempt gives the throw back ("Practice bonk! Try again").
   - **Gentle planets** (the Grown-ups setting) gives every bonk and fizzle back.
   - **No two-bonk traps.** The level lint rejects a layout where a straight Sling shot to more than 4 sectors is blocked at every release time in a 3-second window (the sky is never a wall).
8. **Charge stays fair.** A bonk earns no Supernova charge, and a Supernova that bonks is not spent (as today, the meter stays full). A bonk on the Comet Guardian is still a hit.

### 2.3 The roster

| Obstacle                                    | What you see                                                                                             | Rule                                                                                                                                                              | Counter                                                                                                                            | Kid framing                                                             | Pressure points (4.5) |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------- |
| **Drift Rocks**                             | 3 lumpy grey space rocks with cartoon craters, drifting slowly across the sky between you and the planet | A shot that touches a rock bonks. The rock turns to sparkles and is gone for the rest of the round.                                                               | Wait for a clear path; Zip (shorter time in their path); Thumper (thumps through, turning them to sparkles); Skipper (bounces off) | "Bonk! The rock turned to sparkles." Each bonk clears the sky a little. | 1                     |
| **Bubble Moon**                             | A moon wearing a shiny soap-bubble, orbiting like Moon Guard                                             | A shot that touches the bubble bounces off it (mirror bounce, speed ×0.9) and keeps flying. It can land, miss or bounce again; the aim line shows the whole path. | Bank shots on purpose (reach the far side); Swoop bends round it; Skipper; Pinpoint's long line shows banks further                | "Boing!" It is a helper as much as a hazard.                            | 1                     |
| **Magnet Mist**                             | A shimmering, slowly swirling patch of sky with arrow ribbons showing which way it bends                 | Inside the patch, a shot is pushed sideways (always the way the ribbons curl). It never stops a shot.                                                             | Aim through it on purpose or around it; Zip (half the push); Pinpoint's long line                                                  | "The mist gave your shot a wiggle."                                     | 1                     |
| **Rubble Ring**                             | A thin ring of pebbles around the planet with 2 bright gaps (1 on Hard) that slowly turn                 | A shot that crosses the ring outside a gap bonks. A bonk knocks a few pebbles loose (no gap is made).                                                             | Time the gap; Thumper thumps through and leaves a new gap that stays for the round; Skipper bounces off; Zip crosses faster        | "Bonk! Find a gap."                                                     | 2                     |
| **Tug Star**                                | A tiny, dark-violet, sleepy-looking star with a soft swirl around it, parked in the sky                  | It tugs shots toward itself (a small gravity, 0.3× the planet's). A shot that touches its core fizzles.                                                           | Use the tug to curve round to the far side; stay wide of the core; Zip (less time to be tugged); Swoop players must read two pulls | "Fizz! The Tug Star gobbled your shot and puffed out sparkles."         | 2                     |
| _Gusty Solar Wind_ (a variant, no new name) | Today's Solar Wind streaks, plus a bigger streak burst 0.5 s before each puff                            | Hard and Super Hard only, from planet 55: the wind doubles (170 → 340 px/s²) for 0.6 s every 2.4 s                                                                | Release between puffs; Zip (half the push)                                                                                         | "A puff of wind!"                                                       | 2 (Solar Wind is 1)   |

**Starting numbers** (R is the planet's radius on screen, as the moons use today; the corridor is the band between the launcher and the planet):

| Obstacle         | Numbers                                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drift Rocks      | 3 rocks (4 on Hard), radius 0.10R, bonk distance radius + 6 px (as moons). Seeded straight paths cross the corridor at mixed 15–60° angles and 0.18–0.32R/s, wrapping at the screen edge. Uneven start points stay at least 0.5R apart. Refunded bonks wobble the rock without clearing it. |
| Bubble Moon      | Moon radius 0.28R, bubble radius 0.36R, on Moon Guard's orbit (angular speed 0.8 rad/s). Horizontal reach is at most min(2.05R, half the screen width minus 0.36R and an 8 px margin). Mirror bounce with speed ×0.9; at most 3 bounces per shot, then it bonks.                            |
| Magnet Mist      | One patch of radius 0.7R, centred in the corridor at a seeded spot 1.6-2.4R from the planet centre, drifting on a small circle (radius 0.2R, 0.3 rad/s). Sideways push 260 px/s² at right angles to the shot.                                                                               |
| Rubble Ring      | Ring radius 1.6R, thickness 0.10R. 2 opposite gaps of 90° (160° on teaching planet 51; 130° on Hard). Gaps start near the launcher corridor and turn continuously at 0.25 rad/s against the planet's spin. A Thumper gap is 30° wide and turns with the ring.                               |
| Tug Star         | One star at a seeded spot 1.8-2.6R from the planet centre, never on the straight line from the launcher to the planet centre. Tug GM = 0.3 × 5.2e7, softened within 30 px. Core radius 10 px.                                                                                               |
| Gusty Solar Wind | Base 170 px/s² as today; puffs to 340 px/s² for 0.6 s every 2.4 s, with a 0.5 s streak-burst warning; the aim line uses the exact puff timing.                                                                                                                                              |

**Frequency.** An obstacle is a twist, so it takes the planet's one twist slot. Each joins the twist pool 2 planets after its teaching planet. On Normal planets, a twist appears on 25% of planets from 8 (as today); obstacles make up at most half of that pool. Hard and Super Hard planets draw from the whole pool. Never on planets 1-30, never on a Trouble teaching planet, never with a second sky obstacle, and never in Meteor Rush or Zen. Remix v1 keeps its designed deck (REMIX.md) with no obstacles; they can join a Remix deck later as a versioned change. Daily Planet may draw one after the calendar pre-flight.

### 2.4 Debut planets: the ladder from 26 to 62

One new idea per planet (ROADMAP-v2 5.1). Teaching planets are Normal (never a multiple of 5 and never a 9th), have no Trouble, and deal simple objects in the first throws so the child can focus on the new thing. Obstacles are taught with the Star Sling first; the launcher that counters them comes later, as a choice rather than a requirement.

| Planet | The one new idea                    | Kind       | Notes                                                                                       |
| ------ | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| 26     | **Combo**                           | Round rule | Teaching planet: Magma and Ice Comet in throws 1-2 (Steam), then a Rain Cloud onto a meadow |
| 27     | Daily Planet                        | (existing) |                                                                                             |
| 28     | Tanglevine                          | (existing) |                                                                                             |
| 29     | Landmarks (HOMEWORLD.md)            | Homeworld  | After the win, on Home                                                                      |
| 30     | Zen Garden                          | (existing) |                                                                                             |
| 31     | **Launch Bay and the Swoop**        | Launcher   | After the win, on Home. The planet itself is a plain Normal planet.                         |
| 32     | Dry Spell                           | (existing) |                                                                                             |
| 33     | **Drift Rocks**                     | Obstacle   | 3 rocks, slow; practice bonk on                                                             |
| 34     | Festival                            | (existing) |                                                                                             |
| 36     | Frost Creep                         | (existing) |                                                                                             |
| 37     | **Sparkler**                        | Launcher   | Right after Combo has had 10 planets to settle in                                           |
| 38     | Meteor Rush                         | (existing) |                                                                                             |
| 40     | Challenge a Friend                  | (existing) |                                                                                             |
| 41     | **Bubble Moon**                     | Obstacle   |                                                                                             |
| 43     | **Zip**                             | Launcher   |                                                                                             |
| 46     | **Magnet Mist**                     | Obstacle   |                                                                                             |
| 48     | **Thumper**                         | Launcher   | Counters Drift Rocks (taught at 33) and the Rubble Ring (next)                              |
| 51     | **Rubble Ring**                     | Obstacle   | 2 gaps, slow turn                                                                           |
| 53     | **Pinpoint**                        | Launcher   |                                                                                             |
| 55     | Gusty Solar Wind (a coach tip only) | Variant    | No intro card, so it is not a ladder idea; a one-line tip the first time it appears         |
| 57     | **Tug Star**                        | Obstacle   |                                                                                             |
| 62     | **Skipper**                         | Launcher   | Last, because it counters four obstacles at once                                            |

Space Pebble (M15) keeps its place on the planet-50 boss once post-launch content ships; its planet then needs its own ladder row, which the M15 plan must slot around 51 and 53.

### 2.5 How the sim models obstacles

Obstacles only exist in flight, so the sims must fly shots for real. This needs the pure flight module from M2 (`src/core/flight.ts`), extended in M7.5:

1. **One flight function.** `fly(state, pull, releaseTime, launcher, twist, obstacles) → { landing sector | bonk | fizzle | miss, path, flightTime }`. The throw, the aim preview, the bonk badge, the Scene Bot and the bots all call it. Obstacles are pure functions of time (`obstacleAt(def, t)`), so the preview can integrate forward exactly (today's `rotAhead` does the same for spin).
2. **Bots aim like people.** A bot picks a sector and searches 0.5°/2% pull vectors; casual bots use the full-path preview and notice a bonk badge with probability 0.6, then wait 0.4 s to react and check every 0.1 s for up to 1.5 s, while the untimed comparison ignores the badge and decent/sharp bots can wait up to 3 s. After the casual decision, angle/power noise (σ 4°/6%, 2.5°/4%, 1°/2% for casual/decent/sharp) is applied along with release-time jitter (0.25/0.15/0.05 s), and the real flight decides the result.
3. **Scene Bot calibration.** The Scene Bot plays planets 1-30 plus every obstacle teaching planet through the real game scene and asserts the sim's `fly` lands on the same sector (or bonks at the same obstacle) at least 95% of the time, including bounces and moving obstacles.
4. **Reachability sweep** (`tests/reach.test.ts`). For every launcher × twist × obstacle, at 8 release-time offsets, every one of the 24 sectors can be reached by some pull within 150 px without a bonk at some release time within 3 s. This guards both the obstacles and the launchers.
5. **Budget.** Flight makes sims slower. `sim:quick` flies only the obstacle planets in 1-60 and uses the old perfect-aim model elsewhere, keeping it within 90 s. The nightly sim flies everything.

### 2.6 Bands an obstacle must pass

| Band                                                         | Target                                                                              | Type  | From  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----- | ----- |
| Reachability sweep (every launcher × twist × obstacle)       | 100%                                                                                | Gate  | M7.5  |
| Scene Bot agreement, including bounces and moving obstacles  | ≥ 95% same sector or same bonk                                                      | Gate  | M7.5  |
| Surprise bonks (a bonk or fizzle with no bonk badge shown)   | 0                                                                                   | Gate  | M7.5  |
| Casual bonks + fizzles per round, obstacle planets           | ≤ 1.5 (≤ 1.0 on the teaching planet)                                                | Gate  | M8    |
| Decent bonks + fizzles per round                             | ≤ 0.8                                                                               | Gate  | M8    |
| Sharp bonks + fizzles per round                              | ≤ 0.3                                                                               | Watch | M8    |
| Timing matters: untimed decent vs timed decent bonks         | untimed ≥ 1.8× timed                                                                | Watch | M8    |
| Obstacle planets' fail rate vs the chapter's normal band     | casual and decent within +8 points of their band (section 4)                        | Gate  | M8    |
| Obstacles never decide the 1-star floor                      | Solver 0 with casual noise reaches 1 star on ≥ 90% of runs on every obstacle planet | Gate  | M8    |
| Median round, obstacle planets 31-60                         | 60-100 s (waiting for gaps must not drag)                                           | Gate  | M8    |
| Counter launcher cuts decent bonks                           | the best counter launcher ≥ 35% fewer bonks than the Star Sling                     | Watch | M10.5 |
| Star Sling alone keeps every obstacle planet in band         | yes                                                                                 | Gate  | M10.5 |
| T0: children can say what the obstacle does after its planet | 4 of 5                                                                              | Gate  | M7.5  |

---

## 3. Combos

The owner says combos are paramount. ROADMAP-v2 4a gives the pair layer: two objects that react through the land (Fusions and Clashes). This section adds the chain layer on top: doing clever things **back to back**. It stays inside 4a's rules (the land is the memory, one reaction per throw, everything forecast, the solver models it exactly).

### 3.1 The Combo rule

1. A **link** is a throw that fires a Fusion or settles a Trouble ("Vent cooled!", a Tanglevine burned away, a Frost Creep crystal melted).
2. Your first link starts a Combo at 1. Each further link adds 1.
3. **One rest throw is allowed.** A throw that is neither a link nor harmful lets the Combo rest (its beads dim). The next throw must be a link, or the Combo ends. This rest exists because most Fusions need a setup throw (you make the Ice Sheet, then drop Magma on it).
4. **A Combo ends** on a second plain throw in a row, on a Clash, on a throw that makes the planet worse (its life goes down), and on a bonk, fizzle or miss. Ending is quiet: the beads float up and fade, with no sound of failure.
5. **A Supernova that fires a Fusion counts as 2 links**, and its banner says "SUPER STEAM!" (the reaction's name with "Super"). This is the rare big moment: your object super-sized, reacting, inside a Combo.
6. The Combo counts inside one round only. It never carries over between planets, so there is nothing to protect between sessions.
7. Combos are round rules that are the same for everyone, so they are on in every mode (campaign, Voyage, Zen, Daily Planet, Meteor Rush, Challenge and Remix), exactly like Fusions. Gentle planets keeps them on, because they only help.

### 3.2 What each Combo step pays

Every reward is either land (so the score stays the end state of the planet, which the solver can model) or Supernova charge. There is no score multiplier and no running bonus number.

| Combo step        | Paid on the throw that reaches it                                                                                                     | Why                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Combo 1           | Nothing extra (the Fusion or settle is its own reward: +3 Supernova charge)                                                           | The first link is already a good throw                       |
| Combo 2           | +2 Supernova charge                                                                                                                   | Brings the next Supernova closer, the moment children love   |
| Combo 3           | That Fusion reaches 1 sector further (a settle instead pays +2 charge)                                                                | You see the chain make the reaction bigger                   |
| Combo 4 and above | **Combo Bloom:** the landing sector and its neighbours get life +1 where life can grow, plus +3 charge. Repeats on each further link. | A visible green burst on the planet; creatures often move in |

Caps: reach from every source stays at 4 at most; a Combo can add at most +12 charge in one round; Combo Bloom follows the normal clamps (life at most 3). Extra throws are never a Combo reward (ROADMAP-v2 caps in-round extra throws at 1 per planet).

**Supernova budget.** Combo charge counts toward Supernova 2.0's thresholds (12, then 18). The band "2-3 Supernovas per planet" must still hold with Combos on (3.5).

### 3.3 Launcher and object synergies

- **The Sparkler** is the combo launcher: its Fusions reach 1 further (stacking with Combo 3, inside the cap) and add +2 charge, so a Sparkler Combo reaches the Supernova fast. Its cost (plain throws charge 1 less) falls exactly on the rest throws a Combo needs, so the Sparkler rewards planning setups with little waste.
- **Thumper** makes Fusions easier to start (a wider footprint makes more partner land) but its wide landings end Combos more often (it is more likely to make something worse).
- **Pinpoint** makes the "neither link nor harmful" rest throw safe, because the landing card shows every change.
- **Objects.** Rain Cloud and Sunburst chain well (wide reach finds partner land); Rock and Ice Comet set up Glacier and Steam; Magma is the Combo's risk (Dry Spell, the Clash, ends it). Settling a Trouble links in, so on a Trouble planet the chain can run "cool the vent → Steam → Rain Garden".
- **Labs.** Lab level 3 (Fusion reach) and Combo 3 stack inside the reach cap. The top forms change land, so they create new partner land; the solver sees them only in the max-loadout bot.

### 3.4 What the child sees

| Place            | What shows                                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The launcher     | Up to 4 small gold beads on the Supernova ring around the launcher, one per Combo step. A resting Combo's beads dim and pulse slowly. Combos belong on the Supernova ring because they feed it.                                                                                                                             |
| The landing card | The gold Fusion chip (from 4a) gains a small bead when this throw would extend the Combo, and a "Combo Bloom" leaf at step 4. A grey bead with a line through it shows when this throw would end the Combo (a Clash or a worse planet). The card never shows numbers for Combos.                                            |
| The moment       | "COMBO 2!" / "COMBO 3!" words under the reaction banner, one soft rising chime per step (a musical scale, so step 4 sounds like a finish), a light haptic, and at step 4 a green bloom ripple over the landing. All within the feedback governor (at most 2 pop-ups at once).                                               |
| Results          | One line: "Best Combo: 3" with the chain drawn as icons ("🔥+☄️ → 🌧️+🌼 → 💧 vent"). The tally counts no Combo points (there are none).                                                                                                                                                                                     |
| Field Guide      | A **Combos** page next to the Fusion chart: three badges (Combo 2, 3 and 4), a "made in a Combo" stamp for each Fusion (5), and a "Super" stamp for each Fusion fired by a Supernova (5). Unfound stamps show "?". Each first stamp pays 30 stardust and a sticker; all 13 give the title "Chain Maker". Nothing is random. |
| Wishes           | New Wish templates from M7: "Pine Owl wishes for a Combo 3", "Steam Crab wishes for a Super Steam".                                                                                                                                                                                                                         |

### 3.5 Bands for Combos (from M7, re-checked at the M8 freeze)

| Band                                                          | Target                                                 | Type  |
| ------------------------------------------------------------- | ------------------------------------------------------ | ----- |
| Aware vs blind 3-star gap (ROADMAP-v2), normal planets 21-60  | ≥ 10 points (watch for ≥ 12 with Combos on)            | Gate  |
| Decent-aware reaches Combo 2, normal planets 26-60            | 35-60% of planets                                      | Gate  |
| Decent-aware reaches Combo 3                                  | 10-30% of planets                                      | Gate  |
| Decent-aware reaches Combo 4 (it must exist and stay special) | 2-10% of planets                                       | Gate  |
| Decent-blind reaches Combo 2                                  | at most half the decent-aware rate                     | Gate  |
| Combo rewards' share of the decent-aware gain                 | 3-10% (it matters, but it is not the game)             | Watch |
| Supernovas per planet with Combos                             | 2-3                                                    | Gate  |
| Planning premium: planner gain / greedy gain with Combos      | ≥ 1.08 (depth exists for sharp players)                | Watch |
| Casual fail rate with and without Combos                      | Combos never raise casual fail (difference ≤ +1 point) | Gate  |
| T0: children can say what made the beads grow                 | 4 of 5 by planet 30                                    | Gate  |

Solver 2.0 carries the Combo count and the rest flag in `RoundState`, so targets include the Combos a one-step greedy player finds by itself. Deliberate chains (which need swap and planning) are the sharp player's headroom, measured by the nightly planner.

### 3.6 Originality: each combo mechanic against its nearest hit

| Mechanic                              | Nearest hit and what is recognisably theirs                                                           | What we do instead                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pair reactions                        | Candy Crush / Royal Match: swap two special candies together for a pair-specific blast                | Unchanged from 4a: an object reacts with land its partner made; the land is the memory                                                                                         |
| Chains of back-to-back good moves     | Skateboarding trick chains and fighting-game combos with a running multiplier; Peggle's "Fever" meter | Links are land reactions and settled Troubles, one rest throw is allowed, and each step pays land or Supernova charge. No multiplier, no timer, no meter to fill for a finale. |
| Score build-up                        | Balatro's chips × mult with a staged formula tally (the owner already rejected this in Lucky Pips)    | No number is multiplied. Score stays the end state of the planet. The tally shows creatures walking home, never a formula.                                                     |
| Element state that enables a reaction | Genshin Impact's element auras that decay and are consumed                                            | No auras, rings or decay: a Combo is a count of throws, shown as beads on our own Supernova ring                                                                               |
| The big moment                        | Candy Crush's colour bomb + colour bomb                                                               | A Supernova (earned by play, fired by itself) landing on partner land: "SUPER STEAM!", worth 2 links                                                                           |
| Collecting combos                     | Pokedex-style completion                                                                              | 13 fixed stamps on the Field Guide next to the Fusion chart; each found by a thing you did on a planet                                                                         |

"Describe it without our nouns": _"Two back-to-back throws that each make the land react grow a small chain; the chain makes the next reaction a bit bigger and fills the special-shot meter."_ That names no hit.

---

## 4. The difficulty program

### 4.1 The principle: a natural ramp

The owner's rule is the headline: **not too hard at the beginning, and not too easy either, because both lose the player.** The target is a flow channel: each planet asks a little more than the last, the child always feels able, and a new idea arrives before the old ones get dull. In numbers:

- Every chapter has a **ceiling** (fail rate, attempts) **and a floor** (3-star rate, decision quality) for three player types. Too easy is a lint failure, the same as too hard.
- The curve is **smooth**: no chapter-to-chapter jump bigger than the bands allow, and no single planet sticks out from its neighbours.
- **Walls never stack.** Each planet has a pressure budget (4.5), so a new launcher, obstacle, Trouble or goal never lands on top of another fresh one.

Today both ends are wrong [CG] [EC]:

| Today (sim, normal planets) | Casual fail / 3-star | Decent fail / 3-star | Sharp fail / 3-star | What is wrong                                                                    |
| --------------------------- | -------------------- | -------------------- | ------------------- | -------------------------------------------------------------------------------- |
| Planets 1-10                | 3% / 34%             | 0% / 71%             | 1% / 83%            | Too easy: 3 stars without reading the planet; nothing to learn                   |
| Planets 11-20               | 36% / 21%            | 9% / 46%             | 1% / 73%            | A cliff for casual play (3% → 36% in one chapter)                                |
| Planets 21-30               | 37% / 19%            | 19% / 44%            | 14% / 73%           | Casual too hard; sharp still bored                                               |
| Planets 46-60               | 21% / 34%            | 8% / 47%             | 2% / 78%            | Sharp players 3-star almost everything                                           |
| Hard planets (all)          | 18-50%               | 3-23%                | 0-15%               | Easier than their own target (decent 25-45%); planet 24 fails 88% of decent bots |

### 4.2 Target curves per chapter

Normal planets. Fail % is out of all attempts; 3-star % is out of all attempts; attempts per clear is median / 90th percentile for a player who keeps trying (the sim retries up to 8 times, and each retry of the same planet lowers the bot's aim noise 10%, because children learn a planet). "Casual" is measured without the help ladder; the ladder gate (p90 ≤ 5) is separate.

| Chapter (planets)      | Casual fail | Casual 3★ | Casual attempts | Decent fail | Decent-aware 3★ | Decent attempts | Sharp fail | Sharp 3★ | Sharp attempts |
| ---------------------- | ----------- | --------- | --------------- | ----------- | --------------- | --------------- | ---------- | -------- | -------------- |
| Practice (1-3)         | 0 (rule)    | 25-45%    | 1 / 1           | 0 (rule)    | 55-75%          | 1 / 1           | 0 (rule)   | 80-95%   | 1 / 1          |
| Chapter 1 (4-10)       | 5-12%       | 20-35%    | 1 / 2           | 2-8%        | 40-55%          | 1 / 2           | 0-4%       | 60-75%   | 1 / 1          |
| Chapter 2 (11-20)      | 10-20%      | 18-30%    | 1 / 3           | 5-12%       | 40-55%          | 1 / 2           | 0-5%       | 62-78%   | 1 / 1          |
| Chapter 3 (21-30)      | 14-22%      | 15-28%    | 1 / 3           | 7-15%       | 40-55%          | 1 / 2           | 0-6%       | 62-80%   | 1 / 2          |
| Chapters 4-6 (31-60)   | 16-25%      | 15-28%    | 1 / 4           | 5-18%       | 40-55%          | 1 / 2           | 2-8%       | 65-80%   | 1 / 2          |
| Chapters 7-12 (61-120) | 16-25%      | 15-28%    | 1 / 4           | 8-18%       | 40-55%          | 1 / 2           | 2-8%       | 65-80%   | 1 / 2          |

The decent-aware 3-star band is flat at 40-55% on purpose: 3 stars should always mean "you read this planet", from chapter 1 on. What rises is the fail rate for casual play, slowly, and the kinds of thinking a planet asks for (new objects, Fusions, Troubles, obstacles, launchers, Combos). From planet 61 the numbers plateau and novelty carries the interest.

**Hard and Super Hard**

| Tier                                | Casual fail | Decent fail | Decent 3★ | Sharp fail | Notes                                                                     |
| ----------------------------------- | ----------- | ----------- | --------- | ---------- | ------------------------------------------------------------------------- |
| First Hard planets (15, 20)         | ≤ 40%       | 18-32%      | 25-45%    | 3-12%      | They ease in: "Hard" is a new idea at 15                                  |
| Hard (25 and up)                    | ≤ 50%       | 12-45%      | 25-45%    | 5-20%      | Kid-first goal tuning; Troubles and obstacles keep their cadence          |
| Super Hard (19 and up, every 9th)   | ≤ 70%       | 25-60%      | 15-35%    | 15-35%     | Casual players are carried by the help ladder (p90 ≤ 5 attempts)          |
| Comet Guardian planets (every 10th) | as Normal   | as Normal   | as Normal | as Normal  | The Guardian stays optional; its planet sits at the chapter's normal band |

### 4.3 The practice planets (1-3): can't fail, but still earned

M3 keeps planets 1-3 impossible to fail (the Keeper gives 3 more throws, up to twice). That protects the first minute, but it must not make them feel like nothing. So:

- **Stars are real.** 1 star is easy; 3 stars need the lesson used on purpose. Planet 1's 3-star target needs at least one Ocean and one Mountain side by side (the first creature); planet 2's needs a swap; planet 3's needs a throw that the landing card shows making a creature arrive. The solver checks that the 3-star path uses the lesson, and a test fails if 3 stars can be reached without it.
- **The Keeper's extra throws are a gift, not a rescue.** They come with "Here, try these!", and a planet cleared with them still earns stars normally.
- **Bands:** fail 0% by rule; casual 3-star 25-45%, decent 55-75%, sharp 80-95%. A decent bot that 3-stars planet 1 more than 80% of the time means it teaches nothing, and the lint flags EASY-EARLY.

### 4.4 How we detect "too easy" and "too hard"

The level lint (`tests/levels.lint.sim.ts`, ROADMAP-v2 7.4) gains flags on both sides. Each flag names the planet, the numbers and a suggested fix.

| Flag          | Side     | Fires when                                                                                                                                                                                        |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WALL          | too hard | Decent fail above the band maximum, or casual fail above 60% on a Normal planet (existing)                                                                                                        |
| CLIFF         | too hard | The 5-planet moving average of casual fail rises by more than 5 points from one planet to the next, or a chapter's average is more than 8 points above the previous one                           |
| GOAL-TRAP     | too hard | 70% or more of fails are goal misses (existing)                                                                                                                                                   |
| STACK         | too hard | The planet's pressure is over budget (4.5), or two ideas taught within the last 3 planets appear together                                                                                         |
| BONK-HEAVY    | too hard | Casual bonks + fizzles above 1.5 per round                                                                                                                                                        |
| LAUNCHER-LOCK | too hard | Out of band with the Star Sling but in band with another launcher                                                                                                                                 |
| EASY          | too easy | Hard or Super Hard below its band minimum (existing)                                                                                                                                              |
| TRIVIAL       | too easy | Decent-aware 3-star at or above 90% (existing, now from planet 4, not 21)                                                                                                                         |
| EASY-EARLY    | too easy | On planets 1-20: decent-aware 3-star more than 10 points above its band, or sharp 3-star at or above 90%, or casual 3-star above 45%                                                              |
| FLAT          | too easy | The decision is a read-off: on the median throw, 5 or more sectors are within 90% of the best (today 5.4 [CG]), or the aware best equals the blind best on more than 95% of throws from planet 20 |
| SLACK         | too easy | Decent reaches its final star count (3★ when it finishes with 3★) with 40% or more of its throws left on average among clears                                                                     |

Both sides are gates from M8 for planets 1-60 and watches for 61-120 until the lint has run on them for one release.

SLACK measures when the final star count was first reached, even though the round plays every throw and awards stars only at the end. The old 1★ crossing measured the deliberately easy kid floor and flagged 39 planets; it did not show whether skilled play had excess throws. The denominator includes any practice gifts actually used.

### 4.5 Folding in launchers, obstacles, Troubles and Combos without stacking walls

**The pressure budget.** Every source of pushback has points. A planet's total must stay within its budget, checked by the level generator (it re-draws the twist) and by the lint (STACK).

| Source                                               | Points |
| ---------------------------------------------------- | ------ |
| Ember Vent, Tanglevine, Frost Creep (each)           | 2      |
| Drift Rocks, Bubble Moon, Magnet Mist                | 1      |
| Rubble Ring, Tug Star, gusty Solar Wind              | 2      |
| Fast Spin, Tiny World, Moon Guard, Solar Wind        | 1      |
| Twin Moons, Wobbly Spin                              | 2      |
| Scorched, Snowball, Water World (start-state twists) | 1      |
| Comet Guardian                                       | 1      |
| Each goal after the first                            | 1      |

| Planet kind          | Budget                                                                      |
| -------------------- | --------------------------------------------------------------------------- |
| Teaching planet      | Only the new idea (a teaching Trouble or obstacle alone)                    |
| Normal, planets 1-30 | ≤ 2                                                                         |
| Normal, 31 and up    | ≤ 3                                                                         |
| Hard                 | ≤ 4                                                                         |
| Super Hard           | ≤ 5 (the only place a Trouble and a sky obstacle may meet before planet 60) |

**Each layer's role in the curve**

| Layer                           | Role                                                                                                             | Counted in targets?                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Troubles                        | The main source of Hard-planet pressure (ROADMAP-v2: Hard reaches its band through Troubles, not bigger targets) | Yes: Solver 2.0 plays around them                                                                   |
| Sky obstacles                   | Variety and aim pressure; they cost throws, so they widen the gap between careful and careless aim               | Solver 2.0 assumes perfect aim, so obstacles cost the bots, not the targets; bands 2.6 cap the cost |
| Fusions and Combos              | The skill that separates 3 stars from 1; relief for players who read the planet                                  | Yes: greedy Combos are in the targets; planned chains are headroom                                  |
| Launchers                       | A choice before the round; never needed                                                                          | No: targets use the Star Sling                                                                      |
| Labs, Buddy, boosters, Momentum | Help that makes a hard planet easier for the player who earned it                                                | No: targets ignore them; max-loadout gate ≤ +15 points                                              |

**Spacing rule.** No planet may carry two ideas taught within the last 3 planets. A newly taught obstacle joins the random pool 2 planets after its teaching planet and cannot meet a Trouble until 10 planets after.

### 4.6 The levers, in the order we turn them

1. **Per-planet salt** (`LEVEL_SALT`, M1). A single planet out of band is re-seeded, as a reviewable data diff. Never touch global tuning for one planet.
2. **Star fractions by chapter** (`TUNE`). Starting proposal for M8: `ease` follows a smoothstep over planets 1-30 instead of a straight line over 20, and the fractions become `f1 = 0.40 + 0.24·ease`, `f2 = 0.68 + 0.13·ease`, `f3 = 0.88 + 0.05·ease` (today 0.42 + 0.22, 0.66 + 0.15, 0.84 + 0.09 over 20 planets). This lowers 1 star a little early, raises 3 stars early (0.88 against 0.84), and reaches the same plateau (0.93) more gently, which is the "not too easy, not too hard" shape.
3. **Goal rate by chapter.** Goals on 30% of Normal planets 6-10, 45% on 11-20 and 60% after (today 60% from planet 6). Goals are a big source of casual goal-miss fails, so they ramp.
4. **Pressure budget and twist rates** (4.5).
5. **Throws per planet** (today 9 + planet/4, capped at 16). Only if 1-4 cannot fix a chapter.
6. **The deal weights.** Once, in M6, with the Solver 2.0 retune (ROADMAP-v2 4b).

Never tuned to fix difficulty: bot aim noise, the flight physics, launcher stats (those are tuned only for the sidegrade gates in 1.9), or anything that changes a child's learned aim.

**The sawtooth inside a chapter** stays, with a clearer shape. Planet 1 of each chapter (right after the chest) is the easiest of the chapter; the fractions rise by up to 0.05 across planets 1-8; planet 5 is Hard, planet 9 is Super Hard (from chapter 2), and planet 10 is the Guardian at the normal band. The planet after each Hard or Super Hard planet is a **breather**: its budget is 1 point lower and its targets sit 0.02 lower. A child who just struggled gets a win.

**Why chapter 2 cliffs today (hypotheses for the M1 data analyst to confirm).** Goals start at planet 6 at the full 60% rate; twists start at 8; Rain Cloud (7) is a dead throw 40% of the time for random play; Sunburst (11) and the first Hard at 15 land close together; and the straight 20-planet ramp reaches full targets at 21. The smoothstep, the goal ramp and the breather planets address each of these.

### 4.7 Shadow seeds and measurement

- **Chapter curves** are measured on shadow seeds: at least 10 shadows per Normal slot and 30 per Hard or Super Hard slot (ROADMAP-v2 7.4), so a curve reflects the design, not one lucky seed.
- **Per-planet flags** use the real campaign seeds.
- **Until the generator is brought into band (owner decision 29, 30 September 2026; a pre-launch item in M12)**, the shadow checks are a Watch printed by every balance run; the reviewed campaign layouts and the Daily/Voyage pre-flight are the gates.
- **Retries** are modelled (up to 8 attempts, noise -10% per retry), so "attempts per clear" means something.
- **Sim runs through real flight** from M7.5 (2.5), so aim twists and obstacles finally count. Expect casual fail to rise a few points on twist planets when this lands; the M8 retune absorbs it.
- The baseline moves only through an explicit `npm run sim:baseline` commit, with the before-and-after table in the commit message.

### 4.8 The playtest loop (T0)

Bots are not children. Every visible milestone from M7 includes a supervised session (5 children aged 6-9, a parent present, 15 minutes, paper notes only, as ROADMAP-v2 7.3):

1. **Planets played:** the milestone's teaching planets plus two "curve checks" (for M7.5: planets 8, 22, 33, 41; for M8: 14, 19, 26, 36; for M10.5: 31, 43, 48 with launcher choice).
2. **After each planet, a face card:** 5 faces from "too easy, boring" to "too hard, not fair". Target: the median child picks the middle face ("just right"), and at most 1 of 5 picks either end, on every planet played.
3. **Observed signs** (tally, no recordings): too easy = flinging without looking at the landing card, looking away mid-round, "this is easy"; too hard = asking for help twice, a second fail in a row, "that's not fair", putting the phone down.
4. **Comprehension:** "What does this launcher / obstacle / Combo do?" (4 of 5 must answer).
5. **Close the loop:** any planet where 2 or more children pick an end face gets a lint run and, if the lint agrees, a salt fix; if the lint disagrees, the bot noise or policy is recalibrated (the bots are wrong, not the children). Once TestFlight exists, T2 tester codes calibrate bot noise against real `bestPct` distributions.

### 4.9 Gates and watches

| Number                                                                           | Gate or watch                                      | From                     |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------ |
| Chapter curves (4.2): casual and decent fail and 3-star, both ends, planets 1-60 | Gate                                               | M8                       |
| Chapter curves, planets 61-120                                                   | Watch → Gate after one release                     | M8                       |
| Sharp 3-star bands                                                               | Watch (sharp bots are least like children)         | M8                       |
| Attempts per clear (median / p90) by player type                                 | Gate for casual p90; watch for the rest            | M8                       |
| Practice planets 1-3 bands and "the lesson is on the 3-star path"                | Gate                                               | M8                       |
| CLIFF, WALL, STACK, LAUNCHER-LOCK, TRIVIAL, EASY-EARLY in planets 1-60           | Gate (0 flags)                                     | M8 (LAUNCHER-LOCK M10.5) |
| FLAT, SLACK, GOAL-TRAP, BONK-HEAVY                                               | Watch (tuning signals)                             | M8                       |
| Hard and Super Hard bands (4.2)                                                  | Gate (Super Hard gate replaces ROADMAP-v2's watch) | M8                       |
| Pressure budget in the generator                                                 | Gate                                               | M7.5                     |
| Obstacle bands (2.6), Combo bands (3.5), launcher bands (1.9)                    | As listed                                          | M7-M10.5                 |
| T0 face card: median "just right", ≤ 1 of 5 at an end                            | Gate for the milestone review                      | M7                       |

ROADMAP-v2 7.5's existing difficulty gates stay; where this table is tighter (casual 11-20 fail 10-20% against ≤ 30%), the tighter band is the target and ROADMAP-v2's number is the hard floor until M8 passes with the new one.

---

## 5. Noun budget, kid safety and originality

### 5.1 Every new player-facing word

ROADMAP-v2 4h: every new term retires an old one or earns its place, and `tests/glossary.test.ts` enforces it. All of these debut at planet 26 or later, so **the meta noun count by planet 20 stays at 18** (CI cap 20). They are round nouns except the Launch Bay.

| Noun                                                         | What it is                                    | Replaces / why it earns its place                                                                                     |
| ------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Combo                                                        | Back-to-back Fusions or settled Troubles      | The owner's "combos"; replaces the cosmetic "×N" chain the M6 governor removes. A generic word children already know. |
| Launch Bay                                                   | The Homeworld building that holds launchers   | Replaces the Launch Tower (HOMEWORLD.md merges them), so no net new building noun                                     |
| Star Sling, Swoop, Sparkler, Zip, Thumper, Pinpoint, Skipper | The seven launchers                           | The owner's "different launchers". "Star Sling" renames today's "Launch Pad" as the standard launcher.                |
| Speed, Curve, Aim line                                       | Launcher stats (next to Power and Reach)      | The owner's "stats"; "Aim line" replaces the retired "Aim Guide"                                                      |
| Tune (a verb, steps 1-4)                                     | Softening a launcher's cost at the Launch Bay | The owner's "tuned"; no new currency                                                                                  |
| Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring, Tug Star | Sky obstacles, filed as twists                | The owner's "obstacles that could destroy your meteor"; Dense Core retires                                            |
| Bonk, fizzle                                                 | What happens to a stopped shot                | Replace "Blocked!"                                                                                                    |
| Chain Maker (title), Combo stamps                            | The Combo collection                          | Same pattern as "Little Chemist"; stamps live on the existing Field Guide page                                        |

**Retired:** Dense Core (twist), "Blocked!", "Launch Pad" (as a name), "Comet Cannon" (renamed Comet Rail), "Sling" in look names, and launcher mastery on looks (it moves to launchers). **Never introduced** (considered here, then cut): Split Sling, Boomerang, Rapid shot, Sky Shield, Black Hole, Heat, Weather Dial, Combo multiplier, Launcher cards, Launcher levels, Test range (it is "Try it"), Loadout.

**Count.** Round nouns rise from about 10 counters plus the kept list to about 24 new words spread over planets 26-62, one per planet at most, each with an intro card. That is about one new word every 1.5 planets, the same rate as chapters 1-3, and every one is a thing you can see on the screen.

### 5.2 Kid-safety review

| Risk                          | What we do                                                                                                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weapon language               | No "cannon", "shoot", "fire at", "target", "ammo" or "destroy" in any language. Shots "fling", rocks "turn to sparkles", shots "bonk" or "fizzle". "Comet Cannon" becomes "Comet Rail". The terms lint gains these words.        |
| Scary things in the sky       | Obstacles are friendly-looking: a soap-bubble moon, a sleepy little Tug Star (not a black hole), shimmering mist. Nothing has teeth, angry eyes or chases the child.                                                             |
| Loss                          | The only thing an obstacle takes is the throw, and only after a warning. Nothing is destroyed on the planet. Creatures still only wander off and come back.                                                                      |
| Timing pressure               | Obstacles move slowly, there is no clock, and waiting costs nothing: time freezes when paused. Casual bonks are capped by a gate (≤ 1.5 per round).                                                                              |
| Surprise                      | Every bonk and fizzle is warned by the bonk badge (surprise bonks: 0, a gate). Every Combo step and ending is shown on the landing card before release.                                                                          |
| Flashing                      | Magnet Mist shimmer, Combo Bloom and Super Fusions stay within 3 full-screen flashes a second; Reduce Motion turns shimmer and shake into fades.                                                                                 |
| Colour-blind play             | Every obstacle, emblem and bead has a shape and pattern, checked by `tests/cvd.test.ts`.                                                                                                                                         |
| Pay-to-win                    | Launchers, tune levels, mastery and "Try it" are never sold (added to the never-sold list). Paid launcher looks change looks only; the emblem stays; `paywall.test.ts` proves every planet can be 3-starred with the Star Sling. |
| Streak anxiety                | A Combo lives inside one round and ends quietly. There is no "Combo lost" message, no carry-over and no reward for streaks across planets.                                                                                       |
| Stress for sensitive children | Gentle planets gives back every bonk and fizzle, on top of switching off Troubles and Clashes.                                                                                                                                   |
| Selling at a sad moment       | Launcher looks never appear on fail, results or pause screens (ROADMAP-v2 6.4 already forbids it; the launcher tray on the pre-level overlay shows only launchers you own, never a look for sale).                               |

### 5.3 Originality notes (launchers and obstacles; Combos are in 3.6)

| Mechanic                    | Nearest hit and what is recognisably theirs                                                                   | What we do instead                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Different launchers         | Angry Birds: each bird has its own flight and a tap-in-flight power (split, speed boost, egg drop, boomerang) | No tap in flight, ever [C:originality]. The launcher is picked before the round and every object flies from it the same way. We cut a "split" launcher for this reason.      |
| Launcher stats and upgrades | Mobile golf games' clubs with power, accuracy and curl stats, upgraded with card packs                        | Three sidegrade stats, tuned with stardust and Essences from play, never cards, never random, never sold; tuning only softens the cost                                       |
| A roster of shot types      | Worms' weapon roster; Peggle's Masters with one power each                                                    | One shared verb (fling at a spinning planet). Differences are flight feel and footprint size; the land jobs belong to objects and Labs                                       |
| Gravity sky with obstacles  | Angry Birds Space (planets with gravity fields); pinball and Peggle bumpers                                   | Our obstacles orbit or drift around one spinning planet whose land you are shaping. The Tug Star and Bubble Moon are used on purpose (bank and slingshot shots), not scored. |
| Shooting things in the sky  | Missile Command (intercepting falling threats) [C:originality]                                                | You never shoot obstacles down for points. You time, curve or bounce around them. Only the Comet Guardian (already in the game) is a thing you hit.                          |
| Time-your-release gaps      | Many "rotating gate" arcade games                                                                             | One ring on one planet, used as one of five twists, with a warning on every throw                                                                                            |

The signature idea the originality critic asked for ("a rule only Pocket Planet could have") is partly here: the Bubble Moon and the Tug Star turn the moons and gravity of our own sky into tools, and Swoop and Zip trade against the planet's spin.

"Describe it without our nouns": _"Before each level you pick one of seven slingshots: one curves more, one flies flatter, one lands wider but shows less of its path. Slow rocks, a bubble moon and a little gravity well drift in the sky; the aiming line shows where you'll bounce or get stopped."_ That names no hit.

---

## 6. Build plan

### 6.1 Where it slots

| Milestone                                                | Change                                                                                                                                                                           | Why here                                                                                                                                                                                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2 (round engine)                                        | Add scope 2.3b: `flight.ts` takes a `FlightParams` struct with Star Sling defaults, and a time argument for things in the sky. No visible change.                                | Everything later reads one flight function; the Star Sling snapshot proves nothing moved                                                                                                                                        |
| M6 (read every throw)                                    | The aim line becomes today's Aim Guide level 2 (28 steps) for everyone, as ROADMAP-v2 already plans; the Full aim line assist. Nothing new.                                      | Already planned                                                                                                                                                                                                                 |
| M7 (Fusions)                                             | Add scope 7.6 Combos and 7.7 the Combos page (3.1-3.5). The Combo teaching planet is 26.                                                                                         | Combos change round rules (charge, reach), so they must land before the M8 freeze                                                                                                                                               |
| **M7.5 Sky obstacles and real flight in the sims** (new) | The five obstacles, bonk and fizzle, the bonk badge, Dense Core retired, the pressure budget, the Scene Bot and flight-based bots.                                               | Obstacles are twists in the level generator and change what the bots measure. They must exist before M8's retune so difficulty is tuned once.                                                                                   |
| M8 (Troubles, rules freeze)                              | Add the difficulty program (section 4): chapter curves, new lint flags, the TUNE re-ramp, goal ramp, breathers. `RULES_VERSION` 1 includes Combos, obstacles and `FlightParams`. | The freeze is where every band turns into a gate                                                                                                                                                                                |
| M9 (Remix)                                               | No change: Remix uses the Star Sling, has Combos (round rules) and no obstacles in v1.                                                                                           | REMIX.md stays as designed                                                                                                                                                                                                      |
| M10 (Labs)                                               | No change beyond the reach cap of 4 (shared with launchers).                                                                                                                     |                                                                                                                                                                                                                                 |
| **M10.5 Launchers and the Launch Bay** (new)             | Six launchers, the tray, the Sling ghost, tuning, mastery moved, looks conversion, sims and gates.                                                                               | Launchers are player-side modifiers through `RoundModifiers` (like Labs), so they don't change frozen round rules. They need M10's building framework and HOMEWORLD.md's Launch Bay, and must come before M11's economy tuning. |
| M11 (economy)                                            | The economy sim includes Launch Bay tune costs.                                                                                                                                  | One economy tune                                                                                                                                                                                                                |
| M12 (Styles catalogue)                                   | Launcher looks as a cosmetic slot; the readability test covers launcher emblems.                                                                                                 | Already the cosmetics milestone                                                                                                                                                                                                 |
| M15 (content drop)                                       | Space Pebble; launcher and obstacle candidates if the bands allow (a moon-slingshot launcher, a comet-tail obstacle).                                                            | Post-launch, as a versioned rules change (`RULES_VERSION` 2) for any new obstacle                                                                                                                                               |

**Rules freeze, stated plainly.** Combos (M7) and sky obstacles (M7.5) change round rules and ship **before** the M8 freeze. Launchers (M10.5) are **not** a rules change: targets, solvers and every competitive mode use the frozen Star Sling, and other launchers enter only through the modifier allowlist, like Labs. Any new obstacle or Combo rule after launch is a post-freeze versioned change (`RULES_VERSION` 2) with stored stars never dropping.

**Cut line.** If M10.5 runs long, the Skipper and Sparkler move to M15. Nothing else depends on them.

### 6.2 M7 additions: Combos

| #   | Scope                                                                                                                                                                                                                     | Files                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.6 | **The Combo rule** (3.1-3.2) in the round step: links, one rest throw, endings, Super Fusions counting 2, step rewards and caps. Solver 2.0 carries the Combo in `RoundState`.                                            | `src/core/round.ts`, `src/core/levels.ts`, `src/meta/unlocks.ts` (planet 26)                                                                                                  |
| 7.7 | **Seeing Combos** (3.4): beads on the Supernova ring, landing-card bead chips, "COMBO 2!" words and chimes, the Combo Bloom ripple, the results line, the Field Guide Combos page, stamps, "Chain Maker", Wish templates. | `src/ui/hud.ts`, `src/ui/preview.ts`, `src/ui/fx.ts`, `src/ui/audio.ts`, `src/ui/screens/fieldguide.ts`, `src/meta/stickers.ts`, `src/meta/passport.ts`, `src/meta/wishes.ts` |

**Acceptance (added).** The Combo bands in 3.5 pass. On planet 26 the solver's path reaches Combo 2. Supernovas stay at 2-3 per planet. T0: 4 of 5 children can say what made the beads grow.

**Test plan (added).** Unit: each link type, the rest throw, each ending, Super Fusion = 2 links, reward caps, reach cap 4, charge cap 12, determinism. Sim: Combo frequency by bot, blind vs aware, Supernova count, casual fail unchanged. Playwright: the Combos page and results line in 6 languages. Simulator: sound-off play of planet 26.

**Strings.** About 25.

### M7.5: Sky obstacles and real flight in the sims (launch candidate; new)

**Goal.** Answer the owner's "obstacles that could destroy your meteor", fairly: five things in the sky that a child can see, read and beat, and sims that finally fly shots for real, so difficulty is measured with aim and physics before the rules freeze.

| #     | Scope                                                                                                                                                                                                                                        | Files                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 7.5.1 | **Flight with obstacles.** `fly()` handles bonk, fizzle, mirror bounce, sideways push and tug, with obstacle positions as pure functions of round time (frozen while paused). `FlightParams` carries the launcher (Star Sling only for now). | `src/core/flight.ts`, new `src/core/sky.ts`                                                                 |
| 7.5.2 | **The honest aim line.** The preview integrates moving obstacles and bounces; the bonk badge on the launcher ring is computed on the full path; the bonk star inside the visible line. "Blocked!" becomes "Bonk!".                           | `src/ui/preview.ts`, `src/ui/hud.ts`, `src/ui/game.ts`                                                      |
| 7.5.3 | **Five obstacles and the gusty wind** (2.3) with their art, sound, haptics and shapes for colour-blind players; practice bonk on teaching planets; Gentle planets returns bonks. Dense Core retires from the twist pool.                     | `src/core/levels.ts`, `src/ui/art/sky.ts` (new), `src/ui/fx.ts`, `src/ui/audio.ts`, `src/core/modifiers.ts` |
| 7.5.4 | **The level generator:** obstacles in the twist pool from 2 planets after their teaching planet; the pressure budget (4.5) and spacing rule; teaching planets per 2.4 in `unlocks.ts`.                                                       | `src/core/levels.ts`, `src/meta/unlocks.ts`                                                                 |
| 7.5.5 | **Bots that fly.** Pull search, angle, power and release-time noise, timed and untimed bots, retries with learning (2.5, 4.7); `sim:quick` flies obstacle planets only, the nightly sim flies everything.                                    | `tests/sim/*`                                                                                               |
| 7.5.6 | **Scene Bot and reachability.** The Scene Bot plays planets 1-30 and every obstacle teaching planet through the real scene; `tests/reach.test.ts` sweeps every sector × twist × obstacle × release time.                                     | `tests/scenebot/*`, `tests/reach.test.ts`, dev hooks in `src/ui/game.ts`                                    |
| 7.5.7 | **Field Guide:** a "Sky" section under Twists with each obstacle's one-line rule and counters; the Twists and Troubles split explained in one line.                                                                                          | `src/ui/screens/fieldguide.ts`                                                                              |

**Acceptance.** The M7.5 bands in 2.6 pass (reachability 100%, Scene Bot ≥ 95%, surprise bonks 0). The pressure budget holds on every planet 1-120. The Star Sling snapshot is unchanged (planets without obstacles fly exactly as before). p95 frame time 16 ms or less on the oldest test device on a Rubble Ring planet. T0: 4 of 5 children can say what each obstacle they met does.

**Test plan.** Unit: each obstacle's rule and position function, bounce reflection, tug softening, bonk badge on the full path, practice bonk, Gentle refunds, pressure budget, spacing rule, Dense Core gone. Sim: obstacle bands, timed vs untimed, casual and decent fail on obstacle planets, round time. Playwright: pre-level cards and the Field Guide Sky section in 6 languages; the bonk badge visible at 320×568. Simulator: planets 33, 41 and 51 with sound off and Reduce Motion on.

**Strings.** About 30 (5 names, 5 rules, 5 counters, bonk and fizzle lines, practice bonk, Field Guide).

**Team.** Codex in three packages (flight and sky; preview and art; generator and ladder). The data analyst owns the flying bots and the Scene Bot calibration (heavy). The QA analyst owns the frame-time check. Reviewers: kid safety (framing, flashing), originality (lead lens: no Missile Command), correctness.

### M8 additions: the difficulty program

| #    | Scope                                                                                                                                                                                                             | Files                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 8.8  | **The curve.** Chapter bands (4.2) for casual, decent and sharp; the TUNE re-ramp (smoothstep over 1-30, new fractions); the goal ramp; breather planets; first Hard planets easing in; Super Hard band narrowed. | `src/core/levels.ts`, `src/meta/tuning.ts`                        |
| 8.9  | **The two-sided lint** (4.4): CLIFF, STACK, BONK-HEAVY, EASY-EARLY, FLAT, SLACK, TRIVIAL from planet 4; the report names a suggested fix.                                                                         | `tests/levels.lint.sim.ts`, `tests/sim/metrics.ts`                |
| 8.10 | **Practice planets that teach** (4.3): 3-star targets that need the lesson, checked by a solver test; the Keeper's gift copy.                                                                                     | `src/core/levels.ts`, `src/meta/coach.ts`, `tests/levels.test.ts` |
| 8.11 | **The T0 face card** and the tally sheet for the owner's playtests (a printable page in `docs/qa/`).                                                                                                              | new `docs/qa/playtest-difficulty.md`                              |

**Acceptance (added).** Every band in 4.9 marked "Gate from M8" is green on planets 1-60, with 0 CLIFF, WALL, STACK, TRIVIAL and EASY-EARLY flags. T0: on each planet played, the median child picks "just right" and at most 1 of 5 picks an end face.

**Strings.** About 10 (the Keeper's gift lines and lint report text; the face card is paper).

### M10.5: Launchers and the Launch Bay (launch candidate; new)

**Goal.** Answer the owner's "different launchers that do different things": six sidegrades a child picks before a round, each with one strength and one cost, earned by play and tuned at the Launch Bay, without ever breaking the aim they learned on the Star Sling.

| #      | Scope                                                                                                                                                                                                                                                   | Files                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 10.5.1 | **Launcher data and flight.** `LauncherDef` for the seven launchers (1.3) with bounds checked by a test; reach changes and the reach cap; Skipper bounces and bounced Power -1; Thumper passing through rocks and the ring; the Sparkler's Fusion rule. | new `src/core/launchers.ts`, `src/core/flight.ts`, `src/core/round.ts`, `src/core/modifiers.ts`                 |
| 10.5.2 | **Choosing.** The launcher chip and tray on the pre-level overlay, the "Good here" table, the locked Star Sling in competitive modes and Remix, retry reopening the overlay.                                                                            | `src/ui/flows/prelevel.ts`, `src/meta/launcherPick.ts` (new)                                                    |
| 10.5.3 | **Feel** (1.4): base shapes and emblems, sounds, trails, haptics, landing effects, the Sling ghost for the first 3 rounds with a new launcher.                                                                                                          | `src/ui/art/keeper.ts`, `src/ui/art/launchers.ts` (new), `src/ui/fx.ts`, `src/ui/audio.ts`, `src/ui/haptics.ts` |
| 10.5.4 | **The Launch Bay side** (with HOMEWORLD.md): earn channels with the ladder-planet rule, tune steps 1-4 with mastery gates, "Try it", the interface in 1.6.                                                                                              | `src/meta/launchbay.ts` (HOMEWORLD.md owns the building), `src/ui/screens/launchbay.ts`, `src/meta/unlocks.ts`  |
| 10.5.5 | **Mastery and looks.** Mastery counts flings per launcher; today's launcher cosmetics become looks (renames in 1.6); the emblem stays visible under every look.                                                                                         | `src/meta/cosmetics.ts`, `src/ui/screens/styles.ts`, `src/meta/profile.ts`                                      |
| 10.5.6 | **Sims and gates** (1.9): `sling`, `best-launcher` and max-loadout policies, pick share, launcher lock, uplift, reachability for every launcher, round time.                                                                                            | `tests/sim/*`, `tests/reach.test.ts`, `tests/levels.lint.sim.ts`, `tests/paywall.test.ts`                       |

**Acceptance.** Every gate in 1.9 is green. The paywall test proves every planet 1-120 can be 3-starred with the Star Sling and nothing bought. The Star Sling snapshot is unchanged. The launcher tray works at 320×568 in 6 languages. T0: 4 of 5 children can say what their chosen launcher does differently, and none says "my aim is broken" after the Sling ghost rounds.

**Test plan.** Unit: every `LauncherDef` inside the bounds; each special rule; reach cap; tune effects never exceed the untuned strength; mastery gates; forced Star Sling in Daily Planet, Meteor Rush, Challenge and Remix; looks never change a stat. Sim: the 1.9 gates on planets 1-120 nightly. Playwright: the tray and the Launch Bay screens in 6 languages at every size; the locked chip in competitive modes. Simulator: each launcher's feel with sound off and Reduce Motion; the Sling ghost; frame time with the Thumper's dust.

**Strings.** About 45 (7 names, 7 jobs, 7 special rules, 18 tune lines, tray, "Try it", arrival states, locked-chip line).

**Team.** Codex in three packages (launcher rules and flight; choosing and feel; Launch Bay screens and looks). The data analyst owns the sidegrade gates (heavy). The HOMEWORLD.md owner reviews package 4. Reviewers: economy and kid safety (never sold, looks only), originality (no tap-in-flight, no card upgrades), UX.

---

## 7. Open questions for the owner

ROADMAP-v2 section 10 carries these, merged with HOMEWORLD.md's, as decisions 11-17.

| #   | Question                                                                                                                                                                                                                                                                                                                                           | Recommendation                                                                                                 | If you don't answer    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | **Launcher arrival dates.** HOMEWORLD.md proposed the second launcher from the chapter 2 chest (about day 3) and the sixth from the chapter 10 chest. This doc moves them to the chapter 3 chest (arriving at planet 31) and the chapter 6 chest, so children learn aim on one launcher for 30 planets and every launcher arrives by about day 40. | Planet 31 and chapter 6, as here.                                                                              | As here.               |
| 2   | **A bonk spends the throw**, as a moon block does today (with a practice bonk on teaching planets and refunds in Gentle planets).                                                                                                                                                                                                                  | Yes. Every bonk is warned first, so it is fair, and a free bonk would take the challenge out of obstacles.     | Spent, as recommended. |
| 3   | **Early 3 stars get harder.** A decent player's 3-star rate on planets 1-10 falls from about 71% to 40-55%, while 1 star stays easy and planets 1-3 still can't be failed.                                                                                                                                                                         | Yes. It is the "not too easy" half of your rule, and 3 stars should mean "you read the planet" from the start. | As recommended.        |
| 4   | **Retire the Dense Core twist**, because the Swoop launcher gives the same stronger bend as a choice.                                                                                                                                                                                                                                              | Yes.                                                                                                           | Retired.               |
| 5   | **Launchers in the launch candidate** (M10.5, before launch) or in update 1.1.                                                                                                                                                                                                                                                                     | Launch candidate, with Skipper and Sparkler as the cut line if time runs short.                                | Launch candidate.      |
| 6   | **Launcher names:** Star Sling, Swoop, Sparkler, Zip, Thumper, Pinpoint, Skipper; and obstacle names: Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring, Tug Star.                                                                                                                                                                                | Approve, then the translators check each in 5 languages for meaning and length.                                | These names.           |
| 7   | **No "split" launcher.** You mentioned split shots; a shot that splits reads as a copy of a famous bird game, so it was cut.                                                                                                                                                                                                                       | Keep it cut. Thumper gives a wider landing instead.                                                            | Cut.                   |
