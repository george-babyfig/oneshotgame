import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { buildLab, labBuildCost } from '../src/meta/labs';
import { firstHourFriend, firstHourLab, firstHourStep } from '../src/meta/firsthour';
import { invite, tickBuilds } from '../src/meta/homeworld';
import { checkMail, claimMail, letterOf } from '../src/meta/inbox';

const T0 = 100_000;
function ready() {
  const p = defaultProfile(T0);
  p.level = 6;
  p.dust = 500;
  p.seen = ['otter', 'turtle', 'bear'];
  return p;
}

describe('first hour paths', () => {
  it('advances after a free Lab built from the plot list without charging for a second one', () => {
    const p = ready();
    expect(buildLab(p, 0, 'rock', T0)).toBe('ok');
    expect(firstHourStep(p)).toBe('friend');
    expect(p.home.firstHour).toBe(1);
    expect(firstHourLab(p, 'seed', 1, T0)).toBe('locked');
    expect(labBuildCost(p, 'seed')).toBe(300);
    expect(p.dust).toBe(500);
  });

  it('chooses a plot without a meteor rock, and clears one for free if every empty plot has debris', () => {
    const p = ready();
    p.home.debris = [0, 1, 2];
    expect(firstHourLab(p, 'rock', undefined, T0)).toBe('ok');
    expect(p.home.plots[3]?.type).toBe('lab');
    const all = ready();
    all.home.debris = all.home.plots.map((_, i) => i);
    expect(firstHourLab(all, 'rock', undefined, T0)).toBe('ok');
    expect(all.home.plots[0]?.type).toBe('lab');
    expect(all.home.debris).not.toContain(0);
    expect(all.dust).toBe(500);
  });

  it('waits for construction, then grants the friend reward exactly once', () => {
    const p = ready();
    expect(firstHourLab(p, 'rock', undefined, T0)).toBe('ok');
    expect(firstHourFriend(p, T0 + 10_000)).toBeNull();
    expect(p.home.firstHour).toBe(1);
    expect(p.dust).toBe(500);
    tickBuilds(p.home, T0 + 31_000);
    expect(firstHourFriend(p, T0 + 31_000)).toEqual({ species: 'otter', dust: 100 });
    expect(p.home.plots.some((b) => b?.type === 'den')).toBe(true);
    expect(p.dust).toBe(600);
    expect(firstHourFriend(p, T0 + 32_000)).toBeNull();
    expect(p.dust).toBe(600);
  });

  it('counts a resident already invited, including a full Den', () => {
    const p = ready();
    firstHourLab(p, 'rock', undefined, T0);
    tickBuilds(p.home, T0 + 31_000);
    p.home.plots[1] = { type: 'den', lv: 1, since: T0 };
    expect(invite(p, 'otter')).toBe(true);
    expect(invite(p, 'turtle')).toBe(true);
    expect(firstHourFriend(p, T0 + 31_000)).toEqual({ species: 'otter', dust: 100 });
    expect(p.home.residents).toHaveLength(2);
  });

  it('finishes a building Den before inviting a discovered creature', () => {
    const p = ready();
    firstHourLab(p, 'rock', undefined, T0);
    tickBuilds(p.home, T0 + 31_000);
    p.home.plots[1] = { type: 'den', lv: 1, since: T0, done: T0 + 60_000 };
    expect(firstHourFriend(p, T0 + 31_000)?.species).toBe('otter');
    expect(p.home.plots[1]?.done).toBeUndefined();
  });

  it('makes a free room when every original plot is occupied', () => {
    const p = ready();
    firstHourLab(p, 'rock', undefined, T0);
    tickBuilds(p.home, T0 + 31_000);
    for (let i = 1; i < p.home.plots.length; i++) p.home.plots[i] = { type: i <= 2 ? 'fountain' : 'lantern', lv: 1, since: T0 };
    const original = p.home.plots.slice();
    expect(firstHourFriend(p, T0 + 31_000)?.species).toBe('otter');
    expect(p.home.plots.slice(0, original.length)).toEqual(original);
    expect(p.home.plots.at(-1)?.type).toBe('den');
  });

  it('keeps an unclaimed pre-M10 Homeworld letter gift while new letters have no gift', () => {
    const old = ready();
    old.mail.push({ id: 'homeworld', kind: 'homeworld', at: T0, read: true, claimed: false });
    expect(letterOf(old.mail[0])?.gift).toEqual({ dust: 300 });
    expect(firstHourStep(old)).toBe('done');
    expect(claimMail(old, 'homeworld')).toEqual({ dust: 300 });
    expect(claimMail(old, 'homeworld')).toBeNull();
    expect(old.dust).toBe(800);
    expect(firstHourStep(old)).toBe('done');

    const current = ready();
    checkMail(current, new Date(T0));
    const letter = current.mail.find((m) => m.kind === 'homeworld')!;
    expect(letter.vars?.m10).toBe(1);
    expect(letterOf(letter)?.gift).toBeUndefined();
  });

  it('does not grant the replacement reward after the old letter gift was claimed', () => {
    const p = ready();
    p.mail.push({ id: 'homeworld', kind: 'homeworld', at: T0, read: true, claimed: true });
    expect(firstHourStep(p)).toBe('done');
    expect(firstHourLab(p, 'rock', undefined, T0)).toBe('locked');
    expect(firstHourFriend(p, T0)).toBeNull();
  });
});
