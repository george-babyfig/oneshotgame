# How top games present their App Store screenshots — and what Comet Garden should do

Research date: 30 September 2026. Scope: US App Store, iPhone listings. This is an internal document, so it names competitors to learn from them. None of their art, type, characters or wording should appear in our listing.

## Summary

- **Most top games show real gameplay full screen, with no phone frame (69%).** Only 7% use a device mockup as their main way of showing gameplay, which is what our current set does. (11% put a device frame in at least one shot.)
- **80% caption at least some of their shots, and 60% caption every shot. The median caption is 3 words.** All 24 sets we read closely keep the caption in the same place and style on every shot, so the row reads as one designed set.
- **The best family and cozy sets add three things.** A large, friendly character that breaks out of the frame (Toon Blast, Hay Day, Flambé, Tasty Travels). One image showing the core action together with its payoff (Screwdom, Flambé). A before/after that shows the world changing (Travel Town, Flambé, Foodstars).
- **83% of sets break at least one of our rules.** Common problems are currency counters and buy buttons, timers, chance and loot imagery, gambling, ad-style mini-games and pressure words.
- **Recommendation: rebuild our 8 shots as "One planet, one day".** In shots 1–3, one seeded planet grows because of the throw shown in shot 1. Shot 4 shows a Fusion and shot 5 a sky-obstacle planet, and 6–8 show the Homeworld, the Lifebook and the Grown-ups area. The game fills the canvas with no phone frame. A fixed night-indigo band shaped like the Homeworld's horizon carries a one-line caption, and a thin rim along its edge runs from sunrise to night across the row.

## 1. Method and limits

**Sources**

- **The 166 games:** Apple's public RSS feeds for the US top-grossing and top-free iPhone Games charts (top 100 each, pulled 30 Sep 2026). 34 games were on both lists, which leaves 166 unique titles.
- **Metadata and screenshot URLs:** the iTunes Lookup API. Listings carry 3 to 10 iPhone screenshots, with a median of 7. The API reports content ratings of 4+ (40 games), 9+ (21), 12+ (61) and 17+ (44). These are Apple's pre-2025 labels: a check on 30 Sep 2026 confirmed the API still returns 12+ and 17+. Under the current tiers (4+/9+/13+/16+/18+, the ones `store/compliance.md` uses), most 12+ titles now sit at 13+ and most 17+ titles at 18+. We did not check each product page.
- **Broad pass:** the first 5 screenshots of every listing, hand-coded on a fixed sheet. The sheet records orientation, first-shot type, captions (use, position, case and length), background, how gameplay is shown, character art, frame breaks, callouts, badges, the story across the shots, and red flags against our rules. Each game also got a family-relevance score (0–3), a craft score (1–5) and a standout flag.
- **Deep reads:** the broad pass flagged 29 sets as standouts. Deep reads were capped at 24, taken from the pool of standouts and family-relevant sets (score 2 or more), ranked by family relevance, the standout flag and craft. All 24 are standouts. The five standouts not read closely are Hole.io, Paper.io 2, Goods Puzzle, Sudoku.com and Block Crush!. Each deep read covers the whole set shot by shot at full resolution, including shots 6–10, with measured layouts, sampled colours, type recipes and notes on what to borrow and what not to copy. Appendix A lists them.
- **The notes:** the broad-pass sheet (166 rows) and the 24 deep reads are in `docs/product/store-art-notes/` (`broad-pass.json`, `deep-reads.json`). Every game named in this report appears there.

**Limits**

- One country, one day, iPhone only. Seasonal sets (Pokémon GO, PUBG, Free Fire) change monthly.
- The broad pass covers the first 5 shots only; later shots are covered only for the 24 deep reads.
- Coding is human judgement. Red-flag category counts in section 6 are hand tallies from the per-game notes, so treat them as approximate (±3).
- Chart rank measures revenue and downloads, not how well screenshots convert. This shows what winners do, not what works best. About 29 casino, bingo and cash-prize titles skew some totals.

## 2. The numbers

**First shot and orientation** (131 portrait, 79%; 35 landscape, 21%)

| First shot                      | Games | Share |
| ------------------------------- | ----: | ----: |
| Real gameplay                   |   108 |   65% |
| Key art (painted scene or logo) |    24 |   14% |
| Feature claim over UI           |    13 |    8% |
| Character hero                  |    12 |    7% |
| Logo or title                   |     6 |    4% |
| Collage                         |     3 |    2% |

So 58 sets (35%) open on something other than gameplay.

**Captions**

| Measure                     | Result                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| Captioned                   | 132 of 166 (80%): every shot 100 (60%), most shots 25 (15%), some shots 7 (4%) |
| No captions                 | 34 (20%)                                                                       |
| Position (of 132 captioned) | bottom 87 (66%), top 37 (28%), middle 4, varies 4                              |
| Case (of 132 captioned)     | ALL CAPS 88 (67%), Title Case 27 (20%), sentence case 11 (8%), mixed 6 (5%)    |
| Median length               | 3 words                                                                        |

The raw case tally has 133 entries. The extra one is Paper.io 2: it has no marketing captions, but its in-game "bonus game" burst was coded as all caps. It is left out above.

**How gameplay is shown, and what is behind it**

| Gameplay shown as (main way) | Games | Share |     | Background           | Games | Share |
| ---------------------------- | ----: | ----: | --- | -------------------- | ----: | ----: |
| Full screen, no frame        |   115 |   69% |     | The gameplay itself  |    76 |   46% |
| Card or panel over art       |    24 |   14% |     | Painted scene art    |    32 |   19% |
| Device mockup                |    12 |    7% |     | Solid colour         |    22 |   13% |
| Cropped or zoomed in         |    11 |    7% |     | Mixed within the set |    22 |   13% |
| Little or no gameplay        |     4 |    2% |     | Gradient             |    14 |    8% |

