import { drawCreature } from '../art/critters';
import { h, btn } from '../dom';
import type { App } from '../app';
import { today } from '../../meta/profile';
import { claimWish, ensureWishes, swapWish, wishText, type WishCard } from '../../meta/wishes';
import { WISH_REWARD } from '../../meta/tuning';
import { t } from '../../i18n';

function portrait(card: WishCard): HTMLCanvasElement {
  const canvas = h('canvas', { width: 64, height: 64, 'aria-label': wishText(card) });
  const g = canvas.getContext('2d');
  if (g) drawCreature(g, card.species, 32, 34, 0, 23, 0);
  return canvas;
}

/** Self-contained Missions panel. */
export function wishesPanel(app: App): HTMLElement {
  const root = h('section', { class: 'wishes-panel' });
  const render = () => {
    const cards = ensureWishes(app.p, today());
    if (!cards.length) {
      root.replaceChildren(h('h2', null, t('Wishes')), h('p', null, t('Meet a creature to hear its Wish.')));
      return;
    }
    const state = app.p.quests as typeof app.p.quests & { swapDay?: string };
    root.replaceChildren(
      h('h2', null, t('Wishes')),
      ...cards.map((card) =>
        h(
          'article',
          { class: `quest wish${card.claimed ? ' claimed' : card.progress >= card.goal ? ' done' : ''}` },
          portrait(card),
          h(
            'div',
            { class: 'q-body' },
            h('b', null, wishText(card)),
            h(
              'div',
              { class: 'qbar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': card.goal, 'aria-valuenow': card.progress },
              h('i', { style: `width:${Math.round((card.progress / card.goal) * 100)}%` }),
              h('span', null, `${card.progress}/${card.goal}`),
            ),
            h('small', null, `💎 ${WISH_REWARD.gems} · ✨ ${WISH_REWARD.dust} · 🛣️ ${WISH_REWARD.roadPoints} ${t('Road point')}`),
            !card.claimed && card.progress === 0 && state.swapDay !== today()
              ? h('small', { class: 'muted wish-swap-note' }, t('Ask for a different Wish (once a day)'))
              : null,
          ),
          card.claimed
            ? h('span', { class: 'q-ok' }, '✓')
            : card.progress >= card.goal
              ? btn(t('Claim'), 'primary small', () => {
                  if (claimWish(app.p, card.id)) {
                    app.save();
                    render();
                  }
                })
              : state.swapDay !== today() && card.progress === 0
                ? btn(t('Swap'), 'ghost small', () => {
                    if (swapWish(app.p, card.id, today())) {
                      app.save();
                      render();
                    }
                  })
                : null,
        ),
      ),
      h('p', { class: 'muted' }, t('Finish all three Wishes for {n} more gems.', { n: WISH_REWARD.allThreeGems })),
    );
  };
  render();
  return root;
}
