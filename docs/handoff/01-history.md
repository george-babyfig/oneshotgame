# 01: Conversation history

The owner (George, GitHub `george-babyfig`) worked with Claude Code in three sessions: a long first one in the cloud (27–28 September), a short second one in the cloud (28 September evening) that scoped the next big roadmap, and a third one, the first **local** session on the owner's Mac (28–30 September), which built M0–M8 plus launch prep (sky obstacles, Troubles and the difficulty program, the on-planet aim tag, the rename to Comet Garden, the marketing site and the App Store package). Their messages are quoted as sent, typos included; the notes under each say what happened.

## Day 1 — 27 September 2026

### 1. The brief

> "oneshot a game for me to put on the app store for apple. I want it addictive, fun, have microtransactions and be nonstop fun (like how ballatro is) I want this to be something you can open in the waiting room soemwhere and mess aroudn with. Nothing intensive just an addictive time killer. MAke sense? Just like ballatro! Im not saying I want the app to be ballatro just the idea behind it."

Claude built **Lucky Pips**, a dice roguelike with combos, chips × mult, charms, a shop, bosses and antes. It was published as a playable artifact.

### 2. The owner rejected the clone (important lesson)

> "this is literally just ballatro but with dice have you lost your goddamn mind? You just blatantly ripped off a popular game!!!!! I wanted you to make something unique! Delete all of this. I want you to do /deep-research on popular concepts in today's market and build something addictive (that doesnt mean fucking gambling themed, I mean addictive like want to play contantly) easy to play and somethingf you can open in a waiting room like balltro. I used ballatro as an example of a games design methodology, not saying I wanted something similar to it."

> "it doesnt need to be a puzzle either, stop pigeon holeing yourself"

> "honestly, do some /deep-research on these concepts and you pick which ones to build and do it"

**Lesson:** never reskin an existing hit. Borrow design _methodology_ (short sessions, one-more-go loops, satisfying feedback, visible progress), not mechanics. No gambling themes. Lucky Pips was deleted entirely.

Claude researched the market and pitched 6 original concepts: Last Light, **Pocket Planet**, Paper Plane Post, Swarm, Night Market and Skyline. It checked each for existing competitors and picked **Pocket Planet**, a fling-with-your-thumb, gravity-based planet-creation game, as the most original. See [04-research.md](04-research.md).

The first version was playable at https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR. That link is private to the owner and has been updated with every round since.

### 3. Make it professional

> "well set up the repo properly then, make a new one if you have to. Keep worinkg on this app, clean it up make it professional add all the bells and whistles"

- **Repo setup:** a clean `main` branch, CI, and the modular architecture.
- **Research:** a deep-research workflow compared the roadmap against top casual games; the results are the first table in ROADMAP.md.
- **Built from it:**
  - custom vector art replacing emoji, onboarding, notifications and a rating prompt, music, save backups
  - an App Store listing, screenshots and a privacy policy
  - weekly events, postcards, the i18n layer and 5 languages (es, fr, de, pt-BR, ja)
  - Game Center, bug-review fixes, localized store listings, an iOS Simulator CI build, and physics twists

### 4. "keep going"

This carried the work above through to the end of the first PR.

### 5. Merge, go private, open the Simulator

> "merge and push, makje sure repo is private, then launch the game on the iphone simulator o I can test it out"

- **Merged:** PR george-babyfig/oneshotgame#1 went into `main`.
- **Still public:** Claude had no tool to change repo visibility. The owner has to do it: GitHub → Settings → General → Danger Zone → Make private. The repo's default branch was also `claude/eager-planck-yfnmzf` and should probably be switched to `main`.
- **No Simulator from the cloud:** the iOS Simulator can't run in a Linux cloud container. As a workaround, CI now uploads a ready-to-install **PocketPlanet-Simulator** zip (steps in README). PR george-babyfig/oneshotgame#2 was opened for everything after this point.

### 6. Round 3: depth, identity, custom assets

> "I would like the game to have a bit more depth to it, more custom assets for stuff like game pass, a profile set up button and to view it, sharing features, customization of your avatar or whatever is shooting the stuff etc. Another round of /deep-research on what more can be done to flesh this out to look like a game studio built it. Find what's missing put it on a roadmap and build"

