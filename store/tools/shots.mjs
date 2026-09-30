#!/usr/bin/env node
// Comet Garden App Store art: raw gameplay frames, framed screenshots, a contact sheet and the App Preview.
//
// Run from the repo root. It uses a Vite dev server (the dev hooks window.__app / __scene / __gate / __i18n
// exist only in dev) and starts one on --port if nothing answers there:
//
//   npx vite --host 127.0.0.1 --port 5191 --strictPort        # optional; the script starts it if needed
//   node store/tools/shots.mjs                                 # everything: raw → compose → contact sheet → video
//   node store/tools/shots.mjs --langs=en --scenes=1,3         # a subset
//   node store/tools/shots.mjs --no-raw                        # re-compose from the cached raw frames
//   node store/tools/shots.mjs --only=video                    # just the App Preview
//   node store/tools/shots.mjs --only=compose,sheet            # frames and contact sheet from cached raws
//
// Outputs:
//   store/screenshots/<lang>/6.9/0N-<id>.png   1320×2868, no alpha, sRGB (8 per language)
//   store/screenshots/contact-sheet-en.png      overview of the English set
//   store/preview/app-preview-en.mp4            886×1920, 30 fps, H.264 + silent AAC
//   store/preview/poster-en.png                 the fling moment
// Raw frames (1320×2868, straight from the game, no overlays) are cached in test-results/store-raw/<lang>/.
//
// Every frame is real game state: a mid-game profile is built by playing planets (App.startLevel +
// scene.finish), then each scene is played with real throws through the dev hooks. A small beam search over
// the pure round rules (stepRound) picks the throws. The round clock is set to a fixed moment before each
// capture so the planet and sky sit the same way in every language. The calendar is pinned to CLOCK.
// Captions and scene colours come from store/captions.final.json if present, else store/captions.json.
// The raw frames use Reduce Motion (still creatures, no screen shake); the App Preview uses full motion.

import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STORE = join(ROOT, 'store');
const TOOLS = join(STORE, 'tools');
const RAW = join(ROOT, 'test-results', 'store-raw');
const FFMPEG = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
const FFPROBE = existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe';

