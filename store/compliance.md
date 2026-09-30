# Comet Garden — age rating, privacy, purchases and review notes

Prepared 30 September 2026 against Apple's public documentation (see `docs/product/store-research.md`). Confirm each answer in App Store Connect; Apple shows the final rating after the questionnaire.

## Category decision (owner, 30 Sep 2026)

Games → Casual (secondary: Simulation), rated 4+. **Not** in the Kids Category for launch ("Made for Kids" can't be undone once approved). The game is still built to the Kids Category rules (parent gate, no ads, no third-party analytics). Because it is not in the Kids Category, the listing must not say "for kids" or "for children" (Guideline 2.3.8).

## Age-rating questionnaire (2025 system: 4+ / 9+ / 13+ / 16+ / 18+)

| Question                                                                                                      | Answer              | Why                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Parental Controls                                                                                             | **Yes**             | Purchases, sharing, reminders, Game Center and rating sit behind a parent gate (a number in words, a hold, optional PIN); Grown-ups area. |
| Age Assurance                                                                                                 | No                  | No age verification.                                                                                                                      |
| Unrestricted Web Access                                                                                       | No                  | No browser; outbound actions are gated share sheets only.                                                                                 |
| User-Generated Content                                                                                        | No                  | No text, images or messages from players. Challenge codes are numbers.                                                                    |
| Messaging and Chat                                                                                            | No                  | None.                                                                                                                                     |
| Advertising                                                                                                   | No                  | No ads of any kind.                                                                                                                       |
| Social media features (added July 2026)                                                                       | No                  | No accounts, feeds or friends lists.                                                                                                      |
| Contests                                                                                                      | **Infrequent/Mild** | Game Center leaderboards (optional, off by default, gated). Answer "None" only if leaderboards are removed.                               |
| Gambling / Simulated Gambling                                                                                 | None                | Nothing random is ever sold; no chance mechanics with value.                                                                              |
| Loot boxes                                                                                                    | No                  | Every purchase shows its exact contents first.                                                                                            |
| Cartoon or Fantasy Violence                                                                                   | None                | Nothing is hurt: creatures "wander off" and "come back"; rocks "turn to sparkles".                                                        |
| Realistic Violence, Horror/Fear, Mature/Suggestive, Profanity, Alcohol/Tobacco/Drugs, Medical, Sexual content | None                | —                                                                                                                                         |
| Made for Kids                                                                                                 | No (for now)        | See the category decision.                                                                                                                |

Expected result: **4+**.

## App Privacy ("nutrition label")

Answer **"No, we do not collect data from this app."** → the label shows **Data Not Collected**.

- Progress, settings and the play-time summary are stored only on the device (Capacitor Preferences).
- Purchases go through Apple (StoreKit); Game Center is Apple's; neither is data we collect.
- No analytics SDK, no crash reporter, no ad SDK, no tracking. `PrivacyInfo.xcprivacy` matches.
- Privacy policy URL: the site's `privacy.html` (6 languages).

## In-app purchases (App Store Connect metadata, English)

Display name ≤ 30 characters, description ≤ 45. Review screenshot for each: the Grown-ups shop after the parent gate (take it on a simulator; store it in `store/iap-review/`).

| Product ID                        | Type           | Display name      | Description (≤ 45)                      | Price tier |
| --------------------------------- | -------------- | ----------------- | --------------------------------------- | ---------- |
| com.pocketplanet.game.gems80      | Consumable     | Handful of Gems   | 80 gems for boosters and looks          | $0.99      |
| com.pocketplanet.game.gems500     | Consumable     | Pouch of Gems     | 500 gems for boosters and looks         | $4.99      |
| com.pocketplanet.game.gems1200    | Consumable     | Chest of Gems     | 1,200 gems for boosters and looks       | $9.99      |
| com.pocketplanet.game.gems2800    | Consumable     | Galaxy of Gems    | 2,800 gems for boosters and looks       | $19.99     |
| com.pocketplanet.game.piggy       | Consumable     | Gem Piggy Bank    | The gems saved so far, up to 250        | $1.99      |
| com.pocketplanet.game.startercrew | Non-consumable | Starter Crew      | Aurora sky, suit, trail and banner      | $2.99      |
| com.pocketplanet.game.road00      | Non-consumable | Cosmic Road looks | Cosmic Road looks, gold paints, a title | $4.99      |

Don't promote in-app purchases on the product page (they're for grown-ups).

## Notes for App Review (paste into "App Review Information → Notes")

Comet Garden has no account or login. All progress is stored on the device.

Parent gate: every purchase, share, rating request, reminder setting and Game Center sign-in opens a parent gate (read a three-digit number written in words and enter it on the keypad, then hold to confirm). The Grown-ups area (Settings → Grown-ups) contains the shop, purchase history, Restore Purchases, a spending reminder, a play-time summary and Gentle planets.

Purchases are optional and sold only in the Grown-ups area. Each shows its exact contents before the StoreKit sheet; nothing random is sold. Ask to Buy is supported (the purchase waits until approved).

To reach the shop: it opens after the first chapter chest (finish planets 1–10, about 15 minutes of play; planets 1–3 can't be failed). Then Settings (gear, top left of Home) → Grown-ups → pass the parent gate → Shop. Before that, the Grown-ups area says "The shop opens after the first chapter chest." A StoreKit configuration file (`PocketPlanet.storekit`) is included for testing.

No ads, no third-party analytics, no data collected.

## Contact / URLs (owner fills in)

- Support URL: `https://<your-site>/support.html` (must show a real email)
- Marketing URL: `https://<your-site>/`
- Privacy Policy URL: `https://<your-site>/privacy.html`
- Copyright: `2026 <your legal name or company>`
- Trademark: run a search for "Comet Garden" (USPTO / EUIPO / JPO) before launch.
