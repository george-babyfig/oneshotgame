import { describe, expect, it } from 'vitest';
import { flyFullWithLauncher, flyWithLauncher, sceneGeometry, STAR_SLING, type FlightWorld } from '../src/core/flight';
import { skyFor, skyShapesAt, EMPTY_SKY_STATE } from '../src/core/sky';

const geo = sceneGeometry(390, 844, 1);
const base: FlightWorld = {
  cx: geo.cx,
  cy: geo.cy,
  radius: geo.R,
  surface: Array(24).fill(geo.R * 0.92),
  rotation: 0,
  spin: 0,
  twist: 'none',
  wind: 170,
  width: 390,
  height: 844,
  launcherY: geo.launcherY,
};
const shot = { ...geo.launch, vx: 100, vy: -760, elapsed: 0 };
const selection = (id: 'sling' | 'swoop' | 'zip' | 'thumper' | 'skipper') => ({ id, tune: 1 as const });

describe('launcher flight', () => {
  it('scales launch velocity once across frame chunks and changes gravity', () => {
    const zip = flyWithLauncher(selection('zip'), shot, { ...base, gravity: 0 }, 0, 1 / 60);
    expect(zip.state.launcherApplied).toBe(true);
    expect(zip.points[0].vx).toBe(122);
    const next = flyWithLauncher(selection('zip'), zip.state, { ...base, gravity: 0 }, 0, 1 / 60);
    expect(next.points[0].vx).toBe(122);
    const sling = flyFullWithLauncher(selection('sling'), shot, base, 0);
    const swoop = flyFullWithLauncher(selection('swoop'), shot, base, 0);
    expect(swoop.points[0].vx).not.toBe(sling.points[0].vx);
    expect(swoop.points[0].vy).not.toBe(sling.points[0].vy);
    expect(STAR_SLING.gravity).toBe(5.2e7);
    expect(STAR_SLING.step).toBe(1 / 240);
    expect(STAR_SLING.maxTime).toBe(5);
    expect(STAR_SLING.collisionPadding).toBe(6);
  });

  it('halves Solar Wind and Magnet Mist, leaving a Tug Star unchanged', () => {
    const wind = { ...base, gravity: 0, twist: 'wind' };
    const sling = flyWithLauncher(selection('sling'), { ...shot, vx: 0 }, wind, 0, STAR_SLING.step);
    const zip = flyWithLauncher(selection('zip'), { ...shot, vx: 0, vy: shot.vy / 1.22 }, wind, 0, STAR_SLING.step);
    expect(zip.state.vx).toBeCloseTo(sling.state.vx / 2, 10);
    const mist = skyFor(60, 'mist', 'flight-launchers', 'normal');
    const shape = skyShapesAt(mist, EMPTY_SKY_STATE, { ...geo, R: geo.R }, 0)[0];
    if (shape.kind !== 'mist') throw Error('mist expected');
    const incoming = { x: shape.x, y: shape.y, vx: 0, vy: -200, elapsed: 0 };
    const m1 = flyWithLauncher(selection('sling'), incoming, { ...base, gravity: 0, sky: mist }, 0, STAR_SLING.step);
    const m2 = flyWithLauncher(
      selection('zip'),
      { ...incoming, vy: incoming.vy / 1.22 },
      { ...base, gravity: 0, sky: mist },
      0,
      STAR_SLING.step,
    );
    expect(m2.state.vx).toBeCloseTo(m1.state.vx / 2, 10);
  });

  it('lets Thumper break a Drift Rock and continue', () => {
    const sky = skyFor(60, 'rocks', 'flight-launchers', 'normal');
    const rock = skyShapesAt(sky, EMPTY_SKY_STATE, { ...geo, R: geo.R }, 0)[0];
    if (rock.kind !== 'rock') throw Error('rock expected');
    const incoming = { x: rock.x, y: rock.y + rock.r + 8, vx: 0, vy: -200, elapsed: 0 };
    const world = { ...base, gravity: 0, sky, surface: Array(24).fill(0) };
    expect(flyFullWithLauncher(selection('sling'), incoming, world, 0).hit).toMatchObject({ kind: 'bonk', by: 'rock' });
    const result = flyFullWithLauncher(selection('thumper'), incoming, world, 0);
    expect(result.breaks).toContainEqual(expect.objectContaining({ kind: 'rock', rock: rock.index }));
    expect(result.hit).not.toMatchObject({ kind: 'bonk', by: 'rock' });
    const rebound = flyFullWithLauncher(selection('skipper'), incoming, world, 0);
    expect(rebound.specialBounced).toBe(true);
    expect(rebound.bounces.filter((bounce) => bounce.special)).toHaveLength(1);
  });

  it('breaks or rebounds from the Rubble Ring and rebounds from a moon', () => {
    const ring = skyFor(60, 'ring', 'flight-launchers', 'normal');
    ring.ringPhase = Math.PI / 36;
    const start = { x: geo.cx + 1.6 * geo.R + 15, y: geo.cy, vx: -200, vy: 0, elapsed: 0 };
    const ringWorld = { ...base, gravity: 0, sky: ring, surface: Array(24).fill(0) };
    expect(flyFullWithLauncher(selection('sling'), start, ringWorld, 0).hit).toMatchObject({ kind: 'bonk', by: 'ring' });
    const thump = flyFullWithLauncher(selection('thumper'), start, ringWorld, 0);
    expect(thump.breaks).toContainEqual(expect.objectContaining({ kind: 'ring' }));
    expect(thump.hit).not.toMatchObject({ kind: 'bonk', by: 'ring' });
    const skip = flyFullWithLauncher(selection('skipper'), start, ringWorld, 0);
    expect(skip.specialBounced).toBe(true);
    expect(skip.bounces.some((bounce) => bounce.special)).toBe(true);
    const moonX = geo.cx + geo.R * 2.05;
    const moonY = geo.cy + Math.max(geo.R * 1.3, Math.min(geo.R * 2.05, geo.launcherY - geo.cy - geo.R * 0.28 - 50)) * 0;
    const moonStart = { x: moonX, y: moonY + geo.R * 0.28 + 10, vx: 0, vy: -200, elapsed: 0 };
    const moonWorld = { ...base, twist: 'moon', gravity: 0, surface: Array(24).fill(0) };
    expect(flyFullWithLauncher(selection('sling'), moonStart, moonWorld, 0).hit).toMatchObject({ kind: 'bonk', by: 'moon' });
    expect(flyFullWithLauncher(selection('skipper'), moonStart, moonWorld, 0).specialBounced).toBe(true);
  });

  it('cannot damage the Comet Guardian after rebounding from it', () => {
    const moonR = geo.R * 0.3;
    const x = geo.cx + Math.min(geo.R * 2.15, base.width / 2 - moonR * 1.3);
    const y = geo.cy + Math.max(geo.R * 1.2, Math.min(geo.R * 1.75, geo.launcherY - geo.cy - moonR - 60));
    const incoming = { x, y: y + moonR + 10, vx: 0, vy: -200, elapsed: 0 };
    const world = { ...base, twist: 'boss', bossActive: true, gravity: 0, surface: Array(24).fill(0) };
    expect(flyFullWithLauncher(selection('sling'), incoming, world, 0).hit?.kind).toBe('boss');
    const skipped = flyFullWithLauncher(selection('skipper'), incoming, world, 0);
    expect(skipped.specialBounced).toBe(true);
    expect(skipped.hit?.kind).not.toBe('boss');
    const spent = flyFullWithLauncher(selection('skipper'), { ...incoming, specialBounced: true }, world, 0);
    expect(spent.hit).toMatchObject({ kind: 'bonk', by: 'moon' });
  });

  it('keeps ordinary Bubble Moon rebounds separate from Skipper special rebounds', () => {
    const sky = skyFor(60, 'bubble', 'flight-launchers', 'normal');
    const bubble = skyShapesAt(sky, EMPTY_SKY_STATE, { ...geo, R: geo.R }, 0)[0];
    if (bubble.kind !== 'bubble') throw Error('bubble expected');
    const incoming = { x: bubble.x, y: bubble.y + bubble.r + 9, vx: 0, vy: -200, elapsed: 0 };
    const result = flyFullWithLauncher(selection('skipper'), incoming, { ...base, gravity: 0, sky, surface: Array(24).fill(0) }, 0);
    expect(result.bounces.length).toBeGreaterThan(0);
    expect(result.bounces[0].special).toBeUndefined();
    expect(result.specialBounced).toBe(false);
  });
});
