import { KINDS, SECTORS, clonePlanet, impact, lifeScore, newPlanet, settle, type Kind, type Planet, type Sector } from './world';

// ------------------------------------------------------------------ rng
export function rngFrom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Twist = 'none' | 'fast' | 'tiny' | 'moon' | 'hot' | 'frozen' | 'ocean';

export const TWISTS: Record<Twist, { name: string; desc: string }> = {
  none: { name: '', desc: '' },
  fast: { name: 'Fast Spin', desc: 'This planet spins twice as fast' },
  tiny: { name: 'Tiny World', desc: 'A small planet — aim carefully' },
  moon: { name: 'Moon Guard', desc: 'A moon orbits and blocks shots' },
  hot: { name: 'Scorched', desc: 'Starts baking hot' },
  frozen: { name: 'Snowball', desc: 'Starts frozen solid' },
  ocean: { name: 'Water World', desc: 'Starts covered in ocean' },
};

export interface LevelDef {
  n: number;
  seed: string;
  throws: number;
  queue: Kind[]; // deal order (length >= throws + bonus)
  twist: Twist;
  spin: number; // radians per second
  size: number; // planet radius multiplier
  stars: [number, number, number]; // life targets
  start: Planet;
  name: string;
  hue: number;
}

const NAMES_A = ['Pebble', 'Mossy', 'Glim', 'Tumble', 'Nova', 'Bramble', 'Puddle', 'Ember', 'Frost', 'Cosmo', 'Lumen', 'Dewdrop', 'Zephyr', 'Marble', 'Sprout', 'Comet'];
const NAMES_B = ['Rock', 'World', 'Orb', 'Globe', 'Isle', 'Sphere', 'Haven', 'Prime', 'Minor', 'Major'];

export function availableKinds(n: number): Kind[] {
  return (Object.keys(KINDS) as Kind[]).filter((k) => KINDS[k].unlock <= n);
}

function startFor(twist: Twist, rnd: () => number): Planet {
  switch (twist) {
    case 'hot':
      return newPlanet(() => ({ heat: 2 }));
    case 'frozen':
      return newPlanet(() => ({ heat: -2, water: 1 }));
    case 'ocean':
      return newPlanet((i) => ({ water: i % 6 === 0 ? 1 : 3 }));
    default: {
      // a couple of random features so no two planets start identical
      const p = newPlanet();
      const lakes = Math.floor(rnd() * 3);
      for (let k = 0; k < lakes; k++) {
        const i = Math.floor(rnd() * SECTORS);
        p.sectors[i].water = 2;
      }
      return p;
    }
  }
}

/**
 * Best life score a perfect-aim greedy player reaches with this queue.
 * Used to set star targets so every generated level is beatable.
 */
export function greedyScore(start: Planet, queue: Kind[], throws: number, splash = 0): number {
  const p = clonePlanet(start);
  for (let t = 0; t < throws; t++) {
    const kind = queue[t];
    let best = -1;
    let bestAt = 0;
    for (let i = 0; i < SECTORS; i++) {
      const q = clonePlanet(p);
      const r = impact(q, kind, i, splash);
      if (r.after > best) {
        best = r.after;
        bestAt = i;
      }
    }
    impact(p, kind, bestAt, splash);
  }
  return lifeScore(p);
}

export function makeLevel(n: number, seedPrefix = 'PP'): LevelDef {
  const seed = `${seedPrefix}-${n}`;
  const rnd = rngFrom(seed);
  const kinds = availableKinds(n);
  let twist: Twist = 'none';
  if (n >= 5 && n % 5 === 0) {
    const pool: Twist[] = ['fast', 'tiny', 'moon', 'hot', 'frozen', 'ocean'];
    twist = pool[Math.floor(rnd() * pool.length)];
  } else if (n >= 8 && rnd() < 0.25) {
    twist = (['fast', 'tiny', 'moon'] as Twist[])[Math.floor(rnd() * 3)];
  }
  const throws = n === 1 ? 6 : n === 2 ? 8 : Math.min(16, 9 + Math.floor(n / 4));
  // weighted deal: new kinds show up a bit more on their debut level
  const weights: Record<Kind, number> = { rock: 4, ice: 4, seed: 4, magma: 3, storm: 2, sun: 1.5 };
  const queue: Kind[] = [];
  if (n === 1) queue.push('rock', 'ice', 'ice', 'rock', 'ice', 'rock');
  if (n === 2) queue.push('seed', 'ice', 'seed', 'rock', 'seed', 'ice', 'seed', 'rock');
  const debut = kinds.find((k) => KINDS[k].unlock === n);
  if (debut && n > 2) queue.push(debut);
  while (queue.length < throws + 12) {
    const total = kinds.reduce((a, k) => a + weights[k] * (k === debut ? 1.6 : 1), 0);
    let roll = rnd() * total;
    for (const k of kinds) {
      roll -= weights[k] * (k === debut ? 1.6 : 1);
      if (roll < 0) {
        queue.push(k);
        break;
      }
    }
  }
  const start = startFor(twist, rnd);
  settle(start); // creatures that already fit the starting planet are there from the start
  const best = greedyScore(start, queue, throws);
  const base = lifeScore(start);
  // Star targets as a share of the greedy optimum; gentle early, tighter later.
  const ease = Math.min(1, (n - 1) / 25);
  const f1 = 0.4 + 0.2 * ease;
  const f2 = 0.6 + 0.16 * ease;
  const f3 = 0.8 + 0.11 * ease;
  const t = (f: number) => Math.max(base + 5, Math.round((base + (best - base) * f) / 5) * 5);
  const stars: [number, number, number] = [t(f1), t(f2), t(f3)];
  if (stars[1] <= stars[0]) stars[1] = stars[0] + 5;
  if (stars[2] <= stars[1]) stars[2] = stars[1] + 5;
  const spin = (twist === 'fast' ? 0.9 : 0.35 + Math.min(0.3, n * 0.012)) * (rnd() < 0.5 ? 1 : -1);
  return {
    n,
    seed,
    throws,
    queue,
    twist,
    spin,
    size: twist === 'tiny' ? 0.72 : 1,
    stars,
    start,
    name: `${NAMES_A[Math.floor(rnd() * NAMES_A.length)]} ${NAMES_B[Math.floor(rnd() * NAMES_B.length)]}`,
    hue: 200 + Math.floor(rnd() * 110), // blues through violets: keeps space looking like space
  };
}

export function starsFor(score: number, stars: [number, number, number]): number {
  return score >= stars[2] ? 3 : score >= stars[1] ? 2 : score >= stars[0] ? 1 : 0;
}

export type { Sector };
