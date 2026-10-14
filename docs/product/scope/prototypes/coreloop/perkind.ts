import { makeLevel } from './levels.ts';
import { SECTORS, lifeScore, type Kind } from './world.ts';
import { initSt, cloneSt, step, type Rules } from './proto.ts';
// Mean realised gain per throw by object, greedy (no swap), with and without reactions.
for (const fusion of [false, true]) {
  const R: Rules = { fusion, glowTtl: 2, glowR: 2 };
  const sum: Record<string, [number, number, number]> = {};
  for (let n = 6; n <= 60; n++) {
    const L = makeLevel(n);
    const st = initSt(L.start);
    for (let t = 0; t < L.throws; t++) {
      const kind = L.queue[t] as Kind;
      let best = -Infinity, at = 0;
      for (let i = 0; i < SECTORS; i++) { const q = cloneSt(st); step(q, kind, i, R); const v = lifeScore(q.p); if (v > best) ((best = v), (at = i)); }
      const r = step(st, kind, at, R);
      const a = (sum[kind] ??= [0, 0, 0]); a[0] += r.delta; a[1]++; if (r.delta <= 3) a[2]++;
    }
  }
  console.log(fusion ? 'with reactions' : 'no reactions  ', Object.entries(sum).map(([k, [s, c, dead]]) => `${k} ${(s / c).toFixed(1)} (dead ${Math.round((100 * dead) / c)}%)`).join(' | '));
}
