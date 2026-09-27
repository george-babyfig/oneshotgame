// Home: your galaxy, the stardust vault, the big Play button and navigation.
import { h, btn, fmt, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { makeLevel, TWISTS } from '../../core/levels';
import { SPECIES } from '../../core/world';
import { totalStars } from '../../meta/profile';
import { collectDust, galaxyRate, pendingDust, planetRate, vaultHours } from '../../meta/economy';
import { chapterOf, chestsReady, questsClaimable, roadReady } from '../../meta/progression';
import { drawGalaxy } from './galaxy';
import { rankReady } from '../../meta/rank';
import { modesBadge } from '../flows/modes';
import { PIGGY_FROM_LEVEL, PIGGY_MIN } from './shop';
import type { App } from '../app';

export function navBtn(icon: string, label: string, badge: string | number, fn: () => void, cls = '') {
  return h(
    'button',
    { class: `nav-btn ${cls}`, onclick: () => (sfx.click(), haptic.light(), fn()) },
    h('span', { class: 'ni' }, icon),
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
      h(
        'div',
        { class: 'side side-l' },
        navBtn('📜', 'Quests', questBadge, () => app.quests(), 'side-btn'),
        navBtn('🛣️', 'Star Road', roadBadge, () => app.showRoad(), 'side-btn'),
        navBtn('🏅', `Rank ${p.rank}`, rankReady(p) ? 1 : 0, () => app.rank(), 'side-btn'),
      ),
      h(
        'div',
        { class: 'side side-r' },
        navBtn('🎮', 'Modes', modesBadge(app), () => app.modes(), 'side-btn'),
        p.visitors.length ? navBtn('🛸', 'Visitors', p.visitors.length, () => app.visitors(), 'side-btn visitors-btn') : null,
        p.level > PIGGY_FROM_LEVEL && p.piggy >= PIGGY_MIN ? navBtn('🐷', `💎${p.piggy}`, '', () => app.showShop(), 'side-btn') : null,
      ),
    ),
    p.galaxy.length ? collect : null,
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
      navBtn('🗺️', 'Star Map', `${stars}★`, () => app.showStarMap()),
      navBtn('📖', 'Lifebook', `${p.seen.length}/${SPECIES.length}`, () => app.showLifebook()),
      navBtn('⬆️', 'Upgrades', '', () => app.showUpgrades()),
      navBtn('🛍️', 'Shop', p.starter ? '' : 'OFFER', () => app.showShop()),
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
