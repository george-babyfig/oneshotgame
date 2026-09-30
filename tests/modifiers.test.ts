import { describe, expect, it } from 'vitest';
import { NO_MODIFIERS, modifiersFor } from '../src/core/modifiers';

describe('round modifiers', () => {
  const bonuses = {
    extraThrows: 2,
    splash: 1,
    scopeLevel: 3,
    lab: { rock: 5 },
    boosters: { shower: true, spark: true, scope: true },
    momentum: 3,
    buddy: { species: 'bunny', acc: 'bow' },
    shower: true,
    gentle: false,
    buddyShield: null,
  };

  it.each(['campaign', 'voyage', 'zen'] as const)('%s receives player bonuses', (mode) => {
    expect(modifiersFor(mode, bonuses)).toEqual(bonuses);
  });

  it.each(['daily', 'rush', 'challenge', 'remix'] as const)('%s uses the base loadout', (mode) => {
    expect(modifiersFor(mode, bonuses)).toEqual(NO_MODIFIERS);
  });

  it("keeps the parent's Gentle setting in every mode", () => {
    expect(modifiersFor('campaign', { gentle: true }).gentle).toBe(true);
    expect(modifiersFor('voyage', { gentle: true }).gentle).toBe(true);
    expect(modifiersFor('zen', { gentle: true }).gentle).toBe(true);
    for (const mode of ['daily', 'rush', 'challenge'] as const) expect(modifiersFor(mode, { gentle: true }).gentle).toBe(true);
    expect(modifiersFor('remix', { gentle: true }).gentle).toBe(true);
  });

  it('returns independent nested objects', () => {
    const first = modifiersFor('campaign', bonuses);
    first.lab.rock = 1;
    first.boosters.shower = false;
    expect(bonuses.lab.rock).toBe(5);
    expect(bonuses.boosters.shower).toBe(true);
  });
});