// ------------------------------------------------------------------ options
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const PORT = Number(args.port ?? 5191);
const BASE = `http://127.0.0.1:${PORT}/`;
const LANGS = String(args.langs ?? 'en,es,fr,de,pt,ja').split(',');
const SCENES = args.scenes ? String(args.scenes).split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8];
const ONLY = args.only ? String(args.only).split(',') : ['raw', 'compose', 'sheet', 'video'];
if (args['no-raw']) ONLY.splice(ONLY.indexOf('raw'), 1);
if (args['no-video']) ONLY.splice(ONLY.indexOf('video'), 1);
/** Every run sees the same calendar day: a spring Thursday late morning (no festival costume, no meteor shower). */
const CLOCK = new Date('2026-05-14T10:30:00');
const BROWSER_LOCALE = { en: 'en-US', es: 'es-MX', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', ja: 'ja-JP' };

const captionsFile = existsSync(join(STORE, 'captions.final.json')) ? join(STORE, 'captions.final.json') : join(STORE, 'captions.json');
const CAPTIONS = JSON.parse(readFileSync(captionsFile, 'utf8'));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ------------------------------------------------------------------ the mid-game profile
// A player around planet 33: three chapters done (Homeworld ring 3, no monthly festival costume yet),
// 27 of 36 creatures met, eight residents with names and accessories, a Buddy, the full Aim Guide.
const PROFILE = {
  level: 33,
  seen: [
    'bunny',
    'deer',
    'parrot',
    'fish',
    'reeffish',
    'seal',
    'crab',
    'goat',
    'llama',
    'giraffe',
    'penguin',
    'owl',
    'frog',
    'duck',
    'newt',
    'otter',
    'turtle',
    'whale',
    'camel',
    'eagle',
    'bear',
    'butterfly',
    'elephant',
    'wolf',
    'unicorn',
    'dragon',
    'sunbird',
  ],
  fusions: ['steam', 'glacier'],
  plots: [
    ['mill', 3],
    ['den', 3],
    ['fountain', 1],
    ['greenhouse', 2],
    ['lantern', 1],
    ['den', 3],
    ['tower', 2],
    ['flowers', 1],
    ['mill', 2],
    ['grove', 1],
  ],
  residents: [
    ['bunny', 25, 'Mochi', 'crown'],
    ['otter', 16, 'Pip', 'scarf'],
    ['giraffe', 12, 'Sunny', 'bow'],
    ['penguin', 12, 'Pebbles', 'bow'],
    ['butterfly', 4, 'Kiwi', undefined],
    ['elephant', 18, 'Peanut', 'scarf'],
    ['unicorn', 26, 'Nova', 'crown'],
    ['bear', 8, 'Maple', 'flower'],
  ],
  buddy: ['giraffe', 'flower'],
  upgrades: { scope: 3, throws: 1, splash: 1 },
  flings: { rock: 88, ice: 76, seed: 104, magma: 67, storm: 58, sun: 61 },
  dust: 2480,
  gems: 60,
};

// ------------------------------------------------------------------ page-side helpers
/** Build the profile by really finishing planets, then fill in collection, Homeworld and history. */
const SEED_LIB = String.raw`
window.__seedProfile = async (o) => {
  const a = window.__app;
  const p = a.p;
  const unlocks = await import('/src/meta/unlocks.ts');
  const coach = await import('/src/meta/coach.ts');
  const ledgerMod = await import('/src/meta/ledger.ts');
  p.settings.reduceMotion = true;
  a.applySettings();
  // cards and tips a player at this point has already read
  const ids = unlocks.UNLOCKS.filter((r) => r.intro).map((r) => r.id);
  localStorage.setItem('pp.coach.intros', JSON.stringify(ids));
  localStorage.setItem('pp.coach.events', JSON.stringify(Object.keys(coach.COACH_EVENTS)));
  localStorage.setItem('pp.coach.nova-hold', '1');
  for (let n = 1; n < o.level; n++) {
    p.level = Math.max(p.level, n);
    a.startLevel(n, { tutorial: n === 1 });
    a.scene.finish(n % 7 === 3 ? 2 : 3);
    await new Promise((r) => setTimeout(r, 60));
  }
  p.level = o.level;
  p.tutorial = true;
  p.passport.set = true;
  p.meta.sessions = 14;
  p.meta.notifAsked = true;
  p.meta.starterOffered = true;
  p.meta.rated = true;
  for (const id of ids) if (!p.mailSeen.includes('coach-' + id)) p.mailSeen.push('coach-' + id);
  p.chapters = Array.from({ length: Math.floor((o.level - 1) / 10) }, (_, i) => i + 1);
  p.seen = [...o.seen];
  p.sightings = Object.fromEntries(o.seen.map((id, i) => [id, [22, 17, 9, 6, 15, 4, 12, 7, 19, 3][i % 10]]));
  p.fusionsFound = [...o.fusions];
  p.flings = { ...o.flings };
  p.dust = o.dust;
  p.gems = o.gems;
  p.upgrades = { ...p.upgrades, ...o.upgrades };
  p.momentum = { ...p.momentum, streak: 0 };
  p.visitors = [];
  p.mail = [];
  // Homeworld: ring 3, ten plots built, eight residents
  const now = Date.now();
  const hw = p.home;
  hw.ring = 3;
  hw.plots = o.plots.map((x) => (x ? { type: x[0], lv: x[1], since: now - 20 * 60e3 } : null));
  hw.residents = o.residents.map((r) => ({ species: r[0], fp: r[1], lastReq: Math.floor(now / (6 * 3600e3)), rewarded: 5, nick: r[2], acc: r[3] }));
  hw.debris = [];
  hw.lastDebris = now;
  hw.lastTick = now;
  hw.intro = true;
  hw.expedition = null;
  p.buddy = { species: o.buddy[0], acc: o.buddy[1] };
  // a plausible week of play for the Grown-ups page (about 2½ minutes a round)
  for (let k = 0; k < o.level - 1; k++) ledgerMod.ledger.add('round_seconds', 150, now);
  a.save();
  await a.saveNow();
  return { level: p.level, seen: p.seen.length, galaxy: p.galaxy.length };
};`;

/** Planning and throwing through the dev hooks. */
const PLAY_LIB = String.raw`
(() => {
  const P = (window.__play = {});
  const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
  P.raf = raf;
  P.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  P.init = async () => {
    P.round = await import('/src/core/round.ts');
    P.levels = await import('/src/core/levels.ts');
    P.world = await import('/src/core/world.ts');
  };
  P.scene = () => window.__app.scene;
  P.start = async (n) => {
    window.__app.startLevel(n);
    for (let i = 0; i < 300 && !(P.scene() && P.scene().L.n === n && window.__scene); i++) await raf();
    return P.ready();
  };
  P.ready = async () => {
    const s = P.scene();
    for (let i = 0; i < 900; i++) {
      if (s.modalOpen && !s.ended) s.modalOpen.close();
      if (s.canAim() && window.__scene) return true;
      await raf();
    }
    return false;
  };
  P.queue = (n) => {
    const s = P.scene();
    const q = [s.cur, s.next];
    for (let k = 0; q.length < n; k++) q.push(s.L.queue[(s.qi + k) % s.L.queue.length]);
    return q;
  };
  P.stars = (state) => {
    const s = P.scene();
    const score = P.world.lifeScore(state.planet) + (state.bonus || 0);
    return P.levels.starsEarned(state.planet, score, s.L);
  };
  const summary = (res, kind, sec) => ({
    sec, kind, delta: res.after - res.before,
    spawned: res.spawned.map((x) => x.id), first: res.firstArrivals, lost: res.lost.length,
    reaction: res.reactions[0] ? res.reactions[0].id : null, step: res.combo.step, links: res.combo.links,
    super: !!res.combo.superFusion, nova: res.novaFired,
    trouble: res.troubleEvents.map((e) => e.id + ':' + e.kind + ':' + (e.by || '')),
  });
  /** Beam search over sectors with the pure round step. score/final are function bodies (see callers). */
  P.plan = ({ depth, beam = 30, score, final }) => {
    const s = P.scene();
    const mods = s.roundModifiers();
    const rules = s.rules;
    const kinds = P.queue(depth + 1);
    const ctx = { seen: new Set(window.__app.p.seen), stars: P.stars, L: s.L, round: P.round, mods, rules, kinds };
    const scoreFn = new Function('res', 'k', 'path', 'ctx', score);
    const finalFn = final ? new Function('state', 'path', 'ctx', final) : null;
    let beams = [{ state: s.roundState(), total: 0, path: [] }];
    for (let k = 0; k < depth; k++) {
      const next = [];
      for (const b of beams)
        for (let sec = 0; sec < 24; sec++) {
          const st = { ...b.state, throwsLeft: 99 };
          const res = P.round.stepRound(st, { kind: kinds[k], sector: sec, nova: P.round.novaForThrow(st) }, mods, rules);
          const path = [...b.path, summary(res, kinds[k], sec)];
          next.push({ state: res.state, total: b.total + scoreFn(res, k, path, ctx), path });
        }
      next.sort((a, b) => b.total - a.total);
      const seenKeys = new Set();
      const kept = [];
      for (const n of next) {
        // one beam per resulting planet (different orders often give the same planet)
        const key = JSON.stringify(n.state.planet.sectors.map((x) => [x.biome, x.species])) + n.state.combo.links;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        kept.push(n);
        if (kept.length >= beam) break;
      }
      beams = kept;
    }
    if (finalFn) {
      for (const b of beams) b.total += finalFn(b.state, b.path, ctx);
      beams.sort((a, b) => b.total - a.total);
    }
    return beams.slice(0, 3).map((b) => ({ total: Math.round(b.total), path: b.path }));
  };
  /** What throwing the current object at each sector would do right now (pure preview, no drawing). */
  P.options = () => {
    const s = P.scene();
    const st = s.roundState();
    const out = [];
    for (let sec = 0; sec < 24; sec++) {
      const res = P.round.previewStep(st, { kind: s.cur, sector: sec, nova: P.round.novaForThrow(st) }, s.roundModifiers(), s.rules);
      out.push({ ...summary(res, s.cur, sec), stars: P.stars(res.state) });
    }
    return out;
  };
  P.vectorFor = (sec) => {
    const hook = window.__scene;
    const v = hook.aimAt(sec);
    const pr = hook.predict(v.vx, v.vy);
    return pr.kind === 'land' && pr.sector === sec ? v : null;
  };
  P.waitVector = async (sec, ms = 20000) => {
    const t0 = performance.now();
    for (let k = 0; performance.now() - t0 < ms; k++) {
      const v = P.vectorFor(sec);
      if (v) return v;
      // aimAt tries five speeds; a sky obstacle can leave a sector reachable only by other pulls
      if (k % 8 === 7) {
        const row = P.sweep((r) => r.hit === 'land' && r.sector === sec, 2, 0.04)[0];
        if (row) return { vx: row.vx, vy: row.vy };
      }
      await P.sleep(50);
    }
    const s = P.scene();
    P.lastMiss = { sec, time: s.time, rot: s.rot, paused: s.paused, modal: !!s.modalOpen, canAim: s.canAim() };
    return null;
  };
  /** Wait until the round's feedback is quiet (popups done, banners gone). */
  P.quiet = async (min = 1300, max = 5500) => {
    const s = P.scene();
    const t0 = performance.now();
    while (performance.now() - t0 < max) {
      const q = !s.shot && !s.feedback.active.length && !s.feedback.waiting.length && !s.popups.length;
      if (q && performance.now() - t0 > min) break;
      await raf();
    }
  };
  P.throwAt = async (sec) => {
    await P.ready();
    const s = P.scene();
    const hook = window.__scene;
    const v = await P.waitVector(sec);
    if (!v) return { ok: false, want: sec, miss: P.lastMiss };
    hook.drawPreview(v);
    hook.fire(v);
    for (let i = 0; i < 900 && s.shot; i++) await raf();
    const hit = hook.lastHit;
    await P.quiet();
    await P.ready();
    return { ok: !!hit && hit.sector === sec, want: sec, got: hit && hit.sector };
  };
  P.runPlan = async (path) => {
    const out = [];
    for (const step of path) out.push(await P.throwAt(step.sec));
    return out;
  };
  /** Put the round clock and planet spin at a fixed moment (forward only, while nothing is animating). */
  P.setClock = (time, rot) => {
    const s = P.scene();
    if (time <= s.time) throw new Error('clock must move forward: ' + s.time + ' → ' + time);
    s.time = time;
    s.rot = rot;
    s.predictCache = null;
    s.aimTagPosition = null;
  };
  /** Planet spin that shows sector sec at screen angle phi (radians, 0 = right, -π/2 = up). */
  P.rotFor = (sec, phi) => phi - (sec + 0.5) * ((Math.PI * 2) / 24);
  P.freeze = () => {
    const s = P.scene();
    cancelAnimationFrame(s.raf);
    s.__frozen = true;
  };
  P.resume = () => {
    const s = P.scene();
    if (!s.__frozen) return;
    s.__frozen = false;
    s.last = 0;
    s.raf = requestAnimationFrame(s.frame);
  };
  /** Every pull (angle × power) and where it ends, at the current clock. */
  P.sweep = (filter, dDeg = 1.5, dPow = 0.03) => {
    const s = P.scene();
    const out = [];
    for (let power = 0.36; power <= 1.001; power += dPow)
      for (let deg = -178; deg <= -2; deg += dDeg) {
        const a = (deg * Math.PI) / 180;
        const vx = Math.cos(a) * 930 * power;
        const vy = Math.sin(a) * 930 * power;
        const path = s.predict(vx, vy);
        const hit = path.hit;
        const row = { vx, vy, deg, power, sector: path.sector, hit: hit ? hit.kind : 'miss', bounces: path.bounces.length, n: path.points.length };
        if (filter(row, path)) out.push({ ...row, path });
      }
    return out;
  };
  /** Hold an aim exactly as a finger would leave it, draw one frame and freeze. */
  P.holdAndFreeze = (v) => {
    const s = P.scene();
    s.aimFrom = { x: s.launch.x, y: s.launch.y };
    s.aimTo = { x: s.launch.x - v.vx / 6.2, y: s.launch.y - v.vy / 6.2 };
    s.drawnAim = null;
    s.draw();
    P.freeze();
    const f = s.predictCache ? s.predictCache.facts : null;
    return { facts: f && { delta: f.delta, arrivals: f.arrivals, first: f.firstArrivals, lost: f.lost.length, reaction: f.reaction, beads: f.comboBeads }, tag: s.aimTagPosition, badge: !!(s.drawnAim && s.drawnAim.badge) };
  };
  /** A drawn line that stays on screen, below the HUD, and clear of the next-object bubble. */
  P.clearLine = (path) => {
    const s = P.scene();
    const qx = s.launch.x + 88;
    const qy = s.launch.y - 56;
    return path.points.every((q) => q.x > 14 && q.x < s.w - 14 && q.y > 150 && Math.hypot(q.x - qx, q.y - qy) > 46);
  };
  P.release = () => {
    const s = P.scene();
    s.aimFrom = s.aimTo = s.drawnAim = null;
  };
  /** Fire at sec from the current clock, then run the round until cond() holds (or maxT round seconds pass) and freeze. */
  P.fireAndFreeze = async (sec, cond, maxT = 4) => {
    const s = P.scene();
    const hook = window.__scene;
    const v = P.vectorFor(sec);
    if (!v) return { ok: false, reason: 'no vector' };
    hook.drawPreview(v);
    hook.fire(v);
    for (let i = 0; i < 900 && s.shot; i++) await raf();
    const landedAt = s.time;
    const test = new Function('s', 'dt', cond);
    while (s.time - landedAt < maxT) {
      await raf();
      if (test(s, s.time - landedAt)) break;
    }
    P.freeze();
    return { ok: true, hit: hook.lastHit, after: +(s.time - landedAt).toFixed(3), popups: s.popups.map((p) => p.text), banner: document.querySelector('.level .discover.show') ? document.querySelector('.level .discover').innerText.replace(/\s+/g, ' ') : null };
  };
})();`;

// ------------------------------------------------------------------ dev server
async function reachable() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}
let server = null;
async function ensureServer() {
  if (await reachable()) return;
  log(`starting Vite on ${PORT}`);
  server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    if (await reachable()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Vite did not start');
}

// ------------------------------------------------------------------ browser
let browser;
async function openGame(lang, { width = 440, height = 956, dpr = 3, reduceMotion = true } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: dpr,
    isMobile: true,
    hasTouch: true,
    locale: BROWSER_LOCALE[lang],
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.routeWebSocket(/^wss?:\/\//, () => {}); // no hot reloads mid-capture
  await page.clock.install({ time: CLOCK });
  await page.addInitScript((still) => {
    if (!sessionStorage.getItem('__store_fresh')) {
      localStorage.clear();
      sessionStorage.setItem('__store_fresh', '1');
    }
    if (still) {
      // CSS entrances land at rest (the canvas is paused separately for each capture)
      const css = () => {
        const s = document.createElement('style');
        s.textContent =
          '*,*::before,*::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:1ms!important;transition-delay:0s!important}';
        document.head.append(s);
      };
      if (document.head) css();
      else document.addEventListener('DOMContentLoaded', css);
    }
  }, reduceMotion);
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__app?.p && !!document.querySelector('.host > .screen'));
  if (await page.evaluate(() => window.__app.screen === 'title')) await page.locator('.first-title button').click();
  await page.waitForFunction(() => window.__app.screen === 'home' || !!window.__app.scene);
  await page.evaluate((lang) => {
    window.__app.p.settings.lang = lang;
    window.__i18n?.setLang(lang);
    window.__app.applySettings();
  }, lang);
  await page.evaluate(SEED_LIB);
  await page.evaluate(PLAY_LIB);
  await page.evaluate(() => window.__play.init());
  const seeded = await page.evaluate((o) => window.__seedProfile(o), PROFILE);
  await page.evaluate(() => window.__app.selectTab('home'));
  return { ctx, page, errors, seeded };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtPath = (path) =>
  path
    .map(
      (p) =>
        `${p.sec}:${p.kind}${p.delta >= 0 ? '+' : ''}${p.delta}${p.reaction ? `[${p.reaction}${p.step ? ` C${p.step}` : ''}]` : ''}${p.spawned.length ? `(${p.spawned.join(',')})` : ''}${p.lost ? ` -${p.lost}` : ''}${p.trouble.length ? ` {${p.trouble.join(' ')}}` : ''}`,
    )
    .join('  ');

async function plan(page, o) {
  const plans = await page.evaluate((o) => window.__play.plan(o), o);
  if (!plans.length) throw new Error('no plan');
  return plans[0];
}
async function run(page, path) {
  const res = await page.evaluate((p) => window.__play.runPlan(p), path);
  const bad = res.filter((r) => !r.ok);
  if (bad.length) throw new Error(`throws went astray: ${JSON.stringify(bad)}`);
}

// ------------------------------------------------------------------ scenes
// Each returns after freezing the page in the state to capture; the caller screenshots it.
const GROW =
  'return (res.after - res.before) + res.spawned.length * 8 - res.lost.length * 45 - (res.spawned.some((x) => !ctx.seen.has(x.id)) ? 25 : 0);';
const NO_FINISH = 'return ctx.stars(state) > 0 ? -5000 : 0;'; // no "Finish ✓" button over the Keeper
const GROW_UNDER_STAR = GROW.replace('return ', 'if (ctx.stars(res.state) > 0) return -5000; return ');

const SCENES_DEF = {
  /** 1 · a half-grown planet, the aim held: curved line, aim tag with +life and a friend moving in. */
  1: {
    id: '1-fling',
    planet: 24,
    async play(page) {
      const pl = await plan(page, {
        depth: 3,
        beam: 30,
        score: GROW,
        final: `
          if (ctx.stars(state) > 0) return -5000;
          let best = -99;
          const st = { ...state, throwsLeft: 99 };
          for (let sec = 0; sec < 24; sec++) {
            const r = ctx.round.stepRound(st, { kind: ctx.kinds[path.length], sector: sec, nova: ctx.round.novaForThrow(st) }, ctx.mods, ctx.rules);
            if (r.lost.length || !r.spawned.length) continue;
            best = Math.max(best, (r.after - r.before) + 10 * r.firstArrivals.length);
          }
          return best * 1.5;`,
      });
      log('  plan', fmtPath(pl.path));
      await run(page, pl.path);
      // the aim: the best friendly landing (life up, a friend moving in, nobody leaving), turned to where its line sweeps most
      const opts = await page.evaluate(() => window.__play.options());
      const pick = opts
        .filter((o) => !o.lost && o.spawned.length && o.delta > 0 && !o.reaction)
        .sort((a, b) => b.delta + 10 * b.first.length - (a.delta + 10 * a.first.length))[0];
      if (!pick) throw new Error('no friendly aim');
      log('  hold', JSON.stringify({ sec: pick.sec, delta: pick.delta, spawned: pick.spawned, first: pick.first }));
      return holdOn(page, pick.sec, { phis: [-2.8, -2.5, -2.2, -1.9, -1.6, -1.3, -1.0, -0.7, -0.4], T: 612.4 });
    },
  },
  /** 2 · a lively planet the moment a brand-new friend moves in (the NEW CREATURE card). */
  2: {
    id: '2-friends',
    planet: 22,
    async play(page) {
      const pl = await plan(page, {
        depth: 5,
        beam: 50,
        score: `
          if (ctx.stars(res.state) > 0) return -5000;
          const newFriend = res.spawned.filter((x) => !ctx.seen.has(x.id)).length;
          if (k < 4) return (res.after - res.before) + res.spawned.length * 9 - res.lost.length * 45 - newFriend * 60;
          return (res.after - res.before) + res.spawned.length * 12 - res.lost.length * 1000 - (res.novaFired ? 300 : 0) + (newFriend ? 400 : 0);`,
        final: `return ctx.stars(state) > 0 ? -5000 : state.planet.sectors.filter((x) => x.species).length * 12;`,
      });
      log('  plan', fmtPath(pl.path));
      const last = pl.path.at(-1);
      const seen = await page.evaluate(() => window.__app.p.seen);
      if (!last.spawned.some((id) => !seen.includes(id))) throw new Error('the last throw brings no new creature');
      await run(page, pl.path.slice(0, -1));
      return fireOn(page, last.sec, {
        phis: [-1.3],
        T: 640.2,
        cond: `const b = document.querySelector('.level .discover.show'); return !!b && dt > 0.95 && s.popups.length > 0;`,
      });
    },
  },
  /** 3 · a Fusion that lands a Combo: the Fusion name, "COMBO n!" and the Fusion arc. */
  3: {
    id: '3-fusions',
    planet: 34,
    async play(page) {
      const pl = await plan(page, {
        depth: 7,
        beam: 40,
        score: `
          const f = res.reactions[0] && res.reactions[0].id !== 'scorch' ? 1 : 0;
          return f * 40 + res.combo.step * 70 + (res.after - res.before) * 0.3 + res.spawned.length * 2 - res.lost.length * 30
            - (res.spawned.some((x) => !ctx.seen.has(x.id)) ? 30 : 0);`,
        final: NO_FINISH,
      });
      log('  plan', fmtPath(pl.path));
      // capture on the first throw that reaches Combo 3 (else the biggest Combo)
      let at = pl.path.findIndex((p) => p.step >= 3);
      if (at < 0) at = pl.path.reduce((best, p, i) => (p.step > pl.path[best].step ? i : best), 0);
      await run(page, pl.path.slice(0, at));
      return fireOn(page, pl.path[at].sec, {
        phis: [-1.1],
        T: 655.7,
        cond: `const t = s.popups.map((p) => p.text).join('|'); const ok = s.popups.length >= 2 && /COMBO|コンボ/i.test(t) && s.feedback.active.every((a) => s.time * 1000 - a.startedAt > 260); return ok;`,
      });
    },
  },
  /**
   * 4 · a sky-obstacle planet: the aim line curling through the Magnet Mist (planet 46) and landing well.
   * SCENE4=bubble uses a Bubble Moon bank shot on planet 41 instead (it reads less clearly at store size).
   */
  4: {
    id: '4-sky',
    planet: process.env.SCENE4 === 'bubble' ? 41 : 46,
    async play(page) {
      const pl = await plan(page, { depth: 4, beam: 30, score: GROW_UNDER_STAR, final: NO_FINISH });
      log('  plan', fmtPath(pl.path));
      await run(page, pl.path);
      return process.env.SCENE4 === 'bubble' ? bankShot(page) : mistShot(page);
    },
  },
  /** 5 · an Ember Vent planet: forecast strip, walls, trait shields, and a friend blocking the vent ("Safe!"). */
  5: {
    id: '5-troubles',
    planet: 45,
    async play(page) {
      await page.evaluate(async () => (window.__traitOf = (await import('/src/core/world.ts')).traitOf));
      const pl = await plan(page, {
        depth: 8,
        beam: 50,
        score: `
          if (ctx.stars(res.state) > 0) return -5000;
          const P = res.state.planet.sectors;
          const walls = P.filter((x) => x.water >= 2 || x.land >= 3).length;
          const guards = P.filter((x) => x.species && window.__traitOf(x.species) === 'fireproof').length;
          const settled = res.troubleEvents.filter((e) => e.kind === 'settled').length;
          const blocked = res.troubleEvents.filter((e) => e.kind === 'blocked' && e.by === 'fireproof').length;
          const clean = blocked && !res.lost.length && !res.reactions.length && !res.novaFired && res.after - res.before > 5;
          return 0.4 * (res.after - res.before) + res.spawned.length * 6 - res.lost.length * 45 - settled * 600 + blocked * 60
            + (clean && k >= 5 ? 400 : 0)
            + (k >= 3 ? guards * 10 - walls * 4 : 0) - (res.spawned.some((x) => !ctx.seen.has(x.id)) ? 20 : 0);`,
        final: NO_FINISH,
      });
      log('  plan', fmtPath(pl.path));
      // the last throw where a fireproof friend stops the vent, with nothing lost
      let at = -1;
      pl.path.forEach((p, i) => {
        if (p.trouble.some((t) => t.includes(':blocked:')) && !p.lost && !p.reaction && !p.nova && p.delta > 5) at = i;
      });
      if (at < 0) throw new Error('no clean block in the plan');
      await run(page, pl.path.slice(0, at));
      const vent = await page.evaluate(() => window.__play.scene().troubles[0].source);
      return fireOn(page, pl.path[at].sec, {
        anchor: [
          [vent, -0.55],
          [vent, -0.95],
          [vent, -0.2],
          [vent, -1.3],
        ],
        T: 671.3,
        // "Safe!" still bright, the new friend's pop-in mostly settled
        cond: `const safe = s.popups.find((p) => p.color === '#a4e8bc'); return (!!safe && safe.life / safe.max < 0.5) || dt > 1.2;`,
      });
    },
  },
  6: {
    id: '6-homeworld',
    async play(page) {
      await page.evaluate(() => window.__app.selectTab('homeworld'));
      await page.waitForFunction(() => window.__app.screen === 'homeworld');
      await sleep(1600);
    },
  },
  7: {
    id: '7-lifebook',
    async play(page) {
      await page.evaluate(() => window.__app.showLifebook());
      await page.waitForFunction(() => window.__app.screen === 'lifebook');
      await sleep(1400);
    },
  },
  8: {
    id: '8-grownups',
    async play(page, lang) {
      await page.evaluate(() => {
        const s = window.__app.p.settings;
        s.breakAfterRounds = 5;
        s.gentle = true;
        window.__app.selectTab('home');
      });
      await page.waitForFunction(() => window.__app.screen === 'home');
      await sleep(400);
      await page.locator('.topbar button.icon').first().click(); // the gear
      const open = page.locator('.overlay .scrim:not(.out) .modal');
      await open.first().waitFor();
      const label = await page.evaluate(async () => (await import('/src/i18n.ts')).t('Grown-ups'));
      await open.getByRole('button', { name: label, exact: true }).click();
      const gate = page.locator('.overlay .scrim:not(.out) .modal.gate-v2');
      await gate.waitFor();
      const answer = await page.evaluate(() => window.__gate.answer());
      for (const d of answer) await gate.locator(`.gate-v2-keypad button[aria-label="${d}"]`).click();
      const hold = gate.locator('.gate-v2-confirm');
      const box = await hold.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await sleep(1750);
      await page.mouse.up();
      await page.waitForFunction(() => window.__app.screen === 'shop');
      await sleep(600);
      // scroll past the shop and every amount: Play time, Grown-up settings (Gentle planets, Reminders) and Help
      const y = await page.evaluate(() => {
        const sections = [...document.querySelectorAll('.grownups-section')];
        const play = sections[sections.length - 3]; // Play time, Grown-up settings, Help are the last three
        const scroller = document.querySelector('.host .screen.grownups .scroll');
        scroller.scrollTo(0, play.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12);
        return scroller.scrollTop;
      });
      await sleep(400);
      // nothing that looks like money may show (inside the scroller only its visible part counts)
      const leak = await page.evaluate(() => {
        const sc = document.querySelector('.host .screen.grownups .scroll').getBoundingClientRect();
        const hits = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walk.nextNode())) {
          const txt = n.textContent.trim();
          if (!/[$€£¥₩₹]|\d[.,]\d\d\b|R\$|US\$|円/.test(txt)) continue;
          const el = n.parentElement;
          const r = el.getBoundingClientRect();
          const inScroller = !!el.closest('.host .screen.grownups .scroll');
          const top = inScroller ? sc.top : 0;
          const bottom = inScroller ? sc.bottom : innerHeight;
          if (r.bottom > top && r.top < bottom && r.width > 0) hits.push(txt);
        }
        return hits;
      });
      if (leak.length) throw new Error(`[${lang}] a price or amount is visible on the Grown-ups shot: ${leak.join(' | ')}`);
      log('  grown-ups scrolled to', y);
    },
  },
};
const PROFILE_SEEN = PROFILE.seen;

