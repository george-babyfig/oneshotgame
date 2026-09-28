// Kid-safe policy gates (ROADMAP-v2 M0, sections 4c, 6.5, 6.6, 7.5).
// Static source scans plus a few rule checks. Each rule fails with the offending file or string.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { CONTINUE_COST, CONTINUE_FROM_PLANET, CONTINUE_MAX, CONTINUE_THROWS, continueAllowed, countsAsFail } from '../src/meta/continues';
import { rollVisitors } from '../src/meta/visitors';
import { defaultProfile } from '../src/meta/profile';
import { SPECIES } from '../src/core/world';

// ---- Word lists (extend here) ----

/** Urgency, countdown and hard-sell words, matched case-insensitively in every key, translation and t() literal. */
export const URGENCY_WORDS: Record<string, string[]> = {
  en: [
    'hurry',
    'last chance',
    "don't miss",
    'ends in',
    'left!',
    'only today',
    'limited time',
    'best value',
    'popular',
    '× the value',
    'x the value',
    'grab a pack',
    'so close',
  ],
  es: ['date prisa', 'última oportunidad', 'mejor valor', 'popular'],
  fr: ['dépêche', 'dernière chance', 'meilleure valeur', 'populaire'],
  de: ['beeil', 'letzte chance', 'bester wert', 'beliebt'],
  pt: ['corra', 'última chance', 'melhor valor', 'popular'],
  ja: ['急いで', '最後のチャンス', 'お得', '人気'],
};

/** Patterns that are banned outright, e.g. "+25%" bonus claims. */
export const URGENCY_PATTERNS: RegExp[] = [/\+\d+%/];

/** Calls that leave the app or raise a system prompt. */
export const OUTBOUND_CALLS = [
  'Share.share(',
  'navigator.share(',
  'requestReview(',
  'LocalNotifications.requestPermissions(',
  'window.open(',
  'App.openUrl(',
];
export const OUTBOUND_FILES = ['src/ui/share.ts', 'src/ui/postcard.ts', 'src/ui/platform.ts', 'src/ui/flows/settings.ts'];
export const GC_AUTH_FILES = ['src/ui/gamecenter.ts'];
export const GC_SIGNIN_FILES = ['src/ui/gamecenter.ts', 'src/ui/flows/settings.ts', 'src/ui/app.ts'];

export const AUTO_PROMPTS = ['maybeAskReview', 'askForReminders', 'Want a nudge?'];
export const LOCALES = ['es', 'fr', 'de', 'pt', 'ja'];
export const NON_CAMPAIGN_MODES = ['tutorial', 'voyage', 'daily', 'rush', 'challenge', 'zen', 'remix'] as const;

// ---- Helpers ----

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** Repo-relative path with forward slashes, e.g. 'src/ui/share.ts'. */
const rel = (p: string) => relative(process.cwd(), p).split(sep).join('/');

/** Source with block comments and whole-line // comments removed (so a mention in a comment isn't a violation). */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const SRC = walk('src').map((f) => ({ file: rel(f), src: code(f) }));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A term matches at the start of a word (so 'ends in' does not hit 'friends in'), and may run on ('beeil' hits 'beeilen'). */
function termRegex(term: string): RegExp {
  const lead = /^\p{Script=Latin}/u.test(term) ? '(?<!\\p{L})' : '';
  return new RegExp(lead + escapeRe(term), 'iu');
}

const URGENCY: { label: string; re: RegExp }[] = [
  ...Object.entries(URGENCY_WORDS).flatMap(([lang, words]) => words.map((w) => ({ label: `${lang}:"${w}"`, re: termRegex(w) }))),
  ...URGENCY_PATTERNS.map((re) => ({ label: String(re), re })),
];

function urgencyHits(s: string): string[] {
  return URGENCY.filter((u) => u.re.test(s)).map((u) => u.label);
}

/** First-argument string literals of t('...') / t("...") / tp(n, '...', '...') in all source files. */
function sourceStrings(): { file: string; s: string }[] {
  const lit = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
  const tCall = new RegExp(String.raw`\bt\(\s*(?:${lit})`, 'g');
  const tpCall = new RegExp(String.raw`\btp\([^,]+,\s*(?:${lit})\s*,\s*(?:${lit})`, 'g');
  const out: { file: string; s: string }[] = [];
  for (const { file, src } of SRC) {
    for (const m of src.matchAll(tCall)) out.push({ file, s: m[1] ?? m[2] });
    for (const m of src.matchAll(tpCall)) out.push({ file, s: m[1] ?? m[2] }, { file, s: m[3] ?? m[4] });
  }
  return out;
}

// ---- Rules ----

