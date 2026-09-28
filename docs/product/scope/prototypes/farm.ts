import { newPlanet, impact, labBonus, lifeScore } from './world.ts';
const p = newPlanet();
let bonusTotal = 0;
const seq: any[] = ['ice','magma','ice','magma','ice','magma','ice','magma'];
for (const k of seq) {
  const b0 = lifeScore(p);
  const r = impact(p, k, 5, 0);
  const b = labBonus(5, r.changed.length, r.spawned.length);
  bonusTotal += b;
  console.log(k.padEnd(6), 'planet delta', r.after - b0, 'spawned', r.spawned.map(s=>s.id).join(',')||'-', 'lost', r.lost.join(',')||'-', 'lab5 bonus', b, 'cum bonus', bonusTotal, 'planet life', r.after);
}
