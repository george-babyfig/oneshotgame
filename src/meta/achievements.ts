// Game Center achievements and leaderboards, evaluated from the profile.
// IDs must match what you create in App Store Connect (see store/gamecenter.md).
import type { Profile } from './profile';
import { ownedStickers } from './stickers';
import { remixFrame, remixStars } from './remix';

const stickerCount = (p: Profile) => ownedStickers(p).length;
const remixChapters = (p: Profile) => Object.keys(p.remix ?? {}).map(Number);
const goldFrames = (p: Profile) => remixChapters(p).filter((chapter) => remixFrame(p, chapter) === 'gold').length;

const PREFIX = 'com.pocketplanet.game.';

export const LEADERBOARDS = {
  stars: `${PREFIX}lb.stars`,
  life: `${PREFIX}lb.life`,
  rush: `${PREFIX}lb.rush`,
  daily: `${PREFIX}lb.daily`,
} as const;

export interface AchievementDef {
  id: string;
  title: string;
  points: number;
  done: (p: Profile) => boolean;
}

const a = (id: string, title: string, points: number, done: (p: Profile) => boolean): AchievementDef => ({
  id: `${PREFIX}ach.${id}`,
  title,
  points,
  done,
});

export const ACHIEVEMENTS: AchievementDef[] = [
  a('first_planet', 'First World', 10, (p) => p.stats.wins >= 1),
  a('planets_10', 'Planet Maker', 20, (p) => p.stats.wins >= 10),
  a('planets_50', 'World Builder', 40, (p) => p.stats.wins >= 50),
  a('planets_100', 'Galaxy Architect', 80, (p) => p.stats.wins >= 100),
  a('first_creature', 'Hello, Neighbor', 10, (p) => p.seen.length >= 1),
  a('lifebook_half', 'Field Naturalist', 40, (p) => p.seen.length >= 18),
  a('lifebook_full', 'Every Critter', 100, (p) => p.seen.length >= 36),
  a('legend', 'Living Legend', 50, (p) => p.seen.includes('worldtree') || p.seen.includes('leviathan')),
  a('three_star_10', 'Perfectionist', 30, (p) => p.stats.threeStars >= 10),
  a('chapter_1', 'Chapter One', 15, (p) => p.chapters.length >= 1),
  a('chapter_5', 'Star Voyager', 50, (p) => p.chapters.length >= 5),
  a('rank_5', 'Sky Sculptor', 30, (p) => p.rank >= 5 || p.chapters.includes(4)),
  a('rank_8', 'Cosmic Architect', 60, (p) => p.rank >= 8 || p.chapters.includes(7)),
  a('momentum_3', 'On a Roll', 20, (p) => p.stats.bestStreak >= 3),
  a('hard_10', 'Tough Worlds', 40, (p) => p.stats.hardWins >= 10),
  a('rush_300', 'Meteor Master', 30, (p) => p.stats.rushBest >= 300),
  a('daily_7', 'Daily Explorer', 30, (p) => p.stats.dailies >= 7),
  a('habitat_1', 'Home Sweet Home', 20, (p) => p.habitats.length >= 1),
  a('habitat_all', 'Every Habitat', 80, (p) => p.habitats.length >= 6),
  a('memento_10', 'Keepsake Keeper', 30, (p) => p.mementos.length >= 10),
  a('challenge_win', 'Friendly Rival', 20, (p) => p.challengeLog.some((c) => c.vs > 0 && c.score > c.vs)),
  a('zen_100', 'Inner Peace', 15, (p) => p.stats.zenThrows >= 100),
  a('voyage_1', 'Bon Voyage', 15, (p) => p.voyageDone >= 1),
  a('voyage_10', 'Seasoned Sailor', 40, (p) => p.voyageDone >= 10),
  a('festival_1', 'Party Planet', 15, (p) => p.album.fest.length >= 1),
  a('stickers_30', 'Sticker Star', 25, (p) => stickerCount(p) >= 30),
  a('buddy_1', 'Best Buddies', 10, (p) => !!p.buddy.species),
  a('remix_first', 'First Remix', 10, (p) => remixChapters(p).some((chapter) => remixFrame(p, chapter) !== 'none')),
  a('remix_boss', 'Remix a Comet Guardian', 10, (p) => remixChapters(p).some((chapter) => remixStars(p, chapter)[9] > 0)),
  a('remix_gold_1', 'First Gold Frame', 10, (p) => goldFrames(p) >= 1),
  a('remix_gold_5', 'Five Gold Frames', 15, (p) => goldFrames(p) >= 5),
  a('remix_gold_10', 'Ten Gold Frames', 30, (p) => goldFrames(p) >= 10),
];

/** Achievements newly earned but not yet reported. */
export function pendingAchievements(p: Profile): AchievementDef[] {
  return ACHIEVEMENTS.filter((x) => !p.gcReported.includes(x.id) && x.done(p));
}
