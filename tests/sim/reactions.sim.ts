import { it } from 'vitest';
import { makeLevel, rngFrom } from '../../src/core/levels';
import { novaReady, roundState, rulesForLevel, stepRound } from '../../src/core/round';
import { SECTORS, lifeScore } from '../../src/core/world';
import { POLICIES, oneStep, playLevel, type BotPolicy, type PlayResult } from './harness';

const rate = (rows: PlayResult[], test: (row: PlayResult) => boolean) => rows.filter(test).length / rows.length;
const mean = (rows: PlayResult[], value: (row: PlayResult) => number) => rows.reduce((total, row) => total + value(row), 0) / rows.length;

if (process.env.SIM === '1') {
  it('measures reaction and Combo bands', () => {
    const runs = Number(process.env.RUNS ?? 8);
    const rows = {
      aware: [] as PlayResult[],
      blind: [] as PlayResult[],
      casual: [] as PlayResult[],
      casualNoCombo: [] as PlayResult[],
      awareNoCombo: [] as PlayResult[],
    };
    const normalCombo = { aware: [] as PlayResult[], blind: [] as PlayResult[] };
    for (let n = 20; n <= 60; n++) {
      const level = makeLevel(n);
      for (let run = 0; run < runs; run++) {
        const seed = `m7-${n}-${run}`;
        const aware = playLevel(level, POLICIES['decent-aware'], rngFrom(seed));
        const blind = playLevel(level, POLICIES['decent-blind'], rngFrom(seed));
        rows.aware.push(aware);
        rows.blind.push(blind);
        if (n >= 26 && level.difficulty === 'normal') {
          normalCombo.aware.push(aware);
          normalCombo.blind.push(blind);
        }
        rows.casual.push(playLevel(level, POLICIES.casual, rngFrom(seed)));
        const withoutCombo = { ...rulesForLevel(n), combo: false };
        rows.casualNoCombo.push(playLevel(level, POLICIES.casual, rngFrom(seed), withoutCombo));
        rows.awareNoCombo.push(playLevel(level, POLICIES['decent-aware'], rngFrom(seed), withoutCombo));
      }
    }
    const normalStars = (policy: 'aware' | 'blind') =>
      rows[policy].filter(
        (_, index) => makeLevel(20 + Math.floor(index / runs)).difficulty === 'normal' && 20 + Math.floor(index / runs) >= 21,
      );
    const awareStars = normalStars('aware');
    const blindStars = normalStars('blind');
    const objectGain = Object.fromEntries(
      (['rock', 'ice', 'magma', 'seed', 'storm', 'sun'] as const).map((kind) => {
        const gain = rows.aware.reduce((total, row) => total + (row.gainByKind[kind]?.gain ?? 0), 0);
        const throws = rows.aware.reduce((total, row) => total + (row.gainByKind[kind]?.throws ?? 0), 0);
        return [kind, gain / throws];
      }),
    );
    const gains = Object.values(objectGain);
    const greedy: BotPolicy = {
      name: 'greedy-aware',
      labLevel: 1,
      chooseAim: (context) => oneStep(context, rulesForLevel(context.level.n)),
    };
    const planner: BotPolicy = {
      name: 'planner-aware',
      labLevel: 1,
      chooseAim(context) {
        const state = context.state ?? roundState(context.planet, context.level.nova);
        const rules = rulesForLevel(context.level.n);
        const kind = context.level.queue[context.turn];
        const nextKind = context.level.queue[context.turn + 1];
        let best = -Infinity;
        let aim = 0;
        for (let sector = 0; sector < SECTORS; sector++) {
          const first = stepRound(state, { kind, sector, nova: context.nova }, undefined, rules);
          let value = first.after;
          if (nextKind && context.turn + 1 < context.level.throws) {
            let nextBest = -Infinity;
            for (let nextSector = 0; nextSector < SECTORS; nextSector++) {
              const second = stepRound(first.state, { kind: nextKind, sector: nextSector, nova: novaReady(first.state) }, undefined, rules);
              nextBest = Math.max(nextBest, second.after);
            }
            value = nextBest + first.after * 0.01;
          }
          if (value > best) {
            best = value;
            aim = sector;
          }
        }
        return aim;
      },
    };
    let plannerGain = 0;
    let greedyGain = 0;
    for (let n = 26; n <= 60; n++) {
      const level = makeLevel(n);
      if (level.difficulty !== 'normal') continue;
      const base = lifeScore(level.start);
      plannerGain += playLevel(level, planner, rngFrom(`planner-${n}`)).score - base;
      greedyGain += playLevel(level, greedy, rngFrom(`planner-${n}`)).score - base;
    }
    const bands = {
      awareThreeStar: rate(awareStars, (row) => row.stars === 3),
      blindThreeStar: rate(blindStars, (row) => row.stars === 3),
      threeStarGapPoints: Math.round(100 * (rate(awareStars, (row) => row.stars === 3) - rate(blindStars, (row) => row.stars === 3))),
      bestSectorDiff: mean(rows.aware, (row) => row.choiceDifferences / row.totalThrows),
      objectGain,
      deadByKind: Object.fromEntries(
        (['rock', 'ice', 'magma', 'seed', 'storm', 'sun'] as const).map((kind) => [
          kind,
          rows.aware.reduce((total, row) => total + (row.deadByKind[kind] ?? 0), 0) /
            rows.aware.reduce((total, row) => total + (row.gainByKind[kind]?.throws ?? 0), 0),
        ]),
      ),
      objectSpread: Math.max(...gains) / Math.min(...gains),
      deadThrows: mean(rows.aware, (row) => row.bestDeadThrows / row.totalThrows),
      playedDeadThrows: mean(rows.aware, (row) => row.deadThrows / row.totalThrows),
      awareFusions: mean(rows.aware, (row) => row.fusion),
      blindClashes: mean(rows.blind, (row) => row.clash),
      blindReactionCounts: Object.fromEntries(
        ['steam', 'rainGarden', 'wildflowers', 'glacier', 'scorch'].map((id) => [
          id,
          mean(rows.blind, (row) => row.reactionCounts[id] ?? 0),
        ]),
      ),
      awareCombo2: rate(normalCombo.aware, (row) => row.bestCombo >= 2),
      awareCombo3: rate(normalCombo.aware, (row) => row.bestCombo >= 3),
      awareCombo4: rate(normalCombo.aware, (row) => row.bestCombo >= 4),
      blindCombo2: rate(normalCombo.blind, (row) => row.bestCombo >= 2),
      novas: mean(rows.aware, (row) => row.novas),
      casualFail: rate(rows.casual.slice(runs), (row) => row.stars === 0),
      casualFailWithoutCombo: rate(rows.casualNoCombo.slice(runs), (row) => row.stars === 0),
      comboGainShare:
        rows.aware.reduce((total, row, index) => {
          const base = lifeScore(makeLevel(20 + Math.floor(index / runs)).start);
          return total + (row.score - rows.awareNoCombo[index].score) / Math.max(1, row.score - base);
        }, 0) / rows.aware.length,
      frostPerTen:
        mean(
          rows.aware.filter((_, index) => 20 + Math.floor(index / runs) >= 25),
          (row) => row.frostSectors,
        ) * 10,
      plannerPremium: plannerGain / greedyGain,
    };
    console.log('M7 bands', JSON.stringify(bands));
    const failures: string[] = [];
    const gate = (name: string, value: number, min: number, max: number) => {
      if (value < min || value > max) failures.push(`${name}: ${value.toFixed(3)} outside ${min.toFixed(3)}–${max.toFixed(3)}`);
    };
    gate('aware 3★ lead (points)', bands.threeStarGapPoints, 10, Infinity);
    gate('aware 3★ rate on normal planets', bands.awareThreeStar, 0.4, 0.55);
    gate('best-sector difference', bands.bestSectorDiff, 0.1, Infinity);
    gate('per-object gain spread', bands.objectSpread, 0, 1.8);
    gate('best-available dead throws', bands.deadThrows, 0, 0.1);
    gate('aware Fusions per planet', bands.awareFusions, 1, Infinity);
    gate('blind Clashes per planet', bands.blindClashes, 0.3, 0.6);
    gate('aware Combo 2', bands.awareCombo2, 0.35, 0.6);
    gate('aware Combo 3', bands.awareCombo3, 0.1, 0.3);
    gate('aware Combo 4', bands.awareCombo4, 0.02, 0.1);
    gate('blind Combo 2 versus aware', bands.blindCombo2, 0, bands.awareCombo2 / 2);
    gate('Supernovas per planet', bands.novas, 2, 3);
    gate('casual fail versus pre-M7', bands.casualFail, 0, 0.439);
    gate('casual fail added by Combos', bands.casualFail - bands.casualFailWithoutCombo, -Infinity, 0.01);
    if (failures.length) throw new Error(`M7 band failures:\n${failures.join('\n')}`);
  });
}
