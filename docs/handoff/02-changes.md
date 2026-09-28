# 02: Changes, commit by commit

The branch is `claude/eager-planck-yfnmzf`. `main` holds everything up to PR george-babyfig/oneshotgame#1 (commit `9aab81c`). Everything after that is in the open draft PR george-babyfig/oneshotgame#2. Run `git log --stat` for file-level detail.

## Round 1–2: the base game (merged to `main` in PR #1)

| Commit               | Change                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1f03461`            | Initialize repository                                                                                                                                             |
| `e33cb30`            | Pocket Planet game: slingshot aiming with gravity, 17 biomes, 36 creatures, levels with star targets set by a greedy solver, idle galaxy stardust, upgrades, shop |
| `d1c5541`            | Tooling (Prettier, Vitest, TypeScript), CI, modular architecture (`src/core`, `src/meta`, `src/ui`)                                                               |
| `2c8c958`            | Research-backed ROADMAP.md, game-feel upgrades (landing preview, callouts, chains, shockwaves, confetti)                                                          |
| `3774301`            | Modes (Daily Planet, Meteor Rush, Zen Garden, Challenge a Friend), Momentum streak, Hard planets, Visitors, Explorer Rank, habitat sets                           |
| `d472838`            | Custom vector art replacing all emoji in the game world                                                                                                           |
| `619d676`            | Onboarding tips, object intro cards, well-timed offers                                                                                                            |
| `9fcfa3d`            | Opt-in reminders, App Store rating prompt                                                                                                                         |
| `19b989a`            | Themed music, save backups, crash recovery                                                                                                                        |
| `2d3b825`            | New app icon and splash, Lifebook tidy-up, balance tests                                                                                                          |
| `c8ccb90`            | App Store listing, screenshots, privacy policy, README                                                                                                            |
| `f93e52c`            | Weekly events                                                                                                                                                     |
| `b36c6f0`            | Planet postcards, a crisper planet cutaway                                                                                                                        |
| `1f6645e`            | Finished planets fly up to join the galaxy                                                                                                                        |
| `b6bdcad`            | Custom UI icon set, refreshed screenshots                                                                                                                         |
| `a146018`            | Better store screenshot aim preview                                                                                                                               |
| `dfdd3ca`–`2fec883`  | i18n layer (English text is the key); Brazilian Portuguese, German, Spanish, Japanese and French translations; i18n coverage test                                 |
| `547df48`            | Roadmap: localization                                                                                                                                             |
| `227f99a`, `0cab670` | Meteor Rush best-score reward text and constant                                                                                                                   |
| `1313a8e`            | Game Center: 4 leaderboards, 22 achievements, a Swift plugin                                                                                                      |
| `99842ec`            | About 25 bug fixes from a full review                                                                                                                             |
| `bd8e378`            | Localized App Store listings and screenshots; translated rarity names                                                                                             |
| `afb8de3`            | Docs: Game Center, languages, QA status                                                                                                                           |
| `b52138e`            | CI: build the iOS app for the Simulator on macOS                                                                                                                  |
| `e71d1ee`            | Four physics twists (Solar Wind, Dense Core, Wobbly Spin, Twin Moons)                                                                                             |
| `0f41b96`            | CI: checkout@v5 / setup-node@v5                                                                                                                                   |
| `83f02ae`            | Roadmap: mark shipped items                                                                                                                                       |
| `9aab81c`            | **Merge of PR #1 into `main`**                                                                                                                                    |

## Rounds 3–7 (open draft PR #2)

| Commit           | Change                                                                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `86ac708`        | CI publishes a ready-to-install **PocketPlanet-Simulator** zip; README install steps                                                                                                                                                                                         |
| `327126d`        | **Keeper** avatar beside the launcher, **Workshop** cosmetics (suits, hats, launchers, trails) with try-on and launcher mastery, **Planet Passport** (kid-safe word-list names, titles, banners, badges, share card)                                                         |
| `571ca4a`        | **Cosmic Pass** animated hero art and a dedicated pass screen                                                                                                                                                                                                                |
| `fd08779`        | **Homeworld**: passive base-building planet with rings, buildings, drones, producers, residents, expeditions, meteor debris                                                                                                                                                  |
| `5346336`        | Translations for the new features; cosmetics and passport tests                                                                                                                                                                                                              |
| `b1ea5b2`        | **Real challenge**: level goals from planet 6 (taken from the solver's plan so they're always feasible), sawtooth difficulty curve (`TUNE`), Hard/Super Hard, fail screen with "Still needed" and "So close!", `npm run sim` bot simulation                                  |
| `89bcb00`        | **Object Lab** (per-object levels 1–5, life-only perks) and the **Supernova** shot (meter fills as land changes; +1 radius, +1 life)                                                                                                                                         |
| `1cc5791`        | Roadmap: round 3 research                                                                                                                                                                                                                                                    |
| `2341823`        | Emotes, **Star Calendar** (28 stamps, never resets), **parental gate** before purchases, real-calendar **seasons** and meteor showers, Homeworld **paint** and **photo mode**                                                                                                |
| `fe15465`        | Object records, resident nicknames, Lifebook field notes and lore, **Inbox** of letters                                                                                                                                                                                      |
| `ff86e69`        | **Comet Guardian** boss planets (every 10th from 10); round 4 translations; roadmap                                                                                                                                                                                          |
| `249b48e`        | Resident dress-up (accessories), Keeper outfit presets                                                                                                                                                                                                                       |
| `0d7cb65`        | **Star Atlas**: planets drop materials; fill bundles to relight 6 constellations                                                                                                                                                                                             |
| `383753f`        | **Dye** system: 16 dyes for suit body and trim                                                                                                                                                                                                                               |
| `d8c626f`        | Roadmap: Star Atlas, dyes, accessories, presets                                                                                                                                                                                                                              |
| `b8bcfc9`        | **27 bug fixes** from three code reviews, including: gem farming via re-invite, free production from speed-ups, inbox re-delivery, lost Supernova charge, boss overlapping the launcher, stuck purchases, stacked pop-ups, 320px top bar                                     |
| `5bea675`        | **Round 5**: monthly **festivals** (12, a creature costume each month, 10 new drawn accessories), **Weekly Voyage** (7 seeded planets per ISO week with goals and a boss), **Sticker Album** (63 earned-only stickers plus a 3-page drag/rotate/resize scrapbook, shareable) |
| `56a5930`        | **Round 6**: **Buddy** companion (a befriended creature beside the Keeper, a Workshop tab, on the Passport), quests for Voyage and festivals, festival/Voyage/buddy letters, residents in festival costume, 5 new achievements (27 total)                                    |
| `78f22e9`        | Round 7 start: festival (home screen) and Voyage music themes                                                                                                                                                                                                                |
| `9542729`        | Handoff docs (`docs/handoff/`) for continuing in a new session                                                                                                                                                                                                               |
| `fdb8aac`        | Full conversation transcript added to the handoff docs                                                                                                                                                                                                                       |
| `911d004`        | **Second session.** Festival music plays only while the month's festival still has tiers to earn (`festivalLive`); it had replaced the home theme for good from planet 8. The Voyage map uses the Voyage theme. +1 test (85)                                                 |
| _(this handoff)_ | `npm run music` (`resources/render-music.cjs`) records every theme to WAV; **docs/product/ROADMAP-v2.md**, the senior-PM scope and milestone plan; ROADMAP.md round 7 section; handoff docs and PROMPT.md updated for a local session with Codex                             |

## Also in the repo

- **Test count:** 85 tests pass (`npm test`). The i18n test enforces all 5 locales and placeholder matching.
- **CI on PR #2:** `verify` (format, typecheck, tests, build) and `ios-build` (Xcode Simulator build plus the zip) were both green on `911d004`. The handoff commit's CI result is in the PR.
