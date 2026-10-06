# 05: Status and next steps (as of 6 October 2026, third session, after M11.5)

## Where things stand

- **Branch:** `claude/eager-planck-yfnmzf`, pushed up to the M9 commit (Remix) plus this handoff. The working tree should be clean: run `git status`, and if it isn't, find out why before touching `src/`.
- **PR:** george-babyfig/oneshotgame#2 is a **draft** with rounds 3–7, the product scope, ROADMAP-v2, M0–M9 and launch prep. Merge only when the owner asks.
- **CI:** jobs `verify` (with a `dist/` grep for `Balance Report`, `__app`, `__i18n`, `__scene` and `__gate`), `sim-quick`, `balance` (new in M8: the pooled 1–60 curve and two-sided lint, including `GOAL-RAMP` and `TEACH`; since M9 also the Remix gate `tests/sim/remix.sim.ts`; 30-minute limit), `e2e` (three parallel jobs, one per browser project) and `ios-build`, plus a nightly sim run. Check `gh run list` for the latest run before starting; M11's commit `f90ca03` was green except the launcher gate fixed in M11.5 (decision 54).
- **Tests:** **844** Vitest tests (2 skipped) and **480** Playwright tests (263 run, 217 skipped by design for their screen size) across J1-J7 and the palette, prices, gate, showtime, scenebot and sky specs, in Chromium 320/390 and WebKit 320/390. Format and typecheck are clean, and the build works. The Showtime frame-time gates only run locally; CI's runners have no GPU. J2 now requires an explicit Back or Close control on every sheet it opens.
- **Playing it:** the iOS Simulator (iPhone 17 Pro, steps in [06-workflow.md](06-workflow.md)) or `npm run dev` in a browser. The old web build at https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR is still at Version 12 (rounds 1–6) — nobody has republished it since; a local session has no Artifact tool.
- **Linear:** the project **"Pocket Planet — Launch Roadmap"** shows M0–M8 as built, the M12 launch-prep progress, and decisions 28–32 with the owner's to-dos in "Owner decisions and to-dos" (updated 30 September 2026): https://linear.app/babyfig/project/pocket-planet-launch-roadmap-76fb6f2c54db (details in [06-workflow.md](06-workflow.md)).
- **Decisions answered:** 1 ("keep gem packs too") and now also 28–32, all from this session (see below and [01-history.md](01-history.md) §28, §31). Don't ask any of these again.
- **The game's player-facing name is now Comet Garden**, renamed from Pocket Planet after App Store research found the old name already taken. The repo, the bundle ID (`com.pocketplanet.game`), every IAP product ID and every Game Center ID still read `pocketplanet` on purpose — only what players see changed.

## Built so far (third session)

