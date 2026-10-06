import { t } from '../../i18n';
import type { ProductDef } from '../../meta/config';
import { btn, h, modal } from '../dom';

export function receiptText(product: ProductDef, gems: number): string {
  if (product.key === 'starter')
    return t(
      'Aurora atmosphere, Aurora Explorer suit, Aurora hat, Aurora trail and Aurora launcher look are in Styles. Aurora Homeworld paint is in Styles → Homeworld looks and the Homeworld paint sheet. The Aurora Passport banner is in Passport.',
    );
  if (product.key === 'pass')
    return t(
      'Cosmic Pass looks unlock along Cosmic Road in Missions. Keeper looks and effects are in Styles. Gilded Homeworld ground paint and Liquid Gold Homeworld sea paint are in Styles → Homeworld looks and the Homeworld paint sheet. The Starfield photo frame is in Homeworld photo mode. The Gilded Passport banner and Star Captain title are in Passport after their Road steps.',
    );
  if (product.key === 'theme_tidepool')
    return t(
      'Tidepool Lab, Den, Greenhouse, Launch Bay and decoration skins are in Styles → Homeworld looks and appear on Homeworld. Tidepool ground and sea paints are also in the Homeworld paint sheet. Both Tidepool friend outfits are in Styles → Friend outfits and appear on Homeworld.',
    );
  if (product.key === 'theme_cometcandy')
    return t(
      'Comet Candy Lab, Den, Greenhouse, Launch Bay and decoration skins are in Styles → Homeworld looks and appear on Homeworld. Comet Candy ground and sea paints are also in the Homeworld paint sheet. Both Comet Candy friend outfits are in Styles → Friend outfits and appear on Homeworld.',
    );
  if (product.key === 'pack_crystalfrost')
    return t(
      'Crystal Frost Keeper suit and crown are in Styles → Suit and Hat. Six Crystal Frost object trails and bursts are in Styles → Objects. Crystal Frost Fusion is in Styles → Effects.',
    );
  if (product.key === 'style_nebula') return t('Nebula Swirl Supernova is in Styles → Effects. Nebula Swirl trail is in Styles → Trail.');
  if (product.key === 'style_firefly')
    return t('Firefly Sparks Supernova is in Styles → Effects. Firefly Sparks trail is in Styles → Trail.');
  return t('{n} gems added', { n: gems.toLocaleString() });
}

export function receiptCard(product: ProductDef, gems: number): Promise<void> {
  return new Promise((resolve) => {
    const m = modal(
      [
        h('div', { class: 'm-title' }, t('Purchase complete')),
        h('p', null, receiptText(product, gems)),
        btn(t('Done'), 'primary wide', () => m.close()),
      ],
      { onClose: resolve, onAbort: resolve },
    );
  });
}
