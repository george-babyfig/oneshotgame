import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordedNode, recordedDom, visibleText } from './helpers/uiRecording';
import { defaultProfile } from '../src/meta/profile';
import { UNLOCKS, unlocked } from '../src/meta/unlocks';
import { BOOSTERS, LANDMARKS } from '../src/meta/tuning';
import { BUILDINGS } from '../src/meta/homeworld';
import { LAB_NAME, ESSENCE_NAME } from '../src/meta/labcopy';
import { NEW_FEATURE } from '../src/meta/nextup';
import { showHome } from '../src/ui/screens/home';
import { showCollection } from '../src/ui/screens/collection';
import { showMissions } from '../src/ui/screens/missions';
import { showLifebook } from '../src/ui/screens/lifebook';
import { showStyles } from '../src/ui/screens/styles';
import { createPanel } from '../src/ui/screens/homeworld/panel';
import { App } from '../src/ui/app';
import { preLevel } from '../src/ui/flows/prelevel';
import { makeLevel } from '../src/core/levels';
import { newPlanet } from '../src/core/world';
import { showStarMap } from '../src/ui/screens/starmap';

vi.mock('../src/ui/dom', async () => (await import('./helpers/uiRecording')).recordedDom);
vi.mock('../src/ui/icons', () => ({ icon: () => new RecordedNode('span') }));
vi.mock('../src/ui/art/galaxy', () => ({ drawGalaxy: () => ({ stop() {} }) }));
vi.mock('../src/ui/art/critters', () => ({
  drawCreature() {},
  critterCanvas: () => new RecordedNode('canvas'),
  animateCreatureGallery: () => () => {},
}));
vi.mock('../src/ui/motion', () => ({ effectiveReduceMotion: () => true, menuParticles: () => null, flyReward() {} }));

// A vocabulary recognizer, not an assumed count: data names count only after a real screen shows them.
const vocabulary = [
  ...new Set([
    ...Object.values(NEW_FEATURE),
    ...UNLOCKS.flatMap((row) => (row.placement !== 'round' && row.intro ? [row.intro.title] : [])),
    ...Object.values(BOOSTERS).map((item) => item.name),
    ...Object.values(BUILDINGS).map((item) => item.name),
    ...Object.values(LAB_NAME),
    ...Object.values(ESSENCE_NAME),
    ...LANDMARKS.map((item) => item.name),
    'stardust',
    'gems',
    'stars',
    'Galaxy',
    'Vault',
    'Campaign',
    'postcard',
    'Next Up',
    'Missions',
    'Homeworld',
    'Collection',
    'Styles',
    'boosters',
    'Homeworld Level',
    'Lab',
    'friends',
    'drones',
    'Essences',
    'plots',
    'lands',
    'Expedition',
    'Paint',
    'Photo',
    'chapter',
    'chapter chest',
    'Star Map',
    'Wish',
    'Cosmic Road',
    'Inbox',
    'Remix',
    'Outfits',
    'Dye',
    'Buddy',
    'Atmosphere',
    'Grown-ups',
    'Field Guide',
    'Keeper',
    'Habitat sets',
    'Mementos',
  ]),
].filter(Boolean);

export function nounsInScreenText(text: string): string[] {
  // Match plurals as the same concept, and escape data names with punctuation.
  const textWithSymbols =
    text + (/[★⭐]/u.test(text) ? ' stars' : '') + (/💎/u.test(text) ? ' gems' : '') + (/✨/u.test(text) ? ' stardust' : '');
  return vocabulary
    .filter((noun) => new RegExp(`(?<![\\p{L}])${noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?(?![\\p{L}])`, 'iu').test(textWithSymbols))
    .sort();
}

export function recordedFirstTwentyScreens(): string[] {
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
  const p = defaultProfile(Date.UTC(2026, 9, 6, 12));
  p.meta.sessions = 1;
  p.home.intro = true;
  p.home.firstHour = 2;
  p.seen = ['bunny', 'deer', 'otter'];
  p.galaxy.push({ n: 1, name: 'a', hue: 0, stars: 3, species: ['bunny'], life: 1, colors: [] });
  const texts: string[] = [];
  const app = {
    p,
    save() {},
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
    mount: (node: RecordedNode) => {
      texts.push(visibleText(node));
      texts.push(visibleText((App.prototype as any).tabBar.call(app, 'home')));
    },
  } as unknown as App;
  for (let planet = 1; planet <= 20; planet++) {
    p.level = planet;
    if (planet > 10) p.chapters = [1];
    showHome(app);
    showCollection(app);
    showMissions(app);
    showStarMap(app);
    if (planet >= 4) {
      preLevel(app, planet);
      texts.push(visibleText((app as any).scene.el));
    }
    if (unlocked(p, 'lifebook')) showLifebook(app);
    if (unlocked(p, 'workshop')) {
      for (const tab of ['suit', 'objects', 'effects', 'homeworld', 'friends', 'dye', 'buddy', 'atmosphere'] as const) showStyles(app, tab);
    }
    if (unlocked(p, 'homeworld')) {
      const panel = recordedDom.h('div');
      const ctx = {
        app,
        canvas: new RecordedNode('canvas'),
        panel,
        levelBadge: recordedDom.btn('', '', () => {}),
        pouchHeader: recordedDom.btn('', '', () => {}),
        plotButtons: [],
        selected: -1,
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
      texts.push(visibleText(panel));
    }
  }
  return texts;
}

describe('M4 meta noun budget measured from real rendered screens', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('does not count data terms that never appear and reads newly rendered terms', () => {
    expect(nounsInScreenText('Nothing here')).toEqual([]);
    expect(nounsInScreenText('Paint your Homeworld')).toEqual(['Homeworld', 'Paint']);
  });
  it('has at most 20 visible system nouns by planet 20', () => {
    const nouns = [...new Set(recordedFirstTwentyScreens().flatMap(nounsInScreenText))].sort();
    expect(
      nouns.length,
      `Rendered noun count: ${nouns.length}\n${nouns.join(', ')}\nDefer secondary Styles tabs, Homeworld paint/photo/expeditions/drones, and Collection sub-systems.`,
    ).toBeLessThanOrEqual(20);
  });
});
