import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { ROAD01 } from '../src/meta/content/road01';
import { newRoadState } from '../src/meta/starroad';
import { grantProduct } from '../src/meta/economy';
import { COSMETIC_BY_ID, currentLook } from '../src/meta/cosmetics';
import { releaseReceipt } from '../src/ui/flows/contents';
import { paintSheet, landmarkStageLabel } from '../src/ui/screens/homeworld/sheets';
import { roadLandmarkCompletedStage } from '../src/meta/roadLandmarks';
import type { App } from '../src/ui/app';

type Node = { tag: string; attrs: Record<string, any>; children: any[] };
const captured = vi.hoisted(() => ({ content: [] as any[], close: () => {} }));
vi.mock('../src/ui/dom', () => ({
  h: (tag: string, attrs: Record<string, any> | null, ...children: any[]) => ({ tag, attrs: attrs ?? {}, children }),
  btn: (text: string, cls: string, onclick: () => void) => ({ tag: 'button', attrs: { class: cls, onclick }, children: [text] }),
  fmt: (n: number) => String(n),
  modal: (content: any[], opts?: { onClose?: () => void }) => {
    captured.content = content;
    captured.close = () => opts?.onClose?.();
    return { close: captured.close };
  },
}));
function nodes(): Node[] {
  const out: Node[] = [];
  const visit = (item: any) => {
    if (Array.isArray(item)) item.forEach(visit);
    else if (item?.tag) {
      out.push(item);
      item.children.forEach(visit);
    }
  };
  visit(captured.content);
  return out;
}
const text = () => JSON.stringify(captured.content);
const installedOpening = ROAD01.road.opensOn;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-28T12:00:00Z'));
  ROAD01.road.opensOn = '2026-12-28';
});
afterEach(() => {
  ROAD01.road.opensOn = installedOpening;
  vi.useRealTimers();
});

it('the Pass receipt names Missions only when the purchased Road is actually reachable there', async () => {
  const product = ROAD01.products.find((product) => product.kind === 'road_pass')!;
  for (const [day, level, expected] of [
    ['2026-12-27', 15, false],
    ['2026-12-28', 1, false],
    ['2026-12-28', 15, true],
  ] as const) {
    vi.setSystemTime(new Date(`${day}T12:00:00Z`));
    const p = defaultProfile(0);
    p.level = level;
    grantProduct(p, product.id, `receipt-${day}-${level}`);
    const receipt = releaseReceipt(product, p, day);
    expect(text().includes('Your Road is in Missions')).toBe(expected);
    expect(text().includes('Opens December 28, 2026')).toBe(day === '2026-12-27');
    captured.close();
    await receipt;
  }
});

it('Hide paid looks keeps earned and gem paints selectable in the real Homeworld sheet', () => {
  const p = defaultProfile(0);
  p.level = 30;
  p.meta.sessions = 2;
  p.settings.hidePaidLooks = true;
  p.roadRecords.road01 = { ...newRoadState(), claimedFreeTierIds: ['road01:tier03'] };
  const ids = ['moonpetal_free_ground', 'road01_reedfold_ground', 'road01_inkfold_sea'];
  p.wardrobe.push(...ids.slice(1));
  for (const product of ROAD01.products) grantProduct(p, product.id, `paint-${product.key}`);
  const app = { p, save: vi.fn() } as unknown as App;
  paintSheet(app);
  for (const id of ids) {
    expect(text()).toContain(COSMETIC_BY_ID[id].name);
    const button = nodes().find((node) => node.tag === 'button' && JSON.stringify(node.children).includes(COSMETIC_BY_ID[id].name))!;
    button.attrs.onclick();
    expect(currentLook(p)[COSMETIC_BY_ID[id].slot]).toBe(id);
  }
  expect(text()).not.toContain('Moonpetal ground paint');
  expect(text()).not.toContain('Paper Garden ground paint');
  vi.setSystemTime(new Date('2026-12-27T12:00:00Z'));
  paintSheet(app);
  for (const id of ids) expect(text()).not.toContain(COSMETIC_BY_ID[id].name);
});

it('the Road celebration explicitly names the completed stage and the sheet names the next stage', () => {
  for (const stage of [1, 2, 3]) {
    expect(roadLandmarkCompletedStage(stage)).toBe(`Stage ${stage} is complete!`);
    expect(landmarkStageLabel(stage)).toBe(`Stage ${stage + 1} of 4`);
  }
});
