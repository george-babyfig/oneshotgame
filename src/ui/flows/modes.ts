// Modes hub: Daily Planet, Meteor Rush, Zen Garden and Challenge a Friend.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx, setMusicTheme } from '../audio';
import { haptic } from '../haptics';
import { LevelScene, type LevelResult } from '../game';
import { starsFor, type LevelDef } from '../../core/levels';
import { clonePlanet } from '../../core/world';
import { today } from '../../meta/profile';
import {
  RUSH_BEST_GEMS,
  RUSH_SECONDS,
  challengeLevel,
  challengeShareText,
  dailyLevel,
  dailyNumber,
  dailyShareText,
  decodeChallenge,
  encodeChallenge,
  newChallengeSeed,
  recordChallenge,
  recordDaily,
  recordRush,
  rushLevel,
  rushSeed,
  zenLevel,
} from '../../meta/modes';
import { RANK_UNLOCKS, unlocked } from '../../meta/rank';
import { shareText } from '../share';
import { NO_BOOSTERS, type App } from '../app';
import { t } from '../../i18n';
import { gcScore } from '../gamecenter';

type Mode = 'daily' | 'rush' | 'zen' | 'challenge';

const INFO: Record<Mode, { emoji: string; name: string; desc: string; rank: number }> = {
  daily: { emoji: '📅', name: 'Daily Planet', desc: 'Everyone gets the same planet today. Share your result!', rank: 2 },
  rush: { emoji: '☄️', name: 'Meteor Rush', desc: '{n} seconds, unlimited throws. How much life can you grow?', rank: 3 },
  zen: { emoji: '🧘', name: 'Zen Garden', desc: 'No targets, no clock. A world of your own that stays between visits.', rank: 4 },
  challenge: { emoji: '🤝', name: 'Challenge a Friend', desc: 'Send a code, play the same planet, compare scores.', rank: 5 },
};

export function modesBadge(app: App) {
  const d = app.p.dailyPlanet;
  return unlocked(app.p, 'daily') && !(d.day === today() && d.rewarded) ? 1 : 0;
}

export function modesFlow(app: App) {
  const p = app.p;
  const d = p.dailyPlanet;
  const sub: Record<Mode, string> = {
    daily:
      d.day === today() && d.rewarded
        ? t('Done today · best {n} {stars}', { n: fmt(d.best), stars: '★'.repeat(d.stars) })
        : t('#{n} · 💎 up to {gems}', { n: dailyNumber(today()), gems: 20 }),
    rush: p.stats.rushBest ? t('Best {n} life', { n: fmt(p.stats.rushBest) }) : t('Earn stardust'),
    zen: p.zen ? t('Your garden is waiting') : t('Start a new garden'),
    challenge: t('{n} played', { n: p.challengeLog.length }),
  };
  const rows = (Object.keys(INFO) as Mode[]).map((mode) => {
    const i = INFO[mode];
    const open = unlocked(p, mode);
    return h(
      'button',
      {
        class: `mode${open ? '' : ' locked'}`,
        onclick: () => {
          sfx.click();
          if (!open) return toast(t('Reach Explorer Rank {n} to unlock {mode}', { n: i.rank, mode: t(RANK_UNLOCKS[i.rank]) }));
          m.close();
          startMode(app, mode);
        },
      },
      h('div', { class: 'mode-ic' }, open ? i.emoji : '🔒'),
      h(
        'div',
        { class: 'mode-body' },
        h('b', null, t(i.name)),
        h('small', null, open ? t(i.desc, { n: RUSH_SECONDS }) : t('Unlocks at Explorer Rank {n}', { n: i.rank })),
        open ? h('span', null, sub[mode]) : null,
      ),
    );
  });
  const m = modal([h('div', { class: 'm-title' }, t('Modes')), ...rows], { cls: 'tall' });
}

function startMode(app: App, mode: Mode) {
  if (mode === 'daily') return play(app, dailyLevel(today()), 'daily');
  if (mode === 'rush') return play(app, rushLevel(rushSeed()), 'rush');
  if (mode === 'zen') return play(app, zenLevel(app.p.zen), 'zen');
  challengeMenu(app);
}

function play(app: App, L: LevelDef, mode: Mode, vs?: { code: string; seed: string; score: number }) {
  const p = app.p;
  p.stats.plays++;
  const opts = app.sceneOpts(
    {
      label: {
        daily: t('Daily #{n}', { n: dailyNumber(today()) }),
        rush: t('Meteor Rush'),
        zen: t('Zen Garden'),
        challenge: vs?.score ? t('Beat {n}!', { n: vs.score }) : t('Challenge'),
      }[mode],
      competitive: mode !== 'zen',
      timeLimit: mode === 'rush' ? RUSH_SECONDS : undefined,
      endless: mode === 'zen',
      endLabel: t('See result'),
      onPlanet: mode === 'zen' ? (pl) => ((p.zen = clonePlanet(pl)), app.save()) : undefined,
      onEnd: (r) => modeEnded(app, mode, r, vs),
    },
    NO_BOOSTERS,
  );
  if (mode === 'zen') opts.onThrow = () => (p.stats.throws++, p.stats.zenThrows++);
  const scene = new LevelScene(L, opts);
  app.mount(scene.el, 'level');
  app.scene = scene;
  setMusicTheme({ daily: 'tide', rush: 'rush', zen: 'zen', challenge: 'storm' }[mode]);
}