| Milestone                                                                   | Commit               | Short version                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 Kid-safe trust update                                                    | `9b78549`            | Parental gate on every outbound action, no system prompts to the child, plain dates, visitors without chance, one continue rule, no selling before value, fair competitive modes, churn stops paying                                                          |
| M1 Measure and guard                                                        | `dfaad28`, `962e526` | One wallet, a private ledger, one tuning file, privacy and terms lints, save goldens, time travel, `sim:quick`, the economy sim, Playwright J1 and J3, CI jobs                                                                                                |
| M2 The round engine and the unlock ladder                                   | `cb64557`            | `round.ts`, `modifiers.ts`, `flight.ts` (frame-rate independent), `unlocks.ts`, the scene split, the glossary test, frozen snapshots (planets 1–120 byte-identical)                                                                                           |
| M3 The first ten minutes                                                    | `abac194`            | Title beat, practice planets 1–3 can't fail, purpose moment, pop-up governor, away card, Coach 2.0, ladder moves (Hard 15, Supernova 9, Momentum 17, Buddy 18, Voyage 20, Calendar 21, Festival 34), text size, VoiceOver                                     |
| M4 One clear Home, Missions and Wishes                                      | `e923123`            | Five tabs with Back and a swipe, Next Up, Wishes from planet 12, Star Road points capped at 4 a day, Explorer Rank retired (modes 27/30/38/40), Field Guide, Styles after the chapter-1 chest                                                                 |
| Decision 1 (roadmap)                                                        | `49c1abe`            | Gem packs and the Piggy Bank stay, sold only in Grown-ups; 12 products at launch (7 looks, 4 gem packs, Piggy Bank)                                                                                                                                           |
| M5 Grown-ups and a fair checkout                                            | `4d3ae5c`            | Gate v2, the Grown-ups area with the shop, the checkout charter (contents, receipt, Ask to Buy, quiet revocation, finish after save, launch reconciliation), a price-free kid side, Keeper Statue in stardust                                                 |
| Product docs (not a milestone)                                              | `74be89c`            | [HOMEWORLD.md](../product/HOMEWORLD.md) and [FLIGHT.md](../product/FLIGHT.md); four new milestones; owner decisions 11–27                                                                                                                                     |
| M6 Read every throw                                                         | `b310def`            | The queue and a landing card off the aim path, wander-off ghosts, one priority pop-up queue, Supernova 2.0, object stats in data with a solver retune, per-object feel, the Clear colour-blind-safe palette, resume a round after the web view is killed      |
| M6.5 Showtime                                                               | `6712805`            | A shared motion kit, a living Home, celebrations through one `celebrate()`, all 36 creatures animated, the Keeper avatar creator, new looks and backdrops, one effective Reduce Motion                                                                        |
| M7 Fusions, the first Clash and Combos                                      | `755d533`            | Four Fusions and the first Clash (Dry Spell) in the round step and solver, a landing card that always previews from the full flight, Combos from planet 26, a tuning pass (casual fail 21–60 down to about 37%)                                               |
| M7.5 Sky obstacles and real flight in the sims                              | `609c6e6`            | Five sky obstacles with an honest, full-path aim line and a bonk badge, a practice bonk on teaching planets, Gentle planets, Dense Core retired, sims that finally fly shots for real                                                                         |
| M8 Troubles, traits, the Buddy, the help ladder and the difficulty program  | `d4241a9`            | Three Troubles with a forecast strip, traits for all 36 creatures, the Buddy from Homeworld residents, one help ladder, the rules freeze (`RULES_VERSION = 1`), the difficulty program (decisions 28–29), the new `balance` CI job                            |
| CI fix                                                                      | `f5ea95c`            | The `balance` job's 10-minute default was too tight for GitHub's runners (about 8 min on a Mac); job limit raised to 30 minutes                                                                                                                               |
| Aim tag (launch prep, owner request)                                        | `fc26e93`            | The score and every landing fact move back onto the planet itself at the predicted spot, replacing the M6 landing card (`src/ui/aimtag.ts`)                                                                                                                   |
| Rename to Comet Garden + site (launch prep, decisions 30, 32)               | `db1872f`            | Every player-facing name reads Comet Garden; bundle ID, product IDs and Game Center IDs unchanged; new `site/` (landing, support/FAQ, privacy in 6 languages, press kit, dev notes)                                                                           |
| App Store package (launch prep, decision 31)                                | `528bc37`            | `store/`: 6-language listings, compliance doc, App Store Connect checklist, 48 captioned screenshots, a contact sheet and an App Preview video                                                                                                                |
| Site fix                                                                    | `baddb87`            | A broken `alt` attribute on the site (straight quotes inside alt text)                                                                                                                                                                                        |
| Store art v2 "Sticker Scrapbook" + social pack (launch prep, owner request) | `1d3311e`            | A 166-game study of store screenshots (`docs/product/store-art-research.md`), a design contest, then `store/screenshots-v2/` (real captures in paper photo cards with die-cut stickers, 6 languages), `store/social/`; also fixed see-through Homeworld plots |
| M9 Remix (+ planet-name localization)                                       | (this push)          | A harder, opt-in bonus run of each finished chapter: one twist and one goal per planet, targets one notch up, no help and no payouts, dusk look, frames/titles/sticker/5 achievements; localized planet names; the new-creature card clears the goals row     |
| M10 Labs                                                                    | (this push)          | Six Lab buildings with one instant ladder each (Labs only ever help, decision 44), Guard perks, optional top forms, Essences, the two-step first hour, VoiceOver plot list, J5                                                                                |
| Launch-hardening sprint (from docs/product/LAUNCH-READINESS.md)             | (this push)          | Share crash, privacy manifest, Game Center registration, in-app privacy text, icon alpha, iOS 15.4, six declared languages, release script, save recovery, achievements-only Game Center, J4, CI archive and smoke jobs                                       |
| M10.5 Launchers and the Launch Bay + decision-29 generator fix              | (this push)          | Launch roster Sling/Swoop/Zip/Thumper (decision 51; three more wait for M15), the Launch Bay with tunes and free practice, Comet Pier progress; raw-v2 generator for planets 61-120 (lint 62 → 17 flags) with shadow gates restored                           |
| M11 Homeworld Level and a fair economy                                      | `f90ca03`            | Homeworld Levels 1-5, the win-fuelled Vault, the Greenhouse choice, Upgrades/Mills/Groves/Observatory retired with refunds, stardust looks, a v4 save migration; every economy band green on two seeds (decisions 52-53)                                      |
| M11.5 Homeworld Life + launch extras                                        | (this push)          | Friends' routines, weather and seasons drawn; lands between plots; five Landmarks with 4 drawn stages, the Floating Isle and Beacon music; v5 saves; a device-only diagnostic code, site privacy lint and support kit; decisions 54-55                        |

