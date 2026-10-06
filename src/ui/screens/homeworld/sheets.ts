import { h, btn, fmt, modal, toast } from '../../dom';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { burst, effectiveReduceMotion } from '../../motion';
import { LANDMARKS } from '../../../meta/tuning';
import { finishLandmark, landmarkFinishStatus, landmarkOpen, landmarkState } from '../../../meta/landmarks';
import { drawIsleDecoration, drawLandmark } from '../../art/landmarks';
import { keepsakeFor } from '../../../meta/friends';
import type { LandmarkId } from '../../../meta/homeworldLife';
import {
  BUILDINGS,
  BUILDING_TYPES,
  FRIEND_LEVELS,
  RING_PLOTS,
  canExpand,
  candidates,
  chaptersDone,
  denCapacity,
  expand,
  expeditionBack,
  expeditionLoot,
  expeditionOptions,
  finishExpedition,
  friendLevel,
  invite,
  sendHome,
  startExpedition,
  RESIDENT_ACCS,
  accAvailable,
  wearAcc,
  NICKNAMES,
  setNick,
  isBestFriend,
  currentPaint,
  applyPaint,
  ownsPaint,
  PAINTS,
  towerLevel,
  availableLands,
  GROWABLE_LANDS,
  resolvedGaps,
  setGapLand,
  ownedIsleDecorations,
  setIsleDecoration,
  type BuildCheck,
  type Collected,
} from '../../../meta/homeworld';
import { BIOMES, SPECIES_BY_ID } from '../../../core/world';
import { drawCreature, critterCanvas } from '../../art/critters';
import { shareCanvas } from '../../postcard';
import { SEASON_EMOJI, SEASON_NAMES, seasonOf } from '../../../meta/seasons';
import { drawSeason } from '../../art/seasons';
import { passportName } from '../../../meta/passport';
import { getLang, planetName, t, tp } from '../../../i18n';
import { clearStyleSlot, COSMETICS, equip, owns, previewLook } from '../../../meta/cosmetics';
import { homeworldStyleColors } from '../../art/styleRender';
import { whenText } from '../../../meta/dates';
import { canvasDpr } from '../../devcapture';
import { KINDS, type Kind } from '../../../core/world';
import { MATS, MAT_EMOJI } from '../../../meta/constellations';
import { labBuildCost, labLevel, suggestedFirstLab } from '../../../meta/labs';
import { firstHourStep, firstHourLab, firstHourFriend } from '../../../meta/firsthour';
import { LAB_NAME, LAB_TEXT, LAB_FIRST_COPY, ESSENCE_NAME } from '../../../meta/labcopy';
import { showFirstFriend } from '../../flows/labmoments';
import { HOME_LEVEL_REQUIREMENTS } from '../../../meta/tuning';
import { celebrate } from '../../celebrate';
import { unlocked } from '../../../meta/unlocks';
import type { App } from '../../app';
import type { HomeworldLevel } from '../../../meta/homeworldTypes';

const TAU = Math.PI * 2;
function landmarkPicture(id: LandmarkId, stage: 0 | 1 | 2 | 3 | 4): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const dpr = canvasDpr();
  canvas.width = Math.round(112 * dpr);
  canvas.height = Math.round(100 * dpr);
  canvas.style.width = '112px';
  canvas.style.height = '100px';
  const g = canvas.getContext('2d')!;
  g.scale(dpr, dpr);
  drawLandmark(g, id, stage, 56, 53, 88);
  return canvas;
}

export function landmarkStageLabel(stage: number): string {
  return stage >= 4 ? t('Landmark finished') : t('Stage {n} of 4', { n: stage + 1 });
}

function landmarkLockReason(app: App, id: LandmarkId): string {
  const p = app.p;
  const index = LANDMARKS.findIndex((site) => site.id === id);
  if (p.level < 30) return t('Landmarks open after planet 29');
  const site = LANDMARKS[index];
  // Name the first unfinished earlier site: that is the one the child can work on now.
  const blocker = LANDMARKS.slice(0, index).find((earlier) => landmarkState(p, earlier.id).stage < 4);
  if (blocker && p.home.level < site.level)
    return t('Reach Homeworld Level {n} and finish {name}', { n: site.level, name: t(blocker.name) });
  if (blocker) return t('Finish {name} first', { name: t(blocker.name) });
  if (p.home.level < site.level) return t('Opens at Homeworld Level {n}', { n: site.level });
  return t('Landmark is not open yet');
}

/** Snapshot counters are shown live, without paying a reward from a read path. */
function visibleRouteProgress(app: App, metric: string, stored: number): number {
  const p = app.p;
  if (metric === 'bestFriends') return Math.max(stored, p.home.residents.filter((friend) => friendLevel(friend.fp) >= 5).length);
  if (metric === 'friendLevelThree') return Math.max(stored, p.home.residents.filter((friend) => friendLevel(friend.fp) >= 3).length);
  if (metric === 'constellations') return Math.max(stored, p.constellations.length);
  if (metric === 'bundles') return Math.max(stored, p.bundles.length);
  return stored;
}

function missingEssences(app: App, delivery: (typeof LANDMARKS)[number]['delivery']): string {
  return Object.entries(delivery)
    .map(([mat, need]) => {
      const missing = Math.max(0, need! - (app.p.mats[mat as keyof typeof app.p.mats] ?? 0));
      return missing ? t('{n} more {name}', { n: missing, name: t(ESSENCE_NAME[mat as keyof typeof ESSENCE_NAME]) }) : '';
    })
    .filter(Boolean)
    .join(' · ');
}

function stageReward(reward: { dust?: number; gems?: number }): string {
  return [reward.dust ? `✨${reward.dust}` : '', reward.gems ? `💎${reward.gems}` : ''].filter(Boolean).join(' ');
}

