# 03: Architecture, systems and conventions

## Stack

- **Language and build:** TypeScript 7, Vite 8 and Vitest 5. All rendering is **Canvas 2D**, and every piece of art is drawn in code: no image assets in the game world and no emoji in the world.
- **Native wrapper:** **Capacitor 8** iOS (Swift Package Manager). Plugins cover StoreKit 2 via `@capgo/native-purchases`, haptics, preferences, local notifications, in-app review, share, filesystem, splash and status bar.
- **Game Center:** our own small plugin, `ios/App/App/GameCenterPlugin.swift`, registered in `MainViewController.swift`.
- **No server.** Daily, weekly and monthly content is all seeded from the date.

## Layout

```
src/
  core/        pure game rules (no DOM)
    world.ts     planet sectors, biomes, species, kinds (objects), impact rules, settle(), lifeScore
    levels.ts    makeLevel(n, seedPrefix, {goals, boss, salt}) (memoised), levelMeta, greedyPlan/solve2/solve0, TUNE, LEVEL_SALT, goals, twists, difficultyOf
    round.ts     stepRound/previewStep: the one pure rules step (M2); REACTIONS/ReactionId/rulesForLevel, StepResult.reactions/combo, RoundState.combo/comboCharge, ROUND_SAVE_VERSION and the checkpoint/resume format (M6, M7); Trouble events and forecasting wired in (M8)
    modifiers.ts RoundModifiers + modifiersFor(mode): the one power budget per mode (M2)
    flight.ts    pure fixed-step flight physics, FlightParams (STAR_SLING defaults) (M2); fly() and flyFull() (the full-path version the aim line and bonk badge use) handle sky obstacles (M7.5)
    palette.ts   the Clear colour-blind-safe palette, a distinct marker per land (M6)
    sky.ts       ObstacleId/OBSTACLES/SkyDef: the five sky obstacles (Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring, Tug Star), skyFor(), skyShapesAt(), gustAt() for the Solar Wind (M7.5)
    troubles.ts  TroubleId/TROUBLES: Ember Vent, Tanglevine, Frost Creep; firebreakBy(), troubleTarget(), forecastTroubles() for the two-beat strip (M8); TraitId/TRAITS and traitOf() (creature traits by home biome) live in world.ts (M8)
    rules-version.ts RULES_VERSION = 1: the frozen gameplay contract (Combos, sky obstacles, Troubles, FlightParams) carried in saves and challenge codes (M8)
  meta/        pure meta-game logic on the Profile (all unit-testable)
    profile.ts   Profile type, defaultProfile(), migrate() (deep-merge defaults), save/load with backup
    economy.ts, progression.ts (chapters, Star Road, quests), config.ts, iap.ts (+ mock store)
    cosmetics.ts, dyes.ts, passport.ts, achievements.ts, rank.ts, records.ts, lore.ts
    homeworld.ts (buildings, residents, accessories RESIDENT_ACCS, expeditions, paints)
    lab.ts, calendar.ts, seasons.ts, inbox.ts (letter RULES), constellations.ts
    events.ts (weekly), festivals.ts (monthly), voyage.ts (weekly 7-stop), stickers.ts
    buddy.ts     buddyEligible/suggestedBuddy/planetBuddyFor: the Buddy is chosen from friends living on the Homeworld (decision 20); buddyShieldFor() ties a trait to mitigating a Trouble (M8)
    help.ts      the one help ladder: helpFor()/helpAtFailCount() (What happened → tip → 2 extra throws → hint sectors), whatHappened()/failureFacts() build the fail-card text from a RoundEventLog (M8)
    modes.ts, momentum.ts, visitors.ts, habitats.ts, coach.ts, storage.ts
    wallet.ts (earn/spend), ledger.ts (private on-device ledger), tuning.ts (every number) (M1)
    continues.ts, dates.ts (plain dates), reminders.ts (M0); unlocks.ts (the unlock ladder) (M2)
    governor.ts  choosePopup(): at most one interrupting Home pop-up per open (M3)
    nextup.ts    nextUp(p): the one Next Up card on Play, never an offer (M4)
    wishes.ts    Wishes: three creature-voiced asks a day from planet 12, replacing daily quests (M4)
    roadpoints.ts addRoadPoints(): Star Road points in p.roadPoints, capped at 4 a day (M4)
    currency.ts  deviceCurrency/formatCurrency for the Grown-ups spending reminder (M5)
    iap.ts       the store interface: purchase, finish(txId), transactions(), owned(); native and mock (M5 reworked)
    reactions.ts recordReaction(): pays stardust and a sticker only for a first Fusion; a Clash pays nothing (M7)
  ui/
    app.ts       App class: navigation (show*, selectTab, back() on a screenStack), mount/refresh, sceneOpts(), purchases and reconcilePurchases()
    game.ts      LevelScene: the level's state, input and lifecycle; delegates to the three below (M2 split)
    hud.ts       HUD, score bar, stars, goals, the finish screen
    preview.ts   landing preview, aim line, Supernova meter, Keeper and launcher drawing; the feedback governor queue (M6); the honest full-path aim line and bonk badge (M7.5)
    aimtag.ts    aimTagFacts/placeAimTag: the on-planet aim tag that replaced the landing card (M8 launch prep) — signed life change, new land, who moves in, Fusion/Clash ring, Combo beads, wander-off faces; placement keeps clear of the aim line and a finger
    feel.ts      per-object sound, haptics (150 ms limit) and trail/impact feedback; a skippable tally (M6)
    fx.ts        drawing, update loop, landing, boss, bursts, confetti, pop-ups, flight world
    dom.ts       h(), btn(), modal() (onAbort/closeModals), toast()
    motion.ts    the motion kit: spring pop-ins, button squash, count-ups, rewards flying to their pills, bursts, screen transitions; effectiveReduceMotion(p) (M6.5)
    celebrate.ts one celebrate(): stars, creature reveal/dance, chapter chest, Passport title, festival curtain; holdForReading keeps disappearing text cards up for their full time under Reduce Motion (M6.5)
    screens/     home (the Play tab), missions, homeworld, collection, styles (was workshop), fieldguide (reactions chart and Combos page, M7), grownups, shop (only inside Grown-ups),
                 starmap, road, lifebook, album, upgrades, passport, sky, voyage, galaxy (pass.ts removed in M5)
    flows/       modal flows: title (M3), away (M3), wishes (M4), gate (Gate v2, M5), contents and receipt (checkout, M5),
                 prelevel, results, daily, event, festival, inbox, quests, rank, modes, settings, earn, visitors (offers.ts removed in M5)
    art/         critters (drawCreature + accessories), keeper, planet, props, projectiles, structures, seasons, stickers, color, galaxy (the living Home; the draw loop waits for mount, M6.5), backdrops (painted chapter backdrops, M6.5), reactions (Fusion/Clash art, M7)
    audio.ts     WebAudio SFX and generative music THEMES (setMusicTheme)
  locales/     es, fr, de, pt, ja .json (+ _keys.json generated by the i18n test)
  i18n.ts      t(key, vars), tp(n, singular, plural)
  i18n/numberWords.ts  numberToWords(n, lang): three-digit numbers in words in 6 languages, for Gate v2 (M5)
tests/         Vitest suites; *.sim.ts run only with SIM=1 (tests/sim/ harness, economy.sim.ts, lint.ts the two-sided level lint incl. GOAL-RAMP/TEACH, balance.sim.ts and trouble-cost.sim.ts the M8 CI balance gates)
  fixtures/rules/, __snapshots__/levels/   frozen rules and level snapshots (M2; see below)
  fixtures/saves/                          golden saves (M1)
  terms.test.ts                            originality lint: no hit-game names in any player-facing string or in store/*.md (M1; extended to store/ at launch prep)
e2e/           Playwright journeys J1 (first session), J2 (tabs, Back, tap targets, clipping), J3, prices.spec (no price on a kid screen), gate.spec, scenebot.spec (the Scene Bot flies every obstacle through the real scene, M7.5), sky.spec (the honest aim line and bonk badge, M7.5)
resources/     render-art.cjs (icon + splash) and render-music.cjs (WAV of every theme); both need npm run dev
ios/           Capacitor iOS project (App.xcodeproj, Swift files, PocketPlanet.storekit)
store/         the App Store submission package: APP_STORE_CONNECT.md (step-by-step), listing.md + listing.<lang>.md (6 languages, using the game's own locale codes: es/fr/de/pt/ja), compliance.md (age rating, App Privacy, IAP metadata, App Review notes), captions.json, screenshots/, preview/ (App Preview video), gamecenter.md, tools/ (shots.mjs regenerates screenshots, measure-listings.py checks Apple's limits)
site/          the marketing/support site: plain HTML/CSS, no JS, no third-party requests (a CSP meta tag enforces it); index.html, support.html (the Support URL), privacy.html (6 languages), press.html, notes.html; see site/README.md for hosting and what's still a placeholder
docs/          privacy.html, docs/product/ (roadmap and design docs), docs/qa/ (M8 phase reports, the T0 playtest kit) and this handoff
```

