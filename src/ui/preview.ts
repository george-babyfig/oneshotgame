import { BIOMES, KINDS, SECTORS, SPECIES_BY_ID } from '../core/world';
import { drawCreature, drawWanderGhost } from './art/critters';
import { drawProjectile } from './art/projectiles';
import { drawKeeper } from './art/keeper';
import { drawGameplayLauncher } from './art/launchers';
import { novaForThrow, previewStep } from '../core/round';
import { fly, flyFull, flyFullWithLauncher, STAR_SLING } from '../core/flight';
import { launcherAtTune } from '../core/launchers';
import { needsBonkBadge } from './feel';
import { t, tp } from '../i18n';
import {
  aimTagFacts,
  aimTagRing,
  aimTagSize,
  aimTagSummary,
  aimTagSymbols,
  intersects,
  placeAimTag,
  segmentNearRect,
  type Rect,
} from './aimtag';
import { speak } from './hud';
import { h } from './dom';
import { haptic } from './haptics';
import type { LevelScene } from './game';

export const MAX_PULL = 150;
export const PULL_TO_SPEED = 6.2;
export const SCOPE_STEPS = [16, 28, 44, 90] as const;
/** Paid Aim Guide levels retain their visible value until the upgrade retires. */
export function visibleAimSteps(
  id: import('../core/launchers').LauncherId,
  tune: import('../core/launchers').Tune,
  scopeLevel: number,
  full = false,
): number {
  if (full || scopeLevel >= 3) return 90;
  return Math.max(12, launcherAtTune(id, tune).aimSteps + SCOPE_STEPS[Math.max(0, Math.min(2, Math.floor(scopeLevel)))] - 28);
}

export function aimStepsWithBounce(steps: number, path: ReturnType<typeof flyFull>, skipper: boolean): number {
  if (!skipper) return steps;
  const bounce = path.bounces.find((item) => item.special);
  return bounce ? Math.max(steps, Math.min(150, Math.ceil(bounce.elapsed * 30) + 8)) : steps;
}
export interface DrawnAim {
  vx: number;
  vy: number;
  roundTime: number;
  rotation: number;
  badge: boolean;
}
const flightCache = new WeakMap<LevelScene, { key: string; path: ReturnType<typeof flyFull> }>();

export const safeTroubleText = () => t('Safe!');

export function predictFlight(scene: LevelScene, vx: number, vy: number) {
  const key = `${scene.o.launcher.id}|${scene.o.launcher.tune}|${vx}|${vy}|${scene.rot}|${scene.time}|${scene.w}|${scene.h}|${scene.throwsUsed}|${scene.bossHp}|${scene.skyState.brokenRocks.join(',')}`;
  let cached = flightCache.get(scene);
  if (cached?.key !== key) {
    cached = {
      key,
      path: flyFullWithLauncher(scene.o.launcher, { ...scene.launch, vx, vy, elapsed: 0 }, scene.flightWorld(scene.rot), scene.time),
    };
    flightCache.set(scene, cached);
  }
  return cached.path;
}

function outline(scene: LevelScene, i: number, color: string, alpha = 1) {
  const g = scene.g;
  const step = (Math.PI * 2) / SECTORS;
  const angle = scene.rot + i * step;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(scene.cx, scene.cy, scene.surfaceR(i) + 5, angle - step * 0.48, angle + step * 1.48);
  g.stroke();
  g.restore();
}

export function drawGoalPulse(scene: LevelScene) {
  if (!scene.goalPulse || scene.time >= scene.goalPulse.until) return;
  const alpha = scene.o.reduceMotion ? 0.9 : 0.6 + Math.sin(scene.time * 8) * 0.25;
  for (const sector of scene.goalPulse.sectors) outline(scene, sector, '#ffe78e', alpha);
}

