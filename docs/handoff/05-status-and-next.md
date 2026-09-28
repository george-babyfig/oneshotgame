# 05: Status and next steps (as of 28 September 2026)

## Where things stand

- **Branch:** `claude/eager-planck-yfnmzf`. The head commit is `78f22e9` (festival and Voyage music) and the working tree is clean.
- **PR:** george-babyfig/oneshotgame#2 is a **draft** with rounds 3–7. CI is green (`verify` and `ios-build`), it merges cleanly, and it has no review comments. The owner hasn't said to merge it yet; mark it ready or merge only when they ask.
- **Tests:** 84 pass. Format and typecheck are clean, and the build works.
- **Playable web build:** https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR (private to the owner) is at Version 11, which is round 6. It **does not include** the round 7 music yet. Only a Claude session with the Artifact tool can republish it. A local session can instead run `npm run dev` or the iOS Simulator (see 06-workflow.md).

## In progress: round 7

The roadmap items after round 6 are an optional New Game+, iMessage stickers and festival music.

- [x] Festival music on the home screen while a festival runs (`THEMES.festival`), and a Voyage theme (`THEMES.voyage`). Both are in `src/ui/audio.ts` (commit `78f22e9`).
- [ ] **Listen to the new themes** in the running game and tweak them if they don't feel good.
- [ ] **Update ROADMAP.md** with a round 7 section (research table plus what shipped).
- [ ] **New Game+ / "Remix"** (the main remaining round 7 feature). The campaign is endless (levels are generated), so a classic New Game+ doesn't fit. The proposed design:
  - Remix any finished chapter: the same chapter, with different seeds (e.g. a `RMX-` seed prefix in `makeLevel`), tougher star targets and always-on goals.
  - It earns "Remix stars" shown on the Star Map, a gold chapter frame, and a Passport title. No new currency.
  - Needs: a profile field for remix stars, Star Map UI, tests (feasibility via `greedyPlan`), i18n and a roadmap entry.
- [ ] **iMessage sticker pack.** This needs a native iMessage extension target in Xcode, which is only feasible on a Mac. The stickers could be exported from `drawSticker` in `src/ui/art/stickers.ts` as PNGs.
- [ ] After each feature: tests, translations for all 5 languages, Playwright or Simulator QA, commit, push, update the PR description, and republish the playable build if possible.

## Known issues and caveats

- **Voyage map previews all look alike.** They show each stop's _starting_ planet, which is mostly bare rock with the cutaway core. It could show a hint of the target instead, or tint each preview by the stop's hue.
- **Round 6 translations** (20 strings: buddy, festival and Voyage letters, quests, achievements) were written by Claude without a native-speaker review. German uses "Accessoire" for "Accessory".
- **Zen Garden festival farming:** spotting creatures in Zen Garden counts toward festivals, so festival tiers can be filled quickly there. Rewards are small (max ~35 gems a month). Consider excluding Zen, or leave it as is.
- **Voyage replays** count toward the "Clear a Weekly Voyage stop" quest; this is intentional.
- **Not yet verified on real hardware:** real StoreKit purchases (only the StoreKit config file and the mock have been tested), the game's feel on a device, and installing the Simulator zip. The difficulty curve was tuned by simulation, not by hand.

## Owner to-dos (things only George can do)

- Make the repo **private**: GitHub → Settings → General → Danger Zone → Change visibility.
- Switch the repo's **default branch** to `main`.
- Create the leaderboard and achievement IDs in **App Store Connect → Game Center**. `store/gamecenter.md` has 27 achievements and 4 leaderboards.
- **App Store setup:**
  - an Apple Developer account and bundle ID `com.pocketplanet.game`
  - in-app purchase products matching `ios/App/PocketPlanet.storekit` (7 products)
  - the listing text and screenshots in `store/`
- **Playtest** on a device or the Simulator, and share how the difficulty feels.
- **Merge PR #2** when happy.

## Ideas for after round 7

These are drawn from the research tables' "next up" notes; none has been started.

- **Seasonal (rotating) passes** instead of a single permanent Cosmic Pass.
- **iMessage stickers**, as above.
- **Social without a server:** more share cards (e.g. an album page is already done); Game Center friend challenges.
- **Accessibility:** a colour-blind biome palette, a larger-text option, audio cues for landing previews.
- **Performance** on older iPhones: profile the canvas and cache planet and critter layers.
