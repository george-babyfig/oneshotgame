import { expect, it } from 'vitest';
import { makeLevel, type Difficulty, type Twist } from '../src/core/levels';
import { skyFor } from '../src/core/sky';
import { SECTORS } from '../src/core/world';
import { findPull, flightWorld, flyPull, PHONES, seedHint, seedPulls, emptySkyState } from './sim/flying';
import { LAUNCH_ROSTER, type LauncherSelection } from '../src/core/launchers';

const TWISTS: Twist[] = [
  'none',
  'fast',
  'tiny',
  'moon',
  'hot',
  'frozen',
  'ocean',
  'wind',
  'heavy',
  'wobble',
  'twin',
  'boss',
  'rocks',
  'bubble',
  'mist',
  'ring',
  'tug',
];

/** Representative campaign layout, with a synthetic variant only when the campaign lacks one. */
function sample(twist: Twist, difficulty: Difficulty) {
  for (let n = 31; n <= 120; n++) {
    const level = makeLevel(n);
    if (level.twist === twist && level.difficulty === difficulty) return level;
  }
  const n = difficulty === 'hard' ? 65 : 66;
  const level = makeLevel(n);
  return {
    ...level,
    twist,
    difficulty,
    size: twist === 'tiny' ? 0.72 : 1,
    sky: skyFor(n, twist, `${level.seed}-reach-${twist}`, difficulty),
  };
}

it(
  'reaches every sector for every launcher, twist and obstacle variant',
  () => {
    const started = performance.now();
    const failures: string[] = [];
    let checks = 0;
    const selections: LauncherSelection[] = (process.env.REACH_LAUNCHERS === '1' ? LAUNCH_ROSTER : (['sling'] as const)).map((id) => ({
      id,
      tune: 1,
    }));
    if (process.env.REACH_LAUNCHERS === '1') selections.push({ id: 'zip', tune: 3 }, { id: 'zip', tune: 4 });
    for (const selection of selections)
      for (const twist of TWISTS.filter((twist) => !process.env.REACH_TWIST || twist === process.env.REACH_TWIST))
        for (const difficulty of ['normal', 'hard'] as const) {
          const variantStarted = performance.now();
          let fallbacks = 0;
          const level = sample(twist, difficulty);
          const skyState = emptySkyState();
          const phone = PHONES[0];
          const base = flightWorld(level, level.start, skyState, phone, 0);
          const hints = seedPulls(`reach:${level.seed}:${twist}:${difficulty}`, base.launch, base.world, selection);
          if (twist === 'ring') {
            const seen = Array.from({ length: 16 }, () => new Map<number, { angle: number; power: number }>());
            for (let index = 0; index < seen.length; index++) {
              const time = index * 0.375;
              const { world, launch } = flightWorld(level, level.start, skyState, phone, time);
              const powers = selection.id === 'zip' ? Array.from({ length: 21 }, (_, i) => 0.2 + i * 0.04) : [0.32, 0.48, 0.64, 0.8, 0.96];
              for (const power of powers) {
                for (let angle = -180; angle < 180; angle += selection.id === 'zip' ? 2 : 4) {
                  const pull = { angle: (angle * Math.PI) / 180, power };
                  const sector = flyPull(pull, time, launch, world, selection).sector;
                  if (sector !== null && !seen[index].has(sector)) seen[index].set(sector, pull);
                }
              }
            }
            for (let offset = 0; offset < 8; offset++)
              for (let sector = 0; sector < SECTORS; sector++) {
                checks++;
                if (seen.slice(offset, offset + 9).some((set) => set.has(sector))) continue;
                // Fine grid around a neighbouring landing, only where the coarse sweep left a gap.
                for (let index = offset; index <= offset + 8 && !seen[index].has(sector); index++) {
                  const near = seen[index].get((sector + 1) % SECTORS) ?? seen[index].get((sector + SECTORS - 1) % SECTORS);
                  if (!near) continue;
                  const time = index * 0.375;
                  const { world, launch } = flightWorld(level, level.start, skyState, phone, time);
                  for (let da = -2; da <= 2 && !seen[index].has(sector); da += 0.5)
                    for (let dp = -4; dp <= 4; dp += 2) {
                      const pull = { angle: near.angle + (da * Math.PI) / 180, power: near.power + dp / 100 };
                      if (pull.power > 1 || pull.power < 0.02) continue;
                      if (flyPull(pull, time, launch, world, selection).sector === sector) {
                        seen[index].set(sector, pull);
                        break;
                      }
                    }
                }
                if (!seen.slice(offset, offset + 9).some((set) => set.has(sector)))
                  failures.push(`${selection.id}/T${selection.tune}/${twist}/${difficulty} offset ${offset} sector ${sector}`);
              }
            console.log(
              `${selection.id}/T${selection.tune}/${twist}/${difficulty}: grid sweep ${((performance.now() - variantStarted) / 1000).toFixed(1)}s`,
            );
            continue;
          }
          for (let offset = 0; offset < 8; offset++) {
            for (let sector = 0; sector < SECTORS; sector++) {
              checks++;
              let found = false;
              for (const delay of [0, 1.5, 3]) {
                const time = offset * 0.375 + delay;
                const { world, launch } = flightWorld(level, level.start, skyState, phone, time);
                if (twist === 'boss') world.bossActive = false;
                const pull = findPull(sector, time, launch, world, seedHint(hints, sector, world), true, selection);
                found = !!pull;
                if (found) break;
              }
              if (!found) {
                fallbacks++;
                // Coarse-to-fine search only for sectors that the cached Sling guess misses.
                for (const delay of [0, 1.5, 3]) {
                  const time = offset * 0.375 + delay;
                  const { world, launch } = flightWorld(level, level.start, skyState, phone, time);
                  if (twist === 'boss') world.bossActive = false;
                  const pull = findPull(sector, time, launch, world, seedHint(hints, sector, world), false, selection);
                  found = !!pull;
                  if (found) break;
                }
              }
              if (!found) failures.push(`${selection.id}/T${selection.tune}/${twist}/${difficulty} offset ${offset} sector ${sector}`);
            }
          }
          console.log(
            `${selection.id}/T${selection.tune}/${twist}/${difficulty}: ${fallbacks} deep searches, ${((performance.now() - variantStarted) / 1000).toFixed(1)}s`,
          );
        }
    console.log(`Reachability: ${checks - failures.length}/${checks} sectors in ${((performance.now() - started) / 1000).toFixed(1)}s`);
    expect(failures.slice(0, 16), `${failures.length} unreachable sector/variant/offset combinations`).toEqual([]);
  },
  process.env.REACH_LAUNCHERS === '1' ? 3_600_000 : 60_000,
);
