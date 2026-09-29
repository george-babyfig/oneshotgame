# 05: Status and next steps (as of 29 September 2026, during the third session)

## Where things stand

- **Branch:** `claude/eager-planck-yfnmzf`, pushed up to `cb64557` (M2). The local session on the owner's Mac owns it. Other work on M3 may be uncommitted in the working tree: run `git status` and read [the M3 section](#m3-in-progress-the-first-ten-minutes) before touching `src/`.
- **PR:** george-babyfig/oneshotgame#2 is a **draft** with rounds 3–7, the product scope, ROADMAP-v2 and M0–M2. Merge only when the owner asks.
- **CI:** jobs `verify`, `sim-quick`, `e2e` and `ios-build`, plus a nightly sim run. Green through M1. The run for `cb64557` was still going when this was written; check `gh run list`.
- **Tests:** **257** Vitest tests and **36** Playwright e2e tests pass. Format and typecheck are clean, and the build works.
- **Playing it:** the iOS Simulator (iPhone 17 Pro, steps in [06-workflow.md](06-workflow.md)) or `npm run dev` in a browser. The old web build at https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR is still at Version 12 (rounds 1–6).
- **Linear:** the plan is mirrored in the project **"Pocket Planet — Launch Roadmap"**: https://linear.app/babyfig/project/pocket-planet-launch-roadmap-76fb6f2c54db (details in [06-workflow.md](06-workflow.md)).

## Built so far (third session)

| Milestone                                 | Commit               | Short version                                                                                                                                                                                        |
| ----------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 Kid-safe trust update                  | `9b78549`            | Parental gate on every outbound action, no system prompts to the child, plain dates, visitors without chance, one continue rule, no selling before value, fair competitive modes, churn stops paying |
| M1 Measure and guard                      | `dfaad28`, `962e526` | One wallet, a private ledger, one tuning file, privacy and terms lints, save goldens, time travel, `sim:quick`, the economy sim, Playwright J1 and J3, CI jobs                                       |
| M2 The round engine and the unlock ladder | `cb64557`            | `round.ts`, `modifiers.ts`, `flight.ts` (frame-rate independent), `unlocks.ts`, the scene split, the glossary test, frozen snapshots (planets 1–120 byte-identical)                                  |
| Product docs (not a milestone)            | `74be89c`            | [HOMEWORLD.md](../product/HOMEWORLD.md) and [FLIGHT.md](../product/FLIGHT.md); four new milestones; owner decisions 11–27                                                                            |

Each milestone's "✅ built" note in [ROADMAP-v2.md](../product/ROADMAP-v2.md) section 8 lists what shipped and the choices made while building.

## M3 in progress: the first ten minutes

Split into three Codex packages with separate files (ROADMAP-v2 M3 has the full scope and acceptance):

| Package | Scope                                                                                                                                                                   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A       | Ladder and difficulty moves: first Hard planet 15; Momentum from 17 and pauses on a fail; Supernova from planet 9 (solver matches); Festival 34; Voyage 20; Calendar 21 |
| B       | Title beat, purpose moment on the first win, pop-up governor, "While you were away" card                                                                                |
| C       | Practice planets 1–3 can't be failed, Coach 2.0, text size setting, VoiceOver live region                                                                               |

To finish M3: check each package's result, then run the rest of the per-milestone loop in [06-workflow.md](06-workflow.md) (checks, sims, Playwright, translations, adversarial reviews, fix pass, commit, CI, PR, roadmap note, Linear, report). Moving unlocks changes planet definitions, so the level snapshots will change on purpose: regenerate them with `UPDATE_FIXTURES=1` and say why in the commit. Also add `M3` to `BUILT` in `tests/glossary.test.ts` and make sure `KNOWN_UNTIL_M3` in `tests/unlocks.test.ts` (the crowded planets from M2: 1, 5 and 8) ends up empty.

## Next: the rest of ROADMAP-v2

The plan is **[docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md)**, with [HOMEWORLD.md](../product/HOMEWORLD.md) and [FLIGHT.md](../product/FLIGHT.md) for the Homeworld, launchers, sky obstacles, Combos and difficulty. **The launch candidate is 17 milestones** (about 44 team-weeks at first estimate). M13–M17 come after launch.

