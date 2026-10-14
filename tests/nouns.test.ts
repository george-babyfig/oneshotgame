// MEASURED (Fresh, Regular and Engaged career snapshots through planet 20): Home + top/tab
// bars; Home after visitor generation; Collection; Missions; Star Map; open Lifebook;
// locked Styles or every visible Styles tab, including You and a chosen eligible Buddy;
// Pre-level from 4; HUD; last-win Results (including first win); open Homeworld overview,
// every built plot and first empty plot; Level, first-hour, residents, Essence pouch and
// Homeworld list sheets; land sheet when Lands is revealed; open Passport; Settings;
// Ways to earn gems from 11; seven-day away card with tutorial complete.
// Additional regressions render early purchased Passport + editor, Road sticker previews,
// bought Launch Bay previews/build lists, the Homeworld-list Lands route, land-picker copy,
// and taught/built Lab names.
// UNMEASURED (these are exclusions, not a claim to render every kid screen):
// - Field Guide pages: optional round reference; destination counted, Vault line shared.
// - Round coach/fail-help cards: transient round instruction; gem-help sheet measured separately.
// - Toasts: transient confirmations/hints; closed Lands and banner hints tested separately.
// - Chapter-chest celebration: transient reward presentation, within counted chapter family.
// - Home intro and Vault sheet: first-use instruction / resource detail; Homeworld and Vault counted.
// - Homeworld paint/photo/trip and Isle/Landmark detail sheets: opt-in details behind
//   revealed buttons/sites; entry nouns counted, interior content not exhaustively rendered.
// - Launch Bay screen: opt-in building detail after build/ownership gate; entry noun counted.
// - Grown-ups and receipts: parent-gated surfaces outside the kid noun budget.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordedNode, recordedDom, recordedModals, visibleText } from './helpers/uiRecording';
import { defaultProfile, type Profile } from '../src/meta/profile';
import { unlocked } from '../src/meta/unlocks';
import { BOOSTERS, LANDMARKS, SKINS, DYES, RESIDENT_ACCS } from '../src/meta/tuning';
import { BUILDINGS, busyDrones } from '../src/meta/homeworld';
import { LAB_NAME, LAB_GUARD_NAME, LAB_FORM, LAB_LEVEL, ESSENCE_NAME } from '../src/meta/labcopy';
import { NEW_FEATURE, nextUp } from '../src/meta/nextup';
import { showHome } from '../src/ui/screens/home';
import { showCollection } from '../src/ui/screens/collection';
import { showMissions } from '../src/ui/screens/missions';
import { showLifebook } from '../src/ui/screens/lifebook';
import { showStyles } from '../src/ui/screens/styles';
import { createPanel } from '../src/ui/screens/homeworld/panel';
import {
  levelSheet,
  firstHourSheet,
  residentsSheet,
  essenceSheet,
  homeworldListSheet,
  landSheet,
} from '../src/ui/screens/homeworld/sheets';
import { passportStats } from '../src/meta/passport';
import { ACHIEVEMENTS } from '../src/meta/achievements';
import { roadRewardText } from '../src/ui/screens/road';
import { showPassport, editPassport, trophyVisible } from '../src/ui/screens/passport';
import { firstHourStep } from '../src/meta/firsthour';
import { App } from '../src/ui/app';
import { preLevel } from '../src/ui/flows/prelevel';
import { levelResults } from '../src/ui/flows/results';
import { buildHud } from '../src/ui/hud';
import type { LevelScene, LevelResult } from '../src/ui/game';
import { makeLevel } from '../src/core/levels';
import { newPlanet, SPECIES, BIOMES, KINDS, type Kind } from '../src/core/world';
import { showStarMap } from '../src/ui/screens/starmap';
import { COSMETICS } from '../src/meta/cosmetics';
import { HABITATS } from '../src/meta/habitats';
import { CHAPTER_NAMES } from '../src/meta/progression';
import { stylesAccess } from '../src/meta/stylesAccess';
import { momentumActive } from '../src/meta/momentum';
import { addVisitors } from '../src/meta/visitors';
import { labPlot } from '../src/meta/labs';
import { awayFlow } from '../src/ui/flows/away';
import { waysToEarnGems } from '../src/ui/flows/earn';
import { settingsFlow } from '../src/ui/flows/settings';
import { inboxOpen, landsSection } from '../src/meta/reveals';
import { chestsReady } from '../src/meta/progression';
import { wishClaimable } from '../src/meta/wishes';
import { roadReady } from '../src/meta/starroad';
import { letterOf } from '../src/meta/inbox';
import { simulate, type PlayerType } from './sim/economy/career';

