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

<!-- MILESTONES -->

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
