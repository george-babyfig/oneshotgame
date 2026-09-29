// Level details sit over the live round until a tap or the first fling.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx } from '../audio';
import { DIFFICULTY_DUST, TWISTS, type LevelDef } from '../../core/levels';
import { BIOMES, KINDS, SPECIES_BY_ID, lifeScore, type BiomeId } from '../../core/world';
import { BOOSTERS, type BoosterId } from '../../meta/config';
import { spendDust } from '../../meta/economy';
import { chapterOf } from '../../meta/progression';
import { momentumActive, MOMENTUM_PERKS } from '../../meta/momentum';
import { projectileCanvas } from '../art/projectiles';
import { critterCanvas } from '../art/critters';
import { sparkStart } from '../fx';
import { ledger } from '../../meta/ledger';
import { t } from '../../i18n';
import type { App } from '../app';

export function goalChips(L: LevelDef) {
  if (!L.goals.length) return null;
  return h(
    'div',
    { class: 'pre-goals' },
    h('small', null, t('Goals')),
    ...L.goals.map((g) =>
      h(
        'span',
        { class: 'goal' },
        g.type === 'species' ? critterCanvas(g.id, 30) : h('span', { class: 'gi' }, BIOMES[g.id as BiomeId].deco),
        h(
          'b',
          null,
          g.type === 'species' ? t(SPECIES_BY_ID[g.id].name) : t('{n}× {name}', { n: g.count, name: t(BIOMES[g.id as BiomeId].name) }),
        ),
      ),
    ),
  );
}