const UNMEASURED = {
  'Field Guide pages': 'optional round reference; destination counted and Vault wording shared',
  'Round coach and fail-help cards': 'transient round instruction; Ways to earn gems measured separately',
  toasts: 'transient confirmations/hints; closed Lands and banner hints tested separately',
  'Chapter-chest celebration': 'transient reward presentation within counted chapter family',
  'Home intro and Vault sheet': 'first-use instruction / resource detail; destination nouns counted',
  'Homeworld paint/photo/trip and Isle/Landmark detail sheets':
    'opt-in details behind revealed buttons/sites; interior content not exhaustively rendered',
  'Launch Bay screen': 'opt-in building detail after build/ownership gate; entry noun counted',
  'Grown-ups and receipts': 'behind parent gate; outside kid budget',
};
const registry = vi.hoisted(() => ({ keys: [] as string[], toasts: [] as string[] }));
vi.mock('../src/i18n', () => {
  const t = (key: string, vars: Record<string, string | number> = {}) => {
    // A data helper may already have translated the name; preserve its marker provenance.
    if (key.includes('\uE000')) return key;
    let id = registry.keys.indexOf(key);
    if (id < 0) id = registry.keys.push(key) - 1;
    let text = key;
    for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
    return `\uE000${id}\uE001${text}\uE002`;
  };
  return {
    t,
    tp: (n: number, one: string, other: string, vars = {}) => t(n === 1 ? one : other, { n, ...vars }),
    planetName: (name: string) => t(name),
    getLang: () => 'en',
    detectLang: () => 'en',
    LANGS: [{ id: 'en', name: 'English' }],
  };
});
vi.mock('../src/ui/dom', async () => ({
  ...(await import('./helpers/uiRecording')).recordedDom,
  toast: (text: string) => registry.toasts.push(text),
}));
vi.mock('../src/ui/icons', () => ({ icon: () => new RecordedNode('span') }));
vi.mock('../src/ui/art/galaxy', () => ({ drawGalaxy: () => ({ stop() {} }) }));
vi.mock('../src/ui/art/critters', () => ({
  drawCreature() {},
  critterCanvas: () => new RecordedNode('canvas'),
  animateCreatureGallery: () => () => {},
  critterSilhouetteCanvas: () => new RecordedNode('canvas'),
}));
vi.mock('../src/ui/motion', () => ({
  effectiveReduceMotion: () => true,
  menuParticles: () => null,
  flyReward() {},
  burst() {},
  countUp: () => () => {},
}));

vi.mock('../src/ui/art/planet', async (original) => ({ ...(await original<object>()), renderPlanet() {} }));
vi.mock('../src/ui/celebrate', () => ({ celebrate: () => ({ skip() {}, cancel() {} }) }));