/** Hold an aim at `sec`, turning the planet so the sector sits at the screen angle (of phis) that gives the most sweeping line. */
async function holdOn(page, sec, { phis, T }) {
  const best = await page.evaluate(
    ({ sec, phis, T }) => {
      const P = window.__play;
      const s = P.scene();
      const saved = [s.time, s.rot];
      const bend = (path) => {
        const a = path.points[0];
        const b = path.points[path.points.length - 1];
        let m = 0;
        for (const q of path.points)
          m = Math.max(m, Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y));
        return m;
      };
      let best = null;
      phis.forEach((phi, i) => {
        s.time = T + i * 0.01;
        s.rot = P.rotFor(sec, phi);
        // every pull that lands on the sector and stays on screen, below the HUD
        const all = P.sweep((row, path) => row.hit === 'land' && row.sector === sec && P.clearLine(path));
        for (const row of all) {
          const score = Math.min(bend(row.path), 150) + Math.min(60, row.n / 6);
          if (!best || score > best.score)
            best = {
              phi,
              T: s.time,
              rot: s.rot,
              vx: row.vx,
              vy: row.vy,
              score: Math.round(score),
              bend: Math.round(bend(row.path)),
              n: row.n,
            };
        }
      });
      s.time = saved[0];
      s.rot = saved[1];
      return best;
    },
    { sec, phis, T },
  );
  if (!best) throw new Error('no aim could be held');
  const held = await page.evaluate((b) => {
    window.__play.setClock(b.T, b.rot);
    return window.__play.holdAndFreeze({ vx: b.vx, vy: b.vy });
  }, best);
  if (!held.facts || !held.tag) throw new Error(`the held aim shows no aim tag: ${JSON.stringify(held)}`);
  log('  held', JSON.stringify({ ...best, facts: held.facts }));
  return held;
}