> "and I want more exploration into the passive side of this, maybe like clash of clans or something where you can expand your planet watch it grow and do stuff for it etc idk what do you think?"

Built:

- **Keeper and Workshop:** the Keeper avatar, with a Workshop of cosmetics and try-on.
- **Planet Passport:** profile setup, a profile view and a shareable card.
- **Cosmic Pass:** hero art and a dedicated pass screen.
- **Homeworld:** a Clash-of-Clans-style passive base with rings, buildings, drones, residents and expeditions.

### 7. Explain the game, and add real challenge

> "also I don't necessarily understand the game can you explain to me in like a couple sentances? Next I want you to think of the challenge. I don't see it... If there's none we need to build it in to entice people to spend"

> "and think of like upgrades to the asteroids different stats, what the purpose of shooting the planet is etc flesh all that out like if they dont fill out the planet fully is that game over? Can the buy gems to get more throws? New shots/upgrades to fill the planet more etc"

**The two-sentence pitch:** you fling objects at a tiny planet to change its land (rock → mountains, ice → ocean, magma → volcano, seeds → forest), and creatures move in when the right lands touch. Each planet gives limited throws to reach a life score and its goals.

Built:

- **Challenge:** level goals from planet 6, a sawtooth difficulty curve with Hard and Super Hard planets, a fail screen with "So close!", and gem continues for +throws.
- **Difficulty tuning:** a bot simulation (`npm run sim`).
- **Power:**
  - the **Object Lab**, which upgrades each object 1–5 with stardust
  - the **Supernova** supercharged shot

### 8. Round 4

> "keep going, keep fleshing out, more /deep-research more depth more features more customization"

- **Cosmetics:** emotes, and a dye system with 16 dyes.
- **Daily return:** the Star Calendar (never resets).
- **Purchases:** a parental gate before every one.
- **Homeworld:**
  - real-calendar seasons, meteor showers and day/night
  - planet paints and a photo mode
  - resident nicknames and dress-up
- **Collection:**
  - object records and Lifebook lore / field notes
  - an Inbox of letters
  - Keeper outfit presets
  - the Star Atlas: constellations restored with materials
- **Bosses:** Comet Guardian boss planets.
- **Fixes:** three code reviews found 27 bugs, all fixed.

## Day 2 — 28 September 2026

### 9. Rounds 5 and 6 (continuing "keep going")

- **Round 5:** monthly festivals (creature costumes), a 7-planet Weekly Voyage, and a Sticker Album with a free-placement scrapbook.
- **Round 6:** a Buddy companion creature, plus tie-ins for round 5 (quests, letters, residents in costume, achievements).

> "keep going"

After round 6, Claude started round 7 by adding festival and Voyage music themes (commit `78f22e9`).

### 10. Moving to a local session

> "my computer had died please resume"

The cloud session was unaffected; everything was already pushed.

> "walk me through how to do a claude teleport" / "ok it looks like it worked and it teleported, why is this chat still showing its a cloud session?" / "well I dont want to make changes fro mthe terminal I want it in here on my claude desktop app...." / "ok but I dont WANT this to be a cloud session because you cant do things on my comouter like fire up the sim or take control etc."

The owner wants a session running **on their Mac**, so it can open the iOS Simulator and control the computer, and they want to use it from the Claude desktop app. `claude --teleport` copies a cloud session to the local CLI but doesn't move it: the cloud session keeps existing separately.

> "ok let's do this, make multiple .md's and drop them into the repo. Our entire chat history, all changes made, the roadmap, things you were still working on, plans, deep researchm everything. I will then make a new session and tell that claude to pretty much become you"

> "and then write a handoff doc I can copy and paste into this new session to prompt and prime it"

This handoff folder is the result.

## Day 2, evening — the second cloud session (28 September 2026)

The owner pasted PROMPT.md into a new session intended to run on their Mac. It started as **another cloud session** instead (Linux, no Simulator), in the same "Default – trusted network access" environment. Its session id is `session_01RcshJCJeurVYQrUSHyZjG2`. The first session was archived.

