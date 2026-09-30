import { it } from 'vitest';
import { POLICIES, runPlanet } from './sim/harness';
import { budgetFor, makeLevel, pressureOf, skyWall } from '../src/core/levels';
import { OBSTACLES } from '../src/core/sky';

const percentage = (value: number) => `${Math.round(value * 100)}%`;

if (process.env.SIM === '1') {
  it('reports level balance outliers without blocking M1', () => {
    const runs = Number(process.env.LINT_RUNS ?? 24);
    const flags: string[] = [];
    const structural: string[] = [];
    for (let n = 1; n <= 120; n++) {
      const level = makeLevel(n);
      if (pressureOf(level) > budgetFor(level)) structural.push(`STACK ${n}: pressure ${pressureOf(level)} > ${budgetFor(level)}`);
      if (skyWall(level)) structural.push(`SKYWALL ${n}`);
      if (level.sky.obstacle && n > OBSTACLES[level.sky.obstacle].debut && n < OBSTACLES[level.sky.obstacle].debut + 2)
        structural.push(`STACK ${n}: obstacle reappears too soon after its lesson`);
    }
    console.log(`Structural lint: ${structural.length} STACK/SKYWALL flags on planets 1-120`);
    for (const flag of structural) console.log(`⚠ ${flag}`);
    if (structural.length) throw new Error(`Structural lint found ${structural.length} STACK/SKYWALL flags`);
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
