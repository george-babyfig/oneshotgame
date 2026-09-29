# 05: Status and next steps (as of 29 September 2026, end of the third session)

## Where things stand

- **Branch:** `claude/eager-planck-yfnmzf`, pushed up to `755d533` (M7) plus this handoff. The working tree should be clean: run `git status`, and if it isn't, find out why before touching `src/`.
- **PR:** george-babyfig/oneshotgame#2 is a **draft** with rounds 3–7, the product scope, ROADMAP-v2 and M0–M7. Merge only when the owner asks.
- **CI:** jobs `verify` (with a `dist/` grep for `Balance Report`, `__i18n`, `__scene` and `__gate`), `sim-quick`, `e2e` (now three parallel jobs, one per browser project) and `ios-build`, plus a nightly sim run. Green on `755d533`. Check `gh run list` for the latest run before starting.
- **Tests:** **514** Vitest tests and **168** Playwright tests (J1, J2, J3, J6 overlap, J7 resume, `palette.spec`, `prices.spec`, `gate.spec`, `showtime.spec` in Chromium 320 and 390 and WebKit 390) pass. Format and typecheck are clean, and the build works. The Showtime frame-time gates only run locally; CI's runners have no GPU.
- **Playing it:** the iOS Simulator (iPhone 17 Pro, steps in [06-workflow.md](06-workflow.md)) or `npm run dev` in a browser. The old web build at https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR is still at Version 12 (rounds 1–6).
- **Linear:** the project **"Pocket Planet — Launch Roadmap"** should show M0–M7 as built, with decision 1 recorded: https://linear.app/babyfig/project/pocket-planet-launch-roadmap-76fb6f2c54db (details in [06-workflow.md](06-workflow.md)).
- **Decision 1 is answered** (29 September 2026): "Keep gem packs too". The 4 gem packs and the Piggy Bank stay as fixed-price consumables sold only in Grown-ups. Don't ask it again.

## Built so far (third session)

| Milestone                                 | Commit               | Short version                                                                                                                                                                                                                                            |
| ----------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 Kid-safe trust update                  | `9b78549`            | Parental gate on every outbound action, no system prompts to the child, plain dates, visitors without chance, one continue rule, no selling before value, fair competitive modes, churn stops paying                                                     |
| M1 Measure and guard                      | `dfaad28`, `962e526` | One wallet, a private ledger, one tuning file, privacy and terms lints, save goldens, time travel, `sim:quick`, the economy sim, Playwright J1 and J3, CI jobs                                                                                           |
| M2 The round engine and the unlock ladder | `cb64557`            | `round.ts`, `modifiers.ts`, `flight.ts` (frame-rate independent), `unlocks.ts`, the scene split, the glossary test, frozen snapshots (planets 1–120 byte-identical)                                                                                      |
| M3 The first ten minutes                  | `abac194`            | Title beat, practice planets 1–3 can't fail, purpose moment, pop-up governor, away card, Coach 2.0, ladder moves (Hard 15, Supernova 9, Momentum 17, Buddy 18, Voyage 20, Calendar 21, Festival 34), text size, VoiceOver                                |
| M4 One clear Home, Missions and Wishes    | `e923123`            | Five tabs with Back and a swipe, Next Up, Wishes from planet 12, Star Road points capped at 4 a day, Explorer Rank retired (modes 27/30/38/40), Field Guide, Styles after the chapter-1 chest                                                            |
| Decision 1 (roadmap)                      | `49c1abe`            | Gem packs and the Piggy Bank stay, sold only in Grown-ups; 12 products at launch (7 looks, 4 gem packs, Piggy Bank)                                                                                                                                      |
| M5 Grown-ups and a fair checkout          | `4d3ae5c`            | Gate v2, the Grown-ups area with the shop, the checkout charter (contents, receipt, Ask to Buy, quiet revocation, finish after save, launch reconciliation), a price-free kid side, Keeper Statue in stardust                                            |
| Product docs (not a milestone)            | `74be89c`            | [HOMEWORLD.md](../product/HOMEWORLD.md) and [FLIGHT.md](../product/FLIGHT.md); four new milestones; owner decisions 11–27                                                                                                                                |
| M6 Read every throw                       | `b310def`            | The queue and a landing card off the aim path, wander-off ghosts, one priority pop-up queue, Supernova 2.0, object stats in data with a solver retune, per-object feel, the Clear colour-blind-safe palette, resume a round after the web view is killed |
| M6.5 Showtime                             | `6712805`            | A shared motion kit, a living Home, celebrations through one `celebrate()`, all 36 creatures animated, the Keeper avatar creator, new looks and backdrops, one effective Reduce Motion                                                                   |
| M7 Fusions, the first Clash and Combos    | `755d533`            | Four Fusions and the first Clash (Dry Spell) in the round step and solver, a landing card that always previews from the full flight, Combos from planet 26, a tuning pass (casual fail 21–60 down to about 37%)                                          |

