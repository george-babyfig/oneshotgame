// Homeworld screen: drag to spin your planet, tap a plot to build, collect,
// upgrade or clear meteor rocks. Residents wander between the buildings.
import { h, btn, fmt, modal, toast } from '../dom';
import { sfx } from '../audio';
import { haptic } from '../haptics';
import {
  BUILDINGS,
  BUILDING_TYPES,
  BUILD_TIME,
  DEBRIS_DUST,
  FRIEND_LEVELS,
  MAX_LEVEL,
  MAX_RING,
  PRODUCES,
  RING_CHAPTER,
  RING_COST,
  RING_PLOTS,
  anyReady,
  build,
  buildCost,
  busyDrones,
  canBuild,
  canExpand,
  canUpgrade,
  candidates,
  capHours,
  charm,
  clearDebris,
  collect,
  collectAll,
  denCapacity,
  drones,
  expand,
  expeditionBack,
  expeditionLoot,
  expeditionOptions,
  finishExpedition,
  friendLevel,
  fulfil,
  invite,
  isFull,
  moveBuilding,
  rateOf,
  ready,
  requestOf,
  sendHome,
  startExpedition,
  tickHome,
  RESIDENT_ACCS,
  accAvailable,
  wearAcc,
  NICKNAMES,
  setNick,
  isBestFriend,
  currentPaint,
  applyPaint,
  ownsPaint,
  PAINTS,
  upgrade,
  towerLevel,
  type BuildCheck,
  type BuildingType,
  type Collected,
} from '../../meta/homeworld';
import { SPECIES_BY_ID } from '../../core/world';
import { currentLook } from '../../meta/cosmetics';
import { drawCreature, critterCanvas } from '../art/critters';
import { drawKeeper } from '../art/keeper';
import { drawDebris, drawDrone, drawStructure } from '../art/structures';
import { shareCanvas } from '../postcard';
import { SEASON_EMOJI, SEASON_NAMES, nightness, seasonOf } from '../../meta/seasons';
import { drawMeteors, drawSeason } from '../art/seasons';
import { passportName } from '../../meta/passport';
import type { App } from '../app';
import { t, tp } from '../../i18n';

const TAU = Math.PI * 2;

export function fmtTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return t('{n}s', { n: s });
  const m = Math.ceil(s / 60);
  if (m < 60) return t('{n}m', { n: m });
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? t('{h}h {m}m', { h: hh, m: mm }) : t('{h}h', { h: hh });
}

function structIcon(type: BuildingType, lv: number, px: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(px * dpr);
  cv.style.width = cv.style.height = `${px}px`;
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  g.translate(px / 2, px * 0.9);
  drawStructure(g, type, lv, px * 0.95, 0.4);
  return cv;
}

export const REASON: Record<BuildCheck, string> = {
  ok: '',
  ring: 'Expand your planet first',
  max: 'You have the most of these',
  drones: 'All drones are busy',
  dust: 'Not enough stardust',
  gems: 'Not enough gems',
  busy: 'Already being built',
  debris: 'Clear the meteor rock first',
  occupied: 'This plot is taken',
  maxlv: 'Fully upgraded',
};

function gotText(c: Collected) {
  const parts: string[] = [];
  if (c.dust) parts.push(`✨${fmt(c.dust)}`);
  if (c.gems) parts.push(`💎${c.gems}`);
  const e: Record<string, string> = { shower: '🌠', spark: '✨', scope: '🔭' };
  for (const [k, v] of Object.entries(c.boosters)) if (v) parts.push(`${e[k]}×${v}`);
  return parts.join('  ');
}

let selected = -1;
let moving = -1;

