import { REACTIONS, type ReactionId } from '../core/round';
import type { Profile } from './profile';
import { DISCOVERY_DUST, COMBO_STAMP_DUST } from './tuning';
import { earn } from './wallet';
import { recordWishCombo, recordWishReaction, type WishMode } from './wishes';

export const FUSION_IDS = ['steam', 'rainGarden', 'wildflowers', 'glacier'] as const satisfies readonly ReactionId[];
export const COMBO_STAMP_COUNT = 13;
export const ALL_COMBO_STAMPS = (1 << COMBO_STAMP_COUNT) - 1;

/** Discovery is permanent, while the same reaction can help more than one Wish. */
export function recordReaction(p: Profile, id: ReactionId, mode: WishMode = 'campaign') {
  recordWishReaction(p, id, mode);
  if (p.fusionsFound.includes(id)) return { first: false, stardust: 0 };
  p.fusionsFound = [...p.fusionsFound, id];
  if (REACTIONS[id].kind === 'clash') return { first: true, stardust: 0 };
  earn(p, 'dust', DISCOVERY_DUST, 'discovery');
  return { first: true, stardust: DISCOVERY_DUST, sticker: `r_${id}` };
}

/** A stamp is granted once, even when several steps arrive on one throw. */
export function recordCombo(p: Profile, links: number, reaction?: ReactionId, superFusion = false, mode: WishMode = 'campaign') {
  if (!Number.isFinite(links) || links < 0) return { first: 0, stardust: 0, stickers: [] as string[] };
  p.combo.best = Math.max(p.combo.best, Math.floor(links));
  recordWishCombo(p, links, reaction, superFusion, mode);
  let earned = 0;
  for (let step = 2; step <= Math.min(4, links); step++) earned |= 1 << (step - 2);
  const fusion = reaction && REACTIONS[reaction]?.kind === 'fusion' ? FUSION_IDS.indexOf(reaction as (typeof FUSION_IDS)[number]) : -1;
  if (links >= 2 && fusion >= 0) earned |= 1 << (3 + fusion);
  if (superFusion && fusion >= 0) earned |= 1 << (8 + fusion);
  // There are four launch Fusions. The fifth stamp in each row celebrates finding all four.
  const withPrior = p.combo.stamps | earned;
  if ((withPrior & (0b1111 << 3)) === 0b1111 << 3) earned |= 1 << 7;
  if ((withPrior & (0b1111 << 8)) === 0b1111 << 8) earned |= 1 << 12;
  const fresh = earned & ~p.combo.stamps;
  p.combo.stamps |= fresh;
  const stickers = Array.from({ length: COMBO_STAMP_COUNT }, (_, i) => i)
    .filter((i) => fresh & (1 << i))
    .map((i) => `combo_${i}`);
  const first = stickers.length;
  const stardust = first * COMBO_STAMP_DUST;
  if (stardust) earn(p, 'dust', stardust, 'discovery');
  return { first, stardust, stickers };
}