### 11. Pause, re-read, resume

> "hold on the old claude is still updating the md files, please puase, and then reread everything including my prompt in 5 minutes"

> "you can resume now, do as I said in my last message"

The only doc change was the new `07-transcript.md`. The session then:

- **Music check:** recorded all 11 themes offline to WAV (now `npm run music`) and sent the owner the festival, Voyage and home themes. Loudness matched the other themes.
- **Music bug found and fixed** (`911d004`): a festival runs every month, so the festival tune had permanently replaced the home music for anyone past planet 8. Now it plays only until that month's festival tiers are claimed, and the Voyage map uses the Voyage theme.
- **Playable build republished** as Version 12 at https://claude.ai/artifact/K5sPveYA8weiBttagqJjsR.
- **Round 7 research** on replay/remix modes and iMessage stickers (see [04-research.md](04-research.md)). The Remix build was postponed because of the next request.

### 12. "Think like a senior product manager"

> "we need to flesh this out further. I need you to take on the mindsert of a senior product manager at a large game studio and scope out what more this app needs from functionality, design, features, user journeys, pain points etc. We then want to make the complexity bwetter and figure out how we can increase revenue off a simple game like this. So we need to have a mode that is like clash of clans that we already started building out but its so simple. What is the point of the game? The stardust? The characters? We need synergies with different shots, combos, stats, boosts, power ups etc and then negative interactions th make the game harder. Once you scope that out and write out a full roadmap, I want you to take on the role of a full dev team, freom engineering manager, lead developer, test engineer, QA analyst, data analyst, etc and build this fully. I want you to rope in codex into this as well and prime and prompt it as your lead developer too so you can orchestrate efficiently without burning too many tokens. Set up adversarial reviews too."

The session ran a staged review with sub-agents:

1. Code, journey and data audits of the current game.
2. Market research.
3. Five product managers wrote proposals: core loop, meta/Homeworld, monetization, UX, and live-ops/data.
4. Five critics tried to break the proposals: kid safety, originality, engineering, economy, and a player advocate.
5. A head of product wrote the roadmap.

The result is [docs/product/ROADMAP-v2.md](../product/ROADMAP-v2.md). The build of its milestones is handed to the next session.

### 13. Codex

> "how is that possible its usable in my other claude chat?" / "check again. Other chat figured it out"

Codex could not run in the cloud session:

- **Network:** the cloud environment's network policy returns 403 for `api.openai.com`, `auth.openai.com`, `chatgpt.com` and `openai.com`.
- **Setup:** Codex wasn't installed, and there was no OpenAI key.

The owner's other Claude Code sessions (the BabyFig / vectorlabs-site ones) are Remote Control sessions running **on their own computer**, where Codex is installed and signed in. That is why Codex works there.

### 14. Hand off to a local session

> "ok finish your work, I will transfer this to a new chat as soon as youre done. I will need you to update the prompt and all of the md's for transfer to a new local session"

This updated handoff (all docs plus a new PROMPT.md) is the result. The next session runs **locally on the Mac**, with Codex as lead developer, and builds ROADMAP-v2 milestone by milestone.

## Day 2–3: the third session (local), 28–30 September 2026

The owner started this session from PROMPT.md. It ran **on the Mac** (`uname -s` printed Darwin), so it could use the iOS Simulator, Xcode and Codex.

### 15. Setup and toolchain

- **Toolchain found:** Xcode 26.4.1, Node 25.9, and `gh` signed in as `george-babyfig`.
- **Codex:** CLI 0.158 is installed and signed in, but `/opt/homebrew/bin/codex` is a dead symlink (the ChatGPT app moved it). The working binary is `/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex`. Codex's sandbox can't bind a local port, so Claude runs Playwright, not Codex.
- **Playwright:** the owner approved installing it (`@playwright/test` 1.63 with Chromium and WebKit).
- **Simulator:** the game runs on an iPhone 17 Pro Simulator. The owner's other project often has a second Simulator ("BabyFig-iPhone") booted, so every command passes the UDID. Details in [06-workflow.md](06-workflow.md).

