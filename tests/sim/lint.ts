import { budgetFor, makeLevel, pressureOf, skyWall } from '../../src/core/levels';
import type { PlanetMetrics } from './harness';

export type LintFlag =
  'WALL' | 'CLIFF' | 'GOAL-TRAP' | 'STACK' | 'BONK-HEAVY' | 'EASY' | 'TRIVIAL' | 'EASY-EARLY' | 'FLAT' | 'SLACK' | 'GOAL-RAMP' | 'TEACH';
export interface LintIssue {
  flag: LintFlag;
  planet: number;
  detail: string;
  fix: string;
}

export const CHAPTER_BANDS = [
  {
    first: 1,
    last: 3,
    casualFail: [0, 0],
    casualThree: [0.25, 0.45],
    decentFail: [0, 0],
    decentThree: [0.55, 0.75],
    sharpFail: [0, 0],
    sharpThree: [0.8, 0.95],
    casualP90: 1,
  },
  {
    first: 4,
    last: 10,
    casualFail: [0.05, 0.12],
    casualThree: [0.2, 0.35],
    decentFail: [0.02, 0.08],
    decentThree: [0.4, 0.55],
    sharpFail: [0, 0.04],
    sharpThree: [0.6, 0.75],
    casualP90: 2,
  },
  {
    first: 11,
    last: 20,
    casualFail: [0.1, 0.2],
    casualThree: [0.18, 0.3],
    decentFail: [0.05, 0.12],
    decentThree: [0.4, 0.55],
    sharpFail: [0, 0.05],
    sharpThree: [0.62, 0.78],
    casualP90: 3,
  },
  {
    first: 21,
    last: 30,
    casualFail: [0.14, 0.22],
    casualThree: [0.15, 0.28],
    decentFail: [0.07, 0.15],
    decentThree: [0.4, 0.55],
    sharpFail: [0, 0.06],
    sharpThree: [0.62, 0.8],
    casualP90: 3,
  },
  {
    first: 31,
    last: 60,
    casualFail: [0.16, 0.25],
    casualThree: [0.15, 0.28],
    decentFail: [0.05, 0.18],
    decentThree: [0.4, 0.55],
    sharpFail: [0.02, 0.08],
    sharpThree: [0.65, 0.8],
    casualP90: 4,
  },
  {
    first: 61,
    last: 120,
    casualFail: [0.16, 0.25],
    casualThree: [0.15, 0.28],
    decentFail: [0.08, 0.18],
    decentThree: [0.4, 0.55],
    sharpFail: [0.02, 0.08],
    sharpThree: [0.65, 0.8],
    casualP90: 4,
  },
] as const;

const pct = (value: number) => `${Math.round(value * 100)}%`;
const mean = (rows: PlanetMetrics[]) => rows.reduce((sum, row) => sum + row.fail, 0) / Math.max(1, rows.length);