const FAMILIES = {
  Lab: {
    members: [
      'Lv {n}',
      'Top form',
      ...Object.values(LAB_LEVEL).flatMap(Object.values),
      ...Object.values(LAB_NAME),
      ...Object.values(LAB_GUARD_NAME),
      ...Object.values(LAB_FORM).flatMap(Object.values),
    ],
    reason: 'Labs, perks and forms share the Lab rule (4h New row)',
  },
  Essences: { members: Object.values(ESSENCE_NAME), reason: 'One resource family (4h New row)' },
  boosters: { members: Object.values(BOOSTERS).map((x) => x.name), reason: 'Three choices in one round booster loop (4h Round row)' },
};
const PART_OF = {
  Homeworld: {
    members: ['Homeworld Level', 'Level {n}', 'plot', 'Homeworld list'],
    reason: 'Attributes and parts of the same destination',
  },
  friends: {
    members: ['Den', 'Critter Den', 'friendship level', 'Your friend'],
    reason: 'Den governs the friend cap; friendship belongs to a friend',
  },
  chapter: { members: ['chapter chest'], reason: 'The chapter completion reward' },
  Lab: { members: ['Lab Level', 'Lv {n}'], reason: 'Lab attribute' },
  Vault: { members: ['Vault level'], reason: 'Vault attribute' },
};
const PARENT_SIGNPOSTS = { 'Grown-ups': 'Gate v2 prevents a child entering the parent area' };
const CONTENT_KEYS = new Set([
  ...Array.from({ length: 120 }, (_, i) => makeLevel(i + 1).name),
  ...CHAPTER_NAMES,
  ...SPECIES.map((x) => x.name),
  ...COSMETICS.map((x) => x.name),
  ...SKINS.map((x) => x.name),
  ...DYES.map((x) => x.name),
  ...Object.values(BUILDINGS)
    .filter((x) => x.decor)
    .map((x) => x.name),
  ...HABITATS.map((x) => x.name),
  ...LANDMARKS.map((x) => x.name),
  ...RESIDENT_ACCS.map((x) => x.name),
  'Floating Isle',
]);
const EXCLUDED = {
  'Round vocabulary': {
    members: [
      'planet',
      'throws',
      'life',
      'goals',
      'lands and land names',
      'creatures',
      'object names',
      'swap',
      'Supernova',
      'Comet Guardian',
      'Hard',
      'twists',
      'Fusion',
      'Clash',
      'reaction names',
      'Trouble',
      'Traits',
      'Forecast',
      'Power',
      'Reach',
      'Combo',
    ],
    reason: '4h Round rows: taught in play',
  },
  'Action and state labels': {
    members: [
      'Collect all',
      'Claim',
      'Swap',
      'Equip',
      'Equipped',
      'Owned',
      'Try on',
      'Favourite',
      'Favourited',
      'Done',
      'Back',
      'Next',
      'Play',
    ],
    reason: 'Actions and state, not another system',
  },
  CONTENT_KEYS: { members: [...CONTENT_KEYS], reason: 'HOMEWORLD 13.3: content names, not system rules' },
  'Styles slot labels': {
    members: [
      'You',
      'Suit',
      'Hat',
      'Trail',
      'Emote',
      'Objects',
      'Effects',
      'Shot trail: {kind}',
      'Burst: {kind}',
      'Supernova style',
      'Fusion style',
      'Face',
      'Skin tone',
      'Hair',
      'Hair colour',
      'Eyes',
      'Expression',
    ],
    reason: 'Parts of a look; labels naming a recognized system remain counted',
  },
};
// Exact template allowlist: additions need a reason here, never a catch-all pattern.
const NON_NOUN_GROUPS = [
  {
    reason: 'Land and object names, elements and jobs are round vocabulary taught in play (decision 56)',
    keys: [...Object.values(BIOMES).map((x) => x.name), ...Object.values(KINDS).flatMap((x) => [x.name, x.stats.element, x.stats.job])],
  },
  {
    reason: 'Rarity and habitat descriptions are attributes of the already taught creatures',
    keys: [
      'Common',
      'Uncommon',
      'Rare',
      'Legendary',
      'Lives in {a}',
      '{have}/{total} creatures · {pct}%',
      'Meet more creatures',
      'Meet new creatures.',
    ],
  },
  {
    reason: 'Settings controls and device/privacy information are presentation preferences or parent entry actions',
    keys: [
      'Settings',
      'Sound effects',
      'Music',
      'Haptics',
      'Reduce motion',
      'Full aim line',
      'Language',
      'Text size',
      'Planet colours',
      'Seasons',
      'Automatic',
      'Classic colours',
      'Clear colours',
      'Standard',
      'Large',
      'Extra large',
      'Northern hemisphere',
      'Southern hemisphere',
      'Credits',
      'Reset progress',
      'No accounts, no ads, no tracking. Progress is saved on this device.',
      'v{version} (build {n})',
    ],
  },
  {
    reason: 'Face, hair and expression choices are parts of the You look, without another rule or destination',
    keys: [
      'Accessory',
      'Bare',
      'Braids',
      'Bright',
      'Cheer',
      'Crop',
      'Curls',
      'Focused',
      'Fringe',
      'Happy',
      'Heart',
      'None',
      'Oval',
      'Puffs',
      'Round',
      'Shrug',
      'Sleepy',
      'Smiley',
      'Sparkly',
      'Spikes',
      'Square',
      'Surprised',
      'Waves',
      'Wide',
    ],
  },
  {
    reason: 'Actions, ownership, progress, availability and generic navigation labels do not introduce a system',
    keys: [
      'A new place is open',
      'Close',
      'Complete ✓',
      'Finish ✓',
      'Free',
      'Got it',
      'Got it!',
      'Max',
      'Move',
      'Next Level',
      'Next Level checklist',
      'Next ▶',
      'Now',
      'Off',
      'Opens at planet {n}',
      'Overview',
      'Planet improved!',
      'See what you earned',
      'Upgrade',
      'Warm-up planet',
      'While you were away',
      'Your creatures are safe at home',
      'Your next Level is ready',
      '{name}: {have}/{need}',
      '{n}m',
      '{n}× {name}',
      '♡ Favourite',
      '✓ Chest opened',
      '✓ Equipped',
      '🔒 Finish {name} to unlock',
    ],
  },
  {
    reason:
      'Unnamed Homeworld build, invitation and level attributes are parts of Homeworld and friends, whose names are separately counted',
    keys: [
      'A planet of your own',
      'Build {name} · Free',
      'Grow to Level {n}',
      'Grow your {name}',
      'Invite a creature ({n} room left)',
      'Invite a creature ({n} rooms left)',
      '{name}, level {level}',
    ],
  },
  {
    reason: 'Essence amounts and pouch usage descriptions are attributes of the counted resource family',
    keys: [
      '+{n} {icon} {colour} for your {lab}',
      'What uses it: {list}',
      '{have} of {need} {icon} dew',
      '{have} of {need} {icon} ember',
      '{have} of {need} {icon} frost',
      '{have} of {need} {icon} leaf',
      '{have} of {need} {icon} stone',
    ],
  },
  {
    reason: 'Lab preview headings are attributes of the counted Lab; perk and form templates are family members above',
    keys: ['A new trick, later', 'For your next throw', 'Level-up'],
  },
  {
    reason: 'Greenhouse growth/storage states are attributes of the counted Greenhouse booster loop',
    keys: [
      'A bud is growing',
      'A flower is nearly ready',
      'A sprout is growing',
      'Choose what grows next. Changing it keeps your progress.',
      'Nothing stored yet',
      'Stored {stored}/{cap} · {wins}/6 wins',
      '{name} is taking shape',
    ],
  },
  {
    reason: 'Round goals, obstacles, difficulty, throw actions and land recipes are taught in play (decision 56)',
    keys: [
      'A guardian comet blocks shots — hit it 3 times for a bonus',
      'A moon orbits and blocks shots',
      'Clear Comet Guardian planets.',
      'Every region of a planet full of life',
      'Fast Spin',
      'Goals',
      'How to make each land',
      'Moon Guard',
      'Planet {n}',
      'Record {stars} · {n} flung',
      'Six Ocean or Reef regions in a row',
      'This planet spins twice as fast',
      "You're on planet {n}",
      'tap to swap',
      '{a} between {b} and {c}',
      '{a} next to {b}',
      '{chapter} · Planet {n}',
      '{n} life',
      '▶ PLAY  Planet {n}',
      '☄️ Ice on a hill or mountain',
      '☄️ Ice on low ground',
      '☄️☄️ Two ices on a tall mountain (or a frozen planet)',
      '☄️☄️ Two ices on the same ocean',
      '🌱 Right where a seed lands',
      '🌱 Seeds in a desert',
      '🌱 Seeds in a swamp',
      '🌱 Seeds in the ocean',
      '🌱 Seeds on a mountain',
      '🌱 Seeds on tundra',
      '🌱 The edges of where a seed lands',
      '🌱🌱 A forest that gets warm (🔥 or ☀️)',
      '💀 SUPER HARD',
      '🔥 HARD',
      '🔥 Magma beside an ocean warms the water',
      '🔥 Magma on a hill or mountain',
      '🔥 Magma on flat ground',
      '🪨 A rock on bare ground',
    ],
  },
];
const NON_NOUN_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(EXCLUDED)
    .filter(([name]) => name !== 'CONTENT_KEYS')
    .flatMap(([, group]) => group.members.map((key) => [key, group.reason])),
);
Object.assign(
  NON_NOUN_KEYS,
  PARENT_SIGNPOSTS,
  Object.fromEntries(NON_NOUN_GROUPS.flatMap((group) => group.keys.map((key) => [key, group.reason]))),
);

