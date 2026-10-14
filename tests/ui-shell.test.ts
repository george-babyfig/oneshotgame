import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { guardInput } from '../src/ui/dom';
import { privacyContactCopy } from '../src/ui/screens/grownups';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('FB release and support copy', () => {
  it('never displays placeholder contact details, including partly configured contacts', () => {
    for (const contact of [undefined, { email: 'support@YOUR-DOMAIN', policy: 'https://YOUR-SITE/privacy' }, { email: '', policy: '' }]) {
      const text = privacyContactCopy(contact).join('\n');
      expect(text).not.toMatch(/YOUR-DOMAIN|YOUR-SITE/);
      expect(text).toContain("Comet Garden's App Store page");
    }
    const copy = privacyContactCopy({ email: 'help@example.org', policy: 'YOUR-SITE' });
    expect(copy[0]).toContain('help@example.org');
    expect(copy[1]).toContain('support link');
    expect(privacyContactCopy({ email: 'help@example.org', policy: 'https://example.org/privacy' })).toEqual([
      'Support email: help@example.org',
      'Privacy policy: https://example.org/privacy',
    ]);
  });

  it('refuses source and nested site placeholders before running a release build', () => {
    const root = mkdtempSync(join(tmpdir(), 'fb-release-'));
    try {
      mkdirSync(join(root, 'src'));
      mkdirSync(join(root, 'site', 'nested'), { recursive: true });
      const check = () =>
        spawnSync(
          process.execPath,
          [
            '--input-type=module',
            '-e',
            "import { assertNoReleasePlaceholders } from './scripts/ios-release.mjs'; assertNoReleasePlaceholders(process.argv[1]);",
            root,
          ],
          { encoding: 'utf8' },
        );
      expect(check().status).toBe(0);
      for (const [path, token] of [
        ['src/contact.ts', 'YOUR-DOMAIN'],
        ['site/nested/privacy.html', 'YOUR-SITE'],
      ]) {
        writeFileSync(join(root, path), token);
        const blocked = check();
        expect(blocked.status).not.toBe(0);
        expect(blocked.stderr).toContain('Release contact placeholders remain');
        expect(blocked.stderr).toContain(path);
        rmSync(join(root, path));
      }
      expect(check().status).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts the real tuning.ts version source and refuses a mismatched hard-coded one', () => {
    const check = (tuning: string, version: string) =>
      spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "import { assertVersionSource } from './scripts/ios-release.mjs'; assertVersionSource(process.argv[1], process.argv[2]);",
          tuning,
          version,
        ],
        { encoding: 'utf8' },
      );
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(check(readFileSync('src/meta/tuning.ts', 'utf8'), version).status).toBe(0);
    expect(check(`export const VERSION = '${version}';`, version).status).toBe(0);
    const stale = check("export const VERSION = '0.0.1';", version);
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toContain('VERSION must match');
  });
});

describe('FB transition input guard', () => {
  it('blocks physical second taps for 300 ms, extends on a sheet change, and preserves keyboard activation', () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const classes = new Set<string>();
    const doc = Object.assign(new EventTarget(), {
      documentElement: { classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) } },
    });
    vi.stubGlobal('document', doc);
    const tap = (detail = 1) => {
      const event = new Event('click', { cancelable: true });
      Object.defineProperty(event, 'detail', { value: detail });
      doc.dispatchEvent(event);
      return event.defaultPrevented;
    };
    guardInput();
    now = 150;
    expect(tap()).toBe(true);
    expect(tap(0)).toBe(false);
    guardInput();
    now = 449;
    expect(tap()).toBe(true);
    now = 450;
    expect(tap()).toBe(false);
    vi.advanceTimersByTime(300);
    expect(classes.has('input-settling')).toBe(false);
  });
});
