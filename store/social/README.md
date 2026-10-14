# Comet Garden social pack

Images for social posts and link previews, in the same Sticker Scrapbook style as the v2 App Store screenshots (`../screenshots-v2/`). They share the night-sky background, the paper photo cards, the washi tape, the die-cut stickers and the Fredoka headline with one coloured word.

Everything you see is real:

- Every planet, creature, aim line and hint inside a photo card is a real capture from the game, taken in the store capture mode on the same planet run as the store screenshots. The captures are only cropped, shrunk and tilted. Nothing is painted over or redrawn.
- Every sticker is the game's own creature art, in a pose the game uses. Each one shows a creature that lives on the planet in the photo it's stuck to.

None of the images contain prices, store badges, "free", calls to action, timers or "for kids" wording. The App Store badge and the link go in the post text or the platform's link sticker once the app is approved. They are never baked into the image.

## The files

| File                     | Size        | Use it for                                                          | What it shows                                                                                                                                                                                                                             |
| ------------------------ | ----------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `square-1080-en.png`     | 1080 × 1080 | The launch post: Instagram, Threads, Facebook, X, Bluesky, Mastodon | "Watch it _bloom_". Two photos of one planet (Planet 27, Pebble Rock), first as bare grey rock and then grown, with 12 creatures around its rim. A waving parrot sticker (the parrot lives on that planet). The wordmark sits bottom left |
| `square-1080-es.png`     | 1080 × 1080 | The same post for Spanish-speaking audiences                        | "Míralo _florecer_", the Spanish store caption, with the Spanish-build captures                                                                                                                                                           |
| `square-1080-ja.png`     | 1080 × 1080 | The same post for Japanese audiences                                | 「わくせいが*そだつよ*」, the Japanese store caption, set in Hiragino Maru Gothic, with the Japanese-build captures                                                                                                                       |
| `story-1080x1920-en.png` | 1080 × 1920 | Instagram, Facebook and TikTok stories, and other vertical posts    | The wordmark, then "Fling a _comet_", over one photo of a real throw: the dotted aim line, the aim tag (+53 life, a newt moving in) and the game's own "Pull back & release to fling" hint. A bunny sticker sits on the photo's edge      |
| `og-1200x630-en.png`     | 1200 × 630  | The link preview for the website (`og:image`), and link posts       | The app icon, "Comet Garden" and the tagline "Fling comets, grow tiny worlds" (the App Store subtitle). Next to them, a photo of the grown planet just after the Canopy Octopus moved in, with a waving octopus sticker                   |

Every file is a PNG with no transparency and an sRGB colour profile, which all the platforms above accept.

- **The story** keeps everything important between y 250 and y 1670. Instagram and TikTok draw their own buttons over the top 250 px and the bottom 250 px, and those strips here hold only background. Put a link sticker there, or over the empty background beside the photo, never over the photo.
- **The link preview** (`og-1200x630-en.png`) is meant to replace `site/img/og.png`. It is not swapped in yet, so the site still shows the old image. To use it, copy it over `site/img/og.png`. Then update `og:image:alt` in `index.html`, `support.html`, `press.html`, `notes.html` and `privacy.html` to the alt text below. The wordmark and tagline stay readable at 600 × 315, the size most apps show.
- **Spanish and Japanese.** The captions are the same lines as the localized store screenshots, so they need the same native-speaker review before posting. The wordmark stays "Comet Garden" in every language, because that is the app name in every listing.

## Suggested post copy (English)

Short and warm. Say what the game is. Don't push.

**Launch post (`square-1080-en.png`)**

> A sleepy little planet, one comet at a time. Watch it bloom, and say hello to whoever moves in.
>
> Comet Garden, for iPhone. No ads.

Shorter:

> Fling a comet. Watch a tiny world bloom. Comet Garden, for iPhone.

Or a before-and-after line:

> Same planet, ten throws apart: bare grey rock, then a busy little world with a dozen new neighbours.

**Story (`story-1080x1920-en.png`)**

> Pull back, let go, see what grows.

Add the platform's link sticker once the App Store link exists.

**Link post or site share (`og-1200x630-en.png`)**

> Comet Garden: fling comets, grow tiny worlds. A little game about planets and the creatures who call them home.

**Optional hashtags:** use one or two at most, for example `#CometGarden #cozygames`.

**Words to keep out of posts** (the store rules): free, download now, now, today only, hurry, limited, don't miss, #1, best, addictive, prices, and "for kids", "for children" or "your child". Also leave out any other game's name. Say "no ads" only as a plain fact, never as a selling hook. Once the app is approved, the App Store link and badge can go in the post text.

## Alt text

- **Square:** Two paper photos of the same tiny planet in Comet Garden. In the first it is bare grey rock. In the second it is covered in colourful land with creatures all around its rim. A waving green parrot sticker. Text: Watch it bloom.
- **Story:** A paper photo of Comet Garden being played. A dotted aim line runs from the launcher to a half-grown planet, with the hint "Pull back & release to fling". A bunny sticker sits on the photo's edge. Text: Comet Garden. Fling a comet.
- **Link preview:** Comet Garden: a tiny planet ringed with creatures in a paper photo, a waving purple octopus sticker, and the words "Fling comets, grow tiny worlds".

## How it is made

From the repo root:

```sh
node store/tools/scrapbook-social.mjs --raw=<captures>/{lang} --stickers=<stickers>
#   --jobs=square,story,og   --langs=en,es,ja   --out=store/social   --work=<scratch dir>
```

- **Captures** come from `store/tools/scrapbook-capture.mjs` (the files used are `m2a-bare`, `m2b-lush`, `m1-fling` and `m3-friend`).
- **Stickers** come from `scrapbook-export.mjs` and `scrapbook-stickers.py`.
- **Composer.** `scrapbook-social.mjs` holds the layout of each image. It renders them with the store template, `scrapbook.html`, which has extra fields for the wordmark, the tagline and smaller cards. The store screenshots render pixel-for-pixel the same as before.

The script then runs `scrapbook-social-post.py`, which checks:

- **Format:** the size, no alpha channel, sRGB.
- **Contrast:** at least 4.5:1 for every line of text.
- **Sticker placement:**
  - each sticker is at most 50% over a photo (that it covers only empty sky or hills is checked by eye on the footprint overlays);
  - margins and corners are clear;
  - on the story, everything sits inside the safe band.
- **Capture integrity:** every photo window matches a plain downscale of the raw capture.
- **Words:** no banned or pressure words, badges or calls to action.

It also writes sticker-footprint overlays and feed-size previews for a visual check.