export function lintCampaign(casual: PlanetMetrics[], decent: PlanetMetrics[], sharp: PlanetMetrics[], last = 120): LintIssue[] {
  const issues: LintIssue[] = [];
  const by = (rows: PlanetMetrics[]) => new Map(rows.map((row) => [row.n, row]));
  const c = by(casual),
    d = by(decent),
    s = by(sharp);
  const add = (flag: LintFlag, planet: number, detail: string, fix: string) => issues.push({ flag, planet, detail, fix });
  for (const [first, end, target] of [
    [7, 10, 0.3],
    [11, 20, 0.45],
    [21, 30, 0.6],
    [31, 40, 0.6],
    [41, 50, 0.6],
    [51, 60, 0.6],
  ] as const) {
    if (end > last) continue;
    const normal = Array.from({ length: end - first + 1 }, (_, i) => makeLevel(first + i)).filter((level) => level.difficulty === 'normal');
    const share = normal.filter((level) => level.goals.length > 0).length / normal.length;
    if (Math.abs(share - target) > 0.15 + 1e-9)
      add(
        'GOAL-RAMP',
        first,
        `Normal ${first}-${end} goal share ${pct(share)} (target ${pct(target)} ±15 points)`,
        'Choose a goal-bearing salt with a buildable recipe.',
      );
  }
  const lessons: [number, boolean, string][] = [
    [6, makeLevel(6).goals.length === 1 && makeLevel(6).goals[0].type === 'biome', 'one biome goal'],
    [8, makeLevel(8).queue[0] === 'magma' && makeLevel(8).queue[1] === 'ice', 'early Steam pair'],
    [13, makeLevel(13).queue[0] === 'seed' && makeLevel(13).queue[1] === 'storm', 'Rain Garden pair'],
    [22, makeLevel(22).queue[0] === 'seed' && makeLevel(22).queue[1] === 'sun', 'Wildflowers pair'],
    [25, makeLevel(25).queue[0] === 'rock' && makeLevel(25).queue[1] === 'ice', 'Glacier pair'],
    ...([14, 16, 18] as const).map((n): [number, boolean, string] => [n, makeLevel(n).troubles.some((t) => t.id === 'vent'), 'Ember Vent']),
    [28, makeLevel(28).troubles.some((t) => t.id === 'vine'), 'Tanglevine'],
    ...([33, 41, 46, 51, 57] as const).map((n, i): [number, boolean, string] => [
      n,
      makeLevel(n).sky.obstacle === (['rocks', 'bubble', 'mist', 'ring', 'tug'] as const)[i],
      'teaching obstacle',
    ]),
    [36, makeLevel(36).troubles.some((t) => t.id === 'frost'), 'Frost Creep'],
  ];
  for (const [n, taught, idea] of lessons)
    if (n <= last && !taught) add('TEACH', n, `Missing ${idea}`, 'Restore the teaching layout and deal.');
  for (let n = 1; n <= last; n++) {
    const level = makeLevel(n);
    const pressure = pressureOf(level),
      budget = budgetFor(level);
    if (pressure > budget || skyWall(level))
      add('STACK', n, `pressure ${pressure}/${budget}; sky wall ${skyWall(level)}`, 'Use a lower pressure twist or move the obstacle.');
    if (
      level.sky.obstacle &&
      level.troubles.length &&
      (level.difficulty !== 'super' ||
        n <
          10 +
            (level.sky.obstacle === 'rocks'
              ? 33
              : level.sky.obstacle === 'bubble'
                ? 41
                : level.sky.obstacle === 'mist'
                  ? 46
                  : level.sky.obstacle === 'ring'
                    ? 51
                    : 57))
    )
      add(
        'STACK',
        n,
        `obstacle ${level.sky.obstacle} plus ${level.troubles.length} Trouble`,
        'Separate the new obstacle from Troubles for ten planets.',
      );
    const casualRow = c.get(n),
      decentRow = d.get(n),
      sharpRow = s.get(n);
    if (!casualRow || !decentRow || !sharpRow) continue;
    const chapter = CHAPTER_BANDS.find((band) => n >= band.first && n <= band.last)!;
    const tier = level.difficulty;
    const limits =
      tier === 'normal'
        ? { min: chapter.decentFail[0], max: chapter.decentFail[1], casualMax: Math.min(0.6, chapter.casualFail[1]) }
        : tier === 'hard'
          ? { min: n <= 20 ? 0.18 : 0.12, max: n <= 20 ? 0.32 : 0.45, casualMax: n <= 20 ? 0.4 : 0.5 }
          : { min: 0.25, max: 0.6, casualMax: 0.7 };
    if (decentRow.fail > limits.max || (tier === 'normal' && casualRow.fail > 0.6))
      add(
        'WALL',
        n,
        `decent fail ${pct(decentRow.fail)} (max ${pct(limits.max)}); casual ${pct(casualRow.fail)} (normal max 60%)`,
        'Try another salt, then reduce the goal demand.',
      );
    if (tier !== 'normal' && decentRow.fail < limits.min)
      add('EASY', n, `decent fail ${pct(decentRow.fail)} < ${pct(limits.min)}`, 'Try a Trouble-bearing salt without raising targets.');
    if (n >= 4 && decentRow.threeStar >= 0.9)
      add('TRIVIAL', n, `decent-aware 3★ ${pct(decentRow.threeStar)}`, 'Try a salt with more distinct choices.');
    if (n <= 20 && (decentRow.threeStar > chapter.decentThree[1] + 0.1 || sharpRow.threeStar >= 0.9 || casualRow.threeStar > 0.45))
      add(
        'EASY-EARLY',
        n,
        `casual/decent/sharp 3★ ${pct(casualRow.threeStar)}/${pct(decentRow.threeStar)}/${pct(sharpRow.threeStar)}`,
        'Review this seed and the lesson target.',
      );
    const goalMisses = decentRow.scoreMet - decentRow.goalMetWhenScoreMet;
    if (decentRow.fail > 0 && goalMisses / (decentRow.fail * decentRow.runs) >= 0.7)
      add(
        'GOAL-TRAP',
        n,
        `${goalMisses}/${Math.round(decentRow.fail * decentRow.runs)} fails missed a goal`,
        'Pick a goal with more than one reachable path.',
      );
    if (n >= 20 && decentRow.choiceDifferenceRate < 0.05)
      add(
        'FLAT',
        n,
        `aware/blind choice differs on ${pct(decentRow.choiceDifferenceRate)} of throws`,
        'Try a seed where the forecast changes the best move.',
      );
    if (decentRow.slack >= 0.4)
      add('SLACK', n, `decent reaches final stars with ${pct(decentRow.slack)} of throws left`, 'Try a seed with less free opening gain.');
    if (casualRow.flight && (casualRow.flight.bonks + casualRow.flight.fizzles) / casualRow.runs > 1.5)
      add(
        'BONK-HEAVY',
        n,
        `casual bonks+fizzles ${((casualRow.flight.bonks + casualRow.flight.fizzles) / casualRow.runs).toFixed(2)}/round`,
        'Move or slow the obstacle.',
      );
    if (n >= 5) {
      const current = casual.filter((row) => row.n >= n - 4 && row.n <= n);
      const previous = casual.filter((row) => row.n >= n - 5 && row.n <= n - 1);
      const rise = mean(current) - mean(previous);
      if (rise > 0.05)
        add('CLIFF', n, `5-planet casual fail rises ${pct(rise)}`, 'Re-salt the outlier or make the previous Hard planet a breather.');
    }
    if (n % 10 === 0 && n >= 20) {
      const current = casual.filter((row) => row.n >= n - 9 && row.n <= n && makeLevel(row.n).difficulty === 'normal');
      const previous = casual.filter((row) => row.n >= n - 19 && row.n <= n - 10 && makeLevel(row.n).difficulty === 'normal');
      const rise = mean(current) - mean(previous);
      if (rise > 0.08) add('CLIFF', n, `chapter normal casual fail rises ${pct(rise)}`, 'Review goals and salts at the chapter boundary.');
    }
  }
  return issues;
}
