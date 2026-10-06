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
//   g-pre-m105.v3.json     Tower at level 3, build timer, active expedition and cosmetic mastery
//   h-pre-m11.v3.json      Ring 3, paid retired structures/perks and a running trip
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defaultProfile, migrate, PROFILE_VERSION, readInterruptedRound, type Profile } from '../src/meta/profile';
import { labBuildCost, labCap, labLevel } from '../src/meta/labs';
import { unlocked } from '../src/meta/unlocks';
import { BUILDINGS, canBuild, drones, finishExpedition } from '../src/meta/homeworld';

const DIR = 'tests/fixtures/saves';
const FILES = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();
const DUST_DELTAS: Record<string, number> = {
  'a-new-profile.v3.json': 0,
  'b-mid-game.v3.json': 10440,
  'c-pre-m0.v3.json': 10440,
  'd-round4.v2.json': 1600,
  'e-pre-m3.v3.json': 0,
  'f-pre-m10.v3.json': 14260,
  'g-pre-m105.v3.json': 14260,
  'h-pre-m11.v3.json': 22980,
};

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
  it('has the pre-M11 fixture alongside earlier save formats', () => {
    expect(FILES).toEqual([
      'a-new-profile.v3.json',
      'b-mid-game.v3.json',
      'c-pre-m0.v3.json',
      'd-round4.v2.json',
      'e-pre-m3.v3.json',
      'f-pre-m10.v3.json',
      'g-pre-m105.v3.json',
      'h-pre-m11.v3.json',
    ]);
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

      it('keeps gems, piggy bank, materials and boosters; refunds paid retired items', () => {
        const raw = load(f);
        const p = loadSave(f) as unknown as Raw;
        expect(wallet(p)).toMatchObject({
          gems:
            (raw.gems as number) +
            ({ 'b-mid-game.v3.json': 1, 'c-pre-m0.v3.json': 1, 'f-pre-m10.v3.json': 2, 'g-pre-m105.v3.json': 2, 'h-pre-m11.v3.json': 1 }[
              f
            ] ?? 0),
          piggy: raw.piggy,
          mats: raw.mats ?? {},
          boosters: raw.boosters,
        });
        expect(p.dust).toBe((raw.dust as number) + DUST_DELTAS[f]);
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
        const oldPlots = (raw.home as Raw).plots as (Raw | null)[];
        expect(p.home.plots).toHaveLength(oldPlots.length);
        for (let i = 0; i < oldPlots.length; i++) {
          const b = oldPlots[i];
          if (['mill', 'grove', 'observatory'].includes(String(b?.type))) expect(p.home.plots[i]).toBeNull();
          else if (b?.type === 'tower') expect(p.home.plots[i]).toMatchObject({ ...b, type: 'launch_bay' });
          else if (b?.type === 'greenhouse') expect(p.home.plots[i]).toMatchObject(b);
          else expect(p.home.plots[i]).toEqual(b);
        }
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
  it('grandfathers the paid third drone for a legacy Pass owner', () => {
    const p = loadSave('e-pre-m3.v3.json');
    expect(p.pass).toBe(true);
    expect(p.home.level).toBeLessThan(3);
    expect(drones(p)).toBe(3);
  });
  it('keeps a hidden selection and tune even when its old earn channel is absent', () => {
    const raw = load('g-pre-m105.v3.json');
    raw.launcher = {
      selected: 'pinpoint',
      tunes: { pinpoint: 3 },
      flings: { pinpoint: 511 },
      completedRounds: { pinpoint: 2 },
      comboThreePlanets: [],
    };
    raw.chapters = [];
    const p = migrate(raw);
    expect(p.launcher).toMatchObject({
      selected: 'pinpoint',
      tunes: { pinpoint: 3 },
      flings: { pinpoint: 511 },
      completedRounds: { pinpoint: 2 },
    });
    expect(migrate(JSON.parse(JSON.stringify(p)) as Raw).launcher).toEqual(p.launcher);
  });
  it('retains distinct Combo 3 feats from salted Voyage seeds across a save round trip', () => {
    const raw = load('g-pre-m105.v3.json');
    raw.level = 40;
    raw.launcher = {
      selected: 'sparkler',
      tunes: {},
      flings: {},
      completedRounds: {},
      comboThreePlanets: ['voyage:VOY-2026-W44-0-38~17', 'voyage:VOY-2026-W44-1-38~-9', 'campaign:37'],
    };
    const p = migrate(raw);
    expect(p.launcher.comboThreePlanets).toHaveLength(3);
    expect(p.launcher.selected).toBe('sparkler');
    expect(migrate(JSON.parse(JSON.stringify(p)) as Raw).launcher).toEqual(p.launcher);
  });
  it('g-pre-m105 converts the Tower but keeps its level, timer, active trip and paid looks', () => {
    const raw = load('g-pre-m105.v3.json');
    const p = loadSave('g-pre-m105.v3.json');
    const tower = ((raw.home as Raw).plots as (Raw | null)[]).find((b) => b?.type === 'tower')!;
    const bay = p.home.plots.find((b) => b?.type === 'launch_bay')!;
    expect(bay).toEqual({ ...tower, type: 'launch_bay' });
    expect(p.home.expedition).toEqual((raw.home as Raw).expedition);
    expect(p.mastery.l_pad).toBe(2800);
    expect(p.launcher.flings).toEqual({});
    expect(p.m105Migrated).toBe(true);
    expect(migrate(JSON.parse(JSON.stringify(p)) as Raw)).toEqual(p);
    const trip = finishExpedition(p, p.home.expedition!.ends);
    expect(trip?.species).toBe('otter');
    expect(p.home.expedition).toBeNull();
  });

  it('clamps malformed gameplay IDs, tune levels and feat counters', () => {
    const raw = load('g-pre-m105.v3.json');
    raw.launcher = {
      selected: 'l_pad',
      tunes: { swoop: 99, zip: -2, mystery: 3 },
      flings: { swoop: -10, zip: Infinity },
      completedRounds: { swoop: 100 },
      comboThreePlanets: ['campaign:31', 'campaign:31', '../bad'],
    };
    raw.cometPier = { hardWins: -4, normalThreeStars: 0, troubles: -1, fusions: 0, stage: 99 };
    const p = migrate(raw);
    expect(p.launcher).toEqual({
      selected: 'sling',
      tunes: { swoop: 4, zip: 1 },
      flings: { swoop: 0 },
      completedRounds: { swoop: 3 },
      comboThreePlanets: ['campaign:31'],
    });
    expect(p.cometPier.stage).toBe(4);
    expect(p.cometPier.hardWins).toBe(0);
  });

  it('restores old checkpoints as the untuned Sling and rejects malformed launcher rules', () => {
    const p = loadSave('f-pre-m10.v3.json');
    const saved = JSON.parse(p.savedRound!) as { scene: { modifiers: Record<string, unknown> } };
    delete saved.scene.modifiers.launcher;
    p.savedRound = JSON.stringify(saved);
    expect(readInterruptedRound(p)?.modifiers.launcher).toEqual({ id: 'sling', tune: 1 });
    saved.scene.modifiers.launcher = { id: 'l_pad', tune: 4 };
    p.savedRound = JSON.stringify(saved);
    expect(readInterruptedRound(p)).toBeNull();
  });
  it('f-pre-m10 keeps paid Lab levels, full plots, wallet and old checkpoint', () => {
    const raw = load('f-pre-m10.v3.json');
    const p = loadSave('f-pre-m10.v3.json');
    expect(p.home.plots.filter((b) => b?.type === 'lab')).toHaveLength(
      ((raw.home as Raw).plots as (Raw | null)[]).filter((b) => b?.type === 'lab').length,
    );
    expect(p.mats).toEqual(raw.mats);
    expect(p.lab).toEqual(raw.lab);
    expect(p.home.firstHour).toBe(2);
    expect(p.home.plots.some((b) => b === null)).toBe(true);
    for (const [type, def] of Object.entries(BUILDINGS))
      expect(p.home.plots.filter((b) => b?.type === type).length, type).toBeLessThanOrEqual(def.max);
    expect(p.home.debris.every((i) => !p.home.plots[i])).toBe(true);
    expect(labCap(p)).toBe(4);
    expect(labLevel(p, 'seed')).toBe(5);
    for (const kind of ['rock', 'ice', 'seed', 'magma'] as const) expect(labBuildCost(p, kind)).toBe(0);
    const checkpoint = readInterruptedRound(p);
    expect(checkpoint?.n).toBe(33);
    expect(checkpoint?.state.labMarks).toEqual({ rock: [], seed: [] });
    expect(checkpoint?.modifiers.forms).toBeUndefined();
  });
  it('keeps the first-hour invitation for an untouched Homeworld', () => {
    expect(loadSave('e-pre-m3.v3.json').home.firstHour).toBe(0);
    expect(loadSave('a-new-profile.v3.json').home.firstHour).toBe(0);
  });

  it('refuses new retired producers and generic Lab builds', () => {
    const p = defaultProfile(0);
    p.level = 33;
    p.home.level = 3;
    p.dust = 100_000;
    for (const type of ['mill', 'grove', 'observatory', 'lab'] as const) expect(canBuild(p, 0, type, 1), type).toBe('max');
  });
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
    const expected = defaultProfile(now);
    expected.meta.sessions = 1;
    expected.lastCollect = p.lastCollect;
    expected.vault.lastTick = p.vault.lastTick;
    expect(p).toEqual(expected);
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
