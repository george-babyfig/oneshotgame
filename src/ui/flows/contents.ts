import { t } from '../../i18n';
import type { ProductDef } from '../../meta/config';
import { btn, h, modal } from '../dom';
import { STAR_ROAD } from '../../meta/starroad';
import { ledger } from '../../meta/ledger';

/** Confirm the exact contents and local store price after the parent gate. */
export function contentsSheet(product: ProductDef, price: string, piggyGems = 0, roadPoints = 0): Promise<boolean> {
  ledger.count('contents_sheet');
  return new Promise((resolve) => {
    let settled = false;
    const finish = (buy: boolean) => {
      if (settled) return;
      settled = true;
      sheet.close();
      resolve(buy);
    };
    const items = product.key === 'piggy' ? [t('{n} gems saved', { n: piggyGems })] : product.contents.map((item) => t(item));
    const reached = STAR_ROAD.filter((tier) => roadPoints >= tier.stars).length;
    const sheet = modal(
      [
        h('div', { class: 'm-title' }, product.emoji, ' ', t(product.title)),
        h('p', { class: 'muted' }, t(product.description)),
        product.key === 'pass'
          ? h('p', null, t('{reached} of {total} Road steps reached. Looks unlock along the Road.', { reached, total: STAR_ROAD.length }))
          : null,
        h('ul', null, ...items.map((item) => h('li', null, item))),
        h('p', null, price),
        h('p', { class: 'muted' }, product.consumable ? t('Family Sharing: no') : t('Family Sharing: yes')),
        h('p', { class: 'muted' }, product.consumable ? t('Used up when spent') : t('Never expires')),
        btn(t('Buy'), 'primary wide', () => finish(true)),
        btn(t('Cancel'), 'ghost wide', () => finish(false)),
      ],
      { onClose: () => finish(false), onAbort: () => finish(false) },
    );
  });
}
