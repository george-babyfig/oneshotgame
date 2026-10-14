import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { makeLevel, rngFrom, solve0, starsEarned } from '../src/core/levels';
import {
  ROUND_RULES_V0,
  novaReady,
  previewStep,
  restoreRound,
  roundState,
  rulesForLevel,
  serializeRound,
  stepRound,
} from '../src/core/round';
import { forecastTroubles, isFirebreak, type TroubleId } from '../src/core/troubles';
import { biomeOf, lifeScore, newPlanet, type Planet } from '../src/core/world';
import { previewTroubleTarget } from '../src/ui/art/troubles';
import { TROUBLES } from '../src/core/troubles';
import { shouldShowRoundIntro } from '../src/ui/game';

function green(id: TroubleId = 'vent'): Planet {
  const planet = newPlanet();
  for (const at of [11, 12, 13]) {
    planet.sectors[at].land = 1;
    planet.sectors[at].life = id === 'vine' ? 1 : 2;
    planet.sectors[at].heat = id === 'vine' ? 2 : 0;
    planet.sectors[at].biome = biomeOf(planet.sectors[at]);
  }
  return planet;
}
function ready(id: TroubleId, planet = green(id)) {
  const state = roundState(planet, true, [{ id, source: 10 }]);
  state.troubles[0].nextIn = 1;
  return state;
}
const far = { kind: 'rock' as const, sector: 0 };

