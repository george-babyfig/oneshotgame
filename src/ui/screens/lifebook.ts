// Lifebook: every creature (discovered or not) plus the recipe for every land.
import { h, modal } from '../dom';
import { sfx } from '../audio';
import { SPECIES, BIOMES, type Rarity, type SpeciesDef } from '../../core/world';
import { GEMS_PER_NEW_SPECIES } from '../../meta/config';
import type { App } from '../app';
import { btn, toast } from '../dom';
import { HABITATS, habitatProgress } from '../../meta/habitats';
import { rewardText } from '../../meta/progression';
import { animateCreatureGallery, critterCanvas, type CreatureCanvas, type CreaturePose } from '../art/critters';
import { mementoName } from '../../meta/visitors';
import { t, tp } from '../../i18n';
import { rarityName, speciesHint } from '../text';
import { claimHabitat } from '../../meta/habitats';
import { LORE, LORE_AT, STUDIED_AT, loreUnlocked, sightings, studied } from '../../meta/lore';
import type { Profile } from '../../meta/profile';
import { STICKERS, albumReady, ownedStickers } from '../../meta/stickers';
import { icon } from '../icons';
import { effectiveReduceMotion } from '../motion';

const ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

function card(p: Profile, s: SpeciesDef, got: boolean) {
  const n = sightings(p, s.id);
  const portrait = critterCanvas(s.id, 120);
  let pose: CreaturePose = 'idle';
  let stop = () => {};
  const wave = () => {
    pose = 'wave';
    window.setTimeout(() => (pose = 'idle'), 750);
  };
  modal(
    [
      h('div', { class: `lb-big r-${s.rarity}${got ? '' : ' locked'}${studied(p, s.id) ? ' studied' : ''}`, onclick: wave }, portrait),
      h('div', { class: 'm-sub' }, rarityName(s.rarity)),
      h('div', { class: 'm-title' }, got ? t(s.name) : t('Undiscovered')),
      h('p', { class: 'muted' }, t('Lives: {hint}', { hint: speciesHint(s) })),
      got
        ? h(
            'div',
            { class: 'lore' },
            h('small', null, tp(n, '📓 Field notes · seen {n} time', '📓 Field notes · seen {n} times')),
            loreUnlocked(p, s.id)
              ? h('p', null, t(LORE[s.id] ?? ''))
              : h(
                  'p',
                  { class: 'muted' },
                  tp(LORE_AT - n, 'See it {n} more time to unlock its story.', 'See it {n} more times to unlock its story.'),
                ),
            studied(p, s.id)
              ? h('b', { class: 'studied-tag' }, t('✦ Studied'))
              : n >= LORE_AT
                ? h(
                    'small',
                    { class: 'muted' },
                    tp(STUDIED_AT - n, '{n} more sighting for a gold frame', '{n} more sightings for a gold frame'),
                  )
                : null,
          )
        : null,
    ],
    { onClose: () => stop() },
  );
  stop = animateCreatureGallery([{ canvas: portrait, id: s.id, pose: () => pose }], effectiveReduceMotion(p));
}

export function showLifebook(app: App) {
  const seen = new Set(app.p.seen);
  const portraits: CreatureCanvas[] = [];
  const sections = ORDER.map((r) => {
    const list = SPECIES.filter((s) => s.rarity === r);
    const have = list.filter((s) => seen.has(s.id)).length;
    return h(
      'div',
      { class: 'lb-sec' },
      h('div', { class: 'sec-title' }, `${rarityName(r)} `, h('small', { class: 'muted' }, `${have}/${list.length}`)),
      h(
        'div',
        { class: 'lb-grid' },
        ...list.map((s) => {
          const got = seen.has(s.id);
          const portrait = critterCanvas(s.id, 56);
          portraits.push({ canvas: portrait, id: s.id });
          return h(
            'button',
            {
              class: `lb r-${r}${got ? '' : ' locked'}${studied(app.p, s.id) ? ' studied' : ''}`,
              onclick: () => (sfx.click(), card(app.p, s, got)),
            },
            h('div', { class: 'lbe' }, portrait),
            h('div', { class: 'lbn' }, got ? t(s.name) : '???'),
            h('div', { class: 'lbh' }, speciesHint(s)),
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
        h('div', { class: 'bchip', style: `--c:${b.color}` }, h('b', null, `${b.deco} ${t(b.name)}`), h('small', null, t(b.recipe ?? ''))),
      ),
  );
  const pct = Math.round((seen.size / SPECIES.length) * 100);
  let stop = () => {};
  app.mount(
    h(
      'div',
      { class: 'screen page' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Lifebook')),
      h(
        'div',
        { class: 'progress' },
        h('i', { style: `width:${pct}%` }),
        h('span', null, t('{have}/{total} creatures · {pct}%', { have: seen.size, total: SPECIES.length, pct })),
      ),
      h(
        'div',
        { class: 'scroll' },
        h(
          'button',
          { class: 'album-link', onclick: () => (sfx.click(), app.showAlbum()) },
          icon('album', 40),
          h(
            'span',
            { class: 'stack' },
            h('b', null, t('Sticker Album')),
            h(
              'small',
              null,
              t('{have}/{total} stickers · decorate your scrapbook', { have: ownedStickers(app.p).length, total: STICKERS.length }),
            ),
          ),
          albumReady(app.p) ? h('span', { class: 'nb dot' }, String(albumReady(app.p))) : null,
        ),
        h('p', { class: 'muted' }, t('Each new creature gives 💎{n}. Tap a card for its hint.', { n: GEMS_PER_NEW_SPECIES })),
        ...sections,
        h('div', { class: 'sec-title' }, t('Habitat sets')),
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
                h('b', null, t(hb.name)),
                h('span', { class: 'hab-n' }, `${have}/${hb.species.length}`),
                h('div', { class: 'qbar' }, h('i', { style: `width:${(have / hb.species.length) * 100}%` })),
                h('small', null, done ? t('Complete ✓') : rewardText(hb.reward).join(' ')),
              ),
              ready
                ? btn(t('Claim'), 'primary small', () => {
                    if (!claimHabitat(app.p, hb.id)) return;
                    app.syncGameCenter();
                    app.save();
                    sfx.chest();
                    toast(t('{name} complete! {reward}', { name: t(hb.name), reward: rewardText(hb.reward).join(' ') }), 'good');
                    showLifebook(app);
                  })
                : null,
            );
          }),
        ),
        h('div', { class: 'sec-title' }, t('Mementos {have}/{total}', { have: app.p.mementos.length, total: SPECIES.length })),
        app.p.mementos.length
          ? h('div', { class: 'memento-grid' }, ...app.p.mementos.map((id) => h('div', null, `🎀 ${mementoName(id)}`)))
          : h('p', { class: 'muted' }, t('Creatures sometimes leave keepsakes when they visit your galaxy while you are away.')),
        h('div', { class: 'sec-title' }, t('How to make each land')),
        biomes,
      ),
    ),
    'lifebook',
    () => stop(),
  );
  stop = animateCreatureGallery(portraits, effectiveReduceMotion(app.p));
}
