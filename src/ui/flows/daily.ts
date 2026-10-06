// Star Calendar: one stamp per day you visit; missing a day never resets it.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { today } from '../../meta/profile';
import { CALENDAR_DAYS, calendarIndex, calendarReward, canStamp, stamp, stamps } from '../../meta/calendar';
import { rewardText } from '../../meta/progression';
import { COSMETIC_BY_ID, currentLook } from '../../meta/cosmetics';
import { itemCanvas } from '../art/keeper';
import type { App } from '../app';
import { t } from '../../i18n';

export function dailyGiftFlow(app: App, then?: () => void) {
  const day = today();
  const p = app.p;
  if (app.screen !== 'home' && app.screen !== 'missions') return then?.();
  const n = stamps(p);
  const cycle = Math.floor(n / CALENDAR_DAYS);
  const todayIdx = calendarIndex(n);
  const look = currentLook(p);
  const cells = Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const r = calendarReward(cycle * CALENDAR_DAYS + i);
    const big = !!r.item || (i + 1) % 7 === 0;
    const icon = r.item && COSMETIC_BY_ID[r.item] ? itemCanvas(r.item, look, 34) : h('span', { class: 'ci' }, rewardText(r)[0] ?? '');
    return h(
      'div',
      { class: `cal${i < todayIdx ? ' done' : ''}${i === todayIdx ? ' today' : ''}${big ? ' big' : ''}` },
      h('small', null, String(i + 1)),
      icon,
      i < todayIdx ? h('i', { class: 'tick' }, '✓') : null,
    );
  });
  const reward = calendarReward(n);
  const claim = () => {
    if (!stamp(p, day)) return;
    app.save();
    sfx.chest();
    haptic.success();
    app.refresh();
  };
  const m = modal(
    [
      h('div', { class: 'm-title' }, t('Star Calendar')),
      h('p', { class: 'muted' }, t('One stamp for every day you visit. Missing a day never resets it!')),
      h('div', { class: 'calendar' }, ...cells),
      h('div', { class: 'reward-list' }, ...rewardText(reward).map((x) => h('span', null, x))),
      canStamp(p, day) ? btn(t('Stamp day {n}', { n: todayIdx + 1 }), 'primary wide', () => m.close()) : null,
      btn(t('Close'), 'ghost small', () => m.close()),
    ],
    {
      onClose: () => {
        claim();
        then?.();
      },
    },
  );
}
