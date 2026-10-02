// Monetization PM scratch model: year-one gross IAP revenue per install, baseline vs proposed stack.
// All inputs are hypotheses anchored to the evidence file benchmarks (see comments). Not a forecast.
// Retention: power law fitted to casual benchmarks D1 30%, D7 ~10%, D30 4.5% (evidence: casual retention D1 28-32, D7 9-12, D30 3.5-5).
const B = 0.558;
const r = (d, lift = 1) => (d === 0 ? 1 : Math.min(1, 0.3 * lift * Math.pow(d, -B)));
function activeDays(lift = 1) {
  let s = 0;
  for (let d = 0; d <= 365; d++) s += r(d, lift);
  return s;
}
// Season-active player-seasons per install (8-week seasons, weekly-active ~1.8x daily retention mid-season).
function seasonActive(lift = 1) {
  let s = 0.12 * lift; // first 8 weeks: active on >= 7 days
  for (const mid of [84, 140, 196, 252, 308, 364]) s += 1.8 * r(mid, lift);
  return s;
}

function baseline() {
  // Today: tiny catalogue, ~100 free gems/day, fixed gem sinks ~2,670 (economy audit).
  const payer = 0.015; // below the 2-5% healthy band (appstorys) because gems are abundant and catalogue tiny
  const starter = 0.7 * 2.99, pass = 0.35 * 4.99, gems = 1.2; // gems + piggy per payer
  return { perInstall: payer * (starter + pass + gems), gemsShare: (payer * gems) };
}

function proposed(s) {
  const sa = seasonActive(s.lift);
  const lines = {
    starterCrew: s.starterConv * 2.99,
    seasons: sa * s.seasonBuy * 3.99,
    planetPacks: s.packBuyers * s.packsEach * s.packAvg,
    explorerBundle: s.bundleConv * 6.99 * (1 - s.bundleCannibal),
    collectors: s.collConv * 19.99,
    club: s.clubSubs * s.clubMonths * s.clubBlended * (1 - s.clubCannibal),
  };
  const total = Object.values(lines).reduce((a, b) => a + b, 0);
  return { sa, lines, total, days: activeDays(s.lift) };
}

const scen = {
  low: { lift: 1.0, starterConv: 0.012, seasonBuy: 0.05, packBuyers: 0.008, packsEach: 1.5, packAvg: 3.0, bundleConv: 0.002, bundleCannibal: 0.5, collConv: 0.0008, clubSubs: 0.002, clubMonths: 3, clubBlended: 3.2, clubCannibal: 0.5 },
  mid: { lift: 1.1, starterConv: 0.016, seasonBuy: 0.08, packBuyers: 0.012, packsEach: 1.8, packAvg: 3.2, bundleConv: 0.004, bundleCannibal: 0.45, collConv: 0.0015, clubSubs: 0.004, clubMonths: 4, clubBlended: 3.2, clubCannibal: 0.4 },
  high: { lift: 1.2, starterConv: 0.022, seasonBuy: 0.12, packBuyers: 0.018, packsEach: 2.2, packAvg: 3.4, bundleConv: 0.006, bundleCannibal: 0.4, collConv: 0.0025, clubSubs: 0.007, clubMonths: 5, clubBlended: 3.2, clubCannibal: 0.35 },
};

const b = baseline();
const d0 = activeDays(1);
console.log(`active days/install yr1 (no lift): ${d0.toFixed(1)}`);
console.log(`BASELINE gross/install yr1: $${b.perInstall.toFixed(3)} (gem packs+piggy $${b.gemsShare.toFixed(3)}); ARPDAU $${(b.perInstall / d0).toFixed(4)}; per 100k installs $${Math.round(b.perInstall * 1e5)}`);
for (const [k, s] of Object.entries(scen)) {
  const p = proposed(s);
  const L = Object.fromEntries(Object.entries(p.lines).map(([a, v]) => [a, +v.toFixed(3)]));
  console.log(`\n${k.toUpperCase()}: season-active seasons/install ${p.sa.toFixed(3)}, active days ${p.days.toFixed(1)}`);
  console.log(L);
  console.log(`total gross/install $${p.total.toFixed(3)} = ${(p.total / b.perInstall).toFixed(1)}x baseline; ARPDAU $${(p.total / p.days).toFixed(4)}; per 100k installs gross $${Math.round(p.total * 1e5)}, net@85% $${Math.round(p.total * 1e5 * 0.85)}`);
}