const concepts: { name: string; pattern: string; members?: readonly string[]; reason: string }[] = [
  ...[
    ['stardust', 'stardust', 'Meta resource'],
    ['gems', 'gems?', 'Meta resource'],
    ['stars', 'stars?', 'Round resource opted in by planned 18'],
    ['Star Map', 'Star Map', 'Meta destination'],
    ['chapter', 'chapters?', 'Meta chapter and chest row'],
    ['galaxy', 'galax(?:y|ies)', 'Meta destination'],
    ['Vault', 'Vaults?', 'Meta reward loop'],
    ['Missions', 'Missions', 'New destination row'],
    ['Wishes', 'Wish(es)?', 'New reward loop row'],
    ['Homeworld', 'Homeworld|plots?', 'New destination; level and plots are parts'],
    ['Lab', 'Labs?', 'New Lab family row'],
    ['friends', 'friends?|(?:Critter )?Den|friendship', 'New friends row; Den is its cap'],
    ['Essences', 'Essences?', 'New resource family row'],
    ['boosters', 'boosters?', 'Round booster family row'],
    ['Momentum', 'Momentum', 'Round row; planned 18'],
    ['Buddy', 'Budd(?:y|ies)', 'Round row; planned 18'],
    ['Collection', 'Collection', 'New destination row'],
    ['Lifebook', 'Lifebook', 'Meta destination'],
    ['Field Guide', 'Field Guide', 'New destination row'],
    ['Styles', 'Styles', 'New destination row'],
  ].map(([name, pattern, reason]) => ({
    name,
    pattern,
    reason,
    members: name in FAMILIES ? FAMILIES[name as keyof typeof FAMILIES].members : name === 'Homeworld' ? ['Level {n}'] : [],
  })),
  ...[
    ['campaign', 'campaigns?'],
    ['Next Up', 'Next Up'],
    ['Keeper', 'Keepers?'],
    ['visitors', 'visitors?'],
    ['Mementos', 'mementos?|keepsakes?'],
    ['Passport', 'Passports?'],
    ['Voyage', 'Voyages?'],
    ['Star Road', '(?:Star|Cosmic) Road|Road points?'],
    ['Star Calendar', 'Star Calendar'],
    ['Star Atlas', 'Star Atlas'],
    ['constellations', 'constellations?'],
    ['Sticker Album', 'Sticker Album|stickers?'],
    ['Inbox', 'Inbox|letters?'],
    ['Remix', 'Remix(?:es)?'],
    ['Trip', 'Trips?'],
    ['Paint', 'paints?'],
    ['Photo', 'photos?'],
    ['Dye', 'dyes?'],
    ['Atmosphere', 'Atmospheres?'],
    ['Outfits', 'outfits?'],
    ['launchers', 'launchers?'],
    ['Launch Bay', 'Launch Bays?'],
    ['Greenhouse', 'Greenhouses?'],
    ['drones', 'drones?'],
    ['decorations', 'decorations?'],
    ['Habitat sets', 'habitat'],
    ['postcards', 'postcards?'],
    ['Landmarks', 'Landmarks?'],
    ['Festival', 'Festivals?'],
    ...['daily', 'zen', 'rush', 'challenge'].map((id) => [NEW_FEATURE[id], NEW_FEATURE[id]]),
  ].map(([name, pattern]) => ({
    name,
    pattern,
    members: name === 'Habitat sets' ? ['{name} set'] : [],
    reason: 'Recognized; Regular must defer this system past the noun window',
  })),
];
// Decision 60 (ROADMAP-v2 §10): measured honestly, the planet-20 window holds 21 nouns. The 21st is the
// Greenhouse, Homeworld Level 2's build; everything else past the cap is deferred, not regrouped.
const NOUN_CAP = 21;
const EXPECTED_REGULAR = [
  'Greenhouse',
  'stardust',
  'gems',
  'stars',
  'Star Map',
  'chapter',
  'galaxy',
  'Vault',
  'Missions',
  'Homeworld',
  'Collection',
  'Styles',
  'Lifebook',
  'Field Guide',
  'boosters',
  'Lab',
  'friends',
  'Essences',
  'Wishes',
  'Momentum',
  'Buddy',
].sort();
const diagnostics: Surface[] = [];
const EARNED_EXTRAS = ['Greenhouse', 'Launch Bay', 'Habitat sets', 'drones'];

/** Numeric ids survive translated UI uppercasing; nested markers preserve content provenance. */
function renderedKeys(text: string): string[] {
  return [...new Set([...text.matchAll(/\uE000(\d+)\uE001/g)].map((m) => registry.keys[Number(m[1])]))];
}
function marked(key: string, vars: Record<string, string> = {}): string {
  let id = registry.keys.indexOf(key);
  if (id < 0) id = registry.keys.push(key) - 1;
  let text = key;
  for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return `\uE000${id}\uE001${text}\uE002`;
}
export function nounsInScreenText(text: string): string[] {
  const keys = renderedKeys(text);
  return concepts
    .filter(
      (c) =>
        keys.some(
          (key) =>
            c.members?.includes(key) ||
            (!CONTENT_KEYS.has(key) && new RegExp(`(?<![\\p{L}])(?:${c.pattern})(?![\\p{L}])`, 'iu').test(key.replace(/\{[^}]+\}/g, ''))),
        ) ||
        (c.name === 'stardust' && /✨/u.test(text)) ||
        (c.name === 'gems' && /💎/u.test(text)) ||
        (c.name === 'stars' && /[★⭐]/u.test(text)),
    )
    .map((c) => c.name)
    .sort();
}