describe('Troubles', () => {
  it('teaches sources and counters on their own planets', () => {
    for (const [n, id, counter] of [
      [14, 'vent', 'ice'],
      [28, 'vine', 'magma'],
      [36, 'frost', 'magma'],
    ] as const) {
      const level = makeLevel(n);
      expect(level.troubles).toHaveLength(1);
      expect(level.troubles[0].id).toBe(id);
      expect(level.twist).toBe('none');
      expect(level.queue.slice(1, 3)).toContain(counter);
      const first = forecastTroubles(roundState(level.start, level.nova, level.troubles), NO_MODIFIERS)[0];
      expect(first.sector).toBe(11);
      expect(first.blockedBy).toBeUndefined();
    }
    for (let n = 1; n <= 13; n++) expect(makeLevel(n).troubles).toEqual([]);
  });

  it('acts on the exact forecast sector and previews each loss', () => {
    for (const id of ['vent', 'vine', 'frost'] as const) {
      const state = ready(id);
      const forecast = forecastTroubles(state, NO_MODIFIERS)[0];
      expect(forecast.sector).toBe(11);
      const preview = previewStep(state, far);
      const actual = stepRound(state, far);
      expect(preview).toEqual(actual);
      expect(actual.troubleEvents[0].sector).toBe(forecast.sector);
      expect(previewTroubleTarget(preview.state.planet, state.troubles[0], preview.troubleEvents)).toBe(actual.troubleEvents[0].sector);
      expect(actual.troubleEvents[0].kind).toBe(id === 'vine' ? 'spread' : 'act');
      expect(actual.state.troubles[0].nextIn).toBe(3);
      if (id === 'vine') expect(actual.state.planet.sectors[11].biome).toBe('barren');
    }
  });

  it('uses water, mountain, roots, hot land and resistant traits as firebreaks', () => {
    const p = green();
    p.sectors[11].water = 2;
    expect(isFirebreak(p, 11, 'vent')).toBe(true);
    expect(isFirebreak(p, 11, 'vine')).toBe(true);
    p.sectors[11].water = 0;
    p.sectors[11].land = 3;
    expect(isFirebreak(p, 11, 'vent')).toBe(true);
    p.sectors[11].land = 1;
    p.sectors[11].life = 3;
    expect(isFirebreak(p, 11, 'vine')).toBe(true);
    p.sectors[11].life = 1;
    p.sectors[11].heat = 2;
    expect(isFirebreak(p, 11, 'frost')).toBe(true);
    p.sectors[11].heat = 0;
    p.sectors[11].species = 'newt';
    expect(isFirebreak(p, 11, 'vent')).toBe(true);
    p.sectors[11].species = null;
    p.sectors[11].water = 2;
    const blocked = stepRound(ready('vent', p), far);
    expect(blocked.troubleEvents[0].kind).toBe('blocked');
  });

  it('counts a Life Spark root and Buddy shield as one overlapping mitigation', () => {
    const mods = { ...NO_MODIFIERS, buddyShield: 'weedproof' as const };
    const rooted = green('vine');
    rooted.sectors[11].life = 3;
    rooted.sectors[12].water = 2;
    rooted.sectors[13].water = 2;
    const sparkBlock = stepRound(ready('vine', rooted), far, mods);
    expect(sparkBlock.troubleEvents[0]).toMatchObject({ kind: 'blocked', by: 'strongRoots' });
    expect(sparkBlock.state.buddyShieldUsed).toBe(false);
    const buddyBlock = stepRound(ready('vine'), far, mods);
    expect(buddyBlock.troubleEvents[0]).toMatchObject({ kind: 'blocked', by: 'weedproof' });
    expect(buddyBlock.state.buddyShieldUsed).toBe(true);
  });

  it('keeps a Fireproof friend safe from Dry Spell', () => {
    const planet = newPlanet(() => ({ land: 1, life: 1, heat: 2 }));
    planet.sectors[5].species = 'newt';
    planet.sectors[5].land = 3;
    planet.sectors[5].biome = biomeOf(planet.sectors[5]);
    const result = stepRound(roundState(planet), { kind: 'sun', sector: 7 }, NO_MODIFIERS, rulesForLevel(32));
    const baseline = stepRound(roundState(planet), { kind: 'sun', sector: 7 }, NO_MODIFIERS, ROUND_RULES_V0);
    expect(result.reactions[0]?.id).toBe('scorch');
    expect(result.state.planet.sectors[5].life).toBe(baseline.state.planet.sectors[5].life);
  });

  it('settles from counters, gives three charge and stays settled', () => {
    for (const [id, kind, at] of [
      ['vent', 'ice', 10],
      ['vine', 'magma', 10],
      ['frost', 'sun', 12],
    ] as const) {
      const result = stepRound(ready(id), { kind, sector: at });
      expect(result.troubleEvents).toContainEqual(expect.objectContaining({ id, kind: 'settled', sector: 10, clearedByThrow: true }));
      expect(result.state.troubles[0].settled).toBe(true);
      expect(result.novaGain).toBeGreaterThanOrEqual(3);
      expect(stepRound(result.state, far).troubleEvents).toEqual([]);
    }
  });

  it('lets a Rain Cloud Supernova settle every source within three', () => {
    const state = roundState(green(), true, [
      { id: 'vent', source: 10 },
      { id: 'frost', source: 14 },
    ]);
    state.nova.charge = state.charge = state.nova.threshold;
    const result = stepRound(state, { kind: 'storm', sector: 12, nova: true });
    expect(result.troubleEvents.filter((event) => event.kind === 'settled')).toHaveLength(2);
    expect(result.state.troubles.every((trouble) => trouble.settled)).toBe(true);
  });

  it('cools the vent with nearby Steam and settles a source with no target', () => {
    const icy = green();
    icy.sectors[12].water = 3;
    icy.sectors[12].heat = -2;
    icy.sectors[12].life = 0;
    icy.sectors[12].biome = biomeOf(icy.sectors[12]);
    const steam = stepRound(ready('vent', icy), { kind: 'magma', sector: 12 }, NO_MODIFIERS, rulesForLevel(14));
    expect(steam.reactions[0]?.id).toBe('steam');
    expect(steam.troubleEvents.some((event) => event.kind === 'settled')).toBe(true);
    const bare = ready('vent', newPlanet());
    expect(stepRound(bare, { ...far, outcome: 'miss' }).troubleEvents[0]).toMatchObject({ kind: 'settled', sector: 10 });
  });

  it('uses the Hard clock, Gentle setting, Buddy shield once and Calm delay', () => {
    const hard = roundState(green(), true, [{ id: 'vent', source: 10 }], true);
    expect(hard.troubles[0].nextIn).toBe(2);
    expect(stepRound(hard, far).state.troubles[0].nextIn).toBe(1);
    expect(stepRound(ready('vent'), far, { ...NO_MODIFIERS, gentle: true }).troubleEvents).toEqual([]);
    const buddy = stepRound(ready('vent'), far, { ...NO_MODIFIERS, buddyShield: 'fireproof' });
    expect(forecastTroubles(ready('vent'), { ...NO_MODIFIERS, buddyShield: 'fireproof' })[0].blockedBy).toBe('fireproof');
    expect(buddy.troubleEvents[0]).toMatchObject({ kind: 'blocked', by: 'fireproof' });
    expect(buddy.state.buddyShieldUsed).toBe(true);
    buddy.state.troubles[0].nextIn = 1;
    expect(stepRound(buddy.state, far, { ...NO_MODIFIERS, buddyShield: 'fireproof' }).troubleEvents[0].kind).toBe('act');
    const calm = ready('vent');
    calm.planet.sectors[0].species = 'worldtree';
    const delayed = stepRound(calm, far);
    expect(delayed.troubleEvents).toEqual([]);
    expect(delayed.state.troubles[0].delayed).toBe(true);
  });

  it('uses a Calm Buddy for just the first Trouble due on the planet', () => {
    const state = roundState(green(), true, [
      { id: 'vent', source: 10 },
      { id: 'vent', source: 14 },
    ]);
    state.troubles.forEach((trouble) => (trouble.nextIn = 1));
    const mods = { ...NO_MODIFIERS, buddyShield: 'calm' as const };
    const first = stepRound(state, far, mods);
    expect(first.state.buddyShieldUsed).toBe(true);
    expect(first.state.calmUsed).toBe(true);
    expect(first.state.troubles[0].nextIn).toBe(1);
    expect(first.state.troubles[1].nextIn).toBe(3);
    expect(first.troubleEvents.some((event) => event.id === 'vent')).toBe(true);
    const second = stepRound(first.state, far, mods);
    expect(second.state.troubles[0].nextIn).toBe(3);
    expect(second.troubleEvents.some((event) => event.sector === 11)).toBe(true);
    expect(forecastTroubles(state, mods)[0].inThrows).toBe(1);
  });

  it('keeps Gentle Troubles fully inert, including counters and automatic settling', () => {
    const mods = { ...NO_MODIFIERS, gentle: true };
    const source = ready('vent');
    const counter = stepRound(source, { kind: 'ice', sector: 10 }, mods);
    expect(counter.troubleEvents).toEqual([]);
    expect(counter.state.troubles).toEqual(source.troubles);
    expect(counter.novaGain).toBe(stepRound({ ...source, troubles: [] }, { kind: 'ice', sector: 10 }, mods).novaGain);
    expect(forecastTroubles(source, mods)).toEqual([]);
    for (const id of ['vent', 'vine', 'frost']) expect(shouldShowRoundIntro(id, true)).toBe(false);
    expect(shouldShowRoundIntro('traits_intro', true)).toBe(false);
    expect(shouldShowRoundIntro('buddy', true)).toBe(false);
    const bare = ready('vent', newPlanet());
    expect(stepRound(bare, { ...far, outcome: 'miss' }, mods).troubleEvents).toEqual([]);
    expect(stepRound(bare, { ...far, outcome: 'miss' }, mods).state.troubles).toEqual(bare.troubles);
  });

  it('clears Tanglevine from either neighbour of its root or a tangled sector', () => {
    expect(TROUBLES.vine.counter).toBe('Magma on the vine clears it.');
    for (const at of [9, 11]) {
      const result = stepRound(ready('vine'), { kind: 'magma', sector: at });
      expect(result.state.troubles[0].settled).toBe(true);
    }
    const tangled = ready('vine');
    tangled.troubles[0].tangled = [13];
    expect(stepRound(tangled, { kind: 'magma', sector: 13 }).state.troubles[0].settled).toBe(true);
  });

  it('forecasts the next two beats after the first has changed the planet', () => {
    let state = ready('vent');
    const beats = forecastTroubles(state, NO_MODIFIERS);
    expect(beats).toHaveLength(2);
    for (let turn = 1; turn <= beats[1].inThrows; turn++) {
      const result = stepRound(state, { ...far, outcome: 'miss' });
      const expected = beats.filter((beat) => beat.inThrows === turn);
      expect(result.troubleEvents.map((event) => event.sector)).toEqual(expected.map((beat) => beat.sector ?? 10));
      state = result.state;
    }
  });

  it('checkpoints Trouble clocks and restores old saves without them', () => {
    const state = stepRound(ready('vent'), far).state;
    expect(restoreRound(serializeRound(state))?.troubles).toEqual(state.troubles);
    const old = JSON.parse(serializeRound(state));
    delete old.state.troubles;
    expect(restoreRound(JSON.stringify(old))?.troubles).toEqual([]);
  });

  it('predicts every Trouble wander-off for the aim tag ghosts', () => {
    let checked = 0;
    for (let n = 14; n <= 120; n++) {
      const level = makeLevel(n);
      if (!level.troubles.length) continue;
      for (let run = 0; run < 2; run++) {
        const random = rngFrom(`${level.seed}-surprise-${run}`);
        let state = roundState(level.start, level.nova, level.troubles, level.difficulty !== 'normal');
        for (let turn = 0; turn < level.throws; turn++) {
          const action = { kind: level.queue[turn], sector: Math.floor(random() * 24) };
          const tag = previewStep(state, action);
          const actual = stepRound(state, action);
          expect(actual.lost).toEqual(tag.lost);
          for (const lost of actual.lost)
            if (actual.troubleEvents.some((event) => event.sector === lost.sector && (event.kind === 'act' || event.kind === 'spread')))
              checked++;
          state = actual.state;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('preserves the one-star kid floor on planets 1–120', () => {
    for (let n = 1; n <= 120; n++) {
      const level = makeLevel(n);
      const planet = solve0(level);
      expect(starsEarned(planet, lifeScore(planet), level), `planet ${n}`).toBeGreaterThanOrEqual(1);
    }
  });

  it.skipIf(process.env.TROUBLE_REPORT !== '1')('reports ground-only Trouble planet bands', () => {
    const rows: { policy: string; runs: number; fail: number; threeStar: number }[] = [];
    for (const [name, randomShare, errorShare] of [
      ['casual', 0.3, 0.4],
      ['decent', 0.1, 0.25],
    ] as const) {
      let fail = 0;
      let three = 0;
      let count = 0;
      for (let n = 14; n <= 60; n++) {
        const level = makeLevel(n);
        if (!level.troubles.length) continue;
        for (let run = 0; run < 16; run++) {
          const random = rngFrom(`${level.seed}-${name}-${run}`);
          let state = roundState(level.start, level.nova, level.troubles, level.difficulty !== 'normal');
          for (let turn = 0; turn < level.throws; turn++) {
            const kind = level.queue[turn];
            let best = -Infinity;
            let target = 0;
            for (let sector = 0; sector < 24; sector++) {
              const blind = stepRound({ ...state, troubles: [] }, { kind, sector, nova: novaReady(state) });
              if (blind.after > best) {
                best = blind.after;
                target = sector;
              }
            }
            if (random() < randomShare) target = Math.floor(random() * 24);
            else if (random() < errorShare) target = (target + (random() < 0.5 ? 23 : 1)) % 24;
            state = stepRound(state, { kind, sector: target, nova: novaReady(state) }).state;
          }
          const stars = starsEarned(state.planet, lifeScore(state.planet), level);
          fail += Number(stars === 0);
          three += Number(stars === 3);
          count++;
        }
      }
      rows.push({ policy: name, runs: count, fail: fail / count, threeStar: three / count });
    }
    writeFileSync('/tmp/pocket-planet-p1-trouble-report.json', JSON.stringify(rows));
  });
});