/** Fire at `sec` with the planet turned to phi, then freeze when cond holds. */
async function fireOn(page, sec, { phis = [], T, cond, anchor = null }) {
  // anchor: [sector, phi] pairs to try first (e.g. put the vent, not the landing, at a readable spot)
  const tries = [...(anchor ?? []), ...[...phis, -1.57, -2.2, -0.9, -2.8, -0.35].map((phi) => [sec, phi])];
  for (const [i, [at, phi]] of tries.entries()) {
    await page.evaluate(({ at, phi, T }) => window.__play.setClock(T, window.__play.rotFor(at, phi)), { at, phi, T: T + i * 2 });
    const r = await page.evaluate(({ sec, cond }) => window.__play.fireAndFreeze(sec, cond), { sec, cond });
    if (r.ok) {
      log('  captured', JSON.stringify(r));
      return r;
    }
  }
  throw new Error('could not fire the capture throw');
}

/** Bubble Moon: find a moment and pull where the line bounces off the bubble and lands well; hold it. */
async function bankShot(page, { T0 = 700, samples = 48, step = 0.53 } = {}) {
  const found = await page.evaluate(
    ({ T0, samples, step }) => {
      const P = window.__play;
      const s = P.scene();
      const saved = [s.time, s.rot];
      const st = s.roundState();
      let best = null;
      for (let k = 0; k < samples; k++) {
        const T = T0 + k * step;
        s.time = T;
        s.rot = (T * s.L.spin) % (Math.PI * 2);
        const rows = P.sweep(
          (row, path) => row.hit === 'land' && row.bounces >= 1 && path.points.every((q) => q.x > 10 && q.x < s.w - 10 && q.y > 70),
          2,
          0.04,
        );
        for (const row of rows) {
          const res = P.round.previewStep(
            st,
            { kind: s.cur, sector: row.sector, nova: P.round.novaForThrow(st) },
            s.roundModifiers(),
            s.rules,
          );
          if (res.lost.length || res.after <= res.before) continue;
          const b = row.path.bounces[0];
          const end = row.path.points[row.path.points.length - 1];
          // a clear bank shot: the bounce in open sky, then straight into the planet, all of it drawn
          if (b.x < 60 || b.x > s.w - 60 || b.y > s.launch.y - 80 || end.elapsed > 2.6) continue;
          const after = end.elapsed - b.elapsed;
          const toPlanet = Math.hypot(b.x - s.cx, b.y - s.cy) - s.R;
          const k = row.path.points.findIndex((q) => q.elapsed >= b.elapsed);
          const pa = row.path.points[Math.max(0, k - 12)];
          const pb = row.path.points[Math.min(row.path.points.length - 1, k + 12)];
          const turn = Math.abs(
            ((Math.atan2(pb.y - b.y, pb.x - b.x) - Math.atan2(b.y - pa.y, b.x - pa.x) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI,
          );
          const score =
            (after < 0.7 ? 80 : after < 1.1 ? 30 : 0) +
            Math.min(60, toPlanet / 2) +
            (res.after - res.before) * 0.5 +
            res.spawned.length * 12 +
            (b.elapsed > 0.25 ? 20 : 0) +
            Math.min(90, (turn * 180) / Math.PI);
          if (!best || score > best.score)
            best = {
              T,
              rot: s.rot,
              vx: row.vx,
              vy: row.vy,
              sector: row.sector,
              score,
              delta: res.after - res.before,
              spawned: res.spawned.map((x) => x.id),
              bounce: { x: Math.round(b.x), y: Math.round(b.y) },
            };
        }
      }
      s.time = saved[0];
      s.rot = saved[1];
      if (!best) return null;
      P.setClock(best.T, best.rot);
      return { best, held: P.holdAndFreeze({ vx: best.vx, vy: best.vy }) };
    },
    { T0, samples, step },
  );
  if (!found) throw new Error('no bank shot found');
  log('  bank shot', JSON.stringify(found));
  return found.held;
}

/** Magnet Mist: a moment and pull where the line visibly curls through the mist and still lands well; hold it. */
async function mistShot(page, { T0 = 700, samples = 24, step = 0.9 } = {}) {
  const found = await page.evaluate(
    async ({ T0, samples, step }) => {
      const P = window.__play;
      const s = P.scene();
      const sky = await import('/src/core/sky.ts');
      const flight = await import('/src/core/flight.ts');
      const saved = [s.time, s.rot];
      const st = s.roundState();
      let best = null;
      for (let k = 0; k < samples; k++) {
        const T = T0 + k * step;
        s.time = T;
        s.rot = (T * s.L.spin) % (Math.PI * 2);
        const mist = sky
          .skyShapesAt(s.L.sky, s.skyState, { cx: s.cx, cy: s.cy, R: s.R, width: s.w, height: s.h, launcherY: s.launch.y }, T)
          .find((x) => x.kind === 'mist');
        if (!mist) return null;
        const clearWorld = { ...s.flightWorld(s.rot), sky: undefined };
        const rows = P.sweep(
          (row, path) => row.hit === 'land' && P.clearLine(path) && path.points[path.points.length - 1].elapsed < 2.6,
          2,
          0.04,
        );
        for (const row of rows) {
          const through = row.path.points.some((q) => Math.hypot(q.x - mist.x, q.y - mist.y) < mist.r * 0.9);
          if (!through) continue;
          const clear = flight.flyFull(flight.STAR_SLING, { ...s.launch, vx: row.vx, vy: row.vy, elapsed: 0 }, clearWorld, s.time);
          const end = row.path.points[row.path.points.length - 1];
          const cend = clear.points[clear.points.length - 1];
          const curl = Math.hypot(end.x - cend.x, end.y - cend.y);
          const res = P.round.previewStep(
            st,
            { kind: s.cur, sector: row.sector, nova: P.round.novaForThrow(st) },
            s.roundModifiers(),
            s.rules,
          );
          if (res.lost.length || res.after <= res.before) continue;
          const score = Math.min(90, curl) + (res.after - res.before) * 0.4 + res.spawned.length * 12;
          if (!best || score > best.score)
            best = {
              T,
              rot: s.rot,
              vx: row.vx,
              vy: row.vy,
              sector: row.sector,
              score: Math.round(score),
              curl: Math.round(curl),
              delta: res.after - res.before,
              spawned: res.spawned.map((x) => x.id),
            };
        }
      }
      s.time = saved[0];
      s.rot = saved[1];
      if (!best) return null;
      P.setClock(best.T, best.rot);
      return { best, held: P.holdAndFreeze({ vx: best.vx, vy: best.vy }) };
    },
    { T0, samples, step },
  );
  if (!found) throw new Error('no mist shot found');
  log('  mist shot', JSON.stringify(found));
  return found.held;
}

// ------------------------------------------------------------------ raw capture
async function captureRaw(lang) {
  const t0 = Date.now();
  const { ctx, page, errors, seeded } = await openGame(lang);
  log(`[${lang}] profile`, JSON.stringify(seeded));
  const dir = join(RAW, lang);
  mkdirSync(dir, { recursive: true });
  for (const n of SCENES) {
    const def = SCENES_DEF[n];
    log(`[${lang}] scene ${def.id}${def.planet ? ` (planet ${def.planet})` : ''}`);
    if (def.planet) {
      const ok = await page.evaluate((n) => window.__play.start(n), def.planet);
      if (!ok) throw new Error(`planet ${def.planet} did not become ready`);
    }
    await def.play(page, lang);
    const file = join(dir, `0${n}-${def.id}.png`);
    await page.screenshot({ path: file });
    if (def.planet) {
      await page.evaluate(() => {
        window.__play.release();
        window.__play.resume();
      });
    }
  }
  const english = lang === 'en' ? [] : await findEnglish(page);
  log(
    `[${lang}] end state`,
    JSON.stringify(
      await page.evaluate(() => {
        const p = window.__app.p;
        return {
          seen: p.seen.length,
          dust: p.dust,
          gems: p.gems,
          fusions: p.fusionsFound,
          combo: p.combo,
          level: p.level,
          chapters: p.chapters.length,
        };
      }),
    ),
  );
  await ctx.close();
  if (errors.length) log(`[${lang}] page errors:`, errors.slice(0, 5));
  if (english.length) log(`[${lang}] note: untranslated strings seen`, english);
  log(`[${lang}] raw frames in ${Math.round((Date.now() - t0) / 1000)} s`);
}

/** English left on the last screen of a non-English run (a quick sanity check; each shot is also reviewed by eye). */
async function findEnglish(page) {
  return page.evaluate(() => {
    const words = ['Settings', 'Grown-ups', 'Play time', 'Gentle planets', 'Reminders', 'Help', 'throws', 'life'];
    const txt = document.body.innerText;
    return words.filter((w) => new RegExp(`\\b${w}\\b`).test(txt));
  });
}

// ------------------------------------------------------------------ compose
function inkFor(bg) {
  const c = bg.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const navy = 0.0104; // #1b1846
  const contrastNavy = (L + 0.05) / (navy + 0.05);
  const contrastWhite = 1.05 / (L + 0.05);
  return contrastNavy >= contrastWhite ? '#1b1846' : '#ffffff';
}

async function compose(langs) {
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 2868 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(TOOLS, 'frame.html')).href);
  const report = [];
  for (const lang of langs) {
    const out = join(STORE, 'screenshots', lang, '6.9');
    mkdirSync(out, { recursive: true });
    for (const n of SCENES) {
      const scene = CAPTIONS.scenes[n - 1];
      const def = SCENES_DEF[n];
      const raw = join(RAW, lang, `0${n}-${def.id}.png`);
      if (!existsSync(raw)) throw new Error(`missing raw frame ${raw}`);
      const caption = CAPTIONS.captions[lang][n - 1];
      const ink = inkFor(scene.bg);
      const info = await page.evaluate((o) => window.render(o), { caption, bg: scene.bg, ink, img: pathToFileURL(raw).href, lang });
      if (!info.fredoka) throw new Error('Fredoka did not load');
      if (info.lines > 2) throw new Error(`[${lang}] caption ${n} needs ${info.lines} lines`);
      const tmp = join(RAW, lang, `_frame-${n}.png`);
      await page.screenshot({ path: tmp, type: 'png' });
      const final = join(out, `0${n}-${def.id}.png`);
      flatten(tmp, final);
      rmSync(tmp);
      report.push({ lang, n, px: info.px, lines: info.lines });
    }
    log(
      `[${lang}] composed`,
      report
        .filter((r) => r.lang === lang)
        .map((r) => `${r.n}:${r.px}px/${r.lines}`)
        .join(' '),
    );
  }
  await ctx.close();
  return report;
}

