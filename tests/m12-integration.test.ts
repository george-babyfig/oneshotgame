import { describe, expect, it } from 'vitest';
import { defaultProfile, migrate } from '../src/meta/profile';
import { ensureVoyage, voyageHemisphere } from '../src/meta/voyage';
import { ensureWishes, claimWish } from '../src/meta/wishes';
import { owns, visibleCosmetics } from '../src/meta/cosmetics';
import { grantProduct, restoreProduct, revokeProduct } from '../src/meta/economy';
import { PRODUCT_BY_KEY } from '../src/meta/config';
import { grantRoadPass, STAR_ROAD } from '../src/meta/starroad';
import { hasSticker } from '../src/meta/stickers';
import { receiptText } from '../src/ui/flows/receipt';
import { resetProfileKeepingPurchases } from '../src/ui/flows/settings';
import { PAINTS, applyPaint } from '../src/meta/homeworld';

describe('M12 integration', () => {
  it('validates saved retired Event value and pins a Voyage hemisphere across a settings change', () => {
    const raw = defaultProfile(0);
    raw.event = { week: '2026-W41', tokens: 9, claimed: [0], retired: true, legacyGems: 42 };
    raw.voyage = { week: '2026-W41', base: 20, cleared: 2, stars: [2, 1], hemisphere: 'south' };
    const p = migrate(raw as unknown as Record<string, unknown>);
    expect(p.event).toMatchObject({ retired: true, legacyGems: 42 });
    expect(voyageHemisphere(p)).toBe('south');
    p.settings.hemi = 'north';
    ensureVoyage(p, '2026-W41');
    expect(voyageHemisphere(p)).toBe('south');
    const malformed = migrate({
      ...raw,
      event: { ...raw.event, retired: 'yes', legacyGems: -8 },
      voyage: { ...raw.voyage, hemisphere: 'east' },
    });
    expect(malformed.event.retired).toBe(true);
    expect(malformed.event.legacyGems).toBe(14); // validated legacy tokens are converted once; negative saved gems are ignored
    expect(malformed.event.tokens).toBe(0);
    expect(malformed.voyage.hemisphere).toBe('north');
  });

  it('backfills the Pass Starfield frame once and keeps the earned Golden frame after a refund', () => {
    const p = defaultProfile(0);
    p.roadRecords.road00.points = p.roadPoints = 50;
    const pass = PRODUCT_BY_KEY.pass;
    expect(grantProduct(p, pass.id, 'pass-tx')).not.toBeNull();
    expect(grantRoadPass(p)).toHaveLength(5);
    expect(grantRoadPass(p)).toHaveLength(0);
    expect(p.roadRecords.road00.claimedPaidTierIds).toEqual(STAR_ROAD.slice(0, 5).map((tier) => tier.id));
    expect(owns(p, 'frame_starfield')).toBe(true);
    expect(owns(p, 'frame_gold')).toBe(false);
    expect(grantProduct(p, pass.id, 'pass-tx')).toBeNull();
    expect(revokeProduct(p, pass.id, 1000)).toBe(true);
    expect(owns(p, 'frame_starfield')).toBe(false);
    expect(owns(p, 'frame_gold')).toBe(false);
    p.home.landmarks.keepers_beacon.stage = 4;
    expect(owns(p, 'frame_gold')).toBe(true);
    expect(restoreProduct(p, pass.id)).toBe(true);
    expect(grantRoadPass(p)).toHaveLength(0);
    expect(owns(p, 'frame_starfield')).toBe(true);
  });

  it('maps saved Pass paints and a claimed old Golden frame without granting new purchases early', () => {
    const old = defaultProfile(0);
    old.pass = true;
    old.m12LegacyLooksMigrated = false;
    old.home.paint = { ground: 'gilded', sea: 'goldsea' };
    old.roadPass = [4];
    old.roadRecords.road00.claimedPaidTierIds = ['road00:tier04'];
    const p = migrate(old as unknown as Record<string, unknown>);
    expect(PAINTS.some((paint) => paint.id === 'gilded' || paint.id === 'goldsea')).toBe(false);
    expect(applyPaint(p, 'gilded')).toBe('unavailable');
    expect(applyPaint(p, 'goldsea')).toBe('unavailable');
    expect(p.home.paint).toEqual({ ground: 'meadow', sea: 'blue' });
    expect(p.look).toMatchObject({ ground: 'paint_gilded_ground', sea: 'paint_liquid_gold_sea' });
    expect(owns(p, 'paint_gilded_ground')).toBe(true);
    expect(owns(p, 'paint_liquid_gold_sea')).toBe(true);
    expect(owns(p, 'frame_gold')).toBe(true);
    p.pass = false;
    expect(owns(p, 'frame_gold')).toBe(false);
    expect(owns(p, 'paint_gilded_ground')).toBe(false);
    p.pass = true;
    p.settings.hidePaidLooks = true;
    expect(visibleCosmetics(p, 'photoFrame').some((item) => item.id === 'frame_gold')).toBe(false);
    p.home.landmarks.keepers_beacon.stage = 4;
    expect(visibleCosmetics(p, 'photoFrame').some((item) => item.id === 'frame_gold')).toBe(true);
    expect(migrate(p as unknown as Record<string, unknown>).wardrobe).toEqual(p.wardrobe);
    const reset = resetProfileKeepingPurchases(p);
    expect(reset.wardrobe).toEqual(['paint_gilded_ground', 'paint_liquid_gold_sea', 'frame_gold']);
    expect(owns(reset, 'frame_gold')).toBe(true);
    expect(owns(reset, 'paint_gilded_ground')).toBe(true);
    const fresh = defaultProfile(0);
    fresh.pass = true;
    expect(owns(fresh, 'paint_gilded_ground')).toBe(false);
    expect(owns(fresh, 'frame_gold')).toBe(false);
    fresh.home.landmarks.keepers_beacon.stage = 4;
    expect(owns(resetProfileKeepingPurchases(fresh), 'frame_gold')).toBe(false);
  });

  it('awards each free sampler from a claimed Wish once and registers the Road sticker', () => {
    const p = defaultProfile(0);
    p.level = 20;
    p.seen = ['deer', 'otter', 'goat'];
    const cards = ensureWishes(p, '2026-10-06');
    for (const card of cards) {
      card.progress = card.goal;
      expect(claimWish(p, card.id, '2026-10-06')).toBe(true);
      expect(claimWish(p, card.id, '2026-10-06')).toBe(false);
    }
    expect(p.wardrobe.filter((id) => id.startsWith('sampler_'))).toEqual([
      'sampler_tidepool',
      'sampler_cometcandy',
      'sampler_crystalfrost',
    ]);
    expect(hasSticker(p, 'cosmic_road')).toBe(false);
    p.roadStickers.push('cosmic_road');
    expect(hasSticker(p, 'cosmic_road')).toBe(true);
  });

  it('locates every looks purchase in its receipt', () => {
    for (const key of ['starter', 'pass', 'theme_tidepool', 'theme_cometcandy', 'pack_crystalfrost', 'style_nebula', 'style_firefly']) {
      expect(receiptText(PRODUCT_BY_KEY[key], 0)).toMatch(/Styles|Homeworld/);
    }
  });
});