export function showHomeworld(app: App) {
  const p = app.p;
  const home = p.home;
  const done = tickHome(p);
  if (done.length) app.save();
  selected = Math.min(selected, home.plots.length - 1);
  moving = -1;

  const canvas = h('canvas', { class: 'hw-canvas' }) as HTMLCanvasElement;
  const panel = h('div', { class: 'hw-panel' });
  const ringLbl = h('small', { class: 'muted' });
  const g = canvas.getContext('2d')!;
  let rot = -Math.PI / 2 - (selected >= 0 ? (selected * TAU) / home.plots.length : 0);
  let vel = 0;
  let drag: { x: number; rot: number; moved: boolean; t: number } | null = null;
  const floaters: { x: number; y: number; text: string; t0: number; color: string }[] = [];
  const bursts: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  let raf = 0;
  const t0 = performance.now();
  let geo = { cx: 0, cy: 0, R: 0, w: 0, h: 0 };

  const plotAngle = (i: number) => rot + (i * TAU) / home.plots.length;
  const surf = (a: number, out = 0) => ({ x: geo.cx + Math.cos(a) * (geo.R + out), y: geo.cy + Math.sin(a) * (geo.R + out) });

  const burst = (x: number, y: number, color: string) => {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      const s = 60 + Math.random() * 140;
      bursts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.8, color });
    }
  };
  const floatText = (i: number, text: string, color = '#ffe58a') => {
    const q = surf(plotAngle(i), geo.R * 0.55);
    floaters.push({ x: q.x, y: q.y, text, t0: performance.now(), color });
  };

  const doCollect = (i: number) => {
    const c = collect(p, i);
    if (!c.dust && !c.gems && !Object.keys(c.boosters).length) return false;
    const q = surf(plotAngle(i), geo.R * 0.35);
    burst(q.x, q.y, c.gems ? '#4de1ff' : c.dust ? '#ffd76a' : '#b58cff');
    floatText(i, gotText(c));
    sfx.coin();
    haptic.success();
    app.save();
    return true;
  };

  const tapPlot = (i: number) => {
    if (moving >= 0) {
      if (moveBuilding(home, moving, i)) {
        sfx.click();
        app.save();
        selected = i;
      } else if (i !== moving) toast(t('Pick an empty plot'));
      moving = -1;
      renderPanel();
      return;
    }
    if (home.debris.includes(i)) {
      const d = clearDebris(p, i);
      const q = surf(plotAngle(i), 10);
      burst(q.x, q.y, '#c9c2ff');
      floatText(i, `✨${d}`);
      sfx.coin();
      haptic.medium();
      app.save();
      selected = i;
      renderPanel();
      return;
    }
    if (ready(home, i) > 0) doCollect(i);
    selected = i;
    sfx.click();
    renderPanel();
  };

  // ---------------------------------------------------------------- canvas
  const frame = (now: number) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const hh = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const time = p.settings.reduceMotion ? 0.5 : (now - t0) / 1000;
    const R = Math.min(w, hh) * (0.2 + home.ring * 0.028);
    geo = { cx: w / 2, cy: hh * 0.55, R, w, h: hh };
    if (!drag) {
      rot += vel;
      vel *= 0.93;
      if (Math.abs(vel) < 0.0005) vel = 0;
      if (!vel && !p.settings.reduceMotion) rot += 0.0008;
    }
    g.clearRect(0, 0, w, hh);
    // stars
    for (let i = 0; i < 50; i++) {
      g.globalAlpha = 0.2 + 0.5 * Math.abs(Math.sin(time * 0.7 + i));
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(
        ((((Math.sin(i * 91.7) * 43758.5) % 1) + 1) % 1) * w,
        ((((Math.sin(i * 17.3) * 12345.6) % 1) + 1) % 1) * hh,
        1 + (i % 3) * 0.4,
        0,
        TAU,
      );
      g.fill();
    }
    g.globalAlpha = 1;
    // atmosphere + ring hint
    const atm = g.createRadialGradient(geo.cx, geo.cy, R * 0.9, geo.cx, geo.cy, R * 1.9);
    atm.addColorStop(0, 'rgba(110,200,255,0.35)');
    atm.addColorStop(1, 'rgba(110,200,255,0)');
    g.fillStyle = atm;
    g.beginPath();
    g.arc(geo.cx, geo.cy, R * 1.9, 0, TAU);
    g.fill();
    // sun by day, moon by night
    const night = nightness(new Date());
    if (night < 0.8) {
      const sx = w * 0.12;
      const sy = hh * 0.12;
      const sg = g.createRadialGradient(sx, sy, 4, sx, sy, 70);
      sg.addColorStop(0, `rgba(255,236,160,${0.8 * (1 - night)})`);
      sg.addColorStop(1, 'rgba(255,236,160,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.arc(sx, sy, 70, 0, TAU);
      g.fill();
    }
    if (night > 0.2) {
      g.globalAlpha = night;
      g.fillStyle = '#f4f0ff';
      g.beginPath();
      g.arc(w * 0.86, hh * 0.12, 16, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(40,30,90,0.9)';
      g.beginPath();
      g.arc(w * 0.86 + 7, hh * 0.12 - 4, 14, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
      if (!p.settings.reduceMotion) drawMeteors(g, w, hh, time, night);
    }
    // planet body, in the player's paint job
    const paint = currentPaint(p);
    const body = g.createRadialGradient(geo.cx - R * 0.3, geo.cy - R * 0.35, R * 0.1, geo.cx, geo.cy, R);
    body.addColorStop(0, paint.ground.colors[0]);
    body.addColorStop(0.55, paint.ground.colors[1]);
    body.addColorStop(1, paint.ground.colors[2]);
    g.fillStyle = body;
    g.beginPath();
    g.arc(geo.cx, geo.cy, R, 0, TAU);
    g.fill();
    // a few lakes that turn with the planet
    for (let i = 0; i < 4; i++) {
      const a = rot * 0.999 + i * 1.7;
      const d = R * (0.35 + (i % 2) * 0.25);
      g.fillStyle = paint.sea.colors[1];
      g.globalAlpha = 0.7;
      g.beginPath();
      g.ellipse(geo.cx + Math.cos(a) * d, geo.cy + Math.sin(a) * d, R * 0.16, R * 0.1, a, 0, TAU);
      g.fill();
    }
    // plots
    const n = home.plots.length;
    const s = Math.min(84, R * 0.7);
    const nowMs = Date.now();
    for (let i = 0; i < n; i++) {
      const a = plotAngle(i);
      const q = surf(a);
      g.save();
      g.translate(q.x, q.y);
      g.rotate(a + Math.PI / 2);
      // pad
      g.fillStyle =
        i === selected ? 'rgba(255,255,255,0.5)' : moving >= 0 && !home.plots[i] ? 'rgba(94,242,176,0.45)' : 'rgba(80,50,30,0.45)';
      g.beginPath();
      g.ellipse(0, 0, s * 0.42, s * 0.1, 0, 0, TAU);
      g.fill();
      const b = home.plots[i];
      if (home.debris.includes(i)) drawDebris(g, s, time + i);
      else if (b) drawStructure(g, b.type, b.lv, s, time + i * 0.3, !!b.done && b.done > nowMs);
      else if (i === selected) {
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.font = `700 ${Math.round(s * 0.4)}px Fredoka, ui-rounded, system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillText('+', 0, -s * 0.12);
      }
      g.restore();
      // ready bubble / timer, drawn upright just outside the building
      const lq = surf(a, s * 1.05);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (b?.done && b.done > nowMs) {
        const label = fmtTime(b.done - nowMs);
        g.font = `700 ${Math.round(s * 0.2)}px Fredoka, ui-rounded, system-ui, sans-serif`;
        const tw = g.measureText(label).width + s * 0.24;
        g.fillStyle = 'rgba(10,6,30,0.8)';
        g.beginPath();
        g.roundRect(lq.x - tw / 2, lq.y - s * 0.15, tw, s * 0.3, s * 0.15);
        g.fill();
        g.fillStyle = '#ffd76a';
        g.fillText(label, lq.x, lq.y + 1);
      } else if (b && ready(home, i) > 0) {
        const bob = Math.sin(time * 4 + i) * s * 0.04;
        g.fillStyle = isFull(home, i) ? '#ffb13d' : 'rgba(255,255,255,0.92)';
        g.beginPath();
        g.arc(lq.x, lq.y + bob, s * 0.2, 0, TAU);
        g.fill();
        g.font = `${Math.round(s * 0.22)}px system-ui, sans-serif`;
        g.fillText({ dust: '✨', gem: '💎', booster: '🌠' }[PRODUCES[b.type]!], lq.x, lq.y + bob + 1);
      }
      g.textBaseline = 'alphabetic';
    }
    // residents wander on the surface between the plots
    home.residents.forEach((r, k) => {
      if (home.expedition?.species === r.species) return;
      const base = rot + ((k + 0.5) * TAU) / Math.max(1, n) + Math.sin(time * 0.3 + k * 2) * (TAU / n) * 0.35;
      const q = surf(base);
      drawCreature(g, r.species, q.x, q.y, base + Math.PI / 2, s * 0.42, time + k, r.acc);
    });
    // the Keeper strolls in the gap before the first plot
    const ka = rot - (TAU / n) * 0.5 + Math.sin(time * 0.4) * (TAU / n) * 0.15;
    const kq = surf(ka);
    g.save();
    g.translate(kq.x, kq.y);
    g.rotate(ka + Math.PI / 2);
    drawKeeper(g, currentLook(p), 0, 0, s * 0.8, time);
    g.restore();
    // drones idle in orbit
    const idle = drones(p) - busyDrones(home, nowMs);
    for (let d = 0; d < idle; d++) {
      const a = time * 0.4 + (d * TAU) / Math.max(1, idle);
      drawDrone(g, geo.cx + Math.cos(a) * R * 1.55, geo.cy + Math.sin(a) * R * 0.5 - R * 0.9, 34, time + d);
    }
    g.globalAlpha = 1;
    // night shade over the planet
    if (night > 0) {
      g.fillStyle = `rgba(12,8,40,${night * 0.28})`;
      g.beginPath();
      g.arc(geo.cx, geo.cy, R, 0, TAU);
      g.fill();
    }
    if (!p.settings.reduceMotion) drawSeason(g, w, hh, time, seasonOf(new Date(), p.settings.hemi), night, 30);
    // bursts + floating text
    const dt = 1 / 60;
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      b.vy += 300 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) bursts.splice(i, 1);
      else {
        g.globalAlpha = b.life / 0.8;
        g.fillStyle = b.color;
        g.beginPath();
        g.arc(b.x, b.y, 3, 0, TAU);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      const k = (performance.now() - f.t0) / 1400;
      if (k >= 1) {
        floaters.splice(i, 1);
        continue;
      }
      g.globalAlpha = 1 - k;
      g.fillStyle = f.color;
      g.font = '700 20px Fredoka, ui-rounded, system-ui, sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(10,6,30,0.8)';
      g.strokeText(f.text, f.x, f.y - k * 50);
      g.fillText(f.text, f.x, f.y - k * 50);
    }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };

  // drag to spin, tap to select
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, rot, moved: false, t: performance.now() };
    vel = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    const prev = rot;
    rot = drag.rot + dx / Math.max(80, geo.R);
    vel = rot - prev;
  });
  const up = (e: PointerEvent) => {
    if (!drag) return;
    const wasTap = !drag.moved;
    drag = null;
    if (!wasTap) return;
    vel = 0;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const d = Math.hypot(x - geo.cx, y - geo.cy);
    if (d < geo.R * 0.6 || d > geo.R + 110) {
      selected = -1;
      moving = -1;
      renderPanel();
      return;
    }
    const a = Math.atan2(y - geo.cy, x - geo.cx);
    const n = home.plots.length;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < n; i++) {
      const diff = Math.abs(((a - plotAngle(i) + Math.PI * 3) % TAU) - Math.PI);
      if (diff < bd) {
        bd = diff;
        best = i;
      }
    }
    if (bd < (TAU / n) * 0.6) tapPlot(best);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => (drag = null));

  // ---------------------------------------------------------------- panel
  function renderPanel() {
    const now = Date.now();
    tickHome(p, now);
    ringLbl.textContent = ` ${t('Ring {n}', { n: home.ring })}`;
    const kids: (HTMLElement | null)[] = [];
    const i = selected;
    const b = i >= 0 ? home.plots[i] : null;
    if (moving >= 0) {
      kids.push(h('div', { class: 'hw-title' }, t('Moving {name}', { name: t(BUILDINGS[home.plots[moving]!.type].name) })));
      kids.push(h('p', { class: 'muted' }, t('Tap an empty plot to move it there.')));
      kids.push(btn(t('Cancel'), 'ghost wide', () => ((moving = -1), renderPanel())));
    } else if (i < 0) {
      // overview
      const busy = busyDrones(home, now);
      kids.push(
        h(
          'div',
          { class: 'hw-stats' },
          h('span', null, `🛸 ${drones(p) - busy}/${drones(p)}`, h('small', null, t('drones free'))),
          h('span', null, `🏡 ${home.residents.length}/${denCapacity(home)}`, h('small', null, t('residents'))),
          h('span', null, `💖 ${charm(home)}`, h('small', null, t('charm'))),
        ),
      );
      kids.push(h('p', { class: 'muted hw-hint' }, t('Drag to spin your planet. Tap a plot to build.')));
      kids.push(
        h(
          'div',
          { class: 'row' },
          btn(t('Collect all'), `primary${anyReady(home, now) ? '' : ' dim'}`, () => {
            const c = collectAll(p, now);
            if (!c.dust && !c.gems && !Object.keys(c.boosters).length) return toast(t('Nothing to collect yet'));
            burst(geo.cx, geo.cy - geo.R, '#ffd76a');
            sfx.coin();
            haptic.success();
            toast(gotText(c), 'good');
            app.save();
            renderPanel();
          }),
          btn(t('Residents'), 'ghost', () => residentsSheet(app, renderPanel)),
        ),
      );
      kids.push(
        h(
          'div',
          { class: 'row' },
          btn(expeditionLabel(), expeditionBack(home, now) ? 'gem' : 'ghost', () => expeditionSheet(app, renderPanel)),
          btn(home.ring >= MAX_RING ? t('Max size') : t('Expand'), 'ghost', () => expandSheet(app, () => showHomeworld(app))),
        ),
      );
      kids.push(
        h(
          'div',
          { class: 'row' },
          btn(t('🎨 Paint'), 'ghost', () => paintSheet(app)),
          btn(t('📷 Photo'), 'ghost', () => photoMode(app, canvas)),
        ),
      );
    } else if (home.debris.includes(i)) {
      kids.push(h('div', { class: 'hw-title' }, t('Meteor rock')));
      kids.push(h('p', { class: 'muted' }, t('Tap it to clear it away (+{n} stardust).', { n: DEBRIS_DUST })));
    } else if (!b) {
      kids.push(h('div', { class: 'hw-title' }, t('Empty plot')));
      kids.push(
        h(
          'div',
          { class: 'hw-build' },
          ...BUILDING_TYPES.map((type) => {
            const d = BUILDINGS[type];
            const check = canBuild(p, i, type, now);
            const locked = check === 'ring' || check === 'max';
            return h(
              'button',
              {
                class: `hw-opt${check === 'ok' ? '' : ' no'}${locked ? ' locked' : ''}`,
                onclick: () => {
                  const r = build(p, i, type);
                  if (r !== 'ok') {
                    if (r === 'gems') return app.needGems();
                    return toast(t(REASON[r]));
                  }
                  sfx.chest();
                  haptic.success();
                  app.save();
                  const q = surf(plotAngle(i), 20);
                  burst(q.x, q.y, '#ffffff');
                  renderPanel();
                },
              },
              structIcon(type, 1, 54),
              h('b', null, t(d.name)),
              h(
                'small',
                null,
                locked
                  ? check === 'ring'
                    ? t('Ring {n}', { n: d.ring })
                    : t('Max')
                  : d.gems
                    ? `💎${d.gems}`
                    : `✨${fmt(buildCost(type, 1))}`,
              ),
            );
          }),
        ),
      );
    } else {
      const d = BUILDINGS[b.type];
      const building = !!b.done && b.done > now;
      kids.push(
        h(
          'div',
          { class: 'hw-head' },
          structIcon(b.type, b.lv, 56),
          h(
            'div',
            null,
            h('div', { class: 'hw-title' }, t(d.name), d.decor ? null : h('small', { class: 'muted' }, ` ${t('Lv {n}', { n: b.lv })}`)),
            h('p', { class: 'muted' }, t(d.desc)),
          ),
        ),
      );
      if (building) kids.push(h('div', { class: 'hw-timer' }, t('🛸 Building… {time} left', { time: fmtTime(b.done! - now) })));
      else if (PRODUCES[b.type]) {
        const kind = PRODUCES[b.type]!;
        const perH = rateOf(b);
        const every = fmtTime(3600e3 / perH);
        kids.push(
          h(
            'div',
            { class: 'hw-prod' },
            h(
              'span',
              null,
              kind === 'dust'
                ? t('{n} stardust / hour', { n: perH })
                : kind === 'gem'
                  ? t('1 gem every {time}', { time: every })
                  : t('1 booster every {time}', { time: every }),
            ),
            h('span', null, t('Holds {h}h', { h: capHours(home) })),
          ),
        );
      } else if (b.type === 'den') kids.push(h('div', { class: 'hw-prod' }, t('Room for {n} residents', { n: b.lv + 1 })));
      else if (b.type === 'tower')
        kids.push(
          h(
            'div',
            { class: 'hw-prod' },
            t('Expeditions: {list}', {
              list: expeditionOptions(home)
                .map((x) => `${x}h`)
                .join(' · '),
            }),
          ),
        );
      else if (b.type === 'observatory') kids.push(h('div', { class: 'hw-prod' }, t('Producers hold +{n}h', { n: b.lv * 2 })));
      else kids.push(h('div', { class: 'hw-prod' }, t('+{n} charm', { n: d.charm ?? 0 })));
      const row: HTMLElement[] = [];
      if (ready(home, i, now) > 0)
        row.push(
          btn(t('Collect'), 'primary', () => {
            doCollect(i);
            renderPanel();
          }),
        );
      if (!d.decor) {
        const c = canUpgrade(p, i, now);
        if (c !== 'maxlv' && !building) {
          row.push(
            btn(
              h(
                'span',
                { class: 'stack' },
                h('b', null, t('Upgrade')),
                h('small', null, `✨${fmt(buildCost(b.type, b.lv + 1))} · ${fmtTime(BUILD_TIME[b.lv + 1])}`),
              ),
              c === 'ok' ? 'gem' : 'ghost dim',
              () => {
                const r = upgradeAt(i);
                if (r !== 'ok') toast(t(REASON[r]));
              },
            ),
          );
        } else if (b.lv >= MAX_LEVEL) row.push(h('div', { class: 'ws-state' }, t('✓ Max level')));
      }
      if (b.type === 'den') row.push(btn(t('Residents'), 'ghost', () => residentsSheet(app, renderPanel)));
      if (b.type === 'tower' && !building) row.push(btn(expeditionLabel(), 'ghost', () => expeditionSheet(app, renderPanel)));
      row.push(btn(t('Move'), 'ghost', () => ((moving = i), renderPanel())));
      kids.push(h('div', { class: 'row hw-actions' }, ...row));
    }
    panel.replaceChildren(...kids.filter((x): x is HTMLElement => !!x));
  }

  function upgradeAt(i: number) {
    const res = upgrade(p, i);
    if (res === 'ok') {
      sfx.chest();
      haptic.success();
      app.save();
      renderPanel();
    }
    return res;
  }

  function expeditionLabel() {
    const e = home.expedition;
    if (!e) return t('Expedition');
    if (expeditionBack(home)) return t('🎒 Back home!');
    return t('🚀 {time}', { time: fmtTime(e.ends - Date.now()) });
  }

  renderPanel();
  const tick = setInterval(renderPanel, 1000);
  raf = requestAnimationFrame(frame);

  app.mount(
    h(
      'div',
      { class: 'screen page homeworld' },
      app.topBar(true),
      h('div', { class: 'page-title' }, t('Homeworld'), ringLbl),
      canvas,
      panel,
    ),
    'homeworld',
    () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
    },
  );
  if (!home.intro) {
    home.intro = true;
    app.save();
    modal([
      h('div', { class: 'm-title' }, t('Welcome to your Homeworld!')),
      h(
        'div',
        { class: 'howto' },
        h('p', null, t('🏗️ Build a Stardust Mill and a Critter Den on your empty plots.')),
        h('p', null, t('🛸 Drones build while you play. Every planet you finish speeds them up.')),
        h('p', null, t('🦦 Invite creatures from your Lifebook to live here — they will ask you for small favours.')),
        h('p', null, t('🌍 Finish chapters to grow your planet and unlock new buildings.')),
      ),
    ]);
  }
}

// ---------------------------------------------------------------- sheets
function residentsSheet(app: App, after: () => void) {
  const p = app.p;
  const home = p.home;
  const cap = denCapacity(home);
  const now = Date.now();
  const rows = home.residents.map((r) => {
    const sp = SPECIES_BY_ID[r.species];
    const lv = friendLevel(r.fp);
    const away = home.expedition?.species === r.species;
    const req = away ? null : requestOf(r, now, home.ring);
    const next = FRIEND_LEVELS[lv] ?? null;
    let reqEl: HTMLElement;
    if (away) reqEl = h('small', { class: 'muted' }, t('On an expedition'));
    else if (!req) reqEl = h('small', { class: 'muted' }, t('Happy! Check back later.'));
    else {
      const label =
        req.kind === 'treat'
          ? t('Wants a treat · ✨{n}', { n: req.dust ?? 0 })
          : req.kind === 'pat'
            ? t('Wants a pat on the head')
            : t('Wants a {name} nearby', { name: t(BUILDINGS[req.decor!].name) });
      reqEl = btn(label, 'primary small', () => {
        const res = fulfil(p, r.species);
        if (res.result === 'dust') return toast(t('Not enough stardust'));
        if (res.result === 'decor') return toast(t('Build a {name} first', { name: t(BUILDINGS[req.decor!].name) }));
        if (res.result !== 'ok') return;
        sfx.coin();
        haptic.success();
        if (res.levelUp)
          toast(
            res.levelUp >= FRIEND_LEVELS.length
              ? t('{name} is your best friend! +💎{g} and a memento', { name: t(sp.name), g: res.gems ?? 0 })
              : t('Friendship level {n} with {name}! +💎{g}', { n: res.levelUp, name: t(sp.name), g: res.gems ?? 0 }),
            'good',
          );
        else toast(t('{name} is delighted 💖', { name: t(sp.name) }), 'good');
        app.save();
        m.close();
        residentsSheet(app, after);
        after();
      });
    }
    return h(
      'div',
      { class: 'hw-res' },
      critterCanvas(r.species, 52, 0.4, r.acc),
      h(
        'div',
        { class: 'grow' },
        h(
          'button',
          { class: 'nick', onclick: () => (m.close(), nickSheet(app, r.species, () => residentsSheet(app, after))) },
          r.nick ? h('b', null, r.nick) : null,
          h('small', null, r.nick ? ` · ${t(sp.name)}` : t(sp.name)),
          ' ✏️',
          h(
            'span',
            {
              class: 'dress',
              onclick: (e: Event) => (e.stopPropagation(), m.close(), accSheet(app, r.species, () => residentsSheet(app, after))),
            },
            ' 👒',
          ),
          isBestFriend(r) ? h('span', { class: 'ribbon' }, t('🎀 Best friends')) : null,
        ),
        h(
          'div',
          { class: 'hearts' },
          '💖'.repeat(lv) + '🤍'.repeat(FRIEND_LEVELS.length - lv),
          next !== null ? h('small', { class: 'muted' }, ` ${r.fp}/${next}`) : null,
        ),
        reqEl,
      ),
      away
        ? null
        : h(
            'button',
            {
              class: 'hw-x',
              'aria-label': t('Say goodbye'),
              onclick: () => {
                sendHome(p, r.species);
                app.save();
                m.close();
                residentsSheet(app, after);
                after();
              },
            },
            '×',
          ),
    );
  });
  const free = cap - home.residents.length;
  const cands = candidates(p);
  const invites =
    free > 0 && cands.length
      ? h(
          'div',
          { class: 'hw-invite' },
          ...cands.map((s) =>
            h(
              'button',
              {
                class: 'lb',
                onclick: () => {
                  if (!invite(p, s.id)) return;
                  sfx.chest();
                  haptic.success();
                  toast(t('{name} moved in!', { name: t(s.name) }), 'good');
                  app.save();
                  m.close();
                  residentsSheet(app, after);
                  after();
                },
              },
              critterCanvas(s.id, 44),
              h('small', null, t(s.name)),
            ),
          ),
        )
      : null;
  const m = modal([
    h('div', { class: 'm-title' }, t('Residents'), h('small', { class: 'muted' }, ` ${home.residents.length}/${cap}`)),
    ...rows,
    cap === 0 ? h('p', { class: 'muted' }, t('Build a Critter Den so creatures can move in.')) : null,
    free > 0 && cands.length
      ? h('div', { class: 'sec-title' }, tp(free, 'Invite a creature ({n} room left)', 'Invite a creature ({n} rooms left)'))
      : null,
    invites,
    free > 0 && !cands.length && cap > 0 ? h('p', { class: 'muted' }, t('Discover more creatures in your levels to invite them.')) : null,
  ]);
}

function expeditionSheet(app: App, after: () => void) {
  const p = app.p;
  const home = p.home;
  const e = home.expedition;
  if (e && expeditionBack(home)) {
    const got = finishExpedition(p)!;
    app.save();
    sfx.chest();
    haptic.success();
    const sp = SPECIES_BY_ID[got.species];
    const planet = got.planet >= 0 ? p.galaxy[got.planet] : null;
    const card = expeditionCard(got.species, planet?.name ?? t('deep space'), planet?.colors ?? [], passportName(p));
    card.classList.add('hw-card');
    const m = modal([
      h('div', { class: 'm-title' }, t('{name} is back!', { name: t(sp.name) })),
      card,
      h('div', { class: 'reward-list' }, h('span', null, gotText({ dust: got.dust, gems: got.gems, boosters: got.boosters }))),
      h(
        'div',
        { class: 'row' },
        btn(t('📮 Share postcard'), 'ghost', () =>
          shareCanvas(
            expeditionCard(got.species, planet?.name ?? t('deep space'), planet?.colors ?? [], passportName(p), 1080),
            t('{name} sent a postcard from {planet} 🪐 #PocketPlanet', { name: t(sp.name), planet: planet?.name ?? t('deep space') }),
            'expedition-postcard',
          ),
        ),
        btn(t('Nice!'), 'primary', () => m.close()),
      ),
    ]);
    after();
    return;
  }
  if (e) {
    const sp = SPECIES_BY_ID[e.species];
    modal([
      h('div', { class: 'm-title' }, t('Expedition')),
      critterCanvas(e.species, 90),
      h('p', null, t('{name} is exploring your galaxy. Back in {time}.', { name: t(sp.name), time: fmtTime(e.ends - Date.now()) })),
    ]);
    return;
  }
  const opts = expeditionOptions(home);
  if (!opts.length) {
    modal([
      h('div', { class: 'm-title' }, t('Expedition')),
      h('p', { class: 'muted' }, t('Build a Launch Tower (Ring 2) to send residents on expeditions.')),
    ]);
    return;
  }
  if (!home.residents.length) {
    modal([
      h('div', { class: 'm-title' }, t('Expedition')),
      h('p', { class: 'muted' }, t('Invite a resident first — they love to explore.')),
    ]);
    return;
  }
  let who = home.residents[0].species;
  const pick = h(
    'div',
    { class: 'hw-invite' },
    ...home.residents.map((r) => {
      const el = h(
        'button',
        {
          class: `lb${r.species === who ? ' on' : ''}`,
          onclick: () => {
            who = r.species;
            pick.querySelectorAll('.lb').forEach((x) => x.classList.remove('on'));
            el.classList.add('on');
          },
        },
        critterCanvas(r.species, 44),
        h('small', null, t(SPECIES_BY_ID[r.species].name)),
      );
      return el;
    }),
  );
  const m = modal([
    h('div', { class: 'm-title' }, t('Send on an expedition')),
    h('p', { class: 'muted' }, t('Who goes? They come back with stardust, gifts and a postcard.')),
    pick,
    ...opts.map((hours) => {
      const loot = expeditionLoot(hours, towerLevel(home), who);
      return btn(
        h('span', { class: 'stack' }, h('b', null, t('{h} hours', { h: hours })), h('small', null, gotText(loot))),
        'ghost wide',
        () => {
          if (!startExpedition(p, who, hours)) return;
          sfx.launch();
          haptic.medium();
          app.save();
          m.close();
          after();
        },
      );
    }),
  ]);
}

/** A postcard from the expedition: the resident in front of a galaxy planet. */
function expeditionCard(species: string, planetName: string, colors: string[], from: string, W = 300): HTMLCanvasElement {
  const H = Math.round(W * 1.25);
  const c = document.createElement('canvas');
  const dpr = W < 600 ? Math.min(2, window.devicePixelRatio || 1) : 1;
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = `${W}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2a1a6e');
  bg.addColorStop(1, '#0b0a24');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + ((i * 37) % 10) / 15})`;
    g.beginPath();
    g.arc(((i * 97) % 100) * W * 0.01, ((i * 53) % 100) * H * 0.01, W * 0.004, 0, TAU);
    g.fill();
  }
  const pr = W * 0.34;
  const pg = g.createRadialGradient(W * 0.62 - pr * 0.3, H * 0.4 - pr * 0.3, pr * 0.1, W * 0.62, H * 0.4, pr);
  pg.addColorStop(0, colors[0] ?? '#6ee29a');
  pg.addColorStop(0.6, colors[1] ?? '#2a7fd0');
  pg.addColorStop(1, colors[2] ?? '#1a3a6e');
  g.fillStyle = pg;
  g.beginPath();
  g.arc(W * 0.62, H * 0.4, pr, 0, TAU);
  g.fill();
  drawCreature(g, species, W * 0.3, H * 0.78, 0, W * 0.34, 0.4);
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = W * 0.012;
  g.strokeRect(W * 0.03, W * 0.03, W - W * 0.06, H - W * 0.06);
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.font = `700 ${Math.round(W * 0.075)}px Fredoka, ui-rounded, system-ui, sans-serif`;
  g.fillText(t('Greetings from {planet}!', { planet: planetName }), W / 2, H * 0.1, W * 0.9);
  g.fillStyle = '#c9c2ff';
  g.font = `500 ${Math.round(W * 0.05)}px Fredoka, ui-rounded, system-ui, sans-serif`;
  g.fillText(t('to {name} · Pocket Planet', { name: from }), W / 2, H * 0.95, W * 0.9);
  return c;
}

function expandSheet(app: App, after: () => void) {
  const p = app.p;
  const home = p.home;
  if (home.ring >= MAX_RING) {
    modal([h('div', { class: 'm-title' }, t('Expand')), h('p', null, t('Your Homeworld is fully grown. 🌍'))]);
    return;
  }
  const r = home.ring + 1;
  const check = canExpand(p);
  const unlocks = BUILDING_TYPES.filter((x) => BUILDINGS[x].ring === r).map((x) => t(BUILDINGS[x].name));
  const m = modal([
    h('div', { class: 'm-title' }, t('Grow to Ring {n}', { n: r })),
    h(
      'div',
      { class: 'howto' },
      h('p', null, t('🌍 {n} plots (now {m})', { n: RING_PLOTS[r], m: RING_PLOTS[home.ring] })),
      h('p', null, t('⬆️ Buildings can reach level {n}', { n: r })),
      unlocks.length ? h('p', null, t('🏗️ New: {list}', { list: unlocks.join(', ') })) : null,
      h('p', { class: check === 'chapter' ? 'bad' : '' }, t('📜 Needs chapter {n} finished', { n: RING_CHAPTER[r] })),
    ),
    btn(`✨${fmt(RING_COST[r])}`, check === 'ok' ? 'primary wide' : 'ghost wide dim', () => {
      const res = expand(p);
      if (res === 'chapter') return toast(t('Finish chapter {n} first', { n: RING_CHAPTER[r] }));
      if (res === 'dust') return toast(t('Not enough stardust'));
      if (res !== 'ok') return;
      sfx.levelUp();
      haptic.success();
      toast(t('Your Homeworld grew to Ring {n}!', { n: r }), 'good');
      app.save();
      m.close();
      after();
    }),
  ]);
}

// ---------------------------------------------------------------- paint
function paintSheet(app: App) {
  const p = app.p;
  const cur = currentPaint(p);
  const row = (channel: 'ground' | 'sea') =>
    h(
      'div',
      { class: 'paint-row' },
      ...PAINTS.filter((x) => x.channel === channel).map((x) => {
        const owned = ownsPaint(p, x.id);
        const on = cur[channel].id === x.id;
        return h(
          'button',
          {
            class: `paint${on ? ' on' : ''}${owned ? '' : ' locked'}`,
            onclick: () => {
              const r = applyPaint(p, x.id);
              if (r === 'gems') return app.needGems();
              if (r === 'pass') return (m.close(), app.showPass());
              sfx.click();
              haptic.light();
              app.save();
              m.close();
              paintSheet(app);
            },
          },
          h('i', { style: `background:radial-gradient(circle at 35% 30%,${x.colors[0]},${x.colors[1]} 55%,${x.colors[2]})` }),
          h('small', null, t(x.name)),
          h('b', null, owned ? (on ? '✓' : '') : x.pass ? '🌌' : `💎${x.gems}`),
        );
      }),
    );
  const m = modal([
    h('div', { class: 'm-title' }, t('Paint your Homeworld')),
    h('div', { class: 'sec-title' }, t('Ground')),
    row('ground'),
    h('div', { class: 'sec-title' }, t('Water')),
    row('sea'),
    h('p', { class: 'muted tiny' }, t('Paints are yours forever once unlocked.')),
  ]);
}

// ---------------------------------------------------------------- photo mode
type Frame = 'clean' | 'polaroid' | 'stars' | 'season' | 'gold';
export const FRAMES: { id: Frame; name: string; pass?: boolean }[] = [
  { id: 'polaroid', name: 'Instant' },
  { id: 'clean', name: 'Clean' },
  { id: 'stars', name: 'Starry' },
  { id: 'season', name: 'Seasonal' },
  { id: 'gold', name: 'Golden', pass: true },
];

function renderPhoto(app: App, src: HTMLCanvasElement, frame: Frame): HTMLCanvasElement {
  const p = app.p;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#231c5e');
  bg.addColorStop(1, '#0b0a24');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // the live scene, cropped to a square around the planet
  const pad = frame === 'polaroid' ? 70 : 60;
  const size = W - pad * 2;
  const sw = src.width;
  const sh = src.height;
  const side = Math.min(sw, sh);
  g.drawImage(src, (sw - side) / 2, sh * 0.55 - side / 2, side, side, pad, pad + 40, size, size);
  const font = (w: number, px: number) => `${w} ${px}px Fredoka, ui-rounded, system-ui, sans-serif`;
  const season = seasonOf(new Date(), p.settings.hemi);
  if (frame === 'polaroid') {
    g.fillStyle = '#fbf7ee';
    g.fillRect(0, 0, W, pad + 40);
    g.fillRect(0, 0, pad, H);
    g.fillRect(W - pad, 0, pad, H);
    g.fillRect(0, pad + 40 + size, W, H);
  } else {
    g.strokeStyle = frame === 'gold' ? '#ffd24a' : 'rgba(255,255,255,0.8)';
    g.lineWidth = frame === 'gold' ? 18 : 8;
    g.strokeRect(pad, pad + 40, size, size);
  }
  if (frame === 'stars' || frame === 'gold') {
    const col = frame === 'gold' ? '#ffd24a' : '#fff6b0';
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      const x = W / 2 + Math.cos(a) * W * 0.5;
      const y = pad + 40 + size / 2 + Math.sin(a) * size * 0.56;
      g.fillStyle = col;
      g.font = font(700, 30 + (i % 3) * 10);
      g.textAlign = 'center';
      g.fillText('★', Math.max(30, Math.min(W - 30, x)), Math.max(60, Math.min(H - 30, y)));
    }
  }
  if (frame === 'season') drawSeason(g, W, H, 3.3, season, 0.8, 90);
  const ink = frame === 'polaroid' ? '#2a2440' : '#ffffff';
  g.textAlign = 'center';
  g.fillStyle = ink;
  g.font = font(700, 58);
  g.fillText(t("{name}'s Homeworld", { name: passportName(p) }), W / 2, pad + 40 + size + 95);
  g.font = font(500, 36);
  g.fillStyle = frame === 'polaroid' ? '#6a6480' : '#c9c2ff';
  g.fillText(
    `${SEASON_EMOJI[season]} ${t(SEASON_NAMES[season])} · ${t('Ring {n}', { n: p.home.ring })} · ${new Date().toLocaleDateString()}`,
    W / 2,
    pad + 40 + size + 150,
  );
  g.font = font(700, 34);
  g.fillStyle = frame === 'polaroid' ? '#3fae6a' : '#5ef2b0';
  g.fillText('Pocket Planet', W / 2, H - 40);
  return c;
}

function photoMode(app: App, src: HTMLCanvasElement) {
  const p = app.p;
  let frame: Frame = 'polaroid';
  sfx.whoosh();
  const preview = h('div', { class: 'photo-prev' });
  const paint = () => {
    const img = renderPhoto(app, src, frame);
    img.style.width = '100%';
    img.style.height = 'auto';
    preview.replaceChildren(img);
  };
  paint();
  const frames = h(
    'div',
    { class: 'photo-frames' },
    ...FRAMES.map((f) => {
      const el = h(
        'button',
        {
          class: `tab${f.id === frame ? ' on' : ''}`,
          onclick: () => {
            if (f.pass && !p.pass) return (m.close(), app.showPass());
            frame = f.id;
            frames.querySelectorAll('.tab').forEach((x) => x.classList.remove('on'));
            el.classList.add('on');
            sfx.click();
            paint();
          },
        },
        `${f.pass && !p.pass ? '🔒 ' : ''}${t(f.name)}`,
      );
      return el;
    }),
  );
  const m = modal([
    h('div', { class: 'm-title' }, t('Photo mode')),
    preview,
    frames,
    btn(t('📤 Share photo'), 'primary wide', () =>
      shareCanvas(renderPhoto(app, src, frame), t('My Homeworld in Pocket Planet 🪐'), 'homeworld-photo'),
    ),
  ]);
}

function nickSheet(app: App, species: string, back: () => void) {
  const p = app.p;
  const r = p.home.residents.find((x) => x.species === species);
  if (!r) return;
  const pick = (nick: string | undefined) => {
    setNick(p, species, nick);
    sfx.click();
    haptic.light();
    app.save();
    m.close();
    back();
  };
  const m = modal([
    h('div', { class: 'm-title' }, t('Name your {name}', { name: t(SPECIES_BY_ID[species].name) })),
    h('div', { class: 'pe-av' }, critterCanvas(species, 80)),
    h('div', { class: 'nick-grid' }, ...NICKNAMES.map((n) => btn(n, `ghost small${r.nick === n ? ' on' : ''}`, () => pick(n)))),
    r.nick ? btn(t('No nickname'), 'ghost wide', () => pick(undefined)) : null,
  ]);
}

function accSheet(app: App, species: string, back: () => void) {
  const p = app.p;
  const r = p.home.residents.find((x) => x.species === species);
  if (!r) return;
  const pick = (id: string | undefined) => {
    const res = wearAcc(p, species, id);
    if (res === 'gems') return app.needGems();
    if (res === 'locked') return toast(t('Become better friends to unlock it'));
    sfx.click();
    haptic.light();
    app.save();
    m.close();
    back();
  };
  const m = modal([
    h('div', { class: 'm-title' }, t('Dress up {name}', { name: r.nick ?? t(SPECIES_BY_ID[species].name) })),
    h('div', { class: 'pe-av' }, critterCanvas(species, 96, 0.4, r.acc)),
    h(
      'div',
      { class: 'acc-grid' },
      ...RESIDENT_ACCS.map((a) => {
        const ok = accAvailable(p, r, a.id);
        return h(
          'button',
          { class: `acc${r.acc === a.id ? ' on' : ''}${ok ? '' : ' locked'}`, onclick: () => pick(a.id) },
          critterCanvas(species, 54, 0.4, a.id),
          h('small', null, t(a.name)),
          h('b', null, ok ? '' : a.friend ? `💖${a.friend}` : `💎${a.gems}`),
        );
      }),
    ),
    r.acc ? btn(t('Take it off'), 'ghost wide', () => pick(undefined)) : null,
  ]);
}
