# Adversarial critiques of the 45 PM proposals

## critic:player-advocate

```json
{
 "lens": "Player advocate: a parent and a 7-year-old testing together, plus a busy adult in a waiting room. The test is whether it is fun, clear and quick, whether a round still takes about 1-2 minutes, and whether the first 10 minutes get better. Bottom line: each proposal is reasonable on its own, but together they bury the first 20 planets. Here is the stated plan (checked against KINDS.unlock in world.ts: seed 2, magma 4, storm 7, sun 11; HOME_UNLOCK_LEVEL 5):\n- P5, about 7 minutes in: the Homeworld opens with a 4-step card (build a Workshop, invite a creature, give it a job, launch with a Kit item). The Steam reaction debuts on the same planet, and Essences become the headline reward on results.\n- P6: goals, Momentum, Firemount and the Kit row.\n- P8: Glacier, Star Motes, the Missions tab and a booster.\n- P10: Flood, the Comet Guardian and Guardian meteors.\n- P14: Scorch and Ember Vent together.\nThat is 2-4 new ideas per planet, while the PMs' own rule is one. The meta side adds about 20 new nouns: Essences x5, Hearts, Workshops, paths, Kit, Helper, Ward, Refinery, Dock, Fronts, Dimmed, Commissions, Blueprints, Orbit, Monuments, star ore, Glow, Seasons, Club and Wishlist. It retires almost nothing. The three hazard vocabularies and two trait systems also disagree with each other. The core-loop and UX pieces are mostly right: reactions, telegraphed Troubles, wander-off feedback, tappable goals, fixing the first 10 minutes and a single Next Up. They need slower pacing and one owner per concept. The Homeworld economy pieces (adjacency math, front damage and repairs, path builds, team composition) are where a 7-year-old gets lost and a waiting-room adult gets chores.",
 "verdicts": [
  {
   "proposalId": "meta-homeworld-1",
   "verdict": "change",
   "reason": "A one-sentence loop, concave idle income and 'a good round matters again' are right. The claim that core counters drop from 10 to 4 is misleading, though: it adds 5 Essences, Hearts, a Star Dock and a Refinery, and boosters, tokens and Rank stay. The Refinery (3:1 conversion, 12 per 8h) is a workaround for frost starvation that should be fixed at the source. It also cuts free gem faucets 'so gem packs are worth buying' while monetization-1 retires gem packs. That just makes the game stingier for kids and earns nothing.",
   "fix": "Keep: the loop sentence (unified with the ux-1 title beat), the Dock's concave rate, the merged 'Collect all' that counts for quests, and removing x2-for-gems. Cut the Refinery. Raise frost and ember drops in dropsFor and add Glacier-made frost until the liveops-data-3 band (at least 0.4 frost per level) holds. Show Essences only in the Homeworld header plus one results line from about P12, not as the P5 headline. Keep the existing 'friendship' name instead of adding Hearts. Do not remove Grove, friendship or expedition gems unless gem packs are kept."
  },
  {
   "proposalId": "meta-homeworld-2",
   "verdict": "change",
   "reason": "Putting shot upgrades on the Homeworld is the best answer to 'what is the base for?'. But the design is a Bloons TD6 build system aimed at 6-year-olds: 3 paths with a 3-1-0 cross-path cap, free respec, primary and secondary Essence pairs, a Master-resident gate for evolution, and hourly Essence production with an 8h cap (another timer to check). It also contradicts core-loop-8, which is a linear ladder at different prices. And 'Workshop' is already the name of the cosmetics screen.",
   "fix": "Merge it with core-loop-8. Six small shot buildings on the Homeworld, named 'Rock Lab', 'Ice Lab' and so on, never 'Workshop'. Each has a linear ladder from Lv2 to Lv5 with one named perk per level, priced in stardust plus ONE matching Essence. Evolution = Lv5 plus the next Guardian win, with no Master resident. No paths, no respec, no Essence production. Keep the '+15pp at most' sim band and Lv2 at Homeworld Lv1."
  },
  {
   "proposalId": "meta-homeworld-3",
   "verdict": "change",
   "reason": "Seeing the base help in the next minute is the right goal. But a 1-4 slot loadout of Helpers, Ward charms and evolved shots sits on a pre-level sheet the UX audit already found overflowing at 320x568, next to the booster row. It also fights ux-2's one-tap next level. Three kinds of Kit item plus boosters is two loadout layers before a 1-minute round. And the Kit row lands on P6, the same planet as goals and Momentum.",
   "fix": "Exactly ONE slot: the Helper. This merges core-loop-7's Buddy Power and liveops-data-9's Buddy Helper into a single character. It is auto-suggested from the forecast and shown as one chip on the ux-2 pre-level overlay, so it costs 0 taps. Wards act only on the base. An evolved shot joins the deal automatically once hatched, with a toggle in its Lab. Unlock after chapter 1 (about P18). Results show a one-line 'Homeworld helped' dividend."
  },
  {
   "proposalId": "meta-homeworld-4",
   "verdict": "change",
   "reason": "Jobs and traits finally give the creatures a point, and 'no penalty for a mismatch' is right. Problems:\n- Its 5 Essence-family traits (Sturdy, Rain-maker and others) contradict core-loop-7's 4 biome traits. Tide Otter (home forest+ocean, world.ts:322) is 'leaf/Rooted' here and 'Swimmer' there.\n- 'Ember Newt needs a Forge to feel at home' stops a child from inviting the creature they love.\n- A daily Heart greeting per resident, capped at 5, is a tap chore.\n- '+15% x rank' percentages mean nothing to a 7-year-old.",
   "fix": "Adopt core-loop-7's trait set as the only one, one icon per creature. Jobs are optional, with 'Auto-place friends' on by default. Drop the rule that a species needs its Workshop before it can move in. Drop the daily greeting: Hearts come from collects, play and Commissions only. Show job strength as 1-3 sparkles, not percentages."
  },
  {
   "proposalId": "meta-homeworld-5",
   "verdict": "cut",
   "reason": "This is a production spreadsheet on an idle base:\n- +50% feeds and -50% 'Thaw'/'Scorch' clashes\n- a Sun Mirror exception for the Ice Well\n- Wards that cancel clashes\n- Refinery chains\n- an x2.5 multiplier cap\n- plot scarcity plus a Store action\nIt optimises passive income, which the other proposals are trying to shrink. No 7-year-old will read '-50% Thaw', and a waiting-room adult gets layout homework. It also reuses 'Scorch', which is a core-loop-3 reaction name.",
   "fix": "Cut from v1. If layout needs meaning later, allow feeds only (no clashes), shown as a sparkle link with no numbers. No plot scarcity and no Store action. Teach the element chemistry in levels, where it is fun."
  },
  {
   "proposalId": "meta-homeworld-6",
   "verdict": "change",
   "reason": "Meteor Watch is the most kid-fun idea in the meta set: catch meteors over your own Homeworld with the fling you already love, in 60-90 seconds. But Fronts every other day that Dim buildings and cost Essence repairs are a check-in penalty. Because fronts skip only after 3+ days away, a player who opens the app every 1-2 days is hit the most. They also add a third hazard vocabulary (Blight, Frostbite, Heat Wave) on top of core-loop-4's Troubles, and they need forecasts, Wards, residents and repairs.",
   "fix": "Keep Meteor Watch as an optional round with only an upside, offered at most once a day ('Meteor shower over your Homeworld: catch star ore!'), capped at 60 seconds and 10 throws. Cut Dimmed buildings, repairs and the Blight, Frostbite and Heat Wave fronts. Wards become decorations that auto-catch 1-2 meteors for a small bonus. Nothing on the base ever gets worse while you are away."
  },
  {
   "proposalId": "meta-homeworld-7",
   "verdict": "change",
   "reason": "Sending creatures to planets you grew is charming and deterministic. But the rest is management: 1-3 member teams with +50% per family match, three routes, a trait-match requirement for Far Side, and Blueprint rules for homecomings. It also removes 2-6 gems per run, which only makes sense if gem packs survive (monetization-1 retires them). Frost starvation should be fixed in drop rates, not with an 8-hour errand.",
   "fix": "Pick a planet, and the game auto-picks the best team and shows the yield. Two durations (1h and 8h), 1 slot. Keep the postcard of the real planet. Keep a small gem reward if gem packs are retired. Blueprints are deferred."
  },
  {
   "proposalId": "meta-homeworld-8",
   "verdict": "change",
   "reason": "One Homeworld Level and one clear next goal are exactly what the base lacks. But the 4-part level-up checklist gates base growth on skill feats: 'Clear a Super Hard planet' is designed to fail 30-70% of the time, and 'Contain a Wildfire without losing a creature' is similar. That is a wall for a 7-year-old. Commissions add a second 3-card board next to the daily quests. The first-hour card teaches 4 concepts (Workshop, invite, job, Kit) in one sitting at minute 7. Orbit and Monuments add more nouns.",
   "fix": "Level-up needs the chapter, stardust and Essences only. Signature Feats become optional Monuments. Commissions REPLACE the 3 daily quests (the resident asks, the quest system tracks it) instead of adding a board. The first hour is 2 steps: build your first shot Lab and invite your first creature, with the job auto-assigned. Defer Orbit and Monuments. Keep the housekeeping: actionable-only badge, clock guards and dead-field removal."
  },
  {
   "proposalId": "meta-homeworld-9",
   "verdict": "change",
   "reason": "The themes are fixed-price, previewable on your own base and cosmetic only, which is fine for kids. But they duplicate monetization-5's Homeworld Themes under different names and counts (5 vs 3). They are also dual-priced ($2.99 or 360 gems), which conflicts with monetization-1's 'one item, one price, one currency, no gems sold'.",
   "fix": "Fold into monetization-5 as one Homeworld Theme line with one price per item (USD in the Grown-up Shop, or gems only if gem packs are kept; pick one). Keep the 30-second try-on on the child's own base, the 'Money buys looks, never power or time' line and the free third drone."
  },
  {
   "proposalId": "core-loop-1",
   "verdict": "keep",
   "reason": "Players never see this. It is the only thing that guarantees 1 star is always reachable 'the old way' (Solver 0) and that the aim preview matches what happens. A 6-year-old never meets an impossible planet because of it. Every hazard or combo without it risks silent walls.",
   "fix": "Add a per-round time metric to the bots with every layer on (throws x flight x read time) and a CI band for median round length (60-100 s at P21-60). Also expose RoundState snapshots so an interrupted round can resume (see missing)."
  },
  {
   "proposalId": "core-loop-2",
   "verdict": "keep",
   "reason": "Wander-off ghosts with 'came back!', tappable goal recipes and a short queue are the biggest clarity wins for a 7-year-old. Today 39-74% of throw options lose a creature silently. Icon-first rows work for pre-readers. First-arrival-only quest ticks close a farming hole.",
   "fix": "Make this the single preview spec: current plus next 2, swap with next only. ux-5 defers to it. By default the card shows 1 row (biome plus at most one chip). A second row appears only when a creature would leave or a reaction fires. It must pass a no-overlap screenshot test at 320x568."
  },
  {
   "proposalId": "core-loop-3",
   "verdict": "change",
   "reason": "Reactions directly answer the owner's synergy ask, and 'these two together make X' is readable for a kid. But 8 reactions debuting one per planet from P5 to P14 collide with the Homeworld (P5), goals (P6), Storm (P7), the Guardian (P10), Sun (P11) and Troubles (P14). Flood is double-edged (forests drown, but sea creatures love it), and a 7-year-old cannot tell whether it is good or bad. Scorch (Magma+Sun) will fire by accident often, because sun is the strongest and most-reached-for object. 'Unique sound per reaction' fails in a muted waiting room. 'Glow' also collides with monetization-4's season points.",
   "fix": "v1 ships 4 Fusions and 1 Clash, spaced out:\n- Steam (Ice+Magma) at P8\n- Rain Garden at P12\n- Bloom at P16\n- Glacier at P21\n- Scorch as the first Clash, no earlier than P25\nFiremount, Rainbow and Flood come in v1.1, one every 6-8 planets. Every reaction must read with sound off (arc, banner and icon). Keep the Lifebook chart. Rename the season currency, not the Glow ring."
  },
  {
   "proposalId": "core-loop-4",
   "verdict": "change",
   "reason": "Telegraphed Troubles with one counter each are the right negative interaction, and the 1-star floor is protected. But:\n- Firebreak rules are written in hidden numbers (water at least 2, land at least 3) that the player never sees; the audit notes that sector numbers are never shown.\n- The Meteor debuts on the P10 boss, although the proposal says 'none on planets 1-13'.\n- Troubles tick every 2nd throw on Remix, stacking on Remix's 'exactly one twist, classic rules' spec.\n- Super Hard with 2 Troubles, Guardian meteors and a twist is too much for one screen.",
   "fix": "Describe firebreaks in biome words and icons ('mountains, water and fireproof friends stop fire') and draw a small wall glyph on firebreak sectors while a Trouble is live. v1 ships Ember Vent (P14 at the earliest, alone on that planet) and Tanglevine. Frost Creep and Meteor come later. Guardian meteors start at the P30 boss. No Troubles in Remix v1. At most 1 Trouble plus 1 twist per planet until P40."
  },
  {
   "proposalId": "core-loop-5",
   "verdict": "change",
   "reason": "Churn-proof charge is right. But 'Tap to arm' is opt-in: a 6-year-old who never taps never gets a Supernova, where today they get about 3.7 free per level. That is a direct regression for the youngest player. Star Motes add a third aim target in a sky that may already hold moons, the Guardian and meteors, and Wild Pod opens a 6-way picker mid-round, which slows the waiting-room pace. Nova first appears at P3 here but at P9 in ux-3.",
   "fix": "The Nova fires automatically on the next throw by default. An optional 'hold' tap saves it for later (opt out, not opt in). Frame per-object Novas as one rule: 'Supernova = your object, super-sized'. Defer motes until Troubles ship; then at most 1 per level, only '+1 throw' or 'Wide shot', and no picker. Choose this Star Scope re-scope or ux-5's, not both."
  },
  {
   "proposalId": "core-loop-6",
   "verdict": "change",
   "reason": "Named stats answer 'stats', and re-weighting the deal fixes the rock-versus-sun imbalance. But per-kind gravity and speed (seed floaty, rock drops straight) change an aim feel kids learned by muscle memory. The aim line is short without the Aim Guide upgrade, so a floaty seed lands somewhere unexpected. The fix then needs a reachability sweep and a Full-aim-line assist.",
   "fix": "Keep the KindDef refactor, the deal re-weight and an identity card (3 icon bars plus a 3-word job) in the Field Guide and on long-press. Cut per-kind weight and speed physics: all objects fly the same. Deliver 'the heavy rock' feel through sound, haptics, trail and impact (ux-6)."
  },
  {
   "proposalId": "core-loop-7",
   "verdict": "keep",
   "reason": "'The newt stops fire' is a 6-year-old's first real strategy, and it gives the 36 creatures a job in the middle of a round. The traits only protect and never punish. The forecast arrow bouncing off a shielded creature teaches the rule without text.",
   "fix": "Make this the ONLY trait system; meta-homeworld-4 adopts it. Merge Buddy Power, meta-homeworld-3's Helper and liveops-data-9's Buddy Helper into one Helper slot. Legendaries' 'Calm' is fine, but show it as a visible aura."
  },
  {
   "proposalId": "core-loop-8",
   "verdict": "change",
   "reason": "Per-object rule-changing perks ('my magma burns weeds', 'Glacier Comet hatched after the boss') are upgrades a kid can explain, which flat life never was. Phase 0 fixes churn inflation now. But 24 perks plus 6 evolutions, each tied to Troubles, Fusions or the Nova, will show perks for systems the child has not met yet. It also conflicts with meta-homeworld-2 on location, cost and the evolution rule.",
   "fix": "Ship Phase 0 immediately. Make this the single shot-upgrade design, placed in the Homeworld as six Labs (the location from meta-homeworld-2), priced in stardust plus one Essence. A perk card shows only once its system is unlocked, so no 'Weed Burner' appears before Tanglevine is taught. Evolution hatches after the next Guardian win."
  },
  {
   "proposalId": "core-loop-9",
   "verdict": "keep",
   "reason": "Mastery that only goes up, for older kids and adults. It is cheap, precomputed, never gates anything and never says 'failed'. It gives the waiting-room adult a reason to replay a planet they have already 3-starred.",
   "fix": "On a first play, do not rescale the life bar: show the Wonder segment only once the planet is 3-starred, so a young player's star marks stay large. Fold ux-5's 'Mastery segment' into this."
  },
  {
   "proposalId": "ux-1",
   "verdict": "keep",
   "reason": "Fixes the worst first-10-minute problems:\n- a failable P1 with a gem prompt the player can't afford\n- a calendar wall that can't be dismissed\n- an OFFER badge at minute 3\n- no statement of purpose\nThe title beat, planets that can't be failed, one modal per open and no money in session 1 are exactly right for a parent and child.",
   "fix": "Its guided build must match whatever the base ships (a shot Lab, not a Stardust Mill if Mills are retired). The purpose line must be the one sentence agreed across all PMs. P5 must not also debut a reaction or Essences."
  },
  {
   "proposalId": "ux-2",
   "verdict": "change",
   "reason": "One Next Up card, 5 tabs, a real Back stack and no clipping at 320x568 cut Home from about 21 targets to 12. That is the biggest navigation win. But Collection with 5 segments (Lifebook, Field Guide, Album, Atlas, Workshop) won't fit at 320px in German. A kid-side 'Shop' tab showing the same content as today conflicts with monetization-2's price-free kid side.",
   "fix": "Collection = Lifebook, Album and Field Guide only. The Atlas stays in the Homeworld. The 5th tab becomes 'Style' (Workshop, try-on and items bought with earned stardust or gems), with USD prices only in the gated Grown-up Shop. Keep the Next Up priority function, one badge style, Next leading straight into the level, and the Playwright 320x568 gate."
  },
  {
   "proposalId": "ux-3",
   "verdict": "change",
   "reason": "A single unlocks.ts table tested to allow 'at most one intro per planet' is the best defence against complexity creep in the whole set. But its own ladder breaks the rule: Storm and the first Fusion both land on P7, and the core-loop pacing (reactions P5-P14, Nova P3, motes P8) and meta-homeworld-8 (Kit at P6) ignore it. Coach cards that auto-hide after 6 seconds are too fast for a pre-reader waiting on read-aloud.",
   "fix": "Make unlocks.ts binding for every PM: reactions, Troubles, motes, the Helper slot and Homeworld steps all register there, and CI fails on two intros on one planet. Adopt the P1-P20 ladder in 'missing'. Coach cards hide on the next tap, not on a 6-second timer."
  },
  {
   "proposalId": "ux-4",
   "verdict": "keep",
   "reason": "Teaching planets, forecasts, tappable goal recipes and a 'What happened' card on a fail (instead of 'So close' plus a gem price) are exactly what a 7-year-old needs. The fail turns into a lesson, and 'Try with a hint' is free.",
   "fix": "Drop the 'Practice' toggle. Troubles already tick only on throws, so it does nothing; if it is kept, redefine it as 'Troubles sleep on this planet'. Own the single fail/help ladder together with liveops-data-9 (hint on fail 2) and retire monetization-3's separate Hint try."
  },
  {
   "proposalId": "ux-5",
   "verdict": "change",
   "reason": "The feedback governor (at most 2 popups, 250 ms apart, dark outlines) fixes real overlaps ('Mountain' over 'Nice!'), and removing the fake xN chain is honest. The rest duplicates other proposals with different numbers: the queue is 'next 3, swap either' versus core-loop-2's 'next 2, swap next'; the Star Scope design differs from core-loop-5's; and the Mastery bar duplicates core-loop-9. Two specs for one HUD guarantees clutter.",
   "fix": "Keep the governor, the outlines, the removal of xN, the separate Lab bonus and the visible-loss copy. Hand the queue and preview card to core-loop-2, Star Scope to core-loop-5 and mastery to core-loop-9. Add a HUD budget: at most 4 overlay types drawn on the planet at once."
  },
  {
   "proposalId": "ux-6",
   "verdict": "keep",
   "reason": "Juice is cheap fun for both players. The tally is 4 seconds or less with tap-to-skip and drops to 1.5 seconds after 10 levels. Per-object sound, haptics and particles deliver object identity more safely than per-kind physics. 'Momentum paused' instead of the scolding reset is right for kids.",
   "fix": "Default the tally to 1.5 seconds after P3 and never block 'Next'. Every cue must also read with sound off."
  },
  {
   "proposalId": "ux-7",
   "verdict": "keep",
   "reason": "One 'While you were away' card with one Collect button, at most one bundled notification per day with no streak words, and a warm-up planet for lapsed players. It removes up to 3 blocking modals and gets a returning adult to a throw in 3 taps.",
   "fix": "Its Collect all must include every passive producer, free for everyone; do not let monetization-8 sell this."
  },
  {
   "proposalId": "ux-8",
   "verdict": "keep",
   "reason": "No gem prompt on P1-10 or after a win, booster tiles that explain themselves before spending, preview before every price, a stronger gate and receipts. Kids never get asked for money at a sad moment, and nothing is spent by accident.",
   "fix": "Make its continue rule the canonical one: never on P1-10, never after a win, only from the 2nd consecutive fail, as a ghost button. Adopt one gate v2 shared with monetization-2."
  },
  {
   "proposalId": "ux-9",
   "verdict": "keep",
   "reason": "The Clear palette, biome markers, text size, read-aloud and assists directly help a 6-year-old non-reader and the roughly 1 in 12 boys who are colour-blind. The new hazard and reaction states would otherwise be colour-only.",
   "fix": "Biome markers on by default only in Clear mode, to avoid rim clutter for everyone else. Read-aloud is offered on the first coach card so parents discover it."
  },
  {
   "proposalId": "ux-10",
   "verdict": "change",
   "reason": "A purpose on entry, one number and 'For your next throw' on every building card are the best Homeworld clarity ideas in the set. But it names a Stardust Mill as the first build (Mills are retired in meta-homeworld-1), defines a Base Level formula that differs from meta-homeworld-8's Dock level, and says 'a planet win repairs' while meta-homeworld-6 charges Essences.",
   "fix": "Align with the other proposals: the first build is the first shot Lab, there is one Homeworld Level, and nothing ever needs repair (see meta-homeworld-6). Keep the 'For your next throw' line, the overview panel and the merged Collect."
  },
  {
   "proposalId": "liveops-data-1",
   "verdict": "keep",
   "reason": "Players never see it and nothing leaves the device. The parent-gated Family Summary (rounds, minutes, purchases) and the opt-in 'suggest a break' are things parents value. It is the only way to learn where real kids quit.",
   "fix": "Merge monetization-7 into this: one storage key and one Balance Report."
  },
  {
   "proposalId": "liveops-data-2",
   "verdict": "keep",
   "reason": "Physics-faithful bots are needed before any hazard or combo ships, or walls like L24 multiply. The 'no surprise loss' metric protects kids.",
   "fix": "Add a policy with every layer on (reactions, Troubles, Helper, Nova hold) and report median round seconds; fail CI above 100 seconds at P21-60."
  },
  {
   "proposalId": "liveops-data-3",
   "verdict": "keep",
   "reason": "The free-player-fairness and pay-advantage bands turn 'kids can earn everything' into a test. The frost band fixes the Atlas wall without adding a Refinery.",
   "fix": "Add a band: a free player's gem income per active day must not fall below today's unless gem packs are kept, so the meta PMs cannot quietly make the game stingier."
  },
  {
   "proposalId": "liveops-data-4",
   "verdict": "keep",
   "reason": "L24 is a Normal planet that decent bots fail 88% of the time and casual bots 98%. There are casual walls at L14, L19 and elsewhere, and a chapter-2 cliff (casual fail goes from 31% to 51%). These are real walls a kid meets today, and re-salting fixes them without new systems. This should ship before any new mechanic.",
   "fix": "Priority: the first release. Re-salt L24, L36, L47 and the casual walls, and pre-flight every Daily Planet."
  },
  {
   "proposalId": "liveops-data-5",
   "verdict": "keep",
   "reason": "It turns the owner's non-negotiables into failing tests. That protects kids release after release.",
   "fix": "Add a complexity lint: at most 1 intro per planet in unlocks.ts, a glossary test that bans duplicate player-facing names (Glow, Workshop, Scorch, Clean Sweep, Meteor), and a HUD overlay-count check in the Playwright journeys."
  },
  {
   "proposalId": "liveops-data-6",
   "verdict": "change",
   "reason": "Normalising event tiers matters: Frost Week takes 67 levels and Critter takes 3. Clock tests, hemisphere-aware themes and new festival keepsakes in year 2 are good. But it grows the daily layer (quests, Daily Planet, stamp and an order board) and adds a season track beside Star Road, the Weekly Event, Voyage and Festival. That is five cadences for a 7-year-old to track and a checklist for the busy adult.",
   "fix": "Use the Almanac to make things fewer: at most one weekly and one monthly headline visible. Commissions replace quests. Weekly Event tokens feed the season track instead of a separate ladder. Keep the normalisation, runway, clock tests and In-App Events."
  },
  {
   "proposalId": "liveops-data-7",
   "verdict": "change",
   "reason": "Numeric ship gates with a stop rule are right. But every T2 gate uses adult testers, and nothing gates on whether a child understands a milestone, which is the claim every core and meta proposal makes ('a 6-year-old can read it by colour and icon').",
   "fix": "Add T0 gates from supervised kid playtests to M1-M5. Examples: in M1, 5 of 5 kids finish the first 10 minutes without adult help. In M2 and M3, 4 of 5 kids can name what a reaction or Trouble did. Also add a concept-count gate: no more than about 12 player-facing nouns by P20."
  },
  {
   "proposalId": "liveops-data-8",
   "verdict": "keep",
   "reason": "Journey bots at 320x568 in 6 languages catch the clipping kids hit on old SEs. The Ask-to-Buy, Screen Time and save-golden tests stop lost purchases and lost progress.",
   "fix": "Make kid playtests mandatory per milestone, not optional. Add a J7 journey: background the app mid-round and resume."
  },
  {
   "proposalId": "liveops-data-9",
   "verdict": "keep",
   "reason": "The right help ladder: it is free, deterministic and never sold, and the characters help instead of a price tag. It answers the problem that no planet should take a casual player 50 attempts.",
   "fix": "Make this THE ladder: fail 1 shows 'What happened' (ux-4); fail 2 gives a hint (recipe or 'Show me where'); fail 3 gives +2 throws from the Helper; fail 5 gives a guided throw. The +2 throws come from the same Helper character as core-loop-7 and meta-homeworld-3."
  },
  {
   "proposalId": "monetization-1",
   "verdict": "keep",
   "reason": "Money buys looks only, and kids never buy a currency. That removes the most confusing money pattern for a child: gems bought with real money and spent at a fail, plus 'grab a pack' toasts. Parents get itemised, Family-Shared products.",
   "fix": "If this is adopted, the meta PMs must stop cutting free gem faucets 'to make packs worth buying'. The 'Ways to earn gems' sheet opens only when tapped, never automatically at a fail."
  },
  {
   "proposalId": "monetization-2",
   "verdict": "change",
   "reason": "The Grown-up Shop, a gate that is hard to guess, a spend cap, purchase history and Family Sharing are great for parents. But 'Ask a grown-up' creates a shareable card that prompts a child to get a parent to buy a paid item. That is a direct exhortation to children, which EU UCPD Annex I No. 28 bans, and it is the pester-power pattern this charter should reject.",
   "fix": "Cut the 'Ask a grown-up' card and its share. Wishlist hearts are visible only in the Parent Corner. Use one gate v2 shared with ux-8."
  },
  {
   "proposalId": "monetization-3",
   "verdict": "keep",
   "reason": "The purchase-motivation map and the test that every hazard planet can be 3-starred with base rules, no boosters and no continues are the fairness guarantee for a non-paying kid.",
   "fix": "Take continue rules from ux-8 (none on P1-10) and hints from the single liveops-data-9 ladder, and drop its own Hint-try and flat-50 variants."
  },
  {
   "proposalId": "monetization-4",
   "verdict": "change",
   "reason": "A cheap cosmetic season with a free lane, an Archive and no countdown is kid-safe. But it adds a second progress track beside Star Road and a points currency named 'Glow', which collides with core-loop-3's reaction Glow. 'Pick one active track (the current season or an archived one)' is a management choice kids don't need.",
   "fix": "Rename the points, for example 'Season stars'. Points fill the current season first and then the oldest unfinished archived track automatically, with no picker. Show the Season and Star Road as one screen with one progress bar."
  },
  {
   "proposalId": "monetization-5",
   "verdict": "change",
   "reason": "Cosmetics are the right kid-safe revenue. Stardust-priced looks finally give stardust self-expression, and the readability rule is excellent. But shot skins change the projectile body, and that body is how a 7-year-old tells rock from ice while aiming. It also duplicates meta-homeworld-9's themes.",
   "fix": "Add to the readability CI: shot skins must keep the object's element colour, silhouette and emoji badge; only the trail and burst restyle freely. Merge meta-homeworld-9 into this line with one price per item."
  },
  {
   "proposalId": "monetization-6",
   "verdict": "change",
   "reason": "The three-rung parent-facing ladder and the 'never here' placement map are good. But kid-facing 'new look' cards at celebration moments (after the chapter-1 chest, after the first Commission, at season start) are in-app ads for paid items shown to children, even without a price.",
   "fix": "Show milestone cards only in the Grown-up Shop or Parent Corner 'What's new'. The kid side gets only a passive 'New' dot on the Style tab, once per release."
  },
  {
   "proposalId": "monetization-7",
   "verdict": "change",
   "reason": "Measurement is needed, but this is a second ledger (Profile.ledger) duplicating liveops-data-1's pp.ledger with a different storage key and a second Balance Report.",
   "fix": "Merge into liveops-data-1: add its funnel, offer-impression and wishlist fields to the one ledger and the one report. Keep the per-territory price tests."
  },
  {
   "proposalId": "monetization-8",
   "verdict": "change",
   "reason": "A parent subscription for cosmetic drops doesn't hurt play, but it is one more system. Its 'Collect all that also gathers Homeworld producers' perk sells a convenience that ux-2, ux-7, ux-10 and meta-homeworld-1 give everyone for free.",
   "fix": "Drop the Collect-all perk; Collect all stays free for everyone. Keep it at P2, launching only after two seasons and the Collector's Edition have shipped on time."
  }
 ],
 "missing": [
  "A single cross-PM onboarding ladder for P1-P20 with one new thing per planet (today's plan stacks 2-4 per planet). Proposed:\n- P1 fling and life bar (can't fail)\n- P2 Seed and swap\n- P3 landing card and wander-off\n- P4 Magma\n- P5 Homeworld: build 1 Lab and invite 1 creature\n- P6 tappable goals\n- P7 Storm\n- P8 Steam, the first Fusion\n- P9 Nova hold (optional)\n- P10 Guardian with no meteors\n- P11 Sun\n- P12 Rain Garden\n- P14 Ember Vent and creature traits\n- P15 Hard\n- P16 Bloom\n- P18 Helper slot\n- P19 Super Hard\n- P20 or later: the first Clash\nThe ladder is enforced by unlocks.ts in CI.",
  "A complexity budget and one glossary. No proposal counts the nouns a child must learn. Name collisions to fix:\n- Glow (reaction ring vs season points)\n- Workshop (cosmetics screen vs shot buildings)\n- Scorch (reaction vs Homeworld adjacency clash)\n- Clean Sweep (Storm Nova vs Storm Lab perk)\n- Meteor (Trouble, Front, Meteor Watch, Meteor Cluster and the existing Meteor Finale)\n- Bloom (old Lab perk vs new reaction)\nThere are also three hazard vocabularies and two trait sets. Cap: about 12 player-facing nouns by P20.",
  "A retire and merge list. The game already has about 20 meta systems. The proposals add about 12 (Seasons, Club, Commissions, Kit, Fronts, Meteor Watch, shot Labs, Refinery, Orbit, Monuments, Wonder, Field Guide, Wishlist) and retire only Mills, Charm, Piggy and gem packs. Proposed merges:\n- Commissions replace daily quests\n- Weekly Event tokens feed the season track\n- Explorer Rank folds into Star Road or the Homeworld Level\n- the calendar becomes a chip\n- the Sticker Album goes inside the Lifebook\n- the Star Atlas becomes the Essence-spend screen in the Homeworld\nThe net system count should go down, not up.",
  "An integrated round-time and HUD test with every layer on at once:\n- queue and landing card\n- Glow rings and footprint outline\n- ghosts and trait badges\n- biome markers\n- Trouble sources and forecast arrows and strip\n- motes, moons and Guardian\n- Nova state, Helper chip and goal chips\nRun it on real devices at 320x568, P30 and P45 Super Hard. Target: a median round of 90 seconds or less (120 including the tally) and at most about 4 overlay types on the planet. Each PM measured only its own layer.",
  "Waiting-room interruption. When the app is backgrounded (app.ts only saves the profile on pause) and iOS purges the WebView, a half-played round is lost. Auto-pause on background and snapshot RoundState (cheap once core-loop-1 exists) so the round resumes exactly where it was. This matters more once rounds carry Nova holds, Troubles and a Helper.",
  "Sound-off parity. Waiting rooms are muted, but core-loop-3 teaches reactions partly with a unique sound, and ux-9 uses audio cues. Every reaction, Trouble tick and creature leaving must be fully readable with sound off (icon, shape and banner), plus haptics.",
  "A parent-set 'Gentle planets' option for the campaign (in Settings next to the ux-9 assists): Troubles don't tick and Clashes don't fire, stars count normally, and there is no marker. Zen has no progression, and some 6-year-olds will find spreading hazards stressful.",
  "Mandatory supervised kid playtests (parent present, paper notes) of the first 10 minutes, the first Fusion planet and the first Trouble planet before each milestone ships. Every proposal claims 'a 6-year-old can read it', and none of those claims has been tested.",
  "An explicit minimum slice and defer list. Every PM ships its full vision, adding up to about 20 L and M items for a small team. Suggested v1:\n- liveops-data-4 wall fixes, ux-1, ux-7, ux-8, the ux-2 Next Up and tabs\n- core-loop-1 and core-loop-2\n- 4 Fusions and 1 Clash, 2 Troubles\n- traits plus one Helper\n- shot Labs in the Homeworld plus Essences\n- the Meteor Watch bonus round\n- monetization-1, 2 and 3\nDefer the rest.",
  "A check that the game does not get stingier. Several proposals remove free gems or rewards (Grove, friendship, expedition, x2) and add sinks (repairs, a Refinery cap, Essence-priced levels), but nobody reports a free kid's rewards per round before and after. Add this as a liveops-data-3 band.",
  "Whether profile migration matters at all. No in-app purchases exist in App Store Connect yet, so the app may be pre-launch. If there are only testers, drop the heavy PROFILE_VERSION 4 mapping (Mills to Workshops, Lab to Workshop, shelves) and ship the simpler design clean.",
  "One agreed purpose sentence. Four different ones exist:\n- ux-1: 'Grow tiny planets · Welcome creatures · Build your Homeworld'\n- meta-homeworld-1: 'Grow lands to earn Essences...'\n- ux thesis: 'I make homes for creatures, and they help me'\n- monetization thesis: 'grow worlds that are visibly your own'\nPick one line that a 7-year-old can repeat."
 ],
 "conflicts": [
  "Shot upgrades: core-loop-8 is a linear Lv2-5 ladder on a Lab screen at 400/1200/3000/7000 stardust, with evolution after the next Guardian. meta-homeworld-2 is Homeworld Workshops with Reach/Power/Echo paths, a 3-1-0 cap, respec, 300-6,000 stardust plus Essence pairs, and a Master resident plus a Guardian win for evolution. monetization-3, monetization-5 and liveops-data-7 M4 assume paths exist, but core-loop never proposed them.",
  "Traits: core-loop-7 has 4 biome traits (Fireproof, Frostproof, Deep Roots, Swimmer, plus Calm). meta-homeworld-4 has 5 Essence-family traits (Sturdy, Fire-proof, Rain-maker, Frost-proof, Rooted). Tide Otter is Swimmer in one and leaf/Rooted in the other.",
  "Hazard vocabulary: core-loop-4 has Ember Vent, Frost Creep, Tanglevine and Meteor. meta-homeworld-3/4, ux-4 and monetization-3 use Wildfire, Deep Freeze and Dust Drift. meta-homeworld-6 Fronts are Meteor Shower, Blight, Frostbite and Heat Wave.",
  "In-level Buddy: core-loop-7 Buddy Power (once-per-level trait effect) vs meta-homeworld-3 Helper (replaces the Buddy, 1-4 Kit slots) vs liveops-data-9 Buddy Helper (+2 throws after 3 fails).",
  "Fail and help ladder:\n- ux-4: 'What happened' plus a hint retry on the first fail\n- liveops-data-9: tip after 2 fails, +2 throws after 3, guided throw after 5; continue secondary from fail 1\n- monetization-3: Hint try with a Goal Compass after fail 2\n- ux-8: continue only from the 2nd consecutive fail",
  "Continue rules: ux-1 and ux-8 say never on P1-10 and never after a win, at 40/70/110. monetization-3 says a flat 50 gems, at most 2, none on P1-3. monetization-6 and liveops-data-5 say none on P1-3.",
  "Gem packs: monetization-1 retires all gem packs and the piggy bank. meta-homeworld-1, 4 and 7 cut free gems specifically 'to make gem packs worth buying'. meta-homeworld-9 prices themes at '$2.99 or 360 gems'.",
  "Collect all: monetization-8 sells a Homeworld-inclusive Collect all as a Club perk, while ux-2, ux-7, ux-10 and meta-homeworld-1 make it free for everyone.",
  "Onboarding pacing:\n- core-loop-3: Steam at P5, Firemount P6, Glacier P8, Rain Garden P9, Flood P10, Bloom P12, Rainbow P13, Scorch P14\n- core-loop-4: Ember Vent at P14 plus a Meteor on the P10 boss, despite its own 'none on 1-13'\n- core-loop-5: Nova at P3, motes at P8\n- ux-3: Homeworld P5, goals and Momentum P6, Storm and first Fusion P7, Nova choice P9, first hazard P13\n- ux-4: Steam at P7, Wildfire at P13\n- meta-homeworld-8: 4-step Homeworld card at P5 including a Kit launch at P6",
  "First Homeworld build: ux-1 and ux-10 guide a Stardust Mill build, meta-homeworld-1 retires Mills, and meta-homeworld-8 builds a free first Workshop.",
  "Materials on results: ux-1 hides them until the Atlas unlocks at P12, and ux-2 shows them only in the Atlas. meta-homeworld-1 makes Essences the headline results reward from P5 and shows them on the pre-level Kit.",
  "Homeworld number: meta-homeworld-8 uses the Star Dock level with a 4-part checklist. ux-10 computes a Base Level from rings, buildings and residents. monetization-3 refers to 'Radiance'.",
  "Base damage: meta-homeworld-6 has Dimmed buildings repaired with 5-20 Essences, while ux-10 says 'a planet win repairs it'.",
  "Queue and preview: core-loop-2 shows current plus next 2 and swaps with next only. ux-5 shows current plus next 3 and swaps with either of the next two.",
  "Star Scope re-scope: core-loop-5 shows 5 upcoming objects plus Fusion outlines. ux-5 shows a 2-step preview of the next object.",
  "Mastery: core-loop-9's Wonder par duplicates ux-5's 'Mastery segment'.",
  "Pre-level sheet: meta-homeworld-3 adds a Kit row to the sheet, while ux-2 E removes the sheet step (an info overlay dismissed by the first fling).",
  "Remix: core-loop-4 ticks Troubles every 2nd throw on Remix and adds them to its twist deck, while REMIX.md specifies exactly one twist and the classic rules the solver models, with no stacked penalties.",
  "Name collisions: 'Glow' is both core-loop-3's reaction ring and monetization-4's season points. 'Workshop' is both the existing cosmetics screen (ux-2, monetization-5) and meta-homeworld-2's shot buildings. 'Scorch' is both a core-loop-3 Clash and a meta-homeworld-5 adjacency clash. 'Clean Sweep' is both core-loop-5's Storm Nova and core-loop-8's Storm Lab perk.",
  "Ledgers: liveops-data-1 uses a separate 'pp.ledger' key and Balance Report, while monetization-7 stores Profile.ledger inside the save with its own Balance Report.",
  "Parental gate v2: ux-8 uses a 3-digit number in words, a hold and a 30-second cooldown. monetization-2 uses 21-99 in words and a 1.5-second hold.",
  "Homeworld Themes: meta-homeworld-9 has 5 themes (Coral Reef and others) at USD or gems, while monetization-5 has 3 themes (Tidepool and others) in USD only.",
  "Kid-facing offers: monetization-6 shows 'new look' try-on cards to kids at milestones, while ux-2 C says Next Up never shows an offer and allows no OFFER badge.",
  "Seasons: monetization-4 runs 8-week seasons, 6.5 a year, and rejects a separate Homeworld pass. liveops-data-6 runs 8-10 week seasons, about 5 a year. meta-homeworld-9 adds a Homeworld lane inside the season.",
  "Daily boards: meta-homeworld-8 Commissions (3 cards, one free swap) sit on top of the existing 3 daily quests, and liveops-data-6 adds an order board to the daily layer as well.",
  "Evolution trigger: core-loop-8 hatches on the next Guardian after Lv5. meta-homeworld-2 needs Lv5, a Master resident seen 5+ times working there, and a Guardian win."
 ]
}
```

