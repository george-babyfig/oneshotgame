import { describe, expect, it } from 'vitest';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { makeLevel } from '../src/core/levels';
import { roundState, stepRound } from '../src/core/round';
import { newPlanet } from '../src/core/world';
import { restoreSceneTroubles } from '../src/ui/app';
import { remixLevel } from '../src/meta/remix';
import {
  clearInterruptedRound,
  defaultProfile,
  migrate,
  readInterruptedRound,
  saveInterruptedRound,
  type RoundCheckpoint,
} from '../src/meta/profile';

function checkpoint(): RoundCheckpoint {
  const state = roundState(newPlanet((i) => ({ life: i === 4 ? 2 : 0 })));
  state.nova.charge = state.charge = 9;
  state.bonus = 7;
  state.queueIndex = 5;
  state.combo = { links: 2, rest: true, best: 3 };
  state.comboCharge = 5;
  return {
    n: 3,
    state,
    modifiers: NO_MODIFIERS,
    throwsLeft: 4,
    throwsUsed: 3,
    throwsTotal: 7,
    qi: 5,
    cur: 'seed',
    next: 'ice',
    score: 46,
    shownScore: 44,
    starsGot: 1,
    rot: 0.72,
    time: 12.3,
    timeLeft: 0,
    bossHp: 2,
    shot: { kind: 'rock', x: 84, y: 190, vx: 7, vy: -4, t: 0.2, carry: 0, t0: 11.2, rot0: 0.7, trail: [{ x: 80, y: 194 }] },
    comboIconsCurrent: ['steam', 'glacier'],
    comboIconsBest: ['steam', 'rainGarden', 'glacier'],
    reactionEvents: ['steam', 'rainGarden', 'glacier'],
    reactionsSeen: ['steam', 'rainGarden', 'glacier'],
    comboEvents: [{ links: 2, reaction: 'steam', superFusion: false }],
  };
}

