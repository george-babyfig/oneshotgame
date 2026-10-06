// Sticker Album: the collection (every sticker and how to earn it) and a
// scrapbook where owned stickers can be placed, turned, resized and shared.
import { h, btn, closeModals, modal, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import {
  ALBUM_PAGES,
  MAX_PLACED,
  MILESTONE_EVERY,
  SCRAP_BGS,
  SCRAP_PAGES,
  STICKERS,
  STICKER_BY_ID,
  bgUnlocked,
  claimMilestones,
  claimPage,
  milestonesReady,
  moveSticker,
  ownedStickers,
  pageDone,
  pageStickers,
  placeSticker,
  raiseSticker,
  removeSticker,
  scaleSticker,
  setPageBg,
  turnSticker,
  type Sticker,
} from '../../meta/stickers';
import { rewardText } from '../../meta/progression';
import { drawSticker, stickerCanvas } from '../art/stickers';
import { shareCanvas } from '../postcard';
import type { App } from '../app';
import { t } from '../../i18n';

let tab: 'collect' | 'scrap' = 'collect';
let pageNo = 0;

function hintOf(s: Sticker) {
  const [text, vars] = s.hint;
  const v = { ...(vars ?? {}) };
  if (typeof v.name === 'string') v.name = t(v.name);
  return t(text, v);
}

function stickerCard(app: App, s: Sticker) {
  const got = s.earned(app.p);
  modal([
    h('div', { class: 'stk-big' }, stickerCanvas(s.id, 150, !got)),
    h('div', { class: 'm-title' }, got ? t(s.name) : t('Not yet!')),
    h('p', { class: 'muted' }, got ? t('Yours! Place it in your scrapbook.') : hintOf(s)),
    got
      ? btn(t('Put it in my scrapbook'), 'primary wide', () => {
          const k = placeSticker(app.p, pageNo, s.id, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5);
          if (k < 0) toast(t('This page is full — try another one'), 'bad');
          else app.save();
          closeModals();
          switchTab(app, 'scrap');
        })
      : null,
  ]);
}

// ------------------------------------------------------------------ paper
export function drawPaper(g: CanvasRenderingContext2D, w: number, hh: number, bg: number) {
  const b = SCRAP_BGS[bg] ?? SCRAP_BGS[0];
  const gr = g.createLinearGradient(0, 0, w * 0.4, hh);
  gr.addColorStop(0, b.colors[0]);
  gr.addColorStop(1, b.colors[1]);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, hh);
  const dark = parseInt(b.colors[0].slice(1, 3), 16) < 0x80;
  g.fillStyle = g.strokeStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.08)';
  const u = w / 20;
  if (b.pattern === 'dots') {
    for (let y = u / 2; y < hh; y += u) for (let x = (y / u) % 2 ? u / 2 : u; x < w; x += u) g.fillRect(x, y, u * 0.12, u * 0.12);
  } else if (b.pattern === 'grid') {
    g.lineWidth = 1;
    for (let x = 0; x < w; x += u) g.fillRect(x, 0, 1, hh);
    for (let y = 0; y < hh; y += u) g.fillRect(0, y, w, 1);
  } else if (b.pattern === 'stripes') {
    for (let x = -hh; x < w; x += u * 1.6) {
      g.beginPath();
      g.moveTo(x, hh);
      g.lineTo(x + u * 0.5, hh);
      g.lineTo(x + hh + u * 0.5, 0);
      g.lineTo(x + hh, 0);
      g.fill();
    }
  } else if (b.pattern === 'stars') {
    for (let k = 0; k < 70; k++) {
      const x = ((k * 97.3) % 100) / 100;
      const y = ((k * 57.7) % 100) / 100;
      const r = (k % 3) * 0.5 + 0.6;
      g.beginPath();
      g.arc(x * w, y * hh, r * (w / 360), 0, Math.PI * 2);
      g.fill();
    }
  }
}