/** A site is always inspectable; only its final delivery changes the save. */
export function landmarkSheet(app: App, id: LandmarkId, after: () => void) {
  const p = app.p;
  const site = LANDMARKS.find((item) => item.id === id)!;
  const state = landmarkState(p, id);
  const open = landmarkOpen(p, id);
  const stage = state.stage;
  const featStage = Math.min(stage, 2) as 0 | 1 | 2;
  const ask = stage < 3 ? t(site.stages[featStage].ask) : stage === 3 ? t('Bring Essences to finish this Landmark') : t(site.finish);
  const routes =
    !open || stage === 4
      ? []
      : stage < 3
        ? site.stages[featStage].routes.map((route, lane) =>
            h(
              'p',
              { class: 'hw-landmark-route' },
              t('{name}: {done}/{total}', {
                name: t(route.label || site.stages[featStage].ask),
                done: Math.min(visibleRouteProgress(app, route.metric, state.progress[featStage * 2 + lane] ?? 0), route.target),
                total: route.target,
              }),
            ),
          )
        : Object.entries(site.delivery).map(([mat, count]) =>
            h(
              'p',
              { class: 'hw-landmark-route' },
              t('{name}: {have}/{need}', {
                name: t(ESSENCE_NAME[mat as keyof typeof ESSENCE_NAME]),
                have: p.mats[mat as keyof typeof p.mats] ?? 0,
                need: count,
              }),
            ),
          );
  const status = landmarkFinishStatus(p, id);
  const m = modal(
    [
      h('div', { class: 'm-title' }, t(site.name)),
      btn(t('Back'), 'ghost wide hw-sheet-back', () => m.close()),
      h('div', { class: 'hw-landmark-picture', 'aria-hidden': 'true' }, landmarkPicture(id, stage)),
      h('p', null, open ? landmarkStageLabel(stage) : landmarkLockReason(app, id)),
      open ? h('p', null, ask) : h('p', { class: 'muted' }, t('Progress starts when this Landmark opens')),
      ...routes,
      open
        ? h(
            'div',
            { class: 'hw-landmark-rewards' },
            h('b', null, t('Rewards')),
            ...site.stages.map((step, index) =>
              h(
                'p',
                { class: index < stage ? 'hw-reward-earned' : 'hw-landmark-reward' },
                `${index < stage ? '✓ ' : ''}${t('Stage {n}: {reward}', { n: index + 1, reward: stageReward(step.reward) })}`,
              ),
            ),
            h('p', { class: 'hw-landmark-reward' }, t('Finish to get {reward}', { reward: t(site.finish) })),
          )
        : null,
      stage === 3 && open
        ? (() => {
            const finishButton = btn(t('Finish this Landmark'), status === 'ready' ? 'primary wide' : 'ghost wide dim', () => {
              if (status === 'resources') return toast(t('Bring {list} to finish', { list: missingEssences(app, site.delivery) }));
              const result = finishLandmark(p, id);
              if (result !== 'ok')
                return toast(
                  result === 'resources'
                    ? t('Bring {list} to finish', { list: missingEssences(app, site.delivery) })
                    : landmarkLockReason(app, id),
                );
              sfx.levelUp();
              burst(finishButton, 'bright');
              // btn() has just fired a light tap; wait past the haptic throttle for the finish beat.
              window.setTimeout(() => haptic.heavy(), 170);
              toast(t('{name} is finished! {gift}', { name: t(site.name), gift: t(site.finish) }), 'good');
              app.save();
              m.close();
              after();
              landmarkSheet(app, id, after);
            });
            if (status !== 'ready') {
              finishButton.setAttribute('aria-disabled', 'true');
              if (status === 'resources')
                finishButton.setAttribute(
                  'aria-label',
                  t('Finish this Landmark. Bring {list}', { list: missingEssences(app, site.delivery) }),
                );
            }
            return finishButton;
          })()
        : null,
    ],
    { cls: 'hw-landmark-sheet' },
  );
}

/** Choosing a land changes only the Homeworld picture. */
export function landSheet(app: App, gap: number, after: () => void) {
  const p = app.p;
  const current = p.home.gaps[gap];
  const lands = availableLands(p);
  const pick = (choice: typeof current) => {
    if (!setGapLand(p, gap, choice)) return;
    app.save();
    sfx.click();
    m.close();
    after();
  };
  const m = modal(
    [
      h('div', { class: 'm-title' }, t('Land {n}', { n: gap + 1 })),
      btn(t('Back'), 'ghost wide hw-sheet-back', () => m.close()),
      h('p', { class: 'muted' }, t('Choose a land for this space between plots. You can change it any time.')),
      btn(t('Automatic'), current === null ? 'primary wide' : 'ghost wide', () => pick(null)),
      ...GROWABLE_LANDS.map((id) => {
        const unlocked = lands.includes(id);
        const button = btn(
          `${BIOMES[id].deco} ${t(BIOMES[id].name)} · ${Math.min(10, p.stats.grown[id] ?? 0)}/10`,
          current === id ? 'primary wide' : unlocked ? 'ghost wide' : 'ghost wide dim',
          () => {
            if (unlocked) pick(id);
            else toast(t('Grow 10 {name} sectors in campaign, Voyage or Zen wins to place it here', { name: t(BIOMES[id].name) }));
          },
        );
        if (!unlocked) {
          button.setAttribute('aria-disabled', 'true');
          button.setAttribute(
            'aria-label',
            t('Grow 10 {name} sectors in campaign, Voyage or Zen wins to place it here', { name: t(BIOMES[id].name) }),
          );
        }
        return button;
      }),
      lands.length ? null : h('p', { class: 'muted' }, t('Grow ten sectors of a land in campaign, Voyage or Zen wins to place it here.')),
    ],
    { cls: 'hw-land-sheet' },
  );
}

export function isleDecorationName(id: string | null): string {
  if (!id) return t('Empty spot');
  if (id.startsWith('keepsake:')) {
    const species = SPECIES_BY_ID[id.slice('keepsake:'.length)];
    return t('Keepsake from {name}', { name: species ? t(species.name) : id });
  }
  return t(BUILDINGS[id as keyof typeof BUILDINGS].name);
}

