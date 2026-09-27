// Daily login gift with a 7-day streak.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { today } from '../../meta/profile';
import { DAILY_GEMS } from '../../meta/config';
import { claimDailyGift, dailyGift } from '../../meta/economy';
import type { App } from '../app';
import { t } from '../../i18n';

export function dailyGiftFlow(app: App, then?: () => void) {
  const day = today();
  const g = dailyGift(app.p, day);
  if (!g) return then?.();
  const m = modal(
    [
      h('div', { class: 'gift-ic' }, '🎁'),
      h('div', { class: 'm-title' }, t('Daily gift')),
      h(
        'p',
        { class: 'muted' },
        g.streak > 1 ? t('{n}-day streak! Come back tomorrow for more.', { n: g.streak }) : t('Visit every day to grow your streak.'),
      ),
      h(
        'div',
        { class: 'streak' },
        ...DAILY_GEMS.map((gems, i) =>
          h(
            'div',
            { class: `sd${i < g.index ? ' done' : ''}${i === g.index ? ' today' : ''}${i === DAILY_GEMS.length - 1 ? ' big' : ''}` },
            h('small', null, t('Day {n}', { n: i + 1 })),
            h('b', null, String(gems)),
            i < g.index ? '✓' : '💎',
          ),
        ),
      ),
      btn(t('Collect {n} 💎', { n: g.gems }), 'primary wide', () => {
        claimDailyGift(app.p, day);
        app.save();
        sfx.gem();
        haptic.success();
        m.close();
        app.refresh();
        then?.();
      }),
    ],
    { dismiss: false },
  );
}
