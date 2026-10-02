import { t } from '../../i18n';
import type { ProductDef } from '../../meta/config';
import { btn, h, modal } from '../dom';

export function receiptText(product: ProductDef, gems: number): string {
  if (product.key === 'starter') return t('Aurora atmosphere, Explorer suit and trail are in Styles. The Aurora banner is in Passport.');
  if (product.key === 'pass')
    return t(
      'Cosmic looks unlock along the Star Road. Gold paints and the photo frame are in Homeworld; the banner and title are in Passport.',
    );
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
