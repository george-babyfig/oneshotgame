import { h, btn } from '../dom';
import type { App } from '../app';
import { KINDS, type Kind } from '../../core/world';
import { projectileCanvas } from '../art/projectiles';
import { t } from '../../i18n';
import { REACTIONS, REACTION_IDS, type ReactionId } from '../../core/round';
import { reactionCanvas } from '../art/reactions';
import { FUSION_IDS } from '../../meta/reactions';
import { OBSTACLES, type ObstacleId } from '../../core/sky';
import { skyIconCanvas } from '../art/sky';
import { labLevel, labPlot, perkTaught } from '../../meta/labs';
import { homeUnlocked } from '../../meta/homeworld';
import { LAB_NAME, LAB_LEVEL, LAB_TEXT } from '../../meta/labcopy';

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

function statBar(label: string, icon: string, value: number, bonus = 0) {
  const max = Math.max(4, value + bonus);
  return h(
    'div',
    { class: 'guide-stat', 'aria-label': t('{stat} {value} of {max}', { stat: label, value: value + bonus, max }) },
    h('span', { class: 'guide-stat-label' }, icon, ' ', label),
    h(
      'span',
      { class: 'guide-stat-pips', 'aria-hidden': 'true' },
      ...Array.from({ length: max }, (_, i) => h('i', { class: i < value ? 'filled' : i < value + bonus ? 'gold' : '' })),
    ),
  );
}

type GuidePage = 'basics' | 'objects' | 'reactions' | 'combos' | 'sky' | 'creatures';

export function reactionForPair(a: Kind, b: Kind): ReactionId | null {
  if (a === b) return null;
  return REACTION_IDS.find((id) => REACTIONS[id].pair.includes(a) && REACTIONS[id].pair.includes(b)) ?? null;
}

