#!/usr/bin/env node
// Comet Garden store art v2 ("Sticker Scrapbook"): the raw captures of the production spec, section 9.
//
// Every frame is the real game in the dev-only marketing capture mode (src/ui/devcapture.ts): the HUD strip,
// currency pills, goals row, tooltip line, Lifebook progress / album / gem line / counts, the Homeworld panel,
// tab bar and badges, and Grown-ups' Restore / Help / Clear are hidden with injected CSS (visibility only, so
// nothing moves); the new-creature card drops its gem and rarity word; canvases render at the full 3×.
//
//   node store/tools/scrapbook-capture.mjs --langs=en --raw=/some/dir/{lang}
//   node store/tools/scrapbook-capture.mjs --langs=es,fr,de,pt,ja --raw=/some/dir/{lang}   # replays the EN run
//   node store/tools/scrapbook-capture.mjs --langs=en --only=6,7            # a subset (p = planet P: 2a, 1, 2b, 3)
//
// Captures (raw 1320×2868 PNG, straight from the page):
//   m2a-bare  m1-fling  m2b-lush  m3-friend      planet P, one seeded run ("one planet, one day")
//   m4-fusion  m5-sky  [m5b-troubles]  m6-homeworld  m7-lifebook  m8a-grownups  m8b-gate (+ m8b-gate.json)
// The run log (planet P, its plan with swaps, clocks and holds) goes to <raw>/capture-log.json. A locale other
// than EN replays the plan found in <raw with lang=en>/capture-log.json, so only the text differs.
// Uses the Vite dev server on --port (5191); it is started if nothing answers there.

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGame, prepareHomeworld, ensureServer, stopServer, setBrowser, fmtPath, plan as planScene, run as runScene } from './shots.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const LANGS = String(args.langs ?? 'en').split(',');
const RAW = String(args.raw ?? join(ROOT, 'test-results', 'store-raw-v2', '{lang}'));
const ONLY = args.only ? String(args.only).split(',') : ['p', '4', '5', '6', '7', '8'];
if (args['5b'] && !ONLY.includes('5b')) ONLY.push('5b');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rawDir = (lang) => RAW.replace('{lang}', lang);

// ------------------------------------------------------------------ capture-mode CSS (section 9.1)
// visibility (never display) so every layout, popup placement and banner position stays exactly as in play
const MK_CSS = `
.hud-top > button.icon, .pill.dust, .pill.gems, .goals, .trouble-forecast, .hud-diff, .obj-desc,
.progress, .album-link, .scroll > p.muted:has(+ .lb-sec), .sec-title small,
.homeworld .topbar, .homeworld .hw-panel, .homeworld .hw-landmark-summary, nav.main-tabs, .nb,
.grownups-section:has(.btn.danger) { visibility: hidden !important; }
.hint-hand { animation: none !important; opacity: 1 !important; }`;

/**
 * Locales whose NEW-1 shows no tutorial hint. The game's hint block is 128 px wide (src/styles.css .hint), so JA
 * "ひっぱって、はなして投げよう" breaks as "ひっぱって、はな / して投げよう", inside はなして ("let go"): an awkward break
 * we may not repaint. Drop a locale from here once the game's string or CSS breaks at the phrase boundary.
 */
const NO_HINT = ['ja'];

/** What must be hidden on each screen (R4: fail loudly when a class name drifts). */
const MUST_HIDE = {
  level: ['.hud-top > button.icon', '.goals', '.trouble-forecast', '.obj-desc'],
  lifebook: ['.progress', '.album-link', '.scroll > p.muted:has(+ .lb-sec)', '.sec-title small', '.pill.dust', '.pill.gems'],
  homeworld: ['.homeworld .topbar', '.homeworld .hw-panel', '.homeworld .hw-landmark-summary', 'nav.main-tabs'],
  grownups: ['.grownups-section:has(.btn.danger)', '.pill.dust', '.pill.gems'],
};
async function assertHidden(page, screen) {
  const bad = await page.evaluate((sels) => {
    const out = [];
    for (const sel of sels) {
      const els = [...document.querySelectorAll(sel)];
      if (!els.length) out.push(`${sel}: no match`);
      else if (els.some((el) => getComputedStyle(el).visibility !== 'hidden')) out.push(`${sel}: visible`);
    }
    return out;
  }, MUST_HIDE[screen]);
  if (bad.length) throw new Error(`capture mode on ${screen}: ${bad.join('; ')}`);
}

