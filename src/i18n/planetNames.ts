// Planet names are built from two English words ("Pebble Rock"). Saves, codes and
// seeds keep the English name; only the display is translated, part by part.
// Spanish, French and Portuguese put the place word first and the name after it,
// like "Isla Tortuga", so no adjective has to agree in gender. German compounds
// the two ("Kieselfels"). Japanese uses kana a six-year-old can read.

export type PlanetNameLang = 'es' | 'fr' | 'de' | 'pt' | 'ja';

/** First words, as the name part. German gives [stem for compounds, standalone word]. */
const FIRST: Record<string, Record<PlanetNameLang, string | [string, string]>> = {
  Pebble: { es: 'Guijarro', fr: 'Galet', de: ['Kiesel', 'Kiesel'], pt: 'Pedrinha', ja: 'こいし' },
  Mossy: { es: 'Musgo', fr: 'Mousse', de: ['Moos', 'Moos'], pt: 'Musgo', ja: 'こけ' },
  Glim: { es: 'Destello', fr: 'Lueur', de: ['Funkel', 'Funkel'], pt: 'Brilho', ja: 'キラリ' },
  Tumble: { es: 'Voltereta', fr: 'Culbute', de: ['Purzel', 'Purzel'], pt: 'Cambalhota', ja: 'コロコロ' },
  Nova: { es: 'Nova', fr: 'Nova', de: ['Nova', 'Nova'], pt: 'Nova', ja: 'ノバ' },
  Bramble: { es: 'Zarza', fr: 'Ronce', de: ['Brombeer', 'Brombeere'], pt: 'Amora', ja: 'いばら' },
  Puddle: { es: 'Charco', fr: 'Flaque', de: ['Pfützen', 'Pfütze'], pt: 'Poça', ja: 'みずたまり' },
  Ember: { es: 'Brasa', fr: 'Braise', de: ['Glut', 'Glut'], pt: 'Brasa', ja: 'ひのこ' },
  Frost: { es: 'Escarcha', fr: 'Givre', de: ['Raureif', 'Raureif'], pt: 'Geada', ja: 'こおり' },
  Cosmo: { es: 'Cosmo', fr: 'Cosmo', de: ['Kosmo', 'Kosmo'], pt: 'Cosmo', ja: 'コスモ' },
  Lumen: { es: 'Lucero', fr: 'Lumière', de: ['Licht', 'Licht'], pt: 'Luzeiro', ja: 'ひかり' },
  Dewdrop: { es: 'Rocío', fr: 'Rosée', de: ['Tropfen', 'Tropfen'], pt: 'Orvalho', ja: 'しずく' },
  Zephyr: { es: 'Céfiro', fr: 'Zéphyr', de: ['Zephyr', 'Zephyr'], pt: 'Zéfiro', ja: 'そよかぜ' },
  Marble: { es: 'Canica', fr: 'Bille', de: ['Murmel', 'Murmel'], pt: 'Gude', ja: 'ビーだま' },
  Sprout: { es: 'Brote', fr: 'Pousse', de: ['Spross', 'Spross'], pt: 'Broto', ja: 'ふたば' },
  Comet: { es: 'Cometa', fr: 'Comète', de: ['Kometen', 'Komet'], pt: 'Cometa', ja: 'すいせい' },
};

/** Second words, as a pattern around the first word. German lower-cases a compound tail. */
const SECOND: Record<string, Record<PlanetNameLang, string>> = {
  Rock: { es: 'Roca {a}', fr: 'Roc {a}', de: '{a}fels', pt: 'Rocha {a}', ja: '{a}ロック' },
  World: { es: 'Mundo {a}', fr: 'Monde {a}', de: '{a}welt', pt: 'Mundo {a}', ja: '{a}ワールド' },
  Orb: { es: 'Orbe {a}', fr: 'Orbe {a}', de: '{a}kugel', pt: 'Orbe {a}', ja: '{a}ボール' },
  Globe: { es: 'Globo {a}', fr: 'Globe {a}', de: '{a}globus', pt: 'Globo {a}', ja: '{a}ランド' },
  Isle: { es: 'Isla {a}', fr: 'Île {a}', de: '{a}insel', pt: 'Ilha {a}', ja: '{a}じま' },
  Sphere: { es: 'Esfera {a}', fr: 'Sphère {a}', de: '{a}sphäre', pt: 'Esfera {a}', ja: '{a}スター' },
  Haven: { es: 'Refugio {a}', fr: 'Havre {a}', de: '{a}hafen', pt: 'Refúgio {a}', ja: '{a}のさと' },
  // Invariant words, so nothing has to agree with the first word's gender.
  Prime: { es: '{a} Alfa', fr: '{a} Alpha', de: '{A} Alpha', pt: '{a} Alfa', ja: '{a}プライム' },
  Minor: { es: '{a} Menor', fr: '{a} Mini', de: '{A} Mini', pt: '{a} Menor', ja: 'ミニ{a}' },
  Major: { es: '{a} Mayor', fr: '{a} Maxi', de: '{A} Maxi', pt: '{a} Maior', ja: 'ビッグ{a}' },
};

export const PLANET_NAME_FIRST = Object.keys(FIRST);
export const PLANET_NAME_SECOND = Object.keys(SECOND);

/** The display name for `lang`, or null when the name isn't a generated two-word name. */
export function localPlanetName(name: string, lang: PlanetNameLang): string | null {
  const [a, b, extra] = name.split(' ');
  const first = FIRST[a]?.[lang];
  const pattern = SECOND[b]?.[lang];
  if (!first || !pattern || extra !== undefined) return null;
  const [stem, word] = typeof first === 'string' ? [first, first] : first;
  return pattern.replace('{a}', stem).replace('{A}', word);
}
