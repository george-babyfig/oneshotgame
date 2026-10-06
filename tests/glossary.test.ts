// Glossary lint (ROADMAP-v2 section 4h "Glossary: every player-facing noun", M2 item 2.7).
// "Every new term retires an old one or earns its place." This file fails the build on a duplicate
// name, a retired word coming back, a never-introduced word, or a hit game's term, in any of the six
// languages. Many retired words are still in today's game and leave in later milestones, so each
// retirement carries the milestone that removes it: words from built milestones fail, the rest are
// printed as pending. When a milestone ships, add it to BUILT.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { BIOMES, KINDS, SPECIES } from '../src/core/world';
import { TWISTS } from '../src/core/levels';
import { BOOSTERS } from '../src/meta/config';

// ---- Milestones ----

const MILESTONES = [
  'M0',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M6.5',
  'M7',
  'M7.5',
  'M8',
  'M9',
  'M10',
  'M10.5',
  'M11',
  'M11.5',
  'M12',
  'M13',
  'M14',
  'M15',
  'M16',
  'M17',
] as const;
type Milestone = (typeof MILESTONES)[number];

/** Milestones that are built. Later milestones append themselves here when they ship. */
export const BUILT: Milestone[] = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M6.5', 'M7', 'M7.5', 'M8', 'M9', 'M10'];

const built = (m: Milestone) => BUILT.includes(m);

const LANGS = ['es', 'fr', 'de', 'pt', 'ja'] as const;
type Lang = (typeof LANGS)[number];

/** Canonical translation(s) of a noun in one language. The first form is the display name; any form
 * counts as a match (case-insensitive substring), so list inflected or compound stems after it. */
type Tr = Partial<Record<Lang, string[]>>;

// ---- 1. The glossary table ----

interface Noun {
  /** The one English name (as the game shows it today, or as 4h names it if it is not built yet). */
  en: string;
  /** Other English spellings of the same concept (plural, older in-game name). */
  aliases?: string[];
  area: 'round' | 'meta';
  /** 'today' = in the game before ROADMAP-v2; otherwise the milestone that introduces it. */
  since: 'today' | Milestone;
  /** Translations as they appear in src/locales today. Omitted = read from the standalone key `en`. */
  tr?: Tr;
  /** English matcher for the consistency check. Default: whole word, case-insensitive, en + aliases. */
  match?: RegExp;
  /** Consistency hits fail the build (checked clean today). Otherwise they are printed (watch). */
  strict?: boolean;
  /** The concept is in the game but no string names it (so there is nothing to translate). */
  unnamed?: boolean;
  note?: string;
}

const ja = (...s: string[]) => s;

/** Kept nouns (4h "Kept (unchanged)"), round area. Data-backed names are added below from src/core. */
const KEPT_ROUND: Noun[] = [
  {
    en: 'planet',
    aliases: ['planets'],
    area: 'round',
    since: 'today',
    tr: { es: ['planeta'], fr: ['planète'], de: ['Planet'], pt: ['planeta', 'planetári'], ja: ja('惑星', 'プラネット') },
  },
  {
    en: 'throws',
    aliases: ['throw'],
    area: 'round',
    since: 'today',
    tr: { es: ['lanzamiento'], fr: ['lancer'], de: ['Würfe', 'Wurf'], pt: ['lançamento'], ja: ja('投げ') },
  },
  {
    en: 'life',
    area: 'round',
    since: 'today',
    tr: { es: ['vida'], fr: ['vie'], de: ['Leben'], pt: ['vida'], ja: ja('いのち') },
  },
  {
    en: 'stars',
    area: 'round',
    since: 'today',
    strict: true,
    note: 'The 1-3 star rating; "Star" in names (Star Road, Star Crown) is not this noun.',
    tr: { es: ['estrella'], fr: ['étoile'], de: ['Stern'], pt: ['estrela'], ja: ja('星', '★') },
  },
  {
    en: 'goals',
    aliases: ['goal'],
    area: 'round',
    since: 'today',
    tr: { es: ['objetivo'], fr: ['objectif'], de: ['Ziel'], pt: ['objetivo'], ja: ja('目標') },
  },
  {
    en: 'swap',
    area: 'round',
    since: 'today',
    strict: true,
    tr: { es: ['cambiar'], fr: ['changer'], de: ['tausch'], pt: ['trocar'], ja: ja('入れかえ') },
  },
  {
    en: 'Supernova',
    aliases: ['Supernovas'],
    area: 'round',
    since: 'today',
    strict: true,
    tr: { es: ['Supernova'], fr: ['Supernova'], de: ['Supernova'], pt: ['Supernova'], ja: ja('スーパーノヴァ') },
  },
  {
    en: 'Hard',
    area: 'round',
    since: 'today',
    strict: true,
    match: /(?<![\p{L}\p{N}])HARD(?![\p{L}\p{N}])/u,
    tr: { es: ['DIFÍCIL'], fr: ['DIFFICILE'], de: ['SCHWER'], pt: ['DIFÍCIL'], ja: ja('ハード') },
  },
  {
    en: 'Super Hard',
    area: 'round',
    since: 'today',
    match: /SUPER HARD/u,
    strict: true,
    tr: { es: ['SÚPER DIFÍCIL'], fr: ['SUPER DIFFICILE'], de: ['SUPERSCHWER'], pt: ['SUPER DIFÍCIL'], ja: ja('スーパーハード') },
  },
  {
    en: 'Meteor Finale',
    area: 'round',
    since: 'today',
    strict: true,
    tr: { es: ['Final de meteoros'], fr: ['Final météores'], de: ['Meteorfinale'], pt: ['Final de meteoros'], ja: ja('メテオフィナーレ') },
  },
  {
    en: 'boosters',
    aliases: ['booster'],
    area: 'round',
    since: 'today',
    strict: true,
    tr: { es: ['Potenciador'], fr: ['Bonus'], de: ['Booster'], pt: ['Reforço'], ja: ja('ブースター') },
  },
  {
    en: 'continue',
    area: 'round',
    since: 'today',
    unnamed: true,
    note: 'A kept concept with no on-screen word today: the button reads "+5 throws · 💎{n}".',
  },
  {
    en: 'Momentum',
    area: 'round',
    since: 'today',
    strict: true,
    tr: { es: ['Impulso'], fr: ['Élan'], de: ['Schwung'], pt: ['Embalo'], ja: ja('連勝ボーナス') },
  },
  {
    en: 'Buddy',
    area: 'round',
    since: 'today',
    strict: true,
    tr: { es: ['Compañero'], fr: ['Compagnon'], de: ['Kumpel'], pt: ['Parceiro'], ja: ja('バディ') },
  },
];