export function aimTagReserved(scene: LevelScene, path?: ReturnType<typeof flyFull>): Rect[] {
  const canvas = scene.canvas.getBoundingClientRect();
  const sx = scene.w / canvas.width;
  const sy = scene.h / canvas.height;
  const selectors =
    '.level .hud-top, .level .life, .level .goals, .level .forecast, .level .twist, .level .hint, .level .banners .show, .level .finish:not(.hidden), .level .hud-bottom';
  const elements = [...scene.el.querySelectorAll(selectors)];
  if (scene.forecastEl && !elements.includes(scene.forecastEl)) elements.push(scene.forecastEl);
  const zones = elements.map((el) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - canvas.left) * sx, y: (r.top - canvas.top) * sy, width: r.width * sx, height: r.height * sy };
  });
  zones.push({ x: scene.launch.x - 65, y: scene.launch.y - 65, width: 130, height: 130 });
  if (scene.aimTo) zones.push({ x: scene.aimTo.x - 40, y: scene.aimTo.y - 40, width: 80, height: 80 });
  const count = scene.upcoming.length;
  for (let k = 0; k < count; k++) {
    const x = scene.launch.x + (count === 1 ? 88 : 90 + (k % 2) * 34);
    const y = scene.launch.y + (count === 1 ? -56 : -74 + Math.floor(k / 2) * 34);
    zones.push({ x: x - 28, y: y - 28, width: 56, height: 56 });
  }
  if (path) {
    const steps = aimStepsWithBounce(
      visibleAimSteps(scene.o.launcher.id, scene.o.launcher.tune, scene.o.scopeLevel, scene.o.boosters.scope),
      path,
      scene.o.launcher.id === 'skipper' && !scene.o.boosters.scope && scene.o.scopeLevel < 3,
    );
    const visibleCount = Math.min(steps, Math.ceil(path.points.length / 8));
    for (let k = 0; k < visibleCount; k++) {
      const point = path.points[Math.min(path.points.length - 1, (k + 1) * 8 - 1)];
      if (!point || point.elapsed > steps / 30) break;
      zones.push({ x: point.x - 4, y: point.y - 4, width: 8, height: 8 });
    }
  }
  return zones;
}

export function aimTagRect(scene: LevelScene, i: number, path?: ReturnType<typeof flyFull>): Rect | null {
  const [x, y] = scene.sectorPoint(i, 1.34);
  const points = path?.points;
  const last = points && points.length > 1 ? ([points[points.length - 2], points[points.length - 1]] as const) : null;
  const size = aimTagSize(scene.predictCache!.facts, scene.w);
  const placement = placeAimTag(
    { x, y },
    { x: scene.cx, y: scene.cy },
    size,
    { width: scene.w, height: scene.h },
    aimTagReserved(scene, path),
    last
      ? [
          { x: last[0].x, y: last[0].y },
          { x: last[1].x, y: last[1].y },
        ]
      : null,
  );
  if (!placement) {
    scene.aimTagPosition = null;
    return null;
  }
  const target = placement.rect;
  const previous = scene.aimTagPosition;
  if (scene.o.reduceMotion || !previous) {
    scene.aimTagPosition = { x: target.x, y: target.y };
  } else {
    const eased = {
      x: Math.max(6, Math.min(scene.w - size.width - 6, previous.x + (target.x - previous.x) * 0.24)),
      y: Math.max(6, Math.min(scene.h - size.height - 6, previous.y + (target.y - previous.y) * 0.24)),
    };
    const moving = { ...eased, ...size };
    const safe =
      aimTagReserved(scene, path).every((zone) => !intersects(moving, zone, 5)) && (!last || !segmentNearRect(last[0], last[1], moving, 9));
    scene.aimTagPosition = safe ? eased : { x: target.x, y: target.y };
  }
  return { ...scene.aimTagPosition, ...size };
}

