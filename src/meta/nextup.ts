import { tripVisible } from './reveals';
import { HOMEWORLD_MAX_LEVEL } from './tuning';
import { t } from '../i18n';
import type { Profile } from './profile';
import { UNLOCKS, unlocked } from './unlocks';
import { chestsReady } from './progression';
import { roadReady } from './starroad';
import { wishClaimable, wishText, type WishCard } from './wishes';
import { CONSTELLATIONS } from './tuning';
import { habitatProgress, habitatsReady, HABITATS } from './habitats';
import { firstHourStep } from './firsthour';
import { LAB_TEXT } from './labcopy';
import { HOME_LEVEL_REQUIREMENTS } from './tuning';
import { canExpand, chaptersDone, anyReady } from './homeworld';
import type { HomeworldLevel } from './homeworldTypes';
import { activeLandmark, landmarkFinishStatus } from './landmarks';
import { canLevelLab, labLevel } from './labs';
import { LAB_NAME } from './labcopy';
import { KINDS, SPECIES_BY_ID, type Kind } from '../core/world';
import { LAUNCHER_ESSENCE, TUNE_COST, launcherBay } from './launchbay';
import { bayLevel } from './homeworld';
import { M13_STRINGS } from './m13strings';
import type { Mat } from './constellations';
import { LAB_ESSENCE, labCost, labPlot } from './labs';
import { LANDMARKS } from './tuning';
import { landmarkState } from './landmarks';
import { MATS, unlockedConstellation } from './constellations';
import type { LauncherId } from '../core/launchers';

import { inboxOpen, habitatSetsVisible } from './reveals';

const landmarkAsk = (site: NonNullable<ReturnType<typeof activeLandmark>>, stage: number): string =>
  stage === 3 ? 'Bring Essences to finish this Landmark' : site.stages[stage].ask;

export interface NextUp {
  kind: 'unlock' | 'claim' | 'wish' | 'goal' | 'play';
  title: string;
  subtitle: string;
  homeTarget?: 'celebration' | 'landmark' | 'level' | 'lab' | 'launcher' | 'planet' | 'expedition';
  action:
    | 'play'
    | 'missions'
    | 'homeworld'
    | 'collection'
    | 'starmap'
    | 'lifebook'
    | 'passport'
    | 'styles'
    | 'inbox'
    | 'calendar'
    | 'album'
    | 'sky'
    | 'road'
    | 'voyage'
    | 'festival'
    | 'modes';
}

export const NEW_FEATURE: Record<string, string> = {
  quests: 'Missions',
  star_calendar: 'Star Calendar',
  star_atlas: 'Star Atlas',
  sticker_album: 'Sticker Album',
  lifebook: 'Lifebook',
  passport: 'Passport',
  workshop: 'Styles',
  daily: 'Daily Planet',
  zen: 'Zen Garden',
  rush: 'Meteor Rush',
  challenge: 'Challenge a Friend',
};

const TARGETS: Record<string, NextUp['action']> = {
  quests: 'missions',
  star_road: 'road',
  star_calendar: 'calendar',
  star_atlas: 'sky',
  sticker_album: 'album',
  lifebook: 'lifebook',
  passport: 'passport',
  workshop: 'styles',
  inbox: 'inbox',
  homeworld: 'homeworld',
  voyage: 'voyage',
  festival: 'festival',
  daily: 'modes',
  zen: 'modes',
  rush: 'modes',
  challenge: 'modes',
  quest_spot: 'missions',
  quest_voyage: 'missions',
};

