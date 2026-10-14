import { makeLevel, starsEarned, goalProgress } from '/home/user/oneshotgame/src/core/levels';
import { SECTORS, clonePlanet, impact, labBonus, lifeScore, novaCharge } from '/home/user/oneshotgame/src/core/world';
import { NOVA_CHARGE } from '/home/user/oneshotgame/src/core/levels';
import { dropsFor, MATS } from '/home/user/oneshotgame/src/meta/constellations';
import { planetRate } from '/home/user/oneshotgame/src/meta/economy';

function play(n: number, aimErr: number, randomShare: number, rnd: () => number, lv = 1) {
  const L = makeLevel(n);
  const p = clonePlanet(L.start);
  let charge = 0, bonus = 0, left = 0;
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
        if (v > best) { best = v; at = i; }
      }
      if (rnd() < aimErr) at += rnd() < 0.5 ? -1 : 1;
    }
    const res = impact(p, kind, ((at % SECTORS) + SECTORS) % SECTORS, 0, boost);
    bonus += labBonus(lv, res.changed.length, res.spawned.length);
    charge = boost.nova ? 0 : Math.min(NOVA_CHARGE, charge + novaCharge(res.changed.length, res.spawned.length, lv));
    if (starsEarned(p, lifeScore(p) + bonus, L) === 3) { left = L.throws - t - 1; break; }
  }
  return { L, p, st: starsEarned(p, lifeScore(p) + bonus, L), left };
}
it('mats', () => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lines: string[] = [`SECTORS=${SECTORS}`];
  for (const [a, b] of [[1, 10], [11, 20], [21, 30], [31, 60]]) {
    const tot: any = { stone: 0, dew: 0, leaf: 0, ember: 0, frost: 0 }; let n = 0, sp = 0, rate = 0, stars = 0, left = 0, dust = 0;
    for (let lv = a; lv <= b; lv++) for (let k = 0; k < 20; k++) {
      const r = play(lv, 0.25, 0.1, rnd); if (!r.st) continue; n++;
      const d = dropsFor(r.p, r.st); for (const m of MATS) tot[m] += d[m] ?? 0;
      sp += r.p.speciesFound.length; stars += r.st; left += r.left;
      rate += planetRate({ stars: r.st, species: r.p.speciesFound });
    }
    lines.push(`L${a}-${b} per cleared planet: ` + MATS.map((m) => `${m} ${(tot[m] / n).toFixed(1)}`).join(', ') + ` | species/planet ${(sp / n).toFixed(1)} | stars ${(stars / n).toFixed(2)} | passive stardust/h per planet ${(rate / n).toFixed(1)} | leftover throws at 3★ finish ${(left / n).toFixed(1)}`);
  }
  console.log(lines.join('\n'));
}, 900000);