/** Kept nouns (4h "Kept (unchanged)"), meta area. */
const KEPT_META: Noun[] = [
  { en: 'stardust', area: 'meta', since: 'today' },
  {
    en: 'gems',
    aliases: ['gem'],
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Gemas', 'gema'], fr: ['Gemmes', 'gemme'], de: ['Edelsteine', 'Edelstein'], pt: ['Gemas', 'gema'], ja: ja('ジェム') },
  },
  {
    en: 'Vault',
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Bóveda'], fr: ['Réserve'], de: ['Tresor'], pt: ['Cofre'], ja: ja('金庫') },
  },
  { en: 'Collect all', area: 'meta', since: 'today', strict: true },
  {
    en: 'galaxy',
    area: 'meta',
    since: 'today',
    tr: { es: ['Galaxia', 'galáctic'], fr: ['Galaxie', 'galactique'], de: ['Galaxie'], pt: ['Galáxia', 'galáctic'], ja: ja('銀河') },
  },
  { en: 'Star Map', area: 'meta', since: 'today' },
  {
    en: 'chapters',
    aliases: ['chapter'],
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['capítulo'], fr: ['chapitre'], de: ['Kapitel'], pt: ['capítulo'], ja: ja('チャプター', '章') },
  },
  {
    en: 'chapter chest',
    area: 'meta',
    since: 'today',
    strict: true,
    tr: {
      es: ['cofre de capítulo'],
      fr: ['coffre de chapitre'],
      de: ['Kapiteltruhe'],
      pt: ['baú de capítulo'],
      ja: ja('チャプターの宝箱'),
    },
  },
  { en: 'Homeworld', area: 'meta', since: 'today' },
  {
    en: 'Critter Den',
    aliases: ['Den'],
    area: 'meta',
    since: 'today',
    strict: true,
    note: '4h calls it "Den"; the game shows "Critter Den".',
    tr: { es: ['Madriguera'], fr: ['Tanière'], de: ['Tierchenbau', 'Bau'], pt: ['Toca'], ja: ja('巣') },
  },
  {
    en: 'friendship',
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Amistad'], fr: ['Amitié'], de: ['Freundschaft'], pt: ['Amizade'], ja: ja('なかよし') },
  },
  { en: 'Greenhouse', area: 'meta', since: 'today' },
  {
    en: 'drones',
    aliases: ['drone'],
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['dron'], fr: ['drone'], de: ['Drohne'], pt: ['drone'], ja: ja('ドローン') },
  },
  {
    en: 'decorations',
    aliases: ['decoration'],
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Decoración'], fr: ['Décoration'], de: ['Deko'], pt: ['Decoração'], ja: ja('かざり') },
  },
  // Homeworld paint and suit dyes are one colour concept in Styles.
  { en: 'photo mode', area: 'meta', since: 'today' },
  {
    en: 'postcards',
    aliases: ['postcard'],
    area: 'meta',
    since: 'today',
    tr: {
      es: ['postal'],
      fr: ['carte postale', 'cartes postales'],
      de: ['Postkarte'],
      pt: ['cartão-postal', 'cartões-postais'],
      ja: ja('ポストカード'),
    },
  },
  { en: 'Star Atlas', area: 'meta', since: 'today' },
  {
    en: 'constellations',
    aliases: ['constellation'],
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Constelaci'], fr: ['Constellation'], de: ['Sternbild'], pt: ['Constela'], ja: ja('星座') },
  },
  {
    en: 'dyes',
    aliases: ['dye'],
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Tinte'], fr: ['Teinture'], de: ['Farbe'], pt: ['Tinta'], ja: ja('いろ') },
  },
  {
    en: 'Keeper',
    area: 'meta',
    since: 'today',
    match: /(?<![\p{L}\p{N}])Keeper(?![\p{L}\p{N}])/u,
    tr: { es: ['Guardián'], fr: ['Gardien'], de: ['Hüter'], pt: ['Guardião'], ja: ja('キーパー') },
  },
  {
    en: 'Passport',
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Pasaporte'], fr: ['Passeport'], de: ['Pass'], pt: ['Passaporte'], ja: ja('パスポート') },
  },
  {
    en: 'titles',
    aliases: ['title'],
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Título'], fr: ['Titre'], de: ['Titel'], pt: ['Título'], ja: ja('称号') },
  },
  { en: 'Lifebook', area: 'meta', since: 'today' },
  { en: 'Sticker Album', area: 'meta', since: 'today', strict: true },
  { en: 'Inbox', area: 'meta', since: 'today' },
  {
    en: 'letters',
    aliases: ['letter'],
    area: 'meta',
    since: 'today',
    tr: { es: ['carta'], fr: ['lettre'], de: ['Brief'], pt: ['carta'], ja: ja('てがみ') },
  },
  { en: 'Star Calendar', area: 'meta', since: 'today', strict: true },
  {
    en: 'visitors',
    aliases: ['visitor'],
    area: 'meta',
    since: 'today',
    tr: { es: ['visitante'], fr: ['visiteur'], de: ['Besucher'], pt: ['visitante'], ja: ja('お客さん') },
  },
  {
    en: 'mementos',
    aliases: ['memento', 'keepsake', 'keepsakes'],
    area: 'meta',
    since: 'today',
    note: 'One concept, two English words today: "memento" and "keepsake" (HOMEWORLD.md: "keepsake (memento)").',
    tr: { es: ['Recuerdo'], fr: ['Souvenir'], de: ['Andenken'], pt: ['Lembran'], ja: ja('思い出') },
  },
  {
    en: 'Daily Planet',
    area: 'meta',
    since: 'today',
    strict: true,
    tr: {
      es: ['Planeta del Día'],
      fr: ['Planète du jour'],
      de: ['Planet des Tages', 'Planeten des Tages'],
      pt: ['Planeta do Dia'],
      ja: ja('今日の惑星'),
    },
  },
  { en: 'Meteor Rush', area: 'meta', since: 'today', strict: true },
  { en: 'Zen Garden', area: 'meta', since: 'today', strict: true },
  { en: 'Challenge a Friend', area: 'meta', since: 'today', strict: true },
  {
    en: 'Weekly Voyage',
    area: 'meta',
    since: 'today',
    note: 'Watch: fr "Voyage hebdomadaire" and ja "週間ボヤージュ" in the quest line.',
  },
  {
    en: 'Voyage',
    area: 'meta',
    since: 'today',
    strict: true,
    tr: { es: ['Viaje'], fr: ['Voyage'], de: ['Reise'], pt: ['Viagem'], ja: ja('ボヤージュ') },
    match: /(?<![\p{L}\p{N}]|Weekly )Voyage(?![\p{L}\p{N}])/u,
    note: '4h keeps "Weekly Voyage"; the game also says "Voyage" alone.',
  },
  {
    en: 'Festival',
    aliases: ['festivals'],
    area: 'meta',
    since: 'today',
    tr: { es: ['festival'], fr: ['festival', 'fête'], de: ['Fest'], pt: ['festival', 'festivais'], ja: ja('おまつり', '祭') },
  },
  { en: 'Star Road', area: 'meta', since: 'today', strict: true },
  { en: 'Cosmic Pass', area: 'meta', since: 'today', strict: true },
];

