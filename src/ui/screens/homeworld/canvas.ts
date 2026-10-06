import { h, btn, modal, toast } from '../../dom';
import { sfx, setMusicTheme } from '../../audio';
import { haptic } from '../../haptics';
import { effectiveReduceMotion } from '../../motion';
import { busyDrones, collect, drones, isFull, moveBuilding, ready, tickHome, currentPaint, resolvedGaps } from '../../../meta/homeworld';
import { previewLook } from '../../../meta/cosmetics';
import { drawFriendOutfit, homeworldStyleColors, structureStyleId } from '../../art/styleRender';
import { critterCanvas, drawCreature } from '../../art/critters';
import { drawKeeper } from '../../art/keeper';
import { drawDrone, drawStructure } from '../../art/structures';
import { drawHomeworldLand } from '../../art/planet';
import { drawDenFlowers, drawFloatingIsle, drawIsleDecoration, drawLandmark } from '../../art/landmarks';
import { LANDMARKS } from '../../../meta/tuning';
import { landmarkState } from '../../../meta/landmarks';
import { celebrate } from '../../celebrate';
import { homeSpotFor, routineFor, friendPairs } from '../../../meta/friends';
import { weatherOn } from '../../../meta/weather';
import { ensureFestival, festivalActive } from '../../../meta/festivals';
import { CONSTELLATION_BY_ID } from '../../../meta/constellations';
import { drawConstellation } from '.././sky';
import { nightness, seasonOf, SEASON_DRESSING } from '../../../meta/seasons';
import { drawFriendActivity, drawMeteors, drawSeason, drawHomeworldWeather, drawSeasonRim, drawSeasonTrim } from '../../art/seasons';
import { t } from '../../../i18n';
import { canvasDpr } from '../../devcapture';
import { labLevel, formState } from '../../../meta/labs';
import { LAB_TEXT } from '../../../meta/labcopy';
import { createPanel } from './panel';
import { essenceSheet, firstHourSheet, levelSheet, gotText, landSheet, landmarkSheet, isleDecorationSheet, residentsSheet } from './sheets';
import type { App } from '../../app';

const TAU = Math.PI * 2;

/** Where relit constellations sit in the Homeworld sky (fractions of the canvas). */
const SKY_SLOTS: [number, number][] = [
  [0.7, 0.02],
  [0.02, 0.82],
  [0.66, 0.82],
  [0.36, 0.0],
  [0.36, 0.86],
  [0.02, 0.3],
  [0.02, 0.54],
];

const ISLE_SPOTS: readonly [number, number][] = [
  [-11, 1],
  [0, -2],
  [11, 1],
];
const ISLE_TARGET = 22; // A 44 pt target is resolved by the nearest anchor inside the Isle.

// Selection survives a Homeworld remount, as it did in the original screen.
let selected = -1;
let moving = -1;

/** Residents without an accessory join in this month's festival. */
function festCostume(p: App['p']) {
  return festivalActive(p) ? ensureFestival(p).acc : '';
}

