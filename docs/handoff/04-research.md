# 04: Research

The detailed research tables, with citations, live in [ROADMAP.md](../../ROADMAP.md): one table per round, each listing the finding, the game it comes from, and what we built (✅) or rejected (❌). This file adds the concept research that picked the game, and the principles that tie all the rounds together.

## The concept pick (day 1)

**Market findings** (from web research, 2025–2026 sources: AppMagic casual report H1 2026, Cinevva, PocketGamer.biz, Gamigion, Yu-kai Chou, Goomba Stomp on Balatro):

- **Short sessions:** the most-replayed mobile games give a complete, satisfying round in 2–3 minutes. Candy Crush players open it about 4 times a day.
- **Hybrid-casual** (simple controls with deeper systems underneath) was the only casual segment whose in-app purchase revenue grew, about +20%.
- **Novelty wins:** match-3 and similar genres are saturated, and the breakouts had a genuinely new core action (e.g. Pixel Flow).
- **Balatro's real lessons:** short runs, a meaningful choice every minute, upgrades that combine in surprising ways, progress even when you lose, and very satisfying sound and feedback. Poker, jokers and chips × mult are _not_ the lessons.
- **Proven retention engines:** growth you can see and own (a base or galaxy that earns while you're away), collections with rarity, and a daily reason to return.
- **Money, roughly by earnings:** season pass, boosters before a level and continues after a fail, piggy bank, starter pack, cosmetics, then skip-the-wait timers. We decided against energy/lives timers (they annoy players), random loot boxes (gambling-adjacent, restricted by Apple) and ads.

**Six original concepts were pitched:** Last Light (sweep a lighthouse beam), **Pocket Planet** (fling objects to shape a tiny planet), Paper Plane Post, Swarm, Night Market (a food-stall rush) and Skyline (a physics stacker).

**Competition check, and why Pocket Planet won:**

| Concept           | Closest existing thing                                                               | Verdict                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Last Light        | Several lighthouse-beam indie games on itch.io                                       | Crowded, no hit to learn from                                                                |
| Swarm             | Bee Swarm Simulator (Roblox) and its clones                                          | Would be a rip-off again                                                                     |
| Night Market      | Cooking / time-management games                                                      | Saturated                                                                                    |
| Skyline           | Tower Bloxx                                                                          | Rip-off                                                                                      |
| Paper Plane Post  | Flight (Kongregate)                                                                  | Rip-off                                                                                      |
| **Pocket Planet** | Only turn-based or tile-placing terraformers (TerraGenesis, Tiny Planet Terraformer) | **No one does fling-with-gravity creation. Most original, and it fits the proven patterns.** |

## Research rounds in ROADMAP.md

1. **"What the best casual games do that we should borrow"** (Royal Match, Candy Crush, Monopoly GO, Two Dots, Angry Birds 2, Neko Atsume, Alto's Odyssey, Mini Metro, Wordle, Balatro, Block Blast).
   - **Built:** Momentum streak, Hard/Super Hard planets, Visitors, the Meteor finale, Explorer Rank, Daily Planet with an emoji share, habitat sets, weekly events, escalating feedback, piggy bank, starter pack, welcome-back, Game Center.
   - **Rejected:** lives/energy timers, ads and loot boxes.
2. **Round 3: depth, identity and the passive side** (Clash Royale, Brawl Stars, Pocket Camp, Viva Piñata, Pikmin Bloom, Township, Clash of Clans, Cats & Soup, Marvel Snap…), plus our own difficulty simulation.
   - **The simulation showed** that levels were far too easy.
   - **Built:** goals and a difficulty curve, the Keeper, Planet Passport, Cosmic Pass art, Object Lab, Supernova, Homeworld.
   - **Rejected:** paid timer skips and PvP raids.
3. **Round 4: customization, long-term depth, a living world** (Animal Crossing, Cats & Soup, Sky, Stardew Valley, Pokémon GO, Fortnite, Cookie Run Kingdom, Hollow Knight…).
   - **Built:** the parental gate (Apple's Kids Category rules), emotes, a Star Calendar that never resets, real seasons and meteor showers, Homeworld paint, photo mode, the Inbox, field notes, object records, nicknames, the Comet Guardian, Star Atlas bundles and dyes.
   - **Rejected:** fortune cookies / random paid rewards.
4. **Round 5: festivals, weekly voyage, sticker album** (Animal Crossing events, Pokémon GO costumes, Royal Match / Candy Crush mini-chapters, Panini / Pikmin Bloom albums, Toca Boca scrapbooks).
   - **Built:** monthly costume festivals that return yearly, the Weekly Voyage, and an earned-only Sticker Album plus scrapbook.
   - **Rejected:** random sticker packs for money.
5. **Round 6: a buddy and tie-ins** (Pokémon GO buddies, Sky, Cats & Soup).
   - **Built:** the Buddy companion, quests and letters for the new systems, residents in festival costume, and 5 more achievements.
6. **Round 7: replay, remix and stickers** (Super Mario Galaxy comets, Portal Advanced Chambers, Mario Kart Mirror Mode, Where's My Water? Challenges, Celeste B-Sides, Candy Crush Dreamworld and Sugar Stars, Hollow Knight Steel Soul, Slay the Spire Ascension, Apple's Messages and App Review documentation, the UK Children's Code).
   - **Method:** a second agent checked each finding against its source. 44 were kept and 15 dropped as unconfirmed. Many sites (apps.apple.com, Wikipedia, 9to5mac…) are blocked in the cloud, so some checks relied on search snippets.
   - **Built:** festival and Voyage music.
   - **Designed:** Remix. Each remixed planet gets one named twist and one always-on goal, with targets from the solver on a fixed seed. It unlocks when a chapter is finished, and its rewards are prestige only (gold Remix stars, silver/gold chapter frames, Passport titles). It has no currency and nothing is sold.
   - **Also designed:** a free bundled iMessage sticker pack.
   - **Rejected:** paid skips/unlocks, random reveals, first-try or expiring challenges, re-rolled seeds and stacked penalty tiers.
   - **Where it lives:** the full spec, with code notes and sources, is [docs/product/REMIX.md](../product/REMIX.md).
7. **Product scoping (senior-PM review)** after round 7. The owner asked what the point of the game is, and for synergies, combos, stats, power-ups, hazards, a deeper Homeworld and more revenue.
   - **Audits:** code audits of the gameplay, economy and Homeworld, plus a played-through user journey with screenshots.
   - **Research:** combos and hazards, what gives a base-builder its purpose, and kid-safe revenue with benchmarks.
   - **Review:** five PM proposals and five adversarial critiques.
   - **Output:** [docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md), which has the findings, sources and milestone plan.

## Principles distilled from all the rounds

1. **Original core, borrowed methodology.** Never copy a hit's mechanics.
2. **One-minute sessions** with instant replay and near-miss tension (goals, "So close!").
3. **Something you own grows while you're away:** the galaxy's stardust and the Homeworld.
4. **Earned collections, never random paid ones:** Lifebook, stickers, constellations, cosmetics.
5. **Kid-safe monetization:** fixed-price, previewable, a parental gate, no gambling themes, no ads, no pay-to-skip timers.
6. **No server:** everything seeded from the date (daily, weekly, monthly), with Game Center for the social side.
7. **Everything drawn in code**, in one house style, localized into 5 languages from day one.
8. **Mastery is prestige, never power or pressure** (round 7): generated and provable, never revoked, no timers, streaks or first-try rules.
9. **Every system must answer "why play?"** (product scoping): each one feeds the core fling loop or visibly grows something the player owns.
