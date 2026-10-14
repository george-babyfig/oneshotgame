// Every Lab phrase shown to a player is kept here for translation inventory.
import type { Kind } from '../core/world';
import type { GuardId } from '../core/labperks';
import type { Mat } from './constellations';

export const LAB_NAME: Record<Kind, string> = {
  rock: 'Rock Lab',
  ice: 'Ice Lab',
  seed: 'Seed Lab',
  magma: 'Magma Lab',
  storm: 'Rain Lab',
  sun: 'Sun Lab',
};
export const LAB_LEVEL: Record<Kind, Record<2 | 3 | 4 | 5, string>> = {
  rock: {
    2: 'Your Rock grows a little extra life where it lands.',
    3: 'Glacier can reach one more place.',
    4: 'Firewall: mountains your Rock makes shelter the land next to them from Ember Vents.',
    5: 'Supernova can reach one more place.',
  },
  ice: {
    2: 'Your Ice grows a little extra life where it lands.',
    3: 'Steam can reach one more place.',
    4: 'Vent Cooler: Ice cools Ember Vents from farther away.',
    5: 'Supernova can reach one more place.',
  },
  seed: {
    2: 'Your Seed Pod grows a little extra life where it lands.',
    3: 'Rain Garden can reach one more place.',
    4: "Strong Roots: land your Seed Pod touches can't be tangled this round.",
    5: 'Supernova can reach one more place.',
  },
  magma: {
    2: 'Your Magma grows a little extra life where it lands.',
    3: 'Steam can reach one more place.',
    4: 'Weed Burner: Magma clears Tanglevines from farther away.',
    5: 'Supernova can reach one more place.',
  },
  storm: {
    2: 'Your Rain Cloud grows a little extra life where it lands.',
    3: 'Rain Garden can reach one more place.',
    4: 'Rinse: Rain also washes away Tanglevines.',
    5: 'Supernova can bring more water.',
  },
  sun: {
    2: 'Your Sunburst grows a little extra life where it lands.',
    3: 'Wildflowers can reach one more place.',
    4: 'Frost Melter: Sunburst clears Frost Creep from farther away.',
    5: 'Supernova can bring more life.',
  },
};
export const LAB_GUARD_NAME: Record<GuardId, string> = {
  firewall: 'Firewall',
  ventCooler: 'Vent Cooler',
  labRoots: 'Strong Roots',
  weedBurner: 'Weed Burner',
  rinse: 'Rinse',
  frostMelter: 'Frost Melter',
};
export const LAB_FORM = {
  rock: { name: 'Pebble Shower', feat: 'Glaciers', line: 'Rock also raises land farther away.' },
  ice: { name: 'Rime Comet', feat: 'Steam Fusions', line: 'Ice makes a frozen centre with gentler water nearby.' },
  seed: { name: 'Grove Pod', feat: 'Rain Gardens', line: 'Seed grows more life nearby.' },
  magma: { name: 'Obsidian Flow', feat: 'Tanglevines cleared with Magma', line: 'Magma keeps water and raises nearby land.' },
  storm: { name: 'Monsoon', feat: 'Ember Vents cooled with Rain', line: 'Rain grows life in wet places.' },
  sun: { name: 'Solar Flare', feat: 'Wildflowers', line: 'Sunburst warms only places where plants already grow.' },
} satisfies Record<Kind, { name: string; feat: string; line: string }>;
export const ESSENCE_NAME: Record<Mat, string> = { stone: 'stone', frost: 'frost', leaf: 'leaf', ember: 'ember', dew: 'dew' };
export const LAB_FIRST_COPY: Record<Kind, string> = {
  rock: 'Rock Lab: your Rock gets stronger. Level-ups use stone from mountain lands.',
  ice: 'Ice Lab: your Ice gets stronger. Level-ups use frost from frozen lands.',
  seed: 'Seed Lab: your Seed gets stronger. Level-ups use leaf from green lands.',
  magma: 'Magma Lab: your Magma gets stronger. Level-ups use ember from warm lands.',
  storm: 'Rain Lab: your Rain gets stronger. Level-ups use dew from watery lands.',
  sun: 'Sun Lab: your Sunburst gets stronger. Level-ups use leaf from green lands.',
};
export const LAB_TEXT = {
  next: 'For your next throw',
  later: 'A new trick, later',
  ring: 'Grow your Homeworld to Level {n}',
  needBuilding: 'Build this Lab first',
  needDust: 'Collect more stardust',
  needEssence: 'Grow more {colour} lands',
  level: 'Level-up',
  got: 'Got it',
  form: 'Top form',
  on: 'On',
  off: 'Off',
  formNeedsLevel: 'Reach Lab level 5 to use this form',
  formNeedsFeat: 'Keep playing to find this form',
  pouch: 'Essence pouch',
  uses: 'What uses it',
  collected: '{have} of {need}',
  firstTitle: '2 steps · 🎁 ✨100 when done',
  firstLab: 'Build your first Lab',
  firstFriend: 'Invite a friend',
  firstFriendCopy: 'A free Critter Den is ready for your first friend.',
  firstDone: 'Your friend is home! +✨100',
  friendMoment: 'Your first friend moved in!',
  firstFree: 'Free',
  buildSelected: 'Build {name} · Free',
  firstReward: 'Finish both steps for ✨100',
  helped: 'Homeworld helped',
  buddyHelped: 'Your Buddy kept the land safe.',
  powerHelped: '{name} added a little extra life.',
  guardHelped: '{perk} kept the land safe.',
  formHelped: '{form} helped your throw.',
  essenceLine: '+{n} {icon} {colour} for your {lab}',
  otherEssence: '{icon}{n}',
  levelMoment: '{name} reached level {n}!',
  formMoment: '{form} is here!',
  buildFirst: 'Build your {name} on your Homeworld',
  ready: 'Ready at {time}',
  labCost: '✨{dust} + {icon}{amount}',
  unlockPlanet: 'Unlocks at planet {n}',
  labBuildFree: '{name} · Free',
  labBuildCost: '{name} · ✨{n}',
  unlockBody: 'Build your first Lab. Welcome a friend.',
  letterBody:
    'We found you a quiet little world. Build your first Lab and welcome a friend. Finish chapters and gather stardust and Essences to grow your Homeworld.',
  atlasNeed: 'Finish more planets to collect Essences',
  atlasIntro: 'Campaign planets give Essences from their lands. Fill bundles to relight the constellations above your Homeworld.',
  dyeNeed: 'Needs {cost} — finish more campaign planets for Essences',
  dyeIntro: 'Dyes work with every suit. Unlock them once with Essences from campaign planets.',
} as const;
