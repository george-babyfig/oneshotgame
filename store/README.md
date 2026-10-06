# Comet Garden — App Store package

Everything needed to put Comet Garden on the App Store. Start with **`APP_STORE_CONNECT.md`**: it walks through App Store Connect top to bottom and says which file to paste from.

| File                                                                                                                | What it is                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_STORE_CONNECT.md`                                                                                              | Step-by-step submission checklist, including what only you can do                                                                                                            |
| `listing.md`                                                                                                        | English (U.S.) listing: name, subtitle, promotional text, description, keywords, URLs                                                                                        |
| `listing.es.md` (es-MX), `listing.fr.md` (fr-FR), `listing.de.md` (de-DE), `listing.pt.md` (pt-BR), `listing.ja.md` | Localized listings, using the game's own translated terms; native keywords                                                                                                   |
| `compliance.md`                                                                                                     | Category decision, age-rating answers (expected 4+), App Privacy (Data Not Collected), in-app purchase metadata, notes for App Review                                        |
| `whats-new-template.md`                                                                                             | Release-notes template for 1.0.1 and later, plus promotional-text ideas                                                                                                      |
| `captions.json`                                                                                                     | Screenshot captions in 6 languages (final)                                                                                                                                   |
| `screenshots/<lang>/6.9/`                                                                                           | **Outdated (pre-M10 Homeworld): do not upload.** The first set, 8 per language at 1320 × 2868. Use `screenshots-v2/`, re-captured on 6 October 2026 after M12                |
| `preview/`                                                                                                          | Optional App Preview video (886 × 1920) and its poster frame                                                                                                                 |
| `tools/shots.mjs`                                                                                                   | Regenerates the screenshots and preview from the real game                                                                                                                   |
| `screenshots-v2/<lang>/6.9/`, `screenshots-v2/contact-sheet-<lang>.png`, `screenshots-v2/search-row-<lang>.png`     | Store art v2 ("Sticker Scrapbook"): real captures in paper photo cards with die-cut stickers of the game's own art. Not uploaded yet                                         |
| `tools/scrapbook-capture.mjs`                                                                                       | v2 raw captures in the dev-only marketing capture mode (planet P run, Fusion, Magnet Mist, Homeworld, Lifebook, Grown-ups and gate)                                          |
| `tools/scrapbook-export.mjs`, `tools/scrapbook-stickers.py`                                                         | v2 stickers: padded re-export of creature, Keeper and object renders, then the die-cut (backing, cut line, peel)                                                             |
| `tools/scrapbook.mjs`, `tools/scrapbook.html`, `tools/scrapbook-*.json`, `tools/scrapbook-post.py`                  | v2 composer: one template for every shot and locale, caption autofit, and the gates (contrast, sticker placement, capture integrity, words)                                  |
| `social/`, `tools/scrapbook-social.mjs`, `tools/scrapbook-social-post.py`                                           | Social pack in the same style: a 1080 × 1080 launch post (EN, ES, JA), a 1080 × 1920 story and a 1200 × 630 site link preview, plus suggested post copy (`social/README.md`) |
| `tools/measure-listings.py`                                                                                         | Checks every listing against Apple's length and keyword limits and our banned words                                                                                          |
| `../docs/product/store-research.md`                                                                                 | The research behind the choices (Apple rules, Kids Category, how family games present their pages), with sources                                                             |
| `gamecenter.md`                                                                                                     | Game Center achievements only for 1.0 (optional)                                                                                                                             |

The support/marketing site lives in `../site/` (see `site/README.md`).

Rules we followed: no other games' names, no "#1"/"best", no prices, "free" or pressure words in screenshots or copy, and no "for kids" wording (the app launches in Games → Casual at 4+; the Kids Category stays an option for later).

The App Store Connect checklist also uses `accessibility.md` and `in-app-event.md` as drafts. Product metadata in `compliance.md` is checked by `tests/storedocs.test.ts`.

## Refresh the M11.5 Homeworld store art

Run from the repository root with the existing local dependencies. The capture scripts start and stop their own Vite server. Capture English first so the other languages can replay its planet plan. The Homeworld frame uses a fixed clear spring afternoon and the same Level 4 save in the scrapbook still and App Preview.

```sh
node store/tools/scrapbook-capture.mjs --langs=en
node store/tools/scrapbook-capture.mjs --langs=es,fr,de,pt,ja
node store/tools/scrapbook-export.mjs --out=test-results/scrapbook-assets
python3 store/tools/scrapbook-stickers.py --src=test-results/scrapbook-assets --out=test-results/scrapbook-stickers
node store/tools/scrapbook.mjs en es fr de pt ja
python3 store/tools/scrapbook-post.py --work=test-results/scrapbook-work --out=store/screenshots-v2 en es fr de pt ja
node store/tools/shots.mjs --only=video
```

The captures write `test-results/store-raw-v2/<lang>/m6-homeworld.png` and `capture-log.json`. The composer writes the upload images under `store/screenshots-v2/<lang>/6.9/` plus contact sheets and search rows; it runs the post gates itself, and the explicit post command checks them again. The video command writes `store/preview/app-preview-en.mp4` and `poster-en.png`.
