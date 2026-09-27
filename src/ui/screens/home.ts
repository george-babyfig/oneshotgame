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
import { t, tp } from '../../i18n';
import { editPassport } from './passport';
import { checkMail, unread } from '../../meta/inbox';
import { SEASON_EMOJI, SEASON_NAMES, seasonOf, skyEventOn } from '../../meta/seasons';
import { homeBadge, homeUnlocked } from '../../meta/homeworld';

export function navBtn(icon: string, label: string, badge: string | number, fn: () => void, cls = '') {
  return h(
    'button',
    { class: `nav-btn ${cls}`, onclick: () => (sfx.click(), haptic.light(), fn()) },
    h('span', { class: 'ni' }, iconEl(icon)),
    h('span', { class: 'nl' }, label),
    badge ? h('span', { class: `nb${typeof badge === 'number' ? ' dot' : ''}` }, String(badge)) : null,
  );
}

let setupAsked = false;

/** Today's season, and a banner on real meteor-shower days. */
function seasonChip(hemi: 'north' | 'south') {
  const now = new Date();
  const s = seasonOf(now, hemi);
  const sky = skyEventOn(now);
  return h(
    'div',
    { class: `season-chip${sky ? ' sky' : ''}` },
    sky ? t('☄️ {name} tonight — Supernovas charge 2× faster!', { name: t(sky.name) }) : `${SEASON_EMOJI[s]} ${t(SEASON_NAMES[s])}`,
  );
}

export function showHome(app: App) {
  const p = app.p;
  if (checkMail(p)) app.save();
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
      h('b', null, t('Collect ✨ {n}', { n: fmt(pending) })),
      h('small', null, full ? t('Vault full! Upgrade it to store more') : t('{n} stardust / hour', { n: fmt(rate) })),
    ),
    `dust-btn${full ? ' full' : ''}`,
    () => {
      const d = collectDust(p);
      if (d) {
        sfx.coin();
        haptic.success();
        toast(t('+{n} stardust', { n: fmt(d) }), 'good');
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
    h('div', { class: 'title' }, h('span', null, t('Pocket')), h('span', null, t('Planet'))),
    seasonChip(p.settings.hemi),
    h(
      'div',
      { class: 'galaxy-wrap' },
      canvas,
      p.galaxy.length ? null : h('div', { class: 'galaxy-empty' }, t('Your galaxy is empty.\nFinish planets to fill it!')),
      p.visitors.length
        ? h(
            'button',
            { class: 'visit-chip', onclick: () => (sfx.click(), app.visitors()) },
            tp(p.visitors.length, '🛸 {n} visitor left gifts!', '🛸 {n} visitors left gifts!'),
          )
        : null,
      h(
        'div',
        { class: 'side side-l' },
        navBtn('scroll', t('Quests'), questBadge, () => app.quests(), 'side-btn'),
        navBtn('road', t('Star Road'), roadBadge, () => app.showRoad(), 'side-btn'),
        navBtn('medal', t('Rank {n}', { n: p.rank }), rankReady(p) ? 1 : 0, () => app.rank(), 'side-btn'),
        navBtn('mail', t('Inbox'), unread(p), () => app.inbox(), 'side-btn'),
      ),
      h(
        'div',
        { class: 'side side-r' },
        homeUnlocked(p) ? navBtn('world', t('Homeworld'), homeBadge(p), () => app.showHomeworld(), 'side-btn world-btn') : null,
        navBtn('pad', t('Modes'), modesBadge(app), () => app.modes(), 'side-btn'),
        eventActive(p) ? navBtn(ensureEvent(p).emoji, t('Event'), eventReady(p).length, () => app.events(), 'side-btn event-btn') : null,
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
                toast(t('+{n} stardust (doubled!)', { n: fmt(d) }), 'good');
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
        h('b', null, t('▶ PLAY  Planet {n}', { n: p.level })),
        h('small', null, `${t(ch.name)} · ${next.twist !== 'none' ? t(TWISTS[next.twist].name) : next.name}`),
      ),
      'primary big wide play',
      () => app.preLevel(p.level),
    ),
    h(
      'div',
      { class: 'nav' },
      navBtn('map', t('Star Map'), `${stars}★`, () => app.showStarMap()),
      navBtn('book', t('Lifebook'), `${p.seen.length}/${SPECIES.length}`, () => app.showLifebook()),
      navBtn('up', t('Upgrades'), '', () => app.showUpgrades()),
      navBtn('bag', t('Shop'), p.starter ? '' : t('OFFER'), () => app.showShop()),
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
  if (!app.launched && p.tutorial) app.daily();
  // One-time Passport setup once the first planet is done (after any launch pop-ups).
  else if (p.stats.wins >= 1 && !p.passport.set && !setupAsked && !document.querySelector('.modal')) {
    setupAsked = true;
    editPassport(app, true);
  }
}