/** The full-flight prediction is unchanged; only its compact drawing follows the landing sector. */
export function drawLanding(scene: LevelScene, i: number, path?: ReturnType<typeof flyFull>) {
  const key = `${i}|${scene.cur}|${scene.o.launcher.id}|${scene.o.launcher.tune}|${!!path?.specialBounced}|${scene.throwsUsed}|${scene.nova.charge}|${scene.nova.held}|${scene.combo.links}|${scene.combo.rest}|${scene.o.buddy?.species ?? ''}|${scene.roundModifiers().buddyShield ?? ''}|${scene.troubles.map((v) => `${v.id}:${v.nextIn}:${v.settled}`).join(',')}`;
  if (scene.predictCache?.key !== key) {
    if (scene.o.launcher.id === 'pinpoint' && scene.predictCache?.key.split('|')[0] !== String(i)) haptic.tick();
    const state = scene.roundState();
    const res = previewStep(
      state,
      { kind: scene.cur, sector: i, nova: novaForThrow(state), bounced: !!path?.specialBounced },
      scene.roundModifiers(),
      scene.rules,
    );
    const land = res.state.planet.sectors[i].biome;
    const facts = aimTagFacts(res, land);
    const title = aimTagSummary(facts);
    scene.predictCache = { key, title, facts, changed: res.changed };
    let announcement = title;
    if (scene.o.launcher.id === 'pinpoint') {
      const card = h('div', { class: 'pinpoint-landing-card', role: 'note' });
      const lands = res.changed.map((sector) => t(BIOMES[res.state.planet.sectors[sector].biome].name)).join(', ');
      const creatures = facts.lost.length
        ? facts.lost.map((lost) => t('{creature} wanders off', { creature: t(SPECIES_BY_ID[lost.species].name) })).join(' · ')
        : t('Everyone stays');
      const places = res.changed.length
        ? tp(res.changed.length, 'Changes one place: {lands}.', 'Changes {n} places: {lands}.', { lands })
        : t('No land changes.');
      card.textContent = `${places} ${creatures}`;
      scene.el.querySelector('.pinpoint-landing-card')?.remove();
      scene.el.append(card);
      announcement = card.textContent;
    }
    if (scene.liveEl) speak(scene, announcement);
  }
  const { facts, changed } = scene.predictCache;
  for (const sector of changed) outline(scene, sector, '#ffffff', scene.o.reduceMotion ? 0.9 : 0.65 + Math.sin(scene.time * 8) * 0.2);
  const g = scene.g;
  for (const lost of facts.lost) {
    const [gx, gy] = scene.sectorPoint(lost.sector, 1.18);
    drawWanderGhost(g, lost.species, gx, gy, scene.R * 0.16, '↗', scene.time, !!scene.o.reduceMotion);
  }
  const rect = aimTagRect(scene, i, path);
  if (!rect) return;
  const { x, y, width, height } = rect;
  const scale =
    scene.previewTextScale ||
    (scene.previewTextScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-scale')) || 1);
  g.save();
  g.fillStyle = 'rgba(10,6,30,0.94)';
  const ring = aimTagRing(facts);
  g.strokeStyle = ring === 'gold' || ring === 'double-gold' ? '#ffe38a' : ring === 'red' ? '#ff8187' : '#d3d0ed';
  g.lineWidth = ring === 'plain' ? 1.5 : 3;
  g.beginPath();
  g.roundRect(x, y, width, height, 15);
  g.fill();
  g.stroke();
  if (ring === 'double-gold') {
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(x + 5, y + 5, width - 10, height - 10, 11);
    g.stroke();
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (facts.delta) {
    g.font = `800 ${Math.round(25 * scale)}px Fredoka, ui-rounded, system-ui, sans-serif`;
    g.fillStyle = facts.delta > 0 ? '#a5ef9e' : '#ff8d95';
    g.fillText(`${facts.delta > 0 ? '+' : '−'}${Math.abs(facts.delta)}`, x + width / 2, y + 20, width - 12);
  }
  const icons = aimTagSymbols(facts);
  const iconY = y + (facts.delta ? 45 : height / 2);
  g.font = `700 ${Math.round(18 * scale)}px system-ui`;
  for (let row = 0; row < Math.ceil(icons.length / 5); row++) {
    const shown = icons.slice(row * 5, row * 5 + 5);
    const gap = Math.min(21, (width - 12) / shown.length);
    shown.forEach((icon, n) => g.fillText(icon, x + width / 2 + (n - (shown.length - 1) / 2) * gap, iconY + row * 18, gap + 3));
  }
  if (facts.comboBeads) {
    g.fillStyle = '#ffe38a';
    for (let n = 0; n < facts.comboBeads; n++) {
      g.beginPath();
      g.arc(x + width / 2 + (n - (facts.comboBeads - 1) / 2) * 11, y + height - 5, 2.8, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

export function drawNovaMeter(scene: LevelScene, x: number, y: number, aiming: boolean) {
  if (!scene.novaOn) return;
  const g = scene.g;
  const progress = scene.nova.charge / scene.nova.threshold;
  const full = scene.nova.charge >= scene.nova.threshold;
  const R = 50;
  g.save();
  if (full && aiming && !scene.nova.held && !scene.o.reduceMotion) {
    const glow = g.createRadialGradient(x, y, 8, x, y, R + 16);
    glow.addColorStop(0, `rgba(255,220,110,${0.4 + Math.sin(scene.time * 5) * 0.1})`);
    glow.addColorStop(1, 'rgba(255,220,110,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x, y, R + 16, 0, Math.PI * 2);
    g.fill();
  }
  g.lineCap = 'round';
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(255,255,255,0.2)';
  g.beginPath();
  g.arc(x, y, R, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = full ? (scene.nova.held ? '#c5d4ef' : '#ffe38a') : '#ffd24a';
  g.shadowColor = '#ffd24a';
  g.shadowBlur = full && !scene.nova.held && !scene.o.reduceMotion ? 14 : 0;
  g.beginPath();
  g.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.min(1, progress) * Math.PI * 2);
  g.stroke();
  g.shadowBlur = 0;
  if (full && scene.nova.held) {
    g.fillStyle = '#c5d4ef';
    g.fillRect(x - 6, y - R - 3, 4, 10);
    g.fillRect(x + 2, y - R - 3, 4, 10);
  }
  if (scene.rules.combo && scene.combo.links > 0) {
    const beads = Math.min(4, scene.combo.links);
    for (let k = 0; k < beads; k++) {
      const a = Math.PI * (0.18 + (k / 5) * 0.64);
      const bx = x + Math.cos(a) * (R + 11);
      const by = y + Math.sin(a) * (R + 11);
      g.globalAlpha = scene.combo.rest && !scene.o.reduceMotion ? 0.42 + Math.sin(scene.time * 4) * 0.12 : scene.combo.rest ? 0.45 : 1;
      g.fillStyle = '#ffe38a';
      g.beginPath();
      g.arc(bx, by, 4.2, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  if (full && aiming && !scene.aimFrom && !scene.suppressNovaLabel) {
    g.fillStyle = '#ffe58a';
    g.font = '700 13px Fredoka, ui-rounded, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(scene.nova.held ? t('Supernova held') : t('SUPERNOVA READY'), x, y - R - 12, Math.min(120, scene.w * 0.4));
  }
  g.restore();
}

function queuePositions(scene: LevelScene) {
  const L = scene.launch;
  const count = scene.upcoming.length;
  return Array.from({ length: count }, (_, i) => {
    if (count === 1) return { x: L.x + 88, y: L.y - 56 };
    return { x: L.x + 90 + (i % 2) * 34, y: L.y - 74 + Math.floor(i / 2) * 34 };
  });
}

export function queueHit(scene: LevelScene, x: number, y: number) {
  const first = queuePositions(scene)[0];
  return Math.hypot(x - first.x, y - first.y) < 34;
}

function drawQueue(scene: LevelScene) {
  const g = scene.g;
  const kinds = scene.upcoming;
  queuePositions(scene).forEach((point, i) => {
    const kind = kinds[i];
    if (!kind) return;
    g.save();
    g.fillStyle = 'rgba(10,6,30,0.75)';
    g.strokeStyle = i === 0 ? '#ffe38a' : 'rgba(255,255,255,0.65)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(point.x, point.y, i === 0 ? 21 : 16, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    drawProjectile(g, kind, point.x, point.y, i === 0 ? 27 : 21, scene.o.reduceMotion ? 0 : scene.time);
    if (i === 0) {
      g.fillStyle = '#ffe38a';
      g.beginPath();
      g.arc(point.x - 17, point.y + 17, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#221738';
      g.font = '700 14px system-ui';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('⇄', point.x - 17, point.y + 17);
    }
    g.restore();
  });
}

export function drawAim(scene: LevelScene) {
  const g = scene.g;
  const L = scene.launch;
  const aiming = !scene.shot && !scene.ended;
  const p = scene.pull();
  if (!aiming || !scene.aimFrom || p.len < 18) scene.drawnAim = null;
  if (!aiming || !scene.aimFrom || p.len < 18) {
    scene.el.querySelector('.pinpoint-landing-card')?.remove();
    scene.predictCache = null;
  }
  const ox = aiming && scene.aimFrom ? -p.vx / PULL_TO_SPEED / 3 : 0;
  const oy = aiming && scene.aimFrom ? -p.vy / PULL_TO_SPEED / 3 : 0;
  const kx = L.x - Math.min(96, scene.w * 0.24);
  const ky = L.y + 46;
  const cheer = scene.cheerUntil > scene.time ? Math.min(1, (scene.cheerUntil - scene.time) * 3) : 0;
  const bd = scene.o.buddy;
  if (bd) {
    const hop = scene.o.reduceMotion
      ? 0
      : cheer > 0
        ? Math.abs(Math.sin(scene.time * 9)) * 14 * cheer
        : Math.abs(Math.sin(scene.time * 2)) * 1.5;
    drawCreature(g, bd.species, kx - Math.min(46, scene.w * 0.11), ky - hop, 0, 26, scene.time + 0.7, bd.acc);
  }
  drawKeeper(g, scene.look, kx, ky, 62, scene.time, {
    lean: aiming && scene.aimFrom ? Math.min(1, p.len / MAX_PULL) : 0,
    cheer,
    look: Math.atan2(scene.cy - (ky - 45), scene.cx - kx),
    emote: scene.emoteAt >= 0 && scene.time - scene.emoteAt < 6,
    et: scene.time - scene.emoteAt,
  });
  drawGameplayLauncher(
    g,
    scene.o.launcher.id,
    scene.look.launcher,
    L.x,
    L.y,
    scene.time,
    { x: ox, y: oy },
    KINDS[scene.cur].color,
    !!scene.o.mastered,
  );
  scene.drawNovaMeter(L.x, L.y, aiming);
  if (scene.focusTarget && scene.time < scene.focusTarget.until) {
    const point = scene.focusTarget.kind === 'ring' ? { x: L.x, y: L.y, r: 58 } : { ...queuePositions(scene)[0], r: 29 };
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    g.stroke();
  }
  if (aiming) {
    const bounce = scene.o.reduceMotion || scene.aimFrom ? 0 : Math.sin(scene.time * 3) * 3;
    drawProjectile(g, scene.cur, L.x + ox, L.y + oy + bounce, 36, scene.o.reduceMotion ? 0 : scene.time);
    drawQueue(scene);
    if (scene.aimFrom && p.len >= 18) {
      const path = predictFlight(scene, p.vx, p.vy);
      const baseSteps = visibleAimSteps(scene.o.launcher.id, scene.o.launcher.tune, scene.o.scopeLevel, scene.o.boosters.scope);
      const steps = aimStepsWithBounce(
        baseSteps,
        path,
        scene.o.launcher.id === 'skipper' && !scene.o.boosters.scope && scene.o.scopeLevel < 3,
      );
      scene.drawnAim = { vx: p.vx, vy: p.vy, roundTime: scene.time, rotation: scene.rot, badge: needsBonkBadge(path.hit) };
      if (path.sector === null) {
        scene.predictCache = null;
        scene.aimTagPosition = null;
      }
      g.fillStyle = '#ffffff';
      if (scene.o.showSlingGhost) {
        const ghost = fly(
          STAR_SLING,
          { ...scene.launch, vx: p.vx, vy: p.vy, elapsed: 0 },
          scene.flightWorld(scene.rot),
          scene.time,
          steps / 30,
        );
        g.fillStyle = '#b8b8c7';
        for (let k = 0; k < Math.min(steps, Math.ceil(ghost.points.length / 8)); k++) {
          const point = ghost.points[Math.min(ghost.points.length - 1, (k + 1) * 8 - 1)];
          if (!point) continue;
          g.globalAlpha = 0.36 * (1 - k / steps);
          g.beginPath();
          g.arc(point.x, point.y, 2, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#ffffff';
      }
      const visibleCount = Math.min(steps, Math.ceil(path.points.length / 8));
      for (let k = 0; k < visibleCount; k++) {
        const s = path.points[Math.min(path.points.length - 1, (k + 1) * 8 - 1)];
        if (!s || s.elapsed > steps / 30) break;
        g.globalAlpha = 0.85 * (1 - k / steps);
        g.beginPath();
        g.arc(s.x, s.y, 3.2 - (k / steps) * 1.8, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      const visibleEnd = Math.min(path.points.length, steps * 8);
      for (const bounce of path.bounces) {
        if (!path.points.slice(0, visibleEnd).some((point) => Math.abs(point.elapsed - bounce.elapsed) < STAR_SLING.step * 1.5)) continue;
        drawContactStar(g, bounce.x, bounce.y, '#b9edff', 7);
      }
      if (scene.drawnAim.badge) {
        const contact = path.hit as { x: number; y: number };
        if (path.points.length <= visibleEnd) drawContactStar(g, contact.x, contact.y, '#ff787d', 9);
        drawBonkBadge(g, L.x + 40, L.y - 40);
      }
      if (path.sector !== null) scene.drawLanding(path.sector, path);
      else scene.el.querySelector('.pinpoint-landing-card')?.remove();
      if (
        launcherAtTune(scene.o.launcher.id, scene.o.launcher.tune).overPullTip &&
        scene.aimTo &&
        scene.aimFrom &&
        Math.hypot(scene.aimFrom.x - scene.aimTo.x, scene.aimFrom.y - scene.aimTo.y) >
          launcherAtTune(scene.o.launcher.id, scene.o.launcher.tune).maxPull
      ) {
        g.fillStyle = '#ff8d95';
        g.font = 'bold 16px Fredoka, system-ui';
        g.textAlign = 'center';
        g.fillText(t('Too far'), L.x, L.y - 66);
      }
      g.globalAlpha = 1;
    }
  }
}

export function aimAt(scene: LevelScene, sector: number, clearSky = false) {
  const target = ((Math.floor(sector) % SECTORS) + SECTORS) % SECTORS;
  const launch = scene.launch;
  const world = scene.flightWorld(scene.rot);
  if (clearSky) world.sky = undefined;
  const maxSpeed = launcherAtTune(scene.o.launcher.id, scene.o.launcher.tune).maxPull * PULL_TO_SPEED;
  for (const speed of [420, 560, 700, 840, maxSpeed].filter((value) => value <= maxSpeed)) {
    for (let i = 0; i < 180; i++) {
      const angle = -Math.PI + (i / 179) * Math.PI;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      if (flyFullWithLauncher(scene.o.launcher, { ...launch, vx, vy, elapsed: 0 }, world, scene.time).sector === target) return { vx, vy };
    }
  }
  const angle = scene.rot + (target + 0.5) * ((Math.PI * 2) / SECTORS);
  const dx = scene.cx + Math.cos(angle) * scene.R - launch.x;
  const dy = scene.cy + Math.sin(angle) * scene.R - launch.y;
  const length = Math.hypot(dx, dy) || 1;
  return { vx: (dx / length) * 700, vy: (dy / length) * 700 };
}

function drawContactStar(g: CanvasRenderingContext2D, x: number, y: number, color: string, size: number) {
  g.save();
  g.fillStyle = color;
  g.strokeStyle = '#372035';
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? size * 0.48 : size;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (!i) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

function drawBonkBadge(g: CanvasRenderingContext2D, x: number, y: number) {
  g.save();
  g.fillStyle = '#bd314f';
  g.strokeStyle = '#fff0e9';
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(x, y, 15, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff';
  g.font = '800 18px Fredoka, ui-rounded, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', x, y + 1);
  g.restore();
}
