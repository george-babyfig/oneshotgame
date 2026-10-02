import { describe, expect, it } from 'vitest';
import { EMPTY_SKY_STATE, OBSTACLES, gustAt, skyFor, skyShapesAt } from '../src/core/sky';
import { flyFull, sceneGeometry, STAR_SLING } from '../src/core/flight';

const geo = sceneGeometry(390, 844, 1);
const shapes = (id: keyof typeof OBSTACLES, t = 0) => skyShapesAt(skyFor(60, id, 'PP-60', 'normal'), EMPTY_SKY_STATE, geo, t);

describe('seeded sky', () => {
  it('has one deterministic position function for each obstacle', () => {
    for (const id of Object.keys(OBSTACLES) as (keyof typeof OBSTACLES)[]) {
      const at = shapes(id, 1.25);
      expect(at).toEqual(shapes(id, 1.25));
      expect(shapes(id, 1.25)[0].kind).toBe(id === 'rocks' ? 'rock' : id === 'bubble' ? 'bubble' : id);
    }
  });

  it('uses the specified starting sizes and seeded paths', () => {
    expect(shapes('rocks')).toHaveLength(2);
    expect(shapes('rocks')[0]).toMatchObject({ r: geo.R * 0.1 });
    expect(shapes('bubble')[0]).toMatchObject({ r: geo.R * 0.28, moonR: geo.R * 0.22 });
    expect(shapes('mist')[0]).toMatchObject({ r: geo.R * 0.55 });
    expect(shapes('ring')[0]).toMatchObject({ r: geo.R * 1.6, thickness: geo.R * 0.1 });
    const frozenRing = shapes('ring', 1.25)[0];
    if (frozenRing.kind !== 'ring') throw Error('expected ring');
    expect(frozenRing.gaps[0].width).toBeCloseTo((120 * Math.PI) / 180, 6);
    expect(skyFor(51, 'ring', 'PP-51', 'normal').ringWidth).toBe(179);
    expect(skyFor(60, 'ring', 'PP-60', 'hard').ringWidth).toBe(145);
    expect(frozenRing.gaps[0].start).toBeGreaterThan(0);
    expect(shapes('tug')[0]).toMatchObject({ coreR: 6 });
    const ring = skyFor(60, 'ring', 'PP-60', 'normal');
    ring.ringDirection = 1;
    expect(skyShapesAt(ring, EMPTY_SKY_STATE, geo, 1)).not.toEqual(skyShapesAt(ring, EMPTY_SKY_STATE, geo, 0));
    const hard = skyShapesAt(skyFor(60, 'rocks', 'PP-60', 'hard'), EMPTY_SKY_STATE, geo, 0);
    expect(hard).toHaveLength(3);
    expect(shapes('rocks', 1)).not.toEqual(shapes('rocks', 0));
    const firstGap = skyShapesAt(ring, EMPTY_SKY_STATE, geo, 0)[0];
    const turnedGap = skyShapesAt(ring, EMPTY_SKY_STATE, geo, 2)[0];
    if (firstGap.kind !== 'ring' || turnedGap.kind !== 'ring') throw Error('ring missing');
    expect(Math.abs(turnedGap.gaps[0].start - firstGap.gaps[0].start)).toBeCloseTo(0.5, 2);
  });

  it('starts rocks apart and moves them on varied diagonal paths', () => {
    const def = skyFor(33, 'rocks', 'PP-33', 'normal');
    const start = skyShapesAt(def, EMPTY_SKY_STATE, geo, 0).filter((shape) => shape.kind === 'rock');
    for (let i = 0; i < start.length; i++) {
      for (let j = i + 1; j < start.length; j++)
        expect(Math.hypot(start[i].x - start[j].x, start[i].y - start[j].y)).toBeGreaterThanOrEqual(0.5 * geo.R);
      const later = skyShapesAt(def, EMPTY_SKY_STATE, geo, 0.2).find((shape) => shape.kind === 'rock' && shape.index === i);
      if (!later || later.kind !== 'rock') throw Error('rock missing');
      expect(later.y).not.toBe(start[i].y);
      expect(Math.abs(def.rockAngle[i])).toBeGreaterThanOrEqual((15 * Math.PI) / 180);
      expect(def.rockSpeed[i]).toBeGreaterThanOrEqual(0.12);
    }
    for (const time of [0, 20, 60, 100])
      for (const shape of skyShapesAt(def, EMPTY_SKY_STATE, geo, time)) {
        if (shape.kind !== 'rock') continue;
        expect(shape.x).toBeGreaterThanOrEqual(-0.12 * geo.R);
        expect(shape.x).toBeLessThanOrEqual(geo.width + 0.12 * geo.R);
        expect(shape.y).toBeGreaterThanOrEqual(-0.12 * geo.R);
        expect(shape.y).toBeLessThanOrEqual(geo.height + 0.12 * geo.R);
      }
  });

  it('keeps seeded rock starts at least half a radius apart on both phones', () => {
    for (const [width, height] of [
      [320, 568],
      [390, 844],
    ]) {
      const phone = sceneGeometry(width, height, 1);
      for (let n = 33; n <= 120; n++) {
        const rocks = skyShapesAt(skyFor(n, 'rocks', `PP-${n}`, 'hard'), EMPTY_SKY_STATE, phone, 0).filter(
          (shape) => shape.kind === 'rock',
        );
        for (let i = 0; i < rocks.length; i++)
          for (let j = i + 1; j < rocks.length; j++)
            expect(
              Math.hypot(rocks[i].x - rocks[j].x, rocks[i].y - rocks[j].y),
              `${width}px planet ${n}, rocks ${i}/${j}`,
            ).toBeGreaterThanOrEqual(0.5 * phone.R);
      }
    }
  });

  it('keeps the complete bubble inside both phone widths', () => {
    for (const width of [320, 390]) {
      const phone = sceneGeometry(width, width === 320 ? 568 : 844, 1);
      for (const time of [0, Math.PI / 0.8, (Math.PI * 2) / 0.8]) {
        const bubble = skyShapesAt(skyFor(41, 'bubble', 'PP-41', 'normal'), EMPTY_SKY_STATE, phone, time)[0];
        if (bubble.kind !== 'bubble') throw Error('bubble missing');
        expect(bubble.x - bubble.r).toBeGreaterThanOrEqual(8 - 1e-8);
        expect(bubble.x + bubble.r).toBeLessThanOrEqual(width - 8 + 1e-8);
      }
    }
  });

  it('removes only broken rocks for the rest of the round', () => {
    const def = skyFor(60, 'rocks', 'PP-60', 'normal');
    expect(skyShapesAt(def, { brokenRocks: [1] }, geo, 0).map((s) => s.kind === 'rock' && s.index)).toEqual([0]);
  });

  it('doubles gusts for 0.6 seconds and warns for the preceding 0.5 seconds', () => {
    const def = skyFor(55, 'wind', 'PP-55', 'hard');
    expect(gustAt(def, 0)).toEqual({ mult: 2, warning: false });
    expect(gustAt(def, 0.6)).toEqual({ mult: 1, warning: false });
    expect(gustAt(def, 1.9)).toEqual({ mult: 1, warning: true });
    expect(gustAt(def, 2.4)).toEqual({ mult: 2, warning: false });
  });

  it('flyFull returns a completed contact with the same geometry as the scene', () => {
    const result = flyFull(
      STAR_SLING,
      { ...geo.launch, vx: 0, vy: -760, elapsed: 0 },
      {
        ...geo,
        radius: geo.R,
        surface: Array(24).fill(geo.R * 0.92),
        rotation: 0,
        spin: 0,
        twist: 'none',
        wind: 170,
      },
      0,
    );
    expect(result.hit).not.toBeNull();
    expect(result.state.elapsed).toBeGreaterThan(0);
    expect(geo).toMatchObject({ cx: 195, cy: 362.92, launcherY: 694 });
    expect(geo.R).toBeCloseTo(105.3);
  });
});
