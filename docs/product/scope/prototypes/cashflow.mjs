// Simplified daily stardust cash-flow (no Homeworld production), calibrated to sim: ~34 dust/h added per cleared planet, ~190 dust/level active
function run(name, levelsPerDay, opens) {
  let dust = 0, L = 0, vault = 4, day = 0;
  const labKinds = [[1,1],[1,1],[2,1],[4,1],[7,1],[11,1]]; // [unlockLevel]
  const unlock = [1,1,2,4,7,11];
  const lab = [1,1,1,1,1,1];
  const LAB_COST = [0,0,400,1200,3000,7000];
  const ups = { vault: 0, throws: 0, scope: 0, splash: 0 };
  const cost = { vault: [300,900,2500], throws: [400,1200,3000], scope: [250,700,1600], splash: [5000] };
  const vaultH = [4,8,12,24];
  let spent = 0, labDoneDay = null, powerDoneDay = null, log = [];
  while (day < 60) {
    day++;
    const prevL = L; L += levelsPerDay;
    const active = levelsPerDay * 190 * 1.15; // + chests/bosses
    const rate = 34 * (prevL + L) / 2; // average over day
    const hours = Math.min(24, opens * vaultH[ups.vault]);
    const passive = rate * hours;
    dust += active + passive;
    // spend greedily, cheapest first among unlocked
    let progressed = true;
    while (progressed) {
      progressed = false;
      const opts = [];
      for (const k of Object.keys(ups)) if (ups[k] < cost[k].length) opts.push({ c: cost[k][ups[k]], do: () => ups[k]++, key: k });
      for (let i = 0; i < 6; i++) if (unlock[i] <= L && lab[i] < 5) opts.push({ c: LAB_COST[lab[i] + 1], do: () => lab[i]++, key: 'lab' + i });
      opts.sort((a, b) => a.c - b.c);
      if (opts.length && opts[0].c <= dust) { dust -= opts[0].c; spent += opts[0].c; opts[0].do(); progressed = true; }
    }
    const labAll = lab.every((x) => x === 5);
    const powerDone = labAll && Object.keys(ups).every((k) => ups[k] === cost[k].length);
    if (labAll && !labDoneDay) labDoneDay = day;
    if (powerDone && !powerDoneDay) powerDoneDay = day;
    if ([1,2,3,5,7,10,14,21,30].includes(day)) log.push(`d${day}: L${L} rate ${Math.round(34 * L)}/h stock ${Math.round(dust)} spentTotal ${spent}`);
  }
  console.log(`${name} (${levelsPerDay} lvl/day, ${opens} opens/day): Lab all Lv5 on day ${labDoneDay}; all power upgrades done day ${powerDoneDay}; \n  ` + log.join('\n  '));
}
run('casual', 3, 2);
run('regular', 6, 3);
run('engaged', 12, 4);
