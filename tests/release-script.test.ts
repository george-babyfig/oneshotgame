import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// The release CLI is plain JavaScript; importing its guarded helpers never runs the build.
// @ts-expect-error No declaration file for the release script.
import { assertVersionSource } from '../scripts/ios-release.mjs';

describe('A17 release version source', () => {
  it('accepts the typed package version export in the real tuning module', () => {
    const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
    const source = readFileSync('src/meta/tuning.ts', 'utf8');
    expect(source).toContain('export const VERSION: string = version;');
    expect(() => assertVersionSource(source, version)).not.toThrow();
  });
  it('accepts both typed and untyped package exports', () => {
    for (const annotation of ['', ': string']) {
      const source = `import { version } from '../../package.json';\nexport const VERSION${annotation} = version;`;
      expect(() => assertVersionSource(source, '1.1.0')).not.toThrow();
    }
  });
  it('accepts a matching literal and refuses a mismatched one', () => {
    expect(() => assertVersionSource("export const VERSION: string = '1.1.0';", '1.1.0')).not.toThrow();
    expect(() => assertVersionSource("export const VERSION: string = '1.0.0';", '1.1.0')).toThrow('must match');
    expect(() => assertVersionSource('export const VERSION: string = version;', '1.1.0')).toThrow('must match');
  });
});