function modeEnded(app: App, mode: Mode, r: LevelResult, vs?: { code: string; seed: string; score: number }) {
  const p = app.p;
  if (r.throwsUsed === -1) {
    // restart from the pause menu
    if (mode === 'daily') return play(app, dailyLevel(today()), mode);
    if (mode === 'rush') return play(app, rushLevel(rushSeed()), mode);
    if (mode === 'challenge' && vs) return play(app, challengeLevel(vs.seed), mode, vs);
    return play(app, zenLevel(p.zen), mode);
  }
  const stars = starsFor(r.score, r.level.stars);
  const again = () => (m.close(), startMode(app, mode === 'challenge' ? 'challenge' : mode));
  let body: (HTMLElement | null)[] = [];
  if (mode === 'daily') {
    const day = today();
    const gems = recordDaily(p, day, r.score, stars);
    gcScore('daily', r.score);
    body = [
      h('div', { class: 'm-title' }, t('Daily Planet #{n}', { n: dailyNumber(day) })),
      h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★'))),
      h('div', { class: 'end-score' }, t('{n} life', { n: fmt(r.score) })),
      gems
        ? h('div', { class: 'reward-list' }, h('span', null, `💎 ${gems}`))
        : h('p', { class: 'muted' }, t('Rewards are for your first finish each day.')),
      h('pre', { class: 'share-preview' }, dailyShareText(day, stars, r.score, r.planet)),
      btn(t('Share result'), 'gem wide', () => shareText(dailyShareText(day, stars, r.score, r.planet))),
    ];
  } else if (mode === 'rush') {
    const out = recordRush(p, r.score);
    body = [
      h('div', { class: 'm-title' }, out.best ? t('New best!') : t('Meteor Rush')),
      h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★'))),
      h('div', { class: 'end-score' }, t('{n} life', { n: fmt(r.score) })),
      h(
        'div',
        { class: 'reward-list' },
        h('span', null, `✨ ${fmt(out.dust)}`),
        out.best ? h('span', null, t('💎 {n} for a new best!', { n: RUSH_BEST_GEMS })) : null,
      ),
      h('p', { class: 'muted' }, t('Best: {n}', { n: fmt(p.stats.rushBest) })),
    ];
  } else if (mode === 'challenge' && vs) {
    const out = recordChallenge(p, vs.code, r.score, stars, vs.score);
    const myCode = encodeChallenge(vs.seed, r.score);
    body = [
      h(
        'div',
        { class: 'm-title' },
        vs.score ? (out.won ? t('You win! 🏆') : r.score === vs.score ? t("It's a tie!") : t('So close!')) : t('Challenge ready!'),
      ),
      vs.score
        ? h(
            'div',
            { class: 'versus' },
            h('div', null, h('small', null, t('You')), h('b', null, fmt(r.score))),
            h('i', null, t('vs')),
            h('div', null, h('small', null, t('Friend')), h('b', null, fmt(vs.score))),
          )
        : h('div', { class: 'end-score' }, t('{n} life', { n: fmt(r.score) })),
      out.gems
        ? h('div', { class: 'reward-list' }, h('span', null, `💎 ${out.gems}`), h('span', null, '✨ 50'))
        : h('div', { class: 'reward-list' }, h('span', null, '✨ 50')),
      h(
        'p',
        { class: 'muted' },
        vs.score
          ? t('Send your score back — can they beat it?')
          : t('Send this code to a friend. They play the same planet and try to beat you.'),
      ),
      h('div', { class: 'code' }, myCode),
      btn(t('Send challenge'), 'gem wide', () => shareText(challengeShareText(myCode, r.score, r.planet))),
    ];
  }
  app.save();
  app.syncGameCenter();
  sfx.win();
  haptic.success();
  const m = modal(
    [
      ...body,
      h(
        'div',
        { class: 'row' },
        btn(t('Home'), 'ghost', () => (m.close(), app.showHome())),
        btn(t('Play again'), 'primary', again),
      ),
    ],
    { dismiss: false },
  );
}

function challengeMenu(app: App) {
  const input = h('input', {
    class: 'code-input',
    placeholder: t('e.g. K7Q2M-5UA'),
    maxlength: '14',
    autocapitalize: 'characters',
    autocomplete: 'off',
    spellcheck: 'false',
  }) as HTMLInputElement;
  const m = modal([
    h('div', { class: 'm-title' }, t('Challenge a Friend')),
    h('p', { class: 'muted' }, t('Start a new challenge, or enter a code a friend sent you.')),
    btn(t('🎲 New challenge'), 'primary wide', () => {
      m.close();
      const seed = newChallengeSeed();
      play(app, challengeLevel(seed), 'challenge', { code: seed, seed, score: 0 });
    }),
    h('div', { class: 'sec-title' }, t('Have a code?')),
    input,
    btn(t('Play their planet'), 'gem wide', () => {
      const c = decodeChallenge(input.value);
      if (!c) {
        sfx.error();
        return toast(t("That code doesn't look right — check it and try again"), 'bad');
      }
      m.close();
      play(app, challengeLevel(c.seed), 'challenge', { code: input.value.trim().toUpperCase(), seed: c.seed, score: c.score });
    }),
  ]);
  setTimeout(() => input.focus(), 250);
}
