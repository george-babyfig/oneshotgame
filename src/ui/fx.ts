import { BIOMES, KINDS, SPECIES_BY_ID, settle, type Planet } from '../core/world';
import { stepRound, NOVA_CHARGE, type RoundState } from '../core/round';
import { fly, STAR_SLING, type FlightLaunch, type FlightWorld } from '../core/flight';
import type { RoundModifiers } from '../core/modifiers';
import { BOSS_HP } from '../core/levels';
import { renderPlanet } from './art/planet';
import { drawCreature } from './art/critters';
import { drawProjectile } from './art/projectiles';
import { drawTrail } from './art/keeper';
import { drawMeteors, drawSeason } from './art/seasons';
import { sfx } from './audio';
import { haptic } from './haptics';
import { t, tp } from '../i18n';
import * as hud from './hud';

import type { LevelScene, Shot } from './game';

const CALLOUTS: [number, string, string][] = [
  [50, 'Paradise!', '#ff8fe0'],
  [32, 'Thriving!', '#ffd84a'],
  [20, 'Blooming!', '#7dffb0'],
  [12, 'Nice!', '#9fe6ff'],
];

export function sparkStart(planet: Planet) {
  for (const i of [3, 11, 19]) planet.sectors[i].life = Math.max(1, planet.sectors[i].life);
  settle(planet);
}

export function drawWind(scene: LevelScene) {
  const g = scene.g;
  const dir = Math.sign(scene.wind);
  g.strokeStyle = 'rgba(200,230,255,0.55)';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  for (let k = 0; k < 18; k++) {
    const y = ((k * 97) % 100) / 100;
    const speed = 60 + ((k * 37) % 50);
    const x = ((((scene.time * speed * dir + k * 131) % (scene.w + 80)) + scene.w + 80) % (scene.w + 80)) - 40;
    g.beginPath();
    g.moveTo(x, y * scene.h);
    g.lineTo(x - dir * (18 + (k % 3) * 8), y * scene.h);
    g.stroke();
  }
}

export function burst(scene: LevelScene, x: number, y: number, color: string, n: number, speed: number) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = (Math.random() * 0.8 + 0.3) * speed * 40;
    const life = 0.4 + Math.random() * 0.6;
    scene.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: 2 + Math.random() * 3.5, color, g: 0 });
  }
}

export function ring(scene: LevelScene, x: number, y: number, color: string, r: number) {
  scene.rings.push({ x, y, t: 0, max: 0.55, r, color });
}

export function hitBoss(scene: LevelScene, x: number, y: number) {
  scene.bossHp--;
  scene.bossFlash = scene.time;
  scene.burst(x, y, '#ff8a3d', 30, 7);
  scene.ring(x, y, '#ffd24a', scene.R * 0.8);
  scene.shake = scene.o.reduceMotion ? 0 : 14;
  haptic.heavy();
  if (scene.bossHp > 0) {
    sfx.impact('magma');
    scene.popup(x, y - 16, tp(scene.bossHp, 'Hit! {n} more', 'Hit! {n} more'), '#ffd24a', 24);
  } else {
    sfx.win();
    scene.burst(x, y, '#fff2b8', 60, 10);
    scene.popup(scene.cx, scene.cy - scene.R * 1.6, t('Guardian defeated!'), '#ffd24a', 30, 2);
    scene.confetti();
  }
}

