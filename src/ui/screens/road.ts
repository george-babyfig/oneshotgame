// Star Road: rewards unlocked by total stars, with a Cosmic Pass lane.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { totalStars } from '../../meta/profile';
import { STAR_ROAD, PASS_GEMS, claimRoad, rewardText, type Reward } from '../../meta/progression';
import type { App } from '../app';
import { t } from '../../i18n';

function cell(r: Reward, state: 'claimed' | 'ready' | 'locked', premium: boolean) {
  return h(
    'div',
    { class: `rc ${state}${premium ? ' prem' : ''}` },
    ...rewardText(r).map((x) => h('span', null, x)),
    state === 'claimed' ? h('i', { class: 'tick' }, '✓') : null,
    premium && state === 'locked' ? h('i', { class: 'lock' }, '🔒') : null,
  );
}

export function showRoad(app: App) {
  const p = app.p;
  const stars = totalStars(p);
  const nextTier = STAR_ROAD.find((tier) => tier.stars > stars);
  const rows = STAR_ROAD.map((tier, i) => {
    const reached = stars >= tier.stars;
    const free = p.road.includes(i) ? 'claimed' : reached ? 'ready' : 'locked';
    const prem = p.roadPass.includes(i) ? 'claimed' : reached && p.pass ? 'ready' : 'locked';
    const canClaim = free === 'ready' || prem === 'ready';
    return h(
      'div',
      { class: `rrow${reached ? ' reached' : ''}` },
      cell(tier.reward, free, false),
      h(
        'div',
        { class: 'rmid' },
        canClaim
          ? btn(t('Claim'), 'primary small', () => {
              const got = claimRoad(p, i, stars);
              if (!got.length) return;
              sfx.chest();
              haptic.success();
              app.save();
              const m = modal([
                h('div', { class: 'm-title' }, t('{n}★ reward', { n: tier.stars })),
                h('div', { class: 'reward-list' }, ...got.flatMap(rewardText).map((x) => h('span', null, x))),
                btn(t('Nice!'), 'primary wide', () => (m.close(), showRoad(app))),
              ]);
            })
          : h('b', null, `${tier.stars}★`),
      ),
      cell(tier.pass, prem, true),
    );
  });
  const pitch = p.pass
    ? h('div', { class: 'pass-owned' }, t('🌌 Cosmic Pass active — you get both lanes!'))
    : h(
        'div',
        { class: 'offer pass' },
        h('div', { class: 'offer-t' }, t('🌌 Cosmic Pass')),
        h(
          'p',
          null,
          t(
            'Unlock the golden lane forever: {n} gems, the Cosmic atmosphere, stardust and boosters. Tiers you already reached pay out instantly.',
            { n: PASS_GEMS.toLocaleString('en-US') },
          ),
        ),
        btn(app.priceOf('pass'), 'buy-real wide', () => app.buy('pass')),
      );
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
          nextTier ? t('{n}★ · next reward at {next}★', { n: stars, next: nextTier.stars }) : t('{n}★ · road complete!', { n: stars }),
        ),
      ),
      h(
        'div',
        { class: 'scroll' },
        pitch,
        h('div', { class: 'rhead' }, h('span', null, t('Free')), h('span', null, ''), h('span', { class: 'gold' }, t('Cosmic Pass'))),
        ...rows,
        h('p', { class: 'muted' }, t('Earn stars by finishing planets. Replay old planets for 3★ to climb faster.')),
      ),
    ),
    'road',
  );
}
