// Homeworld 2.0 sizing model (scratch). Days to finish the Workshop + ring essence
// sinks for players at 3/6/12 levels per day, collecting the base twice a day.
const LEVEL_DROP = { leaf: 6.8, dew: 4.1, stone: 1.95, ember: 0.78, frost: 0.08 }; // evidence: greedy 3-star per planet
const DECENT = 0.8; // decent bot gets ~9-12 vs 13.7 greedy
const PROD = [0, 0.4, 0.6, 0.9, 1.2, 1.5]; // essence/h per Workshop level
const CAP_H = 8, COLLECTS = 2; // 8h cap, 2 visits a day -> 16 producing hours
const ADJ = 1.25, JOB = 1.2; // average neighbour + resident bonus once built
const WS = { quarry: ['stone', 'dew'], icewell: ['frost', 'stone'], nursery: ['leaf', 'dew'], forge: ['ember', 'stone'], loom: ['dew', 'frost'], mirror: ['ember', 'leaf'] };
const PRODUCES = { quarry: 'stone', icewell: 'frost', nursery: 'leaf', forge: 'ember', loom: 'dew' };
const UNLOCK = { quarry: 5, icewell: 5, nursery: 5, forge: 5, loom: 7, mirror: 11 };
const P_COST = [0, 0, 12, 30, 60, 110], S_COST = [0, 0, 0, 12, 30, 55];
const DUST = [0, 150, 300, 900, 2400, 6000];
const RING_CH = [0, 0, 1, 3, 5, 8];
const RING_ESS = [{}, {}, { leaf: 20, dew: 20 }, { stone: 40, ember: 30 }, { frost: 40, dew: 40, leaf: 40 }, { stone: 60, dew: 60, leaf: 60, ember: 60, frost: 60 }];
function run(lpd) {
  const bank = { leaf: 0, dew: 0, stone: 0, ember: 0, frost: 0 };
  const lv = {}; let ring = 1, level = 1, day = 0, dust = 0, log = [];
  const need = () => { let s = 0; for (const k in WS) s += 5 - (lv[k] ?? 0); return s + (5 - ring); };
  while (need() > 0 && day < 400) {
    day++;
    for (let i = 0; i < lpd; i++) { level++; for (const m in LEVEL_DROP) bank[m] += LEVEL_DROP[m] * DECENT; dust += 190; }
    for (const k in PRODUCES) if (lv[k]) bank[PRODUCES[k]] += PROD[lv[k]] * Math.min(24, CAP_H * COLLECTS) * ADJ * JOB;
    const chapters = Math.floor((level - 1) / 10);
    // ring first
    if (ring < 5 && chapters >= RING_CH[ring + 1] && Object.entries(RING_ESS[ring + 1]).every(([m, n]) => bank[m] >= n)) {
      for (const [m, n] of Object.entries(RING_ESS[ring + 1])) bank[m] -= n; ring++; log.push(`d${day} ring${ring}`);
    }
    // build / upgrade cheapest first, cap = ring (build allowed at ring+1 for lv<=2)
    let did = true;
    while (did) { did = false;
      for (const k in WS) { const cur = lv[k] ?? 0; if (level < UNLOCK[k] || cur >= 5) continue; const cap = Math.max(2, ring);
        if (cur + 1 > cap) continue; const [p, s] = WS[k]; const t = cur + 1;
        if (bank[p] >= P_COST[t] && bank[s] >= S_COST[t]) { bank[p] -= P_COST[t]; bank[s] -= S_COST[t]; lv[k] = t; did = true; } }
    }
  }
  return { lpd, day, level, ring, log: log.join(' '), leftover: Object.fromEntries(Object.entries(bank).map(([k, v]) => [k, Math.round(v)])) };
}
for (const l of [3, 6, 12]) console.log(JSON.stringify(run(l)));
let tot = {}; for (const k in WS) { const [p, s] = WS[k]; tot[p] = (tot[p] ?? 0) + P_COST.reduce((a, b) => a + b); tot[s] = (tot[s] ?? 0) + S_COST.reduce((a, b) => a + b); }
console.log('workshop essence totals', tot, 'dust per workshop', DUST.reduce((a, b) => a + b));
// Star Dock concave galaxy income vs today's linear planetRate sum
for (const [L, sum] of [[10, 324], [20, 671], [30, 1049], [60, 2100], [100, 3500]]) console.log(`L${L}: today ${sum}/h, dock 20*sqrt = ${Math.round(20 * Math.sqrt(sum))}/h`);
