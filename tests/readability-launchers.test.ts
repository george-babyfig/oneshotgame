import { expect, it } from 'vitest';
import { LAUNCH_ROSTER, LAUNCHERS } from '../src/core/launchers';
import { COSMETICS, COSMETIC_BY_ID } from '../src/meta/cosmetics';
import { drawGameplayLauncher } from '../src/ui/art/launchers';

it('keeps look IDs and ownership while using look-only display names', () => {
  const names: Record<string, string> = {
    l_pad: 'Classic',
    l_twig: 'Twig',
    l_petal: 'Petal',
    l_bloom: 'Blossom',
    l_moonbeam: 'Moonbeam',
    l_cannon: 'Comet Rail',
  };
  for (const [id, name] of Object.entries(names)) expect(COSMETIC_BY_ID[id].name).toBe(name);
  expect(COSMETIC_BY_ID.l_orbit.name).toBe('Golden Orbit');
  expect(COSMETIC_BY_ID.l_orbit.source).toBe('pass');
  expect(COSMETIC_BY_ID.l_cannon.source).toBe('gems');
  expect(COSMETIC_BY_ID.l_pad.source).toBe('free');
});

it('draws every gameplay emblem and identity band above every cosmetic look', () => {
  const looks = COSMETICS.filter((item) => item.slot === 'launcher');
  for (const id of LAUNCH_ROSTER)
    for (const look of looks) {
      const calls: { method: string; args: unknown[]; fill: string; stroke: string }[] = [];
      const state = { fillStyle: '', strokeStyle: '' };
      const ctx = new Proxy(state, {
        get(target, prop) {
          if (prop in target) return target[prop as keyof typeof target];
          if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
          return (...args: unknown[]) => {
            calls.push({ method: String(prop), args, fill: target.fillStyle, stroke: target.strokeStyle });
          };
        },
        set(target, prop, value) {
          Reflect.set(target, prop, value);
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
      drawGameplayLauncher(ctx, id, look.id, 100, 100, 0, { x: 0, y: 0 }, '#fff', false);
      const emblem = [...calls].reverse().find((call) => call.method === 'fillText' && call.args[0] === LAUNCHERS[id].emblem);
      expect(emblem, `${id}/${look.id} emblem`).toBeDefined();
      expect(emblem?.fill, `${id}/${look.id} emblem contrast`).toBe('#fff');
      expect(emblem?.args.slice(1, 3), `${id}/${look.id} emblem beside held object`).toEqual([151, 149]);
      // The badge stays beyond the held object for every aiming direction.
      for (const px of [-50, -25, 0, 25, 50])
        for (const py of [-50, 0, 50]) {
          calls.length = 0;
          drawGameplayLauncher(ctx, id, look.id, 100, 100, 0, { x: px, y: py }, '#fff', false);
          const badge = [...calls].reverse().find((call) => call.method === 'fillText' && call.args[0] === LAUNCHERS[id].emblem);
          expect(
            Math.hypot(Number(badge?.args[1]) - (100 + px), Number(badge?.args[2]) - (100 + py)),
            `${id}/${look.id} clear at ${px},${py}`,
          ).toBeGreaterThan(31);
        }
      expect([...calls].reverse().find((call) => call.method === 'stroke')?.stroke, `${id}/${look.id} band`).toBe(LAUNCHERS[id].bandColor);
    }
});
