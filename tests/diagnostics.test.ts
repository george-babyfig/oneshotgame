import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decodeDiagnosticCode,
  diagnosticCode,
  diagnosticHash,
  encodeDiagnosticCode,
  loadDiagnostics,
  recordDiagnostic,
  resetDiagnosticsForTest,
} from '../src/meta/diagnostics';

let saved: string | null;
beforeEach(() => {
  saved = null;
  resetDiagnosticsForTest();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'pp.diagnostics.v1' ? saved : null),
    setItem: (key: string, value: string) => {
      if (key === 'pp.diagnostics.v1') saved = value;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('private device diagnostics', () => {
  it('never rejects when the device cannot save (full storage), so it cannot feed the rejection handler forever', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      },
    });
    await expect(recordDiagnostic(new Error('quota exceeded'))).resolves.toBeUndefined();
    await expect(recordDiagnostic(new Error('quota exceeded'))).resolves.toBeUndefined();
  });

  it('still shows a code when the app version is outside the packed range', () => {
    expect(() => encodeDiagnosticCode('1.0.64', [])).toThrow();
    expect(decodeDiagnosticCode(diagnosticCode('1.0.64'))?.version).toBe('0.0.0');
  });

  it('hashes stable, coarse first-line categories without retaining names, URLs or message text', async () => {
    const first = new TypeError("Cannot read properties of undefined (reading 'Alice')\nSecret stack text");
    const second = new TypeError("Cannot read properties of undefined (reading 'https://example.com/private?name=Bob')");
    expect(diagnosticHash(first)).toBe(diagnosticHash(second));
    expect(diagnosticHash('Alice at https://example.com')).toBe(diagnosticHash('Bob at https://another.example'));
    await recordDiagnostic(first, 86_400_000);
    await recordDiagnostic(second, 2 * 86_400_000);
    expect(saved).not.toMatch(/Alice|Bob|https?:|Secret|stack|Cannot read/);
    expect(JSON.parse(saved!)).toEqual([[diagnosticHash(first), 2, 2]]);
  });

  it('caps counts, distinct entries and serialized size, then reloads the same code', async () => {
    const names = ['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError'];
    const messages = [
      'Cannot read properties',
      'Cannot set property',
      'is not a function',
      'is not defined',
      'quota exceeded',
      'network error',
    ];
    for (const name of names)
      for (const message of messages) {
        const error = new Error(message);
        error.name = name;
        await recordDiagnostic(error, 20_000 * 86_400_000);
      }
    const rows = JSON.parse(saved!) as [string, number, number][];
    expect(rows).toHaveLength(20);
    expect(saved!.length).toBeLessThan(500);
    const matching = new Error('Cannot read properties');
    saved = JSON.stringify([[diagnosticHash(matching), 999, 1], ...rows.filter((row) => row[0] !== diagnosticHash(matching)).slice(0, 19)]);
    resetDiagnosticsForTest();
    await loadDiagnostics();
    await recordDiagnostic(matching, 3 * 86_400_000);
    expect((JSON.parse(saved!) as [string, number, number][]).find((row) => row[0] === diagnosticHash(matching))).toEqual([
      diagnosticHash(matching),
      999,
      3,
    ]);
    const code = diagnosticCode();
    resetDiagnosticsForTest();
    await loadDiagnostics();
    expect(diagnosticCode()).toBe(code);
  });

  it('encodes and decodes version and the top three coarse hash bytes', () => {
    const code = encodeDiagnosticCode('1.2.31', ['ABCD', '12FE', 'F001']);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(decodeDiagnosticCode(code)).toEqual({ version: '1.2.31', hashes: ['AB', '12', 'F0'] });
    expect(decodeDiagnosticCode('private-name')).toBeNull();
  });
});
