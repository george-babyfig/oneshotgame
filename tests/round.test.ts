import { describe, expect, it } from 'vitest';
import { NO_MODIFIERS, modifiersFor } from '../src/core/modifiers';
import {
  NOVA_CHARGE,
  ROUND_RULES_V0,
  novaForThrow,
  previewStep,
  restoreRound,
  roundState,
  serializeRound,
  stepRound,
} from '../src/core/round';
import { BIOMES, newPlanet, settle } from '../src/core/world';

describe('round engine', () => {
  it('is pure and previews exactly the same transition', () => {
    const state = roundState(newPlanet());
    const original = structuredClone(state);
    const mods = { ...NO_MODIFIERS, lab: { rock: 4 } };
    const action = { kind: 'rock' as const, sector: 3 };
    const step = stepRound(state, action, mods, ROUND_RULES_V0);
    expect(state).toEqual(original);
    expect(previewStep(state, action, mods, ROUND_RULES_V0)).toEqual(step);
    expect(step.reactions).toEqual([]);
    expect(step.troubleEvents).toEqual([]);
    expect(step.changed).toContain(3);
    expect(step.spawned).toContainEqual({ id: 'goat', at: 2 });
    expect(step.firstArrivals).toContain('goat');
    expect(step.newRegionBests).toContain(3);
  });

  it('keeps region bests and arrivals without flat Lab score', () => {
    let state = roundState(newPlanet());
    const mods = { ...NO_MODIFIERS, lab: { rock: 4 } };
    for (const sector of [2, 2, 3]) {
      const prior = state;
      const result = stepRound(state, { kind: 'rock', sector }, mods, ROUND_RULES_V0);
      expect(result.state.bonus).toBe(prior.bonus);
      expect(result.state.regionBests.every((best, i) => best >= prior.regionBests[i])).toBe(true);
      expect(result.state.arrived).toEqual(expect.arrayContaining(prior.arrived));
      state = result.state;
    }
  });

  it('reports a creature that wanders off with its sector', () => {
    const planet = newPlanet(() => ({ life: 1 }));
    settle(planet);
    const priorAt = planet.sectors.findIndex((s) => s.species === 'bunny');
    const step = stepRound(roundState(planet), { kind: 'magma', sector: priorAt });
    expect(step.lost).toContainEqual({ species: 'bunny', sector: priorAt });
  });

  it('charges and fires a Supernova like the existing game', () => {
    const initial = roundState(newPlanet());
    const charged = { ...initial, charge: NOVA_CHARGE, nova: { ...initial.nova, charge: NOVA_CHARGE } };
    const step = stepRound(charged, { kind: 'rock', sector: 0, nova: true });
    expect(step.state.charge).toBe(0);
    expect(step.novaCharge).toBe(0);
    expect(step.after).toBeGreaterThanOrEqual(step.before);
    expect(step.state.regionBests[0]).toBe(BIOMES[step.state.planet.sectors[0].biome].value);
  });
  it('reports a returning creature without repeating its first arrival', () => {
    const state = roundState(newPlanet());
    state.arrived = ['goat'];
    const back = stepRound(state, { kind: 'rock', sector: 0 });
    expect(back.cameBack).toContainEqual({ species: 'goat', sector: 0 });
    expect(back.firstArrivals).not.toContain('goat');
  });

  it('gentle mode skips Clashes and keeps Fusions', () => {
    const planet = newPlanet();
    planet.sectors[0].biome = 'volcano';
    const rules = { version: 2, reactions: ['scorch', 'steam'] as ('scorch' | 'steam')[], troubles: [], combo: true };
    const state = roundState(planet);
    const normal = stepRound(state, { kind: 'sun', sector: 0 }, NO_MODIFIERS, rules);
    const gentle = stepRound(state, { kind: 'sun', sector: 0 }, { ...NO_MODIFIERS, gentle: true }, rules);
    expect(normal.reactions.map((r) => r.id)).toContain('scorch');
    expect(gentle.reactions).toEqual([]);
    const icy = newPlanet();
    icy.sectors[0].biome = 'icesheet';
    expect(
      stepRound(roundState(icy), { kind: 'magma', sector: 0 }, { ...NO_MODIFIERS, gentle: true }, rules).reactions.map((r) => r.id),
    ).toContain('steam');
    for (const mode of ['daily', 'rush', 'challenge'] as const) expect(modifiersFor(mode, { gentle: true }).gentle).toBe(true);
    expect(modifiersFor('campaign', { gentle: true }).gentle).toBe(true);
  });

  it('round-trips the full continuation state and rejects other versions', () => {
    const state = roundState(newPlanet());
    state.queueIndex = 7;
    state.throwsLeft = 8;
    state.continuesUsed = 1;
    state.goalsProgress = [2, 0];
    state.guardianHp = 2;
    state.nova.held = true;
    const restored = restoreRound(serializeRound(state));
    expect(JSON.parse(serializeRound(state)).rulesVersion).toBe(1);
    expect(restored).toEqual(state);
    expect(stepRound(restored!, { kind: 'seed', sector: 4 })).toEqual(stepRound(state, { kind: 'seed', sector: 4 }));
    expect(restoreRound('{"version":2,"state":{}}')).toBeNull();
    expect(restoreRound('broken')).toBeNull();
    const changedRules = JSON.parse(serializeRound(state));
    changedRules.rulesVersion++;
    expect(restoreRound(JSON.stringify(changedRules))).toEqual({ ...state, extraUsed: false, wideNext: 0 });
    changedRules.rulesVersion = 3;
    expect(restoreRound(JSON.stringify(changedRules))).toBeNull();
  });

  it('restores a version 1 round with a fresh Combo', () => {
    const state = roundState(newPlanet());
    const saved = JSON.parse(serializeRound(state));
    saved.version = 1;
    delete saved.state.combo;
    delete saved.state.comboCharge;
    expect(restoreRound(JSON.stringify(saved))).toEqual(state);
    saved.state.planet.sectors.pop();
    expect(restoreRound(JSON.stringify(saved))).toBeNull();
  });

  it('previews the held Supernova on the final throw', () => {
    const state = roundState(newPlanet());
    state.nova = { ...state.nova, charge: NOVA_CHARGE, held: true };
    state.charge = NOVA_CHARGE;
    state.throwsLeft = 2;
    expect(novaForThrow(state)).toBe(false);
    state.throwsLeft = 1;
    expect(novaForThrow(state)).toBe(true);
  });
});

