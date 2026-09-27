// Lifebook: every creature (discovered or not) plus the recipe for every land.
import { h, modal } from '../dom';
import { sfx } from '../audio';
import { SPECIES, BIOMES, type Rarity, type SpeciesDef } from '../../core/world';
import { GEMS_PER_NEW_SPECIES } from '../../meta/config';
import type { App } from '../app';

const ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
const LABEL: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

function card(s: SpeciesDef, got: boolean) {
  modal([
    h('div', { class: `lb-big r-${s.rarity}${got ? '' : ' locked'}` }, got ? s.emoji : '?'),
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
            h('div', { class: 'lbe' }, got ? s.emoji : '?'),
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
        h('div', { class: 'sec-title' }, 'How to make each land'),
        biomes,
      ),
    ),
    'lifebook',
  );
}
