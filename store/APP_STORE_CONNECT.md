# Comet Garden — App Store Connect, step by step

Everything to paste is in this folder. Work top to bottom; items marked **(you)** need your accounts or legal details. Nothing here has been submitted.

## 0. Before you start (you)

1. **Apple Developer Program** membership (individual or organization). Organization accounts show your company name as the seller.
2. **Trademark check** for "Comet Garden" (USPTO, EUIPO, JPO at minimum). Our App Store and web searches on 30 Sep 2026 found no game or app using it.
3. **Host the site** in `site/` (see `site/README.md`) and put a real support email on `support.html`. Apple requires the Support URL to show real contact details.
4. Decide the **copyright holder** line (for example "2026 Your Name" or your company).

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
- Privacy Policy URL: `https://<your-site>/privacy.html`.

## 3. Pricing and availability

- Price: Free. Availability: all countries you want. Keep "Available on Apple Silicon Macs" off unless tested.

## 4. App Privacy

"Do you or your third-party partners collect data from this app?" → **No**. The label reads **Data Not Collected**.

## 5. In-app purchases

Create the 7 products exactly as in `compliance.md` (product IDs must match the code). For each, set the display name and description per language, the price tier and a review screenshot of the Grown-ups shop. Submit them with the first version.

## 6. Game Center (optional)

Enable Game Center and create the leaderboards and achievements in `gamecenter.md`. If you leave Game Center off, answer Contests "None" in the age-rating questionnaire.

## 7. Version 1.0 page (per language: en-US, es-MX, fr-FR, de-DE, pt-BR, ja)

1. Screenshots (recommended set): `screenshots-v2/<lang>/6.9/` ("Sticker Scrapbook", 1320 × 2868). Upload in file-name order. English has 7 stills because the App Preview is tile 1; the other languages have 8, starting with the fling. Only the 6.9" size is required; Apple scales it for smaller iPhones. The earlier set in `screenshots/<lang>/6.9/` is kept as a fallback.
2. App Preview (optional): `preview/app-preview-en.mp4` (886 × 1920, under 30 s). Set the poster frame to the fling.
3. Promotional text, description and keywords: `listing.md` (English) and `listing.<es|fr|de|pt|ja>.md`.
4. Support URL: `https://<your-site>/support.html`. Marketing URL: `https://<your-site>/`.
5. Version: 1.0. Copyright: your line. "What's New" is not shown for a first release.
6. Build: upload from Xcode (Product → Archive → Distribute → App Store Connect), then select it here.
7. Export compliance: the app declares `ITSAppUsesNonExemptEncryption = NO`.
8. App Review information: a contact name, phone and email **(you)**; paste the review notes from `compliance.md`. No sign-in is needed.
9. Release: "Manually release this version" is safest for launch day.

## 8. After approval

- Replace the App Store badge placeholder on the site with the real link.
- Update the promotional text for events without a new build.
- From 1.0.1 on, write "What's New" from `whats-new-template.md`.
- Consider the Kids Category later (permanent once approved), custom product pages and In-App Events.
