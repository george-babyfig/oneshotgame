# Comet Garden — App Store Connect, step by step

Everything to paste is in this folder. Work top to bottom; items marked **(you)** need your accounts or legal details. Nothing here has been submitted.

## 0. Before you start (you)

1. **Apple Developer Program** membership: choose individual or organization before enrolling. An organization needs a D-U-N-S number and shows the organization as seller. Reserve the unique bundle ID `com.pocketplanet.game` and create the app record early; the app name is reserved through that record.
2. In App Store Connect → **Business**, accept the current **Paid Applications Agreement**, then complete tax forms and banking details. Check that each status is active before creating IAPs. Apply for the **App Store Small Business Program** if eligible; enrollment is separate.
3. Decide and declare **EU Digital Services Act trader status** in App Store Connect. Trader contact details can appear publicly on EU storefronts, so choose the business address, phone and email deliberately.
4. **Trademark check** for "Comet Garden" (USPTO, EUIPO, JPO at minimum). Our App Store and web searches on 30 Sep 2026 found no game or app using it.
5. **Host the site** in `site/` (see `site/README.md`) and put a real support email on `support.html`. Apple requires the Support URL to show real contact details.
6. Decide the **copyright holder** line (for example "2026 Your Name" or your company).

Create permanent App Store Connect objects from the frozen product and achievement sheet: IAP product IDs cannot be reused, Family Sharing cannot be turned off after enabling it for a product, and shipped Game Center achievements cannot be deleted.

## 1. Create the app record

App Store Connect → Apps → **+** → New App.

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Platform         | iOS                                                                          |
| Name             | Comet Garden _(if Apple says it's taken, try "Comet Garden: Tiny Worlds")_   |
| Primary language | English (U.S.)                                                               |
| Bundle ID        | com.pocketplanet.game _(already in the Xcode project; players never see it)_ |
| SKU              | cometgarden-ios-1                                                            |
| User access      | Full access                                                                  |

## 2. App Information

- Subtitle: from `listing.md` (per language).
- Category: **Games**, subcategories **Casual** and **Simulation**.
- Content rights: "Does not contain, show or access third-party content."
- Age rating: answer as in `compliance.md` → expected **4+**.
- **Made for Kids: No** (the owner's decision; it can't be undone once approved).
- Privacy Policy URL: `https://YOUR-DOMAIN/privacy.html`.

## 3. Pricing and availability

- Price: Free. Choose tested storefronts; leave mainland China out pending a game-licence review. Turn off Apple Silicon Mac and Vision Pro availability for 1.0.
- Localize neighbouring storefronts deliberately: es-ES can use the es-MX text only after a native review; pt-PT needs a European Portuguese review of pt-BR; fr-CA needs a Canadian French review of fr-FR; en-GB can begin from en-US with spelling and terminology checked. Do not claim these locales as translated until reviewed.

## 4. App Privacy and accessibility

"Do you or your third-party partners collect data from this app?" → **No**. The label reads **Data Not Collected**. For Accessibility Nutrition Labels, start from the honest draft in `accessibility.md` and verify on device.

## 5. In-app purchases

After owner approval, create exactly the 12 products in `catalogue-sheet.md`. For each, use the six localized names and descriptions, the USD tier, Family Sharing flag and its matching review screenshot from `iap-review/`. Do not create any App Store Connect object before the sheet is approved. Submit all twelve with the first version.

## 6. Game Center (optional)

Enable Game Center and create only the achievements in `gamecenter.md` for 1.0. Do not create leaderboards. Answer Contests "None" in the age-rating questionnaire.

## 7. Version 1.0 page (per language: en-US, es-MX, fr-FR, de-DE, pt-BR, ja)

1. Screenshots (recommended set): `screenshots-v2/<lang>/6.9/` ("Sticker Scrapbook", 1320 × 2868). Upload in file-name order. English has 7 stills because the App Preview is tile 1; the other languages have 8, starting with the fling. Only the 6.9" size is required; Apple scales it for smaller iPhones. The earlier set in `screenshots/<lang>/6.9/` is kept as a fallback.
2. App Preview (optional): `preview/app-preview-en.mp4` (886 × 1920, under 30 s). Set the poster frame to the fling.
3. Promotional text, description and keywords: `listing.md` (English) and `listing.<es|fr|de|pt|ja>.md`.
4. Support URL: `https://YOUR-DOMAIN/support.html`. Marketing URL: `https://YOUR-DOMAIN/`.
5. Version: 1.0. Copyright: your line. "What's New" is not shown for a first release.
6. Build: upload from Xcode (Product → Archive → Distribute → App Store Connect), then select it here.
7. Export compliance: the app declares `ITSAppUsesNonExemptEncryption = NO`.
8. App Review information: a contact name, phone and email **(you)**; paste the review notes from `compliance.md` and attach `review/demo.mov` after the lead records it. No sign-in is needed.
9. Release: choose manual release and configure phased release deliberately.
10. The Cosmic Road In-App Event copy draft is in `in-app-event.md`; publish only after feature, art, dates and localizations are final.

## 8. After approval

- Replace the App Store badge placeholder on the site with the real link.
- Update the promotional text for events without a new build.
- From 1.0.1 on, write "What's New" from `whats-new-template.md`.
- Consider the Kids Category later (permanent once approved), custom product pages and In-App Events.
