import type { LevelDef } from '../levels';
import type { OverlayCtx } from '../../meta/m15types';
import { reactionOverlay } from './reactions';
import { pebbleOverlay, pebbleHang } from './pebble';
import { moteOverlay } from './motes';
export type { OverlayCtx } from '../../meta/m15types';
/** New streams belong to the overlays; layout RNG is never passed in. */
export function overlayV2(L: LevelDef, ctx: OverlayCtx): LevelDef {
  if (ctx.rules.version !== 2 || !L.seed.startsWith('PP-')) return L;
  return moteOverlay(pebbleOverlay(reactionOverlay(L, ctx), ctx), ctx);
}

/** Geometry stays in planet-radius units until the caller supplies a viewport. */
export function levelPickups(L: LevelDef, target: number, spinPhase: number, pebbleActive = true): import('../../meta/m15types').Pickup[] {
  const motes = (L.motes ?? []).map((mote) => ({ kind: 'mote' as const, x: mote.x, y: mote.y, r: mote.r }));
  const pebble = pebbleActive && (L.pebbleCloud || L.troubles.some((t) => t.id === 'pebble')) ? pebbleHang(L, target, spinPhase) : null;
  return [...motes, ...(pebble ? [pebble] : [])];
}
