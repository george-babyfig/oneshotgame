import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordedNode, recordedDom, recordedModals } from './helpers/uiRecording';
import { defaultProfile, type Profile } from '../src/meta/profile';
import { encodeSectors, decodePlanet } from '../src/meta/galaxyCodec';
import { newPlanet } from '../src/core/world';
import * as trips from '../src/meta/trips';
import { tripSheet, tripVisible, tripLabel, residentsSheet } from '../src/ui/screens/homeworld/sheets';
import { createPanel } from '../src/ui/screens/homeworld/panel';
import { showLaunchBay } from '../src/ui/screens/launchbay';
import { openFriendWish, drawWishBubble, tripMotionPose, TRIP_MOMENT_MS } from '../src/ui/screens/homeworld/canvas';
import { renderTripPostcard, shareCanvas } from '../src/ui/postcard';
import { renderPlanet } from '../src/ui/art/planet';
import { drawCreature } from '../src/ui/art/critters';
import { parentalGate } from '../src/ui/flows/gate';
import { awayFlow } from '../src/ui/flows/away';
import type { App } from '../src/ui/app';

vi.mock('../src/ui/dom', async () => {
  const { recordedDom, RecordedNode, recordedModals } = await import('./helpers/uiRecording');
  return {
    ...recordedDom,
    modal: (content: unknown[], opts: { cls?: string; onClose?: () => void; onAbort?: () => void } = {}) => {
      const el = new RecordedNode('div', { class: `modal ${opts.cls ?? ''}` });
      el.append(...(content as Parameters<typeof el.append>));
      recordedModals.push(el);
      return { el, close: () => opts.onClose?.() };
    },
  };
});
vi.mock('../src/ui/art/critters', () => ({ drawCreature: vi.fn(), critterCanvas: () => new RecordedNode('canvas') }));
vi.mock('../src/ui/art/planet', () => ({ renderPlanet: vi.fn(), drawHomeworldLand: vi.fn() }));
vi.mock('../src/ui/audio', () => ({ sfx: { chest: vi.fn(), launch: vi.fn(), coin: vi.fn() } }));
vi.mock('../src/ui/haptics', () => ({ haptic: { success: vi.fn(), medium: vi.fn() } }));
vi.mock('../src/ui/flows/gate', () => ({ parentalGate: vi.fn(async () => false) }));