/** A visual copy of an owned decoration; placement never spends or changes a plot. */
export function isleDecorationSheet(app: App, spot: number, after: () => void) {
  const p = app.p;
  const options = ownedIsleDecorations(p);
  const current = p.home.isleDecor[spot];
  const choose = (id: string | null) => {
    if (!setIsleDecoration(p, spot, id)) return;
    app.save();
    sfx.click();
    m.close();
    after();
  };
  const choice = (id: string) => {
    const preview = h('canvas', { 'aria-hidden': 'true' }) as HTMLCanvasElement;
    preview.width = 54;
    preview.height = 44;
    const g = preview.getContext('2d');
    if (g) drawIsleDecoration(g, id, 27, 34, 35);
    const button = btn(isleDecorationName(id), current === id ? 'primary wide' : 'ghost wide', () => choose(id));
    button.prepend(preview);
    return button;
  };
  const m = modal([
    h('div', { class: 'm-title' }, t('Isle spot {n}', { n: spot + 1 })),
    h('p', { class: 'muted' }, t('Choose a decoration for the Floating Isle. You can move it any time.')),
    btn(t('Clear this spot'), current === null ? 'primary wide' : 'ghost wide', () => choose(null)),
    ...options.map(choice),
    options.length ? null : h('p', { class: 'muted' }, t('Earn or build a decoration to place it here.')),
    btn(t('Back'), 'ghost wide', () => m.close()),
  ]);
}

/** All canvas actions have a text route for VoiceOver and switch access. */
export function homeworldListSheet(app: App, onPlot: (index: number) => void, after: () => void) {
  const p = app.p;
  const m = modal(
    [
      h('div', { class: 'm-title' }, t('Homeworld list')),
      btn(t('Back'), 'ghost wide hw-sheet-back', () => m.close()),
      h('div', { class: 'sec-title' }, t('Plots and lands')),
      ...p.home.plots.flatMap((building, index) => [
        btn(
          t('Plot {n}: {description}', {
            n: index + 1,
            description:
              building?.type === 'lab' && building.kind
                ? t('{name}, level {level}', { name: t(LAB_NAME[building.kind]), level: labLevel(p, building.kind) })
                : building
                  ? t('{name}, level {level}', { name: t(BUILDINGS[building.type].name), level: building.lv })
                  : t('Empty plot'),
          }),
          'ghost wide',
          () => {
            m.close();
            onPlot(index);
          },
        ),
        btn(
          t('Land {n}: {name}', {
            n: index + 1,
            name: p.home.gaps[index] === null ? t('Automatic land') : t(BIOMES[resolvedGaps(p)[index] ?? 'barren'].name),
          }),
          'ghost wide',
          () => {
            m.close();
            landSheet(app, index, after);
          },
        ),
      ]),
      h('div', { class: 'sec-title' }, t('Friends')),
      btn(t('Friends ({n})', { n: p.home.residents.length }), 'ghost wide', () => {
        m.close();
        residentsSheet(app, after);
      }),
      ...p.home.residents.map((friend) =>
        btn(
          t('Friend: {name}, friendship level {n}', {
            name: friend.nick ?? t(SPECIES_BY_ID[friend.species].name),
            n: friendLevel(friend.fp),
          }),
          'ghost wide',
          () => {
            m.close();
            residentsSheet(app, after);
          },
        ),
      ),
      ...(p.level >= 30
        ? [
            h('div', { class: 'sec-title' }, t('Landmarks')),
            ...LANDMARKS.map((site) =>
              btn(
                t('Landmark {name}: {stage}', { name: t(site.name), stage: landmarkStageLabel(landmarkState(p, site.id).stage) }),
                landmarkOpen(p, site.id) ? 'ghost wide' : 'ghost wide dim',
                () => {
                  m.close();
                  landmarkSheet(app, site.id, after);
                },
              ),
            ),
          ]
        : []),
      ...(landmarkState(p, 'sky_bridge').stage === 4
        ? [
            h('div', { class: 'sec-title' }, t('Floating Isle')),
            ...p.home.isleDecor.map((id, spot) =>
              btn(t('Isle spot {n}: {name}', { n: spot + 1, name: isleDecorationName(id) }), 'ghost wide', () => {
                m.close();
                isleDecorationSheet(app, spot, after);
              }),
            ),
          ]
        : []),
    ],
    { cls: 'hw-homeworld-list-sheet' },
  );
}

export const REASON: Record<BuildCheck | 'locked', string> = {
  ok: '',
  ring: 'Grow your Homeworld first',
  max: 'You have the most of these',
  drones: 'All drones are busy',
  dust: 'Not enough stardust',
  gems: 'Not enough gems',
  busy: 'Already being built',
  debris: 'This plot is taken',
  occupied: 'This plot is taken',
  maxlv: 'Fully upgraded',
  locked: 'Unlock this object first',
};

export function gotText(c: Collected) {
  const parts: string[] = [];
  if (c.dust) parts.push(`✨${fmt(c.dust)}`);
  if (c.gems) parts.push(`💎${c.gems}`);
  const e: Record<string, string> = { shower: '🌠', spark: '✨', scope: '🔭' };
  for (const [k, v] of Object.entries(c.boosters)) if (v) parts.push(`${e[k]}×${v}`);
  return parts.join('  ');
}

