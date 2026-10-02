import { afterEach, describe, expect, it } from 'vitest';
import { makeLevel } from '../src/core/levels';
import { planetName, setLang, t } from '../src/i18n';
import { localPlanetName, PLANET_NAME_FIRST, PLANET_NAME_SECOND, type PlanetNameLang } from '../src/i18n/planetNames';

const LANGS: PlanetNameLang[] = ['es', 'fr', 'de', 'pt', 'ja'];

describe('planet names', () => {
  afterEach(() => setLang('en'));

  it('uses the active language and falls back through t for other names', () => {
    setLang('es');
    expect(planetName('Pebble Rock')).toBe('Roca Guijarro');
    setLang('de');
    expect(planetName('Comet Haven')).toBe('Kometenhafen');
    setLang('ja');
    expect(planetName('Mossy Isle')).toBe('こけじま');
    expect(planetName('Harbor')).toBe('みなと');
    setLang('en');
    expect(planetName('Pebble Rock')).toBe('Pebble Rock');
    setLang('pseudo');
    expect(planetName('Pebble Rock')).toBe(t('Pebble Rock'));
    expect(planetName('An unknown place')).toBe(t('An unknown place'));
  });
  it('translates every generated campaign name in every language', () => {
    for (let n = 1; n <= 120; n++) {
      const { name } = makeLevel(n);
      for (const lang of LANGS) {
        const local = localPlanetName(name, lang);
        expect(local, `${name} in ${lang}`).toBeTruthy();
        expect(local).not.toContain('{');
      }
    }
  });

  it('covers all 160 word pairs, each one distinct and short enough for the HUD', () => {
    for (const lang of LANGS) {
      const seen = new Set<string>();
      for (const a of PLANET_NAME_FIRST)
        for (const b of PLANET_NAME_SECOND) {
          const local = localPlanetName(`${a} ${b}`, lang)!;
          expect(local.length, local).toBeLessThanOrEqual(lang === 'ja' ? 10 : 18);
          seen.add(local);
        }
      expect(seen.size).toBe(PLANET_NAME_FIRST.length * PLANET_NAME_SECOND.length);
    }
  });

  it('leaves names it does not know alone', () => {
    expect(localPlanetName('Comet Guardian Prime', 'es')).toBeNull();
    expect(localPlanetName('Home', 'ja')).toBeNull();
  });

  it('reads naturally in each language', () => {
    expect(localPlanetName('Pebble Rock', 'es')).toBe('Roca Guijarro');
    expect(localPlanetName('Mossy Isle', 'fr')).toBe('Île Mousse');
    expect(localPlanetName('Comet Haven', 'de')).toBe('Kometenhafen');
    expect(localPlanetName('Comet Major', 'de')).toBe('Komet Maxi');
    expect(localPlanetName('Puddle Minor', 'pt')).toBe('Poça Menor');
    expect(localPlanetName('Mossy Isle', 'ja')).toBe('こけじま');
  });
});