// ------------------------------------------------------------------ page-side helpers (extend window.__play)
const CAPTURE_LIB = String.raw`
(() => {
  const P = window.__play;
  const TAU = Math.PI * 2;
  P.norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  /** Start planet n as a fresh scene (also when the current one is the same planet) and wait for layout. */
  P.fresh = async (n) => {
    const old = window.__app.scene;
    window.__app.startLevel(n);
    for (let i = 0; i < 600; i++) {
      const s = window.__app.scene;
      if (s && s !== old && s.L.n === n && window.__scene && s.w > 0 && s.R > 20) break;
      await P.raf();
    }
    const ok = await P.ready();
    const s = P.scene();
    if (s.o) s.o.buddy = null; // marketing: no Buddy in the level (the card window would slice it)
    for (let i = 0; i < 3; i++) await P.raf();
    return ok && s.w > 0;
  };
  /** Screen angle of sector i at spin rot. */
  P.angleOf = (i, rot) => P.norm(rot + (i + 0.5) * (TAU / 24));
  /** Marketing: the level draws no Buddy (it would be sliced by the card window). */
  P.noBuddy = () => { const s = P.scene(); if (s && s.o) s.o.buddy = null; };
  const counts = (state) => {
    const S = state.planet.sectors;
    const GREEN = ['meadow', 'forest', 'jungle', 'highland', 'marsh', 'taiga', 'reef', 'springs', 'ocean'];
    return { grown: S.filter((x) => x.biome !== 'barren').length, bare: S.filter((x) => x.biome === 'barren').length,
      residents: S.filter((x) => x.species).length, bunny: S.some((x) => x.species === 'bunny'),
      green: S.filter((x) => GREEN.includes(x.biome)).length, hot: S.filter((x) => x.biome === 'volcano' || x.biome === 'desert').length,
      species: [...new Set(S.filter((x) => x.species).map((x) => x.species))] };
  };
  P.counts = () => counts(P.scene().roundState());
  const summary = (res, kind, sec, swap) => ({
    sec, kind, swap, delta: res.after - res.before,
    spawned: res.spawned.map((x) => x.id), at: res.spawned.map((x) => x.at), first: res.firstArrivals, lost: res.lost.length,
    reaction: res.reactions[0] ? res.reactions[0].id : null, step: res.combo.step, links: res.combo.links,
    super: !!res.combo.superFusion, nova: res.novaFired,
    trouble: res.troubleEvents.map((e) => e.id + ':' + e.kind + ':' + (e.by || '')),
    ...counts(res.state), stars: P.stars(res.state),
  });
  /**
   * Beam search that may swap the current and next object before a throw (the HUD swap is free), so a
   * Rain Cloud can wait until it lands somewhere useful. Returns the best paths; each step says whether to swap.
   */
  P.planHand = ({ depth, beam = 50, score, final }) => {
    const s = P.scene();
    const mods = s.roundModifiers();
    const rules = s.rules;
    const Q = s.L.queue;
    const ctx = { seen: new Set(window.__app.p.seen), stars: P.stars, L: s.L, round: P.round, mods, rules, depth };
    const scoreFn = new Function('res', 'k', 'path', 'ctx', score);
    const finalFn = final ? new Function('state', 'path', 'ctx', final) : null;
    let beams = [{ state: s.roundState(), total: 0, path: [], cur: s.cur, next: s.next, qi: s.qi }];
    for (let k = 0; k < depth; k++) {
      const out = [];
      for (const b of beams)
        for (const swap of b.cur === b.next ? [false] : [false, true]) {
          const kind = swap ? b.next : b.cur;
          const cur = swap ? b.cur : b.next;
          const next = Q[b.qi % Q.length];
          for (let sec = 0; sec < 24; sec++) {
            const st = { ...b.state, throwsLeft: 99 };
            const res = P.round.stepRound(st, { kind, sector: sec, nova: P.round.novaForThrow(st) }, mods, rules);
            const path = [...b.path, summary(res, kind, sec, swap)];
            out.push({ state: res.state, total: b.total + scoreFn(res, k, path, ctx), path, cur, next, qi: b.qi + 1 });
          }
        }
      out.sort((a, b) => b.total - a.total);
      const keys = new Set();
      const kept = [];
      for (const n of out) {
        const key = JSON.stringify(n.state.planet.sectors.map((x) => [x.biome, x.species])) + n.state.combo.links + n.cur + n.next + n.state.nova.charge;
        if (keys.has(key)) continue;
        keys.add(key);
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
  /** Species by sector after the first n planned steps (pure rules, from the current round state). */
  P.simulate = (steps, n) => {
    const s = P.scene();
    let st = s.roundState();
    for (const step of steps.slice(0, n)) {
      const t = { ...st, throwsLeft: 99 };
      st = P.round.stepRound(t, { kind: step.kind, sector: step.sec, nova: P.round.novaForThrow(t) }, s.roundModifiers(), s.rules).state;
    }
    return st.planet.sectors.map((x) => x.species);
  };
  /** Play one planned step (swap first if the plan says so). */
  P.step = async (st) => {
    const s = P.scene();
    await P.ready();
    if (st.swap) s.swap();
    if (s.cur !== st.kind) return { ok: false, want: st, cur: s.cur };
    return P.throwAt(st.sec);
  };
  P.runSteps = async (steps) => {
    const out = [];
    for (const st of steps) out.push(await P.step(st));
    return out;
  };
  /** The drawn aim tag's box (CSS px), or null. Synchronous, so no frame can run in between. */
  P.tagBox = () => {
    const s = P.scene();
    if (!s.aimTagPosition || !s.predictCache) return null;
    const z = P.AT.aimTagSize(s.predictCache.facts, s.w);
    return { x: s.aimTagPosition.x, y: s.aimTagPosition.y, w: z.width, h: z.height };
  };
  P.initCapture = async () => {
    P.AT = await import('/src/ui/aimtag.ts');
    P.SKY = await import('/src/core/sky.ts');
    P.FLIGHT = await import('/src/core/flight.ts');
  };
  const bend = (path) => {
    const a = path.points[0];
    const b = path.points[path.points.length - 1];
    let m = 0;
    for (const q of path.points) m = Math.max(m, Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y));
    return m;
  };
  /** Draw an aim for probing (no freeze); returns the tag box. */
  const probe = (c) => {
    const s = P.scene();
    s.time = c.T;
    s.rot = c.rot;
    s.predictCache = null;
    s.aimTagPosition = null;
    s.aimFrom = { x: s.launch.x, y: s.launch.y };
    s.aimTo = { x: s.launch.x - c.vx / 6.2, y: s.launch.y - c.vy / 6.2 };
    s.drawnAim = null;
    s.draw();
    return P.tagBox();
  };
  const tagOk = (t, box) => !!t && t.x * 3 >= box[0] && (t.x + t.w) * 3 <= box[2] && t.y * 3 >= box[1] && (t.y + t.h) * 3 <= box[3];
  /**
   * Hold an aim at sector sec with the planet turned to one of phis: the line must run up the right half
   * (at most leftMax of its points left of the launcher) and the aim tag must sit inside box (raw px).
   */
  P.holdRight = async ({ sec, phis, T, box, leftMax = 0.15, avoid = [] }) => {
    P.freeze(); // no frame may run while candidates are probed
    const inAvoid = (q, m = 8) => avoid.some((r) => q.x > r[0] / 3 - m && q.x < r[2] / 3 + m && q.y > r[1] / 3 - m && q.y < r[3] / 3 + m);
    const s = P.scene();
    const saved = [s.time, s.rot];
    const cands = [];
    phis.forEach((phi, i) => {
      s.time = T + i * 0.01;
      s.rot = P.rotFor(sec, phi);
      const rows = P.sweep((row, path) => row.hit === 'land' && row.sector === sec && P.clearLine(path));
      for (const row of rows) {
        const pts = row.path.points;
        const left = pts.filter((q) => q.x < s.w / 2).length / pts.length;
        if (left > leftMax) continue;
        const hits = pts.filter((q) => inAvoid(q)).length;
        cands.push({ phi, T: s.time, rot: s.rot, vx: row.vx, vy: row.vy, left: +left.toFixed(3), bend: Math.round(bend(row.path)), n: row.n, hits,
          score: 2 * Math.min(bend(row.path), 150) - hits * 3 });
      }
    });
    cands.sort((a, b) => b.score - a.score);
    let best = null;
    const clearOf = (t) => !avoid.some((r) => t.x * 3 < r[2] + 12 && (t.x + t.w) * 3 > r[0] - 12 && t.y * 3 < r[3] + 12 && (t.y + t.h) * 3 > r[1] - 12);
    for (const c of cands.slice(0, 300)) {
      const t = probe(c);
      if (tagOk(t, box) && clearOf(t)) { best = { ...c, tag: t }; break; }
    }
    s.aimFrom = s.aimTo = s.drawnAim = null;
    s.time = saved[0];
    s.rot = saved[1];
    s.predictCache = null;
    s.aimTagPosition = null;
    if (!best) {
      P.resume();
      return { ok: false, tried: cands.length };
    }
    P.setClock(best.T, best.rot);
    const held = P.holdAndFreeze({ vx: best.vx, vy: best.vy });
    const tag = P.tagBox();
    return { ok: tagOk(tag, box), best, held, tag };
  };
  /** Magnet Mist: the line curls through the mist, lands well, and the aim tag sits inside box (raw px). */
  P.mistRight = async ({ T0 = 700, samples = 24, step = 0.9, box }) => {
    P.freeze(); // no frame may run while candidates are probed
    const s = P.scene();
    const sky = P.SKY;
    const flight = P.FLIGHT;
    const saved = [s.time, s.rot];
    const st = s.roundState();
    const seen = new Set(window.__app.p.seen);
    const cands = [];
    for (let k = 0; k < samples; k++) {
      const T = T0 + k * step;
      s.time = T;
      s.rot = (T * s.L.spin) % TAU;
      const mist = sky.skyShapesAt(s.L.sky, s.skyState, { cx: s.cx, cy: s.cy, R: s.R, width: s.w, height: s.h, launcherY: s.launch.y }, T).find((x) => x.kind === 'mist');
      if (!mist) continue;
      const clearWorld = { ...s.flightWorld(s.rot), sky: undefined };
      const rows = P.sweep((row, path) => row.hit === 'land' && P.clearLine(path) && path.points[path.points.length - 1].elapsed < 2.6, 2, 0.04);
      for (const row of rows) {
        if (!row.path.points.some((q) => Math.hypot(q.x - mist.x, q.y - mist.y) < mist.r * 0.9)) continue;
        const clear = flight.flyFull(flight.STAR_SLING, { ...s.launch, vx: row.vx, vy: row.vy, elapsed: 0 }, clearWorld, s.time);
        const end = row.path.points[row.path.points.length - 1];
        const cend = clear.points[clear.points.length - 1];
        const curl = Math.hypot(end.x - cend.x, end.y - cend.y);
        const res = P.round.previewStep(st, { kind: s.cur, sector: row.sector, nova: P.round.novaForThrow(st) }, s.roundModifiers(), s.rules);
        if (res.lost.length || res.after <= res.before || res.spawned.some((x) => !seen.has(x.id))) continue;
        cands.push({ T, rot: s.rot, vx: row.vx, vy: row.vy, sector: row.sector, curl: Math.round(curl), delta: res.after - res.before,
          spawned: res.spawned.map((x) => x.id), score: Math.min(90, curl) + (res.after - res.before) * 0.4 + res.spawned.length * 12 });
      }
    }
    cands.sort((a, b) => b.score - a.score);
    let best = null;
    for (const c of cands.slice(0, 300)) {
      const t = probe(c);
      if (tagOk(t, box)) { best = { ...c, tag: t }; break; }
    }
    s.aimFrom = s.aimTo = s.drawnAim = null;
    s.time = saved[0];
    s.rot = saved[1];
    s.predictCache = null;
    s.aimTagPosition = null;
    if (!best) {
      P.resume();
      return { ok: false, tried: cands.length };
    }
    P.setClock(best.T, best.rot);
    const held = P.holdAndFreeze({ vx: best.vx, vy: best.vy });
    const tag = P.tagBox();
    return { ok: tagOk(tag, box), best, held, tag };
  };
  /**
   * Choose the fire moment for sector sec so that, capF seconds after landing, sector target sits at screen
   * angle want (radians). The planet keeps turning in flight, so iterate on the predicted flight time.
   */
  P.aimForAngle = (sec, target, want, T, capAfter) => {
    const s = P.scene();
    const saved = [s.time, s.rot];
    const endFor = (phi) => {
      s.time = T;
      s.rot = P.rotFor(sec, phi);
      s.predictCache = null;
      const v = P.vectorFor(sec);
      if (!v) return null;
      const path = s.predict(v.vx, v.vy);
      const tf = path.points[path.points.length - 1].elapsed;
      // the planet's turn until the capture (Wobbly Spin changes speed, so integrate spinNow)
      let turn = 0;
      const h = 1 / 240;
      for (let u = 0; u < tf + capAfter; u += h) turn += s.spinNow(T + u) * Math.min(h, tf + capAfter - u);
      const endAngle = P.angleOf(target, s.rot + turn);
      return { phi, rot: s.rot, tf, endAngle, err: P.norm(want - endAngle) };
    };
    // scan every fire angle (some sectors are reachable only from some sides), then refine the closest
    let best = null;
    for (let phi = -Math.PI; phi < Math.PI; phi += 0.05) {
      const r = endFor(phi);
      if (r && (!best || Math.abs(r.err) < Math.abs(best.err))) best = r;
    }
    for (let it = 0; best && it < 4 && Math.abs(best.err) > 0.01; it++) {
      const r = endFor(best.phi + best.err);
      if (r && Math.abs(r.err) < Math.abs(best.err)) best = r;
      else break;
    }
    s.time = saved[0];
    s.rot = saved[1];
    s.predictCache = null;
    return best;
  };
  /** Boxes of the popups drawn in the last frame (raw px). */
  P.popupBoxes = () => {
    const s = P.scene();
    const g = document.createElement('canvas').getContext('2d');
    return s.popups.map((p) => {
      const k = p.life / p.max;
      const sc = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
      const fontSize = Math.round(p.size * sc);
      g.font = '700 ' + fontSize + 'px Fredoka, ui-rounded, system-ui, sans-serif';
      const half = Math.min(s.w / 2 - 8, g.measureText(p.text).width / 2 + 8);
      const h = fontSize + 14;
      return { text: p.text, box: [(p.x - half) * 3, (p.y - h / 2) * 3, (p.x + half) * 3, (p.y + h / 2) * 3].map(Math.round) };
    });
  };
  P.rectOf = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.left * 3, r.top * 3, r.right * 3, r.bottom * 3].map(Math.round);
  };
})();`;

