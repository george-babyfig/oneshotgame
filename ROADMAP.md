# Pocket Planet — Production Roadmap

Goal: a polished, studio-quality casual iOS game you can open in a waiting room, play for two minutes, and want to come back to.

Status key: ✅ done · 🔨 in progress · ⏳ planned · 💭 later / needs a backend · ❌ decided against

## Research: what the best casual games do that we should borrow

We compared this roadmap against top-grossing and high-retention casual games (Royal Match, Candy Crush, Monopoly GO, Two Dots, Angry Birds 2, Neko Atsume, Alto's Odyssey, Mini Metro, Wordle, Balatro, Block Blast). Constraints: one developer, no server, no ads, no gambling or random paid rewards, safe for kids.

| Borrowed idea                                                                        | Where it comes from                                                  | How Pocket Planet does it                                                                                                                                                                                |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Win streak** that pays out at the start of the next level and resets when you fail | Royal Match "Butler's Gift", Candy Crush "Candy Necklace" ([1], [2]) | **Momentum**: 3 tiers of free head-starts (extra throw → + Life Spark → + Star Scope). A glowing halo shows the tier. Kid-friendly twist: one free "streak shield" a day, never sold.                    |
| **Hard / Super Hard levels** that pay more                                           | Royal Match, Township ([3], [4])                                     | Every 5th planet is **Hard** (orange, ×2 stardust) and every chapter's 9th is **Super Hard** (purple, ×3), with a warning card beforehand.                                                               |
| **Gifts left while you're away**                                                     | Neko Atsume mementos ([5])                                           | **Visitors**: while the app is closed, creatures from your Lifebook visit your galaxy and leave gifts, and sometimes a collectible **memento**. They're revealed when you come back.                     |
| **Leftover moves turn into a bonus**                                                 | Candy Crush "Sugar Crush", Angry Birds 2 Destructometer ([6], [7])   | ✅ **Meteor finale**: once you have a star, _Finish_ rains your unused throws down as stardust. It also keeps sessions short.                                                                            |
| **Three standing goals that level you up**                                           | Alto's Odyssey goals ([8])                                           | **Explorer Rank**: 3 hand-written goals at a time. Rank-ups unlock modes and cosmetics. These are separate from the rotating daily quests.                                                               |
| **Daily seeded challenge + spoiler-free emoji share**                                | Wordle, Mini Metro daily, Balatro seeds ([9], [10], [11])            | **Daily Planet**: same planet for everyone, based on the date. Share `Pocket Planet #212 ⭐⭐⭐ 🌊🌋🌲🪸`. **Challenge a Friend** uses seeds as codes. Seeded play never unlocks campaign progress.      |
| **Collection sets with completion rewards** (without random packs)                   | Monopoly GO albums ([12])                                            | **Lifebook habitats**: the creatures are grouped into habitat sets, and finishing a set pays gems plus a title. Every creature comes from a known recipe, so there are no duplicates and nothing random. |
| **Rotating limited-time events**                                                     | Two Dots Expeditions, Royal Match events ([13], [14])                | **Weekly events** chosen from the ISO week number (Volcano Week, Ocean Week, Bloom Week …). Everyone gets the same event with no server. Each event has its own reward track.                            |
| **Escalating feedback**                                                              | Balatro, Block Blast ([15])                                          | ✅ Tiered callouts (Nice → Blooming → Thriving → Paradise) with rising pitch and a chain counter, ✅ shockwaves, ✅ confetti at 3★. ✅ A score counter that heats up as it climbs.                       |
| **Piggy bank for engaged players**                                                   | Industry analysis ([16])                                             | Hidden until chapter 2, then shown as it fills; no nagging.                                                                                                                                              |
| **Generous first-purchase offer**                                                    | Deconstructor of Fun ([17])                                          | Starter Pack is shown after the first chapter chest, with no countdown timer.                                                                                                                            |
| **Welcome-back screen**                                                              | GameRefinery ([18])                                                  | After 3+ days away: a recap, the visitors' gifts, and a one-time bonus.                                                                                                                                  |
| **Game Center leaderboards & achievements** (free, no server)                        | Apple GameKit ([19])                                                 | Leaderboards for Meteor Rush, Daily Planet and total stars; up to 100 achievements that mirror Explorer Rank and the Lifebook.                                                                           |
| Lives / energy timers                                                                | Royal Match, Candy Crush ([20])                                      | ❌ They force waiting and clash with a relaxed waiting-room game. Play is unlimited.                                                                                                                     |
| Rewarded ads, loot boxes, gacha                                                      | —                                                                    | ❌ No ads, and no random paid rewards.                                                                                                                                                                   |

Sources: [1] oldcynic.com/royal-match-tips-and-tricks-cheats-for-new-players · [2] candycrush.fandom.com/wiki/Candy_Necklace · [3] oldcynic.com/royal-match-gets-harder · [4] township.fandom.com/wiki/Match-3 · [5] nekoatsume.fandom.com/wiki/Mementos · [6] candycrush.fandom.com/wiki/Sugar_Crush · [7] angrybirds2.rovio.com (cards help article) · [8] altosodyssey.fandom.com/wiki/Goals · [9] x.com/powerlanguish/status/1471493886031773707 · [10] store.steampowered.com/news/app/287980 · [11] balatrowiki.org/w/Seed · [12] thegamer.com/monopoly-go-sticker-albums-faq-complete-guide · [13] twodots.fandom.com/wiki/Expeditions · [14] royalmatch.fandom.com/wiki/Sky_Race · [15] blakecrosley.com/guides/design/balatro · [16] heroiclabs.com/blog/understanding-piggy-bank-mechanics-mobile-games · [17] deconstructoroffun.com/blog/2024/4/8/free-to-play-starter-pack-pricing · [18] gamerefinery.com/four-ways-how-mobile-games-re-engage-lapsed-players · [19] developer.apple.com GameKit Guide: Achievements & Leaderboards · [20] adriancrook.com/energy-systems-lessons-top-freemium-games

## 1. Foundation

- ✅ Clean repository (`main` + feature branch + PR), CI (format, typecheck, tests, build)
- ✅ Code structure: per-screen modules (`src/ui/screens`, `src/ui/flows`), pure testable economy and progression (`src/meta`)
- ✅ Versioned save data with migrations
- ✅ Crash-safe saves and a global error handler

## 2. Custom art (no emoji)

- ✅ "Critters": all creatures drawn as vector art in one house style
- ✅ Hand-drawn biome props, projectile sprites, planet surface detail (clouds, shimmer, atmosphere)
- ✅ New app icon and splash (rendered from the game's art code)
- ⏳ Custom UI icon set (menus still use system emoji)

## 3. Game feel

- ✅ Landing-spot preview while aiming ("⛰️ Mountain 🐐 +13"), limited by aim-guide range
- ✅ Impact shockwaves, tiered callouts with chain counter, 3★ confetti
- ✅ Creature discovery card
- ✅ Meteor finale (finish early, and leftover throws become stardust)
- ✅ Screen transitions, reduce-motion setting
- ✅ Score counter that heats up
- ⏳ Level-complete fly-to-galaxy sequence

## 4. Progression

- ✅ Star Map: chapters of 10 planets with names, colors and chapter chests
- ✅ Star Road reward track, driven by total stars
- ✅ Daily quests (3 per day + completion bonus)
- ✅ Momentum win streak
- ✅ Hard / Super Hard planets
- ✅ Explorer Rank (3 standing goals; rank-ups unlock modes)
- ✅ Lifebook habitat sets

## 5. Modes

- ✅ Campaign
- ✅ Daily Planet with emoji share
- ✅ Meteor Rush: 60-second time attack
- ✅ Zen Garden: unlimited throws, a sandbox world that persists
- ✅ Challenge a Friend: share a code; friends play the same planet and compare (versus without a server)
- ✅ Weekly events (six themes rotating by ISO week, 6-tier reward track, exclusive atmosphere)
- 💭 Game Center leaderboards and achievements (needs a native plugin and App Store Connect setup)
- ❌ Live real-time versus: needs a server and fits a two-minute casual game poorly

## 6. Monetization

- ✅ Gem packs, Starter Pack, piggy bank, continues, boosters, atmospheres
- ✅ Cosmic Pass: one-time purchase for the premium Star Road lane (pays out retroactively)
- ✅ Welcome-back offer: double your offline stardust for gems
- ✅ Offer timing: Starter Pack after the first chest; piggy bank from chapter 2

## 7. Onboarding

- ✅ Guided first levels with coach tips
- ✅ New-object introduction cards
- ✅ First-creature celebration

## 8. Retention and platform

- ✅ Visitors and mementos while away
- ✅ Welcome-back recap
- ✅ Local notifications: vault full, daily gift ready (opt-in, never at night)
- ✅ App Store rating prompt at a happy moment
- ✅ Share Daily Planet results and challenge codes
- ⏳ Share a rendered planet postcard image
- ✅ Settings: reduce motion, reminders, credits

## 9. Audio

- ✅ Music that changes with each chapter
- ✅ Chest, level-up, callout and finale sounds

## 10. Localization

- ✅ English, Spanish, French, German, Brazilian Portuguese and Japanese (automatic or chosen in Settings)
- ✅ CI test: every string translated in every language, with matching placeholders
- ⏳ Localized App Store listing and screenshots

## 11. Ship

- ✅ Framed App Store screenshots, listing copy, privacy policy page
- ✅ Automated tests (world, recipes, economy, progression)
- ⏳ Full-playthrough QA on small and large iPhones