describe('interrupted campaign rounds', () => {
  it('persists the dedupe key and Landmark step summaries through a save restore', () => {
    const p = defaultProfile(0);
    p.level = 30;
    const c = checkpoint();
    c.n = 30;
    c.roundKey = 'same-winning-round';
    c.landmarkSteps = [
      {
        firstArrivals: ['otter'],
        improvedSectors: { meadow: 2 },
        fusions: 1,
        supernovas: 0,
        settledTroubles: 0,
        settledVent: 0,
        settledVine: 0,
        reactions: { steam: 1 },
      },
    ];
    saveInterruptedRound(p, c);
    const loaded = migrate(JSON.parse(JSON.stringify(p)));
    expect(readInterruptedRound(loaded)).toMatchObject({ roundKey: c.roundKey, landmarkSteps: c.landmarkSteps });
  });
  it('rejects an old Voyage checkpoint before it can become a campaign win', () => {
    const p = defaultProfile(0);
    p.level = 40;
    const c = checkpoint();
    c.n = 38;
    c.seedPrefix = 'VOY-2026-W41-1';
    saveInterruptedRound(p, c);
    expect(readInterruptedRound(p)).toBeNull();
  });
  it('discards a hidden-launcher checkpoint while retaining its saved selection and tune', () => {
    const p = defaultProfile(0);
    p.level = 70;
    p.chapters.push(5);
    p.launcher.selected = 'pinpoint';
    p.launcher.tunes.pinpoint = 3;
    const c = checkpoint();
    c.n = 53;
    c.modifiers = { ...NO_MODIFIERS, launcher: { id: 'pinpoint', tune: 3 } };
    saveInterruptedRound(p, c);
    const loaded = migrate(JSON.parse(JSON.stringify(p)));
    expect(loaded.launcher.selected).toBe('pinpoint');
    expect(loaded.launcher.tunes.pinpoint).toBe(3);
    expect(readInterruptedRound(loaded)).toBeNull();
  });
  it.each([61, 80, 120])('restores old unsalted PP%d only on its reviewed fingerprint and keeps it after re-save', (n) => {
    const p = defaultProfile(0);
    p.level = n;
    const c = checkpoint();
    c.n = n;
    c.generationProfile = 'reviewed-v1';
    saveInterruptedRound(p, c);
    const historical = JSON.parse(p.savedRound!);
    delete historical.scene.generationProfile;
    p.savedRound = JSON.stringify(historical);
    const reopened = migrate(JSON.parse(JSON.stringify(p)));
    const restored = readInterruptedRound(reopened);
    expect(restored?.generationProfile).toBe('reviewed-v1');
    expect(makeLevel(n, 'PP', { profile: restored?.generationProfile }).seed).not.toBe(makeLevel(n).seed);
    saveInterruptedRound(reopened, restored!);
    const savedAgain = JSON.parse(reopened.savedRound!);
    expect(savedAgain.fingerprint).toBe(historical.fingerprint);
    expect(savedAgain.scene.generationProfile).toBe('reviewed-v1');
    expect(readInterruptedRound(reopened)?.generationProfile).toBe('reviewed-v1');

    historical.fingerprint = 'different-level';
    reopened.savedRound = JSON.stringify(historical);
    expect(readInterruptedRound(reopened)).toBeNull();
  });

  it('keeps a new raw-v2 PP61-120 checkpoint on its encoded salt', () => {
    const p = defaultProfile(0);
    p.level = 80;
    const c = checkpoint();
    c.n = 80;
    c.salt = Number(makeLevel(80).seed.match(/~(\d+)$/)?.[1]);
    expect(c.salt).toBeGreaterThanOrEqual(1_000_000);
    saveInterruptedRound(p, c);
    const fingerprint = JSON.parse(p.savedRound!).fingerprint;
    const restored = readInterruptedRound(p);
    expect(restored?.generationProfile).toBeUndefined();
    expect(makeLevel(80, 'PP', { salt: restored?.salt })).toEqual(makeLevel(80));
    saveInterruptedRound(p, restored!);
    expect(JSON.parse(p.savedRound!).fingerprint).toBe(fingerprint);
  });

  it('does not reinterpret a salted PP61-120 checkpoint as the unsalted legacy campaign', () => {
    const p = defaultProfile(0);
    p.level = 80;
    const c = checkpoint();
    c.n = 80;
    c.salt = 777;
    c.generationProfile = 'reviewed-v1';
    saveInterruptedRound(p, c);
    const historical = JSON.parse(p.savedRound!);
    delete historical.scene.generationProfile;
    p.savedRound = JSON.stringify(historical);
    expect(readInterruptedRound(p)).toBeNull();
  });

  it('preserves a mode-tagged Remix round and validates its RX level', () => {
    const p = defaultProfile(0);
    p.level = 11;
    const c = checkpoint();
    c.n = 1;
    c.mode = 'remix';
    c.seedPrefix = 'RX';
    c.state = roundState(remixLevel(1, p).start);
    saveInterruptedRound(p, c);
    const reopened = migrate(JSON.parse(JSON.stringify(p)));
    expect(readInterruptedRound(reopened)).toEqual(c);
    const saved = JSON.parse(reopened.savedRound!);
    saved.scene.seedPrefix = 'PP';
    reopened.savedRound = JSON.stringify(saved);
    expect(readInterruptedRound(reopened)).toBeNull();
  });
  it('restores a mid-round vent clock, a used Buddy shield, and a settled source into the scene', () => {
    const p = defaultProfile(0);
    p.level = 18;
    const c = checkpoint();
    c.n = 18;
    const planet = newPlanet((i) => (i === 11 ? { land: 1, life: 2 } : {}));
    let state = roundState(planet, true, [
      { id: 'vent', source: 10 },
      { id: 'vent', source: 18 },
    ]);
    state.troubles[0].nextIn = 1;
    state = stepRound(state, { kind: 'rock', sector: 0, outcome: 'miss' }, { ...NO_MODIFIERS, buddyShield: 'fireproof' }).state;
    expect(state.buddyShieldUsed).toBe(true);
    state.troubles[0].nextIn = 1;
    state = stepRound(state, { kind: 'rock', sector: 0, outcome: 'miss' }, { ...NO_MODIFIERS, buddyShield: 'fireproof' }).state;
    state = stepRound(state, { kind: 'ice', sector: 18 }).state;
    expect(state.troubles[0].settled).toBe(false);
    expect(state.troubles[1].settled).toBe(true);
    c.state = state;
    saveInterruptedRound(p, c);
    const restored = readInterruptedRound(p)!.state;
    const scene = { troubles: [], buddyShieldUsed: false, calmUsed: false } as Pick<
      import('../src/ui/game').LevelScene,
      'troubles' | 'buddyShieldUsed' | 'calmUsed'
    >;
    restoreSceneTroubles(scene, restored);
    expect(scene.troubles).toEqual(state.troubles);
    expect(scene.buddyShieldUsed).toBe(true);
    expect(
      stepRound(
        { ...restored, troubles: scene.troubles, buddyShieldUsed: scene.buddyShieldUsed },
        { kind: 'rock', sector: 0, outcome: 'miss' },
        { ...NO_MODIFIERS, buddyShield: 'fireproof' },
      ).state.troubles[0].nextIn,
    ).toBe(1);
  });
  it('survives a profile migration with the same planet, throws, score, and queue', () => {
    const p = defaultProfile(0);
    p.level = 3;
    const before = checkpoint();
    saveInterruptedRound(p, before);
    const reopened = migrate(JSON.parse(JSON.stringify(p)));
    expect(readInterruptedRound(reopened)).toEqual(before);
  });

  it('preserves new form switches and accepts an old checkpoint without them', () => {
    const p = defaultProfile(0);
    p.level = 3;
    const current = checkpoint();
    current.modifiers = { ...NO_MODIFIERS, lab: { rock: 5 }, forms: { rock: true } };
    current.labSteps = [{ kind: 'ice', reactions: [{ id: 'glacier', at: 0, partner: 1, sectors: [0] }], troubleEvents: [] }];
    saveInterruptedRound(p, current);
    expect(readInterruptedRound(p)?.modifiers.forms).toEqual({ rock: true });
    expect(readInterruptedRound(p)?.labSteps).toEqual(current.labSteps);
    const saved = JSON.parse(p.savedRound!);
    delete saved.scene.modifiers.forms;
    delete saved.scene.labSteps;
    const round = JSON.parse(saved.round);
    delete round.state.labMarks;
    saved.round = JSON.stringify(round);
    p.savedRound = JSON.stringify(saved);
    expect(readInterruptedRound(p)?.modifiers.forms).toBeUndefined();
    expect(readInterruptedRound(p)?.labSteps).toBeUndefined();
    expect(readInterruptedRound(p)?.state.labMarks).toEqual({ rock: [], seed: [] });
  });

  it('accepts a checkpoint from before reaction history was saved', () => {
    const p = defaultProfile(0);
    p.level = 3;
    saveInterruptedRound(p, checkpoint());
    const saved = JSON.parse(p.savedRound!);
    for (const field of ['comboIconsCurrent', 'comboIconsBest', 'reactionEvents', 'reactionsSeen', 'comboEvents'])
      delete saved.scene[field];
    p.savedRound = JSON.stringify(saved);
    const restored = readInterruptedRound(p);
    expect(restored?.state.combo).toEqual({ links: 2, rest: true, best: 3 });
    expect(restored?.comboIconsBest).toBeUndefined();
  });

  it('expires after a normal finish or a quit', () => {
    const p = defaultProfile(0);
    p.level = 3;
    saveInterruptedRound(p, checkpoint());
    clearInterruptedRound(p);
    expect(readInterruptedRound(p)).toBeNull();
    saveInterruptedRound(p, checkpoint());
    clearInterruptedRound(p);
    expect(readInterruptedRound(p)).toBeNull();
  });

  it('rejects a changed rules version', () => {
    const p = defaultProfile(0);
    p.level = 3;
    saveInterruptedRound(p, checkpoint());
    const saved = JSON.parse(p.savedRound!);
    const round = JSON.parse(saved.round);
    round.version += 1;
    saved.round = JSON.stringify(round);
    p.savedRound = JSON.stringify(saved);
    expect(readInterruptedRound(p)).toBeNull();
    expect(p.savedRound).toBeUndefined();
  });

  it('rejects a changed level fingerprint and preserves practice help', () => {
    const p = defaultProfile(0);
    p.level = 3;
    const before = { ...checkpoint(), warmup: true, practiceFirstClear: false, practiceGifts: 2 };
    saveInterruptedRound(p, before);
    expect(readInterruptedRound(p)).toEqual(before);
    const saved = JSON.parse(p.savedRound!);
    saved.fingerprint = 'older-level';
    p.savedRound = JSON.stringify(saved);
    expect(readInterruptedRound(p)).toBeNull();
  });
});
