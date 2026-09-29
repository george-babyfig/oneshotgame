import { h, btn } from '../dom';
import type { App } from '../app';
import { KINDS, type Kind } from '../../core/world';
import { projectileCanvas } from '../art/projectiles';
import { t } from '../../i18n';

export const FACTS: Record<Kind, { element: string; power: number; reach: number; job: string }> = {
  rock: { element: 'Earth', power: 2, reach: 1, job: 'Builds tall mountains' },
  ice: { element: 'Water', power: 2, reach: 1, job: 'Makes cool oceans' },
  seed: { element: 'Life', power: 2, reach: 1, job: 'Grows green life' },
  magma: { element: 'Fire', power: 2, reach: 1, job: 'Builds warm volcanoes' },
  storm: { element: 'Air', power: 1, reach: 3, job: 'Rains across lands' },
  sun: { element: 'Light', power: 1, reach: 3, job: 'Warms wide lands' },
};

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
        const fact = FACTS[kind.id];
        return h(
          'div',
          { class: 'guide-object' },
          projectileCanvas(kind.id, 64),
          h(
            'div',
            null,
            h('b', null, t(kind.name)),
            h('small', null, t(fact.element)),
            h('p', null, t(fact.job)),
            h('span', null, `${t('Power')} ${'●'.repeat(fact.power)}${'○'.repeat(3 - fact.power)}`),
            h('span', null, `${t('Reach')} ${'●'.repeat(fact.reach)}${'○'.repeat(3 - fact.reach)}`),
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
