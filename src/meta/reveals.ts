// UI reveals preserve purchases and features a player has already used.
import type { Profile } from './profile';
import { lateOpen, unlocked } from './unlocks';
import { COSMETICS, owns, currentLook, DEFAULT_LOOK, type StyleSlot, type Cosmetic } from './cosmetics';
import { bayLevel, busyDrones, drones } from './homeworld';
import { habitatsReady } from './habitats';

export const ownsBought = (p: Profile, slot: StyleSlot): boolean =>
  COSMETICS.some((x) => x.slot === slot && x.source !== 'free' && owns(p, x.id));
export const atmosphereTab = (p: Profile): boolean =>
  lateOpen(p) || p.skin !== 'classic' || p.skins.some((s) => s !== 'classic') || p.starter || p.pass;
export const dyeTab = (p: Profile): boolean => lateOpen(p) || p.dyes.length > 0 || !!p.dye.main || !!p.dye.trim;
export const presetsRow = (p: Profile): boolean => lateOpen(p) || (p.presets ?? []).some(Boolean);
export const friendOutfitsTab = (p: Profile): boolean => lateOpen(p) || ownsBought(p, 'friendOutfit') || !!currentLook(p).friendOutfit;
export const launcherLooksTab = (p: Profile): boolean =>
  unlocked(p, 'launcher_swoop') ||
  p.legacyUnlocks.includes('noun-window') ||
  currentLook(p).launcher !== DEFAULT_LOOK.launcher ||
  COSMETICS.some((x) => x.slot === 'launcher' && !['free', 'chapter'].includes(x.source) && owns(p, x.id));
export const buddyTab = (p: Profile): boolean => unlocked(p, 'buddy') || !!p.buddy.species || p.legacyUnlocks.includes('noun-window');
export const paintButton = (p: Profile): boolean =>
  lateOpen(p) ||
  p.starter ||
  p.pass ||
  p.home.paints.length > 0 ||
  ownsBought(p, 'ground') ||
  ownsBought(p, 'sea') ||
  p.home.paint.ground !== 'meadow' ||
  p.home.paint.sea !== 'blue';
export const homeworldSlotRow = (p: Profile, s: StyleSlot): boolean =>
  !!currentLook(p)[s] || COSMETICS.some((x) => x.slot === s && owns(p, x.id)) || (['ground', 'sea'].includes(s) && paintButton(p));
export const photoButton = (p: Profile): boolean => lateOpen(p) || p.pass || owns(p, 'frame_gold') || owns(p, 'frame_starfield');
export const expeditionButton = (p: Profile, now: number): boolean => bayLevel(p.home, now) >= 1 || !!p.home.expedition;
/** Before planet 21 the Launch Bay has no use (launchers start at 31, trips at 21), so a new player can't build one yet. */
export const launchBayBuildable = (p: Profile): boolean =>
  lateOpen(p) || p.home.plots.some((b) => b?.type === 'launch_bay') || !!p.home.expedition;
export const landsSection = (p: Profile): boolean => lateOpen(p) || p.home.gaps.some((g) => g !== null);
export const dronesNamed = (p: Profile, now: number): boolean => lateOpen(p) || p.home.level >= 3 || busyDrones(p.home, now) >= drones(p);
export const postcardButton = (p: Profile): boolean => lateOpen(p);
export const inboxOpen = (p: Profile): boolean => unlocked(p, 'inbox') && (lateOpen(p) || p.mail.some((m) => m.read || m.claimed));
export const habitatSetsVisible = (p: Profile): boolean => lateOpen(p) || p.habitats.length > 0 || habitatsReady(p).length > 0;
export const mementosVisible = (p: Profile): boolean => p.mementos.length > 0;
export function sourceOpen(p: Profile, src: Cosmetic['source']): boolean {
  switch (src) {
    case 'wish':
      return unlocked(p, 'quests');
    case 'road':
      return unlocked(p, 'star_road');
    case 'calendar':
      return unlocked(p, 'star_calendar');
    case 'constellation':
      return unlocked(p, 'star_atlas');
    case 'habitat':
      return habitatSetsVisible(p);
    default:
      return true;
  }
}
