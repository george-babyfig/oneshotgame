import { describe, expect, it, vi } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { defaultProfile, migrate } from '../src/meta/profile';
import { App } from '../src/ui/app';
import type { LevelResult, LevelScene } from '../src/ui/game';

const HOUR = 3_600_000;

function round(mode: Parameters<App['sceneOpts']>[0], practice = false, eligible = true) {
  const app = Object.create(App.prototype) as App;
  app.p = defaultProfile();
  app.p.level = 18;
  app.p.home.level = 2;
  app.p.home.plots[0] = {
    type: 'greenhouse',
    lv: 1,
    since: 0,
    greenhouse: { choice: 'scope', winsTowardNext: 5, stored: 0 },
  };
  app.p.home.residents.push({ species: 'otter', fp: 0, lastReq: 0, rewarded: 0 });
  app.p.buddy.species = 'otter';
  app.save = vi.fn();
  const saved = vi.fn(() => app.save());
  const opts = app.sceneOpts(mode, { onEnd: saved, practice, homeworldWinEligible: () => eligible });
  const level = makeLevel(18);
  app.scene = { L: level, o: opts, roundLog: { lab: [] } } as unknown as LevelScene;
  const result = {
    level,
    score: 10,
    stars: 1,
    planet: level.start,
    won: true,
    throwsUsed: 1,
    throwsTotal: 6,
    leftover: 5,
  } as LevelResult;
  return { app, opts, result, saved };
}

describe('round-end Homeworld integration', () => {
  it.each(['campaign', 'voyage', 'zen'] as const)('saves one greenhouse and Buddy credit for a %s win', (mode) => {
    const { app, opts, result, saved } = round(mode);
    opts.onEnd(result);
    opts.onEnd(result); // A completed scene can only credit its win once.
    expect(saved).toHaveBeenCalledTimes(2);
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ choice: 'scope', winsTowardNext: 0, stored: 1 });
    expect(app.p.home.residents[0].fp).toBe(1);
    const loaded = migrate(JSON.parse(JSON.stringify(app.p)));
    expect(loaded.home.plots[0]?.greenhouse?.stored).toBe(1);
    expect(loaded.home.residents[0].fp).toBe(1);
  });

  it('speeds an active campaign build once and keeps the result nudge accurate', () => {
    const { app, opts, result } = round('campaign');
    const done = Date.now() + 3_600_000;
    app.p.home.plots[1] = { type: 'lab', kind: 'rock', lv: 1, since: 0, done };
    opts.onEnd(result);
    opts.onEnd(result);
    expect(app.p.home.plots[1]?.done).toBe(done - 600_000);
    expect(app.roundBuildsSpedUp).toBe(true);
  });

  it.each(['daily', 'rush', 'challenge', 'remix'] as const)('does not credit a %s win', (mode) => {
    const { app, opts, result } = round(mode);
    opts.onEnd(result);
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ winsTowardNext: 5, stored: 0 });
    expect(app.p.home.residents[0].fp).toBe(0);
  });

  it.each([
    ['practice', true, { won: true, throwsUsed: 1 }],
    ['loss', false, { won: false, throwsUsed: 1, stars: 0 }],
    ['restart', false, { won: true, throwsUsed: -1 }],
  ] as const)('does not credit a %s round', (_name, practice, fields) => {
    const { app, opts, result } = round('campaign', practice);
    const done = Date.now() + HOUR;
    app.p.home.plots[1] = { type: 'lab', kind: 'rock', lv: 1, since: 0, done };
    opts.onEnd({ ...result, ...fields });
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ winsTowardNext: 5, stored: 0 });
    expect(app.p.home.residents[0].fp).toBe(0);
    expect(app.p.home.plots[1]?.done).toBe(done);
  });

  it('does not credit a stop from a replaced Voyage route', () => {
    const { app, opts, result } = round('voyage', false, false);
    opts.onEnd(result);
    expect(app.p.home.plots[0]?.greenhouse).toMatchObject({ winsTowardNext: 5, stored: 0 });
    expect(app.p.home.residents[0].fp).toBe(0);
  });
});
