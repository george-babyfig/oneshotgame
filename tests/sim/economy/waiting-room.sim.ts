import { expect, it } from 'vitest';
import { simulate } from './career';

if (process.env.SIM === '1')
  it('runs the Waiting-room 90-day career', async () => {
    const career = await simulate('Waiting-room');
    console.log(
      `Waiting-room: Lab ${career.exhausted.lab ?? 'unreached'}, level ${career.days.at(-1)?.level}, free gems/day ${career.freeGemsPerActiveDay.toFixed(1)}`,
    );
    expect(career.days).toHaveLength(90);
  }, 1_200_000);