export function essenceSheet(app: App) {
  const p = app.p;
  const m = modal(
    [
      h('div', { class: 'm-title' }, t(LAB_TEXT.pouch)),
      ...MATS.map((mat) =>
        h(
          'div',
          { class: 'essence-row' },
          h('b', null, `${MAT_EMOJI[mat]} ${t(ESSENCE_NAME[mat])} · ${fmt(p.mats[mat] ?? 0)}`),
          h(
            'small',
            null,
            t('What uses it: {list}', {
              list: new Intl.ListFormat(getLang(), { style: 'long', type: 'conjunction' }).format([
                ...(Object.keys(LAB_NAME) as Kind[])
                  .filter((kind) =>
                    kind === 'seed' || kind === 'sun'
                      ? mat === 'leaf'
                      : ({ rock: 'stone', ice: 'frost', magma: 'ember', storm: 'dew' } as Partial<Record<Kind, string>>)[kind] === mat,
                  )
                  .map((kind) => t(LAB_NAME[kind])),
                t('Star Atlas'),
                t('Dyes'),
              ]),
            }),
          ),
        ),
      ),
      btn(t('Close'), 'ghost wide', () => m.close()),
    ],
    { cls: 'essence-sheet' },
  );
}

export function firstHourSheet(app: App, refresh: () => void) {
  const step = firstHourStep(app.p);
  if (step === 'done') return;
  const choice = suggestedFirstLab(app.p);
  let chosen = choice;
  const introText = h('p', null, t(LAB_FIRST_COPY[choice]));
  let buildButton: HTMLButtonElement;
  const buildLabel = (kind: Kind) =>
    labBuildCost(app.p, kind) === 0
      ? t(LAB_TEXT.buildSelected, { name: t(LAB_NAME[kind]) })
      : t('Build {name} · ✨{cost}', { name: t(LAB_NAME[kind]), cost: fmt(labBuildCost(app.p, kind)) });
  const choiceButtons: HTMLButtonElement[] = [];
  for (const kind of Object.keys(KINDS) as Kind[]) {
    if (KINDS[kind].unlock > app.p.level) continue;
    const button = btn(t(LAB_NAME[kind]), kind === choice ? 'primary' : 'ghost', () => {
      chosen = kind;
      introText.textContent = t(LAB_FIRST_COPY[kind]);
      buildButton.textContent = buildLabel(kind);
      choiceButtons.forEach((item) => {
        item.classList.toggle('primary', item === button);
        item.classList.toggle('ghost', item !== button);
      });
    });
    choiceButtons.push(button);
  }
  buildButton = btn(buildLabel(choice), 'primary wide', () => {
    const result = firstHourLab(app.p, chosen, undefined, Date.now());
    if (result !== 'ok') return toast(t(REASON[result]));
    app.save();
    m.close();
    refresh();
    firstHourSheet(app, refresh);
  });
  const buildingLab = step === 'friend' ? app.p.home.plots.find((b) => b?.type === 'lab' && b.done && b.done > Date.now()) : null;
  const m = modal(
    [
      h('div', { class: 'm-title' }, t(LAB_TEXT.firstTitle)),
      h('p', null, t(step === 'lab' ? LAB_TEXT.firstLab : LAB_TEXT.firstFriend)),
      step === 'lab'
        ? introText
        : h(
            'p',
            null,
            buildingLab?.done
              ? t('{name} is being built · ready at {time}', {
                  name: t(LAB_NAME[buildingLab.kind!]),
                  time: whenText(buildingLab.done, Date.now(), getLang()),
                })
              : t(LAB_TEXT.firstFriendCopy),
          ),
      step === 'lab'
        ? h('div', { class: 'first-lab-choices' }, ...choiceButtons)
        : btn(t(LAB_TEXT.firstFriend), buildingLab ? 'ghost wide dim' : 'primary wide', () => {
            if (buildingLab?.done && buildingLab.done > Date.now())
              return toast(
                t('{name} is being built · ready at {time}', {
                  name: t(LAB_NAME[buildingLab.kind!]),
                  time: whenText(buildingLab.done, Date.now(), getLang()),
                }),
              );
            const result = firstHourFriend(app.p, Date.now());
            if (!result) return toast(t('Make room for a friend first'));
            app.save();
            m.close();
            refresh();
            showFirstFriend(app, result.species);
          }),
      step === 'lab' ? buildButton : null,
      btn(t('Close'), 'ghost wide', () => m.close()),
    ],
    { cls: 'first-hour' },
  );
}

