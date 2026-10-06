import { h, btn, fmt, toast } from '../../dom';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import {
  BUILDINGS,
  BUILDING_TYPES,
  BUILD_TIME,
  anyReady,
  build,
  buildCost,
  busyDrones,
  canBuild,
  canUpgrade,
  chooseGreenhouse,
  collectAll,
  denCapacity,
  drones,
  effLevel,
  expeditionBack,
  expeditionOptions,
  isFull,
  ready,
  tickHome,
  upgrade,
  type BuildingType,
} from '../../../meta/homeworld';
import { drawStructure } from '../../art/structures';
import { constellationsReady } from '../../../meta/constellations';
import { getLang, t } from '../../../i18n';
import { whenText } from '../../../meta/dates';
import { canvasDpr } from '../../devcapture';
import { KINDS, type Kind } from '../../../core/world';
import { MATS, MAT_EMOJI } from '../../../meta/constellations';
import { labLevel, labPlot, labBuildCost, canBuildLab, canLevelLab, buildLab } from '../../../meta/labs';
import { firstHourStep } from '../../../meta/firsthour';
import { LAB_NAME, LAB_LEVEL, LAB_TEXT } from '../../../meta/labcopy';
import { labCard } from '.././labcard';
import { showLaunchBay } from '.././launchbay';
import { homeworldNextUp } from '../../../meta/nextup';
import { LANDMARKS } from '../../../meta/tuning';
import { activeLandmark, landmarkOpen, landmarkState } from '../../../meta/landmarks';
import { unlocked } from '../../../meta/unlocks';
import {
  firstHourSheet,
  residentsSheet,
  expeditionSheet,
  levelSheet,
  levelChecklist,
  paintSheet,
  photoMode,
  REASON,
  gotText,
  homeworldListSheet,
  landSheet,
  landmarkSheet,
  landmarkStageLabel,
  isleDecorationSheet,
  isleDecorationName,
} from './sheets';
import type { App } from '../../app';
import type { HomeworldLevel } from '../../../meta/homeworldTypes';

export function fmtTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return t('{n}s', { n: s });
  const m = Math.ceil(s / 60);
  if (m < 60) return t('{n}m', { n: m });
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? t('{h}h {m}m', { h: hh, m: mm }) : t('{h}h', { h: hh });
}

const iconCache = new Map<string, string>();
function structIcon(type: BuildingType, lv: number, px: number, kind?: Kind) {
  const key = `${type}:${lv}:${px}:${kind ?? ''}:${canvasDpr()}`;
  const cached = iconCache.get(key);
  if (cached) {
    const img = document.createElement('img');
    img.src = cached;
    img.width = img.height = px;
    img.alt = '';
    return img;
  }
  const dpr = canvasDpr();
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(px * dpr);
  cv.style.width = cv.style.height = `${px}px`;
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  g.translate(px / 2, px * 0.9);
  drawStructure(g, type, lv, px * 0.95, 0.4, false, { kind });
  const img = document.createElement('img');
  img.src = cv.toDataURL();
  img.width = img.height = px;
  img.alt = '';
  iconCache.set(key, img.src);
  return img;
}

export interface HomeworldPanelContext {
  app: App;
  canvas: HTMLCanvasElement;
  panel: HTMLElement;
  levelBadge: HTMLButtonElement;
  pouchHeader: HTMLButtonElement;
  plotButtons: HTMLButtonElement[];
  selected: number;
  moving: number;
  readonly geo: { cx: number; cy: number; R: number; w: number; h: number };
  schedule: () => void;
  burst: (x: number, y: number, color: string) => void;
  surf: (a: number, out?: number) => { x: number; y: number };
  plotAngle: (i: number) => number;
  doCollect: (i: number) => boolean;
  reopen: () => void;
}