| Milestone | Goal                                                                                           | Size | Status      |
| --------- | ---------------------------------------------------------------------------------------------- | ---- | ----------- |
| M0        | Kid-safe trust update                                                                          | S    | ✅ built    |
| M1        | Measure and guard (no visible change)                                                          | M    | ✅ built    |
| M2        | The round engine and the unlock ladder (no visible change)                                     | L    | ✅ built    |
| **M3**    | The first ten minutes                                                                          | M    | In progress |
| M4        | One clear Home, Missions and Wishes                                                            | M    |             |
| M5        | Grown-ups and a fair checkout (**ask owner decision 1 first**)                                 | L    |             |
| M6        | Read every throw: HUD, Supernova 2.0, stats, feel                                              | L    |             |
| M6.5      | Showtime: animations, celebrations, living characters, avatars (owner's request)               | L    |             |
| M7        | Fusions, the first Clash and Combos                                                            | L    |             |
| M7.5      | Sky obstacles and real flight in the sims                                                      | L    |             |
| M8        | Troubles, traits, the Buddy, the help ladder and the difficulty program; rules freeze          | L    |             |
| M9        | Remix (REMIX.md)                                                                               | M    |             |
| M10       | Labs: your shots learn tricks                                                                  | L    |             |
| M10.5     | Launchers and the Launch Bay                                                                   | L    |             |
| M11       | Homeworld Level and a fair economy                                                             | M    |             |
| M11.5     | Homeworld Life: friends' days, lands and Landmarks (needs decision 25)                         | L    |             |
| M12       | Star Roads, the Styles catalogue and launch prep                                               | L    |             |
| M13–M17   | After launch: friends and trips, Road 1, content drop, Collector's Edition, Homeworld Horizons | —    |             |

- **Difficulty, the headline principle:** in the owner's words, "we dont want it too hard at the beginning but also not too easy, as both will cause a user to lose interest". The difficulty program (FLIGHT.md, M8) sets a floor and a ceiling per chapter; M3's ladder moves are the first step.
- **Owner decisions** 1–27 are in ROADMAP-v2 section 10. The stated defaults apply unless the owner says otherwise. **Ask decision 1** (retire gem packs and the piggy bank before launch) **before starting M5.**

## Baseline data (from M1)

Targets for later milestones:

- **Idle income:** a Regular player's idle stardust reaches **283×** their active earnings (M11 target: 1.5× or less).
- **Power:** the Object Lab and upgrades are maxed by **day 10** (M10 target: Labs last 28 days or more).
- **Level lint:** 23 planets flagged **EASY** and 44 **TRIVIAL** (the M8 difficulty program fixes these).
- **Planet 24:** no longer a wall (decent-bot fails 85% → 25%, via `LEVEL_SALT`).

## Known issues and caveats

- **Glossary watch list:** Japanese uses two different words for "galaxy" and for "festival", and Spanish has both "Guardián Cometa" and "Cometa Guardián". Fix these in a translation pass; `tests/glossary.test.ts` prints them.
- **Rate button:** "Rate Pocket Planet" in Settings can't fall back to the App Store page until the app has a store ID.
- **Voyage map previews all look alike.** They show each stop's starting planet, which is mostly bare rock.
- **Round 6 translations** (20 strings) were written by Claude without a native-speaker review. German uses "Accessoire" for "Accessory".
- **The difficulty sims ignore twists, swaps and aiming physics**, so real fail rates are probably higher. M7.5 adds real flight to the sims (the Scene Bot, using the `window.__scene` hooks from M2).
- **Not yet verified on real hardware:** StoreKit purchases, the game's feel on a device.
- **Research limits:** the cloud sessions' network blocked many sites, so some findings rest on search snippets. Each research file marks its confidence.

## Owner decisions and to-dos (things only George can do)

These are unchanged from the last session. They are also in the Linear document "Owner decisions and to-dos".

- **Decisions:** section 10 of [ROADMAP-v2.md](../product/ROADMAP-v2.md). Decision 1 is needed before M5.
- **Repo settings:** make the repo **private** (GitHub → Settings → General → Danger Zone) and switch the **default branch** to `main`.
- **App Store setup:**
  - an Apple Developer account
  - the bundle ID `com.pocketplanet.game`
  - Game Center IDs from `store/gamecenter.md`
  - in-app purchases (wait for decision 1)
  - the listing text and screenshots in `store/`
- **Playtest** in the Simulator, and say how the difficulty feels. M3 also asks for the T0 test: can 4 of 5 children aged 6–9 say what the game is for after 10 minutes?
- **Merge PR #2** when happy.
