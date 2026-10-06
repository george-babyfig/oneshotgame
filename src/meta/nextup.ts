import { t } from '../i18n';
import type { Profile } from './profile';
import { UNLOCKS, unlocked } from './unlocks';
import { chestsReady, roadReady } from './progression';
import { wishClaimable, wishText, type WishCard } from './wishes';
import { CONSTELLATIONS } from './tuning';
import { habitatProgress, HABITATS } from './habitats';
import { firstHourStep } from './firsthour';
import { LAB_TEXT } from './labcopy';
import { HOME_LEVEL_REQUIREMENTS } from './tuning';
import { canExpand, chaptersDone } from './homeworld';
import type { HomeworldLevel } from './homeworldTypes';
import { activeLandmark, landmarkFinishStatus } from './landmarks';
import { canLevelLab, labLevel } from './labs';
import { LAB_NAME } from './labcopy';
import { KINDS, type Kind } from '../core/world';
import { LAUNCHER_ESSENCE, TUNE_COST, launcherBay } from './launchbay';
import { bayLevel } from './homeworld';

const landmarkAsk = (site: NonNullable<ReturnType<typeof activeLandmark>>, stage: number): string =>
  stage === 3 ? 'Bring Essences to finish this Landmark' : site.stages[stage].ask;

export interface NextUp {
  kind: 'unlock' | 'claim' | 'wish' | 'goal' | 'play';
  title: string;
  subtitle: string;
  homeTarget?: 'celebration' | 'landmark' | 'level' | 'lab' | 'launcher' | 'planet';
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
    | 'event'
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
  weekly_event: 'event',
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
  const intro = UNLOCKS.find(
    (x) =>
      x.planet === p.level - 1 &&
      (x.intro || x.button || x.placement === 'modes') &&
      unlocked(p, x.id) &&
      (x.id !== 'homeworld' || firstHourStep(p) !== 'done') &&
      (!['quests', 'star_road', 'star_calendar', 'inbox'].includes(x.id) || unlocked(p, 'quests')) &&
      (x.id !== 'workshop' || p.chapters.length >= 1),
  );
  if (intro)
    return {
      kind: 'unlock',
      title: t(intro.intro?.title ?? NEW_FEATURE[intro.id] ?? 'A new place to explore'),
      subtitle: t(intro.intro?.body ?? 'A new place is open'),
      action:
        TARGETS[intro.id] ?? (intro.placement === 'collection' ? 'collection' : intro.placement === 'homeworld' ? 'homeworld' : 'play'),
    };
  if (chestsReady(p).length)
    return { kind: 'claim', title: t('A chapter chest is ready'), subtitle: t('Open your chapter chest'), action: 'starmap' };
  if (p.home.plots.some((b) => b && b.done && b.done <= _now))
    return { kind: 'claim', title: t('A Homeworld build is ready'), subtitle: t('Visit your Homeworld'), action: 'homeworld' };
  if (unlocked(p, 'quests') && ((unlocked(p, 'star_road') && roadReady(p).length) || wishClaimable(p)))
    return { kind: 'claim', title: t('A reward is ready'), subtitle: t('Visit Missions'), action: 'missions' };
  const nearWish = (p.quests.list as WishCard[]).find((q) => q.template && q.species && !q.claimed && q.progress >= q.goal * 0.8);
  if (unlocked(p, 'quests') && nearWish)
    return { kind: 'wish', title: t('A Wish is growing'), subtitle: wishText(nearWish), action: 'missions' };
  if (unlocked(p, 'homeworld') && firstHourStep(p) !== 'done')
    return {
      kind: 'goal',
      title: t(firstHourStep(p) === 'lab' ? LAB_TEXT.firstLab : LAB_TEXT.firstFriend),
      subtitle: t(LAB_TEXT.firstReward),
      action: 'homeworld',
    };
  const constellation = CONSTELLATIONS.find((c) => !p.constellations.includes(c.id) && c.bundles.some((b) => p.bundles.includes(b.id)));
  if (unlocked(p, 'star_atlas') && constellation)
    return { kind: 'goal', title: t('Grow your Star Atlas'), subtitle: t('A constellation is taking shape'), action: 'sky' };
  const habitat = HABITATS.find((h) => !p.habitats.includes(h.id) && habitatProgress(p, h) >= h.species.length - 2);
  if (unlocked(p, 'lifebook') && habitat)
    return {
      kind: 'goal',
      title: t('Meet more creatures'),
      subtitle: t('{name} is taking shape', { name: t(habitat.name) }),
      action: 'lifebook',
    };
  return { kind: 'play', title: t('Play planet {n}', { n: p.level }), subtitle: t('A new planet is waiting'), action: 'play' };
}

/** One specific, actionable suggestion in the Homeworld overview. */
export function homeworldNextUp(p: Profile, now = Date.now()): NextUp {
  if (p.home.seen.celebrations.length)
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
  if (p.home.level < 5 && canExpand(p) === 'ok')
    return {
      kind: 'claim',
      title: t('Homeworld Level {n}', { n: p.home.level + 1 }),
      subtitle: t('Your next Level is ready'),
      action: 'homeworld',
      homeTarget: 'level',
    };
  const lab = (Object.keys(KINDS) as Kind[]).find((kind) => canLevelLab(p, kind) === 'ok');
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
  if (p.home.level >= 5) {
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
