import { describe, expect, it, vi } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { recordRemix, remixFrame, remixTotal } from '../src/meta/remix';
import { titlesOwned } from '../src/meta/passport';
import { hasSticker, milestonesReady, pageDone, pageStickers } from '../src/meta/stickers';
import { ACHIEVEMENTS } from '../src/meta/achievements';
import { checkMail } from '../src/meta/inbox';
import { remixResult } from '../src/ui/flows/remixResult';

const ui = vi.hoisted(() => ({ contents: [] as unknown[] }));
vi.mock('../src/ui/dom', () => ({
  h: (tag: string, attrs: Record<string, string> | null, ...children: unknown[]) => ({ tag, attrs, children }),
  btn: (label: string, className: string, click: () => void) => ({ tag: 'button', label, className, click }),
  modal: (contents: unknown[]) => {
    ui.contents = contents;
    return { close: vi.fn() };
  },
  fmt: (value: number) => String(value),
}));
vi.mock('../src/ui/audio', () => ({ sfx: { win: vi.fn(), chest: vi.fn() } }));
vi.mock('../src/ui/haptics', () => ({ haptic: { success: vi.fn() } }));
vi.mock('../src/ui/celebrate', () => ({ celebrate: vi.fn() }));

describe('Bonus Remix rewards', () => {
  it('climbs outline, silver and gold without lowering a stored star', () => {
    const p = defaultProfile(0);
    p.level = 11;
    recordRemix(p, 1, 0);
    expect(remixFrame(p, 1)).toBe('outline');
    expect(ACHIEVEMENTS.find((a) => a.id.endsWith('remix_first'))!.done(p)).toBe(true);
    for (let n = 1; n <= 10; n++) recordRemix(p, n, 1);
    expect(remixFrame(p, 1)).toBe('silver');
    for (let n = 1; n <= 10; n++) recordRemix(p, n, 3);
    expect(remixFrame(p, 1)).toBe('gold');
    recordRemix(p, 1, 0);
    expect(remixTotal(p)).toBe(30);
    expect(hasSticker(p, 'k_remix_gold')).toBe(true);
  });

  it('shows the Remix Ribbon without changing Feats completion or sticker gems', () => {
    const p = defaultProfile(0);
    p.level = 11;
    p.bosses = [10];
    p.constellations = ['one', 'two', 'three', 'four', 'five', 'six'];
    p.daily.streak = 28;
    p.home.ring = 5;
    p.passport.set = true;
    p.sightings.otter = 100;
    p.stats.threeStars = 30;
    p.dyes = ['one', 'two', 'three', 'four'];
    p.rank = 10;
    p.fusionsFound = ['steam', 'rainGarden', 'wildflowers', 'glacier'];
    p.combo.stamps = (1 << 13) - 1;
    const done = pageDone(p, 'feat');
    const milestones = milestonesReady(p);
    expect(done).toBe(true);
    expect(pageStickers('feat').some((s) => s.id === 'k_remix_gold')).toBe(false);
    for (let n = 1; n <= 10; n++) recordRemix(p, n, 3);
    expect(hasSticker(p, 'k_remix_gold')).toBe(true);
    expect(pageDone(p, 'feat')).toBe(done);
    expect(milestonesReady(p)).toBe(milestones);
  });

  it('derives chapter and account titles from best stars on every read', () => {
    const p = defaultProfile(0);
    p.level = 11;
    for (let n = 1; n <= 10; n++) recordRemix(p, n, 3);
    const ids = () => titlesOwned(p).map((title) => title.id);
    expect(ids()).toContain('remix:chapter:1');
    expect(ids()).toContain('remix:total:15');
    expect(ids()).not.toContain('remix:total:60');
    recordRemix(p, 5, 0);
    expect(ids()).toContain('remix:chapter:1');
    expect(ids()).toContain('remix:total:15');
  });

  it('keeps Game Center at its 1000 point limit with progressive gold frames', () => {
    expect(ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0)).toBeLessThanOrEqual(1000);
    expect(ACHIEVEMENTS.filter((a) => a.id.includes('ach.remix_')).reduce((sum, a) => sum + a.points, 0)).toBeLessThanOrEqual(75);
    const p = defaultProfile(0);
    p.level = 101;
    const done = (id: string) => ACHIEVEMENTS.find((a) => a.id.endsWith(id))!.done(p);
    for (let chapter = 1; chapter <= 10; chapter++) {
      for (let n = (chapter - 1) * 10 + 1; n <= chapter * 10; n++) recordRemix(p, n, 3);
      if (chapter === 1) expect(done('remix_gold_1')).toBe(true);
      expect(done('remix_gold_5')).toBe(chapter >= 5);
      expect(done('remix_gold_10')).toBe(chapter >= 10);
    }
    expect(done('remix_gold_10')).toBe(true);
  });

  it('earns the Guardian achievement only after the tenth Remix planet', () => {
    const p = defaultProfile(0);
    p.level = 11;
    const done = () => ACHIEVEMENTS.find((a) => a.id.endsWith('remix_boss'))!.done(p);
    for (let n = 1; n < 10; n++) recordRemix(p, n, 1);
    expect(done()).toBe(false);
    recordRemix(p, 10, 1);
    expect(done()).toBe(true);
  });

  it('records a Remix Guardian without campaign boss or currency rewards', () => {
    const p = defaultProfile(0);
    p.level = 11;
    const before = { bosses: [...p.bosses], gems: p.gems, dust: p.dust, mats: { ...p.mats }, stars: { ...p.stars } };
    recordRemix(p, 10, 3);
    expect({ bosses: p.bosses, gems: p.gems, dust: p.dust, mats: p.mats, stars: p.stars }).toEqual(before);
    expect(p.remix[1].best[9]).toBe(3);
  });

  it('delivers one quiet letter after chapter one is finished', () => {
    const p = defaultProfile(0);
    p.level = 10;
    checkMail(p);
    expect(p.mail.filter((mail) => mail.kind === 'remix')).toHaveLength(0);
    p.level = 11;
    checkMail(p);
    checkMail(p);
    expect(p.mail.filter((mail) => mail.kind === 'remix')).toHaveLength(1);
  });

  it('offers only next planet and map, waiting for an explicit tap', () => {
    const app = { p: defaultProfile(0), showStarMap: vi.fn(), preRemix: vi.fn() };
    const r = { level: { n: 1 }, stars: 2, score: 42 };
    // The DOM mock exposes the actual controls produced by the card.
    remixResult(app as never, r as never, 'outline', false);
    expect(app.showStarMap).toHaveBeenCalledOnce();
    expect(app.preRemix).not.toHaveBeenCalled();
    const buttons: { label: string; click: () => void }[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== 'object') return;
      const node = value as { tag?: string; label?: string; click?: () => void; children?: unknown[] };
      if (node.tag === 'button') buttons.push(node as (typeof buttons)[number]);
      node.children?.forEach(walk);
    };
    walk(ui.contents);
    expect(buttons.map((button) => button.label)).toEqual(['Next remix planet', 'Map']);
    buttons[0].click();
    expect(app.preRemix).toHaveBeenCalledWith(2);
  });

  it('offers only the map after the last planet of the newest finished chapter', () => {
    const p = defaultProfile(0);
    p.level = 11;
    const app = { p, showStarMap: vi.fn(), preRemix: vi.fn() };
    remixResult(app as never, { level: { n: 10 }, stars: 3, score: 90 } as never, 'outline', false);
    const labels: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== 'object') return;
      const node = value as { tag?: string; label?: string; children?: unknown[] };
      if (node.tag === 'button') labels.push(node.label!);
      node.children?.forEach(walk);
    };
    walk(ui.contents);
    expect(labels).toEqual(['Map']);
    expect(app.showStarMap).toHaveBeenCalledWith(1);
  });

  it('makes Map the only primary choice on a first gold frame', () => {
    const app = { p: defaultProfile(0), showStarMap: vi.fn(), preRemix: vi.fn() };
    app.p.level = 21;
    remixResult(app as never, { level: { n: 1 }, stars: 3, score: 90 } as never, 'gold', true);
    const buttons: { label: string; className: string }[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== 'object') return;
      const node = value as { tag?: string; label?: string; className?: string; children?: unknown[] };
      if (node.tag === 'button') buttons.push(node as (typeof buttons)[number]);
      node.children?.forEach(walk);
    };
    walk(ui.contents);
    expect(buttons.map(({ label, className }) => ({ label, className }))).toEqual([{ label: 'Map', className: 'primary wide' }]);
  });
});