// ------------------------------------------------------------------ planet P (section 9.2)
const P_CANDIDATES = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const TARGETS = ['octopus', 'flamingo'];
/** One step's score: grow, never meet a new species early, no star before NEW-1, the last throw brings the friend. */
const P_SCORE = `
  const first = res.spawned.filter((x) => !ctx.seen.has(x.id)).map((x) => x.id);
  const S = res.state.planet.sectors;
  const grown = S.filter((x) => x.biome !== 'barren').length;
  const residents = S.filter((x) => x.species).length;
  if (k < ctx.depth - 1) {
    if (first.length) return -30000;
    if (k < 6 && ctx.stars(res.state) > 0) return -30000;
    const clash = res.reactions.some((r) => r.id === 'scorch');
    let v = (res.after - res.before) + res.spawned.length * 9 - res.lost.length * 60 - (res.novaFired ? 60 : 0) - (res.reactions.length ? 10 : 0) - (clash ? 120 : 0);
    if (res.spawned.some((x) => x.id === 'bunny')) v += 12;
    // NEW-1 needs one mid-growth moment: >= 35% grown, >= 3 residents, >= 40% still bare, no star yet
    const mid = (p) => p.grown >= 9 && p.residents >= 3 && p.bare >= 10 && p.stars === 0;
    if (k <= 6 && mid(path[k]) && !path.slice(0, k).some(mid)) v += 250 + (path[k].bunny ? 60 : 0);
    if (k === ctx.depth - 2) v += (grown >= 20 ? 600 : grown * 20) + (residents >= 7 ? 300 : residents * 30) + path[k].green * 30 - path[k].hot * 30;
    return v;
  }
  const hit = first.length === 1 && ${JSON.stringify(TARGETS)}.includes(first[0]);
  return hit && !res.lost.length && !res.novaFired ? 20000 + (res.after - res.before) - 25 * (res.spawned.length - 1) - (res.reactions.length ? 40 : 0) : -30000;`;

async function pickPlanetP(page) {
  const rows = await page.evaluate(async (cands) => {
    const L = await import('/src/core/levels.ts');
    return cands.map((n) => {
      const lv = L.makeLevel(n);
      return {
        n,
        normal: L.difficultyOf(n) === 'normal',
        twist: lv.twist,
        troubles: lv.troubles.length,
        bare: lv.start.sectors.every((s) => s.biome === 'barren' && s.water === 0),
        throws: lv.throws,
        seedAt: lv.queue.indexOf('seed'),
        iceAt: lv.queue.indexOf('ice'),
      };
    });
  }, P_CANDIDATES);
  const ok = rows.filter((r) => r.normal && r.twist === 'none' && r.troubles === 0 && r.bare && r.throws >= 12);
  log('  planet P candidates', JSON.stringify(ok));
  return ok;
}

