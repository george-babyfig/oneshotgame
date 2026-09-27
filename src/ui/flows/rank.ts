// Explorer Rank: three standing goals; clearing them ranks you up and unlocks modes.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { applyReward, rewardText } from '../../meta/progression';
import { RANK_UNLOCKS, rankProgress, rankReady, rankReward, rankTitle } from '../../meta/rank';
import type { App } from '../app';

export function rankFlow(app: App) {
  const p = app.p;
  const body = h('div', { class: 'quests' });
  const render = () => {
    const rows = rankProgress(p).map(({ goal, value, done }) =>
      h(
        'div',
        { class: `quest${done ? ' done' : ''}` },
        h('div', { class: 'q-ic' }, done ? '✅' : '🎯'),
        h(
          'div',
          { class: 'q-body' },
          h('b', null, goal.text),
          h(
            'div',
            { class: 'qbar' },
            h('i', { style: `width:${(value / goal.target) * 100}%` }),
            h('span', null, `${fmt(value)}/${fmt(goal.target)}`),
          ),
        ),
      ),
    );
    const unlock = RANK_UNLOCKS[p.rank + 1];
    body.replaceChildren(
      ...rows,
      h(
        'div',
        { class: 'rank-reward' },
        `Rank ${p.rank + 1} reward: ${rewardText(rankReward(p.rank + 1)).join('  ')}${unlock ? `  ·  🔓 ${unlock}` : ''}`,
      ),
      btn('Rank up!', `primary wide${rankReady(p) ? '' : ' dim'}`, () => {
        if (!rankReady(p)) return;
        p.rank++;
        const r = rankReward(p.rank);
        applyReward(p, r);
        app.save();
        sfx.levelUp();
        sfx.chest();
        haptic.success();
        m.close();
        const u = RANK_UNLOCKS[p.rank];
        const done = modal([
          h('div', { class: 'chest-anim' }, '🏅'),
          h('div', { class: 'm-sub' }, `Explorer Rank ${p.rank}`),
          h('div', { class: 'm-title' }, rankTitle(p.rank)),
          h('div', { class: 'reward-list' }, ...rewardText(r).map((t) => h('span', null, t))),
          u ? h('div', { class: 'nudge' }, `🔓 New mode unlocked: ${u}!`) : null,
          btn('Onward!', 'primary wide', () => (done.close(), app.refresh())),
        ]);
      }),
    );
  };
  render();
  const m = modal(
    [
      h('div', { class: 'm-sub' }, `Explorer Rank ${p.rank}`),
      h('div', { class: 'm-title' }, rankTitle(p.rank)),
      h('p', { class: 'muted' }, 'Clear all three goals to rank up.'),
      body,
    ],
    {
      cls: 'tall',
      onClose: () => app.refresh(),
    },
  );
}
