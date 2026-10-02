// Tiny i18n: the English text is the key. `t('Collect {n}', { n: 5 })`.
// Missing translations fall back to English, so a new string never breaks the UI.
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import { localPlanetName } from './i18n/planetNames';

type PlayerLang = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja';
export type Lang = PlayerLang | 'pseudo';
export const LANGS: { id: PlayerLang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'pt', name: 'Português' },
  { id: 'ja', name: '日本語' },
];

const DICTS: Record<PlayerLang, Record<string, string>> = { en: {}, es, fr, de, pt, ja };
const pseudoEnabled = import.meta.env.DEV || import.meta.env.VITE_TESTER === '1';
let lang: Lang = 'en';

function pseudo(key: string): string {
  const accents: Record<string, string> = {
    a: 'å',
    b: 'ƀ',
    c: 'ç',
    d: 'đ',
    e: 'ë',
    f: 'ƒ',
    g: 'ğ',
    h: 'ħ',
    i: 'ï',
    j: 'ĵ',
    k: 'ķ',
    l: 'ļ',
    m: 'ɱ',
    n: 'ñ',
    o: 'ö',
    p: 'ƥ',
    q: 'ʠ',
    r: 'ř',
    s: 'š',
    t: 'ŧ',
    u: 'ü',
    v: 'ṽ',
    w: 'ŵ',
    x: 'ẋ',
    y: 'ý',
    z: 'ž',
  };
  const parts = key.split(/(\{[^{}]+\})/g);
  const letters = parts.map((part) => (part.startsWith('{') && part.endsWith('}') ? '' : part)).join('');
  const expanded = parts
    .map((part) =>
      part.startsWith('{') && part.endsWith('}')
        ? part
        : part.replace(/[a-z]/gi, (char) => {
            const accent = accents[char.toLowerCase()];
            return char === char.toUpperCase() ? accent.toUpperCase() : accent;
          }),
    )
    .join('');
  return `[${expanded} ${'~'.repeat(Math.max(1, Math.ceil(letters.length * 0.4)))}]`;
}

export function detectLang(): Lang {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  const code = nav.slice(0, 2) as PlayerLang;
  return code in DICTS ? code : 'en';
}

export function setLang(l: Lang | '' | undefined) {
  lang = l === 'pseudo' && pseudoEnabled ? 'pseudo' : l && l in DICTS ? l : detectLang();
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'pseudo' ? 'en' : lang;
}

export function getLang() {
  // Date formatters need a real locale while the pseudo text is on screen.
  return lang === 'pseudo' ? 'en' : lang;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = lang === 'pseudo' ? pseudo(key) : (DICTS[lang][key] ?? key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** A planet's display name. The English name stays in saves and codes. */
export function planetName(name: string): string {
  if (name.startsWith('Code ')) return t('Code {code}', { code: name.slice(5) });
  if (lang === 'en' || lang === 'pseudo') return t(name);
  if (name === 'Beat the clock!') return t('Beat the clock!');
  if (name === 'Your garden') return t('Your garden');
  return localPlanetName(name, lang) ?? t(name);
}

/** Plural helper: picks `one` when n === 1. */
export function tp(n: number, one: string, other: string, vars: Record<string, string | number> = {}) {
  return t(n === 1 ? one : other, { n, ...vars });
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__i18n = { setLang, t };
}

declare global {
  interface Window {
    __i18n?: { setLang: typeof setLang; t: typeof t };
  }
}
