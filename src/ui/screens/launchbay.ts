// The Bay presents earned flight choices; payment and ownership live in meta/launchbay.
import { LAUNCHERS, LAUNCH_ROSTER, isLaunchRosterId, type LauncherId, type Tune } from '../../core/launchers';
import { availability, select, tune, tuneUp, TUNE_COST } from '../../meta/launchbay';
import { MAT_EMOJI } from '../../meta/constellations';
import { bayLevel } from '../../meta/homeworld';
import { landmarkDefinition, landmarkOpen, landmarkState } from '../../meta/landmarks';
import { t } from '../../i18n';
import { previewLook } from '../../meta/cosmetics';
import { drawStructure } from '../art/structures';
import { structureStyleId } from '../art/styleRender';
import { canvasDpr } from '../devcapture';
import { btn, fmt, h, toast } from '../dom';
import { haptic } from '../haptics';
import { sfx } from '../audio';
import type { App } from '../app';

const EFFECT: Record<Exclude<LauncherId, 'sling'>, readonly [() => string, () => string, () => string]> = {
  swoop: [() => t('Flies a little quicker'), () => t('Flies quicker again'), () => t('Flies almost as quickly as Star Sling')],
  sparkler: [
    () => t('Bringing a friend keeps the glow'),
    () => t('Growing land keeps the glow'),
    () => t('Your first plain throw keeps the glow'),
  ],
  zip: [() => t('Shows a “too far” tip'), () => t('Easier to hold the right pull'), () => t('Even easier to hold the right pull')],
  thumper: [() => t('Longer aim line'), () => t('Aim line grows longer'), () => t('Aim line grows longer again')],
  pinpoint: [
    () => t('Rain Cloud lands as wide as usual'),
    () => t('Sunburst lands as wide as usual'),
    () => t('Seed Pod lands as wide as usual'),
  ],
  skipper: [
    () => t('Other throws keep full bounce power'),
    () => t('First bounce keeps full power'),
    () => t('First two bounces keep full power'),
  ],
};

const DRAWBACK: Record<Exclude<LauncherId, 'sling'>, () => string> = {
  swoop: () => t('Its curving flight takes longer.'),
  sparkler: () => t('Plain throws can dim the Supernova glow.'),
  zip: () => t('A full pull can fly too far.'),
  thumper: () => t('Its aim line is short.'),
  pinpoint: () => t('Some landings reach fewer places.'),
  skipper: () => t('A bounce can make a landing gentler.'),
};

function tuneReason(reason: Exclude<ReturnType<typeof tuneUp>, 'ok'>): string {
  switch (reason) {
    case 'locked':
      return t('Earn this launcher first');
    case 'mastery':
      return t('Keep flinging with this launcher');
    case 'bay':
      return t('Grow the Launch Bay first');
    case 'resources':
      return t('Gather the shown resources');
  }
}

const BAY_CSS = `
.launch-bay .bay-intro{margin:0 0 12px;color:#e1dcfa;line-height:1.35}
.launch-bay .bay-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:10px;padding-bottom:24px}
.launch-bay .bay-card{border:2px solid var(--bay-color);border-radius:18px;padding:12px;background:#272443;color:#fff;min-width:0}
.launch-bay .bay-card.locked{border-style:dashed;background:#242238}
.launch-bay .bay-card.selected{box-shadow:0 0 0 2px #fff6bd inset}
.launch-bay .bay-head{display:flex;align-items:center;gap:10px;min-width:0}
.launch-bay .bay-emblem{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:14px;border:2px solid var(--bay-color);font-size:24px;background:#141328}
.launch-bay .bay-building-look{width:56px;height:56px;vertical-align:middle;margin-right:8px}
.launch-bay .locked .bay-emblem{filter:grayscale(1);opacity:.55}
.launch-bay .bay-head-text{min-width:0;flex:1}
.launch-bay .bay-name{font-size:max(12px,calc(19px * var(--text-scale)));line-height:1.1}
.launch-bay .bay-job{display:block;color:#d8d0ec;font-size:max(12px,calc(13px * var(--text-scale)));line-height:1.25}
.launch-bay .bay-state,.launch-bay .bay-progress,.launch-bay .bay-effect,.launch-bay .bay-resources{margin:9px 0 0;font-size:max(12px,calc(13px * var(--text-scale)));line-height:1.3}
.launch-bay .bay-progress progress{display:block;width:100%;height:9px;margin-top:5px}
.launch-bay .bay-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
.launch-bay .bay-actions .btn{min-height:44px;flex:1 1 94px;white-space:normal;line-height:1.2;padding:7px}
.launch-bay .bay-try-tunes{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.launch-bay .bay-try-tunes .btn{min-height:44px;flex:1 1 85px;white-space:normal;padding:6px}
`;

const savedScroll = new WeakMap<App, number>();

