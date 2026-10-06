// Play: one clear next step beside the galaxy.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { levelMeta, TWISTS } from '../../core/levels';
import {
  buyVaultTier,
  collectDust,
  pendingDust,
  vaultHours,
  vaultRate,
  vaultTier,
  VAULT_RATES,
  VAULT_STORAGE_HOURS,
  VAULT_UPGRADE_COSTS,
} from '../../meta/economy';
import { chapterOf } from '../../meta/progression';
import { drawGalaxy } from '../art/galaxy';
import { effectiveReduceMotion, flyReward, menuParticles } from '../motion';
import type { App } from '../app';
import { planetName, t, tp } from '../../i18n';
import { unlocked } from '../../meta/unlocks';
import { nextUp } from '../../meta/nextup';
import { STYLES_RELEASE } from '../../meta/cosmetics';
import { currentLook } from '../../meta/cosmetics';
import { refundQuietUntil } from '../../meta/economy';

export function showHome(app: App) {
  const p = app.p;
  document.documentElement.classList.toggle('styles-new', p.stylesNewSeen !== STYLES_RELEASE && refundQuietUntil(p) <= Date.now());
  const now = Date.now();
  const next = levelMeta(p.level);
  const ch = chapterOf(p.level);
  const pending = pendingDust(p, now);
  const rate = vaultRate(p);
  const cap = Math.floor(rate * vaultHours(p));
  const full = cap > 0 && pending >= cap;
  const working = rate > 0 && p.vault.bankedProductionMs > Math.max(0, now - Math.max(p.vault.lastTick, p.lastCollect));
  const canvas = h('canvas', { class: 'galaxy', 'aria-label': t('Galaxy') });
  const picked = nextUp(p, now);
  const collect = btn(
    h(
      'span',
      { class: 'stack' },
      h('b', null, t('Vault · ✨ {stored}/{cap}', { stored: fmt(pending), cap: fmt(cap) })),
      h(
        'small',
        null,
        full ? t('Vault full') : !working ? t('Win a campaign planet to start your Vault') : t('Working: ✨ {n} an hour', { n: fmt(rate) }),
      ),
    ),
    `dust-btn${full ? ' full' : ''}`,
    () => {
      const tier = vaultTier(p);
      const m = modal(
        [
          h('div', { class: 'm-title' }, t('Vault level {n}', { n: tier })),
          h('p', null, t('Stored: ✨ {stored}/{cap}', { stored: fmt(pendingDust(p)), cap: fmt(Math.floor(vaultRate(p) * vaultHours(p))) })),
          h('p', { class: 'muted' }, t('Wins keep the Vault working. One campaign win adds two hours.')),
          pendingDust(p) > 0
            ? btn(t('Collect ✨ {n}', { n: fmt(pendingDust(p)) }), 'primary wide', () => {
                const rect = collect.getBoundingClientRect();
                const d = collectDust(p);
                if (d) {
                  sfx.coin();
                  haptic.success();
                  app.save();
                  toast(t('+{n} stardust', { n: fmt(d) }), 'good');
                  void flyReward({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 'dust', d);
                }
                m.close();
                app.showHome(true);
              })
            : h('p', { class: 'muted' }, t('Nothing to collect yet. Campaign wins keep your Vault working.')),
          tier < 5
            ? h(
                'div',
                null,
                h(
                  'p',
                  { class: 'muted' },
                  t('Next level: up to ✨{rate} an hour, holds {hours} hours', {
                    rate: fmt(VAULT_RATES.at(tier) ?? VAULT_RATES[4]),
                    hours: VAULT_STORAGE_HOURS.at(tier) ?? VAULT_STORAGE_HOURS[4],
                  }),
                ),
                btn(t('Upgrade Vault · ✨ {n}', { n: fmt(VAULT_UPGRADE_COSTS[tier - 1]) }), 'ghost wide', () => {
                  if (!buyVaultTier(p)) return toast(t('Not enough stardust'));
                  sfx.levelUp();
                  haptic.success();
                  app.save();
                  m.close();
                  app.showHome(true);
                }),
              )
            : h('p', { class: 'muted' }, t('Vault fully grown')),
        ],
        { cls: 'vault-sheet' },
      );
    },
  );
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
    else if (picked.action === 'festival') app.festival();
    else if (picked.action === 'modes') app.modes();
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
          h('small', null, `${t(ch.name)} · ${next.twist !== 'none' ? t(TWISTS[next.twist].name) : planetName(next.name)}`),
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
      toast(t('{name} · {stars} · Campaign wins keep your Vault working.', { name: planetName(g.name), stars: '★'.repeat(g.stars) }));
      app.showStarMap();
    },
  });
  app.mount(el, 'home', view.stop);
}
