import { BIOMES, KINDS, SECTORS, SPECIES_BY_ID, clonePlanet, impact, lifeScore, settle, type Kind, type Planet } from '../core/world';
import { starsFor, type LevelDef } from '../core/levels';
import { h, btn, fmt, modal, type Modal } from './dom';
import { renderPlanet, surfaceK } from './art/planet';
import { critterCanvas, drawCreature } from './art/critters';
import { drawProjectile, projectileCanvas } from './art/projectiles';
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
  /** Momentum tier (0-3) active this level. */
  momentum?: number;
  /** Coach tips keyed by throws used (0 = at the start). */
  coach?: Record<number, string>;
  /** Object introduced on this level (shows an intro card). */
  intro?: Kind;
  /** HUD title override (modes). */
  label?: string;
  /** Meteor Rush: seconds on the clock, unlimited throws. */
  timeLimit?: number;
  /** Zen Garden: never ends, no targets. */
  endless?: boolean;
  /** Competitive modes (daily, rush, challenge): no paid continues, no early finish. */
  competitive?: boolean;
  /** Called after every landed throw (Zen saves the planet). */
  onPlanet?: (p: Planet) => void;
  /** Label for the win button on the end card. */
  endLabel?: string;
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
  /** Throws left unused when the player finished early. */
  leftover: number;
}

interface Ring {
  x: number;
  y: number;
  t: number;
  max: number;
  r: number;
  color: string;
}

export const FINISH_DUST_PER_THROW = 15;
const CALLOUTS: [number, string, string][] = [
  [50, 'Paradise!', '#ff8fe0'],
  [32, 'Thriving!', '#ffd84a'],
  [20, 'Blooming!', '#7dffb0'],
  [12, 'Nice!', '#9fe6ff'],
];

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

export class LevelScene {
  el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private L: LevelDef;
  private o: SceneOpts;
  planet: Planet;
  private throwsLeft: number;
  private timeLeft = 0;
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
  private rings: Ring[] = [];
  private discoverQueue: string[] = [];
  private discoverBusy = false;
  private finishing = false;
  private leftover = 0;
  private chain = 0;
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
  private finishEl!: HTMLElement;
  private coachEl!: HTMLElement;
  private discoverEl!: HTMLElement;