/** New or renamed nouns (4h table, FLIGHT.md §5.1, HOMEWORLD.md §13.3) with the milestone that brings them. */
const NEW: [string, 'round' | 'meta', Milestone][] = [
  ['Fusion', 'round', 'M7'],
  ['Clash', 'round', 'M7'],
  ['Steam', 'round', 'M7'],
  ['Rain Garden', 'round', 'M7'],
  ['Wildflowers', 'round', 'M7'],
  ['Glacier', 'round', 'M7'],
  ['Dry Spell', 'round', 'M7'],
  ['Combo', 'round', 'M7'],
  ['Combo Bloom', 'round', 'M7'],
  ['Chain Maker', 'meta', 'M7'],
  ['Combo stamps', 'meta', 'M7'],
  ['Drift Rocks', 'round', 'M7.5'],
  ['Bubble Moon', 'round', 'M7.5'],
  ['Magnet Mist', 'round', 'M7.5'],
  ['Rubble Ring', 'round', 'M7.5'],
  ['Tug Star', 'round', 'M7.5'],
  ['Bonk', 'round', 'M7.5'],
  ['fizzle', 'round', 'M7.5'],
  ['Trouble', 'round', 'M8'],
  ['Ember Vent', 'round', 'M8'],
  ['Tanglevine', 'round', 'M8'],
  ['Frost Creep', 'round', 'M8'],
  ['Forecast', 'round', 'M8'],
  ['Fireproof', 'round', 'M8'],
  ['Swimmer', 'round', 'M8'],
  ['Weedproof', 'round', 'M8'],
  ['Frostproof', 'round', 'M8'],
  ['Calm', 'round', 'M8'],
  ['Gentle planets', 'meta', 'M8'],
  ['Power', 'round', 'M10'],
  ['Reach', 'round', 'M10'],
  ['Labs', 'meta', 'M10'],
  ['Rock Lab', 'meta', 'M10'],
  ['Ice Lab', 'meta', 'M10'],
  ['Seed Lab', 'meta', 'M10'],
  ['Magma Lab', 'meta', 'M10'],
  ['Rain Lab', 'meta', 'M10'],
  ['Sun Lab', 'meta', 'M10'],
  ['Firewall', 'round', 'M10'],
  ['Vent Cooler', 'round', 'M10'],
  ['Strong Roots', 'round', 'M10'],
  ['Weed Burner', 'round', 'M10'],
  ['Rinse', 'round', 'M10'],
  ['Frost Melter', 'round', 'M10'],
  ['Pebble Shower', 'round', 'M10'],
  ['Rime Comet', 'round', 'M10'],
  ['Grove Pod', 'round', 'M10'],
  ['Obsidian Flow', 'round', 'M10'],
  ['Monsoon', 'round', 'M10'],
  ['Solar Flare', 'round', 'M10'],
  ['Essences', 'meta', 'M10'],
  ['Star Sling', 'round', 'M10.5'],
  ['Swoop', 'round', 'M10.5'],
  ['Sparkler', 'round', 'M10.5'],
  ['Zip', 'round', 'M10.5'],
  ['Thumper', 'round', 'M10.5'],
  ['Pinpoint', 'round', 'M10.5'],
  ['Skipper', 'round', 'M10.5'],
  ['Speed', 'round', 'M10.5'],
  ['Curve', 'round', 'M10.5'],
  ['Aim line', 'round', 'M10.5'],
  ['Launch Bay', 'meta', 'M10.5'],
  ['Launcher look', 'meta', 'M10.5'],
  ['Comet Rail', 'meta', 'M10.5'],
  ['Homeworld Level', 'meta', 'M11'],
  ['Landmarks', 'meta', 'M11.5'],
  ['Sprout Garden', 'meta', 'M11.5'],
  ['Skyglass', 'meta', 'M11.5'],
  ['Sky Bridge', 'meta', 'M11.5'],
  ['Comet Pier', 'meta', 'M11.5'],
  ["Keeper's Beacon", 'meta', 'M11.5'],
  ['Floating Isle', 'meta', 'M11.5'],
  ['Friends', 'meta', 'M11'],
  ['Wishes', 'meta', 'M4'],
  ['Missions', 'meta', 'M4'],
  ['Collection', 'meta', 'M4'],
  ['Field Guide', 'meta', 'M4'],
  ['Styles', 'meta', 'M4'],
  ['Next Up', 'meta', 'M4'],
  ['Grown-ups', 'meta', 'M5'],
  ['Favourites', 'meta', 'M5'],
  ['Starter Crew', 'meta', 'M5'],
  ['Remix', 'meta', 'M9'],
  ['Past Roads', 'meta', 'M12'],
  ['Wonder', 'round', 'M15'],
  ['Space Pebble', 'round', 'M15'],
];