Each milestone's "✅ built" note in [ROADMAP-v2.md](../product/ROADMAP-v2.md) section 8 lists what shipped and the choices made while building.

**Measured along the way:** first fling 4.6–4.9 s after launch (M3); planets 1–10, decent bot fail/3★ 6%/61%, casual 11%/37% (M3); Home has 11 tap targets and 1 badge (M4); 103.5 free gems per active day for a Regular player (M4, band ≥ 95); 20 meta nouns by planet 20 (M4, cap 20); casual fail 21–60 from decision through M6 didn't move; M7's tuning pass brought it from 43.9% to about 37%; M6.5 measured 60 fps unthrottled on Home and while aiming, celebrations 0.85–2.6 s.

**Deferred to M12:** the other five looks products (Themes, the Planet Pack, Style Singles) arrive with their art. Starter Crew is currently the Aurora atmosphere, the Explorer suit, a trail and a Passport banner; the hat, launcher and paint are added in M12, free to existing buyers.

## In progress: M7.5, Sky obstacles and real flight in the sims

Start here. ROADMAP-v2 M7.5 has the full scope, files, acceptance and test plan. In short: five new twists that act on a shot in flight rather than on land — Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring and Tug Star, plus a gusty Solar Wind on Hard planets from 55; a red bonk badge warns before release whenever the full flight path would bonk or fizzle, so a child never gets an unwarned bonk; a bonk spends the throw but gives it back on practice bonks and, in full, under **Gentle planets**; Dense Core retires (the Swoop launcher gives the same bend as a choice); the sims fly shots for real from this milestone on (angle, power and release-time noise), so obstacles and aim twists finally count in difficulty.

- **Team:** three Codex packages — **F** (flight, sky obstacles, the level generator), **U** (the aim line, obstacle art, and the Gentle planets setting), **S** (flying bots, the Scene Bot and reach) — then the loop in [06-workflow.md](06-workflow.md).
- **Owner-facing decision surfacing here:** a **"Gentle planets"** setting in Grown-ups (Troubles don't act, Clashes don't fire, nothing is marked, stars count normally) is part of this milestone and several later ones depend on it (the roadmap relies on it existing). It ships **off by default**. No owner decision is needed to build it; decision 25 (Homeworld Life, M11.5) is a separate, later question.

## Next after that: M8

M8 (Troubles, traits, the Buddy, the help ladder and the difficulty program) freezes the round rules after it ships, so plan for it once M7.5 lands.

## Next: the rest of ROADMAP-v2

The plan is **[docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md)**, with [HOMEWORLD.md](../product/HOMEWORLD.md) and [FLIGHT.md](../product/FLIGHT.md) for the Homeworld, launchers, sky obstacles, Combos and difficulty. **The launch candidate is 17 milestones** (about 44 team-weeks at first estimate). M13–M17 come after launch.

