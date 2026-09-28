import { expect, it } from 'vitest';
import { POLICIES, runPlanet } from './harness';

if (process.env.SIM === '1') {
  it('checks the planet 24 layout substitution', () => {
    const original = runPlanet(24, POLICIES.decent, 400, 0);
    const revised = runPlanet(24, POLICIES.decent, 400);
    console.log(
      `Planet 24 decent bot (400 runs): original fail ${Math.round(original.fail * 100)}%, 3★ ${Math.round(original.threeStar * 100)}%; salt 48 fail ${Math.round(revised.fail * 100)}%, 3★ ${Math.round(revised.threeStar * 100)}%`,
    );
    expect(revised.fail).toBeLessThanOrEqual(0.35);
  });
}