## Key conventions

- **i18n:** English text _is_ the key: `t('Hello {name}', { name })`, and `tp(n, 'one', 'many')` for plurals.
  - Strings that live in data tables (names, hints) are registered in `tests/i18n.test.ts` `allKeys()`, so the coverage test sees them.
  - Every new string must be added to all 5 locale files with matching `{placeholders}`, or CI fails.
  - To list what's missing, run `DUMP_KEYS=1 npx vitest run tests/i18n.test.ts`, then diff `src/locales/_keys.json` against a locale file.
- **Profile:** `PROFILE_VERSION` is 3. `migrate()` deep-merges saved data over `defaultProfile()`, so adding a field only needs a default. Arrays are replaced, not merged.
- **Derived ownership:** cosmetics, stickers and titles are _computed from progress_ (retroactive), not stored as unlock flags, wherever possible.
- **Money rules:**
  - no random paid rewards
  - every paid item is fixed-price and previewable
  - Homeworld timers can't be skipped with gems (campaign wins speed them up instead)
  - festival costumes and stickers are never sold
  - nothing is sold on the kid side: prices, gem packs and the Piggy Bank appear only inside Grown-ups, behind Gate v2 (`e2e/prices.spec.ts` scans every kid screen)
  - gems never buy friendship (the Keeper Statue costs stardust)