/** Every valid plan on candidate n (one per depth): { n, depth, path, k1, arrival }. */
async function planP(page, n) {
  await page.evaluate((n) => window.__play.fresh(n), n);
  const throws = await page.evaluate(() => window.__play.scene().throwsLeft);
  const found = [];
  for (let depth = 8; depth <= Math.min(14, throws - 1); depth++) {
    const [best] = await page.evaluate((o) => window.__play.planHand(o), { depth, beam: 50, score: P_SCORE });
    if (!best || best.total < 10000) continue;
    const path = best.path;
    const last = path.at(-1);
    const before = path.at(-2);
    if (!(before.grown >= 20 && before.residents >= 7)) continue;
    // NEW-1: the first moment with >= 35% grown, >= 3 residents, >= 40% bare and no star (prefer a bunny)
    const mids = path
      .slice(0, -2)
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => p.grown >= 9 && p.residents >= 3 && p.bare >= 10 && p.stars === 0);
    if (!mids.length) continue;
    const mid = mids.find(({ p }) => p.bunny) ?? mids[0];
    found.push({
      n,
      depth,
      total: best.total,
      path,
      k1: mid.i + 1,
      bunny: mid.p.bunny,
      arrival: {
        species: last.spawned.find((id) => TARGETS.includes(id)),
        at: last.at[last.spawned.findIndex((id) => TARGETS.includes(id))],
      },
    });
  }
  return found;
}
/** The calmest arrival: the friend alone, no Fusion on that throw, a bunny at NEW-1, fewer Supernovas, fewer throws. */
const planRank = (r) => {
  const last = r.path.at(-1);
  const lush = r.path.at(-2);
  // a friend who wandered off stays as a ghost with a wish bubble for 3 throws: keep 2b and 3 free of them
  const ghosts = r.path.slice(-4).filter((p) => p.lost).length;
  return (
    ghosts * 150 +
    (last.spawned.includes('octopus') ? 0 : 15) +
    (last.spawned.length - 1) * 100 +
    (last.reaction ? 60 : 0) +
    (r.bunny ? 0 : 40) +
    r.path.filter((p) => p.nova).length * 10 +
    r.path.filter((p) => p.reaction === 'scorch').length * 50 +
    r.depth +
    (24 - lush.green) * 12 +
    lush.hot * 12
  );
};

async function capturePlanetP(page, lang, dir, logOut, reuse) {
  let run = reuse;
  if (!run) {
    const all = [];
    for (const r of await pickPlanetP(page)) {
      const found = await planP(page, r.n);
      for (const f of found)
        log(
          `  planet ${r.n} depth ${f.depth}: rank ${planRank(f)}, NEW-1 after ${f.k1}, ${f.arrival.species} at sector ${f.arrival.at}, lush green ${f.path.at(-2).green} hot ${f.path.at(-2).hot} residents ${f.path.at(-2).residents}`,
        );
      all.push(...found);
    }
    all.sort((a, b) => planRank(a) - planRank(b));
    run = all[0];
    if (!run) throw new Error('no planet P plan (spec R3: relax the arrival species or take NEW-3 from planet 22)');
  }
  logOut.P = {
    n: run.n,
    seed: `PP${run.n}`,
    depth: run.depth,
    k1: run.k1,
    arrival: run.arrival,
    plan: run.plan ?? fmtPath(run.path),
    steps: run.path.map((p) => ({ sec: p.sec, kind: p.kind, swap: p.swap })),
    replayed: !!reuse,
  };
  log('  P plan', logOut.P.plan);
  const steps = run.path;

  // NEW-2a: stage 0
  await page.evaluate((n) => window.__play.fresh(n), run.n);
  // One spin for 2a and 2b: the future friend's sector near the right rim (spec: -0.3), nudged so that in 2b no
  // resident is sliced by the 900 px "after" window and none sits under the deer sticker at its lower left
  const pickRot = await page.evaluate(
    ({ steps, at }) => {
      const P = window.__play;
      const s = P.scene();
      const species = P.simulate(steps, steps.length - 1);
      const R = s.R * 3;
      let best = null;
      for (let phi = -0.7; phi <= 0.31; phi += 0.02) {
        const rot = P.rotFor(at, phi);
        let cost = Math.abs(phi + 0.3) * 20;
        species.forEach((sp, i) => {
          if (!sp) return;
          const a = P.angleOf(i, rot);
          const x = 660 + Math.cos(a) * R * 1.14;
          const y = 1233 + Math.sin(a) * R * 1.14;
          cost += Math.max(0, Math.abs(x - 660) + 50 - 450) * 4; // sliced by the after window (raw x 210–1110)
          if (x < 345 && y > 1380) cost += 400; // under the deer sticker
        });
        if (!best || cost < best.cost) best = { phi: +phi.toFixed(2), rot, cost: Math.round(cost) };
      }
      return best;
    },
    { steps: steps.map((p) => ({ sec: p.sec, kind: p.kind })), at: run.arrival.at },
  );
  const rot0 = pickRot.rot;
  logOut.rot0 = pickRot;
  log('  2a/2b spin', JSON.stringify(pickRot));
  await assertHidden(page, 'level');
  await page.evaluate(
    ({ rot }) => {
      window.__play.setClock(600, rot);
      window.__play.scene().draw();
      window.__play.freeze();
    },
    { rot: rot0 },
  );
  await sleep(120);
  const a = await page.evaluate(() => ({
    counts: window.__play.counts(),
    cx: window.__play.scene().cx * 3,
    cy: window.__play.scene().cy * 3,
    R: window.__play.scene().R * 3,
    popups: window.__play.scene().popups.length,
    discover: !!document.querySelector('.level .discover.show'),
  }));
  await page.screenshot({ path: join(dir, 'm2a-bare.png') });
  logOut.m2a = { T: 600, rot: rot0, ...a };
  log('  NEW-2a', JSON.stringify(logOut.m2a));
  await page.evaluate(() => window.__play.resume());

  // NEW-1: mid-growth, the aim held with the tutorial hint
  let res = await page.evaluate((st) => window.__play.runSteps(st), steps.slice(0, run.k1));
  if (res.some((r) => !r.ok)) throw new Error('P throws went astray: ' + JSON.stringify(res));
  // hold the object the plan throws next (swap first if the plan does); if nothing friendly, the other one
  const planned = steps[run.k1];
  let pick = null;
  let heldSwapped = false;
  for (const doSwap of planned.swap ? [true, false] : [false, true]) {
    if (doSwap) await page.evaluate(() => window.__play.scene().swap());
    pick = await page.evaluate((planned) => {
      const opts = window.__play.options();
      const seen = new Set(window.__app.p.seen);
      const friendly = (o) => !o.lost && o.delta > 0 && o.spawned.every((id) => seen.has(id)) && !o.reaction && o.stars === 0;
      const good = opts.filter((o) => friendly(o) && o.spawned.length).sort((a, b) => b.delta - a.delta);
      const plannedOk = opts.find((o) => o.sec === planned.sec && friendly(o) && planned.kind === window.__play.scene().cur);
      return plannedOk && plannedOk.spawned.length ? plannedOk : (good[0] ?? plannedOk ?? null);
    }, planned);
    if (pick) {
      heldSwapped = doSwap;
      break;
    }
    if (doSwap) await page.evaluate(() => window.__play.scene().swap());
  }
  if (!pick) {
    const dbg = await page.evaluate(() => ({ cur: window.__play.scene().cur, next: window.__play.scene().next }));
    throw new Error('no friendly aim for NEW-1 ' + JSON.stringify(dbg));
  }
  // The tutorial hint, except where the game's own 128 px hint block breaks the localized line inside a word
  // (NO_HINT): that locale shows the post-tutorial state (no hint), a real state, and holds the same aim as EN.
  const noHint = NO_HINT.includes(lang);
  let hintBoxes;
  if (noHint) {
    const enLog = join(rawDir('en'), 'capture-log.json');
    hintBoxes = existsSync(enLog) ? (JSON.parse(readFileSync(enLog, 'utf8')).m1?.hintBoxes ?? []) : [];
  } else {
    await page.evaluate(() => {
      const s = window.__play.scene();
      s.hintShown = true;
      s.el.querySelector('.hud').append(s.hintEl);
    });
    await sleep(100);
    hintBoxes = await page.evaluate(() =>
      [window.__play.rectOf('.level .hint > div:first-child'), window.__play.rectOf('.level .hint-hand')].filter(Boolean),
    );
  }
  const phis = [];
  for (let phi = 2.3; phi >= -0.25; phi -= 0.1) phis.push(+phi.toFixed(3));
  const hold = await page.evaluate((o) => window.__play.holdRight(o), {
    sec: pick.sec,
    phis,
    T: 700,
    box: [260, 520, 1060, 2600],
    avoid: hintBoxes.slice(0, 1),
  });
  if (!hold.ok) throw new Error('NEW-1: no hold with the aim tag inside the card: ' + JSON.stringify(hold).slice(0, 400));
  await sleep(150);
  const hint = noHint ? null : await page.evaluate(() => window.__play.rectOf('.level .hint'));
  if (noHint && (await page.evaluate(() => !!document.querySelector('.level .hint'))))
    throw new Error(`NEW-1 [${lang}]: the tutorial hint is on screen, but this locale captures without it`);
  await page.screenshot({ path: join(dir, 'm1-fling.png') });
  logOut.m1 = {
    afterThrows: run.k1,
    counts: await page.evaluate(() => window.__play.counts()),
    heldSwapped,
    pick: { kind: pick.kind, sec: pick.sec, delta: pick.delta, spawned: pick.spawned },
    hold: { phi: hold.best.phi, T: hold.best.T, left: hold.best.left, bend: hold.best.bend, hintHits: hold.best.hits },
    tag: Object.fromEntries(Object.entries(hold.tag).map(([k, v]) => [k, Math.round(v * 3)])),
    hint,
    hintBoxes,
    noHint,
  };
  log('  NEW-1', JSON.stringify(logOut.m1));
  await page.evaluate(() => {
    const P = window.__play;
    const s = P.scene();
    P.release();
    s.hintShown = false;
    s.hintEl.remove();
    P.resume();
  });

  // NEW-2b: lush, the throw before the arrival, same spin as 2a
  res = await page.evaluate(
    (st) => window.__play.runSteps(st),
    steps.slice(run.k1, -1).map((st, i) => (i === 0 ? { ...st, swap: !!st.swap !== heldSwapped } : st)),
  );
  if (res.some((r) => !r.ok)) throw new Error('P throws went astray: ' + JSON.stringify(res));
  await page.evaluate(() => window.__play.quiet(1500, 7000));
  await page.evaluate(
    ({ rot }) => {
      window.__play.setClock(900, rot);
      window.__play.scene().draw();
      window.__play.freeze();
    },
    { rot: rot0 },
  );
  await sleep(120);
  const b = await page.evaluate(() => ({
    counts: window.__play.counts(),
    cx: window.__play.scene().cx * 3,
    cy: window.__play.scene().cy * 3,
    R: window.__play.scene().R * 3,
    popups: window.__play.scene().popups.length,
    discover: !!document.querySelector('.level .discover.show'),
    finish: window.__play.rectOf('.level .finish:not(.hidden)'),
  }));
  await page.screenshot({ path: join(dir, 'm2b-lush.png') });
  logOut.m2b = { T: 900, rot: rot0, ...b };
  log('  NEW-2b', JSON.stringify(logOut.m2b));
  if (Math.abs(b.cx - a.cx) > 1 || Math.abs(b.cy - a.cy) > 1) throw new Error('2a/2b planet centres differ');
  await page.evaluate(() => window.__play.resume());

  // NEW-3: the arrival, the new-creature card in capture mode, the friend on the right rim
  const last = steps.at(-1);
  await page.evaluate((st) => {
    if (st.swap) window.__play.scene().swap();
  }, last);
  // the friend on the right rim (spec: -35°…+20°), high enough that the friend is not sliced by the 840 px card
  // window and the "+N" popup at the landing stays inside x 1070
  // (a "+N" popup that would cross the card edge is let go first: the card freezes once every popup is inside)
  const CAP_AFTER = 1.35;
  const aimed = await page.evaluate(({ sec, at, T, capAfter }) => window.__play.aimForAngle(sec, at, -0.55, T, capAfter), {
    sec: last.sec,
    at: run.arrival.at,
    T: 1000,
    capAfter: CAP_AFTER,
  });
  if (!aimed) throw new Error('NEW-3: no vector');
  // set the clock and fire in one task, so the planet cannot turn between them
  // the page clock is paused and stepped one 30 fps frame at a time, so the card's own (real-time) timer and the
  // round clock stay in step, and nothing can hide the card between the freeze and the screenshot
  const fired = await fireStepped(
    page,
    last.sec,
    aimed.rot,
    1000,
    `const b = document.querySelector('.level .discover.show'); return !!b && dt > ${CAP_AFTER - 0.05} && window.__play.popupBoxes().every((p) => p.box[0] + 24 >= 250 && p.box[2] - 24 <= 1070);`,
  );
  const c = await page.evaluate((at) => {
    const P = window.__play;
    const s = P.scene();
    return {
      arrivalAngle: +P.angleOf(at, s.rot).toFixed(3),
      card: P.rectOf('.level .discover.show'),
      cardText: document.querySelector('.level .discover.show')?.innerText.replace(/\s+/g, ' '),
      popups: P.popupBoxes(),
      counts: P.counts(),
    };
  }, run.arrival.at);
  await page.screenshot({ path: join(dir, 'm3-friend.png') });
  const still = await page.evaluate(() => !!document.querySelector('.level .discover.show'));
  await page.clock.resume();
  if (!still) throw new Error('NEW-3: the new-creature card closed before the screenshot');
  logOut.m3 = { aimed, fired: { hit: fired.hit, after: fired.after, banner: fired.banner }, ...c };
  log('  NEW-3', JSON.stringify(logOut.m3));
  await page.evaluate(() => {
    window.__play.release();
    window.__play.resume();
  });
  return run;
}

