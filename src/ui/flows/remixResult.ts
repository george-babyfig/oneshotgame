// A quiet result card for the optional Bonus route. The next planet waits for a tap.
import { btn, fmt, h, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { t } from '../../i18n';
import { celebrate } from '../celebrate';
import { effectiveReduceMotion } from '../motion';
import { remixUnlocked, type RemixFrame } from '../../meta/remix';
import type { LevelResult } from '../game';
import type { App } from '../app';

export function remixResult(app: App, r: LevelResult, frame: RemixFrame, firstGold: boolean) {
  const chapter = Math.ceil(r.level.n / 10);
  // After the last planet of the newest finished chapter there is no next one: only "Map".
  const next = r.level.n % 10 !== 0 || remixUnlocked(app.p, chapter + 1) ? r.level.n + 1 : 0;
  // The map behind the card stays on this chapter's Remix side.
  app.showStarMap(chapter);
  const title = firstGold
    ? t('Chapter remixed! Nice spot for a break.')
    : r.stars > 0
      ? t('Lovely shot!')
      : t('Nice try! A new angle might help.');
  const card = h(
    'div',
    { class: `remix-result remix-frame-${frame}` },
    h('div', { class: 'm-sub' }, t('Remix · Bonus')),
    h('div', { class: 'm-title' }, title),
    h('div', { class: 'end-stars remix-result-stars' }, ...[0, 1, 2].map((k) => h('span', { class: k < r.stars ? 'on' : '' }, '★'))),
    h('div', { class: 'end-score' }, t('{n} life', { n: fmt(r.score) })),
    next && !firstGold
      ? btn(t('Next remix planet'), 'primary wide', () => {
          m.close();
          app.preRemix(next);
        })
      : null,
    btn(t('Map'), next && !firstGold ? 'ghost wide' : 'primary wide', () => m.close()),
  );
  const m = modal([card]);
  if (r.stars > 0) {
    sfx.win();
    haptic.success();
  }
  if (firstGold)
    celebrate('results', {
      root: card,
      reduceMotion: effectiveReduceMotion(app.p),
      duration: 1600,
      beats: [
        {
          at: 120,
          play: (instant) => {
            card.classList.add('remix-gold-reveal');
            if (!instant) {
              sfx.chest();
              haptic.success();
            }
          },
        },
      ],
    });
}
