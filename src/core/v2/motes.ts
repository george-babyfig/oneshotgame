import type { LevelDef } from '../levels';
import type { RoundState } from '../round';
import type { MoteDef, OverlayCtx } from '../../meta/m15types';
export type { MoteDef } from '../../meta/m15types';
export const MOTE_RULES = { teach: 56, from: 58, reach: 1, cap: 1 } as const;
export function moteOverlay(L: LevelDef, _ctx: OverlayCtx): LevelDef {
  return L;
}
// C15 fills the effect using grantExtraThrow and the shared cap.
export function applyMote(_state: RoundState, _mote: MoteDef): void {}