/** Fire at sec from spin rot at round time T with the page clock paused, then step 30 fps frames until cond holds. */
async function fireStepped(page, sec, rot, T, cond, maxT = 4) {
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 400));
  const ok = await page.evaluate(
    ({ sec, rot, T }) => {
      const P = window.__play;
      const s = P.scene();
      P.setClock(T, rot);
      const v = P.vectorFor(sec);
      if (!v) return false;
      window.__scene.drawPreview(v);
      window.__scene.fire(v);
      window.__landedAt = null;
      return true;
    },
    { sec, rot, T },
  );
  if (!ok) {
    await page.clock.resume();
    throw new Error('no vector for the capture throw');
  }
  for (let i = 0; i < 30 * 8; i++) {
    await page.clock.runFor(1000 / 30);
    const r = await page.evaluate(
      ({ cond, maxT }) => {
        const s = window.__play.scene();
        if (s.shot) return null;
        if (window.__landedAt == null) window.__landedAt = s.time;
        const dt = s.time - window.__landedAt;
        return new Function('s', 'dt', cond)(s, dt) || dt > maxT ? { dt } : null;
      },
      { cond, maxT },
    );
    if (r) {
      const out = await page.evaluate((dt) => {
        window.__play.freeze();
        const d = document.querySelector('.level .discover.show');
        return { hit: window.__scene.lastHit, after: +dt.toFixed(3), banner: d ? d.innerText.replace(/\s+/g, ' ') : null };
      }, r.dt);
      return out;
    }
  }
  await page.clock.resume();
  throw new Error('the capture moment never came');
}

// ------------------------------------------------------------------ NEW-4 Fusion
// Spec: planet P, else planet 34. On 34 every Combo 3 makes friends wander off (ghosts with wish bubbles stay
// for 3 throws and push the Fusion name out of the card), so the search moves on to the next calm planet.
const FUSION_PLANETS = String(args.fusion ?? '34,31')
  .split(',')
  .map(Number);
