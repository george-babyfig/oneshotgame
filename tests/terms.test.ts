// Originality lint (ROADMAP-v2 section 3 "Guardrail: our own design", M1 item 1.4).
// No hit game names or hit-specific terms in any player-facing string or store listing, in all six languages.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// ---- Banned terms (extend here) ----

/**
 * Latin-script terms, matched case-insensitively as whole words (so "King" does not hit "Kingfisher"
 * or "looking", and "joker" does not hit "joke").
 * "King" was checked against every locale and store listing: no false positives today.
 */
export const BANNED_TERMS = [
  'Balatro',
  'Candy Crush',
  'Clash of Clans',
  'Clash Royale',
  'Angry Birds',
  'Royal Match',
  'Monopoly GO',
  'Pokémon',
  'Pokemon',
  'Genshin',
  'Minecraft',
  'Roblox',
  'Fortnite',
  'Animal Crossing',
  'Neko Atsume',
  'Peggle',
  'Bloons',
  'Vampire Survivors',
  'Town Hall',
  'joker',
  'Supercell',
  'King',
  'Nintendo',
  'battle pass',
];

/** Patterns for hit-specific formulas, e.g. "chips × mult". */
export const BANNED_PATTERNS: { label: string; re: RegExp }[] = [{ label: 'chips × mult', re: /\bchips\s*(?:×|x|\*)\s*mult\b/iu }];

/**
 * Japanese spellings, matched as substrings. キング (King) is deliberately left out: it is inside
 * トラッキング ("tracking"), which the listing and settings use.
 */
export const BANNED_TERMS_JA = [
  'バラトロ',
  'キャンディークラッシュ',
  'クラッシュ・オブ・クラン',
  'クラロワ',
  'アングリーバード',
  'ロイヤルマッチ',
  'モノポリーGO',
  'ポケモン',
  'ポケットモンスター',
  '原神',
  'マインクラフト',
  'マイクラ',
  'ロブロックス',
  'フォートナイト',
  'どうぶつの森',
  'ねこあつめ',
  'ペグル',
  'ヴァンパイアサバイバーズ',
  'タウンホール',
  'ジョーカー',
  'スーパーセル',
  '任天堂',
  'バトルパス',
];

export const LOCALES = ['es', 'fr', 'de', 'pt', 'ja'];

// ---- Helpers ----

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MATCHERS: { label: string; re: RegExp }[] = [
  ...BANNED_TERMS.map((t) => ({
    label: t,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(t).replace(/ /g, '[\\s\\u00a0-]+')}(?![\\p{L}\\p{N}])`, 'iu'),
  })),
  ...BANNED_PATTERNS,
  ...BANNED_TERMS_JA.map((t) => ({ label: t, re: new RegExp(escapeRe(t), 'u') })),
];

export function termHits(s: string): string[] {
  return MATCHERS.filter((m) => m.re.test(s)).map((m) => m.label);
}

function walk(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}

const rel = (p: string) => relative(process.cwd(), p).split(sep).join('/');

/** First-argument string literals of t('...') and both strings of tp(n, '...', '...') in src/. */
function sourceStrings(): { file: string; s: string }[] {
  const lit = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|\`((?:[^\`\\]|\\.)*)\``;
  const tCall = new RegExp(String.raw`\bt\(\s*(?:${lit})`, 'g');
  const tpCall = new RegExp(String.raw`\btp\([^,]+,\s*(?:${lit})\s*,\s*(?:${lit})`, 'g');
  const out: { file: string; s: string }[] = [];
  for (const f of walk('src', '.ts')) {
    const src = readFileSync(f, 'utf8');
    const file = rel(f);
    for (const m of src.matchAll(tCall)) out.push({ file, s: m[1] ?? m[2] ?? m[3] });
    for (const m of src.matchAll(tpCall)) out.push({ file, s: m[1] ?? m[2] ?? m[3] }, { file, s: m[4] ?? m[5] ?? m[6] });
  }
  return out;
}

// ---- Rules ----

describe('terms: the matcher', () => {
  it('matches banned names as whole words only', () => {
    expect(termHits('Build a Town Hall')).toEqual(['Town Hall']);
    expect(termHits('like POKÉMON')).toEqual(['Pokémon']);
    expect(termHits('Chips x Mult')).toEqual(['chips × mult']);
    expect(termHits('the King of planets')).toEqual(['King']);
    expect(termHits('Kingfisher, looking, parking, Kings Canyon')).toEqual([]);
    expect(termHits('a joke, pokey, battles passed')).toEqual([]);
    expect(termHits('トラッキングなし')).toEqual([]);
    expect(termHits('ポケモンみたい')).toEqual(['ポケモン']);
  });
});

describe('terms: no hit names in player-facing strings', () => {
  for (const lang of LOCALES) {
    it(`${lang}.json keys and translations`, () => {
      const dict = JSON.parse(readFileSync(`src/locales/${lang}.json`, 'utf8')) as Record<string, string>;
      expect(Object.keys(dict).length).toBeGreaterThan(150);
      const bad: string[] = [];
      for (const [key, value] of Object.entries(dict)) {
        const hk = termHits(key);
        if (hk.length) bad.push(`${lang}.json key ${JSON.stringify(key)} → ${hk.join(', ')}`);
        const hv = termHits(String(value));
        if (hv.length) bad.push(`${lang}.json value ${JSON.stringify(value)} → ${hv.join(', ')}`);
      }
      expect(bad, bad.join('\n')).toEqual([]);
    });
  }

  it("t('...') and tp() literals in src/", () => {
    const strings = sourceStrings();
    expect(strings.length).toBeGreaterThan(150);
    const bad = strings.flatMap(({ file, s }) => {
      const h = termHits(s);
      return h.length ? [`${file}: ${JSON.stringify(s)} → ${h.join(', ')}`] : [];
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('terms: no hit names in the store listings', () => {
  const files = walk('store', '.md').map(rel).sort();

  it('has a listing in all six languages', () => {
    for (const f of ['store/listing.md', ...LOCALES.map((l) => `store/listing.${l}.md`)]) expect(files).toContain(f);
  });

  it('every store/ text file is clean', () => {
    const bad: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const h = termHits(line);
          if (h.length) bad.push(`${f}:${i + 1}: ${h.join(', ')}: ${line.trim()}`);
        });
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
