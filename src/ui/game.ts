import { BIOMES, KINDS, SECTORS, SPECIES_BY_ID, clonePlanet, impact, lifeScore, settle, type Kind, type Planet } from '../core/world';
import { starsFor, type LevelDef } from '../core/levels';
import { h, btn, fmt, modal, type Modal } from './dom';
import { sfx } from './audio';
import { haptic } from './haptics';

export interface SceneOpts {
  scopeLevel: number; // 0..3 aim guide length
  splash: number; // 0..1
  extraThrows: number;
  boosters: { shower: boolean; spark: boolean; scope: boolean };
  glow: string;
  seen: Set<string>;
  tutorial: boolean;
  reduceMotion?: boolean;
  gems: () => number;
  spendGems: (n: number) => boolean;
  continueCost: (i: number) => number;
  onNewSpecies: (id: string) => void;
  onSpecies?: (id: string) => void;
  onThrow?: () => void;
  onTransform?: (regions: number) => void;
  onEnd: (r: LevelResult) => void;
  onQuit: () => void;
  onShop: () => void;
}

export interface LevelResult {
  level: LevelDef;
  score: number;
  stars: number;
  planet: Planet;
  won: boolean;
  throwsUsed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  g: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  max: number;
  vy: number;
}

interface Shot {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  trail: { x: number; y: number }[];
}

const GM = 5.2e7; // gravity strength (px^3/s^2)
const MAX_PULL = 150;
const PULL_TO_SPEED = 6.2;
const SCOPE_STEPS = [16, 28, 44, 90];

