import { expect, it } from 'vitest';
import { goalProgress, goalsMet, makeLevel, solve2, solveForGoals, solveWith } from '../src/core/levels';
import { maxLabModifiers, NO_MODIFIERS } from '../src/core/modifiers';
import { rulesForLevel } from '../src/core/round';
import { KINDS, type Kind } from '../src/core/world';

it('G9 goal-aware max Labs reach every campaign goal through planet 120', () => {
  const max = maxLabModifiers();
  const formsOff = { ...NO_MODIFIERS, ...max, forms: {} };
  const formsOn = {
    ...formsOff,
    forms: Object.fromEntries((Object.keys(KINDS) as Kind[]).map((kind) => [kind, true])),
  };
  const missed = (n: number, planet: ReturnType<typeof solveWith>) => {
    const level = makeLevel(n);
    return level.goals
      .filter((goal) => goalProgress(planet, goal) < goal.count)
      .map((goal) => `${goal.id} ${goalProgress(planet, goal)}/${goal.count}`)
      .join('+');
  };
  const baseGreedy: string[] = [];
  const labGreedy: string[] = [];
  const formsGreedy: string[] = [];
  const labReachability: string[] = [];
  const formsReachability: string[] = [];
  for (let n = 1; n <= 120; n++) {
    const level = makeLevel(n);
    const rules = rulesForLevel(n);
    const base = solve2(level, rules);
    const lab = solveWith(level, rules, formsOff);
    const formed = solveWith(level, rules, formsOn);
    if (!goalsMet(base, level.goals)) baseGreedy.push(`${n}:${missed(n, base)}`);
    if (!goalsMet(lab, level.goals)) labGreedy.push(`${n}:${missed(n, lab)}`);
    if (!goalsMet(formed, level.goals)) formsGreedy.push(`${n}:${missed(n, formed)}`);
    const searched = solveForGoals(level, rules, formsOff);
    const searchedForms = solveForGoals(level, rules, formsOn);
    if (!goalsMet(searched, level.goals)) labReachability.push(`${n}:${missed(n, searched)}`);
    if (!goalsMet(searchedForms, level.goals)) formsReachability.push(`${n}:${missed(n, searchedForms)}`);
  }
  console.log(`G9 goal-aware all Labs L5, forms OFF: ${120 - labReachability.length}/120; misses ${labReachability.join(', ') || 'none'}`);
  console.log(
    `Watch goal-aware all Labs L5, forms ON: ${120 - formsReachability.length}/120; misses ${formsReachability.join(', ') || 'none'}`,
  );
  console.log(`Plain greedy no Labs goal misses: ${baseGreedy.join(', ') || 'none'}`);
  console.log(`Watch plain greedy all Labs L5, forms OFF goal misses: ${labGreedy.join(', ') || 'none'}`);
  console.log(`Watch plain greedy all Labs L5, forms ON goal misses: ${formsGreedy.join(', ') || 'none'}`);
  expect(baseGreedy, 'no-Labs plain greedy goal misses').toEqual([]);
  expect(labReachability, 'G9 max-Lab forms-off unreachable goals').toEqual([]);
}, 180_000);
