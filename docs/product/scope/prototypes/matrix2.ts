import { newPlanet, impact, BIOMES, KINDS, settle } from './world.ts';
const kinds = Object.keys(KINDS) as any[];
const states: Record<string, any> = {
  barren: { land: 1 }, ocean: { land: 1, water: 3 }, reef: { land: 1, water: 3, life: 1 }, icesheet: { land: 1, water: 3, heat: -2 },
  springs: { land: 1, water: 3, heat: 2 }, meadow: { life: 1 }, forest: { life: 2 }, jungle: { life: 2, heat: 1 }, mountain: { land: 3 },
  highland: { land: 3, life: 1 }, desert: { heat: 2 }, savanna: { heat: 2, life: 1 }, tundra: { heat: -2 }, taiga: { heat: -2, life: 1 },
  swamp: { land: 2, water: 2 }, marsh: { land: 2, water: 2, life: 1 }, volcano: { land: 3, heat: 2 },
};
const tally: Record<string, {same:number,up:number,down:number,side:number}> = {};
const out: string[] = ['from \\ kind | ' + kinds.join(' | ')];
for (const [name, st] of Object.entries(states)) {
  const row: string[] = [];
  for (const k of kinds) {
    const p = newPlanet(); Object.assign(p.sectors[12], st); settle(p);
    if (p.sectors[12].biome !== name) throw new Error(name + ' setup wrong ' + p.sectors[12].biome);
    impact(p, k, 12, 0);
    const to = p.sectors[12].biome;
    const v0 = BIOMES[name as any].value, v1 = BIOMES[to].value;
    const t = (tally[k] ??= {same:0,up:0,down:0,side:0});
    let mark = '';
    if (to === name) { t.same++; mark = '='; } else if (v1 > v0) { t.up++; mark = '+'; } else if (v1 < v0) { t.down++; mark = '-'; } else { t.side++; mark = '~'; }
    row.push(`${to}${mark}`);
  }
  out.push(name + ' | ' + row.join(' | '));
}
console.log(out.join('\n'));
console.log(tally);
