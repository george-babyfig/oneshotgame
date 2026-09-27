import {
  type BiomeId,
  BIOMES,
  KINDS,
  SECTORS,
  SPECIES_BY_ID,
  clonePlanet,
  impact,
  lifeScore,
  labBonus,
  novaCharge,
  settle,
  type Kind,
  type Planet,
} from '../core/world';
import { BOSS_HP, goalProgress, goalsMet, starsFor, type Goal, type LevelDef } from '../core/levels';
import { h, btn, fmt, modal, type Modal } from './dom';
import { icon } from './icons';
import { renderPlanet, surfaceK } from './art/planet';
import { critterCanvas, drawCreature } from './art/critters';
import { drawProjectile, projectileCanvas } from './art/projectiles';
import { drawKeeper, drawLauncher, drawTrail } from './art/keeper';
import { DEFAULT_LOOK, type Look } from '../meta/cosmetics';
import { NOVA_CHARGE } from '../meta/lab';
import type { Season } from '../meta/seasons';
import { drawMeteors, drawSeason } from './art/seasons';
import { sfx } from './audio';
import { haptic } from './haptics';
import { t, tp } from '../i18n';
import { rarityName } from './text';
import { toast } from './dom';

export interface SceneOpts {
  scopeLevel: number; // 0..3 aim guide length
  /** The player's Keeper outfit, launcher and trail. */
  look?: Look;
  /** Real-calendar season weather, and a meteor shower tonight (Supernova charges 2×). */
  season?: Season;
  shower?: boolean;
  /** Object Lab level per object (campaign/Zen only). */
  lab?: Partial<Record<Kind, number>>;
  /** The launcher is fully mastered (gold glow). */
  mastered?: boolean;
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
  onThrow?: (kind: Kind) => void;
  onTransform?: (regions: number) => void;
  /** Weekly event hook: returns event tokens earned by this landing. */
  onLand?: (changed: BiomeId[], spawned: number) => number;
  eventEmoji?: string;
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
  /** A Comet Guardian was defeated on this planet. */
  boss?: boolean;
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
  /** A charged Supernova throw. */
  nova?: boolean;
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
  private goalsEl!: HTMLElement;
  private goalsDone = 0;
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
    this.raf = requestAnimationFrame(() => {
      if (this.destroyed) return;
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
    this.goalsEl = h('div', { class: `goals${this.L.goals.length ? '' : ' hidden'}` });
    this.hintEl = h('div', { class: 'hint' }, h('div', { class: 'hint-hand' }, '👆'), h('div', null, t('Pull back & release to fling')));
    const twist = this.L.twist !== 'none' ? h('div', { class: 'twist' }, this.twistLabel()) : null;
    this.finishEl = h(
      'button',
      { class: 'finish hidden', onclick: () => this.finishEarly() },
      h('b', null, t('Finish ✓')),
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
        h('button', { class: 'icon', 'aria-label': 'Pause', onclick: () => this.pause() }, icon('pause', 22)),
        h(
          'div',
          { class: 'hud-title' },
          h('div', { class: 'hud-level' }, this.o.label ?? t('Planet {n}', { n: this.L.n })),
          h('div', { class: 'hud-name' }, this.L.name),
          this.L.difficulty !== 'normal'
            ? h('div', { class: `hud-diff ${this.L.difficulty}` }, this.L.difficulty === 'super' ? t('💀 SUPER HARD') : t('🔥 HARD'))
            : null,
          this.o.momentum ? h('div', { class: 'hud-diff momentum-tag' }, t('⚡ Momentum ×{n}', { n: this.o.momentum })) : null,
        ),
        this.hudThrows,
      ),
      h('div', { class: 'life' }, bar, this.hudScore),
      this.goalsEl,
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
          h('div', { class: 'next-wrap' }, this.nextEl, h('div', { class: 'swap-lbl' }, t('tap to swap'))),
        ),
        this.descEl,
      ),
      this.hintShown ? this.hintEl : null,
    );
  }

  private twistLabel() {
    const map: Record<string, string> = {
      fast: t('🌀 Fast Spin'),
      tiny: t('🔹 Tiny World'),
      moon: t('🌑 A moon blocks shots'),
      boss: t('☄️ Comet Guardian — hit it 3 times!'),
      hot: t('🔥 Scorched start'),
      frozen: t('🧊 Frozen start'),
      ocean: t('🌊 Water World'),
      wind: t('💨 Solar Wind'),
      heavy: t('🪐 Dense Core'),
      wobble: t('🌀 Wobbly Spin'),
      twin: t('🌑🌑 Twin Moons'),
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
      this.hudThrows.replaceChildren(h('span', { class: 'n' }, '∞'), h('span', { class: 'l' }, t('zen')));
    } else {
      this.hudThrows.replaceChildren(h('span', { class: 'n' }, String(this.throwsLeft)), h('span', { class: 'l' }, t('throws')));
      this.hudThrows.classList.toggle('low', this.throwsLeft <= 2);
    }
    const k = KINDS[this.cur];
    const n = KINDS[this.next];
    this.curEl.replaceChildren(projectileCanvas(this.cur, 40));
    this.curEl.style.setProperty('--c', k.color);
    this.nextEl.replaceChildren(projectileCanvas(this.next, 36));
    this.nextEl.style.setProperty('--c', n.color);
    this.descEl.replaceChildren(h('b', null, t(k.name)), ` — ${t(k.desc)}`);
    this.renderScore();
    this.renderGoals();
    this.renderFinish();
  }

  /** Score counter "heats up" on big gains (Balatro-style escalation). */
  private heat(delta: number) {
    const lv = delta >= 40 ? 3 : delta >= 22 ? 2 : delta >= 10 ? 1 : 0;
    if (!lv) return;
    const el = this.hudScore;
    el.classList.remove('heat1', 'heat2', 'heat3');
    void el.offsetWidth;
    el.classList.add(`heat${lv}`);
    this.hudFill.classList.toggle('blaze', lv >= 2);
    clearTimeout(this.heatTimer);
    this.heatTimer = window.setTimeout(() => {
      el.classList.remove('heat1', 'heat2', 'heat3');
      this.hudFill.classList.remove('blaze');
    }, 1400);
  }
  private heatTimer = 0;

  private renderScore() {
    const max = this.barMax();
    this.hudFill.style.width = `${Math.min(100, (this.shownScore / max) * 100)}%`;
    this.hudScore.textContent = t('{n} life', { n: fmt(this.shownScore) });
    const met = goalsMet(this.planet, this.L.goals);
    this.hudStars.forEach((s, i) => {
      s.classList.toggle('on', met && this.shownScore >= this.L.stars[i]);
      s.classList.toggle('wait', !met && this.shownScore >= this.L.stars[i]);
    });
  }

  private lastClock = -1;
  private renderClock() {
    const secs = Math.max(0, Math.ceil(this.timeLeft));
    if (secs === this.lastClock) return;
    if (secs <= 5 && secs > 0 && this.lastClock !== secs) sfx.click();
    this.lastClock = secs;
    this.hudThrows.replaceChildren(h('span', { class: 'n' }, `${secs}`), h('span', { class: 'l' }, t('seconds')));
    this.hudThrows.classList.toggle('low', secs <= 10);
  }

  /** Celebrate newly earned stars (from score rising, or goals completing). */
  private checkStars() {
    const got = this.starsNow(this.shownScore);
    if (got <= this.starsGot) return;
    this.starsGot = got;
    sfx.star(got - 1);
    haptic.success();
    if (got === 3) {
      this.confetti();
      this.popup(this.cx, this.cy - this.R * 1.9, t('★★★ Perfect planet!'), '#ffd84a', 24, 2);
    }
    this.renderFinish();
    const s = this.hudStars[got - 1];
    s.classList.remove('pop');
    void s.offsetWidth;
    s.classList.add('pop');
  }

  /** Stars that count: every goal must be met first. */
  private starsNow(score = this.score) {
    return goalsMet(this.planet, this.L.goals) ? starsFor(score, this.L.stars) : 0;
  }

  private goalIcon(g: Goal) {
    return g.type === 'species' ? critterCanvas(g.id, 26) : h('span', { class: 'gi' }, BIOMES[g.id as BiomeId].deco || '⬤');
  }

  private renderGoals() {
    if (!this.L.goals.length) return;
    this.goalsEl.replaceChildren(
      h('span', { class: 'goals-l' }, t('Goals')),
      ...this.L.goals.map((g) => {
        const have = Math.min(g.count, goalProgress(this.planet, g));
        const done = have >= g.count;
        const name = g.type === 'species' ? t(SPECIES_BY_ID[g.id].name) : t(BIOMES[g.id as BiomeId].name);
        return h(
          'span',
          { class: `goal${done ? ' done' : ''}`, title: name },
          this.goalIcon(g),
          h('b', null, done ? '✓' : `${have}/${g.count}`),
        );
      }),
    );
    const n = this.L.goals.filter((g) => goalProgress(this.planet, g) >= g.count).length;
    if (n > this.goalsDone) {
      this.goalsDone = n;
      const all = n === this.L.goals.length;
      if (all) {
        this.renderScore();
        this.checkStars();
      }
      setTimeout(() => {
        this.popup(this.cx, this.cy - this.R * 1.6, all ? t('All goals complete!') : t('Goal complete!'), '#9dffb0', 24, 1.6);
        sfx.star(all ? 2 : 0);
        haptic.success();
      }, 500);
      this.goalsEl.classList.remove('pop');
      void this.goalsEl.offsetWidth;
      this.goalsEl.classList.add('pop');
    } else this.goalsDone = n;
  }

  private get over() {
    return this.o.timeLimit ? this.timeLeft <= 0 : this.throwsLeft <= 0;
  }

  private renderFinish() {
    if (this.o.competitive || this.o.endless || this.o.timeLimit) {
      this.finishEl.classList.add('hidden');
      return;
    }
    const now = this.starsNow();
    const show = now > 0 && this.throwsLeft > 0 && !this.ended && !this.finishing;
    this.finishEl.classList.toggle('hidden', !show);
    this.finishEl.classList.toggle('hot', now >= 3);
    (this.finishEl.lastChild as HTMLElement).textContent = t('+✨{d} for {n} left', {
      d: this.throwsLeft * FINISH_DUST_PER_THROW,
      n: this.throwsLeft,
    });
  }

  /** "Meteor finale": leftover throws rain down as a stardust bonus. */
  private finishEarly() {
    if (this.shot || this.ended || this.finishing || this.modalOpen || this.starsNow() === 0) return;
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
    const done = () => {
      if (this.ended) return;
      if (this.paused) return void setTimeout(done, 300);
      this.finishing = false;
      this.leftover = n;
      this.endModal(this.starsNow());
    };
    setTimeout(done, 400 + n * 160);
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
  /** 0..1 progress of the "fly to your galaxy" exit animation. */
  private exitK = 0;
  private get cy() {
    const k = this.exitK * this.exitK;
    return this.h * 0.43 - k * this.h * 0.5;
  }
  private get R() {
    return Math.min(this.w * 0.27, this.h * 0.17) * this.L.size * (1 - this.exitK * 0.85);
  }
  private get launch() {
    return { x: this.w / 2, y: this.h - 150 };
  }
  /** Moons that block shots (Moon Guard: one; Twin Moons: two, orbiting opposite ways). */
  private get moons(): { x: number; y: number; r: number }[] {
    if (this.L.twist === 'boss') {
      if (this.bossHp <= 0) return [];
      const a = this.time * 0.45;
      const r = this.R * 0.3;
      // an ellipse that always stays on screen
      const dx = Math.min(this.R * 2.15, this.w / 2 - r * 1.3);
      const dy = Math.max(this.R * 1.2, Math.min(this.R * 1.75, this.launch.y - this.cy - r - 60));
      return [{ x: this.cx + Math.cos(a) * dx, y: this.cy + Math.sin(a) * dy, r }];
    }
    if (this.L.twist !== 'moon' && this.L.twist !== 'twin') return [];
    const out = [];
    const a = this.time * 0.8;
    const d = this.R * 2.05;
    const dyMax = Math.max(this.R * 1.3, Math.min(d, this.launch.y - this.cy - this.R * 0.28 - 50));
    out.push({ x: this.cx + Math.cos(a) * d, y: this.cy + Math.sin(a) * dyMax, r: this.R * 0.28 });
    if (this.L.twist === 'twin') {
      const b = -this.time * 0.6 + Math.PI;
      const e = this.R * 1.6;
      out.push({ x: this.cx + Math.cos(b) * e, y: this.cy + Math.sin(b) * e, r: this.R * 0.22 });
    }
    return out;
  }

  /** Solar Wind: sideways push in px/s², direction fixed per level. */
  private get wind() {
    return this.L.spin > 0 ? 170 : -170;
  }

  /** Planet spin rate right now (Wobbly Spin swings back and forth). */
  private spinNow(time = this.time) {
    return this.L.twist === 'wobble' ? this.L.spin * 1.7 * Math.cos(time * 0.9) : this.L.spin;
  }

  /** How far the planet will have turned `dt` seconds from now. */
  private rotAhead(dt: number) {
    if (this.L.twist !== 'wobble') return this.L.spin * dt;
    return ((this.L.spin * 1.7) / 0.9) * (Math.sin((this.time + dt) * 0.9) - Math.sin(this.time * 0.9));
  }

  // ---------------------------------------------------------------- input
  private bindInput() {
    const pos = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.aimPointer !== null || !this.canAim()) return;
      this.aimPointer = e.pointerId;
      this.canvas.setPointerCapture(e.pointerId);
      this.aimFrom = pos(e);
      this.aimTo = pos(e);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.aimFrom || e.pointerId !== this.aimPointer) return;
      this.aimTo = pos(e);
      const p = this.pull();
      const k = Math.floor((p.len / MAX_PULL) * 8);
      if (k !== this.lastPullTick) {
        this.lastPullTick = k;
        sfx.stretch(p.len / MAX_PULL);
        haptic.tick();
      }
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.aimPointer) return;
      this.aimPointer = null;
      if (!this.aimFrom) return;
      const p = this.pull();
      this.aimFrom = this.aimTo = null;
      if (p.len < 18 || !this.canAim()) return; // a tap, or the level ended mid-drag
      this.fire(p.vx, p.vy);
    };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== this.aimPointer) return;
      this.aimPointer = null;
      this.aimFrom = this.aimTo = null;
    });
  }

  private aimPointer: number | null = null;
  private destroyed = false;

  /** Can the player start or release a throw right now? */
  private canAim() {
    return !this.shot && !this.ended && !this.paused && !this.modalOpen && !this.finishing && !this.over;
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
    const nova = this.charge >= NOVA_CHARGE;
    this.shot = { kind: this.cur, x, y, vx, vy, t: 0, trail: [], nova };
    if (nova) {
      sfx.combo(6);
      haptic.heavy();
    }
    if (Number.isFinite(this.throwsLeft)) this.throwsLeft--;
    this.throwsUsed++;
    sfx.launch();
    haptic.medium();
    this.o.onThrow?.(this.shot.kind);
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
    const a = (this.L.twist === 'heavy' ? GM * 1.45 : GM) / r2;
    if (this.L.twist === 'wind') s.vx += this.wind * dt;
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
        this.popup(this.cx, this.cy - this.R * 1.6, t("Time's up!"), '#ffd84a', 32, 1.6);
        this.afterShot();
      }
    }
    this.rot += this.spinNow() * dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    // score tween
    if (this.shownScore !== this.score) {
      const d = this.score - this.shownScore;
      this.shownScore += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * 0.12));
      if (Math.abs(this.score - this.shownScore) < 1) this.shownScore = this.score;
      this.checkStars();
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
        const m = this.moons.find((mm) => Math.hypot(sh.x - mm.x, sh.y - mm.y) < mm.r + 8);
        if (m && this.L.twist === 'boss') {
          // a Supernova hits the Guardian twice as hard
          if (sh.nova) {
            this.charge = 0;
            this.bossHp = Math.max(1, this.bossHp - 1);
          }
          this.hitBoss(sh.x, sh.y);
          this.shot = null;
          this.afterShot();
          break;
        }
        if (m) {
          this.burst(sh.x, sh.y, '#c9c3d6', 14, 4);
          this.popup(sh.x, sh.y - 10, t('Blocked!'), '#fff', 18);
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
          this.popup(Math.min(Math.max(sh.x, 60), this.w - 60), Math.min(Math.max(sh.y, 120), this.h - 200), t('Missed!'), '#ffb3c1', 20);
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
    const lv = this.o.lab?.[sh.kind] ?? 1;
    const res = impact(this.planet, sh.kind, i, this.o.splash, { nova: sh.nova });
    const bonus = labBonus(lv, res.changed.length, res.spawned.length);
    this.bonus += bonus;
    if (bonus) setTimeout(() => this.popup(sh.x - 34, sh.y + 16, t('🧪 +{n}', { n: bonus }), '#c9a8ff', 16, 1.2), 380);
    if (sh.nova) {
      this.charge = 0;
      this.ring(sh.x, sh.y, '#ffd24a', this.R * 1.6);
      this.burst(sh.x, sh.y, '#fff2b8', 50, 9);
      setTimeout(() => this.popup(this.cx, this.cy - this.R * 1.5, t('SUPERNOVA!'), '#ffd24a', 32, 1.4), 120);
    } else {
      const before = this.charge;
      if (this.novaOn)
        this.charge = Math.min(NOVA_CHARGE, this.charge + novaCharge(res.changed.length, res.spawned.length, lv) * (this.o.shower ? 2 : 1));
      if (before < NOVA_CHARGE && this.charge >= NOVA_CHARGE) {
        setTimeout(() => {
          const L = this.launch;
          this.popup(L.x, L.y - 70, t('Supernova charged!'), '#ffd24a', 20, 1.6);
          sfx.levelUp();
        }, 700);
      }
    }
    sfx.impact(sh.kind);
    haptic.heavy();
    this.shake = this.o.reduceMotion ? 0 : 10;
    this.burst(sh.x, sh.y, KINDS[sh.kind].color, 34, 7);
    this.ring(sh.x, sh.y, KINDS[sh.kind].color, this.R * 0.9);
    const delta = res.after - res.before + bonus;
    this.chain = delta > 0 ? this.chain + 1 : 0;
    const quality = delta + res.spawned.length * 6;
    const call = CALLOUTS.find(([min]) => quality >= min);
    if (call) {
      const text = this.chain >= 3 ? `${t(call[1])} ×${this.chain}` : t(call[1]);
      setTimeout(() => {
        this.popup(this.cx, this.cy + this.R * 1.45, text, call[2], 34, 1.4);
        sfx.combo(CALLOUTS.length - CALLOUTS.indexOf(call) + Math.min(this.chain, 4));
        haptic.success();
      }, 260);
    }
    this.score = res.after + this.bonus;
    this.heat(delta);
    if (res.changed.length) {
      this.o.onTransform?.(res.changed.length);
      this.cheerUntil = Math.max(this.cheerUntil, this.time + 0.9);
    }
    this.o.onPlanet?.(this.planet);
    const tokens = this.o.onLand?.(
      res.changed.map((ci) => this.planet.sectors[ci].biome),
      res.spawned.length,
    );
    if (tokens) setTimeout(() => this.popup(sh.x + 30, sh.y + 10, `+${tokens} ${this.o.eventEmoji ?? '⭐'}`, '#ffd84a', 18, 1.3), 500);
    if (delta !== 0) this.popup(sh.x, sh.y - 20, `${delta > 0 ? '+' : ''}${delta}`, delta > 0 ? '#9dffb0' : '#ff9db0', 26);
    // name up to two newly formed biomes
    const shown = new Set<string>();
    res.changed.forEach((ci, k) => {
      this.flash.push({ i: ci, t: 0.5 });
      const bname = t(BIOMES[this.planet.sectors[ci].biome].name);
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
    if (!sp) return;
    this.spawnAnim.set(at, 0.9);
    const [x, y] = this.sectorPoint(at, 1.55);
    const rare = sp.rarity === 'rare' || sp.rarity === 'legendary';
    const isNew = !this.o.seen.has(id);
    this.o.onSpecies?.(id);
    sfx.creature(rare || isNew);
    haptic.success();
    this.burst(x, y, rare ? '#ffd84a' : '#ffffff', rare ? 40 : 20, rare ? 7 : 4);
    this.popup(x, y - 16, `${t(sp.name)}${isNew ? t(' — NEW!') : ''}`, rare ? '#ffd84a' : '#e0f7ff', rare ? 20 : 16, 2.2);
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
    if (!sp) return;
    this.discoverBusy = true;
    const label = rarityName(sp.rarity);
    this.discoverEl.className = `discover show r-${sp.rarity}`;
    this.discoverEl.replaceChildren(
      h('div', { class: 'd-emoji' }, critterCanvas(sp.id, 56)),
      h(
        'div',
        { class: 'd-body' },
        h('small', null, t('New creature · {r}', { r: label })),
        h('b', null, t(sp.name)),
        h('span', null, t('+💎3 · added to your Lifebook')),
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
    this.coachEl.replaceChildren(h('span', { class: 'coach-ic' }, '💡'), h('span', null, t(text)));
    this.coachEl.classList.remove('show');
    void this.coachEl.offsetWidth;
    this.coachEl.classList.add('show');
  }

  private introCard(kind: Kind) {
    const k = KINDS[kind];
    this.paused = true;
    const m = modal(
      [
        h('div', { class: 'm-sub' }, t('New object!')),
        h('div', { class: 'intro-art' }, projectileCanvas(kind, 110)),
        h('div', { class: 'm-title' }, t(k.name)),
        h('p', null, t(k.desc)),
        btn(t('Got it!'), 'primary wide', () => m.close()),
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
    if (this.ended || (this.modalOpen && !this.paused) || !this.over) return;
    if (this.shot || this.paused) {
      this.endTimer = window.setTimeout(() => this.checkEnd(), 300);
      return;
    }
    this.shownScore = this.score;
    this.renderScore();
    this.endModal(this.starsNow());
  }

  /** Stars already won before buying "+5 throws" (a continue can't lose them). */
  private minStars = 0;

  private endModal(stars: number) {
    stars = Math.max(stars, this.minStars);
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
        sfx.error();
        toast(t('Not enough gems — grab a pack in the Shop!'), 'bad');
        return;
      }
      m.close();
      this.modalOpen = null;
      this.continues++;
      this.minStars = Math.max(this.minStars, stars);
      this.throwsLeft += 5;
      sfx.gem();
      haptic.success();
      this.renderHud();
    };
    const need = won ? (stars < 3 ? this.L.stars[stars] - this.score : 0) : Math.max(0, this.L.stars[0] - this.score);
    const missing = this.L.goals.filter((g) => goalProgress(this.planet, g) < g.count);
    const missingEl =
      !won && missing.length
        ? h(
            'div',
            { class: 'end-missing' },
            h('small', null, t('Still needed:')),
            ...missing.map((g) =>
              h('span', { class: 'goal' }, this.goalIcon(g), h('b', null, `${goalProgress(this.planet, g)}/${g.count}`)),
            ),
          )
        : null;
    // how close was it? (0..1) — drives the "so close" framing on the continue button
    const lifeK = Math.min(1, this.score / this.L.stars[0]);
    const goalK = this.L.goals.length
      ? this.L.goals.reduce((a, g) => a + Math.min(1, goalProgress(this.planet, g) / g.count), 0) / this.L.goals.length
      : 1;
    const close = Math.min(lifeK, goalK);
    const m = modal(
      [
        h(
          'div',
          { class: 'end-title' + (won ? '' : ' lost') },
          won ? (this.o.timeLimit ? t("Time's up!") : t('Planet complete!')) : this.o.timeLimit ? t("Time's up!") : t('Out of throws'),
        ),
        h('div', { class: 'end-stars' }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★'))),
        h('div', { class: 'end-score' }, t('{n} life', { n: fmt(this.score) })),
        this.leftover
          ? h(
              'p',
              { class: 'end-need' },
              tp(this.leftover, 'Meteor finale: +✨{d} for {n} unused throw', 'Meteor finale: +✨{d} for {n} unused throws', {
                d: this.leftover * FINISH_DUST_PER_THROW,
              }),
            )
          : null,
        need > 0 && !this.leftover
          ? h(
              'p',
              { class: 'end-need' },
              won ? t('Only {n} life from the next star!', { n: fmt(need) }) : t('Just {n} life short of a star.', { n: fmt(need) }),
            )
          : null,
        missingEl,
        !won && close >= 0.75
          ? h(
              'div',
              { class: 'so-close' },
              h('i', { style: `width:${Math.round(close * 100)}%` }),
              h('span', null, t('So close! {p}% there', { p: Math.round(close * 100) })),
            )
          : null,
        canCont && (need > 0 || !won)
          ? btn(
              h(
                'span',
                { class: 'stack' },
                h('b', null, t('+5 THROWS')),
                h('small', null, t('💎 {c} · you have {g}', { c: cost, g: this.o.gems() })),
              ),
              'gem wide',
              cont,
            )
          : null,
        won || this.o.competitive || this.o.timeLimit
          ? btn(this.o.endLabel ?? t('Collect'), 'primary wide', finish)
          : btn(t('Try again'), 'primary wide', () => {
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

  private exitRaf = 0;

  private finish(stars: number) {
    if (this.ended) return;
    this.ended = true;
    const send = () =>
      !this.destroyed &&
      this.o.onEnd({
        level: this.L,
        score: this.score,
        stars,
        planet: this.planet,
        won: stars > 0,
        throwsUsed: this.throwsUsed,
        leftover: this.leftover,
        boss: this.L.twist === 'boss' && this.bossHp <= 0,
      });
    if (stars === 0 || this.o.reduceMotion || this.o.endless) return send();
    // the finished planet shrinks and flies up to join your galaxy
    sfx.whoosh();
    this.el.querySelector('.hud')?.classList.add('fade-out');
    const t0 = performance.now();
    const step = (now: number) => {
      this.exitK = Math.min(1, (now - t0) / 750);
      if (Math.random() < 0.8) this.burst(this.cx, this.cy + this.R, '#ffd76a', 2, 2);
      if (this.destroyed) return;
      if (this.exitK < 1) this.exitRaf = requestAnimationFrame(step);
      else send();
    };
    this.exitRaf = requestAnimationFrame(step);
  }

  private pause() {
    if (this.ended || this.modalOpen) return;
    this.paused = true;
    this.aimFrom = this.aimTo = null;
    const m = modal(
      [
        h('div', { class: 'end-title' }, t('Paused')),
        btn(t('Resume'), 'primary wide', () => m.close()),
        btn(t('Restart planet'), 'ghost wide', () => {
          if (this.ended) return;
          m.close();
          this.ended = true;
          this.o.onEnd({ level: this.L, score: 0, stars: 0, planet: this.planet, won: false, throwsUsed: -1, leftover: 0 });
        }),
        btn(t('Leave to galaxy'), 'ghost wide', () => {
          if (this.ended) return;
          m.close();
          this.ended = true;
          this.o.onQuit();
        }),
      ],
      {
        onClose: () => {
          this.paused = false;
          if (this.modalOpen === m) this.modalOpen = null;
        },
      },
    );
    this.modalOpen = m;
  }

  // ---------------------------------------------------------------- fx helpers
  /** Drifting streaks that show the wind's direction and strength. */
  private drawWind() {
    const g = this.g;
    const dir = Math.sign(this.wind);
    g.strokeStyle = 'rgba(200,230,255,0.55)';
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    for (let k = 0; k < 18; k++) {
      const y = ((k * 97) % 100) / 100;
      const speed = 60 + ((k * 37) % 50);
      const x = ((((this.time * speed * dir + k * 131) % (this.w + 80)) + this.w + 80) % (this.w + 80)) - 40;
      g.beginPath();
      g.moveTo(x, y * this.h);
      g.lineTo(x - dir * (18 + (k % 3) * 8), y * this.h);
      g.stroke();
    }
  }

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

  private cheerUntil = 0;
  /** Supernova meter (regions transformed, creatures count double). */
  private charge = 0;
  /** Bonus life from Object Lab perks (on top of the planet's own life). */
  private bonus = 0;
  private get look(): Look {
    return this.o.look ?? DEFAULT_LOOK;
  }

  private emoteAt = -1;
  /** Comet Guardian health (boss planets). */
  private bossHp = BOSS_HP;
  private bossFlash = 0;

  private hitBoss(x: number, y: number) {
    this.bossHp--;
    this.bossFlash = this.time;
    this.burst(x, y, '#ff8a3d', 30, 7);
    this.ring(x, y, '#ffd24a', this.R * 0.8);
    this.shake = this.o.reduceMotion ? 0 : 14;
    haptic.heavy();
    if (this.bossHp > 0) {
      sfx.impact('magma');
      this.popup(x, y - 16, tp(this.bossHp, 'Hit! {n} more', 'Hit! {n} more'), '#ffd24a', 24);
    } else {
      sfx.win();
      this.burst(x, y, '#fff2b8', 60, 10);
      this.popup(this.cx, this.cy - this.R * 1.6, t('Guardian defeated!'), '#ffd24a', 30, 2);
      this.confetti();
    }
  }

  /** The Comet Guardian: a grumpy comet with a fiery tail and health pips. */
  private drawBoss() {
    const m = this.moons[0];
    if (!m) return;
    const g = this.g;
    const a = this.time * 0.45;
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
    const flash = this.time - this.bossFlash < 0.2;
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
      g.fillStyle = i < this.bossHp ? '#ff6a7a' : 'rgba(255,255,255,0.2)';
      g.beginPath();
      g.arc(m.x + (i - (BOSS_HP - 1) / 2) * m.r * 0.45, m.y - m.r * 1.35, m.r * 0.14, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  private confetti() {
    this.cheerUntil = this.time + 2.5;
    this.emoteAt = this.time;
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
    try {
      if (!this.paused) this.update(dt);
      this.draw();
    } finally {
      if (!this.destroyed) this.raf = requestAnimationFrame(this.frame);
    }
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
    if (!this.o.reduceMotion) {
      if (this.o.shower) drawMeteors(g, w, H, this.time, 1.5);
      if (this.o.season) drawSeason(g, w, H, this.time, this.o.season, 0.6, 22);
    }
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
    if (this.L.twist === 'boss') this.drawBoss();
    else
      for (const m of this.moons) {
        g.fillStyle = '#b9b3c9';
        g.beginPath();
        g.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.beginPath();
        g.arc(m.x + m.r * 0.3, m.y + m.r * 0.2, m.r * 0.3, 0, Math.PI * 2);
        g.fill();
      }
    if (this.L.twist === 'wind') this.drawWind();
    this.drawAim();
    // shot
    const sh = this.shot;
    if (sh) {
      drawTrail(g, this.look.trail, sh.trail, this.time, KINDS[sh.kind].color);
      g.globalAlpha = 1;
      if (sh.nova) {
        const gl = g.createRadialGradient(sh.x, sh.y, 4, sh.x, sh.y, 40);
        gl.addColorStop(0, 'rgba(255,230,140,0.9)');
        gl.addColorStop(1, 'rgba(255,230,140,0)');
        g.fillStyle = gl;
        g.beginPath();
        g.arc(sh.x, sh.y, 40, 0, Math.PI * 2);
        g.fill();
      }
      drawProjectile(g, sh.kind, sh.x, sh.y, sh.nova ? 38 : 30, this.time, sh.t * 6);
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
        if (!sp) return;
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
    const key = `${i}|${this.cur}|${this.throwsUsed}|${this.charge >= NOVA_CHARGE}`;
    if (this.predictCache?.key !== key) {
      const sim = clonePlanet(this.planet);
      const res = impact(sim, this.cur, i, this.o.splash, { nova: this.charge >= NOVA_CHARGE });
      const before = BIOMES[this.planet.sectors[i].biome];
      const after = BIOMES[sim.sectors[i].biome];
      this.predictCache = {
        key,
        label: after.id !== before.id ? `${after.deco} ${t(after.name)}` : '',
        delta: res.after - res.before + labBonus(this.o.lab?.[this.cur] ?? 1, res.changed.length, res.spawned.length),
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

  /** Supernova meter: a ring around the launcher that fills as you transform land. */
  /** The Supernova is introduced after the first tutorial planets. */
  private get novaOn() {
    return !(this.o.tutorial && this.L.n < 3);
  }

  private drawNovaMeter(x: number, y: number, aiming: boolean) {
    if (!this.novaOn) return;
    const g = this.g;
    const k = this.charge / NOVA_CHARGE;
    const full = k >= 1;
    const R = 50;
    g.save();
    if (full && aiming) {
      const pulse = 0.5 + Math.sin(this.time * 6) * 0.2;
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
      g.strokeStyle = full ? `hsl(${45 + Math.sin(this.time * 5) * 10},100%,65%)` : '#ffd24a';
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

  private drawAim() {
    const g = this.g;
    const L = this.launch;
    const aiming = !this.shot && !this.ended;
    const p = this.pull();
    const ox = aiming && this.aimFrom ? -p.vx / PULL_TO_SPEED / 3 : 0;
    const oy = aiming && this.aimFrom ? -p.vy / PULL_TO_SPEED / 3 : 0;
    // the Keeper stands beside its launcher, leaning back as you pull
    const kx = L.x - Math.min(96, this.w * 0.24);
    const ky = L.y + 46;
    const cheer = this.cheerUntil > this.time ? Math.min(1, (this.cheerUntil - this.time) * 3) : 0;
    drawKeeper(g, this.look, kx, ky, 62, this.time, {
      lean: aiming && this.aimFrom ? Math.min(1, p.len / MAX_PULL) : 0,
      cheer,
      look: Math.atan2(this.cy - (ky - 45), this.cx - kx),
      emote: this.emoteAt >= 0 && this.time - this.emoteAt < 6,
      et: this.time - this.emoteAt,
    });
    drawLauncher(g, this.look.launcher, L.x, L.y, this.time, { x: ox, y: oy }, KINDS[this.cur].color, this.o.mastered);
    this.drawNovaMeter(L.x, L.y, aiming);
    if (aiming) {
      const bounce = this.aimFrom ? 0 : Math.sin(this.time * 3) * 3;
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
          // where will it land, allowing for the spin during the flight? (same test as a real throw)
          const ft = ((k + 1) * 3) / 90;
          const ang = Math.atan2(s.y - this.cy, s.x - this.cx) - (this.rot + this.rotAhead(ft));
          const tt = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const si = Math.floor(tt / ((Math.PI * 2) / SECTORS)) % SECTORS;
          if (d <= this.surfaceR(si) + 6) {
            hit = si;
            break;
          }
          g.globalAlpha = 0.85 * (1 - k / steps);
          g.beginPath();
          g.arc(s.x, s.y, 3.2 - (k / steps) * 1.8, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        if (hit >= 0) this.drawLanding(hit);
      }
    }
  }

  destroy() {
    clearTimeout(this.endTimer);
    this.ended = true;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.exitRaf);
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