## critic:kid-safety

```json
{
 "lens": "Kid-safety and Apple compliance critic. I checked all 45 proposals against the owner's non-negotiables (no gambling, no random or paid power, fixed-price previewable items, parental gate, no ads, no pay-to-skip or energy timers, 5 locales, rounds of 1-2 minutes). I also checked them against Apple 1.3, 3.1.1 and 3.1.2, Apple 5.1.4, the 2025 age-rating questionnaire, COPPA as amended in 2025, the UK Children's Code (nudges, detrimental use, transparency), EU UCPD Annex I No. 28 and the CPC/IMCO currency direction, and the FTC/ACM Epic precedents. I verified claims against the code.\n\nFour facts in the code change several verdicts:\n(1) Sharing has no parental gate. share.ts, postcard.ts:89 and modes.ts:144/189 call Share.share directly, so the 'existing parent-gated share' cited by meta-homeworld-7 and core-loop-9 does not exist.\n(2) The child is shown system prompts. app.ts:153 auto-starts Game Center sign-in at launch, platform.ts asks the child for notification permission, and maybeAskReview fires the rating prompt with no gate.\n(3) Free content already shows ticking countdowns: '{d}d {h}h left' on the Event (event.ts:15) and Voyage (voyage.ts:68), and 'N days left' on Festival (festival.ts:72).\n(4) Visitors hand out random gems (25% chance) and mementos (18%) in a one-at-a-time reveal tied to time away (visitors.ts).\n\nOverall, the monetization PM's charter (gems earned only; real money buys only direct-priced cosmetics) is the compliant backbone. Most other money-related findings come from proposals that still assume gem packs are sold.",
 "verdicts": [
  {
   "proposalId": "meta-homeworld-1",
   "verdict": "change",
   "reason": "Power stays unbuyable (Essences are earned only), which is good. But the revenue case rests on cutting free gem faucets 'so gem packs are worth buying'. Starving the free currency to push a paid one is pay pressure: liveops-data-3 forbids it, and it contradicts monetization-1, which retires gem packs. The claim that counters drop '10 to 4' is misleading. There are 5 Essences plus stardust, gems and Hearts, which makes 8, and other proposals add Blueprints, star ore, Glow and event tokens. That is confusing-currency risk for a 6+ audience.",
   "fix": "Adopt monetization-1: gems are earned only and gem packs are retired. Delete every 'makes gem packs worth buying' rationale. Cut gem faucets only as far as liveops-data-3's free-player-fairness band allows. Show Essences as one pouch with 5 colours in a single pill, fold 'star ore' into stone and ember, and make Blueprints unlockable items rather than a counter. Show the Refinery cap as capacity ('3 of 12 left'), not as a clock."
  },
  {
   "proposalId": "meta-homeworld-2",
   "verdict": "keep",
   "reason": "Power is earned by play and never sold. Build timers can't be skipped with money, respec is free and unlimited, Lab levels migrate 1:1, the evolution recipe is fully shown with no randomness, and competitive modes are excluded.",
   "fix": "No push notification when a build finishes, and show build completion as a plain clock time ('Ready at 14:30'). Sell evolution and path skins at one price each (USD non-consumable OR earned gems, not both; see monetization-5). The power-band conflict is listed under conflicts."
  },
  {
   "proposalId": "meta-homeworld-3",
   "verdict": "keep",
   "reason": "Kit items are free, reusable and deterministic. An empty Kit is never punished, the default auto-fills, and there is no sales prompt on the sheet.",
   "fix": "The same pre-level sheet also holds boosters, so it must use ux-8's booster rule (the first tap never spends) and hold no gem or USD booster purchase. When the Helper replaces the Buddy on screen, draw any Buddy or resident outfit the family bought on the Helper, so paid looks are not hidden."
  },
  {
   "proposalId": "meta-homeworld-4",
   "verdict": "change",
   "reason": "The spec says the Hearts cap of '5 per resident per day, so it builds a habit', plus a daily greeting Heart per resident. That designs a daily check-in habit for children, which the UK Children's Code nudge and detrimental-use guidance warns against. With up to 36 residents it becomes a daily chore. The revenue case again leans on removing about 2.5k free gems 'to give gem packs value'. Its trait set also differs from core-loop-7's.",
   "fix": "Earn Hearts from play (levels won with that resident as Helper, Commissions, building collects), not from a daily greeting. Replace the per-day cap with a per-collect or per-level cap, with no 'come back tomorrow' copy. Remove 'builds a habit' from the goal and the metrics, and drop the gem-pack rationale. Adopt one trait taxonomy shared with core-loop-7."
  },
  {
   "proposalId": "meta-homeworld-5",
   "verdict": "keep",
   "reason": "Clashes only halve output. Every effect is previewed before placing, moving is free and instant, and Store means a layout can never lock a child out. It is a fair, visible negative interaction.",
   "fix": "Keep in-base clash labels gentle and non-injury ('a bit warm', 'a bit chilly') and show every % as an integer, as specified. No other change."
  },
  {
   "proposalId": "meta-homeworld-6",
   "verdict": "change",
   "reason": "Four problems. (a) Threats scheduled by real date every other day, plus a 'A front is coming tomorrow' notification, form a Clash-style appointment and loss-aversion loop that pulls a child back to defend, which is a nudge the Children's Code discourages. (b) Repair can deadlock: a Heat Wave dims the Ice Well, and repair costs frost, the scarcest Essence, whose production is now paused. (c) The names 'Frostbite', 'Blight' and 'Heat Wave' are injury and disaster words. (d) It contradicts ux-10's safer 'a win repairs it'.",
   "fix": "Trigger fronts by play count ('arrives in 2 planets'), never by calendar, and send no front notification. An uncovered building becomes 'Dusty' and is repaired free with one tap or by the next planet win, never with Essences. Keep 'Held!' as a bonus-only reward. Rename fronts gently (Meteor Shower, Grey Fog, Cold Snap, Hot Spell). Meteor Watch stays optional, and its rewards must not exceed what Wards give passively, so skipping it is never punished."
  },
  {
   "proposalId": "meta-homeworld-7",
   "verdict": "change",
   "reason": "Routes are deterministic, loot is previewed, there is no failure state and no money can shorten timers, all good. But it cites 'the existing parent-gated share', and postcard.ts:89 calls Share.share with no gate (Apple 1.3 treats sharing as a link out). The revenue case again removes gem faucets 'raising the value of gem packs'.",
   "fix": "Add parentalGate() before every Share.share and navigator.share call (postcards, Daily result, Challenge code), with a CI test. Drop the gem-pack rationale. Send no separate 'expedition returned' notification; fold it into ux-7's single parent-enabled notice."
  },
  {
   "proposalId": "meta-homeworld-8",
   "verdict": "change",
   "reason": "(a) A new Game Center leaderboard for Homeworld Level shows children other players' public Game Center nicknames, which is unmoderated text; store/listing.md claims 'no user-generated content'. It also ranks a number driven mostly by time spent. (b) An opt-in daily Homeworld notification adds a return nudge. (c) 'All 3 in a day add a Blueprint' is a same-day completion bonus. (d) The Lv5 feat 'Clear a Super Hard planet' walls young players out of a Homeworld tier and the Workshop cap.",
   "fix": "Drop the leaderboard and keep the 6 achievements. Send no Homeworld notification (use ux-7's single bundled, parent-enabled one). Pay the Blueprint for any 3 completed cards, with no same-day condition. Give every Signature Feat an alternative route of equal effort (for example, '…or 3-star 5 Hard planets')."
  },
  {
   "proposalId": "meta-homeworld-9",
   "verdict": "change",
   "reason": "(a) '$2.99 or 360 gems' breaks the one-item-one-price rule (monetization-1 and -5), and if gems stay purchasable it launders real money through a currency. (b) 'Preview repaints for 30 seconds' is a timed trial that snaps back, which is countdown pressure. (c) 'Past-season items return later' means they are unavailable for a while, which is scarcity or FOMO, against monetization-4's always-on Archive. (d) The revenue math relies on 'gem packs have something to buy'.",
   "fix": "Sell Themes and Outfit sets as USD non-consumables only, in the gated Grown-up Shop. The free path is stardust or earned-gem singles plus one free sampler per theme (monetization-5). Try-on lasts until the child taps Done, with no timer and never next to Buy. All past items stay on sale at the same price (Archive). Merge the Homeworld lane into the single season product at one price."
  },
  {
   "proposalId": "core-loop-1",
   "verdict": "keep",
   "reason": "It enforces by test that 1 star is reachable the 'old way'. Everything is deterministic from the seed, there are no timers or lives, and ledger fields stay on the device.",
   "fix": "No change. Write the per-level fields into liveops-data-1's single ledger store rather than a second store."
  },
  {
   "proposalId": "core-loop-2",
   "verdict": "keep",
   "reason": "Losses are shown before the throw and framed as 'wandered off / came back'. Chips are icon plus shape for pre-readers and colour-blind players. Nothing is sold at the moment of loss.",
   "fix": "No change. Keep the ghost and thought-bubble art neutral, never sad or pleading (REMIX.md pitfalls)."
  },
  {
   "proposalId": "core-loop-3",
   "verdict": "keep",
   "reason": "Reactions are deterministic and identical for everyone, and Clashes are previewed in red. Names are the game's own, rewards are free, and only FX cosmetics are sold.",
   "fix": "FX palettes must keep each pair's element colour key and never recolour chips or preview text (monetization-5 readability CI). Give each FX item one price (USD set OR earned gems). Keep 'drown' out of player-facing Flood copy ('forests turn to marsh')."
  },
  {
   "proposalId": "core-loop-4",
   "verdict": "keep",
   "reason": "Every Trouble is telegraphed with a forecast and a counter. Nothing is sold, creatures only wander off, the 1-star floor is tested, and there are no Troubles on planets 1-13, the tutorial or Zen. Its names (Ember Vent, Frost Creep, Tanglevine) are the gentlest of the three PM rosters.",
   "fix": "Make its roster and names canonical for every PM (see conflicts). Pair Hard and Super Hard Trouble planets with liveops-data-9's free assist ladder, so a 25-45% decent-player fail band never becomes a wall for casual 6-year-olds. On a Trouble fail, show 'What happened' (ux-4) before anything else."
  },
  {
   "proposalId": "core-loop-5",
   "verdict": "change",
   "reason": "'Boosters stay fixed-price behind the parental gate' keeps real money reaching boosters. Comet Shower is +3 throws, and the re-scoped Star Scope sells information (fusion sectors and 5 upcoming objects). That is pay-to-progress and pay-for-information, which monetization-1's never-sold list and the EU IMCO direction reject. The Starter Pack's 15 boosters are the live example.",
   "fix": "Boosters are earned only (stardust, earned gems, Greenhouse, Momentum, chests), and no USD product grants a booster. Star Scope's fusion outlines also appear free through the stuck ladder (liveops-data-9) and the Field Guide. Keep Nova 2.0 and Star Motes unchanged: they are visible, labelled and never sold."
  },
  {
   "proposalId": "core-loop-6",
   "verdict": "keep",
   "reason": "Stats are never sold, flight differences are small and previewed on the aim line, a reachability test guarantees every sector stays hittable, and skins are visual only.",
   "fix": "Skins may not change the projectile's silhouette size or trail visibility in a way that affects aim reading (add this to the readability CI). One price per skin."
  },
  {
   "proposalId": "core-loop-7",
   "verdict": "keep",
   "reason": "Traits only protect and never punish. The Buddy suggestion has no purchase in the flow, Buddy Power is off in competitive modes, and outfits are visual only.",
   "fix": "Merge the trait set with meta-homeworld-4 and decide Buddy Power versus Kit Helper (see conflicts). Price Buddy outfits once each."
  },
  {
   "proposalId": "core-loop-8",
   "verdict": "keep",
   "reason": "Power is bought with earned stardust only, evolutions are never sold, levels migrate, stars never drop, and there is a CI bound of at most +15pp.",
   "fix": "The migration letter says plainly that perks were changed, not taken. Confirm before launch that no real-money product (the Cosmic Pass's 13,500 stardust) has funded Lab power (monetization-1 removes it). One price per evolution skin. Reconcile with meta-homeworld-2 (conflicts)."
  },
  {
   "proposalId": "core-loop-9",
   "verdict": "change",
   "reason": "It suggests selling 'ring styles for Wonder planets', which puts bought decoration on an earned mastery marker. That blurs earned and paid status, which monetization-1's never-sold list and REMIX.md forbid. Mentioning Wonder on results when a player is 'within 10%' is a near-miss nudge. It also relies on a share gate that does not exist.",
   "fix": "Wonder rings and any ring style are earned only. Results mention Wonder only when it is reached. Gate the share card (see meta-homeworld-7)."
  },
  {
   "proposalId": "ux-1",
   "verdict": "keep",
   "reason": "It removes the first-failure gem prompt (the 'you have 33' case), the non-dismissable calendar and all offers from session 1, and it adds the launch-modal governor.",
   "fix": "Add the other system prompts to the governor. Game Center sign-in (app.ts:153 auto-starts it at launch) and the notification permission ask must not appear in session 1, and should wait until a grown-up opts in or a Game Center surface is opened. The guided first build becomes a Workshop if meta-homeworld-1 retires Mills."
  },
  {
   "proposalId": "ux-2",
   "verdict": "change",
   "reason": "It keeps a child-facing 'Shop' bottom tab with 'same content as today', meaning USD prices and Buy buttons in the child's main navigation. Apple 1.3 limits purchase opportunities to a designated area behind a parental gate, and this also conflicts with monetization-2.",
   "fix": "Rename the tab 'Styles' and show only stardust and earned-gem items, with try-on. The real-money catalogue lives only in the gated Grown-up Shop, reached from Settings and from a small gated link in Styles. Missions shows the season premium row with no price. Show 'Ready in 2h 10m' as a plain clock time. Keep the badge policy and the ban on offers in Next Up."
  },
  {
   "proposalId": "ux-3",
   "verdict": "keep",
   "reason": "It paces concepts one at a time, never teaches by showing a price, delays Starter until after chapter 1, and adds read-aloud.",
   "fix": "The ladder step for the Starter Pack only makes it available in the Grown-up Shop; it shows no kid-facing card (see monetization-6)."
  },
  {
   "proposalId": "ux-4",
   "verdict": "keep",
   "reason": "It adds teaching planets, forecasts for every threat, a factual 'What happened' in place of 'So close', and a free hint retry. This is the kid-safe replacement for failure-moment selling.",
   "fix": "No change. Use core-loop-4's gentle hazard names ('Wildfire' becomes 'Ember Vent')."
  },
  {
   "proposalId": "ux-5",
   "verdict": "keep",
   "reason": "It shows losses before they happen, adds a feedback governor, and puts no monetization in the HUD.",
   "fix": "Any extra preview depth (queue length, Star Scope 2-step) must be reachable without real money (see core-loop-5)."
  },
  {
   "proposalId": "ux-6",
   "verdict": "keep",
   "reason": "It explicitly rejects near-miss and loss-aversion framing, sets a photosensitivity cap, makes the tally skippable, and pauses Momentum instead of scolding.",
   "fix": "The owner should decide 'Momentum pauses, never resets' now (monetization-3(d) agrees), so ux-6's copy and the mechanic agree."
  },
  {
   "proposalId": "ux-7",
   "verdict": "change",
   "reason": "It is the right direction (one card, no gem upsell, one notification a day, no streak wording). But notification consent is still asked of the child (platform.ts askForReminders). Value-ordered 'builds done / producers full / vault full' pings and a 'Day-1 hook' teaser are re-engagement nudges aimed at children (Children's Code: high privacy by default; nudge techniques).",
   "fix": "Notifications are off by default and switched on only by a grown-up in Parent Corner, behind the gate. At most 1 a day, never 21:00-09:00, informational copy only (no rewards promised, no creatures missing you). Replace the Day-1 hook with a neutral goodbye ('See you next time!'). Add a unit test for scheduleReminders."
  },
  {
   "proposalId": "ux-8",
   "verdict": "change",
   "reason": "Gate v2, 'type a 3-digit number shown as words', can be solved by any 7-9-year-old who can read, so it is not the adult-level task Apple asks for, and the 'false pass' metric will fail with 9-11-year-olds. 'Ask before spending more than 50 gems' and the gem framing assume gems are bought. The continue rules (none on 1-10, never after a win, only from the 2nd consecutive fail) are the strictest and right.",
   "fix": "Use one gate spec, shared with monetization-2: a spelled number plus a hold, with a randomised keypad layout and a voiceover 'hand to a grown-up', plus an optional parent-set 4-digit PIN in Parent Corner. State in Parent Corner that Ask to Buy and StoreKit authentication are the real barrier. Replace the gem spend limit with a USD monthly cap. Make ux-8's continue rules canonical for every PM."
  },
  {
   "proposalId": "ux-9",
   "verdict": "keep",
   "reason": "It helps colour-blind, pre-reading and motor-impaired children, stores settings on the device, adds no shame marker for assists, and sets a photosensitivity cap.",
   "fix": "Confirm Web Speech uses on-device AVSpeechSynthesizer voices only, with nothing sent over the network. Add the new Capacitor text-zoom plugin to liveops-data-5's dependency allowlist and privacy lint."
  },
  {
   "proposalId": "ux-10",
   "verdict": "change",
   "reason": "Its safety design is the better one ('a miss only pauses, a planet win repairs'). But it justifies the base with Clash players opening the app '4 times a day' and sets a success metric that '50% of D7 players open the Homeworld at least once a day'. That makes compulsive daily opening a KPI for a 6+ audience. It also builds a Stardust Mill, which meta-homeworld-1 retires.",
   "fix": "Replace the daily-open metric with comprehension and choice metrics (for example, kids can say what one building does; share of sessions with a non-collect Homeworld action). Drop the '4 times a day' rationale. The first build is a Workshop. Make ux-10's 'win repairs' the canonical front rule."
  },
  {
   "proposalId": "liveops-data-1",
   "verdict": "change",
   "reason": "Keeping data on the device keeps 'Data Not Collected', which is correct. But: (a) the tester Balance Report code is pasted into TestFlight feedback, which is tied to the tester's Apple ID, so a child's play on a family tester's phone reaches the developer linked to an adult's identity; (b) docs/privacy.html (and its 5 translations) says nothing about a local play ledger; (c) a 90-day ring of minutes and opens per day is behavioural data kept longer than any gate needs, with no delete control (Children's Code data minimisation and transparency).",
   "fix": "Add 'Clear play history' to Parent Corner. Update privacy.html in all 6 languages to describe the local ledger and Family Summary. Shorten the day ring to 30 days or weekly aggregates. The tester export stays compiled out of App Store builds and shows an adult-consent screen ('share only your own play'). Delete received codes after each milestone review (COPPA 2025 retention policy). Merge monetization-7 into this proposal."
  },
  {
   "proposalId": "liveops-data-2",
   "verdict": "keep",
   "reason": "Internal tooling with no money and no data. It adds a 'no surprise loss' metric that protects children.",
   "fix": "No change."
  },
  {
   "proposalId": "liveops-data-3",
   "verdict": "change",
   "reason": "The health band 'Payer reaches no power milestone more than 3 days before Regular' tolerates pay-for-power. The Payer archetype buys a 500-gem pack every 2 weeks, which assumes paid currency. Both contradict the owner's rule and monetization-1.",
   "fix": "Set the pay-advantage band to 0 days: no power milestone is reachable faster by paying. The Payer archetype buys only cosmetic non-consumables. Add a 'free gem supply covers every gem sink within N days' band, so faucets are never cut to push sales."
  },
  {
   "proposalId": "liveops-data-4",
   "verdict": "keep",
   "reason": "It removes walls that push children toward continues, never lowers stored stars, and keeps the shared Daily Planet fair.",
   "fix": "If liveops-data-7's Game Center reading is cut, take the progress histogram from tester ledgers only."
  },
  {
   "proposalId": "liveops-data-5",
   "verdict": "change",
   "reason": "The kid-safe money lint checks that prices are fixed and grants deterministic, but not what is sold. Today's catalogue (gem packs that buy continues, the Starter Pack's 15 boosters, the paid build drone) would pass. There are no tests for ungated sharing, countdown strings, notification frequency or the review prompt. 'None on L1-3' contradicts ux-8's L1-10.",
   "fix": "Add monetization-1's store.test (no product grants currency, boosters, throws, drones or slots). Add a test that every Share, openUrl and requestReview path calls parentalGate first, and an all-locale scan banning countdown and urgency strings ('left', 'now', 'last chance', 'best value'). Add scheduleReminders tests (at most 1 a day, nothing 21:00-09:00) and continue tests (none on L1-10, never after a win)."
  },
  {
   "proposalId": "liveops-data-6",
   "verdict": "change",
   "reason": "It authors more dated content but keeps today's ticking countdowns on free time-limited rewards ('{d}d {h}h left' in event.ts:15 and voyage.ts:68, 'N days left' in festival.ts:72). It has no rule that reached-but-unclaimed free tiers survive the weekly reset. That is FOMO on free content aimed at children.",
   "fix": "Replace every countdown with a plain end date ('until Sunday'). When a week ends, reached tiers are mailed to the Inbox automatically. Festival keepsakes return in later editions. Keep the catch-up window and the ban on selling tokens or tiers."
  },
  {
   "proposalId": "liveops-data-7",
   "verdict": "change",
   "reason": "Evidence tier T4 (an 'owner-only dev tool reads Game Center leaderboards') is developer-side processing of other players' data. The GameKit entries it would read include player aliases, and privacy.html does not disclose it. Gate M7 allows continue purchases on L1-20 fails (ux-8 bans them on L1-10), and M7 keeps a 3-day pay-advantage allowance.",
   "fix": "Drop T4, or read only the aggregate totalPlayerCount (never player entries) and disclose it. Set the M7 counter to 0 continues on L1-10 and after wins, and the pay-advantage to 0 days."
  },
  {
   "proposalId": "liveops-data-8",
   "verdict": "keep",
   "reason": "It has an explicit Ask to Buy, Screen Time and gate test matrix, an S0 severity class for money, privacy and child-safety defects, and consent-based, supervised kid playtests that record nothing about the child.",
   "fix": "Add test cases for the share gate, the review-prompt gate, no Game Center sign-in or notification prompt in session 1, and notifications enabled only through Parent Corner. Require its playtest consent protocol for every other PM's 'kids can…' metric."
  },
  {
   "proposalId": "liveops-data-9",
   "verdict": "change",
   "reason": "The free, deterministic assist ladder is exactly right. But its first-fail sheet keeps the continue 'available but secondary', which contradicts ux-8 (no continue on L1-10, and only from the 2nd consecutive fail) and monetization-3.",
   "fix": "Adopt ux-8's continue rules on every rung. Keep 'Buddy Helper +2 throws' out of every product and every currency."
  },
  {
   "proposalId": "monetization-1",
   "verdict": "change",
   "reason": "This is the compliant backbone: gems earned only, direct-priced non-consumables, Family Sharing, a checkout charter and CI. But the 'documented fallback' (keep up to two gem packs) reopens real money reaching continues and boosters through currency, which is the exact EU CPC/IMCO exposure the proposal is meant to avoid.",
   "fix": "Remove the fallback. If the owner insists on packs, bought gems must go into a separate balance that can only buy cosmetics (never continues or boosters), with the USD price shown beside every gem price and a cloud-restorable balance. Everything else stays as written."
  },
  {
   "proposalId": "monetization-2",
   "verdict": "change",
   "reason": "The Grown-up Shop, spend cap, purchase history, Family Sharing and refund help are all good. But the 'Ask a grown-up' card is a child-initiated share that urges parents to buy a named product. That is a direct exhortation to children to persuade adults to buy, which is blacklisted under EU UCPD Annex I No. 28 (the basis of the ACM Epic fine) and UK CAP 5.9. The metric '≥20% of purchases follow a wishlist ask' confirms it is a pester-power funnel. The gate (spelled 21-99) is readable by 7-9-year-olds. Offer codes 'for creators' invite kid-influencer promotion.",
   "fix": "Cut the 'Ask a grown-up' share card and its metric. Keep a private Favourites list that a parent can view inside Parent Corner (the parent looks; the child isn't prompted to ask). Use the unified gate from ux-8 (with an optional PIN). Use offer codes only for schools and press, never influencers. Everything else stays."
  },
  {
   "proposalId": "monetization-3",
   "verdict": "change",
   "reason": "The purchase-motivation map and the paywall tests are excellent. But 'You were 92% there. Try again, it's free' keeps near-miss framing, the gambling-psychology cue that ux-4, ux-6 and ux-8 remove. The continue (flat 50, none only on planets 1-3) is looser than ux-8. The Homeworld perk cap (≤10% of target) conflicts with meta-homeworld-2's +15pp band.",
   "fix": "Replace the percentage with ux-4's factual 'What happened' lines and a free hint retry. Adopt ux-8's continue rules (flat price is fine). Pick one power bound for Workshops and Kit across PMs (see conflicts)."
  },
  {
   "proposalId": "monetization-4",
   "verdict": "keep",
   "reason": "It removes FOMO: the Archive keeps every past lane playable and buyable at the same price, dates are plain text with a CI ban on timers, there are no tier skips or currency in the paid lane, Remix and Zen are excluded, and it is family-shareable.",
   "fix": "Show Glow as track progress, not a new currency pill. Show the one-per-season 'new season' notice in Parent Corner rather than as a kid-facing card (see monetization-6). Use one season price across PMs."
  },
  {
   "proposalId": "monetization-5",
   "verdict": "keep",
   "reason": "Items are cosmetic only, with one price each, try-on before buying, a hard readability rule with a colour-blind CI check, a free sampler per theme, and stickers and festival costumes never sold.",
   "fix": "Postcards that show equipped paid looks can only be shared through the gated share. In the kid-side Styles tab, show paid items with no price and let a parent hide them entirely with a Parent Corner toggle."
  },
  {
   "proposalId": "monetization-6",
   "verdict": "change",
   "reason": "Kid-facing 'new look' cards with 'Try it on' and a heart, fired at celebration moments (chapter-1 chest, first Commission, season start), are marketing to children that exploits reward moments, and they feed the wishlist and pester loop. Framing the Explorer Bundle as '$8.98 of content' or the Collector's Edition as '≤60% of parts' becomes a savings claim, which the charter bans as 'N× the value'.",
   "fix": "Show milestone and season announcements only in Parent Corner or the Grown-up Shop ('New in the shop'), with at most one quiet 'New' dot in Styles. Product pages list contents and price only, with no savings or value comparison. Keep the banned-context list and the 7-day post-refund silence."
  },
  {
   "proposalId": "monetization-7",
   "verdict": "cut",
   "reason": "It duplicates liveops-data-1's ledger and adds a riskier production Balance Report with a Share-sheet export of a child's play data. A second ledger store doubles the privacy surface.",
   "fix": "Merge its funnel and offer-impression fields into liveops-data-1's single ledger (the export exists only in tester builds). Keep its experiment rules as a paragraph there: per-territory, going forward only, never personalised, stated in plain text."
  },
  {
   "proposalId": "monetization-8",
   "verdict": "change",
   "reason": "(a) It sells 'Collect all that also gathers Homeworld producers', a convenience ux-2, ux-7 and ux-10 give everyone free, and one that raises resource throughput (paid efficiency). (b) Monthly Club Drops dated in the binary are subscriber-only exclusives that non-members can never get, which is FOMO. (c) An auto-converting 7-day trial in a kids game is negative-option risk (FTC click-to-cancel, EU). (d) A visible Club badge and title create paid status.",
   "fix": "Remove the Collect-all perk. Past Club Drops enter the Archive and Collector's Edition for purchase later. The trial end date is shown in Parent Corner with a parent-facing reminder 2 days before it converts (or launch without a trial). No Club badge on shareable surfaces. Keep it P2, launching after two seasons."
  }
 ],
 "missing": [
  "A parental gate before every outbound action. share.ts, postcard.ts:89 and modes.ts:144/189 open the iOS share sheet with no gate (Apple 1.3 links-out rule), yet meta-homeworld-7 and core-loop-9 assume a gated share exists. Gate them and add a CI test.",
  "The App Store rating prompt (platform.ts maybeAskReview then InAppReview.requestReview) is shown to the child with no gate. Gate it, or trigger it only from Parent Corner.",
  "Game Center. app.ts:153 auto-starts Game Center sign-in (Apple's login sheet) on launch in session 1. The 4 existing leaderboards, including the daily one, show other players' public nicknames, which contradicts store/listing.md's 'no user-generated content'. Decide on a friends-only or own-rank view, defer sign-in until a Game Center surface is opened, and answer the age-rating UGC question honestly.",
  "Ticking countdowns already in free content: '{d}d {h}h left' in event.ts:15 and voyage.ts:68, and 'N days left' in festival.ts:72. Only monetization-4 bans timers, and only in the season lane. Replace them with plain dates everywhere and add an app-wide CI string ban.",
  "Notification consent is asked of the child (platform.ts askForReminders), and the gift copy says 'Keep your streak going'. Make notifications off by default and set only by a parent in Parent Corner (Children's Code: high privacy by default). meta-homeworld-6 and -8 add more notifications on top.",
  "No PM covers store and regulatory compliance. The owner needs to decide on Kids Category enrolment; the listing is Games → Casual, 4+, but several proposals design to 1.3. Re-answer Apple's 2025 age-rating questionnaire (parental controls, UGC via Game Center, loot boxes). Evaluate Declared Age Range API obligations (Apple activated Texas SB 2420 support on 4 Jun 2026) and similar state app-store age laws.",
  "Privacy documentation: update docs/privacy.html in 6 languages for the ledger, Family Summary and tester export. Write the security and retention policy the amended COPPA Rule requires (compliance date 22 Apr 2026). Do a light Children's Code DPIA, since the ICO expects one for services likely to be accessed by children.",
  "An engagement-pressure budget. Together the proposals add or keep more than 10 real-time return hooks: calendar, quests, Hearts per day, fronts every other day, 8h producer caps, expeditions, weekly event, festival, season, commissions, visitors, Dock caps. That is a lot for a waiting-room game aimed at 6+. Set a cap, a rule that no system penalises or nags about absence, and a parent-set daily break reminder (liveops-data-1 has one, default off).",
  "Visitors (visitors.ts) give random gems (25% chance) and mementos (18%), revealed one at a time after time away. They are not paid, but this is a variable-reward reveal tied to absence. Make gifts deterministic, or reveal them all at once and remove gems from them. Also replace the 🎲 icon on 'New challenge' and 'Surprise me' to honour 'no gambling themes'.",
  "One Parent Corner. ux-8's Parents page, liveops-data-1's Family Summary and monetization-2's Parent Corner are three separate parent surfaces. Merge them into one gated place holding purchases, the spend cap, notifications, break reminders, 'Clear play history', Favourites, Restore and refund help.",
  "Canonical kid-gentle copy for hazards and fronts. 'Wildfire', 'Frostbite', 'Blight', 'Heat Wave' and forests that 'drown' appear across PMs; use core-loop-4's Ember Vent, Frost Creep and Tanglevine vocabulary, reviewed in all 5 locales.",
  "If any consumable gem purchase survives: there is no cloud save, so bought gems are lost on reinstall or a new device. Either don't sell consumables or add iCloud key-value restore (first-party, stays 'Not Collected').",
  "Kid playtest consent. Many success metrics depend on playtests with children (meta-homeworld-1, core-loop-2/6/7/8, ux-2/4/10); only liveops-data-8 defines parental consent, supervision and no recording. Make that protocol mandatory for all of them."
 ],
 "conflicts": [
  "Gem packs. meta-homeworld-1, -4, -7 and -9, core-loop-5 (boosters 'fixed-price behind the gate'), ux-8 ('ask before spending more than 50 gems') and liveops-data-3 (Payer buys 500-gem packs) all assume real money buys gems. monetization-1 retires gem packs and makes gems earned only. Resolve in favour of monetization-1.",
  "Dual pricing. meta-homeworld-9 ('$2.99 or 360 gems'), core-loop-3 ('120 gems each or a $1.99 set'), core-loop-6 and core-loop-8 contradict monetization-1 and -5 (one item, one price; USD sets never priced in gems).",
  "Continue rules. ux-1 and ux-8 say never on 1-10, never after a win, only from the 2nd consecutive fail. monetization-3 says none on 1-3, flat 50, at most 2. liveops-data-5 says at most 3, none on 1-3. liveops-data-9 offers it on the first fail as secondary. liveops-data-7 tolerates continues on L1-20. Adopt ux-8 everywhere.",
  "Near-miss copy: monetization-3's 'You were 92% there' and core-loop-9's 'within 10%' against ux-4, ux-6 and ux-8, which remove 'So close' and all near-miss framing.",
  "Parental gate v2: ux-8 (3-digit number words, 30 s cooldown) versus monetization-2 (21-99 number words, 1.5 s hold, voiceover). Both are readable by children; unify them and add an optional parent PIN.",
  "Where prices live: ux-2 keeps a kid-facing Shop tab with 'same content as today', and meta-homeworld-9 previews 'before the parental gate' from the kid surface. monetization-2 and -6 put prices only in the gated Grown-up Shop.",
  "Time-limited items: meta-homeworld-9's 'past-season items return later' against monetization-4's Archive, where everything is always on sale. monetization-8's binary-dated Club Drops create subscriber-only exclusives against the same no-FOMO principle.",
  "Season structure: meta-homeworld-9 has a Homeworld lane at $4.99, 5 times a year, over 8-10 weeks. liveops-data-6 has about 20 tiers fed by stars and event tokens. monetization-4 has 8 weeks at $3.99 with Glow from wins, quests and commissions, and explicitly rejects a separate Homeworld pass.",
  "Collect all: monetization-8 sells a Homeworld Collect-all as a Club perk, while ux-2, ux-7, ux-10 and meta-homeworld-1 give it to everyone free. ux-8 also suggests turning the paid drone into a 'Collect-all queue', which is still a paid convenience.",
  "Homeworld fronts: meta-homeworld-6 uses real-date fronts every other day, a notification, and repairs that cost Essences. ux-10 uses a planet-count forecast ('in 2 planets') where a win repairs. The ux-10 version is the kid-safe one.",
  "Power bounds on meta power: meta-homeworld-2 allows maxed Workshops at most +15pp on 3-star rate, core-loop-8 caps Lab 5 at +15 points, and monetization-3 caps Homeworld perks at ≤10% of a planet's 3-star target. The Lab is redesigned twice (meta-homeworld-2's Reach/Power/Echo paths with Essence costs versus core-loop-8's per-object GUARD/FUSION+/NOVA+/EVOLUTION ladder), with different evolution gates.",
  "Pay advantage: liveops-data-3 and liveops-data-7 allow a payer to reach power milestones up to 3 days earlier; monetization-1 and -3 (and the owner) say money buys no power, so the allowance must be 0.",
  "Ledgers: liveops-data-1 (export only in tester builds, compiled out of App Store builds) versus monetization-7 (production Balance Report behind the gate with a Share-sheet export). Keep liveops-data-1.",
  "Traits and companions: meta-homeworld-4 has 5 families (Sturdy, Fire-proof, Rain-maker, Frost-proof, Rooted) and a Kit Helper that replaces the Buddy (meta-homeworld-3). core-loop-7 has 4 traits (Fireproof, Frostproof, Deep Roots, Swimmer) and a separate once-per-level Buddy Power. That is two companion-power systems with different keys.",
  "Hazard roster and names: core-loop-4 has Ember Vent, Frost Creep, Tanglevine and Meteor. meta-homeworld-3 and -4, ux-4 and monetization-3 use Wildfire, Deep Freeze and Dust Drift. meta-homeworld-6 uses Heat Wave, Frostbite, Blight and Meteor Shower.",
  "First Homeworld build: ux-1 and ux-10 say 'build a Stardust Mill', but meta-homeworld-1 retires Mills and meta-homeworld-8 builds the first Workshop.",
  "Kid-facing offers: monetization-6's milestone 'new look' cards and monetization-2's 'Ask a grown-up' wishlist card against ux-2 ('Next Up never shows an offer') and ux-8, which keep money away from the child's surfaces.",
  "Paid information: ux-5 shows the next 3 objects free, core-loop-2 shows 2, and core-loop-5's Star Scope shows 5 plus fusion sectors as a booster. If boosters can be bought, that information becomes paid; make boosters earned only."
 ]
}
```

