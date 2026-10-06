# Comet Garden — age rating, privacy, purchases and review notes

Prepared 30 September 2026 against Apple's public documentation (see `docs/product/store-research.md`). Confirm each answer in App Store Connect; Apple shows the final rating after the questionnaire.

## Category decision (owner, 30 Sep 2026)

Games → Casual (secondary: Simulation), rated 4+. **Not** in the Kids Category for launch ("Made for Kids" can't be undone once approved). The game is still built to the Kids Category rules (parent gate, no ads, no third-party analytics). Because it is not in the Kids Category, the listing must not say "for kids" or "for children" (Guideline 2.3.8).

## Age-rating questionnaire (2025 system: 4+ / 9+ / 13+ / 16+ / 18+)

| Question                                                                                                      | Answer       | Why                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parental Controls                                                                                             | **Yes**      | Purchases, sharing, reminders, Game Center and rating sit behind a parent gate (a number in words, a hold, optional PIN); Grown-ups area.                     |
| Age Assurance                                                                                                 | No           | No age verification.                                                                                                                                          |
| Unrestricted Web Access                                                                                       | No           | No browser; outbound actions are gated share sheets only.                                                                                                     |
| User-Generated Content                                                                                        | No           | No in-app uploads, feeds or player messages. A player may share a locally generated picture or alphanumeric challenge code through the gated iOS share sheet. |
| Messaging and Chat                                                                                            | No           | None.                                                                                                                                                         |
| Advertising                                                                                                   | No           | No ads of any kind.                                                                                                                                           |
| Social media features (added July 2026)                                                                       | No           | No accounts, feeds or friends lists.                                                                                                                          |
| Contests                                                                                                      | None         | Game Center 1.0 uses achievements only; there are no leaderboards.                                                                                            |
| Gambling / Simulated Gambling                                                                                 | None         | Nothing random is ever sold; no chance mechanics with value.                                                                                                  |
| Loot boxes                                                                                                    | No           | Every purchase shows its exact contents first.                                                                                                                |
| Cartoon or Fantasy Violence                                                                                   | None         | Nothing is hurt: creatures "wander off" and "come back"; rocks "turn to sparkles".                                                                            |
| Realistic Violence, Horror/Fear, Mature/Suggestive, Profanity, Alcohol/Tobacco/Drugs, Medical, Sexual content | None         | —                                                                                                                                                             |
| Made for Kids                                                                                                 | No (for now) | See the category decision.                                                                                                                                    |

Expected result: **4+**.

## App Privacy ("nutrition label")

Answer **"No, we do not collect data from this app."** → the label shows **Data Not Collected**.

- Progress, settings and the play-time summary are stored on the device (Capacitor Preferences); they may be included in a device backup.
- Purchases go through Apple (StoreKit); Game Center is Apple's; neither is data we collect.
- No analytics SDK, no crash reporter, no ad SDK, no tracking. Check the archived app's privacy report against `PrivacyInfo.xcprivacy` before submission.
- Privacy policy URL: the site's `privacy.html` (6 languages).

## In-app purchases (App Store Connect metadata, English)

Display name ≤ 30 characters, description ≤ 45. Review screenshot for each: the Grown-ups shop after the parent gate (take it on a simulator; store it in `store/iap-review/`).

| Product ID                        | Type           | Display name             | Description (≤ 45)                      | Price tier | Family Sharing |
| --------------------------------- | -------------- | ------------------------ | --------------------------------------- | ---------- | -------------- |
| com.pocketplanet.game.gems80      | Consumable     | Handful of Gems          | 80 gems for boosters and looks          | $0.99      | Off            |
| com.pocketplanet.game.gems500     | Consumable     | Pouch of Gems            | 500 gems for boosters and looks         | $4.99      | Off            |
| com.pocketplanet.game.gems1200    | Consumable     | Chest of Gems            | 1,200 gems for boosters and looks       | $9.99      | Off            |
| com.pocketplanet.game.gems2800    | Consumable     | Galaxy of Gems           | 2,800 gems for boosters and looks       | $19.99     | Off            |
| com.pocketplanet.game.piggy       | Consumable     | Gem Piggy Bank           | The gems saved so far, up to 250        | $1.99      | Off            |
| com.pocketplanet.game.startercrew | Non-consumable | Starter Crew             | Aurora sky, suit, trail and banner      | $2.99      | On             |
| com.pocketplanet.game.road00      | Non-consumable | Cosmic Pass: Cosmic Road | Cosmic Road looks, gold paints, a title | $3.99      | On             |

Don't promote in-app purchases on the product page (they're for grown-ups).

## Notes for App Review (paste into "App Review Information → Notes")

Comet Garden has no account or login. All progress is stored on the device.

Parent gate: every purchase, share, rating request, reminder setting and Game Center sign-in opens a parent gate. Read a three-digit number written in words, enter it on a shuffled keypad, then hold to confirm. After a wrong answer the gate pauses for 30 seconds. A fresh install has no PIN; an adult may set one later. The Grown-ups area contains the shop, purchase history, Restore Purchases, a spending reminder, a play-time summary and Gentle planets.

Purchases are optional and sold only in the Grown-ups area. Each shows its exact contents before the StoreKit sheet; nothing random is sold. Ask to Buy is supported (the purchase waits until approved).

To reach the shop on a fresh install: open Settings (gear on Home) → Grown-ups → pass the parent gate → Shop. No chapter completion is needed for this adult-only path. Use the App Store Connect sandbox for purchase review, including Ask to Buy and Restore Purchases. The app is iPhone-only. Attach the path recording at `store/review/demo.mov` in App Review Information (the lead records this file).

No ads, no third-party analytics, no data collected.

## Contact / URLs (owner fills in)

- Support URL: `https://YOUR-DOMAIN/support.html` (must show a real email)
- Marketing URL: `https://YOUR-DOMAIN/`
- Privacy Policy URL: `https://YOUR-DOMAIN/privacy.html`
- Copyright: `2026 OWNER NAME`
- Trademark: run a search for "Comet Garden" (USPTO / EUIPO / JPO) before launch.