// S15-b contracts: launch bytes are guarded separately by the stored round golden.
import { REACTION_PRIORITY, grantExtraThrow, REACTIONS, rulesForLevel } from '../src/core/round';
import { TROUBLES, TROUBLE_BEHAVIOUR } from '../src/core/troubles';
import { RULESETS } from '../src/core/rulesets';
import { fly, flyFull, STAR_SLING, type FlightWorld } from '../src/core/flight';
import { overlayV2 } from '../src/core/v2/overlay';
import * as motePackage from '../src/core/v2/motes';
import { vi } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { previewReach } from '../src/ui/aimtag';
import { LevelScene } from '../src/ui/game';
import type { RoundAssists } from '../src/meta/m15types';

it('has exhaustive reaction and Trouble rows with fixed priority and no Pebble Lab Guard', () => {
  expect(REACTION_PRIORITY).toEqual(['steam', 'rainGarden', 'wildflowers', 'glacier', 'firemount', 'rainbow', 'scorch', 'flood']);
  for (const id of new Set([...RULESETS[1].reactions, ...RULESETS[2].reactions])) {
    expect(REACTIONS[id].pair).toHaveLength(2);
    expect(REACTIONS[id].triggers).toBeTypeOf('object');
    expect(REACTIONS[id].effect).toBeTypeOf('function');
    expect(REACTIONS[id].charge).toBe(REACTIONS[id].kind === 'fusion' ? 3 : 0);
  }
  expect(Object.keys(TROUBLE_BEHAVIOUR).sort()).toEqual([...new Set(Object.values(RULESETS[2].troubles).flat())].sort());
  for (const id of Object.keys(TROUBLES) as (keyof typeof TROUBLES)[]) {
    const row = TROUBLE_BEHAVIOUR[id];
    for (const key of ['clear', 'effect', 'repaint', 'firebreak', 'target'] as const) expect(row[key]).toBeTypeOf('function');
    expect(row.forecastShape).toBeTruthy();
    expect(row.helpLine).toHaveLength(2);
    expect(row.calm).toBe(true);
  }
  expect(TROUBLE_BEHAVIOUR.pebble.perk).toBeNull();
  expect(TROUBLE_BEHAVIOUR.pebble.buddy).toEqual([]);
});