/** Data-backed round nouns (lands, objects, twists, boosters, creatures): translations come from the locales. */
const dataNouns = (): Noun[] => {
  const names = [
    ...Object.values(BIOMES).map((b) => b.name),
    ...Object.values(KINDS).map((k) => k.name),
    ...Object.entries(TWISTS)
      .filter(([id, x]) => x.name && id !== 'heavy') // Dense Core is on the retired list (M7.5)
      .map(([, x]) => x.name),
    ...Object.values(BOOSTERS).map((b) => b.name),
    ...SPECIES.map((s) => s.name),
  ];
  // Matched case-sensitively: "Rock" is the object, "lava rock" is prose. Strict unless listed in DATA_WATCH.
  return [...new Set(names)].map((en) => ({
    en,
    area: 'round',
    since: 'today',
    match: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(en)}(?![\\p{L}\\p{N}])`, 'u'),
    strict: !DATA_WATCH.includes(en),
  }));
};

/** Data nouns with mismatches today (checked by hand; see the watch output). */
const DATA_WATCH = [
  'Ocean', // "Deep Ocean" (de Tiefsee) and "Ocean Blue" (a paint) name other things
  'Forest', // "Forest Warden" title (fr Garde forestier)
  'Rock', // "Rock Hound" title (fr cailloux, de Stein)
  'Scorched', // "Scorched start" is "Départ brûlant" / "Glühender Start", not the twist name
  'Comet Guardian', // es "Guardián Cometa" in one quest line, "Cometa Guardián" elsewhere
  'Snow Whale', // the constellation "The Snow Whale": pt "Baleia de Neve" vs "Baleia da Neve"
  'Glimfish', // plural inflection only (es Peces Destello, fr Poissons-lueurs, pt Peixes-Brilho)
];

export const GLOSSARY: Noun[] = [
  ...KEPT_ROUND,
  ...dataNouns(),
  ...KEPT_META,
  ...NEW.map(([en, area, since]): Noun => ({ en, area, since })),
];

// ---- 3 and 4. Retired and never-introduced words ----

interface Banned {
  word: string;
  /** English matcher (keys and t() literals). Default: whole word, case-insensitive. */
  match?: RegExp;
  /** Phrases that legitimately contain the word (another concept); removed before matching. */
  allow?: RegExp[];
  /** Today's translations of the retired word, matched as whole words (Japanese: substring). */
  tr?: Partial<Record<Lang, RegExp>>;
  note?: string;
}
interface Retired extends Banned {
  retiredIn: Milestone;
}

const w = (s: string, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(s)}(?![\\p{L}\\p{N}])`, flags);
const cs = (s: string) => w(s, 'u');
const trs = (m: Partial<Record<Lang, string>>): Partial<Record<Lang, RegExp>> =>
  Object.fromEntries(Object.entries(m).map(([l, s]) => [l, l === 'ja' ? new RegExp(escapeRe(s!), 'u') : w(s!)]));

export const RETIRED: Retired[] = [
  // M8 carries this M8.1 rendering rename because the milestone list has no M8.1 entry.
  {
    word: 'landing card',
    retiredIn: 'M8',
    allow: [/Watch the landing card for a friend moving in\./iu],
    note: 'M8 records the M8.1 rename because there is no M8.1 milestone. The old locale key is retained until translations can be edited.',
  },
  // M0 (built): the kid-safe trust update removed these.
  { word: 'So close!', retiredIn: 'M0', match: /so close/iu },
  { word: '×2 collect', retiredIn: 'M0', match: /×\s*2 for|collect ×\s*2|double collect/iu },
  // M4: one clear Home, Missions and Wishes.
  {
    word: 'Workshop',
    retiredIn: 'M4',
    match: cs('Workshop'),
    tr: trs({ es: 'Taller', fr: 'Atelier', de: 'Werkstatt', pt: 'Oficina', ja: 'ワークショップ' }),
    note: 'Becomes Styles.',
  },
  {
    word: 'Explorer Rank',
    retiredIn: 'M4',
    tr: trs({ es: 'Rango de Explorador', fr: "Rang d'explorateur", de: 'Entdeckerrang', pt: 'Nível de Explorador', ja: '探検家ランク' }),
  },
  {
    word: 'daily quests',
    retiredIn: 'M4',
    match: /(?<![\p{L}\p{N}])quests?(?![\p{L}\p{N}])/iu,
    tr: trs({ es: 'Misiones diarias', fr: 'Quêtes du jour', de: 'Tagesaufgaben', pt: 'Missões diárias', ja: 'デイリークエスト' }),
    note: 'Becomes Wishes. es/pt say "Misiones/Missões diarias": the new Missions tab must not inherit it.',
  },
  {
    word: 'How to play',
    retiredIn: 'M4',
    tr: trs({ es: 'Cómo jugar', fr: 'Comment jouer', de: 'Spielanleitung', pt: 'Como jogar', ja: 'あそびかた' }),
    note: 'Becomes the Field Guide.',
  },
  {
    word: 'OFFER badge',
    retiredIn: 'M4',
    match: /(?<![\p{L}\p{N}])OFFER(?![\p{L}\p{N}])/u,
    tr: trs({ de: 'ANGEBOT' }),
    note: 'M4.4: badges only for things you can claim.',
  },
  // M5: Grown-ups and a fair checkout. "Shop", "Piggy Bank" and gem packs are NOT retired:
  // owner decision 1 (29 Sept 2026) kept them, sold only inside the gated Grown-ups area.
  {
    word: 'Starter Pack',
    retiredIn: 'M5',
    tr: trs({ es: 'Paquete Inicial', fr: 'Pack de départ', de: 'Starterpaket', pt: 'Pacote Inicial', ja: 'スターターパック' }),
    note: 'Renamed Starter Crew.',
  },
  // M7.5: sky obstacles.
  {
    word: 'Dense Core',
    retiredIn: 'M7.5',
    tr: trs({ de: 'Dichter Kern' }),
  },
  { word: 'Blocked!', retiredIn: 'M7.5', match: /blocked!/iu, note: 'Becomes Bonk! / fizzle.' },
  // M8: Troubles and traits replace the proposed hazard and trait rosters.
  ...['Wildfire', 'Deep Freeze', 'Dust Drift', 'Blight', 'Frostbite', 'Heat Wave'].map((word): Retired => ({ word, retiredIn: 'M8' })),
  ...['Sturdy', 'Rain-maker', 'Rooted', 'Fire-proof', 'Frost-proof'].map((word): Retired => ({ word, retiredIn: 'M8' })),
  // M10: Labs.
  {
    word: 'Materials',
    retiredIn: 'M10',
    match: /(?<![\p{L}\p{N}])materials?(?![\p{L}\p{N}])/iu,
    tr: trs({ es: 'materiales', fr: 'matériaux', de: 'Materialien', pt: 'materiais', ja: '素材' }),
    note: 'Renamed Essences.',
  },
  { word: 'Object Lab', retiredIn: 'M10', tr: trs({ fr: 'Labo des objets', de: 'Objekt-Labor', ja: 'オブジェクト研究所' }) },
  {
    word: 'Bloom',
    retiredIn: 'M10',
    match: cs('Bloom'),
    allow: [/Combo Bloom/u, /Bloom Week/u, /Bloom Sling/u],
    note: 'The Lab perk; the launcher look stays until M10.5.',
  },
  { word: 'Charge', retiredIn: 'M10', match: cs('Charge'), note: 'The Lab perk; "Supernovas charge" (a verb) is fine.' },
  { word: 'Magnet', retiredIn: 'M10', match: cs('Magnet'), allow: [/Magnet Mist/u], note: 'The Lab perk.' },
  {
    word: 'Starfall',
    retiredIn: 'M10',
    match: /^\W*Starfall\W*$/u,
    note: 'The Lab perk; "Starfall Week" and "Starfall Garden" are other things.',
  },
  // M10.5: launchers and the Launch Bay.
  { word: 'Launch Pad', retiredIn: 'M10.5', tr: trs({ de: 'Startrampe' }), note: 'Renamed Star Sling.' },
  { word: 'Comet Cannon', retiredIn: 'M10.5', tr: trs({ de: 'Kometenkanone' }), note: 'Renamed Comet Rail.' },
  { word: 'Sling (in look names)', retiredIn: 'M10.5', match: cs('Sling'), allow: [/Star Sling/u, /Split Sling/u] },
  {
    word: 'Mastery (launcher mastery on looks)',
    retiredIn: 'M10.5',
    match: cs('Mastery'),
    tr: trs({ es: 'Maestría', fr: 'Maîtrise', pt: 'Maestria', ja: 'マスタリー' }),
  },
  { word: 'Launch Tower', retiredIn: 'M10.5', tr: trs({ de: 'Startturm', ja: '発射タワー' }), note: 'Replaced by the Launch Bay.' },
  // M11: Homeworld Level and a fair economy.
  {
    word: 'Ring',
    retiredIn: 'M11',
    match: /(?<![\p{L}\p{N}])ring\s*(?:\{n\}|\d)/iu,
    tr: {
      es: /Anillo\s*(?:\{n\}|\d)/u,
      fr: /Anneau\s*(?:\{n\}|\d)/u,
      de: /Ring\s*(?:\{n\}|\d)/u,
      pt: /Anel\s*(?:\{n\}|\d)/u,
      ja: /リング\s*(?:\{n\}|\d)/u,
    },
    note: 'Renamed Homeworld Level. "Halo Ring" (a look) and "Rubble Ring" (a sky obstacle) are other things.',
  },
  {
    word: 'Upgrades (screen)',
    retiredIn: 'M11',
    match: cs('Upgrades'),
    tr: trs({ es: 'Mejoras', fr: 'Améliorations', pt: 'Melhorias' }),
  },
  { word: 'Aim Guide', retiredIn: 'M11', tr: trs({ de: 'Zielhilfe' }), note: 'Becomes the Aim line.' },
  { word: 'Extra Throws', retiredIn: 'M11', tr: trs({ de: 'Extra-Würfe' }) },
  { word: 'Wide Impact', retiredIn: 'M11', tr: trs({ de: 'Breiter Einschlag' }) },
  { word: 'Stardust Mill', retiredIn: 'M11', tr: trs({ de: 'Staubmühle' }) },
  { word: 'Crystal Grove', retiredIn: 'M11', tr: trs({ de: 'Kristallhain' }) },
  { word: 'Observatory', retiredIn: 'M11', tr: trs({ de: 'Sternwarte' }) },
  {
    word: 'charm',
    retiredIn: 'M11',
    allow: [/sun charm/iu],
    tr: trs({ de: 'Charme' }),
    note: 'The Homeworld stat; "sun charm" (a gift) is another thing.',
  },
  { word: 'resident requests', retiredIn: 'M11', match: /resident requests?|requests? from residents/iu },
  {
    word: 'residents (word)',
    retiredIn: 'M11',
    match: /(?<![\p{L}\p{N}])residents?(?![\p{L}\p{N}])/iu,
    tr: trs({ de: 'Bewohner', ja: '住人' }),
    note: 'Renamed Friends. 4h does not name the milestone; M11 ("every retired system is gone") is assumed.',
  },
  { word: 'meteor rock', retiredIn: 'M11', tr: trs({ de: 'Meteorfels' }), note: 'Replaced by Landmarks (M11.5).' },
  // M12: Star Roads and launch prep.
  {
    word: 'Weekly Event',
    retiredIn: 'M12',
    tr: trs({ es: 'Evento semanal', fr: 'Événement de la semaine', de: 'Wochen-Event', pt: 'Evento semanal', ja: '週間イベント' }),
  },
  { word: 'event tokens', retiredIn: 'M12', match: /(?<![\p{L}\p{N}])tokens?(?![\p{L}\p{N}])/iu },
  { word: 'Bloom Week', retiredIn: 'M12', tr: trs({ de: 'Blütenwoche' }), note: 'Becomes "Blossom Week".' },
];

/** Proposed, then cut (4h "Never introduced", plus the retired alternatives in "One concept, one name, one owner"). */
export const NEVER: (Banned & { returnsIn?: Milestone })[] = [
  { word: 'Glow', match: cs('Glow'), note: 'Capitalised: the verb "glow" and the "glow bead" gift are fine.' },
  { word: 'Afterglow' },
  { word: 'Sector Conditions' },
  {
    word: 'Hearts',
    match: cs('Hearts'),
    allow: [/^Hearts$/u],
    note: 'The cut lives currency. The exact string "Hearts" is today\'s heart trail look (tuning.ts tr_hearts).',
  },
  { word: 'Kit', match: cs('Kit') },
  { word: 'Helper', match: cs('Helper') },
  { word: 'Wards', match: cs('Wards') },
  { word: 'Fronts', match: cs('Fronts') },
  { word: 'Dimmed', match: cs('Dimmed') },
  { word: 'Meteor Watch' },
  { word: 'Refinery' },
  { word: 'Star Dock' },
  { word: 'Blueprints', match: /(?<![\p{L}\p{N}])Blueprints?(?![\p{L}\p{N}])/iu },
  { word: 'star ore' },
  {
    word: 'Orbit',
    match: cs('Orbit'),
    allow: [/Golden Orbit/u],
    note: 'The cut moons; the verb "orbit" and the "Golden Orbit" look are fine.',
  },
  { word: 'Monuments', match: /(?<![\p{L}\p{N}])Monuments?(?![\p{L}\p{N}])/u },
  { word: 'Commissions' },
  { word: 'Workshops', match: cs('Workshops'), note: 'The cut buildings; the Labs replace them.' },
  { word: 'paths', note: 'Object Lab 2.0 paths.' },
  { word: 'evolution', match: /(?<![\p{L}\p{N}])evolutions?(?![\p{L}\p{N}])/iu },
  { word: 'Master resident' },
  { word: 'Radiance' },
  { word: 'Explorer Club' },
  { word: 'Explorer Bundle' },
  { word: 'Wishlist' },
  {
    word: 'Ask a grown-up',
    allow: [/^Ask a grown-up$/u],
    note: "The cut kid-to-parent card. The exact string is today's parental gate title (gate.ts).",
  },
  { word: 'Weather Dial' },
  { word: 'Heat', match: cs('Heat') },
  { word: 'Star Motes', returnsIn: 'M15' },
  { word: 'Wild Pod' },
  { word: 'Hint try' },
  { word: 'Try with a hint' },
  { word: 'Goal Compass' },
  { word: 'Buddy Power' },
  { word: 'Buddy Helper' },
  { word: 'Split Sling' },
  { word: 'Boomerang' },
  { word: 'Rapid shot' },
  { word: 'Sky Shield' },
  { word: 'Black Hole' },
  { word: 'Combo multiplier' },
  { word: 'Launcher cards' },
  { word: 'Launcher levels' },
  { word: 'Test range' },
  { word: 'Loadout' },
  { word: 'Base Level' },
  { word: 'Order Board' },
  { word: 'Architecture Themes' },
  { word: 'Parents page' },
  { word: 'Family Summary' },
  { word: 'Grown-up Shop' },
  { word: 'par tier' },
];

/** Known name clashes today, each with the milestone that settles it. A clash here fails once that milestone is built. */
const KNOWN_CLASHES: { lang: 'en' | Lang; name: string; fixBy: Milestone; note: string }[] = [];

// ---- Player-facing strings ----

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}

const rel = (p: string) => relative(process.cwd(), p).split(sep).join('/');

const DICTS = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(readFileSync(`src/locales/${l}.json`, 'utf8')) as Record<string, string>]),
) as Record<Lang, Record<string, string>>;