## critic:originality

```json
{
 "lens": "ORIGINALITY. The test for every proposal: would a player who knows the hit call this a copy? Borrowing design method is fine. Copying a hit's recognisable mechanic, its structure or its name is not. The yardstick is the owner's own rule after the Lucky Pips rejection (docs/handoff/01-history.md, 07-transcript.md:237-299). Balatro's short runs, choices every minute and satisfying count-up feedback were fine to borrow. Its chips x mult, jokers, blinds and shop were not. I read all 45 proposals in full, then checked them against the research applyIdeas in evidence-full.md and the code. Four places lift a hit's signature mechanic almost word for word from those research applyIdeas: Bloons TD 6's cross-path upgrades, Vampire Survivors' catalyst-plus-boss evolutions, Pokemon GO's buddy hearts and Genshin's element auras. Two more lean on a hit's presentation or structure: the Balatro scoring tally, and Missile Command-style interception on a Homeworld that is starting to add up to Clash of Clans with planets. No proposal needs a full cut. All six can be reworked around Pocket Planet's own verb, which is changing land by flinging at a spinning, gravity-bending planet. Verdicts: 9 change, 36 keep, 0 cut.",
 "verdicts": [
  {
   "proposalId": "meta-homeworld-1",
   "verdict": "change",
   "reason": "Four currencies, Essences from grown lands and the 3:1 Refinery all come from our own terrain loop. The problem is part (a). It makes the Star Dock a central, upgradable building whose level IS the Homeworld Level. Through meta-homeworld-2 that level also caps every Workshop, and through meta-homeworld-8 it opens plots, Kit slots and front types. The game already has builder drones, timed builds (homeworld.ts:100, 30s to 4h), capped collectors and storage hours. Adding this building gives Clash of Clans' Town Hall rule almost exactly, and pushes a base the roadmap already built from Clash (ROADMAP.md:43) toward a reskin.",
   "fix": "Keep the loop sentence, Essences, Refinery and all the retirements (Mills, Grove gems, charm, x2, paid drone). The vault can become a plain Star Dock producer. No building's level should be the Homeworld Level or cap other buildings. Work out the Homeworld Level from what the player has grown: residents housed, Lifebook habitat sets done, Workshops built and Signature Feats met. This is ux-10's computed Base Level. Chapter, feats and Essences remain the gates. Show the level as the planet itself changing, not as an HQ tier."
  },
  {
   "proposalId": "meta-homeworld-2",
   "verdict": "change",
   "reason": "It makes three recognisable lifts. (1) Three upgrade paths per shot with a cross-path cap, written as a '3-1-0' build, is Bloons TD 6's crosspath system and its x-y-z notation. The research applyIdea even says '5-2-0' (evidence-full.md:1035-1037). (2) An evolution that needs max level, a specific catalyst (a Master resident) and a later boss win to reveal it, with recipe silhouettes, is the Vampire Survivors evolution recipe (max weapon + passive + boss chest). (3) Today's Lab upgrades are instant (lab.ts upgradeLab has no timer). Moving them into timed Workshop builds capped by a central level turns them into Clash's Laboratory under a Town Hall cap. Kids who play BTD6, VS or Clash would name each of these.",
   "fix": "Keep six Workshops on the Homeworld as the places that make each shot's Essence and hold its upgrade screen. Replace the path points and cross-path cap with core-loop-8's named per-object ladder. If a choice is wanted, give each object one A/B 'tune' fork at one level, free to swap, and never use x-y-z notation. Shot level-ups stay instant when paid in stardust plus Essences, with no build timer on shot power. Unlock the top form by an in-play feat using our own systems (e.g., make 10 Steam Vents with Ice, or cool 5 Ember Vents with Storm), revealed on the planet where it happens. Drop the Master-resident catalyst and the Guardian reveal. Give the form our own name (e.g., 'Star Form'), not 'evolution'."
  },
  {
   "proposalId": "meta-homeworld-3",
   "verdict": "keep",
   "reason": "A free, reusable loadout picked against a forecast is common genre practice (generic methodology). Everything in it comes from our own systems: Wards, trait Helpers and shot forms. It copies no hit's signature.",
   "fix": "No originality fix. Fold its Helper, core-loop-7's Buddy Power and liveops-data-9's Buddy Helper into one in-level companion power. Use the renamed shot-form term from meta-homeworld-2."
  },
  {
   "proposalId": "meta-homeworld-4",
   "verdict": "change",
   "reason": "Jobs matched by habitat family (Cats & Soup method) and trait keys are fine. The problem is 'Hearts': earned per action, capped per character per day, with tier thresholds and a Best Friend tier that upgrades the companion's in-level power. That is Pokemon GO's buddy-hearts system (10 per day cap, Good/Great/Ultra/Best tiers, Best Buddy CP boost), taken nearly verbatim from the research applyIdea (evidence-full.md:1381-1385). Add the 36-species collection with legendaries, a Buddy and a daily 'greeting' (Animal Crossing-style talk-daily friendship), and players will read it as Pokemon GO.",
   "fix": "Don't call it Hearts. Drop the per-day heart cap and the power-at-Best-Friend rule. Make friendship grow from our own loop instead. A resident gets closer each time the player finishes a planet with that resident's home biome in 3+ regions, or completes its Commission, so friendship is a synergy with play rather than a daily chore. The existing FRIEND_LEVELS 3/8/15/25 (homeworld.ts:544) stay cosmetic (accessories and the best-friend letter). Keep jobs, the family-match bonus and the content gates. Use one trait table shared with core-loop-7."
  },
  {
   "proposalId": "meta-homeworld-5",
   "verdict": "keep",
   "reason": "Adjacency bonuses are genre method (Reus, Dorfromantik, Islanders). The feeds and clashes mirror Pocket Planet's own element chemistry in world.ts applyKind, which makes the base teach the core game. That makes it distinctive.",
   "fix": "No fix needed. Keep the rule text in our chemistry's words ('magma dries water')."
  },
  {
   "proposalId": "meta-homeworld-6",
   "verdict": "change",
   "reason": "Forecast Weather Fronts and Wards are fine: single-player, no raids, nothing destroyed. The active Meteor Watch round is the problem. Telegraphed meteors fall on dotted paths toward your buildings and you fire shots to intercept them before impact. That is Missile Command's core loop with a gravity sling. Next to Wards acting as ranged plot defences, it also reads as Clash-style base defence. It also swaps Pocket Planet's own verb, changing land, for a shoot-down verb.",
   "fix": "Make the defence round a terraforming round on the Homeworld globe. The forecast shows where the front will land, and the player prepares with the normal land rules and core-loop-4's firebreaks: raise a Rock ridge (land 3+) so meteors bounce, soak plots (water 2+) before a Heat Wave, warm plots against Frostbite, and use seed or storm to clean Blight. Hitting a meteor in the sky can stay as one counter among several, as in core-loop-4, but not as the aim of the round. Keep: fronts are forecast, optional and never destructive."
  },
  {
   "proposalId": "meta-homeworld-7",
   "verdict": "keep",
   "reason": "Timed expeditions with a team and postcards are generic idle-meta method, and the game already has them. Sending residents to your own grown planets, matched to the families of those planets' lands, is our own twist and fixes material starvation.",
   "fix": "No originality fix. Rename the 'Hearts' loot to match the reworked friendship in meta-homeworld-4."
  },
  {
   "proposalId": "meta-homeworld-8",
   "verdict": "change",
   "reason": "Commissions (orders for named core feats, Merge Mansion method), Orbit Monuments and the first-hour card are all fine. The gate is the problem: Homeworld Level = Star Dock level, one central building that opens plots, raises every Workshop cap, adds Kit slots and unlocks front types. That is Clash's Town Hall. It also shows as a 'hut, then workshop, then spire' HQ tier.",
   "fix": "Keep the level-up checklist (chapter, stardust, Essences, one Signature Feat) and everything each level unlocks, but work the level out from growth, as in the meta-homeworld-1 fix and ux-10. Show a level-up as the Homeworld planet itself changing (atmosphere, rings, a new ground palette), not a building tier. Keep Commissions as residents' wishes: 3 cards with one free swap, feats not goods. That already sets them apart from Hay Day's order board."
  },
  {
   "proposalId": "meta-homeworld-9",
   "verdict": "keep",
   "reason": "Fixed-price themes, outfits and a pass lane are ordinary cosmetic selling, not a hit's gameplay signature. The five theme names are our own.",
   "fix": "No originality fix. Merge with monetization-5 into one theme line and one price table. Themes can't be priced in gems to 'give gem packs something to buy' if monetization-1 retires gem packs."
  },
  {
   "proposalId": "core-loop-1",
   "verdict": "keep",
   "reason": "Engine, solver and CI bands. Players never see it, so there is nothing to copy.",
   "fix": "None."
  },
  {
   "proposalId": "core-loop-2",
   "verdict": "keep",
   "reason": "A short queue of upcoming objects and an icon-based landing preview are generic. The 'wandered off / came back' ghosts are our own. The only borrowed look is the 'Angry Birds 2-style card row' wording.",
   "fix": "Draw the queue as objects waiting at or circling the launcher, in our own visual language, not as AB2-style cards. Keep the swap between current and next only, so it never becomes an Angry Birds 2 pick-any-card hand."
  },
  {
   "proposalId": "core-loop-3",
   "verdict": "change",
   "reason": "A small named pair matrix (Candy Crush / Royal Match method) is fine, and keeping the score as end-state terrain with no multiplier is good. The trigger model is the copy. Every landing leaves an element-coloured Glow that fades (full ring, then half ring) over 2 throws, and a different element landing in it uses up all glows and fires a named reaction with a banner and element-coloured floating numbers. That is Genshin Impact's aura / consume / decay reaction system; the research entry says so directly (evidence-full.md:972-985). One reaction is even named BLOOM, a Genshin reaction name, which is also the Lab perk being retired. A 10-year-old Genshin player would spot it.",
   "fix": "Tie reactions to the planet's lasting state instead. This is the Divinity 'surfaces' lesson applied to our terrain. A reaction fires when an object lands on (or within 1 sector of) land the partner object made. Examples: Magma on Ice Sheet, Tundra or cold Ocean = Steam Vent; Rock on a Volcano = Firemount; Storm on a seeded Meadow = Rain Garden. There is no separate aura, gauge, decay or 'consume'. If a short window is still needed for balance, show it as the partner's physical trace in the land art (a cooling lava crust, frost rime, puddles), never as coloured rings. Keep floaters in the current style, not element-coloured damage numbers. Rename BLOOM (e.g., 'Sunburst Meadow'). Re-run scratchpad/scope/coreloop/fusion.ts to re-measure the +14.8% gain and the 16.8% decision guard."
  },
  {
   "proposalId": "core-loop-4",
   "verdict": "keep",
   "reason": "Spreading blockers (Candy Crush chocolate, Two Dots fire), a countdown meteor and Into the Breach telegraphs are borrowed as method only. The Troubles act on our terrain values and are countered by our own land rules (water 2+ and land 3+ firebreaks, creatures on their home sectors), which no hit has.",
   "fix": "No originality fix. Use one Trouble roster and one set of names across all proposals. A countdown must never fail the level on its own (the candy-bomb pattern); as written, it doesn't."
  },
  {
   "proposalId": "core-loop-5",
   "verdict": "keep",
   "reason": "A meter charged by playing well and a stored special are genre-wide (AB2 and Peggle cited as method). The six per-object Novas are terrain effects of our own. Pickups collected mid-arc are a common trajectory staple, not any one hit's signature.",
   "fix": "No fix needed. Keep motes a small bonus. Never score a level on collecting every mote along the path (Cut the Rope star scoring)."
  },
  {
   "proposalId": "core-loop-6",
   "verdict": "keep",
   "reason": "Stat cards and small flight-weight differences are generic. Roles show up as terrain jobs (wall, soaker, weed-burner), not as mid-flight tap powers.",
   "fix": "Keep all object abilities on the terrain side. Never add tap-in-flight powers (split, speed boost, boomerang, egg-drop); with the gravity fling, those would make the roster read as Angry Birds birds."
  },
  {
   "proposalId": "core-loop-7",
   "verdict": "keep",
   "reason": "Hazard-as-lock, creature-as-key is method (PvZ, Pikmin). What is ours is that a creature shields the sector it lives on because of its home biome, which is a terrain rule. The once-per-level Buddy Power is a small, generic companion perk.",
   "fix": "Merge with meta-homeworld-4 into one trait table; right now they give Tide Otter different traits. Keep traits named after our lands. Never use colour-coded 'types' or a type-effectiveness chart (Pokemon/Pikmin framing). Use one companion power, shared with meta-homeworld-3 and liveops-data-9."
  },
  {
   "proposalId": "core-loop-8",
   "verdict": "change",
   "reason": "The per-object ladder of rule-changing perks tied to our reactions, Troubles and Nova is good and original. Lv5 copies Vampire Survivors by the proposal's own account: buy max level, then the evolution 'hatches' on the next boss (Comet Guardian) win, shown as a silhouette with a boss condition. That is VS's boss-chest evolution. There are also name clashes: the Storm Lv2 perk and the Storm Nova are both 'Clean Sweep'; 'Glacier Comet' vs the 'Glacier' reaction; and Rock's 'Meteor Cluster' vs the hostile Meteor Trouble.",
   "fix": "Unlock the Lv5 form by an in-play feat with that object in our own systems, revealed where it happens. Examples: Ice, make 10 Steam Vents; Magma, burn 5 Tanglevines; Storm, clear 5 Trouble tags. Give it our own name (e.g., 'Star Form'). Bosses give no hatch. Rename to remove the collisions (e.g., Storm Lv2 'Rinse', Rock Lv5 'Pebble Shower', Ice Lv5 'Rime Comet'). This one ladder should also stand in for meta-homeworld-2's paths."
  },
  {
   "proposalId": "core-loop-9",
   "verdict": "keep",
   "reason": "A mastery mark above 3 stars set by a par score is generic (golf par, star tiers across puzzle games). A gold ring on your galaxy planet is our own look.",
   "fix": "No fix needed. Merge with ux-5's 'Mastery' segment and liveops-data-2's par tier into one named tier."
  },
  {
   "proposalId": "ux-1",
   "verdict": "keep",
   "reason": "First-session pacing, practice planets and a modal governor are UX method with no hit signature. The 'planet shrinks into your galaxy' purpose moment is our own.",
   "fix": "No originality fix. The guided build should use whichever producer survives meta-homeworld-1 (a Workshop, not a Stardust Mill)."
  },
  {
   "proposalId": "ux-2",
   "verdict": "keep",
   "reason": "Bottom tabs, one Next Up card, a badge policy and a back stack are generic mobile navigation.",
   "fix": "None."
  },
  {
   "proposalId": "ux-3",
   "verdict": "keep",
   "reason": "An unlock ladder, just-in-time teaching cards and a Field Guide are generic onboarding method.",
   "fix": "None. Field Guide page names should use the final glossary (see 'missing')."
  },
  {
   "proposalId": "ux-4",
   "verdict": "keep",
   "reason": "Teaching planets, forecasts, an 'A + B = C' discovery card and a factual 'What happened' fail card are method. Their content comes from our systems.",
   "fix": "No originality fix. Examples like 'Wildfire', 'Steam within 2 sectors' should follow the reworked core-loop-3 trigger and the single Trouble roster."
  },
  {
   "proposalId": "ux-5",
   "verdict": "keep",
   "reason": "A trade-off preview, a feedback governor and a visible loss are generic HUD readability.",
   "fix": "If chains ever pay, they pay in land or creatures, never as a x score multiplier; that is the road back to Balatro's chips x mult. Keep swapping to current and next only; tapping any of the next 3 would make it an Angry Birds 2 card hand."
  },
  {
   "proposalId": "ux-6",
   "verdict": "change",
   "reason": "The round tally is justified in the proposal's own words: 'Balatro turns one legible formula into a layered tally animation, and that tally is the reward'. It shows a formula line and plans a 'combo line if the core role adopts a multiplier'. That is the part of Balatro, its scoring formula and staged tally, that the owner rejected in Lucky Pips. The approved lesson is only 'satisfying feedback: rising pitch, screen shake, numbers counting up' (07-transcript.md:299). Per-object feel, creature reactions and the fusion moment are all fine.",
   "fix": "Make the tally our own. Creatures walk to their homes, and the finished planet flies into the galaxy while the life bar fills in one count-up with rising pitch. No on-screen arithmetic formula, never a x multiplier stage or a two-box score, and fusions shown as their land effect, not as a combo line. Take Balatro out of the stated rationale. Keep points 2-7 as written."
  },
  {
   "proposalId": "ux-7",
   "verdict": "keep",
   "reason": "A 'while you were away' card, one bundled notification and lapsed-player warm-ups are generic idle and retention method.",
   "fix": "None."
  },
  {
   "proposalId": "ux-8",
   "verdict": "keep",
   "reason": "Kid-safe money UX with nothing borrowed from a hit's gameplay.",
   "fix": "No originality fix. Agree one continue rule and one gate v2 with monetization-2 and monetization-3 (see conflicts)."
  },
  {
   "proposalId": "ux-9",
   "verdict": "keep",
   "reason": "Accessibility work; nothing to copy.",
   "fix": "None."
  },
  {
   "proposalId": "ux-10",
   "verdict": "keep",
   "reason": "A Base Level worked out from rings, buildings and residents follows the 'one gate number' method without copying the Town Hall building. It is the preferred alternative to the Star Dock gate in meta-homeworld-1 and meta-homeworld-8.",
   "fix": "No originality fix. Its defence entry point should follow the reworked meta-homeworld-6 (prepare the land, not shoot meteors down). The guided first build should match the surviving producer."
  },
  {
   "proposalId": "liveops-data-1",
   "verdict": "keep",
   "reason": "On-device ledger and wallet chokepoint; tooling players never see.",
   "fix": "None. Merge with monetization-7 into one ledger."
  },
  {
   "proposalId": "liveops-data-2",
   "verdict": "keep",
   "reason": "Simulation tooling.",
   "fix": "None."
  },
  {
   "proposalId": "liveops-data-3",
   "verdict": "keep",
   "reason": "Economy simulation tooling.",
   "fix": "None."
  },
  {
   "proposalId": "liveops-data-4",
   "verdict": "keep",
   "reason": "Level lint and seed overrides; tooling.",
   "fix": "None."
  },
  {
   "proposalId": "liveops-data-5",
   "verdict": "keep",
   "reason": "CI guard rails; tooling. It is the natural home for an originality and trademark lint (see 'missing').",
   "fix": "Add a banned-term check to its kid-safe lint for competitor names and hit-specific terms in player-facing strings and store metadata, in all 6 languages."
  },
  {
   "proposalId": "liveops-data-6",
   "verdict": "keep",
   "reason": "An authored calendar, seasons and festival editions are generic live-ops method with our own content.",
   "fix": "None."
  },
  {
   "proposalId": "liveops-data-7",
   "verdict": "keep",
   "reason": "Ship-gate scorecard; tooling.",
   "fix": "Add an originality stop rule next to the kid-safety stop rule (see 'missing')."
  },
  {
   "proposalId": "liveops-data-8",
   "verdict": "keep",
   "reason": "QA process; tooling.",
   "fix": "None."
  },
  {
   "proposalId": "liveops-data-9",
   "verdict": "keep",
   "reason": "A free help ladder driven by local fail data; generic and our own.",
   "fix": "No originality fix. Its 'Buddy Helper +2 throws' should be the same single companion power as core-loop-7 and meta-homeworld-3."
  },
  {
   "proposalId": "monetization-1",
   "verdict": "keep",
   "reason": "A store charter and catalogue reset; a monetisation structure, not a gameplay copy.",
   "fix": "None."
  },
  {
   "proposalId": "monetization-2",
   "verdict": "keep",
   "reason": "Grown-up Shop, wishlist and gate v2; kids-app practice, not a hit's gameplay.",
   "fix": "None. Agree one gate v2 with ux-8."
  },
  {
   "proposalId": "monetization-3",
   "verdict": "keep",
   "reason": "A map of what may be sold versus what stays free. It adds no mechanic of its own, but its text carries borrowed wording from the research: 'catalyst species' (Vampire Survivors), 'Weather Dial (Heat)' (Hades' Heat) and 'Afterglow' (the Genshin-style aura).",
   "fix": "Update the published map to the reworked names: no 'catalyst', no 'Heat', no 'Afterglow'. Base its tests on the final core-loop-3, core-loop-8 and meta-homeworld-2 designs."
  },
  {
   "proposalId": "monetization-4",
   "verdict": "keep",
   "reason": "A season pass with a free and a premium lane, plus an archive of past tracks, is a monetisation structure common across mobile, not a gameplay clone.",
   "fix": "Rename the pass points: 'Glow' collides with core-loop-3's Glow (e.g., use 'Starlight')."
  },
  {
   "proposalId": "monetization-5",
   "verdict": "keep",
   "reason": "Cosmetic lines on our own surfaces, with a strong readability rule. Theme names are original.",
   "fix": "None. Merge with meta-homeworld-9's theme list and prices."
  },
  {
   "proposalId": "monetization-6",
   "verdict": "keep",
   "reason": "An offer ladder and placement map; monetisation method.",
   "fix": "Rename 'Explorer Bundle'; 'Explorer' already names Explorer Rank and monetization-8's Explorer Club."
  },
  {
   "proposalId": "monetization-7",
   "verdict": "keep",
   "reason": "Ledger and price testing; tooling.",
   "fix": "None. Merge with liveops-data-1."
  },
  {
   "proposalId": "monetization-8",
   "verdict": "keep",
   "reason": "A family subscription with a monthly cosmetic drop is a monetisation structure, not a gameplay copy.",
   "fix": "No originality fix. Rename 'Explorer Club'. Take the paid 'Collect all' out of the perks; see conflicts."
  }
 ],
 "missing": [
  "An originality stop rule. liveops-data-7 has kid-safety stop rules but nothing for originality, even though originality is the owner's non-negotiable #1. Every feature spec should carry a row: nearest hit, what is recognisably theirs, what we do instead. It should also pass a 'describe it without our nouns' test: if the description names a hit, rework it. The owner signs off before build. Keep this in docs/product/ORIGINALITY.md and link it from ROADMAP-v2.",
  "A do-not-build list for research applyIdeas that are clones. The research copied hit mechanics almost verbatim. Some of these no PM proposed, and they must stay out: the Expedition Run charm draft with a 'Life Points x Harmony' formula (Balatro/Peglin run structure); a Weather Dial scored in 'Heat' with bounties (Hades Pact of Punishment); a Buddy heart meter with Good/Great/Ultra/Best tiers and a 10-a-day cap (Pokemon GO); 'Supernova on a Fusion = Color Bomb x Color Bomb' (Candy Crush); '5-2-0' cross-path trees (BTD6). The same list should cover the parts cut above.",
  "A signature mechanic that only Pocket Planet could have. None of the 45 proposals uses the spinning planet, gravity arcs or moons as a source of synergy or hazard. Almost every new system is a sector-grid rule taken from a genre. Examples of what is missing: a shot that bends around a moon picks up that moon's element; the sunlit and night halves of the rotating planet change what Sun and Ice do; a Trouble on the far side rotates into view. One such rule would make the new depth unmistakably ours.",
  "A combined originality review of the Homeworld. Each piece is fine alone, but together they stack up: a central gate building, collectors with caps, builder drones, timed upgrades of the things you send into rounds, ranged Wards, incoming 'attacks' while you are away, and pass building skins. That adds up to Clash of Clans with planets. The Homeworld needs a one-page identity statement built on verbs Clash lacks: you terraform your home planet with the fling, residents come because of their habitats, and shots learn tricks. At minimum, drop the Town Hall building and timed shot upgrades.",
  "One glossary for the whole game, checked against hit vocabulary in all 6 languages. Avoid Bloom, Hearts, Evolution (and ja 進化), Heat, Town Hall-style HQ names and Gold Pass. It should also fix the internal clashes: Glow is used twice; Explorer three times (Rank, Bundle, Club); Clean Sweep twice; Firemount twice; Glacier / Glacier Comet; the Meteor Trouble against Meteor Cluster, Meteor Shower, Meteor Watch and Meteor Rush; and the retired 'Bloom' Lab perk against the Bloom reaction.",
  "A trademark and copycat lint for store metadata and player-facing strings. game.ts:359 has a 'Balatro-style' comment, and ROADMAP tables name hits. That is fine inside the repo, but the store listing, screenshots and in-game text must never name or echo another game (App Store guideline 4.1 Copycats; the transcript already warned against 'Balatro' in the listing). Screenshots should lead with the original core (fling at a spinning planet, lands, creatures), not the base-builder, so reviews don't say 'Clash clone'. Add this as a test in liveops-data-5."
 ],
 "conflicts": [
  "Shot upgrades are designed three ways. meta-homeworld-2 uses Workshops with Reach/Power/Echo path points, a cross-path cap, stardust plus Essences, build timers and a Master-resident + Guardian evolution. core-loop-8 keeps a stardust-only Lab with a fixed Guard/Fusion+/Nova+/Evolution ladder and a Guardian hatch. monetization-3 ('stardust plus a catalyst species') and monetization-5 ('Reach, Power or Echo glyph') assume the first. Pick one: core-loop-8's ladder, housed in meta-homeworld-2's Workshops, with the top form unlocked by a feat.",
  "Homeworld Level is defined two ways. meta-homeworld-1 and meta-homeworld-8 make it the Star Dock building's level. ux-10 works it out from rings, buildings and residents, and monetization-3 has 'Radiance' count only earned structures. Prefer the computed version.",
  "The trait tables disagree. core-loop-7 has 4 traits (Fireproof, Frostproof, Deep Roots, Swimmer, plus Calm for legendaries). meta-homeworld-4 has 5 (Sturdy, Fire-proof, Rain-maker, Frost-proof, Rooted) and gives legendaries every trait. The same species get different traits: core-loop-7 makes Tide Otter a Swimmer, while meta-homeworld-4 puts it in the leaf family (Rooted).",
  "Three in-level companion powers overlap: core-loop-7's Buddy Power (once per level, skips a Trouble tick), meta-homeworld-3's Kit Helper (replaces the Buddy on screen) and liveops-data-9's Buddy Helper (+2 throws after 3 fails). There should be one companion and one power.",
  "The hazard rosters don't match. core-loop-4 has Ember Vent, Frost Creep, Tanglevine and Meteor. meta-homeworld-3, meta-homeworld-4, ux-4 and monetization-3 use Wildfire, Deep Freeze and Dust Drift, and meta-homeworld-6 adds Blight, Frostbite, Heat Wave and Meteor Shower. The counters and tick timings also differ: every 3rd throw in core-loop-4 against 'spreads after 2 throws' in ux-4.",
  "The reaction models conflict. core-loop-3 uses a 2-throw Glow within ±2 that gets used up. monetization-3 and ux-4 cite 'Afterglow' and 'Sector Conditions' from the research. The originality fix above moves reactions onto the land itself, which also settles this.",
  "Stardust Mills: meta-homeworld-1 retires them, but ux-1 and ux-10 script the guided first Homeworld build as 'build a Stardust Mill'.",
  "Collect all: ux-2, ux-7, ux-10 and meta-homeworld-1 make a merged Collect all free for everyone, but monetization-8 sells 'a Home Collect all that also gathers Homeworld producers' as a Club perk.",
  "Gem packs: monetization-1 retires every gem pack and the piggy bank. meta-homeworld-1, meta-homeworld-9, core-loop-3, core-loop-5 and core-loop-8 justify gem-priced cosmetics by saying they 'give gem packs something to buy'. meta-homeworld-9 prices themes at 360 gems, while monetization-5 sells themes in USD only.",
  "The continue rules differ across six proposals. ux-1: never on planets 1-10. ux-8: not on 1-10, only from the 2nd consecutive fail, 40 gems, never after a win. monetization-3: flat 50 gems, at most 2, none on 1-3. liveops-data-9: available as a secondary button from the first fail. liveops-data-5 and monetization-6: none on L1-3.",
  "Parental gate v2 is specified twice. ux-8: a 3-digit number in words, then hold, with a 30 s cooldown after a wrong answer. monetization-2: a number from 21 to 99 in words with a 1.5 s hold and no cooldown.",
  "Queue and Star Scope: core-loop-2 shows current + 2 with a current/next swap. ux-5 shows current + 3 and lets the player tap either of the next two. core-loop-5's Star Scope shows 5 upcoming objects plus fusion outlines; ux-5's Star Scope is a 2-step preview; liveops-data-9's guided throw is 'Star Scope-style'.",
  "The mastery tier is proposed three times: core-loop-9 'Wonder' (0.95 x beam par), ux-5's 'Mastery' segment, and liveops-data-2's 'Master/par tier'.",
  "Passes: meta-homeworld-9 puts a Homeworld lane in an 8-10 week seasonal pass at $4.99. monetization-4 uses 8-week seasons at $3.99 and explicitly rejects a separate Homeworld pass. liveops-data-6 has about 5 seasons a year of 8-10 weeks with about 20 tiers. monetization-8's Club includes the season lane.",
  "The two ledgers overlap. liveops-data-1 compiles its Balance Report export out of App Store builds (tester builds only). monetization-7 puts the Balance Report behind the gate in production with a Share-sheet export.",
  "Base defence: meta-homeworld-6 charges 5-20 Essences to repair a building dimmed by a front. ux-10 says a planet win repairs it. Both need the reworked defence round (preparing the land, not intercepting meteors).",
  "The pre-level sheet: meta-homeworld-3 adds a Kit row and choices to it, while ux-2 (E) turns the sheet into an overlay that the first fling dismisses, for a 1-tap results-to-throw budget."
 ]
}
```

