import type { LevelDef } from '../levels';
import type { TroubleBehaviour } from '../troubles';
import type { OverlayCtx, Pickup } from '../../meta/m15types';

// A15 owns the catch, target, crater and geometry; this row is deliberately inert.
export const PEBBLE_BEHAVIOUR: TroubleBehaviour = {
  clear: (c) => c.landed && c.action.kind === 'storm' && c.nova && c.distance <= 3,
  perk: null,
  calm: true,
  buddy: [],
  effect() {},
  repaint() {},
  firebreak: () => undefined,
  target: () => null,
  forecast: true,
  forecastShape: '⬟',
  forecastLabel: 'Space Pebble over sector {n}, lands in {k} throws',
  counterIcons: '🪨',
  helpLine: ['{trouble} reached one sector · {counter}', '{trouble} reached {n} sectors · {counter}'],
  aimTag: 'A pebble made a little dent',
  actLine: 'A pebble made a little dent',
  settledLine: '{name} settled!',
  feel: '#d5bb98',
  sourceGlyph: '⬟',
  sourceColor: '#d5bb98',
  actKind: 'act',
  settleOnClear: false,
};
export function pebbleOverlay(L: LevelDef, _ctx: OverlayCtx): LevelDef {
  return L;
}
/** A15 fills this planet-relative geometry before any overlay places a pebble. */
export function pebbleHang(_L: LevelDef, _target: number, _spinPhase: number): Pickup | null {
  return null;
}