it('grants one fixed extra throw, exposes its source and preserves v1 optional-field absence', () => {
  const state = roundState(newPlanet());
  expect(state).not.toHaveProperty('extraUsed');
  state.bonusKind = 'rock';
  state.throwsLeft = 1;
  expect(grantExtraThrow(state, 'mote')).toEqual({ source: 'mote', kind: 'rock' });
  expect(grantExtraThrow(state, 'rainbow')).toBeUndefined();
  expect(state.throwsLeft).toBe(2);
  expect(state.extraSource).toBe('mote');
  expect(grantExtraThrow(roundState(newPlanet()), 'rainbow')).toBeUndefined();
});

it('models Rainbow, uses the shared first-source cap and keeps the preview immutable', () => {
  const p = newPlanet();
  for (const s of p.sectors) {
    s.land = 2;
    s.water = 2;
    s.life = 1;
    s.heat = 0;
    s.biome = 'marsh';
  }
  const state = { ...roundState(p), bonusKind: 'rock' as const, throwsLeft: 1 };
  const before = JSON.stringify(state);
  const enabled = REACTIONS.rainbow.enabled;
  const stub = vi.spyOn(motePackage, 'applyMote').mockImplementation((s, m) => {
    if (m.kind === 'throw') grantExtraThrow(s, 'mote');
  });
  REACTIONS.rainbow.enabled = true;
  try {
    const rules = rulesForLevel(67, 'campaign', 67, 2);
    const rainbow = stepRound(state, { kind: 'sun', sector: 0 }, undefined, rules);
    expect(rainbow.extraThrow).toEqual({ source: 'rainbow', kind: 'rock' });
    expect(rainbow.state.throwsLeft).toBe(1);
    expect(rainbow.state.extraUsed).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    const mote = stepRound(state, { kind: 'sun', sector: 0, pickups: [{ kind: 'throw', x: 0, y: 0, r: 1 }] }, undefined, rules);
    expect(mote.extraThrow?.source).toBe('mote');
    expect(stepRound(mote.state, { kind: 'sun', sector: 0 }, undefined, rules).extraThrow).toBeUndefined();
    expect(stepRound(state, { kind: 'sun', sector: 0 }, undefined, rulesForLevel(67, 'campaign', 67, 1)).extraThrow).toBeUndefined();
  } finally {
    REACTIONS.rainbow.enabled = enabled;
    stub.mockRestore();
  }
});

it('consumes Wide Shot on the next throw, caps reach at four and matches its preview footprint', () => {
  const rules = rulesForLevel(67, 'campaign', 67, 2);
  const base = roundState(newPlanet());
  const wide = { ...base, wideNext: 1 };
  const step = stepRound(wide, { kind: 'rock', sector: 0 }, undefined, rules);
  expect(step.state.wideNext).toBe(0);
  expect(wide.wideNext).toBe(1);
  expect(step.state.planet.sectors[2].land).toBeGreaterThan(
    stepRound(base, { kind: 'rock', sector: 0 }, undefined, rules).state.planet.sectors[2].land,
  );
  expect(previewReach(1, 4)).toBe(4);
  expect(stepRound(wide, { kind: 'rock', sector: 0, outcome: 'miss' }, undefined, rules).state.wideNext).toBe(0);
});