/** RGB PNG, no alpha channel, tagged sRGB. */
function flatten(src, dst) {
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', src, '-vf', 'format=rgb24', '-pix_fmt', 'rgb24', dst]);
  execFileSync('sips', ['-m', '/System/Library/ColorSync/Profiles/sRGB Profile.icc', dst], { stdio: 'ignore' });
}

function verifyScreens(langs) {
  const problems = [];
  for (const lang of langs) {
    const dir = join(STORE, 'screenshots', lang, '6.9');
    const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
    for (const f of files) {
      const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', '-g', 'space', join(dir, f)], {
        encoding: 'utf8',
      });
      const get = (k) => (out.match(new RegExp(`${k}: (\\S+)`)) || [])[1];
      if (get('pixelWidth') !== '1320' || get('pixelHeight') !== '2868' || get('hasAlpha') !== 'no' || get('space') !== 'RGB')
        problems.push(`${lang}/${f}: ${get('pixelWidth')}×${get('pixelHeight')} alpha=${get('hasAlpha')} space=${get('space')}`);
    }
    if (files.length !== 8) problems.push(`${lang}: ${files.length} files`);
  }
  return problems;
}

function contactSheet() {
  const dir = join(STORE, 'screenshots', 'en', '6.9');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();
  const inputs = files.flatMap((f) => ['-i', join(dir, f)]);
  const scale = files.map((_, i) => `[${i}]scale=330:717[s${i}]`).join(';');
  const layout = files.map((_, i) => `${(i % 4) * 346 + 16}_${Math.floor(i / 4) * 733 + 16}`).join('|');
  const xs = files.map((_, i) => `[s${i}]`).join('');
  const out = join(STORE, 'screenshots', 'contact-sheet-en.png');
  execFileSync(FFMPEG, [
    '-loglevel',
    'error',
    '-y',
    ...inputs,
    '-filter_complex',
    `${scale};${xs}xstack=inputs=${files.length}:layout=${layout}:fill=0x16143a,pad=1400:1482:0:0:0x16143a,format=rgb24`,
    '-frames:v',
    '1',
    out,
  ]);
  log('contact sheet', out);
}

