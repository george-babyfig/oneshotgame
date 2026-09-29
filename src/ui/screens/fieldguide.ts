import { h, btn } from '../dom';
import type { App } from '../app';
import { KINDS, type Kind } from '../../core/world';
import { projectileCanvas } from '../art/projectiles';
import { t } from '../../i18n';

// The i18n inventory reads these data strings until its key list moves to KindDef.
export const FACTS = Object.fromEntries(Object.values(KINDS).map((kind) => [kind.id, kind.stats])) as Record<
  Kind,
  (typeof KINDS)[Kind]['stats']
>;

const ELEMENT_ICON: Record<(typeof KINDS)[Kind]['stats']['element'], string> = {
  earth: '⛰️',
  water: '💧',
  life: '🌱',
  fire: '🔥',
  air: '☁️',
  light: '☀️',
};

function statBar(label: string, icon: string, value: number) {
  return h(
    'div',
    { class: 'guide-stat', 'aria-label': t('{stat} {value} of 3', { stat: label, value }) },
    h('span', { class: 'guide-stat-label' }, icon, ' ', label),
    h('span', { class: 'guide-stat-pips', 'aria-hidden': 'true' }, ...[0, 1, 2].map((i) => h('i', { class: i < value ? 'filled' : '' }))),
  );
}

export function showFieldGuide(app: App, page: 'basics' | 'objects' | 'creatures' = 'basics') {
  const pageLabel = (id: 'basics' | 'objects' | 'creatures') =>
    id === 'basics' ? t('Basics') : id === 'objects' ? t('Objects') : t('Creatures');
  const pages = h(
    'div',
    { class: 'guide-tabs' },
    ...(['basics', 'objects', 'creatures'] as const).map((id) =>
      btn(pageLabel(id), `ghost${id === page ? ' on' : ''}`, () => showFieldGuide(app, id)),
    ),
  );
  const basics = h(
    'div',
    { class: 'howto' },
    h('p', null, t('👆 Pull back anywhere and let go to fling. Gravity bends your shot — watch the dotted line.')),
    h('p', null, t('🪨 Rock raises land · ☄️ Ice makes oceans · 🌱 Seeds grow life · 🔥 Magma heats & builds volcanoes')),
    h('p', null, t('🦌 Creatures appear when the right lands meet — a Forest next to an Ocean brings Otters!')),
    h('p', null, t('★ Reach the life target before your throws run out. Tap the small bubble to swap objects.')),
    h('p', null, t('✨ Finished planets orbit your galaxy and make stardust, even while you are away.')),
  );
  const objects = h(
    'div',
    { class: 'guide-objects' },
    ...Object.values(KINDS)
      .filter((kind) => kind.unlock <= app.p.level)
      .map((kind) => {
        const { stats } = kind;
        return h(
          'div',
          { class: 'guide-object' },
          projectileCanvas(kind.id, 64),
          h(
            'div',
            null,
            h('b', null, t(kind.name)),
            h('small', { class: 'guide-element' }, ELEMENT_ICON[stats.element], ' ', t(stats.element)),
            h('p', null, t(stats.job)),
            statBar(t('Power'), '✦', stats.power),
            statBar(t('Reach'), '◎', stats.reach),
          ),
        );
      }),
  );
  app.mount(
    h(
      'div',
      { class: 'screen page guide-page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Field Guide')),
      pages,
      h(
        'div',
        { class: 'scroll' },
        page === 'basics' ? basics : page === 'objects' ? objects : btn(t('Open Lifebook'), 'primary wide', () => app.showLifebook()),
      ),
    ),
    'fieldguide',
  );
}