it('collects pass-through pickup contacts once per flight, without changing the flight path', () => {
  const world: FlightWorld = {
    cx: 900,
    cy: 500,
    radius: 10,
    surface: Array(24).fill(10),
    rotation: 0,
    spin: 0,
    twist: 'none',
    wind: 0,
    width: 1000,
    height: 1000,
    launcherY: 500,
    gravity: 0,
  };
  const launch = { x: 0, y: 500, vx: 1000, vy: 0, elapsed: 0 };
  const params = { ...STAR_SLING, collisionPadding: 0 };
  const plain = flyFull(params, launch, world, 0);
  const contactWorld = {
    ...world,
    pickups: [
      { kind: 'mote' as const, x: 100, y: 500, r: 0.5 },
      { kind: 'pebble' as const, x: 200, y: 500, r: 0.5 },
    ],
  };
  const caught = flyFull(params, launch, contactWorld, 0);
  expect(caught.points).toEqual(plain.points);
  expect(caught.hit).toEqual(plain.hit);
  expect(plain).not.toHaveProperty('touched');
  expect(caught.touched).toEqual([
    { kind: 'pickup', index: 0 },
    { kind: 'pickup', index: 1 },
  ]);
  let state = launch;
  const contacts = [];
  for (let frame = 0; frame < 100; frame++) {
    const step = fly(params, state, contactWorld, 0, 1 / 60);
    contacts.push(...(step.touched ?? []));
    state = step.state;
    if (step.hit) break;
  }
  expect(contacts).toEqual(caught.touched);
});

it('composes dormant overlays only for v2 campaign and deals a fixed bonus in every Rainbow family', () => {
  const v1 = makeLevel(67, 'PP', { rulesVersion: 1 });
  expect(overlayV2(v1, { seed: v1.seed, rules: rulesForLevel(67, 'campaign', 67, 1), includeFlood: false })).toBe(v1);
  for (const prefix of ['PP', 'RX', 'VOY-2099-W01-north']) {
    const L = makeLevel(67, prefix, {
      rulesVersion: 2,
      rules: rulesForLevel(67, prefix === 'RX' ? 'remix' : prefix.startsWith('VOY') ? 'voyage' : 'campaign', 120, 2),
    });
    expect(L.bonusKind).toBeTruthy();
    expect(makeLevel(67, prefix, { rulesVersion: 2 }).bonusKind).toBe(L.bonusKind);
  }
});

it('puts the fixed extra object after the own budget and updates a pre-dealt final throw', () => {
  const scene = Object.create(LevelScene.prototype) as LevelScene;
  scene.L = makeLevel(67, 'PP', { rulesVersion: 2 });
  scene.L.throws = 1;
  scene.throwsTotal = 3;
  scene.throwsLeft = 2;
  scene.qi = 3;
  scene.assists = { ownThrows: 1, inRuleExtras: 0 } as RoundAssists;
  scene.showExtraThrow = vi.fn();
  const state = { ...roundState(scene.L.start), bonusKind: 'ice' as const, throwsLeft: 1 };
  const extraThrow = grantExtraThrow(state, 'rainbow');
  scene.consumeExtraThrow({ state, extraThrow } as ReturnType<typeof stepRound>);
  expect(scene.L.queue[1]).toBe('ice');
  expect(scene.cur).toBe('ice');
  expect(scene.throwsLeft).toBe(3);
  expect(scene.throwsTotal).toBe(4);
  expect(scene.assists.inRuleExtras).toBe(1);
  scene.consumeExtraThrow({ state, extraThrow } as ReturnType<typeof stepRound>);
  expect(scene.assists.inRuleExtras).toBe(1);
});

