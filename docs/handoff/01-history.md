# 01: Conversation history

The owner (George, GitHub `george-babyfig`) worked with Claude Code in two cloud sessions: a long first one (27–28 September) and a short second one (28 September evening) that scoped the next big roadmap. Their messages are quoted as sent, typos included; the notes under each say what happened.

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
