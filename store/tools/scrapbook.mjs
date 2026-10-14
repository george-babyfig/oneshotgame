#!/usr/bin/env node
// Comet Garden store art v2 ("Sticker Scrapbook"): compose the App Store screenshots from the raw captures.
//
//   node store/tools/scrapbook.mjs en --raw=/dir/{lang} --stickers=/dir/cut [--5b] [--out=store/screenshots-v2] [--work=/dir]
//   node store/tools/scrapbook.mjs en es fr de pt ja --raw=… --stickers=…      # several locales
//
// One data-driven template (scrapbook.html) for every shot and locale:
//   scrapbook-shots.json     geometry per shot (cards, crops, tapes, stickers, orbits) and the sky ramp
//   scrapbook-captions.json  captions in 6 languages and the upload order per locale
//   <raw>/capture-log.json   what scrapbook-capture.mjs captured (the friend that arrived, the Fusion, the gate box)
// Steps per locale: measure the uploaded captions in the browser and pick one size from the ladder (152→112 Latin,
// 128→88 JA; below the floor the caption must be rewritten, never shrunk); render every shot in upload order with
// the slot colour (last still = night); write the caption-hidden, card-audit and sticker-only renders the checks
// need; flatten to RGB (no alpha, sRGB). Then scrapbook-post.py runs the gates (contrast, sticker placement,
// capture integrity, caption words) and draws the contact sheet and the search row.
//
// Outputs: <out>/<lang>/6.9/NN-<id>-<slug>.png (1320×2868), <out>/contact-sheet-<lang>.png, <out>/search-row-<lang>.png,
// and in <work>: report-<lang>.json, bg/, audit/, mask/, diag/.

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const argv = process.argv.slice(2);
const opt = Object.fromEntries(
  argv
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    }),
);
const LANGS = argv.filter((a) => !a.startsWith('--'));
if (!LANGS.length) LANGS.push('en');
const RAW = String(opt.raw ?? join(ROOT, 'test-results', 'store-raw-v2', '{lang}'));
const STICKERS = String(opt.stickers ?? join(ROOT, 'test-results', 'scrapbook-stickers'));
const OUT = resolve(String(opt.out ?? join(ROOT, 'store', 'screenshots-v2')));
const WORK = resolve(String(opt.work ?? join(ROOT, 'test-results', 'scrapbook-work')));
const WITH5B = !!opt['5b'];
const ONLY = opt.shots ? String(opt.shots).split(',') : null;
const FFMPEG = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
const TEMPLATE = pathToFileURL(join(HERE, 'scrapbook.html')).href;
const SPEC = JSON.parse(readFileSync(join(HERE, 'scrapbook-shots.json'), 'utf8'));
const CAPS = JSON.parse(readFileSync(join(HERE, 'scrapbook-captions.json'), 'utf8'));
const LADDER = { latin: [152, 148, 144, 140, 136, 132, 128, 124, 120, 116, 112], ja: [128, 124, 120, 116, 112, 108, 104, 100, 96, 92, 88] };
const MAXW = 1176; // caption zone x 72–1248
const REACTION_NAMES = { steam: 'Steam', rainGarden: 'Rain Garden', wildflowers: 'Wildflowers', glacier: 'Glacier' };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** Upload order and the slot of each position: the hue follows the position; the last still is always night. */
const orderFor = (lang) => (lang === 'en' ? CAPS.order[WITH5B ? 'en+5b' : 'en'] : CAPS.order.default);
const slotOf = (i, n) => (i === n - 1 ? 8 : Math.min(i + 1, 7));
const caption = (lang, id) => CAPS[lang][CAPS.ids.indexOf(id)];
const fileId = (id) => `${id}-${CAPS.slugs[id]}`;
const locale = (lang) => (lang === 'en' ? {} : JSON.parse(readFileSync(join(ROOT, 'src', 'locales', `${lang}.json`), 'utf8')));

/** RGB PNG, no alpha channel, tagged sRGB. */
function flatten(src, dst) {
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', src, '-vf', 'format=rgb24', '-pix_fmt', 'rgb24', dst]);
  execFileSync('sips', ['-m', '/System/Library/ColorSync/Profiles/sRGB Profile.icc', dst], { stdio: 'ignore' });
}

