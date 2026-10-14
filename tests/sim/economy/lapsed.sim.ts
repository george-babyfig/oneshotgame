import { defaultProfile } from '../../../src/meta/profile';
import { tickHome } from '../../../src/meta/homeworld';
import { startTrip } from '../../../src/meta/trips';
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

if (process.env.SIM === '1')
  it('a seven-day absence returns one trip once without accumulating more trips', () => {
    const p = defaultProfile(0);
    p.level = 30;
    p.home.plots[0] = { type: 'launch_bay', lv: 4, since: 0 };
    p.home.residents.push({ species: 'penguin', fp: 0, rewarded: 1 });
    p.galaxy.push({ n: 25, name: 'Snow', hue: 0, stars: 1, life: 0, species: [], colors: [], sec: 'c100-'.repeat(24) });
    expect(startTrip(p, 25, 8, undefined, 0)).toBe('ok');
    const promised = structuredClone(p.home.expedition!.yield!);
    const gems = p.gems;
    const week = 7 * 86_400_000;
    tickHome(p, week);
    expect(p.home.tripReturn!.yield).toEqual(promised);
    expect(p.gems - gems).toBe(promised.gems + 10); // Friendship level 2, paid once.
    expect(p.home.residents[0].fp).toBe(promised.fp);
    expect(p.home.expedition).toBeNull();
    expect(startTrip(p, 25, 8, undefined, week)).toBe('needs_win');
    const after = JSON.stringify(p);
    tickHome(p, week);
    expect(JSON.stringify(p)).toBe(after);
    expect(p.home.seen.celebrations.filter((id) => id.startsWith('trip:'))).toHaveLength(1);
  });
