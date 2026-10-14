import { describe, expect, it, vi } from 'vitest';
import { impact, KINDS, newPlanet, type Kind } from '../src/core/world';
import { defaultProfile } from '../src/meta/profile';
import { homeLandFor, homeSpotFor, reactionsFor } from '../src/meta/friends';
import { claimWish, ensureWishes, swapWish, WISH_TEMPLATES, wishBubbles, wishOrigin, type WishCard } from '../src/meta/wishes';
import { wishesPanel } from '../src/ui/flows/wishes';
import { RecordedNode, visibleText } from './helpers/uiRecording';
import type { App } from '../src/ui/app';

vi.mock('../src/ui/dom', async () => (await import('./helpers/uiRecording')).recordedDom);
vi.mock('../src/ui/art/critters', () => ({ drawCreature() {} }));

const day = '2026-10-14';
const template = (card: WishCard) => WISH_TEMPLATES.find((x) => x.id === card.template)!;
function player(residents: string[] = []) {
  const p = defaultProfile(0);
  p.level = 12;
  p.seen = ['otter', 'goat', 'deer', 'fish', ...residents];
  p.home.residents = residents.map((species) => ({ species, fp: 0, rewarded: 1 }));
  return p;
}

describe('M13 friends-first Wishes (13.5)', () => {
  it('deals zero, one or two friend slots, with the third slot open', () => {
    for (const residents of [[], ['otter'], ['otter', 'deer'], ['otter', 'deer', 'goat']]) {
      const cards = ensureWishes(player(residents), day);
      expect(cards.map(wishOrigin)).toEqual(
        residents.length === 0
          ? ['open', 'open', 'open']
          : residents.length === 1
            ? ['friend', 'open', 'open']
            : ['friend', 'friend', 'open'],
      );
      expect(new Set(cards.map((q) => q.species)).size).toBe(3);
      for (const card of cards.filter((q) => wishOrigin(q) === 'friend')) expect(template(card).land).toBe(homeLandFor(card.species));
    }
  });

  it('rotates by calendar date through Den order and does not duplicate a friend', () => {
    const residents = ['otter', 'deer', 'goat', 'fish'];
    const selected = new Set<string>();
    for (const date of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']) {
      const cards = ensureWishes(player(residents), date);
      expect(new Set(cards.slice(0, 2).map((q) => q.species)).size).toBe(2);
      cards.slice(0, 2).forEach((q) => selected.add(q.species));
      expect(cards).toEqual(ensureWishes(player(residents), date));
    }
    expect([...selected].sort()).toEqual(residents.sort());
  });

  it('keeps unfinished saved cards byte-identical and preserves the open slot', () => {
    const p = player(['otter', 'deer']);
    const cards = ensureWishes(p, day);
    delete cards[0].from; // a 1.0 card has no display origin
    cards[0].progress = 1;
    const saved = JSON.stringify(cards.slice(0, 2));
    cards[2].claimed = true;
    const next = ensureWishes(p, '2026-10-15');
    expect(JSON.stringify(next.slice(0, 2))).toBe(saved);
    expect(wishOrigin(next[0])).toBe('open');
    expect(wishOrigin(next[2])).toBe('open');
    expect(ensureWishes(p, day)).toBe(next);
  });

  it('swap keeps a friend wisher, origin and home-land request', () => {
    const p = player(['otter', 'deer']);
    const card = ensureWishes(p, day)[0];
    expect(swapWish(p, card.id, day)).toBe(true);
    const replacement = p.quests.list[0] as WishCard;
    expect(replacement.species).toBe(card.species);
    expect(wishOrigin(replacement)).toBe('friend');
    expect(template(replacement).land).toBe(homeLandFor(card.species));
    expect(replacement.template).not.toBe(card.template);
  });

  it('falls back from untaught home land to near, then an open template with the same friend', () => {
    // The legacy quests gate permits an existing player below today's Missions debut.
    const near = player(['elephant']);
    near.level = 2;
    near.legacyUnlocks.push('quests');
    const card = ensureWishes(near, day)[0];
    expect(template(card).land).toBe('meadow'); // Savanna needs Magma at 4.
    expect(card.species).toBe('elephant');
    const open = player(['giraffe']);
    open.level = 1;
    open.legacyUnlocks.push('quests');
    const fallback = ensureWishes(open, day)[0];
    expect(fallback.species).toBe('giraffe');
    expect(wishOrigin(fallback)).toBe('friend');
    expect(template(fallback).minLevel).toBeLessThanOrEqual(1);
    expect(template(fallback).land).not.toBe('savanna');
  });

  it('covers all six added lands with two reachable templates each', () => {
    const levels = { savanna: 4, icesheet: 1, tundra: 1, taiga: 2, swamp: 1, marsh: 2 } as const;
    for (const [land, minLevel] of Object.entries(levels)) {
      const added = WISH_TEMPLATES.filter((x) => x.land === land);
      expect(added).toHaveLength(2);
      expect(added.map((x) => x.goal).sort()).toEqual([1, 2]);
      for (const def of added) expect(def.minLevel).toBe(minLevel);
    }
  });

  it('can build each new requested land using only objects taught at its minLevel', () => {
    const recipes: Record<string, Kind[]> = {
      savanna: ['magma', 'seed'],
      icesheet: ['ice', 'ice'],
      tundra: ['rock', 'rock', 'ice', 'ice'],
      taiga: ['rock', 'rock', 'ice', 'ice', 'seed'],
      swamp: ['rock', 'ice'],
      marsh: ['rock', 'ice', 'seed'],
    };
    for (const def of WISH_TEMPLATES.filter((x) => x.land && recipes[x.land])) {
      const planet = newPlanet();
      for (const kind of recipes[def.land!]) {
        expect(KINDS[kind].unlock).toBeLessThanOrEqual(def.minLevel);
        impact(planet, kind, 0);
      }
      expect(planet.sectors[0].biome, def.id).toBe(def.land);
    }
  });

  it('uses one home-land rule for the rare friends, their spots and land reactions', () => {
    expect(homeLandFor('leviathan')).toBe('ocean');
    expect(homeLandFor('worldtree')).toBe('forest');
    expect(homeLandFor('unknown')).toBeNull();
    const p = player(['worldtree', 'leviathan']);
    const cards = ensureWishes(p, day);
    for (const card of cards.slice(0, 2)) expect(template(card).land).toBe(homeLandFor(card.species));
    expect(homeSpotFor(p.home.residents[0], p.home, ['jungle', 'forest'])).toEqual({ kind: 'gap', index: 1 });
    expect(homeSpotFor(p.home.residents[1], p.home, [])).toEqual({ kind: 'sea' });
    expect(reactionsFor(p.home, { kind: 'land_planted', biome: 'forest' }, new Date(day)).map((r) => r.species)).toEqual(['worldtree']);
  });

  it('still pays two friendship points to a resident on claim, once', () => {
    const p = player(['otter']);
    const card = ensureWishes(p, day)[0];
    card.progress = card.goal;
    expect(claimWish(p, card.id, day)).toBe(true);
    expect(p.home.residents[0].fp).toBe(2);
    expect(claimWish(p, card.id, day)).toBe(false);
    expect(p.home.residents[0].fp).toBe(2);
  });

  it('renders the frozen Your friend tag on friend cards', () => {
    const p = player(['otter', 'deer']);
    const root = wishesPanel({ p } as App) as unknown as RecordedNode;
    expect(root.querySelectorAll('.wish-origin')).toHaveLength(2);
    expect(visibleText(root)).toContain('Your friend');
  });
});

