import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR,
  EYE_STYLES,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  SHOWTIME_COSMETICS,
  SKIN_TONES,
  currentLook,
  owns,
} from '../src/meta/cosmetics';
import { defaultProfile, migrate } from '../src/meta/profile';
import { PORTRAIT_FRAMES, ownsPortraitFrame } from '../src/meta/passport';

describe('Keeper avatar', () => {
  it('gives existing explorers the default face and preserves their outfits', () => {
    const old = defaultProfile();
    old.look.hat = 'hat_none';
    const saved = JSON.parse(JSON.stringify(old));
    delete saved.avatar;
    delete saved.passport.frame;
    const migrated = migrate(saved);
    expect(migrated.avatar).toEqual(DEFAULT_AVATAR);
    expect(currentLook(migrated).hat).toBe('hat_none');
    expect(migrated.passport.frame).toBe(0);
  });

  it('keeps chosen parts through migration and never prices them', () => {
    const p = defaultProfile();
    p.avatar = { face: 3, skin: 7, hair: 6, hairColor: 4, eyes: 2, expression: 'surprised' };
    const loaded = migrate(JSON.parse(JSON.stringify(p)));
    expect(currentLook(loaded).avatar).toEqual(p.avatar);
    expect([FACE_SHAPES.length, SKIN_TONES.length, HAIR_STYLES.length, HAIR_COLORS.length, EYE_STYLES.length]).toEqual([4, 8, 8, 8, 5]);
    expect(SHOWTIME_COSMETICS.every((item) => item.gems === undefined && item.source !== 'pass')).toBe(true);
  });

  it('earns looks and portrait frames from play', () => {
    const p = defaultProfile();
    expect(owns(p, 'suit_meadow')).toBe(false);
    expect(ownsPortraitFrame(p, 1)).toBe(false);
    p.chapters.push(2);
    expect(owns(p, 'suit_meadow')).toBe(true);
    expect(ownsPortraitFrame(p, 1)).toBe(true);
    p.habitats.push('seaside');
    expect(owns(p, 'suit_coralreef')).toBe(true);
    p.daily.streak = 28;
    expect(owns(p, 'hat_firefly')).toBe(true);
    expect(PORTRAIT_FRAMES).toHaveLength(4);
  });
});
