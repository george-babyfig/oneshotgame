import { awayCollectables, awayRecapLines, collectAway } from '../../meta/economy';
import { t } from '../../i18n';
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import { visitorRows } from './visitors';
import type { App } from '../app';

export function awayFlow(app: App, awayMs: number) {
  const p = app.p;
  const summary = awayCollectables(p, awayMs);
  if (!summary.show) return;
  const longAway = awayMs >= 7 * 86400000;
  const warmup = Object.entries(p.stars)
    .filter(([n, stars]) => Number(n) < p.level && stars === 3)
    .map(([n]) => Number(n))
    .sort((a, b) => b - a)[0];
  let collected = false;
  const collect = () => {
    if (collected) return;
    collected = true;
    const out = collectAway(p, awayMs);
    app.clearAwayPending();
    if (out.vault || out.home.dust || out.visitors) sfx.coin();
    haptic.success();
    app.save();
    m.close();
    app.refresh();
  };
  const m = modal(
    [
      h('div', { class: 'm-title' }, t('While you were away')),
      longAway
        ? h('div', { class: 'away-recap' }, ...awayRecapLines(p, awayMs).map((line) => h('p', null, line)))
        : h(
            'div',
            { class: 'away-summary' },
            summary.vault ? h('p', null, t('Your planets made ✨{n}', { n: fmt(summary.vault) })) : null,
            summary.home.dust ? h('p', null, t('Your Homeworld made ✨{n}', { n: fmt(summary.home.dust) })) : null,
            summary.home.gems ? h('p', null, t('Your Homeworld made 💎{n}', { n: fmt(summary.home.gems) })) : null,
            summary.home.boosters ? h('p', null, t('Your Homeworld made {n} boosters', { n: summary.home.boosters })) : null,
          ),
      summary.visitorCount ? visitorRows(p.visitors) : null,
      summary.welcomeGems ? h('p', { class: 'away-gift' }, t('💎 {n} welcome gift', { n: summary.welcomeGems })) : null,
      btn(t('Collect all'), 'primary wide', collect),
      longAway && warmup
        ? btn(t('Warm-up planet'), 'ghost wide', () => {
            collect();
            app.startLevel(warmup, { warmup: true });
          })
        : null,
    ],
    { dismiss: false, cls: 'away-card', onAbort: () => app.keepAwayPending(awayMs) },
  );
}
