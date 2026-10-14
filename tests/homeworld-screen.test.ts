import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultProfile } from '../src/meta/profile';
import { createPanel } from '../src/ui/screens/homeworld/panel';
import { essenceSheet, levelChecklist, residentsSheet } from '../src/ui/screens/homeworld/sheets';
import { h, btn } from '../src/ui/dom';
import type { App } from '../src/ui/app';

const capture = vi.hoisted(() => ({ sheet: null as unknown }));

// A small structural DOM records the real panel and sheet builders without a browser canvas.
vi.mock('../src/ui/dom', () => {
  type Child = Mini | string | number | null | undefined | false | Child[];
  class Mini {
    tag: string;
    attrs: Record<string, string> = {};
    children: (Mini | string)[] = [];
    parentElement = null;
    constructor(tag: string, props?: Record<string, unknown> | null) {
      this.tag = tag;
      for (const [key, value] of Object.entries(props ?? {}))
        if (value != null && value !== false && !key.startsWith('on')) this.attrs[key] = String(value);
    }
    append(...children: Child[]) {
      for (const child of children) {
        if (child == null || child === false) continue;
        if (Array.isArray(child)) this.append(...child);
        else this.children.push(typeof child === 'object' ? child : String(child));
      }
    }
    replaceChildren(...children: Child[]) {
      this.children = [];
      this.append(...children);
    }
    setAttribute(key: string, value: string) {
      this.attrs[key] = value;
    }
    set textContent(value: string) {
      this.children = [value];
    }
    get textContent(): string {
      return this.children.map((child) => (typeof child === 'string' ? child : child.textContent)).join('');
    }
  }
  const h = (tag: string, props?: Record<string, unknown> | null, ...children: Child[]) => {
    const node = new Mini(tag, props);
    node.append(...children);
    return node;
  };
  const btn = (label: Child, cls: string, _click: () => void) => h('button', { class: `btn ${cls}`, type: 'button' }, label);
  return {
    h,
    btn,
    fmt: (n: number) => Math.floor(n).toLocaleString('en'),
    modal: (content: Child[]) => {
      capture.sheet = h('div', { class: 'modal' }, ...content);
      return { close() {} };
    },
    toast() {},
  };
});

type Tree = { tag: string; attrs: Record<string, string>; children: (Tree | string)[] };
function tree(node: unknown): Tree | string {
  if (typeof node === 'string') return node;
  const item = node as Tree;
  return { tag: item.tag, attrs: item.attrs, children: item.children.map(tree) };
}

function panelAt(level: 1 | 3, setup?: (p: ReturnType<typeof defaultProfile>) => void) {
  const p = defaultProfile(Date.UTC(2026, 9, 6, 12));
  p.home.intro = true;
  p.level = level === 1 ? 5 : 30;
  if (level === 3) {
    p.home.level = 3;
    p.home.plots.push(null, null, null, null);
    p.dust = 2500;
    p.mats.leaf = 25;
  }
  setup?.(p);
  const app = {
    p,
    save() {},
    topBar() {
      return h('div');
    },
    canGoBack() {
      return false;
    },
  } as unknown as App;
  const panel = h('div');
  const levelBadge = btn('', '', () => {});
  const pouchHeader = btn('', '', () => {});
  const plotButtons = p.home.plots.map(() => btn('', '', () => {}));
  const view = createPanel({
    app,
    canvas: { parentElement: null } as HTMLCanvasElement,
    panel,
    levelBadge,
    pouchHeader,
    plotButtons,
    selected: -1,
    moving: -1,
    geo: { cx: 100, cy: 100, R: 50, w: 200, h: 200 },
    schedule() {},
    burst() {},
    surf: () => ({ x: 0, y: 0 }),
    plotAngle: () => 0,
    doCollect: () => false,
    reopen() {},
  });
  view.renderPanel();
  return {
    p,
    app,
    panel: tree(panel),
    badge: tree(levelBadge),
    plotLabels: plotButtons.map((button) => button.getAttribute?.('aria-label') ?? (button as unknown as Tree).attrs['aria-label']),
  };
}

describe('Homeworld screen structure', () => {
  afterEach(() => {
    capture.sheet = null;
    vi.useRealTimers();
  });

  it('keeps overview and VoiceOver plot list stable at Levels 1 and 3', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 6, 12));
    for (const level of [1, 3] as const) {
      const view = panelAt(level);
      expect({ panel: view.panel, badge: view.badge, plotLabels: view.plotLabels }).toMatchSnapshot(`level-${level}`);
    }
  });

  it('keeps pouch, friends, and level checklist sheet structure stable', () => {
    const view = panelAt(1);
    essenceSheet(view.app);
    expect(tree(capture.sheet)).toMatchSnapshot('pouch');
    residentsSheet(view.app, () => {});
    expect(tree(capture.sheet)).toMatchSnapshot('friends');
    expect(tree(levelChecklist(view.app, 2))).toMatchSnapshot('level-checklist');
  });
});

it('M14 adds a separate accessible Road Landmark list without changing the five-site list', async () => {
  const roads = await import('../src/meta/starroad');
  const { ROAD01 } = await import('../src/meta/content/road01');
  const catalog = [roads.ROAD_CATALOG[0], { ...ROAD01.road, opensOn: '2026-02-26' }];
  const original = roads.playableRoads;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-26T12:00:00Z'));
  vi.spyOn(roads, 'playableRoads').mockImplementation((p, day) => original(p, day, catalog));
  try {
    const view = panelAt(3, (p) => {
      p.home.level = 5;
      p.home.firstHour = 2;
      p.level = 121;
      for (const state of Object.values(p.home.landmarks)) state.stage = 4;
      p.cometPier.stage = 4;
    });
    expect(view.panel).toMatchSnapshot('m14-road-landmark-list');
    expect(JSON.stringify(view.panel)).toContain('Sky Loom');
    expect(JSON.stringify(view.panel)).toContain('Road Landmarks');
    vi.setSystemTime(new Date('2026-02-25T12:00:00Z'));
    const closed = panelAt(3, (p) => {
      p.home.level = 5;
      p.home.firstHour = 2;
      p.level = 121;
      for (const state of Object.values(p.home.landmarks)) state.stage = 4;
      p.cometPier.stage = 4;
    });
    expect(JSON.stringify(closed.panel)).not.toContain('Sky Loom');
    expect(JSON.stringify(closed.panel)).not.toContain('Road Landmarks');
  } finally {
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
});
