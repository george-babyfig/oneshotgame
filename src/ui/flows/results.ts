import { BOSS_REWARD } from '../../meta/tuning';
// After a won level: record it, celebrate, and point at what's next.
import { h, btn, fmt, modal } from '../dom';
import { sfx } from '../audio';
import { planetRate, applyLevelWin } from '../../meta/economy';
import { applyReward, chestsReady, roadReady } from '../../meta/progression';
import { recordWishRound, wishClaimable } from '../../meta/wishes';
import { today } from '../../meta/profile';

/** First-time reward for defeating a planet's Comet Guardian. */
export { BOSS_REWARD } from '../../meta/tuning';

import { FINISH_DUST_PER_THROW, type LevelResult } from '../game';
import type { App } from '../app';
import { sharePostcard } from '../postcard';
import { addTokens, ensureEvent, eventActive, eventReady } from '../../meta/events';
import { t, tp } from '../../i18n';
import { homeUnlocked, speedUpBuilds } from '../../meta/homeworld';
import { MAT_EMOJI, addDrops, dropsFor, type Mat } from '../../meta/constellations';
import { renderPlanet } from '../art/planet';
import { unlocked } from '../../meta/unlocks';
import { SPECIES_BY_ID } from '../../core/world';
import { critterCanvas, critterSilhouetteCanvas, animateCreatureGallery, type CreaturePose } from '../art/critters';
import { haptic } from '../haptics';
import { celebrate } from '../celebrate';
import { effectiveReduceMotion } from '../motion';
import { countUp, flyReward } from '../motion';
import { takeRoundDiscoveries } from '../hud';
import { rarityName } from '../text';