// ---------------------------------------------------------------- sheets
export function residentsSheet(app: App, after: () => void) {
  const p = app.p;
  const home = p.home;
  const cap = denCapacity(home);
  const rows = home.residents.map((r) => {
    const sp = SPECIES_BY_ID[r.species];
    const lv = friendLevel(r.fp);
    const away = home.expedition?.species === r.species;
    const next = FRIEND_LEVELS[lv] ?? null;
    const friendNote = away
      ? t('On an expedition')
      : unlocked(p, 'buddy')
        ? t('Wins with this Buddy and Wishes grow friendship')
        : unlocked(p, 'quests')
          ? t('Wishes grow friendship')
          : t('Your friend is at home here');
    return h(
      'div',
      { class: 'hw-res' },
      critterCanvas(r.species, 52, 0.4, r.acc),
      h(
        'div',
        { class: 'grow' },
        h(
          'div',
          { class: 'nick-row' },
          h(
            'button',
            { class: 'nick', onclick: () => (m.close(), nickSheet(app, r.species, () => residentsSheet(app, after))) },
            r.nick ? h('b', null, r.nick) : null,
            h('small', null, r.nick ? ` · ${t(sp.name)}` : t(sp.name)),
            ' ✏️',
          ),
          h(
            'button',
            {
              class: 'dress',
              'aria-label': t('Dress up {name}', { name: r.nick ?? t(sp.name) }),
              onclick: () => (m.close(), accSheet(app, r.species, () => residentsSheet(app, after))),
            },
            '👒',
          ),
          isBestFriend(r) ? h('span', { class: 'ribbon' }, t('🎀 Best friends')) : null,
        ),
        h(
          'div',
          { class: 'hearts' },
          '💖'.repeat(lv) + '🤍'.repeat(FRIEND_LEVELS.length - lv),
          next !== null ? h('small', { class: 'muted' }, ` ${r.fp}/${next}`) : null,
        ),
        h('small', { class: 'muted' }, friendNote),
        lv >= 3 ? h('small', { class: 'hw-signature' }, t('Signature move: {name}', { name: t('Star twirl') })) : null,
        keepsakeFor(r)
          ? h(
              'span',
              { class: 'hw-keepsake' },
              critterCanvas(r.species, 30, 0, r.acc),
              t('Keepsake from {name}', { name: r.nick ?? t(sp.name) }),
            )
          : null,
      ),
      away
        ? null
        : h(
            'button',
            {
              class: 'hw-x',
              'aria-label': t('Say goodbye'),
              onclick: () => {
                sendHome(p, r.species);
                app.save();
                m.close();
                residentsSheet(app, after);
                after();
              },
            },
            '×',
          ),
    );
  });
  const free = cap - home.residents.length;
  const cands = candidates(p);
  const invites =
    free > 0 && cands.length
      ? h(
          'div',
          { class: 'hw-invite' },
          ...cands.map((s) =>
            h(
              'button',
              {
                class: 'lb',
                onclick: () => {
                  if (!invite(p, s.id)) return;
                  sfx.chest();
                  haptic.success();
                  toast(t('{name} moved in!', { name: t(s.name) }), 'good');
                  app.save();
                  m.close();
                  residentsSheet(app, after);
                  after();
                },
              },
              critterCanvas(s.id, 44),
              h('small', null, t(s.name)),
            ),
          ),
        )
      : null;
  const m = modal([
    h('div', { class: 'm-title' }, t('Friends'), h('small', { class: 'muted' }, ` ${home.residents.length}/${cap}`)),
    ...rows,
    cap === 0 ? h('p', { class: 'muted' }, t('Build a Critter Den so creatures can move in.')) : null,
    free > 0 && cands.length
      ? h('div', { class: 'sec-title' }, tp(free, 'Invite a creature ({n} room left)', 'Invite a creature ({n} rooms left)'))
      : null,
    invites,
    free > 0 && !cands.length && cap > 0 ? h('p', { class: 'muted' }, t('Discover more creatures in your levels to invite them.')) : null,
    // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
    btn(t('Back'), 'ghost wide', () => m.close()),
  ]);
}

export function expeditionSheet(app: App, after: () => void) {
  const p = app.p;
  const home = p.home;
  const e = home.expedition;
  if (e && expeditionBack(home)) {
    const got = finishExpedition(p)!;
    app.save();
    sfx.chest();
    haptic.success();
    const sp = SPECIES_BY_ID[got.species];
    const planet = got.planet >= 0 ? p.galaxy[got.planet] : null;
    const card = expeditionCard(got.species, planet ? planetName(planet.name) : t('deep space'), planet?.colors ?? [], passportName(p));
    card.classList.add('hw-card');
    const m = modal([
      h('div', { class: 'm-title' }, t('{name} is back!', { name: t(sp.name) })),
      card,
      h('div', { class: 'reward-list' }, h('span', null, gotText({ dust: got.dust, gems: got.gems, boosters: got.boosters }))),
      h(
        'div',
        { class: 'row' },
        btn(t('📮 Share postcard'), 'ghost', () =>
          shareCanvas(
            expeditionCard(got.species, planet ? planetName(planet.name) : t('deep space'), planet?.colors ?? [], passportName(p), 1080),
            t('{name} sent a postcard from {planet} 🪐 #CometGarden', {
              name: t(sp.name),
              planet: planet ? planetName(planet.name) : t('deep space'),
            }),
            'expedition-postcard',
          ),
        ),
        btn(t('Nice!'), 'primary', () => m.close()),
      ),
      // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
      btn(t('Back'), 'ghost wide', () => m.close()),
    ]);
    after();
    return;
  }
  if (e) {
    const sp = SPECIES_BY_ID[e.species];
    const box = modal([
      h('div', { class: 'm-title' }, t('Expedition')),
      critterCanvas(e.species, 90),
      h(
        'p',
        null,
        t('{name} is exploring your galaxy. Back at {time}.', { name: t(sp.name), time: whenText(e.ends, Date.now(), getLang()) }),
      ),
      // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
      btn(t('Back'), 'ghost wide', () => box.close()),
    ]);
    return;
  }
  const opts = expeditionOptions(home);
  if (!opts.length) {
    const box = modal([
      h('div', { class: 'm-title' }, t('Expedition')),
      h('p', { class: 'muted' }, t('Build a Launch Bay at Level 2 to send friends on expeditions.')),
      // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
      btn(t('Back'), 'ghost wide', () => box.close()),
    ]);
    return;
  }
  if (!home.residents.length) {
    const box = modal([
      h('div', { class: 'm-title' }, t('Expedition')),
      h('p', { class: 'muted' }, t('Invite a friend first — they love to explore.')),
      // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
      btn(t('Back'), 'ghost wide', () => box.close()),
    ]);
    return;
  }
  let who = home.residents[0].species;
  const pick = h(
    'div',
    { class: 'hw-invite' },
    ...home.residents.map((r) => {
      const el = h(
        'button',
        {
          class: `lb${r.species === who ? ' on' : ''}`,
          onclick: () => {
            who = r.species;
            pick.querySelectorAll('.lb').forEach((x) => x.classList.remove('on'));
            el.classList.add('on');
          },
        },
        critterCanvas(r.species, 44),
        h('small', null, t(SPECIES_BY_ID[r.species].name)),
      );
      return el;
    }),
  );
  const m = modal([
    h('div', { class: 'm-title' }, t('Send on an expedition')),
    h('p', { class: 'muted' }, t('Who goes? They come back with stardust, gifts and a postcard.')),
    pick,
    ...opts.map((hours) => {
      const loot = expeditionLoot(hours, towerLevel(home), who);
      return btn(
        h('span', { class: 'stack' }, h('b', null, t('{h} hours', { h: hours })), h('small', null, gotText(loot))),
        'ghost wide',
        () => {
          if (!startExpedition(p, who, hours)) return;
          sfx.launch();
          haptic.medium();
          app.save();
          m.close();
          after();
        },
      );
    }),
    // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
    btn(t('Back'), 'ghost wide', () => m.close()),
  ]);
}

