import { PRODUCT_BY_KEY, STARTER_BOOSTERS } from '../../meta/tuning';
import { ledger } from '../../meta/ledger';
import { earn } from '../../meta/wallet';
// Well-timed, non-pushy offers: the Starter Pack after the first chapter chest,
// and a welcome-back gift for players who have been away a few days.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { collectDust, pendingDust } from '../../meta/economy';
import { galaxyRate } from '../../meta/economy';
import type { App } from '../app';
import { t } from '../../i18n';

export const WELCOME_BACK_DAYS = 3;
export { WELCOME_BACK_GEMS } from '../../meta/tuning';
import { WELCOME_BACK_GEMS } from '../../meta/tuning';

export function maybeStarterOffer(app: App, then?: () => void) {
  const p = app.p;
  if (p.starter || p.meta.starterOffered || p.chapters.length < 1 || p.meta.sessions <= 1) return then?.();
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

export function welcomeBackFlow(app: App, awayMs: number, then?: () => void) {
  const p = app.p;
  const days = Math.floor(awayMs / 86400000);
  if (days < WELCOME_BACK_DAYS || !p.tutorial) return then?.();
  const pending = pendingDust(p);
  earn(p, 'gems', WELCOME_BACK_GEMS, 'welcome_back');
  app.save();
  sfx.gem();
  haptic.success();
  const collect = () => {
    const d = collectDust(p);
    if (d) sfx.coin();
    app.save();
    m.close();
  };
  const m = modal(
    [
      h('div', { class: 'gift-ic' }, '🪐'),
      h('div', { class: 'm-title' }, t('Welcome back!')),
      h(
        'p',
        { class: 'muted' },
        t('You were away {n} days. Your galaxy kept growing at ✨{rate} an hour.', { n: days, rate: fmt(galaxyRate(p)) }),
      ),
      h('div', { class: 'reward-list' }, h('span', null, t('💎 {n} welcome gift', { n: WELCOME_BACK_GEMS }))),
      pending > 0
        ? h('div', { class: 'row' }, btn(t('Collect ✨{n}', { n: fmt(pending) }), 'dust-btn', collect))
        : btn(t('Let’s play!'), 'primary wide', () => m.close()),
    ],
    { dismiss: false, onClose: () => (app.refresh(), then?.()) },
  );
}
