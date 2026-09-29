// Save goldens (ROADMAP-v2 7.7, M1 item 1.7): a save from every format must load.
//
// RULE: every future change to the save format (a new Profile field, a renamed or removed field,
// a new PROFILE_VERSION, a changed default) must add a fixture to tests/fixtures/saves/ written in
// the format the game saved BEFORE the change, plus any expectation the migration must meet.
// Never edit an existing fixture to make a test pass: it is a copy of what is on players' phones.
//
// Fixtures:
//   a-new-profile.v3.json  a brand-new player, current format (post-M0)
//   b-mid-game.v3.json     planet 24, Homeworld ring 2, festival + Weekly Voyage in progress, a grown-up
//                          turned reminders and Game Center on
//   c-pre-m0.v3.json       v3 before the M0 kid-safe update: no fails / visits / continuesUsed, no
//                          settings.gameCenter, home.started instead of home.lastTick, notifications: true
//   d-round4.v2.json       v2 (round 4): no mailSeen / festival / voyage / album / buddy / home.friends
//   e-pre-m3.v3.json       v3 before the M3 unlock ladder, with Pass and mode progress
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defaultProfile, migrate, PROFILE_VERSION, type Profile } from '../src/meta/profile';
import { unlocked } from '../src/meta/unlocks';

const DIR = 'tests/fixtures/saves';
const FILES = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

type Raw = Record<string, unknown>;
const load = (f: string): Raw => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Raw;
/** Load a fixture the way loadProfile() does: JSON text → migrate(). */
const loadSave = (f: string): Profile => migrate(JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Raw);

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Paths present in `base` (recursing into plain objects) that are missing from `got` or have the wrong type. */
function missingPaths(base: unknown, got: unknown, path = ''): string[] {
  if (!isPlainObject(base)) {
    if (base === null || base === undefined) return [];
    if (Array.isArray(base)) return Array.isArray(got) ? [] : [`${path}: expected an array, got ${JSON.stringify(got)}`];
    return typeof got === typeof base ? [] : [`${path}: expected ${typeof base}, got ${JSON.stringify(got)}`];
  }
  if (!isPlainObject(got)) return [`${path || '(root)'}: expected an object, got ${JSON.stringify(got)}`];
  return Object.keys(base).flatMap((k) =>
    k in got ? missingPaths(base[k], got[k], path ? `${path}.${k}` : k) : [`${path ? `${path}.${k}` : k}: missing`],
  );
}

/** Every currency-like value a player owns. */
function wallet(p: Raw) {
  return { gems: p.gems, dust: p.dust, piggy: p.piggy, mats: p.mats, boosters: p.boosters };
}

describe('save goldens', () => {
  it('has the five fixtures (add one for every save format change)', () => {
    expect(FILES).toEqual(['a-new-profile.v3.json', 'b-mid-game.v3.json', 'c-pre-m0.v3.json', 'd-round4.v2.json', 'e-pre-m3.v3.json']);
  });

  for (const f of FILES) {
    describe(f, () => {
      it('loads through migrate() without throwing and ends on the current version', () => {
        expect(() => loadSave(f)).not.toThrow();
        expect(loadSave(f).v).toBe(PROFILE_VERSION);
      });

      it('has every field defaultProfile() has, with the same type', () => {
        const bad = missingPaths(defaultProfile(0), loadSave(f));
        expect(bad, bad.join('\n')).toEqual([]);
      });

      it('keeps gems, stardust, the piggy bank, materials and boosters exactly', () => {
        const raw = load(f);
        const p = loadSave(f) as unknown as Raw;
        expect(wallet(p)).toEqual({ ...wallet(raw), mats: raw.mats ?? {} });
      });

      it('keeps progress: level, stars, the Lifebook, galaxy, purchases and the Homeworld plots', () => {
        const raw = load(f);
        const p = loadSave(f);
        expect(p.level).toBe(raw.level);
        expect(p.stars).toEqual(raw.stars);
        expect(p.seen).toEqual(raw.seen);
        expect(p.galaxy.map((g) => g.n)).toEqual((raw.galaxy as { n: number }[]).map((g) => g.n));
        expect(p.processedTx).toEqual(raw.processedTx);
        expect(p.pass).toBe(raw.pass);
        expect(p.skins).toEqual(raw.skins);
        expect(p.home.plots).toEqual((raw.home as Raw).plots);
        expect(p.home.residents).toEqual((raw.home as Raw).residents);
      });

      it('is stable: saving and loading again changes nothing', () => {
        const once = loadSave(f);
        const twice = migrate(JSON.parse(JSON.stringify(once)) as Raw);
        expect(twice).toEqual(once);
      });
    });
  }
});