/** One gentle suggestion, with actions understood by the Play tab. */
export function nextUp(p: Profile, _now: number): NextUp {
  if (tripVisible(p, _now) && p.home.tripReturn) return expeditionNextUp(p);
  if (chestsReady(p).length)
    return { kind: 'claim', title: t('A chapter chest is ready'), subtitle: t('Open your chapter chest'), action: 'starmap' };
  const intro = UNLOCKS.find(
    (x) =>
      x.planet === p.level - 1 &&
      (x.intro || x.button || x.placement === 'modes') &&
      unlocked(p, x.id) &&
      !p.legacyUnlocks.includes(x.id) &&
      !p.mailSeen.includes(`coach-${x.id}`) &&
      (x.id !== 'inbox' || inboxOpen(p)) &&
      (x.id !== 'homeworld' || firstHourStep(p) !== 'done') &&
      (!['quests', 'star_road', 'star_calendar', 'inbox'].includes(x.id) || unlocked(p, 'quests')) &&
      (x.id !== 'workshop' || p.chapters.length >= 1),
  );
  if (intro && Math.max(0, p.meta.sessions - 1) % 2 === 0)
    return {
      kind: 'unlock',
      title: t(intro.intro?.title ?? NEW_FEATURE[intro.id] ?? 'A new place to explore'),
      subtitle: t(intro.intro?.body ?? 'A new place is open'),
      action:
        TARGETS[intro.id] ?? (intro.placement === 'collection' ? 'collection' : intro.placement === 'homeworld' ? 'homeworld' : 'play'),
    };
  if (p.home.plots.some((b) => b && b.done && b.done <= _now))
    return { kind: 'claim', title: t('A Homeworld build is ready'), subtitle: t('Visit your Homeworld'), action: 'homeworld' };
  if (unlocked(p, 'quests') && ((unlocked(p, 'star_road') && roadReady(p).length) || wishClaimable(p)))
    return { kind: 'claim', title: t('A reward is ready'), subtitle: t('Visit Missions'), action: 'missions' };
  if (unlocked(p, 'lifebook') && habitatsReady(p).length)
    return { kind: 'claim', title: t('A reward is ready'), subtitle: t('Lifebook'), action: 'lifebook' };
  const nearWish = (p.quests.list as WishCard[]).find((q) => q.template && q.species && !q.claimed && q.progress >= q.goal * 0.8);

  if (unlocked(p, 'quests') && nearWish && firstHourStep(p) !== 'done')
    return { kind: 'wish', title: t('A Wish is growing'), subtitle: wishText(nearWish), action: 'missions' };
  if (unlocked(p, 'homeworld') && firstHourStep(p) !== 'done')
    return {
      kind: 'goal',
      title: t(firstHourStep(p) === 'lab' ? LAB_TEXT.firstLab : LAB_TEXT.firstFriend),
      subtitle: t(LAB_TEXT.firstReward),
      action: 'homeworld',
    };
  const suggestions: NextUp[] = [];
  if (unlocked(p, 'quests') && nearWish)
    suggestions.push({ kind: 'wish', title: t('A Wish is growing'), subtitle: wishText(nearWish), action: 'missions' });
  const constellation = CONSTELLATIONS.find((c) => !p.constellations.includes(c.id) && c.bundles.some((b) => p.bundles.includes(b.id)));
  if (unlocked(p, 'star_atlas') && constellation)
    suggestions.push({ kind: 'goal', title: t('Grow your Star Atlas'), subtitle: t('A constellation is taking shape'), action: 'sky' });
  const habitat = HABITATS.find(
    (h) =>
      !p.habitats.includes(h.id) &&
      habitatProgress(p, h) < h.species.length &&
      habitatProgress(p, h) >= h.species.length - 2 &&
      h.species.filter((id) => !p.seen.includes(id)).every((id) => ['common', 'uncommon'].includes(SPECIES_BY_ID[id]?.rarity)),
  );
  if (unlocked(p, 'lifebook') && habitatSetsVisible(p) && habitat)
    suggestions.push({
      kind: 'goal',
      title: t('Meet more creatures'),
      subtitle: t('{name} is taking shape', { name: t(habitat.name) }),
      action: 'lifebook',
    });
  if (unlocked(p, 'homeworld') && anyReady(p.home, _now)) suggestions.push(homeworldNextUp(p, _now));
  // Rotate by real session, not by render count: revisiting a screen never changes its task.
  suggestions.push({ kind: 'play', title: t('Play planet {n}', { n: p.level }), subtitle: t('A new planet is waiting'), action: 'play' });
  return suggestions[Math.max(0, p.meta.sessions - 1) % suggestions.length];
}

function expeditionNextUp(p: Profile): NextUp {
  return {
    kind: 'claim',
    title: M13_STRINGS.friendBack(),
    subtitle: t('Visit your Homeworld'),
    action: 'homeworld',
    homeTarget: 'expedition',
  };
}

