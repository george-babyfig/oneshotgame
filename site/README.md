# Comet Garden website

A small static marketing and support site for Comet Garden. It has five HTML pages and one stylesheet. There is no JavaScript, no build step, and nothing loads from any other server: no CDNs, analytics or embeds. A `Content-Security-Policy` meta tag on every page blocks anything that isn't served from the site itself, so the site keeps the game's "Data Not Collected" promise.

| File                                                 | What it is                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `index.html`                                         | Landing page: hero, screenshots, features, For grown-ups, languages                                           |
| `support.html`                                       | FAQ and contact details. This is the **Support URL**.                                                         |
| `privacy.html`                                       | Privacy policy in 6 languages, from `docs/privacy.html`. This is the **Privacy Policy URL**.                  |
| `press.html`                                         | Press kit: fact sheet, descriptions, key features, assets, contact                                            |
| `notes.html`                                         | Dev notes. The 1.0 launch post, and the source for future release notes                                       |
| `style.css`                                          | The only stylesheet. Colours come from the game's `src/styles.css`                                            |
| `fonts/`                                             | Fredoka woff2 files (Latin and Latin Extended, weights 400/600/700) and `OFL.txt` (SIL Open Font License 1.1) |
| `img/icon.png`                                       | The original 1024 px app icon, offered as a download in the press kit                                         |
| `img/icon-512.png`, `icon-180.png`, `favicon-32.png` | Smaller copies of the icon for the hero, the Apple touch icon and the favicon                                 |
| `img/og.png`                                         | 1200×630 link-preview image                                                                                   |
| `img/shot-1.png` … `shot-6.png`                      | **Placeholder** screenshots (660×1434)                                                                        |
| `press/`                                             | Empty for now. Press downloads go here.                                                                       |

Japanese text uses the system font (Hiragino on Apple devices) because Fredoka has no Japanese glyphs.

## Preview locally

From the repo root:

```sh
npx serve site
# or, with no Node tools:
python3 -m http.server -d site 8000   # then open http://localhost:8000
```

You can also double-click `site/index.html`. All links are relative, so it works straight from the disk.

## Fill in before launch

To list everything that's left:

```sh
grep -rn "TODO\|YOUR-DOMAIN\|OWNER NAME\|DEVELOPER NAME" site
```

Placeholders on the page are also highlighted with a pink dashed box, so you can spot them.

1. **Support email**: `support@YOUR-DOMAIN`, in `support.html` (the contact card and the last FAQ answer) and `press.html`. Change both the visible text and the `mailto:` link. **Apple requires the Support URL to show real contact information**, so this must be done before you submit.
2. **Owner name**: `OWNER NAME` in the footer of all five pages (`© 2026 …`). Use the same legal name as the Copyright field in App Store Connect.
3. **Developer name**: `DEVELOPER NAME` in the `press.html` fact sheet.
4. **Domain**: `https://YOUR-DOMAIN` in the `press.html` fact sheet. Then follow the TODO in each page's `<head>`: add `<link rel="canonical">` and `og:url`, and make `og:image` absolute (`https://YOUR-DOMAIN/img/og.png`). Most link previews ignore relative image paths.
5. **App Store badge and link** (after approval): see the TODO in `index.html`. Download the official "Download on the App Store" badge from Apple's Marketing Resources and save it into `img/`, because hotlinking would break the no-external-requests rule. Link it to `https://apps.apple.com/app/id…` and replace the "Coming soon" note. Follow Apple's badge guidelines on size and clear space.
6. **Screenshots**: replace `img/shot-1.png` … `shot-6.png` with real portrait screenshots. Keep the file names and resize them to about 660 px wide. The App Store originals are 1320 px wide and much heavier. Then update each `alt` text in `index.html` to describe the real image.
7. **Launch date**: set the `<time>` in `notes.html`.
8. **Press assets**: put the screenshots zip and a logo in `press/`, then turn the note in `press.html` into links.

## App Store Connect fields

| Field              | Value                              |
| ------------------ | ---------------------------------- |
| Support URL        | `https://YOUR-DOMAIN/support.html` |
| Marketing URL      | `https://YOUR-DOMAIN/`             |
| Privacy Policy URL | `https://YOUR-DOMAIN/privacy.html` |

All three must load over HTTPS. Every option below provides HTTPS automatically.

## Hosting options

The site is plain files, so any static host works. Upload the **contents** of `site/`, so that `index.html` sits at the root.

### 1. GitHub Pages, from a small separate public repo

Use a separate repo so the game's own repo can stay private. On a free GitHub plan, Pages only works on public repos.

1. On github.com, create a new **public** repository, for example `comet-garden-site`.
2. Copy everything inside `site/` into the root of that repo, then commit and push to `main`.
3. In the repo, open **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, choose Branch **`main`** and folder **`/ (root)`**, then select **Save**.
4. After a minute or two the site is live at `https://<user>.github.io/comet-garden-site/`. All links are relative, so the subfolder path works.
5. Custom domain (optional): enter it under **Settings → Pages → Custom domain**. Add the DNS records GitHub shows you: a `CNAME` for `www`, or the listed `A` records for an apex domain. Then tick **Enforce HTTPS**.
6. To update the site later, copy the new files in, then commit and push.

### 2. Netlify drag-and-drop

1. Sign in at app.netlify.com. Go to **Sites → Add new site → Deploy manually**.
2. Drag the `site` folder onto the drop area. The site goes live at a random `*.netlify.app` address.
3. Rename it under **Site configuration → Change site name**. Add your own domain under **Domain management**.
4. To update, open the site's **Deploys** tab and drag the folder in again.
5. Leave Netlify's analytics and snippet injection turned off.

### 3. Cloudflare Pages

1. Sign in at dash.cloudflare.com. Go to **Workers & Pages → Create → Pages → Upload assets** (Direct Upload).
2. Name the project (for example `comet-garden`), drag in the `site` folder and select **Deploy**. The site goes live at `https://comet-garden.pages.dev`.
3. Add your own domain in the project's **Custom domains** tab.
4. To update, create a new deployment and upload the folder again.
5. Keep **Web Analytics** turned off for the project. Cloudflare can inject its beacon script, which the CSP would block anyway.

Cloudflare and Netlify sometimes rename menu items. If a label above has moved, look for "Direct Upload" or "Deploy manually".

## Keeping the promise

- Don't add analytics, cookie banners, embedded videos, social widgets or fonts from other servers. The CSP would block most of them, and they would contradict "Data Not Collected".
- Like every web server, the host may keep standard access logs, such as IP address and browser. The privacy policy covers the app. If you want the site covered too, add a sentence about the website to `privacy.html` and to `docs/privacy.html`.
- If the icon changes, regenerate the smaller copies. For example, on macOS: `sips -z 512 512 public/icon.png --out site/img/icon-512.png` (and the same for 180 and 32).
