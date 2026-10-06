import { expect, it } from 'vitest';
import { simulate } from './sim/economy/career';

if (process.env.SIM === '1') {
  it('credits the Regular career through the shared Road API within six to eight weeks', async () => {
    const career = await simulate('Regular', process.env.ECONOMY_SEED ?? 'default');
    const finish = career.days.find((row) => row.roadPoints >= 200)?.day;
    expect(finish).toBeGreaterThanOrEqual(42);
    expect(finish).toBeLessThanOrEqual(56);
  }, 120_000);
}