/** One specific, actionable suggestion in the Homeworld overview. */
export function homeworldNextUp(p: Profile, now = Date.now()): NextUp {
  if (tripVisible(p, now) && p.home.tripReturn) return expeditionNextUp(p);
  if (p.home.seen.celebrations.some((id) => !id.startsWith('trip:') || tripVisible(p, now)))
    return {
      kind: 'claim',
      title: t('A Homeworld celebration is waiting'),
      subtitle: t('See what you earned'),
      action: 'homeworld',
      homeTarget: 'celebration',
    };
  const first = firstHourStep(p);
  if (first !== 'done')
    return {
      kind: 'goal',
      title: t(first === 'lab' ? LAB_TEXT.firstLab : LAB_TEXT.firstFriend),
      subtitle: t(LAB_TEXT.firstReward),
      action: 'homeworld',
    };
  const site = activeLandmark(p);
  if (site && landmarkFinishStatus(p, site.id) === 'ready')
    return {
      kind: 'claim',
      title: t(site.name),
      subtitle: t('Your Landmark is ready to finish'),
      action: 'homeworld',
      homeTarget: 'landmark',
    };
  if (p.home.level < HOMEWORLD_MAX_LEVEL && canExpand(p) === 'ok')
    return {
      kind: 'claim',
      title: t('Homeworld Level {n}', { n: p.home.level + 1 }),
      subtitle: t('Your next Level is ready'),
      action: 'homeworld',
      homeTarget: 'level',
    };
  const needed = nextEssenceNeeded(p);
  const lab = (Object.keys(KINDS) as Kind[])
    .sort((a, b) => Number(LAB_ESSENCE[b] === needed) - Number(LAB_ESSENCE[a] === needed))
    .find((kind) => canLevelLab(p, kind) === 'ok');
  if (lab)
    return {
      kind: 'goal',
      title: t('Grow your {name}', { name: t(LAB_NAME[lab]) }),
      subtitle: t('Lab Level {n} is ready', { n: labLevel(p, lab) + 1 }),
      action: 'homeworld',
      homeTarget: 'lab',
    };
  const launcher = launcherBay.owned(p).find((id) => {
    if (id === 'sling') return false;
    const next = launcherBay.tune(p, id) + 1;
    if (next > 4) return false;
    const cost = TUNE_COST[next as 2 | 3 | 4];
    return (
      bayLevel(p.home) >= cost.bay &&
      (p.launcher.flings[id] ?? 0) >= cost.flings &&
      p.dust >= cost.dust &&
      (p.mats[LAUNCHER_ESSENCE[id]!] ?? 0) >= cost.essence
    );
  });
  if (launcher)
    return { kind: 'goal', title: t('Tune a launcher'), subtitle: t('Visit your Launch Bay'), action: 'homeworld', homeTarget: 'launcher' };
  if (p.home.plots.some((b) => b?.done && b.done <= now))
    return { kind: 'claim', title: t('A Homeworld build is ready'), subtitle: t('Tap its plot to see what opened'), action: 'homeworld' };
  if (p.home.plots.some((b) => b?.type === 'greenhouse' && (b.greenhouse?.stored ?? 0) > 0))
    return { kind: 'claim', title: t('A booster is ready'), subtitle: t('Collect it from your Greenhouse'), action: 'homeworld' };
  if (p.home.level >= HOMEWORLD_MAX_LEVEL) {
    if (site)
      return {
        kind: 'goal',
        title: t(site.name),
        subtitle: t(landmarkAsk(site, p.home.landmarks[site.id].stage)),
        action: 'homeworld',
        homeTarget: 'landmark',
      };
    return {
      kind: 'play',
      title: t('Play planet {n}', { n: p.level }),
      subtitle: t('A new planet is waiting'),
      action: 'play',
      homeTarget: 'planet',
    };
  }
  const level = (p.home.level + 1) as HomeworldLevel;
  const need = HOME_LEVEL_REQUIREMENTS[level];
  if (chaptersDone(p) < need.chapter)
    return {
      kind: 'goal',
      title: t('Homeworld Level {n}', { n: level }),
      subtitle: t('Finish chapter {n}', { n: need.chapter }),
      action: 'homeworld',
    };
  if (p.dust < need.dust)
    return {
      kind: 'goal',
      title: t('Homeworld Level {n}', { n: level }),
      subtitle: t('Collect stardust for your next Level'),
      action: 'homeworld',
    };
  if (canExpand(p) === 'essence')
    return {
      kind: 'goal',
      title: t('Homeworld Level {n}', { n: level }),
      subtitle: t('See the Essence your next Level needs'),
      action: 'homeworld',
    };
  if (site)
    return {
      kind: 'goal',
      title: t(site.name),
      subtitle: t(landmarkAsk(site, p.home.landmarks[site.id].stage)),
      action: 'homeworld',
      homeTarget: 'landmark',
    };
  return {
    kind: 'play',
    title: t('Play planet {n}', { n: p.level }),
    subtitle: t('A new planet is waiting'),
    action: 'play',
    homeTarget: 'planet',
  };
}

