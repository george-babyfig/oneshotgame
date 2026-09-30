# Comet Garden — App Store package

Everything needed to put Comet Garden on the App Store. Start with **`APP_STORE_CONNECT.md`**: it walks through App Store Connect top to bottom and says which file to paste from.

| File                                                                                                                | What it is                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_STORE_CONNECT.md`                                                                                              | Step-by-step submission checklist, including what only you can do                                                                     |
| `listing.md`                                                                                                        | English (U.S.) listing: name, subtitle, promotional text, description, keywords, URLs                                                 |
| `listing.es.md` (es-MX), `listing.fr.md` (fr-FR), `listing.de.md` (de-DE), `listing.pt.md` (pt-BR), `listing.ja.md` | Localized listings, using the game's own translated terms; native keywords                                                            |
| `compliance.md`                                                                                                     | Category decision, age-rating answers (expected 4+), App Privacy (Data Not Collected), in-app purchase metadata, notes for App Review |
| `whats-new-template.md`                                                                                             | Release-notes template for 1.0.1 and later, plus promotional-text ideas                                                               |
| `captions.json`                                                                                                     | Screenshot captions in 6 languages (final)                                                                                            |
| `screenshots/<lang>/6.9/`                                                                                           | 8 screenshots per language at 1320 × 2868 (Apple's required iPhone size)                                                              |
| `preview/`                                                                                                          | Optional App Preview video (886 × 1920) and its poster frame                                                                          |
| `tools/shots.mjs`                                                                                                   | Regenerates the screenshots and preview from the real game                                                                            |
| `tools/measure-listings.py`                                                                                         | Checks every listing against Apple's length and keyword limits and our banned words                                                   |
| `../docs/product/store-research.md`                                                                                 | The research behind the choices (Apple rules, Kids Category, how family games present their pages), with sources                      |
| `gamecenter.md`                                                                                                     | Game Center leaderboards and achievements (optional)                                                                                  |

The support/marketing site lives in `../site/` (see `site/README.md`).

Rules we followed: no other games' names, no "#1"/"best", no prices, "free" or pressure words in screenshots or copy, and no "for kids" wording (the app launches in Games → Casual at 4+; the Kids Category stays an option for later).
