// Every translatable string must exist in every locale, with the same {placeholders}.
// Run with DUMP_KEYS=1 to write the key list to src/locales/_keys.json.
import { FESTIVALS } from '../src/meta/festivals';
import { ALBUM_PAGES, SCRAP_BGS, STICKERS } from '../src/meta/stickers';
import { PORTS, VOYAGE_NAMES } from '../src/meta/voyage';
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BIOMES, KINDS, SPECIES } from '../src/core/world';
import { TWISTS } from '../src/core/levels';
import { BOOSTERS, PRODUCTS, SKINS, UPGRADES } from '../src/meta/config';
import { HABITATS } from '../src/meta/habitats';
import { EVENTS } from '../src/meta/events';
import { RANK_TITLES, RANK_UNLOCKS } from '../src/meta/rank';
import { CHAPTER_NAMES } from '../src/meta/progression';
import { ITEMS } from '../src/meta/visitors';
import { COACH, COACH_EVENTS } from '../src/meta/coach';
import { COSMETICS, SLOT_NAMES } from '../src/meta/cosmetics';
import { BANNERS } from '../src/meta/passport';
import { ACHIEVEMENTS } from '../src/meta/achievements';
import { BUILDINGS } from '../src/meta/homeworld';
import { FRAMES, REASON } from '../src/ui/screens/homeworld';
import { PAINTS, RESIDENT_ACCS } from '../src/meta/homeworld';
import { letterStrings } from '../src/meta/inbox';
import { CONSTELLATIONS, MAT_NAMES } from '../src/meta/constellations';
import { DYES } from '../src/meta/dyes';
import { LORE } from '../src/meta/lore';
import { OBJECT_TITLES } from '../src/meta/records';
import { SEASON_NAMES, SKY_EVENTS } from '../src/meta/seasons';
import { WISH_TEMPLATES } from '../src/meta/wishes';
import { NEW_FEATURE } from '../src/meta/nextup';
import { FACTS } from '../src/ui/screens/fieldguide';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** String literals passed to t() / tp(), plus every data string shown via t(). */
export function allKeys(): string[] {
  const keys = new Set<string>();
  const lit = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
  const tCall = new RegExp(String.raw`\bt\(\s*(?:${lit})`, 'g');
  const tpCall = new RegExp(String.raw`\btp\([^,]+,\s*(?:${lit})\s*,\s*(?:${lit})`, 'g');
  const un = (s: string) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
  for (const file of walk('src')) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(tCall)) keys.add(un(m[1] ?? m[2]));
    for (const m of src.matchAll(tpCall)) {
      keys.add(un(m[1] ?? m[2]));
      keys.add(un(m[3] ?? m[4]));
    }
  }
  const add = (s?: string) => s && keys.add(s);
  Object.values(BIOMES).forEach((b) => (add(b.name), add(b.recipe)));
  Object.values(KINDS).forEach((k) => (add(k.name), add(k.desc)));
  Object.values(TWISTS).forEach((x) => (add(x.name), add(x.desc)));
  SPECIES.forEach((s) => (add(s.name), !s.home && add(s.hint)));
  Object.values(BOOSTERS).forEach((b) => (add(b.name), add(b.desc)));
  Object.values(UPGRADES).forEach((u) => add(u.name));
  SKINS.forEach((s) => add(s.name));
  PRODUCTS.forEach((p) => add(p.title));
  HABITATS.forEach((h) => add(h.name));
  EVENTS.forEach((e) => (add(e.name), add(e.desc)));
  RANK_TITLES.forEach(add);
  Object.values(RANK_UNLOCKS).forEach(add);
  CHAPTER_NAMES.forEach(add);
  Object.values(COACH).forEach((tips) => Object.values(tips).forEach(add));
  Object.values(COACH_EVENTS).forEach(add);
  ITEMS.forEach(add);
  COSMETICS.forEach((c) => add(c.name));
  Object.values(SLOT_NAMES).forEach(add);
  BANNERS.forEach((b) => (add(b.name), add(b.how)));
  ACHIEVEMENTS.forEach((a) => add(a.title));
  add('Star Captain');
  Object.values(BUILDINGS).forEach((b) => (add(b.name), add(b.desc)));
  Object.values(REASON).forEach(add);
  PAINTS.forEach((x) => add(x.name));
  RESIDENT_ACCS.forEach((x) => add(x.name));
  FRAMES.forEach((x) => add(x.name));
  letterStrings().forEach(add);
  CONSTELLATIONS.forEach((c) => add(c.name));
  Object.values(MAT_NAMES).forEach(add);
  DYES.forEach((d) => add(d.name));
  Object.values(LORE).forEach(add);
  Object.values(OBJECT_TITLES).forEach(add);
  Object.values(SEASON_NAMES).forEach(add);
  SKY_EVENTS.forEach((e) => add(e.name));
  FESTIVALS.forEach((f) => add(f.name));
  STICKERS.forEach((s) => (add(s.name), add(s.hint[0])));
  ALBUM_PAGES.forEach((pg) => add(pg.name));
  SCRAP_BGS.forEach((b) => add(b.name));
  PORTS.forEach(add);
  VOYAGE_NAMES.forEach(add);
  WISH_TEMPLATES.forEach((wish) => add(wish.text));
  Object.values(NEW_FEATURE).forEach(add);
  Object.values(FACTS).forEach((fact) => (add(fact.element), add(fact.job)));
  // mode names/descriptions live in a UI module (src/ui/flows/modes.ts)
  [
    'Daily Planet',
    'Everyone gets the same planet today. Share your result!',
    'Meteor Rush',
    '{n} seconds, unlimited throws. How much life can you grow?',
    'Zen Garden',
    'No targets, no clock. A world of your own that stays between visits.',
    'Challenge a Friend',
    'Send a code, play the same planet, compare scores.',
  ].forEach(add);
  ['Common', 'Uncommon', 'Rare', 'Legendary'].forEach(add); // src/ui/text.ts rarityName()
  ['short', 'medium', 'long', 'full', 'Someone', 'Paradise!', 'Thriving!', 'Blooming!', 'Nice!'].forEach(add);
  keys.delete('');
  return [...keys].sort();
}

/** Locales that are complete; each must fully cover the key list. */
const LANGS_DONE = ['de', 'pt', 'es', 'ja', 'fr'];

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  const keys = allKeys();
  if (process.env.DUMP_KEYS) writeFileSync('src/locales/_keys.json', JSON.stringify(keys, null, 2) + '\n');

  it('collects a sensible number of keys', () => {
    expect(keys.length).toBeGreaterThan(150);
  });

  for (const lang of LANGS_DONE) {
    it(`${lang} translates every key with matching placeholders`, () => {
      const dict = JSON.parse(readFileSync(`src/locales/${lang}.json`, 'utf8')) as Record<string, string>;
      const missing = keys.filter((k) => !(k in dict));
      expect(missing, `missing in ${lang}`).toEqual([]);
      const bad = keys.filter((k) => placeholders(k).join() !== placeholders(dict[k]).join());
      expect(bad, `placeholder mismatch in ${lang}`).toEqual([]);
    });
  }
});
