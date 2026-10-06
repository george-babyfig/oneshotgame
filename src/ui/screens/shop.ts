// The shop is a section of the gated Grown-ups area.
import { h, btn, fmt } from '../dom';
import { PRODUCTS } from '../../meta/tuning';
import type { App } from '../app';
import { t } from '../../i18n';
import { refreshGrownups } from './grownups';
import { ownsProduct } from '../../meta/economy';

export function skinSwatch(glow: string) {
  if (glow === 'aurora') return 'conic-gradient(#ff8fc8,#6ec8ff,#b8ff6e,#ffd24a,#ff8fc8)';
  if (glow === 'cosmic') return 'conic-gradient(#7a4dff,#ff4de1,#4dc3ff,#7a4dff)';
  return glow;
}

async function purchase(app: App, key: string) {
  await app.buy(key);
  refreshGrownups(app);
}

export function shopSection(app: App) {
  return h(
    'section',
    { class: 'grownups-section' },
    h('h2', null, t('Shop')),
    ...PRODUCTS.map((product) => {
      const piggy = product.key === 'piggy';
      const owned = ownsProduct(app.p, product.id);
      const buy = btn(
        owned ? t('Owned') : app.priceOf(product.key) || t('Price unavailable'),
        'buy-real',
        () => void purchase(app, product.key),
      );
      buy.disabled = owned || !app.canBuy(product.key);
      return h(
        'div',
        { class: 'grownups-product' },
        h(
          'div',
          null,
          h('b', null, t(product.title)),
          h(
            'small',
            null,
            piggy
              ? app.p.pendingPiggy
                ? t('{n} gems saved', { n: fmt(app.p.pendingPiggy.amount) })
                : app.p.piggy
                  ? t('{n} gems saved', { n: fmt(app.p.piggy) })
                  : t('Nothing saved yet')
              : t(product.description),
          ),
          piggy && app.p.pendingPiggy ? h('small', null, t("Waiting for a grown-up's approval")) : null,
          // Ask to Buy sends no decline, so a parent can stop waiting; a late approval still grants.
          piggy && app.p.pendingPiggy
            ? btn(t('Stop waiting'), 'ghost small', () => {
                app.p.pendingPiggy = null;
                app.save();
                refreshGrownups(app);
              })
            : null,
        ),
        buy,
      );
    }),
  );
}

// Legacy app routes must pass through the same gate as Settings and Styles.
export function showShop(app: App) {
  refreshGrownups(app);
}
