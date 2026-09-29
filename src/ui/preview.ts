import { BIOMES, KINDS, SECTORS, SPECIES_BY_ID } from '../core/world';
import { drawCreature } from './art/critters';
import { drawProjectile } from './art/projectiles';
import { drawKeeper, drawLauncher } from './art/keeper';
import { novaReady, previewStep } from '../core/round';
import { fly, STAR_SLING } from '../core/flight';
import { t } from '../i18n';
import type { LevelScene } from './game';

export const MAX_PULL = 150;
export const PULL_TO_SPEED = 6.2;
const SCOPE_STEPS = [16, 28, 44, 90];

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

export function drawLanding(scene: LevelScene, i: number) {
  const ready = scene.novaOn && novaReady(scene.roundState()) && !scene.nova.held;
  const key = `${i}|${scene.cur}|${scene.throwsUsed}|${scene.nova.charge}|${scene.nova.held}`;
  if (scene.predictCache?.key !== key) {
    const res = previewStep(scene.roundState(), { kind: scene.cur, sector: i, nova: ready }, scene.roundModifiers());
    const after = BIOMES[res.state.planet.sectors[i].biome];
    const lost = res.lost[0];
    scene.predictCache = {
      key,
      land: t(after.name),
      icon: after.deco || '●',
      delta: res.after - res.before + res.labBonus,
      lost: lost ? t(SPECIES_BY_ID[lost.species].name) : '',
      creature: res.spawned[0] ? t(SPECIES_BY_ID[res.spawned[0].id].name) : '',
      changed: res.changed,
    };
  }
  const pc = scene.predictCache;
  for (const sector of pc.changed) outline(scene, sector, '#ffffff', scene.o.reduceMotion ? 0.9 : 0.65 + Math.sin(scene.time * 8) * 0.2);
  const g = scene.g;
  const { x, y, width, height } = landingCardRect(scene);
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-scale')) || 1;
  g.save();
  g.fillStyle = 'rgba(10,6,30,0.9)';
  g.strokeStyle = '#d3d0ed';
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x, y, width, height, 12);
  g.fill();
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(13 * scale)}px Fredoka, ui-rounded, system-ui, sans-serif`;
  g.fillStyle = '#ffffff';
  const life = pc.delta ? t('{n} life', { n: `${pc.delta > 0 ? '+' : ''}${pc.delta}` }) : '';
  const arrival = pc.creature ? t('{creature} moves in', { creature: pc.creature }) : '';
  g.fillText(
    `${pc.icon} ${pc.land}${life ? ` · ${life}` : ''}${arrival ? ` · ${arrival}` : ''}`,
    x + width / 2,
    y + (pc.lost ? height * 0.34 : height / 2),
    width - 12,
  );
  if (pc.lost) {
    g.font = `700 ${Math.round(12 * scale)}px Fredoka, ui-rounded, system-ui, sans-serif`;
    g.fillStyle = '#c5c5d2';
    g.fillText(t('{creature} wanders off', { creature: pc.lost }), x + width / 2, y + height * 0.73, width - 12);
  }
  g.restore();
}

export function landingCardRect(scene: LevelScene) {
  const canvas = scene.canvas.getBoundingClientRect();
  const goalsBottom = scene.goalsEl.getBoundingClientRect().bottom - canvas.top;
  const bannerBottom = scene.el.querySelector('.banners .show')?.getBoundingClientRect().bottom ?? canvas.top;
  const top = Math.max(150, goalsBottom + 8, bannerBottom - canvas.top + 8);
  const width = Math.min(scene.w - 24, 276);
  const height = scene.predictCache?.lost ? 54 : 34;
  return { x: (scene.w - width) / 2, y: Math.min(top, scene.launch.y - 110 - height), width, height };
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
  drawLauncher(g, scene.look.launcher, L.x, L.y, scene.time, { x: ox, y: oy }, KINDS[scene.cur].color, scene.o.mastered);
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
      const steps = SCOPE_STEPS[scene.o.boosters.scope ? 3 : scene.o.scopeLevel];
      const path = fly(
        STAR_SLING,
        { x: L.x, y: L.y, vx: p.vx, vy: p.vy, elapsed: 0 },
        scene.flightWorld(scene.rot),
        scene.time,
        steps / 30,
      );
      if (path.sector !== null) scene.drawLanding(path.sector);
      g.fillStyle = '#ffffff';
      for (let k = 0; k < steps; k++) {
        const s = path.points[Math.min(path.points.length - 1, (k + 1) * 8 - 1)];
        if (!s || (path.hit && s.elapsed >= path.state.elapsed)) break;
        g.globalAlpha = 0.85 * (1 - k / steps);
        g.beginPath();
        g.arc(s.x, s.y, 3.2 - (k / steps) * 1.8, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
  }
}

export function aimAt(scene: LevelScene, sector: number) {
  const target = ((Math.floor(sector) % SECTORS) + SECTORS) % SECTORS;
  const launch = scene.launch;
  const world = scene.flightWorld(scene.rot);
  for (const speed of [420, 560, 700, 840, 930]) {
    for (let i = 0; i < 180; i++) {
      const angle = -Math.PI + (i / 179) * Math.PI;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      if (fly(STAR_SLING, { ...launch, vx, vy, elapsed: 0 }, world, scene.time, 5).sector === target) return { vx, vy };
    }
  }
  const angle = scene.rot + (target + 0.5) * ((Math.PI * 2) / SECTORS);
  const dx = scene.cx + Math.cos(angle) * scene.R - launch.x;
  const dy = scene.cy + Math.sin(angle) * scene.R - launch.y;
  const length = Math.hypot(dx, dy) || 1;
  return { vx: (dx / length) * 700, vy: (dy / length) * 700 };
}
