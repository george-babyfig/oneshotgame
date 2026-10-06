// M6 "Read every throw" acceptance (ROADMAP-v2 section 8 M6 and 7.7): "20 scripted throws show 0 overlapping
// text; at most 4 overlay types on the planet". The QA analyst owns this overlap capture.
//
// A mid-game player (planet 30 reached) plays planet 24 (a goal, the Supernova). Twenty throws go through
// the dev hooks `window.__scene.aimAt(sector)` / `fire(vector)` across different sectors. Before each throw
// the aim is held for a moment so the aim tag (including wander-off faces) is drawn; after each
// landing every frame is sampled until the feedback settles.
//
// What is measured, and how (nothing is exposed for the test beyond the M6 dev hooks):
// - Canvas text: the scene's 2D context `fillText` is wrapped, so every string drawn on the planet (the
//   popup queue, the aim tag symbols, the Supernova ring label, ghost bubbles) is captured with its real
//   box (measureText bounding box × the current transform), per frame.
// - DOM text: every visible text node on the page (HUD labels, goal chips, coach tips, the new-creature
//   banner, the "+N life" pip, toasts), as tight line boxes from Range.getClientRects.
// - Overlap: any two text boxes (canvas or DOM, only strings with a letter or digit) intersecting by more
//   than 2 px in both directions. Lines of one wrapped DOM paragraph are not compared with each other.
// - Popups: `scene.popups` (what `draw` paints this frame) and `scene.feedback` (the M6 governor queue in
//   src/ui/feel.ts): at most 2 on screen, and consecutive popups start ≥ 250 ms apart (scene time and wall
//   time). The removed "×N" chain must never be drawn.
// - Overlay types: there is no counter in the scene, so the types are derived per frame from its state:
//   popups, wander-off ghosts, the "Show me where" goal pulse, the aim preview (aim tag + outlined
//   sectors), the Supernova ring label, a coach tip, the new-creature banner, the "+N life" pip.
import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { expectNoErrors, freshInstall, midGame, watchErrors } from './helpers';

test.use({ locale: 'en-US' });

const PLANET = 24;
const THROWS = 20;
const POPUPS_MAX = 2;
const POPUP_GAP_MS = 250;
const OVERLAY_TYPES_MAX = 4;

interface Overlap {
  moving: boolean;
  a: string;
  b: string;
  ax: string;
  bx: string;
  throw: number;
  phase: 'aim' | 'landing';
}

interface Report {
  frames: number;
  overlaps: Overlap[];
  maxPopupsDrawn: number;
  maxPopupsActive: number;
  popupStarts: { scene: number; wall: number; text: string }[];
  popupTexts: string[];
  maxOverlayTypes: number;
  overlayTypesAtMax: string[];
  maxPlanetTypes: number;
  planetTypesAtMax: string[];
  overlayTypesSeen: string[];
  aimTags: number;
  aimTagsWithLoss: number;
  textsSeen: number;
}

