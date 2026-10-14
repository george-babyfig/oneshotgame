import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LevelScene } from '../src/ui/game';
import { COACH } from '../src/meta/coach';
import { SPECIES_BY_ID } from '../src/core/world';
import { setLang, t } from '../src/i18n';

vi.mock('../src/ui/dom', () => ({
  h: (_tag: string, _props: unknown, ...children: unknown[]) => children.flat().join(' '),
  btn: () => '',
  fmt: String,
  toast: () => {},
  modal: vi.fn(() => ({ el: {}, close: () => {} })),
}));
vi.mock('../src/ui/art/critters', () => ({ critterCanvas: () => '' }));
vi.mock('../src/ui/devcapture', () => ({ marketingMode: () => false }));
import { modal } from '../src/ui/dom';
import { showCoach, showCoachEvent, showDiscover, showGoalRecipe } from '../src/ui/hud';

function element() {
  const classes = new Set<string>();
  return {
    textContent: '',
    get className() {
      return [...classes].join(' ');
    },
    set className(value: string) {
      classes.clear();
      value.split(' ').forEach((v) => classes.add(v));
    },
    classList: {
      add: (...names: string[]) => names.forEach((name) => classes.add(name)),
      remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
      contains: (name: string) => classes.has(name),
      toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
    },
    replaceChildren(...children: unknown[]) {
      this.textContent = children.join(' ');
    },
    closest: () => null,
    offsetWidth: 1,
  };
}
function scene() {
  const value = {
    o: { coach: COACH[1] },
    L: { n: 1 },
    coachEl: element(),
    discoverEl: element(),
    coachEvents: new Set(),
    discoverQueue: [] as string[],
    fusionDiscoverQueue: [],
    discoverBusy: false,
    ended: false,
    destroyed: false,
    aimFrom: null,
    exitK: 0,
    showDiscover: () => showDiscover(value as unknown as LevelScene),
  };
  return value as unknown as LevelScene;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
  setLang('en');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setLang('en');
});

describe('FB HUD teaching and discoveries', () => {
  it('preserves the full four-second tutorial tip and serializes event and discovery cards', () => {
    const s = scene();
    showCoach(s, 1);
    vi.advanceTimersByTime(250);
    showCoachEvent(s, 'creature');
    s.discoverQueue.push('bunny');
    showDiscover(s);
    expect(s.coachEl.textContent).toContain(COACH[1][1]);
    expect(s.discoverQueue).toEqual(['bunny']);
    expect(s.discoverBusy).toBe(false);
    // A rapid follow-up fling hides transient banners in game.ts; reading must survive it.
    s.coachEl.classList.remove('show');
    clearTimeout(s.coachTimer);
    vi.advanceTimersByTime(3749);
    expect(s.coachEl.textContent).toContain(COACH[1][1]);
    expect(s.coachEl.classList.contains('reading')).toBe(true);
    vi.advanceTimersByTime(301);
    expect(s.coachEl.textContent).toContain('A new friend moved in!');
    expect(s.discoverBusy).toBe(false);
    vi.advanceTimersByTime(4300);
    expect(s.coachEl.classList.contains('show')).toBe(false);
    expect(s.discoverEl.classList.contains('show')).toBe(true);
    expect(s.discoverQueue).toEqual([]);
    vi.advanceTimersByTime(1400);
    expect(s.discoverBusy).toBe(false);
  });

  it('does not revive pending cards after the round is destroyed', () => {
    const s = scene();
    showCoach(s, 1);
    s.discoverQueue.push('bunny');
    s.destroyed = true;
    vi.advanceTimersByTime(5000);
    expect(s.discoverBusy).toBe(false);
    expect(s.discoverQueue).toEqual(['bunny']);
  });

  it('uses the translated single-land hint in the actual goal recipe sheet', () => {
    setLang('ja');
    showGoalRecipe(scene(), { type: 'species', id: 'bunny', count: 1 });
    const content = vi.mocked(modal).mock.calls.at(-1)?.[0].join(' ');
    expect(content).toContain(t('Lives in {a}', { a: t('Meadow') }));
    expect(content).not.toContain('Lives in Meadow');
    expect(SPECIES_BY_ID.bunny.home).toHaveLength(1);
  });
});