describe('policy: outbound actions are gated (0.1, 0.2)', () => {
  it('outbound calls live only in the allowed files, and each of those files calls parentalGate(', () => {
    const bad: string[] = [];
    for (const { file, src } of SRC) {
      const calls = OUTBOUND_CALLS.filter((c) => src.replace(/\bfunction\s+\w+\(/g, '').includes(c));
      if (!calls.length) continue;
      if (!OUTBOUND_FILES.includes(file)) bad.push(`${file}: ${calls.join(', ')} outside the allowed files`);
      else if (!src.includes('parentalGate(')) bad.push(`${file}: ${calls.join(', ')} without parentalGate(`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('Game Center sign-in happens only from gamecenter.ts, settings.ts, or app.ts behind settings.gameCenter', () => {
    const bad: string[] = [];
    for (const { file, src } of SRC) {
      if (src.includes('GC.authenticate(') && !GC_AUTH_FILES.includes(file)) bad.push(`${file}: GC.authenticate( outside gamecenter.ts`);
      if (src.includes('gcSignIn(') && !GC_SIGNIN_FILES.includes(file)) bad.push(`${file}: gcSignIn( outside the allowed files`);
      if (file === 'src/ui/app.ts') {
        const lines = src.split('\n');
        lines.forEach((line, i) => {
          if (line.includes('gcSignIn(') && !`${lines[i - 1] ?? ''}\n${line}`.includes('settings.gameCenter')) {
            bad.push(`${file}:${i + 1}: gcSignIn( not guarded by settings.gameCenter: ${line.trim()}`);
          }
        });
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('policy: no automatic prompts (0.2)', () => {
  it('no automatic review or reminder prompts anywhere in src/', () => {
    const bad = SRC.flatMap(({ file, src }) => AUTO_PROMPTS.filter((w) => src.includes(w)).map((w) => `${file}: ${w}`));
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('policy: the continue rule (0.5, 4c)', () => {
  const base = { mode: 'campaign' as const, planet: 11, won: false, failsBefore: 1, used: 0 };

  it('uses the fixed constants and only allows campaign planet 11+ from the 2nd fail, at most twice', () => {
    expect(CONTINUE_COST).toBe(50);
    expect(CONTINUE_MAX).toBe(2);
    expect(CONTINUE_FROM_PLANET).toBe(11);
    expect(CONTINUE_THROWS).toBe(5);

    for (let planet = 1; planet <= 10; planet++) {
      expect(continueAllowed({ ...base, planet, failsBefore: 5 }), `planet ${planet} must never offer a continue`).toBe(false);
    }
    expect(continueAllowed({ ...base, won: true }), 'never after a win').toBe(false);
    for (const mode of NON_CAMPAIGN_MODES) {
      expect(continueAllowed({ ...base, mode, planet: 40, failsBefore: 3 }), `mode ${mode} must never offer a continue`).toBe(false);
    }
    expect(continueAllowed({ ...base, failsBefore: 0 }), 'never on the first fail').toBe(false);

    for (const planet of [11, 12, 50, 200]) {
      for (const failsBefore of [1, 2, 7]) {
        for (const used of [0, 1]) {
          expect(continueAllowed({ ...base, planet, failsBefore, used }), `planet ${planet}, fails ${failsBefore}, used ${used}`).toBe(
            true,
          );
        }
      }
    }
    for (const used of [2, 3, 10]) {
      expect(continueAllowed({ ...base, used }), `used ${used} is over the cap`).toBe(false);
    }
  });

  it('using fewer than half the throws is not a fail', () => {
    expect(countsAsFail(2, 10)).toBe(false);
    expect(countsAsFail(4, 10)).toBe(false);
    expect(countsAsFail(5, 10)).toBe(true);
    expect(countsAsFail(10, 10)).toBe(true);
    expect(countsAsFail(2, 5)).toBe(false);
    expect(countsAsFail(3, 5)).toBe(true);
  });
});

describe('policy: visitors use no chance (0.4)', () => {
  it('visitor code has no Math.random or rngFrom', () => {
    const bad: string[] = [];
    for (const file of ['src/meta/visitors.ts', 'src/ui/flows/visitors.ts']) {
      const src = code(file);
      for (const w of ['Math.random', 'rngFrom']) if (src.includes(w)) bad.push(`${file}: ${w}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('visitors never give gems, and the same inputs give the same gifts', () => {
    const now = Date.UTC(2026, 8, 28, 12);
    const p = defaultProfile(now - 30 * 86400000);
    const ids = SPECIES.slice(0, 6).map((s) => s.id);
    p.seen = [...ids];
    p.galaxy = [{ n: 1, name: 'Test', hue: 120, stars: 3, species: ids.slice(0, 3), life: 50, colors: [] }];
    p.meta.lastSeen = now - 10 * 3600000;

    const a = rollVisitors(structuredClone(p), now);
    const b = rollVisitors(structuredClone(p), now);
    expect(a.length, 'expected some visitors after 10 hours away').toBeGreaterThan(0);
    const gems = a.filter((g) => g.gems !== 0).map((g) => `${g.species}: ${g.gems} gems`);
    expect(gems, gems.join('\n')).toEqual([]);
    expect(b).toEqual(a);
  });
});

describe('policy: no urgency or countdown words (0.3, 0.6, 6.6)', () => {
  it('no locale key or translation contains an urgency word', () => {
    const bad: string[] = [];
    for (const lang of LOCALES) {
      const dict = JSON.parse(readFileSync(`src/locales/${lang}.json`, 'utf8')) as Record<string, string>;
      for (const [key, value] of Object.entries(dict)) {
        const hk = urgencyHits(key);
        if (hk.length) bad.push(`${lang}.json key ${JSON.stringify(key)} → ${hk.join(', ')}`);
        const hv = urgencyHits(String(value));
        if (hv.length) bad.push(`${lang}.json value ${JSON.stringify(value)} → ${hv.join(', ')}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it("no t('...') / tp() string in src/ contains an urgency word", () => {
    const bad = sourceStrings().flatMap(({ file, s }) => {
      const h = urgencyHits(s);
      return h.length ? [`${file}: ${JSON.stringify(s)} → ${h.join(', ')}`] : [];
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('policy: no dice (0.4)', () => {
  it("no 🎲 or icon('dice' in src/ui", () => {
    const bad = SRC.filter(({ file }) => file.startsWith('src/ui/')).flatMap(({ file, src }) =>
      ['🎲', "icon('dice'", 'icon("dice"'].filter((w) => src.includes(w)).map((w) => `${file}: ${w}`),
    );
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('policy: no shop push in failure flows (0.5)', () => {
  it("game.ts has no 'grab a pack' or 'So close'", () => {
    const src = code('src/ui/game.ts').toLowerCase();
    const bad = ['grab a pack', 'so close'].filter((w) => src.includes(w)).map((w) => `src/ui/game.ts: ${w}`);
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