/** The closest unfinished Essence checklist, shared by trip sorting and Next Up. */
export function nextEssenceNeeded(p: Profile): Mat | undefined {
  const checklists: Partial<Record<Mat, number>>[] = [];
  if (p.home.level < HOMEWORLD_MAX_LEVEL) checklists.push(HOME_LEVEL_REQUIREMENTS[(p.home.level + 1) as HomeworldLevel].essence);
  for (const kind of Object.keys(KINDS) as Kind[]) {
    const level = labLevel(p, kind);
    if (labPlot(p, kind) >= 0 && level < 5) checklists.push({ [LAB_ESSENCE[kind]]: labCost(kind, (level + 1) as 2 | 3 | 4 | 5).amount });
  }
  const site = activeLandmark(p);
  if (site) checklists.push(site.delivery);
  const pending = checklists
    .map((need) => {
      const gaps = (Object.entries(need) as [Mat, number][]).map(([mat, amount]) => ({
        mat,
        gap: Math.max(0, amount - (p.mats[mat] ?? 0)),
      }));
      return { gaps, missing: gaps.reduce((sum, row) => sum + row.gap, 0) };
    })
    .filter((item) => item.missing > 0)
    .sort((a, b) => a.missing - b.missing);
  return pending[0]?.gaps.sort((a, b) => b.gap - a.gap)[0]?.mat;
}

/**
 * Decision 65 amendment: Essences still wanted by every sink Next Up can point to — Homeworld Levels,
 * Lab levels, Landmark deliveries, launcher tunes and the Star Atlas constellations that are open now.
 * Dyes are not counted: Next Up never names them.
 */
export function essenceStillWanted(p: Profile): Record<Mat, number> {
  const want = Object.fromEntries(MATS.map((mat) => [mat, 0])) as Record<Mat, number>;
  const add = (need: Partial<Record<Mat, number>>) => {
    for (const [mat, amount] of Object.entries(need) as [Mat, number][]) want[mat] += amount;
  };
  for (let level = p.home.level + 1; level <= HOMEWORLD_MAX_LEVEL; level++) add(HOME_LEVEL_REQUIREMENTS[level as HomeworldLevel].essence);
  for (const kind of Object.keys(KINDS) as Kind[])
    for (let level = labLevel(p, kind) + 1; level <= 5; level++) want[LAB_ESSENCE[kind]] += labCost(kind, level as 2 | 3 | 4 | 5).amount;
  for (const site of LANDMARKS) if (landmarkState(p, site.id).stage < 4) add(site.delivery);
  CONSTELLATIONS.forEach((c, i) => {
    if (unlockedConstellation(p, i)) for (const b of c.bundles) if (!p.bundles.includes(b.id)) add(b.need);
  });
  for (const [id, mat] of Object.entries(LAUNCHER_ESSENCE) as [LauncherId, Mat][])
    for (let tune = launcherBay.tune(p, id) + 1; tune <= 4; tune++) want[mat] += TUNE_COST[tune as 2 | 3 | 4].essence;
  return want;
}

/** Colours the child already holds enough of for every sink in essenceStillWanted. */
export function essencesCovered(p: Profile): Mat[] {
  const want = essenceStillWanted(p);
  return MATS.filter((mat) => (p.mats[mat] ?? 0) >= want[mat]);
}