**Characters and composition devices**

| Device                                                  | Share                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Character art dominant / secondary / none               | 54 (33%) / 56 (34%) / 56 (34%)                                               |
| Callouts (hands, arrows, rings, zoom bubbles)           | 53 (32%)                                                                     |
| Something breaks the frame                              | 49 (30%)                                                                     |
| Device frame in at least one shot                       | 19 (11%); the main presentation in 12 (7%)                                   |
| One panorama running across shots                       | 1% (X-Clash only)                                                            |
| Badges ("no ads", awards, level counts, logos, ratings) | 42 sets (25%): 80 mentions of about 75 kinds; almost every kind appears once |
| At least one red flag                                   | 83%                                                                          |

**What the numbers say**

- **Showing real gameplay and dropping the phone frame is the norm.** The 12 sets built around a device mockup are mostly utility-like apps (NYT Games, Chess.com, Roblox) or cash-reward apps. We are in that group. The cost shows: in our current set the planet (with its land ring) is about 590 px of the 1,320 px canvas (45%), and creatures are about 60–75 px wide (about 5%).
- **Captions are short, sit at the bottom and are usually all caps.** The uncaptioned sets are mostly huge brands (Clash Royale, Subway Surfers, Call of Duty) or low-craft raw captures.
- **Panoramas are nearly absent (1%), and badges are scattered.** A quarter of sets carry some badge, but no kind recurs. Only three sets say "no ads": Tasty Travels and Seaside Escape in pills, Bus Traffic Fever with an icon. Saying it well still stands out.
- **Two-thirds of sets use character art.** For games whose in-game characters are small, that is how personality reaches a thumbnail.

## 3. The playbook