/** Loss-free Combos: a Combo step only counts when nobody wanders off. */
const FUSION_SCORE = `
  const f = res.reactions[0] && res.reactions[0].id !== 'scorch' ? 1 : 0;
  const clash = res.reactions.some((r) => r.id === 'scorch');
  return f * 40 + res.combo.step * (res.lost.length ? 0 : 70) + (res.after - res.before) * 0.3 + res.spawned.length * 2 - res.lost.length * 100
    - (clash ? 100 : 0) - (res.spawned.some((x) => !ctx.seen.has(x.id)) ? 400 : 0) - (ctx.stars(res.state) > 0 ? 3000 : 0);`;
/** The capture throw: the first Fusion reaching Combo 3, with nobody lost on it or the two throws before. */
const FUSION_FINAL = `
  const i = path.findIndex((p) => p.step >= 3 && p.reaction && p.reaction !== 'scorch');
  if (i < 0) return -1000;
  const win = path.slice(Math.max(0, i - 2), i + 1);
  return (win.every((p) => !p.lost) ? 3000 : 0) - (path[i].nova ? 400 : 0) - i * 20;`;
async function captureFusion(page, dir, logOut) {
  for (const n of FUSION_PLANETS) {
    await page.evaluate((n) => window.__play.fresh(n), n);
    let pick = null;
    for (const depth of [6, 8, 10]) {
      const [best] = await page.evaluate((o) => window.__play.planHand(o), { depth, beam: 60, score: FUSION_SCORE, final: FUSION_FINAL });
      const at = best.path.findIndex((p) => p.step >= 3 && p.reaction && p.reaction !== 'scorch');
      if (at < 0 || !best.path.slice(Math.max(0, at - 2), at + 1).every((p) => !p.lost)) continue;
      if (!pick || (pick.path[pick.at].nova && !best.path[at].nova)) pick = { path: best.path, at };
    }
    if (!pick) {
      log(`  fusion: no loss-free Combo 3 on planet ${n}`);
      continue;
    }
    const { path, at } = pick;
    log(`  fusion planet ${n}:`, fmtPath(path.slice(0, at + 1)));
    // "COMBO n!" is drawn 1.55 R out from the landing, so it only fits the card above or below the planet. A comet
    // from the launcher cannot land on the top half (spec: -2.0…-1.1), so land on the bottom: the Fusion name stays
    // centred over the planet and "COMBO n!" sits under it
    for (const [i, want] of [1.57, 1.35, 1.8, 1.2, 1.95].entries()) {
      if (i) {
        await page.evaluate(() => {
          window.__play.release();
          window.__play.resume();
        });
        await page.evaluate((n) => window.__play.fresh(n), n);
      }
      const res = await page.evaluate((st) => window.__play.runSteps(st), path.slice(0, at));
      if (res.some((r) => !r.ok)) throw new Error('fusion throws went astray: ' + JSON.stringify(res));
      const step = path[at];
      if (step.swap) await page.evaluate(() => window.__play.scene().swap());
      const aimed = await page.evaluate(({ sec, want }) => window.__play.aimForAngle(sec, sec, want, 655.7, 0), { sec: step.sec, want });
      if (!aimed) continue;
      const fired = await page.evaluate(
        ({ sec, rot }) => {
          window.__play.setClock(655.7, rot);
          return window.__play.fireAndFreeze(
            sec,
            `const t = s.popups.map((p) => p.text).join('|'); return s.popups.length >= 2 && /COMBO|コンボ/i.test(t) && s.feedback.active.every((a) => s.time * 1000 - a.startedAt > 260) && !document.querySelector('.level .discover.show');`,
          );
        },
        { sec: step.sec, rot: aimed.rot },
      );
      await sleep(150);
      const pops = await page.evaluate(() => window.__play.popupBoxes());
      const banner = await page.evaluate(() => window.__play.rectOf('.level .discover.show'));
      const ghosts = await page.evaluate(() => window.__play.scene().ghosts.length);
      // the text glyphs sit 8 css px inside each popup box
      const inside =
        pops.length >= 2 && pops.every((p) => p.box[0] + 24 >= 250 && p.box[2] - 24 <= 1070 && p.box[1] >= 560 && p.box[3] <= 2560);
      log(`  fusion try ${i}`, JSON.stringify({ want, landAngle: +aimed.endAngle.toFixed(3), pops, banner, ghosts, inside }));
      if (inside && !banner && !ghosts) {
        await page.screenshot({ path: join(dir, 'm4-fusion.png') });
        logOut.m4 = {
          planet: n,
          plan: fmtPath(path.slice(0, at + 1)),
          steps: path.slice(0, at + 1).map((p) => ({ sec: p.sec, kind: p.kind, swap: p.swap })),
          reaction: step.reaction,
          pair: null,
          combo: step.step,
          landAngle: aimed.endAngle,
          popups: pops,
          hit: fired.hit,
        };
        logOut.m4.pair = await page.evaluate(async (id) => (await import('/src/core/round.ts')).REACTIONS[id].pair, step.reaction);
        log('  NEW-4', JSON.stringify(logOut.m4));
        await page.evaluate(() => {
          window.__play.release();
          window.__play.resume();
        });
        return;
      }
    }
  }
  throw new Error('NEW-4: no Fusion frame with every popup inside the card');
}

// ------------------------------------------------------------------ NEW-5 Magnet Mist (planet 46)
async function captureSky(page, dir, logOut) {
  const n = 46;
  await page.evaluate((n) => window.__play.fresh(n), n);
  const GROW_UNDER_STAR = `if (ctx.stars(res.state) > 0) return -5000; return (res.after - res.before) + res.spawned.length * 8 - res.lost.length * 45 - (res.spawned.some((x) => !ctx.seen.has(x.id)) ? 25 : 0);`;
  const pl = await planScene(page, { depth: 4, beam: 30, score: GROW_UNDER_STAR, final: 'return ctx.stars(state) > 0 ? -5000 : 0;' });
  await runScene(page, pl.path);
  const r = await page.evaluate(() => window.__play.mistRight({ box: [260, 520, 1060, 2600] }));
  if (!r.ok) throw new Error('NEW-5: no mist shot with the tag inside the card ' + JSON.stringify(r).slice(0, 300));
  await sleep(150);
  await page.screenshot({ path: join(dir, 'm5-sky.png') });
  logOut.m5 = {
    planet: n,
    plan: fmtPath(pl.path),
    shot: { T: r.best.T, sector: r.best.sector, curl: r.best.curl, delta: r.best.delta, spawned: r.best.spawned },
    tag: Object.fromEntries(Object.entries(r.tag).map(([k, v]) => [k, Math.round(v * 3)])),
  };
  log('  NEW-5', JSON.stringify(logOut.m5));
  await page.evaluate(() => {
    window.__play.release();
    window.__play.resume();
  });
}