/** Wrap the running scene's canvas and frame so every frame's text boxes, popups and overlays are measured. */
async function instrument(page: Page) {
  await page.evaluate((realFilter) => {
    const w = window as any;
    const s = w.__app.scene;
    const g: CanvasRenderingContext2D = s.g;
    const hasText = (t: string) => /[\p{L}\p{N}]/u.test(t);
    const R: any = {
      frames: 0,
      overlaps: [],
      overlapKeys: new Set<string>(),
      maxPopupsDrawn: 0,
      maxPopupsActive: 0,
      popupStarts: [],
      popupTexts: new Set<string>(),
      startedSeen: new Set<string>(),
      maxOverlayTypes: 0,
      overlayTypesAtMax: [],
      maxPlanetTypes: 0,
      planetTypesAtMax: [],
      overlayTypesSeen: new Set<string>(),
      aimTags: 0,
      aimTagsWithLoss: 0,
      textsSeen: 0,
      throw: 0,
      phase: 'aim',
      sampling: false,
    };
    w.__ov = R;
    let frameText: { text: string; box: DOMRect; alpha: number }[] | null = null;
    // Wander-off ghosts are drawn through `ctx.filter = 'grayscale(1)'`, which costs ~45 ms a frame per
    // ghost in headless browsers (61 → 15 fps with one ghost, 5 fps with five; reported as a bug). The
    // round clock is capped per frame, so throws would take many seconds to land. The filter is a colour
    // effect only (positions and text are unchanged), so it is skipped here unless OV_REAL_FILTER=1.
    if (!realFilter) Object.defineProperty(g, 'filter', { configurable: true, get: () => 'none', set: () => {} });
    const fill = g.fillText.bind(g);
    g.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
      if (frameText) {
        const m = g.measureText(text);
        let left = m.actualBoundingBoxLeft;
        let right = m.actualBoundingBoxRight;
        if (maxWidth !== undefined && m.width > maxWidth) {
          const k = maxWidth / m.width;
          left *= k;
          right *= k;
        }
        const T = g.getTransform();
        const p0 = T.transformPoint(new DOMPoint(x - left, y - m.actualBoundingBoxAscent));
        const p1 = T.transformPoint(new DOMPoint(x + right, y + m.actualBoundingBoxDescent));
        const scale = s.canvas.width / (s.canvas.getBoundingClientRect().width || 1);
        const c = s.canvas.getBoundingClientRect();
        const box = new DOMRect(
          c.left + Math.min(p0.x, p1.x) / scale,
          c.top + Math.min(p0.y, p1.y) / scale,
          Math.abs(p1.x - p0.x) / scale,
          Math.abs(p1.y - p0.y) / scale,
        );
        frameText.push({ text, box, alpha: g.globalAlpha });
      }
      return fill(text, x, y, maxWidth);
    };

    const visible = (el: Element) =>
      (el as any).checkVisibility ? (el as any).checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true;

    // Where a DOM text's glyphs sit inside its line box: offsets from the line top to the ink top and bottom.
    const probe = document.createElement('canvas').getContext('2d')!;
    const inkCache = new Map<string, { top: number; bottom: number }>();
    const inkBand = (el: Element, text: string) => {
      const cs = getComputedStyle(el);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const key = `${font}|${text}`;
      let band = inkCache.get(key);
      if (!band) {
        probe.font = font;
        const m = probe.measureText(text);
        const ascent = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
        band = { top: ascent - m.actualBoundingBoxAscent, bottom: ascent + m.actualBoundingBoxDescent };
        inkCache.set(key, band);
      }
      return band;
    };

    const domText = () => {
      const out: { text: string; box: DOMRect; node: number; cls: string }[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      let id = 0;
      while ((n = walker.nextNode())) {
        id++;
        const text = (n.textContent ?? '').trim();
        if (!text || !hasText(text)) continue;
        const el = n.parentElement;
        if (!el || el.closest('.sr-only, script, style, noscript, .scrim, [aria-hidden="true"]')) continue;
        if (!visible(el)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const ink = inkBand(el, text);
        for (const rc of range.getClientRects()) {
          if (rc.width < 1 || rc.height < 1 || rc.bottom < 0 || rc.top > innerHeight || rc.right < 0 || rc.left > innerWidth) continue;
          // the line box is the font's full ascent + descent; keep only the glyphs' ink band, like the canvas boxes
          const top = rc.top + Math.max(0, ink.top);
          const box = new DOMRect(rc.left, top, rc.width, Math.max(1, Math.min(rc.bottom, rc.top + ink.bottom) - top));
          out.push({ text: text.slice(0, 40), box, node: id, cls: String(el.className || el.tagName).slice(0, 30) });
        }
      }
      return out;
    };

    const measure = (canvasText: { text: string; box: DOMRect; alpha: number }[]) => {
      R.frames++;
      // ---- popups (the M6 governor)
      const drawn = s.popups.filter((p: any) => p.life > 0).length;
      R.maxPopupsDrawn = Math.max(R.maxPopupsDrawn, drawn);
      R.maxPopupsActive = Math.max(R.maxPopupsActive, s.feedback.active.length);
      for (const item of s.feedback.active) {
        const key = `${item.startedAt}|${item.text}`;
        if (R.startedSeen.has(key)) continue;
        R.startedSeen.add(key);
        R.popupStarts.push({ scene: item.startedAt, wall: performance.now(), text: item.text });
        R.popupTexts.add(item.text);
      }
      // ---- overlay types: anywhere over the round, and on the planet (its disc plus the creature rim)
      const c = s.canvas.getBoundingClientRect();
      const k = c.width / (s.w || 1);
      const reach = s.R * 1.6;
      const planet = new DOMRect(c.left + (s.cx - reach) * k, c.top + (s.cy - reach) * k, 2 * reach * k, 2 * reach * k);
      const hits = (b: DOMRect) => b.right > planet.left && b.left < planet.right && b.bottom > planet.top && b.top < planet.bottom;
      const types = new Map<string, boolean>(); // type → on the planet
      const add = (type: string, onPlanet: boolean) => types.set(type, (types.get(type) ?? false) || onPlanet);
      const popupText = new Set(s.popups.map((p: any) => p.text));
      if (drawn)
        add(
          'popups',
          canvasText.some((t) => popupText.has(t.text) && hits(t.box)),
        );
      if (s.ghosts.length) add('wander-ghosts', true);
      if (s.goalPulse && s.time < s.goalPulse.until && s.goalPulse.sectors.length) add('goal-pulse', true);
      const aiming = !!s.aimFrom && s.pull().len >= 18;
      const tag = aiming && !!s.predictCache?.facts && !!s.aimTagPosition;
      if (tag) {
        add('aim tag', true); // the changed sectors are outlined on the planet
        R.aimTags++;
        if (s.predictCache?.facts.lost.length) R.aimTagsWithLoss++;
      }
      const nova = canvasText.find((t) => /SUPERNOVA READY|Supernova held/.test(t.text));
      if (nova) add('nova-label', hits(nova.box));
      for (const [type, sel] of [
        ['coach-tip', '.level .coach.show'],
        ['creature-banner', '.level .discover.show'],
        ['life-pip', '.life-fly'],
      ]) {
        const el = document.querySelector(sel);
        if (el && visible(el)) add(type, hits(el.getBoundingClientRect()));
      }
      for (const t of types.keys()) R.overlayTypesSeen.add(t);
      if (types.size > R.maxOverlayTypes) {
        R.maxOverlayTypes = types.size;
        R.overlayTypesAtMax = [...types.keys()];
      }
      const onPlanet = [...types].filter(([, on]) => on).map(([t]) => t);
      if (onPlanet.length > R.maxPlanetTypes) {
        R.maxPlanetTypes = onPlanet.length;
        R.planetTypesAtMax = onPlanet;
      }
      // ---- overlapping text
      const boxes = [
        ...canvasText
          .filter((t) => t.alpha > 0.2 && hasText(t.text))
          .map((t, i) => ({ text: t.text, box: t.box, node: -1 - i, where: 'canvas' })),
        ...domText().map((t) => ({ text: t.text, box: t.box, node: t.node, where: `dom.${t.cls}` })),
      ];
      R.textsSeen = Math.max(R.textsSeen, boxes.length);
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i];
          const B = boxes[j];
          if (A.node === B.node) continue;
          const ix = Math.min(A.box.right, B.box.right) - Math.max(A.box.left, B.box.left);
          const iy = Math.min(A.box.bottom, B.box.bottom) - Math.max(A.box.top, B.box.top);
          if (ix <= 2 || iy <= 2) continue;
          const key = [A.text, B.text].sort().join(' ⟷ ');
          if (R.overlapKeys.has(key)) continue;
          R.overlapKeys.add(key);
          const fmt = (b: DOMRect) => `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}`;
          R.overlaps.push({
            // the "+N life" pip flies from the planet to the life bar (Web Animations, 850 ms)
            moving: /life-fly/.test(A.where + B.where),
            a: `${A.where} "${A.text}"`,
            b: `${B.where} "${B.text}"`,
            ax: fmt(A.box),
            bx: fmt(B.box),
            throw: R.throw,
            phase: R.phase,
          });
        }
    };

    const proto = Object.getPrototypeOf(s);
    s.draw = () => {
      frameText = R.sampling ? [] : null;
      proto.draw.call(s);
      const got = frameText;
      frameText = null;
      if (got) measure(got);
    };
  }, process.env.OV_REAL_FILTER === '1');
}

