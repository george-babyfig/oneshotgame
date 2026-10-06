// Star Road: rewards unlocked by capped Road points, with a Cosmic Pass lane.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { rewardText, type Reward } from '../../meta/progression';
import { STAR_ROAD, claimRoad } from '../../meta/starroad';
import type { App } from '../app';
import { t } from '../../i18n';
import { currentLook, type Look } from '../../meta/cosmetics';
import { itemCanvas } from '../art/keeper';

function cell(r: Reward, state: 'claimed' | 'ready' | 'locked', premium: boolean, look: Look) {
  return h(
    'div',
    { class: `rc ${state}${premium ? ' prem' : ''}${r.item ? ' has-item' : ''}` },
    r.item ? itemCanvas(r.item, look, 44) : null,
    ...rewardText(r).map((x) => h('span', null, x)),
    state === 'claimed' ? h('i', { class: 'tick' }, '✓') : null,
    premium && state === 'locked' ? h('i', { class: 'lock' }, '🔒') : null,
  );
}

export function showRoad(app: App) {
  const p = app.p;
  const stars = p.roadPoints;
  const look = currentLook(p);
  const nextTier = STAR_ROAD.find((tier) => tier.stars > stars);
  const rows = STAR_ROAD.map((tier, i) => {
    const reached = stars >= tier.stars;
    const free = p.road.includes(i) ? 'claimed' : reached ? 'ready' : 'locked';
    const prem = p.roadPass.includes(i) ? 'claimed' : reached && p.pass ? 'ready' : 'locked';
    const canClaim = free === 'ready' || prem === 'ready';
    return h(
      'div',
      { class: `rrow${reached ? ' reached' : ''}${p.settings.hidePaidLooks ? ' no-paid' : ''}` },
      cell(tier.reward, free, false, look),
      h(
        'div',
        { class: 'rmid' },
        canClaim
          ? btn(t('Claim'), 'primary small', () => {
              const got = claimRoad(p, i);
              if (!got.length) return;
              sfx.chest();
              haptic.success();
              app.save();
              showRoad(app);
              const visibleGot = p.settings.hidePaidLooks ? got.filter((reward) => reward !== tier.pass) : got;
              if (!visibleGot.length) return;
              const m = modal([
                h('div', { class: 'm-title' }, t('{n} Road points reward', { n: tier.stars })),
                h('div', { class: 'reward-list' }, ...visibleGot.flatMap(rewardText).map((x) => h('span', null, x))),
                btn(t('Nice!'), 'primary wide', () => m.close()),
              ]);
            })
          : h('b', null, `🛣️${tier.stars}`),
      ),
      p.settings.hidePaidLooks ? null : cell(tier.pass, prem, true, look),
    );
  });
  const pct = nextTier ? Math.min(100, (stars / nextTier.stars) * 100) : 100;
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Star Road')),
      h(
        'div',
        { class: 'progress' },
        h('i', { style: `width:${pct}%` }),
        h(
          'span',
          null,
          nextTier
            ? t('{n} Road points · next reward at {next}', { n: stars, next: nextTier.stars })
            : t('{n} Road points · road complete!', { n: stars }),
        ),
      ),
      h(
        'div',
        { class: 'scroll' },
        h(
          'div',
          { class: `rhead${p.settings.hidePaidLooks ? ' no-paid' : ''}` },
          h('span', null, t('Free')),
          h('span', null, ''),
          p.settings.hidePaidLooks ? null : h('span', { class: 'gold' }, t('Golden lane')),
        ),
        ...rows,
        h('p', { class: 'muted' }, t('Earn Road points from new stars and Wishes. Up to four a day.')),
      ),
    ),
    'road',
  );
}
