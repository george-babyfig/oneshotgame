import { BIOMES, KINDS, SECTORS, SPECIES_BY_ID } from '../core/world';
import { drawCreature } from './art/critters';
import { drawProjectile } from './art/projectiles';
import { drawKeeper, drawLauncher } from './art/keeper';
import { REACTIONS, novaForThrow, previewStep } from '../core/round';
import { drawReactionIcon, reactionColor } from './art/reactions';
import { flyFull, STAR_SLING } from '../core/flight';
import { needsBonkBadge } from './feel';
import { t } from '../i18n';
import type { LevelScene } from './game';

export const MAX_PULL = 150;
export const PULL_TO_SPEED = 6.2;
export interface DrawnAim {
  vx: number;
  vy: number;
  roundTime: number;
  rotation: number;
  badge: boolean;
}
const SCOPE_STEPS = [16, 28, 44, 90];
const flightCache = new WeakMap<LevelScene, { key: string; path: ReturnType<typeof flyFull> }>();

export function predictFlight(scene: LevelScene, vx: number, vy: number) {
  const key = `${vx}|${vy}|${scene.rot}|${scene.time}|${scene.w}|${scene.h}|${scene.throwsUsed}|${scene.bossHp}|${scene.skyState.brokenRocks.join(',')}`;
  let cached = flightCache.get(scene);
  if (cached?.key !== key) {
    cached = {
      key,
      path: flyFull(STAR_SLING, { ...scene.launch, vx, vy, elapsed: 0 }, scene.flightWorld(scene.rot), scene.time),
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

export function drawLanding(scene: LevelScene, i: number) {
  const key = `${i}|${scene.cur}|${scene.throwsUsed}|${scene.nova.charge}|${scene.nova.held}|${scene.combo.links}|${scene.combo.rest}`;
  if (scene.predictCache?.key !== key) {
    const state = scene.roundState();
    const res = previewStep(state, { kind: scene.cur, sector: i, nova: novaForThrow(state) }, scene.roundModifiers(), scene.rules);
    const after = BIOMES[res.state.planet.sectors[i].biome];
    const lost = res.lost[0];
    const life = res.after - res.before + res.labBonus;
    const creature = res.spawned[0] ? t(SPECIES_BY_ID[res.spawned[0].id].name) : '';
    scene.predictCache = {
      key,
      title: `${after.deco || '●'} ${t(after.name)}${life ? ` · ${t('{n} life', { n: `${life > 0 ? '+' : ''}${life}` })}` : ''}${creature ? ` · ${t('{creature} moves in', { creature })}` : ''}`,
      lost: lost ? t('{creature} wanders off', { creature: t(SPECIES_BY_ID[lost.species].name) }) : '',
      reaction: res.reactions[0]?.id,
      comboStep: res.combo.step,
      comboEnd: !!res.combo.ended && scene.combo.links > 0 && res.combo.links === 0,
      changed: res.changed,
    };
  }
  const pc = scene.predictCache;
  for (const sector of pc.changed) outline(scene, sector, '#ffffff', scene.o.reduceMotion ? 0.9 : 0.65 + Math.sin(scene.time * 8) * 0.2);
  const g = scene.g;
  const { x, y, width, height } = landingCardRect(scene);
  const scale =
    scene.previewTextScale ||
    (scene.previewTextScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-scale')) || 1);
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
  const secondRow = !!pc.reaction || !!pc.lost || pc.comboEnd;
  g.fillText(pc.title, x + width / 2, y + (secondRow ? 17 : height / 2), width - 12);
  const thirdRow = landingNeedsThirdRow(scene, width);
  if (pc.reaction) {
    const def = REACTIONS[pc.reaction];
    const chipY = y + 43;
    g.font = `700 ${Math.round(12 * scale)}px Fredoka, ui-rounded, system-ui, sans-serif`;
    const chipW = Math.min(width - 16, Math.max(76, g.measureText(t(def.name)).width + 48));
    const chipX = x + ((pc.lost || pc.comboEnd) && !thirdRow ? 8 : (width - chipW) / 2);
    g.fillStyle = def.kind === 'fusion' ? '#5b4317' : '#672e38';
    g.strokeStyle = reactionColor(pc.reaction);
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(chipX, chipY - 12, chipW, 24, 12);
    g.fill();
    g.stroke();
    drawReactionIcon(g, pc.reaction, chipX + 15, chipY, 18);
    g.fillStyle = '#fff';
    g.font = `700 ${Math.round(12 * scale)}px Fredoka, ui-rounded, system-ui, sans-serif`;
    g.textAlign = 'left';
    g.fillText(t(def.name), chipX + 29, chipY, chipW - 56);
    if (pc.comboStep >= 2) {
      g.fillStyle = '#ffe38a';
      g.beginPath();
      g.arc(chipX + chipW - 13, chipY, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    if (pc.comboStep >= 4) {
      g.fillStyle = '#a5ef9e';
      g.beginPath();
      g.ellipse(chipX + chipW - 26, chipY - 1, 5, 2.5, -0.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (pc.lost || pc.comboEnd) {
    g.font = `700 ${Math.round(12 * scale)}px Fredoka, ui-rounded, system-ui, sans-serif`;
    g.fillStyle = '#c5c5d2';
    g.textAlign = 'center';
    const label = pc.lost || t('Combo ends');
    if (pc.reaction && !thirdRow) {
      const chipW = Math.min(width - 16, Math.max(76, g.measureText(t(REACTIONS[pc.reaction].name)).width + 48));
      const left = x + 8 + chipW + 10;
      const available = x + width - 8 - left;
      g.textAlign = 'left';
      g.fillText(fitWarning(g, label, available), left, y + 43, available);
    } else {
      g.textAlign = 'center';
      const available = width - (pc.comboEnd ? 52 : 16);
      g.fillText(fitWarning(g, label, available), x + width / 2 + (pc.comboEnd ? 10 : 0), y + (thirdRow ? 68 : 43), available);
    }
    if (pc.comboEnd && (thirdRow || !pc.reaction)) {
      g.strokeStyle = '#a5a5b6';
      g.lineWidth = 2;
      g.beginPath();
      const markY = y + (thirdRow ? 68 : 43);
      g.arc(x + 18, markY, 4, 0, Math.PI * 2);
      g.moveTo(x + 12, markY + 6);
      g.lineTo(x + 24, markY - 6);
      g.stroke();
    }
  }
  g.restore();
}

/** Canvas maxWidth may compress a long translation; shorten only after the 85% limit. */
function fitWarning(g: CanvasRenderingContext2D, label: string, width: number): string {
  if (g.measureText(label).width <= width / 0.85) return label;
  const letters = Array.from(label);
  while (letters.length && g.measureText(`${letters.join('')}…`).width > width) letters.pop();
  return `${letters.join('')}…`;
}

export function landingCardRect(scene: LevelScene) {
  const canvas = scene.canvas.getBoundingClientRect();
  const scale = scene.h / canvas.height;
  const goalsBottom = (scene.goalsEl.getBoundingClientRect().bottom - canvas.top) * scale;
  const bannerBottom = scene.el.querySelector('.banners .show')?.getBoundingClientRect().bottom ?? canvas.top;
  const twistBottom = scene.el.querySelector('.twist')?.getBoundingClientRect().bottom ?? canvas.top;
  const top = Math.max(150, goalsBottom + 8, (bannerBottom - canvas.top) * scale + 8, (twistBottom - canvas.top) * scale + 8);
  const width = Math.min(scene.w - 24, 276);
  const height =
    scene.predictCache && (scene.predictCache.lost || scene.predictCache.reaction || scene.predictCache.comboEnd)
      ? landingNeedsThirdRow(scene, width)
        ? 88
        : 62
      : 34;
  return { x: (scene.w - width) / 2, y: top, width, height };
}

function landingNeedsThirdRow(scene: LevelScene, width: number): boolean {
  const pc = scene.predictCache;
  if (!pc?.reaction || (!pc.lost && !pc.comboEnd)) return false;
  const g = scene.g;
  const scale = scene.previewTextScale || 1;
  g.save();
  g.font = `700 ${Math.round(12 * scale)}px Fredoka, ui-rounded, system-ui, sans-serif`;
  const chipW = Math.min(width - 16, Math.max(76, g.measureText(t(REACTIONS[pc.reaction].name)).width + 48));
  const textW = g.measureText(pc.lost || t('Combo ends')).width;
  g.restore();
  return width - 26 - chipW < textW * 0.85;
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
      const path = predictFlight(scene, p.vx, p.vy);
      scene.drawnAim = { vx: p.vx, vy: p.vy, roundTime: scene.time, rotation: scene.rot, badge: needsBonkBadge(path.hit) };
      if (path.sector !== null) scene.drawLanding(path.sector);
      else scene.predictCache = null;
      g.fillStyle = '#ffffff';
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
      g.globalAlpha = 1;
    }
  }
}

export function aimAt(scene: LevelScene, sector: number, clearSky = false) {
  const target = ((Math.floor(sector) % SECTORS) + SECTORS) % SECTORS;
  const launch = scene.launch;
  const world = scene.flightWorld(scene.rot);
  if (clearSky) world.sky = undefined;
  for (const speed of [420, 560, 700, 840, 930]) {
    for (let i = 0; i < 180; i++) {
      const angle = -Math.PI + (i / 179) * Math.PI;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      if (flyFull(STAR_SLING, { ...launch, vx, vy, elapsed: 0 }, world, scene.time).sector === target) return { vx, vy };
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