/** A postcard from the expedition: the resident in front of a galaxy planet. */
function expeditionCard(species: string, planetName: string, colors: string[], from: string, W = 300): HTMLCanvasElement {
  const H = Math.round(W * 1.25);
  const c = document.createElement('canvas');
  const dpr = W < 600 ? canvasDpr() : 1;
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = `${W}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2a1a6e');
  bg.addColorStop(1, '#0b0a24');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + ((i * 37) % 10) / 15})`;
    g.beginPath();
    g.arc(((i * 97) % 100) * W * 0.01, ((i * 53) % 100) * H * 0.01, W * 0.004, 0, TAU);
    g.fill();
  }
  const pr = W * 0.34;
  const pg = g.createRadialGradient(W * 0.62 - pr * 0.3, H * 0.4 - pr * 0.3, pr * 0.1, W * 0.62, H * 0.4, pr);
  pg.addColorStop(0, colors[0] ?? '#6ee29a');
  pg.addColorStop(0.6, colors[1] ?? '#2a7fd0');
  pg.addColorStop(1, colors[2] ?? '#1a3a6e');
  g.fillStyle = pg;
  g.beginPath();
  g.arc(W * 0.62, H * 0.4, pr, 0, TAU);
  g.fill();
  drawCreature(g, species, W * 0.3, H * 0.78, 0, W * 0.34, 0.4);
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = W * 0.012;
  g.strokeRect(W * 0.03, W * 0.03, W - W * 0.06, H - W * 0.06);
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.font = `700 ${Math.round(W * 0.075)}px Fredoka, ui-rounded, system-ui, sans-serif`;
  g.fillText(t('Greetings from {planet}!', { planet: planetName }), W / 2, H * 0.1, W * 0.9);
  g.fillStyle = '#c9c2ff';
  g.font = `500 ${Math.round(W * 0.05)}px Fredoka, ui-rounded, system-ui, sans-serif`;
  g.fillText(t('to {name} · Comet Garden', { name: from }), W / 2, H * 0.95, W * 0.9);
  return c;
}

function levelOpening(level: HomeworldLevel): string {
  switch (level) {
    case 1:
      return t('Six plots and your first Labs');
    case 2:
      return t('Two more plots, Greenhouse and Launch Bay');
    case 3:
      return t('Two more plots and a third drone');
    case 4:
      return t('Two more plots and stronger Labs');
    case 5:
      return t('Fourteen plots, a ring of light and crystal buildings');
  }
}

export function levelChecklist(app: App, level: HomeworldLevel): HTMLElement {
  const p = app.p;
  const need = HOME_LEVEL_REQUIREMENTS[level];
  const item = (done: boolean, label: string) => h('div', { class: `hw-check${done ? ' done' : ''}` }, done ? '✓ ' : '○ ', label);
  return h(
    'div',
    { class: 'hw-level-checklist' },
    item(chaptersDone(p) >= need.chapter, t('Finish chapter {n}', { n: need.chapter })),
    item(p.dust >= need.dust, t('✨ {have}/{need} stardust', { have: fmt(p.dust), need: fmt(need.dust) })),
    ...Object.entries(need.essence).map(([mat, count]) =>
      item(
        (p.mats[mat as keyof typeof p.mats] ?? 0) >= count,
        t('{name}: {have}/{need}', {
          name: t(ESSENCE_NAME[mat as keyof typeof ESSENCE_NAME]),
          have: p.mats[mat as keyof typeof p.mats] ?? 0,
          need: count,
        }),
      ),
    ),
  );
}

export function levelSheet(app: App, after: () => void) {
  const p = app.p;
  const home = p.home;
  if (home.level >= 5) {
    const done = modal([
      h('div', { class: 'm-title' }, t('Homeworld Level 5')),
      h('p', null, t('Your Homeworld is fully grown. 🌍')),
      btn(t('Back'), 'ghost wide', () => done.close()),
    ]);
    return;
  }
  const r = (home.level + 1) as HomeworldLevel;
  const check = canExpand(p);
  const unlocks = BUILDING_TYPES.filter((x) => BUILDINGS[x].ring === r).map((x) => t(BUILDINGS[x].name));
  const planet = (level: number, label: string) =>
    h(
      'div',
      { class: 'hw-planet-stage' },
      h(
        'div',
        { class: `hw-mini-planet level-${level}`, 'aria-hidden': 'true' },
        ...Array.from({ length: level + 1 }, (_, i) => h('i', { style: `--i:${i}` })),
      ),
      h('small', null, label),
    );
  const m = modal([
    h('div', { class: 'm-title' }, t('Grow your Homeworld to Level {n}', { n: r })),
    h('div', { class: 'hw-level-preview' }, planet(home.level, t('Now')), planet(r, t('Next'))),
    h(
      'div',
      { class: 'howto' },
      h('p', null, levelOpening(r)),
      h('p', null, t('🌍 {n} plots (now {m})', { n: RING_PLOTS[r], m: RING_PLOTS[home.level] })),
      h('p', null, t('⬆️ Labs can reach level {n}', { n: Math.min(5, r + 1) })),
      unlocks.length ? h('p', null, t('🏗️ New: {list}', { list: unlocks.join(', ') })) : null,
      levelChecklist(app, r),
    ),
    btn(t('Grow to Level {n}', { n: r }), check === 'ok' ? 'primary wide' : 'ghost wide dim', () => {
      const res = expand(p);
      if (res === 'chapter') return toast(t('Finish chapter {n} first', { n: HOME_LEVEL_REQUIREMENTS[r].chapter }));
      if (res === 'dust' || res === 'essence') return toast(t('Check what your next Level needs'));
      if (res !== 'ok') return;
      app.save();
      m.close();
      after();
      const skyline = h(
        'div',
        { class: `hw-skyline-change level-${r}`, 'aria-hidden': 'true' },
        planet(r - 1, t('Before')),
        planet(r, t('After')),
      );
      const celebration = modal(
        [
          skyline,
          h('div', { class: 'm-title' }, t('Homeworld Level {n}!', { n: r })),
          h('p', null, levelOpening(r)),
          btn(t('Wonderful!'), 'primary wide', () => {
            show.skip();
            celebration.close();
          }),
        ],
        { cls: 'hw-level-up' },
      );
      const show = celebrate('homeworld', {
        root: celebration.el,
        reduceMotion: effectiveReduceMotion(p),
        duration: 1700,
        beats: [
          {
            at: 120,
            play: (instant) => {
              if (!instant) {
                sfx.levelUp();
                haptic.heavy();
              }
              skyline.classList.add('grown');
            },
          },
        ],
      });
    }),
    btn(t('Back'), 'ghost wide', () => m.close()),
  ]);
}

