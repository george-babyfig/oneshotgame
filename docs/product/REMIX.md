# Remix and the iMessage sticker pack — spec

Status: 🔨 Remix is designed and not built yet. ⏳ The iMessage pack is planned. This spec comes from the round 7 research (a sweep of how games handle replay and remix modes, with every finding checked against its source; see [ROADMAP.md](../../ROADMAP.md) round 7) and the code as of commit `911d004`. Where it fits among the other work is set in [ROADMAP-v2.md](ROADMAP-v2.md).

## Code notes for whoever builds it

These are verified against the code:

- `makeLevel(n, seedPrefix, o)` in `src/core/levels.ts` treats any prefix other than `'PP'` as a normal planet with no sawtooth: `difficultyOf()` returns `'normal'` and `saw` is 0.5. It gives goals only for `n >= GOALS_FROM` (6), and even then `pickGoals` returns none 40% of the time on normal planets.
  - Remix needs a `remix` option that keeps Hard at slot 5, Super Hard at slot 9 (chapter 2 on) and the Guardian at slot 10.
  - It also has to force exactly one goal, even in chapter 1.
  - The target shift is: 1★ = the classic 2★ fraction, 2★ = halfway between the classic 2★ and 3★ fractions, 3★ = the classic 3★ fraction (keep the 0.97 cap). All targets come from `greedyPlan` on the remix seed.
- Physics twists (wind, heavy, wobble, twin, fast, tiny, moon) only change aiming in `src/ui/game.ts`. The solver ignores them, so they don't affect feasibility. `hot`, `frozen` and `ocean` change the start planet through `startFor()`. A new "Short Supply" twist removes one kind from the deal, so the solver must run on the changed queue.
- Use the Weekly Voyage as the template for a non-campaign route: `src/meta/voyage.ts` and `src/ui/screens/voyage.ts`. It has its own `play()` with `app.sceneOpts({ label, onEnd })`, its own `ended()` result modal, and a record that keeps the best stars.
  - Remix must **not** go through `applyLevelWin`. That function would add campaign stars, dust, piggy, galaxy entries and `p.level`.
- The chapter is finished when `p.level > chapter.last` (the same test as `chestsReady`).
- **Profile:** add `remix: Record<number, number[]>` (chapter → best stars per slot) with a default of `{}`. `migrate()` deep-merges, so no version bump is needed. Stars only ever go up.
- **Titles, sticker and achievements:** derive titles in `titlesOwned()` (`src/meta/passport.ts`). Add one feat sticker to `FEATS` (`src/meta/stickers.ts`) with art in `src/ui/art/stickers.ts`. Game Center is at 925 of Apple's 1000 points, so three new achievements must total 75 points or less; add them to `store/gamecenter.md` too.
- **Music:** a remix variant can be derived from the chapter theme (for example, double-time arpeggio or another waveform) in `src/ui/audio.ts`. Check it with `npm run music`.
- **Tests to add:**
  - determinism
  - for chapters 1–50: exactly one twist and one goal on each planet, `greedyPlan` meets the goal and 3★, and targets strictly increase
  - stars never drop on replay
  - locked until the chapter is finished
  - Remix never changes campaign stars, dust, level or Star Road totals
  - migration of old saves

## Design

SCOPE. Remix has one tier per chapter. It is built on the existing makeLevel / greedyPlan / pickGoals in src/core/levels.ts and needs no new art pipeline and no new currency. Stacked Ascension-style tiers (Remix+, Remix++) are deferred, because stacked modifiers become walls for young players [26].

1. UNLOCK RULE

- A chapter's Remix opens when that chapter's boss planet (planet 10c) is cleared at any star count, which is the same moment the chapter is marked finished. It is never gated on 3 stars, and nothing opens it early for money [6][7][8].
- How players find it: a quiet gold "Remix" chip on finished chapter cards in the Star Map, plus a single Inbox letter the first time any Remix opens. No pop-up, no push notification, no red dot. It is never shown when the child pauses, quits or ends a session [28].

2. WHAT A REMIXED PLANET IS