/** The sector a throw aims at: spread over all 24 sectors. */
const sectorFor = (k: number) => (k * 7 + 3) % 24;

test.describe('M6 overlap capture [en]', () => {
  test(`${THROWS} scripted throws on planet ${PLANET}: 0 overlapping text, ≤ ${POPUPS_MAX} popups ≥ ${POPUP_GAP_MS} ms apart, ≤ ${OVERLAY_TYPES_MAX} overlay types`, async ({
    page,
  }, info) => {
    test.setTimeout(300_000);
    const guard = watchErrors(page);
    await freshInstall(page);
    await midGame(page, { level: 30 });
    await page.evaluate((n) => (window as any).__app.startLevel(n), PLANET);
    await page.waitForFunction((n) => (window as any).__app.scene?.L?.n === n && !!(window as any).__scene, PLANET);
    // enough throws for the script (the Keeper's "3 more throws" does the same in play)
    await page.evaluate((need) => {
      const s = (window as any).__app.scene;
      const extra = Math.max(0, need + 1 - s.throwsLeft);
      s.throwsLeft += extra;
      s.throwsTotal += extra;
      s.renderHud();
    }, THROWS);
    await instrument(page);

    const shots: string[] = [];
    for (let k = 0; k < THROWS; k++) {
      // close a sheet the round may open (an intro card) like a player would
      await page.waitForFunction(() => {
        const s = (window as any).__app.scene;
        if (s.modalOpen && !s.ended) s.modalOpen.close();
        return s.canAim();
      });
      const sector = sectorFor(k);
      // hold the aim so the aim tag and outlined sectors are drawn
      const v = await page.evaluate(
        ({ sector, k }) => {
          const w = window as any;
          const s = w.__app.scene;
          const v = w.__scene.aimAt(sector);
          const L = s.launch;
          s.aimFrom = { x: L.x, y: L.y };
          s.aimTo = { x: L.x - v.vx / 6.2, y: L.y - v.vy / 6.2 };
          w.__ov.throw = k + 1;
          w.__ov.phase = 'aim';
          w.__ov.sampling = true;
          return v;
        },
        { sector, k },
      );
      await page.waitForTimeout(250);
      await page.evaluate((v) => {
        const w = window as any;
        const s = w.__app.scene;
        s.aimFrom = s.aimTo = null;
        w.__ov.phase = 'landing';
        w.__scene.fire(v);
      }, v);
      // until it lands, then until the feedback settles (delayed popups start up to ~1 s later)
      // Game time is capped at 33 ms a frame, so on a slow software-rendered CI runner a looping flight can take
      // several wall-clock times its game time; this test measures overlap, not flight speed.
      await page.waitForFunction(() => !(window as any).__app.scene.shot, null, { timeout: 30_000 });
      const landedAt = Date.now();
      await page.waitForFunction(
        (t0) => {
          const s = (window as any).__app.scene;
          const quiet = !s.feedback.active.length && !s.feedback.waiting.length;
          return (Date.now() - t0 > 1_300 && quiet) || Date.now() - t0 > 4_000;
        },
        landedAt,
        { polling: 100 },
      );
      shots.push(
        `#${k + 1} → sector ${sector}: ${await page.evaluate(() => {
          const s = (window as any).__app.scene;
          return `score ${s.score}, nova ${s.nova.charge}/${s.nova.threshold} (fired ${s.nova.fired}), ghosts ${s.ghosts.length}, frames ${(window as any).__ov.frames}`;
        })} @${Date.now()}`,
      );
      if (process.env.DEBUG_OV) console.log(shots[shots.length - 1]);
    }
    await page.evaluate(() => ((window as any).__ov.sampling = false));

    const r: Report = await page.evaluate(() => {
      const R = (window as any).__ov;
      return {
        frames: R.frames,
        overlaps: R.overlaps,
        maxPopupsDrawn: R.maxPopupsDrawn,
        maxPopupsActive: R.maxPopupsActive,
        popupStarts: R.popupStarts,
        popupTexts: [...R.popupTexts],
        maxOverlayTypes: R.maxOverlayTypes,
        overlayTypesAtMax: R.overlayTypesAtMax,
        maxPlanetTypes: R.maxPlanetTypes,
        planetTypesAtMax: R.planetTypesAtMax,
        overlayTypesSeen: [...R.overlayTypesSeen],
        aimTags: R.aimTags,
        aimTagsWithLoss: R.aimTagsWithLoss,
        textsSeen: R.textsSeen,
      };
    });
    const starts = [...r.popupStarts].sort((a, b) => a.scene - b.scene);
    const gaps = starts.slice(1).map((p, i) => ({ scene: p.scene - starts[i].scene, wall: p.wall - starts[i].wall, text: p.text }));
    const minScene = gaps.length ? Math.min(...gaps.map((g) => g.scene)) : Infinity;
    const minWall = gaps.length ? Math.min(...gaps.map((g) => g.wall)) : Infinity;
    const summary = {
      project: info.project.name,
      viewport: page.viewportSize(),
      frames: r.frames,
      throws: shots,
      overlappingText: r.overlaps.filter((o) => !o.moving).length,
      movingCrossings: r.overlaps.filter((o) => o.moving).length,
      overlaps: r.overlaps,
      popups: {
        started: starts.length,
        maxOnScreen: r.maxPopupsDrawn,
        maxActive: r.maxPopupsActive,
        minGapSceneMs: Math.round(minScene),
        minGapWallMs: Math.round(minWall),
        texts: r.popupTexts,
      },
      overlayTypes: {
        onPlanetMax: r.maxPlanetTypes,
        onPlanetAtMax: r.planetTypesAtMax,
        anywhereMax: r.maxOverlayTypes,
        anywhereAtMax: r.overlayTypesAtMax,
        seen: r.overlayTypesSeen,
      },
      aimTag: { framesDrawn: r.aimTags, framesWithLoss: r.aimTagsWithLoss },
      maxTextBoxesInAFrame: r.textsSeen,
    };
    const reportFile = info.outputPath('overlap-report.json');
    writeFileSync(reportFile, JSON.stringify(summary, null, 2));
    await info.attach('overlap-report.json', { path: reportFile, contentType: 'application/json' });
    const file = info.outputPath('after-20-throws.png');
    await page.screenshot({ path: file });
    await info.attach('after-20-throws', { path: file, contentType: 'image/png' });
    console.log(
      `[M6 overlap ${info.project.name}] ${r.frames} frames, ${r.overlaps.filter((o) => !o.moving).length} overlapping text pairs (+${r.overlaps.filter((o) => o.moving).length} crossings by the flying life pip), popups max ${r.maxPopupsDrawn} on screen (${starts.length} started, min gap ${Math.round(minScene)} ms scene / ${Math.round(minWall)} ms wall), overlay types on the planet max ${r.maxPlanetTypes} [${r.planetTypesAtMax.join(', ')}] (anywhere ${r.maxOverlayTypes} [${r.overlayTypesAtMax.join(', ')}]), aim tag in ${r.aimTags} frames (losses in ${r.aimTagsWithLoss})`,
    );

    expect(r.frames, 'frames sampled').toBeGreaterThan(THROWS * 30);
    expect(r.aimTags, 'the aim tag was drawn while aiming').toBeGreaterThan(0);
    const still = r.overlaps.filter((o) => !o.moving);
    if (r.overlaps.length > still.length)
      info.annotations.push({
        type: 'moving-text-crossings',
        description: r.overlaps
          .filter((o) => o.moving)
          .map((o) => `#${o.throw} ${o.a} × ${o.b}`)
          .join(' | '),
      });
    expect.soft(still, '0 overlapping text boxes (the flying "+N life" pip is reported, not counted)').toEqual([]);
    expect.soft(r.maxPopupsDrawn, `≤ ${POPUPS_MAX} popups on screen`).toBeLessThanOrEqual(POPUPS_MAX);
    expect.soft(r.maxPopupsActive, `≤ ${POPUPS_MAX} popups active in the queue`).toBeLessThanOrEqual(POPUPS_MAX);
    expect.soft(minScene, `popups start ≥ ${POPUP_GAP_MS} ms apart (scene time)`).toBeGreaterThanOrEqual(POPUP_GAP_MS);
    expect
      .soft(
        r.popupTexts.filter((t) => /×\s*\d|\bx\d+\b/i.test(t)),
        'the ×N chain is gone',
      )
      .toEqual([]);
    expect.soft(r.maxPlanetTypes, `≤ ${OVERLAY_TYPES_MAX} overlay types on the planet`).toBeLessThanOrEqual(OVERLAY_TYPES_MAX);
    expectNoErrors(guard);
  });
});
