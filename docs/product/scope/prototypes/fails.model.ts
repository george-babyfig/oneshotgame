import { makeLevel, starsEarned, goalProgress, goalsMet, starsFor } from '/home/user/oneshotgame/src/core/levels';
import { SECTORS, clonePlanet, impact, labBonus, lifeScore, novaCharge } from '/home/user/oneshotgame/src/core/world';
import { NOVA_CHARGE } from '/home/user/oneshotgame/src/core/levels';

function play(n: number, aimErr: number, randomShare: number, rnd: () => number, lv = 1) {
  const L = makeLevel(n);
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
        if (v > best) { best = v; at = i; }
      }
      if (rnd() < aimErr) at += rnd() < 0.5 ? -1 : 1;
    }
    const res = impact(p, kind, ((at % SECTORS) + SECTORS) % SECTORS, 0, boost);
    bonus += labBonus(lv, res.changed.length, res.spawned.length);
    charge = boost.nova ? 0 : Math.min(NOVA_CHARGE, charge + novaCharge(res.changed.length, res.spawned.length, lv));
  }
  const score = lifeScore(p) + bonus;
  return { L, goalOk: goalsMet(p, L.goals), scoreStars: starsFor(score, L.stars), st: starsEarned(p, score, L), throws: L.throws };
}
it('fail causes', () => {
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: string[] = [];
  for (const [name, e, r, lv] of [['decent', 0.25, 0.1, 1], ['decent+lab3', 0.25, 0.1, 3], ['sharp', 0.1, 0, 1]] as const) {
    for (const [a, b] of [[1, 10], [11, 20], [21, 30], [31, 45], [46, 60]]) {
      let runs = 0, fail = 0, failGoals = 0, failScore = 0, goalsLv = 0, three = 0, thGoalKill = 0;
      for (let n = a; n <= b; n++) for (let k = 0; k < 20; k++) {
        const x = play(n, e, r, rnd, lv); runs++;
        if (x.L.goals.length) goalsLv++;
        if (x.st === 0) { fail++; if (!x.goalOk && x.scoreStars > 0) failGoals++; else if (x.scoreStars === 0) failScore++; }
        if (x.st === 3) three++;
      }
      out.push(`${name} L${a}-${b}: fail ${Math.round(100 * fail / runs)}% (goal-only ${Math.round(100 * failGoals / runs)}%, score ${Math.round(100 * failScore / runs)}% [incl. goals also missed]) 3star ${Math.round(100 * three / runs)}% | levels w/ goals ${Math.round(100 * goalsLv / runs)}%`);
    }
  }
  // throws and star target stats
  const th: string[] = [];
  for (const n of [1, 5, 10, 20, 30, 40, 60]) { const L = makeLevel(n); th.push(`L${n}: throws ${L.throws} stars ${L.stars.join('/')} diff ${L.difficulty} goals ${L.goals.length} twist ${L.twist}`); }
  console.log(out.join('\n') + '\n' + th.join('\n'));
}, 900000);
