import { makeLevel, greedyPlan } from '/home/user/oneshotgame/src/core/levels';
import { dropsFor, MATS } from '/home/user/oneshotgame/src/meta/constellations';
it('frost', () => {
  const tot: any = { stone: 0, dew: 0, leaf: 0, ember: 0, frost: 0 }; const startTot: any = { stone: 0, dew: 0, leaf: 0, ember: 0, frost: 0 };
  let frostLevels = 0, frozenTwist = 0, frostGoals = 0; const N = 120;
  for (let n = 1; n <= N; n++) {
    const L = makeLevel(n); const plan = greedyPlan(L.start, L.queue, L.throws);
    const d = dropsFor(plan, 3); const s = dropsFor(L.start, 0);
    for (const m of MATS) { tot[m] += d[m] ?? 0; startTot[m] += s[m] ?? 0; }
    if ((d.frost ?? 0) > 1) frostLevels++;
    if (L.twist === 'frozen') frozenTwist++;
    if (L.goals.some((g) => g.type === 'biome' && ['icesheet', 'tundra', 'taiga'].includes(g.id))) frostGoals++;
  }
  console.log(`greedy 3★ drops per planet over ${N} levels: ` + MATS.map((m) => `${m} ${(tot[m] / N).toFixed(2)}`).join(', '));
  console.log(`start-planet-only drops per planet: ` + MATS.map((m) => `${m} ${(startTot[m] / N).toFixed(2)}`).join(', '));
  console.log(`levels where greedy 3★ plan yields >1 frost: ${frostLevels}/${N}; frozen-twist levels: ${frozenTwist}; levels with a frost-biome goal: ${frostGoals}`);
});