describe('save goldens: specific migrations', () => {
  it('migrates the old dollar reminder and adds a parent PIN default', () => {
    const raw = load('b-mid-game.v3.json');
    (raw.settings as Raw).spendingReminder = 5;
    delete (raw.settings as Raw).parentPin;
    const p = migrate(raw);
    expect(p.settings.spendingReminder).toEqual({ cents: 500, currency: 'USD' });
    expect(p.settings.parentPin).toBeNull();
  });
  it('grandfathers pre-M3 gates and marks past intro cards as seen', () => {
    const p = loadSave('e-pre-m3.v3.json');
    expect(p.m3Migrated).toBe(true);
    for (const id of ['voyage', 'weekly_event', 'festival', 'star_calendar', 'momentum', 'quests', 'star_road'] as const)
      expect(unlocked(p, id), id).toBe(true);
    for (const id of ['homeworld', 'festival', 'voyage'] as const) expect(p.mailSeen).toContain(`coach-${id}`);
    expect(migrate(JSON.parse(JSON.stringify(p))).legacyUnlocks).toEqual(p.legacyUnlocks);
  });

  it('a brand-new profile loads as a default profile', () => {
    const raw = load('a-new-profile.v3.json');
    const now = raw.lastCollect as number;
    const p = loadSave('a-new-profile.v3.json');
    expect(p).toEqual({ ...defaultProfile(now), meta: { ...defaultProfile(now).meta, sessions: 1 } });
  });

  it('the mid-game player keeps the choices a grown-up made and this week’s progress', () => {
    const p = loadSave('b-mid-game.v3.json');
    expect(p.settings).toMatchObject({ notifications: true, gameCenter: true, lang: 'es', hemi: 'south', music: false });
    expect(p.settings.textSize).toBe('standard');
    expect(p.festival).toEqual({ key: '2026-09', spotted: 31, claimed: [0, 1] });
    expect(p.voyage).toEqual({ week: '2026-W39', base: 19, cleared: 3, stars: [3, 2, 3] });
    expect(p.event).toEqual({ week: '2026-W39', tokens: 64, claimed: [0, 1] });
    expect(p.daily).toEqual({ last: '2026-09-27', streak: 17 });
    expect(p.fails).toEqual({ 24: 2 });
    expect(p.continuesUsed).toEqual({ 17: 1 });
    expect(p.home.expedition?.species).toBe('bear');
    expect(p.home.lastTick).toBe((load('b-mid-game.v3.json').home as Raw).lastTick);
  });

  for (const f of ['c-pre-m0.v3.json', 'd-round4.v2.json']) {
    it(`${f}: reminders and Game Center come out off, whatever the old default was`, () => {
      expect((load(f).settings as Raw).notifications).toBe(true);
      const p = loadSave(f);
      expect(p.settings.notifications).toBe(false);
      expect(p.settings.gameCenter).toBe(false);
    });

    it(`${f}: fields added since then get empty defaults`, () => {
      const p = loadSave(f);
      expect(p.fails).toEqual({});
      expect(p.continuesUsed).toEqual({});
      expect(p.visits).toEqual({});
      expect(typeof p.home.lastTick).toBe('number');
    });
  }

  it('c-pre-m0: keeps the rest of the settings and the calendar stamps', () => {
    const raw = load('c-pre-m0.v3.json');
    const p = loadSave('c-pre-m0.v3.json');
    const { notifications: _n, ...oldRest } = raw.settings as Raw;
    expect(p.settings).toMatchObject(oldRest);
    expect(p.daily).toEqual(raw.daily);
  });

  it('d-round4 (v2): the old daily streak restarts as Star Calendar stamps and new systems start empty', () => {
    const raw = load('d-round4.v2.json');
    const p = loadSave('d-round4.v2.json');
    expect((raw.daily as Raw).streak).toBe(12);
    expect(p.daily).toEqual({ last: '2026-07-29', streak: 0 });
    expect(p.settings).toMatchObject({ haptics: false, reduceMotion: true, lang: 'de' });
    expect(p.mailSeen).toContain('coach-homeworld');
    expect(p.mailSeen).toContain('coach-festival');
    expect(p.festival).toEqual({ key: '', spotted: 0, claimed: [] });
    expect(p.voyage).toEqual({ week: '', base: 8, cleared: 0, stars: [] });
    expect(p.buddy).toEqual({ species: null, acc: null });
    expect(p.album.pages).toHaveLength(3);
    expect(p.home.friends).toEqual({});
    expect(p.passport.badgesSet).toBe(false);
    expect(p.stats.wins).toBeGreaterThanOrEqual(Object.keys(p.stars).length);
  });
});