// ---------------------------------------------------------------- paint
export function paintSheet(app: App) {
  const p = app.p;
  const cur = currentPaint(p);
  const styled = homeworldStyleColors(previewLook(p));
  const row = (channel: 'ground' | 'sea') =>
    h(
      'div',
      { class: 'paint-row' },
      ...PAINTS.filter((x) => x.channel === channel && (p.chapters.length >= 1 || !x.gems)).map((x) => {
        const owned = ownsPaint(p, x.id);
        const on = !styled[channel] && cur[channel].id === x.id;
        return h(
          'button',
          {
            class: `paint${on ? ' on' : ''}${owned ? '' : ' locked'}`,
            onclick: () => {
              const r = applyPaint(p, x.id);
              if (r === 'gems') return app.needGems();
              if (r === 'unavailable') return;
              clearStyleSlot(p, channel);
              sfx.click();
              haptic.light();
              app.save();
              m.close();
              paintSheet(app);
            },
          },
          h('i', { style: `background:radial-gradient(circle at 35% 30%,${x.colors[0]},${x.colors[1]} 55%,${x.colors[2]})` }),
          h('small', null, t(x.name)),
          h('b', null, owned ? (on ? '✓' : '') : `💎${x.gems}`),
        );
      }),
      ...COSMETICS.filter((x) => x.slot === channel && owns(p, x.id) && !p.settings.hidePaidLooks).map((x) =>
        h(
          'button',
          {
            class: `paint${previewLook(p)[channel] === x.id ? ' on' : ''}`,
            onclick: () => {
              equip(p, x.id);
              sfx.click();
              haptic.light();
              app.save();
              m.close();
              paintSheet(app);
            },
          },
          h('i', { style: `background:${x.colors[0]}` }),
          h('small', null, t(x.name)),
          h('b', null, previewLook(p)[channel] === x.id ? '✓' : ''),
        ),
      ),
    );
  const m = modal([
    h('div', { class: 'm-title' }, t('Paint your Homeworld')),
    h('div', { class: 'sec-title' }, t('Ground')),
    row('ground'),
    h('div', { class: 'sec-title' }, t('Water')),
    row('sea'),
    h('p', { class: 'muted tiny' }, t('Paints are yours forever once unlocked.')),
    // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
    btn(t('Back'), 'ghost wide', () => m.close()),
  ]);
}

// ---------------------------------------------------------------- photo mode
type Frame = 'clean' | 'polaroid' | 'stars' | 'season' | 'starfield' | 'gold';
export const FRAMES: { id: Frame; name: string }[] = [
  { id: 'polaroid', name: 'Instant' },
  { id: 'clean', name: 'Clean' },
  { id: 'stars', name: 'Starry' },
  { id: 'season', name: 'Seasonal' },
  { id: 'starfield', name: 'Starfield photo frame' },
  { id: 'gold', name: 'Golden photo frame' },
];

function renderPhoto(app: App, src: HTMLCanvasElement, frame: Frame): HTMLCanvasElement {
  const p = app.p;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#231c5e');
  bg.addColorStop(1, '#0b0a24');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // the live scene, cropped to a square around the planet
  const pad = frame === 'polaroid' ? 70 : 60;
  const size = W - pad * 2;
  const sw = src.width;
  const sh = src.height;
  const side = Math.min(sw, sh);
  g.drawImage(src, (sw - side) / 2, sh * 0.55 - side / 2, side, side, pad, pad + 40, size, size);
  const font = (w: number, px: number) => `${w} ${px}px Fredoka, ui-rounded, system-ui, sans-serif`;
  const season = seasonOf(new Date(), p.settings.hemi);
  if (frame === 'polaroid') {
    g.fillStyle = '#fbf7ee';
    g.fillRect(0, 0, W, pad + 40);
    g.fillRect(0, 0, pad, H);
    g.fillRect(W - pad, 0, pad, H);
    g.fillRect(0, pad + 40 + size, W, H);
  } else {
    g.strokeStyle = frame === 'gold' ? '#ffd24a' : frame === 'starfield' ? '#6679a4' : 'rgba(255,255,255,0.8)';
    g.lineWidth = frame === 'gold' ? 18 : frame === 'starfield' ? 10 : 8;
    g.strokeRect(pad, pad + 40, size, size);
  }
  if (frame === 'starfield') {
    // Muted code-drawn stars keep the earned Golden frame brightest.
    g.fillStyle = '#99a9cf';
    for (let i = 0; i < 24; i++) {
      const x = 18 + ((i * 317) % (W - 36));
      const y = 18 + ((i * 193) % (H - 36));
      if (x > pad && x < W - pad && y > pad + 40 && y < pad + 40 + size) continue;
      g.beginPath();
      g.arc(x, y, i % 4 === 0 ? 3 : 2, 0, TAU);
      g.fill();
    }
  }
  if (frame === 'stars' || frame === 'gold') {
    const col = frame === 'gold' ? '#ffd24a' : '#fff6b0';
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      const x = W / 2 + Math.cos(a) * W * 0.5;
      const y = pad + 40 + size / 2 + Math.sin(a) * size * 0.56;
      g.fillStyle = col;
      g.font = font(700, 30 + (i % 3) * 10);
      g.textAlign = 'center';
      g.fillText('★', Math.max(30, Math.min(W - 30, x)), Math.max(60, Math.min(H - 30, y)));
    }
  }
  if (frame === 'season') drawSeason(g, W, H, 3.3, season, 0.8, 90);
  const ink = frame === 'polaroid' ? '#2a2440' : '#ffffff';
  g.textAlign = 'center';
  g.fillStyle = ink;
  g.font = font(700, 58);
  g.fillText(t("{name}'s Homeworld", { name: passportName(p) }), W / 2, pad + 40 + size + 95);
  g.font = font(500, 36);
  g.fillStyle = frame === 'polaroid' ? '#6a6480' : '#c9c2ff';
  g.fillText(
    `${SEASON_EMOJI[season]} ${t(SEASON_NAMES[season])} · ${t('Level {n}', { n: p.home.level })} · ${new Date().toLocaleDateString(getLang() || undefined)}`,
    W / 2,
    pad + 40 + size + 150,
  );
  g.font = font(700, 34);
  g.fillStyle = frame === 'polaroid' ? '#3fae6a' : '#5ef2b0';
  g.fillText('Comet Garden', W / 2, H - 40);
  return c;
}

