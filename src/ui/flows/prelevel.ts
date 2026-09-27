// Pre-level sheet: star targets, objects in play, and optional boosters.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx } from '../audio';
import { DIFFICULTY_DUST, makeLevel, TWISTS } from '../../core/levels';
import { MOMENTUM_PERKS, momentumActive, momentumPerkText } from '../../meta/momentum';
import { KINDS } from '../../core/world';
import { BOOSTERS, type BoosterId } from '../../meta/config';
import { spendDust } from '../../meta/economy';
import { chapterOf } from '../../meta/progression';
import { projectileCanvas } from '../art/projectiles';
import type { App, Boosters } from '../app';

export function preLevel(app: App, n: number) {
  const p = app.p;
  const L = makeLevel(n);
  const chosen: Boosters = { shower: false, spark: false, scope: false };
  const kinds = Object.values(KINDS).filter((k) => k.unlock <= n);
  const newKind = kinds.find((k) => k.unlock === n);
  const row = h('div', { class: 'boosters' });
  const renderBoosters = () => {
    row.replaceChildren(
      ...(Object.keys(BOOSTERS) as BoosterId[]).map((id) => {
        const b = BOOSTERS[id];
        const owned = p.boosters[id];
        const el = h(
          'button',
          { class: `booster${chosen[id] ? ' on' : ''}` },
          h('span', { class: 'be' }, b.emoji),
          h('span', { class: 'bn' }, b.name),
          h('span', { class: 'bc' }, owned > 0 ? `×${owned}` : `✨${b.dust}`),
        );
        el.addEventListener('click', () => {
          sfx.click();
          if (chosen[id]) chosen[id] = false;
          else if (owned > 0) chosen[id] = true;
          else if (spendDust(p, b.dust)) {
            p.boosters[id]++;
            chosen[id] = true;
            sfx.coin();
            app.save();
          } else {
            sfx.error();
            toast(`Needs ✨${b.dust} stardust — or 💎${b.gems} in the Shop`, 'bad');
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
      h('div', { class: 'm-sub' }, `${chapterOf(n).name} · Planet ${n}`),
      h('div', { class: 'm-title' }, L.name),
      L.difficulty !== 'normal'
        ? h(
            'div',
            { class: `diff-chip ${L.difficulty}` },
            L.difficulty === 'super'
              ? `💀 Super Hard planet · ×${DIFFICULTY_DUST.super} stardust`
              : `🔥 Hard planet · ×${DIFFICULTY_DUST.hard} stardust`,
          )
        : null,
      L.twist !== 'none' ? h('div', { class: 'twist-chip' }, `${TWISTS[L.twist].name}: ${TWISTS[L.twist].desc}`) : null,
      h(
        'div',
        { class: 'targets' },
        ...L.stars.map((t, i) =>
          h('div', { class: `tg${i < best ? ' got' : ''}` }, h('b', null, '★'.repeat(i + 1)), h('span', null, `${fmt(t)} life`)),
        ),
      ),
      h(
        'div',
        { class: 'kinds' },
        ...kinds.map((k) =>
          h(
            'span',
            { class: `kc${k === newKind ? ' new' : ''}`, title: k.desc },
            projectileCanvas(k.id, 34),
            k === newKind ? h('small', null, 'NEW') : null,
          ),
        ),
      ),
      newKind ? h('p', { class: 'newkind' }, `New: ${newKind.emoji} ${newKind.name} — ${newKind.desc}`) : null,
      momentumActive(p)
        ? h(
            'div',
            { class: `momentum${p.momentum.streak ? '' : ' off'}` },
            h('span', { class: 'halo' }, '⚡'),
            p.momentum.streak
              ? `Momentum ×${p.momentum.streak}: ${momentumPerkText(p.momentum.streak)} free`
              : 'Win in a row to build Momentum and get free head-starts',
          )
        : null,
      h('div', { class: 'm-sub' }, 'Boosters'),
      row,
      btn(
        `Launch! · ${L.throws + p.upgrades.throws + (momentumActive(p) ? MOMENTUM_PERKS[p.momentum.streak].throws : 0)} throws`,
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
