// Gifts from visiting creatures appear together on one card.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { SPECIES_BY_ID } from '../../core/world';
import { openVisitor, mementoName } from '../../meta/visitors';
import { critterCanvas } from '../art/critters';
import type { App } from '../app';
import { t } from '../../i18n';

export function visitorsFlow(app: App) {
  const p = app.p;
  if (!p.visitors.length) return;
  const gifts = [...p.visitors];
  const groups = new Map<string, { species: string; count: number; dust: number; mementos: string[] }>();
  for (const gift of gifts) {
    const group = groups.get(gift.species) ?? { species: gift.species, count: 0, dust: 0, mementos: [] };
    group.count++;
    group.dust += gift.dust;
    if (gift.memento) group.mementos.push(gift.memento);
    groups.set(gift.species, group);
  }
  const m = modal(
    [
      h('div', { class: 'm-sub' }, t('While you were away…')),
      h(
        'div',
        { class: 'visit' },
        ...[...groups.values()].map((v) =>
          h(
            'div',
            { class: `visit-row${v.mementos.length ? ' has-memento' : ''}` },
            critterCanvas(v.species, 36),
            h(
              'div',
              { class: 'visit-name' },
              h('b', null, t(SPECIES_BY_ID[v.species]?.name ?? 'A visitor'), v.count > 1 ? ` ${t('×{n}', { n: v.count })}` : ''),
              ...v.mementos.map((id) => h('small', { class: 'visit-memento' }, `🎀 ${t('Memento')}: ${mementoName(id)}`)),
            ),
            h('span', { class: 'visit-reward' }, `✨ ${fmt(v.dust)}`),
          ),
        ),
      ),
      btn(t('Collect all'), 'primary wide', () => {
        for (const _ of gifts) openVisitor(p);
        sfx.creature(gifts.some((v) => !!v.memento));
        haptic.success();
        app.save();
        m.close();
        app.refresh();
      }),
    ],
    { dismiss: false, cls: 'visitors' },
  );
}
