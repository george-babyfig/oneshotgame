#!/usr/bin/env node
// Comet Garden social / marketing pack in the store art v2 "Sticker Scrapbook" system (production spec section 12).
//
//   node store/tools/scrapbook-social.mjs --raw=/dir/{lang} --stickers=/dir/cut [--out=store/social] [--work=/dir]
//   node store/tools/scrapbook-social.mjs --raw=… --stickers=… --jobs=square --langs=en,ja
//
// The same template as the store shots (scrapbook.html, with its social-only fields), the same recipes (night
// nebula, polaroid paper cards, washi tape, die-cut stickers of the game's own art, Fredoka headline with one accent
// word in the slot colour) and the same raw captures as the store set (scrapbook-capture.mjs, planet P):
//   square-1080-<lang>.png   1080x1080   launch post: "Watch it bloom", the bare and the lush planet P as two photos
//   story-1080x1920-en.png   1080x1920   story: "Fling a comet", the real fling (aim arc, aim tag, drag hint)
//   og-1200x630-en.png       1200x630    site / Open Graph hero: wordmark, tagline and the planet with its new friend
// Every capture is placed at scale <= 1 (crop / downscale / tilt only); nothing is drawn over a capture except a
// sticker edge, and every sticker is a resident of the capture it sits on. No badges, prices or calls to action.
// Writes flattened RGB sRGB PNGs (no alpha) to --out, then runs scrapbook-social-post.py (format, contrast,
// sticker placement, capture integrity, words) which also writes sticker-footprint diagnostics and previews to --work.

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const opt = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    }),
);
const RAW = String(opt.raw ?? join(ROOT, 'test-results', 'store-raw-v2', '{lang}'));
const STICKERS = String(opt.stickers ?? join(ROOT, 'test-results', 'scrapbook-stickers'));
const OUT = resolve(String(opt.out ?? join(ROOT, 'store', 'social')));
const WORK = resolve(String(opt.work ?? join(ROOT, 'test-results', 'scrapbook-social-work')));
const ONLY_JOBS = opt.jobs ? String(opt.jobs).split(',') : null;
const ONLY_LANGS = opt.langs ? String(opt.langs).split(',') : null;
const FFMPEG = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
const TEMPLATE = pathToFileURL(join(HERE, 'scrapbook.html')).href;
const SPEC = JSON.parse(readFileSync(join(HERE, 'scrapbook-shots.json'), 'utf8'));
const CAPS = JSON.parse(readFileSync(join(HERE, 'scrapbook-captions.json'), 'utf8'));
const ICON = pathToFileURL(join(ROOT, 'site', 'img', 'icon-512.png')).href;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const caption = (lang, id) => CAPS[lang][CAPS.ids.indexOf(id)];

/** A window of w x h px on the canvas, cropped from the raw at scale s with the planet centre (raw 660, 1233)
 *  at fx / fy of the window. */
const planet = (w, h, s, fx = 0.5, fy = 0.5) => ({
  w,
  h,
  scale: s,
  sx: +(660 - (w * fx) / s).toFixed(1),
  sy: +(1233 - (h * fy) / s).toFixed(1),
});

/** The pack. Geometry in canvas px; `slot` picks the sky-ramp colour (scrapbook-shots.json); `margin` is the edge
 *  margin every element keeps; `safe` (story) is the band platform UI never covers. */