let browser;
async function render(cfg, file, { omitBackground = false } = {}) {
  const page = await browser.newPage({ viewport: { width: cfg.W || 1320, height: cfg.H || 2868 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript((c) => {
    window.__CFG = c;
  }, cfg);
  await page.goto(TEMPLATE);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000, state: 'attached' });
  const rep = await page.evaluate(() => window.__REPORT);
  if (file) await page.screenshot({ path: file, omitBackground, clip: { x: 0, y: 0, width: cfg.W || 1320, height: cfg.H || 2868 } });
  await page.close();
  if (errors.length) throw new Error(`template errors: ${errors.join(' | ')}`);
  return rep;
}

/** The shot's data with captured facts filled in: raw paths, the arriving friend, the Fusion chip, the gate crop. */
function shotFor(id, lang, slot, capLog, loc) {
  const src = SPEC.shots[id];
  const raw = RAW.replace('{lang}', lang);
  const sticker = (name) => pathToFileURL(join(STICKERS, `${name}.png`)).href;
  const cards = src.cards.map((c) => {
    // the set's polaroid recipe (border, bottom lip, radii) unless a card overrides it
    const card = { ...SPEC.card, ...c, src: pathToFileURL(join(raw, c.raw)).href, tape: c.tape ? [...c.tape, slot.tape] : null };
    if (c.fitRows) {
      // Lifebook: the window ends in the gap under grid row `fitRows` (card names wrap differently per locale)
      // the capture may fit fewer full rows where card names wrap to more lines (capture-log m7.rows)
      const cards = capLog.m7?.cards ?? [];
      const rows = Math.min(c.fitRows, capLog.m7?.rows ?? c.fitRows);
      // and may start lower, under a rarity header whose glyphs have a descender (capture-log m7.cropTop)
      if (capLog.m7?.cropTop > c.sy) card.sy = capLog.m7.cropTop;
      const last = cards[rows * 3 - 1];
      const next = cards[rows * 3];
      if (!last || last.length < 3 || !next) throw new Error('capture-log m7.cards lacks row bottoms: recapture shot 7 (--only=7)');
      card.h = Math.round(((last[2] + next[1]) / 2 - card.sy) * c.scale);
      // a shorter window (fewer rows) moves down by half of what it lost against the full-rows height, tape and
      // stickers with it, so the stack keeps the set's balance instead of leaving the bottom of the tile empty
      if (c.fitRowsH && rows < c.fitRows && card.h < c.fitRowsH) {
        const dy = Math.round((c.fitRowsH - card.h) / 2);
        card.y += dy;
        if (card.tape) card.tape[1] += dy;
      }
    }
    if (c.canvasFit) {
      // Homeworld: the window ends canvasFit px above the bottom of the captured canvas (capture-log m6.canvas), whose
      // height follows the localized panel under it
      const cv = capLog.m6?.canvas;
      if (!cv) throw new Error('capture-log m6.canvas missing: recapture shot 6 (--only=6)');
      card.h = Math.min(c.h, Math.round((cv[3] - c.canvasFit - c.sy) * c.scale));
    }
    if (c.gate) {
      const g = JSON.parse(readFileSync(join(raw, c.gate), 'utf8')).bbox; // [x, y, w, h] raw px
      const s = Math.min(1, c.w / g[2], c.h / g[3]);
      Object.assign(card, {
        scale: +s.toFixed(4),
        sx: +(g[0] + g[2] / 2 - c.w / s / 2).toFixed(1),
        sy: +(g[1] + g[3] / 2 - c.h / s / 2).toFixed(1),
      });
      // the window corners follow the modal's own rounded corners, so the dark backdrop never shows in them
      if (c.gateRadius) card.winRadius = Math.round(c.gateRadius * s);
    }
    return card;
  });
  const stickers = (src.stickers || []).map((s) => {
    let name = s.id;
    // stuck across a card's bottom border: y is measured from the bottom of that card's window
    if (s.yFromBottom != null) s = { ...s, y: cards[s.card ?? 0].y + cards[s.card ?? 0].h + s.yFromBottom };
    if (name === '@arrival-wave') name = `${capLog.m3?.species ?? capLog.P?.arrival?.species ?? 'octopus'}-wave`;
    if (name === '@shot1') name = capLog.m1?.counts?.bunny ? 'bunny-happy' : 'frog-happy';
    return { ...s, id: name, src: sticker(name) };
  });
  const chips = (src.chips || []).map((c) => {
    const f = capLog.m4 || {};
    const en = REACTION_NAMES[f.reaction] ?? 'Rain Garden';
    const [a, b] = f.pair ?? ['seed', 'storm'];
    const name = loc[en] ?? en;
    return {
      ...c,
      html: c.html
        .replace('{a}', sticker(`object-${a}`))
        .replace('{b}', sticker(`object-${b}`))
        .replace('{name}', name),
      label: name,
      pair: [a, b],
    };
  });
  return { ...src, card: SPEC.card, cards, stickers, chips };
}

async function composeLang(lang) {
  const raw = RAW.replace('{lang}', lang);
  const capLog = JSON.parse(readFileSync(join(raw, 'capture-log.json'), 'utf8'));
  const loc = locale(lang);
  const order = orderFor(lang);
  const outDir = join(OUT, lang, '6.9');
  mkdirSync(outDir, { recursive: true });
  for (const d of ['bg', 'audit', 'mask', 'tmp']) mkdirSync(join(WORK, d), { recursive: true });
  if (!ONLY) for (const f of readdirSync(outDir)) if (f.endsWith('.png')) rmSync(join(outDir, f));

  // 1. one caption size for the locale set: the largest ladder step at which the widest uploaded caption fits 1176 px
  const texts = order.map((id) => caption(lang, id));
  const m = await render({ measure: texts, lang });
  if (lang !== 'ja' && !m.fredoka) throw new Error('Fredoka did not load');
  const w100 = Math.max(...m.widths);
  const ladder = lang === 'ja' ? LADDER.ja : LADDER.latin;
  const size = ladder.find((z) => (w100 * z) / 100 <= MAXW);
  const widest = order[m.widths.indexOf(w100)];
  if (!size)
    throw new Error(
      `[${lang}] "${caption(lang, widest)}" is ${Math.round(w100)} px at 100 px: below the ${ladder.at(-1)} px floor, rewrite it`,
    );
  log(
    `[${lang}] order ${order.join(',')}  set size ${size}px  widest ${widest} "${caption(lang, widest).replace(/\*/g, '')}" = ${Math.round((w100 * size) / 100)}px`,
  );

  // 2. render every shot in upload order
  const report = {
    lang,
    size,
    widest,
    widths100: Object.fromEntries(order.map((id, i) => [id, Math.round(m.widths[i])])),
    order,
    shots: {},
  };
  for (const [i, id] of order.entries()) {
    if (ONLY && !ONLY.includes(id)) continue;
    const slotNo = slotOf(i, order.length);
    const slot = SPEC.ramp[slotNo];
    const shot = { ...shotFor(id, lang, slot, capLog, loc), head: caption(lang, id) };
    const cfg = { shot, lang, size, accent: slot.accent, glowA: slot.a, glowB: slot.b };
    const n = String(i + 1).padStart(2, '0');
    const tmp = join(WORK, 'tmp', `${lang}-${id}.png`);
    const rep = await render(cfg, tmp);
    const file = join(outDir, `${n}-${fileId(id)}.png`);
    flatten(tmp, file);
    await render({ ...cfg, hideText: true }, join(WORK, 'bg', `${lang}-${id}.png`));
    await render({ ...cfg, audit: true }, join(WORK, 'audit', `${lang}-${id}.png`));
    if (shot.stickers.length) await render({ ...cfg, only: 'stickers' }, join(WORK, 'mask', `${lang}-${id}.png`), { omitBackground: true });
    report.shots[id] = {
      n,
      file,
      slot: slot.name,
      slotNo,
      accent: slot.accent,
      cards: shot.cards.map(({ src, tape, ...c }) => ({ ...c, raw: join(raw, c.raw) })),
      stickers: shot.stickers.map(({ src, ...s }) => s),
      chip: shot.chips[0] ? { label: shot.chips[0].label, pair: shot.chips[0].pair } : null,
      ...rep,
    };
    log(
      `  ${n} shot ${id} (${slot.name}) stickers over capture: ${rep.stickers.map((s) => `${s.id} ${Math.round(s.over * 100)}% corner ${s.cornerDist}px`).join(', ') || '-'}`,
    );
  }
  // a partial run (--shots) keeps the other shots of the last full run
  const prev = join(WORK, `report-${lang}.json`);
  if (ONLY && existsSync(prev)) report.shots = { ...JSON.parse(readFileSync(prev, 'utf8')).shots, ...report.shots };
  writeFileSync(prev, JSON.stringify(report, null, 1));
  return report;
}

browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
try {
  for (const lang of LANGS) await composeLang(lang);
} finally {
  await browser.close();
}
// 3. the gates, the contact sheet and the search row
execFileSync('python3', [join(HERE, 'scrapbook-post.py'), `--work=${WORK}`, `--out=${OUT}`, ...LANGS], { stdio: 'inherit' });