function rememberScroll(app: App) {
  const scroll = document.querySelector<HTMLElement>('.launch-bay .scroll');
  if (scroll) savedScroll.set(app, scroll.scrollTop);
}

function practice(app: App, id: LauncherId, chosenTune: Tune) {
  // C owns the isolated scene; pass a gameplay selection, never a look ID.
  rememberScroll(app);
  app.startLauncherPractice(id, chosenTune);
}

function pierCard(app: App): HTMLElement {
  const p = app.p;
  const site = landmarkDefinition('comet_pier');
  const state = landmarkState(p, 'comet_pier');
  const stage = state.stage;
  if (stage === 4) return h('p', { class: 'bay-progress' }, t('Comet Pier finished'));
  if (!landmarkOpen(p, 'comet_pier')) {
    const previous = (['sprout_garden', 'skyglass', 'sky_bridge'] as const).find((id) => landmarkState(p, id).stage < 4);
    const reason =
      p.level < 30
        ? t('Landmarks open after planet 29')
        : p.home.level < 4 && previous
          ? t('Reach Homeworld Level {n} and finish {name}', { n: 4, name: t(landmarkDefinition(previous).name) })
          : p.home.level < 4
            ? t('Comet Pier opens at Homeworld Level 4')
            : t('Finish {name} first', { name: t(landmarkDefinition(previous!).name) });
    return h('p', { class: 'bay-progress' }, reason);
  }
  const progress = stage === 3 ? t('Bring Essences to finish this Landmark') : t(site.stages[stage].ask);
  return h(
    'div',
    { class: 'bay-progress' },
    h('p', null, t('Comet Pier: {n} of 4 steps', { n: stage })),
    h('p', null, progress),
    h('p', null, t('Visit your Homeworld to build Comet Pier')),
  );
}