- Generation: remixLevel(n) = makeLevel(n, 'RX', { goals: true, boss: n % 10 === 0, remix: true }). It is a pure function of the planet number and a fixed salt, so nothing is hand-built and Remix grows with the endless campaign for free [9]. Seeds are fixed and never re-rolled per attempt, so a retry is always the same planet. One code change is needed: difficultyOf() and the chapter sawtooth currently treat any non-'PP' prefix as 'normal'. The remix flag must keep Hard at slot 5, Super Hard at slot 9 and the Comet Guardian at slot 10, so each remixed chapter keeps its own curve.
- What stays familiar: the same chapter, slot, planet name, hue, available kinds in the tray and difficulty slot. What reads as "remixed": a new seed (different start land, deal order and spin), a dusk sky palette with a thin gold rim on the planet, and the Voyage/festival music played through a variant (a filter or tempo change on the themes we already have) [5][15].
- Exactly ONE twist per planet [1][2][3]. It is drawn deterministically from the seed and named on the pre-level card before the first throw (prelevel.ts already shows the TWISTS name and description, and those strings are already localized). The v1 deck is the existing twists plus one new tray twist, "Short Supply": one kind is removed from the deal and the solver re-runs on the changed queue. Order runs from gentle to hard: slots 1-4 draw start-state or size twists (Scorched, Snowball, Water World, Tiny World), slots 5-9 draw physics twists (Solar Wind, Dense Core, Wobbly Spin, Twin Moons, Moon Guard, Fast Spin), and slot 10's twist is the Comet Guardian. No timers, no stacked penalties, no permanent-placement rules. Twist names and parameters are our own.
- Always-on goal: every remixed planet has exactly ONE goal, including chapter 1, where classic planets have none before planet 6. pickGoals takes it from the solver's own plan, so it is reachable. It is shown as an icon, with optional voiceover for pre-literate players [4][30]. In v1.1, add "inverted" goals such as "finish with no volcano" once the solver can check them.
- Tougher targets, shifted one notch: Remix 1 star = the classic 2-star share of the greedy optimum; Remix 2 stars = halfway between the classic 2- and 3-star shares; Remix 3 stars = the classic 3-star share (the 0.97 cap is unchanged). All three come from greedyPlan on the remix seed itself (with the Short Supply queue when that twist is drawn), never from a multiplier over classic targets [12]. Caveat (our own inference): the solver assumes perfect aim, and physics twists make aiming harder without changing the land plan. So do not push 3 stars higher; the twist and the goal carry the extra challenge.
- Power: Remix uses exactly the classic rules the solver already models. It adds no power and pays none out.

3. REWARDS (no new currency, nothing sold)

- Remix stars: the familiar 1-3 star scale drawn in gold. They have their own counter ("Remix x/30" per chapter, with a total on the Passport) and never count toward Star Road, chapter chests, Explorer Rank, daily quests or Momentum, so Remix never feels required. Each planet's best-ever result is saved the moment a level ends. A failed attempt removes nothing, and all 10 remixed planets are open at once.
- Chapter frame ladder: an outline once any remixed planet is played, silver when all 10 are cleared (at least 1 star each), gold at 30/30. The frame shows on the Star Map chapter card and on the Passport, where the child looks on every launch [13]. It changes art only.
- Passport titles: a chapter title at silver that names the chapter, not talent (for example "Chapter 4 Remixed"). Add 2-3 account-wide titles for total Remix stars across any chapters (for example "Orbit Tinkerer"), so kids choose where to master rather than needing perfection everywhere [41]. Titles are derived in titlesOwned() from stored stars, so they cannot disappear.
- Small fixed extras: one deed sticker in the in-game Sticker Album for the first gold frame, and a gold marker on each 3-star remixed planet. Add 3 progressive Game Center achievements (First Remix, Remix a Boss chapter, Gold Frames 1/5/10) with centred, text-free 1024 px art [31]. No leaderboard.
- Permanence: store profile.remix[chapter] = { v: REMIX_RULES, best: [10 values] } with a save migration. Stars only go up (max of old and new). A later retune changes future targets only and never lowers stored stars, frames or titles [10][11].
- Remix pays no gems, dust or materials. The shop sells nothing that looks like Remix (no gold frame, no skip).

4. STAR MAP PRESENTATION