type Snapshot = { p: Profile; now: number };
type Surface = { name: string; keys: string[]; nouns: string[] };
function globals() {
  vi.stubGlobal('document', {
    createElement: (tag: string) => new RecordedNode(tag),
    documentElement: Object.assign(new RecordedNode('html'), { style: { setProperty() {} } }),
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, setTimeout: () => 1 });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
}
function recordSnapshot(snapshot: Snapshot): Surface[] {
  const surfaces: Surface[] = [];
  const render = (name: string, builder: (app: App) => void, visitors = false, prepare: (p: Profile) => void = () => {}) => {
    vi.setSystemTime(snapshot.now);
    const p = structuredClone(snapshot.p);
    prepare(p);
    if (visitors) addVisitors(p, snapshot.now + 60 * 60_000);
    recordedModals.length = 0;
    const nodes: RecordedNode[] = [];
    const app = {
      p,
      scene: null,
      save() {},
      saveNow() {},
      syncGameCenter() {},
      skinGlow: () => '#6ec8ff',
      canGoBack: () => false,
      topBar: (back?: boolean, compact?: boolean) => App.prototype.topBar.call(app, back, compact),
      startLevel: (n: number) => {
        (app as any).scene = {
          L: makeLevel(n),
          o: {},
          planet: newPlanet(),
          canvas: new RecordedNode('canvas'),
          el: new RecordedNode('div'),
          renderHud() {},
        };
      },
      mount: (node: RecordedNode) => nodes.push(node),
    } as unknown as App;
    builder(app);
    nodes.push(...recordedModals);
    if (name === 'Home' || visitors) nodes.push((App.prototype as any).tabBar.call(app, 'home'));
    const text = nodes.map(visibleText).join(' ');
    const keys = renderedKeys(text);
    const surface = { name: `${snapshot.p.level}:${name}`, keys, nouns: nounsInScreenText(text) };
    diagnostics.push(surface);
    for (const [kind, key] of Object.entries(LAB_NAME))
      if (keys.includes(key))
        expect(unlocked(snapshot.p, kind as Kind) || labPlot(snapshot.p, kind as Kind) >= 0, `${name}: untaught ${key}`).toBe(true);
    if (keys.some((k) => FAMILIES.boosters.members.includes(k))) expect(snapshot.p.level, name).toBeGreaterThanOrEqual(4);
    if (keys.some((k) => FAMILIES.Essences.members.includes(k))) expect(unlocked(snapshot.p, 'homeworld'), name).toBe(true);
    const closedPointers = [
      ['quests', /\bWishes?\b/i],
      ['star_road', /\b(?:Cosmic Road|Road points?)\b/i],
      ['star_calendar', /Star Calendar day/i],
      ['star_atlas', /\bConstellation\b/i],
      ['sticker_album', /\bstickers?\b/i],
    ] as const;
    for (const [id, pattern] of closedPointers)
      if (!unlocked(snapshot.p, id))
        expect(
          keys.filter((k) => !CONTENT_KEYS.has(k) && pattern.test(k)),
          `${name}: closed ${id}`,
        ).toEqual([]);
    if (!inboxOpen(snapshot.p))
      expect(
        keys.filter((k) => /\bInbox\b/i.test(k)),
        name,
      ).toEqual([]);
    if (snapshot.p.level <= 20)
      expect(
        keys.filter((key) => /\b(?:trips?|expeditions?)\b/i.test(key)),
        `${name}: no trip noun before planet 21`,
      ).toEqual([]);
    const checkSignpost = (node: RecordedNode, inside = false) => {
      const allowed = inside || node.className.split(' ').includes('grownups-link');
      for (const child of node.children) {
        if (typeof child === 'string') {
          if (renderedKeys(child).includes('Grown-ups')) expect(allowed, `${name}: parent signpost outside its link`).toBe(true);
        } else checkSignpost(child, allowed);
      }
    };
    nodes.forEach((n) => checkSignpost(n));
    for (const node of nodes) {
      const mission = node.querySelectorAll('button').find((b) => b.attrs['data-tab'] === 'missions');
      if (mission) {
        const visibleClaims = unlocked(p, 'quests')
          ? wishClaimable(p) +
            chestsReady(p).length +
            (unlocked(p, 'star_road') ? roadReady(p).length : 0) +
            (inboxOpen(p) ? p.mail.filter((m) => !m.claimed && !!letterOf(m)?.gift).length : 0)
          : 0;
        expect(Number(mission.querySelector('.nb')?.textContent ?? 0), `${name}: Missions badge counts only visible claims`).toBe(
          visibleClaims,
        );
      }
    }
    surfaces.push(surface);
    return nodes;
  };
  render('Home', showHome);
  render('Home visitors waiting', showHome, true);
  render('Settings', settingsFlow);
  render(
    'Away seven days',
    (app) => awayFlow(app, 7 * 86400000),
    false,
    (p) => {
      p.tutorial = true;
    },
  );
  if (snapshot.p.level >= 11)
    render('Ways to earn gems', (app) => {
      waysToEarnGems(app.p);
    });
  render('Collection', showCollection);
  render('Missions', showMissions);
  render('Star Map', showStarMap);
  if (unlocked(snapshot.p, 'lifebook')) render('Lifebook', showLifebook);
  if (!stylesAccess(snapshot.p)) render('Styles locked', (app) => App.prototype.showStyles.call(app));
  else {
    const nodes = render('Styles suit', (app) => showStyles(app, 'suit'));
    const buttons = nodes.flatMap((n) => n.querySelectorAll('.tabs')).flatMap((n) => n.querySelectorAll('button'));
    const slots: Record<string, Parameters<typeof showStyles>[1]> = {
      You: 'you',
      Suit: 'suit',
      Hat: 'hat',
      'Launcher looks': 'launcher',
      Trail: 'trail',
      Emote: 'emote',
      Objects: 'objects',
      Effects: 'effects',
      'Homeworld looks': 'homeworld',
      'Friend outfits': 'friends',
      Dye: 'dye',
      Buddy: 'buddy',
      Atmosphere: 'atmosphere',
    };
    for (const button of buttons) {
      const label = renderedKeys(visibleText(button))[0];
      expect(slots[label], label).toBeDefined();
      render(`Styles ${label}`, (app) => showStyles(app, slots[label]));
      if (label === 'Buddy' && snapshot.p.level >= 18 && snapshot.p.home.residents.length)
        render(
          'Styles Buddy chosen',
          (app) => showStyles(app, 'buddy'),
          false,
          (p) => {
            p.buddy.species = p.home.residents[0].species;
          },
        );
    }
  }
  if (snapshot.p.level >= 4)
    render('Pre-level', (app) => {
      preLevel(app, app.p.level);
      (app as any).mount(app.scene!.el);
    });
  render('HUD', (app) => {
    const scene = {
      L: makeLevel(app.p.level),
      o: { momentum: momentumActive(app.p) && !app.p.momentum.paused ? app.p.momentum.streak : 0 },
      barMax: () => 100,
      twistLabel: () => '',
      swap() {},
      finishEarly() {},
      pause() {},
    } as unknown as LevelScene;
    (app as any).mount(buildHud(scene));
  });
  render('Results', (app) => {
    app.roundBuildsSpedUp = busyDrones(app.p.home, snapshot.now) > 0;
    // A career snapshot is the next available planet; show the win that reached it.
    const L = makeLevel(Math.max(1, app.p.level - 1));
    levelResults(app, {
      level: L,
      planet: structuredClone(L.start),
      stars: 3,
      score: L.stars[2],
      leftover: 0,
      boss: false,
      reactionEvents: [],
    } as unknown as LevelResult);
  });
  if (unlocked(snapshot.p, 'homeworld')) {
    const selections = [-1, ...snapshot.p.home.plots.flatMap((b, i) => (b ? [i] : [])), snapshot.p.home.plots.findIndex((b) => !b)];
    for (const selected of new Set(selections))
      render(`Homeworld plot ${selected}`, (app) => {
        const panel = recordedDom.h('div');
        const ctx = {
          app,
          canvas: new RecordedNode('canvas'),
          panel,
          levelBadge: recordedDom.btn('', '', () => {}),
          pouchHeader: recordedDom.btn('', '', () => {}),
          plotButtons: [],
          selected,
          moving: -1,
          geo: { cx: 100, cy: 100, R: 50, w: 200, h: 200 },
          schedule() {},
          burst() {},
          surf: () => ({ x: 0, y: 0 }),
          plotAngle: () => 0,
          doCollect: () => false,
          reopen() {},
        };
        createPanel(ctx as unknown as Parameters<typeof createPanel>[0]).renderPanel();
        (app as any).mount(panel);
      });
    render('Essence pouch', essenceSheet);
    render('Homeworld list', (app) =>
      homeworldListSheet(
        app,
        () => {},
        () => {},
      ),
    );
    if (landsSection(snapshot.p)) render('Land sheet', (app) => landSheet(app, 0, () => {}));
    render('Homeworld level sheet', (app) => levelSheet(app, () => {}));
    if (firstHourStep(structuredClone(snapshot.p)) !== 'done') render('Homeworld first hour', (app) => firstHourSheet(app, () => {}));
    if (snapshot.p.home.residents.length) render('Homeworld residents', (app) => residentsSheet(app, () => {}));
  }
  if (unlocked(snapshot.p, 'passport')) render('Passport', showPassport);
  const suggestion = nextUp(structuredClone(snapshot.p), snapshot.now);
  const targetGate = {
    homeworld: 'homeworld',
    lifebook: 'lifebook',
    passport: 'passport',
    calendar: 'star_calendar',
    album: 'sticker_album',
    sky: 'star_atlas',
    road: 'star_road',
    voyage: 'voyage',
    festival: 'festival',
  } as const;
  if (suggestion.action in targetGate)
    expect(unlocked(snapshot.p, targetGate[suggestion.action as keyof typeof targetGate]), `Next Up ${suggestion.action}`).toBe(true);
  if (suggestion.action === 'inbox') expect(inboxOpen(snapshot.p)).toBe(true);
  if (suggestion.action === 'styles') expect(stylesAccess(snapshot.p)).toBe(true);
  return surfaces;
}