const NOW = Date.UTC(2026, 9, 6, 12);
function fixture() {
  const p = defaultProfile(NOW);
  p.level = 30;
  p.tutorial = true;
  p.home.level = 2;
  p.home.intro = true;
  p.home.firstHour = 2;
  p.home.plots[0] = { type: 'launch_bay', lv: 4, since: NOW };
  p.home.plots[1] = { type: 'den', lv: 2, since: NOW };
  p.home.residents = [
    { species: 'bunny', fp: 0, rewarded: 1 },
    { species: 'otter', fp: 2, rewarded: 1 },
  ];
  p.home.tripFuel = true;
  const planet = newPlanet();
  planet.sectors.forEach((sector, i) => {
    sector.biome = i < 6 ? 'icesheet' : 'meadow';
    sector.life = i < 6 ? 0 : 2;
  });
  p.galaxy = [{ n: 1, name: 'Sprout', hue: 0, stars: 3, species: [], colors: [], life: 36, sec: encodeSectors(planet) }];
  const app = {
    p,
    save: vi.fn(),
    refresh: vi.fn(),
    showHomeworld: vi.fn(),
    selectTab: vi.fn(),
    topBar: () => recordedDom.h('div'),
    mount: vi.fn(),
    clearAwayPending: vi.fn(),
  } as unknown as App;
  return { app, p };
}
const sheet = () => recordedModals[recordedModals.length - 1];
function click(text: string) {
  const button = sheet()
    .querySelectorAll('button')
    .find((button) => button.textContent === text);
  expect(button, text).toBeDefined();
  button!.click();
}
function rewards(p: Profile) {
  return JSON.stringify({ mats: p.mats, gems: p.gems, dust: p.dust, boosters: p.boosters, friends: p.home.residents });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  recordedModals.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal('document', {
    createElement: (tag: string) => new RecordedNode(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  vi.stubGlobal(
    'CustomEvent',
    class {
      constructor(
        public type: string,
        public options: unknown,
      ) {}
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('M13 trip UI', () => {
  it('renders no sheet or Launch Bay trip section before 21, even with a migrated Bay and trip', () => {
    const { app, p } = fixture();
    p.level = 20;
    p.home.expedition = { species: 'otter', hours: 1, ends: NOW + 3600000, planet: 0 };
    expect(tripVisible(p)).toBe(false);
    tripSheet(app);
    expect(recordedModals).toHaveLength(0);
    showLaunchBay(app);
    expect((vi.mocked(app.mount).mock.calls[0][0] as unknown as RecordedNode).textContent).not.toMatch(/Trip|Expedition/i);
    residentsSheet(app, () => {});
    expect(sheet().textContent).not.toMatch(/trip|expedition/i);
    p.level = 21;
    expect(tripVisible(p)).toBe(true);
  });
  it('puts a Trips section in the Launch Bay and keeps the Bay-1 lock after 21', () => {
    const { app, p } = fixture();
    p.home.plots[0]!.lv = 1;
    showLaunchBay(app);
    const screen = vi.mocked(app.mount).mock.calls[0][0] as unknown as RecordedNode;
    expect(screen.textContent).toContain('Trips open at Launch Bay level 2');
    tripSheet(app);
    expect(sheet().textContent).toContain('Trips open at Launch Bay level 2');
    expect(sheet().textContent).not.toContain('Expedition');
  });
  it('offers 121 list rows with complete spoken yield labels and colour filters', () => {
    const { app, p } = fixture();
    const row = trips.tripPlanets(p)[0];
    vi.spyOn(trips, 'tripPlanets').mockReturnValue(
      Array.from({ length: 121 }, (_, i) => ({
        ...row,
        n: i + 1,
        entry: { ...row.entry, n: i + 1 },
        mats: i % 2 ? { leaf: 9 } : { frost: 6 },
      })),
    );
    const promise = trips.previewTrip(p, 1, 8)!;
    vi.spyOn(trips, 'previewTrip').mockImplementation((_p, n) => ({
      ...promise,
      n,
      yield: { ...promise.yield, mats: n % 2 ? { frost: 6 } : { leaf: 9 } },
    }));
    tripSheet(app);
    const list = sheet().querySelector('.trip-planets')!;
    expect(list.attrs.role).toBe('list');
    expect(list.querySelectorAll('button')).toHaveLength(121);
    expect(list.querySelectorAll('button')[0].attrs['aria-label']).toMatch(/3 stars.*frost 6/);
    click('❄️ frost');
    expect(list.querySelectorAll('button')).toHaveLength(61);
    click('All');
    expect(list.querySelectorAll('button')).toHaveLength(121);
  });
  it('hides planets with a zero payout at the chosen duration and refreshes rows when the duration changes', () => {
    const { app, p } = fixture();
    const small = newPlanet();
    small.sectors.slice(0, 2).forEach((sector) => {
      sector.biome = 'meadow';
    });
    p.galaxy.push({ ...p.galaxy[0], n: 2, sec: encodeSectors(small) });
    tripSheet(app);
    expect(sheet().querySelector('.trip-planets')!.querySelectorAll('button')).toHaveLength(2);
    click('1-hour trip');
    expect(sheet().querySelector('.trip-planets')!.querySelectorAll('button')).toHaveLength(1);
    click('8-hour trips');
    expect(sheet().querySelector('.trip-planets')!.querySelectorAll('button')).toHaveLength(2);
  });
  it('keeps overview and Bay plot trip entries gated, and saves a tick return with one labelled badge', () => {
    const { app, p } = fixture();
    const panel = recordedDom.h('div');
    const tab = recordedDom.h('button');
    const root = recordedDom.h('div');
    root.querySelector = ((selector: string) => (selector === '[data-tab="homeworld"]' ? tab : null)) as typeof root.querySelector;
    const canvas = new RecordedNode('canvas');
    canvas.parentElement = root;
    const context = {
      app,
      panel,
      canvas,
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
    const view = createPanel(context as unknown as Parameters<typeof createPanel>[0]);
    p.level = 20;
    view.renderPanel();
    expect(panel.textContent).not.toMatch(/Trip|Expedition/i);
    context.selected = 0;
    view.renderPanel();
    expect(panel.textContent).not.toMatch(/Trip|Expedition/i);
    p.level = 21;
    view.renderPanel();
    expect(panel.textContent).toContain('Trips');
    context.selected = -1;
    view.renderPanel();
    expect(panel.textContent).toContain('Trip');
    trips.startTrip(p, 1, 1);
    vi.setSystemTime(NOW + 3600000);
    view.tickPanel();
    expect(p.home.tripReturn).not.toBeNull();
    expect(app.save).toHaveBeenCalled();
    expect(tab.querySelectorAll('.nb')).toHaveLength(1);
    expect(tab.querySelector('.nb')!.attrs['aria-label']).toBe('A friend is back from a trip');
    const before = rewards(p);
    const collect = panel.querySelectorAll('button').find((button) => button.textContent === 'Collect · A friend is back from a trip')!;
    collect.click();
    click('Back');
    expect(tab.querySelector('.nb')).toBeNull();
    expect(rewards(p)).toBe(before);
  });
  it('previews the real planet, match, all yields and clock time before sending', () => {
    const { app, p } = fixture();
    tripSheet(app);
    sheet().querySelector('.trip-planets')!.querySelectorAll('button')[0].click();
    const promise = trips.previewTrip(p, 1, 8)!;
    expect(sheet().textContent).toContain('Hopper Bunny feels at home here');
    expect(sheet().textContent).toContain('+3 friendship points');
    expect(sheet().textContent).toContain('Back at');
    expect(vi.mocked(renderPlanet).mock.calls.at(-1)![1]).toEqual(decodePlanet(p.galaxy[0]));
    expect(sheet().textContent).not.toMatch(/stardust|boosters|\+25%/);
    click('Send');
    expect(p.home.expedition!.yield).toEqual(promise.yield);
    expect(p.home.expedition!.species).toBe(promise.species);
    expect(document.dispatchEvent).toHaveBeenCalled();
  });
  it('Someone else updates the preview and excludes the Buddy', () => {
    const { app, p } = fixture();
    tripSheet(app);
    sheet().querySelector('.trip-planets')!.querySelectorAll('button')[0].click();
    click('Someone else');
    const alternative = sheet()
      .querySelectorAll('button')
      .find((button) => button.textContent.includes('Tide Otter'))!;
    alternative.click();
    expect(sheet().textContent).toContain('Tide Otter is going');
    expect(sheet().textContent).not.toContain('feels at home');
    click('Cancel');
    expect(p.home.expedition).toBeNull();
    p.buddy.species = 'otter';
    sheet().querySelector('.trip-planets')!.querySelectorAll('button')[0].click();
    click('Someone else');
    expect(sheet().textContent).not.toContain('Tide Otter');
    expect(sheet().querySelectorAll('button').at(-1)!.textContent).toBe('Back');
  });
  it('Call home is always available in flight and pays nothing', () => {
    const { app, p } = fixture();
    expect(trips.startTrip(p, 1, 8)).toBe('ok');
    const before = rewards(p);
    tripSheet(app);
    expect(sheet().textContent).toContain('Each win brings your friend home 10 minutes sooner');
    click('Call Hopper Bunny home');
    expect(p.home.expedition).toBeNull();
    expect(p.home.tripFuel).toBe(true);
    expect(rewards(p)).toBe(before);
  });
  it('settles before the Collect chip, preserves its single badge until postcard dismissal, and never repays', async () => {
    const { app, p } = fixture();
    trips.startTrip(p, 1, 8);
    vi.setSystemTime(NOW + 8 * 3600000);
    trips.settleTrips(p);
    const before = rewards(p);
    expect(tripLabel(p)).toBe('Collect · A friend is back from a trip');
    expect(p.home.seen.celebrations.filter((id) => id.startsWith('trip:'))).toEqual(['trip:1']);
    tripSheet(app);
    expect(sheet().querySelector('canvas')!.attrs['aria-label']).toBe('Postcard from Sprout');
    click('Share postcard');
    await vi.runAllTicks();
    expect(parentalGate).toHaveBeenCalledWith('share');
    click('Back');
    expect(p.home.tripReturn).toBeNull();
    expect(p.home.seen.celebrations).not.toContain('trip:1');
    expect(rewards(p)).toBe(before);
  });
  it('renders the saved planet and the traveller in front on a shareable postcard', () => {
    const { p } = fixture();
    const canvas = renderTripPostcard(p.galaxy[0], 'otter');
    expect(canvas.width).toBe(1080);
    expect(vi.mocked(renderPlanet).mock.calls[0][1]).toEqual(decodePlanet(p.galaxy[0]));
    expect(vi.mocked(drawCreature).mock.calls.at(-1)![1]).toBe('otter');
  });
  it('does not encode or export the postcard when the parental gate is cancelled', async () => {
    const canvas = new RecordedNode('canvas');
    const encode = vi.spyOn(canvas, 'toDataURL');
    await shareCanvas(canvas as unknown as HTMLCanvasElement, 'Postcard');
    expect(parentalGate).toHaveBeenCalledWith('share');
    expect(encode).not.toHaveBeenCalled();
  });
  it('adds one trip line to the away card without paying again', () => {
    const { app, p } = fixture();
    trips.startTrip(p, 1, 1);
    vi.setSystemTime(NOW + 3600000);
    trips.settleTrips(p);
    const before = rewards(p);
    awayFlow(app, 3600000);
    expect(sheet().textContent.split('A friend is back from a trip')).toHaveLength(2);
    expect(rewards(p)).toBe(before);
  });
  it('holds a wave before lift-off, lands at the pad, and uses only a fade under Reduce Motion', () => {
    expect(TRIP_MOMENT_MS).toBeLessThanOrEqual(2000);
    expect(tripMotionPose('send', 0.5, false)).toEqual({ lift: 0, alpha: 1 });
    expect(tripMotionPose('send', 1, false).lift).toBeCloseTo(1);
    expect(tripMotionPose('return', 0, false).lift).toBe(1);
    expect(tripMotionPose('return', 1, false).lift).toBe(0);
    for (const kind of ['send', 'return'] as const) {
      expect(tripMotionPose(kind, 0, true)).toEqual({ lift: 0, alpha: 0 });
      expect(tripMotionPose(kind, 1, true)).toEqual({ lift: 0, alpha: 1 });
    }
  });
  it('draws the land thought and opens its Wish in Missions without claiming or paying', () => {
    const { app, p } = fixture();
    p.quests.list = [
      { id: 'thought', species: 'bunny', progress: 0, goal: 2, claimed: false } as unknown as Profile['quests']['list'][number],
    ];
    const before = JSON.stringify(p);
    drawWishBubble(new RecordedNode('canvas').getContext() as CanvasRenderingContext2D, 'meadow', 44, 44);
    openFriendWish(app, 'bunny');
    expect(app.selectTab).toHaveBeenCalledWith('missions');
    expect(JSON.stringify(p)).toBe(before);
  });
});
