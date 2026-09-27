# Pocket Planet — Production Roadmap

Goal: a polished, studio-quality casual iOS game you can open in a waiting room, play for two minutes, and want to come back to.

Status key: ✅ done · 🔨 in progress · ⏳ planned · 💭 later / needs a backend

## 1. Foundation

- ✅ Clean repository (`main` + feature branch + PR), CI (format, typecheck, tests, build)
- 🔨 Code structure: per-screen modules, pure testable economy/progression logic
- 🔨 Versioned save data with migrations
- ⏳ Error handling and crash-safe saves

## 2. Custom art (no emoji)

- ⏳ "Critters": all 37 creatures drawn as vector art in one house style (round bodies, big eyes, species features)
- ⏳ Hand-drawn biome props: trees, palms, cacti, mountains, waves, reefs, volcanoes, ice
- ⏳ Custom projectile sprites: rock, ice comet, magma blob, seed pod, rain cloud, sunburst
- ⏳ Planet surface detail: clouds, water shimmer, terrain edges, atmosphere
- ⏳ UI iconography (currencies, boosters, navigation)
- ⏳ New app icon and splash in the same style

## 3. Game feel

- ⏳ Landing-spot preview on the planet while aiming
- ⏳ Impact shockwaves, chain-reaction callouts ("Great!", "Amazing!")
- ⏳ Creature discovery reveal card
- ⏳ Level-complete celebration sequence
- ⏳ Screen transitions, reduced-motion mode

## 4. Progression

- ⏳ Star Map: chapters of 10 planets with names, themes and chapter chests
- ⏳ Star Road: reward track driven by total stars
- ⏳ Daily quests (3 per day + completion bonus)
- ⏳ Daily Planet: one shared seed per day

## 5. Modes

- ⏳ Campaign (levels)
- ⏳ Zen Garden: unlimited throws, no score pressure, a sandbox world that persists
- ⏳ Meteor Rush: 60-second time attack with a score target
- ⏳ Challenge a Friend: share a code; friends play the same planet and compare scores (versus without a server)
- 💭 Game Center leaderboards and achievements (needs a native Game Center plugin)
- 💭 Live real-time versus (needs a hosted game server; not a good fit for a two-minute casual game)

## 6. Monetization

- ✅ Gem packs, Starter Pack, piggy bank, continues, boosters, atmosphere skins
- ⏳ Cosmic Pass: one-time purchase that unlocks a premium lane on the Star Road
- ⏳ Welcome-back offer: double your offline stardust for gems
- ⏳ Timed one-time offers (Starter Pack shown at the right moment, never spammed)

## 7. Onboarding

- ⏳ Guided first levels with coach tips
- ⏳ New-object introduction cards
- ⏳ First-creature celebration

## 8. Retention and platform

- ⏳ Local notifications: vault full, daily gift ready (opt-in)
- ⏳ App Store rating prompt at a happy moment
- ⏳ Share planet screenshots and challenge codes
- ⏳ Settings: reduce motion, notifications, privacy, credits

## 9. Audio

- ⏳ Music that changes with each chapter
- ⏳ Layered impact, bloom and creature sounds

## 10. Ship

- ⏳ Framed App Store screenshots, listing copy, privacy policy page
- ⏳ Expanded automated tests
- ⏳ Full-playthrough QA on small and large iPhones
