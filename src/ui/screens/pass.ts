import { h, btn, modal } from '../dom';
import { t } from '../../i18n';
import { COSMIC_ROAD_ID, playableRoads, roadHasPass, type RoadId } from '../../meta/starroad';
import { rewardText } from '../../meta/progression';
import type { App } from '../app';

/** Owners can revisit looks they have earned; this view never previews a sale. */
export function showPass(app: App, roadId: RoadId = COSMIC_ROAD_ID): void {
  const road = playableRoads(app.p).find((road) => road.id === roadId);
  if (!road) return;
  if (app.p.settings.hidePaidLooks || !roadHasPass(app.p, roadId)) return;
  const claimed = app.p.roadRecords[roadId]?.claimedPaidTierIds ?? [];
  const looks = road.tiers.filter((tier) => claimed.includes(tier.id) && (tier.pass.item || tier.pass.skin));
  if (!looks.length) return;
  const sheet = modal([
    h('div', { class: 'm-title' }, t('Your {road} looks', { road: t(road.name) })),
    ...looks.map((tier) => h('div', { class: 'reward-list' }, h('span', null, `${tier.stars} · ${rewardText(tier.pass).join(' · ')}`))),
    btn(t('Done'), 'primary wide', () => sheet.close()),
  ]);
}
