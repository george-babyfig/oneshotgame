import { expect, it } from 'vitest';
import { flyFull, sceneGeometry, STAR_SLING } from '../src/core/flight';
import { EMPTY_SKY_STATE, skyFor, skyShapesAt } from '../src/core/sky';

const geo = sceneGeometry(390, 844, 1);
const base = { ...geo, radius: geo.R, surface: Array(24).fill(geo.R * 0.92), rotation: 0, spin: 0.45, twist: 'none', wind: 170 };
const shot = { ...geo.launch, vx: 0, vy: -760, elapsed: 0 };
const zeroG = { ...STAR_SLING, gravity: 0 };

it('a rock bonks, reports its index and clears from sky state', () => {
  const sky = skyFor(60, 'rocks', 'PP-60', 'normal');
  sky.rockPhase = [0.5, 0.5, 0.5, 0.5];
  sky.rockRows = [0.5, 0.5, 0.5, 0.5];
  const hit = flyFull(STAR_SLING, shot, { ...base, sky }, 0).hit;
  expect(hit).toMatchObject({ kind: 'bonk', by: 'rock' });
  if (hit?.kind === 'bonk' && hit.rock !== undefined) {
    const next = skyShapesAt(sky, { brokenRocks: [hit.rock] }, geo, 0);
    expect(next.some((shape) => shape.kind === 'rock' && shape.index === hit.rock)).toBe(false);
  }
});

it('a bubble reflects the velocity at 90% speed', () => {
  const sky = skyFor(60, 'bubble', 'PP-60', 'normal');
  const startTime = Math.PI / 1.6;
  const bubble = skyShapesAt(sky, EMPTY_SKY_STATE, geo, startTime)[0];
  if (bubble.kind !== 'bubble') throw Error('expected bubble');
  const incoming = { x: bubble.x, y: bubble.y + bubble.r + 9, vx: 0, vy: -200, elapsed: 0 };
  const result = flyFull(zeroG, incoming, { ...base, sky, surface: Array(24).fill(0) }, startTime);
  expect(result.bounces.length).toBeGreaterThan(0);
  const point = result.points.find((p) => p.elapsed === result.bounces[0].elapsed)!;
  expect(Math.hypot(point.vx, point.vy)).toBeCloseTo(180, 1);
  const atBounce = skyShapesAt(sky, EMPTY_SKY_STATE, geo, startTime + result.bounces[0].elapsed)[0];
  if (atBounce.kind !== 'bubble') throw Error('expected bubble');
  const nx = (result.bounces[0].x - atBounce.x) / Math.hypot(result.bounces[0].x - atBounce.x, result.bounces[0].y - atBounce.y);
  const ny = (result.bounces[0].y - atBounce.y) / Math.hypot(result.bounces[0].x - atBounce.x, result.bounces[0].y - atBounce.y);
  const dot = -200 * ny;
  expect(point.vx).toBeCloseTo(-2 * dot * nx * 0.9, 3);
  expect(point.vy).toBeCloseTo((-200 - 2 * dot * ny) * 0.9, 3);
  expect(flyFull(zeroG, { ...incoming, bounceCount: 3 }, { ...base, sky, surface: Array(24).fill(0) }, startTime).hit).toMatchObject({
    kind: 'bonk',
    by: 'bubble',
  });
});

it('mist pushes sideways and a Tug Star core fizzles', () => {
  const mist = skyFor(60, 'mist', 'PP-60', 'normal');
  const patch = skyShapesAt(mist, EMPTY_SKY_STATE, geo, 0)[0];
  if (patch.kind !== 'mist') throw Error('expected mist');
  const bent = flyFull(
    zeroG,
    { x: patch.x, y: patch.y, vx: 0, vy: -200, elapsed: 0 },
    { ...base, sky: mist, surface: Array(24).fill(0) },
    0,
  );
  expect(bent.points[0].vx).not.toBe(0);
  const tug = skyFor(60, 'tug', 'PP-60', 'normal');
  const star = skyShapesAt(tug, EMPTY_SKY_STATE, geo, 0)[0];
  if (star.kind !== 'tug') throw Error('expected tug');
  expect(flyFull(STAR_SLING, { x: star.x + 12, y: star.y, vx: -100, vy: 0, elapsed: 0 }, { ...base, sky: tug }, 0).hit?.kind).toBe(
    'fizzle',
  );
});

