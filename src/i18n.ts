// Tiny i18n: the English text is the key. `t('Collect {n}', { n: 5 })`.
// Missing translations fall back to English, so a new string never breaks the UI.
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';

export type Lang = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja';
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'pt', name: 'Português' },
  { id: 'ja', name: '日本語' },
];

const DICTS: Record<Lang, Record<string, string>> = { en: {}, es, fr, de, pt, ja };
let lang: Lang = 'en';

export function detectLang(): Lang {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  const code = nav.slice(0, 2) as Lang;
  return code in DICTS ? code : 'en';
}

export function setLang(l: Lang | '' | undefined) {
  lang = l && l in DICTS ? l : detectLang();
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function getLang() {
  return lang;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Plural helper: picks `one` when n === 1. */
export function tp(n: number, one: string, other: string, vars: Record<string, string | number> = {}) {
  return t(n === 1 ? one : other, { n, ...vars });
}
