import { describe, expect, it } from 'vitest';
import { KINDS } from '../src/core/world';
import { defaultProfile } from '../src/meta/profile';
import { PRODUCTS } from '../src/meta/tuning';
import {
  COSMETICS,
  COSMETIC_BY_ID,
  M12_COSMETICS,
  OBJECT_KINDS,
  M12_STARDUST_COSMETICS,
  STYLE_SLOTS,
  beginStyleDraft,
  currentLook,
  finishStyleDraft,
  grantWishSampler,
  isPaidLook,
  owns,
  tryStyle,
} from '../src/meta/cosmetics';
import { PROJECTILE_SILHOUETTES } from '../src/ui/art/projectiles';
import { STYLE_ALPHA_CAP, STYLE_PARTICLE_CAP } from '../src/ui/art/styleRender';
import { drawFriendOutfit, drawStyledBurst, drawStyledEvent, drawStyledShotTrail } from '../src/ui/art/styleRender';
import { drawProjectile } from '../src/ui/art/projectiles';
import { drawStructure } from '../src/ui/art/structures';
import { drawKeeper } from '../src/ui/art/keeper';

type PaintCall = { method: string; fill: string; alpha: number; args: unknown[] };
function recordingCanvas() {
  const calls: PaintCall[] = [];
  const state = { fillStyle: '', globalAlpha: 1 };
  const stack: (typeof state)[] = [];
  const g = new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key as keyof typeof target];
      if (key === 'save') return () => stack.push({ ...target });
      if (key === 'restore') return () => Object.assign(target, stack.pop());
      if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
      return (...args: unknown[]) =>
        calls.push({
          method: String(key),
          fill: typeof target.fillStyle === 'string' ? target.fillStyle : '[gradient]',
          alpha: target.globalAlpha,
          args,
        });
    },
    set(target, key, value) {
      Reflect.set(target, key, value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, calls };
}

const CVD = [
  [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.141602],
    [0.004733, 0.691367, 0.3039],
  ],
];
function simulated(hex: string, matrix: number[][]): number[] {
  const rgb = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  return matrix.map((row) => row.reduce((v, coefficient, i) => v + coefficient * rgb[i], 0));
}

