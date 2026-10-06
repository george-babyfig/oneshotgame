# Pocket Planet: App Store research brief

Checked 30 Sep 2026 on public pages only. "Verify" marks points I could not confirm with Apple.

## 0. Findings that change plans

1. **"Pocket Planet" is already taken on the App Store.** Another developer's Lifestyle app uses the exact name (id6760213438, Mar 2026). "Pocket Planet: Cosmos", "Idle Pocket Planet" and "Little Universe: Pocket Planet" also exist ([search](https://itunes.apple.com/search?term=pocket+planet&entity=software&country=us)). Names must be unique, so we need a suffix or a new name, plus a trademark check.
2. **The build is iPhone-only and portrait-only** (`TARGETED_DEVICE_FAMILY = 1`), so no iPad screenshots are needed.
3. **Choosing "Made for Kids" is permanent** once the app is approved.
4. **Game Center leaderboards** may affect the age-rating "Contests" answer (see §2).

## 1. Apple rules and limits

Sources: [version fields](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information), [app info](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information), [search](https://developer.apple.com/app-store/search/), [Guidelines](https://developer.apple.com/app-store/review/guidelines/) (last revised 8 Jun 2026)

| Field              | Limit and notes                                                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name               | 2–30 chars and unique. No prices or other apps' names (2.3.7).                                                                                                                                                                            |
| Subtitle           | 30 chars. No unverifiable claims.                                                                                                                                                                                                         |
| Promotional text   | 170 chars. Editable any time without review.                                                                                                                                                                                              |
| Description        | 4,000 chars. Not used for search. Only the first sentence shows before "more".                                                                                                                                                            |
| Keywords           | 100 bytes, commas and no spaces, each term longer than 2 chars. Don't repeat words already in the name, subtitle, category or company name. Skip plurals, "app"/"game" and other apps' names. Japanese costs about 3 bytes per character. |
| What's New         | 4,000 chars. **Not available on the first version.** Significant changes must be listed specifically (2.3.12).                                                                                                                            |
| Support URL        | Required. Must lead to real contact info (email, address or phone).                                                                                                                                                                       |
| Marketing URL      | Optional.                                                                                                                                                                                                                                 |
| Privacy policy URL | Required.                                                                                                                                                                                                                                 |
| Copyright          | "2026 [owner]". Apple adds the ©.                                                                                                                                                                                                         |

- **Search** ranks on the name, subtitle, keywords, category and user behaviour. Up to 3 screenshots show in results. Claims that captions are read by OCR come from ASO firms, not Apple.
- **Screenshots** ([spec](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)): 1–10 per size per language, PNG/JPG, no alpha.
  - iPhone needs either 6.9″ (1320×2868, 1290×2796 or 1260×2736) or 6.5″ (1284×2778 or 1242×2688).
  - **If we provide 6.9″, 6.5″ is no longer required.** Smaller sizes are scaled from it.
  - iPad 13″ (2064×2752) is required only if the app runs on iPad.
  - They must show the app in use; overlays are allowed (2.3.3).
- **App Previews** ([spec](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications)): up to 3 per size, 15–30 s, ≤30 fps, ≤500 MB. iPhone is 886×1920 portrait. Only in-app capture is allowed (2.3.4). They autoplay muted.
- **Localization:** all text, screenshots and previews can be set per language (en-US, es-MX/es-ES, fr-FR, de-DE, pt-BR, ja).
- **IAP metadata** ([ref](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information)): display name 2–30 chars, description ≤45 chars, a review-only screenshot, and a permanent product ID.
- **In-App Events** ([ref](https://developer.apple.com/app-store/in-app-events/)): name 30, short description 50, long description 120 chars. ≤31 days each, ≤10 live at once, reviewed without a new version.
- **Post-launch options:** up to 70 [custom product pages](https://developer.apple.com/app-store/custom-product-pages/) with their own screenshots, keywords and deep links, plus A/B tests. [WWDC26](https://developer.apple.com/videos/play/wwdc2026/205/) adds a Header image/video for iOS 27.

## 2. Kids Category and child-directed rules

- **1.3 and 5.1.4:**
  - No links out of the app, purchases or distractions unless they sit behind a parental gate.
  - No third-party analytics or ads.
  - Comply with COPPA/GDPR and have a privacy policy.
- **2.3.8:** all metadata must suit 4+. "For Kids"/"For Children" are **reserved for the Kids Category**. Apps outside it can't imply children are the main audience.
- **Made for Kids** ([help](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating), [kids](https://developer.apple.com/app-store/kids-apps/)): only for a 4+ or 9+ rating, in bands ≤5, 6–8 or 9–11. Apple: "You can't change this selection once your app is approved."
- **Age ratings 4+/9+/13+/16+/18+ confirmed.** Apple announced them 24 Jul 2025, with answers due 31 Jan 2026 ([news](https://developer.apple.com/news/?id=ks775ehf)). Social-media questions were added 9 Jul 2026 and are required from Sept 2026 ([news](https://developer.apple.com/news/?id=tlur8uvi)).
- **Likely questionnaire answers** ([definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)):
  - **Parental Controls: yes.** Apple's definition includes restricting purchases.
  - **No** for web access, user-generated content, chat, ads, social media, loot boxes and gambling.
  - **Violence:** "None" only if creatures are never harmed. If Clashes hurt anything, answer infrequent cartoon violence, which means 9+.
  - **Contests:** leaderboards "compete … for rankings", so they probably count. **Frequent contests means 13+**, so keep leaderboards minor and answer "Infrequent" (still 4+).
  - Verify the final rating in App Store Connect.
- **COPPA** ([FTC](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)): covers under-13 services that collect personal info, including persistent IDs. The amended rule applies from 22 Apr 2026. If we collect nothing, there is nothing to comply with on collection. This is not legal advice.
- **Privacy label** ([details](https://developer.apple.com/app-store/app-privacy-details/)): on-device data isn't "collected", and data Apple collects (Game Center, StoreKit) isn't ours to disclose. We answer "No", so the label reads **Data Not Collected**. Our privacy manifest and policy already match.
- **Gate check:** put the challenge-code share sheet and the Game Center dashboard behind the parent gate. This is my own caution; I found no specific Apple ruling.

## 3. How successful games present their pages

I viewed 12 public pages on 30 Sep 2026 ([lookup](https://itunes.apple.com/lookup?id=1208138685,874425722,1550204730,1378467217,1530907314,1458749093,1024506959,880047117,728293409,1182456409,1613352146,924373886&country=us)): Toca Boca World, Sago Mini World, Pok Pok, Khan Academy Kids, Thinkrolls, LEGO DUPLO World, Cut the Rope, Angry Birds 2, Monument Valley, Alto's Odyssey, A Little to the Left and Crossy Road.

**Screenshots:**

- **Kids brands caption every shot, verb first, in 2–6 words.**
  - Toca uses a coloured band on each shot.
  - Cut the Rope uses big ALL-CAPS imperatives on one consistent red banner.
  - Khan and Thinkrolls use a bold 1–3-word headline with a small subline.
- **Shot 1 shows the core action or hero feature.** Toca adds a trust strip ("No ads!" plus awards).
- **Parent reassurance comes early:**
  - Sago's shots 2–3 cover ad-free and offline play.
  - Pok Pok writes its captions to parents (calm, not addictive).
  - DUPLO ends on parent tips.
- **One visual system per set:** one frame style, one saturated colour per shot, characters breaking out of the frame, and real gameplay always visible.
- **Orientation follows the game.** Portrait games use portrait shots.
- **Premium art-led titles skip captions** (Monument Valley, Alto, Crossy Road). That relies on an established reputation.

**Descriptions:** a one-sentence hook, then ALL-CAPS headers with short bullets. Almost no emoji. Kids titles add safety/privacy/COPPA lines and a contact email.

**Subtitles:** short action phrases that state the loop. Cut the Rope's "Cut ropes. Feed Om Nom." is the model.

**Promotional text:** seasonal and event-led. Khan Academy Kids and Sago Mini are on Halloween now; Toca matches its live In-App Event.

**What's New:** either a named feature headline plus 2–4 warm sentences (Pok Pok, Sago, Toca, DUPLO), or witty one-liners for fixes (Cut the Rope, Angry Birds 2).

## 4. Recommendations for Pocket Planet

**Name:** check whether "Pocket Planet: Fling & Grow" (27 chars) is available in App Store Connect and search trademarks. Rename if the confusion risk is high.

**Subtitle:** "Cute creatures move in" (22 chars).

**Category:** decide on Kids Category (6–8) before launch.

- If yes, we may say "for kids".
- If no, remove all kid-audience wording.

**Screenshots:** 8 portrait shots at 1320×2868, in all 6 languages.

| #   | Scene                                    | Caption                             |
| --- | ---------------------------------------- | ----------------------------------- |
| 1   | Finger flings a comet; land bursts green | Fling to grow a planet              |
| 2   | Creatures arriving, close-up             | Cute friends move in                |
| 3   | Two objects fusing                       | Mix magic Fusions                   |
| 4   | Combo chain                              | Chain big Combos                    |
| 5   | Sky obstacles and flight                 | Dodge the sky                       |
| 6   | Homeworld                                | Build your Homeworld                |
| 7   | Buddy hint                               | A Buddy helps out                   |
| 8   | Parent gate / Grown-ups screen           | No ads. Store stays with grown-ups. |

**Caption style:** 2–5 words, verb first, sentence case, at most 2 lines, at the top, about 100 pt on the 1320 px canvas. One rounded frame with a creature overlapping its edge. Leave about 35% extra width for German and French, and use a proper Japanese font.

**Colours:** deep-space navy base, with one panel colour per element: ice cyan, magma orange, seed green, rain blue, sunburst yellow. White text at accessible contrast.

**App Preview:** yes, one 20–25 s portrait preview at 886×1920. Open with a fling and the land blooming, then show creatures, a Fusion, a Combo and the Homeworld. Put the poster frame on the fling; no store UI.

**Description outline:**

1. Hook sentence.
2. FLING & GROW
3. MEET THE CREATURES
4. FUSIONS & COMBOS
5. YOUR HOMEWORLD
6. FOR GROWN-UPS: no ads, no random paid rewards, parent-gated store, purchases only in the Grown-ups area, Data Not Collected.
7. The 6 languages.
8. Support and privacy links.

**Promotional text** (155 chars): "Fling comets, grow tiny lands and welcome cute new neighbors. Fusions, Combos and a Homeworld to call your own. No ads, and the store stays with grown-ups."

**Keywords** (en-US, 97 bytes): `space,comet,asteroid,meteor,terraform,cozy,sandbox,physics,toss,tiny,world,builder,galaxy,volcano`. For the other 5 languages, research native terms rather than translating this list.

**What's New:**

- 1.0 has no field, so the launch message goes in promo text.
- From 1.0.1: a one-line headline, a 3–5-item list of specific changes, and a sign-off such as "Happy flinging! — the Pocket Planet team".

**IAP:** plain names (e.g. "Gem Pouch"), a review screenshot of the gated store, and no IAP promotion on the product page.

**Avoid:**

- Other games' names, art or text.
- "#1", "best" or unearned awards.
- Prices, "free" or sale language.
- Pressure words ("hurry", "limited").
- Gems or the store in kid-facing shots.
- "Educational" or other unprovable claims.
- "For kids" outside the Kids Category.
