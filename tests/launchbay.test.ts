import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import {
  availability,
  launcherBay,
  recordComboThreePlanet,
  recordLauncherFling,
  recordLauncherRound,
  TUNE_COST,
} from '../src/meta/launchbay';
import {
  advanceCometPier,
  cometPierFinishStatus,
  finishCometPier,
  finishCometPierWithResult,
  recordCometPierStep,
  recordCometPierWin,
} from '../src/meta/landmarks';
import { HABITATS } from '../src/meta/habitats';
import { REACTIONS } from '../src/core/round';
import { applyReward, chapterReward, chestLauncher, openChest, rewardText } from '../src/meta/progression';
import { LAUNCH_ROSTER } from '../src/core/launchers';

function rich() {
  const p = defaultProfile(0);
  p.level = 120;
  p.home.ring = 5;
  p.home.plots[0] = { type: 'launch_bay', lv: 5, since: 0 };
  p.dust = 100_000;
  p.mats = { leaf: 1000, dew: 1000, stone: 1000 };
  return p;
}

describe('Launch Bay ownership', () => {
  it('joins each permanent channel with its arrival planet', () => {
    const p = rich();
    p.level = 30;
    p.chapters.push(3);
    expect(availability(p, 'swoop')).toEqual({ kind: 'waiting-planet', planet: 31 });
    p.level = 31;
    expect(availability(p, 'swoop')).toEqual({ kind: 'owned' });
    expect(availability(p, 'pinpoint')).toMatchObject({ kind: 'waiting-channel', done: 0, total: 1 });
    p.chapters.push(5, 6);
    expect(availability(p, 'pinpoint')).toEqual({ kind: 'waiting-planet', planet: 53 });
    p.level = 62;
    expect(launcherBay.owned(p)).toEqual(['sling', 'swoop']);
    expect(launcherBay.select(p, 'pinpoint')).toBe(false);
  });

  it('retains hidden Combo 3 progress without advancing it during launch play', () => {
    const p = rich();
    recordComboThreePlanet(p, 'daily', 1);
    recordComboThreePlanet(p, 'campaign', 1);
    recordComboThreePlanet(p, 'campaign', 1);
    recordComboThreePlanet(p, 'voyage', 2);
    expect(availability(p, 'sparkler')).toMatchObject({ kind: 'waiting-channel', done: 0, total: 3 });
    recordComboThreePlanet(p, 'zen', 3);
    expect(p.launcher.comboThreePlanets).toEqual([]);
    p.launcher.comboThreePlanets = ['campaign:1', 'voyage:2', 'zen:3'];
    expect(availability(p, 'sparkler')).toEqual({ kind: 'owned' });
    expect(launcherBay.owned(p)).toEqual(['sling']);
    expect(launcherBay.select(p, 'sparkler')).toBe(false);
  });

  it('counts completed habitats without their reward claim', () => {
    const p = rich();
    p.seen = [...new Set(HABITATS.slice(0, 3).flatMap((h) => h.species))];
    expect(p.habitats).toEqual([]);
    expect(availability(p, 'thumper')).toEqual({ kind: 'owned' });
  });

  it('does not select, tune, or advance hidden launcher counters', () => {
    const p = rich();
    p.chapters.push(5, 6);
    p.launcher.comboThreePlanets = ['campaign:37', 'campaign:38', 'campaign:39'];
    for (const id of ['sparkler', 'pinpoint', 'skipper'] as const) {
      expect(availability(p, id)).toEqual({ kind: 'owned' });
      expect(launcherBay.select(p, id)).toBe(false);
      expect(launcherBay.tuneUp(p, id)).toBe('locked');
      recordLauncherFling(p, id);
      recordLauncherRound(p, id);
      expect(p.launcher.flings[id]).toBeUndefined();
      expect(p.launcher.completedRounds[id]).toBeUndefined();
    }
    expect(launcherBay.owned(p)).toEqual(['sling']);
  });

  it('gives neither a launcher nor a tune through paid entitlements', () => {
    const p = rich();
    p.starter = true;
    p.pass = true;
    p.gems = 1e9;
    p.wardrobe.push('l_rail');
    expect(launcherBay.owned(p)).toEqual(['sling']);
    expect(launcherBay.select(p, 'zip')).toBe(false);
    expect(launcherBay.tuneUp(p, 'zip')).toBe('locked');
  });

  it('keeps chapter 5 and 6 rewards without launcher copy', () => {
    const p = rich();
    expect([3, 5, 6].map(chestLauncher)).toEqual(['swoop', null, null]);
    const reward = chapterReward(3, p);
    expect(rewardText(reward)).toContain('🚀 Swoop launcher');
    for (const n of [5, 6]) {
      const chest = chapterReward(n, p);
      expect(chest.launcher).toBeUndefined();
      expect(chest.gems).toBeGreaterThan(0);
      expect(chest.dust).toBeGreaterThan(0);
      expect(chest.boosters).toEqual({ shower: 1, spark: 1, scope: 1 });
      expect(rewardText(chest)).not.toContain('🚀');
    }
    applyReward(p, reward, 'iap');
    expect(availability(p, 'swoop').kind).toBe('waiting-channel');
    expect(openChest(p, 3)).not.toBeNull();
    expect(availability(p, 'swoop')).toEqual({ kind: 'owned' });
    const before = { gems: p.gems, dust: p.dust, shower: p.boosters.shower };
    expect(openChest(p, 5)?.launcher).toBeUndefined();
    expect(openChest(p, 6)?.launcher).toBeUndefined();
    expect(p.gems).toBeGreaterThan(before.gems);
    expect(p.dust).toBeGreaterThan(before.dust);
    expect(p.boosters.shower).toBe(before.shower + 2);
  });
});

