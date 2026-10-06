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

function dayKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
it('pre-flight the next 90 Daily Planets', () => {
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const RUNS = 30;
  const fails: { day: string; f: number; th: number; twist: string }[] = [];
  const d0 = new Date(2026, 8, 29);
  for (let i = 0; i < 90; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    const day = dayKey(d);
    const L = makeLevel(16, `DAY-${day}`); // same call as dailyLevel() in src/meta/modes.ts
    let f = 0, th = 0;
    for (let k = 0; k < RUNS; k++) { const s = play(L, 0.25, 0.1, rnd); if (s === 0) f++; if (s === 3) th++; }
    fails.push({ day, f: f / RUNS, th: th / RUNS, twist: L.twist });
  }
  const sorted = [...fails].sort((a, b) => a.f - b.f);
  const q = (x: number) => Math.round(sorted[Math.floor(x * (sorted.length - 1))].f * 100);
  console.log(`Daily Planet next 90 days, decent bot fail p10/p50/p90/max: ${q(0.1)}/${q(0.5)}/${q(0.9)}/${q(1)}%`);
  console.log('hardest 5: ' + sorted.slice(-5).map((x) => `${x.day}(${x.twist}) fail ${Math.round(x.f * 100)}% 3* ${Math.round(x.th * 100)}%`).join('; '));
  console.log('days with decent fail >= 50%: ' + fails.filter((x) => x.f >= 0.5).length + '; days with 3-star >= 80%: ' + fails.filter((x) => x.th >= 0.8).length);
}, 900000);
