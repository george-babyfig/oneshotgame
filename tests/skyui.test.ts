import { describe, expect, it } from 'vitest';
import { fly, flyFull, sceneGeometry, STAR_SLING, type FlightWorld } from '../src/core/flight';
import { skyFor } from '../src/core/sky';
import { NO_MODIFIERS } from '../src/core/modifiers';
import { roundState } from '../src/core/round';
import { newPlanet } from '../src/core/world';
import { defaultProfile, readInterruptedRound, saveInterruptedRound, type RoundCheckpoint } from '../src/meta/profile';
import { bonkRefund, needsBonkBadge, restoredSkyState, rockAfterBonk, surpriseBonk } from '../src/ui/feel';

const geo = sceneGeometry(320, 568, 1);
const sky = skyFor(33, 'rocks', 'PP-33', 'normal');
const world: FlightWorld = {
  cx: geo.cx,
  cy: geo.cy,
  radius: geo.R,
  surface: Array(24).fill(geo.R * 0.94),
  rotation: 0,
  spin: 0.4,
  twist: 'rocks',
  wind: 170,
  width: geo.width,
  height: geo.height,
  launcherY: geo.launcherY,
  sky,
  skyState: { brokenRocks: [] },
};

describe('sky UI rules', () => {
  it('uses the completed flight for the bonk badge, including contact beyond the visible dots', () => {
    let bonk = null as ReturnType<typeof flyFull> | null;
    for (let vx = -850; vx <= 850 && !bonk; vx += 85) {
      for (let vy = -900; vy <= -360 && !bonk; vy += 90) {
        const path = flyFull(STAR_SLING, { ...geo.launch, vx, vy, elapsed: 0 }, world, 0);
        if (needsBonkBadge(path.hit)) bonk = path;
      }
    }
    expect(bonk?.hit?.kind).toBe('bonk');
    expect(needsBonkBadge(bonk?.hit ?? null)).toBe(true);
    const clear = flyFull(STAR_SLING, { ...geo.launch, vx: 0, vy: 0, elapsed: 0 }, { ...world, sky: undefined }, 0);
    expect(needsBonkBadge(clear.hit)).toBe(false);
  });

  it('returns the first teaching bonk once and every Gentle bonk', () => {
    expect(bonkRefund(false, true, false)).toEqual({ refund: true, practiceUsed: true });
    expect(bonkRefund(false, true, true)).toEqual({ refund: false, practiceUsed: true });
    expect(bonkRefund(false, false, false)).toEqual({ refund: false, practiceUsed: false });
    expect(bonkRefund(true, false, false)).toEqual({ refund: true, practiceUsed: false });
    const state = { brokenRocks: [] };
    expect(rockAfterBonk(state, 1, true)).toBe(state);
    expect(rockAfterBonk(state, 1, false).brokenRocks).toEqual([1]);
  });

  it('round-trips a broken rock and practice bonk; old saves start with an empty sky', () => {
    const p = defaultProfile(0);
    p.level = 33;
    const checkpoint = {
      n: 33,
      state: roundState(newPlanet(() => ({ life: 0 }))),
      modifiers: NO_MODIFIERS,
      throwsLeft: 5,
      throwsUsed: 2,
      throwsTotal: 7,
      qi: 3,
      cur: 'rock',
      next: 'ice',
      score: 20,
      shownScore: 20,
      starsGot: 0,
      rot: 0.4,
      time: 12,
      timeLeft: 0,
      bossHp: 0,
      shot: null,
      skyState: { brokenRocks: [1] },
      practiceBonkUsed: true,
    } as RoundCheckpoint & { skyState: { brokenRocks: number[] }; practiceBonkUsed: boolean };
    saveInterruptedRound(p, checkpoint);
    const restored = readInterruptedRound(p) as typeof checkpoint;
    expect(restoredSkyState(restored.skyState)).toEqual({ brokenRocks: [1] });
    expect(restored.practiceBonkUsed).toBe(true);
    delete (checkpoint as Partial<typeof checkpoint>).skyState;
    delete (checkpoint as Partial<typeof checkpoint>).practiceBonkUsed;
    saveInterruptedRound(p, checkpoint);
    const old = readInterruptedRound(p) as typeof checkpoint;
    expect(restoredSkyState(old.skyState)).toEqual({ brokenRocks: [] });
  });

  it('keeps the scene surprise count at zero over scripted fixed-step throws', () => {
    let count = 0;
    for (const vx of [-650, -325, 0, 325, 650]) {
      for (const vy of [-850, -650, -450]) {
        const launch = { ...geo.launch, vx, vy, elapsed: 0 };
        const predicted = flyFull(STAR_SLING, launch, world, 0);
        let state = launch;
        let hit = null as ReturnType<typeof fly>['hit'];
        for (let frame = 0; frame < 360 && !hit; frame++) {
          const step = fly(STAR_SLING, state, world, 0, 1 / 60);
          state = step.state;
          hit = step.hit;
        }
        if (surpriseBonk(needsBonkBadge(predicted.hit), hit)) count++;
        expect(hit?.kind).toBe(predicted.hit?.kind);
      }
    }
    expect(count).toBe(0);
  });

  it('keeps bubble bounce history across frame-sized flight calls', () => {
    const bubble = skyFor(41, 'bubble', 'PP-41', 'normal');
    const bubbleWorld = { ...world, twist: 'bubble', sky: bubble };
    let chosen: { vx: number; vy: number; t0: number } | null = null;
    for (let t = 0; t < 8 && !chosen; t++) {
      for (let vx = -850; vx <= 850 && !chosen; vx += 85) {
        for (let vy = -900; vy <= -360 && !chosen; vy += 90) {
          if (flyFull(STAR_SLING, { ...geo.launch, vx, vy, elapsed: 0 }, bubbleWorld, t * 0.4).bounces.length)
            chosen = { vx, vy, t0: t * 0.4 };
        }
      }
    }
    expect(chosen).not.toBeNull();
    if (!chosen) return;
    const launch = { ...geo.launch, vx: chosen.vx, vy: chosen.vy, elapsed: 0 };
    const full = flyFull(STAR_SLING, launch, bubbleWorld, chosen.t0);
    let state = launch;
    let hit = null as ReturnType<typeof fly>['hit'];
    let bounces = 0;
    for (let frame = 0; frame < 360 && !hit; frame++) {
      const step = fly(STAR_SLING, state, bubbleWorld, chosen.t0, 1 / 60);
      state = step.state;
      hit = step.hit;
      bounces += step.bounces.length;
    }
    expect(hit?.kind).toBe(full.hit?.kind);
    expect(bounces).toBe(full.bounces.length);
  });
});
