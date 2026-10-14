import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { homeworldNextUp, nextUp } from '../src/meta/nextup';
import { ensureWishes } from '../src/meta/wishes';

describe('nextUp', () => {
  it('puts a newly opened feature first', () => {
    const p = defaultProfile();
    p.level = 6;
    expect(nextUp(p, 0)).toMatchObject({ kind: 'unlock', action: 'homeworld' });
    p.chapters = [1, 2];
    p.level = 24;
    expect(nextUp(p, 0)).toMatchObject({ kind: 'unlock', title: 'Star Atlas', action: 'sky' });
  });
  it('falls back to the next planet with no offer or price', () => {
    const p = defaultProfile();
    expect(nextUp(p, 0)).toEqual({ kind: 'play', title: 'Play planet 1', subtitle: 'A new planet is waiting', action: 'play' });
  });
  it('puts a chest ahead of a nearly finished Wish', () => {
    const p = defaultProfile();
    p.level = 26;
    p.meta.sessions = 2;
    p.seen = ['deer'];
    const card = ensureWishes(p, '2026-09-28')[0];
    card.progress = card.goal - 0.1;
    expect(nextUp(p, 0)).toMatchObject({ kind: 'claim', action: 'starmap' });
  });
  it('suggests a Wish at eighty percent when no claim is ready', () => {
    const p = defaultProfile();
    p.level = 26;
    p.meta.sessions = 2;
    p.chapters = [1, 2];
    p.seen = ['deer'];
    const card = ensureWishes(p, '2026-09-28')[0];
    card.progress = card.goal * 0.8;
    expect(nextUp(p, 0).kind).toBe('wish');
  });
  it('puts a finished build ahead of a Wish', () => {
    const p = defaultProfile();
    p.level = 26;
    p.meta.sessions = 2;
    p.chapters = [1, 2];
    p.home.plots[0] = { type: 'den', lv: 1, since: 0, done: 5 };
    expect(nextUp(p, 5)).toMatchObject({ kind: 'claim', action: 'homeworld' });
  });
  it('shows one Homeworld task and puts a grown booster first', () => {
    const p = defaultProfile();
    p.level = 11;
    p.home.firstHour = 2;
    expect(homeworldNextUp(p).title).toBe('Homeworld Level 2');
    p.home.plots[0] = { type: 'greenhouse', lv: 1, since: 0, greenhouse: { choice: 'spark', winsTowardNext: 0, stored: 1 } };
    expect(homeworldNextUp(p)).toMatchObject({ kind: 'claim', title: 'A booster is ready' });
  });
  it('puts waiting celebrations ahead of a ready Landmark, then shows delivery instead of a completed feat', () => {
    const p = defaultProfile();
    p.level = 30;
    p.home.level = 5;
    p.home.firstHour = 2;
    for (const id of ['sprout_garden', 'skyglass', 'sky_bridge'] as const) p.home.landmarks[id].stage = 4;
    p.cometPier.stage = 4;
    p.home.landmarks.keepers_beacon.stage = 3;
    p.home.seen.celebrations.push('keepers_beacon:stage:3');
    expect(homeworldNextUp(p)).toMatchObject({ homeTarget: 'celebration' });
    p.home.seen.celebrations = [];
    expect(homeworldNextUp(p)).toMatchObject({
      homeTarget: 'landmark',
      subtitle: 'Bring Essences to finish this Landmark',
    });
    p.mats.leaf = p.mats.stone = p.mats.dew = 50;
    expect(homeworldNextUp(p)).toMatchObject({ homeTarget: 'landmark', subtitle: 'Your Landmark is ready to finish' });
  });
});

describe('noun window suggestions', () => {
  it('requires Inbox visibility even when Wishes were grandfathered', () => {
    const p = defaultProfile();
    p.level = 2;
    p.legacyUnlocks.push('quests');
    expect(nextUp(p, 0).action).not.toBe('inbox');
    p.mail.push({ id: 'welcome', kind: 'welcome', at: 0, read: true, claimed: false });
    expect(nextUp(p, 0).action).toBe('inbox');
  });
  it('does not point at unopened Inbox or an incomplete Habitat set', () => {
    const p = defaultProfile();
    p.level = 2;
    p.home.firstHour = 2;
    expect(nextUp(p, 0).action).not.toBe('inbox');
    p.level = 19;
    p.chapters = [1];
    p.seen = ['llama', 'newt', 'dragon', 'dino'];
    for (let session = 1; session <= 6; session++) {
      p.meta.sessions = session;
      expect(nextUp(p, 0).action).not.toBe('lifebook');
    }
  });
});

it('M14 sends a ready Road Landmark stage to its Homeworld build row', async () => {
  const { vi } = await import('vitest');
  const roads = await import('../src/meta/starroad');
  const { ROAD01 } = await import('../src/meta/content/road01');
  const catalog = [roads.ROAD_CATALOG[0], { ...ROAD01.road, opensOn: '2026-02-26' }];
  const original = roads.playableRoads;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-26T12:00:00Z'));
  vi.spyOn(roads, 'playableRoads').mockImplementation((p, day) => original(p, day, catalog));
  try {
    const p = defaultProfile();
    p.level = 121;
    p.home.level = 5;
    p.home.firstHour = 2;
    for (const state of Object.values(p.home.landmarks)) state.stage = 4;
    p.cometPier.stage = 4;
    const { roadLandmarkState } = await import('../src/meta/roadLandmarks');
    roadLandmarkState(p, 'rl_road01').progress[0] = 12;
    expect(homeworldNextUp(p)).toMatchObject({
      kind: 'claim',
      homeTarget: 'landmark',
      title: 'Sky Loom',
      subtitle: 'Sky Loom is ready to build',
    });
    p.chapters = Array.from({ length: 12 }, (_, i) => i + 1);
    expect(nextUp(p, Date.now())).toMatchObject({
      kind: 'claim',
      homeTarget: 'landmark',
      title: 'Sky Loom',
      subtitle: 'Sky Loom is ready to build',
    });
    roadLandmarkState(p, 'rl_road01').progress[0] = 0;
    expect(homeworldNextUp(p)).toMatchObject({ kind: 'goal', homeTarget: 'landmark', title: 'Sky Loom' });
  } finally {
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
});

it('M14 Next Up detects a claim in Road 1 with Road 0 fully claimed', async () => {
  const { vi } = await import('vitest');
  const roads = await import('../src/meta/starroad');
  const p = defaultProfile();
  p.level = 121;
  p.meta.sessions = 2;
  p.chapters = Array.from({ length: 12 }, (_, i) => i + 1);
  const spy = vi.spyOn(roads, 'anyRoadReady').mockReturnValue(true);
  try {
    expect(nextUp(p, Date.now())).toMatchObject({ kind: 'claim', action: 'missions' });
    expect(spy).toHaveBeenCalledWith(p);
  } finally {
    spy.mockRestore();
  }
});