/** First-argument string literals of t('...') and both strings of tp(n, '...', '...') in src/ (as in terms.test.ts). */
function sourceStrings(): { where: string; s: string }[] {
  const lit = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|\`((?:[^\`\\]|\\.)*)\``;
  const tCall = new RegExp(String.raw`\bt\(\s*(?:${lit})`, 'g');
  const tpCall = new RegExp(String.raw`\btp\([^,]+,\s*(?:${lit})\s*,\s*(?:${lit})`, 'g');
  const out: { where: string; s: string }[] = [];
  for (const f of walk('src', '.ts')) {
    const src = readFileSync(f, 'utf8');
    const where = rel(f);
    for (const m of src.matchAll(tCall)) out.push({ where, s: m[1] ?? m[2] ?? m[3] });
    for (const m of src.matchAll(tpCall)) out.push({ where, s: m[1] ?? m[2] ?? m[3] }, { where, s: m[4] ?? m[5] ?? m[6] });
  }
  return out;
}

/** Every English player-facing string: the key list, every locale's keys, and t()/tp() literals. */
function englishStrings(): { where: string; s: string }[] {
  const seen = new Set<string>();
  const out: { where: string; s: string }[] = [];
  const add = (where: string, s: string) => {
    if (s && !seen.has(s)) (seen.add(s), out.push({ where, s }));
  };
  (JSON.parse(readFileSync('src/locales/_keys.json', 'utf8')) as string[]).forEach((s) => add('_keys.json', s));
  for (const l of LANGS) Object.keys(DICTS[l]).forEach((s) => add(`${l}.json key`, s));
  sourceStrings().forEach(({ where, s }) => add(where, s));
  return out;
}