async function career(type: PlayerType): Promise<Snapshot[]> {
  const snapshots: Snapshot[] = [];
  await simulate(type, 'default', {
    untilLevel: 20,
    onLevel: (p, now) => {
      if (p.level <= 20) snapshots.push({ p, now });
    },
  });
  return snapshots;
}
function unclassifiedKeys(keys: string[]): string[] {
  return [
    ...new Set(keys.filter((key) => !CONTENT_KEYS.has(key) && nounsInScreenText(marked(key)).length === 0 && !NON_NOUN_KEYS[key])),
  ].sort();
}
function report(label: string, surfaces: Surface[]) {
  const nouns = [...new Set(surfaces.flatMap((s) => s.nouns))].sort();
  const unknown = unclassifiedKeys(surfaces.flatMap((surface) => surface.keys));
  expect.soft(unknown, `${label}: unclassified rendered keys need an explicit reason:\n${JSON.stringify(unknown, null, 2)}`).toEqual([]);
  const details = `${label}: ${nouns.length}\n${nouns.join(', ')}\n${JSON.stringify({ FAMILIES, PART_OF, PARENT_SIGNPOSTS, EXCLUDED, NON_NOUN_KEYS, UNMEASURED, concepts, surfaces }, null, 2)}`;
  if (process.env.NOUNS_REPORT === '1') console.log(details);
  return { nouns, details };
}
describe('M4 meta noun budget measured from real rendered screens', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('does not count data terms that never appear and reads newly rendered terms', () => {
    expect(nounsInScreenText(marked('Nothing here'))).toEqual([]);
    expect(nounsInScreenText(marked('Join festivals.'))).toEqual(['Festival']);
    expect(nounsInScreenText(marked('Paints are yours forever once unlocked.'))).toEqual(['Paint']);
    for (const [key, concept] of [
      ['Voyages', 'Voyage'],
      ['Trips', 'Trip'],
      ['Best Buddies', 'Buddy'],
      ['Remixes', 'Remix'],
      ['Photos', 'Photo'],
      ['Atmospheres', 'Atmosphere'],
      ['Greenhouses', 'Greenhouse'],
      ['Passports', 'Passport'],
      ['Keepers', 'Keeper'],
      ['campaigns', 'campaign'],
    ])
      expect(nounsInScreenText(marked(key))).toEqual([concept]);
    expect(nounsInScreenText(marked('Paint your Homeworld'))).toEqual(['Homeworld', 'Paint']);
    for (const key of ['Ember World', 'Crystal Frost Shard trail', 'Coral Keeper', 'Keeper Statue', 'where a seed lands'])
      expect(nounsInScreenText(marked(key))).toEqual([]);
    expect(nounsInScreenText(marked('Tap a plot to build.'))).toEqual(['Homeworld']);
    expect(nounsInScreenText(marked('Decoration: {name}', { name: marked('Moon Lantern') }))).toEqual(['decorations']);
  });
  it('requires a reason for every unmatched rendered key', () => {
    expect(unclassifiedKeys(['Common', 'water', 'Top form', 'Suit'])).toEqual([]);
    expect(unclassifiedKeys(['Nebula Workshop'])).toEqual(['Nebula Workshop']);
  });
  it('keeps early purchased Passport free of closed-system pointers', () => {
    globals();
    for (const flag of ['starter', 'pass', 'banner'] as const) {
      const p = defaultProfile(0);
      p.level = 8;
      p.stats.wins = 7;
      if (flag === 'banner') {
        p.passport.set = true;
        p.passport.banner = 1;
      } else p[flag] = true;
      expect(unlocked(p, 'passport')).toBe(true);
      const nodes: RecordedNode[] = [];
      const app = {
        p,
        save() {},
        topBar: () => new RecordedNode('div'),
        mount: (node: RecordedNode) => nodes.push(node),
      } as unknown as App;
      recordedModals.length = 0;
      showPassport(app);
      const keys = nodes.flatMap((node) => renderedKeys(visibleText(node)));
      expect(keys).not.toContain('Remix stars');
      expect(keys).not.toContain('Mementos');
      expect(keys).not.toContain('Homeworld keepsakes');
      for (const id of [
        'remix_first',
        'remix_boss',
        'voyage_1',
        'stickers_30',
        'memento_10',
        'zen_100',
        'rush_300',
        'festival_1',
        'challenge_win',
        'daily_7',
      ])
        expect(
          trophyVisible(
            p,
            ACHIEVEMENTS.find((a) => a.id.endsWith(`.${id}`))!,
          ),
          id,
        ).toBe(false);
      editPassport(app);
      registry.toasts.length = 0;
      // Gilded has stable id 7 in the full banner choices.
      const swatches = recordedModals.at(-1)!.querySelectorAll('.pe-sw');
      swatches[7].click();
      const toastKeys = registry.toasts.flatMap(renderedKeys);
      if (flag !== 'pass') {
        expect(toastKeys).toContain('Opens at planet {n}');
        expect(toastKeys).not.toContain('Cosmic Road');
      }
      p.level = 11;
      p.remix[1] = { v: 1, best: [], played: [true] };
      p.mementos.push('bunny');
      expect(passportStats(p).map((row) => renderedKeys(row.label)[0])).toEqual(expect.arrayContaining(['Remix stars', 'Mementos']));
    }
  });
  it('renders only taught/built Labs and open resources in the pouch', () => {
    globals();
    const p = defaultProfile(0);
    p.level = 5;
    const app = { p } as App;
    const read = () => {
      recordedModals.length = 0;
      essenceSheet(app);
      return renderedKeys(visibleText(recordedModals.at(-1)!));
    };
    for (const key of ['Rain Lab', 'Sun Lab']) expect(read()).not.toContain(key);
    expect(read()).not.toContain('Star Atlas');
    expect(read()).not.toContain('Dyes');
    p.home.plots[0] = { type: 'lab', kind: 'sun', lv: 1, since: 0 };
    expect(read()).toContain('Sun Lab');
    p.dyes.push('moss');
    expect(read()).toContain('Dyes');
    p.level = 23;
    expect(read()).toContain('Star Atlas');
  });
  it('filters the Launch Bay preview and hides Lands routes before reveal', () => {
    globals();
    const p = defaultProfile(0);
    p.level = 11;
    const app = { p, save() {} } as App;
    const preview = () => {
      recordedModals.length = 0;
      levelSheet(app, () => {});
      return recordedModals
        .at(-1)!
        .querySelectorAll('img')
        .flatMap((img) => renderedKeys(img.attrs.alt ?? ''));
    };
    expect(preview()).not.toContain('Launch Bay');
    p.meta.productEntitlements = ['com.pocketplanet.game.theme.tidepool'];
    expect(preview()).toContain('Launch Bay');
    p.home.level = 2;
    p.home.plots = Array(8).fill(null);
    p.home.gaps = Array(8).fill(null);
    vi.useFakeTimers();
    const buyerSurfaces = recordSnapshot({ p, now: 0 });
    expect(buyerSurfaces.find((surface) => surface.name === '11:Homeworld plot 0')!.nouns).toContain('Launch Bay');

    const list = () => {
      recordedModals.length = 0;
      homeworldListSheet(
        app,
        () => {},
        () => {},
      );
      return recordedModals.at(-1)!;
    };
    expect(renderedKeys(visibleText(list()))).not.toContain('Land {n}: {name}');
    p.home.gaps[0] = 'meadow';
    expect(renderedKeys(visibleText(list()))).toContain('Land {n}: {name}');
    p.home.gaps[0] = null;
    p.level = 21;
    expect(renderedKeys(visibleText(list()))).toContain('Land {n}: {name}');
    recordedModals.length = 0;
    landSheet(app, 0, () => {});
    const sheet = recordedModals.at(-1)!;
    for (const concept of ['campaign', 'Voyage', NEW_FEATURE.zen]) expect(nounsInScreenText(visibleText(sheet))).not.toContain(concept);
    registry.toasts.length = 0;
    sheet
      .querySelectorAll('button')
      .find((button) => button.attrs['aria-disabled'] === 'true')!
      .click();
    for (const concept of ['campaign', 'Voyage']) expect(nounsInScreenText(registry.toasts.join(' '))).not.toContain(concept);
  });
  it('uses closed Album previews until a Road sticker is actually granted', () => {
    const p = defaultProfile(0);
    p.pass = true;
    p.level = 12;
    expect(roadRewardText(p, { sticker: 'cosmic_road' }).flatMap(renderedKeys)).toEqual(['Opens at planet {n}']);
    expect(roadRewardText(p, { gems: 10, sticker: 'cosmic_road' })).toEqual(['💎 10']);
    p.roadStickers.push('cosmic_road');
    expect(roadRewardText(p, { sticker: 'cosmic_road' }).flatMap(renderedKeys)).toEqual(['Cosmic Road sticker']);
  });
  it('shows Festival accessory copy only after its unlock, with a Buddy chosen', () => {
    globals();
    const p = defaultProfile(0);
    p.level = 19;
    p.chapters = [1];
    p.home.residents.push({ species: 'bunny', fp: 0, rewarded: 0 });
    p.buddy.species = 'bunny';
    let node = new RecordedNode('div');
    const app = {
      p,
      save() {},
      topBar: () => new RecordedNode('div'),
      mount: (next: RecordedNode) => {
        node = next;
      },
    } as unknown as App;
    showStyles(app, 'buddy');
    expect(nounsInScreenText(visibleText(node))).not.toContain('Festival');
    expect(renderedKeys(visibleText(node))).toContain('Accessory');
    p.level = 34;
    showStyles(app, 'buddy');
    expect(renderedKeys(visibleText(node))).toEqual(
      expect.arrayContaining(['Festival costume', 'More accessories come from festivals and your Homeworld.']),
    );
  });
  it('gem-help and Settings name only open systems', () => {
    globals();
    const p = defaultProfile(0);
    const readEarn = () => {
      recordedModals.length = 0;
      waysToEarnGems(p);
      return renderedKeys(visibleText(recordedModals.at(-1)!));
    };
    p.level = 11;
    for (const key of ['Visit the Star Calendar.', 'Help your friends with Wishes.', 'Explore the Weekly Voyage.', 'Join festivals.'])
      expect(readEarn()).not.toContain(key);
    p.level = 12;
    expect(readEarn()).toContain('Help your friends with Wishes.');
    p.level = 24;
    expect(readEarn()).toEqual(expect.arrayContaining(['Visit the Star Calendar.', 'Explore the Weekly Voyage.']));
    expect(readEarn()).not.toContain('Join festivals.');
    p.level = 34;
    expect(readEarn()).toContain('Join festivals.');
    for (const level of [1, 20, 30, 31]) {
      p.level = level;
      recordedModals.length = 0;
      settingsFlow({ p } as App);
      expect(renderedKeys(visibleText(recordedModals.at(-1)!)).includes('Shows the whole aim path for every launcher.')).toBe(level >= 31);
    }
  });
  it('has at most 21 visible system nouns by planet 20 (decision 60)', async () => {
    globals();
    diagnostics.length = 0;
    try {
      const regular = await career('Regular');
      const engaged = await career('Engaged');
      const now = Date.UTC(2026, 0, 1, 12);
      const fresh = defaultProfile(now);
      fresh.meta.sessions = 1;
      vi.useFakeTimers();
      const freshSurfaces = recordSnapshot({ p: fresh, now });
      const r = report('Regular', [...freshSurfaces, ...regular.flatMap(recordSnapshot)]);
      const e = report('Engaged', [...freshSurfaces, ...engaged.flatMap(recordSnapshot)]);
      const f = report('Fresh', freshSurfaces);
      console.log(
        `Regular (${r.nouns.length}): ${r.nouns.join(', ')}\nEngaged (${e.nouns.length}): ${e.nouns.join(', ')}\nFresh (${f.nouns.length}): ${f.nouns.join(', ')}`,
      );
      expect.soft(r.nouns, r.details).toEqual(EXPECTED_REGULAR);
      expect.soft(r.nouns.length, `${r.details}\nExpected: ${EXPECTED_REGULAR.join(', ')}`).toBeLessThanOrEqual(NOUN_CAP);
      expect
        .soft(
          f.nouns.filter((n) => !EXPECTED_REGULAR.includes(n)),
          f.details,
        )
        .toEqual([]);
      expect
        .soft(
          e.nouns.filter((n) => ![...EXPECTED_REGULAR, ...EARNED_EXTRAS].includes(n)),
          e.details,
        )
        .toEqual([]);
    } catch (error) {
      if (process.env.NOUNS_REPORT !== '1')
        console.error(
          JSON.stringify(
            { FAMILIES, PART_OF, PARENT_SIGNPOSTS, EXCLUDED, NON_NOUN_KEYS, UNMEASURED, concepts, surfaces: diagnostics },
            null,
            2,
          ),
        );
      throw error;
    }
  });
});
