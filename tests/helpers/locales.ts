import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Copy lints inspect English keys and every installed content fragment too. */
export function allStrings(lang: string): Record<string, string> {
  const keys = JSON.parse(readFileSync('src/locales/_keys.json', 'utf8')) as string[];
  const main: Record<string, string> =
    lang === 'en' ? Object.fromEntries(keys.map((key) => [key, key])) : JSON.parse(readFileSync(`src/locales/${lang}.json`, 'utf8'));
  const dir = 'src/locales/content';
  for (const file of readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()) {
    const fragment = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Record<string, Record<string, string>>;
    if (!fragment[lang]) throw new Error(`${file} is missing ${lang}`);
    Object.assign(main, fragment[lang]);
  }
  return main;
}
