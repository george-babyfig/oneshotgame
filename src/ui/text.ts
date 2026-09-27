// Localized names for game data (kept out of the pure simulation modules).
import { t } from '../i18n';
import { BIOMES, KINDS, type BiomeId, type Kind, type SpeciesDef } from '../core/world';

export const biomeName = (b: BiomeId) => t(BIOMES[b].name);
export const kindName = (k: Kind) => t(KINDS[k].name);
export const kindDesc = (k: Kind) => t(KINDS[k].desc);

export function speciesHint(sp: SpeciesDef): string {
  const h = sp.home;
  if (!h) return t(sp.hint);
  if (h.length === 1) return t('Lives in {a}', { a: biomeName(h[0]) });
  if (h.length === 2) return t('{a} next to {b}', { a: biomeName(h[0]), b: biomeName(h[1]) });
  return t('{a} between {b} and {c}', { a: biomeName(h[0]), b: biomeName(h[1]), c: biomeName(h[2]) });
}

export const rarityName = (r: SpeciesDef['rarity']) =>
  t({ common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' }[r]);
