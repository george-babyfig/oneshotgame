import { newPlanet, impact, SECTORS, BIOMES, KINDS, clonePlanet, lifeScore, settle, biomeOf } from './world.ts';
const kinds = Object.keys(KINDS) as any[];
const states: Record<string, any> = {
  barren: { land: 1 }, ocean: { land: 1, water: 3 }, reef: { land: 1, water: 3, life: 1 }, icesheet: { land: 1, water: 3, heat: -2 },
  springs: { land: 1, water: 3, heat: 2 }, meadow: { life: 1 }, forest: { life: 2 }, jungle: { life: 2, heat: 1 }, mountain: { land: 3 },
  highland: { land: 3, life: 1 }, desert: { heat: 2 }, savanna: { heat: 2, life: 1 }, tundra: { heat: -2 }, taiga: { heat: -2, life: 1 },
  swamp: { land: 2, water: 2 }, marsh: { land: 2, water: 2, life: 1 }, volcano: { land: 3, heat: 2 },
};
const AT = 12;
const rows: string[] = [];
for (const [name, st] of Object.entries(states)) {
  const cells: string[] = [];
  for (const k of kinds) {
    const p = newPlanet(() => ({}));
    Object.assign(p.sectors[AT], st);
    // surrounding barren
    settle(p);
    const b0 = p.sectors[AT].biome;
    const before = lifeScore(p);
    const r = impact(p, k, AT, 0);
    const s = p.sectors[AT];
    const nb = [p.sectors[AT-1].biome, p.sectors[AT+1].biome];
    cells.push(`${k}: ${s.biome} (${r.after - before >= 0 ? '+' : ''}${r.after - before}) nb=${nb[0]}${r.spawned.length ? ' spawn=' + r.spawned.map(x=>x.id).join(',') : ''}`);
    if (b0 !== name) cells[cells.length-1] = '!!' + b0 + ' ' + cells[cells.length-1];
  }
  rows.push(name + ' -> ' + cells.join(' | '));
}
console.log(rows.join('\n'));
