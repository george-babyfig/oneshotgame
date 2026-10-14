import { describe, expect, it } from 'vitest';
import { FESTIVALS, FESTIVAL_TIERS, claimFestival } from '../src/meta/festivals';
import { RESIDENT_ACCS, PRODUCTS } from '../src/meta/tuning';
import { defaultProfile } from '../src/meta/profile';
import { COSMETICS } from '../src/meta/cosmetics';

describe('decision 94 festival keepsakes', () => {
  it('uses a never-sold keepsake in every month while keeping the two existing gem singles', () => {
    expect(FESTIVALS).toHaveLength(12);
    for (const festival of FESTIVALS) {
      const accessory = RESIDENT_ACCS.find((item) => item.id === festival.acc)!;
      expect(accessory, festival.id).toBeDefined();
      expect(accessory.fest).toBe(true);
      expect(accessory.gems).toBeUndefined();
      expect(accessory.friend).toBeUndefined();
      expect(PRODUCTS.some((p) => p.cosmeticItemIds.includes(festival.acc))).toBe(false);
      expect(COSMETICS.some((look) => look.id === festival.acc && ['gems', 'dust', 'product'].includes(look.source))).toBe(false);
    }
    expect(FESTIVALS[0].acc).toBe('sparklefan');
    expect(FESTIVALS[5].acc).toBe('splashribbon');
    expect(RESIDENT_ACCS.filter((acc) => acc.gems).map((acc) => [acc.id, acc.gems])).toEqual([
      ['shades', 40],
      ['party', 40],
    ]);
  });

  for (const month of [0, 5]) {
    it(`${FESTIVALS[month].name} pays its keepsake once, keeps prior accessories and repeats without edition 2`, () => {
      const p = defaultProfile();
      p.level = 50;
      p.home.accs = ['party', 'shades'];
      const date = new Date(2027, month, 10, 12);
      const tierIndex = FESTIVAL_TIERS.findIndex((tier) => tier.acc);
      const tier = FESTIVAL_TIERS[tierIndex];
      p.festival = { key: `2027-${String(month + 1).padStart(2, '0')}`, spotted: tier.spot, claimed: [] };
      expect(claimFestival(p, tierIndex, date)).toEqual(tier.reward);
      const first = [...p.home.accs];
      expect(first).toEqual(['party', 'shades', FESTIVALS[month].acc]);
      expect(claimFestival(p, tierIndex, date)).toBeNull();
      expect(p.home.accs).toEqual(first);
      p.festival = { key: `2028-${String(month + 1).padStart(2, '0')}`, spotted: tier.spot, claimed: [] };
      claimFestival(p, tierIndex, new Date(2028, month, 10, 12));
      expect(p.home.accs).toEqual(first);
    });
  }
});