describe('M13 Wish bubble data (13.6)', () => {
  it('reads resident land Wishes without dealing, claiming or paying anything', () => {
    const p = player(['otter', 'deer']);
    const cards = ensureWishes(p, day);
    const saved = JSON.stringify(p);
    expect(wishBubbles(p)).toEqual(cards.slice(0, 2).map((q) => ({ species: q.species, land: template(q).land })));
    expect(JSON.stringify(p)).toBe(saved);
    cards[0].claimed = true;
    expect(wishBubbles(p)).toEqual([{ species: cards[1].species, land: template(cards[1]).land }]);
  });

  it('uses the friend’s home icon for a non-land Wish preserved from 1.0', () => {
    const p = player(['otter']);
    const card = ensureWishes(p, day)[0];
    const saved: WishCard = { ...card, template: 'creature1' };
    delete saved.from;
    p.quests.list = [saved];
    expect(wishBubbles(p)).toEqual([{ species: 'otter', land: homeLandFor('otter') }]);
  });

  it('deduplicates species, omits invalid/nonresident Wishes and hides locked Wishes', () => {
    const p = player(['otter']);
    const card = ensureWishes(p, day)[0];
    p.quests.list = [card, { ...card, id: 'duplicate' }, { ...card, id: 'fusion', species: 'deer', template: 'steam' }];
    expect(wishBubbles(p)).toEqual([{ species: 'otter', land: template(card).land }]);
    const invalid: WishCard = { ...card, template: 'missing' };
    p.quests.list = [invalid];
    expect(wishBubbles(p)).toEqual([]);
    p.quests.list = [card];
    p.level = 1;
    expect(wishBubbles(p)).toEqual([]);
    const fresh = player(['otter']);
    const saved = JSON.stringify(fresh);
    expect(wishBubbles(fresh)).toEqual([]);
    expect(JSON.stringify(fresh)).toBe(saved);
  });
});
