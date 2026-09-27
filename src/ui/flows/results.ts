// After a won level: record it, celebrate, and point at what's next.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { planetRate, applyLevelWin } from '../../meta/economy';
import { applyReward, chestsReady, questsClaimable, roadReady, type Reward } from '../../meta/progression';

/** First-time reward for defeating a planet's Comet Guardian. */
export const BOSS_REWARD: Reward = { gems: 30, dust: 500 };
import { totalStars } from '../../meta/profile';
import { FINISH_DUST_PER_THROW, type LevelResult } from '../game';
import type { App } from '../app';
import { sharePostcard } from '../postcard';
import { addTokens, ensureEvent, eventActive, eventReady } from '../../meta/events';
import { askForReminders, maybeAskReview } from '../platform';
import { t, tp } from '../../i18n';
import { homeUnlocked, speedUpBuilds } from '../../meta/homeworld';
import { MAT_EMOJI, addDrops, dropsFor, type Mat } from '../../meta/constellations';

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
  app.syncGameCenter();
  const extras: HTMLElement[] = [];
  if (chestsReady(p).length) extras.push(h('div', { class: 'nudge' }, t('🎁 Chapter chest ready on the Star Map!')));
  if (roadReady(p, totalStars(p)).length) extras.push(h('div', { class: 'nudge' }, t('🛣️ New Star Road reward!')));
  if (eventActive(p) && eventReady(p).length)
    extras.push(h('div', { class: 'nudge' }, t('{emoji} Event reward ready!', { emoji: ensureEvent(p).emoji })));
  if (questsClaimable(p)) extras.push(h('div', { class: 'nudge' }, t('📜 A quest is complete!')));
  // materials for the constellations (from the lands on this planet)
  const drops = dropsFor(r.planet, r.stars);
  if (Object.keys(drops).length) {
    addDrops(p, drops);
    app.save();
    extras.unshift(
      h(
        'div',
        { class: 'drops' },
        h('small', null, t('Materials')),
        ...Object.entries(drops).map(([m, n]) => h('span', null, `${MAT_EMOJI[m as Mat]} ${n}`)),
      ),
    );
  }
  if (r.boss && !p.bosses.includes(n)) {
    p.bosses.push(n);
    applyReward(p, BOSS_REWARD);
    app.save();
    extras.unshift(
      h('div', { class: 'nudge boss' }, t('☄️ Guardian defeated! +💎{g} +✨{d}', { g: BOSS_REWARD.gems ?? 0, d: BOSS_REWARD.dust ?? 0 })),
    );
  }
  // every campaign win nudges the Homeworld's drones along
  if (homeUnlocked(p) && speedUpBuilds(p.home)) {
    app.save();
    extras.push(h('div', { class: 'nudge' }, t('🛸 Your drones built 10 minutes faster!')));
  }
  const home = () => {
    m.close();
    app.showHome();
    if (!wasTutorial && p.galaxy.length >= 2) askForReminders(p, () => app.save());
  };
  maybeAskReview(p, () => app.save(), r.stars, n);
  const m = modal(
    [
      h('div', { class: 'm-title' }, out.firstClear ? t('Planet added to your galaxy!') : t('Planet improved!')),
      h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < r.stars ? 'on' : '' }, '★'))),
      h(
        'div',
        { class: 'rewards' },
        h('div', null, h('b', null, `✨ ${fmt(out.dust)}`), h('small', null, t('stardust'))),
        out.gems ? h('div', null, h('b', null, `💎 ${out.gems}`), h('small', null, t('3-star bonus'))) : null,
        h('div', null, h('b', null, `${r.planet.speciesFound.length}`), h('small', null, t('creatures'))),
      ),
      h('p', { class: 'muted' }, t("It now makes ✨{rate}/hour for you, even while you're away.", { rate: planetRate(out.entry) })),
      ...extras,
      btn(t('📮 Share postcard'), 'ghost wide small-btn', () =>
        sharePostcard(
          r.planet,
          {
            title: r.level.name,
            subtitle: tp(
              r.planet.speciesFound.length,
              'Planet {planet} · {n} creature · {score} life',
              'Planet {planet} · {n} creatures · {score} life',
              {
                planet: n,
                score: r.score,
              },
            ),
            stars: r.stars,
            glow: app.skinGlow(),
          },
          t('I grew {score} life on {name} in Pocket Planet! 🪐', { score: r.score, name: r.level.name }),
        ),
      ),
      h(
        'div',
        { class: 'row' },
        btn(t('Galaxy'), 'ghost', home),
        btn(t('Next ▶'), 'primary', () => {
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