const JOBS = {
  square: {
    file: 'square-1080-{lang}.png',
    W: 1080,
    H: 1080,
    slot: 2, // morning
    langs: ['en', 'es', 'ja'],
    head: { id: '2', size: 112, maxW: 952, floor: { latin: 96, ja: 88 } },
    margin: 48,
    layout: {
      baseline: 172,
      mask0: 196,
      mask1: 400,
      orbitClipY: 236,
      tapeH: 62,
      cornerSq: 72,
      captionZone: [48, 60, 1032, 236],
      // the warm light sits behind the lush card and the sticker; the wordmark corner stays dark enough for 4.5:1
      glows: [
        [760, 560, '100% 100%', 'A', 0.88],
        [640, 700, '100% 42%', 'B', 0.7],
        [620, 760, '0% 46%', 'A', 0.55],
        [700, 420, '0% 100%', 'B', 0.34],
        [900, 900, '50% 62%', 'A', 0.2],
      ],
    },
    seed: 5,
    orbits: [[560, 690, 620, 400, -12]],
    card: { border: 26, lip: 80, radius: 13, winRadius: 7, shadowK: 0.62 },
    cards: [
      // before: planet P at stage 0, bare grey rock, no residents (so no sticker on it)
      { raw: 'm2a-bare.png', x: 100, y: 262, ...planet(392, 440, 0.49), rot: -5, tape: [268, 262, 176, -16] },
      // after: the same planet lush, a little larger; the window runs past the bottom residents into the empty
      // hills, so the sticker on the bottom border covers only sky
      { raw: 'm2b-lush.png', x: 450, y: 278, ...planet(536, 580, 0.56, 0.5, 0.43), rot: 3, tape: [850, 274, 176, 14] },
    ],
    stickers: [{ id: 'parrot-wave', w: 220, x: 878, y: 902, rot: 8 }],
    brand: [{ icon: ICON, iconSize: 84, ring: 7, text: 'Comet Garden', size: 44, x: 96, y: 930 }],
  },
  story: {
    file: 'story-1080x1920-{lang}.png',
    W: 1080,
    H: 1920,
    slot: 1, // sunrise
    langs: ['en'],
    head: { id: '1', size: 124, maxW: 952, floor: { latin: 104, ja: 92 } },
    margin: 48,
    safe: [250, 1670],
    layout: {
      baseline: 492,
      mask0: 540,
      mask1: 760,
      orbitClipY: 560,
      tapeH: 64,
      cornerSq: 72,
      captionZone: [48, 250, 1032, 540],
    },
    seed: 9,
    orbits: [[540, 1120, 700, 900, -14]],
    card: { border: 28, lip: 84, radius: 14, winRadius: 7, shadowK: 0.7 },
    cards: [
      // card G of the store shot 1, widened to the empty sky on both sides: the planet mid-growth, the real aim arc
      // and aim tag, the game's own drag hint, the launcher and the in-game Keeper
      { raw: 'm1-fling.png', x: 259, y: 588, w: 562, h: 957, sx: 120, sy: 760, scale: 0.52, rot: -2, tape: [700, 584, 190, 18] },
    ],
    // the bunny lives on planet P at the fling (capture-log m1.counts.bunny), as in store shot 1
    stickers: [{ id: 'bunny-happy', w: 300, x: 250, y: 1250, rot: -8 }],
    brand: [{ icon: ICON, iconSize: 96, ring: 8, text: 'Comet Garden', size: 58, cx: 540, y: 262 }],
  },
  og: {
    file: 'og-1200x630-{lang}.png',
    W: 1200,
    H: 630,
    slot: 1, // sunrise
    langs: ['en'],
    head: { text: 'Comet Garden', size: 92 },
    margin: 40,
    layout: {
      capLeft: 70,
      baseline: 318,
      mask0: 0,
      mask1: 1,
      orbitClipY: 0,
      tapeH: 54,
      cornerSq: 40,
      captionZone: [40, 40, 690, 420],
      base: 'linear-gradient(180deg, #120e36 0%, #1b1652 60%, #231b66 100%)',
      glows: [
        [520, 420, '100% 100%', 'A', 0.75],
        [520, 520, '0% 100%', 'B', 0.45],
        [600, 380, '75% 0%', 'B', 0.35],
      ],
    },
    // the listing subtitle (store/listing.md)
    subs: [{ text: 'Fling comets, grow tiny worlds', size: 40, weight: 600, color: '#cfc8f6', baseline: 392, left: 72 }],
    seed: 13,
    orbits: [[900, 330, 380, 250, -12]],
    card: { border: 22, lip: 62, radius: 11, winRadius: 6, shadowK: 0.5 },
    cards: [
      // planet P just after the Canopy Octopus moved in (m3-friend), the whole ring of residents
      // (the crop centre sits 31 raw px left of the planet so the dragon on the left rim keeps its flame)
      { raw: 'm3-friend.png', x: 704, y: 72, w: 416, h: 448, sx: 122, sy: 687, scale: 0.41, rot: 2, tape: [1000, 72, 150, 14] },
    ],
    stickers: [{ id: 'octopus-wave', w: 178, x: 708, y: 498, rot: -8 }],
    brand: [{ icon: ICON, iconSize: 120, ring: 8, x: 76, y: 88 }],
  },
};

/** RGB PNG, no alpha channel, tagged sRGB (as the store shots). */
function flatten(src, dst) {
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', src, '-vf', 'format=rgb24', '-pix_fmt', 'rgb24', dst]);
  execFileSync('sips', ['-m', '/System/Library/ColorSync/Profiles/sRGB Profile.icc', dst], { stdio: 'ignore' });
}

