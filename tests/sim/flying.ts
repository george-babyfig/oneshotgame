import { flyFull, sceneGeometry, STAR_SLING, type FlightHit, type FlightWorld } from '../../src/core/flight';
import { EMPTY_SKY_STATE, type SkyState } from '../../src/core/sky';
import type { LevelDef } from '../../src/core/levels';
import type { Planet } from '../../src/core/world';
import { surfaceK } from '../../src/ui/art/planet';

// The scene's pull() caps at 150 px and multiplies each component by 6.2.
export const MAX_PULL = 150;
export const PULL_TO_SPEED = 6.2;
const DEG = Math.PI / 180;
export type Phone = { width: number; height: number };
export const PHONES: Phone[] = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

export function flightWorld(
  level: LevelDef,
  planet: Planet,
  skyState: SkyState,
  phone: Phone,
  time: number,
): {
  world: FlightWorld;
  launch: { x: number; y: number };
} {
  const geo = sceneGeometry(phone.width, phone.height, level.size);
  const rotation = level.twist === 'wobble' ? (level.spin * 1.7 * Math.sin(time * 0.9)) / 0.9 : level.spin * time;
  return {
    launch: geo.launch,
    world: {
      cx: geo.cx,
      cy: geo.cy,
      radius: geo.R,
      surface: planet.sectors.map((sector) => geo.R * surfaceK(sector)),
      rotation,
      spin: level.spin,
      twist: level.twist,
      wind: level.spin > 0 ? 170 : -170,
      width: geo.width,
      height: geo.height,
      launcherY: geo.launcherY,
      sky: level.sky,
      skyState,
      bossActive: true,
    },
  };
}

export interface Pull {
  angle: number;
  power: number; // fraction of the real maximum pull
}

const seedCache = new Map<string, Map<number, Pull>>();
/** Reuse unobstructed Sling solutions as guesses across throws and runs. */
export function seedPulls(key: string, launch: { x: number; y: number }, world: FlightWorld): Map<number, Pull> {
  const cached = seedCache.get(key);
  if (cached) return cached;
  const found = new Map<number, Pull>();
  const clear = { ...world, sky: undefined };
  for (const p of [76, 60, 92, 44, 100, 28]) {
    for (let a = -180; a < 180; a += 4) {
      const pull = { angle: a * DEG, power: p / 100 };
      const sector = flyPull(pull, 0, launch, clear).sector;
      if (sector !== null && !found.has(sector)) found.set(sector, pull);
    }
    if (found.size === 24) break;
  }
  seedCache.set(key, found);
  return found;
}

export function seedHint(hints: Map<number, Pull>, sector: number, world: FlightWorld): Pull | undefined {
  const shift = Math.round(world.rotation / ((Math.PI * 2) / 24));
  return hints.get((((sector + shift) % 24) + 24) % 24);
}

export function flyPull(pull: Pull, at: number, launch: { x: number; y: number }, world: FlightWorld) {
  const speed = MAX_PULL * PULL_TO_SPEED * pull.power;
  return flyFull(STAR_SLING, { ...launch, vx: Math.cos(pull.angle) * speed, vy: Math.sin(pull.angle) * speed, elapsed: 0 }, world, at);
}

export function isBonk(hit: FlightHit | null) {
  return hit?.kind === 'bonk' || hit?.kind === 'fizzle';
}

/** First search a sparse grid, then snap a successful vector to the requested 0.5°/2% grid. */
export function findPull(
  target: number,
  at: number,
  launch: { x: number; y: number },
  world: FlightWorld,
  hint?: Pull,
  quick = false,
): Pull | null {
  const tried = new Set<string>();
  const tryOne = (a: number, p: number): Pull | null => {
    if (p < 20 || p > 100) return null;
    const key = `${a}:${p}`;
    if (tried.has(key)) return null;
    tried.add(key);
    const result = flyPull({ angle: a * DEG, power: p / 100 }, at, launch, world);
    return result.sector === target ? { angle: a * DEG, power: p / 100 } : null;
  };
  if (hint) {
    const a = Math.round(hint.angle / DEG / 0.5) * 0.5;
    const p = Math.round(hint.power * 50) * 2;
    for (let da = 0; da <= (quick ? 2 : 4); da += quick ? 2 : 0.5)
      for (const sign of da ? [1, -1] : [1])
        for (let dp = quick ? 0 : -2; dp <= (quick ? 0 : 2); dp += 2) {
          const hit = tryOne(a + da * sign, p + dp);
          if (hit) return hit;
        }
  }
  if (quick) return null;
  for (const p of [76, 60, 92, 44, 100, 28]) {
    for (let a = -180; a < 180; a += 6) {
      const hit = tryOne(a, p);
      if (hit) return hit;
    }
  }
  // A ring rejects broad angular bands, so a denser global sweep mostly
  // repeats blocked trajectories; local half-degree refinement still applies.
  const angleStep = world.sky?.obstacle === 'ring' ? 6 : 2;
  for (let p = 30; p <= 100; p += 4)
    for (let a = -180; a < 180; a += angleStep) {
      const hit = tryOne(a, p);
      if (hit) return hit;
    }
  return null;
}

export function noise(random: () => number) {
  const u = Math.max(1e-12, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

export function emptySkyState(): SkyState {
  return { brokenRocks: [...EMPTY_SKY_STATE.brokenRocks] };
}