- A finished chapter card gets a Classic | Remix toggle. The Remix side shows the same 10-planet row in dusk colours, with twist-chip icons, gold stars, x/30 and the frame state. The current and teaser chapters show no Remix.
- Pre-level card: twist chip, goal icon and the three targets, all before the first throw.
- Result screen: only "Next remix planet" and "Map". No shop button, no "unlock more", and the next planet never starts automatically [19]. The gold-frame end card is calm: "Chapter remixed! Nice spot for a break." [27]
- Do not show a Remix percentage on every chapter card; progress lives in the Remix view and the Passport. Zen Garden already exists as the calm alternative, so Remix never needs to be the default next step.

5. PITFALLS FOR KIDS 6+

- No first-try conditions, limited tries, expiry, streaks, timers beyond the normal ~1-minute level, or continue offers [23][24][25].
- Copy praises the shot and suggests a new angle; never "Failed" or "not good enough". Remix is labelled "Bonus", and finishing the classic campaign counts as full completion [29].
- Remix never touches classic stars, chapter completion or campaign progress, and never gates the campaign.
- No sad or pleading creatures and no countdowns when Remix is declined [28].
- Keep Remix out of the date-seeded daily, weekly and monthly calendar: no weekly "Remix rules" planet and no date-exclusive remix medals.
- One goal per planet, shown as an icon first. Twists come from our own parameters so no other game's mode is cloned.

6. ONE-DEVELOPER BUILD ORDER

- Step 1: remixLevel, the target shift, the Short Supply twist, the profile.remix migration, and vitest checks. The checks: the same n always gives the same level; for chapters 1-50, every remixed planet has one twist and one goal that greedyPlan meets, targets strictly increase and 3 stars stays within the solver cap; stored stars never drop on replay or after a TUNE change.
- Step 2: the Star Map toggle, pre-level chip, result card, dusk palette with gold rim, and the music variant.
- Step 3: frames, titles, achievements, the album sticker, and strings for the 5 locales.
- Deferred: inverted goals, a "visitor creature" twist, choosing 1 of 2 twist chips, Remix+, and a parental-area early unlock.

## iMessage sticker pack

STATUS: ⏳. GOAL: a free, fully unlocked, static sticker pack bundled into Pocket Planet as a Sticker Pack extension. The extension contains no code, and everyone who installs the game sees it in Messages automatically [17][18]. As a bundled extension it gets no Stickers-category listing of its own; a free standalone sticker app could come later, but it would be a second app record to maintain.

