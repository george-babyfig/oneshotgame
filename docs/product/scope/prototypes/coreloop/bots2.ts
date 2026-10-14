import { makeLevel, rngFrom, TUNE } from './levels.ts';
import { SECTORS, lifeScore, type Kind } from './world.ts';
import { initSt, cloneSt, step, play, type Rules } from './proto.ts';
// Bots vs targets from the reaction+hazard-aware solver. Star share uses TUNE at ease=1, normal planets.
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const f = [TUNE.f1[0] + TUNE.f1[1] + TUNE.saw * 0.5, TUNE.f2[0] + TUNE.f2[1] + TUNE.saw * 0.35, TUNE.f3[0] + TUNE.f3[1]];
function bot(L: any, R: Rules, aware: boolean, randomShare: number, aimErr: number) {
  const st = initSt(L.start, R.hazard); const blind: Rules = { ...R, fusion: false, hazard: undefined };
  for (let t = 0; t < L.throws; t++) {
    const kind = L.queue[t] as Kind; let at = 0;
    if (rnd() < randomShare) at = Math.floor(rnd() * SECTORS);
    else { let best = -Infinity; for (let i = 0; i < SECTORS; i++) { const q = cloneSt(st); step(q, kind, i, aware ? R : blind); const v = lifeScore(q.p); if (v > best) ((best = v), (at = i)); } if (rnd() < aimErr) at += rnd() < 0.5 ? -1 : 1; }
    step(st, kind, at, R);
  }
  return lifeScore(st.p);
}
const profiles: Record<string, [boolean, number, number]> = { casual: [false, 0.3, 0.4], decent: [false, 0.1, 0.25], 'decent-aware': [true, 0.1, 0.25] };
for (const [hz, every, floor, rx] of [[false, 2, false, false], [true, 2, true, true], [true, 3, true, true]] as [boolean, number, boolean, boolean][]) {
  const out: string[] = [];
  for (const [name, [aware, rs, ae]] of Object.entries(profiles)) {
    let runs = 0, fail = 0, three = 0;
    for (let n = 21; n <= 60; n++) {
      const L = makeLevel(n); if (L.difficulty !== 'normal') continue;
      const r2 = rngFrom(`${L.seed}-hz`);
      const R: Rules = { fusion: rx, glowTtl: 2, glowR: 2, hazard: hz ? { vents: [Math.floor(r2() * SECTORS)], every } : undefined };
      const base = lifeScore(L.start);
      const sol = play(L.start, L.queue, L.throws, R, { aware: true, swap: false, lookHazard: true }).score;
      const tg = f.map((x) => base + (sol - base) * x); if (floor) { const b0 = play(L.start, L.queue, L.throws, R, { aware: false, swap: false }).score; tg[0] = Math.min(tg[0], base + (b0 - base) * f[0]); }
      for (let k = 0; k < 12; k++) { const s = bot(L, R, aware, rs, ae); runs++; if (s < tg[0]) fail++; if (s >= tg[2]) three++; }
    }
    out.push(`${name} fail ${Math.round(100 * fail / runs)}% 3star ${Math.round(100 * three / runs)}%`);
  }
  console.log(`${rx ? "reactions" : "TODAY (no reactions, no hazard)"}${hz ? " + vent every " + every + " + 1-star floor" : ""}: ` + out.join(" | "));
}
