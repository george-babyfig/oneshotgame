import { describe, expect, it, vi } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { roundState, stepRound } from '../src/core/round';
import { newPlanet } from '../src/core/world';
import { defaultProfile, migrate, readInterruptedRound } from '../src/meta/profile';
import { landmarkStepEvidence, settleHomeworldRound } from '../src/meta/roundSettlement';
import { App } from '../src/ui/app';
import type { LevelResult, LevelScene } from '../src/ui/game';

const HOUR = 3_600_000;

function round(mode: Parameters<App['sceneOpts']>[0], practice = false, eligible = true, planet = 18, roundKey?: string) {
  const app = Object.create(App.prototype) as App;
  app.p = defaultProfile();
  app.p.level = planet;
  app.p.home.level = 2;
  app.p.home.plots[0] = {
    type: 'greenhouse',
    lv: 1,
    since: 0,
    greenhouse: { choice: 'scope', winsTowardNext: 5, stored: 0 },
  };
  app.p.home.residents.push({ species: 'otter', fp: 0, lastReq: 0, rewarded: 0 });
  app.p.buddy.species = 'otter';
  app.save = vi.fn();
  const saved = vi.fn((ended: LevelResult) => {
    if (mode === 'campaign') app.p.stars[planet] = Math.max(app.p.stars[planet] ?? 0, ended.stars);
    if (mode === 'voyage') app.p.voyage.stars[0] = Math.max(app.p.voyage.stars[0] ?? 0, ended.stars);
    app.save();
  });
  const opts = app.sceneOpts(mode, { onEnd: saved, practice, homeworldWinEligible: () => eligible, roundKey });
  const level = makeLevel(planet);
  app.scene = { L: level, o: opts, roundLog: { lab: [] } } as unknown as LevelScene;
  const result = {
    level,
    score: 10,
    stars: 1,
    planet: level.start,
    won: true,
    throwsUsed: 1,
    throwsTotal: 6,
    leftover: 5,
  } as LevelResult;
  return { app, opts, result, saved };
}