  constructor(level: LevelDef, opts: SceneOpts) {
    this.L = level;
    this.o = opts;
    this.planet = clonePlanet(level.start);
    if (opts.boosters.spark) {
      for (const i of [3, 11, 19]) this.planet.sectors[i].life = Math.max(1, this.planet.sectors[i].life);
      settle(this.planet);
    }
    this.throwsLeft = level.throws + opts.extraThrows + (opts.boosters.shower ? 3 : 0);
    if (opts.timeLimit) this.timeLeft = opts.timeLimit;
    if (opts.timeLimit || opts.endless) this.throwsLeft = Infinity;
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
      this.showCoach(0);
      if (opts.intro) this.introCard(opts.intro);
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
    this.finishEl = h(
      'button',
      { class: 'finish hidden', onclick: () => this.finishEarly() },
      h('b', null, 'Finish ✓'),
      h('small', null, ''),
    );
    this.discoverEl = h('div', { class: 'discover' });
    this.coachEl = h('div', { class: 'coach' });
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
          h('div', { class: 'hud-level' }, this.o.label ?? `Planet ${this.L.n}`),
          h('div', { class: 'hud-name' }, this.L.name),
          this.L.difficulty !== 'normal'
            ? h('div', { class: `hud-diff ${this.L.difficulty}` }, this.L.difficulty === 'super' ? '💀 SUPER HARD' : '🔥 HARD')
            : null,
          this.o.momentum ? h('div', { class: 'hud-diff momentum-tag' }, `⚡ Momentum ×${this.o.momentum}`) : null,
        ),
        this.hudThrows,
      ),
      h('div', { class: 'life' }, bar, this.hudScore),
      twist,
      h('div', { class: 'banners' }, this.coachEl, this.discoverEl),
      this.finishEl,
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
    if (this.o.timeLimit) {
      this.renderClock();
    } else if (this.o.endless) {
      this.hudThrows.replaceChildren(h('span', { class: 'n' }, '∞'), h('span', { class: 'l' }, 'zen'));
    } else {
      this.hudThrows.replaceChildren(h('span', { class: 'n' }, String(this.throwsLeft)), h('span', { class: 'l' }, 'throws'));
      this.hudThrows.classList.toggle('low', this.throwsLeft <= 2);
    }
    const k = KINDS[this.cur];
    const n = KINDS[this.next];
    this.curEl.replaceChildren(projectileCanvas(this.cur, 40));
    this.curEl.style.setProperty('--c', k.color);
    this.nextEl.replaceChildren(projectileCanvas(this.next, 36));
    this.nextEl.style.setProperty('--c', n.color);
    this.descEl.replaceChildren(h('b', null, k.name), ` — ${k.desc}`);
    this.renderScore();
    this.renderFinish();
  }

  private renderScore() {
    const max = this.barMax();
    this.hudFill.style.width = `${Math.min(100, (this.shownScore / max) * 100)}%`;
    this.hudScore.textContent = `${fmt(this.shownScore)} life`;
    this.hudStars.forEach((s, i) => s.classList.toggle('on', this.shownScore >= this.L.stars[i]));
  }

  private lastClock = -1;
  private renderClock() {
    const t = Math.max(0, Math.ceil(this.timeLeft));
    if (t === this.lastClock) return;
    if (t <= 5 && t > 0 && this.lastClock !== t) sfx.click();
    this.lastClock = t;
    this.hudThrows.replaceChildren(h('span', { class: 'n' }, `${t}`), h('span', { class: 'l' }, 'seconds'));
    this.hudThrows.classList.toggle('low', t <= 10);
  }

  private get over() {
    return this.o.timeLimit ? this.timeLeft <= 0 : this.throwsLeft <= 0;
  }

  private renderFinish() {
    if (this.o.competitive || this.o.endless || this.o.timeLimit) {
      this.finishEl.classList.add('hidden');
      return;
    }
    const show = this.starsGot > 0 && this.throwsLeft > 0 && !this.ended && !this.finishing;
    this.finishEl.classList.toggle('hidden', !show);
    this.finishEl.classList.toggle('hot', this.starsGot >= 3);
    (this.finishEl.lastChild as HTMLElement).textContent = `+✨${this.throwsLeft * FINISH_DUST_PER_THROW} for ${this.throwsLeft} left`;
  }

  /** "Meteor finale": leftover throws rain down as a stardust bonus. */
  private finishEarly() {
    if (this.shot || this.ended || this.finishing || this.modalOpen || this.starsGot === 0) return;
    this.finishing = true;
    clearTimeout(this.endTimer);
    this.renderFinish();
    const n = this.throwsLeft;
    sfx.whoosh();
    for (let k = 0; k < n; k++) {
      setTimeout(
        () => {
          if (this.ended) return;
          const a = Math.random() * Math.PI * 2;
          const x = this.cx + Math.cos(a) * this.R * 1.05;
          const y = this.cy + Math.sin(a) * this.R * 1.05;
          this.burst(x, y, '#ffd76a', 16, 5);
          this.ring(x, y, '#ffd76a', this.R * 0.5);
          this.popup(x, y - 12, `+✨${FINISH_DUST_PER_THROW}`, '#ffd76a', 18);
          this.throwsLeft--;
          this.renderHud();
          sfx.coin();
          haptic.tick();
        },
        120 + k * 160,
      );
    }
    setTimeout(
      () => {
        if (this.ended) return;
        this.finishing = false;
        this.leftover = n;
        this.endModal(starsFor(this.score, this.L.stars));
      },
      400 + n * 160,
    );
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
      if (this.shot || this.ended || this.paused || this.modalOpen || this.finishing || (this.o.timeLimit && this.timeLeft <= 0)) return;
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
    if (Number.isFinite(this.throwsLeft)) this.throwsLeft--;
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
    return this.R * surfaceK(this.planet.sectors[i]);
  }

  private update(dt: number) {
    this.time += dt;
    if (this.o.timeLimit && !this.ended && !this.modalOpen && this.timeLeft > 0) {
      this.timeLeft -= dt;
      this.renderClock();
      if (this.timeLeft <= 0) {
        this.aimFrom = this.aimTo = null;
        sfx.whoosh();
        this.popup(this.cx, this.cy - this.R * 1.6, "Time's up!", '#ffd84a', 32, 1.6);
        this.afterShot();
      }
    }
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
        if (got === 3) {
          this.confetti();
          this.popup(this.cx, this.cy - this.R * 1.9, '★★★ Perfect planet!', '#ffd84a', 24, 2);
        }
        this.renderFinish();
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
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.max);
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
    this.shake = this.o.reduceMotion ? 0 : 10;
    this.burst(sh.x, sh.y, KINDS[sh.kind].color, 34, 7);
    this.ring(sh.x, sh.y, KINDS[sh.kind].color, this.R * 0.9);
    const delta = res.after - res.before;
    this.chain = delta > 0 ? this.chain + 1 : 0;
    const quality = delta + res.spawned.length * 6;
    const call = CALLOUTS.find(([min]) => quality >= min);
    if (call) {
      const text = this.chain >= 3 ? `${call[1]} ×${this.chain}` : call[1];
      setTimeout(() => {
        this.popup(this.cx, this.cy + this.R * 1.45, text, call[2], 34, 1.4);
        sfx.combo(CALLOUTS.length - CALLOUTS.indexOf(call) + Math.min(this.chain, 4));
        haptic.success();
      }, 260);
    }
    this.score = res.after;
    if (res.changed.length) this.o.onTransform?.(res.changed.length);
    this.o.onPlanet?.(this.planet);
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
      this.discoverQueue.push(id);
      this.showDiscover();
    }
  }

  private showDiscover() {
    if (this.discoverBusy || this.ended) return;
    const id = this.discoverQueue.shift();
    if (!id) return;
    const sp = SPECIES_BY_ID[id];
    this.discoverBusy = true;
    const label = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' }[sp.rarity];
    this.discoverEl.className = `discover show r-${sp.rarity}`;
    this.discoverEl.replaceChildren(
      h('div', { class: 'd-emoji' }, critterCanvas(sp.id, 56)),
      h(
        'div',
        { class: 'd-body' },
        h('small', null, `New creature · ${label}`),
        h('b', null, sp.name),
        h('span', null, '+💎3 · added to your Lifebook'),
      ),
    );
    setTimeout(() => {
      this.discoverEl.classList.remove('show');
      setTimeout(() => {
        this.discoverBusy = false;
        this.showDiscover();
      }, 300);
    }, 2300);
  }

  private showCoach(k: number) {
    const text = this.o.coach?.[k];
    if (!text) {
      this.coachEl.classList.remove('show');
      return;
    }
    this.coachEl.replaceChildren(h('span', { class: 'coach-ic' }, '💡'), h('span', null, text));
    this.coachEl.classList.remove('show');
    void this.coachEl.offsetWidth;
    this.coachEl.classList.add('show');
  }

  private introCard(kind: Kind) {
    const k = KINDS[kind];
    this.paused = true;
    const m = modal(
      [
        h('div', { class: 'm-sub' }, 'New object!'),
        h('div', { class: 'intro-art' }, projectileCanvas(kind, 110)),
        h('div', { class: 'm-title' }, k.name),
        h('p', null, k.desc),
        btn('Got it!', 'primary wide', () => m.close()),
      ],
      { onClose: () => ((this.paused = false), (this.modalOpen = null)) },
    );
    this.modalOpen = m;
    sfx.levelUp();
  }

  private endTimer = 0;
  private afterShot() {
    this.renderHud();
    this.showCoach(this.throwsUsed);
    if (this.o.endless) return;
    if (this.over) {
      clearTimeout(this.endTimer);
      this.endTimer = window.setTimeout(() => this.checkEnd(), 1400);
    }
  }

  private checkEnd() {
    if (this.ended || this.modalOpen || !this.over) return;
    if (this.shot) {
      this.endTimer = window.setTimeout(() => this.checkEnd(), 300);
      return;
    }
    this.shownScore = this.score;
    this.renderScore();
    const stars = starsFor(this.score, this.L.stars);
    this.endModal(stars);
  }

  private endModal(stars: number) {
    const cost = this.o.continueCost(this.continues);
    const canCont = this.continues < 3 && this.leftover === 0 && !this.o.competitive && !this.o.timeLimit;
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
        h(
          'div',
          { class: 'end-title' + (won ? '' : ' lost') },
          won ? (this.o.timeLimit ? "Time's up!" : 'Planet complete!') : this.o.timeLimit ? "Time's up!" : 'Out of throws',
        ),
        h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★'))),
        h('div', { class: 'end-score' }, `${fmt(this.score)} life`),
        this.leftover
          ? h(
              'p',
              { class: 'end-need' },
              `Meteor finale: +✨${this.leftover * FINISH_DUST_PER_THROW} for ${this.leftover} unused throw${this.leftover > 1 ? 's' : ''}`,
            )
          : null,
        need > 0 && !this.leftover
          ? h('p', { class: 'end-need' }, won ? `Only ${fmt(need)} life from the next star!` : `Just ${fmt(need)} life short of a star.`)
          : null,
        canCont && (need > 0 || !won)
          ? btn(
              h('span', { class: 'stack' }, h('b', null, '+5 THROWS'), h('small', null, `💎 ${cost} · you have ${this.o.gems()}`)),
              'gem wide',
              cont,
            )
          : null,
        won || this.o.competitive || this.o.timeLimit
          ? btn(this.o.endLabel ?? 'Collect', 'primary wide', finish)
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
      this.confetti();
    } else {
      sfx.lose();
      haptic.warn();
    }
  }

  private finish(stars: number) {
    if (this.ended) return;
    this.ended = true;
    this.o.onEnd({
      level: this.L,
      score: this.score,
      stars,
      planet: this.planet,
      won: stars > 0,
      throwsUsed: this.throwsUsed,
      leftover: this.leftover,
    });
  }

  private pause() {
    if (this.ended || this.modalOpen) return;
    this.paused = true;
    const m = modal(
      [
        h('div', { class: 'end-title' }, 'Paused'),
        btn('Resume', 'primary wide', () => m.close()),
        btn(this.o.momentum ? 'Restart (ends Momentum)' : 'Restart planet', 'ghost wide', () => {
          m.close();
          this.ended = true;
          this.o.onEnd({ level: this.L, score: 0, stars: 0, planet: this.planet, won: false, throwsUsed: -1, leftover: 0 });
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

  private ring(x: number, y: number, color: string, r: number) {
    this.rings.push({ x, y, t: 0, max: 0.55, r, color });
  }

  private confetti() {
    if (this.o.reduceMotion) return;
    const cols = ['#ffd84a', '#5ef2b0', '#ff8fc8', '#6ec8ff', '#b58cff'];
    for (let k = 0; k < 90; k++) {
      const life = 1.6 + Math.random() * 1.2;
      this.particles.push({
        x: Math.random() * this.w,
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
    for (const r of this.rings) {
      const k = r.t / r.max;
      g.globalAlpha = (1 - k) * 0.8;
      g.strokeStyle = r.color;
      g.lineWidth = 4 * (1 - k) + 1;
      g.beginPath();
      g.arc(r.x, r.y, r.r * (0.2 + k), 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
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
      drawProjectile(g, sh.kind, sh.x, sh.y, 30, this.time, sh.t * 6);
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
    const lifeK = this.o.endless ? 0.6 : Math.min(1, this.score / this.L.stars[2]);
    renderPlanet(this.g, this.planet, {
      cx: this.cx,
      cy: this.cy,
      R: this.R,
      rot: this.rot,
      time: this.time,
      glow: this.o.glow,
      lifeK,
      flash: (i) => (this.flash.find((f) => f.i === i)?.t ?? 0) * 1.4,
      creature: (g, i, x, y, a) => {
        const sp = SPECIES_BY_ID[this.planet.sectors[i].species!];
        const anim = this.spawnAnim.get(i) ?? 0;
        const pop = anim > 0 ? 1 + Math.sin((anim / 0.9) * Math.PI) * 0.8 : 1;
        const size = this.R * (sp.rarity === 'common' ? 0.2 : sp.rarity === 'uncommon' ? 0.24 : 0.3) * pop;
        drawCreature(g, sp.id, x, y, a + Math.PI / 2, size, this.time + i);
      },
    });
  }

  private predictCache: { key: string; label: string; delta: number; spawn: string } | null = null;

  /** Highlight the landing region and preview what it will become. */
  private drawLanding(i: number) {
    const g = this.g;
    const step = (Math.PI * 2) / SECTORS;
    const a0 = this.rot + i * step;
    const pulse = 0.55 + Math.sin(this.time * 10) * 0.25;
    const r = this.surfaceR(i);
    g.save();
    g.globalAlpha = pulse;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(this.cx, this.cy, r + 4, a0 - step * 0.5, a0 + step * 1.5);
    g.stroke();
    g.restore();
    const key = `${i}|${this.cur}|${this.throwsUsed}`;
    if (this.predictCache?.key !== key) {
      const sim = clonePlanet(this.planet);
      const res = impact(sim, this.cur, i, this.o.splash);
      const before = BIOMES[this.planet.sectors[i].biome];
      const after = BIOMES[sim.sectors[i].biome];
      this.predictCache = {
        key,
        label: after.id !== before.id ? `${after.deco} ${after.name}` : '',
        delta: res.after - res.before,
        spawn: res.spawned.length ? SPECIES_BY_ID[res.spawned[0].id].emoji : '',
      };
    }
    const pc = this.predictCache;
    if (!pc.label && !pc.delta) return;
    const [x, y] = this.sectorPoint(i, 1.42);
    const text = `${pc.label}${pc.spawn ? ' ' + pc.spawn : ''}${pc.delta ? `  ${pc.delta > 0 ? '+' : ''}${pc.delta}` : ''}`.trim();
    g.font = '700 14px Fredoka, ui-rounded, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const w = g.measureText(text).width + 16;
    const cx = Math.min(this.w - w / 2 - 4, Math.max(w / 2 + 4, x));
    g.fillStyle = 'rgba(10,6,30,0.78)';
    g.beginPath();
    g.roundRect(cx - w / 2, y - 13, w, 26, 13);
    g.fill();
    g.fillStyle = pc.delta >= 0 ? '#bfffd6' : '#ffc0cc';
    g.fillText(text, cx, y + 1);
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
      drawProjectile(this.g, this.cur, L.x + ox, L.y + oy + bounce, 36, this.time);
      if (this.aimFrom && p.len >= 18) {
        // trajectory preview
        const steps = SCOPE_STEPS[this.o.boosters.scope ? 3 : this.o.scopeLevel];
        const s = { x: L.x, y: L.y, vx: p.vx, vy: p.vy };
        g.fillStyle = '#ffffff';
        let hit = -1;
        for (let k = 0; k < steps; k++) {
          for (let j = 0; j < 3; j++) this.step(s, 1 / 90);
          const d = Math.hypot(s.x - this.cx, s.y - this.cy);
          if (d < this.R * 1.02) {
            // where will it land, allowing for the spin during the flight?
            const t = ((k + 1) * 3) / 90;
            const ang = Math.atan2(s.y - this.cy, s.x - this.cx) - (this.rot + this.L.spin * t);
            const tt = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            hit = Math.floor(tt / ((Math.PI * 2) / SECTORS)) % SECTORS;
            break;
          }
          g.globalAlpha = 0.85 * (1 - k / steps);
          g.beginPath();
          g.arc(s.x, s.y, 3.2 - (k / steps) * 1.8, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        if (hit >= 0) this.drawLanding(hit);
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
