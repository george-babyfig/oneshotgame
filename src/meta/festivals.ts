import { FESTIVAL_TIERS } from './tuning';
// Monthly festivals: every calendar month has a theme, and while it runs the
// creatures on your planets wear that month's costume. Spot enough costumed
// critters for the festival's sticker, gems and a keepsake your Homeworld
// residents can wear. The same festivals come back every year; nothing is sold.
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';
import { unlocked } from './unlocks';

export interface Festival {
  id: string;
  name: string;
  emoji: string;
  /** Costume accessory drawn on creatures (see drawAccessory in critters.ts). */
  acc: string;
  color: string;
}

/** One per month, January first. No weather themes, so both hemispheres fit. */
export const FESTIVALS: Festival[] = [
  { id: 'sparkle', name: 'New Year Sparkle', emoji: '🎉', acc: 'party', color: '#ffd84a' },
  { id: 'friend', name: 'Friendship Fair', emoji: '💗', acc: 'heart', color: '#ff8fc8' },
  { id: 'sprout', name: 'Sprout Day', emoji: '🌱', acc: 'leaf', color: '#7fe07a' },
  { id: 'puddle', name: 'Puddle Parade', emoji: '☔', acc: 'rainhat', color: '#ffd24a' },
  { id: 'crown', name: 'Flower Crown Fest', emoji: '🌼', acc: 'wreath', color: '#ffb3e6' },
  { id: 'splash', name: 'Sunny Splash', emoji: '😎', acc: 'shades', color: '#3fd0ff' },
  { id: 'picnic', name: 'Star Picnic', emoji: '⭐', acc: 'star', color: '#ffe066' },
  { id: 'lantern', name: 'Lantern Night', emoji: '🏮', acc: 'lantern', color: '#ff9a4a' },
  { id: 'acorn', name: 'Acorn Harvest', emoji: '🌰', acc: 'acorn', color: '#c98a4a' },
  { id: 'costume', name: 'Costume Parade', emoji: '🎃', acc: 'pumpkin', color: '#ff8a2a' },
  { id: 'knit', name: 'Cozy Knit Month', emoji: '🧶', acc: 'knit', color: '#b58cff' },
  { id: 'twinkle', name: 'Twinkle Festival', emoji: '✨', acc: 'pom', color: '#ff6a7a' },
];

export const FESTIVAL_BY_ID: Record<string, Festival> = Object.fromEntries(FESTIVALS.map((f) => [f.id, f]));

/** Festivals open on planet 34. */
export { FESTIVAL_UNLOCK_LEVEL } from './unlocks';

export interface FestivalTier {
  spot: number;
  reward: Reward;
  /** Unlocks the festival sticker. */
  sticker?: boolean;
  /** Unlocks the costume for Homeworld residents. */
  acc?: boolean;
}

export { FESTIVAL_TIERS } from './tuning';

export function festivalOn(d = new Date()): Festival {
  return FESTIVALS[d.getMonth()];
}

export function festivalKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function festivalActive(p: Profile) {
  return unlocked(p, 'festival');
}

/** This month's festival still has tiers to earn. A festival runs every month,
 *  so the festival music plays only until its track is finished. */
export function festivalLive(p: Profile, d = new Date()) {
  if (!festivalActive(p)) return false;
  ensureFestival(p, d);
  return p.festival.claimed.length < FESTIVAL_TIERS.length;
}

/** Days left in this month's festival (1 on the last day). */
export function festivalDaysLeft(d = new Date()) {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate() + 1;
}

export function ensureFestival(p: Profile, d = new Date()): Festival {
  const key = festivalKey(d);
  const month = (value: string) => {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return NaN;
    return Number(match[1]) * 12 + Number(match[2]);
  };
  if (key > p.festival.key || (key < p.festival.key && month(p.festival.key) - month(key) !== 1))
    p.festival = { key, spotted: 0, claimed: [] };
  return FESTIVALS[Number(p.festival.key.slice(5)) - 1] ?? festivalOn(d);
}

/** A costumed creature appeared on a planet. */
export function spotFestival(p: Profile, d = new Date()) {
  if (!festivalActive(p)) return;
  ensureFestival(p, d);
  p.festival.spotted++;
}

export function festivalReady(p: Profile, d = new Date()): number[] {
  if (!festivalActive(p)) return [];
  ensureFestival(p, d);
  return FESTIVAL_TIERS.map((tier, i) => (p.festival.spotted >= tier.spot && !p.festival.claimed.includes(i) ? i : -1)).filter(
    (i) => i >= 0,
  );
}

/** Claim a tier: pays its reward and keeps the sticker/costume forever. */
export function claimFestival(p: Profile, i: number, d = new Date()): Reward | null {
  const f = ensureFestival(p, d);
  const tier = FESTIVAL_TIERS[i];
  if (!tier || p.festival.spotted < tier.spot || p.festival.claimed.includes(i)) return null;
  p.festival.claimed = [...p.festival.claimed, i];
  applyReward(p, tier.reward, 'festival');
  if (tier.sticker && !p.album.fest.includes(f.id)) p.album.fest = [...p.album.fest, f.id];
  if (tier.acc && !p.home.accs.includes(f.acc)) p.home.accs = [...p.home.accs, f.acc];
  return tier.reward;
}
