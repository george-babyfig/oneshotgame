// Star Roads stay claimable after a new Road arrives.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { rewardText, type Reward } from '../../meta/progression';
import {
  COSMIC_ROAD_ID,
  ROAD_CATALOG,
  claimReachedPaidRoad,
  claimRoad,
  currentRoad,
  pastRoads,
  roadCap,
  roadCloseOn,
  roadHasPass,
  type RoadId,
} from '../../meta/starroad';
import type { App } from '../app';
import { getLang, t } from '../../i18n';
import { today } from '../../meta/profile';
import { COSMETIC_BY_ID, currentLook, type Look } from '../../meta/cosmetics';
import { itemCanvas } from '../art/keeper';
import { showPass } from './pass';

const roadName = (id: RoadId, name: string) => (id === COSMIC_ROAD_ID ? t('Cosmic Road') : t(name));

function cell(r: Reward, state: 'claimed' | 'ready' | 'locked', premium: boolean, look: Look) {
  const keeperSlot = r.item && ['suit', 'hat', 'launcher', 'trail', 'emote'].includes(COSMETIC_BY_ID[r.item]?.slot ?? '');
  return h(
    'div',
    { class: `rc ${state}${premium ? ' prem' : ''}${r.item ? ' has-item' : ''}` },
    keeperSlot && r.item ? itemCanvas(r.item, look, 44) : null,
    ...rewardText(r).map((text) => h('span', null, text)),
    state === 'claimed' ? h('i', { class: 'tick', 'aria-label': t('Claimed') }, '✓') : null,
    premium && state === 'locked' ? h('i', { class: 'lock', 'aria-label': t('Locked') }, '🔒') : null,
  );
}

export function showRoad(app: App, selectedId?: RoadId) {
  const p = app.p;
  const active = currentRoad(p);
  const def = ROAD_CATALOG.find((road) => road.id === selectedId) ?? active;
  // A restored Pass quietly catches up reached looks before the Road is drawn.
  if (claimReachedPaidRoad(p, def.id).length) app.save();
  const state = p.roadRecords[def.id];
  const points = state?.points ?? 0;
  const showPaidLane = roadHasPass(p, def.id) && !p.settings.hidePaidLooks;
  const look = currentLook(p);
  const nextTier = def.tiers.find((tier) => tier.stars > points);
  const past = pastRoads(p);
  const rows = def.tiers.map((tier, i) => {
    const reached = points >= tier.stars || !!state?.claimedFreeTierIds.includes(tier.id) || !!state?.claimedPaidTierIds.includes(tier.id);
    const free = state?.claimedFreeTierIds.includes(tier.id) ? 'claimed' : reached ? 'ready' : 'locked';
    const prem = !roadHasPass(p, def.id)
      ? 'locked'
      : state?.claimedPaidTierIds.includes(tier.id)
        ? 'claimed'
        : points >= tier.stars
          ? 'ready'
          : 'locked';
    const canClaim = free === 'ready' || prem === 'ready';
    return h(
      'div',
      { class: `rrow${reached ? ' reached' : ''}${showPaidLane ? '' : ' no-paid'}` },
      cell(tier.reward, free, false, look),
      h(
        'div',
        { class: 'rmid' },
        canClaim
          ? btn(t('Claim'), 'primary small', () => {
              const got = claimRoad(p, i, def.id);
              if (!got.length) return;
              sfx.chest();
              haptic.success();
              app.save();
              showRoad(app, def.id);
              const visibleGot = p.settings.hidePaidLooks ? got.filter((reward) => reward !== tier.pass) : got;
              if (!visibleGot.length) return;
              const sheet = modal([
                h('div', { class: 'm-title' }, t('{n} Road points reward', { n: tier.stars })),
                h('div', { class: 'reward-list' }, ...visibleGot.flatMap(rewardText).map((text) => h('span', null, text))),
                btn(t('Nice!'), 'primary wide', () => sheet.close()),
              ]);
            })
          : h('b', null, `🛣️${tier.stars}`),
      ),
      showPaidLane ? cell(tier.pass, prem, true, look) : null,
    );
  });
  const pct = nextTier ? Math.min(100, (points / nextTier.stars) * 100) : 100;
  const closeOn = roadCloseOn(def.id);
  const closeDate = closeOn ? new Date(`${closeOn}T12:00:00Z`) : undefined;
  const lastPlayable =
    past.some((road) => road.id === def.id) && closeDate
      ? new Intl.DateTimeFormat(getLang(), { day: 'numeric', month: 'long' }).format(closeDate)
      : undefined;
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, roadName(def.id, def.name)),
      h(
        'div',
        { class: 'progress' },
        h('i', { style: `width:${pct}%` }),
        h(
          'span',
          null,
          nextTier
            ? t('{n} Road points · next reward at {next}', { n: points, next: nextTier.stars })
            : t('{n} Road points · road complete!', { n: points }),
        ),
      ),
      h(
        'div',
        { class: 'scroll' },
        past.length
          ? h(
              'div',
              { class: 'road-picker' },
              btn(t('Current Road'), 'small', () => showRoad(app, active.id)),
              h('span', { class: 'muted' }, t('Past Roads')),
              ...past.map((road) => btn(roadName(road.id, road.name), 'small', () => showRoad(app, road.id))),
            )
          : null,
        lastPlayable
          ? h('p', { class: 'muted' }, t('This Road was here until {date}. You can still finish it.', { date: lastPlayable }))
          : null,
        h(
          'div',
          { class: `rhead${showPaidLane ? '' : ' no-paid'}` },
          h('span', null, t('Free')),
          h('span', null, ''),
          !showPaidLane ||
            def.id !== COSMIC_ROAD_ID ||
            !def.tiers.some((tier) => state?.claimedPaidTierIds.includes(tier.id) && (tier.pass.item || tier.pass.skin))
            ? null
            : btn(t('Your Cosmic Road looks'), 'small', () => showPass(app)),
        ),
        ...rows,
        h(
          'p',
          { class: 'muted' },
          t('Earn Road points from new stars and Wishes. Up to {n} a day.', {
            n: state ? roadCap({ ...state, plannedEndOn: closeOn }, today()) : 4,
          }),
        ),
        h('p', { class: 'muted' }, t('Road rewards stay here while you are away.')),
      ),
    ),
    'road',
  );
}