function liveCanvas(fallback: HTMLCanvasElement) {
  return (document.querySelector('.hw-canvas') as HTMLCanvasElement | null) ?? fallback;
}

export function photoMode(app: App, src: HTMLCanvasElement) {
  const p = app.p;
  let frame: Frame = 'polaroid';
  sfx.whoosh();
  const preview = h('div', { class: 'photo-prev' });
  const paint = () => {
    const img = renderPhoto(app, src, frame);
    img.style.width = '100%';
    img.style.height = 'auto';
    preview.replaceChildren(img);
  };
  paint();
  const frames = h(
    'div',
    { class: 'photo-frames' },
    ...FRAMES.filter((f) =>
      f.id === 'gold'
        ? (p.home.landmarks.keepers_beacon.stage === 4 || !p.settings.hidePaidLooks) && owns(p, 'frame_gold')
        : f.id === 'starfield'
          ? !p.settings.hidePaidLooks && owns(p, 'frame_starfield')
          : true,
    ).map((f) => {
      const el = h(
        'button',
        {
          class: `tab${f.id === frame ? ' on' : ''}`,
          onclick: () => {
            frame = f.id;
            frames.querySelectorAll('.tab').forEach((x) => x.classList.remove('on'));
            el.classList.add('on');
            sfx.click();
            paint();
          },
        },
        t(f.name),
      );
      return el;
    }),
  );
  const box = modal([
    h('div', { class: 'm-title' }, t('Photo mode')),
    preview,
    frames,
    btn(t('📤 Share photo'), 'primary wide', () =>
      // use the live canvas (the screen may have re-rendered while this sheet was open)
      shareCanvas(renderPhoto(app, liveCanvas(src), frame), t('My Homeworld in Comet Garden ☄️'), 'homeworld-photo'),
    ),
    // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
    btn(t('Back'), 'ghost wide', () => box.close()),
  ]);
}

function nickSheet(app: App, species: string, back: () => void) {
  const p = app.p;
  const r = p.home.residents.find((x) => x.species === species);
  if (!r) return;
  const pick = (nick: string | undefined) => {
    setNick(p, species, nick);
    sfx.click();
    haptic.light();
    app.save();
    m.close();
    back();
  };
  const m = modal([
    h('div', { class: 'm-title' }, t('Name your {name}', { name: t(SPECIES_BY_ID[species].name) })),
    h('div', { class: 'pe-av' }, critterCanvas(species, 80)),
    h('div', { class: 'nick-grid' }, ...NICKNAMES.map((n) => btn(n, `ghost small${r.nick === n ? ' on' : ''}`, () => pick(n)))),
    r.nick ? btn(t('No nickname'), 'ghost wide', () => pick(undefined)) : null,
    // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
    btn(t('Back'), 'ghost wide', () => m.close()),
  ]);
}

function accSheet(app: App, species: string, back: () => void) {
  const p = app.p;
  const r = p.home.residents.find((x) => x.species === species);
  if (!r) return;
  const pick = (id: string | undefined) => {
    const res = wearAcc(p, species, id);
    if (res === 'gems') return app.needGems();
    if (res === 'locked')
      return toast(
        RESIDENT_ACCS.find((a) => a.id === id)?.fest ? t('Earn it in a monthly festival') : t('Become better friends to unlock it'),
      );
    sfx.click();
    haptic.light();
    app.save();
    m.close();
    back();
  };
  const m = modal([
    h('div', { class: 'm-title' }, t('Dress up {name}', { name: r.nick ?? t(SPECIES_BY_ID[species].name) })),
    h('div', { class: 'pe-av' }, critterCanvas(species, 96, 0.4, r.acc)),
    h(
      'div',
      { class: 'acc-grid' },
      ...RESIDENT_ACCS.filter((a) => p.chapters.length >= 1 || !a.gems).map((a) => {
        const ok = accAvailable(p, r, a.id);
        return h(
          'button',
          { class: `acc${r.acc === a.id ? ' on' : ''}${ok ? '' : ' locked'}`, onclick: () => pick(a.id) },
          critterCanvas(species, 54, 0.4, a.id),
          h('small', null, t(a.name)),
          h('b', null, ok ? '' : a.friend ? `💖${a.friend}` : a.fest ? '🎪' : `💎${a.gems}`),
        );
      }),
    ),
    r.acc ? btn(t('Take it off'), 'ghost wide', () => pick(undefined)) : null,
    // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
    btn(t('Back'), 'ghost wide', () => m.close()),
  ]);
}