const EN = englishStrings();
const KEYS = Object.keys(DICTS.de);

const stripLead = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '').trim();
const lower = (s: string) => s.normalize('NFC').toLocaleLowerCase();

/** The key whose text (ignoring a leading emoji) is exactly `en`, if any. */
const standaloneKey = (en: string) => KEYS.find((k) => lower(stripLead(k)) === lower(en));

/** Translations of a noun: explicit, or read from its standalone key. */
function resolveTr(n: Noun): Tr {
  if (n.tr) return n.tr;
  const key = [n.en, ...(n.aliases ?? [])].map(standaloneKey).find(Boolean);
  if (!key) return {};
  return Object.fromEntries(LANGS.filter((l) => DICTS[l][key]).map((l) => [l, [stripLead(DICTS[l][key])]]));
}

const nounMatcher = (n: Noun) =>
  n.match ?? new RegExp(`(?<![\\p{L}\\p{N}])(?:${[n.en, ...(n.aliases ?? [])].map(escapeRe).join('|')})(?![\\p{L}\\p{N}])`, 'iu');

const bannedMatcher = (b: Banned) => b.match ?? w(b.word);
const hitsBanned = (b: Banned, s: string) => {
  const cleaned = (b.allow ?? []).reduce((acc, re) => acc.replace(new RegExp(re.source, re.flags + 'g'), ' '), s);
  return bannedMatcher(b).test(cleaned);
};

