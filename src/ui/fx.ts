import { BIOMES, KINDS, SPECIES_BY_ID, TRAITS, traitOf, neededHabitat, settle, wrap, type Planet, type TraitId } from '../core/world';
import { stepRound, previewStep, novaForThrow, novaReady, REACTIONS, REACTION_IDS, type RoundState, type StepResult } from '../core/round';
import { fly, STAR_SLING, type FlightLaunch, type FlightWorld } from '../core/flight';
import type { RoundModifiers } from '../core/modifiers';
import { BOSS_HP } from '../core/levels';
import { renderPlanet } from './art/planet';
import { drawCreature, drawStillCreature, drawWanderGhost } from './art/critters';
import { aimTagSize } from './aimtag';
import { drawObjectFeelTrail, drawProjectile } from './art/projectiles';
import { drawTrail } from './art/keeper';
import { drawMeteors, drawSeason } from './art/seasons';
import { sfx } from './audio';
import { haptic } from './haptics';
import { t, tp } from '../i18n';
import * as hud from './hud';
import * as preview from './preview';
import { OBJECT_FEEL, advanceFeedback, enqueueFeedback } from './feel';
import { drawReactionIcon, reactionColor } from './art/reactions';
import { drawSkyShape } from './art/sky';
import { OBSTACLES, gustAt, skyShapesAt } from '../core/sky';
import { bonkRefund, rockAfterBonk, surpriseBonk } from './feel';
import { drawShieldPuff, drawTraitBadge } from './art/traits';

import type { LevelScene, Shot } from './game';
import type { TroubleEvent } from '../core/troubles';
import { drawTroubles } from './art/troubles';
import { forecastTroubles } from '../core/troubles';
import { troubleFeel } from './feel';

function logFlightHit(scene: LevelScene, hit: { kind: 'bonk'; by: 'moon' | 'rock' | 'ring' | 'bubble' } | { kind: 'fizzle' | 'miss' }) {
  scene.roundLog.bonks.push(hit.kind === 'bonk' ? hit.by : hit.kind === 'fizzle' ? 'mist' : 'miss');
}

function logRoundStep(
  scene: LevelScene,
  res: { troubleEvents: TroubleEvent[]; reactions: { id: import('../core/round').ReactionId }[]; lost: { species: string }[] },
) {
  scene.roundLog.troubles.push(...res.troubleEvents);
  scene.roundLog.reactions.push(...res.reactions.map((event) => event.id));
  scene.roundLog.wandered.push(...res.lost.map((event) => event.species));
}

