import { h, btn } from '../dom';
import type { App } from '../app';
import { t } from '../../i18n';
import { unlocked } from '../../meta/unlocks';

export function showCollection(app: App) {
  const entry = (label: string, action: () => void, enabled = true, reason = '') => {
    const button = btn(label, 'ghost wide', action);
    button.disabled = !enabled;
    if (!enabled && reason) button.append(h('small', { class: 'muted' }, reason));
    return button;
  };
  app.mount(
    h(
      'div',
      { class: 'screen page tab-page' },
      app.topBar(),
      h('div', { class: 'page-title' }, t('Collection')),
      h(
        'div',
        { class: 'scroll' },
        entry(t('Lifebook'), () => app.showLifebook(), unlocked(app.p, 'lifebook'), t('Opens at planet {n}', { n: 3 })),
        entry(t('Sticker Album'), () => app.showAlbum(), unlocked(app.p, 'sticker_album'), t('Opens at planet {n}', { n: 13 })),
        entry(t('Star Atlas'), () => app.showSky(), unlocked(app.p, 'star_atlas'), t('Opens at planet {n}', { n: 23 })),
        entry(t('Field Guide'), () => app.showFieldGuide()),
      ),
    ),
    'collection',
  );
}
