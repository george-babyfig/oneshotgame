import { makeLevel, starsEarned, goalProgress } from '/home/user/oneshotgame/src/core/levels';
import { SECTORS, clonePlanet, impact, labBonus, lifeScore, novaCharge } from '/home/user/oneshotgame/src/core/world';
import { NOVA_CHARGE } from '/home/user/oneshotgame/src/core/levels';
import { EVENTS, tokensForLand, EVENT_TIERS } from '/home/user/oneshotgame/src/meta/events';

it('event tokens', () => {
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tok: Record<string, number> = {}; let levels = 0, spawnTotal = 0, throwsTotal = 0, changedTotal = 0;
  for (let n = 8; n <= 40; n++) for (let k = 0; k < 10; k++) {
    const L = makeLevel(n); const p = clonePlanet(L.start); let charge = 0;
    levels++;
    for (let t = 0; t < L.throws; t++) {
      const kind = L.queue[t]; const boost = { nova: charge >= NOVA_CHARGE };
      let best = -1, at = 0;
      for (let i = 0; i < SECTORS; i++) { const q = clonePlanet(p); const r = impact(q, kind, i, 0, boost); const v = r.after + L.goals.reduce((a, g) => a + 25 * Math.min(g.count, goalProgress(q, g)), 0); if (v > best) { best = v; at = i; } }
      if (rnd() < 0.25) at += rnd() < 0.5 ? -1 : 1;
      at = ((at % SECTORS) + SECTORS) % SECTORS;
      const res = impact(p, kind, at, 0, boost);
      const biomes = res.changed.map((i) => p.sectors[i].biome);
      for (const ev of EVENTS) tok[ev.id] = (tok[ev.id] ?? 0) + tokensForLand(ev, biomes as any, res.spawned.length);
      spawnTotal += res.spawned.length; throwsTotal++; changedTotal += res.changed.length;
      charge = boost.nova ? 0 : Math.min(NOVA_CHARGE, charge + novaCharge(res.changed.length, res.spawned.length));
    }
  }
  console.log(`levels ${levels}; per level: spawns ${(spawnTotal / levels).toFixed(1)}, regions changed ${(changedTotal / levels).toFixed(1)}, throws ${(throwsTotal / levels).toFixed(1)}`);
  for (const ev of EVENTS) console.log(`${ev.id}: ${(tok[ev.id] / levels).toFixed(1)} tokens/level -> full ${EVENT_TIERS[5].tokens} in ${(EVENT_TIERS[5].tokens / (tok[ev.id] / levels)).toFixed(1)} levels`);
});
