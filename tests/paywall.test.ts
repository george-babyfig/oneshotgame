import { expect, it } from 'vitest';
import { lifeScore } from '../src/core/world';
import { makeLevel, solve2, starsEarned } from '../src/core/levels';
import { PRODUCTS } from '../src/meta/tuning';
import { defaultProfile } from '../src/meta/profile';
import { grantProduct } from '../src/meta/economy';
import { drones } from '../src/meta/homeworld';

it('all 120 planets can earn three stars with base rules and no purchases', () => {
  for (let n = 1; n <= 120; n++) {
    const level = makeLevel(n);
    const solved = solve2(level);
    expect(starsEarned(solved, lifeScore(solved), level), `planet ${n}`).toBe(3);
  }
});

it('products do not change level rules or add a drone', () => {
  const before = JSON.stringify(makeLevel(30));
  for (const product of PRODUCTS.filter((item) => !item.consumable)) {
    const p = defaultProfile();
    grantProduct(p, product.id, `paywall-${product.key}`);
    expect(drones(p)).toBe(2);
    expect(JSON.stringify(makeLevel(30))).toBe(before);
  }
});

it('older Pass owners keep their third drone', () => {
  const p = defaultProfile();
  p.pass = true;
  expect(drones(p)).toBe(3);
});