CONTENT: about 24 stickers, all at one size, Regular 408x408 px (3 per row); sizes are never mixed [32]. It is a separate, wordless "chat set" of reaction poses drawn from our own art code (drawCreature, the planet art, and drawSticker's white die-cut border and shadow without the RARITY_BG backgrounds). Examples: a planet waving hi, a wide-eyed penguin, a volcano "oops", a cheering forest, a seed crossing its fingers, and festival creatures in costume (kept year-round, with no jokes that only work on one date). Add 2-3 free Round 7 celebration stickers: a dusk "remixed" planet, a Passport stamp and a dancing festival creature. LEFT OUT: in-game album and rarity art, the gold chapter frame (it must stay earned-only), any shop, "play now" or promo sticker, anything that looks like Apple emoji, and baked-in text [19]. Optionally, 3-4 animated creatures as .stickersequence PNG frames.

CAN BE DONE ON LINUX NOW:

1. `npm run stickers:export`, modelled on resources/render-art.cjs (Playwright plus the Vite dev server, because the art needs a browser Canvas 2D). Draw on a canvas of exactly 408x408. Do not use stickerCanvas(), which multiplies by devicePixelRatio. Write Stickers.xcstickers/Sticker Pack.stickerpack/Contents.json (grid-size "regular") and one .sticker folder per sticker, each with an English accessibility-label [33].
2. Make the script and CI fail if any file is not exactly 408x408 or is 500,000 bytes or more. The limit covers the whole file, every animation frame included, and Xcode only warns [34].
3. Render the iMessage App Icon set from the same script. The icons must be opaque (use the #0b0a24 space background; otherwise upload fails with ITMS-90647), composed for the 4:3 shape, with a simplified silhouette for the 54x40 breadcrumb [35].
4. CI guard: after `npx cap sync ios`, CapApp-SPM/Package.swift must still say .iOS(.v15) and every IPHONEOS_DEPLOYMENT_TARGET must be 15.0 [37][38].

NEEDS A MAC WITH XCODE:

- Choose File > New > Target > Sticker Pack Extension. Set the bundle id to com.pocketplanet.game.Stickers, IPHONEOS_DEPLOYMENT_TARGET to 15.0 and TARGETED_DEVICE_FAMILY to 1 (both matching App), and use the same MARKETING_VERSION and CURRENT_PROJECT_VERSION as App. Embed it in App, do not link CapApp-SPM, and point it at the generated catalog.
- Fill every slot Xcode's iMessage App Icon set shows. QA1686 and the HIG list different sizes, and a missing icon can leave the pack "unknown to FrontBoard" [35][36].
- Set up signing and a provisioning profile for the extension's App ID, then archive and upload.
- Test in the Simulator and on a device: the pack appears in Messages; stickers peel off and send; the largest animated sticker works; VoiceOver reads the labels in en/es/fr/de/pt/ja. Ship v1 with the default Messages context. Test NSStickerSharingLevel and the media context on a device later, before enabling either [40].
- App Store Connect: add the iMessage app icon and iMessage screenshots with invented names and no phone numbers [39]. Mention the pack in the app description (Guideline 4.4). Keep "For Kids" wording out unless the app is in the Kids Category (2.3.8) [19].

NEVER: re-run `npx cap add ios`, which rewrites every bundle id to com.pocketplanet.game. Never put IAP, links or marketing in the extension (4.4), and never make paid or Remix-locked sticker sets.

OPEN QUESTION: accessibility-label is one string per sticker, and Apple documents no localization key for it, so how to localize the labels is still unconfirmed.

## Sources

- [1] https://www.mariowiki.com/Prankster_Comet
- [2] https://strategywiki.org/wiki/Portal/Advanced_Chambers
- [3] https://mariokart.fandom.com/wiki/Mirror_Mode
- [4] https://wheresmywater.fandom.com/wiki/Challenges
- [5] https://www.mariowiki.com/World_Mushroom_(Super_Mario_3D_World)
- [6] https://celeste.ink/wiki/Alternate_sides
- [7] https://www.destructoid.com/mario-kart-8-update-unlocks-200cc-and-mirror-mode-for-everyone/
- [8] https://tetris.wiki/Tetris_Effect
- [9] https://candycrush.fandom.com/wiki/Dreamworld
- [10] https://candycrush.zendesk.com/hc/en-us/articles/360002087578-How-do-I-collect-Sugar-Stars
- [11] https://candycrush.fandom.com/wiki/Trophy
- [12] https://community.king.com/en/candy-crush-saga/discussion/344013/impossible-sugar-stars
- [13] https://hollowknight.fandom.com/wiki/Menu_Styles_(Hollow_Knight)
- [15] https://radicaldreamland.bandcamp.com/album/celeste-b-sides
- [17] https://developer.apple.com/documentation/messages/adding-your-sticker-packs-to-messages
- [18] https://developer.apple.com/imessage/
- [19] https://developer.apple.com/app-store/review/guidelines/
- [23] https://candycrush.fandom.com/wiki/Sugar_Stars
- [24] https://rhythmheaven.fandom.com/wiki/Perfect_Campaign
- [25] https://steamcommunity.com/app/1127500/discussions/0/597386372524909497/
- [26] https://slaythespire.wiki.gg/wiki/Ascension
- [27] https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/
- [28] https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2793493
- [29] https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility/
- [30] https://developer.apple.com/app-store/kids-apps/
- [31] https://developer.apple.com/videos/play/wwdc2020/10145/
- [32] https://developer.apple.com/design/human-interface-guidelines/imessage-apps-and-stickers
- [33] https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/StickerPack.html
- [34] https://developer.apple.com/forums/thread/50394
- [35] https://developer.apple.com/library/archive/qa/qa1686/_index.html
- [36] https://developer.apple.com/forums/thread/797781
- [37] https://github.com/ionic-team/capacitor/blob/main/cli/src/ios/common.ts
- [38] https://github.com/ionic-team/capacitor/issues/8571
- [39] https://developer.apple.com/app-store/sticker-submissions/
- [40] https://developer.apple.com/documentation/messages/adding-sticker-packs-and-imessage-apps-to-the-system-stickers-app-messages-camera-and-facetime
- [41] https://en.wikipedia.org/wiki/NES_Remix
