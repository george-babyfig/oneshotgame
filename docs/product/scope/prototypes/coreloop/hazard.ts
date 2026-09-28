import { makeLevel, rngFrom } from './levels.ts';
import { lifeScore, SECTORS } from './world.ts';
import { play, type Rules } from './proto.ts';
const EVERY = Number(process.env.EVERY ?? 2);
const agg = { n: 0, none: 0, blind: 0, aware: 0, awareSwap: 0, burnedBlind: 0, burnedAware: 0, qBlind: 0, qAware: 0, worseBlind: 0 };
const rows: any[] = [];
for (let n = 14; n <= 60; n++) {
  const L = makeLevel(n);
  const rnd = rngFrom(`${L.seed}-hz`);
  const vents = L.difficulty === 'normal' ? [Math.floor(rnd() * SECTORS)] : [Math.floor(rnd() * SECTORS), Math.floor(rnd() * SECTORS)];
  const base = lifeScore(L.start);
  const R0: Rules = { fusion: true, glowTtl: 2, glowR: 2 };
  const RH: Rules = { ...R0, hazard: { vents, every: EVERY } };
  const none = play(L.start, L.queue, L.throws, R0, { aware: true, swap: false });
  const blind = play(L.start, L.queue, L.throws, RH, { aware: false, swap: false });
  // "aware of reactions, blind to hazard": use R0 for choice by temporarily ignoring vents
  const aware = play(L.start, L.queue, L.throws, RH, { aware: true, swap: false, lookHazard: true });
  const sw = play(L.start, L.queue, L.throws, RH, { aware: true, swap: true, lookHazard: true });
  agg.n++;
  agg.none += none.score - base; agg.blind += blind.score - base; agg.aware += aware.score - base; agg.awareSwap += sw.score - base;
  agg.burnedBlind += blind.burned; agg.burnedAware += aware.burned; agg.qBlind += blind.quenched; agg.qAware += aware.quenched;
  if (n % 5 === 0) rows.push({ n, d: L.difficulty, vents: vents.length, noHaz: none.score - base, blind: blind.score - base, aware: aware.score - base, swap: sw.score - base, burnB: blind.burned, burnA: aware.burned, qA: aware.quenched });
}
console.table(rows);
const f = (x: number) => (x / agg.n).toFixed(1);
console.log(`EVERY=${EVERY} levels ${agg.n}: mean gain no-hazard ${f(agg.none)} | hazard, hazard-blind player ${f(agg.blind)} | hazard-aware ${f(agg.aware)} | aware+swap ${f(agg.awareSwap)}`);
console.log(`burns/level blind ${f(agg.burnedBlind)} aware ${f(agg.burnedAware)} | vents quenched/level blind ${f(agg.qBlind)} aware ${f(agg.qAware)}`);