| Milestone | Goal                                                                                           | Size | Status          |
| --------- | ---------------------------------------------------------------------------------------------- | ---- | --------------- |
| M0        | Kid-safe trust update                                                                          | S    | ✅ built        |
| M1        | Measure and guard (no visible change)                                                          | M    | ✅ built        |
| M2        | The round engine and the unlock ladder (no visible change)                                     | L    | ✅ built        |
| M3        | The first ten minutes                                                                          | M    | ✅ built        |
| M4        | One clear Home, Missions and Wishes                                                            | M    | ✅ built        |
| M5        | Grown-ups and a fair checkout (decision 1: gem packs stay)                                     | L    | ✅ built        |
| M6        | Read every throw: HUD, landing card, Supernova 2.0, stats, feel, colour, resume                | L    | ✅ built        |
| M6.5      | Showtime: animations, celebrations, living characters, avatars (owner's request)               | L    | ✅ built        |
| M7        | Fusions, the first Clash and Combos                                                            | L    | ✅ built        |
| **M7.5**  | Sky obstacles and real flight in the sims                                                      | L    | **In progress** |
| M8        | Troubles, traits, the Buddy, the help ladder and the difficulty program; rules freeze          | L    |                 |
| M9        | Remix (REMIX.md)                                                                               | M    |                 |
| M10       | Labs: your shots learn tricks                                                                  | L    |                 |
| M10.5     | Launchers and the Launch Bay                                                                   | L    |                 |
| M11       | Homeworld Level and a fair economy                                                             | M    |                 |
| M11.5     | Homeworld Life: friends' days, lands and Landmarks (needs decision 25)                         | L    |                 |
| M12       | Star Roads, the Styles catalogue and launch prep                                               | L    |                 |
| M13–M17   | After launch: friends and trips, Road 1, content drop, Collector's Edition, Homeworld Horizons | —    |                 |

- **Difficulty, the headline principle:** in the owner's words, "we dont want it too hard at the beginning but also not too easy, as both will cause a user to lose interest". The difficulty program (FLIGHT.md, M8) sets a floor and a ceiling per chapter; M3's ladder moves are the first step.
- **Owner decisions** 1–27 are in ROADMAP-v2 section 10. Decision 1 is answered (gem packs stay, Grown-ups only). The stated defaults apply to the rest unless the owner says otherwise; M11.5 needs decision 25.

## Baseline data (from M1)

Targets for later milestones:

- **Idle income:** a Regular player's idle stardust reaches **283×** their active earnings (M11 target: 1.5× or less).
- **Power:** the Object Lab and upgrades are maxed by **day 10** (M10 target: Labs last 28 days or more).
- **Level lint:** 23 planets flagged **EASY** and 44 **TRIVIAL** (the M8 difficulty program fixes these).
- **Planet 24:** no longer a wall (decent-bot fails 85% → 25%, via `LEVEL_SALT`).

## Known issues and caveats

- **Planet 15's Hard band is too easy.** The first Hard planet moved to 15 in M3, but the sims show it doesn't yet feel Hard. M8 (Troubles and the difficulty program) tunes it.
- **Planets 1 and 4 share the name "Dewdrop Haven".** The name generator repeats; fix it when level names are next touched (it changes level snapshots on purpose).
- **Title screen:** the planet's glow is clipped at the bottom of the canvas.
- **Ask to Buy limit:** the `@capgo/native-purchases` plugin finishes an Ask to Buy approval before it tells the game. Launch reconciliation (`reconcilePurchases()`) recovers it, unless the save itself is lost.
- **Gate v2 needs a T0 check:** English and hiragana number words may be readable by children aged 9–11. Test it with real children before launch.
- **Glossary `BUILT` is current.** `tests/glossary.test.ts` lists M0 through M7 in `BUILT`; update it again the moment M7.5 ships.
- **Glossary watch list:** `tests/glossary.test.ts` prints known translation inconsistencies still to fix. M3 fixed the Japanese galaxy/festival words and some Spanish/Portuguese wording; check the printed list for what's left.
- **Rate button:** "Rate Pocket Planet" in Settings can't fall back to the App Store page until the app has a store ID.
- **Voyage map previews all look alike.** They show each stop's starting planet, which is mostly bare rock.
- **Round 6 translations** (20 strings) were written by Claude without a native-speaker review. German uses "Accessoire" for "Accessory".
- **The difficulty sims ignore twists, swaps and aiming physics**, so real fail rates are probably higher. M7.5 adds real flight to the sims (the Scene Bot, using the `window.__scene` hooks from M2).
- **Wildflowers and Glacier are verified only in chance play**, not in a scripted or forced solver path — confirm they trigger reliably along the solver's own line before relying on the M7 bands.
- **Not yet verified on real hardware:** StoreKit purchases (including Ask to Buy and revocation); the game's feel — sound and haptics, including the new M6/M7 per-object feedback and Fusion/Combo cues — has not yet been checked on a real phone.
- **Research limits:** the cloud sessions' network blocked many sites, so some findings rest on search snippets. Each research file marks its confidence.

## Owner decisions and to-dos (things only George can do)

These are also in the Linear document "Owner decisions and to-dos".

- **Decisions:** section 10 of [ROADMAP-v2.md](../product/ROADMAP-v2.md). Decision 1 is answered.
- **Repo settings:** make the repo **private** (GitHub → Settings → General → Danger Zone) and switch the **default branch** to `main`.
- **App Store setup:**
  - an Apple Developer account
  - the bundle ID `com.pocketplanet.game`
  - Game Center IDs from `store/gamecenter.md`
  - the **12 in-app purchase products** in App Store Connect when ready (7 looks, 4 gem packs, the Piggy Bank; see ROADMAP-v2 section 6.1 and `ios/App/PocketPlanet.storekit`)
  - the listing text and screenshots in `store/`
- **Playtest** in the Simulator, and say how the difficulty feels.
- **T0 kid playtests:** M3 asks whether 4 of 5 children aged 6–9 can say what the game is for after 10 minutes. Gate v2 also needs a T0 check: can children aged 9–11 read the number words and pass the gate?
- **Merge PR #2** when happy.
