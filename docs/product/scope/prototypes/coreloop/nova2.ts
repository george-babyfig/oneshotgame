import { makeLevel } from './levels.ts';
import { BIOMES, SECTORS, clonePlanet, impact, lifeScore, novaCharge, type Kind, type Planet } from './world.ts';
// Compare Supernova frequency: today's rule vs "upgrades only + escalating threshold".
function run(n: number, mode: 'old' | 'new') {
  const L = makeLevel(n);
  const p = clonePlanet(L.start);
  let charge = 0, fired = 0, need = mode === 'old' ? 10 : 12, firstAt = -1, gainNova = 0, gainOther = 0, cNova = 0, cOther = 0;
  for (let t = 0; t < L.throws; t++) {
    const kind = L.queue[t] as Kind;
    const nova = charge >= need;
    let best = -1, at = 0;
    for (let i = 0; i < SECTORS; i++) { const q = clonePlanet(p); const r = impact(q, kind, i, 0, { nova }); if (r.after > best) ((best = r.after), (at = i)); }
    const prev = p.sectors.map((s) => BIOMES[s.biome].value);
    const r = impact(p, kind, at, 0, { nova });
    if (nova) { fired++; if (firstAt < 0) firstAt = t + 1; charge = 0; gainNova += r.after - r.before; cNova++; if (mode === 'new') need = 18; continue; }
    gainOther += r.after - r.before; cOther++;
    if (mode === 'old') charge = Math.min(need, charge + novaCharge(r.changed.length, r.spawned.length));
    else {
      const ups = r.changed.filter((i) => BIOMES[p.sectors[i].biome].value > prev[i]).length;
      const net = r.after - r.before;
      charge = Math.min(need, charge + (net > 0 ? ups + 2 * r.spawned.length : 0));
    }
  }
  return { fired, firstAt, gainNova: cNova ? gainNova / cNova : 0, gainOther: cOther ? gainOther / cOther : 0 };
}
for (const mode of ['old', 'new'] as const) {
  let f = 0, first = 0, fn = 0, gn = 0, go = 0, k = 0;
  for (let n = 3; n <= 60; n++) { const r = run(n, mode); f += r.fired; if (r.firstAt > 0) { first += r.firstAt; fn++; } gn += r.gainNova; go += r.gainOther; k++; }
  console.log(`${mode}: novas/level ${(f / k).toFixed(2)} | first fire at throw ${(first / fn).toFixed(1)} | avg nova gain ${(gn / k).toFixed(1)} vs other ${(go / k).toFixed(1)}`);
}