function drawHintPulse(scene: LevelScene) {
  if (!scene.o.hintSectors?.length) return;
  const g = scene.g;
  g.save();
  g.strokeStyle = '#fff4a8';
  g.lineWidth = 3;
  g.globalAlpha = scene.o.reduceMotion ? 0.85 : 0.45 + 0.35 * Math.sin(scene.time * 3) ** 2;
  for (const sector of scene.o.hintSectors) {
    const [x, y] = scene.sectorPoint(sector, 0.93);
    g.beginPath();
    g.arc(x, y, scene.R * (scene.o.reduceMotion ? 0.105 : 0.105 + 0.025 * Math.sin(scene.time * 3)), 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

const CALLOUTS: [number, string, string][] = [
  [50, 'Paradise!', '#ff8fe0'],
  [32, 'Thriving!', '#ffd84a'],
  [20, 'Blooming!', '#7dffb0'],
  [12, 'Nice!', '#9fe6ff'],
];

export function sparkStart(planet: Planet, sectors: number[]) {
  for (const i of sectors) planet.sectors[i].life = Math.min(3, planet.sectors[i].life + 1);
  settle(planet);
}

export function drawWind(scene: LevelScene) {
  const g = scene.g;
  const dir = Math.sign(scene.wind);
  g.strokeStyle = 'rgba(200,230,255,0.55)';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  const warning = gustAt(scene.L.sky, scene.time).warning;
  for (let k = 0; k < (warning ? 32 : 18); k++) {
    const y = ((k * 97) % 100) / 100;
    const speed = 60 + ((k * 37) % 50);
    const x = ((((scene.time * speed * dir + k * 131) % (scene.w + 80)) + scene.w + 80) % (scene.w + 80)) - 40;
    g.beginPath();
    g.moveTo(x, y * scene.h);
    g.lineTo(x - dir * (warning ? 30 : 18) - (k % 3) * 8, y * scene.h);
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

export function popup(scene: LevelScene, x: number, y: number, text: string, color: string, size: number, dur = 1.2, priority = 1) {
  scene.feedback = enqueueFeedback(scene.feedback, { x, y, text, color, size, duration: dur, priority, queuedAt: scene.time * 1000 });
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
  if (scene.aimFrom) {
    scene.coachEl.classList.remove('show');
    scene.discoverEl.classList.remove('show');
  }
  const overlayCount = () =>
    Number(scene.popups.length > 0) +
    Number(scene.ghosts.length > 0) +
    Number(!!scene.goalPulse?.sectors.length) +
    Number(!!scene.aimFrom && scene.pull().len >= 18) +
    Number(scene.novaOn && scene.nova.charge >= scene.nova.threshold && !scene.suppressNovaLabel) +
    Number(scene.coachEl.classList.contains('show')) +
    Number(scene.discoverEl.classList.contains('show')) +
    Number(!!document.querySelector('.life-fly'));
  scene.suppressNovaLabel = false;
  if (overlayCount() > 4) scene.suppressNovaLabel = true;
  if (overlayCount() > 4 && scene.goalPulse) scene.goalPulse = null;
  if (overlayCount() > 4) scene.popups = [];
  scene.drawPlanet();
  if (scene.reactionArc && scene.reactionArc.until > scene.time) {
    const { from, to, id, until } = scene.reactionArc;
    const [x1, y1] = scene.sectorPoint(from, 1.24);
    const [x2, y2] = scene.sectorPoint(to, 1.24);
    g.save();
    g.globalAlpha = scene.o.reduceMotion ? 1 : Math.min(1, (until - scene.time) * 2);
    g.strokeStyle = reactionColor(id);
    g.lineWidth = 4;
    g.shadowColor = reactionColor(id);
    g.shadowBlur = scene.o.reduceMotion ? 0 : 12;
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo(scene.cx, scene.cy - scene.R * 1.65, x2, y2);
    g.stroke();
    drawReactionIcon(g, id, (x1 + x2) / 2, Math.min(y1, y2) - 22, 28);
    g.restore();
  }
  preview.drawGoalPulse(scene);
  for (const ghost of scene.ghosts) {
    const progress = scene.o.reduceMotion ? 1 : Math.min(1, (scene.time - ghost.started) / 0.55);
    const [x, y] = scene.sectorPoint(ghost.sector, 1.15 + progress * 0.2);
    drawWanderGhost(g, ghost.species, x, y, scene.R * 0.2, BIOMES[ghost.wants].deco || '●', scene.time, !!scene.o.reduceMotion);
  }
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
  for (const shape of skyShapesAt(
    scene.L.sky,
    scene.skyState,
    { cx: scene.cx, cy: scene.cy, R: scene.R, width: scene.w, height: scene.h, launcherY: scene.launch.y },
    scene.time,
  )) {
    const wobble =
      shape.kind === 'rock' ? scene.rockWobbles.find((entry) => entry.index === shape.index && entry.until > scene.time) : undefined;
    const drawn =
      wobble && shape.kind === 'rock'
        ? { ...shape, x: shape.x + Math.sin((wobble.until - scene.time) * 32) * (wobble.until - scene.time) * 9 }
        : shape;
    drawSkyShape(g, drawn, !!scene.o.clearPalette, !!scene.o.reduceMotion, scene.time);
  }
  scene.drawAim();
  // shot
  const sh = scene.shot;
  if (sh) {
    drawTrail(g, scene.look.trail, sh.trail, scene.time, KINDS[sh.kind].color);
    drawObjectFeelTrail(g, sh.kind, sh.trail, !!sh.nova, !!scene.o.reduceMotion);
    if (sh.nova && sh.trail.length > 1 && !scene.o.reduceMotion) {
      g.strokeStyle = '#ffe69b';
      g.lineWidth = 9;
      g.globalAlpha = 0.55;
      g.beginPath();
      sh.trail.forEach((point, index) => (index ? g.lineTo(point.x, point.y) : g.moveTo(point.x, point.y)));
      g.stroke();
    }
    g.globalAlpha = 1;
    // draw between physics steps so the shot glides at any refresh rate (render only)
    const px = sh.x + sh.vx * sh.carry;
    const py = sh.y + sh.vy * sh.carry;
    if (sh.nova && !scene.o.reduceMotion) {
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
  const placed: { x: number; y: number; width: number; height: number }[] = [];
  const canvas = scene.canvas.getBoundingClientRect();
  const reserved = [
    ...document.querySelectorAll(
      '.level .hud-top, .level .life, .level .goals, .level .trouble-forecast, .level .twist, .level .hint, .level .banners .show, .level .finish:not(.hidden), .level .hud-bottom, .life-fly',
    ),
  ]
    .map((el) => el.getBoundingClientRect())
    .map((r) => ({ x: r.left - canvas.left, y: r.top - canvas.top, width: r.width, height: r.height }));
  if (scene.aimFrom && scene.pull().len >= 18 && scene.aimTagPosition && scene.predictCache)
    reserved.push({ ...scene.aimTagPosition, ...aimTagSize(scene.predictCache.facts, scene.w) });
  if (scene.novaOn && scene.nova.charge >= scene.nova.threshold && !scene.suppressNovaLabel && !scene.aimFrom)
    reserved.push({ x: scene.launch.x - 90, y: scene.launch.y - 80, width: 180, height: 20 });
  for (const ghost of scene.ghosts) {
    const [x, y] = scene.sectorPoint(ghost.sector, 1.35);
    reserved.push({ x: x - 25, y: y - 50, width: 65, height: 55 });
  }
  for (const p of scene.popups) {
    const k = p.life / p.max;
    g.globalAlpha = Math.min(1, k * 2.5);
    const sc = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
    const fontSize = Math.round(p.size * sc);
    g.font = `700 ${fontSize}px Fredoka, ui-rounded, system-ui, sans-serif`;
    const half = Math.min(scene.w / 2 - 8, g.measureText(p.text).width / 2 + 8);
    const height = fontSize + 14;
    let position: { x: number; y: number } | null = null;
    for (const y of [p.y, scene.cy - scene.R * 0.5, scene.cy + scene.R * 0.5, scene.cy, scene.launch.y - 105]) {
      for (const x of [p.x, scene.w / 2, half + 6, scene.w - half - 6]) {
        const px = Math.min(scene.w - half - 4, Math.max(half + 4, x));
        const py = Math.min(scene.h - height / 2 - 12, Math.max(height / 2 + 12, y));
        const box = { x: px - half, y: py - height / 2, width: half * 2, height };
        const used = [
          ...reserved,
          ...placed.map((r) => ({ x: r.x - r.width, y: r.y - r.height / 2, width: r.width * 2, height: r.height })),
        ];
        if (
          used.every(
            (r) =>
              box.x >= r.x + r.width + 4 || box.x + box.width <= r.x - 4 || box.y >= r.y + r.height + 4 || box.y + box.height <= r.y - 4,
          )
        ) {
          position = { x: px, y: py };
          break;
        }
      }
      if (position) break;
    }
    if (!position) continue;
    p.x = position.x;
    p.y = position.y;
    placed.push({ x: p.x, y: p.y, width: half, height });
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(10,6,30,0.85)';
    g.strokeText(p.text, p.x, p.y, half * 2 - 12);
    g.fillStyle = p.color;
    g.fillText(p.text, p.x, p.y, half * 2 - 12);
  }
  g.globalAlpha = 1;
  g.restore();
}

const traitPuffs = new WeakMap<LevelScene, { sector: number; started: number }[]>();

function drawTraitPuffs(scene: LevelScene) {
  const active = (traitPuffs.get(scene) ?? []).filter((puff) => scene.time - puff.started < 0.9);
  traitPuffs.set(scene, active);
  for (const puff of active) {
    const [x, y] = scene.sectorPoint(puff.sector, 1.18);
    drawShieldPuff(scene.g, x, y, scene.o.reduceMotion ? 0 : (scene.time - puff.started) / 0.9);
  }
}

function drawRoundTraitBadges(scene: LevelScene) {
  if (scene.o.gentle || !scene.troubles.some((trouble) => !trouble.settled)) return;
  for (let i = 0; i < scene.planet.sectors.length; i++) {
    const species = scene.planet.sectors[i].species;
    const trait = species ? traitOf(species) : null;
    if (!trait) continue;
    const protectedByTrait = scene.troubles.some(
      (trouble) =>
        !trouble.settled &&
        (trouble.id === 'vent'
          ? trait === 'fireproof' || trait === 'swimmer'
          : trouble.id === 'vine'
            ? trait === 'weedproof' || trait === 'swimmer'
            : trait === 'frostproof'),
    );
    if (!protectedByTrait) continue;
    const [x, y] = scene.sectorPoint(i, 1.38);
    drawTraitBadge(scene.g, x, y, trait, 17);
  }
}

/** Called only for a named trait block from the pure Trouble event list. */
function showTraitBlocks(scene: LevelScene, events: unknown[]) {
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const block = event as { kind?: string; sector?: number; by?: string };
    if (block.kind !== 'blocked' || !Number.isInteger(block.sector) || !(block.by && block.by in TRAITS)) continue;
    const sector = block.sector!;
    traitPuffs.set(scene, [...(traitPuffs.get(scene) ?? []), { sector, started: scene.time }]);
  }
}

export function drawPlanet(scene: LevelScene) {
  const lifeK = scene.o.endless ? 0.6 : Math.min(1, scene.score / scene.L.stars[2]);
  let creatureCount = 0;
  for (const sector of scene.planet.sectors) if (sector.species) creatureCount++;
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
      const walk = scene.o.reduceMotion ? 0 : scene.exitK * 0.45;
      const px = x + (scene.cx - x) * walk;
      const py = y + (scene.cy - y) * walk;
      if (px < -size || px > scene.w + size || py < -size || py > scene.h + size) return;
      if (creatureCount > 24 && anim <= 0) {
        drawStillCreature(g, sp.id, px, py, a + Math.PI / 2, size, scene.o.festAcc);
        return;
      }
      drawCreature(
        g,
        sp.id,
        px,
        py,
        a + Math.PI / 2,
        size,
        creatureCount > 24 || scene.o.reduceMotion ? 0 : scene.time + i,
        scene.o.festAcc,
        false,
        anim > 0 ? 'happy' : 'idle',
        !!scene.o.reduceMotion,
      );
    },
  });
  const pull = scene.pull();
  const aimedSector = !scene.shot && scene.aimFrom && pull.len >= 18 ? preview.predictFlight(scene, pull.vx, pull.vy).sector : null;
  const aimedStep =
    aimedSector === null
      ? null
      : previewStep(
          scene.roundState(),
          { kind: scene.cur, sector: aimedSector, nova: novaForThrow(scene.roundState()) },
          scene.roundModifiers(),
          scene.rules,
        );
  drawTroubles(
    scene.g,
    scene.planet,
    scene.o.gentle ? [] : scene.troubles,
    scene.cx,
    scene.cy,
    scene.R,
    scene.rot,
    scene.time,
    !!scene.o.reduceMotion,
    aimedStep?.state.planet ?? scene.planet,
    aimedStep?.troubleEvents,
    forecastTroubles(scene.roundState(), scene.roundModifiers()),
  );
  drawRoundTraitBadges(scene);
  drawTraitPuffs(scene);
  drawHintPulse(scene);
}

/** P1 Trouble feedback, kept separate from the round log writer. */
function showTroubleEffects(scene: LevelScene, events: TroubleEvent[]) {
  for (const event of events) {
    const [x, y] = scene.sectorPoint(event.sector, 1.22);
    const feel = troubleFeel(event);
    if (event.kind === 'settled') {
      scene.popup(
        x,
        y - 20,
        event.id === 'vent' ? t('Vent cooled!') : t('{name} settled!', { name: t(event.id === 'vine' ? 'Tanglevine' : 'Frost Creep') }),
        feel.color,
        19,
        1.4,
        3,
      );
      if (!scene.o.reduceMotion) scene.ring(x, y, feel.color, 42);
    } else if (event.kind === 'blocked') {
      scene.popup(x, y - 18, preview.safeTroubleText(), feel.color, 15, 1, 2);
    } else {
      scene.popup(
        x,
        y - 18,
        event.id === 'vine' ? t('A vine reached this land') : event.id === 'frost' ? t('A cool breeze') : t('Warm breeze from the vent'),
        feel.color,
        15,
        1,
        2,
      );
    }
    sfx.trouble(event.kind);
    haptic.trouble(event.kind);
    if (!scene.o.reduceMotion) scene.burst(x, y, feel.color, event.kind === 'settled' ? 18 : 8, 3);
  }
}

function applyTroubleState(scene: LevelScene, res: Pick<StepResult, 'state' | 'troubleEvents'>) {
  scene.troubles = res.state.troubles;
  scene.buddyShieldUsed = !!res.state.buddyShieldUsed;
  scene.calmUsed = !!res.state.calmUsed;
  showTroubleEffects(scene, res.troubleEvents);
}

/** P1 cadence for a spent throw that never landed. */
function tickTroublesAfterMiss(scene: LevelScene, sh: Shot) {
  if (!scene.troubles.some((trouble) => !trouble.settled)) return;
  const res = stepRound(
    { ...scene.roundState(), throwsLeft: Number.isFinite(scene.throwsLeft) ? scene.throwsLeft + 1 : scene.throwsLeft },
    { kind: sh.kind, sector: 0, outcome: 'miss' },
    scene.roundModifiers(),
    scene.rules,
  );
  logRoundStep(scene, res);
  scene.planet = res.state.planet;
  applyTroubleState(scene, res);
  scene.nova = res.state.nova;
  scene.score = res.after + scene.bonus;
  scene.predictCache = null;
  for (const lost of res.lost) {
    const [x, y] = scene.sectorPoint(lost.sector, 1.4);
    scene.popup(x, y - 18, t('{creature} wandered off', { creature: t(SPECIES_BY_ID[lost.species].name) }), '#cfd0d9', 16, 1.2, 2);
  }
  scene.renderHud();
}

export function update(scene: LevelScene, dt: number) {
  if (!scene.o.reduceMotion && performance.now() < scene.hitStopUntil) return;
  scene.time += dt;
  if (scene.L.sky.gusty && !scene.gustTipShown && gustAt(scene.L.sky, scene.time).warning) {
    scene.gustTipShown = true;
    scene.popup(scene.cx, scene.cy - scene.R * 1.7, t('A puff of wind!'), '#d7ecff', 16, 1.4);
    sfx.sky('gust');
    haptic.sky();
  }
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
    const launch: FlightLaunch = { x: sh.x, y: sh.y, vx: sh.vx, vy: sh.vy, elapsed: sh.t, carry: sh.carry, bounceCount: sh.bounceCount };
    const path = fly(STAR_SLING, launch, scene.flightWorld(sh.rot0), sh.t0, dt);
    for (const bounce of path.bounces) {
      scene.popup(bounce.x, bounce.y - 16, t('Boing!'), '#b9edff', 18);
      scene.ring(bounce.x, bounce.y, '#b9edff', 25);
      sfx.sky('boing');
      haptic.sky();
    }
    Object.assign(sh, {
      x: path.state.x,
      y: path.state.y,
      vx: path.state.vx,
      vy: path.state.vy,
      t: path.state.elapsed,
      carry: path.state.carry ?? 0,
      bounceCount: path.state.bounceCount ?? sh.bounceCount ?? 0,
    });
    if (
      !scene.mistTipShown &&
      scene.L.sky.obstacle === 'mist' &&
      path.points.some((point) =>
        skyShapesAt(
          scene.L.sky,
          scene.skyState,
          { cx: scene.cx, cy: scene.cy, R: scene.R, width: scene.w, height: scene.h, launcherY: scene.launch.y },
          sh.t0 + point.elapsed,
        ).some((shape) => shape.kind === 'mist' && Math.hypot(point.x - shape.x, point.y - shape.y) < shape.r),
      )
    ) {
      scene.mistTipShown = true;
      scene.popup(sh.x, sh.y - 22, t('The mist gave your shot a wiggle.'), '#d7c8ff', 15);
      sfx.sky('mist');
      haptic.sky();
    }
    if (path.hit?.kind === 'boss') {
      scene.lastHit = path.hit;
      scene.combo = { links: 0, rest: false, best: scene.combo.best };
      scene.comboIconsCurrent = [];
      if (sh.nova) {
        scene.nova = { charge: 0, threshold: 18, fired: scene.nova.fired + 1, held: false };
        scene.bossHp = Math.max(1, scene.bossHp - 1);
      }
      scene.hitBoss(sh.x, sh.y);
      tickTroublesAfterMiss(scene, sh);
      scene.shot = null;
      scene.afterShot();
    } else if (path.hit?.kind === 'bonk' || path.hit?.kind === 'fizzle') {
      const hit = path.hit;
      logFlightHit(scene, hit);
      scene.lastHit = hit;
      if (sh.warnedBonk !== undefined && surpriseBonk(sh.warnedBonk, hit)) scene.surpriseBonks++;
      scene.combo = { links: 0, rest: false, best: scene.combo.best };
      scene.comboIconsCurrent = [];
      const teaching = scene.L.sky.obstacle !== null && scene.L.n === OBSTACLES[scene.L.sky.obstacle].debut;
      const firstPractice = teaching && !scene.practiceBonkUsed;
      const refund = bonkRefund(!!scene.o.gentle, teaching, scene.practiceBonkUsed);
      scene.practiceBonkUsed = refund.practiceUsed;
      if (!(refund.refund && hit.kind === 'bonk' && hit.by === 'rock'))
        scene.burst(sh.x, sh.y, hit.kind === 'fizzle' ? '#d8b1ff' : '#f3d9b5', 22, 4);
      if (hit.kind === 'bonk' && hit.by === 'rock' && hit.rock !== undefined) {
        if (refund.refund) scene.rockWobbles.push({ index: hit.rock, until: scene.time + 0.55 });
        else if (!scene.skyState.brokenRocks.includes(hit.rock)) {
          scene.skyState = rockAfterBonk(scene.skyState, hit.rock, false);
          scene.burst(sh.x, sh.y, '#e8e5ee', 22, 5);
        }
      }
      if (refund.refund) {
        if (Number.isFinite(scene.throwsLeft)) scene.throwsLeft++;
        scene.throwsUsed--;
        scene.qi--;
        scene.next = scene.cur;
        scene.cur = sh.kind;
        scene.renderHud();
      }
      if (!refund.refund) tickTroublesAfterMiss(scene, sh);
      scene.popup(
        sh.x,
        sh.y - 10,
        firstPractice ? t('Practice bonk! Try again') : hit.kind === 'fizzle' ? t('Fizz!') : t('Bonk!'),
        '#fff',
        18,
      );
      sfx.sky(hit.kind === 'fizzle' ? 'fizz' : 'bonk');
      haptic.sky();
      scene.shot = null;
      scene.afterShot();
    } else if (path.hit?.kind === 'land') {
      scene.lastHit = path.hit;
      scene.land(sh, path.hit.sector);
    } else if (path.hit?.kind === 'miss') {
      logFlightHit(scene, { kind: 'miss' });
      scene.lastHit = path.hit;
      scene.combo = { links: 0, rest: false, best: scene.combo.best };
      scene.comboIconsCurrent = [];
      tickTroublesAfterMiss(scene, sh);
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
  scene.feedback = advanceFeedback(scene.feedback, scene.time * 1000);
  scene.popups = scene.feedback.active.map((item) => {
    const elapsed = scene.time - item.startedAt / 1000;
    return {
      x: item.x,
      y: item.y - (scene.o.reduceMotion ? 0 : elapsed * 32),
      text: item.text,
      color: item.color,
      size: item.size,
      life: Math.max(0, item.duration - elapsed),
      max: item.duration,
      vy: 0,
    };
  });
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
  const beforeReady = novaReady(scene.roundState());
  const oldPlanet = scene.planet;
  const oldCombo = scene.combo;
  const res = stepRound(
    { ...scene.roundState(), throwsLeft: Number.isFinite(scene.throwsLeft) ? scene.throwsLeft + 1 : scene.throwsLeft },
    { kind: sh.kind, sector: i, nova: sh.nova },
    scene.roundModifiers(),
    scene.rules,
  );
  showTraitBlocks(scene, res.troubleEvents);
  logRoundStep(scene, res);
  scene.planet = res.state.planet;
  scene.nova = res.state.nova;
  scene.combo = res.state.combo;
  scene.comboCharge = res.state.comboCharge;
  applyTroubleState(scene, res);
  scene.predictCache = null;
  const reaction = res.reactions[0];
  for (const offset of [-1, 0, 1]) {
    const previous = scene.landedKinds[wrap(i + offset)];
    if (
      previous &&
      previous !== sh.kind &&
      !REACTION_IDS.some((id) => REACTIONS[id].pair.includes(previous) && REACTIONS[id].pair.includes(sh.kind))
    )
      scene.o.onPairTried?.(previous, sh.kind);
  }
  for (const sector of res.changed) scene.landedKinds[sector] = sh.kind;
  scene.landedKinds[wrap(i)] = sh.kind;
  if (res.combo.links > 0 && reaction) {
    if (oldCombo.links === 0) scene.comboIconsCurrent = [];
    scene.comboIconsCurrent.push(reaction.id);
    if (res.combo.links > oldCombo.best) scene.comboIconsBest = [...scene.comboIconsCurrent];
  } else if (res.combo.links === 0) scene.comboIconsCurrent = [];
  if (reaction) {
    const def = REACTIONS[reaction.id];
    scene.reactionsSeen.add(reaction.id);
    scene.reactionEvents.push(reaction.id);
    scene.reactionArc = { from: reaction.partner, to: reaction.at, id: reaction.id, until: scene.time + 1.05 };
    scene.hitStopUntil = scene.o.reduceMotion ? 0 : performance.now() + 150;
    const label = res.combo.superFusion
      ? t('SUPER {name}!', { name: t(def.name).toUpperCase() })
      : t('{name}!', { name: t(def.name).toUpperCase() });
    scene.popup(scene.cx, scene.cy - scene.R * 1.35, label, reactionColor(reaction.id), 28, 1.5, 4);
    sfx.reaction(def.kind);
    haptic.reaction(def.kind);
    if (scene.o.onReaction?.(reaction.id).first) hud.showFusionDiscovery(scene, reaction.id);
  }
  if (res.combo.links > 0) scene.o.onCombo?.(res.combo.links, reaction?.id, !!res.combo.superFusion);
  if (res.combo.step >= 2) {
    const [x, y] = scene.sectorPoint(i, 1.55);
    scene.popup(x, y, t('COMBO {n}!', { n: res.combo.step }), '#ffe38a', 23, 1.3, 3);
    sfx.comboStep(res.combo.step);
    haptic.combo();
    if (res.combo.step >= 4) scene.ring(sh.x, sh.y, '#a5ef9e', scene.R * 1.25);
  }
  if (res.combo.links > 0) scene.comboEvents.push({ links: res.combo.links, reaction: reaction?.id, superFusion: !!res.combo.superFusion });
  if (scene.L.n >= 24 && !beforeReady && novaReady(res.state)) hud.showNovaHoldTip(scene);
  scene.bonus = res.state.bonus;
  scene.regionBests = res.state.regionBests;
  scene.arrived = new Set(res.state.arrived);
  const bonus = res.labBonus;
  const regions = res.after >= res.before ? res.newRegionBests.map((at) => scene.planet.sectors[at].biome) : [];
  // a throw that makes the planet worse earns nothing (M0 churn rule), arrivals included
  const arrivals = res.after >= res.before ? res.firstArrivals.length : 0;
  if (res.novaGain > 0) {
    const target = scene.launch;
    for (let spark = 0; !scene.o.reduceMotion && spark < Math.min(12, res.novaGain); spark++) {
      const fraction = (spark + 1) / (res.novaGain + 1);
      const x = sh.x + (target.x - sh.x) * fraction * 0.2;
      const y = sh.y + (target.y - sh.y) * fraction * 0.2;
      scene.particles.push({
        x,
        y,
        vx: (target.x - x) * 2,
        vy: (target.y - y) * 2,
        life: 0.5,
        max: 0.5,
        size: 2.5,
        color: '#ffe78a',
        g: 0,
      });
    }
    scene.popup(target.x, target.y - 70, t('+{n} Supernova', { n: res.novaGain }), '#ffe78a', 16, 1, 0);
  }
  if (bonus) setTimeout(() => scene.popup(sh.x - 34, sh.y + 16, t('🧪 +{n}', { n: bonus }), '#c9a8ff', 16, 1.2), 380);
  if (res.novaFired) {
    if (!scene.o.reduceMotion) scene.ring(sh.x, sh.y, '#ffd24a', scene.R * 1.6);
    scene.burst(sh.x, sh.y, '#fff2b8', scene.o.reduceMotion ? 8 : 50, 9);
    setTimeout(() => scene.popup(scene.cx, scene.cy - scene.R * 1.5, t('SUPERNOVA!'), '#ffd24a', 32, 1.4, 3), 120);
  } else {
    if (scene.novaOn && !beforeReady && novaReady(res.state)) {
      setTimeout(() => {
        sfx.levelUp();
        if (scene.L.n < 24) scene.showCoachEvent('nova');
      }, 700);
    }
  }
  sfx.objectImpact(sh.kind);
  haptic.object(sh.kind);
  scene.shake = scene.o.reduceMotion ? 0 : 10;
  scene.burst(sh.x, sh.y, OBJECT_FEEL[sh.kind].burst, scene.o.reduceMotion ? 10 : 34, 7);
  scene.ring(sh.x, sh.y, OBJECT_FEEL[sh.kind].burst, scene.R * 0.9);
  const delta = res.after - res.before + bonus;
  const quality = delta + res.spawned.length * 6;
  const call = CALLOUTS.find(([min]) => quality >= min);
  if (call) {
    setTimeout(() => {
      scene.popup(scene.cx, scene.cy + scene.R * 1.45, t(call[1]), call[2], 28, 1.4, 0);
      sfx.combo(CALLOUTS.length - CALLOUTS.indexOf(call));
      haptic.success();
    }, 260);
  }
  scene.score = res.after + scene.bonus;
  if (res.lost.length) scene.showCoachEvent('wander');
  for (const lost of res.lost) {
    const wants = neededHabitat(lost.species, scene.planet, lost.sector) ?? oldPlanet.sectors[lost.sector]?.biome;
    if (!wants) continue;
    scene.ghosts = scene.ghosts.filter((ghost) => ghost.sector !== lost.sector);
    scene.ghosts.push({ species: lost.species, sector: lost.sector, wants, started: scene.time, throw: scene.throwsUsed });
    scene.ghosts = scene.ghosts.slice(-2);
    const [x, y] = scene.sectorPoint(lost.sector, 1.4);
    scene.popup(x, y - 18, t('{creature} wandered off', { creature: t(SPECIES_BY_ID[lost.species].name) }), '#cfd0d9', 16, 1.2, 2);
  }
  let returnShown = false;
  for (const returned of res.cameBack) {
    scene.ghosts = scene.ghosts.filter((ghost) => ghost.species !== returned.species);
    if (!returnShown) {
      const [x, y] = scene.sectorPoint(returned.sector, 1.4);
      scene.popup(x, y - 18, t('{creature} came back!', { creature: t(SPECIES_BY_ID[returned.species].name) }), '#bfffd6', 19, 1.2, 3);
      window.setTimeout(() => haptic.success(), 180);
      returnShown = true;
    }
  }
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
    sky: scene.L.sky,
    skyState: scene.skyState,
  };
}

export function roundState(scene: LevelScene): RoundState {
  return {
    planet: scene.planet,
    charge: scene.nova.charge,
    nova: { ...scene.nova },
    combo: { ...scene.combo },
    comboCharge: scene.comboCharge,
    throwsLeft: scene.throwsLeft,
    bonus: scene.bonus,
    regionBests: scene.regionBests,
    arrived: [...scene.arrived],
    novaEnabled: scene.novaOn,
    queueIndex: scene.qi - 1,
    troubles: scene.troubles,
    buddyShieldUsed: scene.buddyShieldUsed,
    calmUsed: scene.calmUsed,
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
    buddyShield: (scene.o as typeof scene.o & { buddyShield?: TraitId | null }).buddyShield ?? null,
    shower: !!scene.o.shower,
    gentle: !!scene.o.gentle,
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
  scene.w = scene.el.clientWidth;
  scene.h = scene.el.clientHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  scene.canvas.width = Math.round(scene.w * dpr);
  scene.canvas.height = Math.round(scene.h * dpr);
  scene.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  scene.renderScore();
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
