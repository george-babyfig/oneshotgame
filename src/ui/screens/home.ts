// Play: one clear next step beside the galaxy.
import { h, btn, fmt, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { levelMeta, TWISTS } from '../../core/levels';
import { collectDust, galaxyRate, pendingDust, planetRate, vaultHours } from '../../meta/economy';
import { chapterOf } from '../../meta/progression';
import { drawGalaxy } from '../art/galaxy';
import { effectiveReduceMotion, flyReward, menuParticles } from '../motion';
import type { App } from '../app';
import { t, tp } from '../../i18n';
import { unlocked } from '../../meta/unlocks';
import { nextUp } from '../../meta/nextup';
import { STYLES_RELEASE } from '../../meta/cosmetics';
import { currentLook } from '../../meta/cosmetics';

export function showHome(app: App) {
  const p = app.p;
  document.documentElement.classList.toggle('styles-new', p.stylesNewSeen !== STYLES_RELEASE);
  const now = Date.now();
  const next = levelMeta(p.level);
  const ch = chapterOf(p.level);
  const pending = pendingDust(p, now);
  const rate = galaxyRate(p);
  const full = rate > 0 && pending >= Math.floor(rate * vaultHours(p));
  const canvas = h('canvas', { class: 'galaxy', 'aria-label': t('Galaxy') });
  const picked = nextUp(p, now);
  const collect = btn(
    h(
      'span',
      { class: 'stack' },
      h('b', null, pending ? t('Collect all ✨ {n}', { n: fmt(pending) }) : t('Collect all')),
      h(
        'small',
        null,
        pending
          ? full
            ? t('Vault full! Upgrade it to store more')
            : t('{n} stardust / hour', { n: fmt(rate) })
          : t('Ready at {time}', {
              time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
                new Date(p.lastCollect + (rate ? 3600000 / rate : 3600000)),
              ),
            }),
      ),
    ),
    `dust-btn${full ? ' full' : ''}`,
    () => {
      const rect = collect.getBoundingClientRect();
      const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const d = collectDust(p);
      if (d) {
        sfx.coin();
        haptic.success();
        toast(t('+{n} stardust', { n: fmt(d) }), 'good');
        app.save();
      }
      app.showHome(true);
      if (d) void flyReward(from, 'dust', d);
    },
  );
  collect.disabled = pending <= 0;
  const nextAction = () => {
    if (picked.action === 'missions') app.selectTab('missions');
    else if (picked.action === 'homeworld') app.selectTab('homeworld');
    else if (picked.action === 'collection') app.selectTab('collection');
    else if (picked.action === 'starmap') app.showStarMap();
    else if (picked.action === 'lifebook') app.showLifebook();
    else if (picked.action === 'passport') app.showPassport();
    else if (picked.action === 'styles') app.selectTab('styles');
    else if (picked.action === 'inbox') {
      app.selectTab('missions');
      app.inbox();
    } else if (picked.action === 'calendar') {
      app.selectTab('missions');
      app.daily();
    } else if (picked.action === 'album') app.showAlbum();
    else if (picked.action === 'sky') app.showSky();
    else if (picked.action === 'road') app.showRoad();
    else if (picked.action === 'voyage') app.showVoyage();
    else if (picked.action === 'event') app.events();
    else if (picked.action === 'festival') app.festival();
    else if (picked.action === 'modes') app.modes();
    else if (picked.action === 'upgrades') app.showUpgrades();
    else if (p.level <= 3) app.startLevel(p.level);
    else app.preLevel(p.level);
  };
  const modesOpen = (['daily', 'rush', 'zen', 'challenge'] as const).some((id) => unlocked(p, id));
  const el = h(
    'div',
    { class: 'screen home' },
    menuParticles(),
    app.topBar(false, true),
    h(
      'div',
      { class: 'home-body' },
      h('div', { class: 'title' }, h('span', null, 'Comet'), h('span', null, 'Garden')),
      h(
        'div',
        { class: 'galaxy-wrap' },
        canvas,
        p.galaxy.length ? null : h('div', { class: 'galaxy-empty' }, t('Your galaxy is empty.\nFinish planets to fill it!')),
        p.visitors.length
          ? btn(tp(p.visitors.length, '🛸 {n} visitor left gifts!', '🛸 {n} visitors left gifts!'), 'visit-chip', () => app.visitors())
          : null,
      ),
      p.galaxy.length ? h('div', { class: 'collect-row' }, collect) : null,
      btn(
        h('span', { class: 'stack' }, h('b', null, t('Next Up')), h('small', null, picked.title), h('small', null, picked.subtitle)),
        'ghost wide next-up-card',
        nextAction,
      ),
      btn(
        h(
          'span',
          { class: 'stack' },
          h('b', null, t('▶ PLAY  Planet {n}', { n: p.level })),
          h('small', null, `${t(ch.name)} · ${next.twist !== 'none' ? t(TWISTS[next.twist].name) : next.name}`),
        ),
        'primary big wide play',
        () => (p.level <= 3 ? app.startLevel(p.level) : app.preLevel(p.level)),
      ),
      modesOpen ? btn(t('More ways to play'), 'ghost wide more-play', () => app.modes()) : null,
    ),
  );
  const view = drawGalaxy(canvas, p.galaxy, {
    reduceMotion: effectiveReduceMotion(p),
    look: currentLook(p),
    onTap: (g) => {
      sfx.click();
      toast(`${g.name} · ${'★'.repeat(g.stars)} · ✨${planetRate(g)}/h`);
      app.showStarMap();
    },
  });
  app.mount(el, 'home', view.stop);
}
