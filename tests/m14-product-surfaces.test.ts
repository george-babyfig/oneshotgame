import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { PRODUCTS, SKINS } from '../src/meta/tuning';
import { ROAD01 } from '../src/meta/content/road01';
import { ROAD_CATALOG, newRoadState } from '../src/meta/starroad';
import { grantProduct } from '../src/meta/economy';
import { COSMETIC_BY_ID, STYLE_SLOTS, atmosphereOpen, currentLook, equip, owns, visibleCosmetics } from '../src/meta/cosmetics';
import { unlocked } from '../src/meta/unlocks';
import { currentBanner, currentTitle, titlesOwned, visibleBanners } from '../src/meta/passport';
import { FRAMES } from '../src/ui/screens/homeworld/sheets';
import { homeworldStyleColors, structureStyleId } from '../src/ui/art/styleRender';

const installedOpening = ROAD01.road.opensOn;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-28T12:00:00Z'));
  ROAD01.road.opensOn = '2026-12-28'; // Test scenario only.
});
afterEach(() => {
  ROAD01.road.opensOn = installedOpening;
  vi.useRealTimers();
});

describe('every item promised in every product has a usable surface once owned', () => {
  for (const product of PRODUCTS) {
    it(product.key, () => {
      const p = defaultProfile(0);
      p.level = 121;
      p.meta.sessions = 2;
      p.piggy = 73;
      for (const road of ROAD_CATALOG) p.roadRecords[road.id] = { ...newRoadState(), points: 200 };
      p.roadPoints = 200;
      const before = p.gems;
      const grant = grantProduct(p, product.id, `surface-${product.key}`)!;
      if (product.consumable) {
        expect(product.contents).toHaveLength(1);
        expect(grant.gems).toBe(product.key === 'piggy' ? 73 : product.gems);
        expect(p.gems).toBe(before + grant.gems); // Home/Grown-ups gem balance.
        return;
      }

      // Expand grouped promises, then require every listed promise and every grant ID to be covered.
      const promised = new Set<string>();
      for (const text of product.contents) {
        const grouped = /^(Six|Three|Two) (.+) (Lab skins|decoration skins|friend outfits|object trails|object bursts)$/.exec(text);
        const exact = product.cosmeticItemIds.filter((id) => {
          const skin = SKINS.find((skin) => skin.id === id);
          return text === (skin ? `${skin.name.replace(/ atmosphere$/, '')} atmosphere` : COSMETIC_BY_ID[id]?.name);
        });
        const ids = product.cosmeticItemIds.filter((id) => {
          const look = COSMETIC_BY_ID[id];
          const skin = SKINS.find((skin) => skin.id === id);
          if (!grouped) {
            if (exact.length) return exact.includes(id);
            const matches = product.cosmeticItemIds.map((id) => COSMETIC_BY_ID[id]).filter((look) => look && text.startsWith(look.name));
            const longest = Math.max(...matches.map((look) => look.name.length));
            return !skin && !!look && text.startsWith(look.name) && look.name.length === longest;
          }
          if (!look?.name.startsWith(grouped[2])) return false;
          return grouped[3] === 'Lab skins'
            ? look.slot.startsWith('labSkin:')
            : grouped[3] === 'decoration skins'
              ? look.slot.startsWith('decoration:')
              : grouped[3] === 'friend outfits'
                ? look.slot === 'friendOutfit'
                : grouped[3] === 'object trails'
                  ? look.slot.startsWith('shotTrail:')
                  : look.slot.startsWith('burst:');
        });
        expect(ids, text).toHaveLength(grouped ? ({ Six: 6, Three: 3, Two: 2 } as Record<string, number>)[grouped[1]] : 1);
        ids.forEach((id) => promised.add(id));
      }
      expect([...promised].sort()).toEqual([...product.cosmeticItemIds].sort());

      for (const id of promised) {
        const look = COSMETIC_BY_ID[id];
        if (!look) {
          expect(
            SKINS.some((skin) => skin.id === id),
            id,
          ).toBe(true);
          expect(p.skins, id).toContain(id);
          p.skin = id;
          expect(atmosphereOpen(p, p.skin), id).toBe(true); // Styles atmosphere / planet glow.
          continue;
        }
        expect(owns(p, id), id).toBe(true);
        if (look.slot === 'banner') {
          const banner = visibleBanners(p).find((banner) => banner.cosmeticId === id)!;
          expect(banner, id).toBeDefined();
          expect(banner.unlocked(p), id).toBe(true);
          p.level = 15;
          expect(unlocked(p, 'passport'), id).toBe(true);
          p.level = 121;
          p.passport.banner = banner.id;
          expect(currentBanner(p).cosmeticId, id).toBe(id); // Editor, card and shared Passport.
        } else if (look.slot === 'title') {
          const title = titlesOwned(p).find((title) => title.id === id || (id === 'title_star_captain' && title.id === 'pass'))!;
          expect(title, id).toBeDefined();
          p.passport.title = title.id;
          expect(currentTitle(p), id).toEqual(title);
        } else if (look.slot === 'photoFrame') {
          expect(
            FRAMES.some((frame) => frame.name === look.name),
            id,
          ).toBe(true); // Homeworld Photo frame selector.
        } else {
          expect(STYLE_SLOTS, id).toContain(look.slot);
          expect(visibleCosmetics(p, look.slot), id).toContain(look);
          expect(equip(p, id), id).toBe(true);
          const worn = currentLook(p);
          expect(worn[look.slot], id).toBe(id);
          if (look.slot === 'ground' || look.slot === 'sea') expect(homeworldStyleColors(worn)[look.slot]).toEqual(look.colors);
          if (look.slot.startsWith('labSkin:')) expect(structureStyleId(worn, 'lab', look.slot.slice(8) as 'rock')).toBe(id);
          if (look.slot.endsWith('Skin') && !look.slot.startsWith('labSkin:')) {
            const type = look.slot === 'denSkin' ? 'den' : look.slot === 'greenhouseSkin' ? 'greenhouse' : 'launch_bay';
            expect(structureStyleId(worn, type)).toBe(id);
          }
          if (look.slot.startsWith('decoration:')) expect(structureStyleId(worn, look.slot.slice(11) as 'lantern')).toBe(id);
        }
      }
    });
  }
});