// --------------------------------------------------------------- emoji cache
const emojiCache = new Map<string, HTMLCanvasElement>();
function emoji(e: string, size: number): HTMLCanvasElement {
  const s = Math.max(8, Math.round(size));
  const key = `${e}|${s}`;
  let c = emojiCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.ceil(s * 1.3 * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.fillText(e, (s * 1.3) / 2, (s * 1.3) / 2 + s * 0.05);
  emojiCache.set(key, c);
  return c;
}

function drawEmoji(g: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, rot = 0, alpha = 1) {
  const c = emoji(e, size);
  const w = size * 1.3;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.drawImage(c, -w / 2, -w / 2, w, w);
  g.restore();
}

export class LevelScene {
  el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private L: LevelDef;
  private o: SceneOpts;
  planet: Planet;
  private throwsLeft: number;
  private throwsUsed = 0;
  private qi = 0; // index of the next object to deal
  private cur: Kind;
  private next: Kind;
  private shot: Shot | null = null;
  private aimFrom: { x: number; y: number } | null = null;
  private aimTo: { x: number; y: number } | null = null;
  private rot = 0;
  private time = 0;
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private shake = 0;
  private flash: { i: number; t: number }[] = [];
  private spawnAnim = new Map<number, number>(); // sector -> anim time
  private score: number;
  private shownScore: number;
  private starsGot = 0;
  private continues = 0;
  private ended = false;
  private paused = false;
  private raf = 0;
  private last = 0;
  private w = 0;
  private h = 0;
  private stars: { x: number; y: number; r: number; tw: number }[] = [];
  private lastPullTick = 0;
  private modalOpen: Modal | null = null;
  private hintShown: boolean;
  // HUD refs
  private hudThrows!: HTMLElement;
  private hudFill!: HTMLElement;
  private hudScore!: HTMLElement;
  private hudStars: HTMLElement[] = [];
  private curEl!: HTMLElement;
  private nextEl!: HTMLElement;
  private descEl!: HTMLElement;
  private hintEl!: HTMLElement;

  constructor(level: LevelDef, opts: SceneOpts) {
    this.L = level;
    this.o = opts;
    this.planet = clonePlanet(level.start);
    if (opts.boosters.spark) {
      for (const i of [3, 11, 19]) this.planet.sectors[i].life = Math.max(1, this.planet.sectors[i].life);
      settle(this.planet);
    }
    this.throwsLeft = level.throws + opts.extraThrows + (opts.boosters.shower ? 3 : 0);
    this.cur = level.queue[0];
    this.next = level.queue[1];
    this.qi = 2;
    this.score = lifeScore(this.planet);
    this.shownScore = this.score;
    this.hintShown = opts.tutorial;
    this.canvas = h('canvas', { class: 'game-canvas' });
    this.g = this.canvas.getContext('2d')!;
    this.el = h('div', { class: 'screen level' }, this.canvas, this.buildHud());
    this.bindInput();
    requestAnimationFrame(() => {
      this.resize();
      this.renderHud();
      this.raf = requestAnimationFrame(this.frame);
    });
    window.addEventListener('resize', this.resize);
  }

  // ---------------------------------------------------------------- HUD
  private buildHud(): HTMLElement {
    this.hudThrows = h('div', { class: 'hud-throws' });
    this.hudFill = h('div', { class: 'life-fill' });
    this.hudScore = h('div', { class: 'life-score' });
    const bar = h('div', { class: 'life-bar' }, this.hudFill);
    const max = this.barMax();
    this.hudStars = this.L.stars.map((t) => {
      const s = h('div', { class: 'life-star', style: `left:${(t / max) * 100}%` }, '★');
      bar.append(s);
      return s;
    });
    this.curEl = h('button', { class: 'obj cur', 'aria-label': 'Current object' });
    this.nextEl = h('button', { class: 'obj next', 'aria-label': 'Swap with next object' });
    this.nextEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.swap();
    });
    this.descEl = h('div', { class: 'obj-desc' });
    this.hintEl = h('div', { class: 'hint' }, h('div', { class: 'hint-hand' }, '👆'), h('div', null, 'Pull back & release to fling'));
    const twist = this.L.twist !== 'none' ? h('div', { class: 'twist' }, this.twistLabel()) : null;
    return h(
      'div',
      { class: 'hud' },
      h(
        'div',
        { class: 'hud-top' },
        h('button', { class: 'icon', 'aria-label': 'Pause', onclick: () => this.pause() }, 'Ⅱ'),
        h(
          'div',
          { class: 'hud-title' },
          h('div', { class: 'hud-level' }, `Planet ${this.L.n}`),
          h('div', { class: 'hud-name' }, this.L.name),
        ),
        this.hudThrows,
      ),
      h('div', { class: 'life' }, bar, this.hudScore),
      twist,
      h(
        'div',
        { class: 'hud-bottom' },
        h(
          'div',
          { class: 'queue' },
          this.curEl,
          h('div', { class: 'next-wrap' }, this.nextEl, h('div', { class: 'swap-lbl' }, 'tap to swap')),
        ),
        this.descEl,
      ),
      this.hintShown ? this.hintEl : null,
    );
  }

  private twistLabel() {
    const map: Record<string, string> = {
      fast: '🌀 Fast Spin',
      tiny: '🔹 Tiny World',
      moon: '🌑 A moon blocks shots',
      hot: '🔥 Scorched start',
      frozen: '🧊 Frozen start',
      ocean: '🌊 Water World',
    };
    return map[this.L.twist] ?? '';
  }

  private barMax() {
    return Math.round(this.L.stars[2] * 1.12);
  }

  private renderHud() {
    this.hudThrows.replaceChildren(h('span', { class: 'n' }, String(this.throwsLeft)), h('span', { class: 'l' }, 'throws'));
    this.hudThrows.classList.toggle('low', this.throwsLeft <= 2);
    const k = KINDS[this.cur];
    const n = KINDS[this.next];
    this.curEl.textContent = k.emoji;
    this.curEl.style.setProperty('--c', k.color);
    this.nextEl.textContent = n.emoji;
    this.nextEl.style.setProperty('--c', n.color);
    this.descEl.replaceChildren(h('b', null, k.name), ` — ${k.desc}`);
    this.renderScore();
  }

  private renderScore() {
    const max = this.barMax();
    this.hudFill.style.width = `${Math.min(100, (this.shownScore / max) * 100)}%`;
    this.hudScore.textContent = `${fmt(this.shownScore)} life`;
    this.hudStars.forEach((s, i) => s.classList.toggle('on', this.shownScore >= this.L.stars[i]));
  }

  private swap() {
    if (this.shot || this.ended) return;
    [this.cur, this.next] = [this.next, this.cur];
    sfx.click();
    haptic.tick();
    this.renderHud();
    this.curEl.classList.remove('pop');
    void this.curEl.offsetWidth;
    this.curEl.classList.add('pop');
  }

  // ---------------------------------------------------------------- geometry
  private resize = () => {
    const r = this.el.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = mulberry(this.L.n * 7919);
    this.stars = Array.from({ length: 90 }, () => ({ x: rnd() * this.w, y: rnd() * this.h, r: rnd() * 1.4 + 0.3, tw: rnd() * 6 }));
  };

  private get cx() {
    return this.w / 2;
  }
  private get cy() {
    return this.h * 0.43;
  }
  private get R() {
    return Math.min(this.w * 0.27, this.h * 0.17) * this.L.size;
  }
  private get launch() {
    return { x: this.w / 2, y: this.h - 150 };
  }
  private get moon() {
    if (this.L.twist !== 'moon') return null;
    const a = this.time * 0.8;
    const d = this.R * 2.05;
    return { x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * d, r: this.R * 0.28 };
  }

  // ---------------------------------------------------------------- input
  private bindInput() {
    const pos = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.shot || this.ended || this.paused || this.modalOpen) return;
      this.canvas.setPointerCapture(e.pointerId);
      this.aimFrom = pos(e);
      this.aimTo = pos(e);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.aimFrom) return;
      this.aimTo = pos(e);
      const p = this.pull();
      const k = Math.floor((p.len / MAX_PULL) * 8);
      if (k !== this.lastPullTick) {
        this.lastPullTick = k;
        sfx.stretch(p.len / MAX_PULL);
        haptic.tick();
      }
    });
    const release = () => {
      if (!this.aimFrom) return;
      const p = this.pull();
      this.aimFrom = this.aimTo = null;
      if (p.len < 18) return; // treat as a tap
      this.fire(p.vx, p.vy);
    };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', () => (this.aimFrom = this.aimTo = null));
  }

  private pull() {
    if (!this.aimFrom || !this.aimTo) return { vx: 0, vy: 0, len: 0 };
    let dx = this.aimFrom.x - this.aimTo.x;
    let dy = this.aimFrom.y - this.aimTo.y;
    const len = Math.hypot(dx, dy);
    if (len > MAX_PULL) {
      dx *= MAX_PULL / len;
      dy *= MAX_PULL / len;
    }
    const l = Math.min(len, MAX_PULL);
    return { vx: dx * PULL_TO_SPEED, vy: dy * PULL_TO_SPEED, len: l };
  }

  private fire(vx: number, vy: number) {
    const { x, y } = this.launch;
    this.shot = { kind: this.cur, x, y, vx, vy, t: 0, trail: [] };
    this.throwsLeft--;
    this.throwsUsed++;
    sfx.launch();
    haptic.medium();
    this.o.onThrow?.();
    if (this.hintShown) {
      this.hintShown = false;
      this.hintEl.remove();
    }
    // deal the next object
    this.cur = this.next;
    this.next = this.L.queue[this.qi % this.L.queue.length];
    this.qi++;
    this.renderHud();
  }

  // ---------------------------------------------------------------- physics
  private step(s: { x: number; y: number; vx: number; vy: number }, dt: number) {
    const dx = this.cx - s.x;
    const dy = this.cy - s.y;
    const r2 = Math.max(dx * dx + dy * dy, 400);
    const r = Math.sqrt(r2);
    const a = GM / r2;
    s.vx += (dx / r) * a * dt;
    s.vy += (dy / r) * a * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }

  private hitSector(x: number, y: number): number {
    const ang = Math.atan2(y - this.cy, x - this.cx) - this.rot;
    const t = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(t / ((Math.PI * 2) / SECTORS)) % SECTORS;
  }

  private surfaceR(i: number) {
    const s = this.planet.sectors[i];
    const top = BIOMES[s.biome].sea ? Math.max(s.land, s.water) : s.land;
    return this.R * (0.92 + top * 0.035);
  }

  private update(dt: number) {
    this.time += dt;
    this.rot += this.L.spin * dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    // score tween
    if (this.shownScore !== this.score) {
      const d = this.score - this.shownScore;
      this.shownScore += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * 0.12));
      if (Math.abs(this.score - this.shownScore) < 1) this.shownScore = this.score;
      const got = starsFor(this.shownScore, this.L.stars);
      if (got > this.starsGot) {
        this.starsGot = got;
        sfx.star(got - 1);
        haptic.success();
        const s = this.hudStars[got - 1];
        s.classList.remove('pop');
        void s.offsetWidth;
        s.classList.add('pop');
      }
      this.renderScore();
    }
    const sh = this.shot;
    if (sh) {
      const sub = 4;
      for (let k = 0; k < sub && this.shot; k++) {
        this.step(sh, dt / sub);
        sh.t += dt / sub;
        const d = Math.hypot(sh.x - this.cx, sh.y - this.cy);
        const i = this.hitSector(sh.x, sh.y);
        const m = this.moon;
        if (m && Math.hypot(sh.x - m.x, sh.y - m.y) < m.r + 8) {
          this.burst(sh.x, sh.y, '#c9c3d6', 14, 4);
          this.popup(sh.x, sh.y - 10, 'Blocked!', '#fff', 18);
          sfx.miss();
          this.shot = null;
          this.afterShot();
          break;
        }
        if (d <= this.surfaceR(i) + 6) {
          this.land(sh, i);
          break;
        }
        if (sh.t > 5 || sh.x < -150 || sh.x > this.w + 150 || sh.y < -250 || sh.y > this.h + 150) {
          this.popup(Math.min(Math.max(sh.x, 60), this.w - 60), Math.min(Math.max(sh.y, 120), this.h - 200), 'Missed!', '#ffb3c1', 20);
          sfx.miss();
          this.shot = null;
          this.afterShot();
          break;
        }
      }
      if (this.shot) {
        sh.trail.push({ x: sh.x, y: sh.y });
        if (sh.trail.length > 18) sh.trail.shift();
        if (Math.random() < 0.6)
          this.particles.push({
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
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.vy *= 0.96;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    this.flash = this.flash.filter((f) => (f.t -= dt) > 0);
    for (const [k, v] of this.spawnAnim) {
      if (v - dt <= 0) this.spawnAnim.delete(k);
      else this.spawnAnim.set(k, v - dt);
    }
  }

  private land(sh: Shot, i: number) {
    this.shot = null;
    const res = impact(this.planet, sh.kind, i, this.o.splash);
    sfx.impact(sh.kind);
    haptic.heavy();
    this.shake = 10;
    this.burst(sh.x, sh.y, KINDS[sh.kind].color, 34, 7);
    const delta = res.after - res.before;
    this.score = res.after;
    if (res.changed.length) this.o.onTransform?.(res.changed.length);
    if (delta !== 0) this.popup(sh.x, sh.y - 20, `${delta > 0 ? '+' : ''}${delta}`, delta > 0 ? '#9dffb0' : '#ff9db0', 26);
    // name up to two newly formed biomes
    const shown = new Set<string>();
    res.changed.forEach((ci, k) => {
      this.flash.push({ i: ci, t: 0.5 });
      const bname = BIOMES[this.planet.sectors[ci].biome].name;
      if (!shown.has(bname) && shown.size < 2 && this.planet.sectors[ci].biome !== 'barren') {
        shown.add(bname);
        const [x, y] = this.sectorPoint(ci, 1.35);
        setTimeout(
          () => {
            this.popup(x, y, bname, '#ffffff', 15);
            sfx.bloom(k);
          },
          120 + shown.size * 140,
        );
      }
    });
    res.spawned.forEach((s, k) => {
      setTimeout(() => this.announce(s.id, s.at), 350 + k * 450);
    });
    this.afterShot();
  }

  private announce(id: string, at: number) {
    const sp = SPECIES_BY_ID[id];
    this.spawnAnim.set(at, 0.9);
    const [x, y] = this.sectorPoint(at, 1.55);
    const rare = sp.rarity === 'rare' || sp.rarity === 'legendary';
    const isNew = !this.o.seen.has(id);
    this.o.onSpecies?.(id);
    sfx.creature(rare || isNew);
    haptic.success();
    this.burst(x, y, rare ? '#ffd84a' : '#ffffff', rare ? 40 : 20, rare ? 7 : 4);
    this.popup(x, y - 16, `${sp.emoji} ${sp.name}${isNew ? ' — NEW!' : ''}`, rare ? '#ffd84a' : '#e0f7ff', rare ? 20 : 16, 2.2);
    if (isNew) {
      this.o.seen.add(id);
      this.o.onNewSpecies(id);
    }
  }

  private endTimer = 0;
  private afterShot() {
    this.renderHud();
    if (this.throwsLeft <= 0) {
      clearTimeout(this.endTimer);
      this.endTimer = window.setTimeout(() => this.checkEnd(), 1400);
    }
  }

  private checkEnd() {
    if (this.shot || this.ended || this.modalOpen || this.throwsLeft > 0) return;
    this.shownScore = this.score;
    this.renderScore();
    const stars = starsFor(this.score, this.L.stars);
    this.endModal(stars);
  }

  private endModal(stars: number) {
    const cost = this.o.continueCost(this.continues);
    const canCont = this.continues < 3;
    const won = stars > 0;
    const finish = () => {
      m.close();
      this.modalOpen = null;
      this.finish(stars);
    };
    const cont = () => {
      if (!this.o.spendGems(cost)) {
        m.close();
        this.modalOpen = null;
        this.o.onShop();
        return;
      }
      m.close();
      this.modalOpen = null;
      this.continues++;
      this.throwsLeft += 5;
      sfx.gem();
      haptic.success();
      this.renderHud();
    };
    const need = won ? (stars < 3 ? this.L.stars[stars] - this.score : 0) : this.L.stars[0] - this.score;
    const m = modal(
      [
        h('div', { class: 'end-title' + (won ? '' : ' lost') }, won ? 'Planet complete!' : 'Out of throws'),
        h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★'))),
        h('div', { class: 'end-score' }, `${fmt(this.score)} life`),
        need > 0
          ? h('p', { class: 'end-need' }, won ? `Only ${fmt(need)} life from the next star!` : `Just ${fmt(need)} life short of a star.`)
          : null,
        canCont && (need > 0 || !won)
          ? btn(
              h('span', { class: 'stack' }, h('b', null, '+5 THROWS'), h('small', null, `💎 ${cost} · you have ${this.o.gems()}`)),
              'gem wide',
              cont,
            )
          : null,
        won
          ? btn('Collect', 'primary wide', finish)
          : btn('Try again', 'primary wide', () => {
              m.close();
              this.modalOpen = null;
              this.finish(0);
            }),
      ],
      { dismiss: false, cls: 'end' },
    );
    this.modalOpen = m;
    if (won) {
      sfx.win();
      haptic.success();
    } else {
      sfx.lose();
      haptic.warn();
    }
  }

  private finish(stars: number) {
    if (this.ended) return;
    this.ended = true;
    this.o.onEnd({ level: this.L, score: this.score, stars, planet: this.planet, won: stars > 0, throwsUsed: this.throwsUsed });
  }

  private pause() {
    if (this.ended || this.modalOpen) return;
    this.paused = true;
    const m = modal(
      [
        h('div', { class: 'end-title' }, 'Paused'),
        btn('Resume', 'primary wide', () => m.close()),
        btn('Restart planet', 'ghost wide', () => {
          m.close();
          this.ended = true;
          this.o.onEnd({ level: this.L, score: 0, stars: 0, planet: this.planet, won: false, throwsUsed: -1 });
        }),
        btn('Leave to galaxy', 'ghost wide', () => {
          m.close();
          this.ended = true;
          this.o.onQuit();
        }),
      ],
      { onClose: () => (this.paused = false) },
    );
  }

  // ---------------------------------------------------------------- fx helpers
  private burst(x: number, y: number, color: string, n: number, speed: number) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const v = (Math.random() * 0.8 + 0.3) * speed * 40;
      const life = 0.4 + Math.random() * 0.6;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: 2 + Math.random() * 3.5, color, g: 0 });
    }
  }

  private popup(x: number, y: number, text: string, color: string, size: number, dur = 1.2) {
    this.popups.push({ x, y, text, color, size, life: dur, max: dur, vy: -40 });
  }

  private sectorPoint(i: number, k: number): [number, number] {
    const a = this.rot + (i + 0.5) * ((Math.PI * 2) / SECTORS);
    const r = this.R * k;
    return [this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r];
  }

  // ---------------------------------------------------------------- render
  private frame = (now: number) => {
    const dt = Math.min(0.033, (now - (this.last || now)) / 1000);
    this.last = now;
    if (!this.paused) this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    const g = this.g;
    const { w, h: H } = this;
    g.save();
    // background
    const bg = g.createRadialGradient(this.cx, this.cy, this.R * 0.5, this.cx, this.cy, Math.max(w, H));
    bg.addColorStop(0, `hsl(${this.L.hue} 55% 22%)`);
    bg.addColorStop(0.5, `hsl(${(this.L.hue + 40) % 360} 50% 10%)`);
    bg.addColorStop(1, '#07061a');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, H);
    for (const s of this.stars) {
      g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 0.8 + s.tw));
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    if (this.shake > 0) g.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.drawPlanet();
    const m = this.moon;
    if (m) {
      g.fillStyle = '#b9b3c9';
      g.beginPath();
      g.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath();
      g.arc(m.x + m.r * 0.3, m.y + m.r * 0.2, m.r * 0.3, 0, Math.PI * 2);
      g.fill();
    }
    this.drawAim();
    // shot
    const sh = this.shot;
    if (sh) {
      sh.trail.forEach((p, k) => {
        g.globalAlpha = (k / sh.trail.length) * 0.5;
        g.fillStyle = KINDS[sh.kind].color;
        g.beginPath();
        g.arc(p.x, p.y, 3 + k * 0.4, 0, Math.PI * 2);
        g.fill();
      });
      g.globalAlpha = 1;
      drawEmoji(g, KINDS[sh.kind].emoji, sh.x, sh.y, 34, sh.t * 6);
    }
    // particles
    for (const p of this.particles) {
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
    for (const p of this.popups) {
      const k = p.life / p.max;
      g.globalAlpha = Math.min(1, k * 2.5);
      const sc = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
      g.font = `700 ${Math.round(p.size * sc)}px Fredoka, ui-rounded, system-ui, sans-serif`;
      const half = g.measureText(p.text).width / 2 + 8;
      p.x = Math.min(this.w - half, Math.max(half, p.x));
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(10,6,30,0.85)';
      g.strokeText(p.text, p.x, p.y);
      g.fillStyle = p.color;
      g.fillText(p.text, p.x, p.y);
    }
    g.globalAlpha = 1;
    g.restore();
  }

  private drawPlanet() {
    const g = this.g;
    const { cx, cy, R } = this;
    const step = (Math.PI * 2) / SECTORS;
    const lifeK = Math.min(1, this.score / this.L.stars[2]);
    // atmosphere
    const glow =
      this.o.glow === 'aurora'
        ? `hsl(${(this.time * 40) % 360} 90% 65%)`
        : this.o.glow === 'cosmic'
          ? `hsl(${265 + Math.sin(this.time * 1.5) * 45} 95% 68%)`
          : this.o.glow;
    const atm = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * (1.45 + lifeK * 0.25));
    atm.addColorStop(0, glow + '');
    atm.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.25 + lifeK * 0.35;
    g.fillStyle = atm;
    g.beginPath();
    g.arc(cx, cy, R * 1.8, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    // planet body: soil disc with soft strata, crust ring coloured by biome
    const body = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    body.addColorStop(0, '#8a7596');
    body.addColorStop(1, '#4a3b5c');
    g.fillStyle = body;
    g.beginPath();
    g.arc(cx, cy, R * 0.86, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 2;
    for (const k of [0.35, 0.55, 0.72]) {
      g.beginPath();
      g.arc(cx, cy, R * k, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < SECTORS; i++) {
      const s = this.planet.sectors[i];
      const B = BIOMES[s.biome];
      const a0 = this.rot + i * step;
      const r = this.surfaceR(i);
      g.fillStyle = B.color;
      g.beginPath();
      g.arc(cx, cy, r, a0 - 0.006, a0 + step + 0.006);
      g.arc(cx, cy, R * 0.8, a0 + step + 0.006, a0 - 0.006, true);
      g.closePath();
      g.fill();
      const f = this.flash.find((x) => x.i === i);
      if (f) {
        g.globalAlpha = f.t * 1.4;
        g.fillStyle = '#ffffff';
        g.fill();
        g.globalAlpha = 1;
      }
    }
    const shade = g.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R * 1.25);
    shade.addColorStop(0, 'rgba(255,255,255,0.22)');
    shade.addColorStop(0.55, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(0,0,20,0.4)');
    g.fillStyle = shade;
    g.beginPath();
    g.arc(cx, cy, R * 1.12, 0, Math.PI * 2);
    g.fill();
    // decorations & creatures
    for (let i = 0; i < SECTORS; i++) {
      const s = this.planet.sectors[i];
      const a = this.rot + (i + 0.5) * step;
      const r = this.surfaceR(i);
      const B = BIOMES[s.biome];
      const up = a + Math.PI / 2;
      if (B.deco && i % 2 === 0) {
        drawEmoji(g, B.deco, cx + Math.cos(a) * (r - R * 0.06), cy + Math.sin(a) * (r - R * 0.06), R * 0.2, up, 0.95);
      }
      if (s.species) {
        const sp = SPECIES_BY_ID[s.species];
        const anim = this.spawnAnim.get(i) ?? 0;
        const bob = Math.sin(this.time * 3 + i) * R * 0.02;
        const pop = anim > 0 ? 1 + Math.sin((anim / 0.9) * Math.PI) * 0.8 : 1;
        const rr = r + R * 0.13 + bob;
        const size = R * (sp.rarity === 'common' ? 0.24 : sp.rarity === 'uncommon' ? 0.28 : 0.34) * pop;
        drawEmoji(g, sp.emoji, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, size, up);
      }
    }
  }

  private drawAim() {
    const g = this.g;
    const L = this.launch;
    // launcher pad
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.beginPath();
    g.arc(L.x, L.y, 34, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 2;
    g.stroke();
    if (!this.shot && !this.ended) {
      const p = this.pull();
      const bounce = this.aimFrom ? 0 : Math.sin(this.time * 3) * 3;
      const ox = this.aimFrom ? -p.vx / PULL_TO_SPEED / 3 : 0;
      const oy = this.aimFrom ? -p.vy / PULL_TO_SPEED / 3 : 0;
      drawEmoji(this.g, KINDS[this.cur].emoji, L.x + ox, L.y + oy + bounce, 40);
      if (this.aimFrom && p.len >= 18) {
        // trajectory preview
        const steps = SCOPE_STEPS[this.o.boosters.scope ? 3 : this.o.scopeLevel];
        const s = { x: L.x, y: L.y, vx: p.vx, vy: p.vy };
        g.fillStyle = '#ffffff';
        for (let k = 0; k < steps; k++) {
          for (let j = 0; j < 3; j++) this.step(s, 1 / 90);
          const d = Math.hypot(s.x - this.cx, s.y - this.cy);
          if (d < this.R * 1.02) break;
          g.globalAlpha = 0.85 * (1 - k / steps);
          g.beginPath();
          g.arc(s.x, s.y, 3.2 - (k / steps) * 1.8, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        // rubber band
        g.strokeStyle = KINDS[this.cur].color;
        g.lineWidth = 3;
        g.globalAlpha = 0.6;
        g.beginPath();
        g.moveTo(L.x - 26, L.y);
        g.lineTo(L.x + ox, L.y + oy);
        g.lineTo(L.x + 26, L.y);
        g.stroke();
        g.globalAlpha = 1;
      }
    }
  }

  destroy() {
    clearTimeout(this.endTimer);
    this.ended = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.modalOpen?.close();
  }
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