### 16. M0, M1 and M2 built

- **M0, kid-safe trust update** (`9b78549`): parental gate on every outbound action, no system prompts to the child, plain dates instead of countdowns, visitors without chance, one continue rule, no selling before value, fair competitive modes, churn stops paying, Homeworld clock guards. 122 tests.
- **M1, measure and guard** (`dfaad28`, `962e526`): one wallet, a private on-device ledger, one tuning file, privacy and terms lints, save goldens and time travel, the sim harness and the 90-day economy sim, Playwright J1 and J3, and CI jobs `sim-quick`, `e2e` and a nightly sim. Planet 24 is no longer a wall.
- **M2, the round engine and the unlock ladder** (`cb64557`): `round.ts`, `modifiers.ts`, `flight.ts`, `unlocks.ts`, the game scene split into four modules, and the glossary test. Planets 1–120 and every mode are byte-identical to before.
- Each milestone went through Codex packages, tests, translations, three adversarial Claude reviewers plus a Codex review, fixes, a green CI and an updated PR #2. The loop is in [06-workflow.md](06-workflow.md).

### 17. More razzle dazzle: M6.5 Showtime

> "add to the roadmap that we need way more animations like pop up on screen effects, more razzle dazzle and pizazz, more custom assets, characters, avatars etc etc"

Claude added **M6.5 Showtime** to ROADMAP-v2 (animations, celebrations, living characters, avatars), after M6. It went in with the M0 commit.

### 18. The Homeworld, launchers, obstacles, combos and difficulty

> "I want that homeworld fully and completely fleshed out and made to be in depth on roadmap"

> "different launchers that do different things like better curves, faster speed harder impacts, and then obstacles and things that could like destroy your meteor"

> "difficulty needs to be refined and honed in, and combos and such are paramount"

> "we want the difficulty progression to be natural, we dont want it too hard at the beginning but also not too easy, as both will cause a user to lose interest"

Two lead designers (sub-agents) wrote build-ready design docs (commit `74be89c`):

- **[docs/product/HOMEWORLD.md](../product/HOMEWORLD.md):** the full Homeworld: map and growth, every building, the Launch Bay, friends' daily life, Landmarks, Homeworld Levels 1–10 and its economy.
- **[docs/product/FLIGHT.md](../product/FLIGHT.md):** launchers as earned sidegrades (Star Sling, Swoop, Sparkler, Zip, Thumper, Pinpoint, Skipper), telegraphed sky obstacles (Drift Rocks, Bubble Moon, Magnet Mist, Rubble Ring, Tug Star), combo chains, and a difficulty program with a floor and a ceiling per chapter.
- The last quote is now the **headline principle of the difficulty program**: never too hard early, never too easy either.
- ROADMAP-v2 gained **M7.5 Sky obstacles**, **M10.5 Launchers and the Launch Bay**, **M11.5 Homeworld Life** and **M17 Homeworld Horizons**. M7 gained Combos and M8 the difficulty program. Owner decisions 11–27 were added to section 10.

### 19. Linear

> "Put it all on linear as a new project"

- The owner created the Linear team **"Pocket Planet"**. Claude made the project **"Pocket Planet — Launch Roadmap"**: https://linear.app/babyfig/project/pocket-planet-launch-roadmap-76fb6f2c54db
- It has 22 milestones and one "work items" checklist document per milestone, plus an "Owner decisions and to-dos" document.
- **No issues:** the Linear workspace hit the free-plan issue limit, and the owner chose checklists in documents instead.
- M7.5, M10.5, M11.5 and M17 sit at the end of Linear's milestone list, because the API can't reorder milestones.
- The **Babyfig** team in the same workspace belongs to another project and must never be touched.

### 20. M3 built: the first ten minutes

The owner kept the session going with "keep going"-style messages, so Claude carried on without asking.

