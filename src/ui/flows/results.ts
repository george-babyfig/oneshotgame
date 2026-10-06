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
import { planetName, t, tp } from '../../i18n';
import { homeUnlocked, speedUpBuilds } from '../../meta/homeworld';
import { addDrops, essenceDropsFor } from '../../meta/constellations';
import { essenceLine, helpedLine } from '../../meta/helped';
import { renderPlanet } from '../art/planet';
import { unlocked } from '../../meta/unlocks';
import { SPECIES_BY_ID } from '../../core/world';
import { critterCanvas, critterSilhouetteCanvas, animateCreatureGallery, type CreaturePose } from '../art/critters';
import { haptic } from '../haptics';
import { celebrate } from '../celebrate';
import { effectiveReduceMotion } from '../motion';
import { countUp, flyReward } from '../motion';
import { showBestCombo, takeRoundDiscoveries } from '../hud';
import { rarityName } from '../text';
import { recordCombo, recordReaction } from '../../meta/reactions';
import { REACTIONS, rulesForLevel, type ReactionId } from '../../core/round';
import { reactionCanvas, reactionPair } from '../art/reactions';
import { CONTINUE_COST, CONTINUE_THROWS } from '../../meta/continues';
import { ledger } from '../../meta/ledger';
import { failureFacts, giftFromBuddy, tipFor, type HelpRung } from '../../meta/help';
import { goalProgress } from '../../core/levels';
import { waysToEarnGems } from './earn';
import { toast } from '../dom';
import type { LevelScene } from '../game';

const rungKey = (rung: HelpRung) =>
  (
    ({
      whatHappened: 'what_happened',
      tip: 'tip',
      buddyThrows: 'buddy_throws',
      hintTry: 'hint_try',
    }) as const
  )[rung];

/** Campaign help owns the fail card; the paid continue keeps its existing eligibility and price. */
export function helpEndModal(scene: LevelScene, rungs: HelpRung[]) {
  const rung = rungs.at(-1)!;
  const key = rungKey(rung);
  ledger.count(`help_${key}_shown`);
  scene.roundLog.missedGoals = scene.L.goals.filter((goal) => goalProgress(scene.planet, goal) < goal.count);
  const facts = failureFacts(scene.roundLog);
  const buddyGift = giftFromBuddy(!!scene.o.buddy);
  const canContinue = scene.leftover === 0 && !!scene.o.continueOk?.(false);
  const retry = () => {
    ledger.count(`help_${key}_used`);
    ledger.count('help_used');
    card.close();
    scene.modalOpen = null;
    scene.finish(0);
  };
  const continueRound = () => {
    if (!scene.o.continueOk?.(false)) return;
    if (!scene.o.spendGems(CONTINUE_COST)) {
      sfx.error();
      toast(t('Not enough gems yet'), 'bad');
      return;
    }
    card.close();
    scene.modalOpen = null;
    ledger.count('continues_bought');
    scene.o.onContinue?.();
    scene.throwsLeft += CONTINUE_THROWS;
    scene.throwsTotal += CONTINUE_THROWS;
    sfx.gem();
    haptic.success();
    scene.renderHud();
  };
  const helpTitle =
    rung === 'tip'
      ? t('A little tip')
      : rung === 'buddyThrows'
        ? buddyGift
          ? t('A gift from your Buddy')
          : t('A gift from the Keeper')
        : t('Show me where');
  const content = [
    ...facts.map((fact) => h('p', { class: 'end-need' }, fact)),
    ...(rung === 'whatHappened'
      ? []
      : [
          h('div', { class: 'm-title' }, helpTitle),
          h(
            'p',
            { class: 'end-need' },
            rung === 'tip'
              ? tipFor(scene.L)
              : rung === 'buddyThrows'
                ? buddyGift
                  ? t('Your Buddy brings 2 extra throws for this attempt.')
                  : t('Here, try these! 2 extra throws for this attempt.')
                : t('Three places will glow on your next try.'),
          ),
        ]),
  ];
  const card = modal(
    [
      h('div', { class: 'end-title lost' }, t('Out of throws')),
      h('div', { class: 'm-sub' }, t('What happened')),
      ...content,
      btn(t('Try again'), 'primary wide', retry),
      canContinue ? btn(t('+5 throws · 💎{n}', { n: CONTINUE_COST }), 'ghost small', continueRound) : null,
      canContinue && scene.o.gems() < CONTINUE_COST ? btn(t('Ways to earn gems'), 'ghost small', () => waysToEarnGems()) : null,
    ],
    { dismiss: false, cls: 'end help-card' },
  );
  scene.modalOpen = card;
}

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
  const newReactions: ReactionId[] = [];
  if (!r.reactionRecorded) for (const id of r.reactionEvents ?? r.reactions ?? []) if (recordReaction(p, id).first) newReactions.push(id);
  if (!r.comboRecorded) for (const event of r.comboEvents ?? []) recordCombo(p, event.links, event.reaction, event.superFusion);
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
  // The campaign is the only Essence source; a replay pays half per colour.
  const drops = essenceDropsFor(r.planet, r.stars, out.firstClear);
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
    ...(n < 6 || !Object.keys(drops).length
      ? [h('div', null, h('b', null, `${r.planet.speciesFound.length}`), h('small', null, t('creatures')))]
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
  const fusionCards = newReactions.map((id) =>
    h(
      'div',
      { class: `result-fusion ${REACTIONS[id].kind}` },
      reactionCanvas(id, 44),
      h(
        'div',
        null,
        h('small', null, REACTIONS[id].kind === 'fusion' ? t('NEW FUSION') : t('NEW CLASH')),
        h('b', null, t(REACTIONS[id].name)),
        reactionPair(id, 25),
        h(
          'span',
          null,
          REACTIONS[id].kind === 'fusion'
            ? t('+50 stardust · new sticker!')
            : t('It dries the land and hurts the planet. Watch for the red outline on the planet.'),
        ),
      ),
    ),
  );
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
      app.scene && helpedLine(p, app.scene.roundLog, 'campaign')
        ? h('p', { class: 'homeworld-helped' }, t('Homeworld helped: {line}', { line: helpedLine(p, app.scene.roundLog, 'campaign')! }))
        : null,
      n >= 6 && Object.keys(drops).length ? h('p', { class: 'drops essence-progress' }, essenceLine(p, drops)) : null,
      showBestCombo(r.comboBest ?? 0, rulesForLevel(r.level.n))
        ? h('p', { class: 'end-combo' }, t('Best Combo: {n}', { n: r.comboBest ?? 0 }))
        : null,
      showBestCombo(r.comboBest ?? 0, rulesForLevel(r.level.n)) && r.comboIcons?.length
        ? h('div', { class: 'result-combo-chain', 'aria-hidden': 'true' }, ...r.comboIcons.slice(0, 4).map((id) => reactionCanvas(id, 28)))
        : null,
      ...fusionCards,
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
                title: planetName(r.level.name),
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
              t('I grew {score} life on {name} in Comet Garden! ☄️', { score: r.score, name: planetName(r.level.name) }),
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
  fusionCards.forEach((card, index) => {
    if (REACTIONS[newReactions[index]].kind === 'clash') return;
    celebrate('fusion', {
      root: card,
      reduceMotion: effectiveReduceMotion(p),
      duration: 1200,
      beats: [
        {
          at: 120,
          play: (instant) => {
            if (!instant) {
              sfx.reaction(REACTIONS[newReactions[index]].kind);
              if (REACTIONS[newReactions[index]].kind === 'fusion') haptic.combo();
            }
          },
        },
      ],
    });
  });
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
