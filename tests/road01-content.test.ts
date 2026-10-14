import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ROAD01, ROAD01_ATMOSPHERE, ROAD01_GEM_SINGLE_TOTAL } from '../src/meta/content/road01';
import { themed } from '../src/meta/cosmetics';
import { PRODUCTS } from '../src/meta/tuning';
import { allStrings } from './helpers/locales';

const free = ROAD01.road.tiers.map((tier) => tier.reward);
const paid = ROAD01.road.tiers.map((tier) => tier.pass);
const ids = (rewards: typeof free) => rewards.flatMap((r) => [r.skin, r.item].filter((id): id is string => !!id));
const theme = themed(ROAD01.theme);
const looks = [...ROAD01.looks, ...ROAD01.singles, ...ROAD01.stardust, ...ROAD01.samplers, ...theme];

describe('B6 Road 1 frozen content', () => {
  it('defines twenty stable steps of ten points without inventing a launch date', () => {
    expect(ROAD01.road.id).toBe('road01');
    expect(ROAD01.road.addedIn).toBe('1.2');
    expect(ROAD01.road.tiers.map((tier, i) => [tier.id, tier.stars])).toEqual(
      Array.from({ length: 20 }, (_, i) => [`road01:tier${String(i).padStart(2, '0')}`, (i + 1) * 10]),
    );
    expect(ROAD01.road.name.length).toBeLessThanOrEqual(14);
    const source = readFileSync('src/meta/content/road01.ts', 'utf8');
    expect(source).not.toMatch(/^import (?!type).*from ['"]\.\.\/cosmetics/m);
  });

  it('preserves Road 0 free supply with seven looks, a decoration, paint and launcher', () => {
    expect(free.reduce((n, r) => n + (r.gems ?? 0), 0)).toBe(150);
    expect(free.reduce((n, r) => n + (r.dust ?? 0), 0)).toBe(12850);
    expect(free.reduce((n, r) => n + Object.values(r.boosters ?? {}).reduce((a, b) => a + b, 0), 0)).toBeLessThanOrEqual(17);
    expect(ids(free)).toHaveLength(7);
    const earned = ids(free).map((id) => looks.find((look) => look.id === id)!);
    expect(earned.every((look) => look.source === 'road')).toBe(true);
    expect(earned.map((look) => look.slot)).toEqual(expect.arrayContaining(['ground', 'launcher', 'decoration:flowers']));
    expect(earned.some((look) => look.slot === 'title')).toBe(false);
    expect(free[19]).toEqual({ dust: 1000, sticker: 'road01' });
  });

  it('has the twelve looks-only Pass slots and a separately revocable atmosphere', () => {
    expect(ids(paid)).toHaveLength(12);
    expect(new Set(ids(paid)).size).toBe(12);
    expect(ROAD01_ATMOSPHERE).toMatchObject({ id: 'moonpetal', gems: 0, road: true, pass: true });
    const passLooks = ids(paid)
      .filter((id) => id !== ROAD01_ATMOSPHERE.id)
      .map((id) => looks.find((look) => look.id === id)!);
    expect(passLooks.every((look) => look.source === 'pass')).toBe(true);
    expect(passLooks.map((look) => look.slot).sort()).toEqual(
      [
        'launcher',
        'ground',
        'sea',
        'hat',
        'banner',
        'decoration:lantern',
        'trail',
        'suit',
        'friendOutfit',
        'friendOutfit',
        'burst:seed',
      ].sort(),
    );
    for (const reward of paid) expect(Object.keys(reward).every((key) => ['skin', 'item'].includes(key))).toBe(true);
  });

  it('has one 16-look Theme, a free Wish sampler and one paired Style Single', () => {
    expect(theme).toHaveLength(16);
    expect(theme.filter((look) => look.slot.startsWith('labSkin:'))).toHaveLength(6);
    expect(theme.filter((look) => look.slot.startsWith('decoration:'))).toHaveLength(3);
    expect(theme.filter((look) => look.slot === 'friendOutfit')).toHaveLength(2);
    expect(ROAD01.samplers).toHaveLength(1);
    expect(ROAD01.samplers[0].source).toBe('wish');
    const single = ROAD01.products.find((product) => product.kind === 'style_single')!;
    expect(single.cosmeticItemIds.map((id) => looks.find((look) => look.id === id)?.slot)).toEqual(['supernova', 'trail']);
    for (const product of ROAD01.products) expect(product.cosmeticItemIds).not.toContain(ROAD01.samplers[0].id);
    expect(ROAD01.stardust.map((look) => look.dust)).toEqual([5000, 12000, 25000, 50000]);
  });

  it('holds the gem supply pin once and distributes it without exceeding 300 per item', () => {
    expect(Number.isInteger(ROAD01_GEM_SINGLE_TOTAL / 10)).toBe(true);
    expect(ROAD01.singles.reduce((n, look) => n + look.gems!, 0)).toBe(ROAD01_GEM_SINGLE_TOTAL);
    for (const look of ROAD01.singles) {
      expect(look.source).toBe('gems');
      expect(look.gems).toBeGreaterThanOrEqual(60);
      expect(look.gems).toBeLessThanOrEqual(300);
    }
    expect(ROAD01_GEM_SINGLE_TOTAL).toBeGreaterThanOrEqual(3000);
  });

  it('installs exactly the three frozen cosmetic products with no power or currency', () => {
    expect(ROAD01.products.map((p) => [p.kind, p.fallbackPrice])).toEqual([
      ['road_pass', '$3.99'],
      ['theme', '$2.99'],
      ['style_single', '$1.99'],
    ]);
    for (const product of ROAD01.products) {
      expect(PRODUCTS.find((row) => row.id === product.id)).toEqual(product);
      expect(product).toMatchObject({ familySharing: true, consumable: false, gems: 0 });
      expect(product.cosmeticItemIds.every((id) => id === ROAD01_ATMOSPHERE.id || looks.some((look) => look.id === id))).toBe(true);
    }
    expect(new Set(looks.map((look) => look.id)).size).toBe(looks.length);
  });

  it('has English values for every content key in all fragment dictionaries without shadowing main translations', () => {
    const needed = [
      ROAD01.road.name,
      'Moonpetal Road sticker',
      ROAD01_ATMOSPHERE.name,
      ROAD01.theme.name,
      ...looks.map((look) => look.name),
      ...ROAD01.products.flatMap((p) => [p.title, p.description, ...p.contents]),
    ];
    for (const lang of ['en', 'es', 'fr', 'de', 'pt', 'ja']) {
      const dict = allStrings(lang);
      for (const key of needed) expect(dict[key], `${lang}: ${key}`).toBeDefined();
    }
    const fragment = JSON.parse(readFileSync('src/locales/content/road01.json', 'utf8'));
    const main = JSON.parse(readFileSync('src/locales/_keys.json', 'utf8')) as string[];
    expect(Object.keys(fragment.en).filter((key) => main.includes(key))).toEqual([]);
  });
});
