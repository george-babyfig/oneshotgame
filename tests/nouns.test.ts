import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordedNode, recordedDom, recordedModals, visibleText } from './helpers/uiRecording';
import { defaultProfile, type Profile } from '../src/meta/profile';
import { unlocked } from '../src/meta/unlocks';
import { BOOSTERS, LANDMARKS, SKINS, DYES, RESIDENT_ACCS } from '../src/meta/tuning';
import { BUILDINGS, busyDrones } from '../src/meta/homeworld';
import { LAB_NAME, LAB_GUARD_NAME, LAB_FORM, ESSENCE_NAME } from '../src/meta/labcopy';
import { NEW_FEATURE, nextUp } from '../src/meta/nextup';
import { showHome } from '../src/ui/screens/home';
import { showCollection } from '../src/ui/screens/collection';
import { showMissions } from '../src/ui/screens/missions';
import { showLifebook } from '../src/ui/screens/lifebook';
import { showStyles } from '../src/ui/screens/styles';
import { createPanel } from '../src/ui/screens/homeworld/panel';
import { levelSheet, firstHourSheet, residentsSheet } from '../src/ui/screens/homeworld/sheets';
import { showPassport } from '../src/ui/screens/passport';
import { firstHourStep } from '../src/meta/firsthour';
import { App } from '../src/ui/app';
import { preLevel } from '../src/ui/flows/prelevel';
import { levelResults } from '../src/ui/flows/results';
import { buildHud } from '../src/ui/hud';
import type { LevelScene, LevelResult } from '../src/ui/game';
import { makeLevel } from '../src/core/levels';
import { newPlanet, SPECIES, type Kind } from '../src/core/world';
import { showStarMap } from '../src/ui/screens/starmap';
import { COSMETICS } from '../src/meta/cosmetics';
import { HABITATS } from '../src/meta/habitats';
import { CHAPTER_NAMES } from '../src/meta/progression';
import { stylesAccess } from '../src/meta/stylesAccess';
import { momentumActive } from '../src/meta/momentum';
import { addVisitors } from '../src/meta/visitors';
import { labPlot } from '../src/meta/labs';
import { inboxOpen } from '../src/meta/reveals';
import { chestsReady } from '../src/meta/progression';
import { wishClaimable } from '../src/meta/wishes';
import { roadReady } from '../src/meta/starroad';
import { letterOf } from '../src/meta/inbox';
import { simulate, type PlayerType } from './sim/economy/career';

