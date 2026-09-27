// Well-timed, non-pushy offers: the Starter Pack after the first chapter chest,
// and a welcome-back gift for players who have been away a few days.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { collectDust, pendingDust, spendGems } from '../../meta/economy';
import { galaxyRate } from '../../meta/economy';
import type { App } from '../app';

export const WELCOME_BACK_DAYS = 3;
export const WELCOME_BACK_GEMS = 30;
export const DOUBLE_DUST_GEMS = 10;

export function maybeStarterOffer(app: App, then?: () => void) {
  const p = app.p;
  if (p.starter || p.meta.starterOffered || p.chapters.length < 1) return then?.();
  p.meta.starterOffered = true;
  app.save();
  const m = modal(
    [
      h('div', { class: 'm-sub' }, 'A gift for new explorers'),
      h('div', { class: 'm-title' }, 'Starter Pack'),
      h('div', { class: 'offer-art' }, '🎁'),
      h(
        'ul',
        { class: 'offer-list' },
        h('li', null, '💎 300 gems'),
        h('li', null, '🌠 ✨ 🔭 5 of every booster'),
        h('li', null, '🌈 Aurora atmosphere'),
      ),
      h('p', { class: 'muted' }, 'One time only, and it stays in the Shop if you want it later.'),
      btn(app.priceOf('starter'), 'buy-real wide', () => {
        m.close();
        app.buy('starter');
      }),
      btn('Maybe later', 'ghost wide', () => m.close()),
    ],
    { onClose: () => then?.() },
  );
}

export function welcomeBackFlow(app: App, awayMs: number, then?: () => void) {
  const p = app.p;
  const days = Math.floor(awayMs / 86400000);
  if (days < WELCOME_BACK_DAYS || !p.tutorial) return then?.();
  const pending = pendingDust(p);
  p.gems += WELCOME_BACK_GEMS;
  app.save();
  sfx.gem();
  haptic.success();
  const collect = (mult: number) => {
    if (mult === 2 && !spendGems(p, DOUBLE_DUST_GEMS)) return app.needGems();
    const d = collectDust(p, Date.now(), mult);
    if (d) sfx.coin();
    app.save();
    m.close();
  };
  const m = modal(
    [
      h('div', { class: 'gift-ic' }, '🪐'),
      h('div', { class: 'm-title' }, 'Welcome back!'),
      h('p', { class: 'muted' }, `You were away ${days} days. Your galaxy kept growing at ✨${fmt(galaxyRate(p))} an hour.`),
      h('div', { class: 'reward-list' }, h('span', null, `💎 ${WELCOME_BACK_GEMS} welcome gift`)),
      pending > 0
        ? h(
            'div',
            { class: 'row' },
            btn(`Collect ✨${fmt(pending)}`, 'dust-btn', () => collect(1)),
            btn(`×2 for 💎${DOUBLE_DUST_GEMS}`, 'gem', () => collect(2)),
          )
        : btn('Let’s play!', 'primary wide', () => m.close()),
    ],
    { dismiss: false, onClose: () => (app.refresh(), then?.()) },
  );
}
