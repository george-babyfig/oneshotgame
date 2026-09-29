// Weekly Voyage: seven planets on a winding route; each shows its real starting
// planet. Tap the next stop to see its goals and set off.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx, setMusicTheme } from '../audio';
import { haptic } from '../haptics';
import { LevelScene, type LevelResult } from '../game';
import type { LevelDef } from '../../core/levels';
import { eventEndsIn } from '../../meta/events';
import {
  VOYAGE_LEN,
  VOYAGE_REWARDS,
  clearStop,
  ensureVoyage,
  voyageLevel,
  voyageName,
  voyageStars,
  voyageUnlocked,
} from '../../meta/voyage';
import { rewardText } from '../../meta/progression';
import { recordWishRound } from '../../meta/wishes';
import { today } from '../../meta/profile';
import { renderPlanet } from '../art/planet';
import { drawCreature } from '../art/critters';
import { SPECIES_BY_ID } from '../../core/world';
import { goalChips } from '../flows/prelevel';
import { NO_BOOSTERS, type App } from '../app';
import { getLang, t, tp } from '../../i18n';
import { rulesForLevel } from '../../core/round';
import { untilText } from '../../meta/dates';

// Levels are pure functions of week + base + stop, so cache them for the session.
const cache = new Map<string, LevelDef>();
function stopLevel(week: string, base: number, i: number, taught: number) {
  const key = `${week}|${base}|${i}|${taught}`;
  let L = cache.get(key);
  if (!L) {
    L = voyageLevel(week, base, i, taught);
    cache.set(key, L);
  }
  return L;
}