/** Where a banned word shows up: English strings, then each locale's values (its translation, or the English word left untranslated). */
function bannedHits(b: Banned): string[] {
  const out: string[] = [];
  for (const { where, s } of EN) if (hitsBanned(b, s)) out.push(`${where}: ${JSON.stringify(s)}`);
  for (const l of LANGS) {
    const re = b.tr?.[l];
    for (const [k, v] of Object.entries(DICTS[l]))
      if ((re && hitsBanned({ ...b, match: re }, v)) || hitsBanned(b, v))
        out.push(`${l}.json ${JSON.stringify(v)} (key ${JSON.stringify(k)})`);
  }
  return out;
}

// ---- Hit-game terms (the lists live in tests/terms.test.ts; read, not imported, so its tests don't run twice) ----

function termList(name: string): string[] {
  const src = readFileSync('tests/terms.test.ts', 'utf8');
  const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`tests/terms.test.ts no longer exports ${name}`);
  return [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
}
const HIT_LATIN = termList('BANNED_TERMS');
const HIT_JA = termList('BANNED_TERMS_JA');
const hitTerms = (s: string) => [
  ...HIT_LATIN.filter((t) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(t).replace(/ /g, '[\\s\\u00a0-]+')}(?![\\p{L}\\p{N}])`, 'iu').test(s),
  ),
  ...HIT_JA.filter((t) => s.includes(t)),
];

// ---- Report helpers ----

const show = (title: string, lines: string[], limit = 60) => {
  if (!lines.length) return;
  console.log(`\n[glossary] ${title} (${lines.length})\n  ${lines.slice(0, limit).join('\n  ')}${lines.length > limit ? '\n  …' : ''}`);
};

// ---- Rules ----

describe('glossary: the table', () => {
  it('reads today’s strings', () => {
    expect(EN.length).toBeGreaterThan(900);
    expect(HIT_LATIN.length).toBeGreaterThan(10);
    expect(HIT_JA.length).toBeGreaterThan(10);
    expect(BUILT.every((m) => MILESTONES.includes(m))).toBe(true);
  });

  it('every noun that is in the game today has a translation in each language', () => {
    const missing: string[] = [];
    for (const n of GLOSSARY) {
      if (n.since !== 'today' || n.unnamed) continue;
      const tr = resolveTr(n);
      for (const l of LANGS) if (!tr[l]?.length) missing.push(`${n.en}: no ${l} translation`);
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('prints the table with GLOSSARY_TABLE=1', () => {
    if (!process.env.GLOSSARY_TABLE) return;
    const rows = GLOSSARY.map((n) => {
      const tr = resolveTr(n);
      return [n.en, n.area, n.since, ...LANGS.map((l) => tr[l]?.[0] ?? '–')].join(' | ');
    });
    console.log(['en | area | since | ' + LANGS.join(' | '), ...rows].join('\n'));
  });
});

describe('glossary: one name per concept in every language', () => {
  const clashes = (): { lang: 'en' | Lang; name: string; nouns: string[] }[] => {
    const out: { lang: 'en' | Lang; name: string; nouns: string[] }[] = [];
    const byLang = new Map<string, Map<string, Set<string>>>();
    const note = (lang: string, name: string, noun: string) => {
      const m = byLang.get(lang) ?? new Map<string, Set<string>>();
      byLang.set(lang, m);
      const key = lower(name);
      m.set(key, (m.get(key) ?? new Set()).add(noun));
    };
    for (const n of GLOSSARY) {
      for (const name of [n.en, ...(n.aliases ?? [])]) note('en', name, n.en);
      const tr = resolveTr(n);
      for (const l of LANGS) if (tr[l]?.[0]) note(l, tr[l]![0], n.en);
    }
    for (const [lang, m] of byLang)
      for (const [name, nouns] of m) if (nouns.size > 1) out.push({ lang: lang as 'en' | Lang, name, nouns: [...nouns] });
    return out;
  };

  it('no two glossary nouns share a name (known clashes fail once their milestone is built)', () => {
    const known = (c: { lang: string; name: string }) => KNOWN_CLASHES.find((k) => k.lang === c.lang && k.name === c.name);
    const all = clashes();
    const pending = all.filter((c) => known(c) && !built(known(c)!.fixBy));
    const bad = all.filter((c) => !known(c) || built(known(c)!.fixBy));
    show(
      'pending name clashes',
      pending.map((c) => `${c.lang} "${c.name}": ${c.nouns.join(' / ')} (fix by ${known(c)!.fixBy}: ${known(c)!.note})`),
    );
    expect(
      bad.map((c) => `${c.lang} "${c.name}" names ${c.nouns.join(' and ')}`),
      'two concepts share one player-facing name',
    ).toEqual([]);
  });

  it('no glossary noun reuses a retired or never-introduced word', () => {
    const banned = [...RETIRED, ...NEVER];
    const bad = GLOSSARY.flatMap((n) =>
      [n.en, ...(n.aliases ?? [])].flatMap((name) => banned.filter((b) => lower(b.word) === lower(name)).map((b) => `${name} (${b.word})`)),
    );
    expect(bad).toEqual([]);
  });

  it('no glossary noun or translation is a hit game’s term', () => {
    const bad = GLOSSARY.flatMap((n) => {
      const tr = resolveTr(n);
      return [n.en, ...(n.aliases ?? []), ...LANGS.flatMap((l) => tr[l] ?? [])].flatMap((s) =>
        hitTerms(s).map((h) => `${n.en}: "${s}" → ${h}`),
      );
    });
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('glossary: each noun is translated the same way everywhere', () => {
  /** Nouns that contain another noun's name ("Bare Rock" contains "Rock"); removed before checking the shorter one. */
  const containers = (n: Noun) => {
    const re = nounMatcher(n);
    const longer = [...GLOSSARY.filter((o) => o !== n).map((o) => o.en), ...RETIRED.map((r) => r.word)].filter(
      (s) => s.length > n.en.length && re.test(s),
    );
    return longer.map((s) => new RegExp(escapeRe(s), 'giu'));
  };

  /** Never a glossary noun: {placeholders} and the game's own name ("Comet" / "Garden" on the title screen). */
  const NOT_NOUNS = [/\{\w+\}/g, /Comet Garden/giu, /^\W*(?:Comet|Garden)\W*$/gu];

  const mismatches = (n: Noun): string[] => {
    const tr = resolveTr(n);
    const re = nounMatcher(n);
    const shadow = [...NOT_NOUNS, ...containers(n)];
    const out: string[] = [];
    for (const k of KEYS) {
      const cleaned = shadow.reduce((acc, s) => acc.replace(s, ' '), k);
      if (!re.test(cleaned)) continue;
      for (const l of LANGS) {
        const forms = tr[l];
        const v = DICTS[l][k];
        if (!forms?.length || v === undefined) continue;
        if (!forms.some((f) => lower(v).includes(lower(f))))
          out.push(`${l} ${n.en} ≠ "${forms[0]}": ${JSON.stringify(k)} → ${JSON.stringify(v)}`);
      }
    }
    return out;
  };

  const today = GLOSSARY.filter((n) => n.since === 'today' || built(n.since as Milestone));

  it('strict nouns are consistent in all five translations', () => {
    const bad = today.filter((n) => n.strict).flatMap(mismatches);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('watch: other nouns (printed, not failed)', () => {
    const watch = today.filter((n) => !n.strict);
    const perNoun = watch.map((n) => [n.en, mismatches(n)] as const).filter(([, m]) => m.length > 0);
    show(
      'translation watch (mismatches per noun, first 3 shown)',
      perNoun.flatMap(([n, m]) => [`${n}: ${m.length}`, ...m.slice(0, 3).map((x) => `    ${x}`)]),
      400,
    );
    expect(perNoun).toBeInstanceOf(Array);
  });
});

describe('glossary: retired words', () => {
  it('words retired in a built milestone are gone from every language', () => {
    const bad = RETIRED.filter((r) => built(r.retiredIn)).flatMap((r) =>
      bannedHits(r).map((h) => `${r.word} (retired in ${r.retiredIn}) → ${h}`),
    );
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('pending retirements (printed, not failed)', () => {
    const pending = RETIRED.filter((r) => !built(r.retiredIn));
    show(
      'pending retirements',
      pending.map((r) => {
        const hits = bannedHits(r);
        return `${r.retiredIn.padEnd(5)} ${r.word}: ${hits.length} string${hits.length === 1 ? '' : 's'}${hits.length ? ` (e.g. ${hits[0]})` : ''}`;
      }),
    );
    expect(pending.length).toBeGreaterThan(0);
  });
});

describe('glossary: never-introduced words', () => {
  it('appear nowhere, in any language', () => {
    const bad = NEVER.filter((n) => !n.returnsIn || !built(n.returnsIn)).flatMap((n) => bannedHits(n).map((h) => `${n.word} → ${h}`));
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
