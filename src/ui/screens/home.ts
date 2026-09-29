// Home: your galaxy, the stardust vault, the big Play button and navigation.
import { h, btn, fmt, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { levelMeta, TWISTS } from '../../core/levels';
import { SPECIES } from '../../core/world';
import { totalStars } from '../../meta/profile';
import { collectDust, galaxyRate, pendingDust, planetRate, vaultHours } from '../../meta/economy';
import { chapterOf, chestsReady, questsClaimable, roadReady } from '../../meta/progression';
import { drawGalaxy } from './galaxy';
import { ensureEvent, eventReady } from '../../meta/events';
import { rankReady } from '../../meta/rank';
import { modesBadge } from '../flows/modes';
import type { App } from '../app';
import { icon as iconEl } from '../icons';
import { t, tp } from '../../i18n';
import { editPassport } from './passport';
import { checkMail, unread } from '../../meta/inbox';
import { SEASON_EMOJI, SEASON_NAMES, seasonOf, skyEventOn } from '../../meta/seasons';
import { homeBadge } from '../../meta/homeworld';
import { FESTIVAL_TIERS, ensureFestival, festivalActive, festivalReady } from '../../meta/festivals';
import { VOYAGE_LEN, ensureVoyage } from '../../meta/voyage';
import { unlocked } from '../../meta/unlocks';

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

/** This month's festival: tap for its tiers. */
function festivalChip(app: App) {
  const p = app.p;
  if (!festivalActive(p)) return null;
  const f = ensureFestival(p);
  const max = FESTIVAL_TIERS[FESTIVAL_TIERS.length - 1].spot;
  const ready = festivalReady(p).length;
  return h(
    'button',
    { class: `fest-chip${ready ? ' ready' : ''}`, style: `--c:${f.color}`, onclick: () => (sfx.click(), app.festival()) },
    `${f.emoji} ${t(f.name)} · ${Math.min(p.festival.spotted, max)}/${max}`,
    ready ? h('span', { class: 'nb dot' }, String(ready)) : null,
  );
}

/** Dot when the next stop is open and not yet cleared this week. */
function voyageBadge(p: App['p']) {
  const v = ensureVoyage(p);
  return v.cleared < VOYAGE_LEN ? 1 : 0;
}

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

export function showHome(app: App, quiet = false) {
  const p = app.p;
  if (checkMail(p)) app.save();
  const next = levelMeta(p.level);
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
    h('div', { class: 'chip-row' }, seasonChip(p.settings.hemi), festivalChip(app)),
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
        unlocked(p, 'quests') ? navBtn('scroll', t('Quests'), questBadge, () => app.quests(), 'side-btn') : null,
        unlocked(p, 'star_road') ? navBtn('road', t('Star Road'), roadBadge, () => app.showRoad(), 'side-btn') : null,
        navBtn('medal', t('Rank {n}', { n: p.rank }), rankReady(p) ? 1 : 0, () => app.rank(), 'side-btn'),
        unlocked(p, 'inbox') ? navBtn('mail', t('Inbox'), unread(p), () => app.inbox(), 'side-btn') : null,
      ),
      h(
        'div',
        { class: 'side side-r' },
        unlocked(p, 'homeworld') ? navBtn('world', t('Homeworld'), homeBadge(p), () => app.showHomeworld(), 'side-btn world-btn') : null,
        navBtn('pad', t('Modes'), modesBadge(app), () => app.modes(), 'side-btn'),
        unlocked(p, 'voyage') ? navBtn('rocket', t('Voyage'), voyageBadge(p), () => app.showVoyage(), 'side-btn') : null,
        unlocked(p, 'weekly_event')
          ? navBtn(ensureEvent(p).emoji, t('Event'), eventReady(p).length, () => app.events(), 'side-btn event-btn')
          : null,
      ),
    ),
    p.galaxy.length ? h('div', { class: 'collect-row' }, collect) : null,
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
      unlocked(p, 'lifebook') ? navBtn('book', t('Lifebook'), `${p.seen.length}/${SPECIES.length}`, () => app.showLifebook()) : null,
      unlocked(p, 'upgrades') ? navBtn('up', t('Upgrades'), '', () => app.showUpgrades()) : null,
      navBtn('bag', t('Shop'), p.starter || p.chapters.length < 1 ? '' : t('OFFER'), () => app.showShop()),
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
  if (quiet) return;
  if (!app.launched && p.tutorial) app.daily();
  // One-time Passport setup once the first planet is done (after any launch pop-ups).
  else if (unlocked(p, 'passport_setup') && !p.passport.set && !setupAsked && !document.querySelector('.modal')) {
    setupAsked = true;
    editPassport(app, true);
  }
}
