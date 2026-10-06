import { it } from 'vitest';
import { goalProgress, makeLevel, starsEarned, NOVA_CHARGE } from './levels';
import { SECTORS, clonePlanet, impact, labBonus, lifeScore, novaCharge } from './world';

// same bot as tests/difficulty.sim.ts play(), but takes a level def
function play(L: ReturnType<typeof makeLevel>, aimErr: number, randomShare: number, rnd: () => number, lv = 1) {
  const p = clonePlanet(L.start);
  let charge = 0, bonus = 0;
  for (let t = 0; t < L.throws; t++) {
    const kind = L.queue[t];
    const boost = { nova: charge >= NOVA_CHARGE };
    let at: number;
    if (rnd() < randomShare) at = Math.floor(rnd() * SECTORS);
    else {
      let best = -1; at = 0;
      for (let i = 0; i < SECTORS; i++) {
        const q = clonePlanet(p);
        const r = impact(q, kind, i, 0, boost);
        const v = r.after + labBonus(lv, r.changed.length, r.spawned.length) + L.goals.reduce((a, g) => a + 25 * Math.min(g.count, goalProgress(q, g)), 0);
        if (v > best) ((best = v), (at = i));
      }
      if (rnd() < aimErr) at += rnd() < 0.5 ? -1 : 1;
    }
    const res = impact(p, kind, ((at % SECTORS) + SECTORS) % SECTORS, 0, boost);
    bonus += labBonus(lv, res.changed.length, res.spawned.length);
    charge = boost.nova ? 0 : Math.min(NOVA_CHARGE, charge + novaCharge(res.changed.length, res.spawned.length, lv));
  }
  return starsEarned(p, lifeScore(p) + bonus, L);
}

it('shadow-seed sampling of hard and super slots', () => {
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const RUNS = 20, SHADOWS = 10;
  const bands = [[11, 20], [21, 30], [31, 45], [46, 60]];
  for (const [a, b] of bands) {
    for (const want of ['hard', 'super']) {
      const slots: number[] = [];
      for (let n = a; n <= b; n++) if (makeLevel(n).difficulty === want) slots.push(n);
      if (!slots.length) continue;
      // campaign only (1 level per slot), then shadow seeds (SHADOWS levels per slot)
      const perLevelFail: number[] = [];
      let fC = 0, rC = 0, fS = 0, rS = 0;
      for (const n of slots) {
        const L = makeLevel(n);
        for (let k = 0; k < RUNS; k++) { rC++; if (play(L, 0.25, 0.1, rnd) === 0) fC++; }
        for (let s = 0; s < SHADOWS; s++) {
          const LS = makeLevel(n, 'PP', { salt: 'SIM' + s });
          if (LS.difficulty !== want) throw new Error('difficulty drift');
          let f = 0;
          for (let k = 0; k < RUNS; k++) { rS++; if (play(LS, 0.25, 0.1, rnd) === 0) { fS++; f++; } }
          perLevelFail.push(f / RUNS);
        }
      }
      perLevelFail.sort((x, y) => x - y);
      const q = (x: number) => Math.round(perLevelFail[Math.floor(x * (perLevelFail.length - 1))] * 100);
      const mean = fS / rS;
      const sd = Math.sqrt(perLevelFail.reduce((acc, v) => acc + (v - mean) ** 2, 0) / perLevelFail.length);
      console.log(`L${a}-${b} ${want}: slots ${slots.join(',')} | campaign-only decent fail ${Math.round((fC / rC) * 100)}% (${slots.length} level(s)) | shadow ${Math.round(mean * 100)}% over ${perLevelFail.length} levels; per-level fail p10/p50/p90 ${q(0.1)}/${q(0.5)}/${q(0.9)}%, sd ${Math.round(sd * 100)}pp`);
    }
  }
}, 900000);
