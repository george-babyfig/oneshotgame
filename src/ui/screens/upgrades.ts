// Permanent upgrades bought with stardust.
import { h, btn, fmt, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { UPGRADES, type UpgradeId } from '../../meta/config';
import { galaxyRate, spendDust } from '../../meta/economy';
import type { App } from '../app';
import { t } from '../../i18n';
import { KINDS, type Kind } from '../../core/world';
import { LAB_COST, LAB_MAX, canLab, labLevel, perks, upgradeLab } from '../../meta/lab';
import { projectileCanvas } from '../art/projectiles';

function labCard(app: App, kind: Kind) {
  const p = app.p;
  const k = KINDS[kind];
  const lv = labLevel(p, kind);
  const check = canLab(p, kind);
  const locked = check === 'locked';
  return h(
    'div',
    { class: `lab-card${locked ? ' locked' : ''}`, style: `--c:${k.color}` },
    h(
      'div',
      { class: 'lab-head' },
      projectileCanvas(kind, 44),
      h(
        'div',
        { class: 'grow' },
        h('b', null, t(k.name)),
        h('small', null, locked ? t('Unlocks at planet {n}', { n: k.unlock }) : t('Lv {n}', { n: lv })),
      ),
      check === 'max'
        ? h('div', { class: 'up-max' }, t('MAX'))
        : locked
          ? h('div', { class: 'up-max' }, '🔒')
          : btn(`✨${fmt(LAB_COST[lv + 1])}`, `buy${check === 'ok' ? '' : ' dim'}`, () => {
              const r = upgradeLab(p, kind);
              if (r === 'dust') {
                sfx.error();
                return toast(t('Not enough stardust — collect from your galaxy!'), 'bad');
              }
              if (r !== 'ok') return;
              sfx.levelUp();
              haptic.success();
              toast(t('{name} reached level {n}!', { name: t(k.name), n: lv + 1 }), 'good');
              app.save();
              showUpgrades(app);
            }),
    ),
    h('div', { class: 'pips' }, ...Array.from({ length: LAB_MAX }, (_, i) => h('i', { class: i < lv ? 'on' : '' }))),
    h(
      'ul',
      { class: 'lab-perks' },
      ...perks().map((pk) =>
        h(
          'li',
          { class: pk.lv <= lv ? 'got' : pk.lv === lv + 1 ? 'next' : '' },
          h('b', null, `${pk.lv <= lv ? '✓' : `Lv${pk.lv}`} ${pk.name}`),
          ` ${pk.desc}`,
        ),
      ),
    ),
  );
}

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
        h('div', { class: 'sec-title' }, t('🧪 Object Lab')),
        h('p', { class: 'muted' }, t('Level up each object for stronger throws in the campaign and Zen Garden.')),
        h('div', { class: 'lab-grid' }, ...(Object.keys(KINDS) as Kind[]).map((k) => labCard(app, k))),
        h('div', { class: 'sec-title' }, t('🌌 Galaxy upgrades')),
        ...rows,
      ),
    ),
    'upgrades',
  );
}
