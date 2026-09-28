# 01: Conversation history

The owner (George, GitHub `george-babyfig`) worked with Claude Code in one long cloud session. Their messages are quoted as sent, typos included; the notes under each say what happened.

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

## Recurring patterns in how the owner works

- The most common instruction is "keep going": continue with the next roadmap round without asking.
- They ask for "/deep-research" before new feature rounds. Research first, write findings into ROADMAP.md, then build.
- They want studio quality: custom art, depth, customization, polish, sharing.
- Originality matters a lot. Never clone a hit.
- They want monetization that entices spending, but it must stay kid-safe: no gambling themes, no random paid rewards, fixed-price and previewable purchases, and a parental gate.
- They want to _play_ it: keep the playable build updated, and on a Mac, launch the Simulator.