describe('round-end Homeworld integration', () => {
  it('holds the pre-round species snapshot through discovery and a checkpoint', () => {
    const { app, opts, result } = round('campaign', false, true, 50);
    app.p.home.level = 5;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) app.p.home.landmarks[id].stage = 4;
    app.p.cometPier.stage = 4;
    app.p.seen = ['otter'];
    // Reopen after setup, as the real scene does.
    const live = app.sceneOpts('campaign', { onEnd: (r) => (app.p.stars[50] = r.stars) });
    app.scene!.o = live;
    live.onNewSpecies('owl');
    expect(app.p.seen).toContain('owl');
    expect(live.knownKindsBefore).toEqual(['otter']);
    const planet = structuredClone(result.planet);
    planet.sectors[0].species = 'owl';
    app.scene!.landmarkSteps = [
      {
        firstArrivals: ['owl'],
        improvedSectors: {},
        fusions: 0,
        supernovas: 0,
        settledTroubles: 0,
        settledVent: 0,
        settledVine: 0,
        reactions: { rainGarden: 1 },
      },
    ];
    live.onEnd({ ...result, planet });
    expect(app.p.home.landmarks.keepers_beacon.progress[0]).toBe(1);
    expect(opts.knownKindsBefore).not.toContain('owl');
  });

  it('credits Voyage stars only above the stop record and never credits Zen stars', () => {
    for (const mode of ['voyage', 'zen'] as const) {
      const { app, opts, result } = round(mode, false, true, 40);
      app.p.home.landmarks.sprout_garden.stage = 4;
      app.p.voyage.base = 40;
      app.p.voyage.stars[0] = 3;
      opts.onEnd({ ...result, stars: 3 });
      expect(app.p.home.landmarks.skyglass.progress[0], mode).toBe(0);
    }
    const improvement = round('voyage', false, true, 40);
    improvement.app.p.home.landmarks.sprout_garden.stage = 4;
    improvement.app.p.voyage.base = 40;
    improvement.app.p.voyage.stars[0] = 2;
    improvement.opts.onEnd({ ...improvement.result, stars: 3 });
    expect(improvement.app.p.home.landmarks.skyglass.progress[0]).toBe(1);
  });

  it('does not count a three-star Beacon replay until the planet improves to three stars', () => {
    const { app, opts, result } = round('campaign', false, true, 50);
    app.p.home.level = 5;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) app.p.home.landmarks[id].stage = 4;
    app.p.cometPier.stage = 4;
    app.p.stars[50] = 3;
    opts.onEnd({ ...result, stars: 3 });
    expect(app.p.home.landmarks.keepers_beacon.progress[1]).toBe(0);
    const other = round('campaign', false, true, 51);
    other.app.p = app.p;
    other.app.p.stars[51] = 2;
    other.opts.onEnd({ ...other.result, stars: 3 });
    expect(other.app.p.home.landmarks.keepers_beacon.progress[1]).toBe(1);
  });

  it('counts a sector only once when its final biome advances within one route', () => {
    const p = defaultProfile();
    p.level = 30;
    const startPlanet = structuredClone(makeLevel(30).start);
    for (const sector of startPlanet.sectors.slice(0, 3)) sector.biome = 'barren';
    const planet = structuredClone(startPlanet);
    for (const sector of planet.sectors.slice(0, 3)) sector.biome = 'forest';
    const step = (biome: 'meadow' | 'forest') => ({
      firstArrivals: [],
      improvedSectors: { [biome]: 3 },
      fusions: 0,
      supernovas: 0,
      settledTroubles: 0,
      settledVent: 0,
      settledVine: 0,
      reactions: {},
    });
    settleHomeworldRound(p, {
      mode: 'campaign',
      roundKey: 'sector-chain',
      planetKey: 'campaign:30',
      at: 1,
      planet,
      startPlanet,
      won: true,
      writesProgress: true,
      stars: 1,
      difficulty: 'normal',
      newStars: 1,
      firstPlanetWin: true,
      buddySpecies: null,
      steps: [step('meadow'), step('forest')],
    });
    expect(p.home.landmarks.sprout_garden.progress[0]).toBe(3);
  });

  it('deduplicates real Mountain to Highland steps on the Sky Bridge', () => {
    const p = defaultProfile();
    p.level = 40;
    p.home.level = 3;
    p.home.landmarks.sprout_garden.stage = 4;
    p.home.landmarks.skyglass.stage = 4;
    const startPlanet = newPlanet();
    const mountain = stepRound(roundState(startPlanet), { kind: 'rock', sector: 3 });
    const highland = stepRound(mountain.state, { kind: 'seed', sector: 3 });
    const raw = [mountain, highland].map(landmarkStepEvidence);
    expect((raw[0].improvedSectors.mountain ?? 0) + (raw[1].improvedSectors.highland ?? 0)).toBeGreaterThan(3);
    expect(raw[0].improvedSectorIds?.mountain).toContain(3);
    expect(raw[1].improvedSectorIds?.highland).toContain(3);
    settleHomeworldRound(p, {
      mode: 'campaign',
      roundKey: 'real-sector-chain',
      planetKey: 'campaign:40',
      at: 1,
      planet: highland.state.planet,
      startPlanet,
      won: true,
      writesProgress: true,
      stars: 1,
      difficulty: 'normal',
      newStars: 1,
      firstPlanetWin: true,
      buddySpecies: null,
      steps: raw,
    });
    expect(p.home.landmarks.sky_bridge.progress[0]).toBe(3);
  });
  it('writes the scene key and step evidence into a live checkpoint', () => {
    const app = Object.create(App.prototype) as App;
    app.p = defaultProfile();
    app.p.level = 30;
    app.screen = 'level';
    app.saveNow = vi.fn();
    const level = makeLevel(30);
    const evidence = {
      firstArrivals: ['otter'],
      improvedSectors: { meadow: 2 },
      fusions: 1,
      supernovas: 0,
      settledTroubles: 0,
      settledVent: 0,
      settledVine: 0,
      reactions: { steam: 1 },
    };
    app.scene = {
      L: level,
      o: { roundKey: 'scene-stable-key', knownKindsBefore: ['otter'] },
      ended: false,
      finishing: false,
      roundState: () => roundState(level.start),
      roundModifiers: () => NO_MODIFIERS,
      throwsLeft: 5,
      throwsUsed: 1,
      throwsTotal: 6,
      qi: 1,
      cur: 'seed',
      next: 'rock',
      score: 1,
      shownScore: 1,
      starsGot: 0,
      rot: 0,
      time: 0,
      timeLeft: 0,
      bossHp: 0,
      shot: null,
      landedKinds: [],
      comboIconsCurrent: [],
      comboIconsBest: [],
      reactionEvents: [],
      roundLog: { lab: [] },
      labSteps: [],
      landmarkSteps: [evidence],
      reactionsSeen: new Set(),
      comboEvents: [],
      skyState: { brokenRocks: new Set() },
      ringBroken: false,
    } as unknown as LevelScene;
    (app as unknown as { checkpointRound: () => void }).checkpointRound();
    expect(readInterruptedRound(app.p)).toMatchObject({
      roundKey: 'scene-stable-key',
      knownKindsBefore: ['otter'],
      landmarkSteps: [evidence],
    });
  });
  it('settles live step evidence once with the restored round key', () => {
    const { app, opts, result } = round('campaign', false, true, 30, 'saved-round-key');
    app.scene!.landmarkSteps = [
      {
        firstArrivals: [],
        improvedSectors: { meadow: 12 },
        improvedSectorIds: { meadow: Array.from({ length: 12 }, (_, i) => i) },
        fusions: 0,
        supernovas: 0,
        settledTroubles: 0,
        settledVent: 0,
        settledVine: 0,
        reactions: {},
      },
    ];
    const before = app.p.dust;
    opts.onEnd(result);
    expect(app.p.home.landmarks.sprout_garden.stage).toBe(1);
    expect(app.p.dust - before).toBe(100);
    expect(app.p.home.landmarks.sprout_garden.rounds).toContain('saved-round-key');
    opts.onEnd(result);
    expect(app.p.dust - before).toBe(100);
  });
  it.each(['campaign', 'voyage', 'zen'] as const)('saves one greenhouse and Buddy credit for a %s win', (mode) => {
    const { app, opts, result, saved } = round(mode);
    opts.onEnd(result);
    opts.onEnd(result); // A completed scene can only credit its win once.
    expect(saved).toHaveBeenCalledTimes(2);
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ choice: 'scope', winsTowardNext: 0, stored: 1 });
    expect(app.p.home.residents[0].fp).toBe(1);
    const loaded = migrate(JSON.parse(JSON.stringify(app.p)));
    expect(loaded.home.plots[0]?.greenhouse?.stored).toBe(1);
    expect(loaded.home.residents[0].fp).toBe(1);
  });

  it('speeds an active campaign build once and keeps the result nudge accurate', () => {
    const { app, opts, result } = round('campaign');
    const done = Date.now() + 3_600_000;
    app.p.home.plots[1] = { type: 'lab', kind: 'rock', lv: 1, since: 0, done };
    opts.onEnd(result);
    opts.onEnd(result);
    expect(app.p.home.plots[1]?.done).toBe(done - 600_000);
    expect(app.roundBuildsSpedUp).toBe(true);
  });

  it.each(['daily', 'rush', 'challenge', 'remix'] as const)('does not credit a %s win', (mode) => {
    const { app, opts, result } = round(mode);
    opts.onEnd(result);
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ winsTowardNext: 5, stored: 0 });
    expect(app.p.home.residents[0].fp).toBe(0);
  });

  it.each([
    ['practice', true, { won: true, throwsUsed: 1 }],
    ['loss', false, { won: false, throwsUsed: 1, stars: 0 }],
    ['restart', false, { won: true, throwsUsed: -1 }],
  ] as const)('does not credit a %s round', (_name, practice, fields) => {
    const { app, opts, result } = round('campaign', practice);
    const done = Date.now() + HOUR;
    app.p.home.plots[1] = { type: 'lab', kind: 'rock', lv: 1, since: 0, done };
    opts.onEnd({ ...result, ...fields });
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ winsTowardNext: 5, stored: 0 });
    expect(app.p.home.residents[0].fp).toBe(0);
    expect(app.p.home.plots[1]?.done).toBe(done);
  });

  it('does not credit a stop from a replaced Voyage route', () => {
    const { app, opts, result } = round('voyage', false, false);
    opts.onEnd(result);
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ winsTowardNext: 5, stored: 0 });
    expect(app.p.home.residents[0].fp).toBe(0);
  });
});
