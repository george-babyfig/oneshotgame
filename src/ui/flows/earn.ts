import { btn, h, modal } from '../dom';
import { t } from '../../i18n';

export function waysToEarnGems() {
  const m = modal([
    h('div', { class: 'm-title' }, t('Ways to earn gems')),
    h('p', { class: 'muted' }, t('Play and explore to find gems:')),
    h(
      'ul',
      { class: 'offer-list' },
      h('li', null, t('Meet new creatures.')),
      h('li', null, t('Visit the Star Calendar.')),
      h('li', null, t('Help your friends with Wishes.')),
      h('li', null, t('Explore the Weekly Voyage.')),
      h('li', null, t('Join festivals.')),
      h('li', null, t('Open chapter chests.')),
      h('li', null, t('Clear Comet Guardian planets.')),
    ),
    btn(t('Got it!'), 'primary wide', () => m.close()),
  ]);
  return m;
}