Each milestone's "✅ built" note in [ROADMAP-v2.md](../product/ROADMAP-v2.md) section 8 lists what shipped and the choices made while building.

**Measured along the way:** first fling 4.6–4.9 s after launch (M3); planets 1–10, decent bot fail/3★ 6%/61%, casual 11%/37% (M3); Home has 11 tap targets and 1 badge (M4); 103.5 free gems per active day for a Regular player (M4, band ≥ 95); 20 meta nouns by planet 20 (M4, cap 20); casual fail 21–60 from decision through M6 didn't move; M7's tuning pass brought it from 43.9% to about 37%; M6.5 measured 60 fps unthrottled on Home and while aiming, celebrations 0.85–2.6 s. **After M8's difficulty program** (pooled, decision 28's "Kid-first" bands): Normal casual fail 1–10 11.8%, 11–20 15.7%, 21–30 21.2%, 31–60 23.8%; Hard 25+ casual 43.9% / decent 13.8%; zero gated lint flags on planets 1–60; Trouble cost blind 5.1%, max loadout 4.3%.

**Deferred to M12:** the other five looks products (Themes, the Planet Pack, Style Singles) arrive with their art. Starter Crew is currently the Aurora atmosphere, the Explorer suit, a trail and a Passport banner; the hat, launcher and paint are added in M12, free to existing buyers. **Also deferred to M12 (decision 29):** bringing the raw "shadow" level generator into the same difficulty band as the hand-reviewed campaign salts.

## Next: M12 Star Roads, Styles and launch prep

M10, M10.5, the launch-hardening sprint, the decision-29 generator fix, M11 and M11.5 are built. Next is **M12** Star Roads, Styles and launch prep (decisions 48-50), the last launch-candidate milestone; its five Codex briefs (S, A-D, plus E launch extras already shipped with M11.5) are in the session scratchpad and are re-creatable from the build map. Build maps for all three were written from ROADMAP-v2 §8 and HOMEWORLD.md; re-create them if the scratchpad is gone. **The launch audit** is `docs/product/LAUNCH-READINESS.md`: it lists the remaining studio work, everything only the owner can do (Apple account, agreements, hosting, trademark, devices, playtests), and the owner checklist (also in Linear). **Decisions 33-55** are open with defaults applied (ROADMAP-v2 §10); 54 and 55 (M11.5) restate how two sim gates measure the max loadout and "money never buys growth".

## Next: the rest of ROADMAP-v2

The plan is **[docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md)**, with [HOMEWORLD.md](../product/HOMEWORLD.md) and [FLIGHT.md](../product/FLIGHT.md) for the Homeworld, launchers, sky obstacles, Combos and difficulty. **The launch candidate is 17 milestones** (about 44 team-weeks at first estimate). M13–M17 come after launch.

