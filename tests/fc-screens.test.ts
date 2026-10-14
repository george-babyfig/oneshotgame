import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordedNode, recordedDom, visibleText } from './helpers/uiRecording';
import { defaultProfile } from '../src/meta/profile';
import { tickHome } from '../src/meta/homeworld';
import { ensureWishes } from '../src/meta/wishes';
import { wishesPanel } from '../src/ui/flows/wishes';
import { confirmGemUse } from '../src/ui/screens/homeworld/gemConfirm';
import { createPanel } from '../src/ui/screens/homeworld/panel';
import { slotName } from '../src/ui/screens/styles';
import { BOOSTERS } from '../src/meta/tuning';
import { gotText } from '../src/ui/screens/homeworld/sheets';
import { stylesAccess, stylesLockReason } from '../src/meta/stylesAccess';
import type { App } from '../src/ui/app';

const capture = vi.hoisted(() => ({ sheet: null as RecordedNode | null, closed: false, onClose: () => {}, onAbort: () => {} }));
vi.mock('../src/ui/dom', async () => {
  const { recordedDom, RecordedNode } = await import('./helpers/uiRecording');
  return {
    ...recordedDom,
    modal: (children: unknown[], options: { onClose?: () => void; onAbort?: () => void } = {}) => {
      const el = new RecordedNode('div');
      el.append(...(children as Parameters<typeof el.append>));
      capture.sheet = el;
      capture.closed = false;
      capture.onClose = () => options.onClose?.();
      capture.onAbort = () => options.onAbort?.();
      return {
        el,
        close: () => {
          capture.closed = true;
          capture.onClose();
        },
      };
    },
  };
});
vi.mock('../src/ui/art/critters', () => ({
  drawCreature() {},
  critterCanvas: () => new RecordedNode('canvas'),
  animateCreatureGallery: () => () => {},
}));
vi.mock('../src/ui/audio', () => ({ sfx: { coin: vi.fn(), click: vi.fn() } }));
vi.mock('../src/ui/haptics', () => ({ haptic: { success: vi.fn(), light: vi.fn() } }));

