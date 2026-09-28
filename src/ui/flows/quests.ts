// Daily quests: three small goals per day plus a bonus for finishing all three.
import { h, btn, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { today } from '../../meta/profile';
import { QUEST_BONUS, QUEST_BY_ID, claimQuest, claimQuestBonus, ensureQuests, rewardText } from '../../meta/progression';
import type { App } from '../app';
import { t } from '../../i18n';

export function questsFlow(app: App) {
  const p = app.p;
  ensureQuests(p, today());
  const body = h('div', { class: 'quests' });
  const render = () => {
    const rows = p.quests.list.map((q) => {
      const def = QUEST_BY_ID[q.id];
      const done = q.progress >= def.goal;
      return h(
        'div',
        { class: `quest${q.claimed ? ' claimed' : done ? ' done' : ''}` },
        h('div', { class: 'q-ic' }, def.emoji),
        h(
          'div',
          { class: 'q-body' },
          h('b', null, def.text(def.goal)),
          h(
            'div',
            { class: 'qbar' },
            h('i', { style: `width:${(q.progress / def.goal) * 100}%` }),
            h('span', null, `${q.progress}/${def.goal}`),
          ),
        ),
        q.claimed
          ? h('div', { class: 'q-ok' }, '✓')
          : btn(`💎${def.gems}`, done ? 'gem small' : 'ghost small dim', () => {
              if (!claimQuest(p, q.id)) return;
              sfx.gem();
              haptic.success();
              app.save();
              render();
            }),
      );
    });
    const allClaimed = p.quests.list.every((q) => q.claimed);
    const bonus = h(
      'div',
      { class: `quest bonus${p.quests.bonusClaimed ? ' claimed' : ''}` },
      h('div', { class: 'q-ic' }, '🎁'),
      h('div', { class: 'q-body' }, h('b', null, t('Finish all three')), h('small', null, rewardText(QUEST_BONUS).join('  '))),
      p.quests.bonusClaimed
        ? h('div', { class: 'q-ok' }, '✓')
        : btn(t('Claim'), allClaimed ? 'primary small' : 'ghost small dim', () => {
            if (!claimQuestBonus(p)) return;
            sfx.chest();
            haptic.success();
            app.save();
            render();
          }),
    );
    body.replaceChildren(...rows, bonus);
  };
  render();
  modal([h('div', { class: 'm-title' }, t('Daily quests')), h('p', { class: 'muted' }, t('New quests tomorrow')), body], {
    cls: 'tall',
    onClose: () => app.refresh(),
  });
}