export function showFieldGuide(app: App, page: GuidePage = 'basics') {
  if (page === 'reactions' && app.p.level < 8) page = 'basics';
  if (page === 'combos' && app.p.level < 26) page = 'basics';
  if (page === 'sky' && app.p.level < 33 && !app.p.skySeen.length) page = 'basics';
  const pageLabel = (id: GuidePage) =>
    id === 'basics'
      ? t('Basics')
      : id === 'objects'
        ? t('Objects')
        : id === 'reactions'
          ? t('Reactions')
          : id === 'combos'
            ? t('Combos')
            : id === 'sky'
              ? t('Sky')
              : t('Creatures');
  const pages = h(
    'div',
    { class: 'guide-tabs' },
    ...(['basics', 'objects', 'reactions', 'combos', 'sky', 'creatures'] as const)
      .filter((id) =>
        id === 'reactions'
          ? app.p.level >= 8
          : id === 'combos'
            ? app.p.level >= 26
            : id === 'sky'
              ? app.p.level >= 33 || !!app.p.skySeen.length
              : true,
      )
      .map((id) => btn(pageLabel(id), `ghost${id === page ? ' on' : ''}`, () => showFieldGuide(app, id))),
  );
  const basics = h(
    'div',
    { class: 'howto' },
    h('p', null, t('👆 Pull back anywhere and let go to fling. Gravity bends your shot — watch the dotted line.')),
    h('p', null, t('Watch the planet: it shows what your throw will do.')),
    h('p', null, t('🪨 Rock raises land · ☄️ Ice makes oceans · 🌱 Seeds grow life · 🔥 Magma heats & builds volcanoes')),
    h('p', null, t('🦌 Creatures appear when the right lands meet — a Forest next to an Ocean brings Otters!')),
    h('p', null, t('★ Reach the life target before your throws run out. Tap the small bubble to swap objects.')),
    h('p', null, t('✨ Finished planets orbit your galaxy. Campaign wins keep your Vault working.')),
  );
  const objects = h(
    'div',
    { class: 'guide-objects' },
    ...Object.values(KINDS)
      .filter((kind) => kind.unlock <= app.p.level)
      .map((kind) => {
        const { stats } = kind;
        const lv = labLevel(app.p, kind.id);
        const built = labPlot(app.p, kind.id) >= 0;
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
            statBar(t('Power'), '✦', stats.power, lv >= 2 ? 1 : 0),
            statBar(t('Reach'), '◎', stats.reach, lv >= 5 && kind.id !== 'storm' && kind.id !== 'sun' ? 1 : 0),
            !homeUnlocked(app.p)
              ? null
              : built
                ? h(
                    'div',
                    { class: 'guide-lab' },
                    h('b', null, t(LAB_NAME[kind.id]), ' ', t('Lv {n}', { n: lv })),
                    ...([2, 3, 4, 5] as const).map((n) =>
                      h(
                        'small',
                        { class: n <= lv ? 'got' : 'muted' },
                        n > lv && !perkTaught(app.p, kind.id, n) ? t(LAB_TEXT.later) : t(LAB_LEVEL[kind.id][n]),
                      ),
                    ),
                  )
                : h('small', { class: 'muted' }, t(LAB_TEXT.buildFirst, { name: t(LAB_NAME[kind.id]) })),
          ),
        );
      }),
  );
  const kinds = Object.keys(KINDS) as Kind[];
  const tried = new Set(app.p.reactionPairsTried);
  const reactionCells = (a: Kind, b: Kind) => {
    if (a === b) return h('span', { class: 'reaction-empty' }, '–');
    const id = reactionForPair(a, b);
    const found = !!id && app.p.fusionsFound.includes(id);
    const pairKey = [a, b].sort().join('+');
    const name = found ? t(REACTIONS[id].name) : tried.has(pairKey) ? t('Nothing happens') : '?';
    return h(
      'span',
      { class: `reaction-cell ${found ? REACTIONS[id].kind : ''}`, title: name },
      found ? reactionCanvas(id, 24) : tried.has(pairKey) ? '·' : '?',
    );
  };
  const reactions = h(
    'div',
    { class: 'guide-reactions' },
    h('p', null, t('Try two objects together. Their land remembers!')),
    h(
      'div',
      { class: 'reaction-chart', role: 'table', 'aria-label': t('Reactions chart') },
      h(
        'div',
        { role: 'row' },
        h('span', { role: 'columnheader' }, ''),
        ...kinds.map((kind) => h('span', { role: 'columnheader', title: t(KINDS[kind].name) }, projectileCanvas(kind, 26))),
      ),
      ...kinds.map((a) =>
        h(
          'div',
          { role: 'row' },
          h('span', { role: 'rowheader', title: t(KINDS[a].name) }, projectileCanvas(a, 26)),
          ...kinds.map((b) =>
            h(
              'span',
              {
                role: 'cell',
                'aria-label': t('{first} and {second}: {result}', {
                  first: t(KINDS[a].name),
                  second: t(KINDS[b].name),
                  result:
                    reactionForPair(a, b) && app.p.fusionsFound.includes(reactionForPair(a, b)!)
                      ? t(REACTIONS[reactionForPair(a, b)!].name)
                      : tried.has([a, b].sort().join('+'))
                        ? t('Nothing happens')
                        : '?',
                }),
              },
              reactionCells(a, b),
            ),
          ),
        ),
      ),
    ),
    h('p', { class: 'reaction-legend' }, `· = ${t('Nothing happens')}`),
    h(
      'div',
      { class: 'reaction-list' },
      ...REACTION_IDS.filter((id) => app.p.fusionsFound.includes(id)).map((id) =>
        h('div', null, reactionCanvas(id, 28), h('b', null, t(REACTIONS[id].name))),
      ),
    ),
  );
  const stampNames = [
    ...[2, 3, 4].map((n) => t('Combo {n}', { n })),
    ...FUSION_IDS.map((id) => t('{name} in a Combo', { name: t(REACTIONS[id].name) })),
    t('Four Fusions in Combos'),
    ...FUSION_IDS.map((id) => t('Super {name}', { name: t(REACTIONS[id].name) })),
    t('Four Super Fusions'),
  ];
  const combos = h(
    'div',
    { class: 'guide-combos' },
    h('p', null, t('Link Fusions together. One gentle throw can rest between links.')),
    h('p', null, t('Best Combo: {n}', { n: app.p.combo.best })),
    h(
      'div',
      { class: 'combo-stamps' },
      ...stampNames.map((name, index) => {
        const found = !!(app.p.combo.stamps & (1 << index));
        return h('div', { class: `combo-stamp ${found ? 'found' : ''}`, title: found ? name : '?' }, found ? name : '?');
      }),
    ),
  );
  const sky = h(
    'div',
    { class: 'guide-sky' },
    h('p', null, t('Twists are in the sky and change your throw. Troubles are on the ground and change the land.')),
    ...(Object.keys(OBSTACLES) as ObstacleId[]).map((id) => {
      const seen = app.p.skySeen.includes(id);
      const obstacle = OBSTACLES[id];
      return h(
        'div',
        { class: `guide-sky-card${seen ? '' : ' unknown'}` },
        skyIconCanvas(id, 52, !seen, app.p.settings.planetColours === 'clear'),
        h(
          'div',
          null,
          h('b', null, seen ? t(obstacle.name) : '?'),
          seen ? h('p', null, t(obstacle.rule)) : null,
          seen ? h('small', null, t(obstacle.counter)) : null,
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
        page === 'basics'
          ? basics
          : page === 'objects'
            ? objects
            : page === 'reactions'
              ? reactions
              : page === 'combos'
                ? combos
                : page === 'sky'
                  ? sky
                  : btn(t('Open Lifebook'), 'primary wide', () => app.showLifebook()),
      ),
    ),
    'fieldguide',
  );
}
