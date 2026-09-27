// Home: your galaxy, the stardust vault, the big Play button and navigation.
import { h, btn, fmt, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { makeLevel, TWISTS } from '../../core/levels';
import { SPECIES } from '../../core/world';
import { totalStars } from '../../meta/profile';
import { collectDust, galaxyRate, pendingDust, planetRate, spendGems, vaultHours } from '../../meta/economy';
import { DOUBLE_DUST_GEMS } from '../flows/offers';
import { chapterOf, chestsReady, questsClaimable, roadReady } from '../../meta/progression';
import { drawGalaxy } from './galaxy';
import { ensureEvent, eventActive, eventReady } from '../../meta/events';
import { rankReady } from '../../meta/rank';
import { modesBadge } from '../flows/modes';
import { PIGGY_FROM_LEVEL, PIGGY_MIN } from './shop';
import type { App } from '../app';
import { icon as iconEl } from '../icons';

export function navBtn(icon: string, label: string, badge: string | number, fn: () => void, cls = '') {
  return h(
    'button',
    { class: `nav-btn ${cls}`, onclick: () => (sfx.click(), haptic.light(), fn()) },
    h('span', { class: 'ni' }, iconEl(icon)),
    h('span', { class: 'nl' }, label),
    badge ? h('span', { class: `nb${typeof badge === 'number' ? ' dot' : ''}` }, String(badge)) : null,
  );
}

export function showHome(app: App) {
  const p = app.p;
  const next = makeLevel(p.level);
  const ch = chapterOf(p.level);
  const pending = pendingDust(p);
  const rate = galaxyRate(p);
  const full = pending >= Math.floor(rate * vaultHours(p));
  const canvas = h('canvas', { class: 'galaxy' });
  const stars = totalStars(p);
  const questBadge = questsClaimable(p);
  const roadBadge = roadReady(p, stars).length + chestsReady(p).length;

  const collect = btn(
    h(
      'span',
      { class: 'stack' },
      h('b', null, `Collect ✨ ${fmt(pending)}`),
      h('small', null, full ? 'Vault full! Upgrade it to store more' : `${fmt(rate)} stardust / hour`),
    ),
    `dust-btn${full ? ' full' : ''}`,
    () => {
      const d = collectDust(p);
      if (d) {
        sfx.coin();
        haptic.success();
        toast(`+${fmt(d)} stardust`, 'good');
        app.save();
      }
      showHome(app);
    },
  );
  collect.disabled = pending <= 0;

  const el = h(
    'div',
    { class: 'screen home' },
    app.topBar(),
    h('div', { class: 'title' }, h('span', null, 'Pocket'), h('span', null, 'Planet')),
    h(
      'div',
      { class: 'galaxy-wrap' },
      canvas,
      p.galaxy.length ? null : h('div', { class: 'galaxy-empty' }, 'Your galaxy is empty.\nFinish planets to fill it!'),
      p.visitors.length
        ? h(
            'button',
            { class: 'visit-chip', onclick: () => (sfx.click(), app.visitors()) },
            `🛸 ${p.visitors.length} visitor${p.visitors.length > 1 ? 's' : ''} left gifts!`,
          )
        : null,
      h(
        'div',
        { class: 'side side-l' },
        navBtn('scroll', 'Quests', questBadge, () => app.quests(), 'side-btn'),
        navBtn('road', 'Star Road', roadBadge, () => app.showRoad(), 'side-btn'),
        navBtn('medal', `Rank ${p.rank}`, rankReady(p) ? 1 : 0, () => app.rank(), 'side-btn'),
      ),
      h(
        'div',
        { class: 'side side-r' },
        navBtn('pad', 'Modes', modesBadge(app), () => app.modes(), 'side-btn'),
        eventActive(p) ? navBtn(ensureEvent(p).emoji, 'Event', eventReady(p).length, () => app.events(), 'side-btn event-btn') : null,
        p.level > PIGGY_FROM_LEVEL && p.piggy >= PIGGY_MIN ? navBtn('pig', `💎${p.piggy}`, '', () => app.showShop(), 'side-btn') : null,
      ),
    ),
    p.galaxy.length
      ? h(
          'div',
          { class: 'collect-row' },
          collect,
          pending >= 100
            ? btn(h('span', { class: 'stack' }, h('b', null, '×2'), h('small', null, `💎${DOUBLE_DUST_GEMS}`)), 'gem double', () => {
                if (!spendGems(p, DOUBLE_DUST_GEMS)) return app.needGems();
                const d = collectDust(p, Date.now(), 2);
                sfx.coin();
                haptic.success();
                toast(`+${fmt(d)} stardust (doubled!)`, 'good');
                app.save();
                showHome(app);
              })
            : null,
        )
      : null,
    btn(
      h(
        'span',
        { class: 'stack' },
        h('b', null, `▶ PLAY  Planet ${p.level}`),
        h('small', null, `${ch.name} · ${next.twist !== 'none' ? TWISTS[next.twist].name : next.name}`),
      ),
      'primary big wide play',
      () => app.preLevel(p.level),
    ),
    h(
      'div',
      { class: 'nav' },
      navBtn('map', 'Star Map', `${stars}★`, () => app.showStarMap()),
      navBtn('book', 'Lifebook', `${p.seen.length}/${SPECIES.length}`, () => app.showLifebook()),
      navBtn('up', 'Upgrades', '', () => app.showUpgrades()),
      navBtn('bag', 'Shop', p.starter ? '' : 'OFFER', () => app.showShop()),
    ),
  );
  const view = drawGalaxy(canvas, p.galaxy, {
    reduceMotion: p.settings.reduceMotion,
    onTap: (g) => {
      sfx.click();
      toast(`${g.name} · ${'★'.repeat(g.stars)} · ✨${planetRate(g)}/h`);
    },
  });
  app.mount(el, 'home', view.stop);
}