| Milestone | Goal                                                                                           | Size | Status   |
| --------- | ---------------------------------------------------------------------------------------------- | ---- | -------- |
| M0        | Kid-safe trust update                                                                          | S    | ✅ built |
| M1        | Measure and guard (no visible change)                                                          | M    | ✅ built |
| M2        | The round engine and the unlock ladder (no visible change)                                     | L    | ✅ built |
| M3        | The first ten minutes                                                                          | M    | ✅ built |
| M4        | One clear Home, Missions and Wishes                                                            | M    | ✅ built |
| M5        | Grown-ups and a fair checkout (decision 1: gem packs stay)                                     | L    | ✅ built |
| M6        | Read every throw: HUD, landing card, Supernova 2.0, stats, feel, colour, resume                | L    | ✅ built |
| M6.5      | Showtime: animations, celebrations, living characters, avatars (owner's request)               | L    | ✅ built |
| M7        | Fusions, the first Clash and Combos                                                            | L    | ✅ built |
| M7.5      | Sky obstacles and real flight in the sims                                                      | L    | ✅ built |
| M8        | Troubles, traits, the Buddy, the help ladder and the difficulty program; rules freeze          | L    | ✅ built |
| M9        | Remix (REMIX.md)                                                                               | M    | ✅ built |
| M10       | Labs: your shots learn tricks                                                                  | L    | ✅ built |
| M10.5     | Launchers and the Launch Bay                                                                   | L    | ✅ built |
| M11       | Homeworld Level and a fair economy                                                             | M    | ✅ built |
| M11.5     | Homeworld Life: friends' days, lands and Landmarks (decision 25 default applied)               | L    | ✅ built |
| M12       | Star Roads, the Styles catalogue and launch prep (store package, site and rename partly done)  | L    | **Next** |
| M13–M17   | After launch: friends and trips, Road 1, content drop, Collector's Edition, Homeworld Horizons | —    |          |

- **Difficulty, the headline principle:** in the owner's words, "we dont want it too hard at the beginning but also not too easy, as both will cause a user to lose interest". The difficulty program (FLIGHT.md, M8) now has a floor and a ceiling per chapter, with decision 28's "Kid-first" bands: M3's ladder moves were the first step.
- **Owner decisions** 1–55 are in ROADMAP-v2 section 10. Decisions 1 and 28–32 are answered; 33 (Remix difficulty) and 34–55 (M10, M10.5, M11, M11.5, M12 and launch defaults) are open with defaults applied; the stated defaults apply to the rest unless the owner says otherwise. M11.5 still needs decision 25.

## Baseline data (from M1)

Targets for later milestones:

- **Idle income:** a Regular player's idle stardust reaches **283×** their active earnings (M11 target: 1.5× or less).
- **Power:** the Object Lab and upgrades are maxed by **day 10** (M10 target: Labs last 28 days or more).
- **Level lint:** 23 planets flagged **EASY** and 44 **TRIVIAL** at M1; M8's difficulty program brought the gated 1–60 lint (including EASY and TRIVIAL) to zero, and added `GOAL-RAMP`/`TEACH` on top.
- **Planet 24:** no longer a wall (decent-bot fails 85% → 25%, via `LEVEL_SALT`).

**On the owner's Desktop:** `~/Desktop/Comet Garden/` holds copies of everything needed to post (v2 screenshots per language, the App Preview, the social pack, the store text with "START HERE - App Store Connect checklist.md", the site, the research, the icon and the first screenshot set), with a `READ ME FIRST.txt`. The repo stays the source of truth: re-copy after any change to `store/` or `site/`.

## Known issues and caveats

- **Remix is hard for casual players** (decision 33, open): casual-bot fail 65% on remixed chapters 1-5 and 79% later, versus 26% and 39% on classic planets. The decent 3★ band passes, but only just in chapters 1-5 (44.4% against a 45% cap), so any retune can tip it.
- **The first screenshot set (`store/screenshots/`) shows English planet names in other languages.** Planet names are now translated in the game. The recommended v2 set (`store/screenshots-v2/`) hides the top HUD strip, so it is unaffected. If the owner picks the first set, re-capture it with `store/tools/shots.mjs`.
- **Troubles barely bite outside their teaching planets** (Watch, found 1 October 2026 by the nightly sims). On the six teaching planets (14, 25, 28, 36, 49, 59) a blind player loses 5.1% (the gate). Across all 21 Trouble planets the loss is 0.6%, and on the other 15 it is -1.2%. In 480 replayed blind rounds only 131 had a damaging beat: 256 beats were blocked, 443 Troubles settled early, and 22 of 189 damaging beats hit a creature sector. Rules are frozen (`RULES_VERSION = 1`), so this belongs in a later tuning pass (placement and timing, not new rules); the nightly prints the per-planet table.
- **Voyage stops from 2026-W44 on are re-drawn until both solvers can earn 1★** (`src/meta/voyage.ts`; weeks up to W43 are frozen as shipped). The nightly calendar pre-flight sweeps 104 weeks ahead.
- **Two difficulty harnesses, two scales.** The campaign bands (decision 28) and the Remix gate use the sector aim model (`runPlanet`). The real-flight bots are much weaker in absolute terms (classic casual fail is about 63-74% there), so compare real-flight numbers only as pairs (Remix vs classic), never against the bands.

- **The shadow-layout generator must be brought into band before launch** (decision 29, M12). The hand-reviewed campaign salts (planets 1–60) pass every difficulty band and lint gate; the raw generator that produces unreviewed "shadow" layouts still runs about 10 points harder for casual play on planets 21–60 and is only a CI Watch, not a gate.
- **Casual bonks on obstacle teaching planets ran a bit above target after M7.5** (about 1.1–1.6 per round against a ≤1.0 target). M8's phase E report lists the bonk bands as now passing, since the obstacle Watch was explicitly handed to M8's difficulty program to own — but this hasn't been independently spot-checked since, so verify it before relying on it.
- **Gate v2 needs a T0 check:** English and hiragana number words may be readable by children aged 9–11. Test it with real children before launch.
- **Glossary `BUILT` is current.** `tests/glossary.test.ts` lists M0 through M11.5 in `BUILT`; update it again the moment M12 ships.
- **Glossary watch list:** `tests/glossary.test.ts` prints known translation inconsistencies still to fix. M3 fixed the Japanese galaxy/festival words and some Spanish/Portuguese wording; the rename pass (`db1872f`) fixed more (the Grown-ups area reading like an adult-content label in es/pt/ja, broken Japanese "Your Keeper", German Keeper/Supernova gender, Portuguese "lançamento"); check the printed list for what's left.
- **Rate button:** "Rate Comet Garden" in Settings can't fall back to the App Store page until the app has a store ID.
- **Voyage map previews all look alike.** They show each stop's starting planet, which is mostly bare rock.
- **Round 6 translations** (20 strings) were written by Claude without a native-speaker review. German uses "Accessoire" for "Accessory".
- **The difficulty sims ignore twists, swaps and aiming physics** was true through M7; **M7.5 fixed this** — the sims fly shots for real (angle, power and release-time noise) from that milestone on, so this caveat no longer applies to obstacle planets. Planets 61–120 and the shadow-layout generator remain Watches, not gates (see above).
- **Wildflowers and Glacier are verified only in chance play**, not in a scripted or forced solver path — confirm they trigger reliably along the solver's own line before relying on the M7 bands.
- **Not yet verified on real hardware:** StoreKit purchases (including Ask to Buy and revocation); the game's feel — sound and haptics, including the per-object feedback, Fusion/Combo cues, bonk badge and Trouble cues — has not yet been checked on a real phone.
- **Research limits:** the cloud sessions' network blocked many sites, so some findings rest on search snippets. Each research file marks its confidence.

## Owner decisions and to-dos (things only George can do)

These are also in the Linear document "Owner decisions and to-dos" (not yet re-checked against decisions 28–32 this session).

- **Decisions:** section 10 of [ROADMAP-v2.md](../product/ROADMAP-v2.md). Decisions 1 and 28–32 are answered.
- **Repo settings:** make the repo **private** — once `site/` is hosted somewhere else, since the site currently lives inside this repo and needs to stay reachable — and switch the **default branch** to `main` (GitHub → Settings → General → Danger Zone).
- **Pick a screenshot set:** v2 "Sticker Scrapbook" (`store/screenshots-v2/`, recommended) or the first set (`store/screenshots/`); the other can then be removed from the working files.
- **Comet Garden setup before submission:**
  - a **formal trademark search** for "Comet Garden" (USPTO, EUIPO, JPO at minimum) — the AI's own App Store and web searches on 30 September found nothing, but that isn't a trademark check
  - **host `site/`** (see `site/README.md` for GitHub Pages / Netlify / Cloudflare Pages options) and add a **real support email** (Apple requires the Support URL to show real contact details; it's currently a placeholder)
  - decide the **copyright / legal name** line for App Store Connect and the site's footer
  - an **Apple Developer Program** membership
  - the **App Store Connect app record** and the **7 in-app purchase products** in `store/APP_STORE_CONNECT.md` and `store/compliance.md` (product IDs already match the code)
- **T0 kid playtests:** `docs/qa/playtest-difficulty.md` — 15–20 minute sessions with real children ages 6–10 after specific planets, a face-card difficulty check, and whether they can say what a Trouble or obstacle did. M3 also still asks whether 4 of 5 children aged 6–9 can say what the game is for after 10 minutes. Gate v2 needs a separate check: can children aged 9–11 read the number words and pass the gate?
- **Playtest** in the Simulator, and say how the difficulty feels.
- **Merge PR #2** when happy.
