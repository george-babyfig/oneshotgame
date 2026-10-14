import { describe, expect, it } from 'vitest';
import { aimStepsWithBounce, visibleAimSteps } from '../src/ui/preview';
import type { FlightResult } from '../src/core/flight';

describe('visible launcher aim', () => {
  it('honours each purchased Aim Guide level for the Sling and offsets other launchers', () => {
    expect([0, 1, 2, 3].map((level) => visibleAimSteps('sling', 1, level))).toEqual([16, 28, 44, 90]);
    for (const id of ['swoop', 'sparkler', 'zip', 'skipper'] as const)
      expect(
        [0, 1, 2, 3].map((level) => visibleAimSteps(id, 1, level)),
        id,
      ).toEqual([16, 28, 44, 90]);
    expect([0, 1, 2, 3].map((level) => visibleAimSteps('thumper', 1, level))).toEqual([12, 16, 32, 90]);
    expect([0, 1, 2, 3].map((level) => visibleAimSteps('thumper', 4, level))).toEqual([12, 23, 39, 90]);
    expect([0, 1, 2, 3].map((level) => visibleAimSteps('pinpoint', 1, level))).toEqual([78, 90, 106, 90]);
    expect(visibleAimSteps('zip', 1, 0, true)).toBe(90);
  });

  it('extends a Skipper line through a late rebound and eight dots beyond it', () => {
    const path = { bounces: [{ x: 0, y: 0, elapsed: 1.2, special: true }] } as FlightResult;
    expect(aimStepsWithBounce(28, path, true)).toBe(44);
    expect(aimStepsWithBounce(28, path, false)).toBe(28);
  });
});
