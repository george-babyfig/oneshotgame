import { h, btn, modal } from '../dom';
import { t } from '../../i18n';
import { COSMIC_ROAD_ID, roadHasPass, STAR_ROAD } from '../../meta/starroad';
import { rewardText } from '../../meta/progression';
import type { App } from '../app';

/** Owners can revisit looks they have earned; this view never previews a sale. */
export function showPass(app: App): void {
  if (app.p.settings.hidePaidLooks || !roadHasPass(app.p, COSMIC_ROAD_ID)) return;
  const claimed = app.p.roadRecords[COSMIC_ROAD_ID]?.claimedPaidTierIds ?? [];
  const looks = STAR_ROAD.filter((tier) => claimed.includes(tier.id) && (tier.pass.item || tier.pass.skin));
  if (!looks.length) return;
  const sheet = modal([
    h('div', { class: 'm-title' }, t('Your Cosmic Road looks')),
    ...looks.map((tier) => h('div', { class: 'reward-list' }, h('span', null, `${tier.stars} · ${rewardText(tier.pass).join(' · ')}`))),
    btn(t('Done'), 'primary wide', () => sheet.close()),
  ]);
}
