import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { celebrate } from '../src/ui/celebrate';
import { SPECIES } from '../src/core/world';
import { drawCreature, HAS_ART, type CreaturePose } from '../src/ui/art/critters';

function root() {
  const classes = new Set<string>();
  const el = new EventTarget() as HTMLElement;
  Object.assign(el, {
    dataset: {} as DOMStringMap,
    classList: {
      add: (name: string) => classes.add(name),
      toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
      contains: (name: string) => classes.has(name),
    },
  });
  return el;
}

describe('celebrate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('plays beats in order and finishes within two seconds', async () => {
    const played: number[] = [];
    const el = root();
    const show = celebrate('chest', {
      root: el,
      reduceMotion: false,
      duration: 9000,
      beats: [
        { at: 400, play: () => played.push(2) },
        { at: 100, play: () => played.push(1) },
      ],
    });
    vi.advanceTimersByTime(2000);
    await show.done;
    expect(played).toEqual([1, 2]);
    expect(el.classList.contains('celebrate-done')).toBe(true);
  });

  it('tap skipping shows every beat at once', async () => {
    const played: boolean[] = [];
    const el = root();
    const show = celebrate('results', {
      root: el,
      reduceMotion: false,
      beats: [{ at: 800, play: (instant) => played.push(instant) }],
    });
    el.dispatchEvent(new Event('pointerdown'));
    await show.done;
    vi.runAllTimers();
    expect(played).toEqual([true]);
  });

  it('reduce motion reveals contents without a moving sequence', async () => {
    const played: boolean[] = [];
    const show = celebrate('creature', {
      root: root(),
      reduceMotion: true,
      beats: [{ at: 900, play: (instant) => played.push(instant) }],
    });
    vi.advanceTimersByTime(220);
    await show.done;
    expect(played).toEqual([true]);
  });
});

it('draws every creature in each reaction pose', () => {
  const paint = new Proxy(
    {},
    {
      get: (_target, key) => (key === 'createRadialGradient' ? () => ({ addColorStop: () => {} }) : key === 'globalAlpha' ? 1 : () => {}),
      set: () => true,
    },
  ) as CanvasRenderingContext2D;
  expect(SPECIES).toHaveLength(36);
  for (const species of SPECIES) {
    expect(HAS_ART(species.id)).toBe(true);
    for (const pose of ['idle', 'happy', 'surprised', 'wave'] as CreaturePose[])
      expect(() => drawCreature(paint, species.id, 0, 0, 0, 40, 1.3, '', false, pose)).not.toThrow();
  }
});
