import { PRODUCT_BY_KEY, STARTER_BOOSTERS } from '../../meta/tuning';
import { ledger } from '../../meta/ledger';
// The Starter Pack is shown after a chapter chest, subject to the shared governor.
import { h, btn, modal } from '../dom';
import type { App } from '../app';
import { t } from '../../i18n';

export function maybeStarterOffer(app: App, then?: () => void) {
  const p = app.p;
  if (p.starter || p.meta.starterOffered || p.chapters.length < 1 || !app.autoPopup('starter')) return then?.();
  p.meta.starterOffered = true;
  ledger.count('offer_starter_after_chest');
  app.save();
  const m = modal(
    [
      h('div', { class: 'm-sub' }, t('For curious explorers')),
      h('div', { class: 'm-title' }, t('Starter Pack')),
      h('div', { class: 'offer-art' }, '🎁'),
      h(
        'ul',
        { class: 'offer-list' },
        h('li', null, t('💎 {n} gems', { n: PRODUCT_BY_KEY.starter.gems })),
        h('li', null, t('🌠 ✨ 🔭 {n} of every booster', { n: STARTER_BOOSTERS })),
        h('li', null, t('🌈 Aurora atmosphere')),
      ),
      h('p', { class: 'muted' }, t('You can find this in the Shop later.')),
      btn(app.priceOf('starter'), 'buy-real wide', () => {
        m.close();
        app.buy('starter');
      }),
      btn(t('Maybe later'), 'ghost wide', () => m.close()),
    ],
    { onClose: () => then?.() },
  );
}
