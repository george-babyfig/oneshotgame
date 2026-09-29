import { BIOMES, KINDS, SECTORS, SPECIES_BY_ID } from '../core/world';
import { drawCreature } from './art/critters';
import { drawProjectile } from './art/projectiles';
import { drawKeeper, drawLauncher } from './art/keeper';
import { previewStep, NOVA_CHARGE } from '../core/round';
import { fly, STAR_SLING } from '../core/flight';
import { t } from '../i18n';

import type { LevelScene } from './game';

export const MAX_PULL = 150;
export const PULL_TO_SPEED = 6.2;
const SCOPE_STEPS = [16, 28, 44, 90];

export function drawLanding(scene: LevelScene, i: number) {
  const g = scene.g;
  const step = (Math.PI * 2) / SECTORS;
  const a0 = scene.rot + i * step;
  const pulse = 0.55 + Math.sin(scene.time * 10) * 0.25;
  const r = scene.surfaceR(i);
  g.save();
  g.globalAlpha = pulse;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(scene.cx, scene.cy, r + 4, a0 - step * 0.5, a0 + step * 1.5);
  g.stroke();
  g.restore();
  const key = `${i}|${scene.cur}|${scene.throwsUsed}|${scene.charge >= NOVA_CHARGE}`;
  if (scene.predictCache?.key !== key) {
    const res = previewStep(scene.roundState(), { kind: scene.cur, sector: i, nova: scene.charge >= NOVA_CHARGE }, scene.roundModifiers());
    const before = BIOMES[scene.planet.sectors[i].biome];
    const after = BIOMES[res.state.planet.sectors[i].biome];
    scene.predictCache = {
      key,
      label: after.id !== before.id ? `${after.deco} ${t(after.name)}` : '',
      delta: res.after - res.before + res.labBonus,
      spawn: res.spawned.length ? SPECIES_BY_ID[res.spawned[0].id].emoji : '',
    };
  }
  const pc = scene.predictCache;
  if (!pc.label && !pc.delta) return;
  const [x, y] = scene.sectorPoint(i, 1.42);
  const text = `${pc.label}${pc.spawn ? ' ' + pc.spawn : ''}${pc.delta ? `  ${pc.delta > 0 ? '+' : ''}${pc.delta}` : ''}`.trim();
  g.font = '700 14px Fredoka, ui-rounded, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = g.measureText(text).width + 16;
  const cx = Math.min(scene.w - w / 2 - 4, Math.max(w / 2 + 4, x));
  g.fillStyle = 'rgba(10,6,30,0.78)';
  g.beginPath();
  g.roundRect(cx - w / 2, y - 13, w, 26, 13);
  g.fill();
  g.fillStyle = pc.delta >= 0 ? '#bfffd6' : '#ffc0cc';
  g.fillText(text, cx, y + 1);
}

export function drawNovaMeter(scene: LevelScene, x: number, y: number, aiming: boolean) {
  if (!scene.novaOn) return;
  const g = scene.g;
  const k = scene.charge / NOVA_CHARGE;
  const full = k >= 1;
  const R = 50;
  g.save();
  if (full && aiming) {
    const pulse = 0.5 + Math.sin(scene.time * 6) * 0.2;
    const gl = g.createRadialGradient(x, y, 8, x, y, R + 16);
    gl.addColorStop(0, `rgba(255,220,110,${pulse})`);
    gl.addColorStop(1, 'rgba(255,220,110,0)');
    g.fillStyle = gl;
    g.beginPath();
    g.arc(x, y, R + 16, 0, Math.PI * 2);
    g.fill();
  }
  g.lineCap = 'round';
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(255,255,255,0.1)';
  g.beginPath();
  g.arc(x, y, R, 0, Math.PI * 2);
  g.stroke();
  if (k > 0) {
    g.strokeStyle = full ? `hsl(${45 + Math.sin(scene.time * 5) * 10},100%,65%)` : '#ffd24a';
    g.shadowColor = '#ffd24a';
    g.shadowBlur = full ? 14 : 4;
    g.beginPath();
    g.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.min(1, k) * Math.PI * 2);
    g.stroke();
  }
  if (full && aiming) {
    g.shadowBlur = 0;
    g.fillStyle = '#ffe58a';
    g.font = '700 13px Fredoka, ui-rounded, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(t('SUPERNOVA READY'), x, y - R - 12);
  }
  g.restore();
}

export function drawAim(scene: LevelScene) {
  const g = scene.g;
  const L = scene.launch;
  const aiming = !scene.shot && !scene.ended;
  const p = scene.pull();
  const ox = aiming && scene.aimFrom ? -p.vx / PULL_TO_SPEED / 3 : 0;
  const oy = aiming && scene.aimFrom ? -p.vy / PULL_TO_SPEED / 3 : 0;
  // the Keeper stands beside its launcher, leaning back as you pull
  const kx = L.x - Math.min(96, scene.w * 0.24);
  const ky = L.y + 46;
  const cheer = scene.cheerUntil > scene.time ? Math.min(1, (scene.cheerUntil - scene.time) * 3) : 0;
  const bd = scene.o.buddy;
  if (bd) {
    // the buddy hops when land changes and faces the planet
    const hop = cheer > 0 ? Math.abs(Math.sin(scene.time * 9)) * 14 * cheer : Math.abs(Math.sin(scene.time * 2)) * 1.5;
    const bx = kx - Math.min(46, scene.w * 0.11);
    drawCreature(g, bd.species, bx, ky - hop, 0, 26, scene.time + 0.7, bd.acc);
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
  if (aiming) {
    const bounce = scene.aimFrom ? 0 : Math.sin(scene.time * 3) * 3;
    drawProjectile(scene.g, scene.cur, L.x + ox, L.y + oy + bounce, 36, scene.time);
    if (scene.aimFrom && p.len >= 18) {
      // trajectory preview
      const steps = SCOPE_STEPS[scene.o.boosters.scope ? 3 : scene.o.scopeLevel];
      const path = fly(
        STAR_SLING,
        { x: L.x, y: L.y, vx: p.vx, vy: p.vy, elapsed: 0 },
        scene.flightWorld(scene.rot),
        scene.time,
        steps / 30,
      );
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
      if (path.sector !== null) scene.drawLanding(path.sector);
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