// ------------------------------------------------------------------ App Preview (English)
const VIDEO = { width: 443, height: 960, dpr: 2, fps: 30 };

async function recordPreview() {
  const frames = join(RAW, 'video');
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const { ctx, page, errors } = await openGame('en', { width: VIDEO.width, height: VIDEO.height, dpr: VIDEO.dpr, reduceMotion: false });
  // real motion for the video: creatures bob, the Keeper cheers, bursts fly, spring petals drift
  await page.evaluate(() => {
    window.__app.p.settings.reduceMotion = false;
    window.__app.applySettings();
  });
  const FPS = VIDEO.fps;
  let frameNo = 0;
  const segments = [];
  /** Advance the page clock one video frame at a time and grab each frame. */
  const shoot = async (n = 1, each) => {
    for (let i = 0; i < n; i++) {
      if (each) await each(i);
      await page.clock.runFor(1000 / FPS);
      await page.screenshot({ path: join(frames, `f${String(frameNo++).padStart(5, '0')}.png`) });
    }
  };
  const pause = async () => page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 40));
  const resume = () => page.clock.resume();
  const mark = (name) => segments.push({ name, at: frameNo });
  /** A finger pulls back from the launcher to the pull for v over n frames (ease-out). */
  const drag = (v, n) =>
    shoot(n, (i) =>
      page.evaluate(
        ({ v, n, i }) => {
          const s = window.__app.scene;
          const k = Math.min(1, (i + 1) / n);
          const e = 1 - Math.pow(1 - k, 3);
          s.aimFrom = { x: s.launch.x, y: s.launch.y };
          s.aimTo = { x: s.launch.x - (v.vx / 6.2) * e, y: s.launch.y - (v.vy / 6.2) * e };
        },
        { v, n, i },
      ),
    );
  const release = () =>
    page.evaluate(() => {
      const s = window.__app.scene;
      const d = s.drawnAim;
      s.aimFrom = s.aimTo = s.drawnAim = null;
      if (!d || !s.canAim()) return false;
      s.fire(d.vx, d.vy, d);
      return true;
    });
  /** Keep filming until the launcher is ready again. */
  const untilReady = async (max = 90) => {
    for (let i = 0; i < max && !(await page.evaluate(() => window.__app.scene.canAim())); i++) await shoot(1);
  };
  /**
   * The best pull `dt` round-seconds from now (the planet keeps turning while the finger pulls):
   * kind 'land' → onto sector sec with a sweeping line; 'mist' → a line that curls through the Magnet Mist.
   */
  const pullAhead = (o) =>
    page.evaluate(async ({ sec, dt, kind, horizon }) => {
      const P = window.__play;
      const s = P.scene();
      const sky = await import('/src/core/sky.ts');
      const saved = [s.time, s.rot];
      const st = s.roundState();
      let best = null;
      // the planet's turn over the next seconds (Wobbly Spin changes speed, so integrate it)
      const rotAt = (d) => {
        let r = saved[1];
        const h = 1 / 240;
        for (let u = 0; u < d; u += h) r += s.spinNow(saved[0] + u) * Math.min(h, d - u);
        return r;
      };
      for (let extra = 0; extra <= (horizon || 0) + 1e-9; extra += 0.1) {
        const T = saved[0] + dt + extra;
        s.time = T;
        s.rot = rotAt(dt + extra);
        const mist =
          kind === 'mist'
            ? sky
                .skyShapesAt(s.L.sky, s.skyState, { cx: s.cx, cy: s.cy, R: s.R, width: s.w, height: s.h, launcherY: s.launch.y }, T)
                .find((x) => x.kind === 'mist')
            : null;
        const rows = P.sweep(
          (row, path) =>
            row.hit === 'land' &&
            (kind !== 'land' || row.sector === sec) &&
            P.clearLine(path) &&
            path.points[path.points.length - 1].elapsed < 2.4,
          2,
          0.04,
        );
        for (const row of rows) {
          const res = P.round.previewStep(
            st,
            { kind: s.cur, sector: row.sector, nova: P.round.novaForThrow(st) },
            s.roundModifiers(),
            s.rules,
          );
          if (res.lost.length || res.after <= res.before) continue;
          // a landing that earns the first star would put the "Finish" button over the Keeper
          let score = res.after - res.before + res.spawned.length * 10 - (P.stars(res.state) > 0 ? 1000 : 0);
          if (mist) {
            if (!row.path.points.some((q) => Math.hypot(q.x - mist.x, q.y - mist.y) < mist.r * 0.9)) continue;
            score += 60;
          }
          if (kind === 'land') score = Math.min(40, row.n / 6) - (P.stars(res.state) > 0 ? 1000 : 0);
          if (!best || score > best.score) best = { extra, vx: row.vx, vy: row.vy, sector: row.sector, score };
        }
        if (kind === 'land' && best) break;
      }
      s.time = saved[0];
      s.rot = saved[1];
      return best;
    }, o);
  /** One throw on camera: wait `lead` frames, pull for `pull` frames, hold `hold`, release, watch `after`. */
  const fling = async ({ sec, kind = 'land', pull = 16, hold = 4, after = 80, lead = 0, horizon = 0 }) => {
    await untilReady();
    // aim for the moment of release (the planet keeps turning while the finger holds)
    const dt = (lead + pull + hold) / FPS;
    const v = await pullAhead({ sec, dt, kind, horizon: kind === 'land' ? 1.5 : horizon });
    if (!v) throw new Error(`no pull for ${kind} ${sec ?? ''}`);
    await shoot(lead + Math.round(v.extra * FPS));
    await drag(v, pull);
    const posterAt = frameNo - 1;
    await shoot(hold);
    if (!(await release())) throw new Error('the aim was not drawn');
    await shoot(after);
    return posterAt;
  };
  const bestOption = async (filter) => {
    const opts = await page.evaluate(() => window.__play.options());
    return opts.filter(filter).sort((a, b) => b.delta + 12 * b.spawned.length - (a.delta + 12 * a.spawned.length))[0];
  };

  // --- A: the fling (planet 24): pull back, aim tag, release, the land blooms and a friend moves in
  await page.evaluate((n) => window.__play.start(n), 24);
  let pl = await plan(page, { depth: 2, beam: 30, score: GROW_UNDER_STAR, final: NO_FINISH });
  await run(page, pl.path);
  let pick = await bestOption((o) => !o.lost && o.spawned.length && o.delta > 0 && !o.reaction);
  await pause();
  mark('fling');
  const posterAt = await fling({ sec: pick.sec, lead: 16, pull: 20, hold: 8, after: 84 });

  // --- B: the next throw, more friends move in
  pick = await bestOption((o) => !o.lost && o.stars === 0);
  mark('friends');
  await fling({ sec: pick.sec, lead: 4, pull: 14, hold: 4, after: 86 });

  // --- C: a Fusion, then a Fusion that chains a Combo (planet 34)
  await resume();
  await page.evaluate((n) => window.__play.start(n), 34);
  pl = await plan(page, {
    depth: 7,
    beam: 40,
    score: `const f = res.reactions[0] && res.reactions[0].id !== 'scorch' ? 1 : 0;
      if (ctx.stars(res.state) > 0) return -5000;
      return f * 40 + res.combo.step * 70 + (res.after - res.before) * 0.3 + res.spawned.length * 2 - res.lost.length * 30;`,
    final: NO_FINISH,
  });
  let at = pl.path.findIndex((p) => p.step >= 3);
  if (at < 0) at = pl.path.reduce((b, p, i) => (p.step > pl.path[b].step ? i : b), 0);
  const from = Math.max(0, at - 1);
  log('  video fusion plan', fmtPath(pl.path.slice(0, at + 1)));
  await run(page, pl.path.slice(0, from));
  await pause();
  mark('fusion');
  for (const step of pl.path.slice(from, at + 1))
    await fling({ sec: step.sec, lead: 4, pull: 12, hold: 3, after: step === pl.path[at] ? 72 : 46 });

  // --- D: the sky: a throw that curls through the Magnet Mist (planet 46)
  await resume();
  await page.evaluate((n) => window.__play.start(n), 46);
  pl = await plan(page, { depth: 2, beam: 30, score: GROW_UNDER_STAR, final: NO_FINISH });
  await run(page, pl.path);
  await pause();
  mark('sky');
  await fling({ kind: 'mist', lead: 6, pull: 16, hold: 8, after: 72, horizon: 5 });

  // --- E: the Homeworld, a finger gives it a slow spin
  await resume();
  await page.evaluate(() => window.__app.selectTab('homeworld'));
  await page.waitForFunction(() => window.__app.screen === 'homeworld');
  await sleep(800);
  await pause();
  mark('homeworld');
  const cv = await page.evaluate(() => {
    // the planet canvas (the biggest one; the top bar's Keeper head is a canvas too)
    const c = [...document.querySelectorAll('.host .screen canvas')].sort(
      (a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight,
    )[0];
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.5 };
  });
  await shoot(24);
  await page.mouse.move(cv.x + 110, cv.y + 10);
  await page.mouse.down();
  for (let i = 0; i < 44; i++) {
    await page.mouse.move(cv.x + 110 - i * 5, cv.y + 10 + Math.sin(i / 9) * 5);
    await shoot(1);
  }
  await page.mouse.up();
  await shoot(66);
  mark('end');
  await ctx.close();
  if (errors.length) log('video page errors:', errors.slice(0, 5));
  log(`video: ${frameNo} frames`, JSON.stringify(segments));
  const take = { frames, total: frameNo, segments, posterAt };
  writeFileSync(join(frames, 'take.json'), JSON.stringify(take));
  return take;
}