## critic:economy

```json
{
 "lens": "Economy / data critic: inflation, exploits, dead currencies, pay-to-win, balance breakage and measurement. I checked the PMs' numbers against the audit and against the code: src/meta/economy.ts planetRate, src/meta/constellations.ts dropsFor, which pays on every replay, and the 35 direct gem/stardust writes across 8 files, which a grep confirmed. I re-ran the PMs' own scratch models (scope/homeworld2.model.mjs, hw2b.mjs, cashflow.mjs, monetization.model.mjs) and wrote two new ones: /tmp/claude-0/-home-user-oneshotgame/c29f86da-8da7-5431-85c5-fc6402d6214f/scratchpad/scope/critic/dock.mjs covers the Star Dock's active share and when the stardust sinks run out; critic/misc.mjs covers Glow pacing, Greenhouse booster supply, frost supply after all proposals, the gem economy with no gem packs, and price checks. Main results:\n- The proposed Dock (20 x sqrt of galaxy rate) gives a Regular player (6 levels a day, 3 opens) about 12% active stardust at level 30, against the 35% target. The roughly 119k of stardust sinks left after the change are used up by day 9 (casual day 13, engaged day 7).\n- The Workshop sizing quotes the wrong model. With its own numbers it gives 58/21/20 days (casual/Regular/engaged), and engaged players are held back by production time, not by play.\n- If every frost fix ships, frost supply is about 87 a day against total demand of about 455.\n- Glow finishes an 8-week season in 8 days for a Regular player.\n- Two Level-5 Greenhouses make 12-16 boosters a day against 6 levels played.\n- Gems that can only be earned come to about 5,600 per season, against a fixed gem catalogue of about 2,670.\n- The Collector's Edition breaks its own 60% price rule at launch.",
 "verdicts": [
  {
   "proposalId": "meta-homeworld-1",
   "verdict": "change",
   "reason": "The direction is right: retire Grove gems, x2-for-10-gems, friendship gems and expedition gems; merge the two idle engines; give Essences a purpose. The numbers miss the proposal's own targets. In critic/dock.mjs (calibrated like cashflow.mjs), Dock = 20*sqrt(galaxy rate) gives a Regular player (6 levels a day, 3 opens) about 12% active stardust at L30 and 7% at day 14, against a >=35% target. The remaining stardust sinks (Workshops 58.5k + rings 48.5k + upgrades 12.2k = about 119k) are used up by day 9 (casual 13, engaged 7), so stardust is dead again by week 2. Even 6*sqrt falls below 35% after day 5. The claim that 10 counters become 4 is false: the package adds 5 Essences, Hearts, Blueprints, a Homeworld Level and, with monetization-4, Glow. The revenue argument that 'removing free gems makes gem packs worth buying' disappears if monetization-1 retires the packs. The Refinery at 3:1 and up to 12 outputs per 8h, together with other frost sources, overcorrects frost. hw2b.mjs shows the casual player ending with about 1,100 surplus of each of 4 Essences while leaf becomes the new bottleneck. The game has not launched (no in-app purchases exist in App Store Connect), so a PROFILE_VERSION 4 migration plus a migration letter is more than needed.",
   "fix": "(1) Stop idle income from growing with the galaxy. Either give the Dock a flat rate per Dock level (for example 60/90/120/150/180 per hour, storing 4/6/8/10/12h), or make it fuelled by wins (each campaign win adds 2h of Dock production, up to 12h banked). Add a CI band in tests/economy.sim.ts: idle stardust <= 1.5x active stardust per day for the Regular archetype on every day from 1 to 60. (2) Refinery: 4:1, at most 6 outputs per 8h, shared with the adjacency auto-convert in meta-homeworld-5. (3) Replace the 'four currencies' claim with a per-screen limit (at most 2 pills in the top bar, Essences only in the Homeworld, on results and in the Kit) checked by a test. (4) Keep the removals of x2, Grove gems, friendship gems and expedition gems. (5) For migration, reset TestFlight saves or do a simple Lab-to-Workshop mapping; no letters or grandfathering."
  },
  {
   "proposalId": "meta-homeworld-2",
   "verdict": "change",
   "reason": "This is the right home for shot power, and pricing it in Essences means play gates it. The sizing does not hold up. The quoted 'all six Workshops Lv5 by day 27/20/21' comes from homeworld2.model.mjs (production 0.4-1.5/h, no Refinery). The proposal's own design (0.3-1.2/h plus the Refinery) is hw2b.mjs, which gives 58/21/20 days: Regular finishes by day 21, under liveops-data-3's 28-day band. The 12-levels-a-day player finishes no sooner than the 6-a-day player, because frost comes from production time, so progress is gated by waiting, not by play. The model never spends stardust. It also leaves out the Star Atlas and dye demand for the same Essences, and the new frost faucets: meta-homeworld-7 expeditions, core-loop-3 Glacier and core-loop-4 Frost Creep. With them, supply is about 87 frost a day against 455 total demand, so Workshops would be maxed within about a week of Tower 3. dropsFor pays on every replay (constellations.ts), so replaying a 1-minute ice-heavy planet pays up to 13 frost each time: grinding for power. It duplicates core-loop-8 with a different currency, structure and evolution gate. It is also unclear whether a stored Workshop keeps its shot perk; if it does, the plot pressure is not real.",
   "fix": "Merge with core-loop-8. Workshops are where shot upgrades live and are paid in Essences plus stardust. The perk content is core-loop-8's fixed ladder (GUARD / FUSION+ / NOVA+ / EVOLUTION); drop the 3-1-0 paths in v1, because 6 kinds x paths x evolutions is too many sim cells to guard. Re-size in tests/economy.sim.ts with every Essence faucet (levels, reactions, Troubles, Workshops, Refinery, expeditions, fronts, Meteor Watch, Commissions) and every sink (Workshops, Homeworld checklist, Atlas, dyes, repairs). Target: all Workshops at Lv5 no earlier than day 28 for Regular, and engaged players at least 30% sooner than Regular. Essences pay only on a first clear or new stars, or under a daily harvest allowance (full drops on the first 8 wins a day, then 25%). A stored Workshop keeps its level but its shot perk is off."
  },
  {
   "proposalId": "meta-homeworld-3",
   "verdict": "change",
   "reason": "The Kit is free, never sold and makes the base felt in play. But power stacks with no combined budget. A Helper makes its sector immune, a Ward blocks the first spread, the Evolved shot is always dealt and Workshop perks are always on. On top of that, core-loop-7 adds Buddy Power (skip the first tick) and the legendary Calm aura (ticks every 6 throws), and the Storm Nova clears Troubles within +-6. On a normal 12-throw Trouble planet with a 3-throw tick (4 ticks), Calm leaves 2 ticks and Buddy plus Ward cancel both, so the hazard is deleted. core-loop-4's test that blind play loses at least 5% only holds without the Kit. Every proposal guards itself at +15pp, and the bonuses add up.",
   "fix": "Allow at most one pre-level mitigation per Trouble type per level (Helper OR Ward OR Buddy Power). Add a 'max legal loadout' bot (max Workshops + best Kit + Greenhouse boosters + all motes) to the shared sim and gate on it: no more than +15pp decent-aware 3-star versus base loadout on normal planets 21-60; decent Hard fail at least 20%; blind play with the max Kit still loses at least 3% on Trouble planets. Ship Kit slots 1-3 and add the 4th only if that gate holds."
  },
  {
   "proposalId": "meta-homeworld-4",
   "verdict": "change",
   "reason": "It gives the characters jobs, never penalises, and caps Hearts per day, which stops grinding. But its trait table conflicts with core-loop-7: here Tide Otter is leaf/Rooted because its first home biome is forest (world.ts:322); there it is a Swimmer; and this table has 5 traits against 4. The production multipliers stack: rank x15% (up to +60%), heart tiers (+20%), a +50% feed, a +25% Sun Mirror bonus, capped at x2.5. That makes an Ice Well Lv5 about 3 frost an hour (about 48 a day per building), while the sizing model assumed x1.5. Giving legendaries every trait makes them a key for every hazard. Removing about 2.5-3.4k lifetime friendship gems only helps if something still sinks gems.",
   "fix": "Use one trait table: core-loop-7's home-biome traits for play. Map species to an Essence family only to decide job matches. Job bonus: flat +10/15/20/25% by rarity; heart tiers +0/5/5/5%. Cap the total building multiplier (job x adjacency) at x1.75. Legendaries get one trait plus a cosmetic aura. Include all of this in the Essence model."
  },
  {
   "proposalId": "meta-homeworld-5",
   "verdict": "change",
   "reason": "Adjacency finally makes layout matter; it is previewed, reversible and never destroys anything. Economy problems: the x2.5 cap is the biggest production inflator. The Refinery's adjacent auto-convert is not said to share the Refinery's 12-per-8h cap, which makes it a second, uncapped refinery. Moves are free and instant, so if bonuses are computed when you collect, a player can shuffle buildings into feed positions just before collecting and skip the trade-off.",
   "fix": "Total multiplier cap x1.75 (shared with jobs). The auto-convert uses the Refinery's cap. Bonuses build up over time since the last move, or moving a building first banks its current stock and restarts its production at the new rate. Keep at P1, after meta-homeworld-2."
  },
  {
   "proposalId": "meta-homeworld-6",
   "verdict": "change",
   "reason": "It adds a defence action that uses the fling, forecast and non-destructive. But fronts are skipped for anyone away 3 or more days, so the daily player absorbs every front's Dimming (paused production) and the lapsed player absorbs none: an incentive against the daily habit the game wants. Meteor Watch pays star ore per catch with no stated limit per front, and Comet Tail doubles it. The repair sink (5-20 Essences) is too small to matter against the proposed Essence faucets. It is large (L) work and needs a new LevelScene mode.",
   "fix": "Make fronts only an upside: a held plot pays the front bonus; an unheld building simply misses that bonus (no Dimming), or stays Dimmed only until the next campaign win, with no Essence cost. Meteor Watch: one run per front, catches worth at most one day of the target Workshop's output. Ship fronts and Wards first; move Meteor Watch to P2 once the LevelScene globe mode exists."
  },
  {
   "proposalId": "meta-homeworld-7",
   "verdict": "change",
   "reason": "Choosing destinations among your own planets is good, it is deterministic, and it removes about 66 gem-equivalents per 8h run. But 'about 30 frost per 8h Far Side run', with a second slot at Tower 3, is 60-120 frost a day against total frost demand of about 455 (Workshops 309, Homeworld Lv4/5 100, Atlas 46). Frost sinks would be finished in about 5-7 days. Stacked with the Refinery, Glacier and Frost Creep, frost swings from starvation (0.08 per planet) to glut. Blueprints are a new, unmodelled collectible. Letting the player choose the Greenhouse booster type means two Lv5 Greenhouses give 12-16 boosters a day against 6 levels, so a +3-throw Comet Shower on every level.",
   "fix": "Size expedition frost to its own metric (about 30% of frost income): an 8h Far Side run with 2 matching members gives about 8-10 frost, and the second slot opens at Tower 5. Make expeditions the one main frost fix, and drop or cut the Refinery's frost output (4:1). Cap each Greenhouse at 1 booster per 8h (3-6 a day in total) and include boosters in the max-loadout bot."
  },
  {
   "proposalId": "meta-homeworld-8",
   "verdict": "change",
   "reason": "One number, goals, an endless Orbit, clock guards and the badge fix are all good. But Commission rewards (Essences + Hearts + stardust, plus a Blueprint for all 3) are not sized, which makes them a daily, targeted Essence faucet of unknown size. The pacing ('Lv2 in 2 days or less'; Lv5 by about day 14 for Regular under meta-homeworld-1's sizing) contradicts liveops-data-7 M5 ('Ring 5 not before day 45'). The clock guards cover only a clock moved backward; moving it forward still fills every producer, refreshes Commissions and resets the Heart cap.",
   "fix": "Fix the Commission reward (for example 6 Essences of the card's family + 1 Heart + 50 stardust, and a Blueprint for all 3 in a day) and put it in the economy sim. Choose one Homeworld Lv5 target (Regular no earlier than day 28, matching liveops-data-3) and update liveops-data-7 to match. Add a forward-clock guard: keep a high-water mark of the last seen time, credit at most the real elapsed time since the last open up to the building cap, and ignore time moved forward beyond 24h per open."
  },
  {
   "proposalId": "meta-homeworld-9",
   "verdict": "change",
   "reason": "It is cosmetic-only, previewable and fixed-price, and earning the drone fixes pay-for-parallelism. But the dual prices ('$2.99 or 360 gems', '$1.99 or 240 gems') break once gems are earn-only (monetization-1): a daily player earns 360 gems in about 3.6 days, so the dollar SKU sells little, and it breaks monetization-1's 'one item, one price'. It launches 5 themes where monetization-5 launches 3, prices the lane at $4.99 where monetization-4 says $3.99, and sells outfits separately where monetization-5 bundles them. 'Existing Cosmic Pass owners' do not exist before launch. The $40-50 per payer ceiling has no conversion model behind it. 'Preview-to-purchase at least 5%' cannot be measured, because the ledger never leaves the device.",
   "fix": "Themes and outfit sets are sold in dollars only; gem items are separate single pieces. Fold this into monetization-5's catalogue: 3 themes at launch, then 1 per season. Use monetization-4's lane price ($3.99). Drop the 'Gilded' thank-you theme. Restate the metrics as App Store Connect aggregates (units and refunds per SKU) or tester funnels."
  },
  {
   "proposalId": "core-loop-1",
   "verdict": "change",
   "reason": "This is the essential foundation. stepRound keeps the solver, the preview and play identical, a test guarantees the 1-star floor, and the speed plan is concrete. From the data side: targets ignore every player-side bonus, which is correct for beatability. But lowering TUNE.f3 from 0.93 to 0.90 makes 3 stars easier for everyone before Workshops, Kit, Buddy Power, motes and boosters are stacked on top, and the only uplift band is 'Lab 5 <= +15'. The bot harness duplicates liveops-data-2's.",
   "fix": "Use one harness: liveops-data-2's tests/sim with stepRound inside. Add a 'max legal loadout' profile and gate on it. Do not lower f3 until that profile is measured: tune for decent-aware 3-star 40-55% at the base loadout AND at most 70% at the max loadout."
  },
  {
   "proposalId": "core-loop-2",
   "verdict": "keep",
   "reason": "It surfaces `lost` and fires onSpecies, festival and quest events only on a species' first arrival, which closes the respawn farming at game.ts:884-902. It is information only, with no new faucet.",
   "fix": "No blocking change. Extend first-arrival-only to Supernova creature charge (core-loop-5) and to the Lab creature bonuses (core-loop-8 Phase 0), so wander-off and return cannot be farmed. Queue length stays current + next 2 (overrides ux-5)."
  },
  {
   "proposalId": "core-loop-3",
   "verdict": "change",
   "reason": "The data is solid: aware play +14.8% versus blind +3.1%, 2.1 fusions per level, per-object spread 2.8x down to 1.7x. Economy side-effects are not modelled. Glacier and the extra frost lands raise frost drops above 0.08 per planet, which feeds the Essence glut in meta-homeworld-2 and -7. Rainbow's +1 throw stacks with motes and boosters. Reactions change which biomes appear, so liveops-data-6's hard-coded per-theme event multipliers (Frost x6 and so on) go stale. The cosmetics are dual-priced (120 gems OR a $1.99 set).",
   "fix": "Re-run the material drops with reactions on and feed them into the single Essence model; gate on frost per level at most 1.0 with aware play. Rainbow counts toward a limit of one extra throw per level from in-level sources. Sell FX at one price in one currency. Derive event thresholds from the reaction-aware sim."
  },
  {
   "proposalId": "core-loop-4",
   "verdict": "change",
   "reason": "Hazards are counterable and forecast. Casual fail is measured unchanged at 21%, and the Hard band is reached through decisions rather than bigger targets. Risks: player-side mitigations can remove Troubles entirely (Kit Ward and Helper, Buddy Power, Calm, the Storm Nova clearing +-6, Workshop GUARD perks). Frost Creep 'can be used on purpose for frost materials', which is another frost faucet. Four other proposals use different hazard names (Wildfire, Deep Freeze, Dust Drift, Blight).",
   "fix": "Make this roster (Ember Vent, Frost Creep, Tanglevine, Meteor) the canon and rename the hazards in meta-homeworld-3/4/6, ux-4 and monetization-3 to match. Add the test 'blind play + max loadout still loses at least 3%'. The Storm Nova clears Trouble sources within +-3, not +-6. Count Frost Creep frost in the Essence model."
  },
  {
   "proposalId": "core-loop-5",
   "verdict": "change",
   "reason": "The Nova becomes a decision, charge no longer pays on net-negative throws, motes are skill-based and visible, and fewer Novas (2.45 against 3.72 per level) lowers power. Two holes remain. First, +2 charge per arriving creature pays again on returns: a destroying throw gives 0, the restoring throw gives the charge, so churn still pays. Second, throw budgets inflate: a mote +1, Rainbow +1, Comet Shower +3 and the ladder's +2 can all stack, beyond anything targets assume. The Star Scope spec conflicts with ux-5, and Nova Styles are dual-priced.",
   "fix": "Creature charge counts only on a species' first arrival per level. Extra throws from in-level sources are capped at 1 per level in total (mote OR Rainbow). Use this proposal's Star Scope (5 upcoming objects + Fusion outlines) and drop ux-5's version. Nova Styles use one currency."
  },
  {
   "proposalId": "core-loop-6",
   "verdict": "keep",
   "reason": "The stats reproduce today's terrain, guarded by a 17x6 snapshot test; the deal re-weight is tuned in the sim; the reachability test stops unfair physics. Small economy effect: rock weight 4 to 3.5 cuts stone drops by roughly 10%, and more storm raises dew.",
   "fix": "None blocking. Include the deal re-weight in the Essence supply sim, and price Element Skins in one currency."
  },
  {
   "proposalId": "core-loop-7",
   "verdict": "change",
   "reason": "Creatures as keys is readable and answers 'what are the characters for'. But it duplicates meta-homeworld-4's trait table (different traits and mappings for the same species). Buddy Power duplicates the Kit Helper. The legendary Calm aura (ticks every 6 throws instead of 3) halves Troubles, and stacked with Wards and Buddy Power it deletes them.",
   "fix": "Use one trait table (this one) for the Lifebook, levels and residents. From planet 6, when the Homeworld Kit opens, Buddy Power becomes the Kit Helper; before that it works as written. Calm delays the first tick by 1 throw. At most one mitigation per Trouble per level."
  },
  {
   "proposalId": "core-loop-8",
   "verdict": "change",
   "reason": "Phase 0 is right and cheap. Phase 1 keeps stardust costs of 400/1,200/3,000/7,000, and cashflow.mjs shows the whole Lab bought by day 9/6/4, so the power curve is not stretched at all. 'Hatch after the next Guardian' comes every 10 planets, 1-2 days at 6 levels a day. It duplicates meta-homeworld-2. Phase 0 as written still pays churn: the destroying throw pays 0, then the restoring throw pays Bloom and Magnet again. The CI rule 'no normal planet below a 20% decent-aware fail floor at max Lab' contradicts the normal band (liveops-data-4: 0-35%; decent normal fail today is 8-19%).",
   "fix": "Ship Phase 0 now: Magnet pays only on a species' first arrival per level, and Bloom only when a region reaches a new maximum this level. Phase 1 content moves into meta-homeworld-2's Workshops, priced in Essences plus stardust. Replace the 20% fail floor with: max loadout no more than +15pp 3-star on normal planets 21-60, and decent Hard fail at least 20%."
  },
  {
   "proposalId": "core-loop-9",
   "verdict": "keep",
   "reason": "It is cheap (+25 stardust the first time), status only, precomputed (par.json with a CI sample diff), and reuses beam-planner data. It creates no faucet or power.",
   "fix": "Only small changes. Wonder is not awarded on attempts that used ux-9 assists or ladder help (liveops-data-9's Buddy Helper throws or guided throw). Regenerate par whenever the rules change."
  },
  {
   "proposalId": "ux-1",
   "verdict": "change",
   "reason": "Removing failure on Planet 1, the gem continue, the launch walls and early offers is right, and it costs almost nothing: a new player has 33 gems and the continue costs 40. It conflicts with other proposals in three places. The guided '30 s Stardust Mill' build: meta-homeworld-1 retires Mills. 'Hide materials until the Star Atlas': meta-homeworld-1 makes Essences the results headline from planet 5. And the continue cut-off (none on 1-10) differs from others (1-3).",
   "fix": "The guided first build is the first Workshop (free, 30 s). Essences show on results from planet 5, with a one-line 'for your Homeworld' reason; the Atlas comes later. Adopt the unified continue rule: none on planets 1-10."
  },
  {
   "proposalId": "ux-2",
   "verdict": "change",
   "reason": "Five tabs, Next Up, a real back stack and CI layout checks are good. Removing x2 matches meta-homeworld-1. Two conflicts: 'Materials appear only in the Atlas' contradicts Essences in the Homeworld header, on results and in the Kit. 'Collect all' covering the vault and Homeworld producers for free contradicts monetization-8, which sells it as a Club perk.",
   "fix": "Keep 2 top-bar pills. Essences show in the Homeworld header, on results and in the Kit. 'Collect all' is free for everyone, so monetization-8 drops the perk."
  },
  {
   "proposalId": "ux-3",
   "verdict": "keep",
   "reason": "One unlock table plus the rule that a counter appears only once it can be spent is the best defence against currency sprawl, and it can be tested.",
   "fix": "Reconcile the ladder's planet numbers with core-loop-3/4/5 debut planets in the single unlocks.ts. Add a unit test that every currency (including Essences, Hearts, Glow and Blueprints) first appears on the same step as its first sink."
  },
  {
   "proposalId": "ux-4",
   "verdict": "change",
   "reason": "Teaching planets, the 'What happened' card and tappable goal chips target the audited failure mode (100% of L21-30 fails at Lab 3 are goal misses). But 'Try with a hint' is offered from the very first fail and pulses the solver's aim. That is free guided play that lowers Star Scope's value and lets players fail once and then 3-star with solver help. It also conflicts with liveops-data-9, monetization-3 and ux-8.",
   "fix": "One ladder. Fail 1: 'What happened' + Try again. Fail 2: a free recipe/tip card, and the continue becomes available. Fail 3: a hint try (the solver's first 3 aims pulse). Help is offered only until the first clear. Stars earned with help count; Wonder does not."
  },
  {
   "proposalId": "ux-5",
   "verdict": "keep",
   "reason": "Visible loss, a feedback governor, showing the Lab bonus separately (fixing churn inflation) and a Mastery segment are all good, with no economy risk.",
   "fix": "Align with the core loop: the queue is current + next 2 (core-loop-2), and Star Scope follows core-loop-5's spec."
  },
  {
   "proposalId": "ux-6",
   "verdict": "keep",
   "reason": "Mostly feel and juice. The one economy effect is 'Momentum paused' instead of reset: Momentum perks make Spark and Scope free, so pausing raises booster supply a little.",
   "fix": "Model Momentum-paused booster supply inside the booster budget (boosters per level at most 0.5)."
  },
  {
   "proposalId": "ux-7",
   "verdict": "keep",
   "reason": "One 'While you were away' card, one bundled notification a day and removing the x2 upsell are right. The lapsed-player warm-up replay must not become a free faucet.",
   "fix": "The warm-up replay pays only normal replay rewards: no Glow, and Essences within the daily harvest allowance. Change copy such as 'your Mill will be full' to the Dock and Workshops."
  },
  {
   "proposalId": "ux-8",
   "verdict": "keep",
   "reason": "It is small (S) and directly implements the kid-safe money rules: a continue never after a win and never on early planets, no first tap that spends, previews and a stronger gate.",
   "fix": "Adopt the unified continue rule: a flat 50 earned gems, at most 2 per level, none on planets 1-10, never after a win, offered only from the 2nd consecutive fail. Share one gate spec with monetization-2."
  },
  {
   "proposalId": "ux-9",
   "verdict": "change",
   "reason": "The accessibility value is high. But the 'Full aim line' assist makes the Aim Guide upgrade free, which is a stardust sink (250/700/1,600 in config.ts), so that sink collapses once assists ship.",
   "fix": "When assists ship, remove the Aim Guide upgrade from Upgrades (before launch no refund is needed) or turn it into a cosmetic aim-line style. Attempts played with assists are not eligible for Wonder."
  },
  {
   "proposalId": "ux-10",
   "verdict": "change",
   "reason": "The UX layer is right, but it builds on outdated or conflicting systems. The first build is a Stardust Mill (retired). 'Base Level computed from rings, buildings and residents' is a third definition, and one that cheap builds can inflate. 'A planet win repairs it' conflicts with meta-homeworld-6's Essence repair. 'Forge +12 life this planet' implies the flat life perks that core-loop-8 and meta-homeworld-2 remove.",
   "fix": "Use meta-homeworld-8's Homeworld Level (the Dock level, gated by its checklist). The first build is a Workshop. Results show rule-perk events ('Weed Burner cleared 2 vines'), not flat life. Use the repair rule from the amended meta-homeworld-6."
  },
  {
   "proposalId": "liveops-data-1",
   "verdict": "keep",
   "reason": "This is the foundation for all measurement. I confirmed its problem statement: 35 direct gem/stardust writes across 8 files. It is aggregate-only, capped at 16 KB and kept in a separate storage key, and the tester-only export keeps the 'Data Not Collected' label.",
   "fix": "Absorb monetization-7 so there is one ledger. Add Essences x5, Hearts, Blueprints, Glow and boosters to the Source/Sink unions. Split every faucet into first clear versus replay so replay farming shows up. Keep the export in the tester build only."
  },
  {
   "proposalId": "liveops-data-2",
   "verdict": "keep",
   "reason": "A sim that follows the real physics, with shadow seeds and depth metrics, is what every balance claim here depends on. The shadow-seed variance finding (standard deviation 14-29 points) is decisive.",
   "fix": "Host core-loop-1's stepRound inside this harness (one harness, not two). Add 'max legal loadout' and 'casual+ladder' policies. Extract the flight code first."
  },
  {
   "proposalId": "liveops-data-3",
   "verdict": "change",
   "reason": "This is the most important economy item, and its bands (active share at least 35%, power at least 28 days, a cap on how far payers get ahead) are right. But the Payer archetype buys a 500-gem pack every 2 weeks, which monetization-1 retires. And it has no bands for the new currencies or for the failure modes found here: idle income outpacing play, stranded gems, the frost glut, Glow pacing, booster glut and replay farming.",
   "fix": "Payer = Starter Crew + season lane + 1 theme per season. Add bands:\n- Idle stardust at most 1.5x active per day (Regular, days 1-60).\n- Every currency (stardust, gems, 5 Essences, Hearts, Glow, Blueprints) still has something left to buy on day 60.\n- Earn-only gem supply per season at most 1.2x the new gem sinks added that season.\n- Glow: Regular finishes the free lane in 6-8 weeks, Engaged no sooner than 4.\n- Frost 3-10 per 10 levels from all sources.\n- Boosters at most 0.5 per level.\n- Replays are at most 30% of Essence income."
  },
  {
   "proposalId": "liveops-data-4",
   "verdict": "keep",
   "reason": "It is small (S), fixes levels through reviewable data diffs (seed salts), pre-flights the Daily Planet and catches real walls (L24: 88% decent fail on a Normal planet).",
   "fix": "Re-run it after core-loop-1/3/4 land, because the rules stream changes difficulty. Keep the difficulty bands as one table in tuning.ts, shared with core-loop-1 and monetization-3."
  },
  {
   "proposalId": "liveops-data-5",
   "verdict": "keep",
   "reason": "Turning the non-negotiables into failing tests, plus a central tuning file with snapshot totals, is exactly what an economy with no server needs.",
   "fix": "Add lint rules:\n- No item has both a gem price and a USD price.\n- No consumable currency product exists (if the charter is adopted).\n- A continue-rule test matching the unified rule.\n- The max-loadout sim gate.\n- A forward-clock test for every producer."
  },
  {
   "proposalId": "liveops-data-6",
   "verdict": "change",
   "reason": "The authored calendar is good: per-theme normalisation fixes the 20x spread, festival editions avoid year-two reruns, and catch-up is kind. But the seasonal track is fed by 'stars and event tokens', which conflicts with monetization-4's Glow. The multipliers are typed by hand (Frost x6 and so on) and go stale as soon as reactions and Troubles change biome mixes. A 98-day authored runway on every build is heavy for a solo owner.",
   "fix": "One season currency (Glow) with a daily cap. `npm run almanac` writes event thresholds derived from the current sim instead of hand-typed numbers. The runway test covers generated content (Daily and Voyage pre-flight). Authored theme rows are optional, with the modulo rotation as fallback."
  },
  {
   "proposalId": "liveops-data-7",
   "verdict": "change",
   "reason": "Numeric ship gates and a stop rule are right. But M5's 'Ring 5 not before day 45' conflicts with meta-homeworld-8's pacing and with the Dock replacing rings. M5's 'Homeworld takes 40% or more of stardust spend in days 14-60' means nothing when stardust sinks run out around day 9 (critic/dock.mjs). Several revenue and funnel gates rely on T2 testers, who are adults making sandbox purchases.",
   "fix": "Restate M5 in Essence terms: Homeworld Lv5 no earlier than day 28 for Regular; all Workshops Lv5 no earlier than day 28; no currency stranded by day 60. Revenue and funnel gates come only from T3 (App Store Connect units, proceeds and refunds per SKU) and T1 journey bots. Add the max-loadout T1 gate to M4 and M5."
  },
  {
   "proposalId": "liveops-data-8",
   "verdict": "keep",
   "reason": "Protects the purchase paths (Ask to Buy, replayed transactions, Screen Time), saves and layout; S0 severity for money and privacy issues is right.",
   "fix": "Add a journey that replays a won level 20 times and checks the faucet caps (Essence harvest allowance, Glow cap), plus clock-forward cases for the Dock, Workshops, expeditions, Commissions and season dates."
  },
  {
   "proposalId": "liveops-data-9",
   "verdict": "change",
   "reason": "Free, deterministic help at walls is the right replacement for continue pressure. Exploits: 'fails' is undefined. If a restart counts, a child can restart 3 times in seconds for +2 throws, and the ladder also works on replays when chasing 3 stars or Wonder. It duplicates the ux-4, ux-8 and monetization-3 ladders.",
   "fix": "A fail is an attempt that ran out of throws after using at least 50% of them; restarts and quits do not count. Help is offered only until the first clear. Buddy Helper throws make an attempt ineligible for Wonder. Use the single ladder spec (see ux-4)."
  },
  {
   "proposalId": "monetization-1",
   "verdict": "change",
   "reason": "The charter and a store with no currency packs match the non-negotiables and the EU DFA risk. Re-running monetization.model.mjs, gem packs are $0.018 of the $0.076 per-install baseline. But:\n(a) The 3.9x uplift assumes a 1.1x retention lift and a cosmetic-only Starter Crew converting 1.6% of installs. Today's Starter, with 300 gems and 15 boosters, converts about 1.05%. A cosmetic-only $2.99 pack is unlikely to do better.\n(b) Gems become a second earn-only soft currency at about 100 a day (about 5,600 per 8-week season) against a fixed gem catalogue of about 2,670, so gems are stranded within about 4 weeks.\n(c) It removes the premise behind other proposals' 'makes gem packs worth buying' arguments and their dual gem-or-dollar prices.",
   "fix": "Adopt it, and re-run the model with Starter Crew converting at most 1.0% of installs and a 1.0 lift in the mid case. Either cut free gems to about 60 a day (lower quest gems) or add at least 3,000 gems of gem-priced single items per season. Enforce one currency per item in store.test.ts."
  },
  {
   "proposalId": "monetization-2",
   "verdict": "keep",
   "reason": "A parent-side store, Gate v2, the Wishlist and Family Sharing all fit the buyer. The spend cap is stored only on the device (a reinstall resets it, and there is no cloud save), so it is a reminder, not a control.",
   "fix": "Share one gate spec with ux-8. Label the cap as a reminder and point parents to Screen Time. Measure the wishlist-to-purchase share only in tester builds."
  },
  {
   "proposalId": "monetization-3",
   "verdict": "change",
   "reason": "The guardrails are right, including the free relief valves and the test that greedyPlan 3-stars every planet with base rules and no boosters. But its power cap ('perks at most 10% of a planet's 3-star target') is a different metric from everyone else's '+15pp 3-star rate'. Its continue rule (flat 50, at most 2, none on planets 1-3) conflicts with ux-1, ux-8 and liveops-data-5.",
   "fix": "One power budget: the max legal loadout adds at most 15pp decent-aware 3-star versus base on normal planets 21-60, and decent Hard fail stays at least 20%. One continue rule: a flat 50 earned gems, at most 2, none on planets 1-10, never after a win, from the 2nd consecutive fail only."
  },
  {
   "proposalId": "monetization-4",
   "verdict": "change",
   "reason": "A recurring, kid-safe revenue line; the Archive and retroactive claims remove FOMO. But Glow is calibrated for 1 win + 1 quest a day (54 days). A Regular player (6 wins + 3 quests + 3 commissions) earns about 255 Glow a day and finishes in 8 days, Engaged in 6 and Casual (3 levels a day) in 15 (critic/misc.mjs). The likeliest buyers finish in week 1-2 and then see nothing new for 6 weeks. If replays pay Glow the way they pay stardust today, the lane can be farmed in an hour. Its price ($3.99) and cadence conflict with meta-homeworld-9 and liveops-data-6.",
   "fix": "Cap Glow at about 40 a day (for example the first 2 wins + 1 quest count), with overflow going to an archived track. Wins pay Glow only on a first clear or new stars, never on replays, and the Daily Planet pays once a day. 20 tiers x 100 then takes about 7 weeks for anyone who plays daily. Keep liveops-data-6's last-2-weeks double progress for catch-up. One price: $3.99."
  },
  {
   "proposalId": "monetization-5",
   "verdict": "change",
   "reason": "A broad catalogue, the readability rule and a stardust tier are good. But stardust cosmetics at 500-5,000 cost less than a day of idle income at L30 even under the proposed Dock (about 10k a day for Regular), so the whole stardust tier is bought within days and stardust has no late-game use again. It launches 3 themes with outfits inside them, which conflicts with meta-homeworld-9 (5 themes, outfits sold separately). The 1.2% x 1.8 packs figure is an assumption.",
   "fix": "Price stardust cosmetics at 5k-50k, rising within each series, and add stardust single items every season as the late-game stardust sink. USD sets are USD-only. Reconcile with meta-homeworld-9: 3 themes at launch with outfits inside; outfit-only sets in dollars later."
  },
  {
   "proposalId": "monetization-6",
   "verdict": "change",
   "reason": "The placement map, never-show contexts and frequency cap are right. But the Collector's Edition breaks its own price rule at launch: 60% of about $26 of parts is $15.60, less than $19.99. The Explorer Bundle's 'current Season lane' needs a deterministic season after Restore, since there is no server.",
   "fix": "Launch the Collector's Edition only once its parts are worth at least $33.32 (after about season 1), or price it at $14.99 at launch. The Explorer Bundle grants the season whose dates contain the transaction's originalPurchaseDate. Measure the ladder with App Store Connect units, not the ledger."
  },
  {
   "proposalId": "monetization-7",
   "verdict": "cut",
   "reason": "It duplicates liveops-data-1 (the ledger) and liveops-data-7 (evidence tiers). A Share-sheet export in production risks the 'Data Not Collected' posture, which liveops-data-1 avoids with a tester-only build. Per-territory price tests at about 10k DAU and 5-8% conversion cannot reach significance.",
   "fix": "Merge its funnel counters and offer-context tags into liveops-data-1's ledger. Move price and trial tests into liveops-data-7 as directional reads of App Store Connect data (T3). The export stays tester-only."
  },
  {
   "proposalId": "monetization-8",
   "verdict": "change",
   "reason": "P2, with launch gated on 2 on-time seasons, is right. But its 'Collect all that also gathers Homeworld producers' is free for everyone in meta-homeworld-1, ux-2, ux-7 and ux-10. It would be worthless, or, if those proposals slip, a convenience sold for money.",
   "fix": "Drop the Collect-all perk. The Club is the season lane + the monthly drop + a badge + extra outfit slots. Check cannibalisation of the season lane with App Store Connect data."
  }
 ],
 "missing": [
  "A single power budget across every player-side bonus: Workshop/Lab perks, evolutions, Kit Helper/Ward/Evolved shot, Buddy Power, the Calm aura, motes, Rainbow, Greenhouse boosters, continues, ladder throws and assists. It needs a 'max legal loadout' sim bot and a rule of one pre-level mitigation per Trouble. Each PM guards only its own system at +15pp, and the bonuses add up. Example: on a 12-throw normal Trouble planet, Calm + Buddy Power + Ward leave 0 effective hazard ticks.",
  "Replay farming of the new faucets. dropsFor pays Essences on every win, replays included (constellations.ts), so a 1-minute frost-heavy replay pays up to 13 frost and Essences now buy shot power. Glow from wins, Commission progress and event tokens have the same risk. Needed: pay only on a first clear or new stars, or a daily harvest allowance, plus a ledger split of first-clear versus replay income.",
  "Idle income that does not grow with the galaxy: a flat rate per Dock level, or a Dock fuelled by wins, with an 'idle stardust at most 1.5x active' CI band. The proposed 20*sqrt Dock gives about 12% active share at L30 against the 35% target (critic/dock.mjs).",
  "The gem economy after the store reset. With gem packs retired, gems are earned only, at about 100 a day (about 5,600 per 8-week season), against a fixed gem catalogue of about 2,670. No PM sizes gem sinks per season or trims gem faucets, so gems are stranded within about 4 weeks.",
  "A late-game stardust sink. Even with Workshops, stardust sinks run out around day 9 for a Regular player (day 7 engaged). Proposed stardust cosmetics (500-5,000) cost less than a day of income. Needed: stardust cosmetics that rise in price, and stardust-priced Orbit Monuments, added every season.",
  "One owner and one model for Essence supply and demand. Frost is being fixed separately by Glacier, Frost Creep, Workshops, the Refinery, expeditions, fronts, Meteor Watch and Commissions. Together that is about 87 frost a day against about 455 total demand, so the glut arrives within a week. Needed: every source against every sink (Workshops, Homeworld checklist, Star Atlas, dyes, repairs) in tests/economy.sim.ts.",
  "A booster supply cap. Two Lv5 Greenhouses make 12-16 boosters a day, and meta-homeworld-7 lets players choose the type, against about 6 levels a day. That is a +3-throw Comet Shower on every level, and neither the solver nor any band accounts for boosters.",
  "A guard against moving the clock forward. With no server, a forward clock fills the Dock, Workshops, Refinery and expeditions, resets the Heart cap and Commissions, reveals season dates, and lets players pre-play future Daily Planets for the Game Center daily leaderboard. Only backward-clock guards are proposed.",
  "Metrics that can actually be measured. Many success metrics need production data that never leaves the device: preview-to-buy rate, wishlist share, share of players equipping a look, 'vs the pre-release cohort' when there is no launched cohort. They should be restated as T1 (sim or tests), T2 (adult testers, sandbox) or T3 (App Store Connect aggregates).",
  "Before-launch simplification. No in-app purchase exists in App Store Connect and there are no live players, so skip the save migrations, grandfathering and thank-you items (PROFILE_VERSION 4, the Gilded theme, letters about the Lab changing) and reset tester saves instead.",
  "An exchange-rate sheet for the new currencies: the Essence-to-stardust rate implied by Workshop prices, the Refinery ratio, and the value of Blueprints and Hearts. liveops-data-3's sheet covers only gems and stardust.",
  "Star inflation. Lowering TUNE.f3 to 0.90, plus Workshops and the Kit, raises 3-star rates, so the Star Road (260 stars), Explorer Rank, Starfall Week and any star-fed track end sooner. They need re-sizing to the new 3-star rate."
 ],
 "conflicts": [
  "Shot upgrades: meta-homeworld-2 (Workshops priced in Essences; Reach/Power/Echo paths with free respec; evolution needs Lv5 + a Master resident + a Guardian win) vs core-loop-8 (Lab 2.0 priced in stardust at 400/1,200/3,000/7,000; fixed GUARD/FUSION+/NOVA+/EVOLUTION ladder; evolution hatches after the next Guardian). monetization-3 and monetization-5 assume paths.",
  "Creature traits: core-loop-7 (4 traits by home biome: Fireproof, Frostproof, Deep Roots, Swimmer; legendaries get Calm, ticks every 6 throws) vs meta-homeworld-4 (5 traits by Essence family: Sturdy, Fire-proof, Rain-maker, Frost-proof, Rooted; legendaries get every trait). Tide Otter is a Swimmer in one and Rooted/leaf in the other.",
  "Hazard roster and names: core-loop-4 (Ember Vent, Frost Creep, Tanglevine, Meteor) vs meta-homeworld-3/4, ux-4 and monetization-3 (Wildfire, Deep Freeze, Dust Drift) vs meta-homeworld-6 fronts (Meteor Shower, Blight, Frostbite, Heat Wave).",
  "Companion power in levels: core-loop-7 Buddy Power (from sightings) vs meta-homeworld-3/4 Kit Helper (a resident that replaces the Buddy on screen) vs liveops-data-9 'Buddy Helper' (+2 throws after 3 fails). Stacked, they remove hazards.",
  "Continue and hint rules: ux-1 (none on planets 1-10) vs ux-8 (none on 1-10 or after a win; only from the 2nd consecutive fail; prices unchanged at 40/70/110) vs monetization-3 (flat 50, at most 2, none on 1-3; Hint try after the 2nd fail) vs liveops-data-5 (fixed costs, at most 3, none on L1-3) vs monetization-6 (none on 1-3) vs ux-4 ('Try with a hint' from the first fail) vs liveops-data-9 (tip after 2 fails, +2 throws after 3, guided throw after 5).",
  "Pricing currency: monetization-1 (gem packs retired; gems earned only; one item, one price, one currency) vs dual gem-or-dollar prices in meta-homeworld-9 ($2.99 or 360 gems; $1.99 or 240 gems), core-loop-3 (120 gems or a $1.99 set), core-loop-5 (150 gems or $2.99), core-loop-6 (80-150 gems or $0.99-1.99) and core-loop-8 (200 gems or $1.99), and vs the argument in meta-homeworld-1/4/7 that removing free gems 'makes gem packs worth buying'.",
  "Season pass: monetization-4 ($3.99, 8 weeks, 6.5 a year, 20 tiers of Glow from wins, quests and commissions) vs meta-homeworld-9 ($4.99 lane, 5 a year, 8-10 weeks) vs liveops-data-6 (8-10 weeks, about 5 a year, fed by stars and event tokens).",
  "Architecture themes: meta-homeworld-9 (5 at launch: Coral Reef, Candy Workshop, Crystal Spire, Snowglobe Village, Lantern Harbour; outfit sets sold separately) vs monetization-5 (3 at launch: Tidepool, Comet Candy, Crystal Frost; 2 outfits inside each theme; a $4.99 Deluxe).",
  "The one Homeworld number: meta-homeworld-8 (Homeworld Level = Star Dock level through a checklist) vs ux-10 (Base Level computed from rings, buildings and residents) vs monetization-3/4 and ux-10 ('Radiance') vs liveops-data-7 (Ring 5, although the Dock replaces rings).",
  "Homeworld pacing: liveops-data-7 M5 (Ring 5 no earlier than day 45 for Regular) and liveops-data-3 (power sinks last at least 28 days) vs meta-homeworld-1/2 sizing (Homeworld Lv5 about day 14 and all Workshops Lv5 about day 21 for Regular) and meta-homeworld-8 (Lv2 within 2 days).",
  "Stardust Mills: meta-homeworld-1 retires them vs ux-1 and ux-10 (the guided first build is a Stardust Mill) and ux-7 ('your Mill will be full').",
  "Showing materials/Essences: meta-homeworld-1 (the results headline from planet 5, plus the Homeworld header) vs ux-1 (hidden until the Star Atlas) vs ux-2 (only in the Atlas) vs ux-3 (on results from planet 12).",
  "Collect all: free for everyone in meta-homeworld-1, ux-2, ux-7 and ux-10 vs sold as an Explorer Club perk in monetization-8.",
  "Duplicate ledgers: liveops-data-1 (export compiled into the tester build only) vs monetization-7 (a gated Share-sheet export in production).",
  "Duplicate sim harnesses: core-loop-1 (stepRound bot profiles in difficulty.sim.ts) vs liveops-data-2 (tests/sim with flight.ts policies). Three homes for the economy sim: meta-homeworld-1, liveops-data-3 and monetization-7 (promoting monetization.model.mjs).",
  "Queue and Star Scope: core-loop-2 (current + next 2) vs ux-5 (current + next 3). Star Scope shows 5 upcoming objects plus Fusion outlines in core-loop-5, and a 2-step preview in ux-5.",
  "Debut planets: core-loop-3 (Steam at p5 through Scorch at p14) and core-loop-4 (first Trouble at p14) vs ux-3/ux-4 (first Fusion at P7, first hazard at P13). core-loop-5 (the Supernova auto-arms at planet 3) vs ux-3 (Supernova as a choice at P9).",
  "Homeworld repair: ux-10 (a planet win repairs it) vs meta-homeworld-6 (one tap plus 5-20 Essences).",
  "Parental gate v2: ux-8 (a 3-digit number in words, a 30 s cooldown and a hold) vs monetization-2 (a 21-99 number in words and a 1.5 s hold).",
  "Third drone: meta-homeworld-1/9 (earned at Homeworld Lv3) vs monetization-1/3 (a free Ring 3 reward, although rings are replaced by the Dock).",
  "Difficulty bands: core-loop-8 (no normal planet below a 20% decent-aware fail floor at max Lab) vs liveops-data-4 (normal decent band 0-35%) and core-loop-1 (casual normal fail at most 25%). monetization-3's power cap (at most 10% of the 3-star target) vs '+15pp 3-star rate' everywhere else.",
  "ux-10's 'Forge +12 life this planet' implies flat life perks, which core-loop-8 and meta-homeworld-2 remove."
 ]
}
```