function paperCanvas(w: number, hh: number, bg: number) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr);
  c.height = Math.round(hh * dpr);
  c.style.width = `${w}px`;
  c.style.height = `${hh}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  drawPaper(g, w, hh, bg);
  return c;
}

/** Stickers are sized relative to the page width. */
const STICKER_K = 0.22;

function renderPage(app: App, pi: number, W: number): HTMLCanvasElement {
  const H = Math.round(W * 1.3);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const pg = app.p.album.pages[pi];
  drawPaper(g, W, H, pg?.bg ?? 0);
  for (const it of pg?.items ?? []) {
    g.save();
    g.translate(it.x * W, it.y * H);
    g.rotate(it.r);
    drawSticker(g, it.id, W * STICKER_K * 0.5 * it.s);
    g.restore();
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.font = `700 ${Math.round(W * 0.03)}px Fredoka, system-ui, sans-serif`;
  g.textAlign = 'right';
  g.fillText('Comet Garden', W - W * 0.03, H - W * 0.03);
  return c;
}

// ------------------------------------------------------------------ collection
function collection(app: App) {
  const p = app.p;
  const owned = ownedStickers(p).length;
  const milestoneOwned = ownedStickers(p).filter((s) => !s.bonus).length;
  const ms = milestonesReady(p);
  const next = (Math.floor(milestoneOwned / MILESTONE_EVERY) + 1) * MILESTONE_EVERY;
  return [
    h(
      'div',
      { class: 'progress' },
      h('i', { style: `width:${(owned / STICKERS.length) * 100}%` }),
      h('span', null, t('{have}/{total} stickers', { have: owned, total: STICKERS.length })),
    ),
    ms
      ? btn(t('Claim sticker bonus · 💎{n}', { n: ms * 10 }), 'primary wide', () => {
          if (!claimMilestones(p)) return;
          sfx.chest();
          haptic.success();
          app.save();
          app.refresh();
        })
      : h('p', { class: 'muted' }, t('Every {n} stickers earns 💎10. Next bonus at {next}.', { n: MILESTONE_EVERY, next })),
    ...ALBUM_PAGES.map((pg) => {
      const list = pageStickers(pg.id);
      const display = [...list, ...STICKERS.filter((s) => s.bonus && s.kind === pg.id)];
      const have = list.filter((s) => s.earned(p)).length;
      const done = pageDone(p, pg.id);
      const claimed = p.album.pagesClaimed.includes(pg.id);
      return h(
        'div',
        { class: 'lb-sec' },
        h('div', { class: 'sec-title' }, `${t(pg.name)} `, h('small', { class: 'muted' }, `${have}/${list.length}`)),
        claimed
          ? h('p', { class: 'stk-done' }, t('Complete ✓'))
          : done
            ? btn(t('Claim {r}', { r: rewardText(pg.reward).join(' ') }), 'primary small', () => {
                if (!claimPage(p, pg.id)) return;
                sfx.chest();
                haptic.success();
                app.save();
                app.refresh();
              })
            : h('p', { class: 'muted small' }, t('Fill the page: {r}', { r: rewardText(pg.reward).join(' ') })),
        h(
          'div',
          { class: 'stk-grid' },
          ...display.map((s) => {
            const got = s.earned(p);
            return h(
              'button',
              { class: `stk${got ? '' : ' locked'}`, onclick: () => (sfx.click(), stickerCard(app, s)) },
              stickerCanvas(s.id, 64, !got),
              h('small', null, got ? t(s.name) : '???'),
            );
          }),
        ),
      );
    }),
  ];
}

// ------------------------------------------------------------------ scrapbook
function scrapbook(app: App) {
  const p = app.p;
  const pg = p.album.pages[pageNo];
  const W = Math.min(360, window.innerWidth - 32);
  const H = Math.round(W * 1.3);
  const stage = h('div', { class: 'scrap', style: `width:${W}px;height:${H}px` }, paperCanvas(W, H, pg.bg));
  const layer = h('div', { class: 'scrap-layer' });
  stage.append(layer);
  let sel = -1;
  const tools = h('div', { class: 'scrap-tools' });
  const els: HTMLElement[] = [];
  const place = (el: HTMLElement, k: number) => {
    const it = pg.items[k];
    const px = W * STICKER_K * it.s;
    el.style.width = el.style.height = `${px}px`;
    el.style.transform = `translate(${it.x * W - px / 2}px, ${it.y * H - px / 2}px) rotate(${it.r}rad)`;
  };
  const renderTools = () => {
    const on = sel >= 0;
    const act = (label: string, aria: string, f: () => void) =>
      h(
        'button',
        {
          class: 'stool',
          'aria-label': aria,
          disabled: !on,
          onclick: () => {
            if (sel < 0) return;
            sfx.click();
            f();
            app.save();
          },
        },
        label,
      );
    tools.replaceChildren(
      act('⟲', t('Turn left'), () => (turnSticker(p, pageNo, sel, -Math.PI / 12), place(els[sel], sel))),
      act('⟳', t('Turn right'), () => (turnSticker(p, pageNo, sel, Math.PI / 12), place(els[sel], sel))),
      act('－', t('Smaller'), () => (scaleSticker(p, pageNo, sel, 1 / 1.15), place(els[sel], sel))),
      act('＋', t('Bigger'), () => (scaleSticker(p, pageNo, sel, 1.15), place(els[sel], sel))),
      act('⬆', t('Bring to front'), () => {
        sel = raiseSticker(p, pageNo, sel);
        renderStickers();
      }),
      act('🗑', t('Remove'), () => {
        removeSticker(p, pageNo, sel);
        sel = -1;
        renderStickers();
      }),
    );
  };
  const renderStickers = () => {
    els.length = 0;
    layer.replaceChildren(
      ...pg.items.map((it, k) => {
        const el = h('div', { class: `pst${k === sel ? ' sel' : ''}` }, stickerCanvas(it.id, Math.round(W * STICKER_K * 1.8)));
        els.push(el);
        place(el, k);
        let drag: { x: number; y: number; ox: number; oy: number; moved: boolean } | null = null;
        el.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          el.setPointerCapture(e.pointerId);
          drag = { x: e.clientX, y: e.clientY, ox: pg.items[k].x, oy: pg.items[k].y, moved: false };
          if (sel !== k) {
            sel = k;
            els.forEach((x, j) => x.classList.toggle('sel', j === k));
            renderTools();
          }
        });
        el.addEventListener('pointermove', (e) => {
          if (!drag) return;
          const dx = (e.clientX - drag.x) / W;
          const dy = (e.clientY - drag.y) / H;
          if (Math.abs(dx) + Math.abs(dy) > 0.005) drag.moved = true;
          moveSticker(p, pageNo, k, drag.ox + dx, drag.oy + dy);
          place(el, k);
        });
        const end = () => {
          if (drag?.moved) app.save();
          drag = null;
        };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        return el;
      }),
    );
    renderTools();
  };
  // tap on empty paper deselects
  stage.addEventListener('pointerdown', (e) => {
    if (e.target === stage || ((e.target as HTMLElement).tagName === 'CANVAS' && !(e.target as HTMLElement).closest('.pst'))) {
      sel = -1;
      els.forEach((x) => x.classList.remove('sel'));
      renderTools();
    }
  });
  renderStickers();

  const owned = ownedStickers(p);
  const tray = h(
    'div',
    { class: 'stk-tray' },
    ...(owned.length
      ? owned.map((s) =>
          h(
            'button',
            {
              class: 'stk mini',
              'aria-label': t(s.name),
              onclick: () => {
                sfx.click();
                const k = placeSticker(p, pageNo, s.id, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5);
                if (k < 0) return toast(t('A page holds up to {n} stickers', { n: MAX_PLACED }), 'bad');
                haptic.light();
                sel = k;
                app.save();
                renderStickers();
              },
            },
            stickerCanvas(s.id, 48),
          ),
        )
      : [h('p', { class: 'muted' }, t('Earn stickers to decorate your pages!'))]),
  );

  const bgs = h(
    'div',
    { class: 'scrap-bgs' },
    ...SCRAP_BGS.map((b, i) => {
      const open = bgUnlocked(p, i);
      return h(
        'button',
        {
          class: `sbg${pg.bg === i ? ' on' : ''}${open ? '' : ' locked'}`,
          style: `background:linear-gradient(135deg, ${b.colors[0]}, ${b.colors[1]})`,
          'aria-label': t(b.name),
          onclick: () => {
            sfx.click();
            if (!setPageBg(p, pageNo, i)) return toast(t('Collect {n} stickers to unlock {name}', { n: b.need, name: t(b.name) }));
            app.save();
            app.refresh();
          },
        },
        open ? '' : '🔒',
      );
    }),
  );

  return [
    h(
      'div',
      { class: 'tabs scrap-pages' },
      ...Array.from({ length: SCRAP_PAGES }, (_, i) =>
        h(
          'button',
          {
            class: `tab${i === pageNo ? ' on' : ''}`,
            onclick: () => {
              sfx.click();
              pageNo = i;
              app.refresh();
            },
          },
          t('Page {n}', { n: i + 1 }),
        ),
      ),
    ),
    stage,
    tools,
    h('div', { class: 'sec-title' }, t('Paper')),
    bgs,
    h('div', { class: 'sec-title' }, t('Your stickers'), h('small', { class: 'muted' }, ` · ${t('tap to add')}`)),
    tray,
    btn(t('Share this page'), 'gem wide', () =>
      shareCanvas(renderPage(app, pageNo, 1080), t('My sticker scrapbook in Comet Garden ☄️'), 'pocket-planet-scrapbook'),
    ),
  ];
}

function switchTab(app: App, to: typeof tab) {
  if (tab === to) return;
  sfx.click();
  tab = to;
  app.refresh();
  const sc = app.host.querySelector('.scroll');
  if (sc) sc.scrollTop = 0;
}

export function showAlbum(app: App) {
  const p = app.p;
  if (pageNo >= p.album.pages.length) pageNo = 0;
  while (p.album.pages.length < SCRAP_PAGES) p.album.pages.push({ bg: 0, items: [] });
  // drop stickers that are no longer valid (e.g. renamed ids)
  for (const pg of p.album.pages) pg.items = pg.items.filter((it) => STICKER_BY_ID[it.id]);
  app.mount(
    h(
      'div',
      { class: 'screen page album' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Sticker Album')),
      h(
        'div',
        { class: 'tabs' },
        h('button', { class: `tab${tab === 'collect' ? ' on' : ''}`, onclick: () => switchTab(app, 'collect') }, t('Collection')),
        h('button', { class: `tab${tab === 'scrap' ? ' on' : ''}`, onclick: () => switchTab(app, 'scrap') }, t('Scrapbook')),
      ),
      h('div', { class: 'scroll' }, ...(tab === 'collect' ? collection(app) : scrapbook(app))),
    ),
    'album',
  );
}
