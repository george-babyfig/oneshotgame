// Pre-level sheet: star targets, objects in play, and optional boosters.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx } from '../audio';
import { DIFFICULTY_DUST, makeLevel, TWISTS, type LevelDef } from '../../core/levels';
import { MOMENTUM_PERKS, momentumActive, momentumPerkText } from '../../meta/momentum';
import { KINDS } from '../../core/world';
import { BOOSTERS, type BoosterId } from '../../meta/config';
import { spendDust } from '../../meta/economy';
import { chapterOf } from '../../meta/progression';
import { projectileCanvas } from '../art/projectiles';
import type { App, Boosters } from '../app';
import { critterCanvas } from '../art/critters';
import { BIOMES, SPECIES_BY_ID, type BiomeId } from '../../core/world';
import { t, tp } from '../../i18n';
import { kindDesc, kindName } from '../text';

/** The level's goals as chips (pre-level and Voyage sheets). */
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
  if (document.querySelector('.scrim:not(.out) .modal.pre')) return;
  const p = app.p;
  const L = makeLevel(n);
  const chosen: Boosters = { shower: false, spark: false, scope: false };
  const kinds = Object.values(KINDS).filter((k) => k.unlock <= n);
  const newKind = kinds.find((k) => k.unlock === n);
  const row = h('div', { class: 'boosters' });
  // Boosters that Momentum already gives for free can't be (wastefully) selected.
  const perk = momentumActive(p) ? MOMENTUM_PERKS[p.momentum.streak] : null;
  const free = (id: BoosterId) => (id === 'spark' && !!perk?.spark) || (id === 'scope' && !!perk?.scope);
  const renderBoosters = () => {
    row.replaceChildren(
      ...(Object.keys(BOOSTERS) as BoosterId[]).map((id) => {
        const b = BOOSTERS[id];
        const owned = p.boosters[id];
        const el = h(
          'button',
          { class: `booster${chosen[id] || free(id) ? ' on' : ''}` },
          h('span', { class: 'be' }, b.emoji),
          h('span', { class: 'bn' }, t(b.name)),
          h('span', { class: 'bc' }, free(id) ? t('Free') : owned > 0 ? `×${owned}` : `✨${b.dust}`),
        );
        el.addEventListener('click', () => {
          sfx.click();
          if (free(id)) return toast(t('Already free with Momentum!'), 'good');
          if (chosen[id]) chosen[id] = false;
          else if (owned > 0) chosen[id] = true;
          else if (spendDust(p, b.dust)) {
            p.boosters[id]++;
            chosen[id] = true;
            sfx.coin();
            app.save();
          } else {
            sfx.error();
            toast(t('Needs ✨{dust} stardust — or 💎{gems} in the Shop', { dust: b.dust, gems: b.gems }), 'bad');
          }
          renderBoosters();
        });
        return el;
      }),
    );
  };
  renderBoosters();
  const best = p.stars[n] ?? 0;
  const m = modal(
    [
      h('div', { class: 'm-sub' }, t('{chapter} · Planet {n}', { chapter: t(chapterOf(n).name), n })),
      h('div', { class: 'm-title' }, L.name),
      L.difficulty !== 'normal'
        ? h(
            'div',
            { class: `diff-chip ${L.difficulty}` },
            L.difficulty === 'super'
              ? t('💀 Super Hard planet · ×{n} stardust', { n: DIFFICULTY_DUST.super })
              : t('🔥 Hard planet · ×{n} stardust', { n: DIFFICULTY_DUST.hard }),
          )
        : null,
      L.twist !== 'none' ? h('div', { class: 'twist-chip' }, `${t(TWISTS[L.twist].name)}: ${t(TWISTS[L.twist].desc)}`) : null,
      goalChips(L),
      h(
        'div',
        { class: 'targets' },
        ...L.stars.map((target, i) =>
          h(
            'div',
            { class: `tg${i < best ? ' got' : ''}` },
            h('b', null, '★'.repeat(i + 1)),
            h('span', null, t('{n} life', { n: fmt(target) })),
          ),
        ),
      ),
      h(
        'div',
        { class: 'kinds' },
        ...kinds.map((k) =>
          h(
            'span',
            { class: `kc${k === newKind ? ' new' : ''}`, title: kindDesc(k.id) },
            projectileCanvas(k.id, 34),
            k === newKind ? h('small', null, t('NEW')) : null,
          ),
        ),
      ),
      newKind
        ? h(
            'p',
            { class: 'newkind' },
            t('New: {emoji} {name} — {desc}', { emoji: newKind.emoji, name: kindName(newKind.id), desc: kindDesc(newKind.id) }),
          )
        : null,
      momentumActive(p)
        ? h(
            'div',
            { class: `momentum${p.momentum.streak ? '' : ' off'}` },
            h('span', { class: 'halo' }, '⚡'),
            p.momentum.streak
              ? t('Momentum ×{n}: {perks} free', { n: p.momentum.streak, perks: momentumPerkText(p.momentum.streak) })
              : t('Win in a row to build Momentum and get free head-starts'),
          )
        : null,
      h('div', { class: 'm-sub' }, t('Boosters')),
      row,
      btn(
        tp(
          L.throws + p.upgrades.throws + (momentumActive(p) ? MOMENTUM_PERKS[p.momentum.streak].throws : 0),
          'Launch! · {n} throw',
          'Launch! · {n} throws',
        ),
        'primary big wide',
        () => {
          for (const id of Object.keys(chosen) as BoosterId[]) if (chosen[id]) p.boosters[id]--;
          app.save();
          m.close();
          app.startLevel(n, { boosters: { ...chosen }, level: L });
        },
      ),
    ],
    { cls: 'pre' },
  );
}