## critic:engineering

```json
{
 "lens": "Engineering manager: I judged how feasible, risky and costly each proposal is in this codebase. The core and meta modules are pure. A greedy solver sets every target. LevelScene in game.ts is 1,615 lines. There are about 1,116 i18n keys in each of 5 locales, 84-85 vitest tests and no server. The game has not launched: there is no developer account, no App Store Connect products and no TestFlight yet. Sizes: S = 3 dev-days or less, M = 1-2 weeks, L = 3-5 weeks, XL = more than 5 weeks. I measured makeLevel at 12.8 ms per planet in Node (1.53 s for planets 1-120). The core-loop prototype takes about 41 ms per planet.\n\nBUILD ORDER\nM0, foundations with no visible change (~4 weeks):\n- stepRound with rules off, plus a byte-identical snapshot of LevelDefs 1-60\n- memoised makeLevel and a cheap levelMeta\n- RoundModifiers with a per-mode allowlist\n- flight.ts extracted from game.ts\n- wallet.ts plus the ledger\n- tuning.ts, policy lint and privacy lint\n- level-lint report (warn only) and sim:quick in CI\n- save goldens and time-travel tests\n- Lab Phase 0 hotfix\n- Homeworld clock guards and an actionable-only badge\n- the double-notification fix\n\nM1, safe money and the first session before launch (~5 weeks):\n- owner's currency decision, then the catalogue reset\n- one Parent Corner and Gate v2\n- continue, booster-tap and receipt rules\n- offer placement map, Starter Crew and Season 0\n- ux-1 onboarding and the modal governor\n- ux-7 While-you-were-away card\n- ux-2 part 1: back stack, Next Up, badges and the 320x568 fix\n- unlocks.ts and Coach 2.0\n- Playwright journeys J1 and J3\n- text size\n- free third drone and no x2 button\n\nM2, reactions and readable throws (~5 weeks):\n- core-loop-2 with ux-5's feedback governor merged in\n- core-loop-3\n- Nova 2.0 without Motes\n- teaching planets and the NEW FUSION card\n- fusion juice and the round tally\n- Clear palette and biome markers\n- freeze the rules, then re-salt the wall levels\n\nM3, Troubles and traits (~5 weeks):\n- Ember Vent, Frost Creep and the Forecast strip\n- one trait table and Buddy Power\n- one assist ladder and the 'What happened' card\n\nM4, shots learn tricks at home (~5 weeks):\n- Workshops house the Lab, using core-loop-8's single ladder with opt-in evolutions\n- power and reach moved into KindDef\n- the economy sim as the gate\n\nM5, the Homeworld loop (~6 weeks):\n- Homeworld Level, Commissions and a guided first hour\n- jobs, Hearts, and a Helper that is the Buddy\n- expedition destinations\n- the currency reshuffle\n- the five tabs\n\nRemix (M) can run in parallel any time after M0, because it only calls makeLevel. It is best done after M3 so it is tuned once, on the final rules.\n\nLAUNCH CANDIDATE: M0 + M1 + M2, plus Remix. The tester and App Store gates only mean something once real players exist.\n\nPOST-LAUNCH: Seasons 1 and later, and cosmetic lines as their surfaces ship; the Almanac; the scorecard's tester and App Store tiers; Wonder par; Star Motes; per-object flight physics. After that, revisit adjacency, Homeworld fronts and the Club.\n\nSHARED BUILDS\n- stepRound: the solver, the aim preview, the sim bots, LevelScene, teaching planets and Commission events all use it.\n- RoundModifiers: Lab and Workshops, Kit, Buddy/Helper, Momentum, boosters, permanent upgrades, assists and sky events.\n- One trait table and one hazard glossary with one Forecast strip.\n- One preview card and popup governor.\n- unlocks.ts, and one Next Up picker.\n- One assist ladder.\n- One wallet and ledger, and one economy sim.\n- One cosmetic slot and draw-hook registry with one try-on renderer.\n- One Parent Corner and one parental gate.\n- One date-seeded scheduler for quests, Commissions, events and seasons.",
 "verdicts": [
  {
   "proposalId": "meta-homeworld-1",
   "verdict": "change",
   "reason": "The diagnosis is right: the Homeworld is a closed loop, the idle galaxy income (1,049/h at L30) dominates play, and 'x2 for 10 gems' is an arbitrage. But it bundles about 8 changes into one PROFILE_VERSION 4 release: materials renamed to Essences, Mills to Workshops, the Grove to a Refinery, charm to Wards, a new Dock rate, x2 removed, Hearts, and new expedition loot. That touches constellations.ts, homeworld.ts, the 1,325-line Homeworld screen, results and about 100 strings. It is L-XL, and every piece depends on an economy sim that does not exist yet. Retiring Mills also collides with the guided 'build a Mill' step in ux-1 and ux-10. The game is pre-launch, so the risk is scope, not saves.",
   "fix": "Split it. Ship now (S, in M0/M1): remove x2-for-10-gems; make Collect all include Homeworld producers and fire track('collect'); move the galaxy to the concave 20*sqrt(sum planetRate) rate once liveops-data-3's sim checks it. Ship with the Homeworld milestone: materials renamed to Essences and spent by Workshops; Mills converted to Workshops in the same release that changes the guided build; the Refinery as a 3:1 swap button on the Workshop panel, not a new building; charm dropped. Decide Grove gems only after the owner's gem-pack decision. If packs are retired, free gem faucets are not a revenue problem. Use one migrate() step with a save golden and no 'shelf'."
  },
  {
   "proposalId": "meta-homeworld-2",
   "verdict": "change",
   "reason": "Putting the Lab inside Homeworld Workshops is the best meta-to-core link in the set, and it is cheap: Workshop level = p.lab[kind], migrated 1:1. But it defines a second upgrade design (Reach/Power/Echo paths, a 3-1-0 cap, free respec) that contradicts core-loop-8's fixed ladder. Paths multiply the sim space, because every legal build of all 6 objects must stay inside the +15pp band. A Reach path is non-monotone: a wider splash can ruin neighbours and goals, as today's unmodelled Wide Impact upgrade already can. That stops solver targets being a lower bound. The evolution gate chains three systems (Lv5, a Master resident seen 5 times, and a Guardian win). Workshop Essence production adds yet another faucet.",
   "fix": "Keep the six Workshop buildings, Lv2 at Homeworld Lv1, the Essence plus stardust costs, and the competitive and Remix exclusions. Use core-loop-8's fixed per-object ladder as the effects, with no paths or respec in v1. Evolution = Workshop Lv5 plus the next Comet Guardian win. Every evolution is an opt-in toggle per level (in the Kit), so the base shot is always available. Drop Workshop Essence production. Sim guard: with all Workshops maxed and evolutions on, the decent-aware 3-star rate stays within +15pp of base."
  },
  {
   "proposalId": "meta-homeworld-3",
   "verdict": "change",
   "reason": "The Kit is the visible 'your Homeworld helps you' payoff and is M. But each of its three item kinds depends on another unbuilt system: Helpers from -4, Wards from -6 (which I cut) and evolutions from -2. Slots scale with a Homeworld Level that does not exist yet. It also adds a row to a pre-level sheet the UX audit already found clipped at 320x568. It must use the same modifier pipeline as the Lab, Momentum and boosters. Otherwise it will leak into competitive modes, as upgrades already do today.",
   "fix": "v1 Kit = one slot: a Helper creature (the Buddy, merged with core-loop-7's Buddy Power) plus the evolution toggle. Add no Ward charms until a Homeworld threat exists. Implement it as RoundModifiers with a per-mode allowlist: on in campaign, Voyage and Zen; off in Daily, Rush, Challenge and Remix. Remember the last choice and show the forecast suggestion inline. Add more slots only after Homeworld Level ships."
  },
  {
   "proposalId": "meta-homeworld-4",
   "verdict": "change",
   "reason": "Jobs and traits answer 'what are the characters for'. But its trait table (5 Essence-family traits; legendaries have all of them) contradicts core-loop-7's (4 biome traits; legendaries get 'Calm'). For example, Tide Otter is leaf/Rooted here and Swimmer there. Job bonuses scaled by rarity (+15% x rank) stack with adjacency and the Observatory, which makes balance opaque. The rule that a species moves in only once its family's Workshop exists would block or evict residents children already have.",
   "fix": "Use one trait table in core (SpeciesDef.trait, owned by core-loop-7) for Helpers, jobs and expeditions. Jobs: one slot per Workshop, a flat +25% on a match and +10% otherwise, with no rarity multiplier. Rename friendship to Hearts with the 5-per-day cap, and keep the tiers and accessories. Keep current residents where they are, with no Workshop move-in gate. Drop the Master-resident evolution requirement."
  },
  {
   "proposalId": "meta-homeworld-5",
   "verdict": "cut",
   "reason": "Adjacency feeds and clashes, plot pressure and a Store mechanic add a second chemistry system, plus a ghost-preview UI in the 1,325-line Homeworld screen, before the base even has a loop. Its value is unproven: the only success metric is that players move a building. It compounds multipliers with jobs and the Observatory. It also adds a new concept for 6-year-olds just when ux-3 asks for one concept at a time.",
   "fix": "Defer until after the Homeworld milestone's ledger data is in. If revisited, ship feeds only (+%, no clashes, no Store), using the same element table as the in-round reactions."
  },
  {
   "proposalId": "meta-homeworld-6",
   "verdict": "cut",
   "reason": "XL for its value. Meteor Watch is a new mini-game: LevelScene on a globe of plots, moving telegraphed meteors, catch physics and a Blight variant. Fronts add a passive loss state (Dimmed buildings, Essence repairs, rules for resolving pending fronts) that becomes a chore and a 'lost my stuff' risk for children. core-loop-4 delivers the owner's negative interactions inside the round, better and cheaper. It also depends on -3, -4, -5 and the core hazard roster.",
   "fix": "Defer past launch. If a Homeworld threat is wanted later, make it positive-only: an optional date-seeded Meteor Shower round on the normal LevelScene that pays star ore, with no Dimmed state and no repairs. Keep today's debris clearing."
  },
  {
   "proposalId": "meta-homeworld-7",
   "verdict": "change",
   "reason": "It fixes frost and ember starvation using data the save already has (GalaxyPlanet.species, then home biome, then family). It is deterministic and needs no new save shape. Teams of 3, Far Side routes, Blueprints and a second concurrent slot double the expedition UI for little extra value.",
   "fix": "v1 = choose a destination from p.galaxy plus one resident, preview the Essence yield, and give +50% on a family match. Keep the 1h/4h/8h routes and the win speed-up. Drop teams, Far Side, Blueprints and the second slot. Remove the gem and booster loot only together with the owner's gem-pack decision. S-M."
  },
  {
   "proposalId": "meta-homeworld-8",
   "verdict": "change",
   "reason": "Goals, a guided first hour and one level number are the cheapest high-value Homeworld fixes. The housekeeping is S and should ship now: badge counts only actionable items, clock guards on Building.since/done and Expedition.ends, Pass hours in capHours, and removing the dead 'started' field. But the level-up checklist needs Signature Feats that depend on Fusions, Troubles and Super Hard. Orbit moons, Monuments, a new Game Center leaderboard and 6 achievements (whose IDs the owner must create in App Store Connect) expand the scope.",
   "fix": "M0: the housekeeping. Homeworld milestone: Homeworld Level = the current ring, renamed, shown on Home and the Passport, with tier art changing each level. Levelling up takes a chapter, stardust and Essences; feats can be added later. A board of 3 date-seeded Commission cards, driven by stepRound events (onReaction, onCountered, goals), replaces the 6h requests and adds 'home' and 'commission' QuestEvents. Add the 4-step first hour, with ux-10 merged in. Defer Orbit, Monuments and the leaderboard. Batch new achievements with the next App Store Connect setup."
  },
  {
   "proposalId": "meta-homeworld-9",
   "verdict": "change",
   "reason": "It duplicates monetization-5's Homeworld Themes with different names (5 themes vs 3) and different pricing ($2.99 or 360 gems vs USD non-consumables). Its separate pass lane conflicts with monetization-4's single season lane. Each theme is code-drawn art for every structure type and tier in structures.ts, and meta-homeworld-2 adds 6 new structure types, so each theme gets more expensive as buildings are added.",
   "fix": "Fold it into monetization-5 as one Homeworld Theme line with one pricing rule. Launch 2 themes once the Workshop art is final, not 5. Its pass-lane items go into monetization-4's single season lane. Keep the 'Money buys looks, never power or time' copy and the shared try-on renderer. Make the third drone free for everyone. No Gilded compensation is needed, because no IAP exists in App Store Connect yet."
  },
  {
   "proposalId": "core-loop-1",
   "verdict": "keep",
   "reason": "This is the foundation for everything. It removes the three drifting copies of throw logic (impact in world.ts, greedyPlan, and play() in tests/difficulty.sim.ts), so the aim preview, the solver and the bots agree. The Solver 0 kid floor and the separate `${seed}-rules` rng stream keep both the beatability invariant and the existing planets' identity. The cost is real: makeLevel runs 12.8 ms per planet today and the prototype 41 ms, which would be roughly 150 ms per Home render on an A9. So memoisation and the levelMeta split are mandatory, as proposed.",
   "fix": "Land it first with empty rules and a snapshot test proving byte-identical LevelDefs for planets 1-60, then turn reactions on. Give stepRound a RoundModifiers input with a per-mode allowlist. That fixes today's leak: Extra Throws, Wide Impact and Aim Guide apply in Daily and Challenge, because sceneOpts only strips the Lab. Key the memo cache on a RULES_VERSION. Specify that Trouble ticks count every thrown object, including misses."
  },
  {
   "proposalId": "core-loop-2",
   "verdict": "keep",
   "reason": "It makes losses and reactions visible, which the kid-safety of every new rule depends on. Today settle() computes lost but drops the sector, and onSpecies fires again on re-spawns, which allows farming. It is M, well scoped, and reuses drawLanding's per-sector cache. ux-5 overlaps almost all of it.",
   "fix": "Make this the owning spec for the HUD and preview, and merge ux-5's feedback governor and outlines into it. Queue = current plus next 2. Change settle() to return lost as {id, at}. Build the preview card, chips, ghosts and popup lanes as their own modules (hud.ts, preview.ts) instead of growing game.ts."
  },
  {
   "proposalId": "core-loop-3",
   "verdict": "keep",
   "reason": "The strongest evidence in the set. The prototype on the real world.ts shows reaction-aware play earns +14.8% vs +3.1% for blind play, the best sector changes on 16.8% of throws, and the object spread falls from 2.8x to 1.7x. Reactions only change terrain and are deterministic, so the solver models them exactly and both beatability and competitive fairness hold. It is L because of the effects, 8 sounds, the Lifebook chart and about 24 strings in each of 5 locales.",
   "fix": "Take debut planets from the shared unlocks.ts table (ux-3) instead of hard-coding p5-p14, so P5 is not both Steam and the Homeworld. Ship all 8 reactions, but hold the gem-priced FX line until the owner decides the currency question. Rainbow's +1 throw must live inside stepRound so the solver counts it."
  },
  {
   "proposalId": "core-loop-4",
   "verdict": "change",
   "reason": "It delivers the owner's negative interactions with a forecast, a counter and the solver's 1-tick projection (which recovers 86% of the hazard loss), so fairness can be tested. But four Troubles plus Guardian meteors, firebreak rules and a forecast strip is L-XL in one go. Meteor also adds a physics interaction (hitting a meteor in the sky) the solver does not model. It says there are no Troubles on planets 1-13, yet debuts Meteor on the p10 boss. It also puts Troubles into Remix, against REMIX.md's rule of one twist and no stacked penalties.",
   "fix": "v1 = Ember Vent and Frost Creep, which share one code path ('nearest sector within ±2 per tick'), plus firebreaks, the Forecast strip and teaching planets. Tanglevine comes next. Meteor and Guardian meteors wait for v1.1, after flight.ts exists. No Troubles in Remix. Add the Daily 'Weather Report' only once liveops-data-4 pre-flights daily planets."
  },
  {
   "proposalId": "core-loop-5",
   "verdict": "change",
   "reason": "A player-armed Supernova with a different effect per object and churn-proof charge is a real decision. It is cheap, because the solver already fires Novas, and auto-firing stays a lower bound. Star Motes are the expensive part: pickups placed in space need flight collision, exclusion from the solver, a mid-round WILD POD chooser and more HUD, all for a mechanic that is pure upside.",
   "fix": "Ship Nova 2.0: the new charge rules, the 12/18 thresholds, tap to arm, and a Nova per object. Ship the Life Spark retarget too. Defer Star Motes until flight.ts and Sim v2 exist, and drop WILD POD. Use this proposal's Star Scope rescope (upcoming objects plus fusion outlines), not ux-5's. Keep the sky-event 'charges 2x' and meteor-shower hooks working with the new thresholds."
  },
  {
   "proposalId": "core-loop-6",
   "verdict": "change",
   "reason": "Moving power and reach into KindDef, guarded by a 17x6 snapshot test, is S and gives Lab 2.0 something to upgrade. Per-object weight and speed change the flight of every shot. That needs a reachability sweep, a sim that scales aim error with weight, and a physics-accurate preview: M-L risk for feel alone. The deal re-weight changes every generated queue, which breaks core-loop-1's promise that planets keep their start and deal.",
   "fix": "Now: data-driven power and reach, the object card UI and the job text. Defer weight and speed until flight.ts, the Scene Bot and the reachability test exist. Do the deal re-weight once, in the same release as the Solver 2.0 retune (pre-launch, so regenerating levels is free), or only through the rules stream."
  },
  {
   "proposalId": "core-loop-7",
   "verdict": "change",
   "reason": "It makes creatures matter during a round, through deterministic terrain rules the solver can model (firebreaks), and Buddy Power is pure upside kept out of the solver. But this proposal and meta-homeworld-4 define two different trait tables and two different ways a creature helps in a level (Buddy Power vs a resident Helper).",
   "fix": "This proposal owns the single trait table (4 traits plus Calm) in world.ts, and meta-homeworld-4 uses it. Merge Buddy and Helper: the Kit's Helper slot is the Buddy, picked from residents or sightings, with this proposal's once-per-level power. It is off in competitive modes through the modifier allowlist."
  },
  {
   "proposalId": "core-loop-8",
   "verdict": "change",
   "reason": "Replacing the Lab's flat life bonus (which takes score/target from 1.08 to 2.02) with conditional rule perks is the right fix. Phase 0 is an S hotfix that should ship now: Bloom and Magnet only on net-positive throws, and no Lab bonus in a negative preview. But the Lv2 GUARD perks need Troubles to exist. Several Lv5 evolutions replace terrain rules: Obsidian Flow stops drying water, Solar Flare heats only where life is 2 or more, and Glacier Comet changes what ice makes. For that player, these can remove the only route to a goal the solver guaranteed.",
   "fix": "Phase 0 goes in M0. Phase 1 comes after core-loop-4 and lives in meta-homeworld-2's Workshops, as one ladder with no paths. Every evolution is an opt-in toggle per level in the Kit, never forced. Add a CI test that greedy play with every perk and evolution enabled still meets each level's goals, alongside the +15pp band."
  },
  {
   "proposalId": "core-loop-9",
   "verdict": "keep",
   "reason": "S and status-only. The par table is precomputed offline (par.json), so there is no runtime cost, and it gives sharp players something to chase using the +32% planning headroom. The one coupling: any rules or TUNE change invalidates par, and the proposed CI regeneration check catches that.",
   "fix": "Schedule it after the rules freeze (after reactions and Troubles). Regenerate par.json in the same PR as any RULES_VERSION bump, and keep it campaign-only."
  },
  {
   "proposalId": "ux-1",
   "verdict": "keep",
   "reason": "The highest-value UX fix, and M. Today a new install boots into a Planet 1 you can fail, with a gem continue, a calendar you can't dismiss and an OFFER badge. The changes are local (app.ts init, canCont in game.ts, coach.ts, the daily sequence in home.ts) and need no new systems. The modal governor is the shared piece ux-7 needs.",
   "fix": "Ship in M1. Point the guided first build at whatever the Homeworld milestone makes the first building (the Mill today, a Workshop later), rather than hard-coding 'Mill'. When materials or Essences appear follows one unlocks.ts rule."
  },
  {
   "proposalId": "ux-2",
   "verdict": "change",
   "reason": "The back stack, the Next Up card, the badge policy and the 320x568 clipping fix are cheap and urgent. The full five-tab restructure touches every screen, the top bar and the 3,867-line styles.css. Its Homeworld and Collection tabs also depend on milestones not yet built, so doing it now means doing it twice.",
   "fix": "M1: a back stack in App (a stack of ScreenName values); the Next Up picker as a pure, tested function; one badge style; one tap from results to the next level; a Playwright layout check at 320x568. Build the five tabs after the Homeworld milestone, once their contents are stable."
  },
  {
   "proposalId": "ux-3",
   "verdict": "keep",
   "reason": "unlocks.ts is the shared scheduler every new feature needs (debut planets, intro cards, when each currency appears), and it replaces constants scattered across files. It is M, and it is where the clashing debut schedules get resolved.",
   "fix": "Build unlocks.ts in M1 and make every core-loop-3/4/5 and meta-homeworld debut an entry in it. Test that there is at most one intro per planet and that every string exists in all 6 locales. The Field Guide can reuse the Lifebook screen shell."
  },
  {
   "proposalId": "ux-4",
   "verdict": "change",
   "reason": "Teaching planets, discovery cards and the 'What happened' card are what let kids cope with reactions and Troubles. But three proposals each define a fail-help flow: this one's 'Try with a hint', monetization-3's Hint try and liveops-data-9's ladder. 'What happened' needs a round event log, which stepRound provides. Teaching planets need a scripted deal, which levels.ts already does for planets 1-2.",
   "fix": "Keep the teaching planets (as LevelDef overrides listed in unlocks.ts, with targets still set by the solver), the NEW FUSION card, and 'What happened' built from stepRound events. Move the hint retry into the single assist ladder (liveops-data-9). The forecast strip is core-loop-4's, built once."
  },
  {
   "proposalId": "ux-5",
   "verdict": "change",
   "reason": "It mostly duplicates core-loop-2 (queue, preview card, loss ghosts), with a different queue length (next 3 vs next 2) and a different Star Scope rescope from core-loop-5's. Its unique value is the feedback governor: one popup queue, at most 2 popups at once, and outlines. That fixes today's 7 overlapping floating texts.",
   "fix": "Merge it into core-loop-2. Keep the feedback governor as a shared module used by reactions, Troubles and creature returns. The Mastery segment waits for core-loop-9. Drop its Star Scope variant."
  },
  {
   "proposalId": "ux-6",
   "verdict": "change",
   "reason": "Juice is what makes the loop feel good. But the round tally adds up to 4 s to a waiting-room round, and the particle and hit-stop work must run on the iOS 15 / A9 floor, where nothing has been profiled yet.",
   "fix": "Ship it with each milestone: the per-object feel table and the Fusion moment with M2; a tally of 2 s or less by default, always skippable; the creature 'worried' reactions with Troubles. Add a frame-time check to the Scene Bot before adding particles. Change the Momentum copy together with the economy decision."
  },
  {
   "proposalId": "ux-7",
   "verdict": "keep",
   "reason": "S-M, and it fixes a real bug: scheduleReminders queues two notifications that can land on the same day, which breaks the 'no more than once a day' promise. It also removes up to 3 blocking modals on resume. It uses ux-1's governor and the merged Collect all.",
   "fix": "Ship the notification fix in M0, with a unit test for at most 1 per calendar day. Ship the While-you-were-away card and the lapsed-return warm-up round in M1."
  },
  {
   "proposalId": "ux-8",
   "verdict": "keep",
   "reason": "S, and it directly implements the non-negotiables: no continue on early planets or after a win, a first booster tap that never spends, a preview before every price, a receipt card and a stronger gate. Its gate and Parents page duplicate monetization-2's, and its continue rules differ from monetization-3's.",
   "fix": "Merge it with monetization-2 into one Parent Corner and one Gate v2 spec: a number-words table per locale, a keypad, hold to confirm, and a cooldown. Use one continue rule set: never on planets 1-10, never after a win, only from the 2nd fail, flat price, at most 2 per level."
  },
  {
   "proposalId": "ux-9",
   "verdict": "change",
   "reason": "The measured colour-blind collisions (15 close pairs for deuteranopia) get worse as reactions and Troubles add colour-coded states, so the palette, markers and patterns belong with those milestones. Rewriting every px font size in styles.css is mechanical but can break layouts unless Playwright checks exist. The speech voices available in WKWebView vary by device. The 'Full aim line' assist makes the Aim Guide upgrade and the Star Scope booster pointless.",
   "fix": "M2: the Clear palette, biome markers, pattern encoding and the photosensitivity cap, with the colour-blind vitest. M1: text size through --ts once the Playwright layout checks exist, plus the VoiceOver aria-live region. Later: read-aloud. Either make the Aim Guide free for everyone and refund its stardust, or keep the assist and retire the upgrade."
  },
  {
   "proposalId": "ux-10",
   "verdict": "change",
   "reason": "It describes the right journey, but duplicates meta-homeworld-8 (first hour, one level number, Next Up) with conflicting details: a guided Stardust Mill build (meta-homeworld-1 retires Mills) and a Base Level formula that differs from the Dock/ring level.",
   "fix": "Merge it into meta-homeworld-8 as its UX spec. Keep the 'For your next throw' line on every building card, the overview panel and the merged income engines. Use meta-homeworld-8's level, and let the guided first build follow whatever the Homeworld milestone's first building is."
  },
  {
   "proposalId": "liveops-data-1",
   "verdict": "keep",
   "reason": "Foundation work. About 35 direct wallet writes across 8 files make every balance claim unverifiable. A wallet chokepoint with a lint test is S-M, and a separate 16 KB ledger key cannot corrupt the save. Nothing leaves the device, so the privacy label holds. monetization-7 duplicates it.",
   "fix": "Absorb monetization-7: offer-impression context tags and the wishlist and gate funnel. Ship wallet.ts, the lint, the ledger and a dev-build Balance Report in M0. The tester build flavour waits for a TestFlight pipeline, since there is no developer account yet. The Family Summary moves into the single Parent Corner."
  },
  {
   "proposalId": "liveops-data-2",
   "verdict": "change",
   "reason": "Extracting the flight integrator into src/core/flight.ts is S-M. It unlocks Motes, guided throws, the Scene Bot and physics twists in the sim. Shadow seeds are a 2-line change with high value. But calibrating aim noise to tester data that doesn't exist yet, and running a planner in every CI run, is L before it pays off. It also duplicates core-loop-1's bot section.",
   "fix": "One sim codebase: core-loop-1's stepRound bots, flight.ts, shadow seeds, and sim:quick in CI (90 s or less). The planner, beam search and full shadow runs go nightly only. Calibrate after launch."
  },
  {
   "proposalId": "liveops-data-3",
   "verdict": "keep",
   "reason": "M, and the required gate for any economy change: the vault formula, Essences, Workshops and seasons. The meta functions already take a now or date parameter, so a 90-day sim over the real code with an injected clock is feasible. monetization-7 and meta-homeworld-1 both refer to the same file.",
   "fix": "Give tests/economy.sim.ts one owner. The archetypes follow the ratified catalogue: no Payer who buys 500-gem packs if packs are retired. The owner ratifies the health bands before the Homeworld milestone."
  },
  {
   "proposalId": "liveops-data-4",
   "verdict": "change",
   "reason": "The lint tool is S and catches real walls, for example L24 at 88% decent fail. But Solver 2.0, reactions and Troubles will re-derive every target, so salts tuned now will be invalidated. The game is pre-launch, so the concern about changing levels players have already played does not apply.",
   "fix": "Build the lint report now, warning only. Apply LEVEL_SALT and DAILY_SALT fixes only after the rules freeze in M2/M3, then make WALL a CI gate."
  },
  {
   "proposalId": "liveops-data-5",
   "verdict": "keep",
   "reason": "Consolidating tuning.ts, a policy lint (fixed prices, deterministic grants, gate before purchase) and a privacy lint (no fetch or XHR, a dependency allowlist, the privacy manifest) are S-M, and they turn the non-negotiables into tests. Checking beatability over planets 1-200, Remix, 90 dailies and 12 weeks of Voyage is about 700 makeLevel calls with Solver 2.0, so it needs memoisation and parallel test files.",
   "fix": "Change the rule 'homeworld.ts never calls spendGems' to 'no power or progress function spends gems'. Homeworld paints, accessories and the statue are legitimate gem cosmetics. Run beatability for 1-60 in PR CI and the rest nightly. Once the repo is private, run the macOS ios-build only on main and tags, because macOS minutes cost 10x."
  },
  {
   "proposalId": "liveops-data-6",
   "verdict": "change",
   "reason": "Normalising event token thresholds (today's spread is 20x) and excluding Zen from festivals are S fixes worth doing now. The full Almanac is a content and ops commitment too big for a solo team before launch: authored rows through 2027-W52, a 98-day runway rule, festival editions with new art each year, hemisphere-aware themes and a release train.",
   "fix": "Now: per-theme token thresholds and the Zen exclusion. After launch: almanac.ts falling back to today's rotation, the runway test, and the season rows for monetization-4. Add festival editions only once there is an art budget."
  },
  {
   "proposalId": "liveops-data-7",
   "verdict": "change",
   "reason": "A scorecard is S and useful. But three of its evidence tiers don't exist before launch: tester codes, App Store Connect analytics and sales, and a Game Center reader tool. There is no developer account, no TestFlight and no IAP product. Gating M1-M5 on '10 or more tester codes' would block the roadmap.",
   "fix": "Before launch, every milestone gets sim gates in CI plus a small in-person playtest. Add the tester and App Store gates after launch. Drop the Game Center leaderboard-reader tool."
  },
  {
   "proposalId": "liveops-data-8",
   "verdict": "change",
   "reason": "Playwright journeys with layout assertions would have caught the clipped side rail and the 'ONE-T' ribbon, and save goldens and a time-travel suite are cheap. But 6 journeys x 6 locales x 4 viewports x 2 engines every night, plus a 7-device matrix down to an iPhone 6s, is L and costly on a private repo. The owner may not own the floor devices either.",
   "fix": "M0/M1: Playwright J1 (first session) and J3 (mock purchase and gate) at 320x568 and 390x844 in 6 locales, plus save goldens and time-travel tests. Add journeys with each milestone. The device matrix = 2 devices (the oldest available and a current one) plus the Simulator. Revisit the iOS 15 floor."
  },
  {
   "proposalId": "liveops-data-9",
   "verdict": "keep",
   "reason": "M, free and deterministic. It targets the real wall (goal misses after L21) and uses greedyPlan data that already exists. It should be the single fail-help ladder that ux-4 and monetization-3 also describe. A per-level fail counter in the profile is enough; it doesn't need the full ledger.",
   "fix": "Make it the only assist ladder, merging ux-4's hint and monetization-3's Hint try. Instead of snapping the aim line to the solver's sector, pulse the target sector until flight.ts can work out the aim. The +2 free throws stay campaign-only through the modifier allowlist."
  },
  {
   "proposalId": "monetization-1",
   "verdict": "keep",
   "reason": "This is the cheapest moment there will ever be: no IAP products exist in App Store Connect and there are no real buyers, so nothing needs migrating. Selling only non-consumables removes the consumable and processedTx edge cases and enables Family Sharing, and the CI store test is S. The one real risk is the owner's decision to make gems earn-only, since several other proposals assume the opposite.",
   "fix": "The owner ratifies it before any product is created in App Store Connect. Implement it in M1 with tests/store.test.ts. Once it is ratified, drop the 'cut free gem faucets so packs sell' arguments from meta-homeworld-1/4/7 and the gem-priced FX lines."
  },
  {
   "proposalId": "monetization-2",
   "verdict": "change",
   "reason": "A Grown-up Shop, Gate v2, a wishlist and Family Sharing are right for the buyer, and each part is S-M. But it duplicates ux-8's Parents page and gate and liveops-data-1's Family Summary, with different gate parameters.",
   "fix": "Build one Parent Corner (history, spend cap, offer toggle, Family Summary, restore, refund help) and one Gate v2 spec shared with ux-8. The wishlist share card reuses the postcard renderer."
  },
  {
   "proposalId": "monetization-3",
   "verdict": "change",
   "reason": "The purchase-motivation map and paywall tests are cheap and essential. But its continue rules (flat 50 gems, at most 2, none on planets 1-3) and its Hint try differ from ux-8 and liveops-data-9. Its 'Homeworld perks at most 10% of the 3-star target' band also differs from the +15pp band used everywhere else.",
   "fix": "Keep the map and tests/paywall.test.ts. Fold the continue and hint rules into one fail-flow spec (ux-8 plus liveops-data-9). Pick one power band metric (+15pp on the decent-aware 3-star rate) for the Lab, Workshops, Kit and Helpers together."
  },
  {
   "proposalId": "monetization-4",
   "verdict": "change",
   "reason": "This is the main recurring revenue line, and it needs no server because seasons are dated in the binary. The cost is L plus a standing content pipeline: 12 cosmetic rewards and about 20 strings in each of 5 locales every 8 weeks, and an App Store Connect product per season that only the owner can create. 'Glow' is another named counter while other proposals are cutting counters. It conflicts with liveops-data-6 and meta-homeworld-9 on season length, price and currency.",
   "fix": "Reuse the Star Road engine (STAR_ROAD in progression.ts) as the track. Feed progress from stars and quests and show it as a bar, with no named currency. Season 0 is the repackaged Cosmic Pass at launch. Run later seasons every 10-12 weeks until the pipeline proves itself. Keep the Archive as specified."
  },
  {
   "proposalId": "monetization-5",
   "verdict": "change",
   "reason": "The structure is right: fixed-price themed sets, stardust and earned-gem tiers, and a readability CI check. But most of its surfaces don't exist until M2-M5: shot skins, Fusion FX, Nova styles, and Homeworld themes for 6 new Workshops. Every theme is code-drawn art across all structure types. meta-homeworld-9 duplicates it, as do the gem-priced FX lines in core-loop-3/5/6/8.",
   "fix": "Give the cosmetic catalogue one owner. Launch with the slots that exist today (Keeper sets, atmospheres, paints, projectile trails) plus the readability and colour-blind check. Add each slot type when its milestone ships the surface. Use one shared try-on renderer."
  },
  {
   "proposalId": "monetization-6",
   "verdict": "change",
   "reason": "The placement map is S policy work and should ship in M1: no offers before planet 5, in fail or continue screens, on welcome-back, in Remix or in notifications. The Explorer Bundle's 'pick a theme after purchase' adds saved state that has to be re-picked after Restore. The Collector's Edition needs a release date for every item and the transaction's purchaseDate from StoreKit, and only makes sense once a catalogue exists.",
   "fix": "M1: the placement rules, Starter Crew and the ledger impression tags. Give the Explorer Bundle fixed contents. Add the Collector's Edition once at least 3 themes and one archived season exist, and first confirm @capgo/native-purchases exposes purchaseDate."
  },
  {
   "proposalId": "monetization-7",
   "verdict": "cut",
   "reason": "It duplicates liveops-data-1 (a second ledger and Balance Report on the same long-press) and liveops-data-3 (the economy sim).",
   "fix": "Merge its unique fields into liveops-data-1: offer-impression context tags, the try-on, wishlist and gate funnel, and season progress per day. Merge its revenue model into liveops-data-3. Per-territory price tests stay a post-launch practice."
  },
  {
   "proposalId": "monetization-8",
   "verdict": "cut",
   "reason": "The Club needs code-drawn drops shipped in the binary every month (so a release every month), subscription entitlement handling, and carries review risk under Apple 3.1.2's 'ongoing value' rule, all for a modelled ~$0.03 per install. Its 'Collect all also gathers Homeworld producers' perk is free for everyone in ux-2, ux-7 and ux-10.",
   "fix": "Revisit only after two seasons ship on time. If it comes back, drop the Collect-all perk and any convenience others already get for free."
  }
 ],
 "missing": [
  "A launch plan. The game is pre-launch: the owner has not yet created the developer account, the IAP products, the Game Center IDs or a TestFlight group. Many proposals assume players who don't exist yet: tester codes, App Analytics, 'stored stars never drop' migrations, re-salting played levels. The roadmap needs a Launch 1.0 cut (M0-M2 plus Remix) and a signing and TestFlight pipeline before any tester-based gate.",
  "One modifier pipeline with a per-mode allowlist, plus a fix for an existing fairness bug. sceneOpts (app.ts) strips only the Lab and meteor-shower bonuses from competitive modes. The Extra Throws (+1 to +3), Wide Impact and Aim Guide upgrades all apply in Daily Planet and Challenge. So the daily leaderboard and challenge codes compare players playing under different rules today. Lab 2.0, Workshops, the Kit, Buddy or Helper, Momentum, boosters, assists and sky events should all go through this pipeline.",
  "A written rule protecting the solver guarantee for player-side power. Every modifier must be either monotone (it never removes an option) or opt-in per level. Today's Wide Impact upgrade already breaks this: it is unmodelled, always on and can ruin neighbours. Reach paths and rule-replacing evolutions would break it too. Add a CI test with every modifier maxed that still meets each level's goals.",
  "Split LevelScene (game.ts, 1,615 lines) into round.ts (pure logic), hud.ts, preview.ts and fx.ts before M2. Otherwise the queue, preview card, forecast, Trouble rendering and Nova arming will all land in one class.",
  "A performance budget on the device floor. makeLevel takes 12.8 ms per planet in Node today, and the Solver 2.0 prototype about 41 ms. It is called at runtime on every Home render (home.ts:74), on the pre-level sheet, on level start and for 7 Voyage planets. The aim preview re-simulates every sector, and Trouble projection makes that heavier. Nothing has been profiled on an A9 or iOS 15, and canvas layer caching is still only an idea.",
  "One RULES_VERSION constant covering LevelDef.rules, TUNE, par.json, REMIX_RULES and the makeLevel memo keys, so a retune invalidates every derived table at once.",
  "The translation budget. The proposals add roughly 600-800 new keys, 55-70% more than today's ~1,116, in 5 locales. The round-6 translations were never reviewed by native speakers. The plan needs a glossary, a pseudo-locale and German length test, a native review before launch, and translated App Store Connect metadata for every new IAP product.",
  "The owner-only App Store Connect workload. Every season product, every cosmetic SKU (about 5 per season in monetization-5), every achievement or leaderboard and every In-App Event has to be created by hand. The plan should batch these.",
  "CI cost once the repo is private. The macOS ios-build job costs 10x in minutes. Nightly Playwright in 2 engines x 6 locales x 4 viewports, plus nightly sims, needs a minutes budget.",
  "An art and audio budget for code-drawn assets: 6 Workshop structures with tier art, 8 reaction effects and sounds, Trouble sources, per-object feel, theme variants of every structure, shot skins and Nova styles. No proposal sizes this.",
  "Progress backup without a server, using iCloud key-value storage or Game Center saved games. Family Sharing and Restore bring back purchases but not progress, so a child on a new phone loses everything.",
  "A list of what to retire or merge, to offset the new systems. There would be three level numbers (Explorer Rank, Homeworld Level and the Passport), Buddy and Helper, Star Atlas and Workshops, dyes and the Workshop. Each milestone should remove about as much as it adds.",
  "One glossary for elements, hazards, traits and currencies, fixed before any string is translated. Today the proposals use two hazard vocabularies.",
  "An owner decision on whether to list in the Kids Category. It constrains subscriptions, outbound sharing, links and the gate design.",
  "iPad compatibility layout. The app is iPhone-only (TARGETED_DEVICE_FAMILY = 1), but App Review often tests on iPad. Only a test is proposed, not a layout fix."
 ],
 "conflicts": [
  "Upgrade design. core-loop-8 proposes a fixed ladder per object. meta-homeworld-2 proposes Reach/Power/Echo paths with a 3-1-0 cap and respec, and monetization-3/-5 and liveops-data-7 M4 assume those paths.",
  "Evolution unlock. core-loop-8: Lv5 plus the next Guardian win. meta-homeworld-2: Workshop Lv5 plus a Master resident seen 5 times plus a Guardian win. monetization-3: stardust plus a catalyst species.",
  "Trait tables. core-loop-7 has 4 biome traits, Tide Otter = Swimmer, and a 'Calm' aura for legendaries. meta-homeworld-4 has 5 Essence-family traits including Sturdy and Rain-maker, Tide Otter = leaf/Rooted, and gives legendaries every trait.",
  "The creature that helps in a level. core-loop-7 has Buddy Power. meta-homeworld-3/4 have a resident Helper that replaces the Buddy.",
  "Hazard names. core-loop-4 uses Ember Vent, Frost Creep, Tanglevine and Meteor. meta-homeworld-3/6, ux-4 and monetization-3 use Wildfire, Deep Freeze, Dust Drift, Blight, Heat Wave and Frostbite.",
  "Debut schedule. core-loop-3 debuts Steam on P5 and runs reactions P5-P14. core-loop-4 starts Troubles at P14 but puts Meteor on the P10 boss. ux-3 has the Homeworld on P5, the first Fusion on P7 and the first hazard on P13. ux-4 has Steam on P7 and Wildfire on P13. core-loop-5 auto-arms the Supernova at P3; ux-3 introduces it at P9.",
  "Queue length and Star Scope. core-loop-2 shows current plus next 2; ux-5 shows current plus next 3. Star Scope becomes '5 upcoming objects plus fusion outlines' in core-loop-5 and a 'two-step effect preview' in ux-5.",
  "Continue rules. ux-8: none on planets 1-10, only from the 2nd fail, prices stay 40/70/110. monetization-3: flat 50, at most 2, none on 1-3. monetization-6: none on 1-3. liveops-data-9: available on the first fail as a secondary button. liveops-data-5 lint: at most 3, none on L1-3.",
  "Fail help. ux-4 offers 'Try with a hint' on the first fail. monetization-3 offers a Hint try after the 2nd fail. liveops-data-9 has a ladder: a tip at 2 fails, +2 throws at 3, a guided throw at 5. ux-1 gives free throws on planets 1-3.",
  "Gem economy. monetization-1 retires every gem pack. meta-homeworld-1/4/7 cut free gem faucets 'so packs are worth buying'. meta-homeworld-9 prices themes in gems 'so packs have something to buy'. core-loop-3/5/6/8 add gem-priced FX. liveops-data-3's Payer archetype buys 500-gem packs.",
  "Season pass. monetization-4: $3.99, 8-week seasons, 20 tiers, fed by Glow from wins, quests and commissions. liveops-data-6: about 5 a year of 8-10 weeks, fed by stars and event tokens. meta-homeworld-9: a $4.99 lane 5 times a year.",
  "Homeworld themes are duplicated. meta-homeworld-9 has 5 themes at $2.99 or 360 gems. monetization-5 has 3 USD non-consumable themes plus a $4.99 Deluxe.",
  "Collect all is free for everyone in ux-2, ux-7, ux-10 and meta-homeworld-1, but sold as a Club perk in monetization-8.",
  "Stardust Mills. meta-homeworld-1 retires them, while ux-1 and ux-10 make 'build a Stardust Mill' the guided first build.",
  "Homeworld Level. meta-homeworld-8 uses the Star Dock level with an Essence and feat checklist. ux-10 computes a Base Level from rings, buildings and residents. monetization-3 uses 'Radiance'.",
  "When Essences appear. meta-homeworld-1 makes them the headline reward on results from P5. ux-1 and ux-3 hide materials until the Star Atlas at P12. ux-2 shows materials only in the Atlas.",
  "Parent area and gate. ux-8 has a Parents page and a gate with a 3-digit number in words and a 30 s cooldown. monetization-2 has a Parent Corner with numbers 21-99 in words and a 1.5 s hold. liveops-data-1 adds a Family Summary.",
  "Duplicate ledgers and sims. liveops-data-1 and monetization-7 each define a ledger and a Balance Report on the same long-press. liveops-data-3, monetization-7 and meta-homeworld-1 each claim ownership of tests/economy.sim.ts.",
  "Balance bands. core-loop-1: decent Hard fail 25-45%, casual Normal fail ≤25%. liveops-data-4: Normal 0-35%, Hard 20-50%, Super 30-70%, casual above 60% is a WALL. meta-homeworld-2 and core-loop-8: +15pp uplift. monetization-3: Homeworld perks at most 10% of the 3-star target. liveops-data-7: max Lab at most 75% 3-star.",
  "Troubles in Remix. core-loop-4 ticks Troubles every 2nd throw in Remix and adds them to the twist deck in v1.1. REMIX.md allows exactly one twist, no stacked penalties and the classic rules.",
  "Level identity. core-loop-1 promises planets 1-60 keep their start and deal. core-loop-6's deal re-weight changes every queue, and liveops-data-4 re-salts levels.",
  "liveops-data-5's lint 'homeworld.ts never calls spendGems' clashes with gem-priced Homeworld cosmetics. Paints, accessories and the statue already deduct gems in homeworld.ts, and meta-homeworld-9 adds gem-priced themes.",
  "ux-9's free 'Full aim line' assist makes the stardust Aim Guide upgrade pointless, and the Star Scope booster that core-loop-5 and ux-5 are trying to save.",
  "meta-homeworld-6's Homeworld losses (Dimmed buildings and repairs) and meta-homeworld-5's adjacency clashes conflict with the UX principle of one new concept at a time and the kid-safety promise that nothing is lost."
 ]
}
```