export function preLevel(app: App, n: number) {
  app.startLevel(n);
  const scene = app.scene!;
  const p = app.p;
  const L = scene.L;
  const chosen = { shower: false, spark: false, scope: false };
  const fromInventory = { shower: false, spark: false, scope: false };
  const explained = new Set<BoosterId>();
  const perk = momentumActive(p) ? MOMENTUM_PERKS[p.momentum.streak] : null;
  const free = (id: BoosterId) => (id === 'spark' && !!perk?.spark) || (id === 'scope' && !!perk?.scope);
  const panel = h('div', { class: 'level-info', role: 'group', 'aria-label': t('Planet details') });
  let committed = false;
  const dismiss = () => panel.remove();
  const commit = () => {
    if (committed) return;
    committed = true;
    const count = Object.values(chosen).filter(Boolean).length;
    if (count) ledger.count('boosters_used', count);
    for (const id of Object.keys(chosen) as BoosterId[]) {
      if (!chosen[id]) continue;
      if (fromInventory[id]) p.boosters[id]--;
      else spendDust(p, BOOSTERS[id].dust, 'booster');
    }
    if (count) app.save();
  };
  const originalThrow = scene.o.onThrow;
  scene.o.onThrow = (kind) => {
    commit();
    dismiss();
    originalThrow?.(kind);
  };
  let tapStart: { x: number; y: number } | null = null;
  scene.canvas.addEventListener('pointerdown', (event) => (tapStart = { x: event.clientX, y: event.clientY }));
  scene.canvas.addEventListener('pointerup', (event) => {
    if (tapStart && Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y) < 18) dismiss();
    tapStart = null;
  });
  const choose = (id: BoosterId) => {
    if (chosen[id]) return;
    const b = BOOSTERS[id];
    const reserved = (Object.keys(chosen) as BoosterId[]).reduce(
      (sum, key) => sum + (chosen[key] && !fromInventory[key] ? BOOSTERS[key].dust : 0),
      0,
    );
    if (p.boosters[id] > 0) fromInventory[id] = true;
    else if (p.dust - reserved >= b.dust) sfx.coin();
    else return toast(t('Needs ✨{dust} stardust', { dust: b.dust }));
    chosen[id] = true;
    scene.o.boosters[id] = true;
    if (id === 'shower') {
      scene.throwsLeft += 3;
      scene.throwsTotal += 3;
      scene.renderHud();
    } else if (id === 'spark') {
      sparkStart(scene.planet);
      scene.score = scene.shownScore = lifeScore(scene.planet);
      scene.regionBests = scene.planet.sectors.map((sector) => BIOMES[sector.biome].value);
      scene.arrived = new Set(scene.planet.sectors.map((sector) => sector.species).filter((species): species is string => !!species));
      scene.renderHud();
    }
    renderBoosters();
  };
  const row = h('div', { class: 'boosters' });
  const renderBoosters = () =>
    row.replaceChildren(
      ...(Object.keys(BOOSTERS) as BoosterId[]).map((id) => {
        const b = BOOSTERS[id];
        const tile = h(
          'button',
          { class: `booster${chosen[id] || free(id) ? ' on' : ''}`, type: 'button' },
          h('span', { class: 'be' }, b.emoji),
          h('span', { class: 'bn' }, t(b.name)),
          h('span', { class: 'bc' }, free(id) ? t('Free') : chosen[id] ? '✓' : p.boosters[id] ? `×${p.boosters[id]}` : `✨${b.dust}`),
        );
        tile.addEventListener('click', () => {
          sfx.click();
          if (chosen[id]) return;
          if (!explained.has(id)) {
            explained.add(id);
            const info = modal([
              h('div', { class: 'm-title' }, t(b.name)),
              h('p', null, t(b.desc)),
              btn(t('OK'), 'primary wide', () => info.close()),
            ]);
            return;
          }
          if (free(id)) return toast(t('Already free with Momentum!'), 'good');
          if (p.boosters[id] > 0) return choose(id);
          const reserved = (Object.keys(chosen) as BoosterId[]).reduce(
            (sum, key) => sum + (chosen[key] && !fromInventory[key] ? BOOSTERS[key].dust : 0),
            0,
          );
          const canGet = p.dust - reserved >= b.dust;
          const getButton = btn(
            canGet ? t('Get 1 for ✨{price}', { price: b.dust }) : t('Needs ✨{dust} stardust', { dust: b.dust }),
            canGet ? 'primary wide' : 'primary wide dim',
            () => {
              if (canGet) choose(id);
              confirm.close();
            },
          );
          getButton.disabled = !canGet;
          const confirm = modal([
            h('div', { class: 'm-title' }, t(b.name)),
            h('p', null, t(b.desc)),
            getButton,
            btn(t('Cancel'), 'ghost wide', () => confirm.close()),
          ]);
        });
        return tile;
      }),
    );
  renderBoosters();
  panel.append(
    h('div', { class: 'm-sub' }, t('{chapter} · Planet {n}', { chapter: t(chapterOf(n).name), n })),
    h('div', { class: 'm-title' }, L.name),
    L.difficulty === 'normal'
      ? h('span')
      : h(
          'div',
          { class: `diff-chip ${L.difficulty}` },
          L.difficulty === 'super'
            ? t('💀 Super Hard planet · ×{n} stardust', { n: DIFFICULTY_DUST.super })
            : t('🔥 Hard planet · ×{n} stardust', { n: DIFFICULTY_DUST.hard }),
        ),
    L.twist === 'none' ? h('span') : h('div', { class: 'twist-chip' }, `${t(TWISTS[L.twist].name)}: ${t(TWISTS[L.twist].desc)}`),
    goalChips(L) ?? h('span'),
    h(
      'div',
      { class: 'targets' },
      ...L.stars.map((target, i) =>
        h(
          'div',
          { class: `tg${i < (p.stars[n] ?? 0) ? ' got' : ''}` },
          h('b', null, '★'.repeat(i + 1)),
          h('span', null, t('{n} life', { n: fmt(target) })),
        ),
      ),
    ),
    h(
      'div',
      { class: 'kinds' },
      ...Object.values(KINDS)
        .filter((kind) => kind.unlock <= n)
        .map((kind) => projectileCanvas(kind.id, 34)),
    ),
    h('div', { class: 'm-sub' }, t('Boosters')),
    row,
    btn(t('Got it'), 'primary wide', dismiss),
  );
  scene.el.append(panel);
}