export function showHomeworld(app: App) {
  const p = app.p;
  const home = p.home;
  const done = tickHome(p);
  if (done.length) app.save();
  selected = Math.min(selected, home.plots.length - 1);
  moving = -1;

  const canvas = h('canvas', { class: 'hw-canvas' }) as HTMLCanvasElement;
  const panel = h('div', { class: 'hw-panel' });
  const levelBadge = btn('', 'hw-level-badge', () => levelSheet(app, () => showHomeworld(app)));
  const pouchHeader = btn('', 'ghost hw-pouch-head', () => essenceSheet(app));
  pouchHeader.setAttribute('aria-label', t(LAB_TEXT.pouch));
  const plotButtons = home.plots.map((_, i) => btn('', 'hw-plot-access', () => tapPlot(i)));
  const g = canvas.getContext('2d')!;
  let rot = -Math.PI / 2 - (selected >= 0 ? (selected * TAU) / home.plots.length : 0);
  let vel = 0;
  let drag: { x: number; rot: number; moved: boolean; t: number } | null = null;
  const floaters: { x: number; y: number; text: string; t0: number; color: string }[] = [];
  const bursts: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  let raf = 0;
  let stopped = false;
  const calm = effectiveReduceMotion(p);
  const calmTimers: number[] = [];
  let waving = -1;
  let waveUntil = 0;
  const t0 = performance.now();
  let geo = { cx: 0, cy: 0, R: 0, w: 0, h: 0 };
  let skyCache: HTMLCanvasElement | null = null;
  let planetCache: HTMLCanvasElement | null = null;
  let planetCacheKey = '';
  const stillFriends = new Map<string, HTMLCanvasElement>();
  let sceneMinute = -1;
  let sceneWeather = weatherOn(new Date(), p.settings.hemi);
  let gaps = resolvedGaps(p);
  let scenePairs = friendPairs(home.residents, new Date(), gaps, home);
  const friendScenes: {
    angle: number;
    routine: ReturnType<typeof routineFor>;
    pair: (typeof scenePairs)[number] | undefined;
    key: string;
    offset: number;
  }[] = [];
  const favouriteIndex = (kind: string) => home.plots.findIndex((b) => b?.type === kind);
  const denIndex = (residentIndex: number) => {
    let place = residentIndex;
    for (let i = 0; i < home.plots.length; i++) {
      const b = home.plots[i];
      if (b?.type !== 'den') continue;
      if (place < b.lv + 1) return i;
      place -= b.lv + 1;
    }
    return home.plots.findIndex((b) => b?.type === 'den');
  };
  const betweenAngles = (from: number, to: number, progress: number) => from + (((to - from + Math.PI * 3) % TAU) - Math.PI) * progress;
  const scenePosition = (index: number, time: number) => {
    const scene = friendScenes[index];
    const n = home.plots.length;
    const wandering = scene.routine.awake && !calm ? ((Math.sin(time * 0.35 + index * 2) * TAU) / n) * 0.035 : 0;
    return scene.angle + scene.offset + wandering;
  };
  const refreshFriends = (date: Date) => {
    const n = home.plots.length;
    const counts = new Map<string, number>();
    friendScenes.length = 0;
    for (let index = 0; index < home.residents.length; index++) {
      const resident = home.residents[index];
      let routine = routineFor(resident, date, sceneWeather, seasonOf(date, p.settings.hemi));
      const pair = scenePairs.find((item) => item.a === resident.species || item.b === resident.species);
      const spot = homeSpotFor(resident, home, gaps);
      let siteIndex = spot.kind === 'sea' ? -1 : spot.index;
      let key = siteIndex < 0 ? `loose:${index}` : `${spot.kind}:${siteIndex}`;
      let angle = spot.kind === 'sea' ? -Math.PI / 2 : ((siteIndex + (spot.kind === 'gap' ? 0.5 : 0)) * TAU) / n;
      if (routine.block === 'day' && date.getHours() === 12 && home.landmarks.sprout_garden.stage === 4) {
        siteIndex = denIndex(index);
        key = siteIndex < 0 ? `loose:${index}` : `picnic:${siteIndex}`;
        angle = ((siteIndex < 0 ? index : siteIndex) * TAU) / n;
        routine = { ...routine, activity: 'flower_picnic' };
      } else if (!routine.awake || routine.block === 'dawn') {
        siteIndex = denIndex(index);
        key = siteIndex < 0 ? `loose:${index}` : `den:${siteIndex}`;
        const denAngle = ((siteIndex < 0 ? index : siteIndex) * TAU) / n;
        const dawnProgress = ((date.getHours() - 4) * 60 + date.getMinutes()) / 180;
        angle = routine.activity === 'head_home' ? betweenAngles(angle, denAngle, dawnProgress) : denAngle;
      } else if (routine.block === 'evening') {
        const decoration = routine.favourite === 'landmark' ? -1 : favouriteIndex(routine.favourite);
        if (decoration >= 0) {
          key = `decor:${decoration}`;
          angle = (decoration * TAU) / n;
        } else if (routine.favourite === 'landmark') {
          const landmark = LANDMARKS.findIndex((site) => landmarkState(p, site.id).stage === 4);
          if (landmark >= 0) {
            key = `landmark:${landmark}`;
            angle = ((landmark + 0.5) * TAU) / 5;
          }
        }
      } else if (routine.block === 'morning') {
        const den = denIndex(index);
        if (den >= 0) {
          const morningProgress = ((date.getHours() - 7) * 60 + date.getMinutes()) / 180;
          angle = betweenAngles((den * TAU) / n, angle, morningProgress);
        }
      }
      if (pair && spot.kind === 'gap' && routine.block === 'day' && routine.activity !== 'flower_picnic') {
        const other = home.residents.find((item) => item.species === (pair.a === resident.species ? pair.b : pair.a));
        const partner = other && homeSpotFor(other, home, gaps);
        if (partner?.kind === 'gap') {
          const start = ((spot.index + 0.5) * TAU) / n;
          const end = ((partner.index + 0.5) * TAU) / n;
          const delta = ((end - start + Math.PI * 3) % TAU) - Math.PI;
          angle = start + delta / 2; // Circular midpoint also handles gap 0 beside gap n-1.
          key = `pair:${[pair.a, pair.b].sort().join(':')}`;
        }
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
      friendScenes.push({ angle, routine, pair, key, offset: 0 });
    }
    const ordinals = new Map<string, number>();
    for (const scene of friendScenes) {
      const order = ordinals.get(scene.key) ?? 0;
      ordinals.set(scene.key, order + 1);
      const count = counts.get(scene.key) ?? 1;
      scene.offset = (order - (count - 1) / 2) * Math.min(TAU / Math.max(count, 1), (TAU / n) * 0.85);
    }
  };
  const sceneNow = () => {
    const date = new Date();
    const minute = Math.floor(date.getTime() / 60000);
    if (minute !== sceneMinute || friendScenes.length !== home.residents.length) {
      sceneMinute = minute;
      sceneWeather = weatherOn(date, p.settings.hemi);
      // Exposed for journeys and tooling; updated once a minute with the scene, never per frame.
      canvas.dataset.weather = sceneWeather;
      canvas.dataset.season = seasonOf(date, p.settings.hemi);
      scenePairs = friendPairs(home.residents, date, gaps, home);
      refreshFriends(date);
    }
    return date;
  };
  const friendAngle = (index: number, time: number) => rot + scenePosition(index, time);

  const plotAngle = (i: number) => rot + (i * TAU) / home.plots.length;
  const surf = (a: number, out = 0) => ({ x: geo.cx + Math.cos(a) * (geo.R + out), y: geo.cy + Math.sin(a) * (geo.R + out) });
  // The sites turn with the planet; the same function drives drawing and taps.
  const sitePoint = (index: number) => {
    const a = rot + ((index + 0.5) * TAU) / 5;
    return { x: geo.cx + Math.cos(a) * geo.R * 0.72, y: geo.cy + Math.sin(a) * geo.R * 0.72 };
  };

  const burst = (x: number, y: number, color: string) => {
    if (calm) return;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      const s = 60 + Math.random() * 140;
      bursts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.8, color });
    }
  };
  const floatText = (i: number, text: string, color = '#ffe58a') => {
    const q = surf(plotAngle(i), geo.R * 0.55);
    floaters.push({ x: q.x, y: q.y, text, t0: performance.now(), color });
    if (calm) calmTimers.push(window.setTimeout(schedule, 1450));
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

  // Pointer handlers run after setup; the panel supplies their shared refresh callback below.
  let renderPanel: () => void;

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
    if (ready(home, i) > 0) doCollect(i);
    selected = i;
    sfx.click();
    renderPanel();
  };

  // ---------------------------------------------------------------- canvas
  const frame = (now: number) => {
    raf = 0;
    if (stopped || document.hidden) return;
    const dpr = canvasDpr();
    const w = canvas.clientWidth;
    const hh = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
      skyCache = null;
      planetCache = null;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const time = calm ? 0.5 : (now - t0) / 1000;
    const R = Math.min(w, hh) * (0.2 + home.level * 0.028);
    geo = { cx: w / 2, cy: hh * 0.55, R, w, h: hh };
    const date = sceneNow();
    const season = seasonOf(date, p.settings.hemi);
    const night = nightness(date);
    if (!drag) {
      rot += vel;
      vel *= 0.93;
      if (Math.abs(vel) < 0.0005) vel = 0;
      if (!vel && !calm) rot += 0.0008;
    }
    g.clearRect(0, 0, w, hh);
    // The fixed star field is rasterized once per canvas size.
    if (!skyCache) {
      skyCache = document.createElement('canvas');
      skyCache.width = canvas.width;
      skyCache.height = canvas.height;
      const stars = skyCache.getContext('2d')!;
      stars.scale(dpr, dpr);
      stars.fillStyle = '#fff';
      for (let i = 0; i < 50; i++) {
        stars.globalAlpha = 0.25 + (i % 5) * 0.1;
        stars.beginPath();
        stars.arc(
          ((((Math.sin(i * 91.7) * 43758.5) % 1) + 1) % 1) * w,
          ((((Math.sin(i * 17.3) * 12345.6) % 1) + 1) % 1) * hh,
          1 + (i % 3) * 0.4,
          0,
          TAU,
        );
        stars.fill();
      }
    }
    g.drawImage(skyCache, 0, 0, w, hh);
    g.globalAlpha = 0.06;
    g.fillStyle = SEASON_DRESSING[season].skyTint;
    g.fillRect(0, 0, w, hh);
    g.globalAlpha = 1;
    // constellations you've relit shine in the sky
    p.constellations.forEach((id, k) => {
      const c = CONSTELLATION_BY_ID[id];
      const slot = SKY_SLOTS[k % SKY_SLOTS.length];
      if (c) {
        g.globalAlpha = 0.75;
        drawConstellation(g, c, slot[0] * w, slot[1] * hh, w * 0.3, hh * 0.16, c.stars.length, time, true);
        g.globalAlpha = 1;
      }
    });
    // The atmosphere grows brighter with each Homeworld Level.
    const atm = g.createRadialGradient(geo.cx, geo.cy, R * 0.9, geo.cx, geo.cy, R * 1.9);
    atm.addColorStop(0, `rgba(110,200,255,${0.18 + home.level * 0.05})`);
    atm.addColorStop(1, 'rgba(110,200,255,0)');
    g.fillStyle = atm;
    g.beginPath();
    g.arc(geo.cx, geo.cy, R * 1.9, 0, TAU);
    g.fill();
    // sun by day, moon by night
    if (sceneWeather === 'drizzle' && night < 0.5) {
      g.strokeStyle = 'rgba(255,214,229,0.4)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(w * 0.72, hh * 0.7, w * 0.18, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    if (night < 0.8) {
      const sx = w * 0.16;
      const sy = hh * 0.14;
      const sg = g.createRadialGradient(sx, sy, 4, sx, sy, 46);
      sg.addColorStop(0, `rgba(255,236,160,${0.8 * (1 - night)})`);
      sg.addColorStop(1, 'rgba(255,236,160,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.arc(sx, sy, 46, 0, TAU);
      g.fill();
      g.fillStyle = `rgba(255,240,190,${1 - night})`;
      g.beginPath();
      g.arc(sx, sy, 11, 0, TAU);
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
      if (!calm) drawMeteors(g, w, hh, time, night * (sceneWeather === 'starry' ? 2.5 : 1));
    }
    // planet body, in the player's paint job
    const look = previewLook(p);
    const paint = currentPaint(p);
    const styleColors = homeworldStyleColors(look);
    const groundColors = styleColors.ground ?? paint.ground.colors;
    const seaColors = styleColors.sea ?? paint.sea.colors;
    const cacheKey = `${Math.round(R * dpr)}:${season}:${groundColors.join(':')}`;
    if (!planetCache || planetCacheKey !== cacheKey) {
      planetCacheKey = cacheKey;
      planetCache = document.createElement('canvas');
      planetCache.width = planetCache.height = Math.ceil(R * dpr * 2);
      const pg = planetCache.getContext('2d')!;
      pg.scale(dpr, dpr);
      const body = pg.createRadialGradient(R * 0.7, R * 0.65, R * 0.1, R, R, R);
      body.addColorStop(0, groundColors[0]);
      body.addColorStop(0.55, groundColors[1]);
      body.addColorStop(1, groundColors[2]);
      pg.fillStyle = body;
      pg.beginPath();
      pg.arc(R, R, R, 0, TAU);
      pg.fill();
      pg.globalAlpha = 0.12;
      pg.fillStyle = SEASON_DRESSING[season].groundTint;
      pg.fill();
    }
    g.drawImage(planetCache, geo.cx - R, geo.cy - R, R * 2, R * 2);
    drawSeasonRim(g, geo.cx, geo.cy, R, season);
    // Each level adds a permanent skyline marker; Level 5 gains a light ring.
    for (let mark = 2; mark <= home.level; mark++) {
      const a = -Math.PI / 2 + (mark - 2) * 0.42;
      const x = geo.cx + Math.cos(a) * R * 0.84;
      const y = geo.cy + Math.sin(a) * R * 0.84;
      g.fillStyle = ['#83f4cd', '#ffe69a', '#c3aaff', '#eefbff'][mark - 2];
      g.beginPath();
      g.moveTo(x, y - 5);
      g.lineTo(x + 4, y);
      g.lineTo(x, y + 5);
      g.lineTo(x - 4, y);
      g.closePath();
      g.fill();
    }
    if (home.level === 5) {
      g.strokeStyle = '#e5f9ff';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(geo.cx, geo.cy, R * 1.18, R * 0.34, -0.2, 0, TAU);
      g.stroke();
    }
    // a few lakes that turn with the planet
    for (let i = 0; i < 4; i++) {
      const a = rot * 0.999 + i * 1.7;
      const d = R * (0.35 + (i % 2) * 0.25);
      g.fillStyle = seaColors[1];
      g.globalAlpha = 0.7;
      g.beginPath();
      g.ellipse(geo.cx + Math.cos(a) * d, geo.cy + Math.sin(a) * d, R * 0.16, R * 0.1, a, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1; // the lakes are translucent; nothing after them should be
    // Grown lands occupy the gaps between existing plot pads.
    gaps.forEach((land, i) => {
      if (!land) return;
      const angle = plotAngle(i) + TAU / (home.plots.length * 2);
      const point = surf(angle, -R * 0.035);
      drawHomeworldLand(g, land, point.x, point.y, Math.min(84, R * 0.7) * 0.8, angle);
      if (sceneWeather === 'drizzle') {
        g.fillStyle = 'rgba(178,224,246,0.6)';
        g.beginPath();
        g.ellipse(point.x + 6, point.y + 8, 7, 2.4, angle, 0, TAU);
        g.fill();
      }
    });
    LANDMARKS.forEach((site, index) => {
      if (p.level < 30) return;
      const point = sitePoint(index);
      const state = landmarkState(p, site.id);
      g.globalAlpha = home.level >= site.level ? 1 : 0.4;
      drawLandmark(g, site.id, state.stage, point.x, point.y, Math.min(52, R * 0.5), night);
      if (state.stage > 0) drawSeasonTrim(g, point.x, point.y, Math.min(52, R * 0.5), season);
      g.globalAlpha = 1;
    });
    if (landmarkState(p, 'sky_bridge').stage === 4) {
      const size = Math.min(74, R * 0.8);
      const anchors = drawFloatingIsle(g, geo.cx + R * 1.24, geo.cy - R * 0.7, size);
      anchors.forEach(([x, y], spot) => {
        const id = home.isleDecor[spot];
        if (id) drawIsleDecoration(g, id, x, y, size * 0.52);
      });
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
      if (b)
        drawStructure(g, b.type, b.type === 'lab' && b.kind ? labLevel(p, b.kind) : b.lv, s, time + i * 0.3, !!b.done && b.done > nowMs, {
          homeLevel: home.level,
          growth: b.type === 'greenhouse' ? (b.greenhouse?.winsTowardNext ?? 0) : undefined,
          style: structureStyleId(look, b.type, b.kind),
          ...(b.type === 'lab' ? { kind: b.kind, formOn: !!b.kind && formState(p, b.kind).on } : {}),
        });
      if (b) drawSeasonTrim(g, 0, 0, s, season);
      if (b?.type === 'den' && landmarkState(p, 'sprout_garden').stage === 4)
        drawDenFlowers(g, 0, -s * 0.08, s * 0.7, date.getHours() === 12);
      else if (i === selected) {
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.font = `700 ${Math.round(s * 0.4)}px Fredoka, ui-rounded, system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillText('+', 0, -s * 0.12);
      }
      g.restore();
      // ready bubble, drawn upright just outside the building
      const lq = surf(a, s * 1.05);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (b?.done && b.done > nowMs) {
        g.fillStyle = 'rgba(10,6,30,0.8)';
        g.beginPath();
        g.arc(lq.x, lq.y, s * 0.18, 0, TAU);
        g.fill();
        g.strokeStyle = '#ffd76a';
        g.lineWidth = Math.max(1.5, s * 0.025);
        g.beginPath();
        g.arc(lq.x, lq.y, s * 0.11, 0, TAU);
        g.moveTo(lq.x, lq.y - s * 0.065);
        g.lineTo(lq.x, lq.y);
        g.lineTo(lq.x + s * 0.055, lq.y + s * 0.035);
        g.stroke();
      } else if (b && ready(home, i) > 0) {
        const bob = Math.sin(time * 4 + i) * s * 0.04;
        g.fillStyle = isFull(home, i) ? '#ffb13d' : 'rgba(255,255,255,0.92)';
        g.beginPath();
        g.arc(lq.x, lq.y + bob, s * 0.2, 0, TAU);
        g.fill();
        g.font = `${Math.round(s * 0.22)}px system-ui, sans-serif`;
        g.fillText('🌱', lq.x, lq.y + bob + 1);
      }
      g.textBaseline = 'alphabetic';
    }
    // residents wander on the surface between the plots
    home.residents.forEach((r, k) => {
      if (home.expedition?.species === r.species) return;
      const { routine, pair } = friendScenes[k];
      const base = friendAngle(k, time);
      const q = surf(base);
      if (q.x < -s || q.x > w + s || q.y < -s || q.y > hh + s) return;
      const pose =
        waving === k && now < waveUntil
          ? 'wave'
          : !routine.awake
            ? 'sleep'
            : routine.activity === 'signature' || (routine.signatureId && (pair || (sceneMinute + k) % 5 === 0))
              ? 'signature'
              : pair || routine.activity === 'puddle_dance' || routine.activity === 'snow_play' || routine.activity === 'flower_picnic'
                ? 'happy'
                : 'idle';
      const acc = r.acc ?? festCostume(app.p);
      if (k < 12) {
        drawCreature(g, r.species, q.x, q.y, base + Math.PI / 2, s * 0.42, calm ? 0 : time + k, acc, false, pose, calm);
      } else {
        // Beyond twelve friends, reuse a still sprite instead of redrawing its parts each frame.
        const side = Math.ceil(s * 1.5);
        const key = `${r.species}:${acc}:${pose}:${side}:${dpr}`;
        let sprite = stillFriends.get(key);
        if (!sprite) {
          sprite = document.createElement('canvas');
          sprite.width = sprite.height = Math.ceil(side * dpr);
          const sg = sprite.getContext('2d')!;
          sg.scale(dpr, dpr);
          drawCreature(sg, r.species, side / 2, side / 2, 0, s * 0.42, 0, acc, false, pose, true);
          stillFriends.set(key, sprite);
        }
        g.save();
        g.translate(q.x, q.y);
        g.rotate(base + Math.PI / 2);
        g.drawImage(sprite, -side / 2, -side / 2, side, side);
        g.restore();
      }
      drawFriendOutfit(g, look, q.x, q.y, s * 0.42);
      drawFriendActivity(g, routine.activity, q.x, q.y, s * 0.42);
      if (pair && pair.a === r.species) {
        g.textAlign = 'center';
        g.font = `${Math.round(s * 0.16)}px system-ui`;
        g.fillText(pair.reaction === 'high_five' ? '✋' : pair.reaction === 'chase' ? '✦' : '♥', q.x, q.y - s * 0.32);
      }
    });
    // the Keeper strolls in the gap before the first plot
    const ka = rot - (TAU / n) * 0.5 + Math.sin(time * 0.4) * (TAU / n) * 0.15;
    const kq = surf(ka);
    g.save();
    g.translate(kq.x, kq.y);
    g.rotate(ka + Math.PI / 2);
    drawKeeper(g, look, 0, 0, s * 0.8, time);
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
    drawHomeworldWeather(g, w, hh, sceneWeather, time, calm);
    drawSeason(g, w, hh, time, season, night, calm ? 12 : 24);
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
    if (!calm) schedule();
  };
  const schedule = () => {
    if (!raf && !stopped && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else schedule();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('resize', schedule);

  // drag to spin, tap to select
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, rot, moved: false, t: performance.now() };
    vel = 0;
    schedule();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    const prev = rot;
    rot = drag.rot + dx / Math.max(80, geo.R);
    vel = rot - prev;
    schedule();
  });
  const up = (e: PointerEvent) => {
    if (!drag) return;
    const wasTap = !drag.moved;
    drag = null;
    if (calm) vel = 0;
    schedule();
    if (!wasTap) return;
    vel = 0;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const time = calm ? 0.5 : (performance.now() - t0) / 1000;
    const hit = Math.max(28, Math.min(84, geo.R * 0.7) * 0.46);
    sceneNow();
    if (landmarkState(p, 'sky_bridge').stage === 4) {
      const isleSize = Math.min(74, geo.R * 0.8);
      const ix = geo.cx + geo.R * 1.24;
      const iy = geo.cy - geo.R * 0.7;
      let bestDistance = Infinity;
      for (let spot = 0; spot < ISLE_SPOTS.length; spot++) {
        const [sx, sy] = ISLE_SPOTS[spot];
        const distance = Math.hypot(x - (ix + (sx * isleSize) / 48), y - (iy + (sy * isleSize) / 48));
        if (distance < bestDistance) {
          bestDistance = distance;
        }
      }
      // Nearest-anchor regions cover the body, and each extends at least 22 pt outside it.
      if (bestDistance <= ISLE_TARGET || (Math.abs(x - ix) <= isleSize * 0.55 && Math.abs(y - iy) <= isleSize * 0.42)) {
        // The anchors are too close for three separate 44 pt targets on the canvas.
        // One large Isle target opens rows that each have a full 44 pt target.
        const chooser = modal([
          h('div', { class: 'm-title' }, t('Floating Isle')),
          ...ISLE_SPOTS.map((_, spot) => {
            const choice = btn(t('Isle spot {n}', { n: spot + 1 }), 'ghost wide', () => {
              chooser.close();
              isleDecorationSheet(app, spot, renderPanel);
            });
            choice.style.cssText = 'display:block;width:100%;min-height:44px;margin:6px 0';
            return choice;
          }),
          // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
          btn(t('Back'), 'ghost wide', () => chooser.close()),
        ]);
        return;
      }
    }
    for (let index = 0; index < LANDMARKS.length; index++) {
      if (p.level < 30) break;
      const point = sitePoint(index);
      const siteSpacing = 2 * geo.R * 0.72 * Math.sin(Math.PI / 5);
      if (Math.hypot(x - point.x, y - point.y) <= Math.min(22, siteSpacing * 0.49)) {
        landmarkSheet(app, LANDMARKS[index].id, renderPanel);
        return;
      }
    }
    let nearestFriend = -1;
    let friendDistance = hit;
    for (let k = 0; k < home.residents.length; k++) {
      if (home.expedition?.species === home.residents[k].species) continue;
      const base = friendAngle(k, time);
      const q = surf(base);
      const distance = Math.hypot(x - q.x, y - q.y);
      if (distance < friendDistance) {
        friendDistance = distance;
        nearestFriend = k;
      }
    }
    if (nearestFriend >= 0) {
      waving = nearestFriend;
      waveUntil = performance.now() + 900;
      if (calm) calmTimers.push(window.setTimeout(schedule, 900));
      sfx.creature(false);
      haptic.light();
      residentsSheet(app, renderPanel);
      return;
    }
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
    if (bd < (TAU / n) * 0.34) tapPlot(best);
    else {
      const signed = ((a - plotAngle(best) + Math.PI * 3) % TAU) - Math.PI;
      landSheet(app, signed >= 0 ? best : (best + n - 1) % n, renderPanel);
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => (drag = null));

  const panelController = createPanel({
    app,
    canvas,
    panel,
    levelBadge,
    pouchHeader,
    plotButtons,
    get selected() {
      return selected;
    },
    set selected(value: number) {
      selected = value;
    },
    get moving() {
      return moving;
    },
    set moving(value: number) {
      moving = value;
    },
    get geo() {
      return geo;
    },
    schedule,
    burst,
    surf,
    plotAngle,
    doCollect,
    reopen: () => showHomeworld(app),
  });
  renderPanel = () => {
    // Sheets can add friends, Dens or lands without remounting the canvas.
    gaps = resolvedGaps(p);
    const date = new Date();
    scenePairs = friendPairs(home.residents, date, gaps, home);
    refreshFriends(date);
    panelController.renderPanel();
    schedule();
  };
  const { tickPanel } = panelController;

  renderPanel();
  const tick = setInterval(tickPanel, 15000);
  schedule();

  app.mount(
    h(
      'div',
      { class: 'screen page homeworld' },
      app.topBar(),
      h('div', { class: 'page-title' }, t('Homeworld'), levelBadge, pouchHeader),
      canvas,
      h('nav', { class: 'hw-plot-list', 'aria-label': t('Homeworld plots') }, ...plotButtons),
      panel,
    ),
    'homeworld',
    () => {
      stopped = true;
      cancelAnimationFrame(raf);
      calmTimers.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', schedule);
      clearInterval(tick);
    },
  );
  // app.mount chooses the default tab theme, then the finished Beacon takes over.
  if (home.landmarks.keepers_beacon.stage === 4) setMusicTheme('beacon');
  if (!home.intro) {
    home.intro = true;
    app.save();
    firstHourSheet(app, () => {
      renderPanel();
      schedule();
    });
  } else if (home.seen.celebrations.length) {
    // Rewards were credited by the meta operation; this consumes presentation IDs only.
    const id = home.seen.celebrations[0];
    const friend = /^friend:([^:]+):level:(\d)$/.exec(id);
    const site = LANDMARKS.find((item) => id.startsWith(`${item.id}:stage:`));
    const stage = site ? Number(id.slice(id.lastIndexOf(':') + 1)) : 0;
    const beacon = id === 'keepers_beacon:stage:4';
    const title = friend ? t('Friendship Level {n}!', { n: Number(friend[2]) }) : site ? t(site.name) : t('Homeworld celebration');
    const friendLevel = friend ? Number(friend[2]) : 0;
    const reward = site && stage >= 1 && stage <= 3 ? site.stages[(stage - 1) as 0 | 1 | 2].reward : null;
    const friendGift =
      friendLevel === 2
        ? t('Your friend earned the Bow!')
        : friendLevel === 3
          ? t('Your friend earned the Flower and a signature move!')
          : friendLevel === 4
            ? t('Your friend earned the Scarf and waves from anywhere!')
            : t('Your best friend earned the Tiny Crown and a keepsake!');
    const parade = beacon
      ? h(
          'div',
          {
            class: 'hw-beacon-parade',
            'aria-hidden': 'true',
            style: 'display:flex;flex-wrap:wrap;justify-content:center;gap:2px;overflow:visible;max-width:100%',
          },
          ...home.residents.slice(0, 6).map((resident) => critterCanvas(resident.species, 36, 0)),
        )
      : null;
    const card = h(
      'div',
      { class: 'hw-earned-card' },
      h('div', { class: 'm-title' }, title),
      friend ? critterCanvas(friend[1], 92, 0, '', Number(friend[2]) >= 3 ? 'signature' : 'happy') : null,
      parade,
      h(
        'p',
        null,
        friend
          ? friendGift
          : site && stage === 4
            ? t('{name} is finished! {gift}', { name: t(site.name), gift: t(site.finish) })
            : site && stage < 4
              ? t('Stage {n} is complete!', { n: stage })
              : t('Something lovely grew on your Homeworld!'),
      ),
      friendLevel >= 2 ? h('p', { class: 'hw-reward-earned' }, t('+{n} gems', { n: friendLevel === 5 ? 50 : friendLevel * 5 })) : null,
      reward?.dust ? h('p', { class: 'hw-reward-earned' }, t('+{n} stardust', { n: reward.dust })) : null,
      reward?.gems ? h('p', { class: 'hw-reward-earned' }, t('+{n} gems', { n: reward.gems })) : null,
    );
    const m = modal(
      [
        card,
        btn(t('Wonderful!'), 'primary wide', () => {
          show.skip();
          m.close();
        }),
      ],
      {
        cls: 'hw-earned',
        onClose: () => {
          home.seen.celebrations = home.seen.celebrations.filter((item) => item !== id);
          app.save();
        },
      },
    );
    const show = celebrate('homeworld', {
      root: m.el,
      reduceMotion: calm,
      firstEver: beacon,
      duration: id.includes('keepers_beacon') ? 4000 : 1700,
      beats: [
        {
          at: 100,
          play: (instant) => {
            if (beacon) sfx.beacon();
            if (!instant) {
              if (!beacon) sfx.levelUp();
              haptic.success();
            }
            card.classList.add('shown');
          },
        },
      ],
    });
    void show.done.then(() => {
      parade?.querySelectorAll('canvas').forEach((portrait) => {
        portrait.style.animation = 'none';
        portrait.style.opacity = '1';
        portrait.style.transform = 'none';
      });
    });
  }
}
