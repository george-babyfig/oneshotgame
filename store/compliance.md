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

## In-app purchases (frozen 12-product sheet)

The canonical product names, descriptions, fixed contents and six localizations are in [`catalogue-sheet.md`](catalogue-sheet.md). Each product has one review screenshot from the gated Grown-ups shop. No App Store Connect products have been created from this sheet.

| Product ID                              | Type           |    USD | Family Sharing | Fixed contents                                                                                                                                                                                                                                                        |
| --------------------------------------- | -------------- | -----: | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| com.pocketplanet.game.gems80            | Consumable     |  $0.99 | Off            | 80 gems                                                                                                                                                                                                                                                               |
| com.pocketplanet.game.gems500           | Consumable     |  $4.99 | Off            | 500 gems                                                                                                                                                                                                                                                              |
| com.pocketplanet.game.gems1200          | Consumable     |  $9.99 | Off            | 1,200 gems                                                                                                                                                                                                                                                            |
| com.pocketplanet.game.gems2800          | Consumable     | $19.99 | Off            | 2,800 gems                                                                                                                                                                                                                                                            |
| com.pocketplanet.game.piggy             | Consumable     |  $1.99 | Off            | The gems saved so far, up to 250                                                                                                                                                                                                                                      |
| com.pocketplanet.game.startercrew       | Non-consumable |  $2.99 | On             | Aurora atmosphere; Aurora Explorer suit; Aurora trail; Aurora Passport banner; Aurora hat; Aurora launcher look; Aurora Homeworld paint                                                                                                                               |
| com.pocketplanet.game.road00            | Non-consumable |  $3.99 | On             | Cosmic atmosphere; Golden Orbit launcher look; Halo Ring hat; Comet Tail trail; Star Captain suit; Gilded Homeworld ground paint; Liquid Gold Homeworld sea paint; Starfield photo frame; Gilded Passport banner; Star Captain title; Star Captain pose; Cosmic burst |
| com.pocketplanet.game.theme.tidepool    | Non-consumable |  $2.99 | On             | Six Tidepool Lab skins; Tidepool Den skin; Tidepool Greenhouse skin; Tidepool Launch Bay skin; Tidepool ground paint; Tidepool sea paint; Three Tidepool decoration skins; Two Tidepool friend outfits                                                                |
| com.pocketplanet.game.theme.cometcandy  | Non-consumable |  $2.99 | On             | Six Comet Candy Lab skins; Comet Candy Den skin; Comet Candy Greenhouse skin; Comet Candy Launch Bay skin; Comet Candy ground paint; Comet Candy sea paint; Three Comet Candy decoration skins; Two Comet Candy friend outfits                                        |
| com.pocketplanet.game.pack.crystalfrost | Non-consumable |  $2.99 | On             | Crystal Frost Keeper suit; Crystal Frost Keeper hat; Six Crystal Frost object trails; Six Crystal Frost object bursts; Crystal Frost Fusion style                                                                                                                     |
| com.pocketplanet.game.style.nebula      | Non-consumable |  $1.99 | On             | Nebula Swirl Supernova style; Nebula Swirl trail                                                                                                                                                                                                                      |
| com.pocketplanet.game.style.firefly     | Non-consumable |  $1.99 | On             | Firefly Sparks Supernova style; Firefly Sparks trail                                                                                                                                                                                                                  |

## Notes for App Review (paste into "App Review Information → Notes")

Comet Garden has no account or login. All progress is stored on the device.

Parent gate: every purchase, share, rating request, reminder setting and Game Center sign-in opens a parent gate. Read a three-digit number written in words, enter it on a shuffled keypad, then hold to confirm. After a wrong answer the gate pauses for 30 seconds. A fresh install has no PIN; an adult may set one later. The Grown-ups area contains the shop, purchase history, Restore Purchases, a spending reminder, a play-time summary and Gentle planets.

Purchases are optional and sold only in the Grown-ups area. Each shows its exact contents before the StoreKit sheet; nothing random is sold. Ask to Buy is supported (the purchase waits until approved).

To reach the shop on a fresh install: open Settings (gear on Home) → Grown-ups → pass the parent gate → Shop. No chapter completion is needed for this adult-only path. Use the App Store Connect sandbox for purchase review, including Ask to Buy and Restore Purchases. The app is iPhone-only. Attach the path recording at `store/review/demo.mov` in App Review Information (the lead records this file).

To inspect purchased looks immediately, return to Grown-ups and tap Styles. The review video should show the delivered look after purchase, not stop at the receipt.

| Product ID suffix                           | How to verify delivery                                                                                                                                                                                                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gems80`, `gems500`, `gems1200`, `gems2800` | Check the gem balance rises by 80, 500, 1,200 or 2,800 respectively.                                                                                                                                                                                                                                      |
| `piggy`                                     | First win a planet to save gems in the Piggy Bank; its sheet shows the exact saved amount. Buy and check that amount moves into the gem balance.                                                                                                                                                          |
| `startercrew`                               | Open Styles for the Aurora atmosphere, Keeper suit and hat, trail, launcher look and Homeworld paint; open Passport for the banner.                                                                                                                                                                       |
| `road00`                                    | The Pass shows as owned immediately. Earn Road points in Missions → Cosmic Road to unlock its twelve paid steps. The Cosmic atmosphere is at step 1; later paints and wearables are in Styles, and the banner and title are in Passport after their steps. The Road and Passport open as play progresses. |
| `theme.tidepool`, `theme.cometcandy`        | Open Styles → Homeworld looks and Friend outfits; select a paint or building skin and view it on Homeworld.                                                                                                                                                                                               |
| `pack.crystalfrost`                         | Open Styles → Suit, Hat, Objects and Effects for the Keeper set, trails, bursts and Fusion style.                                                                                                                                                                                                         |
| `style.nebula`, `style.firefly`             | Open Styles → Effects and Trail for the Supernova style and its matching trail.                                                                                                                                                                                                                           |

No ads, no third-party analytics, no data collected.

## Contact / URLs (owner fills in)

- Support URL: `https://YOUR-DOMAIN/support.html` (must show a real email)
- Marketing URL: `https://YOUR-DOMAIN/`
- Privacy Policy URL: `https://YOUR-DOMAIN/privacy.html`
- Copyright: `2026 OWNER NAME`
- Trademark: run a search for "Comet Garden" (USPTO / EUIPO / JPO) before launch.
