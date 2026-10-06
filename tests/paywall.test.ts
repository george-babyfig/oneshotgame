import { expect, it } from 'vitest';
import { lifeScore } from '../src/core/world';
import { makeLevel, solveWith, starsEarned } from '../src/core/levels';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { rulesForLevel } from '../src/core/round';
import { launcherBay } from '../src/meta/launchbay';
import { PRODUCTS } from '../src/meta/tuning';
import { defaultProfile } from '../src/meta/profile';
import { grantProduct } from '../src/meta/economy';
import { drones } from '../src/meta/homeworld';

it('all 120 planets can earn three stars with the untuned Sling and no purchases, boosters or continues', () => {
  const p = defaultProfile();
  expect(launcherBay.owned(p)).toEqual(['sling']);
  expect(NO_MODIFIERS.launcher).toEqual({ id: 'sling', tune: 1 });
  expect(NO_MODIFIERS.boosters).toEqual({ shower: false, spark: false, scope: false });
  for (let n = 1; n <= 120; n++) {
    const level = makeLevel(n);
    // Generator targets and the goal-aware solver both use this no-help loadout.
    const solved = solveWith(level, rulesForLevel(n), NO_MODIFIERS);
    expect(starsEarned(solved, lifeScore(solved), level), `planet ${n}`).toBe(3);
  }
});

it('no product grants a launcher, tune, tune material, or level-rule advantage', () => {
  const before = JSON.stringify(makeLevel(30));
  for (const product of PRODUCTS) {
    const p = defaultProfile();
    grantProduct(p, product.id, `paywall-${product.key}`);
    expect(launcherBay.owned(p), product.key).toEqual(['sling']);
    expect(p.launcher.selected, product.key).toBe('sling');
    expect(p.launcher.tunes, product.key).toEqual({});
    expect(p.launcher.flings, product.key).toEqual({});
    expect(p.mats, product.key).toEqual({});
    expect(p.dust, product.key).toBe(defaultProfile().dust);
    expect(drones(p)).toBe(2);
    expect(JSON.stringify(makeLevel(30))).toBe(before);
  }
});

it('older Pass owners keep their third drone', () => {
  const p = defaultProfile();
  p.pass = true;
  expect(drones(p)).toBe(3);
});