let browser;
async function render(cfg, file, { omitBackground = false } = {}) {
  const page = await browser.newPage({ viewport: { width: cfg.W, height: cfg.H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript((c) => {
    window.__CFG = c;
  }, cfg);
  await page.goto(TEMPLATE);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000, state: 'attached' });
  const rep = await page.evaluate(() => window.__REPORT);
  if (file) await page.screenshot({ path: file, omitBackground, clip: { x: 0, y: 0, width: cfg.W, height: cfg.H } });
  await page.close();
  if (errors.length) throw new Error(`template errors: ${errors.join(' | ')}`);
  return rep;
}

/** One headline size per image: the spec size, or the largest 4 px step below it at which the line fits maxW. */
async function headSize(job, lang, text) {
  if (!job.head.maxW) return job.head.size;
  const m = await render({ W: 1320, H: 400, measure: [text], lang });
  if (lang !== 'ja' && !m.fredoka) throw new Error('Fredoka did not load');
  const floor = lang === 'ja' ? job.head.floor.ja : job.head.floor.latin;
  for (let z = job.head.size; z >= floor; z -= 4) if ((m.widths[0] * z) / 100 <= job.head.maxW) return z;
  throw new Error(`[${lang}] "${text}" does not fit ${job.head.maxW} px at the ${floor} px floor: rewrite it`);
}

async function renderJob(name, job, lang) {
  const slot = SPEC.ramp[job.slot];
  const raw = RAW.replace('{lang}', lang);
  const text = job.head.text ?? caption(lang, job.head.id);
  const size = await headSize(job, lang, text);
  const layout = {
    ...job.layout,
    glows: job.layout.glows?.map(([w, h, at, c, al]) => [w, h, at, c === 'A' ? slot.a : slot.b, al]),
  };
  const shot = {
    seed: job.seed,
    orbits: job.orbits,
    layout,
    head: text,
    subs: job.subs,
    brand: job.brand,
    card: job.card,
    cards: job.cards.map((c) => ({ ...c, src: pathToFileURL(join(raw, c.raw)).href, tape: c.tape ? [...c.tape, slot.tape] : null })),
    stickers: job.stickers.map((s) => ({ ...s, src: pathToFileURL(join(STICKERS, `${s.id}.png`)).href })),
  };
  const cfg = { W: job.W, H: job.H, shot, lang, size, accent: slot.accent, glowA: slot.a, glowB: slot.b };
  const base = name + '-' + lang;
  const tmp = join(WORK, 'tmp', `${base}.png`);
  const rep = await render(cfg, tmp);
  const file = join(OUT, job.file.replace('{lang}', lang));
  flatten(tmp, file);
  await render({ ...cfg, hideText: true }, join(WORK, 'bg', `${base}.png`));
  await render({ ...cfg, audit: true }, join(WORK, 'audit', `${base}.png`));
  if (shot.stickers.length) await render({ ...cfg, only: 'stickers' }, join(WORK, 'mask', `${base}.png`), { omitBackground: true });
  log(
    `${base}: head ${size}px "${text.replace(/\*/g, '')}"  stickers ${rep.stickers.map((s) => `${s.id} ${Math.round(s.over * 100)}% over, centre ${s.cornerDist}px from a card corner`).join(', ')}`,
  );
  return {
    name,
    lang,
    file,
    W: job.W,
    H: job.H,
    margin: job.margin,
    safe: job.safe ?? null,
    slot: slot.name,
    accent: slot.accent,
    head: text,
    headSize: size,
    hasAccent: /\*.+\*/.test(text),
    subTexts: (job.subs || []).map((s) => ({ text: s.text, color: s.color ?? '#cfc8f6' })),
    brandText: (job.brand || []).map((b) => b.text || '').filter(Boolean),
    cornerSq: job.layout.cornerSq,
    captionZone: job.layout.captionZone,
    cards: shot.cards.map(({ src, tape, ...c }) => ({ ...job.card, ...c, raw: join(raw, c.raw) })),
    stickerSpecs: shot.stickers.map(({ src, ...s }) => s),
    ...rep,
  };
}

mkdirSync(OUT, { recursive: true });
for (const d of ['bg', 'audit', 'mask', 'tmp']) mkdirSync(join(WORK, d), { recursive: true });
browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const report = [];
try {
  for (const [name, job] of Object.entries(JOBS)) {
    if (ONLY_JOBS && !ONLY_JOBS.includes(name)) continue;
    for (const lang of job.langs) {
      if (ONLY_LANGS && !ONLY_LANGS.includes(lang)) continue;
      report.push(await renderJob(name, job, lang));
    }
  }
} finally {
  await browser.close();
}
writeFileSync(join(WORK, 'report-social.json'), JSON.stringify(report, null, 1));
execFileSync('python3', [join(HERE, 'scrapbook-social-post.py'), `--work=${WORK}`], { stdio: 'inherit' });
