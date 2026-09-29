import { h, btn } from '../dom';
import type { App } from '../app';
import { t } from '../../i18n';
import { unlocked } from '../../meta/unlocks';
import { roadReady, chestsReady } from '../../meta/progression';
import { today } from '../../meta/profile';
import { canStamp } from '../../meta/calendar';
import { letterOf } from '../../meta/inbox';
import { wishesPanel } from '../flows/wishes';
import { eventReady } from '../../meta/events';
import { festivalReady } from '../../meta/festivals';

export function showMissions(app: App) {
  const p = app.p;
  const open = unlocked(p, 'quests');
  const entry = (label: string, ready: number, action: () => void, enabled = true, reason = '') => {
    const button = btn(
      h('span', null, label, ready ? h('span', { class: 'nb' }, String(ready)) : null),
      'ghost wide mission-entry',
      action,
    );
    button.disabled = !enabled;
    if (!enabled && reason) button.append(h('small', { class: 'muted' }, reason));
    return button;
  };
  app.mount(
    h(
      'div',
      { class: 'screen page tab-page' },
      app.topBar(),
      h('div', { class: 'page-title' }, t('Missions')),
      h(
        'div',
        { class: 'scroll' },
        open ? wishesPanel(app) : h('p', { class: 'locked-note' }, t('Opens at planet {n}', { n: 12 })),
        open ? entry(t('Star Road'), roadReady(p).length, () => app.showRoad()) : null,
        open && chestsReady(p).length ? entry(t('Star Map'), chestsReady(p).length, () => app.showStarMap()) : null,
        open
          ? entry(
              t('Star Calendar'),
              canStamp(p, today()) && unlocked(p, 'star_calendar') ? 1 : 0,
              () => app.daily(),
              unlocked(p, 'star_calendar'),
              t('Opens at planet {n}', { n: 21 }),
            )
          : null,
        open ? entry(t('Inbox'), p.mail.filter((mail) => !mail.claimed && !!letterOf(mail)?.gift).length, () => app.inbox()) : null,
        open && unlocked(p, 'voyage') ? entry(t('Weekly Voyage'), 0, () => app.showVoyage()) : null,
        open && unlocked(p, 'weekly_event') ? entry(t('Event'), eventReady(p).length, () => app.events()) : null,
        open && unlocked(p, 'festival') ? entry(t('Festival'), festivalReady(p).length, () => app.festival()) : null,
      ),
    ),
    'missions',
  );
}