describe('M12 style readability', () => {
  it('keeps one fixed colour and a distinct silhouette per object under every skin', () => {
    expect(OBJECT_KINDS).toHaveLength(6);
    expect(new Set(Object.values(PROJECTILE_SILHOUETTES)).size).toBe(6);
    for (const kind of OBJECT_KINDS) {
      expect(KINDS[kind].color).toMatch(/^#[\da-f]{6}$/i);
      expect(STYLE_SLOTS).toContain(`shotTrail:${kind}`);
      expect(STYLE_SLOTS).toContain(`burst:${kind}`);
      for (const item of COSMETICS.filter((x) => x.slot === `shotTrail:${kind}` || x.slot === `burst:${kind}`)) {
        expect(item).not.toHaveProperty('elementColor');
        expect(item).not.toHaveProperty('silhouette');
        expect(item).not.toHaveProperty('badge');
      }
    }
  });

  it('caps decorative ink below earned effects and never exposes a gameplay channel', () => {
    expect(STYLE_PARTICLE_CAP).toBeLessThanOrEqual(12);
    expect(STYLE_ALPHA_CAP).toBeLessThanOrEqual(0.45);
    const forbidden = /^(land|threat|skyObstacle|bonkBadge|forecast|aimLine|preview|goalChip|power|stats)$/;
    for (const item of M12_COSMETICS) {
      expect(item.slot).not.toMatch(forbidden);
      expect(item.colors.every((c) => /^#[\da-f]{6}$/i.test(c))).toBe(true);
    }
  });

  it('draws a still effect with bounded marks while preserving the projectile under all three colour-vision models', () => {
    for (const [index, kind] of OBJECT_KINDS.entries()) {
      const look = {
        suit: 'suit_sky',
        hat: 'hat_antenna',
        launcher: 'l_pad',
        trail: 'tr_dots',
        emote: 'em_cheer',
        supernova: 'supernova_nebula',
        [`shotTrail:${kind}`]: `crystalfrost_trail_${index + 1}`,
        [`burst:${kind}`]: `crystalfrost_burst_${index + 1}`,
      };
      const styled = recordingCanvas();
      drawStyledShotTrail(
        styled.g,
        look,
        kind,
        [
          { x: 5, y: 5 },
          { x: 8, y: 8 },
        ],
        0.3,
        true,
      );
      drawStyledBurst(styled.g, look, kind, 30, 30, 20, true);
      drawStyledEvent(styled.g, look, 'supernova', 30, 30, 26, true);
      const markCalls = styled.calls.filter((call) => call.method === 'fill' && ['#93bac9', '#a290bc'].includes(call.fill));
      expect(markCalls, kind).toHaveLength(7);
      expect(markCalls.every((call) => call.alpha <= STYLE_ALPHA_CAP)).toBe(true);
      const beforeProjectile = styled.calls.length;
      drawProjectile(styled.g, kind, 30, 30, 26, 0.3);
      const plain = recordingCanvas();
      drawProjectile(plain.g, kind, 30, 30, 26, 0.3);
      const styledObject = styled.calls.slice(beforeProjectile).filter((call) => call.method === 'fill');
      const plainObject = plain.calls.filter((call) => call.method === 'fill');
      expect(styledObject, kind).toEqual(plainObject);
      for (const model of CVD)
        for (const [a, b] of styledObject.map((call, i) => [call, plainObject[i]] as const))
          if (/^#[\da-f]{6}$/i.test(a.fill)) expect(simulated(a.fill, model)).toEqual(simulated(b.fill, model));
    }
  });

  it('draws the two outfits in each Theme as distinct shapes', () => {
    for (const prefix of ['tidepool', 'cometcandy']) {
      const outfit = recordingCanvas();
      const scarf = recordingCanvas();
      drawFriendOutfit(
        outfit.g,
        {
          suit: 'suit_sky',
          hat: 'hat_antenna',
          launcher: 'l_pad',
          trail: 'tr_dots',
          emote: 'em_cheer',
          friendOutfit: `${prefix}_friend_1`,
        },
        30,
        30,
        50,
      );
      drawFriendOutfit(
        scarf.g,
        {
          suit: 'suit_sky',
          hat: 'hat_antenna',
          launcher: 'l_pad',
          trail: 'tr_dots',
          emote: 'em_cheer',
          friendOutfit: `${prefix}_friend_2`,
        },
        30,
        30,
        50,
      );
      expect(outfit.calls.map((call) => call.method)).not.toEqual(scarf.calls.map((call) => call.method));
      expect(outfit.calls.some((call) => call.method === 'fill')).toBe(true);
      expect(scarf.calls.some((call) => call.method === 'fill')).toBe(false);
    }
  });

  it('gives the Star Captain emote a pose distinct from the default', () => {
    const base = recordingCanvas();
    const captain = recordingCanvas();
    const look = { suit: 'suit_sky', hat: 'hat_antenna', launcher: 'l_pad', trail: 'tr_dots', emote: 'em_cheer' };
    drawKeeper(base.g, look, 40, 90, 80, 0.3, { emote: true, et: 0.3 });
    drawKeeper(captain.g, { ...look, emote: 'em_star_captain' }, 40, 90, 80, 0.3, { emote: true, et: 0.3 });
    expect(captain.calls).not.toEqual(base.calls);
  });

  it('draws actual code-painted panels on each Theme structure and decoration', () => {
    const shapes = ['lab', 'den', 'greenhouse', 'launch_bay', 'flowers', 'fountain', 'lantern'] as const;
    const suffixes = ['lab_1', 'den', 'greenhouse', 'launch_bay', 'decor_1', 'decor_2', 'decor_3'];
    for (const theme of ['tidepool', 'cometcandy'])
      for (const [index, type] of shapes.entries()) {
        const plain = recordingCanvas();
        const styled = recordingCanvas();
        drawStructure(plain.g, type, 1, 64, 0.3);
        drawStructure(styled.g, type, 1, 64, 0.3, false, { style: `${theme}_${suffixes[index]}` });
        expect(styled.calls.filter((call) => call.method === 'fill').length, `${theme}/${type}`).toBeGreaterThan(
          plain.calls.filter((call) => call.method === 'fill').length,
        );
      }
  });

  it('matches every C-owned paid item to a fixed catalogue grant', () => {
    const products = PRODUCTS.filter((p) => ['starter', 'theme', 'planet_pack', 'style_single'].includes(p.kind) || p.key === 'starter');
    for (const product of products) {
      for (const id of product.cosmeticItemIds) {
        if (['aurora', 'banner_aurora', 'suit_aurora'].includes(id)) continue;
        const item = COSMETIC_BY_ID[id];
        expect(item, `${product.key}: ${id}`).toBeDefined();
        expect(isPaidLook(item), id).toBe(true);
      }
    }
    for (const item of M12_COSMETICS.filter(isPaidLook)) {
      const product = PRODUCTS.find((p) => p.cosmeticItemIds.includes(item.id));
      expect(product, item.id).toBeDefined();
      if (item.source === 'product') expect(item.productId).toBe(product!.id);
    }
  });

  it('keeps try-on reversible until Done and revokes a refunded entitlement', () => {
    const p = defaultProfile();
    const first = currentLook(p);
    const draft = tryStyle(beginStyleDraft(p), 'supernova_nebula');
    expect(draft.slots.supernova).toBe('supernova_nebula');
    expect(currentLook(p)).toEqual(first);
    finishStyleDraft(p, draft);
    expect(currentLook(p).supernova).toBeUndefined();
    const productId = 'com.pocketplanet.game.style.nebula';
    (p.meta as typeof p.meta & { productEntitlements: string[] }).productEntitlements = [productId];
    expect(owns(p, 'supernova_nebula')).toBe(true);
    finishStyleDraft(p, draft);
    expect(currentLook(p).supernova).toBe('supernova_nebula');
    (p.meta as typeof p.meta & { revokedProducts: Record<string, number> }).revokedProducts = { [productId]: Date.now() };
    expect(currentLook(p).supernova).toBeUndefined();
  });

  it('gives each Theme and Pack a fixed Wish sampler without a second grant', () => {
    const p = defaultProfile();
    for (const id of ['sampler_tidepool', 'sampler_cometcandy', 'sampler_crystalfrost'] as const) {
      expect(grantWishSampler(p, id)).toBe(true);
      expect(grantWishSampler(p, id)).toBe(false);
      expect(owns(p, id)).toBe(true);
    }
  });

  it('offers four new stardust effects at rising fixed prices', () => {
    const series = M12_STARDUST_COSMETICS;
    expect(series.map((item) => item.dust)).toEqual([5000, 12000, 25000, 50000]);
    expect(series.every((item) => item.source === 'dust' && !!item.motif)).toBe(true);
  });
});
