import { loadKey, saveKey } from './storage';
import { VERSION } from './tuning';

const KEY = 'pp.diagnostics.v1';
const MAX_ENTRIES = 20;
const MAX_COUNT = 999;
type Entry = [hash: string, count: number, day: number];
let entries: Entry[] = [];

// Dynamic message text never reaches storage: only these fixed, broad first-line categories are hashed.
function category(reason: unknown): string {
  const error = reason instanceof Error ? reason : null;
  const name =
    error && /^(TypeError|ReferenceError|RangeError|SyntaxError|URIError|EvalError|AggregateError)$/.test(error.name)
      ? error.name
      : 'Error';
  const firstLine = (error?.message ?? (typeof reason === 'string' ? reason : '')).split(/[\r\n]/, 1)[0].toLowerCase();
  let kind = 'other';
  if (/cannot read propert|cannot read property|undefined is not an object|null is not an object/.test(firstLine)) kind = 'read-property';
  else if (/cannot set propert|readonly property|read.only property/.test(firstLine)) kind = 'write-property';
  else if (/is not a function|not callable/.test(firstLine)) kind = 'not-function';
  else if (/is not defined|cannot find variable/.test(firstLine)) kind = 'missing-variable';
  else if (/quota|storage is full/.test(firstLine)) kind = 'storage-full';
  else if (/network|connection|offline/.test(firstLine)) kind = 'connection';
  else if (/unexpected token|unexpected end|invalid or unexpected token/.test(firstLine)) kind = 'syntax';
  return `${name}:${kind}`;
}

/** A stable 16-bit hash of a fixed category, never of personal or free-form text. */
export function diagnosticHash(reason: unknown): string {
  let hash = 2166136261;
  for (const char of category(reason)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash & 0xffff || 1).toString(16).padStart(4, '0').toUpperCase();
}

function validEntries(raw: string | null): Entry[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (row): row is Entry =>
          Array.isArray(row) &&
          row.length === 3 &&
          /^[0-9A-F]{4}$/.test(row[0]) &&
          Number.isInteger(row[1]) &&
          row[1] >= 1 &&
          row[1] <= MAX_COUNT &&
          Number.isInteger(row[2]) &&
          row[2] >= 0 &&
          row[2] <= 99999,
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

let ready: Promise<void> | undefined;
function ensureLoaded(): Promise<void> {
  if (!ready)
    ready = loadKey(KEY)
      .then((raw) => {
        entries = validEntries(raw);
      })
      .catch(() => {
        entries = [];
      });
  return ready;
}

let pending: Promise<void> = Promise.resolve();
export function recordDiagnostic(reason: unknown, now = Date.now()): Promise<void> {
  const hash = diagnosticHash(reason);
  const day = Math.max(0, Math.min(99999, Math.floor(now / 86_400_000)));
  pending = pending
    .then(async () => {
      await ensureLoaded();
      const old = entries.find((entry) => entry[0] === hash);
      if (old) {
        old[1] = Math.min(MAX_COUNT, old[1] + 1);
        old[2] = day;
      } else {
        entries.push([hash, 1, day]);
      }
      entries.sort((a, b) => b[2] - a[2] || b[1] - a[1]);
      entries = entries.slice(0, MAX_ENTRIES);
      await saveKey(KEY, JSON.stringify(entries));
    })
    // A failed save (say, full storage) must never reject: an unhandled rejection would record again, forever.
    .catch(() => {});
  return pending;
}

export async function loadDiagnostics(): Promise<void> {
  await ensureLoaded();
}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Eight Base32 symbols: version (5/5/6 bits) and three leading 8-bit hashes. Zero means no hash. */
export function encodeDiagnosticCode(version: string, hashes: string[]): string {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n, i) => !Number.isInteger(n) || n < 0 || n >= [32, 32, 64][i])) {
    throw new Error('Unsupported diagnostic version');
  }
  const versionBits = (parts[0] << 11) | (parts[1] << 6) | parts[2];
  const bytes = hashes.slice(0, 3).map((hash) => parseInt(hash.slice(0, 2), 16) || 1);
  const value = (BigInt(versionBits) << 24n) | (BigInt(bytes[0] ?? 0) << 16n) | (BigInt(bytes[1] ?? 0) << 8n) | BigInt(bytes[2] ?? 0);
  const symbols = Array.from({ length: 8 }, (_, i) => ALPHABET[Number((value >> BigInt((7 - i) * 5)) & 31n)]).join('');
  return `${symbols.slice(0, 4)}-${symbols.slice(4)}`;
}

export function decodeDiagnosticCode(code: string): { version: string; hashes: string[] } | null {
  if (!/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(code)) return null;
  let value = 0n;
  for (const symbol of code.replace('-', '')) value = (value << 5n) | BigInt(ALPHABET.indexOf(symbol));
  const versionBits = Number(value >> 24n);
  const hashes = [16n, 8n, 0n]
    .map((shift) => Number((value >> shift) & 255n))
    .filter(Boolean)
    .map((n) => n.toString(16).padStart(2, '0').toUpperCase());
  return { version: `${versionBits >> 11}.${(versionBits >> 6) & 31}.${versionBits & 63}`, hashes };
}

export function diagnosticCode(version = VERSION): string {
  const top = [...entries].sort((a, b) => b[1] - a[1] || b[2] - a[2]).slice(0, 3);
  try {
    return encodeDiagnosticCode(
      version,
      top.map((entry) => entry[0]),
    );
  } catch {
    // A version outside the packed range must not break Grown-ups; 0.0.0 still carries the hashes.
    return encodeDiagnosticCode(
      '0.0.0',
      top.map((entry) => entry[0]),
    );
  }
}

/** Test seam; never clears the persisted key. */
export function resetDiagnosticsForTest(): void {
  entries = [];
  ready = undefined;
  pending = Promise.resolve();
}