describe('Launch Bay tunes', () => {
  it('requires real gameplay flings, Bay caps and both earned resources', () => {
    const p = rich();
    p.chapters.push(3);
    expect(launcherBay.select(p, 'swoop')).toBe(true);
    expect(launcherBay.tuneUp(p, 'swoop')).toBe('mastery');
    for (let i = 0; i < 100; i++) recordLauncherFling(p, 'swoop');
    p.home.plots[0]!.lv = 1;
    expect(launcherBay.tuneUp(p, 'swoop')).toBe('bay');
    p.home.plots[0]!.lv = 2;
    p.dust = 1499;
    expect(launcherBay.tuneUp(p, 'swoop')).toBe('resources');
    p.dust = 1500;
    expect(launcherBay.tuneUp(p, 'swoop')).toBe('ok');
    expect([p.dust, p.mats.dew, launcherBay.tune(p, 'swoop')]).toEqual([0, 985, 2]);
    expect(launcherBay.tuneUp(p, 'swoop')).toBe('mastery');
    expect(TUNE_COST[4]).toEqual({ dust: 9000, essence: 60, bay: 5, flings: 2000 });
    const paidLaunchers = LAUNCH_ROSTER.filter((id) => id !== 'sling').length;
    expect(paidLaunchers * (1500 + 4000 + 9000)).toBe(43_500);
    expect(paidLaunchers * (15 + 35 + 60)).toBe(330);
  });

  it('does not convert cosmetic look mastery into gameplay tune eligibility', () => {
    const raw = rich();
    raw.chapters.push(3);
    raw.mastery.l_pad = 5000;
    const p = migrate(raw as unknown as Record<string, unknown>);
    expect(p.launcher.flings.swoop ?? 0).toBe(0);
    expect(launcherBay.tuneUp(p, 'swoop')).toBe('mastery');
  });
});

describe('Comet Pier feat', () => {
  it('starts Pier feats when Ring 4 opens', () => {
    const p = rich();
    p.home.ring = 3;
    for (let n = 1; n <= 3; n++) recordCometPierWin(p, 'campaign', n, true, 1);
    expect(p.cometPier.hardWins).toBe(0);
    expect(p.cometPier.stage).toBe(0);
    p.home.ring = 4;
    expect(advanceCometPier(p)).toBe(0);
    for (let n = 4; n <= 6; n++) recordCometPierWin(p, 'campaign', n, true, 1);
    expect(p.cometPier.stage).toBe(1);
  });

  it('counts round events, advances four stages and pays each stage once', () => {
    const p = rich();
    p.level = 43;
    const startDust = p.dust;
    for (let n = 1; n <= 6; n++) recordCometPierWin(p, 'campaign', n, false, 3);
    recordCometPierWin(p, 'campaign', 6, false, 3);
    expect(p.cometPier.normalThreeStars).toBe(6);
    expect(p.cometPier.stage).toBe(1);
    // Fusion and Trouble from a previous stage do not finish a newly opened one.
    recordCometPierStep(p, { troubleEvents: [], reactions: [{ id: 'steam', at: 0, partner: 1, sectors: [0] }] }, 'voyage');
    expect(p.cometPier.fusions).toBe(0);
    for (let n = 0; n < 8; n++)
      recordCometPierStep(p, { troubleEvents: [{ id: 'vent', kind: 'settled', sector: 0 }], reactions: [] }, 'campaign');
    expect(p.cometPier.stage).toBe(2);
    const fusion = Object.keys(REACTIONS).find((id) => REACTIONS[id as keyof typeof REACTIONS].kind === 'fusion') as keyof typeof REACTIONS;
    for (let n = 0; n < 10; n++)
      recordCometPierStep(p, { troubleEvents: [], reactions: [{ id: fusion, at: 0, partner: 1, sectors: [0] }] }, 'voyage');
    expect(p.cometPier.stage).toBe(3);
    expect(advanceCometPier(p)).toBe(3);
    expect(p.dust).toBe(startDust + 450);
    expect(cometPierFinishStatus(p)).toBe('ready');
    expect(finishCometPier(p)).toBe(true);
    expect(finishCometPierWithResult(p)).toBe('finished');
    expect(finishCometPier(p)).toBe(false);
    expect(availability(p, 'zip')).toEqual({ kind: 'owned' });
    expect([p.mats.leaf, p.mats.dew]).toEqual([960, 970]);
  });
  it('gives the Bay a clear reason before the final Pier action', () => {
    const p = defaultProfile();
    expect(finishCometPierWithResult(p)).toBe('locked');
    p.home.ring = 4;
    p.cometPier.stage = 3;
    expect(finishCometPierWithResult(p)).toBe('resources');
  });
});
