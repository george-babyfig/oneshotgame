import { expect, it } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { flyPull, flightWorld } from './sim/flying';

it('offers at least five real contacts or curved landings on every teaching planet', () => {
  const phone = { width: 390, height: 844 };
  for (const n of [33, 41, 46, 51, 57]) {
    const level = makeLevel(n);
    const kinds = n === 57 ? ['fizzle', 'curve'] : n === 46 ? ['curve'] : n === 41 ? ['bounce'] : ['bonk'];
    for (const kind of kinds) {
      let found = 0;
      for (const at of [0, 1.5, 3]) {
        const { world, launch } = flightWorld(level, level.start, { brokenRocks: [] }, phone, at);
        for (let power = 0.35; power <= 1 && found < 5; power += 0.05)
          for (let deg = -175; deg <= -5 && found < 5; deg += kind === 'fizzle' ? 2 : 5) {
            const pull = { angle: (deg * Math.PI) / 180, power };
            const path = flyPull(pull, at, launch, world);
            const clear = flyPull(pull, at, launch, { ...world, sky: undefined });
            const matches =
              kind === 'bounce'
                ? path.bounces.length > 0
                : kind === 'fizzle'
                  ? path.hit?.kind === 'fizzle'
                  : kind === 'curve'
                    ? path.hit?.kind === 'land' && Math.hypot(path.state.x - clear.state.x, path.state.y - clear.state.y) > 8
                    : path.hit?.kind === 'bonk' && path.hit.by === (n === 33 ? 'rock' : 'ring');
            if (matches) found++;
          }
        if (found >= 5) break;
      }
      expect(found, `planet ${n} ${kind}`).toBeGreaterThanOrEqual(5);
    }
  }
}, 30_000);
