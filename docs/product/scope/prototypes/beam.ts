import { makeLevel, greedyPlan, NOVA_CHARGE } from './levels.ts';
import { impact, clonePlanet, lifeScore, SECTORS, novaCharge, KINDS } from './world.ts';
type St = { p: any; charge: number; hand: [string,string]; qi: number; score: number };
function beam(L: any, W: number, swap: boolean) {
  let states: St[] = [{ p: clonePlanet(L.start), charge: 0, hand: [L.queue[0], L.queue[1]], qi: 2, score: lifeScore(L.start) }];
  for (let t = 0; t < L.throws; t++) {
    const next: St[] = [];
    for (const s of states) {
      const picks = swap && s.hand[0] !== s.hand[1] ? [0, 1] : [0];
      for (const pi of picks) {
        const kind = s.hand[pi] as any;
        const other = s.hand[1 - pi];
        const nova = s.charge >= NOVA_CHARGE;
        for (let i = 0; i < SECTORS; i++) {
          const q = clonePlanet(s.p);
          const r = impact(q, kind, i, 0, { nova });
          const charge = nova ? 0 : Math.min(NOVA_CHARGE, s.charge + novaCharge(r.changed.length, r.spawned.length));
          next.push({ p: q, charge, hand: [other, L.queue[s.qi % L.queue.length]] as any, qi: s.qi + 1, score: r.after });
        }
      }
    }
    // dedupe by planet signature
    const seen = new Set<string>(); const uniq: St[] = [];
    next.sort((a, b) => b.score + b.charge * 0.5 - (a.score + a.charge * 0.5));
    for (const s of next) { const k = s.p.sectors.map((x: any) => `${x.land}${x.water}${x.heat}${x.life}`).join('') + s.hand.join('') + s.charge; if (seen.has(k)) continue; seen.add(k); uniq.push(s); if (uniq.length >= W) break; }
    states = uniq;
  }
  return Math.max(...states.map((s) => s.score));
}
const rows: any[] = [];
const levels = [3, 8, 12, 15, 20, 25, 30, 35, 40, 50, 55, 60];
for (const n of levels) {
  const L = makeLevel(n);
  const base = lifeScore(L.start);
  const g = lifeScore(greedyPlan(L.start, L.queue, L.throws));
  const bs = beam(L, 1, true);
  const b = beam(L, 30, true);
  const bn = beam(L, 30, false);
  rows.push({ n, throws: L.throws, base, greedy: g, greedySwap: bs, beam30swap: b, beam30noswap: bn, s1: L.stars[0], s2: L.stars[1], s3: L.stars[2], headroomPct: (((b - g) / (g - base)) * 100).toFixed(1), s3pct: (((L.stars[2] - base) / (g - base)) * 100).toFixed(0), diff: L.difficulty, twist: L.twist });
}
console.table(rows);
