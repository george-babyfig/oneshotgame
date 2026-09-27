// Lifebook: every creature (discovered or not) plus the recipe for every land.
import { h, modal } from '../dom';
import { sfx } from '../audio';
import { SPECIES, BIOMES, type Rarity, type SpeciesDef } from '../../core/world';
import { GEMS_PER_NEW_SPECIES } from '../../meta/config';
import type { App } from '../app';
import { btn, toast } from '../dom';
import { HABITATS, habitatProgress } from '../../meta/habitats';
import { applyReward, rewardText } from '../../meta/progression';
import { critterCanvas } from '../art/critters';
import { mementoName } from '../../meta/visitors';

const ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
const LABEL: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

function card(s: SpeciesDef, got: boolean) {
  modal([
    h('div', { class: `lb-big r-${s.rarity}${got ? '' : ' locked'}` }, critterCanvas(s.id, 120)),
    h('div', { class: 'm-sub' }, LABEL[s.rarity]),
    h('div', { class: 'm-title' }, got ? s.name : 'Undiscovered'),
    h('p', { class: 'muted' }, `Lives: ${s.hint}`),
  ]);
}

export function showLifebook(app: App) {
  const seen = new Set(app.p.seen);
  const sections = ORDER.map((r) => {
    const list = SPECIES.filter((s) => s.rarity === r);
    const have = list.filter((s) => seen.has(s.id)).length;
    return h(
      'div',
      { class: 'lb-sec' },
      h('div', { class: 'sec-title' }, `${LABEL[r]} `, h('small', { class: 'muted' }, `${have}/${list.length}`)),
      h(
        'div',
        { class: 'lb-grid' },
        ...list.map((s) => {
          const got = seen.has(s.id);
          return h(
            'button',
            { class: `lb r-${r}${got ? '' : ' locked'}`, onclick: () => (sfx.click(), card(s, got)) },
            h('div', { class: 'lbe' }, critterCanvas(s.id, 56)),
            h('div', { class: 'lbn' }, got ? s.name : '???'),
            h('div', { class: 'lbh' }, s.hint),
          );
        }),
      ),
    );
  });
  const biomes = h(
    'div',
    { class: 'biome-list' },
    ...Object.values(BIOMES)
      .filter((b) => b.id !== 'barren')
      .map((b) =>
        h('div', { class: 'bchip', style: `--c:${b.color}` }, h('b', null, `${b.deco} ${b.name}`), h('small', null, b.recipe ?? '')),
      ),
  );
  const pct = Math.round((seen.size / SPECIES.length) * 100);
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, `Lifebook`),
      h(
        'div',
        { class: 'progress' },
        h('i', { style: `width:${pct}%` }),
        h('span', null, `${seen.size}/${SPECIES.length} creatures · ${pct}%`),
      ),
      h(
        'div',
        { class: 'scroll' },
        h('p', { class: 'muted' }, `Each new creature gives 💎${GEMS_PER_NEW_SPECIES}. Tap a card for its hint.`),
        ...sections,
        h('div', { class: 'sec-title' }, 'Habitat sets'),
        h(
          'div',
          { class: 'hab-grid' },
          ...HABITATS.map((hb) => {
            const have = habitatProgress(app.p, hb);
            const done = app.p.habitats.includes(hb.id);
            const ready = !done && have === hb.species.length;
            return h(
              'div',
              { class: `hab${done ? ' done' : ''}` },
              h('div', { class: 'hab-ic' }, hb.emoji),
              h(
                'div',
                { class: 'hab-body' },
                h('b', null, hb.name),
                h('span', { class: 'hab-n' }, `${have}/${hb.species.length}`),
                h('div', { class: 'qbar' }, h('i', { style: `width:${(have / hb.species.length) * 100}%` })),
                h('small', null, done ? 'Complete ✓' : rewardText(hb.reward).join(' ')),
              ),
              ready
                ? btn('Claim', 'primary small', () => {
                    app.p.habitats.push(hb.id);
                    applyReward(app.p, hb.reward);
                    app.save();
                    sfx.chest();
                    toast(`${hb.name} complete! ${rewardText(hb.reward).join(' ')}`, 'good');
                    showLifebook(app);
                  })
                : null,
            );
          }),
        ),
        h('div', { class: 'sec-title' }, `Mementos ${app.p.mementos.length}/${SPECIES.length}`),
        app.p.mementos.length
          ? h('div', { class: 'memento-grid' }, ...app.p.mementos.map((id) => h('div', null, `🎀 ${mementoName(id)}`)))
          : h('p', { class: 'muted' }, 'Creatures sometimes leave keepsakes when they visit your galaxy while you are away.'),
        h('div', { class: 'sec-title' }, 'How to make each land'),
        biomes,
      ),
    ),
    'lifebook',
  );
}
