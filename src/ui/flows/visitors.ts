// Reveal the gifts visiting creatures left while you were away, one at a time.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { SPECIES_BY_ID } from '../../core/world';
import { openVisitor, mementoName } from '../../meta/visitors';
import type { App } from '../app';

export function visitorsFlow(app: App) {
  const p = app.p;
  if (!p.visitors.length) return;
  const stage = h('div', { class: 'visit' });
  let total = { dust: 0, gems: 0 };
  let m: ReturnType<typeof modal>;
  const next = () => {
    const v = openVisitor(p);
    app.save();
    if (!v) {
      m.close();
      app.refresh();
      return;
    }
    total = { dust: total.dust + v.dust, gems: total.gems + v.gems };
    const sp = SPECIES_BY_ID[v.species];
    sfx.creature(!!v.memento);
    haptic.success();
    const kids = [
      h('div', { class: 'visit-emoji' }, sp?.emoji ?? '✨'),
      h('div', { class: 'm-title' }, `${sp?.name ?? 'A visitor'} dropped by!`),
      h('div', { class: 'reward-list' }, h('span', null, `✨ ${fmt(v.dust)}`), v.gems ? h('span', null, `💎 ${v.gems}`) : null),
      v.memento ? h('div', { class: 'memento' }, h('small', null, 'Memento'), h('b', null, `🎀 ${mementoName(v.memento)}`)) : null,
      btn(p.visitors.length ? `Next visitor (${p.visitors.length})` : 'Lovely!', 'primary wide', next),
    ];
    stage.replaceChildren(...kids.filter((k) => k !== null));
  };
  m = modal([h('div', { class: 'm-sub' }, 'While you were away…'), stage], { dismiss: false, cls: 'visitors' });
  next();
}
