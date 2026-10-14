import type { LevelDef } from '../../../src/core/levels';
import { RULES_VERSION, type RulesVersion } from '../../../src/core/rules-version';
import { PEBBLE_TEACH } from './pebble';
import { MOTE_TEACH } from './motes';
import { REACTION_TEACH } from './reactions';
export interface TeachRow {
  n: number;
  idea: string;
  check: (level: LevelDef) => boolean;
  sincePlay?: RulesVersion;
}
export const LAUNCH_TEACH: TeachRow[] = [
  { n: 6, idea: 'one biome goal', check: (L) => L.goals.length === 1 && L.goals[0].type === 'biome' },
  ...([8, 13, 22, 25] as const).map((n, i): TeachRow => ({
    n,
    idea: ['early Steam pair', 'Rain Garden pair', 'Wildflowers pair', 'Glacier pair'][i],
    check: (L) =>
      L.queue[0] === (['magma', 'seed', 'seed', 'rock'] as const)[i] && L.queue[1] === (['ice', 'storm', 'sun', 'ice'] as const)[i],
  })),
  ...([14, 16, 18, 28, 36] as const).map((n): TeachRow => ({
    n,
    idea: n === 28 ? 'Tanglevine' : n === 36 ? 'Frost Creep' : 'Ember Vent',
    check: (L) => L.troubles.some((t) => t.id === (n === 28 ? 'vine' : n === 36 ? 'frost' : 'vent')),
  })),
  ...([33, 41, 46, 51, 57] as const).map((n, i): TeachRow => ({
    n,
    idea: 'teaching obstacle',
    check: (L) => L.sky.obstacle === (['rocks', 'bubble', 'mist', 'ring', 'tug'] as const)[i],
  })),
];
export function teachRows(play: RulesVersion = RULES_VERSION): TeachRow[] {
  return [...LAUNCH_TEACH, ...PEBBLE_TEACH, ...MOTE_TEACH, ...REACTION_TEACH].filter((row) => !row.sincePlay || row.sincePlay <= play);
}
