import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import { LANDMARKS } from '../src/meta/tuning';
import { checkMail, letterOf } from '../src/meta/inbox';
import { titlesOwned } from '../src/meta/passport';
import { eligibleStepEvidence, type StepResult } from '../src/core/round';
import {
  activeLandmark,
  finishLandmark,
  landmarkFinishStatus,
  landmarkOpen,
  landmarkStageProgress,
  landmarkState,
  lintLandmarkTeaching,
  recordLandmarkRound,
  refreshLandmarkSnapshots,
  type LandmarkRoundEvent,
} from '../src/meta/landmarks';

function event(key: string, patch: Partial<LandmarkRoundEvent> = {}): LandmarkRoundEvent {
  return {
    mode: 'campaign',
    roundKey: key,
    planetKey: `planet:${key}`,
    at: 1,
    won: true,
    stars: 3,
    difficulty: 'normal',
    newStars: 0,
    firstArrivals: [],
    improvedSectors: {},
    fusions: 0,
    supernovas: 0,
    settledTroubles: 0,
    ...patch,
  };
}

describe('Landmark content and ledger', () => {
  it('extracts only first-arrival and new-best land evidence from a step', () => {
    const step = {
      state: { planet: { sectors: [{ biome: 'meadow' }, { biome: 'forest' }] } },
      firstArrivals: ['mossbun'],
      newRegionBests: [0],
      reactions: [{ id: 'steam', at: 0, partner: 1, sectors: [0] }],
      novaFired: true,
      troubleEvents: [{ id: 'vent', kind: 'settled', sector: 1 }],
    } as unknown as StepResult;
    expect(eligibleStepEvidence(step)).toMatchObject({
      firstArrivals: ['mossbun'],
      improvedSectors: { meadow: 1 },
      fusions: 1,
      supernovas: 1,
      settledTroubles: 1,
      settledVent: 1,
      settledVine: 0,
      reactions: { steam: 1 },
    });
  });

  it('offers five permanent four-stage sites with safe deliveries and taught routes', () => {
    expect(LANDMARKS).toHaveLength(5);
    for (const site of LANDMARKS) {
      expect(site.stages).toHaveLength(3);
      expect(site.stages.every((stage) => stage.routes.length >= 2)).toBe(true);
      for (const stage of site.stages)
        for (const route of stage.routes) {
          expect(route.label.trim(), `${site.id}: empty route label`).not.toBe('');
          expect(stage.ask.toLowerCase(), `${site.id}: ask hides ${route.label}`).toContain(route.label.toLowerCase());
        }
      expect(Object.keys(site.delivery).every((mat) => ['leaf', 'dew', 'stone'].includes(mat))).toBe(true);
    }
    expect(lintLandmarkTeaching()).toEqual([]);
  });

  it('ignores a replay key even when its evidence would advance the next stage', () => {
    const p = defaultProfile();
    p.level = 30;
    recordLandmarkRound(p, event('same', { improvedSectors: { meadow: 12 } }));
    const before = [p.dust, p.gems];
    recordLandmarkRound(p, event('same', { firstArrivals: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }));
    expect(landmarkStageProgress(p, 'sprout_garden').stage).toBe(1);
    expect(landmarkStageProgress(p, 'sprout_garden').routes[0].done).toBe(0);
    expect([p.dust, p.gems]).toEqual(before);
  });

  it('counts distinct arrivals across rounds and cannot farm a per-planet feat', () => {
    const p = defaultProfile();
    p.level = 30;
    recordLandmarkRound(p, event('grow', { improvedSectors: { meadow: 12 } }));
    recordLandmarkRound(p, event('arrive-1', { firstArrivals: ['a', 'b', 'c', 'd'] }));
    recordLandmarkRound(p, event('arrive-2', { firstArrivals: ['a', 'b', 'c', 'e', 'f', 'g'] }));
    expect(landmarkStageProgress(p, 'sprout_garden').routes[0].done).toBe(7);
    recordLandmarkRound(p, event('arrive-3', { firstArrivals: ['h'] }));
    expect(landmarkState(p, 'sprout_garden').stage).toBe(2);
    recordLandmarkRound(p, event('feat-1', { planetKey: 'campaign:31', reactions: { wildflowers: 2 } }));
    recordLandmarkRound(p, event('feat-2', { planetKey: 'campaign:31', reactions: { wildflowers: 2 } }));
    expect(landmarkStageProgress(p, 'sprout_garden').routes[0].done).toBe(2);
  });

  it('starts the different-creature count when its stage opens', () => {
    const p = defaultProfile();
    p.level = 30;
    recordLandmarkRound(p, event('grow-and-arrive', { improvedSectors: { meadow: 12 }, firstArrivals: ['otter'] }));
    expect(p.home.landmarks.sprout_garden.stage).toBe(1);
    recordLandmarkRound(p, event('arrive-again', { firstArrivals: ['otter'] }));
    expect(p.home.landmarks.sprout_garden.progress[2]).toBe(1);
  });

  it('credits only each per-planet feat increase, including after a zero win and in Zen', () => {
    const p = defaultProfile();
    p.level = 45;
    p.home.level = 2;
    p.home.landmarks.sprout_garden.stage = 4;
    p.home.landmarks.skyglass.stage = 1;
    recordLandmarkRound(p, event('zero', { planetKey: 'campaign:40', fusions: 0 }));
    recordLandmarkRound(p, event('better', { planetKey: 'campaign:40', fusions: 3 }));
    recordLandmarkRound(p, event('same', { planetKey: 'campaign:40', fusions: 3 }));
    expect(p.home.landmarks.skyglass.progress[3]).toBe(3);
    recordLandmarkRound(p, event('zen-one', { mode: 'zen', planetKey: 'zen:ZEN-20', fusions: 1 }));
    recordLandmarkRound(p, event('zen-two', { mode: 'zen', planetKey: 'zen:ZEN-20', fusions: 2 }));
    expect(p.home.landmarks.skyglass.progress[3]).toBe(5);
  });

  it('keeps old Pier progress while applying the same per-planet best rule to new rounds', () => {
    const p = defaultProfile();
    p.level = 80;
    p.home.level = 4;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) p.home.landmarks[id].stage = 4;
    p.cometPier.stage = 2;
    p.cometPier.fusions = 4;
    for (const [key, fusions] of [
      ['zero', 0],
      ['better', 3],
      ['same', 3],
      ['best', 5],
    ] as const)
      recordLandmarkRound(p, event(key, { planetKey: 'campaign:40', fusions }));
    expect(p.cometPier.fusions).toBe(9);
    expect(p.home.landmarks.comet_pier.progress[4]).toBe(9);
    const troubles = defaultProfile();
    troubles.level = 80;
    troubles.home.level = 4;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) troubles.home.landmarks[id].stage = 4;
    troubles.cometPier.stage = 1;
    troubles.cometPier.troubles = 2;
    recordLandmarkRound(troubles, event('trouble-zero', { planetKey: 'campaign:41' }));
    recordLandmarkRound(troubles, event('trouble-better', { planetKey: 'campaign:41', settledTroubles: 3 }));
    recordLandmarkRound(troubles, event('trouble-same', { planetKey: 'campaign:41', settledTroubles: 3 }));
    recordLandmarkRound(troubles, event('trouble-best', { planetKey: 'campaign:41', settledTroubles: 5 }));
    expect(troubles.cometPier.troubles).toBe(7);
  });

  it('matches the Skyglass different-creature ask and detects a dominated Atlas route', () => {
    const skyglass = LANDMARKS.find((site) => site.id === 'skyglass')!;
    expect(skyglass.stages[0].ask).toContain('12 different creatures');
    expect(skyglass.stages[0].routes[1].label).toBe('different creatures');
    const beacon = LANDMARKS.find((site) => site.id === 'keepers_beacon')!;
    const bundle = beacon.stages[2].routes[1] as { target: number };
    const original = bundle.target;
    try {
      bundle.target = 12;
      expect(lintLandmarkTeaching()).toContain('keepers_beacon:3:bundle route dominated or unreachable');
    } finally {
      bundle.target = original;
    }
    expect(lintLandmarkTeaching()).toEqual([]);
  });

  it('counts remembered friends sent home in both Beacon friendship routes', () => {
    const p = defaultProfile();
    p.level = 80;
    p.home.level = 5;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) p.home.landmarks[id].stage = 4;
    p.cometPier.stage = 4;
    p.home.landmarks.keepers_beacon.stage = 1;
    p.home.friends.otter = { fp: 100, lastReq: 0, rewarded: 0 };
    p.home.friends.owl = { fp: 8, lastReq: 0, rewarded: 0 };
    refreshLandmarkSnapshots(p);
    expect(p.home.landmarks.keepers_beacon.progress[2]).toBe(1);
    expect(p.home.landmarks.keepers_beacon.progress[3]).toBe(2);
    expect(p.home.landmarks.keepers_beacon.stage).toBe(2);
  });

  it('refreshes already met Beacon snapshots once and keeps read progress pure', () => {
    const p = defaultProfile();
    p.level = 30;
    p.home.level = 5;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge', 'comet_pier'] as const) p.home.landmarks[id].stage = 4;
    p.cometPier.stage = 4;
    p.home.landmarks.keepers_beacon.stage = 1;
    p.home.residents.push({ species: 'otter', fp: 100, lastReq: 0, rewarded: 0 });
    const before = p.gems;
    expect(landmarkStageProgress(p, 'keepers_beacon').stage).toBe(1);
    expect(p.gems).toBe(before);
    expect(refreshLandmarkSnapshots(p).earned).toMatchObject([{ gems: 20 }]);
    expect(p.gems - before).toBe(20);
    expect(p.home.seen.celebrations).toContain('keepers_beacon:stage:2');
    expect(refreshLandmarkSnapshots(p).earned).toEqual([]);
    expect(landmarkStageProgress(p, 'keepers_beacon').stage).toBe(2);
  });

  it('counts a Beacon Rain Garden only when it beats that planet’s stage best', () => {
    const p = defaultProfile();
    p.level = 30;
    p.home.level = 5;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) p.home.landmarks[id].stage = 4;
    p.cometPier.stage = 4;
    p.seen = ['otter', 'owl'];
    recordLandmarkRound(p, event('beacon-1', { reactions: { rainGarden: 1 } }));
    expect(landmarkStageProgress(p, 'keepers_beacon').routes[0].done).toBe(1);
    recordLandmarkRound(p, event('beacon-2', { planetKey: 'planet:beacon-1', reactions: { rainGarden: 1 } }));
    expect(landmarkStageProgress(p, 'keepers_beacon').routes[0].done).toBe(1);
  });

  it('does not recount a Hard planet from the pre-M11.5 Pier ledger', () => {
    const p = defaultProfile();
    p.level = 45;
    p.home.level = 4;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) p.home.landmarks[id].stage = 4;
    p.cometPier.hardPlanets = ['campaign:PP-41', 'campaign:PP-42'];
    p.cometPier.hardWins = 2;
    const before = p.dust;
    recordLandmarkRound(p, event('pier-replay', { planetKey: 'campaign:PP-41', difficulty: 'hard' }));
    expect(p.cometPier.hardWins).toBe(2);
    expect(p.dust).toBe(before);
  });
  it('delivers a legacy Pier finish letter only after earlier Landmarks, without a late build invitation', () => {
    const p = defaultProfile();
    p.level = 45;
    p.home.level = 4;
    p.cometPier.stage = 4;
    checkMail(p);
    expect(p.mail.some((mail) => mail.kind === 'landmark-finish-comet_pier')).toBe(false);
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) p.home.landmarks[id].stage = 4;
    checkMail(p);
    expect(p.mail.some((mail) => mail.kind === 'landmark-open-comet_pier')).toBe(false);
    const finish = p.mail.find((mail) => mail.kind === 'landmark-finish-comet_pier');
    expect(finish).toBeDefined();
    expect(letterOf(finish!)?.body).toContain('Launch Bay');
  });
  it('gives Skyglass a title distinct from the starting rank', () => {
    const p = defaultProfile();
    p.home.landmarks.skyglass.stage = 4;
    const titles = titlesOwned(p).map((item) => item.text);
    expect(titles).toContain('Sky Finder');
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('shows the signpost at planet 29 and opens the first stage after it', () => {
    const p = defaultProfile();
    p.level = 29;
    expect(landmarkOpen(p, 'sprout_garden')).toBe(false);
    p.level = 30;
    expect(activeLandmark(p)?.id).toBe('sprout_garden');
  });

  it('counts new bests and first arrivals once, pays each stage once, and requires confirmed delivery', () => {
    const p = defaultProfile();
    p.level = 40;
    p.mats.leaf = 20;
    expect(recordLandmarkRound(p, event('practice', { mode: 'practice', improvedSectors: { meadow: 12 } })).earned).toEqual([]);
    expect(recordLandmarkRound(p, event('one', { improvedSectors: { meadow: 12 } })).earned).toEqual([
      { id: 'sprout_garden:stage:1', dust: 100 },
    ]);
    const dust = p.dust;
    expect(recordLandmarkRound(p, event('one', { improvedSectors: { meadow: 12 } })).earned).toEqual([]);
    expect(p.dust).toBe(dust);
    expect(landmarkStageProgress(p, 'sprout_garden').stage).toBe(1);
    recordLandmarkRound(p, event('two', { firstArrivals: ['a', 'b', 'c', 'd'] }));
    recordLandmarkRound(p, event('three', { firstArrivals: ['a', 'b', 'e', 'f', 'g', 'h'] }));
    expect(landmarkStageProgress(p, 'sprout_garden').stage).toBe(2);
    recordLandmarkRound(p, event('four', { reactions: { rainGarden: 3 }, fusions: 3 }));
    expect(landmarkFinishStatus(p, 'sprout_garden')).toBe('ready');
    expect(p.mats.leaf).toBe(20);
    expect(finishLandmark(p, 'sprout_garden', 10)).toBe('ok');
    expect(p.mats.leaf).toBe(5);
    expect(finishLandmark(p, 'sprout_garden', 11)).toBe('finished');
    expect(p.home.landmarks.sprout_garden.rewarded).toHaveLength(4);
  });

  it('cannot farm the same planet and biome with a new round key', () => {
    const p = defaultProfile();
    p.level = 30;
    recordLandmarkRound(p, event('first', { planetKey: 'campaign:30', improvedSectors: { meadow: 5 } }));
    recordLandmarkRound(p, event('replay', { planetKey: 'campaign:30', improvedSectors: { meadow: 5 } }));
    expect(landmarkStageProgress(p, 'sprout_garden').routes[0].done).toBe(5);
    recordLandmarkRound(p, event('better', { planetKey: 'campaign:30', improvedSectors: { meadow: 7 } }));
    expect(landmarkStageProgress(p, 'sprout_garden').routes[0].done).toBe(7);
  });

  it('keeps the legacy Pier ledger while accepting its equal-effort route', () => {
    const p = defaultProfile();
    p.level = 80;
    p.home.level = 4;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) p.home.landmarks[id].stage = 4;
    p.cometPier.stage = 1;
    const gems = p.gems;
    recordLandmarkRound(p, event('pier-one', { fusions: 4 }));
    recordLandmarkRound(p, event('pier-two', { fusions: 4 }));
    expect(p.cometPier.stage).toBe(2);
    expect(p.gems - gems).toBe(15);
    recordLandmarkRound(p, event('pier-two', { fusions: 4 }));
    expect(p.gems - gems).toBe(15);
  });

  it('preserves Pier paid stages and Zip through save migration', () => {
    const raw = defaultProfile() as unknown as Record<string, unknown>;
    const pier = raw.cometPier as Record<string, unknown>;
    pier.stage = 4;
    pier.hardWins = 3;
    pier.troubles = 8;
    pier.fusions = 10;
    const p = migrate(raw);
    const gems = p.gems;
    const dust = p.dust;
    expect(landmarkState(p, 'comet_pier').stage).toBe(4);
    expect(landmarkState(p, 'comet_pier').rewarded).toHaveLength(4);
    expect(finishLandmark(p, 'comet_pier')).toBe('finished');
    expect([p.gems, p.dust]).toEqual([gems, dust]);
  });
});
