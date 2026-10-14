import type { ReactionDef } from '../round';
import type { LevelDef } from '../levels';
import type { OverlayCtx } from '../../meta/m15types';

// B15 replaces the disabled effects and teaching overlays after trigger-rate sims.
export const V2_REACTIONS: Record<'firemount' | 'rainbow' | 'flood', ReactionDef> = {
  firemount: {
    kind: 'fusion',
    name: 'Firemount',
    pair: ['rock', 'magma'],
    debut: 63,
    icon: '🌋',
    priority: 4,
    triggers: { rock: ['volcano', 'desert', 'springs'], magma: ['mountain', 'highland'] },
    radius: 1,
    charge: 3,
    enabled: false,
    effect() {},
    fieldGuide: 'Rock finds hot land, or Magma finds a mountain, to make Firemount.',
  },
  rainbow: {
    kind: 'fusion',
    name: 'Rainbow',
    pair: ['storm', 'sun'],
    debut: 67,
    icon: '🌈',
    priority: 5,
    triggers: { sun: ['marsh', 'swamp', 'reef'], storm: ['desert', 'savanna'] },
    radius: 2,
    charge: 3,
    extraThrow: 'rainbow',
    enabled: false,
    effect() {},
    fieldGuide: 'Sunburst finds wet land, or Rain Cloud finds dry land, to make Rainbow.',
  },
  flood: {
    kind: 'clash',
    name: 'Flood',
    pair: ['ice', 'storm'],
    debut: 74,
    icon: '💧',
    priority: 7,
    triggers: { ice: ['marsh', 'swamp'], storm: ['icesheet', 'tundra', 'taiga'] },
    radius: 1,
    charge: 0,
    enabled: false,
    effect() {},
    fieldGuide: 'Flood is good for sea friends, but forests become marsh.',
  },
};
export function reactionOverlay(L: LevelDef, _ctx: OverlayCtx): LevelDef {
  return L;
}