| #   | Technique                           | What it is                                                                                             | How common                                                                                                                                                                                                                                                                               | Why it works                                                                                | Cozy example                                                                     |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Full-bleed real gameplay            | The real game fills the canvas; no phone, no frame                                                     | 115 of 166 (69%)                                                                                                                                                                                                                                                                         | The game is as large as it can be, and it reads as honest                                   | Township, Colorever                                                              |
| 2   | One fixed caption lockup            | Same band, type, size and position on every shot; only the words change                                | 24 of 24 deep reads fix the caption spot; 19 use a shaped band                                                                                                                                                                                                                           | Eight scenes read as one designed set in the search row                                     | Flambé (orange band), Hay Day (gold plaque)                                      |
| 3   | Short, verb-first captions          | 1–4 words starting with an action; in merge games, one verb per shot spells out the loop               | Median 3 words; one-verb loops in at least 9 sets                                                                                                                                                                                                                                        | Readable at thumbnail size; the row teaches the game                                        | Foodstars, Travel Town, Hotel Legacy                                             |
| 4   | Hook = the core action at its peak  | Shot 1 shows the input and its result in one frame                                                     | 65% open on gameplay; the best show cause and effect                                                                                                                                                                                                                                     | Someone who has never played understands the game in a second                               | Screwdom (a hand pulls a screw, a trail flies to the bin)                        |
| 5   | Hero scale                          | The one thing that matters is enlarged 2–3× with a soft glow; everything else stays true to scale      | Common in the craft-5 sets                                                                                                                                                                                                                                                               | It reads at 1/10 size and tells the eye where to look                                       | Flambé's carrot, Tasty Travels' cocktail                                         |
| 6   | A character that breaks the frame   | A big character overlaps the gameplay edge or the caption band                                         | 30% break the frame; 33% have dominant character art                                                                                                                                                                                                                                     | A face draws the eye, adds depth and gives a small game personality                         | Toon Blast's corner bear, Hay Day's animals                                      |
| 7   | The host acts out the caption       | The character's pose or prop repeats the message                                                       | Jelly Busters, Rotate Rings, Toon Blast                                                                                                                                                                                                                                                  | The message lands even if nobody reads the words                                            | Rotate Rings (a squirrel with a magnifier for mastery)                           |
| 8   | Before/after                        | A diagonal split shows the same place grey and broken, then bright and alive                           | About 10 sets, nearly all merge or renovation games                                                                                                                                                                                                                                      | Progress is visible in one second, with no numbers                                          | Travel Town, Flambé, Foodstars                                                   |
| 9   | Cause-and-effect callouts           | Arrows, rings, and "A + B → C" recipe diagrams                                                         | 32% use callouts of some kind                                                                                                                                                                                                                                                            | Explains the rules without text, in any language                                            | Foodstars' recipe diagram; Search It's rings matching its item tray              |
| 10  | Colour rhythm                       | The template stays fixed while the main hue changes each shot                                          | Toon Blast, Jelly Busters, Match Factory, Car Sort, Pokémon GO, Candy Crush Saga                                                                                                                                                                                                         | Each tile stands apart, yet the row still reads as one family                               | Cube Land, Car Sort                                                              |
| 11  | Growth across the set               | Each shot is the next step of one run: one unit becomes a crowd, or the camera pulls from close to far | Township, Top Lords, Last War, Whiteout Survival, Bus Fever Party                                                                                                                                                                                                                        | The swipe itself tells the story of growth                                                  | Township (one field, then the whole town)                                        |
| 12  | Proof of variety                    | A grid, fan or collage of collectibles plus a count                                                    | Common in collection games                                                                                                                                                                                                                                                               | Shows how much there is to discover                                                         | Toon Blast's screen collage, Hay Day's postcards                                 |
| 13  | Reassurance claim                   | "No timers", "no ads", "relaxing", "designed for seniors"                                              | Rare (Colorever, Search It, Yarn Loop, Tasty Travels, Seaside Escape, Vita Mahjong)                                                                                                                                                                                                      | Removes the main worry for casual players and parents                                       | Colorever's no-stress closer                                                     |
| 14  | Brand art last, not first           | Logo or key art is used as the closing shot                                                            | 35% open on something other than gameplay (key art alone 14%); at least 9 sets close on key art or a logo                                                                                                                                                                                | Early slots sell play; the final slot builds brand memory                                   | Royal Match (key-art finale), Kingshot (logo closer), Travel Town, Flambé        |
| 15  | Two-tier caption                    | A big word (usually the verb) over a smaller line that names the object or payoff                      | At least 12 sets size-tier the lines (Toon Blast, Pokémon GO, Merge Mansion, Hay Day, Brawl Stars, Marvel Contest of Champions, Solitaire Associations, Candy Crush Soda, DBZ Dokkan, Honkai, Free Fire); more stack two equal lines (Kingshot, Block Out, Wuthering Waves, Last Asylum) | The punch word reads at thumbnail size and the smaller line explains it on the product page | Toon Blast, Merge Mansion, Hay Day                                               |
| 16  | Effects frozen at their peak        | The still is taken at the burst: mid-explosion, a trail in flight, particles in the air                | About 10 sets (Candy Crush Saga, Candy Crush Soda, Block Out, Royal Smash, Block Crush, Woodoku Blast, Color Block Jam, All in Hole, Monopoly GO)                                                                                                                                        | A still image feels like motion and shows the satisfying moment                             | Royal Smash (calm setup shots alternate with mid-explosion payoffs), Block Crush |
| 17  | A caption zone built into the scene | The caption area is part of the world, not a pasted bar                                                | Whiteout Survival (a snow fade), Travel Town (a wave-edged band), Yarn Loop (a wavy band), Block Blast and Woodoku (the game's own background)                                                                                                                                           | The text feels part of the game and the gameplay loses less space                           | Travel Town's wave band                                                          |
| 18  | Hand pointer or drag hint           | A hand, cursor or "drag" hint shows exactly which input the player makes                               | About 18 sets (Township, Royal Kingdom, Match Factory, Screwdom, Merge Cooking, Gardenscapes, Rotate Rings, Tasty Travels, Woodoku Blast, Whiteout Survival…)                                                                                                                            | The input is visible, so shot 1 teaches the game without words                              | Screwdom's tutorial hand, Township's tap cursor                                  |

## 4. Sequencing

The 24 deep reads show four recurring arcs. Median listing length is 7 shots.

- **Loop walk** (merge and renovation games). One verb per shot, in the order you play: action, then produce, then transform (before/after), then expand (map), then collect, then a brand closer. Examples: Flambé, Foodstars, Travel Town, Hotel Legacy, Merge Cooking.
- **Teach, then vary** (puzzle games). A mechanic hook with a hand pointer, then the goal, then a payoff or booster, then variety shots that swap the subject, then a challenge. The back half often repeats itself: Screwdom's shots 6–8 reuse captions.
- **One continuous run.** The same scene advances each shot, so growth reads at a glance. Examples: Top Lords, Last War, Whiteout Survival, and Township's close-to-far camera.
- **Feature tour on a template** (collection and big-brand games). A hero plus one feature per shot. Examples: Pokémon GO, Brawl Stars, Pokémon TCG Pocket.

The closing slot is usually brand art (playbook row 14). The one set in the data that closes on trust instead is Roblox: its last shot is the parental-controls dashboard, there to reassure parents. That is the precedent for our Grown-ups closer.

**What the first three tiles must do.** Portrait search results show three tiles side by side, each about 110–120 pt wide (330–360 device pixels on a 3× iPhone). An App Preview, when present, takes the first tile and autoplays muted.

1. **Tile 1: the core verb in action, with its payoff visible,** readable at that tile size. Not a logo, menu or settings screen.
2. **Tile 2: why it's worth doing:** the transformation or the reward.
3. **Tile 3: the emotional promise,** such as a cute face, a friend arriving, or the calm, no-pressure claim.

**Our row depends on the locale.** Our English App Preview (`store/preview/app-preview-en.mp4`) autoplays in tile 1, with the fling as its poster frame. So the EN search row is the preview plus screenshots 1 and 2. If screenshot 1 were also the fling, it would repeat the poster and push the emotional shot out of the row. The preview is English only, so the other locales start on screenshot 1. Section 7.4 gives the order per locale. Check each localized page after upload, in case App Store Connect falls back to the English preview.

**Models.** Tasty Travels follows this order (a mechanic, then the loop, then a "no ads / relaxing" breather), but take the order, not the execution. Its shot 1 is a side mode (flick to launch), not its core merge loop, and our notes flag its hero renders composited over gameplay and its HUD numbers that jump between shots. Its hook, a hand, a dashed aim line and an oversized glowing target, is also close to our fling. Ours differs in four ways. The fling is our core loop. The aim arc is the game's own Aim Guide, captured rather than drawn. Nothing is enlarged in place. The payoff is shown by the game's own aim tag. Screwdom is a model to copy: each of its first three shots puts a cute animal at the centre while still showing the core mechanic, so cuteness earns the tap and the play stays honest. Its weakness comes later (shots 6–8 repeat claims). Later slots add variety, depth and collection, then a closing shot for the brand or for trust. Never repeat a shot or a caption: Merge Mansion shows one image twice.

## 5. The cozy and family subset

69 of the 166 games (42%) scored as family-relevant. 14 scored the maximum: Toon Blast, Township, Tasty Travels, Screwdom, Flambé, Travel Town, Foodstars, Triple Match 3D, Hotel Legacy, Hay Day, Rotate Rings, Colorever, Search It and Royal Smash.

|                                 | Top family sets (14) |   All sets (166) |
| ------------------------------- | -------------------: | ---------------: |
| Captioned                       |            14 (100%) |              80% |
| Caption every shot              |             11 (79%) |              60% |
| Title case instead of all caps  |              7 (50%) | 20% of captioned |
| Real gameplay as the first shot |             11 (79%) |              65% |
| Full-screen gameplay            |             13 (93%) |              69% |
| Device mockup                   |                    0 |               7% |
| Breaks the frame                |              5 (36%) |              30% |
| Median caption length           |            2.5 words |          3 words |
| No red flags at all             |              4 (29%) |              17% |

**How the family sets differ**

- **Every set is captioned, in a softer voice.** 11 of the 14 caption every shot; Flambé, Travel Town and Triple Match 3D leave their logo or brand shot bare. Half use title case, and captions stay very short. Five use a single verb per shot.
- **Warmth comes from characters, not action.** Mascots in costumes, animals peeking in, customers with wish bubbles. Faces are big and happy and make eye contact.
- **Transformation replaces conquest.** Grey becomes colourful and ruins become homes. There are no enemies.
- **Pacing is calm.** Some sets include a deliberately sparse breather shot (Tasty Travels' "Enjoy") and reassurance lines (Colorever, Search It).
- **They still leak.** Currency pills, energy meters and gem "+" buttons appear in Travel Town, Flambé, Foodstars and Hotel Legacy. Only 4 of the 14 are flag-free: Township, Hay Day, Colorever and Search It.
- **Several cozy games use distress hooks:** crying children, cold rooms and homelessness in the merge games Merge Cooking, Seaside Escape and Gossip Harbor, and in Homescapes (a match-3 and renovation game). They work on adults, but they are wrong for an all-ages game.

## 6. What to avoid

Our rules:

- **Real gameplay (App Review 2.3.3).** Screenshots must show the app in use, not only title art.
- **No selling.** No prices and no promotion of in-app purchases (`store/compliance.md`).
- **No "for kids" wording (Guideline 2.3.8).** We launch in Games → Casual at 4+, not in the Kids Category, so the listing must not say "for kids" or "for children" (`store/compliance.md`). Nothing may imply it either: no "younger players", "little ones" or "your child".
- **No "free", no "#1" or "best", and no other games' names** (`store/README.md`). `store/tools/measure-listings.py` checks the listing text for these words but not the screenshot captions, so run the captions through the same list.
- **No chance or gambling imagery.**
- **No pressure words.**
- **A kid-safe tone.**
- **Never copy another game's look.**

| Red flag                                                                         | Sets (approx.) | Examples                                                                | What it means for us                                                                                                                                  |
| -------------------------------------------------------------------------------- | -------------: | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Currency counters, "+" buy buttons, shop icons, money piles                      |      ≈53 (32%) | Travel Town, Foodstars, Clash of Clans                                  | Crop out our sparkle and gem counters (they currently show in shots 6–8)                                                                              |
| Misleading content: non-gameplay leads, ad-style mini-games, too-perfect renders |      ≈40 (24%) | Total Battle, Evony, Homescapes, Royal Kingdom                          | Every frame comes from a real capture; no renders composited into the scene; hero moments only in marked zoom bubbles                                 |
| Violence, weapons, combat                                                        |      ≈36 (22%) | Kingshot, PUBG, Brawl Stars                                             | No battle words or poses; Troubles stay gentle                                                                                                        |
| Casino, bingo, real-money prizes                                                 |      ≈29 (17%) | Jackpot Party, Solitaire Cash, Bingo Cash                               | Out of scope entirely                                                                                                                                 |
| Distress or adult themes                                                         |      ≈23 (14%) | Gossip Harbor, Seaside Escape, Brain Puzzle 2                           | "Before" states are empty and sleepy, never suffering                                                                                                 |
| Pressure or hype words ("addictive", "loser", "winner", daily hooks)             |      ≈20 (12%) | Block Blast, Songless, Lamar                                            | Calm verbs only                                                                                                                                       |
| Chance or loot imagery in non-casino games (packs, chests, wheels, dice)         |      ≈18 (11%) | Pokémon TCG Pocket, Toon Blast, Merge Cooking                           | Show the Lifebook as earned; never a pack or chest reveal                                                                                             |
| Timers and countdowns                                                            |      ≈18 (11%) | Royal Match, Block Out, Merge Mansion                                   | Keep the Meteor Rush clock out of frame                                                                                                               |
| Unverifiable claims (IQ, brain age, "#1", "top rated")                           |       ≈10 (6%) | Screwdom, Woodoku Blast, Cider Casino                                   | Only literal claims we can check                                                                                                                      |
| Sexualised or revealing outfits                                                  |        ≈6 (4%) | Wuthering Waves, Honkai: Star Rail, Sword x Staff, OneState RP          | Creatures keep round, non-human proportions; the Keeper always wears the full suit; no fashion or "glamour" poses                                     |
| Ethnic, national or body stereotypes in character art                            |        ≈3 (2%) | Jackpot Party (a chef caricature), Lightning Link (an emperor), Z Route | No creature, costume or Keeper look is built on a real people's features, dress or body type; costumes are props (a hat, a scarf), never a caricature |
| Look-alikes of third-party IP                                                    |             ≈1 | Colony Flow (pixel art resembling a band's tongue logo)                 | No pixel art, silhouette, logo shape or creature that echoes a real brand or franchise; comets and pods never read as a capture ball                  |

**Copying.** Several devices clearly belong to one game:

- Hay Day's gold plaque
- Flambé's orange band with kitchen icons
- Toon Blast's rising-hill band with a corner bear in a new costume on each shot
- Jelly Busters' swoosh band with a white keyline, a new band colour on each shot, and a new jelly mascot in the bottom-right corner
- Screwdom's wooden sign
- Rotate Rings' costumed squirrel
- Pokémon GO's glowing card with a creature standing outside it
- Supercell's hard-candy lettering: a white-to-blue-grey gradient with a navy keyline and a bevel (Clash of Clans), or a thick black outline with a hard extrusion (Brawl Stars)

Light type with a dark outline is not on this list. About 45 of the 132 captioned sets use it (Toon Blast, Jelly Busters, Match Factory, Kingshot, Clash of Clans and many more), so it is a genre convention. Our lockup doesn't use it anyway (section 7.2).

Each deep read records its own do-not-copy list. The rule: borrow the structural technique, never the shape, material, colour pairing, character or wording. Borrowed techniques can still add up to one game's look, so check the whole lockup, not each part on its own.

**One honesty trap specific to us.** Comet Garden has fail states and a 60-second Meteor Rush mode, so we must not borrow Colorever's "no timers, no fails". Claims we can truthfully make:

- No ads.
- Purchases sit behind a grown-ups gate.
- Gentle planets in the Grown-ups area.
- Data Not Collected.

## 7. Recommendations for Comet Garden

### 7.1 Where the current set stands (`store/screenshots/contact-sheet-en.png`)

**Keep:**

- Real gameplay in every shot.
- Fredoka as the typeface.
- The trust shot as the final shot.

**Fix:**

- **The device frame on flat colour.** It shrinks the planet to about 45% of the width (590 px) and creatures to 60–75 px, too small to read in search.
- **No shared lockup.** Eight different backgrounds with nothing beyond caption position tying them together.
- **Captions too long.** They run 3–6 words (median 4) in `store/captions.json`, against a median of 3 across all sets and 2.5 in the top family sets.
- **The hue order doesn't read as a day.** The `captions.json` backgrounds run orange, green, yellow, blue, coral, teal, violet, indigo; only the two ends feel like morning and night. Section 7.2 retires them as backgrounds and re-sequences them into a real sky ramp.
- **Visible currency.** The sparkle and gem counters show in the Homeworld, Lifebook and Grown-ups shots.
- **No large faces.** The Keeper and the creatures are small next to the launcher.

### 7.2 House rules for every direction

**Canvas and capture.** 1320 × 2868 px (6.9-inch). The capture is the game at 440 × 956 pt at 3×, placed 1:1 and full-bleed: no scaling and no device frame. Measured on today's capture (native layout):

| Element in the capture                     | Position (px)                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| HUD (planet name, life bar, throws, goals) | y 24–416 (moves to y 210–602 with the top inset below)                                          |
| Planet                                     | centre (660, 1233), diameter 713 (54% of width); set by `sceneGeometry` in `src/core/flight.ts` |
| Launcher ring                              | x 504–816, y 2262–2574                                                                          |
| In-game Keeper                             | x 298–420, y 2327–2575                                                                          |
| Next-object bubble                         | x 858–990, y 2185–2320                                                                          |
| Tooltip line (object name and effect)      | y ≈ 2780–2830, centred                                                                          |

**Layout grid.** The text zone and the play zone never overlap.

| Zone            | Position (px)                                                                         | Rule                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top inset       | full width, y 0–186                                                                   | The capture sets the game's top inset (`--st`) to 62 pt, the iPhone 16 Pro Max's own. The HUD sits where players see it and clears the rounded corners. No status bar, clock, battery or Dynamic Island shape is drawn: this strip is plain game sky. |
| Play zone       | y 186–2575                                                                            | Real capture only. Nothing overlaps the launcher, the in-game Keeper or the planet.                                                                                                                                                                   |
| Band            | top edge a convex arc through (0, 2640), (660, 2600) and (1320, 2640); down to y 2868 | Clears the launcher and the Keeper's feet by at least 25 px and covers the whole tooltip line (which capture mode also hides). 268 px tall at the centre, 228 px at the edges.                                                                        |
| Text zone       | x 96–1224 (max line width 1128) × y 2644–2790                                         | One line, centred, baseline fixed at y 2760 on every shot, so the cap height (66–88 px) sits within y 2672–2760, below the rim glow. Japanese: y 2662–2826 (see 7.5).                                                                                 |
| Side margins    | 96 px left and right                                                                  | No overlay text or sticker closer to the edge.                                                                                                                                                                                                        |
| Corner keep-out | a 96 × 96 px square in each corner                                                    | The App Store rounds screenshot corners (Apple doesn't publish the radius), so only band fill goes here.                                                                                                                                              |

**Planet.** The centre stays at (660, 1233) on every gameplay shot.

- **Native shots** (1, 4, 5 and the Troubles shot) use the real layout: diameter 713 px. Going full-bleed alone makes it 1.2× today's size.
- **Zoom shots** (2 and 3) use a 1.5× camera crop around the same centre: diameter about 1070 px (81% of the width). The launcher and the HUD fall outside the frame, so hide the HUD on these. Capture them at 4.5× device scale and crop, so nothing is upscaled (see 7.5).
- A planet at 75–85% of the width can't coexist with the launcher, because the game's planet radius is at most 27% of the screen width (`sceneGeometry`). The two sizes above are what the real layout allows.

**Caption band.** Fill `#2d3a8c` (night indigo), the same on every shot. It carries a faint pattern of tiny comets, seeds and dotted orbits at 8% contrast or less. The per-shot colour lives only in the rim: an 8 px line along the top edge, plus a 24 px glow of the same hue fading down inside the band. The glow never tints the capture and never reaches the text zone.

**Rim hue: a sky ramp by slot position, not shot number** (EN and the other locales use different orders, see 7.4):

| Slot | 1 sunrise | 2 morning | 3 late morning | 4 noon    | 5 sunset  | 6 dusk    | 7 twilight            | 8 night               |
| ---- | --------- | --------- | -------------- | --------- | --------- | --------- | --------------------- | --------------------- |
| Hue  | `#ff9a3d` | `#ffc93d` | `#7ad7c7`      | `#5aa8ff` | `#ff6f6f` | `#b58cff` | `#a9a4d6` (`--muted`) | `#f4f2ff` (starlight) |

This drops the green `#3fbf7f` (not a sky colour) and turns the indigo into the band fill.

**Caption type.**

- **Face and case.** Fredoka 700, sentence case, one line. Why sentence case when half the top family sets use title case: it reads as a calm spoken invitation rather than a headline, it sets us apart from the 67% in all caps and from the family norm, and it survives translation. French and Spanish don't use title case, German capitalises nouns anyway, and Japanese has no case. NYT Games, Pokémon TCG Pocket, Roblox and Gardenscapes use it.
- **Colour and contrast.** Starlight `#f4f2ff` on the indigo band gives 9.06:1 with no stroke. The minimum is 4.5:1 without any stroke, measured against the lightest band pixel behind the glyphs, and never below 3:1 anywhere. Contrast has to come from the band, because a stroke disappears at search size: an 8 px stroke is about 2 device pixels in a 345 px tile.
- **Effects.** No outline and no bevel. An optional 4 px hard shadow straight down in `#1b1846` at 60% adds depth at full size.
- **Size.** 96–128 px (cap height 66–88 px), in 4 px steps. Each locale uses one size for its whole set: the largest step at which its widest caption fits 1128 px. The EN draft runs at 112 px (cap 77 px), set by "Build your Homeworld" (1,117 px). The earlier target of a 5% cap height (143 px cap, 208 px type) can't be built: at that size "Build your Homeworld" would be 2,070 px wide on a 1,320 px canvas.
- **Wrapping.** A Latin-script caption never wraps in the band and never goes below 96 px or tighter than −1 px tracking. If it doesn't fit, rewrite it (7.5).
- **In search.** At 112 px, the cap height is about 20 device pixels in a 345 px search tile, roughly 10 pt text. Only the caption and the planet need to read in search. HUD text, faces and small details only need to read on the product page.

**Words.** 2–4 words, 3 as the norm, starting with a verb. One line, no second tier: the band's height (fixed by the launcher) doesn't leave room for two lines, and a big word over a small line is part of the Toon Blast, Jelly Busters and Pokémon GO look.

**The recurring face: the Keeper.** There is one host, the Keeper, and no new mascot per shot.

- **Gameplay shots.** No sticker host is added. The in-game Keeper by the launcher, at its true size (about 250 px tall), is the recurring face, and the enlarged planet carries the creatures.
- **Screen shots** (Lifebook, Grown-ups, and the Homeworld if the game doesn't show the Keeper there). A Keeper sticker stands in the same spot as the in-game Keeper, so it appears at one position across the whole row. Size: 250 px tall, about 135 px wide, plus a 10 px white sticker outline. Anchor: feet centred at (359, 2608), standing on the band's edge, facing the caption. It uses only real poses (idle, cheer, lean, dance), never over gameplay and never over the content the caption points to.

**Hero moments and callouts.**

- **Zoom bubbles.** A hero element is shown enlarged only inside a marked zoom bubble: a circle 360–420 px across with a 6 px starlight ring and a thin leader line to the element's true position, rendered at 1.5–2× (not upscaled). Nothing is scaled in place inside the capture.
- **Callouts.** Annotation overlays (a recipe chip, a count) are plainly marked as callouts and match the game's real rules.
- **Sparkles** go only in the side margins, never over the planet.

**HUD.** Keep the planet name, throws and life bar on native shots as proof that this is the real game. Hide the pause button, currency and the tooltip. Every number comes from a real seeded save played to that state, never edited.

**Copy check before approval.** Put our 8-tile strip next to the Toon Blast, Jelly Busters and Pokémon GO strips at search size. If any tile could be mistaken for theirs, change it. The first draft of this lockup combined most of the devices that make those sets recognisable:

- a two-tier caption
- a curved band
- a band colour that changed each shot
- a new mascot in a bottom corner, overlapping band and gameplay and acting out the caption

This lockup changes three of those: a fixed band colour, one line, and one recurring host who is not in a corner.

**Final check.** Check on a real iPhone, or a 1:1 mock of the search row at 3× (tiles 345 px wide with 8 pt gaps). Include the EN preview poster in tile 1, and check in both the light and dark App Store appearance.

### 7.3 Three candidate directions

| Direction                                | Idea                                                                                                                                                                                                                                                                                                                                                                                                                      | Techniques used                                                                                                                                              | Strength                                                                                                                                                                                                                                                                                                                                                                        | Risk                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Horizon Hosts**                     | The house lockup on every shot, with a different planet per shot (Mossy World, Ember World, Frost Haven…) and a creature host acting out the caption                                                                                                                                                                                                                                                                      | Fixed lockup, full-bleed, verb captions, a host that acts the caption, colour rhythm, frame breaks                                                           | Simplest to produce; strongest set identity; shows how varied our biomes are                                                                                                                                                                                                                                                                                                    | Closest to the corner-mascot pattern (Toon Blast, Jelly Busters, Rotate Rings, Pokémon GO). A host on the band would also need its own zone, taking about a fifth of the caption width. Planets can look alike at thumbnail size                                                                      |
| **B. One Planet, One Day** (recommended) | Shots 1–3 follow one seeded planet from bare rock to a crowded garden; shot 2 is a before/after split along the comet trail. Shot 4 shows a Fusion (on the same planet if one can be staged there) and shot 5 a sky-obstacle planet; 6–8 show the Homeworld, the Lifebook and the Grown-ups area. The rim runs a sky ramp from sunrise to night. Uses the house lockup (fixed band, one line, the Keeper as the one host) | Growth across shots 1–3, before/after, a cause-and-effect hook with the game's own drag hint, verb captions, colour rhythm moved into the rim as time of day | Our real loop (fling, grow, friends move in) shows in the first three search tiles (in EN: the preview, the bloom and the friends). Growth across a set is rare in cozy or planet games: Township's close-to-far camera is the nearest cozy case, and Last War, Top Lords and Whiteout Survival do it in war settings. In ours, the change comes from the throw shown in shot 1 | Needs a seeded planet captured at several growth stages, which means a marketing capture mode. The first draft borrowed A's corner hosts and per-shot band colours, which added up to Toon Blast's and Jelly Busters' look. The 7.2 lockup removes that, but run the strip comparison before approval |
| **C. Sticker Scrapbook**                 | Gameplay in rounded, slightly tilted sticker cards (~80% width) over a soft nebula. Big die-cut creature stickers peel over the card edges. Captions pair a feeling headline with a plain sentence for parents                                                                                                                                                                                                            | Card over art, frame-breaking characters, a postcard collage, two-tier captions; echoes our Sticker Album and Lifebook                                       | The warmest and most collection-forward option; parents can read it                                                                                                                                                                                                                                                                                                             | Gameplay about 20% smaller; more compositing; can read as an ad; card-plus-character is a well-worn layout. The parent line must name features only (no ads, purchases behind a grown-ups gate) and never imply a kids' app ("for kids", "your child", "little ones") under 2.3.8                     |

**Recommendation: Direction B**, borrowing C's sticker cards for the Lifebook and trust shots. B is the only direction that sells our core loop as a story in the three search tiles. It also turns our biggest asset into the signature: the planet visibly changes because of the player. A and C are the fallbacks if the staged capture proves too slow to build.

### 7.4 Recommended shot list (Direction B)

EN order: the App Preview (fling poster), then shots 2, 3, 4, 5, 5b, 6, 7, 8. The preview already shows the fling, so the still would repeat it; the Troubles shot fills the eighth slot. Other locales: shots 1–8.

| #   | Slot (EN / others) | Role      | Real capture                                                                                                                                                                                                                                  | Hero moment or callout (marked)                                                   | Caption (EN, one line) |
| --- | ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------- |
| 1   | — (preview) / 1    | Hook      | Native layout. The seeded planet half-grown; a comet mid-flight on the real dotted aim arc; the game's own aim tag (+life, new land, a friend moving in); the game's own drag hint ("Pull back & release to fling" with the hand) switched on | None: the aim tag shows the payoff and the drag hint shows the input              | Fling a comet          |
| 2   | 1 / 2              | Payoff    | 1.5× zoom. The same planet split along the comet's trail: bare grey rock (about 45% brightness) against the lush, busy stage; the seam is a visible line                                                                                      | The trail acts as the arrow                                                       | Watch it bloom         |
| 3   | 2 / 3              | Emotion   | 1.5× zoom onto the same planet's rim as Canopy Octopus moves in, with the real "new creature" card showing                                                                                                                                    | None: the real card is the hero                                                   | Welcome new friends    |
| 4   | 3 / 4              | Feature   | Native layout. A Steam Fusion with Combo beads (on the seeded planet if it can be staged there, otherwise another real planet)                                                                                                                | A recipe chip in our style: Ice + Magma → Steam (the pair in `src/core/round.ts`) | Mix a Fusion           |
| 5   | 4 / 5              | Skill     | Native layout. A Bubble Moon bank shot (a different planet) with the Aim Guide bending                                                                                                                                                        | A zoom bubble on the bend                                                         | Read the sky           |
| 5b  | 5 / —              | Care      | Native layout. An Ember Vent planet with the forecast strip and a Buddy shield in play                                                                                                                                                        | None                                                                              | Keep Troubles away     |
| 6   | 6 / 6              | Ownership | The fully grown Homeworld with its residents, counters cropped out                                                                                                                                                                            | None                                                                              | Build your Homeworld   |
| 7   | 7 / 7              | Variety   | The Lifebook grid, with three creature cards lifted out as stickers that cross the card edge. Keeper sticker                                                                                                                                  | A count callout: "36 creatures" (the real total)                                  | Meet 36 creatures      |
| 8   | 8 / 8              | Trust     | The Grown-ups screen as a small sticker card (no counters, no prices) under a night sky. Keeper sticker. Precedent: Roblox's parental-controls closer                                                                                         | None                                                                              | Play with no ads       |

Every caption is 3 words except shot 8 (4), and each starts with a verb. Shot 7 frames the collection as variety to discover ("meet"), not a set to complete. Shot 8 leaves the grown-ups gate to the image. If testing shows parents miss it, the alternative is "Keep purchases with grown-ups" (4 words).

After launch, run an A/B test on the first screenshot: in EN, Bloom vs Friends behind the preview; elsewhere, Fling vs Bloom. In the non-EN locales, also test shot 5 against the Troubles shot.

### 7.5 Production notes

- **Marketing capture mode in `store/tools/shots.mjs`.**
  - Hide the pause button, currency and the tooltip; hide the whole HUD on zoom shots.
  - Set the top inset (`--st`) to 62 pt.
  - Switch on the tutorial drag hint for shot 1.
  - Lift the canvas resolution cap. `resize()` in `src/ui/fx.ts` and the sprite caches (`critters.ts` and others) use `Math.min(2, devicePixelRatio)`. A 3× capture is already upscaled 1.5× today, and a 1.5× crop would be 2.25×. Render native shots at 3× and zoom shots at 4.5×, then crop.
  - Seed one planet and capture it at each growth stage.
  - Freeze effects at their peak, the moment of impact (playbook row 16).
- **Sticker renders.** Export the Keeper at 250 px tall and the three Lifebook creature stickers at 300 px, each with the white outline and a soft contact shadow. The art is code-drawn, so render at the final size rather than scaling up.
- **Composer.** Replace the device frame in `store/tools/frame.html` with the band lockup:
  - the band path, the rim hue by slot, and the text zone;
  - one-line autofit from 128 to 96 px in 4 px steps, with one size per locale set, instead of today's per-shot 72–108 px with two lines;
  - the Japanese rule below.
- **Captions.** `store/captions.json` keeps one line per shot (no language has a second "small" line, and this design doesn't need one). Replace the EN lines with the drafts above, re-translate within the limits below, and add the per-locale slot order.
- **Localization limits** (one line at the 96 px floor within 1128 px). Fredoka 700 measures 0.45–0.52 em per character across our current captions. Two different captions are the extremes today: French shot 1 has the most characters ("Lance des comètes, fais pousser un monde", 40 characters, against 36 for German and Portuguese), and German shot 8 sets the widest in Fredoka (19.5 em). The composer's measured width is the final rule; the character counts are a drafting guide.

| Locale         |          Max characters per line | Target (keeps the set at 120 px or more) | Fallback if it doesn't fit                                                                   |
| -------------- | -------------------------------: | ---------------------------------------: | -------------------------------------------------------------------------------------------- |
| EN, ES, FR, PT |                               22 |                                       18 | Drop articles and adjectives, then use the game's shorter term; never wrap or go below 96 px |
| DE             |                               21 |                                       17 | The same; don't split compounds with a hyphen                                                |
| JA             | 12 on one line, or 2 lines of 15 |                                       12 | Two lines (below)                                                                            |

- **Japanese.** Fredoka has no Japanese glyphs. `frame.html` falls back to Hiragino Maru Gothic ProN, which has only one weight (W4), so the composer fakes weight with a stroke.
  - **Font.** Bundle a rounded Japanese face with a true bold instead, for example M PLUS Rounded 1c (OFL) at ExtraBold, loaded from `node_modules` like Fredoka.
  - **Size.** One line at 88–96 px if the caption has 12 characters or fewer. Otherwise two lines at 72 px, line height 1.12, in the text zone y 2662–2826. Both lines are the same size.
  - **Line split.** Japanese puts the verb last, so "verb first" becomes "one action per caption, verb at the end" (…をそだてよう). Break after 、 or after a particle that ends a phrase (を, が, で), never inside a word. This is what `jaBreak` in `frame.html` already does. Prefer kana and simple kanji, which stay readable at search size.
- **Honesty guardrails.**
  - No creatures, biomes or effects the game can't produce.
  - HUD numbers come from a real seeded save played to that state, never edited.
  - Hosts are clearly illustrated (white sticker outline, flat contact shadow) and stand on the band. They are never placed over gameplay as if they were in the game.
  - Nothing is enlarged in place inside the capture. Hero moments appear only in marked zoom bubbles.
  - Annotation overlays (the recipe chip, the count, zoom bubbles) are plainly marked callouts that match the game's real rules and don't alter the capture beneath them.
  - Why the set still meets Guideline 2.3.3: every tile's main image is a real capture of the app in use at its real layout, and everything we add is framing around or on top of it, so nothing changes what the game shows.
- **After launch.** Use Product Page Optimization for the tests in 7.4.

## Appendix A. Deep-read sets

The 24 sets read shot by shot (all flagged as standouts in the broad pass): Brawl Stars, Clash of Clans, Colorever, Dice Dreams, Flambé, Foodstars, Hay Day, Hotel Legacy, Jelly Busters, Merge Cooking, Merge Mansion, Pokémon GO, Pokémon TCG Pocket, Rotate Rings, Royal Smash!, Screwdom, Search It, Seaside Escape, Tasty Travels, Toon Blast, Top Lords, Township, Travel Town and Triple Match 3D.

Standouts not deep-read (cut by the cap of 24): Hole.io, Paper.io 2, Goods Puzzle, Sudoku.com and Block Crush!.

Every other game named in this report (for example Car Sort, X-Clash, Cube Land, Kingshot, Royal Match, Roblox, Whiteout Survival and Last War) is cited from its broad-pass row in `docs/product/store-art-notes/broad-pass.json`.
