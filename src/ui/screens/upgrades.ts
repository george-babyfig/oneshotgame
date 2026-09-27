// Permanent upgrades bought with stardust.
import { h, btn, fmt, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { UPGRADES, type UpgradeId } from '../../meta/config';
import { galaxyRate, spendDust } from '../../meta/economy';
import type { App } from '../app';
import { t } from '../../i18n';

export function showUpgrades(app: App) {
  const p = app.p;
  const rows = (Object.keys(UPGRADES) as UpgradeId[]).map((id) => {
    const u = UPGRADES[id];
    const lv = p.upgrades[id];
    const max = lv >= u.costs.length;
    const cost = u.costs[lv];
    return h(
      'div',
      { class: 'up-row' },
      h('div', { class: 'up-ic' }, u.emoji),
      h(
        'div',
        { class: 'up-body' },
        h('b', null, t(u.name)),
        h('small', null, u.desc(lv)),
        !max ? h('small', { class: 'next' }, t('Next: {desc}', { desc: u.desc(lv + 1) })) : null,
        h('div', { class: 'pips' }, ...u.costs.map((_, i) => h('i', { class: i < lv ? 'on' : '' }))),
      ),
      max
        ? h('div', { class: 'up-max' }, t('MAX'))
        : btn(`✨${fmt(cost)}`, `buy${p.dust >= cost ? '' : ' dim'}`, () => {
            if (!spendDust(p, cost)) {
              sfx.error();
              return toast(t('Not enough stardust — collect from your galaxy!'), 'bad');
            }
            p.upgrades[id]++;
            sfx.levelUp();
            haptic.success();
            app.save();
            showUpgrades(app);
          }),
    );
  });
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Upgrades')),
      h(
        'div',
        { class: 'scroll' },
        h(
          'p',
          { class: 'muted' },
          t('Your galaxy makes ✨{n} stardust per hour. Spend it on permanent upgrades.', { n: fmt(galaxyRate(p)) }),
        ),
        ...rows,
      ),
    ),
    'upgrades',
  );
}
