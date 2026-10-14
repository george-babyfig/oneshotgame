#!/usr/bin/env node
// Comet Garden store art v2: re-export the game's own creature, Keeper and object renders with padding
// (production spec §9.4), so the die-cut sticker step (scrapbook-stickers.py) never meets a clipped edge.
//
//   node store/tools/scrapbook-export.mjs --out=/some/dir [--pad=0.15]
//
// Same drawing calls and poses as the in-game portraits (critterCanvas / keeperCanvas / drawProjectile), drawn
// at 2× into a canvas that is `pad` larger on every side. The Keeper wears the default look (what the capture
// profile shows with "Hide paid looks" on). Writes <out>/creature-<id>-<pose>.png, keeper-<pose>.png,
// object-<kind>.png and species.json. Uses the Vite dev server on --port (5191); starts one if needed.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureServer, stopServer } from './shots.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const OUT = String(args.out ?? 'test-results/scrapbook-assets');
const PAD = Number(args.pad ?? 0.15);
const PORT = Number(args.port ?? 5191);

await ensureServer();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(() => !!window.__app?.p);
  await page.evaluate(() => document.fonts.ready);
  const data = await page.evaluate(async (pad) => {
    const C = await import('/src/ui/art/critters.ts');
    const K = await import('/src/ui/art/keeper.ts');
    const Pj = await import('/src/ui/art/projectiles.ts');
    const W = await import('/src/core/world.ts');
    const M = await import('/src/meta/cosmetics.ts');
    const S = 2; // pixels per css px, as the old 1024 px exports
    const px = 512; // the portrait size the old exports used
    const touchesEdge = (c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const w = c.width;
      const h = c.height;
      for (let i = 0; i < w; i++) if (d[i * 4 + 3] || d[((h - 1) * w + i) * 4 + 3]) return true;
      for (let j = 0; j < h; j++) if (d[j * w * 4 + 3] || d[(j * w + w - 1) * 4 + 3]) return true;
      return false;
    };
    // `pad` on every side; a wider pose (the dragon's wings) gets more until nothing touches the edge
    const canvas = (draw) => {
      let c;
      for (const p of [pad, pad * 2, pad * 3]) {
        const box = Math.round(px * (1 + 2 * p));
        c = document.createElement('canvas');
        c.width = c.height = box * S;
        const g = c.getContext('2d');
        g.scale(S, S);
        g.translate(px * p, px * p);
        draw(g);
        if (!touchesEdge(c)) break;
      }
      return c.toDataURL('image/png');
    };
    const out = {};
    for (const s of W.SPECIES)
      for (const pose of ['idle', 'happy', 'wave'])
        out[`creature-${s.id}-${pose}`] = canvas((g) => C.drawCreature(g, s.id, px / 2, px * 0.9, 0, px * 0.62, 0.4, '', false, pose));
    const look = { ...M.currentLook(window.__app.p), reduceMotion: true };
    const poses = { idle: {}, cheer: { cheer: 1 }, lean: { lean: -0.8 }, dance: { dance: 0.5 } };
    for (const [name, pose] of Object.entries(poses))
      out[`keeper-${name}`] = canvas((g) => K.drawKeeper(g, look, px / 2, px * 0.97, px * 0.78, 0.3, pose));
    for (const kind of Object.keys(W.KINDS)) out[`object-${kind}`] = canvas((g) => Pj.drawProjectile(g, kind, px / 2, px / 2, 170, 0.4, 0));
    return { out, species: W.SPECIES.map((s) => ({ id: s.id, name: s.name, rarity: s.rarity, home: s.home })) };
  }, PAD);
  mkdirSync(OUT, { recursive: true });
  for (const [k, v] of Object.entries(data.out)) writeFileSync(join(OUT, `${k}.png`), Buffer.from(v.split(',')[1], 'base64'));
  writeFileSync(join(OUT, 'species.json'), JSON.stringify(data.species, null, 1));
  console.log(`${Object.keys(data.out).length} padded renders (pad ${PAD}) → ${OUT}`);
} finally {
  await browser.close();
  stopServer();
}
process.exit(0);
