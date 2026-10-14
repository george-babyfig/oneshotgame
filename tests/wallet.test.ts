import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defaultProfile } from '../src/meta/profile';
import { clearLedger, ledgerSummary } from '../src/meta/ledger';
import { earn, spend } from '../src/meta/wallet';

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sources(path) : path.endsWith('.ts') ? [path] : [];
  });
}

type Token = { value: string; line: number };

/** Enough lexical structure to distinguish balance writes from reads and text in comments. */
function tokens(source: string): Token[] {
  const out: Token[] = [];
  const re =
    /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d+|\?\?=|\|\|=|&&=|\*\*=|<<=|>>>=|>>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|\+\+|--|===|!==|==|!=|>=|<=|=>|\S/g;
  let line = 1;
  for (const m of source.matchAll(re)) {
    const value = m[0];
    if (!/^\s|^\/\//.test(value) && !value.startsWith('/*')) out.push({ value, line });
    line += (value.match(/\n/g) ?? []).length;
  }
  return out;
}

const assignment = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '??=', '||=', '&&=', '&=', '|=', '^=', '<<=', '>>=', '>>>=']);

function balanceEnd(t: Token[], start: number): number | undefined {
  let i = start;
  if (t[i]?.value === 'this' && t[i + 1]?.value === '.' && t[i + 2]?.value === 'p') i += 2;
  else if (t[i]?.value !== 'p') return;
  if (t[i + 1]?.value !== '.' && t[i + 1]?.value !== '[') return;
  let field: string;
  if (t[i + 1].value === '.') {
    field = t[i + 2]?.value;
    i += 3;
  } else {
    field = t[i + 2]?.value?.replace(/^['"]|['"]$/g, '');
    if (t[i + 3]?.value !== ']') return;
    i += 4;
  }
  if (field === 'gems' || field === 'dust') return i;
  if (field !== 'mats') return;
  if (t[i]?.value === '!') i++;
  if (t[i]?.value === '.') return i + 2;
  if (t[i]?.value !== '[') return i;
  let depth = 1;
  for (i++; i < t.length; i++) {
    if (t[i].value === '[') depth++;
    if (t[i].value === ']') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
}

function matchingOpen(t: Token[], close: number): number {
  const pairs: Record<string, string> = { ']': '[', '}': '{', ')': '(' };
  const stack: string[] = [];
  for (let i = close; i >= 0; i--) {
    if (pairs[t[i].value]) stack.push(pairs[t[i].value]);
    else if (t[i].value === stack[stack.length - 1]) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  return -1;
}

function directWrites(source: string): number[] {
  const t = tokens(source);
  const hits = new Set<number>();
  for (let i = 0; i < t.length; i++) {
    const end = balanceEnd(t, i);
    if (end === undefined) continue;
    if (assignment.has(t[end]?.value) || t[end]?.value === '++' || t[end]?.value === '--') hits.add(t[i].line);
    if (t[i - 1]?.value === '++' || t[i - 1]?.value === '--') hits.add(t[i].line);
  }
  for (let i = 0; i < t.length; i++) {
    if (t[i].value === 'Object' && t[i + 1]?.value === '.' && t[i + 2]?.value === 'assign' && t[i + 3]?.value === '(') {
      const end = balanceEnd(t, i + 4);
      if (
        (t[i + 4]?.value === 'p' && t[i + 5]?.value === ',') ||
        (t[i + 4]?.value === 'p' && t[i + 5]?.value === '.' && t[i + 6]?.value === 'mats' && t[i + 7]?.value === ',') ||
        (end !== undefined && (t[end]?.value === ',' || t[end]?.value === ')'))
      )
        hits.add(t[i].line);
    }
    if (t[i].value !== '=' || ![']', '}'].includes(t[i - 1]?.value)) continue;
    const open = matchingOpen(t, i - 1);
    if (open < 0) continue;
    for (let j = open + 1; j < i - 1; j++) {
      if (balanceEnd(t, j) !== undefined) hits.add(t[j].line);
    }
  }
  return [...hits].sort((a, b) => a - b);
}

describe('one wallet', () => {
  it('rejects direct profile balance writes outside wallet and profile', () => {
    const writes = sources('src').flatMap((path) => {
      const name = relative('src', path);
      if (name === 'meta/wallet.ts' || name === 'meta/profile.ts') return [];
      return directWrites(readFileSync(path, 'utf8')).map((line) => `${name}:${line}`);
    });
    expect(writes).toEqual([]);
  });

  it('finds every direct write form without mistaking reads for writes', () => {
    const mustCatch = [
      '++p.gems',
      '--p.dust',
      'p.gems *= 2',
      'p.dust /= 2',
      'p.gems ??= 1',
      'p.gems ||= 1',
      'p.gems &&= 1',
      'Object.assign(p, { gems: 1 })',
      'Object.assign(p.mats, { leaf: 1 })',
      '[p.gems, p.dust] = [1, 2]',
      '({ gems: p.gems } = other)',
      'p.mats![k] += n',
      "p['gems'] = 1",
      'p\n .\n gems\n += 1',
    ];
    for (const fixture of mustCatch) expect(directWrites(fixture), fixture).not.toEqual([]);
    const mustAllow = [
      'p.gems >= 5',
      'p.gems === x',
      'p.dust == x',
      'const x = p.gems',
      'Object.assign(other, { gems: p.gems })',
      'const x = [p.gems, p.dust]',
      '// p.gems = 2',
      'const text = "p.gems = 2"',
    ];
    for (const fixture of mustAllow) expect(directWrites(fixture), fixture).toEqual([]);
  });

  it('credits and debits each currency, with matching ledger totals', async () => {
    await clearLedger();
    const p = defaultProfile();
    earn(p, 'gems', 7, 'quest');
    earn(p, 'dust', 45, 'level_win');
    earn(p, 'leaf', 3, 'material_drop');
    expect(spend(p, 'gems', 5, 'cosmetic')).toBe(true);
    expect(spend(p, 'dust', 20, 'lab')).toBe(true);
    expect(spend(p, 'leaf', 1, 'dye')).toBe(true);
    expect([p.gems, p.dust, p.mats.leaf]).toEqual([32, 25, 2]);
    const economy = ledgerSummary().economy;
    expect(economy.earn_gems_quest - economy.spend_gems_cosmetic).toBe(2);
    expect(economy.earn_dust_level_win - economy.spend_dust_lab).toBe(25);
    expect(economy.earn_leaf_material_drop - economy.spend_leaf_dye).toBe(2);
  });

  it('does nothing when funds are short', async () => {
    await clearLedger();
    const p = defaultProfile();
    expect(spend(p, 'gems', 31, 'continue')).toBe(false);
    expect(spend(p, 'dust', 1, 'lab')).toBe(false);
    expect(spend(p, 'frost', 1, 'dye')).toBe(false);
    expect([p.gems, p.dust, p.mats.frost]).toEqual([30, 0, undefined]);
    expect(ledgerSummary().economy).toEqual({});
  });
});