export function createPanel(ctx: HomeworldPanelContext) {
  const { app, canvas, panel, levelBadge, pouchHeader, plotButtons, schedule, burst, surf, plotAngle, doCollect } = ctx;
  const p = app.p;
  const home = p.home;
  // ---------------------------------------------------------------- panel
  /** Labels that change when a build or expedition completes. */
  let live: (() => void)[] = [];
  let lastSig = '';
  /** Re-render when an action becomes available. */
  const signature = () => {
    const now = Date.now();
    return JSON.stringify([
      ctx.selected,
      ctx.moving,
      p.dust,
      p.gems,
      p.mats,
      p.lab,
      home.firstHour,
      home.level,
      home.residents.length,
      !!home.expedition,
      expeditionBack(home, now),
      home.plots.map((b, i) => (b ? [b.type, b.lv, !!b.done && b.done > now, ready(home, i, now)] : 0)),
    ]);
  };
  const tickPanel = () => {
    tickHome(p);
    if (signature() !== lastSig) {
      renderPanel();
      schedule();
    } else live.forEach((f) => f());
  };
  const liveText = (el: HTMLElement, text: () => string) => {
    live.push(() => (el.textContent = text()));
    return el;
  };

  function renderPanel() {
    schedule();
    const now = Date.now();
    tickHome(p, now);
    live = [];
    lastSig = signature();
    // keep the top bar's stardust/gems in step with what the panel just did
    const bar = canvas.parentElement?.querySelector('.topbar');
    if (bar) bar.replaceWith(app.topBar(app.canGoBack()));
    levelBadge.textContent = t('Level {n}', { n: home.level });
    levelBadge.setAttribute(
      'aria-label',
      home.level >= 5 ? t('Homeworld Level 5, fully grown') : t('Homeworld Level {n}. See the next level', { n: home.level }),
    );
    pouchHeader.textContent = MATS.map((mat) => `${MAT_EMOJI[mat]}${fmt(p.mats[mat] ?? 0)}`).join(' ');
    plotButtons.forEach((button, index) => {
      const building = home.plots[index];
      const description =
        building?.type === 'lab' && building.kind
          ? t('{name}, level {level}', { name: t(LAB_NAME[building.kind]), level: labLevel(p, building.kind) })
          : building
            ? t('{name}, level {level}', { name: t(BUILDINGS[building.type].name), level: building.lv })
            : t('Empty plot');
      button.setAttribute('aria-label', t('Plot {n}: {description}', { n: index + 1, description }));
    });
    const kids: (HTMLElement | null)[] = [];
    const i = ctx.selected;
    const b = i >= 0 ? home.plots[i] : null;
    if (ctx.moving >= 0) {
      kids.push(h('div', { class: 'hw-title' }, t('Moving {name}', { name: t(BUILDINGS[home.plots[ctx.moving]!.type].name) })));
      kids.push(h('p', { class: 'muted' }, t('Tap an empty plot to move it there.')));
      kids.push(btn(t('Cancel'), 'ghost wide', () => ((ctx.moving = -1), renderPanel())));
    } else if (i < 0) {
      // overview
      if (firstHourStep(p) !== 'done')
        kids.push(
          btn(t(firstHourStep(p) === 'lab' ? LAB_TEXT.firstLab : LAB_TEXT.firstFriend), 'primary wide', () =>
            firstHourSheet(app, renderPanel),
          ),
        );
      kids.push(
        h(
          'div',
          { class: 'row hw-primary-actions' },
          btn(t('Collect all'), `primary${anyReady(home, now) ? '' : ' dim'}`, () => {
            const c = collectAll(p, now);
            if (!c.dust && !c.gems && !Object.keys(c.boosters).length) return toast(t('Nothing to collect yet'));
            burst(ctx.geo.cx, ctx.geo.cy - ctx.geo.R, '#ffd76a');
            sfx.coin();
            haptic.success();
            toast(gotText(c), 'good');
            app.save();
            renderPanel();
          }),
          btn(t('Friends'), 'ghost', () => residentsSheet(app, renderPanel)),
        ),
      );
      const busy = busyDrones(home, now);
      kids.push(
        h(
          'div',
          { class: 'hw-stats' },
          h('span', null, `🛸 ${drones(p) - busy}/${drones(p)}`, h('small', null, t('drones free'))),
          h('span', null, `🏡 ${home.residents.length}/${denCapacity(home)}`, h('small', null, t('friends'))),
        ),
      );
      kids.push(h('p', { class: 'muted hw-hint' }, t('Drag to spin your planet. Tap a plot to build.')));
      kids.push(
        btn(t('Homeworld list'), 'ghost wide', () =>
          homeworldListSheet(
            app,
            (index) => {
              ctx.selected = index;
              renderPanel();
            },
            renderPanel,
          ),
        ),
      );
      kids.push(
        h(
          'div',
          { class: 'hw-land-summary' },
          h('b', null, t('Lands')),
          btn(t('Choose lands'), 'ghost', () => landSheet(app, 0, renderPanel)),
        ),
      );
      if (p.level >= 30)
        kids.push(
          h(
            'details',
            { class: 'hw-landmark-summary' },
            h('summary', null, t('Landmarks')),
            ...LANDMARKS.filter((site) => home.level >= site.level).map((site) => {
              const state = landmarkState(p, site.id);
              return btn(
                t('{name} · {stage}', { name: t(site.name), stage: landmarkStageLabel(state.stage) }),
                landmarkOpen(p, site.id) ? 'ghost wide' : 'ghost wide dim',
                () => landmarkSheet(app, site.id, renderPanel),
              );
            }),
          ),
        );
      if (landmarkState(p, 'sky_bridge').stage === 4)
        kids.push(
          h(
            'details',
            { class: 'hw-landmark-summary' },
            h('summary', null, t('Floating Isle')),
            ...home.isleDecor.map((id, spot) =>
              btn(t('Isle spot {n}: {name}', { n: spot + 1, name: isleDecorationName(id) }), 'ghost wide', () =>
                isleDecorationSheet(app, spot, renderPanel),
              ),
            ),
          ),
        );
      const next = homeworldNextUp(p, now);
      const nextPlot = home.plots.findIndex((b, index) => !!b && ((!!b.done && b.done <= now) || ready(home, index, now) > 0));
      // Next Up sits directly below the canvas; the main actions follow, and the longer Overview comes last.
      const nextUpButton = btn(
        h('span', { class: 'stack' }, h('b', null, t('Next Up')), h('small', null, next.title), h('small', null, next.subtitle)),
        'ghost wide hw-next-up',
        () => {
          if (firstHourStep(p) !== 'done') firstHourSheet(app, renderPanel);
          else if (next.homeTarget === 'landmark') {
            const site = activeLandmark(p);
            if (site) landmarkSheet(app, site.id, renderPanel);
          } else if (next.homeTarget === 'level') levelSheet(app, ctx.reopen);
          else if (next.homeTarget === 'lab') {
            const kind = (Object.keys(KINDS) as Kind[]).find((item) => canLevelLab(p, item) === 'ok');
            const plot = kind ? labPlot(p, kind) : -1;
            if (plot >= 0) {
              ctx.selected = plot;
              renderPanel();
            }
          } else if (next.homeTarget === 'launcher') showLaunchBay(app);
          else if (next.homeTarget === 'celebration') ctx.reopen();
          else if (nextPlot >= 0) {
            ctx.selected = nextPlot;
            renderPanel();
          } else if (next.homeTarget === 'planet') app.showStarMap();
          else levelSheet(app, ctx.reopen);
        },
      );
      kids.unshift(nextUpButton);
      kids.push(
        h(
          'div',
          { class: 'hw-overview' },
          h('div', { class: 'sec-title' }, t('Overview')),
          home.level < 5
            ? h('div', null, h('p', { class: 'muted' }, t('Next Level checklist')), levelChecklist(app, (home.level + 1) as HomeworldLevel))
            : null,
          h('p', { class: 'muted' }, t('For your next throw')),
          ...(Object.keys(LAB_NAME) as Kind[]).map((kind) =>
            h(
              'div',
              { class: 'hw-lab-summary' },
              h('b', null, t(LAB_NAME[kind]), labPlot(p, kind) >= 0 ? ` · ${t('Lv {n}', { n: labLevel(p, kind) })}` : ''),
              h(
                'small',
                null,
                labPlot(p, kind) >= 0
                  ? t(labLevel(p, kind) === 1 ? KINDS[kind].stats.job : LAB_LEVEL[kind][labLevel(p, kind) as 2 | 3 | 4 | 5])
                  : !unlocked(p, kind)
                    ? t(LAB_TEXT.unlockPlanet, { n: KINDS[kind].unlock })
                    : t('Build this Lab to help your shots'),
              ),
            ),
          ),
          ...[
            ...new Set(
              home.plots.filter((building): building is NonNullable<typeof building> => !!building).map((building) => building.type),
            ),
          ]
            .filter((type) => type !== 'lab')
            .map((type) =>
              h(
                'div',
                { class: 'hw-lab-summary' },
                h('b', null, t(BUILDINGS[type].name)),
                h(
                  'small',
                  null,
                  type === 'greenhouse'
                    ? t('Grows a booster for a future throw')
                    : type === 'den'
                      ? unlocked(p, 'buddy')
                        ? t('Friends can join your throw as a Buddy')
                        : t('Friends can live in your Den')
                      : type === 'launch_bay'
                        ? unlocked(p, 'launcher_swoop')
                          ? t('Choose the launcher for your next throw')
                          : t('Launchers open as you finish planets')
                        : t('Makes your Homeworld your own'),
                ),
              ),
            ),
        ),
      );
      kids.push(
        h(
          'div',
          { class: 'row' },
          liveText(
            btn(expeditionLabel(), expeditionBack(home, now) ? 'gem' : 'ghost', () => expeditionSheet(app, renderPanel)),
            expeditionLabel,
          ),
          btn(home.level >= 5 ? t('Fully grown') : t('Next Level'), 'ghost', () => levelSheet(app, ctx.reopen)),
        ),
      );
      kids.push(
        h(
          'div',
          { class: 'row' },
          btn(t('🎨 Paint'), 'ghost', () => paintSheet(app)),
          btn(t('📷 Photo'), 'ghost', () => photoMode(app, canvas)),
        ),
      );
      kids.push(btn(`✨ ${t('Star Atlas')}${constellationsReady(p) ? ' •' : ''}`, 'ghost wide', () => app.showSky()));
    } else if (!b) {
      kids.push(h('div', { class: 'hw-title' }, t('Empty plot')));
      kids.push(
        h(
          'div',
          { class: 'hw-build' },
          ...(Object.keys(KINDS) as Kind[])
            .filter((kind) => labPlot(p, kind) < 0)
            .map((kind) => {
              const check = canBuildLab(p, i, kind, now);
              const locked = check === 'locked';
              const cost = labBuildCost(p, kind);
              return h(
                'button',
                {
                  class: `hw-opt lab-opt${check === 'ok' ? '' : ' no'}${locked ? ' locked' : ''}`,
                  onclick: () => {
                    const result = buildLab(p, i, kind, Date.now());
                    if (result !== 'ok') return toast(t(locked ? LAB_TEXT.unlockPlanet : REASON[result], { n: KINDS[kind].unlock }));
                    firstHourStep(p);
                    sfx.chest();
                    haptic.success();
                    app.save();
                    renderPanel();
                  },
                },
                structIcon('lab', 1, 54, kind),
                h('b', null, t(LAB_NAME[kind])),
                h(
                  'small',
                  null,
                  locked ? t(LAB_TEXT.unlockPlanet, { n: KINDS[kind].unlock }) : cost ? `✨${fmt(cost)}` : t(LAB_TEXT.firstFree),
                ),
              );
            }),
          ...BUILDING_TYPES.filter(
            (type) =>
              type !== 'lab' &&
              type !== 'mill' &&
              type !== 'grove' &&
              type !== 'observatory' &&
              (p.chapters.length >= 1 || !BUILDINGS[type].gems),
          ).map((type) => {
            const d = BUILDINGS[type];
            const check = canBuild(p, i, type, now);
            const locked = check === 'ring' || check === 'max';
            return h(
              'button',
              {
                class: `hw-opt${check === 'ok' ? '' : ' no'}${locked ? ' locked' : ''}`,
                onclick: () => {
                  const r = build(p, i, type);
                  if (r !== 'ok') {
                    if (r === 'gems') return app.needGems();
                    return toast(t(REASON[r]));
                  }
                  sfx.chest();
                  haptic.success();
                  app.save();
                  const q = surf(plotAngle(i), 20);
                  burst(q.x, q.y, '#ffffff');
                  renderPanel();
                },
              },
              structIcon(type, 1, 54),
              h('b', null, t(d.name)),
              h(
                'small',
                null,
                locked
                  ? check === 'ring'
                    ? t('Level {n}', { n: d.ring })
                    : t('Max')
                  : d.gems
                    ? `💎${d.gems}`
                    : `✨${fmt(buildCost(type, 1))}`,
              ),
            );
          }),
        ),
      );
    } else if (b.type === 'lab' && b.kind) {
      kids.push(labCard(app, b.kind, renderPanel));
      kids.push(btn(t('Move'), 'ghost', () => ((ctx.moving = i), renderPanel())));
    } else {
      const d = BUILDINGS[b.type];
      const building = !!b.done && b.done > now;
      kids.push(
        h(
          'div',
          { class: 'hw-head' },
          structIcon(b.type, b.lv, 56),
          h(
            'div',
            null,
            h('div', { class: 'hw-title' }, t(d.name), d.decor ? null : h('small', { class: 'muted' }, ` ${t('Lv {n}', { n: b.lv })}`)),
            h(
              'p',
              { class: 'muted' },
              d.decor
                ? t('Decoration for your Homeworld')
                : b.type === 'greenhouse'
                  ? t('Grow a chosen booster by winning rounds')
                  : t(d.desc),
            ),
          ),
        ),
      );
      if (building) {
        const done = b.done!;
        kids.push(h('div', { class: 'hw-timer' }, t('Ready at {time}', { time: whenText(done, now, getLang()) })));
      } else if (b.type === 'greenhouse') {
        const state = b.greenhouse ?? { choice: 'shower', winsTowardNext: 0, stored: 0 };
        kids.push(
          h(
            'div',
            { class: 'hw-prod' },
            t('Stored {stored}/{cap} · {wins}/6 wins', {
              stored: state.stored,
              cap: Math.min(3, effLevel(b, now)),
              wins: state.winsTowardNext,
            }),
          ),
        );
        const stock = state.storedByType ?? { shower: 0, spark: 0, scope: 0, [state.choice]: state.stored };
        kids.push(
          h(
            'p',
            { class: 'muted' },
            state.stored
              ? (['shower', 'spark', 'scope'] as const)
                  .filter((id) => stock[id] > 0)
                  .map((id) =>
                    t('Stored: {n} {name}', {
                      n: stock[id],
                      name: t({ shower: 'Comet Shower', spark: 'Life Spark', scope: 'Star Scope' }[id]),
                    }),
                  )
                  .join(' · ')
              : t('Nothing stored yet'),
          ),
        );
        kids.push(
          h(
            'p',
            { class: 'muted' },
            isFull(home, i, now)
              ? t('Full! Collect to keep growing.')
              : t(
                  state.winsTowardNext < 2
                    ? 'A sprout is growing'
                    : state.winsTowardNext < 4
                      ? 'A bud is growing'
                      : 'A flower is nearly ready',
                ),
          ),
        );
        kids.push(h('p', { class: 'muted' }, t('Choose what grows next. Changing it keeps your progress.')));
        kids.push(
          h(
            'div',
            { class: 'row hw-greenhouse-choices' },
            ...(['shower', 'spark', 'scope'] as const).map((choice) => {
              const label = { shower: 'Comet Shower', spark: 'Life Spark', scope: 'Star Scope' }[choice];
              const button = btn(t(label), state.choice === choice ? 'primary' : 'ghost', () => {
                if (chooseGreenhouse(p, i, choice)) {
                  app.save();
                  renderPanel();
                }
              });
              button.setAttribute('aria-pressed', String(state.choice === choice));
              return button;
            }),
          ),
        );
      } else if (b.type === 'den') kids.push(h('div', { class: 'hw-prod' }, t('Room for {n} friends', { n: b.lv + 1 })));
      else if (b.type === 'launch_bay')
        kids.push(
          h(
            'div',
            { class: 'hw-prod' },
            t('Expeditions: {list}', {
              list: expeditionOptions(home)
                .map((x) => t('{h}h', { h: x }))
                .join(' · '),
            }),
          ),
        );
      else kids.push(h('div', { class: 'hw-prod' }, t('Decoration for your Homeworld')));
      const row: HTMLElement[] = [];
      if (ready(home, i, now) > 0)
        row.push(
          btn(t('Collect'), 'primary', () => {
            doCollect(i);
            renderPanel();
          }),
        );
      if (!d.decor) {
        const c = canUpgrade(p, i, now);
        if (c !== 'maxlv' && !building) {
          row.push(
            btn(
              h(
                'span',
                { class: 'stack' },
                h('b', null, t('Upgrade')),
                h('small', null, `✨${fmt(buildCost(b.type, b.lv + 1))} · ${fmtTime(BUILD_TIME[b.lv + 1])}`),
              ),
              c === 'ok' ? 'gem' : 'ghost dim',
              () => {
                const r = upgradeAt(i);
                if (r !== 'ok') toast(t(REASON[r]));
              },
            ),
          );
        } else if (c === 'maxlv') row.push(h('div', { class: 'ws-state' }, t('✓ Max level')));
      }
      if (b.type === 'den') row.push(btn(t('Friends'), 'ghost', () => residentsSheet(app, renderPanel)));
      if (b.type === 'launch_bay') {
        row.push(btn(t('Launch Bay'), 'primary', () => showLaunchBay(app)));
        if (!building)
          row.push(
            liveText(
              btn(expeditionLabel(), 'ghost', () => expeditionSheet(app, renderPanel)),
              expeditionLabel,
            ),
          );
      }
      row.push(btn(t('Move'), 'ghost', () => ((ctx.moving = i), renderPanel())));
      if (b.type === 'launch_bay')
        row.forEach((action) => {
          action.style.flex = '1 1 96px';
          action.style.minWidth = '0';
        });
      kids.push(h('div', { class: 'row hw-actions', style: b.type === 'launch_bay' ? 'flex-wrap:wrap' : undefined }, ...row));
    }
    panel.replaceChildren(...kids.filter((x): x is HTMLElement => !!x));
  }

  function upgradeAt(i: number) {
    const res = upgrade(p, i);
    if (res === 'ok') {
      sfx.chest();
      haptic.success();
      app.save();
      renderPanel();
    }
    return res;
  }

  function expeditionLabel() {
    const e = home.expedition;
    if (!e) return t('Expedition');
    if (expeditionBack(home)) return t('🎒 Back home!');
    return t('Back at {time}', { time: whenText(e.ends, Date.now(), getLang()) });
  }

  return { renderPanel, tickPanel };
}