export function levelResults(app: App, r: LevelResult) {
  const p = app.p;
  const n = r.level.n;
  const firstEverWin = p.stats.wins === 0;
  const newCreature = takeRoundDiscoveries(app.scene)[0];
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
  recordWishRound(p, 'campaign', r.planet, today(), r.level.start);
  if (out.newStars && eventActive(p) && ensureEvent(p).stars) addTokens(p, out.newStars * 4);
  p.tutorial = true;
  app.saveNow();
  app.syncGameCenter();
  const extras: HTMLElement[] = [];
  if (chestsReady(p).length) extras.push(h('div', { class: 'nudge' }, t('🎁 Chapter chest ready on the Star Map!')));
  if (unlocked(p, 'star_road') && roadReady(p).length) extras.push(h('div', { class: 'nudge' }, t('🛣️ New Star Road reward!')));
  if (eventActive(p) && eventReady(p).length)
    extras.push(h('div', { class: 'nudge' }, t('{emoji} Event reward ready!', { emoji: ensureEvent(p).emoji })));
  if (unlocked(p, 'quests') && wishClaimable(p)) extras.push(h('div', { class: 'nudge' }, t('A Wish is ready to claim!')));
  // materials for the constellations (from the lands on this planet)
  const drops = dropsFor(r.planet, r.stars);
  if (Object.keys(drops).length) {
    addDrops(p, drops, out.firstClear ? 'material_drop_first_clear' : 'material_drop_replay');
    app.save();
  }
  if (r.boss && !p.bosses.includes(n)) {
    p.bosses.push(n);
    applyReward(p, BOSS_REWARD, 'boss');
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
  };
  const dustValue = h('b', { 'aria-label': `✨ ${fmt(out.dust)}` }, `✨ ${fmt(out.dust)}`);
  const gemValue = h('b', { 'aria-label': `💎 ${out.gems}` }, `💎 ${out.gems}`);
  const rewards = [
    h('div', null, dustValue, h('small', null, t('stardust'))),
    ...(out.gems ? [h('div', null, gemValue, h('small', null, t('3-star bonus')))] : []),
    ...(n < 5 || !Object.keys(drops).length
      ? [h('div', null, h('b', null, `${r.planet.speciesFound.length}`), h('small', null, t('creatures')))]
      : []),
    ...(n >= 5 && Object.keys(drops).length
      ? [
          h(
            'div',
            { class: 'drops' },
            h('small', null, t('Materials')),
            ...Object.entries(drops).map(([m, count]) => h('span', null, `${MAT_EMOJI[m as Mat]} ${count}`)),
          ),
        ]
      : []),
  ].slice(0, 3);
  const planetCanvas = h('canvas', { class: 'purpose-planet', 'aria-hidden': 'true' });
  planetCanvas.width = 140;
  planetCanvas.height = 140;
  const g = planetCanvas.getContext('2d');
  if (g) renderPlanet(g, r.planet, { cx: 70, cy: 70, R: 46, rot: 0, time: 0, glow: app.skinGlow(), lifeK: 1, simple: true });
  const starEls = [0, 1, 2].map((i) => h('span', { class: i < r.stars ? 'on celebrate-star' : '' }, '★'));
  const creature = newCreature && SPECIES_BY_ID[newCreature];
  const creatureCanvas = creature ? critterCanvas(creature.id, 100) : null;
  const creatureCard = creature
    ? h(
        'div',
        { class: 'celebrate-creature' },
        h('div', { class: 'celebrate-spotlight' }, critterSilhouetteCanvas(creature.id, 100), creatureCanvas),
        h('div', null, h('small', null, t('New creature · {r}', { r: rarityName(creature.rarity) })), h('b', null, t(creature.name))),
      )
    : null;
  let pose: CreaturePose = 'idle';
  let stopDance = () => {};
  const cancelCounts: (() => void)[] = [];
  let show: ReturnType<typeof celebrate> | null = null;
  const m = modal(
    [
      h('div', { class: 'm-title' }, out.firstClear ? t('Planet added to your galaxy!') : t('Planet improved!')),
      h('div', { class: 'end-stars' }, ...starEls),
      h(
        'div',
        { class: 'celebrate-result-topbar topbar' },
        h('span', { class: 'pill dust' }, `✨ ${fmt(p.dust)}`),
        h('span', { class: 'pill gems' }, `💎 ${fmt(p.gems)}`),
      ),
      firstEverWin
        ? h(
            'div',
            { class: 'purpose-orbit' },
            planetCanvas,
            h('span', { class: 'purpose-dust', 'aria-hidden': 'true' }, '✨'),
            h('p', null, t('Your planet now makes stardust for you.')),
          )
        : null,
      h('div', { class: 'rewards' }, ...rewards),
      creatureCard,
      firstEverWin
        ? null
        : h('p', { class: 'muted' }, t("It now makes ✨{rate}/hour for you, even while you're away.", { rate: planetRate(out.entry) })),
      ...extras,
      firstEverWin
        ? null
        : btn(t('📮 Share postcard'), 'ghost wide small-btn', () =>
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
          show?.skip();
          m.close();
          if (out.firstClear && (n === 2 || n === 5)) app.showHome();
          else if (out.firstClear && n <= 3) app.startLevel(p.level);
          else app.preLevel(p.level);
        }),
      ),
    ],
    { dismiss: false, cls: firstEverWin ? 'first-win' : '', onClose: () => (show?.skip(), stopDance()) },
  );
  if (creatureCanvas && creature) {
    stopDance = animateCreatureGallery([{ canvas: creatureCanvas, id: creature.id, pose: () => pose }], effectiveReduceMotion(p));
  }
  const count = (el: HTMLElement, icon: string, amount: number, instant: boolean) => {
    if (instant) el.textContent = `${icon} ${fmt(amount)}`;
    else cancelCounts.push(countUp(el, 0, amount, `${icon} `));
  };
  show = celebrate('results', {
    root: m.el,
    reduceMotion: effectiveReduceMotion(p),
    firstEver: firstEverWin,
    duration: firstEverWin ? 2600 : 1850,
    beats: [
      ...starEls.slice(0, r.stars).map((el, i) => ({
        at: 120 + i * 240,
        play: (instant: boolean) => {
          el.classList.add('stamped');
          if (!instant) {
            sfx.star(i);
            sfx.impact('rock');
            haptic.medium();
          }
        },
      })),
      {
        at: 850,
        play: (instant: boolean) => {
          count(dustValue, '✨', out.dust, instant);
          if (out.gems) count(gemValue, '💎', out.gems, instant);
          if (!instant) sfx.coin();
        },
      },
      {
        at: 1250,
        play: (instant: boolean) => {
          if (instant) return;
          void flyReward(planetCanvas, 'dust', out.dust);
          if (out.gems) void flyReward(planetCanvas, 'gems', out.gems);
        },
      },
      ...(creatureCard
        ? [
            {
              at: firstEverWin ? 1450 : 850,
              play: (instant: boolean) => {
                creatureCard.classList.add('revealed');
                pose = instant ? 'wave' : 'surprised';
                if (!instant) {
                  sfx.creature(true);
                  haptic.success();
                }
              },
            },
            { at: firstEverWin ? 1950 : 1350, play: () => (pose = 'happy') },
          ]
        : []),
    ],
    onComplete: () => {
      cancelCounts.forEach((cancel) => cancel());
      dustValue.textContent = `✨ ${fmt(out.dust)}`;
      gemValue.textContent = `💎 ${out.gems}`;
      stopDance();
    },
  });
}
