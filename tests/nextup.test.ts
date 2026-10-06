import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { homeworldNextUp, nextUp } from '../src/meta/nextup';
import { ensureWishes } from '../src/meta/wishes';

describe('nextUp', () => {
  it('puts a newly opened feature first', () => {
    const p = defaultProfile();
    p.level = 6;
    expect(nextUp(p, 0)).toMatchObject({ kind: 'unlock', action: 'homeworld' });
    p.level = 24;
    expect(nextUp(p, 0)).toMatchObject({ kind: 'unlock', title: 'Star Atlas', action: 'sky' });
  });
  it('falls back to the next planet with no offer or price', () => {
    const p = defaultProfile();
    expect(nextUp(p, 0)).toEqual({ kind: 'play', title: 'Play planet 1', subtitle: 'A new planet is waiting', action: 'play' });
  });
  it('puts a chest ahead of a nearly finished Wish', () => {
    const p = defaultProfile();
    p.level = 25;
    p.seen = ['deer'];
    const card = ensureWishes(p, '2026-09-28')[0];
    card.progress = card.goal - 0.1;
    expect(nextUp(p, 0)).toMatchObject({ kind: 'claim', action: 'starmap' });
  });
  it('suggests a Wish at eighty percent when no claim is ready', () => {
    const p = defaultProfile();
    p.level = 25;
    p.chapters = [1, 2];
    p.seen = ['deer'];
    const card = ensureWishes(p, '2026-09-28')[0];
    card.progress = card.goal * 0.8;
    expect(nextUp(p, 0).kind).toBe('wish');
  });
  it('puts a finished build ahead of a Wish', () => {
    const p = defaultProfile();
    p.level = 25;
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
});