import { defaultProfile } from '../src/meta/profile';
import { settleHomeworldRound } from '../src/meta/roundSettlement';
import * as wonderPackage from '../src/meta/wonder';

it('passes the scene assist record and judged score to the Wonder stub through settlement evidence', () => {
  const p = defaultProfile(0);
  const spy = vi.spyOn(wonderPackage, 'recordWonder');
  const assists = {
    continues: 0,
    powerBooster: false,
    aimBooster: false,
    help: false,
    hints: false,
    practice: false,
    gentle: false,
    fullAim: false,
    ownThrows: 7,
    inRuleExtras: 1,
    ignoredExtras: 2,
    judgedScore: 123,
  };
  const evidence = {
    firstArrivals: [],
    improvedSectors: {},
    fusions: 0,
    supernovas: 0,
    settledTroubles: 0,
    settledVent: 0,
    settledVine: 0,
    reactions: {},
    wonder: { n: 67, score: 200, version: 2 as const, assists },
  };
  const round = {
    mode: 'campaign' as const,
    roundKey: 'm15-contract',
    planetKey: 'campaign:PP-67',
    planet: newPlanet(),
    won: true,
    writesProgress: true,
    stars: 3,
    difficulty: 'normal' as const,
    newStars: 0,
    buddySpecies: null,
    at: 0,
    steps: [evidence],
  };
  try {
    settleHomeworldRound(p, round);
    expect(spy).toHaveBeenCalledWith(p, 67, 123, 2, assists);
    expect(p.wonder).toEqual([]);
    spy.mockClear();
    settleHomeworldRound(p, { ...round, mode: 'daily' });
    expect(spy).not.toHaveBeenCalled();
    settleHomeworldRound(p, {
      ...round,
      steps: [{ ...evidence, wonder: { ...evidence.wonder, assists: { ...assists, judgedScore: undefined } } }],
    });
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});

it('never reports a Lab Guard for a Rain Cloud Supernova settling a pebble', () => {
  const state = roundState(newPlanet(), true, [{ id: 'pebble', source: 0 }]);
  state.nova.charge = state.charge = 12;
  const res = stepRound(
    state,
    { kind: 'storm', sector: 0, nova: true },
    { ...NO_MODIFIERS, lab: { storm: 4 } },
    rulesForLevel(60, 'campaign', 60, 2),
  );
  expect(res.troubleEvents.some((e) => e.id === 'pebble' && e.kind === 'settled')).toBe(true);
  expect(res.labEvents.some((e) => e.type === 'guard' && e.trouble === 'pebble')).toBe(false);
});

it('deals a fixed bonus to an Extra Throw mote before Rainbow has debuted', () => {
  const stub = vi
    .spyOn(motePackage, 'moteOverlay')
    .mockImplementation((L) => ({ ...L, motes: [{ kind: 'throw', x: 0, y: -1.4, r: 0.1 }] }));
  try {
    const L = makeLevel(56, 'PP', { rulesVersion: 2, salt: 87653 });
    expect(rulesForLevel(56, 'campaign', 56, 2).reactions).not.toContain('rainbow');
    expect(L.bonusKind).toBeTruthy();
    expect(L.motes?.[0].kind).toBe('throw');
  } finally {
    stub.mockRestore();
  }
});

it('restores the extra slot, remaining Wide Shot, collected mote and assist evidence together', () => {
  const scene = Object.create(LevelScene.prototype) as LevelScene;
  scene.L = makeLevel(67, 'PP', { rulesVersion: 2 });
  scene.L.bonusKind = 'sun';
  scene.assists = { ownThrows: scene.L.throws, inRuleExtras: 0 } as RoundAssists;
  const state = {
    ...roundState(scene.L.start),
    extraUsed: true,
    extraSource: 'mote' as const,
    extraAt: 9,
    wideNext: 1,
    motesTaken: [0],
    assists: { ...scene.assists, inRuleExtras: 1, help: true },
  };
  scene.restoreRoundHooks(restoreRound(serializeRound(state, 2))!);
  expect(scene.extraUsed).toBe(true);
  expect(scene.bonusQueued).toBe(true);
  expect(scene.L.queue[9]).toBe('sun');
  expect(scene.extraSource).toBe('mote');
  expect(scene.wideNext).toBe(1);
  expect(scene.collectedMotes).toEqual([0]);
  expect(scene.assists.help).toBe(true);
});

it('distinguishes sector-model catches from physical empty contacts, including a catch before a miss', () => {
  const row = TROUBLE_BEHAVIOUR.pebble;
  const clear = row.clear;
  row.clear = (c) => (c.action.pickups === undefined ? c.landed : c.action.pickups.some((p) => p.kind === 'pebble'));
  try {
    const state = roundState(newPlanet(), true, [{ id: 'pebble', source: 0 }]);
    const rules = rulesForLevel(60, 'campaign', 60, 2);
    expect(stepRound(state, { kind: 'rock', sector: 0, pickups: [] }, undefined, rules).state.troubles[0].settled).toBe(false);
    expect(stepRound(state, { kind: 'rock', sector: 0 }, undefined, rules).state.troubles[0].settled).toBe(true);
    expect(
      stepRound(state, { kind: 'rock', sector: 0, outcome: 'miss', pickups: [{ kind: 'pebble', x: 0, y: 0, r: 1 }] }, undefined, rules)
        .state.troubles[0].settled,
    ).toBe(true);
  } finally {
    row.clear = clear;
  }
});

it('uses the widened Rain Cloud footprint for the Rinse guard and its preview', () => {
  const state = roundState(newPlanet(), true, [{ id: 'vine', source: 10 }]);
  state.troubles[0].tangled = [4];
  const mods = { ...NO_MODIFIERS, lab: { storm: 4 } };
  const rules = rulesForLevel(67, 'campaign', 67, 2);
  expect(stepRound(state, { kind: 'storm', sector: 0 }, mods, rules).state.troubles[0].settled).toBe(false);
  const wide = { ...state, wideNext: 1 };
  const action = { kind: 'storm' as const, sector: 0 };
  const step = stepRound(wide, action, mods, rules);
  expect(step.state.troubles[0].settled).toBe(true);
  expect(previewStep(wide, action, mods, rules)).toEqual(step);
});

it('backfills v2 pebble cycle fields and keeps fractional reach out of a resumed footprint', () => {
  const state = roundState(newPlanet(), true, [{ id: 'pebble', source: 5 }]);
  delete state.troubles[0].target;
  delete state.troubles[0].count;
  state.wideNext = 0.5;
  const restored = restoreRound(serializeRound(state, 2))!;
  expect(restored.troubles[0].count).toBe(0);
  expect(restored.troubles[0].target).toBe(5);
  expect(restored.wideNext).toBe(0);
});

it('closes judging after a resolved miss or an early finish and never includes later ignored throws', () => {
  const scene = Object.create(LevelScene.prototype) as LevelScene;
  scene.assists = { ownThrows: 7, inRuleExtras: 1, ignoredExtras: 2 } as RoundAssists;
  scene.throwsUsed = 7;
  scene.score = 123;
  scene.closeWonderBudget();
  expect(scene.assists.judgedScore).toBeUndefined();
  scene.throwsUsed = 8;
  scene.closeWonderBudget();
  expect(scene.assists.judgedScore).toBe(123);
  scene.score = 999;
  scene.throwsUsed = 9;
  scene.closeWonderBudget();
  expect(scene.assists.judgedScore).toBe(123);
  delete scene.assists.judgedScore;
  scene.throwsUsed = 3;
  scene.score = 130;
  scene.closeWonderBudget(true);
  expect(scene.assists.judgedScore).toBe(130);
});