function thumb(L: LevelDef, px: number, dim: boolean) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * dpr);
  c.style.width = c.style.height = `${px}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  if (dim) g.globalAlpha = 0.45;
  renderPlanet(g, L.start, {
    cx: px / 2,
    cy: px / 2,
    R: px * 0.36 * L.size,
    rot: -Math.PI / 2,
    time: 0.8,
    glow: `hsl(${L.hue} 80% 65%)`,
    lifeK: 0.6,
    simple: true,
    creature: (gg, i, x, y, a) => {
      const sp = SPECIES_BY_ID[L.start.sectors[i].species!];
      if (sp) drawCreature(gg, sp.id, x, y, a + Math.PI / 2, px * 0.07, 0.5 + i);
    },
  });
  return c;
}

const X = [22, 60, 78, 44, 18, 52, 80];

export function showVoyage(app: App) {
  const p = app.p;
  const v = ensureVoyage(p);
  const now = Date.now();
  const until = untilText(now + eventEndsIn(new Date(now)), now, getLang());
  const untilLabel =
    until.key === 'until tonight'
      ? t('until tonight')
      : until.key === 'until {day}'
        ? t('until {day}', until.vars)
        : t('until {date}', until.vars);
  const stops = Array.from({ length: VOYAGE_LEN }, (_, i) => {
    const L = stopLevel(v.week, v.base, i, p.level);
    const open = voyageUnlocked(p, i);
    const s = v.stars[i] ?? 0;
    const last = i === VOYAGE_LEN - 1;
    return h(
      'button',
      {
        class: `vstop${open ? '' : ' locked'}${i === v.cleared ? ' current' : ''}${last ? ' boss' : ''}`,
        style: `--x:${X[i]}%`,
        onclick: () => {
          sfx.click();
          haptic.light();
          if (!open) return toast(t('Clear the stop before it first'));
          stopSheet(app, i);
        },
      },
      thumb(L, 76, !open),
      h('b', null, `${i + 1}. ${t(L.name)}`),
      h('small', null, open ? '★'.repeat(s) + '☆'.repeat(3 - s) : '🔒'),
      last ? h('span', { class: 'vboss' }, '☄️') : null,
    );
  });
  const done = v.cleared >= VOYAGE_LEN;
  app.mount(
    h(
      'div',
      { class: 'screen page voyage' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Weekly Voyage')),
      h(
        'div',
        { class: 'voy-head' },
        h('b', null, t(voyageName(v.week))),
        h('small', null, `${untilLabel} · ★ ${voyageStars(p)}/${VOYAGE_LEN * 3}`),
        h('div', { class: 'qbar' }, h('i', { style: `width:${(v.cleared / VOYAGE_LEN) * 100}%` })),
        h(
          'small',
          { class: 'muted' },
          done
            ? t('Voyage complete! A new route opens on Monday.')
            : t('{n} of {total} stops cleared. The last stop has a Comet Guardian!', { n: v.cleared, total: VOYAGE_LEN }),
        ),
      ),
      h(
        'div',
        { class: 'scroll' },
        h('div', { class: 'vroute' }, ...stops),
        h('p', { class: 'muted center' }, tp(p.voyageDone, '{n} voyage finished so far', '{n} voyages finished so far')),
      ),
    ),
    'voyage',
  );
  requestAnimationFrame(() => drawRoute(app));
}

/** A dotted route line through the stops (drawn once the layout is known). */
function drawRoute(app: App) {
  const route = app.host.querySelector<HTMLElement>('.vroute');
  if (!route) return;
  const box = route.getBoundingClientRect();
  const pts = [...route.querySelectorAll<HTMLElement>('.vstop canvas')].map((c) => {
    const b = c.getBoundingClientRect();
    return `${b.left + b.width / 2 - box.left},${b.top + b.height / 2 - box.top}`;
  });
  const cleared = app.p.voyage.cleared;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'vpath');
  svg.setAttribute('width', String(box.width));
  svg.setAttribute('height', String(box.height));
  const line = (list: string[], cls: string) => {
    if (list.length < 2) return;
    const pl = document.createElementNS(ns, 'polyline');
    pl.setAttribute('points', list.join(' '));
    pl.setAttribute('class', cls);
    svg.append(pl);
  };
  line(pts, 'todo');
  line(pts.slice(0, cleared + 1), 'done');
  route.prepend(svg);
}

function stopSheet(app: App, i: number) {
  const p = app.p;
  const v = p.voyage;
  const L = stopLevel(v.week, v.base, i, p.level);
  const first = i === v.cleared;
  const m = modal([
    h('div', { class: 'm-sub' }, t('{voyage} · Stop {n}', { voyage: t(voyageName(v.week)), n: i + 1 })),
    h('div', { class: 'm-title' }, t(L.name)),
    h('div', { class: 'vthumb' }, thumb(L, 120, false)),
    i === VOYAGE_LEN - 1 ? h('div', { class: 'twist-chip' }, t('☄️ Comet Guardian — hit it 3 times!')) : null,
    goalChips(L),
    h(
      'div',
      { class: 'targets' },
      ...L.stars.map((target, k) =>
        h(
          'div',
          { class: `tg${k < (v.stars[i] ?? 0) ? ' got' : ''}` },
          h('b', null, '★'.repeat(k + 1)),
          h('span', null, t('{n} life', { n: fmt(target) })),
        ),
      ),
    ),
    h(
      'p',
      { class: 'muted' },
      first ? t('Reward: {r}', { r: rewardText(VOYAGE_REWARDS[i]).join('  ') }) : t('Already cleared — replay for more stars.'),
    ),
    btn(tp(L.throws + p.upgrades.throws, 'Set off! · {n} throw', 'Set off! · {n} throws'), 'primary big wide', () => {
      m.close();
      play(app, i);
    }),
  ]);
}

function play(app: App, i: number) {
  const p = app.p;
  const v = p.voyage;
  const week = v.week;
  const L = stopLevel(week, v.base, i, p.level);
  p.stats.plays++;
  const opts = app.sceneOpts(
    'voyage',
    {
      rules: rulesForLevel(Math.min(L.n, p.level)),
      label: t('Voyage · Stop {n}', { n: i + 1 }),
      onEnd: (r) => ended(app, i, week, r),
    },
    NO_BOOSTERS,
  );
  const scene = new LevelScene(L, opts);
  app.mount(scene.el, 'level');
  app.scene = scene;
  setMusicTheme('voyage');
}

function ended(app: App, i: number, week: string, r: LevelResult) {
  const p = app.p;
  if (r.throwsUsed === -1) return play(app, i);
  // The saved route changed while this stop was open.
  if (p.voyage.week !== week) {
    showVoyage(app);
    return toast(t('A new Voyage has begun!'));
  }
  if (!r.won) {
    showVoyage(app);
    stopSheet(app, i);
    return;
  }
  const res = clearStop(p, i, r.stars);
  recordWishRound(p, 'voyage', r.planet, today(), r.level.start);
  app.save();
  sfx.win();
  haptic.success();
  const next = i + 1 < VOYAGE_LEN && voyageUnlocked(p, i + 1);
  showVoyage(app);
  const m = modal([
    h('div', { class: 'm-title' }, res.done ? t('Voyage complete! 🚀') : t('Stop cleared!')),
    h('div', { class: 'end-stars' }, ...[0, 1, 2].map((k) => h('span', { class: k < r.stars ? 'on' : '' }, '★'))),
    h('div', { class: 'end-score' }, t('{n} life', { n: fmt(r.score) })),
    res.reward ? h('div', { class: 'reward-list' }, ...rewardText(res.reward).map((x) => h('span', null, x))) : null,
    r.boss ? h('div', { class: 'nudge boss' }, t('☄️ Guardian defeated!')) : null,
    res.done
      ? h(
          'p',
          { class: 'muted' },
          tp(
            p.voyageDone,
            'You have finished {n} voyage. Check your Sticker Album!',
            'You have finished {n} voyages. Check your Sticker Album!',
          ),
        )
      : null,
    next
      ? btn(t('Next stop ▶'), 'primary big wide', () => {
          m.close();
          stopSheet(app, i + 1);
        })
      : null,
    btn(t('Voyage map'), next ? 'ghost wide' : 'primary wide', () => m.close()),
  ]);
}