it('ring bonks outside a gap and a sky-free level keeps exact flight numbers', () => {
  const ring = skyFor(60, 'ring', 'PP-60', 'normal');
  ring.ringPhase = Math.PI / 36; // eastward crossing sits between the two widened gaps
  const hit = flyFull(
    zeroG,
    { x: geo.cx + 1.6 * geo.R + 15, y: geo.cy, vx: -200, vy: 0, elapsed: 0 },
    { ...base, sky: ring, surface: Array(24).fill(0) },
    0,
  ).hit;
  expect(hit).toMatchObject({ kind: 'bonk', by: 'ring' });
  const without = flyFull(STAR_SLING, shot, base, 0);
  const empty = flyFull(STAR_SLING, shot, { ...base, sky: skyFor(60, 'none', 'PP-60', 'normal') }, 0);
  expect(empty).toEqual(without);
});

// The pre-M7.5 integrator, kept here to catch drift in unobstructed Sling flight.
function legacyFlight(launch: typeof shot, w: typeof base, t0: number) {
  const state = { ...launch, carry: STAR_SLING.maxTime + STAR_SLING.step };
  const points: { x: number; y: number; vx: number; vy: number; elapsed: number }[] = [];
  let hit: { kind: string; sector?: number } | null = null;
  while (state.carry + 1e-10 >= STAR_SLING.step && !hit) {
    state.carry -= STAR_SLING.step;
    const dx = w.cx - state.x;
    const dy = w.cy - state.y;
    const r2 = Math.max(dx * dx + dy * dy, 400);
    const r = Math.sqrt(r2);
    const a = (w.twist === 'heavy' ? STAR_SLING.gravity * 1.45 : STAR_SLING.gravity) / r2;
    if (w.twist === 'wind') state.vx += w.wind * STAR_SLING.step;
    state.vx += (dx / r) * a * STAR_SLING.step;
    state.vy += (dy / r) * a * STAR_SLING.step;
    state.x += state.vx * STAR_SLING.step;
    state.y += state.vy * STAR_SLING.step;
    state.elapsed += STAR_SLING.step;
    points.push({ x: state.x, y: state.y, vx: state.vx, vy: state.vy, elapsed: state.elapsed });
    const time = t0 + state.elapsed;
    const R = w.radius;
    const moons: { x: number; y: number; r: number }[] = [];
    if (w.twist === 'moon' || w.twist === 'twin') {
      const a = time * 0.8;
      const d = R * 2.05;
      const my = Math.max(R * 1.3, Math.min(d, w.launcherY - w.cy - R * 0.28 - 50));
      moons.push({ x: w.cx + Math.cos(a) * d, y: w.cy + Math.sin(a) * my, r: R * 0.28 });
      if (w.twist === 'twin') {
        const b = -time * 0.6 + Math.PI;
        moons.push({ x: w.cx + Math.cos(b) * R * 1.6, y: w.cy + Math.sin(b) * R * 1.6, r: R * 0.22 });
      }
    }
    if (moons.some((m) => Math.hypot(state.x - m.x, state.y - m.y) < m.r + 8)) hit = { kind: 'bonk' };
    else {
      const rotation =
        w.twist === 'wobble'
          ? w.rotation + ((w.spin * 1.7) / 0.9) * (Math.sin((t0 + state.elapsed) * 0.9) - Math.sin(t0 * 0.9))
          : w.rotation + w.spin * state.elapsed;
      const angle = Math.atan2(state.y - w.cy, state.x - w.cx) - rotation;
      const turn = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sector = Math.floor(turn / ((Math.PI * 2) / 24)) % 24;
      if (Math.hypot(state.x - w.cx, state.y - w.cy) <= (w.surface[sector] ?? R) + STAR_SLING.collisionPadding)
        hit = { kind: 'land', sector };
      else if (
        state.elapsed > STAR_SLING.maxTime ||
        state.x < -150 ||
        state.x > w.width + 150 ||
        state.y < -250 ||
        state.y > w.height + 150
      )
        hit = { kind: 'miss' };
    }
  }
  return { points, state, hit };
}

it('keeps pre-M7.5 flight byte-identical across random launches and old twists', () => {
  let seed = 314159265;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (const twist of ['none', 'fast', 'tiny', 'moon', 'hot', 'frozen', 'ocean', 'wind', 'heavy', 'wobble', 'twin']) {
    for (let i = 0; i < 40; i++) {
      const launch = { ...geo.launch, vx: (random() - 0.5) * 1300, vy: -400 - random() * 700, elapsed: 0 };
      const w = {
        ...base,
        twist,
        radius: twist === 'tiny' ? geo.R * 0.72 : geo.R,
        surface: Array(24).fill((twist === 'tiny' ? geo.R * 0.72 : geo.R) * 0.92),
      };
      const before = legacyFlight(launch, w, 1.3);
      const after = flyFull(STAR_SLING, launch, w, 1.3);
      expect(after.points).toEqual(before.points);
      expect(after.state).toEqual(before.state);
      expect(after.hit?.kind).toBe(before.hit?.kind);
      if (after.hit?.kind === 'land') expect(after.hit.sector).toBe(before.hit?.sector);
    }
  }
});
