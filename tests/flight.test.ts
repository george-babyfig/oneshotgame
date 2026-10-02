import { describe, expect, it } from 'vitest';
import { fly, STAR_SLING, type FlightHit, type FlightLaunch, type FlightWorld } from '../src/core/flight';

const vectors = [
  [-330, -640],
  [-160, -720],
  [0, -760],
  [160, -720],
  [330, -640],
] as const;

function world(twist: string): FlightWorld {
  const radius = 105 * (twist === 'tiny' ? 0.72 : 1);
  return {
    cx: 195,
    cy: 363,
    radius,
    gravity: STAR_SLING.gravity,
    surface: Array(24).fill(radius * 0.92),
    rotation: 0.2,
    spin: twist === 'fast' ? 0.9 : 0.45,
    twist,
    wind: 170,
    width: 390,
    height: 844,
    launcherY: 694,
    bossActive: twist === 'boss',
  };
}

function run(twist: string, vx: number, vy: number, hz: number) {
  const w = world(twist);
  let state: FlightLaunch = { x: 195, y: 694, vx, vy, elapsed: 0, carry: 0 };
  let hit: FlightHit | null = null;
  for (let i = 0; i < hz * 5 + 2 && !hit; i++) {
    const result = fly(STAR_SLING, state, w, 0, 1 / hz);
    state = result.state;
    hit = result.hit;
  }
  return hit?.kind === 'land' ? hit.sector : (hit?.kind ?? 'miss');
}

// Captured from the pre-extraction scene at 60 Hz, with four physics substeps per frame.
const previous: Record<string, (number | string)[]> = {
  none: [9, 6, 4, 3, 23],
  wind: [8, 6, 4, 2, 'miss'],
  heavy: [8, 6, 4, 3, 0],
  fast: [9, 5, 4, 2, 22],
  wobble: [9, 6, 4, 2, 22],
  tiny: ['miss', 7, 4, 2, 'miss'],
  moon: [9, 6, 4, 3, 23],
  twin: [9, 6, 4, 3, 23],
  boss: [9, 6, 4, 3, 23],
};

describe('Star Sling flight', () => {
  it('matches the former scene landing sectors across flight twists', () => {
    for (const [twist, expected] of Object.entries(previous)) {
      expect(
        vectors.map(([vx, vy]) => run(twist, vx, vy, 60)),
        twist,
      ).toEqual(expected);
    }
  });

  it('is deterministic for the same launch', () => {
    const first = run('wobble', -160, -720, 60);
    expect(run('wobble', -160, -720, 60)).toBe(first);
  });

  it('lands in the same sector for 60 and 120 Hz callers', () => {
    for (const twist of Object.keys(previous)) {
      for (const [vx, vy] of vectors) expect(run(twist, vx, vy, 120), twist).toBe(run(twist, vx, vy, 60));
    }
  });

  it('keeps the old moon and Guardian blocks', () => {
    expect(run('moon', 500, -500, 60)).toBe('bonk');
    expect(run('twin', -500, -700, 60)).toBe('bonk');
    expect(run('boss', 400, -500, 60)).toBe('boss');
  });
});