- M3 ran as three Codex packages: A (ladder and difficulty moves), B (title beat, purpose moment, pop-up governor, away card) and C (practice planets, Coach 2.0, text size, VoiceOver).
- **M3** (`abac194`): a title beat on first launch; practice planets 1–3 can't be failed; the first-win purpose moment; a pop-up governor; a "While you were away" card; Coach 2.0 intro cards; text size and VoiceOver.
- **Ladder moves:** first Hard planet 15, Supernova 9, Momentum 17 (first clears only; a fail pauses it), Buddy 18, Voyage 20, Calendar 21, Festival 34. Existing saves keep everything they had unlocked.
- **Measured:** the first fling comes 4.6–4.9 s after launch.
- **CI fix** (`19105cf`): the planets 1–120 solver check took about 7 s on GitHub's runners, so the unit test timeout is now 30 s.

### 21. M4 built: one clear Home, Missions and Wishes

- **M4** (`e923123`): five tabs (Play, Missions, Homeworld, Collection, Styles), Back and a left-edge swipe, one Next Up card, Wishes instead of daily quests from planet 12, and the Field Guide.
- **Explorer Rank retired:** modes open by planet (27, 30, 38, 40). Existing saves keep their rank looks, trophies and unpaid rewards.
- **Styles** (the old Workshop) opens after the chapter-1 chest.
- **Measured:** Home has 11 tap targets, a Regular player earns 103.5 free gems per active day, and a child meets 20 meta nouns by planet 20.

### 22. Owner decision 1: keep gem packs

Before M5, Claude asked decision 1 from ROADMAP-v2 section 10: retire the gem packs and the Piggy Bank before launch, or keep them. The owner answered:

> "Keep gem packs too"

- The 4 gem packs and the Piggy Bank stay as fixed-price consumables, sold **only** in the gated Grown-ups area.
- Section 7.5 of the roadmap now caps what paying can speed up.
- The launch catalogue is 12 products: 7 looks, 4 gem packs and the Piggy Bank.
- The roadmap was updated in `49c1abe`, and the decision is recorded in Linear.

### 23. M5 built: Grown-ups and a fair checkout

> "continue"

- **M5** (`4d3ae5c`): Gate v2 (a number in words, a shuffled keypad, a hold, an optional parent PIN), the Grown-ups area with the shop inside it, the checkout charter (contents sheet, receipt, Ask to Buy waiting, quiet revocation, purchases finished only after the grant is saved), and a price-free kid side.
- **The Keeper Statue** is priced in stardust: gems never buy friendship.
- **Deferred to M12:** the other five looks products (Themes, Planet Pack, Style Singles) arrive with their art. Starter Crew is currently the Aurora atmosphere, the Explorer suit, a trail and a Passport banner; the hat, launcher and paint come in M12, free to existing buyers.
- **Tests:** 435 unit tests and 105 Playwright journeys.
- **Linear:** M0–M5 are marked built.

### 24. M6 built: read every throw

Through this stretch and the two milestones after it, the owner's only messages were "continue":

> "continue"

