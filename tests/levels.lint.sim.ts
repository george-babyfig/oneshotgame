import { it } from 'vitest';
import { POLICIES, runPlanet } from './sim/harness';

const percentage = (value: number) => `${Math.round(value * 100)}%`;

if (process.env.SIM === '1') {
  it('reports level balance outliers without blocking M1', () => {
    const runs = Number(process.env.LINT_RUNS ?? 24);
    const flags: string[] = [];
    for (let n = 1; n <= 60; n++) {
      const decent = runPlanet(n, POLICIES.decent, runs);
      const sharp = runPlanet(n, POLICIES.sharp, runs);
      if (decent.difficulty === 'normal' && decent.fail > 0.6) flags.push(`WALL ${n}: decent fail ${percentage(decent.fail)}`);
      if (n >= 11 && decent.threeStar > 0.9) flags.push(`EASY ${n}: decent 3★ ${percentage(decent.threeStar)}`);
      if (sharp.halfThreeStar > 0) flags.push(`TRIVIAL ${n}: sharp 3★ by half throws ${percentage(sharp.halfThreeStar)}`);
      if (decent.scoreMet > 0 && decent.goalMetWhenScoreMet / decent.scoreMet < 0.2)
        flags.push(`GOAL-TRAP ${n}: goal met on ${decent.goalMetWhenScoreMet}/${decent.scoreMet} score-reaching runs`);
    }
    console.log(`Level lint (Watch, ${runs} runs): ${flags.length} flags`);
    for (const flag of flags) console.log(`⚠ ${flag}`);
  });
}
