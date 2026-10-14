import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { COSMETICS, DEFAULT_LOOK, type Cosmetic } from '../src/meta/cosmetics';
import { addFriendship, recordHomeworldWin } from '../src/meta/homeworld';
import { HABITATS } from '../src/meta/habitats';
import { lateOpen, unlocked } from '../src/meta/unlocks';
import { remixUnlocked, REMIX_RULES } from '../src/meta/remix';
import { rollVisitors } from '../src/meta/visitors';
import * as reveals from '../src/meta/reveals';

function fresh() {
  const p = defaultProfile(0);
  p.level = 20;
  return p;
}
function own(p: ReturnType<typeof fresh>, x: Cosmetic) {
  if (x.source === 'product') (p.meta.productEntitlements ??= []).push(x.productId!);
  else if (x.source === 'starter') p.starter = true;
  else p.wardrobe.push(x.id);
}
describe('noun window reveals preserve earned and purchased access', () => {
  const later = [
    reveals.atmosphereTab,
    reveals.dyeTab,
    reveals.presetsRow,
    reveals.friendOutfitsTab,
    reveals.paintButton,
    reveals.photoButton,
    reveals.landsSection,
    reveals.postcardButton,
    reveals.inboxOpen,
    reveals.habitatSetsVisible,
    (p: ReturnType<typeof fresh>) => reveals.dronesNamed(p, 0),
  ];
  it.each(later)('opens a quiet reveal after 20 or for existing players: %s', (predicate) => {
    const p = fresh();
    expect(predicate(p)).toBe(false);
    p.level = 21;
    expect(predicate(p)).toBe(true);
    p.level = 20;
    p.legacyUnlocks.push('noun-window');
    expect(predicate(p)).toBe(true);
  });
  it('keeps earned-only reveals tied to their own teaching or ownership', () => {
    const p = fresh();
    for (const level of [20, 21]) {
      p.level = level;
      expect(reveals.launcherLooksTab(p)).toBe(false);
      expect(reveals.buddyTab(p)).toBe(false);
      expect(reveals.expeditionButton(p, 0)).toBe(false);
      expect(reveals.mementosVisible(p)).toBe(false);
      expect(reveals.homeworldSlotRow(p, 'denSkin')).toBe(level > 20);
    }
    p.level = 31;
    expect(reveals.launcherLooksTab(p)).toBe(true);
    p.level = 20;
    p.home.residents.push({ species: 'bunny', fp: 0, rewarded: 0 });
    expect(reveals.buddyTab(p)).toBe(true);
    p.home.residents = [];
    p.buddy.species = 'bunny';
    expect(reveals.buddyTab(p)).toBe(true);
    p.buddy.species = null;
    p.legacyUnlocks.push('noun-window');
    expect(reveals.buddyTab(p)).toBe(true);
    expect(reveals.launcherLooksTab(p)).toBe(true);
  });
  it('preserves Starter, Pass and every theme pack receipt route', () => {
    for (const flag of ['starter', 'pass'] as const) {
      const p = fresh();
      p[flag] = true;
      expect(reveals.atmosphereTab(p)).toBe(true);
      expect(reveals.paintButton(p)).toBe(true);
      expect(unlocked(p, 'passport')).toBe(true);
      if (flag === 'pass') {
        expect(unlocked(p, 'star_road')).toBe(true);
        expect(reveals.photoButton(p)).toBe(true);
      }
      if (flag === 'starter') expect(reveals.launcherLooksTab(p)).toBe(true);
    }
    for (const theme of ['tidepool', 'cometcandy']) {
      const p = fresh();
      p.meta.productEntitlements = [`com.pocketplanet.game.theme.${theme}`];
      expect(reveals.friendOutfitsTab(p)).toBe(true);
      expect(reveals.paintButton(p)).toBe(true);
      for (const x of COSMETICS.filter((x) => x.id.startsWith(`${theme}_`) && x.slot !== 'friendOutfit'))
        expect(reveals.homeworldSlotRow(p, x.slot), x.id).toBe(true);
    }
  });
  it('preserves non-classic skins, unlocked/applied dyes, presets and worn outfits', () => {
    let p = fresh();
    p.skin = 'aurora';
    expect(reveals.atmosphereTab(p)).toBe(true);
    p = fresh();
    p.skins.push('cosmic');
    expect(reveals.atmosphereTab(p)).toBe(true);
    p = fresh();
    p.dyes.push('moss');
    expect(reveals.dyeTab(p)).toBe(true);
    for (const channel of ['main', 'trim'] as const) {
      p = fresh();
      p.dye[channel] = 'moss';
      expect(reveals.dyeTab(p)).toBe(true);
    }
    p = fresh();
    p.presets = [{ ...DEFAULT_LOOK }];
    expect(reveals.presetsRow(p)).toBe(true);
    p = fresh();
    const outfit = COSMETICS.find((x) => x.slot === 'friendOutfit')!;
    own(p, outfit);
    Object.assign(p.look, { friendOutfit: outfit.id });
    expect(reveals.friendOutfitsTab(p)).toBe(true);
  });
  it('does not expose the automatically owned Twig launcher, but preserves worn and bought looks', () => {
    const p = fresh();
    p.chapters = [1];
    expect(reveals.launcherLooksTab(p)).toBe(false);
    const twig = COSMETICS.find((x) => x.slot === 'launcher' && x.source === 'chapter')!;
    p.look.launcher = twig.id;
    expect(reveals.launcherLooksTab(p)).toBe(true);
    for (const x of COSMETICS.filter((x) => x.slot === 'launcher' && ['dust', 'gems', 'starter'].includes(x.source))) {
      const q = fresh();
      own(q, x);
      expect(reveals.launcherLooksTab(q), x.id).toBe(true);
    }
  });
  it('keeps paints, frames, chosen lands, working trips and busy drones reachable', () => {
    let p = fresh();
    p.home.paints.push('pink');
    expect(reveals.paintButton(p)).toBe(true);
    p = fresh();
    p.home.paint.ground = 'pink';
    expect(reveals.paintButton(p)).toBe(true);
    p = fresh();
    p.home.paint.sea = 'pink';
    expect(reveals.paintButton(p)).toBe(true);
    for (const id of ['frame_gold', 'frame_starfield']) {
      p = fresh();
      p.wardrobe.push(id);
      if (id === 'frame_gold') p.home.landmarks.keepers_beacon.stage = 4;
      else p.pass = true;
      expect(reveals.photoButton(p), id).toBe(true);
    }
    p = fresh();
    p.home.gaps[0] = 'meadow';
    expect(reveals.landsSection(p)).toBe(true);
    p = fresh();
    p.home.expedition = { species: 'bunny', hours: 1, ends: 1000, planet: 0 };
    expect(reveals.expeditionButton(p, 0)).toBe(true);
    p = fresh();
    p.home.plots[0] = { type: 'launch_bay', lv: 1, since: 0 };
    expect(reveals.expeditionButton(p, 0)).toBe(true);
    p = fresh();
    p.home.level = 3;
    expect(reveals.dronesNamed(p, 0)).toBe(true);
    p = fresh();
    p.home.plots[0] = { type: 'den', lv: 1, since: 0, done: 1000 };
    p.home.plots[1] = { type: 'lantern', lv: 1, since: 0, done: 1000 };
    expect(reveals.dronesNamed(p, 0)).toBe(true);
  });
  it('keeps a read letter, prior visit, played Remix and completed set', () => {
    for (const flag of ['read', 'claimed'] as const) {
      const p = fresh();
      p.mail.push({ id: 'welcome', kind: 'welcome', at: 0, read: false, claimed: false, [flag]: true });
      expect(reveals.inboxOpen(p)).toBe(flag === 'read');
    }
    const p = fresh();
    p.level = 10;
    p.seen = ['bunny'];
    p.galaxy = [{ n: 1, name: 'A', hue: 0, stars: 1, species: [], life: 1, colors: [] }];
    expect(rollVisitors(p, 60 * 60_000)).toEqual([]);
    p.visits.bunny = 1;
    expect(rollVisitors(p, 60 * 60_000).length).toBeGreaterThan(0);
    p.level = 11;
    p.remix[1] = { v: REMIX_RULES, best: [], played: [true] };
    expect(remixUnlocked(p, 1)).toBe(true);
    const q = fresh();
    q.seen = [...HABITATS[0].species];
    expect(reveals.habitatSetsVisible(q)).toBe(true);
    q.seen = [];
    q.habitats.push(HABITATS[0].id);
    expect(reveals.habitatSetsVisible(q)).toBe(true);
    q.mementos.push('bunny');
    expect(reveals.mementosVisible(q)).toBe(true);
  });
  it('reveals Homeworld looks only with a row, then restores every row after the window', () => {
    const p = fresh();
    expect(reveals.homeworldLooksTab(p)).toBe(false);
    p.level = 21;
    expect(reveals.homeworldLooksTab(p)).toBe(true);
    expect(reveals.homeworldSlotRow(p, 'denSkin')).toBe(true);
    p.level = 15;
    p.legacyUnlocks.push('noun-window');
    expect(reveals.homeworldSlotRow(p, 'labSkin:rock')).toBe(true);
    expect(reveals.homeworldLooksTab(p)).toBe(true);
    for (const theme of ['tidepool', 'cometcandy']) {
      const buyer = fresh();
      buyer.level = 13;
      buyer.meta.productEntitlements = [`com.pocketplanet.game.theme.${theme}`];
      expect(reveals.homeworldLooksTab(buyer)).toBe(true);
      expect(reveals.launchBayBuildable(buyer)).toBe(true);
    }
    const empty = fresh();
    expect(reveals.launchBayBuildable(empty)).toBe(false);
    empty.level = 21;
    expect(reveals.launchBayBuildable(empty)).toBe(true);
  });
  it('an automatically claimed best-friend letter and keepsake do not open Inbox or visitors', () => {
    const p = fresh();
    p.level = 19;
    p.seen = ['bunny'];
    p.galaxy = [{ n: 1, name: 'A', hue: 0, stars: 1, species: [], life: 1, colors: [] }];
    p.home.residents.push({ species: 'bunny', fp: 0, rewarded: 0 });
    for (let i = 0; i < 25; i++)
      recordHomeworldWin(p, { mode: 'campaign', planetKey: 'campaign:1', buddySpecies: 'bunny', at: i, roundKey: `replay-${i}` });
    expect(p.mementos).toContain('bunny');
    expect(p.mail[0]).toMatchObject({ kind: 'best', read: false, claimed: true });
    expect(reveals.inboxOpen(p)).toBe(false);
    expect(rollVisitors(p, 60 * 60_000)).toEqual([]);
    p.visits.bunny = 0;
    expect(rollVisitors(p, 60 * 60_000)).toEqual([]);
    p.mail[0].read = true;
    expect(reveals.inboxOpen(p)).toBe(true);
    p.visits.bunny = 1;
    expect(rollVisitors(p, 60 * 60_000).length).toBeGreaterThan(0);
    const q = fresh();
    q.level = 15;
    q.home.residents.push({ species: 'bunny', fp: 0, rewarded: 0 });
    addFriendship(q, q.home.residents[0], 25);
    expect(reveals.inboxOpen(q)).toBe(false);
    expect(rollVisitors(q, 60 * 60_000)).toEqual([]);
  });
  it('hides only labels for closed sources; items keep their own ownership', () => {
    const p = fresh();
    p.level = 1;
    for (const source of ['wish', 'road', 'calendar', 'constellation', 'habitat'] as const)
      expect(reveals.sourceOpen(p, source), source).toBe(false);
    expect(reveals.sourceOpen(p, 'gems')).toBe(true);
    p.level = 24;
    for (const source of ['wish', 'road', 'calendar', 'constellation', 'habitat'] as const)
      expect(reveals.sourceOpen(p, source)).toBe(true);
    expect(lateOpen(p)).toBe(true);
  });
});
