import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { flyFull, STAR_SLING, sceneGeometry } from '../src/core/flight';
import { skyFor } from '../src/core/sky';

const geometry = sceneGeometry(390, 844, 1);
const vectors = [
  [-330, -640],
  [-160, -720],
  [0, -760],
  [160, -720],
  [330, -640],
] as const;
const fixture = new URL('./fixtures/flight/star-sling.json', import.meta.url);

function capture() {
  return JSON.stringify(
    ['none', 'wind', 'heavy', 'wobble', 'moon', 'twin', 'rocks', 'bubble', 'mist', 'ring', 'tug'].map((twist) => {
      const world = {
        cx: geometry.cx,
        cy: geometry.cy,
        radius: geometry.R,
        surface: Array(24).fill(geometry.R * 0.92),
        rotation: 0.2,
        spin: 0.45,
        twist,
        wind: 170,
        width: 390,
        height: 844,
        launcherY: geometry.launcherY,
        sky: skyFor(60, twist as 'none', 'sling-fixture', 'normal'),
      };
      return [
        twist,
        ...vectors.map(([vx, vy]) => {
          const result = flyFull(STAR_SLING, { ...geometry.launch, vx, vy, elapsed: 0 }, world, 0.6);
          return { state: result.state, hit: result.hit, sector: result.sector, bounces: result.bounces, points: result.points };
        }),
      ];
    }),
  );
}

it('keeps the Star Sling flight serialized byte for byte', () => {
  const actual = capture();
  expect(actual).toBe(readFileSync(fixture, 'utf8'));
});
