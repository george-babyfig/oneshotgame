import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sceneGeometry } from '../src/core/flight';
import { logicalViewport, resize } from '../src/ui/fx';
import { isWide, LevelScene } from '../src/ui/game';

const phones = [
  [320, 568],
  [375, 667],
  [390, 844],
  [430, 932],
];
const tablets = [
  [820, 1180],
  [1024, 1366],
];
afterEach(() => vi.unstubAllGlobals());

function resized(width: number, height: number) {
  const properties = new Map<string, string>();
  const toggle = vi.fn();
  const scene = Object.assign(Object.create(LevelScene.prototype), {
    el: {
      parentElement: { clientWidth: width, clientHeight: height },
      classList: { toggle },
      style: { setProperty: (k: string, v: string) => properties.set(k, v), removeProperty: (k: string) => properties.delete(k) },
    },
    L: { n: 1, size: 1 },
    exitK: 0, // sceneGeometry getters read only the unchanged level and logical dimensions.
    canvas: { width: 0, height: 0 },
    g: { setTransform: vi.fn() },
    renderScore: vi.fn(),
  }) as LevelScene;
  vi.stubGlobal('window', { devicePixelRatio: 2 });
  resize(scene);
  return { scene, properties, toggle };
}

describe('M13 iPad logical round frame (A14)', () => {
  it.each(phones)('keeps %i×%i phone sceneGeometry inputs byte-identical', (width, height) => {
    expect(logicalViewport(width, height)).toEqual({ w: width, h: height });
    const { scene, properties, toggle } = resized(width, height);
    expect({ w: scene.w, h: scene.h }).toEqual({ w: width, h: height });
    const geometry = sceneGeometry(width, height, 1);
    expect(scene.cx).toBe(geometry.cx);
    expect(scene.cy).toBe(geometry.cy);
    expect(scene.R).toBe(geometry.R);
    expect(scene.launch).toEqual(geometry.launch);
    expect(properties.size).toBe(0);
    expect(toggle).toHaveBeenCalledWith('round-frame', false);
  });

  it.each(tablets)('caps %i×%i before any flight geometry sees it and scales the entire frame', (width, height) => {
    const { scene, properties, toggle } = resized(width, height);
    expect({ w: scene.w, h: scene.h }).toEqual({ w: 430, h: 932 });
    expect(scene.launch).toEqual(sceneGeometry(430, 932, 1).launch);
    expect(scene.canvas.width).toBe(860);
    expect(scene.canvas.height).toBe(1864);
    expect(properties.get('--round-width')).toBe('430px');
    expect(properties.get('--round-height')).toBe('932px');
    expect(Number(properties.get('--round-scale'))).toBe(Math.min(width / 430, height / 932));
    expect(toggle).toHaveBeenCalledWith('round-frame', true);
  });

  it('requires both dimensions to be at least 700 and handles window resizing', () => {
    for (const [w, h] of [...phones, [699, 1180], [820, 699]]) expect(isWide(w, h)).toBe(false);
    for (const [w, h] of [...tablets, [700, 700]]) expect(isWide(w, h)).toBe(true);
    const { scene, properties, toggle } = resized(820, 1180);
    Object.assign(scene.el.parentElement!, { clientWidth: 390, clientHeight: 844 });
    resize(scene);
    expect({ w: scene.w, h: scene.h }).toEqual({ w: 390, h: 844 });
    expect(properties.size).toBe(0);
    expect(toggle).toHaveBeenLastCalledWith('round-frame', false);
  });

  it('keeps the native device family iPhone-only', () => {
    const project = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
    const families = [...project.matchAll(/TARGETED_DEVICE_FAMILY\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(families.length).toBeGreaterThan(0);
    expect(families.every((value) => value === '1' || value === '"1"')).toBe(true);
  });
});