// ------------------------------------------------------------------ NEW-5b Troubles (planet 18, optional)
async function captureCare(page, dir, logOut) {
  const n = 18;
  await page.evaluate((n) => window.__play.fresh(n), n);
  await page.evaluate(async () => (window.__traitOf = (await import('/src/core/world.ts')).traitOf));
  const pl = await planScene(page, {
    depth: 8,
    beam: 50,
    score: `
      if (ctx.stars(res.state) > 0) return -5000;
      const P = res.state.planet.sectors;
      const guards = P.filter((x) => x.species && window.__traitOf(x.species) === 'fireproof').length;
      const settled = res.troubleEvents.filter((e) => e.kind === 'settled').length;
      const blocked = res.troubleEvents.filter((e) => e.kind === 'blocked' && e.by === 'fireproof').length;
      const clean = blocked && !res.lost.length && !res.reactions.length && !res.novaFired && res.after - res.before > 5;
      return 0.4 * (res.after - res.before) + res.spawned.length * 6 - res.lost.length * 45 - settled * 600 + blocked * 60
        + (clean && k >= 4 ? 400 : 0) + (k >= 3 ? guards * 10 : 0) - (res.spawned.some((x) => !ctx.seen.has(x.id)) ? 200 : 0);`,
    final: 'return ctx.stars(state) > 0 ? -5000 : 0;',
  });
  let at = -1;
  pl.path.forEach((p, i) => {
    if (p.trouble.some((t) => t.includes(':blocked:')) && !p.lost && !p.reaction && !p.nova && p.delta > 5) at = i;
  });
  log('  care plan', fmtPath(pl.path));
  if (at < 0) throw new Error('NEW-5b: no clean block');
  await runScene(page, pl.path.slice(0, at));
  const vent = await page.evaluate(() => window.__play.scene().troubles[0].source);
  const aimed = await page.evaluate(({ sec, vent }) => window.__play.aimForAngle(sec, vent, -0.65, 671.3, 0.6), {
    sec: pl.path[at].sec,
    vent,
  });
  await page.evaluate(
    ({ sec, rot }) => {
      window.__play.setClock(671.3, rot);
      return window.__play.fireAndFreeze(
        sec,
        `const safe = s.popups.find((p) => p.color === '#a4e8bc'); return (!!safe && safe.life / safe.max < 0.5) || dt > 1.2;`,
      );
    },
    { sec: pl.path[at].sec, rot: aimed.rot },
  );
  await sleep(150);
  await page.screenshot({ path: join(dir, 'm5b-troubles.png') });
  logOut.m5b = { planet: n, plan: fmtPath(pl.path.slice(0, at + 1)), popups: await page.evaluate(() => window.__play.popupBoxes()) };
  log('  NEW-5b', JSON.stringify(logOut.m5b));
  await page.evaluate(() => {
    window.__play.release();
    window.__play.resume();
  });
}

// ------------------------------------------------------------------ NEW-6, 7, 8a, 8b (screens)
async function captureHomeworld(page, dir, logOut) {
  // Build the M11.5 save and fixed clear spring afternoon shared with the App Preview.
  const state = await prepareHomeworld(page);
  // Keep the existing pickup/timer gate: collect through the game immediately before the frame,
  // then verify the finished plots still have no bubbles after the screenshot.
  const collectNow = () =>
    page.evaluate(async () => {
      const hw = await import('/src/meta/homeworld.ts');
      const c = hw.collectAll(window.__app.p, Date.now());
      window.__app.save();
      return c;
    });
  const collected = [await collectNow()];
  await page.evaluate(() => window.__app.selectTab('homeworld'));
  await page.waitForFunction(() => window.__app.screen === 'homeworld');
  await sleep(1600);
  await assertHidden(page, 'homeworld');
  let canvas, bubbles;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) {
      collected.push(await collectNow());
      await sleep(500);
    }
    canvas = await page.evaluate(() => window.__play.rectOf('.hw-canvas'));
    await page.screenshot({ path: join(dir, 'm6-homeworld.png') });
    // Checked after the frame: ready() only grows with time, so "nothing ready now" means nothing was ready when the
    // frame was drawn. A plot still under construction (done > now) would draw the clock bubble instead: none allowed.
    bubbles = await page.evaluate(async () => {
      const hw = await import('/src/meta/homeworld.ts');
      const h = window.__app.p.home;
      const now = Date.now();
      return {
        anyReady: hw.anyReady(h, now),
        ready: h.plots.map((_, i) => hw.ready(h, i, now)).filter((n) => n > 0).length,
        building: h.plots.filter((b) => b?.done && b.done > now).length,
      };
    });
    if (!bubbles.building && !(bubbles.anyReady || bubbles.ready)) break;
    log(`  NEW-6 attempt ${attempt}: a plot ticked over (${JSON.stringify(bubbles)}), collecting again`);
  }
  if (bubbles.anyReady || bubbles.ready || bubbles.building)
    throw new Error(`NEW-6: a Homeworld bubble was drawn (${JSON.stringify(bubbles)}): the ready / timer bubbles must be off`);
  logOut.m6 = { canvas, state, collected: collected.length === 1 ? collected[0] : collected, bubbles };
  log('  NEW-6', JSON.stringify(logOut.m6));
}

/** Raw y of the first Lifebook row and the crop top in scrapbook-shots.json shot 7 (sy = ROW1 - 7: 5 px under the rarity header glyphs). */
const LB_ROW1 = 560;
const LB_CROP = { sy: 554, rows: 5 };
/** The raw rows (y0 <= y < y1) holding header-gold pixels, one per line. */
const HEADER_INK_ROWS = `
import sys
import numpy as np
from PIL import Image
y0, y1 = int(sys.argv[2]), int(sys.argv[3])
a = np.asarray(Image.open(sys.argv[1]).convert('RGB'))[y0:y1, 44:1274].astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
m = ((r > 150) & (g > 110) & (b < 120) & (r - b > 80)).any(1)
print(' '.join(str(y0 + i) for i in np.nonzero(m)[0]))`;
const HEADER_INK = `
import sys
import numpy as np
from PIL import Image
y0, y1 = int(sys.argv[2]), int(sys.argv[3])
a = np.asarray(Image.open(sys.argv[1]).convert('RGB'))[y0:max(y0 + 1, y1 - 1), 44:1274].astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
print(int(((r > 150) & (g > 110) & (b < 120) & (r - b > 80)).sum()))`;

