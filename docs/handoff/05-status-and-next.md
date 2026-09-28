# 05: Status and next steps (as of 28 September 2026, end of the second session)

## Where things stand

- **Branch:** `claude/eager-planck-yfnmzf`, pushed, with a clean working tree. The cloud sessions have stopped, so the next (local) session owns the branch.
- **PR:** george-babyfig/oneshotgame#2 is a **draft** with rounds 3–7 and the product scope. CI (`verify` and `ios-build`) is green on every commit except `3014b7b`, which had a formatting slip that the next commit fixed. It merges cleanly and has no review comments. Merge only when the owner asks.
- **Tests:** 85 pass. Format and typecheck are clean, and the build works.
- **Playable web build:** https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR (private to the owner) is at **Version 12**: rounds 1–6 plus the round 7 music. A local session may not have the Artifact tool. The Simulator is the main way to play from now on.
- **Simulator download:** every CI run uploads **PocketPlanet-Simulator** (steps in [06-workflow.md](06-workflow.md)).

## Done in the second session

- **Music:** festival and Voyage themes checked with offline recordings (`npm run music`). One bug fixed: the festival tune had permanently replaced the home music from planet 8.
- **Round 7 research**, the ROADMAP.md round 7 section, and the full [Remix and iMessage spec](../product/REMIX.md).
- **Product scope**, a senior-PM review run with sub-agents:
  - audits of the gameplay, economy, Homeworld and first-session journey
  - three research sweeps
  - 45 proposals from 5 PMs
  - 5 adversarial critiques
  - a head-of-product roadmap: **[docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md)**
  - The raw material is in [docs/product/scope/](../product/scope/README.md).

## What the scope found (short version)

These are the owner's "what is the point?" questions, answered by the audits:

- **Levels:** the best throw is usually just "aim at the biggest number" in the landing preview. There are no combos, nothing on the planet pushes back, and the Object Lab's flat bonuses make levels too easy.
- **Stardust:** it piles up from idle income, and after the Lab there is little worth buying.
- **Gems:** there are more free gems than things to spend them on, so gem packs have almost nothing to sell. Realistic revenue per payer is capped near $8.
- **Homeworld:** production only feeds more production. Nothing there changes a throw, residents are cosmetic, and nothing can be lost or decided.
- **Onboarding:**
  - Planet 1 can be failed, and the failure shows a gem continue.
  - A new player meets about 21 buttons on the home screen and a calendar pop-up they can't dismiss.
  - The iPhone SE home screen clips buttons.
- **Compliance gaps in the current build (fix first):**
  - sharing has no parental gate
  - Game Center sign-in, notification permission and rating prompts are shown to the child
  - free events show ticking countdowns
  - visitors hand out random gems

## Next: build ROADMAP-v2, milestone by milestone

The plan is **[docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md)**. Read it in full; section 8 has each milestone's scope, the files it touches, acceptance criteria, test plan and string count. **The launch candidate is M0–M12.** The game is pre-launch, so changing the economy, the Homeworld and the store now costs nothing. M13–M16 are the first updates after launch.

| Milestone | Goal                                                                                      | Size | Headline gate                                         |
| --------- | ----------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| **M0**    | Kid-safe trust update: the compliance fixes in today's build. **Start here.**             | S    | Every policy test green                               |
| M1        | Measure and guard: one wallet, a private on-device ledger, sims in CI (no visible change) | M    | 0 direct wallet writes; sims in CI                    |
| M2        | The shared round engine and the one-idea-per-planet unlock ladder (no visible change)     | L    | Planets 1–60 unchanged byte for byte                  |
| M3        | The first ten minutes                                                                     | M    | 0 prices, pop-up walls or system prompts in session 1 |
| M4        | One clear Home, Missions and Wishes                                                       | M    | ≤ 12 Home targets; nothing clipped at 320×568         |
| M5        | Grown-ups area and a fair checkout (**needs owner decision 1**)                           | L    | Store and paywall tests green                         |
| M6        | Read every throw: HUD, Supernova 2.0, object stats, feel                                  | L    | 0 overlapping text; 2–3 Supernovas per planet         |
| M7        | Fusions and the first Clash (shot synergies)                                              | M    | Aware vs blind 3★ gap ≥ 10 points                     |
| M8        | Troubles (hazards), creature traits, the Buddy, the help ladder; rules freeze             | L    | Every difficulty band green                           |
| M9        | Remix, as designed in REMIX.md                                                            | M    | REMIX.md test list green                              |
| M10       | Labs: your shots learn tricks on the Homeworld                                            | L    | Max-loadout band; Labs last ≥ 28 days                 |
| M11       | Homeworld Level and a fair economy                                                        | M    | Idle ≤ 1.5× active; no stranded currency              |
| M12       | Star Roads, the Styles catalogue and launch prep                                          | L    | 7 products pass the StoreKit matrix                   |

Sizes are first estimates in team-weeks (S ≈ 1, M ≈ 2, L ≈ 3), with Codex doing most of the coding. Re-plan after M1 once the pace is known.

**Owner decisions** are in section 10 of the roadmap. Each has a recommendation and a default that applies if the owner doesn't answer. Ask for decision 1 (retire gem packs and the piggy bank before launch) before starting M5.

How to build each milestone as a studio, with Codex as lead developer: [06-workflow.md](06-workflow.md), "Running it like a dev team".

## Also planned

- **Remix** (spec in [REMIX.md](../product/REMIX.md)): scheduled in ROADMAP-v2. It only needs `makeLevel`, so it can be built in parallel once the new round rules are frozen.
- **iMessage sticker pack:** the PNG export script can be written anywhere. The Xcode extension target, icons and signing need the Mac. Spec in REMIX.md.

## Known issues and caveats

- **Voyage map previews all look alike.** They show each stop's starting planet, which is mostly bare rock.
- **Round 6 translations** (20 strings) were written by Claude without a native-speaker review. German uses "Accessoire" for "Accessory".
- **Zen Garden festival farming:** spotting creatures in Zen counts toward festivals. Rewards are small.
- **Voyage replays** count toward the "Clear a Weekly Voyage stop" quest. This is intentional.
- **The difficulty simulation ignores twists, swaps and aiming physics**, so real fail rates are probably higher than `npm run sim` says (economy audit).
- **Not yet verified on real hardware:** StoreKit purchases, the game's feel on a device, and installing the Simulator zip.
- **Research limits:** the cloud network blocked many sites (App Store pages, Wikipedia, 9to5mac…), so some findings rest on search snippets. Each research file marks its confidence.

## Owner decisions and to-dos (things only George can do)

- **Decisions the roadmap needs:** see section 10 of [ROADMAP-v2.md](../product/ROADMAP-v2.md). The biggest is whether to retire gem packs and the piggy bank before launch, in favour of a store where money buys looks only. Nothing exists in App Store Connect yet, so switching now costs nothing.
- **Run the next session locally:** see [PROMPT.md](PROMPT.md). Check that Xcode and Codex work on the Mac.
- **Repo settings:** make the repo **private** (GitHub → Settings → General → Danger Zone) and switch the **default branch** to `main`.
- **App Store setup:**
  - an Apple Developer account
  - the bundle ID `com.pocketplanet.game`
  - Game Center IDs from `store/gamecenter.md`
  - in-app purchases (wait for the catalogue decision above)
  - the listing text and screenshots in `store/`
- **Playtest** in the Simulator or on a device, and say how the difficulty feels.
- **Merge PR #2** when happy.
