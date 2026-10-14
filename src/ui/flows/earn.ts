import { btn, h, modal } from '../dom';
import type { Profile } from '../../meta/profile';
import { unlocked } from '../../meta/unlocks';
import { t } from '../../i18n';

export function waysToEarnGems(p: Profile) {
  const m = modal([
    h('div', { class: 'm-title' }, t('Ways to earn gems')),
    h('p', { class: 'muted' }, t('Play and explore to find gems:')),
    h(
      'ul',
      { class: 'offer-list' },
      h('li', null, t('Meet new creatures.')),
      unlocked(p, 'star_calendar') ? h('li', null, t('Visit the Star Calendar.')) : null,
      unlocked(p, 'quests') ? h('li', null, t('Help your friends with Wishes.')) : null,
      unlocked(p, 'voyage') ? h('li', null, t('Explore the Weekly Voyage.')) : null,
      unlocked(p, 'festival') ? h('li', null, t('Join festivals.')) : null,
      h('li', null, t('Open chapter chests.')),
      h('li', null, t('Clear Comet Guardian planets.')),
    ),
    btn(t('Got it!'), 'primary wide', () => m.close()),
  ]);
  return m;
}
