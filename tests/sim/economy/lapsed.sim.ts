import { expect, it } from 'vitest';
import { landmarkSummary, simulate } from './career';

if (process.env.SIM === '1')
  it('runs the Lapsed 90-day career', async () => {
    const career = await simulate('Lapsed');
    console.log(
      `Lapsed: Lab ${career.exhausted.lab ?? 'unreached'}, level ${career.days.at(-1)?.level}, free gems/day ${career.freeGemsPerActiveDay.toFixed(1)}`,
    );
    console.log(`Lapsed Landmarks: ${landmarkSummary(career)}; colour stranding ${career.colourStrandingDays.length} days`);
    expect(career.days).toHaveLength(90);
  }, 1_200_000);
