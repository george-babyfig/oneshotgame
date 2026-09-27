// Shop: one-time offers, piggy bank, gem packs, boosters and atmospheres.
import { h, btn, fmt, toast, confirmBox } from '../dom';
import { sfx } from '../audio';
import { BOOSTERS, PIGGY_MAX, PIGGY_PER_WIN, PRODUCTS, SKINS, type BoosterId } from '../../meta/config';
import { spendGems } from '../../meta/economy';
import type { App } from '../app';
import { t } from '../../i18n';

const PACK_ICONS = ['💎', '👝', '🧰', '🌌'];
export const PIGGY_MIN = 40;
/** The piggy bank appears from chapter 2, once players are invested. */
export const PIGGY_FROM_LEVEL = 10;

export function skinSwatch(glow: string) {
  if (glow === 'aurora') return 'conic-gradient(#ff8fc8,#6ec8ff,#b8ff6e,#ffd24a,#ff8fc8)';
  if (glow === 'cosmic') return 'conic-gradient(#7a4dff,#ff4de1,#4dc3ff,#7a4dff)';
  return glow;
}

export function showShop(app: App) {
  const p = app.p;
  const starter = !p.starter
    ? h(
        'div',
        { class: 'offer' },
        h('div', { class: 'ribbon' }, t('ONE-TIME')),
        h('div', { class: 'offer-t' }, t('Starter Pack')),
        h(
          'ul',
          null,
          h('li', null, t('💎 300 gems')),
          h('li', null, t('🌠 ✨ 🔭 5 of every booster')),
          h('li', null, t('🌈 Aurora atmosphere')),
        ),
        h('div', { class: 'value' }, t('Over 5× the value of gems alone')),
        btn(app.priceOf('starter'), 'buy-real wide', () => app.buy('starter')),
      )
    : null;
  const pass = !p.pass
    ? h(
        'div',
        { class: 'offer pass' },
        h('div', { class: 'offer-t' }, t('🌌 Cosmic Pass')),
        h(
          'p',
          null,
          t(
            'Unlock the golden lane of the Star Road: a second reward at every tier, forever. Rewards you already passed are waiting for you.',
          ),
        ),
        h(
          'div',
          { class: 'row' },
          btn(t('See rewards'), 'ghost', () => app.showRoad()),
          btn(app.priceOf('pass'), 'buy-real', () => app.buy('pass')),
        ),
      )
    : null;
  const piggy = h(
    'div',
    { class: 'piggy' },
    h('div', { class: 'piggy-ic' }, '🐷'),
    h(
      'div',
      { class: 'piggy-body' },
      h('b', null, t('Piggy bank: 💎 {n}', { n: p.piggy })),
      h(
        'small',
        null,
        t('Every planet you finish drops 💎{n} in (max {max}). Break it to keep them all.', { n: PIGGY_PER_WIN, max: PIGGY_MAX }),
      ),
      h('div', { class: 'pbar' }, h('i', { style: `width:${(p.piggy / PIGGY_MAX) * 100}%` })),
    ),
    btn(app.priceOf('piggy'), `buy-real${p.piggy >= PIGGY_MIN ? '' : ' dim'}`, () =>
      p.piggy >= PIGGY_MIN ? app.buy('piggy') : toast(t('Fill it to {n} gems first — finish more planets!', { n: PIGGY_MIN })),
    ),
  );
  const packs = h(
    'div',
    { class: 'packs' },
    ...PRODUCTS.filter((x) => x.consumable && x.gems > 0).map((x, i) =>
      h(
        'button',
        { class: 'pack', onclick: () => app.buy(x.key) },
        x.tag ? h('div', { class: 'tag' }, t(x.tag)) : null,
        h('div', { class: 'pi' }, PACK_ICONS[i]),
        h('b', null, fmt(x.gems)),
        h('small', null, t(x.title)),
        h('div', { class: 'pp' }, app.priceOf(x.key)),
      ),
    ),
  );
  const boosters = h(
    'div',
    { class: 'bshop' },
    ...(Object.keys(BOOSTERS) as BoosterId[]).map((id) => {
      const b = BOOSTERS[id];
      return h(
        'div',
        { class: 'up-row' },
        h('div', { class: 'up-ic' }, b.emoji),
        h('div', { class: 'up-body' }, h('b', null, `${t(b.name)} ×${p.boosters[id]}`), h('small', null, t(b.desc))),
        btn(`💎${b.gems}`, 'buy', () => {
          if (!spendGems(p, b.gems)) return app.needGems();
          p.boosters[id]++;
          sfx.coin();
          app.save();
          showShop(app);
        }),
      );
    }),
  );
  const skins = h(
    'div',
    { class: 'skins' },
    ...SKINS.map((s) => {
      const owned = p.skins.includes(s.id);
      const on = p.skin === s.id;
      return h(
        'button',
        {
          class: `skin${on ? ' on' : ''}`,
          onclick: async () => {
            if (owned) p.skin = s.id;
            else if (s.starter) return toast(t('Included in the Starter Pack'));
            else if (s.pass) return toast(t('A Cosmic Pass reward on the Star Road'));
            else if (s.road) return toast(t('Earn it on the Star Road'));
            else {
              if (p.gems < s.gems) return app.needGems();
              if (!(await confirmBox(t('Buy {name} for 💎{n}?', { name: t(s.name), n: s.gems }), t('Buy')))) return;
              if (!spendGems(p, s.gems)) return app.needGems();
              p.skins.push(s.id);
              p.skin = s.id;
            }
            sfx.coin();
            app.save();
            showShop(app);
          },
        },
        h('div', { class: 'sk-orb', style: `--g:${skinSwatch(s.glow)}` }),
        h('b', null, t(s.name)),
        h(
          'small',
          null,
          on
            ? t('Equipped')
            : owned
              ? t('Equip')
              : s.starter
                ? t('Starter Pack')
                : s.pass
                  ? t('Cosmic Pass')
                  : s.road
                    ? t('Star Road')
                    : `💎${s.gems}`,
        ),
      );
    }),
  );
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Shop')),
      h(
        'div',
        { class: 'scroll' },
        starter,
        p.level > PIGGY_FROM_LEVEL ? piggy : null,
        h('div', { class: 'sec-title' }, t('Gems')),
        packs,
        pass,
        h('div', { class: 'sec-title' }, t('Boosters')),
        boosters,
        h('div', { class: 'sec-title' }, t('Atmospheres')),
        skins,
        btn(t('Restore purchases'), 'ghost small', () => app.restore()),
        h(
          'p',
          { class: 'tiny muted' },
          t('Payment is charged to your Apple ID. Gems have no cash value. No random rewards — you always see exactly what you get.'),
        ),
      ),
    ),
    'shop',
  );
}