- **Competitive modes** (daily, rush, challenge) exclude the Object Lab and meteor-shower bonuses (`sceneOpts` with `competitive`).
- **Level feasibility:** star targets and goals come from `greedyPlan`, so every level is beatable (tested for levels 1–60). Tune difficulty via `TUNE` in `levels.ts`, and check it with `npm run sim` (use `--disableConsoleIntercept` to see output).
- **Modals:**
  - `modal()` can be dismissed by tapping the scrim unless `dismiss: false` is passed.
  - `app.mount()` calls `closeModals()` (except during `app.refresh()`).
  - Re-mounting the same screen keeps its scroll position.
- **Style:** Prettier formatting (CI checks it). Comments are short and explain _why_.

- **Music:** `app.mount()` picks the theme for every non-level screen: `voyage` on the Voyage map, `festival` while `festivalLive(p)` (this month's festival still has tiers to claim), otherwise `home`. Levels set their own theme after mounting (`chapterTheme(n)`, mode themes, `voyage` for Voyage stops). `setMusicTheme` switches at the next chord. `resources/render-music.cjs` (`npm run music`, needs `npm run dev`) mirrors `startMusic()` to record WAVs, so keep the two in step if the synth changes.
- **Money and measurement (M1):** every change to gems, stardust or Essences (`p.mats`) goes through `earn()`/`spend()` in `src/meta/wallet.ts` with a named source or sink; `tests/wallet.test.ts` fails on any direct write. Every price, reward and cost lives in `src/meta/tuning.ts` (a snapshot test shows any balance change). `src/meta/ledger.ts` keeps private on-device aggregates in its own store (`pp.ledger`), never sent anywhere; long-press the version in Settings (dev/tester builds only) for the Balance Report.
- **Sims:** `npm run sim:quick` (difficulty survey, compares with `tests/sim/baseline.json`; refresh with `npm run sim:baseline`), `npm run sim:economy` (90-day careers), `npm run sim` (all). `makeLevel(n, prefix, { salt })` gives shadow seeds; `LEVEL_SALT` in `levels.ts` re-seeds individual walls.
- **E2E:** `npm run e2e` (Playwright; `e2e/`), `npm run e2e:quick`. In dev, `window.__i18n.setLang('pseudo')` switches to a 40%-longer pseudo-locale.
- **The round engine (M2):** `stepRound()` in `src/core/round.ts` is the only place a throw changes a planet. The level scene, the landing preview, the solvers and the bots all call it, so what the solver plans is what the child plays. `RoundRules` (reactions, Troubles) is empty (`ROUND_RULES_V0`) until M7/M8 fill it; rules come from a separate `${seed}-rules` random stream.
- **Modifiers (M2):** every player-side bonus (extra throws, splash, Lab, boosters, Momentum, buddy) arrives through one `RoundModifiers` struct built by `modifiersFor(mode)`. Daily, Rush, Challenge and Remix get none. Don't read upgrades from the Profile inside the round.
- **Flight (M2):** `src/core/flight.ts` steps at a fixed 1/240 s, so shots land the same at 30, 60 or 120 fps. The aim line and the real shot share it, and the shot is drawn between steps. `FlightParams` has Star Sling defaults; launchers (M10.5) and sky obstacles (M7.5) plug in here. In dev, `window.__scene` exposes Scene Bot hooks (stripped from production; CI checks).
- **Solvers (M2):** `solve2` (Solver 2.0) sets stars 2 and 3; `solve0` (today's blind rule) guarantees star 1 and goals on normal planets. They are equal until M7/M8 add rules. `makeLevel` is memoised (about 5 ms per planet) and `levelMeta` gives Home a name, hue and twist without running a solver.
- **Unlocks (M2):** `src/meta/unlocks.ts` is the one table of what unlocks where. Screens ask `unlocked(p, id)`. `tests/unlocks.test.ts` fails on two intros on one planet, except the planets listed in `KNOWN_UNTIL_M3` (1, 5 and 8 at M2), which M3 must empty.
- **Frozen snapshots (M2):** `tests/fixtures/rules/` (the land × object impact matrix, sequences, tables) and `tests/__snapshots__/levels/` (planets 1–120 and every mode) must stay byte-identical. Regenerate them **only when a rules change is intended**, with `UPDATE_FIXTURES=1 npx vitest run tests/rules.snapshot.test.ts` (or `tests/levels.snapshot.test.ts`), and say why in the commit. A snapshot diff you didn't mean is a bug. Prettier ignores these files.
- **Glossary (M2):** `tests/glossary.test.ts` (ROADMAP-v2 4h) fails on a duplicate name, a retired word coming back, a word never introduced, or a hit game's term, in all six languages. Each retired word carries the milestone that removes it: words from built milestones fail, the rest print as pending. **When a milestone ships, add it to `BUILT` in that file.** `BUILT` now lists M0 through M7. A watch list holds known translation inconsistencies still to fix (see [05-status-and-next.md](05-status-and-next.md)).
- **Pop-ups (M3):** Home asks `choosePopup()` in `src/meta/governor.ts` before showing anything that interrupts: at most one per app open, none before the first Home view, none after under 30 minutes away. Priority: away card, intro, inbox, festival, starter. In-round intro cards don't count. The "While you were away" card is `src/ui/flows/away.ts`; the first-launch title beat is `flows/title.ts`.
- **Coach 2.0 (M3):** intro cards (12 words or fewer) come from the `intro` field of rows in `unlocks.ts` and are copied to the Inbox (`coach-<id>` in `p.mailSeen`).
- **Grandfathering (M3, M4):** moving unlocks later must never take anything away. `migrate()` runs once per save (`p.m3Migrated`) and records what an existing save had already unlocked under the old ladder in `p.legacyUnlocks`; `unlocked(p, id)` returns true for those. M4's rank retirement uses `p.m4RankPaidThrough` so rank rewards already paid aren't paid again by chapter chests, and existing saves keep rank looks, trophies and unpaid rewards. New saves start with `m3Migrated: true`.
- **Navigation (M4):** five tabs (`selectTab`: home = Play, missions, homeworld, collection, styles). Other screens push onto `screenStack`; the Back button and a left-edge swipe call `app.back()`. `selectTab` resets the stack. No side rails.
- **Next Up and Wishes (M4):** `nextUp(p)` picks the single card on Play and never offers anything for sale. Wishes (`src/meta/wishes.ts`) replace daily quests from planet 12: rewards shown up front, never expiring, a daily swap that keeps progress. Star Road points live in `p.roadPoints` (no longer derived from campaign stars) and every source goes through `addRoadPoints()` with a shared cap of 4 a day (`p.roadDay`).
- **Grown-ups and Gate v2 (M5):** every outbound or paid action calls `parentalGate(reason)` in `src/ui/flows/gate.ts`: a three-digit number in words (`src/i18n/numberWords.ts`), a keypad reshuffled after a wrong answer, a 1.5 s hold, a 30 s pause stored in `p.settings.gatePausedUntil` (survives a relaunch), and an optional parent PIN (`p.settings.parentPin` holds a digest, never the PIN). In dev, `window.__gate.answer()` returns the current answer for Playwright (stripped from production; CI checks). `src/ui/screens/grownups.ts` is the gated area; the shop (`shop.ts`) lives only there. Grown-up settings: `hidePaidLooks`, `spendingReminder` (`{ cents, currency }`, formatted by `src/meta/currency.ts`), `breakAfterRounds`, `favourites`.
- **Checkout charter (M5):** gate → contents sheet (`flows/contents.ts`) → store → receipt (`flows/receipt.ts`, says where things went). A StoreKit transaction is finished (`iap.finish(txId)`) only after `saveProfileChecked()` confirms the grant reached storage. At launch `reconcilePurchases()` replays unfinished or missed transactions (and Ask to Buy approvals) and quietly removes revoked ones. `p.pendingPurchaseRecords` and `p.pendingPiggy` hold in-flight state; `p.processedTx` stops double grants. Ask to Buy shows a "waiting" state. In dev and `VITE_MOCK_IAP=1` builds, `mockIapControls` can simulate Ask to Buy (`pending`, `approve`, `decline`), revocation and a replayed transaction.
- **Catalogue (decision 1):** 12 products at launch: 7 looks, 4 gem packs and the Piggy Bank (consumables, Grown-ups only, no value labels). The gem packs and the Piggy Bank are live; of the looks products only Starter Crew and the Cosmic Pass lane are, and Themes, the Planet Pack and Style Singles arrive with their art in M12. `ios/App/PocketPlanet.storekit` matches the live catalogue.
- **Reading every throw (M6):** the queue and the landing card live in `src/ui/preview.ts`, off the aim path; a second row appears only when a creature would wander off. `src/ui/feel.ts` is the feedback governor: per-object sound, haptics (150 ms limit) and trail/impact feedback, plus a skippable tally. Supernova 2.0 charges only from better lands and first arrivals. The Clear palette (`src/core/palette.ts`) gives each land a distinct, colour-blind-safe marker. A round checkpoints after every throw: `p.savedRound` holds a JSON blob with a level fingerprint (so a stale save can't resume the wrong planet); `ROUND_SAVE_VERSION` in `round.ts` is 2 but still accepts v1 saves.
- **Showtime (M6.5):** `src/ui/motion.ts` is the shared motion kit (pop-ins, squash, count-ups, bursts, screen transitions) and `effectiveReduceMotion(p)` (the game's toggle or iOS's). `src/ui/celebrate.ts` is the one `celebrate()` every celebration goes through; its `holdForReading` option keeps a disappearing text card up for its full reading time under Reduce Motion instead of fading it early. The living Home is `src/ui/art/galaxy.ts`; its draw loop waits for the screen to mount before it starts, so it never animates into an empty canvas. The Keeper avatar creator lives in Styles. `src/ui/art/backdrops.ts` paints the chapter backdrops.
- **Reactions and Combos (M7):** `src/core/round.ts` holds `REACTIONS`, `ReactionId` and `rulesForLevel(n, mode)`, the one place that decides which Fusions and Clashes are taught by a given planet; `StepResult.reactions`/`.combo` and `RoundState.combo`/`.comboCharge` carry the result and running Combo state. Combo is enabled from planet 26 via `rules.combo`. Non-campaign modes (Daily, Rush, Zen, Challenge, Voyage) never use a reaction beyond what the campaign has taught: they call `rulesForLevel` with `Math.min(<their planet>, taught)` — see `src/meta/modes.ts` and `src/meta/voyage.ts`. `src/meta/reactions.ts`'s `recordReaction()` pays stardust and a sticker only for a first Fusion; a Clash pays nothing and needs no collection entry. `src/ui/art/reactions.ts` draws the Fusion/Clash moment. The Field Guide's reactions chart and Combos page are in `src/ui/screens/fieldguide.ts`. `tests/sim/reactions.sim.ts` holds the Fusion and Combo frequency bands as `sim:quick` gates.
- **Sky obstacles and honest flight (M7.5):** `src/core/sky.ts` defines the five obstacles (Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring, Tug Star) and the Solar Wind gust; `src/core/flight.ts`'s `flyFull()` flies a shot's entire path (not just what's drawn) so the aim line, the bonk badge and the sims all agree on what a release will actually do. A bonk spends the throw except the first bonk on a teaching planet (a practice bonk) and every bonk under **Gentle planets** (`p.settings.gentle`, off by default, in Grown-ups): it also stops Clashes everywhere it's on, and M8 extended it to make Troubles fully inert too. Dense Core retired (decision 14). `window.__scene`'s dev hooks respect the same `modalOpen` guard as a real tap, so an automated flight (the Scene Bot, or a sim bot) must close any open intro card before it can aim — easy to forget when wiring up a new automated player.
- **Troubles, traits and the Buddy (M8):** `src/core/troubles.ts` holds `TroubleId`/`TROUBLES` (Ember Vent, Tanglevine, Frost Creep), firebreaks (`firebreakBy`) and the two-beat forecast (`forecastTroubles`); `src/core/world.ts` holds `TraitId`/`TRAITS`/`traitOf()`, one trait per creature from its home biome. `src/meta/buddy.ts` picks the Buddy from friends living on the Homeworld (decision 20) and ties a trait to mitigating a Trouble once per planet (`buddyShieldFor`), off in competitive modes. `src/meta/help.ts` is the one help ladder (`helpFor`/`helpAtFailCount`): What happened facts, a tip, 2 extra throws, then hint sectors — no price, no pressure. `src/core/rules-version.ts`'s `RULES_VERSION` (1) freezes the gameplay contract (Combos, sky obstacles, Troubles, `FlightParams`) into saves and challenge codes, so a save or a shared code always replays the same way it was created.
- **The difficulty program and the `balance` CI job (M8):** `tests/sim/lint.ts` is the two-sided level lint: it fails a planet that's too hard (WALL, CLIFF, STACK, BONK-HEAVY) or too easy (EASY, TRIVIAL, FLAT, SLACK), plus **GOAL-RAMP** (a chapter's share of goal-bearing planets must track a target ramp, ±15 points) and **TEACH** (a teaching planet — a Fusion pair, a Trouble, an obstacle, planet 6's goal — must still carry its lesson). Both were added after salt-picking silently dropped goals from planets 1–13 while chasing the fail-rate bands; see [01-history.md](01-history.md) §28. `tests/sim/balance.sim.ts` and `tests/sim/trouble-cost.sim.ts` run the pooled 1–60 campaign lint plus the chapter/tier bands under two master seeds × 96 attempts in the `balance` CI job (`SIM=1 SIM_BALANCE=1 TROUBLE_RUNS=32 npx vitest run tests/sim/balance.sim.ts tests/sim/trouble-cost.sim.ts`, 30-minute limit — it runs about 8 minutes on a Mac). Planets 61–120 and the raw "shadow" generator layouts (not the hand-reviewed campaign salts) are Watches, not gates, until M12 (decision 29). `src/core/levels.ts`'s `LEVEL_SALT` table is the authoritative list of per-planet substitutions.
- **The aim tag (launch prep, replaces the M6 landing card):** `src/ui/aimtag.ts` computes what the tag shows (`aimTagFacts`, `aimTagSummary`, `aimTagRing` for a gold Fusion/red Clash outline) and where it sits (`placeAimTag`, kept clear of the aim line and a finger via `intersects`/`segmentNearRect`). It lives at the predicted landing spot on the planet itself, per the owner's preference (see [01-history.md](01-history.md) §29), instead of off to the side.
- **Wallet sources:** `EarnSource` in `src/meta/wallet.ts` is a union (for example `wish`, `chest`, `welcome_back`, `iap`). Every new way to earn needs its own entry there, so typecheck passes and the ledger records it under its own name. Integration passes after parallel packages have missed this before.
- **Gotchas learned in M6/M7/M7.5/M8:**
  - **Size a canvas from `clientWidth`/`clientHeight`, not `getBoundingClientRect()`.** The rect includes the screen-entry zoom transform, so measuring mid zoom-in gives a canvas about 86% of its real size and misses taps near the edges (the M6.5 regression M7 fixed).
  - **The landing preview always computes from a full-length flight**, never a shortened dotted line — a display limit only changes what's drawn, not what's simulated. Skipping this let a Clash (M7) or a bonk (M7.5) land completely unwarned.
  - **Salt-picking can silently remove a feature.** A search that only optimizes for fail-rate/star bands will happily pick a salt with no goal on it, because the bots never check whether the goal chip is actually on screen — that's what GOAL-RAMP and TEACH now catch (M8). The same caution applies to any future automated tuning: check that the thing being taught is still there, not just that the numbers look right.
  - **`store/` may not name another game.** `tests/terms.test.ts` scans every `store/*.md` file (and every locale) for hit-game names; it's the same originality lint from M1, just widened to cover store copy once `store/` existed.
  - **Store listing files use the game's own locale codes**, not always the app's: `store/listing.es.md`, `.fr.md`, `.de.md`, `.pt.md`, `.ja.md`, matching `src/locales/`, with `store/listing.md` as the English master.
- **Planned systems:** [docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md) specifies the next systems (synergies, hazards, the Homeworld overhaul and more), with the files each milestone touches. Read it before changing `src/core/world.ts`, `levels.ts` or `homeworld.ts`.

## Unlock levels (campaign `p.level`)

These are the values after M3 and M4, all in `src/meta/unlocks.ts` (one idea per planet; `tests/unlocks.test.ts` fails otherwise). Saves from before M3 keep what they had through `p.legacyUnlocks`. M7, M7.5 and M8 layered more `'round'`-placement teaching cards onto the same table without changing this ladder: the Fusion/Clash debuts (8, 13, 22, 25, 32), Combo (26), Ember Vent (14), Tanglevine (28), Frost Creep (36) and the five sky obstacles (`OBSTACLES[id].debut`: 33, 41, 46, 51, 57) each show their own intro card the first time, alongside whatever else is scheduled for that planet.

| Level | What unlocks                                                                     |
| ----- | -------------------------------------------------------------------------------- |
| 1–3   | Practice planets (can't be failed on a first clear)                              |
| 2     | Swap                                                                             |
| 3     | Lifebook                                                                         |
| 5     | Homeworld (`HOME_UNLOCK_LEVEL`) and the Object Lab                               |
| 6     | Goals start (`GOALS_FROM`)                                                       |
| 9     | Supernova                                                                        |
| 10    | Boss every 10th planet (a Normal planet, not Hard)                               |
| 12    | Wishes (replace daily quests) and the Star Road                                  |
| 13    | Sticker Album                                                                    |
| 14    | Upgrades                                                                         |
| 15    | First Hard planet                                                                |
| 16    | Planet Passport                                                                  |
| 17    | Momentum (`MOMENTUM_UNLOCK`; first clears only, paused by a fail)                |
| 18    | Buddy (M8: chosen from friends living on your Homeworld, decision 20)            |
| 19    | First Super Hard planet                                                          |
| 20    | Weekly Voyage and the weekly event (`VOYAGE_UNLOCK_LEVEL`, `EVENT_UNLOCK_LEVEL`) |
| 21    | Star Calendar (a Home chip)                                                      |
| 23    | Star Atlas                                                                       |
| 27    | Daily Planet                                                                     |
| 30    | Zen Garden                                                                       |
| 34    | Monthly festival (`FESTIVAL_UNLOCK_LEVEL`)                                       |
| 38    | Meteor Rush                                                                      |
| 40    | Challenge a Friend                                                               |

Explorer Rank no longer unlocks anything (retired in M4). Styles (the old Workshop) opens after the chapter-1 chest. Homeworld unlock rules are in `homeUnlocked()`.

## Debugging in the browser

`window.__app` is the App instance. For example, in the console: `__app.p.level = 24; __app.showHome()`. Useful jumps: `__app.selectTab('missions')`, `showVoyage()`, `showAlbum()`, `showStyles()`, `showHomeworld()`, `festival()`, `startLevel(n)`. In dev, `window.__gate.answer()` gives the gate's answer. In a running level, `__app.scene.finish(stars)` forces an ending.

In dev (`npm run dev`) and in `VITE_MOCK_IAP=1` builds, purchases use a mock store that just grants the item.
