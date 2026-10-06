import { describe, expect, it } from 'vitest';
import { newPlanet } from '../src/core/world';
import { modifiersFor } from '../src/core/modifiers';
import { roundState, rulesForLevel, stepRound } from '../src/core/round';
import {
  buddyChipAvailable,
  buddyEligible,
  buddyShieldFor,
  currentBuddy,
  nextPlanetBuddy,
  planetBuddyFor,
  setBuddy,
  suggestedBuddy,
} from '../src/meta/buddy';
import { defaultProfile } from '../src/meta/profile';
import { syncPlanetBuddy } from '../src/ui/flows/prelevel';
import { forecastTroubles } from '../src/core/troubles';
import type { LevelScene } from '../src/ui/game';
import type { TraitId } from '../src/core/world';
import { protectedWallSectors } from '../src/ui/art/troubles';
import { recordHomeworldWin } from '../src/meta/homeworld';

function resident(species: string) {
  return { species, fp: 0, lastReq: 0, rewarded: 0 };
}

describe('Buddy help', () => {
  it('grows friendship once per eligible win with the selected resident Buddy', () => {
    const p = defaultProfile();
    p.level = 18;
    p.home.residents.push(resident('otter'), resident('newt'));
    setBuddy(p, 'otter');
    const win = { mode: 'campaign' as const, planetKey: 'campaign:18', buddySpecies: 'otter', at: Date.now() };
    recordHomeworldWin(p, win);
    recordHomeworldWin(p, win);
    expect(p.home.residents.map((r) => r.fp)).toEqual([1, 0]);
    recordHomeworldWin(p, { ...win, mode: 'voyage' });
    recordHomeworldWin(p, { ...win, mode: 'zen' });
    expect(p.home.residents[0].fp).toBe(3);
    recordHomeworldWin(p, { ...win, mode: 'daily' });
    recordHomeworldWin(p, { ...win, buddySpecies: null });
    expect(p.home.residents.map((r) => r.fp)).toEqual([3, 0]);
  });
  it('switches the active shield, refreshes the forecast and clears the landing preview', () => {
    const planet = newPlanet((sector) => (sector === 1 ? { life: 2 } : {}));
    const state = roundState(planet, true, [{ id: 'vent', source: 0 }]);
    state.troubles[0].nextIn = 1;
    const shown: (string | undefined)[] = [];
    const opts = { buddy: null as { species: string; acc: string } | null, buddyShield: null as TraitId | null };
    const scene = {
      o: opts,
      predictCache: { key: 'stale' },
      renderHud() {
        shown.push(forecastTroubles(state, modifiersFor('campaign', { buddyShield: opts.buddyShield })).at(0)?.blockedBy);
      },
    } as unknown as LevelScene;
    syncPlanetBuddy(scene, 'newt', '', 'fireproof');
    expect(shown).toEqual(['fireproof']);
    expect(scene.predictCache).toBeNull();
    expect(
      protectedWallSectors(planet, 'vent', forecastTroubles(state, modifiersFor('campaign', { buddyShield: opts.buddyShield }))),
    ).toContain(1);
    syncPlanetBuddy(scene, 'otter', '', 'weedproof');
    expect(shown).toEqual(['fireproof', undefined]);
    expect(
      protectedWallSectors(planet, 'vent', forecastTroubles(state, modifiersFor('campaign', { buddyShield: opts.buddyShield }))),
    ).not.toContain(1);
    expect(scene.o.buddy?.species).toBe('otter');
  });
  it('chooses only friends living on the Homeworld from planet 18', () => {
    const p = defaultProfile();
    p.home.residents.push(resident('otter'), resident('newt'));
    expect(buddyEligible(p)).toEqual([]);
    p.level = 18;
    expect(buddyEligible(p)).toEqual(['otter', 'newt']);
    expect(setBuddy(p, 'bunny')).toBe(false);
    expect(setBuddy(p, 'otter')).toBe(true);
    expect(currentBuddy(p)?.species).toBe('otter');
    p.home.residents.shift();
    expect(currentBuddy(p)?.species).toBe('newt');
    expect(buddyShieldFor(p, 'campaign', 18)).toBe('fireproof');
    p.home.residents.shift();
    expect(currentBuddy(p)).toBeNull();
    expect(buddyShieldFor(p, 'campaign', 18)).toBeNull();
  });

  it('suggests a resident whose trait counters the forecast Trouble', () => {
    const p = defaultProfile();
    p.level = 40;
    p.home.residents.push(resident('otter'), resident('newt'), resident('eagle'));
    setBuddy(p, 'otter');
    expect(suggestedBuddy(p, [{ id: 'vent' }])).toBe('newt');
    expect(planetBuddyFor(p, [{ id: 'vent' }])).toBe('otter');
    expect(p.buddy.species).toBe('otter');
    expect(nextPlanetBuddy('otter', buddyEligible(p))).toBe('newt');
    expect(p.buddy.species).toBe('otter');
    expect(buddyChipAvailable(p, 40, [], false)).toBe(false);
    expect(buddyChipAvailable(p, 40, [{ id: 'vent' }], true)).toBe(false);
    expect(buddyChipAvailable(p, 40, [{ id: 'vent' }], false)).toBe(true);
    expect(suggestedBuddy(p, [{ id: 'vine' }])).toBe('otter');
    expect(suggestedBuddy(p, [{ id: 'frost' }])).toBe('eagle');
    expect(suggestedBuddy(p, [])).toBe('otter');
  });

  it('turns the shield off in score modes and Remix', () => {
    const p = defaultProfile();
    p.level = 40;
    p.home.residents.push(resident('newt'));
    setBuddy(p, 'newt');
    expect(buddyShieldFor(p, 'campaign', 17)).toBeNull();
    for (const mode of ['campaign', 'voyage', 'zen'] as const) {
      expect(buddyShieldFor(p, mode, 18)).toBe('fireproof');
      expect(modifiersFor(mode, { buddyShield: buddyShieldFor(p, mode, 18) }).buddyShield).toBe('fireproof');
    }
    for (const mode of ['daily', 'rush', 'challenge', 'remix'] as const) {
      expect(buddyShieldFor(p, mode, 40)).toBeNull();
      expect(modifiersFor(mode, { buddyShield: 'fireproof' }).buddyShield).toBeNull();
    }
  });

  it('skips only the first matching Trouble action in a planet', () => {
    const planet = newPlanet((sector) => (sector === 1 ? { life: 2 } : {}));
    let state = roundState(planet, true, [{ id: 'vent', source: 0 }]);
    const mods = modifiersFor('campaign', { buddyShield: 'fireproof' });
    const rules = rulesForLevel(18);
    const events = [];
    for (let throwNumber = 0; throwNumber < 6; throwNumber++) {
      const result = stepRound(state, { kind: 'rock', sector: 12 }, mods, rules);
      state = result.state;
      events.push(...result.troubleEvents);
    }
    expect(events.filter((event) => event.kind === 'blocked' && event.by === 'fireproof')).toHaveLength(1);
    expect(events.some((event) => event.kind === 'act')).toBe(true);
    expect(state.buddyShieldUsed).toBe(true);
  });
});
