import { ROAD_CATALOG } from '../src/meta/starroad';
import { ROAD01 } from '../src/meta/content/road01';
import { expect, it } from 'vitest';
import { simulate } from './sim/economy/career';

if (process.env.SIM === '1') {
  it('credits the Regular career through the shared Road API within six to eight weeks', async () => {
    const career = await simulate('Regular', process.env.ECONOMY_SEED ?? 'default');
    const finish = career.days.find((row) => row.roadPoints >= 200)?.day;
    expect(finish).toBeGreaterThanOrEqual(42);
    expect(finish).toBeLessThanOrEqual(56);
  }, 120_000);
  it('M14 credits a new install to Road 1 with Road 0 at zero', async () => {
    const opensOn = '2026-02-26';
    const career = await simulate('Regular', process.env.ECONOMY_SEED ?? 'default', {
      roadCatalog: [ROAD_CATALOG[0], { ...ROAD01.road, opensOn }],
      startDay: opensOn,
      days: 56,
    });
    const finish = career.days.find((row) => (row.roadRecords.road01 ?? 0) >= 200)?.day;
    expect(finish).toBeGreaterThanOrEqual(42);
    expect(finish).toBeLessThanOrEqual(56);
    expect(career.days.slice(0, finish! - 1).every((row) => (row.roadRecords.road00 ?? 0) === 0)).toBe(true);
  }, 120_000);
}