async function captureLifebook(page, dir, logOut) {
  // The player has met the Dune Scorpion (a real, reachable profile): the game draws its own card instead of the
  // faceless locked "???" silhouette, which reads as a collect-them-all slot.
  await page.evaluate(() => {
    const p = window.__app.p;
    if (!p.seen.includes('scorpion')) p.seen.push('scorpion');
  });
  await page.evaluate(() => window.__app.showLifebook());
  await page.waitForFunction(() => window.__app.screen === 'lifebook');
  await sleep(1400);
  await assertHidden(page, 'lifebook');
  // row 1 at raw y 560, so five full rows fit above the bottom of the frame
  const top = await page.evaluate((row1) => {
    const sc = document.querySelector('.host .screen .scroll');
    const first = sc.querySelector('.lb-grid > .lb');
    sc.scrollTop += first.getBoundingClientRect().top - row1 / 3;
    return window.__play.rectOf('.lb-grid > .lb');
  }, LB_ROW1);
  await sleep(500);
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('.lb-grid > .lb')].slice(0, 18).map((el) => {
      const r = el.getBoundingClientRect();
      return [el.querySelector('.lbn')?.textContent, Math.round(r.top * 3), Math.round(r.bottom * 3)];
    }),
  );
  const geo = await page.evaluate(() => {
    // the header's text line box (its glyphs), not the block, whose bottom margin may reach into the crop
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('.lb-sec .sec-title').firstChild);
    const sec = range.getBoundingClientRect();
    const sc = document.querySelector('.host .screen .scroll').getBoundingClientRect();
    const locked = [...document.querySelectorAll('.lb-grid > .lb.locked')].map((el) => {
      const r = el.getBoundingClientRect();
      return [el.querySelector('.lbh')?.textContent, Math.round(r.top * 3), Math.round(r.bottom * 3)];
    });
    return {
      header: [Math.round(sec.top * 3), Math.round(sec.bottom * 3)],
      scroller: [Math.round(sc.top * 3), Math.round(sc.bottom * 3)],
      locked,
    };
  });
  const row1 = cards[0][1];
  // Five full rows where they fit on the screen; a locale whose card names wrap to more lines (taller cards) gets
  // the most full rows that do (the composer's window follows: scrapbook.mjs reads m7.rows)
  const bottomOf = (rows) => (cards[rows * 3 - 1][2] + cards[rows * 3][1]) / 2;
  let rows = LB_CROP.rows;
  while (rows > 4 && bottomOf(rows) > geo.scroller[1]) rows--;
  const cropBottom = bottomOf(rows);
  const problems = [];
  if (Math.abs(row1 - LB_ROW1) > 3) problems.push(`row 1 at raw ${row1}, not ${LB_ROW1}`);
  if (cropBottom > geo.scroller[1]) problems.push(`row ${rows} ends below the scroller (${cropBottom} > ${geo.scroller[1]})`);
  const lockedIn = geo.locked.filter(([, t, b]) => b > LB_CROP.sy && t < cropBottom);
  if (lockedIn.length) problems.push(`locked "???" cards in the crop: ${JSON.stringify(lockedIn)}`);
  if (problems.length) throw new Error(`NEW-7: ${problems.join('; ')}`);
  await page.screenshot({ path: join(dir, 'm7-lifebook.png') });
  // the rarity header's glyphs (its line box reaches past them) must end above the crop: no header-gold pixel in
  // the band between the crop top and row 1
  // A header with a descender (DE "Häufig") reaches below the default crop top: the crop then starts on the first
  // ink-free row under the glyphs (logged as m7.cropTop; scrapbook.mjs crops from there), never inside row 1.
  const inkRows = (y0, y1) =>
    execFileSync('python3', ['-c', HEADER_INK_ROWS, join(dir, 'm7-lifebook.png'), String(y0), String(y1)], { encoding: 'utf8' })
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number);
  const inked = inkRows(LB_CROP.sy, row1);
  const cropTop = inked.length ? Math.max(...inked) + 1 : LB_CROP.sy;
  if (cropTop >= row1) throw new Error(`NEW-7: the rarity header's glyphs reach row 1 (raw ${row1}): no clean crop top`);
  const ink = execFileSync('python3', ['-c', HEADER_INK, join(dir, 'm7-lifebook.png'), String(cropTop), String(row1)], {
    encoding: 'utf8',
  }).trim();
  if (ink !== '0') throw new Error(`NEW-7: ${ink} header-gold pixels between the crop top (raw ${cropTop}) and row 1 (raw ${row1})`);
  logOut.m7 = {
    firstRow: top,
    rows,
    cropTop,
    cards,
    header: geo.header,
    scroller: geo.scroller,
    lockedInCrop: lockedIn.length,
    headerInk: 0,
    addedSeen: ['scorpion'],
  };
  log('  NEW-7', JSON.stringify(logOut.m7));
}

async function captureGrownups(page, lang, dir, logOut) {
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
  await sleep(500);
  // NEW-8b: the real gate, nothing typed
  const g = await page.evaluate(() => {
    const m = document.querySelector('.overlay .scrim:not(.out) .modal.gate-v2');
    const r = m.getBoundingClientRect();
    return {
      bbox: [r.left * 3, r.top * 3, r.width * 3, r.height * 3].map(Math.round),
      prompt: m.querySelector('.gate-v2-prompt')?.textContent,
      entry: m.querySelector('.gate-v2-entry')?.textContent,
    };
  });
  await page.screenshot({ path: join(dir, 'm8b-gate.png') });
  writeFileSync(join(dir, 'm8b-gate.json'), JSON.stringify(g, null, 1));
  logOut.m8b = g;
  log('  NEW-8b', JSON.stringify(g));
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
  await assertHidden(page, 'grownups');
  // NEW-8a: Play time first under the title, down to "Set parent PIN"
  const y = await page.evaluate(() => {
    const scroller = document.querySelector('.host .screen.grownups .scroll');
    const play = document.querySelector('.grownups-gentle').closest('.grownups-section').previousElementSibling;
    scroller.scrollTo(0, play.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop);
    return scroller.scrollTop;
  });
  await sleep(400);
  const where = await page.evaluate(() => {
    const pin = [...document.querySelectorAll('.grownups-section .btn.ghost.wide')].find((b) =>
      b.closest('.grownups-section')?.querySelector('.grownups-gentle'),
    );
    return {
      title: window.__play.rectOf('.host .screen.grownups .page-title'),
      pin: pin ? [...Object.values(pin.getBoundingClientRect().toJSON())].slice(0, 4).map((v) => Math.round(v * 3)) : null,
    };
  });
  const leak = await page.evaluate(() => {
    const sc = document.querySelector('.host .screen.grownups .scroll').getBoundingClientRect();
    const hits = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const txt = n.textContent.trim();
      if (!/[$€£¥₩₹]|\d[.,]\d\d\b|R\$|US\$|円/.test(txt)) continue;
      const el = n.parentElement;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      const inScroller = !!el.closest('.host .screen.grownups .scroll');
      const top = inScroller ? sc.top : 0;
      const bottom = inScroller ? sc.bottom : innerHeight;
      if (r.bottom > top && r.top < bottom && r.width > 0) hits.push(txt);
    }
    return hits;
  });
  if (leak.length) throw new Error(`[${lang}] a price or amount is visible on the Grown-ups shot: ${leak.join(' | ')}`);
  await page.screenshot({ path: join(dir, 'm8a-grownups.png') });
  logOut.m8a = { scrollTop: y, ...where };
  log('  NEW-8a', JSON.stringify(logOut.m8a));
}

// ------------------------------------------------------------------ main
async function captureLang(browser, lang) {
  const dir = rawDir(lang);
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const { ctx, page, errors, seeded } = await openGame(lang, { marketing: true });
  await page.addStyleTag({ content: MK_CSS });
  await page.evaluate(CAPTURE_LIB);
  await page.evaluate(() => window.__play.initCapture());
  const logFile = join(dir, 'capture-log.json');
  const logOut = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : {};
  Object.assign(logOut, { lang, clock: '2026-05-14T10:30:00', profile: seeded, marketing: true, maxDpr: 3 });
  log(`[${lang}] profile`, JSON.stringify(seeded));
  // other locales replay the English run so only the text differs
  let reuse = null;
  const enLog = join(rawDir('en'), 'capture-log.json');
  if (lang !== 'en' && existsSync(enLog)) {
    const en = JSON.parse(readFileSync(enLog, 'utf8'));
    if (en.P) reuse = { ...en.P, path: en.P.steps };
  }
  try {
    if (ONLY.includes('p')) await capturePlanetP(page, lang, dir, logOut, reuse);
    if (ONLY.includes('4')) await captureFusion(page, dir, logOut);
    if (ONLY.includes('5')) await captureSky(page, dir, logOut);
    if (ONLY.includes('5b')) await captureCare(page, dir, logOut);
    if (ONLY.includes('6')) await captureHomeworld(page, dir, logOut);
    if (ONLY.includes('7')) await captureLifebook(page, dir, logOut);
    if (ONLY.includes('8')) await captureGrownups(page, lang, dir, logOut);
  } finally {
    writeFileSync(logFile, JSON.stringify(logOut, null, 1));
    await ctx.close();
  }
  if (errors.length) log(`[${lang}] page errors:`, errors.slice(0, 5));
  log(`[${lang}] captures in ${Math.round((Date.now() - t0) / 1000)} s → ${dir}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await ensureServer();
  const browser = await chromium.launch();
  setBrowser(browser);
  try {
    for (const lang of LANGS) await captureLang(browser, lang);
  } finally {
    await browser.close();
    stopServer();
  }
  process.exit(0);
}
export { MK_CSS, CAPTURE_LIB, P_SCORE, MUST_HIDE };