function card(app: App, id: LauncherId): HTMLElement {
  const p = app.p;
  const def = LAUNCHERS[id];
  const status = availability(p, id);
  const have = status.kind === 'owned';
  const chosen = p.launcher.selected === id || (id === 'sling' && !isLaunchRosterId(p.launcher.selected));
  const currentTune = tune(p, id);
  const next = Math.min(4, currentTune + 1) as Tune;
  const cost = TUNE_COST[next];
  const flings = p.launcher.flings[id] ?? 0;
  const bay = bayLevel(p.home);
  const essence = def.essence;
  const essenceHave = essence ? (p.mats[essence] ?? 0) : 0;
  const needed = currentTune < 4 && id !== 'sling';
  const progress =
    status.kind === 'waiting-planet'
      ? h('p', { class: 'bay-state' }, t('Arrives at planet {n}', { n: status.planet }))
      : status.kind === 'waiting-channel'
        ? h(
            'div',
            { class: 'bay-progress' },
            t('{name}: {done} of {total}', { name: t(status.label), done: status.done, total: status.total }),
            h('progress', { value: status.done, max: status.total, 'aria-label': t('{name} progress', { name: t(def.name) }) }),
            h(
              'small',
              null,
              p.level < def.debut ? t('After that, arrives at planet {n}', { n: def.debut }) : t('Then it joins your Launch Bay'),
            ),
          )
        : null;
  const actions: HTMLElement[] = [];
  if (have) {
    if (chosen)
      actions.push(
        h('span', { class: 'bay-state', tabindex: -1, 'aria-label': t('{name} selected', { name: t(def.name) }) }, t('✓ Selected')),
      );
    else {
      const choose = btn(t('Choose'), 'primary', () => {
        if (select(p, id)) {
          app.save();
          showLaunchBay(app, id, 'selected');
          haptic.light();
          toast(t('{name} selected', { name: t(def.name) }), 'good');
        }
      });
      choose.setAttribute('aria-label', t('Choose {name}', { name: t(def.name) }));
      actions.push(choose);
    }
    const tryButton = btn(t('Try it'), 'ghost', () => practice(app, id, currentTune));
    tryButton.setAttribute('aria-label', t('Try {name} for free', { name: t(def.name) }));
    actions.push(tryButton);
    if (needed) {
      const can = flings >= cost.flings && bay >= cost.bay && p.dust >= cost.dust && essenceHave >= cost.essence;
      const button = btn(t('Tune {n}', { n: next }), can ? 'gem' : 'ghost dim', () => {
        const result = tuneUp(p, id);
        if (result === 'ok') {
          app.save();
          showLaunchBay(app, id, 'button');
          sfx.chest();
          haptic.success();
          toast(t('{name} is now Tune {n}', { name: t(def.name), n: next }), 'good');
        } else {
          toast(tuneReason(result));
        }
      });
      button.setAttribute('aria-disabled', String(!can));
      button.dataset.action = 'tune';
      button.setAttribute(
        'aria-label',
        can
          ? t('Tune {name} to {n}', { name: t(def.name), n: next })
          : t('Tune {name} to {n}: {reason}', {
              name: t(def.name),
              n: next,
              reason: tuneReason(flings < cost.flings ? 'mastery' : bay < cost.bay ? 'bay' : 'resources'),
            }),
      );
      actions.push(button);
    }
  }
  return h(
    'article',
    {
      class: `bay-card${have ? '' : ' locked'}${chosen ? ' selected' : ''}`,
      style: `--bay-color:${def.bandColor}`,
      'data-launcher': id,
      'aria-label': have
        ? id === 'sling'
          ? t(def.name)
          : t('{name}, Tune {n}', { name: t(def.name), n: currentTune })
        : t('{name}, locked', { name: t(def.name) }),
    },
    h(
      'div',
      { class: 'bay-head' },
      h('span', { class: 'bay-emblem', 'aria-hidden': 'true' }, have ? def.emblem : '?'),
      h('div', { class: 'bay-head-text' }, h('b', { class: 'bay-name' }, t(def.name)), h('span', { class: 'bay-job' }, t(def.job))),
    ),
    progress,
    have && id !== 'sling' ? h('p', { class: 'bay-state' }, t('Tune {n} of 4', { n: currentTune })) : null,
    have && id !== 'sling' ? h('p', { class: 'bay-effect' }, DRAWBACK[id]()) : null,
    needed && have
      ? h('p', { class: 'bay-effect' }, t('Next: {effect}', { effect: EFFECT[id as Exclude<LauncherId, 'sling'>][next - 2]() }))
      : null,
    needed && have
      ? h(
          'p',
          { class: 'bay-resources' },
          t('{have} of {need} flings with {name}', { have: fmt(flings), need: fmt(cost.flings), name: t(def.name) }),
          ' · ',
          t('Needs Launch Bay level {n}', { n: cost.bay }),
        )
      : null,
    needed && have && essence
      ? h(
          'p',
          { class: 'bay-resources' },
          t('✨ {have} of {need} · {essence} {essenceHave} of {essenceNeed}', {
            have: fmt(p.dust),
            need: fmt(cost.dust),
            essence: `${MAT_EMOJI[essence]} ${t(essence)}`,
            essenceHave: fmt(essenceHave),
            essenceNeed: fmt(cost.essence),
          }),
        )
      : null,
    h('div', { class: 'bay-actions' }, ...actions),
    id === 'zip' && !have ? pierCard(app) : null,
    have && id !== 'sling'
      ? h(
          'div',
          { class: 'bay-try-tunes' },
          ...([2, 3, 4] as Tune[])
            .filter((previewTune) => previewTune > currentTune)
            .map((previewTune) => {
              const button = btn(t('Try Tune {n}', { n: previewTune }), 'ghost small', () => practice(app, id, previewTune));
              button.setAttribute('aria-label', t('Try {name} Tune {n} for free', { name: t(def.name), n: previewTune }));
              return button;
            }),
        )
      : null,
  );
}

export function showLaunchBay(app: App, focusId?: LauncherId, focusKind: 'selected' | 'button' = 'button') {
  rememberScroll(app);
  const building = h('canvas', { class: 'bay-building-look', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const dpr = canvasDpr();
  building.width = building.height = Math.round(56 * dpr);
  const ink = building.getContext('2d')!;
  ink.scale(dpr, dpr);
  ink.translate(28, 51);
  drawStructure(ink, 'launch_bay', bayLevel(app.p.home), 52, 0.4, false, {
    style: structureStyleId(previewLook(app.p), 'launch_bay'),
  });
  app.mount(
    h(
      'div',
      { class: 'screen page launch-bay' },
      h('style', null, BAY_CSS),
      app.topBar(),
      h(
        'div',
        { class: 'page-title' },
        building,
        t('Launch Bay'),
        h('small', { class: 'muted' }, ` ${t('Level {n}', { n: bayLevel(app.p.home) })}`),
      ),
      h(
        'div',
        { class: 'scroll' },
        h('p', { class: 'bay-intro' }, t('Choose a launcher for your next adventure. Switching and practice are free.')),
        h('div', { class: 'bay-grid' }, ...LAUNCH_ROSTER.map((id) => card(app, id))),
      ),
    ),
    'launchbay',
  );
  const scroll = document.querySelector<HTMLElement>('.launch-bay .scroll');
  if (scroll) scroll.scrollTop = savedScroll.get(app) ?? 0;
  if (focusId) {
    const selector = focusKind === 'selected' ? '.bay-state[tabindex]' : '.bay-actions button[data-action="tune"]';
    const target = document.querySelector<HTMLElement>(`.bay-card[data-launcher="${focusId}"] ${selector}`);
    target?.focus({ preventScroll: true });
  }
}
