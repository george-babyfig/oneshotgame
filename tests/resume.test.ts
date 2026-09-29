import { describe, expect, it } from 'vitest';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { roundState } from '../src/core/round';
import { newPlanet } from '../src/core/world';
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
  it('survives a profile migration with the same planet, throws, score, and queue', () => {
    const p = defaultProfile(0);
    p.level = 3;
    const before = checkpoint();
    saveInterruptedRound(p, before);
    const reopened = migrate(JSON.parse(JSON.stringify(p)));
    expect(readInterruptedRound(reopened)).toEqual(before);
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