function encodePreview({ frames, total, segments, posterAt }) {
  const outDir = join(STORE, 'preview');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'app-preview-en.mp4');
  // the segments are separate recordings: join them with short crossfades
  // 'friends' continues the fling shot, so only real scene changes get a crossfade
  const cuts = segments.filter((s) => s.name !== 'end' && s.name !== 'friends');
  const endAt = segments.find((s) => s.name === 'end').at;
  const parts = cuts.map((s, i) => ({ from: s.at, to: i + 1 < cuts.length ? cuts[i + 1].at : endAt }));
  const fade = 0.3;
  const filters = [];
  parts.forEach((p, i) => filters.push(`[0:v]trim=start_frame=${p.from}:end_frame=${p.to},setpts=PTS-STARTPTS,fps=${VIDEO.fps}[p${i}]`));
  let last = 'p0';
  let offset = (parts[0].to - parts[0].from) / VIDEO.fps;
  for (let i = 1; i < parts.length; i++) {
    const tag = `x${i}`;
    offset -= fade;
    filters.push(`[${last}][p${i}]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)}[${tag}]`);
    offset += (parts[i].to - parts[i].from) / VIDEO.fps;
    last = tag;
  }
  // a gentle fade out on the Homeworld, and exactly 886×1920
  filters.push(`[${last}]fade=t=out:st=${(offset - 0.4).toFixed(3)}:d=0.4,scale=886:1920:flags=lanczos,format=yuv420p[v]`);
  execFileSync(FFMPEG, [
    '-loglevel',
    'error',
    '-y',
    '-framerate',
    String(VIDEO.fps),
    '-i',
    join(frames, 'f%05d.png'),
    '-f',
    'lavfi',
    '-i',
    'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[v]',
    '-map',
    '1:a',
    // Apple's App Preview spec: H.264 High, 10-12 Mbps, ≤ 30 fps; stereo AAC 256 kbps at 44.1 kHz (silent here)
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-level',
    '4.0',
    '-preset',
    'slow',
    '-b:v',
    '10M',
    '-maxrate',
    '12M',
    '-bufsize',
    '24M',
    '-r',
    String(VIDEO.fps),
    '-c:a',
    'aac',
    '-b:a',
    '256k',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-shortest',
    '-movflags',
    '+faststart',
    out,
  ]);
  const poster = join(outDir, 'poster-en.png');
  if (posterAt !== null && posterAt !== undefined) flatten(join(frames, `f${String(posterAt).padStart(5, '0')}.png`), poster);
  const probe = JSON.parse(
    execFileSync(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', out], { encoding: 'utf8' }),
  );
  const vs = probe.streams.find((s) => s.codec_type === 'video');
  const as = probe.streams.find((s) => s.codec_type === 'audio');
  const summary = {
    file: out,
    size: `${(statSync(out).size / 1e6).toFixed(1)} MB`,
    video: `${vs.codec_name} ${vs.profile} ${vs.width}×${vs.height} ${vs.r_frame_rate} ${vs.pix_fmt}`,
    audio: as ? `${as.codec_name} ${as.sample_rate} Hz ${as.channels} ch` : 'none',
    duration: `${Number(probe.format.duration).toFixed(2)} s`,
    poster,
  };
  log('preview', JSON.stringify(summary));
  return summary;
}

// ------------------------------------------------------------------ main
export { SEED_LIB, PLAY_LIB, PROFILE, openGame, plan, run, fmtPath, ensureServer };
export const setBrowser = (b) => (browser = b);
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain)
  try {
    if (ONLY.includes('raw') || ONLY.includes('video')) await ensureServer();
    browser = await chromium.launch();
    if (ONLY.includes('raw')) for (const lang of LANGS) await captureRaw(lang);
    if (ONLY.includes('compose')) {
      await compose(LANGS);
      const problems = verifyScreens(LANGS);
      log(problems.length ? `verify: ${problems.join('; ')}` : `verify: ${LANGS.length * 8} screenshots are 1320×2868 RGB without alpha`);
    }
    if (ONLY.includes('sheet') && LANGS.includes('en')) contactSheet();
    if (ONLY.includes('video')) encodePreview(await recordPreview());
    else if (ONLY.includes('encode')) encodePreview(JSON.parse(readFileSync(join(RAW, 'video', 'take.json'), 'utf8')));
  } finally {
    await browser?.close();
    server?.kill();
  }
