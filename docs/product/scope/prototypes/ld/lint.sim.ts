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

it('per-level lint of campaign 1-60', () => {
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const RUNS = 40;
  const band = { normal: [0.0, 0.35], hard: [0.2, 0.5], super: [0.3, 0.7] } as Record<string, number[]>;
  const out: string[] = [];
  let flagged = 0;
  const cas: number[] = [];
  for (let n = 1; n <= 60; n++) {
    const L = makeLevel(n);
    let fd = 0, fc = 0, td = 0;
    for (let k = 0; k < RUNS; k++) { const s = play(L, 0.25, 0.1, rnd); if (s === 0) fd++; if (s === 3) td++; }
    for (let k = 0; k < RUNS; k++) if (play(L, 0.4, 0.3, rnd) === 0) fc++;
    const d = fd / RUNS, c = fc / RUNS; cas.push(c);
    const [lo, hi] = band[L.difficulty];
    const flag = d < lo ? 'EASY' : d > hi ? 'WALL' : '';
    if (flag || c > 0.6) { flagged++; out.push(`L${n} ${L.difficulty}${L.twist !== 'none' ? '/' + L.twist : ''} goals ${L.goals.length}: decent fail ${Math.round(d * 100)}% 3*${Math.round((td / RUNS) * 100)}% | casual fail ${Math.round(c * 100)}% ${flag}${c > 0.6 ? ' CASUAL-WALL' : ''}`); }
  }
  console.log(out.join('\n'));
  console.log(`flagged ${flagged}/60 (decent band normal 0-35, hard 20-50, super 30-70; casual >60%)`);
  const ch = (a: number, b: number) => Math.round((cas.slice(a - 1, b).reduce((x, y) => x + y, 0) / (b - a + 1)) * 100);
  console.log(`casual mean fail by level group: L1-5 ${ch(1, 5)}% L6-10 ${ch(6, 10)}% L11-15 ${ch(11, 15)}% L16-20 ${ch(16, 20)}%`);
}, 900000);