// UNMEASURED: opt-in or transient; none introduces another system beyond measured entry points.
// Settings; Field Guide pages; round coach/fail-help cards; toasts; chapter-chest celebration;
// Homeworld list/land/paint/photo/expedition sheets; Launch Bay; Grown-ups and receipts.
const UNMEASURED = {
  'Settings sheet': 'opt-in preferences',
  'Field Guide pages': 'entry point is counted; Vault wording is shared',
  'Round coach and fail-help cards': 'round vocabulary; Keeper title removed',
  toasts: 'transient confirmations',
  'Chapter-chest celebration': 'part of chapter',
  'Homeworld list, land, paint, photo and expedition sheets': 'entry points gated and counted',
  'Launch Bay screen': 'entry point counted',
  'Grown-ups and receipts': 'behind parent gate',
};
const registry = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock('../src/i18n', () => {
  const t = (key: string, vars: Record<string, string | number> = {}) => {
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
  };
});
vi.mock('../src/ui/dom', async () => (await import('./helpers/uiRecording')).recordedDom);
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
    members: ['Lv {n}', ...Object.values(LAB_NAME), ...Object.values(LAB_GUARD_NAME), ...Object.values(LAB_FORM).flatMap(Object.values)],
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
  friends: { members: ['Den', 'Critter Den', 'friendship level'], reason: 'Den governs the friend cap; friendship belongs to a friend' },
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
const concepts: { name: string; pattern: string; members?: readonly string[]; reason: string }[] = [
  ...[
    ['stardust', 'stardust', 'Meta resource'],
    ['gems', 'gems?', 'Meta resource'],
    ['stars', 'stars?', 'Round resource opted in by planned 18'],
    ['Star Map', 'Star Map', 'Meta destination'],
    ['chapter', 'chapters?', 'Meta chapter and chest row'],
    ['galaxy', 'galaxy', 'Meta destination'],
    ['Vault', 'Vault', 'Meta reward loop'],
    ['Missions', 'Missions', 'New destination row'],
    ['Wishes', 'Wish(es)?', 'New reward loop row'],
    ['Homeworld', 'Homeworld|plots?', 'New destination; level and plots are parts'],
    ['Lab', 'Labs?', 'New Lab family row'],
    ['friends', 'friends?|(?:Critter )?Den|friendship', 'New friends row; Den is its cap'],
    ['Essences', 'Essences?', 'New resource family row'],
    ['boosters', 'boosters?', 'Round booster family row'],
    ['Momentum', 'Momentum', 'Round row; planned 18'],
    ['Buddy', 'Buddy', 'Round row; planned 18'],
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
    ['campaign', 'campaign'],
    ['Next Up', 'Next Up'],
    ['Keeper', 'Keeper'],
    ['visitors', 'visitors?'],
    ['Mementos', 'mementos?|keepsakes?'],
    ['Passport', 'Passport'],
    ['Voyage', 'Voyage'],
    ['Star Road', '(?:Star|Cosmic) Road|Road points?'],
    ['Star Calendar', 'Star Calendar'],
    ['Star Atlas', 'Star Atlas'],
    ['constellations', 'constellations?'],
    ['Sticker Album', 'Sticker Album|stickers?'],
    ['Inbox', 'Inbox|letters?'],
    ['Remix', 'Remix'],
    ['Expedition', 'Expeditions?'],
    ['Paint', 'paint'],
    ['Photo', 'photo'],
    ['Dye', 'dyes?'],
    ['Atmosphere', 'Atmosphere'],
    ['Outfits', 'outfits?'],
    ['launchers', 'launchers?'],
    ['Launch Bay', 'Launch Bay'],
    ['Greenhouse', 'Greenhouse'],
    ['drones', 'drones?'],
    ['decorations', 'decorations?'],
    ['Habitat sets', 'habitat'],
    ['postcards', 'postcards?'],
    ['Landmarks', 'Landmarks?'],
    ['Festival', 'Festival'],
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
    documentElement: new RecordedNode('html'),
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
  const render = (name: string, builder: (app: App) => void, visitors = false) => {
    vi.setSystemTime(snapshot.now);
    const p = structuredClone(snapshot.p);
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
function report(label: string, surfaces: Surface[]) {
  const nouns = [...new Set(surfaces.flatMap((s) => s.nouns))].sort();
  const details = `${label}: ${nouns.length}\n${nouns.join(', ')}\n${JSON.stringify({ FAMILIES, PART_OF, PARENT_SIGNPOSTS, EXCLUDED, UNMEASURED, concepts, surfaces }, null, 2)}`;
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
    expect(nounsInScreenText(marked('Paint your Homeworld'))).toEqual(['Homeworld', 'Paint']);
    for (const key of ['Ember World', 'Crystal Frost Shard trail', 'Coral Keeper', 'Keeper Statue', 'where a seed lands'])
      expect(nounsInScreenText(marked(key))).toEqual([]);
    expect(nounsInScreenText(marked('Tap a plot to build.'))).toEqual(['Homeworld']);
    expect(nounsInScreenText(marked('Decoration: {name}', { name: marked('Moon Lantern') }))).toEqual(['decorations']);
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
          JSON.stringify({ FAMILIES, PART_OF, PARENT_SIGNPOSTS, EXCLUDED, UNMEASURED, concepts, surfaces: diagnostics }, null, 2),
        );
      throw error;
    }
  });
});
