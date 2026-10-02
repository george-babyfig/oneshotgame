import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/ui/app';
import { defaultProfile } from '../src/meta/profile';

describe('Remix discoveries', () => {
  it('uses the normal Lifebook callback and awards the first sighting once', () => {
    const app = Object.create(App.prototype) as App;
    app.p = defaultProfile(0);
    app.p.level = 11;
    app.save = vi.fn();
    const gems = app.p.gems;
    const opts = app.sceneOpts('remix', { onEnd: vi.fn() });
    opts.onNewSpecies?.('otter');
    expect(app.p.seen).toContain('otter');
    expect(app.p.gems).toBe(gems + 3);
    opts.onNewSpecies?.('otter');
    expect(app.p.gems).toBe(gems + 3);
  });
});
