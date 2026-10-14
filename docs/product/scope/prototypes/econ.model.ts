
import { makeLevel, starsEarned, goalProgress } from '/home/user/oneshotgame/src/core/levels';
import { SECTORS, clonePlanet, impact, labBonus, lifeScore, novaCharge } from '/home/user/oneshotgame/src/core/world';
import { NOVA_CHARGE } from '/home/user/oneshotgame/src/core/levels';
import { defaultProfile, totalStars } from '/home/user/oneshotgame/src/meta/profile';
import { applyLevelWin, discoverSpecies, galaxyRate } from '/home/user/oneshotgame/src/meta/economy';
import { dropsFor, addDrops } from '/home/user/oneshotgame/src/meta/constellations';
import { chestsReady, openChest, chapterReward, roadReady, claimRoad, STAR_ROAD } from '/home/user/oneshotgame/src/meta/progression';
import { BOSS_REWARD } from '/home/user/oneshotgame/src/ui/flows/results';

const FINISH = 15;
function play(n: number, aimErr: number, randomShare: number, rnd: () => number, lv = 1) {
  const L = makeLevel(n);
  const p = clonePlanet(L.start);
  let charge = 0, bonus = 0, left = 0, stars = 0;
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
    stars = starsEarned(p, lifeScore(p) + bonus, L);
    if (stars === 3) { left = L.throws - t - 1; break; }
  }
  stars = starsEarned(p, lifeScore(p) + bonus, L);
  return { L, planet: p, stars, score: lifeScore(p) + bonus, left };
}

function run(name: string, e: number, r: number, lv: number) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const RUNS = 30;
  const rows: any[] = [];
  // Average over RUNS independent careers of 30 levels (retry on loss, max 6 tries)
  const agg = Array.from({ length: 30 }, () => ({ dust: 0, gems: 0, disc: 0, mats: 0, tries: 0, stars: 0, boss: 0 }));
  const chapAgg = [0,0,0].map(() => ({ chestG: 0, chestD: 0 }));
  const roadAgg = { g: 0, d: 0 };
  const galaxy: number[][] = [[], [], []];
  let totalTries = 0;
  for (let k = 0; k < RUNS; k++) {
    const pf = defaultProfile(0);
    for (let n = 1; n <= 30; n++) {
      let res, tries = 0;
      do { res = play(n, e, r, rnd, lv); tries++; } while (res.stars === 0 && tries < 8);
      agg[n - 1].tries += tries;
      if (res.stars === 0) continue;
      const g0 = pf.gems, d0 = pf.dust;
      const out = applyLevelWin(pf, { n, stars: res.stars, score: res.score, planet: res.planet, name: res.L.name, hue: res.L.hue, difficulty: res.L.difficulty, bonusDust: res.left * FINISH });
      let disc = 0;
      for (const s of res.planet.speciesFound) if (discoverSpecies(pf, s)) disc += 3;
      const drops = dropsFor(res.planet, res.stars);
      const mats = Object.values(drops).reduce((a: number, b: any) => a + (b ?? 0), 0);
      addDrops(pf, drops);
      let bossG = 0, bossD = 0;
      if (res.L.twist === 'boss') { pf.gems += BOSS_REWARD.gems!; pf.dust += BOSS_REWARD.dust!; bossG = BOSS_REWARD.gems!; bossD = BOSS_REWARD.dust!; }
      agg[n - 1].dust += out.dust + bossD; agg[n - 1].gems += out.gems + disc + bossG; agg[n - 1].disc += disc; agg[n - 1].mats += mats; agg[n - 1].stars += res.stars;
      // chest
      if (n % 10 === 0) {
        const c = chestsReady(pf);
        for (const ch of c) { const rw = openChest(pf, ch)!; chapAgg[ch - 1].chestG += rw.gems ?? 0; chapAgg[ch - 1].chestD += rw.dust ?? 0; }
        galaxy[n / 10 - 1].push(galaxyRate(pf));
      }
    }
    // Star Road claims at the end (30 levels)
    const st = totalStars(pf);
    let rg = 0, rd = 0;
    STAR_ROAD.forEach((t, i) => { if (st >= t.stars) { rg += (t.reward.gems ?? 0); rd += (t.reward.dust ?? 0); } });
    roadAgg.g += rg; roadAgg.d += rd;
    rows.push({ st });
  }
  const band = (a: number, b: number) => {
    const s = agg.slice(a, b);
    const sum = (f: (x: any) => number) => s.reduce((t, x) => t + f(x), 0) / RUNS;
    return { dust: Math.round(sum(x => x.dust)), gems: Math.round(sum(x => x.gems)), discGems: Math.round(sum(x => x.disc)), mats: Math.round(sum(x => x.mats)), stars: +(sum(x => x.stars)).toFixed(1), attempts: +(sum(x => x.tries)).toFixed(1) };
  };
  console.log(`=== ${name} (aimErr ${e}, random ${r}, lab ${lv}) ===`);
  for (const [i, [a, b]] of [[0, 10], [10, 20], [20, 30]].entries()) {
    const bb = band(a, b);
    console.log(`Ch${i + 1} levels ${a + 1}-${b}: dust ${bb.dust} (+chest ${Math.round(chapAgg[i].chestD / RUNS)}), gems ${bb.gems} (of which new-species ${bb.discGems}; +chest ${Math.round(chapAgg[i].chestG / RUNS)}), mats ${bb.mats}, stars ${bb.stars}, attempts/10 levels ${bb.attempts}; galaxy rate after chapter ${Math.round(galaxy[i].reduce((x, y) => x + y, 0) / Math.max(1, galaxy[i].length))}/h`);
  }
  console.log(`Star Road free-lane claimable after 30 levels: avg ${Math.round(roadAgg.g / RUNS)} gems, ${Math.round(roadAgg.d / RUNS)} dust; avg total stars ${(rows.reduce((a, x) => a + x.st, 0) / RUNS).toFixed(1)}`);
}

it('economy model', () => {
  run('casual', 0.4, 0.3, 1);
  run('decent', 0.25, 0.1, 1);
  run('sharp', 0.1, 0, 1);
}, 900000);