- **M6** (`b310def`): the queue (current + next 2, a swap badge); a landing card off the aim path (new land, life change, who moves in, a second row only when a creature would wander off); wander-off ghosts and "came back!"; one priority pop-up queue (at most 2 at once, 250 ms apart); Supernova 2.0 (charges from better lands and first arrivals, super-sized shot, tap-to-hold from planet 24); object stats in data with a solver retune; per-object sound, haptics and trails, a skippable tally; the Clear colour-blind-safe palette; resume a round after the web view is killed. Playwright J6 (overlap) and J7 (resume).
- **Small fix:** `68fbde8` kept the Grown-ups settings column within 320 px for long German labels (CI's Linux fonts had pushed it 3 px over).

### 25. M6.5 built: Showtime, the art and animation pass

- **M6.5** (`6712805`): a motion kit on every sheet, button, toast and tab; a living Home (orbiting galaxy, the Keeper waving, creatures peeking); celebrations through one `celebrate()` (stars, a new creature's silhouette reveal and dance, the chapter chest, a Passport title, a festival curtain), skippable and within 2 s; all 36 creatures get idle, happy, surprised and wave poses; the Keeper avatar creator (free); 10 new looks, 4 portrait frames, painted chapter backdrops; one effective Reduce Motion.
- **Small fix:** `0ddf90a` made the fling hint wrap so it never runs into the next-object bubble, and stopped it from blocking taps (seen in the Simulator on planet 1).

### 26. M7 built: Fusions, the first Clash and Combos

- **M7** (`755d533`): four Fusions (Steam, Rain Garden, Wildflowers, Glacier) and the first Clash, **Dry Spell**, in the round step and the solver; the landing card always previews a Fusion or Clash chip; Combos from planet 26 (beads, "COMBO n!", a Combo Bloom, a Combos page). A tuning pass brought casual fail on planets 21–60 to about 37%, down from 43.9% before M7.
- **The reviews' key catches:**
  - Clashes were being rewarded and could land completely unwarned, because the landing card only showed on about 56% of throws (it used the Star Scope's shortened line instead of the full flight). Fixed: the card now always previews from the full flight.
  - Scorch was renamed **"Dry Spell"** (internal id stayed `scorch`) so no language uses burn words for a kids' game.
  - The round canvas was being measured mid zoom-in, at 86% of its real size — an M6.5 regression that caused missed taps on the level screen.
- **CI:** `b20ee93` split the Playwright journeys into three parallel jobs, one per browser project (the single job had outgrown its 20-minute limit); `60580b9` made the Showtime frame-time gates run only locally, since CI's shared runners have no GPU.
- **Owner-facing decision surfaced:** a **"Gentle planets"** setting is being built into Grown-ups in M7.5 — the roadmap relies on it for children who find hazards stressful, and it will ship off by default.

### 27. M7.5 built: Sky obstacles and real flight in the sims

- **M7.5** (`609c6e6`): five sky obstacles — Drift Rocks (planet 33), Bubble Moon (41), Magnet Mist (46), Rubble Ring (51, gaps that turn), Tug Star (57) — plus a gusty Solar Wind on Hard planet 55. The aim line now flies the full path for every drawn aim, a red bonk badge warns before any bonk or fizzle, and a release fires exactly what was drawn. The first bonk of each attempt on a teaching planet is a practice bonk (the throw comes back). **Gentle planets** (off by default, in Grown-ups) gives every bonk back and stops Clashes. Obstacles never appear in any mode before their teaching planet. Dense Core retired (owner decision 14: the Swoop launcher gives the same bend as a choice). "Blocked!" became "Bonk!"; the Field Guide gained a Sky tab.
- **Sims fly for real from here on:** badge-aware casual bots, timed decent/sharp bots, hand-slip noise and learning retries actually fly the shot — angle, power and release-time noise — instead of scoring an outcome blind, so obstacles and aim twists finally count toward difficulty. A Scene Bot plays planets 1–30 and every obstacle's teaching planet through the real scene (390/390 agreement).
- **A bug the Scene Bot caught mid-build:** its automated throws were going unfired on some obstacle planets. The cause was an intro card left open — `window.__scene`'s dev hooks respect the same `modalOpen` guard a real tap does, so the bot needed to close the card before it could aim. Fixed by having the bot dismiss intro cards first.
- The owner's only messages through this stretch were "continue".

### 28. M8 built: Troubles, the Buddy and the difficulty program

- **M8** (`d4241a9`): three Troubles in the pure round step — Ember Vent (planet 14), Tanglevine (28), Frost Creep (36) — with firebreaks, settle states, a two-beat forecast strip (icon, shape, "in N") and zero surprise losses. Traits for all 36 creatures, shown in the Lifebook and as round badges. The Buddy helps from planet 18: a chip on Trouble planets, chosen from a friend living on the Homeworld (decision 20), once per planet, off in competitive modes. One help ladder, campaign only: "What happened" facts on every fail card, a tip, 2 extra throws, glowing hint sectors — no price, no "so close". Gentle planets now applies everywhere and makes Troubles fully inert. Rules froze at `RULES_VERSION = 1` (Combos, sky obstacles, Troubles and flight), covering saves and challenge codes.
- **The difficulty program went through internal phases B–E**, each one re-measuring the curve against 96 bot attempts under two master seeds and re-salting planets to close the gaps, documented in `docs/qa/m8-phase-b-report.md` through `m8-phase-e-report.md`:
  - **Phase B** wired the Trouble-aware sims and found the curve mostly red: Hard planets were far too hard for a casual player (52–60% fail) while a decent player barely noticed the Troubles at all.
  - **Phase C** found the SLACK lint test had been measuring the wrong thing (reaching 1 star, the easy kid floor, instead of a decent player's final star count) and, once fixed, found that easing goals to bring Hard's casual fail rate down broke the decent-player floor — goal misses and floor protection pulled in opposite directions on the same planets.
  - **Phase D** swept individual levers one at a time (goal counts, throw counts, deal timing, Trouble cadence) and could not find a single lever that reached both the casual ceiling and the decent floor on Hard 25+ together. Rather than guess, it wrote the conflict up for the owner.
  - **Phase E** is where the owner decided, and the bands shipped.
- **Decision 28, "Kid-first"** (ROADMAP-v2 §10). The owner:

  > "Keep casual Hard fail ≤ 50% by easing Hard goals; accept that careful players find Hard a bit easier (their fail floor drops to ~12%, 3★ band unchanged). Also: decent floor 5% on normal 31-60, Super decent floor 25%. Hard stays a real challenge, never a wall for a 6-year-old."

  Phase E eased Hard and Super Hard goal selection (one shared biome goal instead of two), widened the bands in ROADMAP-v2 §7.5 and FLIGHT.md §4.2 to match, and re-reviewed the salt table for planets 1–60 (the final table lives in `src/core/levels.ts`). Every gated lint flag — WALL, CLIFF, GOAL-TRAP, STACK, BONK-HEAVY, EASY, TRIVIAL, EASY-EARLY, FLAT, SLACK — reached zero on the pooled 1–60 campaign.

- **Decision 29, "Ship, fix generator next"** (ROADMAP-v2 §10). Phase E's hand-reviewed campaign passed every band, but the raw level **generator** — the "shadow" layouts nobody has hand-salted — still ran about 10 points harder for casual play on planets 21–60 (casual fail 25.7% on 21–30, 35.7% on 31–60). The owner chose to ship the reviewed campaign now and treat the shadow layouts as a Watch rather than hold launch on fixing the generator itself. Bringing the generator into band is a to-do for M12.
- **The goals regression caught by J1, and the new gates.** After the salt work above, running the full Playwright suite (not just the bots) found that `makeLevel(n).goals` was **empty** on every campaign planet 1–13 and on most of Normal 11–20: across phases C–E, salt selection had quietly steered away from goals wherever a goal pushed the fail rate up, because the difficulty bots only ever measure fail/star rates — they never check whether the goal chip is actually on screen. J1's first-session journey does check (`.hud .goals` visible on planet 6, in every language), and that's what caught it. The fix restored planet 6's goal and added two lint gates to the `balance` CI job so the same bug can't come back silently: **GOAL-RAMP** (a chapter's share of goal-bearing planets must stay within 15 points of its target ramp — roughly 30% at planets 7–10, 45% at 11–20, 60% from 21 on) and **TEACH** (every teaching planet — planet 6's goal; 8/13/22/25's Fusion pairs; the Ember Vent, Tanglevine and Frost Creep debuts; each sky obstacle's debut — must still carry its lesson). Both are defined in `tests/sim/lint.ts`.
- **T0 kit:** `docs/qa/playtest-difficulty.md`, a face-card playtest guide for the owner to run with real children (ages 6–10) after planets 8, 14, 19, 22, 26, 33, 36 and 41.

### 29. The aim tag: back on the planet

> "do exactly that, also I liekd it better when the score showed on the planet itself when aiming it felt more intuitive. Think about how to do that while also keeping the combos and interactions known like friends wandering off"

M6's landing card had moved everything off to the side of the aim path. The owner wanted the score back on the planet itself. **Built** (`fc26e93`): a new `src/ui/aimtag.ts` replaces the landing card with a tag at the predicted landing spot — the signed life change, the new land, who moves in, a gold ring for a Fusion or a red outline for a Dry Spell, Combo beads, settled Troubles, and the faces of any friends who would wander off (each also shown as a ghost on its own sector). The tag moves aside so the aim line and a finger never cover it, and VoiceOver still reads the full words. Two small fixes rode along: planet 1's star tip now sits below the life bar, and the fling hint's hand no longer covers its own words.

> "ok go ahead and push and make sure sim is up to date. DOa QA pass and debug"

Pushed, `sim:baseline` refreshed, and a QA and debug pass followed.

### 30. One last QA pass, then the App Store

> "do one last run of qa checks, then get this ready for app store. I want you to do research on how other games post photos and dev notes/descriptions to the app store and create that so we can post it"

Claude ran the full checks, researched how other casual and kids' games present their App Store pages (captioned screenshots, a press kit, dev notes), and built the whole package (`528bc37`; see [02-changes.md](02-changes.md)): 6-language listings measured against Apple's limits (`store/tools/measure-listings.py`), `store/compliance.md` (age rating, App Privacy, IAP metadata, App Review notes), a step-by-step `store/APP_STORE_CONNECT.md`, 48 captioned screenshots plus a contact sheet, and a 22-second App Preview video with its poster frame. The research moved to `docs/product/store-research.md`.

### 31. The name discovery, and decisions 30–32

Checking the store name against the App Store, Claude found "Pocket Planet" already taken — another developer's app, plus close variants — and asked the owner three questions together via `AskUserQuestion`.

> "Wait what?! Does this game already exist???? Think of some new names and pitch them to me"

Claude pitched four clean, checked options (Comet Garden, Pebble Planet, Critter Comet, Cometwild); the owner picked **Comet Garden** (decision 30).

> "Which one will make us more money?"

— asked in answer to Games → Casual at 4+ versus the Kids Category. Claude recommended Casual 4+ (the bigger audience, and the Kids Category stays available to apply for later); the owner's follow-up answer confirmed it: "Yes, Casual 4+" (decision 31).

> "Make a site as part of the marketing material"

Asked next where the site should be hosted:

> "Just build it for now"

(decision 32).

**Built** (`db1872f`, `528bc37`): every player-facing name now reads **Comet Garden** — the Home logo, title, share texts, the rating prompt, the iOS display name, the web title and the privacy policy in all 6 languages. The bundle ID, product IDs and Game Center IDs keep `pocketplanet` on purpose, so store metadata, saves and Game Center standings don't break. Decision 31 is recorded in `store/compliance.md` (Games → Casual at 4+; the listing avoids "for kids" wording until the Kids Category is applied for separately). Decision 32 produced `site/`: a landing page, support/FAQ, the 6-language privacy policy, a press kit and dev notes — no third-party requests, a self-hosted font, and clearly marked placeholders for the owner's support email, legal name and domain (see `site/README.md` for hosting options).

## Recurring patterns in how the owner works

- The most common instruction is "keep going": continue with the next roadmap round without asking.
- They ask for "/deep-research" before new feature rounds. Research first, write findings into ROADMAP.md, then build.
- They want studio quality: custom art, depth, customization, polish, sharing.
- Originality matters a lot. Never clone a hit.
- They want monetization that entices spending, but it must stay kid-safe: no gambling themes, no random paid rewards, fixed-price and previewable purchases, and a parental gate.
- They want to _play_ it: keep the playable build updated, and on a Mac, launch the Simulator.
- They want the work run like a studio: a product manager's scoping, then a dev team (engineering manager, lead developer, test engineer, QA analyst, data analyst) with adversarial reviews, and Codex as lead developer to save tokens.
- They want depth with a clear purpose: shot synergies, combos, stats, power-ups, hazards that make levels harder, and a Homeworld that matters. "What is the point of the game?" must have a crisp answer.
- They want more revenue, still within the kid-safe rules.
- They hand work between sessions often. Keep `docs/handoff/` current whenever a session ends.
- They want difficulty that feels natural: not too hard at the start, not too easy either. Combos are "paramount".
- They want lots of visible polish: animations, pop-up effects, characters and avatars (M6.5).
- They track the plan in Linear. Keep the Linear project in step with the roadmap.
- When a decision is theirs, they answer it briefly (decision 1: "Keep gem packs too"), then expect the build to continue.
