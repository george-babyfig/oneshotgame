// After a won level: record it, celebrate, and point at what's next.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { planetRate, applyLevelWin } from '../../meta/economy';
import { chestsReady, questsClaimable, roadReady } from '../../meta/progression';
import { totalStars } from '../../meta/profile';
import { FINISH_DUST_PER_THROW, type LevelResult } from '../game';
import type { App } from '../app';
import { sharePostcard } from '../postcard';
import { addTokens, ensureEvent, eventActive, eventReady } from '../../meta/events';
import { askForReminders, maybeAskReview } from '../platform';

export function levelResults(app: App, r: LevelResult) {
  const p = app.p;
  const n = r.level.n;
  const out = applyLevelWin(p, {
    n,
    stars: r.stars,
    score: r.score,
    planet: r.planet,
    name: r.level.name,
    hue: r.level.hue,
    difficulty: r.level.difficulty,
    bonusDust: r.leftover * FINISH_DUST_PER_THROW,
  });
  if (out.newStars && eventActive(p) && ensureEvent(p).stars) addTokens(p, out.newStars * 4);
  const wasTutorial = !p.tutorial;
  p.tutorial = true;
  app.saveNow();
  const extras: HTMLElement[] = [];
  if (chestsReady(p).length) extras.push(h('div', { class: 'nudge' }, '🎁 Chapter chest ready on the Star Map!'));
  if (roadReady(p, totalStars(p)).length) extras.push(h('div', { class: 'nudge' }, '🛣️ New Star Road reward!'));
  if (eventActive(p) && eventReady(p).length) extras.push(h('div', { class: 'nudge' }, `${ensureEvent(p).emoji} Event reward ready!`));
  if (questsClaimable(p)) extras.push(h('div', { class: 'nudge' }, '📜 A quest is complete!'));
  const home = () => {
    m.close();
    app.showHome();
    if (wasTutorial) app.daily();
    else if (p.galaxy.length >= 2) askForReminders(p, () => app.save());
  };
  maybeAskReview(p, () => app.save(), r.stars, n);
  const m = modal(
    [
      h('div', { class: 'm-title' }, out.firstClear ? 'Planet added to your galaxy!' : 'Planet improved!'),
      h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < r.stars ? 'on' : '' }, '★'))),
      h(
        'div',
        { class: 'rewards' },
        h('div', null, h('b', null, `✨ ${fmt(out.dust)}`), h('small', null, 'stardust')),
        out.gems ? h('div', null, h('b', null, `💎 ${out.gems}`), h('small', null, '3-star bonus')) : null,
        h('div', null, h('b', null, `${r.planet.speciesFound.length}`), h('small', null, 'creatures')),
      ),
      h('p', { class: 'muted' }, `It now makes ✨${planetRate(out.entry)}/hour for you, even while you're away.`),
      ...extras,
      btn('📮 Share postcard', 'ghost wide small-btn', () =>
        sharePostcard(
          r.planet,
          {
            title: r.level.name,
            subtitle: `Planet ${n} · ${r.planet.speciesFound.length} creatures · ${r.score} life`,
            stars: r.stars,
            glow: app.skinGlow(),
          },
          `I grew ${r.score} life on ${r.level.name} in Pocket Planet! 🪐`,
        ),
      ),
      h(
        'div',
        { class: 'row' },
        btn('Galaxy', 'ghost', home),
        btn('Next ▶', 'primary', () => {
          m.close();
          if (wasTutorial) app.startLevel(p.level);
          else app.preLevel(p.level);
        }),
      ),
    ],
    { dismiss: false },
  );
  sfx.coin();
}