export function drawBoss(scene: LevelScene) {
  const m = scene.moons[0];
  if (!m) return;
  const g = scene.g;
  const a = scene.time * 0.45;
  const tx = -Math.sin(a);
  const ty = Math.cos(a);
  g.save();
  // tail (behind the direction of travel)
  for (let i = 8; i >= 1; i--) {
    g.globalAlpha = 0.08 + (8 - i) * 0.03;
    g.fillStyle = i % 2 ? '#ff8a3d' : '#ffd24a';
    g.beginPath();
    g.arc(m.x - tx * i * m.r * 0.35, m.y - ty * i * m.r * 0.35, m.r * (1 - i * 0.08), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const flash = scene.time - scene.bossFlash < 0.2;
  const body = g.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r);
  body.addColorStop(0, flash ? '#ffffff' : '#c9b8ff');
  body.addColorStop(1, flash ? '#ffd24a' : '#5a3aa8');
  g.fillStyle = body;
  g.beginPath();
  g.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  g.fill();
  // grumpy face
  g.fillStyle = '#ffffff';
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(m.x + sx * m.r * 0.32, m.y - m.r * 0.05, m.r * 0.18, m.r * 0.2, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#231a33';
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.arc(m.x + sx * m.r * 0.3, m.y, m.r * 0.1, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#231a33';
  g.lineWidth = m.r * 0.08;
  g.lineCap = 'round';
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(m.x + sx * m.r * 0.5, m.y - m.r * 0.32);
    g.lineTo(m.x + sx * m.r * 0.15, m.y - m.r * 0.22);
    g.stroke();
  }
  g.beginPath();
  g.arc(m.x, m.y + m.r * 0.45, m.r * 0.18, 1.15 * Math.PI, 1.85 * Math.PI);
  g.stroke();
  // health pips
  for (let i = 0; i < BOSS_HP; i++) {
    g.fillStyle = i < scene.bossHp ? '#ff6a7a' : 'rgba(255,255,255,0.2)';
    g.beginPath();
    g.arc(m.x + (i - (BOSS_HP - 1) / 2) * m.r * 0.45, m.y - m.r * 1.35, m.r * 0.14, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export function confetti(scene: LevelScene) {
  scene.cheerUntil = scene.time + 2.5;
  scene.emoteAt = scene.time;
  if (scene.o.reduceMotion) return;
  const cols = ['#ffd84a', '#5ef2b0', '#ff8fc8', '#6ec8ff', '#b58cff'];
  for (let k = 0; k < 90; k++) {
    const life = 1.6 + Math.random() * 1.2;
    scene.particles.push({
      x: Math.random() * scene.w,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 80,
      vy: 60 + Math.random() * 140,
      life,
      max: life,
      size: 2.5 + Math.random() * 3,
      color: cols[k % cols.length],
      g: 120,
    });
  }
}

export function popup(scene: LevelScene, x: number, y: number, text: string, color: string, size: number, dur = 1.2) {
  scene.popups.push({ x, y, text, color, size, life: dur, max: dur, vy: -40 });
}

export function draw(scene: LevelScene) {
  const g = scene.g;
  const { w, h: H } = scene;
  g.save();
  // background
  const bg = g.createRadialGradient(scene.cx, scene.cy, scene.R * 0.5, scene.cx, scene.cy, Math.max(w, H));
  bg.addColorStop(0, `hsl(${scene.L.hue} 55% 22%)`);
  bg.addColorStop(0.5, `hsl(${(scene.L.hue + 40) % 360} 50% 10%)`);
  bg.addColorStop(1, '#07061a');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, H);
  for (const s of scene.stars) {
    g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(scene.time * 0.8 + s.tw));
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  if (!scene.o.reduceMotion) {
    if (scene.o.shower) drawMeteors(g, w, H, scene.time, 1.5);
    if (scene.o.season) drawSeason(g, w, H, scene.time, scene.o.season, 0.6, 22);
  }
  if (scene.shake > 0) g.translate((Math.random() - 0.5) * scene.shake, (Math.random() - 0.5) * scene.shake);
  scene.drawPlanet();
  for (const r of scene.rings) {
    const k = r.t / r.max;
    g.globalAlpha = (1 - k) * 0.8;
    g.strokeStyle = r.color;
    g.lineWidth = 4 * (1 - k) + 1;
    g.beginPath();
    g.arc(r.x, r.y, r.r * (0.2 + k), 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;
  if (scene.L.twist === 'boss') scene.drawBoss();
  else
    for (const m of scene.moons) {
      g.fillStyle = '#b9b3c9';
      g.beginPath();
      g.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath();
      g.arc(m.x + m.r * 0.3, m.y + m.r * 0.2, m.r * 0.3, 0, Math.PI * 2);
      g.fill();
    }
  if (scene.L.twist === 'wind') scene.drawWind();
  scene.drawAim();
  // shot
  const sh = scene.shot;
  if (sh) {
    drawTrail(g, scene.look.trail, sh.trail, scene.time, KINDS[sh.kind].color);
    g.globalAlpha = 1;
    // draw between physics steps so the shot glides at any refresh rate (render only)
    const px = sh.x + sh.vx * sh.carry;
    const py = sh.y + sh.vy * sh.carry;
    if (sh.nova) {
      const gl = g.createRadialGradient(px, py, 4, px, py, 40);
      gl.addColorStop(0, 'rgba(255,230,140,0.9)');
      gl.addColorStop(1, 'rgba(255,230,140,0)');
      g.fillStyle = gl;
      g.beginPath();
      g.arc(px, py, 40, 0, Math.PI * 2);
      g.fill();
    }
    drawProjectile(g, sh.kind, px, py, sh.nova ? 38 : 30, scene.time, sh.t * 6);
  }
  // particles
  for (const p of scene.particles) {
    g.globalAlpha = Math.max(0, p.life / p.max);
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // popups
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const p of scene.popups) {
    const k = p.life / p.max;
    g.globalAlpha = Math.min(1, k * 2.5);
    const sc = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
    g.font = `700 ${Math.round(p.size * sc)}px Fredoka, ui-rounded, system-ui, sans-serif`;
    const half = g.measureText(p.text).width / 2 + 8;
    p.x = Math.min(scene.w - half, Math.max(half, p.x));
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(10,6,30,0.85)';
    g.strokeText(p.text, p.x, p.y);
    g.fillStyle = p.color;
    g.fillText(p.text, p.x, p.y);
  }
  g.globalAlpha = 1;
  g.restore();
}

export function drawPlanet(scene: LevelScene) {
  const lifeK = scene.o.endless ? 0.6 : Math.min(1, scene.score / scene.L.stars[2]);
  renderPlanet(scene.g, scene.planet, {
    cx: scene.cx,
    cy: scene.cy,
    R: scene.R,
    rot: scene.rot,
    time: scene.time,
    glow: scene.o.glow,
    lifeK,
    flash: (i) => (scene.flash.find((f) => f.i === i)?.t ?? 0) * 1.4,
    creature: (g, i, x, y, a) => {
      const sp = SPECIES_BY_ID[scene.planet.sectors[i].species!];
      if (!sp) return;
      const anim = scene.spawnAnim.get(i) ?? 0;
      const pop = anim > 0 ? 1 + Math.sin((anim / 0.9) * Math.PI) * 0.8 : 1;
      const size = scene.R * (sp.rarity === 'common' ? 0.2 : sp.rarity === 'uncommon' ? 0.24 : 0.3) * pop;
      drawCreature(g, sp.id, x, y, a + Math.PI / 2, size, scene.time + i, scene.o.festAcc);
    },
  });
}

export function update(scene: LevelScene, dt: number) {
  scene.time += dt;
  if (scene.o.timeLimit && !scene.ended && !scene.modalOpen && scene.timeLeft > 0) {
    scene.timeLeft -= dt;
    scene.renderClock();
    if (scene.timeLeft <= 0) {
      scene.aimFrom = scene.aimTo = null;
      sfx.whoosh();
      scene.popup(scene.cx, scene.cy - scene.R * 1.6, t("Time's up!"), '#ffd84a', 32, 1.6);
      scene.afterShot();
    }
  }
  scene.rot += scene.spinNow() * dt;
  if (scene.shake > 0) scene.shake = Math.max(0, scene.shake - dt * 30);
  // score tween
  if (scene.shownScore !== scene.score) {
    const d = scene.score - scene.shownScore;
    scene.shownScore += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * 0.12));
    if (Math.abs(scene.score - scene.shownScore) < 1) scene.shownScore = scene.score;
    scene.checkStars();
    scene.renderScore();
  }
  const sh = scene.shot;
  if (sh) {
    const launch: FlightLaunch = { x: sh.x, y: sh.y, vx: sh.vx, vy: sh.vy, elapsed: sh.t, carry: sh.carry };
    const path = fly(STAR_SLING, launch, scene.flightWorld(sh.rot0), sh.t0, dt);
    Object.assign(sh, {
      x: path.state.x,
      y: path.state.y,
      vx: path.state.vx,
      vy: path.state.vy,
      t: path.state.elapsed,
      carry: path.state.carry ?? 0,
    });
    if (path.hit?.kind === 'boss') {
      if (sh.nova) {
        scene.charge = 0;
        scene.bossHp = Math.max(1, scene.bossHp - 1);
      }
      scene.hitBoss(sh.x, sh.y);
      scene.shot = null;
      scene.afterShot();
    } else if (path.hit?.kind === 'blocked') {
      scene.burst(sh.x, sh.y, '#c9c3d6', 14, 4);
      scene.popup(sh.x, sh.y - 10, t('Blocked!'), '#fff', 18);
      sfx.miss();
      scene.shot = null;
      scene.afterShot();
    } else if (path.hit?.kind === 'land') {
      scene.land(sh, path.hit.sector);
    } else if (path.hit?.kind === 'miss') {
      scene.popup(Math.min(Math.max(sh.x, 60), scene.w - 60), Math.min(Math.max(sh.y, 120), scene.h - 200), t('Missed!'), '#ffb3c1', 20);
      sfx.miss();
      scene.shot = null;
      scene.afterShot();
    }
    if (scene.shot) {
      sh.trail.push({ x: sh.x, y: sh.y });
      if (sh.trail.length > 18) sh.trail.shift();
      if (Math.random() < 0.6)
        scene.particles.push({
          x: sh.x,
          y: sh.y,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          life: 0.5,
          max: 0.5,
          size: 3,
          color: KINDS[sh.kind].color,
          g: 0,
        });
    }
  }
  for (const p of scene.particles) {
    p.life -= dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
  }
  scene.particles = scene.particles.filter((p) => p.life > 0);
  for (const p of scene.popups) {
    p.life -= dt;
    p.y += p.vy * dt;
    p.vy *= 0.96;
  }
  scene.popups = scene.popups.filter((p) => p.life > 0);
  scene.flash = scene.flash.filter((f) => (f.t -= dt) > 0);
  for (const r of scene.rings) r.t += dt;
  scene.rings = scene.rings.filter((r) => r.t < r.max);
  for (const [k, v] of scene.spawnAnim) {
    if (v - dt <= 0) scene.spawnAnim.delete(k);
    else scene.spawnAnim.set(k, v - dt);
  }
}

export function land(scene: LevelScene, sh: Shot, i: number) {
  scene.shot = null;
  const beforeCharge = scene.charge;
  const res = stepRound(scene.roundState(), { kind: sh.kind, sector: i, nova: sh.nova }, scene.roundModifiers());
  scene.planet = res.state.planet;
  scene.charge = res.state.charge;
  scene.bonus = res.state.bonus;
  scene.regionBests = res.state.regionBests;
  scene.arrived = new Set(res.state.arrived);
  const bonus = res.labBonus;
  const regions = res.after >= res.before ? res.newRegionBests.map((at) => scene.planet.sectors[at].biome) : [];
  // a throw that makes the planet worse earns nothing (M0 churn rule), arrivals included
  const arrivals = res.after >= res.before ? res.firstArrivals.length : 0;
  if (bonus) setTimeout(() => scene.popup(sh.x - 34, sh.y + 16, t('🧪 +{n}', { n: bonus }), '#c9a8ff', 16, 1.2), 380);
  if (sh.nova) {
    scene.ring(sh.x, sh.y, '#ffd24a', scene.R * 1.6);
    scene.burst(sh.x, sh.y, '#fff2b8', 50, 9);
    setTimeout(() => scene.popup(scene.cx, scene.cy - scene.R * 1.5, t('SUPERNOVA!'), '#ffd24a', 32, 1.4), 120);
  } else {
    if (scene.novaOn && beforeCharge < NOVA_CHARGE && scene.charge >= NOVA_CHARGE) {
      setTimeout(() => {
        const L = scene.launch;
        scene.popup(L.x, L.y - 70, t('Supernova charged!'), '#ffd24a', 20, 1.6);
        sfx.levelUp();
        scene.showCoachEvent('nova');
      }, 700);
    }
  }
  sfx.impact(sh.kind);
  haptic.heavy();
  scene.shake = scene.o.reduceMotion ? 0 : 10;
  scene.burst(sh.x, sh.y, KINDS[sh.kind].color, 34, 7);
  scene.ring(sh.x, sh.y, KINDS[sh.kind].color, scene.R * 0.9);
  const delta = res.after - res.before + bonus;
  scene.chain = delta > 0 ? scene.chain + 1 : 0;
  const quality = delta + res.spawned.length * 6;
  const call = CALLOUTS.find(([min]) => quality >= min);
  if (call) {
    const text = scene.chain >= 3 ? `${t(call[1])} ×${scene.chain}` : t(call[1]);
    setTimeout(() => {
      scene.popup(scene.cx, scene.cy + scene.R * 1.45, text, call[2], 34, 1.4);
      sfx.combo(CALLOUTS.length - CALLOUTS.indexOf(call) + Math.min(scene.chain, 4));
      haptic.success();
    }, 260);
  }
  scene.score = res.after + scene.bonus;
  if (res.lost.length) scene.showCoachEvent('wander');
  if (res.spawned.length) scene.showCoachEvent('creature');
  if (res.spawned.length) {
    const first = res.spawned[0];
    hud.flyCreaturePoints(scene, first.at, Math.max(0, delta));
  }
  hud.announceLanding(scene, BIOMES[scene.planet.sectors[i].biome].name, delta, res.spawned[0] && SPECIES_BY_ID[res.spawned[0].id]?.name);
  scene.heat(delta);
  if (regions.length) scene.o.onTransform?.(regions.length);
  if (res.changed.length) {
    scene.cheerUntil = Math.max(scene.cheerUntil, scene.time + 0.9);
  }
  scene.o.onPlanet?.(scene.planet);
  const tokens = scene.o.onLand?.(regions, arrivals);
  if (tokens) setTimeout(() => scene.popup(sh.x + 30, sh.y + 10, `+${tokens} ${scene.o.eventEmoji ?? '⭐'}`, '#ffd84a', 18, 1.3), 500);
  if (delta !== 0) scene.popup(sh.x, sh.y - 20, `${delta > 0 ? '+' : ''}${delta}`, delta > 0 ? '#9dffb0' : '#ff9db0', 26);
  // name up to two newly formed biomes
  const shown = new Set<string>();
  res.changed.forEach((ci, k) => {
    scene.flash.push({ i: ci, t: 0.5 });
    const bname = t(BIOMES[scene.planet.sectors[ci].biome].name);
    if (!shown.has(bname) && shown.size < 2 && scene.planet.sectors[ci].biome !== 'barren') {
      shown.add(bname);
      const [x, y] = scene.sectorPoint(ci, 1.35);
      setTimeout(
        () => {
          scene.popup(x, y, bname, '#ffffff', 15);
          sfx.bloom(k);
        },
        120 + shown.size * 140,
      );
    }
  });
  res.spawned.forEach((s, k) => {
    setTimeout(() => scene.announce(s.id, s.at, res.firstArrivals.includes(s.id)), 350 + k * 450);
  });
  scene.afterShot();
}

export function flightWorld(scene: LevelScene, rotation: number): FlightWorld {
  return {
    cx: scene.cx,
    cy: scene.cy,
    radius: scene.R,
    gravity: STAR_SLING.gravity,
    surface: scene.planet.sectors.map((_, i) => scene.surfaceR(i)),
    rotation,
    spin: scene.L.spin,
    twist: scene.L.twist,
    wind: scene.wind,
    width: scene.w,
    height: scene.h,
    launcherY: scene.launch.y,
    bossActive: scene.bossHp > 0,
  };
}

export function roundState(scene: LevelScene): RoundState {
  return {
    planet: scene.planet,
    charge: scene.charge,
    bonus: scene.bonus,
    regionBests: scene.regionBests,
    arrived: [...scene.arrived],
    novaEnabled: scene.novaOn,
  };
}

export function roundModifiers(scene: LevelScene): RoundModifiers {
  return {
    extraThrows: scene.o.extraThrows,
    splash: scene.o.splash,
    scopeLevel: scene.o.scopeLevel,
    lab: scene.o.lab ?? {},
    boosters: scene.o.boosters,
    momentum: scene.o.momentum ?? 0,
    buddy: scene.o.buddy ?? null,
    shower: !!scene.o.shower,
  };
}

export function moons(scene: LevelScene): { x: number; y: number; r: number }[] {
  if (scene.L.twist === 'boss') {
    if (scene.bossHp <= 0) return [];
    const a = scene.time * 0.45;
    const r = scene.R * 0.3;
    // an ellipse that always stays on screen
    const dx = Math.min(scene.R * 2.15, scene.w / 2 - r * 1.3);
    const dy = Math.max(scene.R * 1.2, Math.min(scene.R * 1.75, scene.launch.y - scene.cy - r - 60));
    return [{ x: scene.cx + Math.cos(a) * dx, y: scene.cy + Math.sin(a) * dy, r }];
  }
  if (scene.L.twist !== 'moon' && scene.L.twist !== 'twin') return [];
  const out = [];
  const a = scene.time * 0.8;
  const d = scene.R * 2.05;
  const dyMax = Math.max(scene.R * 1.3, Math.min(d, scene.launch.y - scene.cy - scene.R * 0.28 - 50));
  out.push({ x: scene.cx + Math.cos(a) * d, y: scene.cy + Math.sin(a) * dyMax, r: scene.R * 0.28 });
  if (scene.L.twist === 'twin') {
    const b = -scene.time * 0.6 + Math.PI;
    const e = scene.R * 1.6;
    out.push({ x: scene.cx + Math.cos(b) * e, y: scene.cy + Math.sin(b) * e, r: scene.R * 0.22 });
  }
  return out;
}

export function resize(scene: LevelScene) {
  const r = scene.el.getBoundingClientRect();
  scene.w = r.width;
  scene.h = r.height;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  scene.canvas.width = Math.round(scene.w * dpr);
  scene.canvas.height = Math.round(scene.h * dpr);
  scene.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = mulberry(scene.L.n * 7919);
  scene.stars = Array.from({ length: 90 }, () => ({ x: rnd() * scene.w, y: rnd() * scene.h, r: rnd() * 1.4 + 0.3, tw: rnd() * 6 }));
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
