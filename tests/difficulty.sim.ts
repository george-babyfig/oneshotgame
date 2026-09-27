import { it } from 'vitest';
import { makeLevel, starsEarned } from '../src/core/levels';
import { SECTORS, clonePlanet, impact, lifeScore } from '../src/core/world';

function play(n: number, aimErr: number, randomShare: number, rnd: () => number) {
  const L = makeLevel(n);
  const p = clonePlanet(L.start);
  for (let t = 0; t < L.throws; t++) {
    const kind = L.queue[t];
    let at: number;
    if (rnd() < randomShare) at = Math.floor(rnd() * SECTORS);
    else {
      let best = -1;
      at = 0;
      for (let i = 0; i < SECTORS; i++) {
        const r = impact(clonePlanet(p), kind, i);
        if (r.after > best) ((best = r.after), (at = i));
      }
      if (rnd() < aimErr) at += rnd() < 0.5 ? -1 : 1;
    }
    impact(p, kind, ((at % SECTORS) + SECTORS) % SECTORS);
  }
  return { st: starsEarned(p, lifeScore(p), L), d: L.difficulty, goals: L.goals.length };
}

// Difficulty survey: bots of different skill play levels 1-60 (goals included).
// Output per band and difficulty: fail% / 3-star%. Targets for a "decent" player:
// normal ~5-30% fails rising by chapter, hard ~25-45%, super hard ~35-65%.
it('difficulty survey', () => {
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const profiles = { casual: [0.4, 0.3], decent: [0.25, 0.1], sharp: [0.1, 0] } as Record<string, [number, number]>;
  const RUNS = Number(process.env.RUNS ?? 20);
  for (const band of [
    [1, 10],
    [11, 20],
    [21, 30],
    [31, 45],
    [46, 60],
  ]) {
    const row: string[] = [];
    for (const [name, [e, r]] of Object.entries(profiles)) {
      const agg: Record<string, [number, number, number]> = {};
      for (let n = band[0]; n <= band[1]; n++)
        for (let k = 0; k < RUNS; k++) {
          const x = play(n, e, r, rnd);
          const a = (agg[x.d] ??= [0, 0, 0]);
          a[0]++;
          if (x.st === 0) a[1]++;
          if (x.st === 3) a[2]++;
        }
      row.push(
        name +
          ' ' +
          Object.entries(agg)
            .map(([d, [r2, f, th]]) => `${d[0]}:${Math.round((f / r2) * 100)}%/${Math.round((th / r2) * 100)}`)
            .join(' '),
      );
    }
    console.log(`L${band[0]}-${band[1]}  ` + row.join(' | '));
  }
  let g = 0;
  for (let n = 1; n <= 60; n++) g += makeLevel(n).goals.length ? 1 : 0;
  console.log('levels with goals', g);
});