function appFor() {
  const p = defaultProfile(0);
  p.level = 14;
  p.chapters = [1];
  p.seen = ['bunny'];
  p.home.intro = true;
  p.home.firstHour = 2;
  return {
    p,
    save: vi.fn(),
    refresh: vi.fn(),
    selectTab: vi.fn(),
    topBar: () => recordedDom.h('div'),
    canGoBack: () => false,
  } as unknown as App;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T12:00:00'));
  vi.stubGlobal('document', { activeElement: null, createElement: (tag: string) => new RecordedNode(tag) });
  vi.stubGlobal('HTMLElement', RecordedNode);
  capture.sheet = null;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('FC clear gem confirmation', () => {
  it('needs a new gesture, cancels without spending, and prevents concurrent sheets', async () => {
    const choice = confirmGemUse('Sprout', 80);
    expect(capture.sheet!.textContent).toContain('Use 💎80 for Sprout?');
    const buttons = capture.sheet!.querySelectorAll('button');
    expect(buttons[0].textContent).toBe('Cancel');
    expect(buttons[1].disabled).toBe(true);
    buttons[1].click();
    expect(await confirmGemUse('Sprout', 80)).toBe(false);
    await vi.advanceTimersByTimeAsync(450);
    buttons[0].click();
    expect(await choice).toBe(false);
    const next = confirmGemUse('Sprout', 80);
    await vi.advanceTimersByTimeAsync(450);
    capture.sheet!.querySelectorAll('button')[1].click();
    expect(await next).toBe(true);
  });
  it('puts Cancel first and keeps Use disabled while a double tap could still land', async () => {
    vi.useFakeTimers();
    const choice = confirmGemUse('Sprout', 80);
    const [cancel, use] = capture.sheet!.querySelectorAll('button');
    expect(cancel.textContent).toBe('Cancel');
    expect(use.disabled).toBe(true);
    vi.advanceTimersByTime(449);
    expect(use.disabled).toBe(true);
    vi.advanceTimersByTime(1);
    expect(use.disabled).toBe(false);
    capture.onClose();
    expect(await choice).toBe(false);
    vi.useRealTimers();
  });
  it('settles an aborted sheet and permits a later confirmation', async () => {
    const choice = confirmGemUse('Sprout', 80);
    capture.onAbort();
    expect(await choice).toBe(false);
    const later = confirmGemUse('Sprout', 80);
    capture.onClose();
    expect(await later).toBe(false);
  });
});

describe('FC reward feedback and navigation', () => {
  it('decision 70 amendment: a friend Wish claim shows friendship and never "💎 0"', () => {
    const app = appFor();
    app.p.home.residents = [{ species: 'otter', fp: 0, rewarded: 1 }];
    app.p.seen = [...new Set([...app.p.seen, 'otter', 'goat', 'deer'])];
    const cards = ensureWishes(app.p, '2026-10-06');
    const friend = cards.find((card) => card.from === 'friend')!;
    friend.progress = friend.goal;
    const panel = wishesPanel(app) as unknown as RecordedNode;
    panel
      .querySelectorAll('button')
      .find((button) => button.textContent === 'Claim')!
      .click();
    expect(capture.sheet!.textContent).toContain('+2 friendship points');
    expect(capture.sheet!.textContent).not.toContain('💎 0');
  });
  it('refreshes wallet and badges and tells the child where the granted look went', () => {
    const app = appFor();
    const cards = ensureWishes(app.p, '2026-10-06');
    cards.forEach((card) => (card.progress = card.goal));
    cards[0].claimed = cards[1].claimed = true;
    const panel = wishesPanel(app) as unknown as RecordedNode;
    panel
      .querySelectorAll('button')
      .find((button) => button.textContent === 'Claim')!
      .click();
    expect(app.save).toHaveBeenCalledOnce();
    expect(app.refresh).toHaveBeenCalledOnce();
    expect(capture.sheet!.textContent).toContain('Wish granted!');
    expect(capture.sheet!.textContent).toContain('💎 27');
    expect(capture.sheet!.textContent).toContain('All three Wishes: 💎15 bonus');
    expect(capture.sheet!.textContent).toContain('is in Styles.');
    capture
      .sheet!.querySelectorAll('button')
      .find((button) => button.textContent === 'See it in Styles')!
      .click();
    expect(app.selectTab).toHaveBeenCalledWith('styles');
  });
  it('does not promise a point on a full day or a finished Road', () => {
    const app = appFor();
    app.p.roadDay = { day: '2026-10-06', earned: 4 };
    expect(visibleText(wishesPanel(app) as unknown as RecordedNode)).not.toContain('Road point');
    app.p.roadDay.earned = 0;
    app.p.roadRecords.road00.points = 200;
    expect(visibleText(wishesPanel(app) as unknown as RecordedNode)).not.toContain('Road point');
  });
  it('does not offer a swap while the device day is behind the dealt day', () => {
    const app = appFor();
    const ids = ensureWishes(app.p, '2026-10-07').map((card) => card.id);
    const panel = wishesPanel(app) as unknown as RecordedNode;
    expect(panel.querySelectorAll('button').some((button) => button.textContent === 'Swap')).toBe(false);
    expect(app.p.quests.list.map((card) => card.id)).toEqual(ids);
  });
  it('uses translated slot templates and registered decoration names', () => {
    expect(slotName('shotTrail:ice')).toBe('Shot trail: Ice Comet');
    expect(slotName('labSkin:seed')).toBe('Lab: Seed Pod');
    expect(slotName('decoration:flowers')).toBe('Comet Flowers');
    expect(slotName('ground')).toBe('Ground paint');
  });
  it('gives Life Spark its own symbol in expedition and collect feedback', () => {
    expect(gotText({ gems: 2, dust: 39, boosters: { spark: 1 } })).toBe('✨39  💎2  🌱×1');
    expect(BOOSTERS.spark.emoji).toBe('🌱');
  });
  it('clears the lock reason as soon as the chest or an owned product opens Styles', () => {
    const p = defaultProfile();
    p.level = 11;
    expect(stylesLockReason(p)).toBe('Open your chapter 1 chest to unlock Styles');
    p.chapters = [1];
    expect(stylesAccess(p)).toBe(true);
    expect(stylesLockReason(p)).toBeUndefined();
    p.chapters = [];
    p.starter = true;
    expect(stylesLockReason(p)).toBeUndefined();
  });
  it('updates the existing Homeworld tab badge in place when a trip return is acknowledged', () => {
    const app = appFor();
    app.p.level = 21;
    app.p.home.plots[0] = { type: 'launch_bay', lv: 3, since: 0 };
    app.p.home.expedition = { species: 'bunny', hours: 4, ends: 1, planet: -1 };
    tickHome(app.p, 1);
    const panel = recordedDom.h('div');
    const tab = recordedDom.h('button', null, recordedDom.h('span', { class: 'nb' }, '1'));
    const root = recordedDom.h('div');
    root.append(tab);
    root.querySelector = ((selector: string) => (selector === '[data-tab="homeworld"]' ? tab : null)) as typeof root.querySelector;
    const canvas = new RecordedNode('canvas');
    canvas.parentElement = root;
    const view = createPanel({
      app,
      canvas,
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
    } as unknown as Parameters<typeof createPanel>[0]);
    view.renderPanel();
    expect(tab.querySelector('.nb')?.textContent).toBe('1');
    expect(app.p.home.expedition).toBeNull();
    // The postcard sheet acknowledges the return; the panel then refreshes the tab badge without a remount.
    app.p.home.tripReturn = null;
    app.p.home.seen.celebrations = [];
    view.renderPanel();
    expect(tab.querySelector('.nb')).toBeNull();
  });
});
