import { ledger } from '../meta/ledger';
import * as hud from './hud';
import * as preview from './preview';
import { MAX_PULL, PULL_TO_SPEED } from './preview';
import * as fx from './fx';
import { type BiomeId, BIOMES, SECTORS, clonePlanet, lifeScore, type Kind, type Planet } from '../core/world';
import { BOSS_HP, type Goal, type LevelDef } from '../core/levels';
import { h, type Modal } from './dom';
import { roundIntro, type CoachEvent } from '../meta/coach';
import { UNLOCKS } from '../meta/unlocks';
import { surfaceK } from './art/planet';
import { DEFAULT_LOOK, type Look } from '../meta/cosmetics';
import { lifeSparkSectors, novaForThrow, rulesForLevel, type ReactionId, type RoundRules, type RoundState } from '../core/round';
import { feedbackState, type FeedbackState, type FeedbackItem } from './feel';
import { flyFull, sceneGeometry, STAR_SLING, type FlightHit, type FlightWorld } from '../core/flight';
import { EMPTY_SKY_STATE, type ObstacleId, type SkyState } from '../core/sky';
import type { RoundModifiers } from '../core/modifiers';
import type { Season } from '../meta/seasons';
import { sfx } from './audio';
import { haptic } from './haptics';
import { drawChapterBackdrop } from './art/backdrops';
import { chapterOf } from '../meta/progression';
import { needsBonkBadge } from './feel';

export interface SceneOpts {
  rules?: RoundRules;
  scopeLevel: number; // 0..3 aim guide length
  /** The player's Keeper outfit, launcher and trail. */
  look?: Look;
  /** Real-calendar season weather, and a meteor shower tonight (Supernova charges 2×). */
  season?: Season;
  shower?: boolean;
  /** This month's festival costume, worn by every creature on the planet. */
  festAcc?: string;
  /** Buddy creature beside the Keeper. */
  buddy?: { species: string; acc: string } | null;
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
  /** Warm-up replay: the Keeper always helps this planet finish. */
  practice?: boolean;
  practiceFirstClear?: boolean;
  reduceMotion?: boolean;
  /** Momentum tier (0-3) active this level. */
  momentum?: number;
  /** Opening coach tip (0 = before the first throw). */
  coach?: Record<number, string>;
  gustTip?: string;
  onGustSeen?: () => void;
  /** Object introduced on this level (shows an intro card). */
  intro?: Kind;
  allowIntro?: (id: string) => boolean;
  onIntro?: (id: string) => void;
  /** HUD title override (modes). */
  label?: string;
  /** Meteor Rush: seconds on the clock, unlimited throws. */
  timeLimit?: number;
  /** Zen Garden: never ends, no targets. */
  endless?: boolean;
  /** Competitive modes (daily, rush, challenge): no paid continues, no early finish. */
  competitive?: boolean;
  gentle?: boolean;
  clearPalette?: boolean;
  onSkySeen?: (id: ObstacleId) => void;
  /** Called after every landed throw (Zen saves the planet). */
  onPlanet?: (p: Planet) => void;
  /** Label for the win button on the end card. */
  endLabel?: string;
  gems: () => number;
  spendGems: (n: number) => boolean;
  continueOk?: (won: boolean) => boolean;
  onContinue?: () => void;
  onNewSpecies: (id: string) => void;
  onSpecies?: (id: string) => void;
  onThrow?: (kind: Kind) => void;
  onTransform?: (regions: number) => void;
  /** Weekly event hook: returns event tokens earned by this landing. */
  onLand?: (changed: BiomeId[], spawned: number) => number;
  /** The owner records first discoveries and pays their fixed reward. */
  onReaction?: (id: ReactionId) => { first: boolean };
  onCombo?: (links: number, reaction?: ReactionId, superFusion?: boolean) => void;
  onPairTried?: (first: Kind, second: Kind) => void;
  eventEmoji?: string;
  onEnd: (r: LevelResult) => void;
  onQuit: () => void;
}

export interface LevelResult {
  level: LevelDef;
  score: number;
  stars: number;
  planet: Planet;
  won: boolean;
  throwsUsed: number;
  throwsTotal: number;
  /** Throws left unused when the player finished early. */
  leftover: number;
  /** A Comet Guardian was defeated on this planet. */
  boss?: boolean;
  comboBest?: number;
  comboIcons?: ReactionId[];
  reactions?: ReactionId[];
  reactionEvents?: ReactionId[];
  comboEvents?: { links: number; reaction?: ReactionId; superFusion: boolean }[];
  reactionRecorded?: boolean;
  comboRecorded?: boolean;
}

interface Ring {
  x: number;
  y: number;
  t: number;
  max: number;
  r: number;
  color: string;
}

export { FINISH_DUST_PER_THROW } from '../meta/tuning';

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

export interface Shot {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  carry: number;
  t0: number;
  rot0: number;
  trail: { x: number; y: number }[];
  /** A charged Supernova throw. */
  nova?: boolean;
  warnedBonk?: boolean;
  bounceCount?: number;
}

export class LevelScene {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  L: LevelDef;
  o: SceneOpts;
  planet: Planet;
  throwsLeft: number;
  timeLeft = 0;
  throwsUsed = 0;
  throwsTotal = 0;
  qi = 0; // index of the next object to deal
  cur: Kind;
  next: Kind;
  get upcoming(): Kind[] {
    return this.o.boosters.scope
      ? [this.next, ...Array.from({ length: 4 }, (_, i) => this.L.queue[(this.qi + i) % this.L.queue.length])]
      : [this.next];
  }
  shot: Shot | null = null;
  skyState: SkyState = { ...EMPTY_SKY_STATE, brokenRocks: [] };
  rockWobbles: { index: number; until: number }[] = [];
  practiceBonkUsed = false;
  mistTipShown = false;
  gustTipShown = false;
  surpriseBonks = 0;
  lastHit: FlightHit | null = null;
  aimFrom: { x: number; y: number } | null = null;
  aimTo: { x: number; y: number } | null = null;
  drawnAim: preview.DrawnAim | null = null;
  aimGeneration = 0;
  rot = 0;
  time = 0;
  particles: Particle[] = [];
  rings: Ring[] = [];
  discoverQueue: string[] = [];
  fusionDiscoverQueue: ReactionId[] = [];
  discoverBusy = false;
  finishing = false;
  leftover = 0;
  popups: Popup[] = [];
  feedback: FeedbackState<FeedbackItem> = feedbackState();
  ghosts: { species: string; sector: number; wants: BiomeId; started: number; throw: number }[] = [];
  goalPulse: { sectors: number[]; until: number } | null = null;
  nova: RoundState['nova'] = { charge: 0, threshold: 12, fired: 0, held: false };
  combo: RoundState['combo'] = { links: 0, rest: false, best: 0 };
  comboCharge = 0;
  reactionsSeen = new Set<ReactionId>();
  reactionEvents: ReactionId[] = [];
  landedKinds: (Kind | null)[] = Array(SECTORS).fill(null);
  comboEvents: { links: number; reaction?: ReactionId; superFusion: boolean }[] = [];
  comboIconsCurrent: ReactionId[] = [];
  comboIconsBest: ReactionId[] = [];
  hitStopUntil = 0;
  reactionArc: { from: number; to: number; id: ReactionId; until: number } | null = null;
  shake = 0;
  flash: { i: number; t: number }[] = [];
  spawnAnim = new Map<number, number>(); // sector -> anim time
  score: number;
  shownScore: number;
  starsGot = 0;
  private scoreAtThrow = 0;
  private shrugUntil = 0;
  private danceStart = -1;
  private chapterNumber = 1;
  regionBests: number[];
  arrived: Set<string>;
  ended = false;
  paused = false;
  raf = 0;
  last = 0;
  w = 0;
  h = 0;
  stars: { x: number; y: number; r: number; tw: number }[] = [];
  lastPullTick = 0;
  modalOpen: Modal | null = null;
  hintShown: boolean;
  // HUD refs
  hudThrows!: HTMLElement;
  hudFill!: HTMLElement;
  hudScore!: HTMLElement;
  hudStars: HTMLElement[] = [];
  goalsEl!: HTMLElement;
  goalsDone = 0;
  curEl!: HTMLElement;
  nextEl!: HTMLElement;
  descEl!: HTMLElement;
  hintEl!: HTMLElement;
  finishEl!: HTMLElement;
  coachEl!: HTMLElement;
  discoverEl!: HTMLElement;
  liveEl!: HTMLElement;
  coachEvents = new Set<CoachEvent>();
  practiceGifts = 0;
  firstCreaturePointsShown = false;
  liveTimer = 0;
  coachTimer = 0;
  onResolvedThrow?: () => void;
  suppressNovaLabel = false;
  focusTarget: { kind: 'ring' | 'queue'; until: number } | null = null;

  startedAt = performance.now();

  constructor(level: LevelDef, opts: SceneOpts) {
    if (!opts.endless) ledger.count('round_started');
    this.L = level;
    if (level.sky.obstacle) opts.onSkySeen?.(level.sky.obstacle);
    this.chapterNumber = chapterOf(level.n).n;
    this.o = opts;
    if (level.sky.gusty && opts.gustTip) this.o.coach = { ...opts.coach, 0: opts.gustTip };
    this.planet = clonePlanet(level.start);
    if (opts.boosters.spark) fx.sparkStart(this.planet, lifeSparkSectors(level, this.planet));
    this.regionBests = this.planet.sectors.map((s) => BIOMES[s.biome].value);
    this.arrived = new Set(this.planet.sectors.map((s) => s.species).filter((id): id is string => !!id));
    this.throwsLeft = level.throws + opts.extraThrows + (opts.boosters.shower ? 3 : 0);
    this.throwsTotal = this.throwsLeft;
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
    if (import.meta.env.DEV) {
      const scene = this;
      this.devHook = {
        get w() {
          return scene.w;
        },
        aimAt: (sector) => this.aimAt(sector),
        aimAtClear: (sector) => preview.aimAt(this, sector, true),
        drawPreview: (vector) => {
          this.aimFrom = { x: this.launch.x, y: this.launch.y };
          this.aimTo = { x: this.launch.x - vector.vx / PULL_TO_SPEED, y: this.launch.y - vector.vy / PULL_TO_SPEED };
          this.drawnAim = null;
          this.drawAim();
          const drawn = this.drawnAim;
          const clearWorld = { ...this.flightWorld(this.rot), sky: undefined };
          const clear = flyFull(STAR_SLING, { ...this.launch, ...vector, elapsed: 0 }, clearWorld, this.time);
          return { drawn, clear, predicted: this.predict(vector.vx, vector.vy) };
        },
        fire: (vector) => {
          if (this.canAim()) {
            const drawn =
              this.drawnAim && Math.hypot(this.drawnAim.vx - vector.vx, this.drawnAim.vy - vector.vy) < 1e-6 ? this.drawnAim : undefined;
            this.aimFrom = this.aimTo = this.drawnAim = null;
            this.fire(drawn?.vx ?? vector.vx, drawn?.vy ?? vector.vy, drawn);
          }
        },
        predict: (vx, vy) => this.predict(vx, vy).hit ?? { kind: 'miss' },
        get lastHit() {
          return scene.lastHit;
        },
        roundTime: () => this.time,
        get surpriseBonks() {
          return scene.surpriseBonks;
        },
      };
      window.__scene = this.devHook;
    }
    this.raf = requestAnimationFrame(() => {
      if (this.destroyed) return;
      this.resize();
      this.renderHud();
      this.showCoach(0);
      const intro = opts.intro
        ? roundIntro(level.n, opts.intro)
        : !opts.competitive && !opts.endless && !opts.timeLimit
          ? roundIntro(level.n)
          : undefined;
      if (intro) this.introCard(intro.id);
      this.raf = requestAnimationFrame(this.frame);
    });
    window.addEventListener('resize', this.resize);
  }

  get rules(): RoundRules {
    return this.o.rules ?? rulesForLevel(this.L.n);
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    return hud.buildHud(this);
  }

  twistLabel() {
    return hud.twistLabel(this);
  }

  barMax() {
    return hud.barMax(this);
  }

  renderHud() {
    return hud.renderHud(this);
  }

  /** Score counter "heats up" on big gains (Balatro-style escalation). */
  heat(delta: number) {
    return hud.heat(this, delta);
  }
  heatTimer = 0;

  renderScore() {
    return hud.renderScore(this);
  }

  lastClock = -1;
  renderClock() {
    return hud.renderClock(this);
  }

  /** Celebrate newly earned stars (from score rising, or goals completing). */
  checkStars() {
    const before = this.starsGot;
    const result = hud.checkStars(this);
    if (this.starsGot > before) {
      this.cheerUntil = Math.max(this.cheerUntil, this.time + 0.9);
      if (this.starsGot === 3) this.danceStart = this.time;
    }
    return result;
  }

  /** Stars that count: every goal must be met first. */
  starsNow(score = this.score) {
    return hud.starsNow(this, score);
  }

  goalIcon(g: Goal) {
    return hud.goalIcon(this, g);
  }

  renderGoals() {
    return hud.renderGoals(this);
  }

  get over() {
    return this.o.timeLimit ? this.timeLeft <= 0 : this.throwsLeft <= 0;
  }

  renderFinish() {
    return hud.renderFinish(this);
  }

  /** "Meteor finale": leftover throws rain down as a stardust bonus. */
  finishEarly() {
    return hud.finishEarly(this);
  }

  swap() {
    return hud.swap(this);
  }

  // ---------------------------------------------------------------- geometry
  resize = () => fx.resize(this);

  get cx() {
    return sceneGeometry(this.w, this.h, this.L.size).cx;
  }
  /** 0..1 progress of the "fly to your galaxy" exit animation. */
  exitK = 0;
  get cy() {
    const k = this.exitK * this.exitK;
    return sceneGeometry(this.w, this.h, this.L.size).cy - k * this.h * 0.5;
  }
  get R() {
    return sceneGeometry(this.w, this.h, this.L.size).R * (1 - this.exitK * 0.85);
  }
  get launch() {
    return sceneGeometry(this.w, this.h, this.L.size).launch;
  }
  /** Moons that block shots (Moon Guard: one; Twin Moons: two, orbiting opposite ways). */
  get moons() {
    return fx.moons(this);
  }

  /** Solar Wind: sideways push in px/s², direction fixed per level. */
  get wind() {
    return this.L.spin > 0 ? 170 : -170;
  }

  /** Planet spin rate right now (Wobbly Spin swings back and forth). */
  spinNow(time = this.time) {
    return this.L.twist === 'wobble' ? this.L.spin * 1.7 * Math.cos(time * 0.9) : this.L.spin;
  }

  // ---------------------------------------------------------------- input
  bindInput() {
    const pos = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * this.w) / r.width, y: ((e.clientY - r.top) * this.h) / r.height };
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.aimPointer !== null || !this.canAim()) return;
      const point = pos(e);
      if (preview.queueHit(this, point.x, point.y)) {
        this.swap();
        return;
      }
      this.aimPointer = e.pointerId;
      this.aimGeneration++;
      this.canvas.setPointerCapture(e.pointerId);
      this.aimFrom = pos(e);
      this.aimTo = pos(e);
      this.drawnAim = null;
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
      const from = this.aimFrom;
      const p = this.pull();
      const releaseTo = pos(e);
      const releaseLen = Math.hypot(from.x - releaseTo.x, from.y - releaseTo.y);
      if (!this.canAim()) {
        this.aimFrom = this.aimTo = this.drawnAim = null;
        return;
      }
      const ringDistance = Math.hypot(from.x - this.launch.x, from.y - this.launch.y);
      if (
        p.len < 18 &&
        releaseLen < 18 &&
        this.L.n >= 24 &&
        this.novaOn &&
        this.nova.charge >= this.nova.threshold &&
        ringDistance >= 39 &&
        ringDistance <= 69 &&
        !preview.queueHit(this, from.x, from.y)
      ) {
        this.nova.held = !this.nova.held;
        this.aimFrom = this.aimTo = this.drawnAim = null;
        haptic.tick();
        sfx.click();
        return;
      }
      if (this.drawnAim) {
        const drawn = this.drawnAim;
        this.aimFrom = this.aimTo = this.drawnAim = null;
        this.fire(drawn.vx, drawn.vy, drawn);
      } else if (releaseLen >= 18) {
        // A sub-frame fling must display its preview for a frame before it can launch.
        this.aimTo = releaseTo;
        const generation = this.aimGeneration;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (this.destroyed || generation !== this.aimGeneration) return;
            const drawn = this.drawnAim;
            this.aimFrom = this.aimTo = this.drawnAim = null;
            if (drawn && this.canAim()) this.fire(drawn.vx, drawn.vy, drawn);
          }),
        );
      } else this.aimFrom = this.aimTo = this.drawnAim = null;
    };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== this.aimPointer) return;
      this.aimPointer = null;
      this.aimGeneration++;
      this.aimFrom = this.aimTo = this.drawnAim = null;
    });
  }

  aimPointer: number | null = null;
  destroyed = false;
  private devHook?: Window['__scene'];

  /** Can the player start or release a throw right now? */
  canAim() {
    return !this.shot && !this.ended && !this.paused && !this.modalOpen && !this.finishing && !this.over;
  }

  pull() {
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

  aimAt(sector: number) {
    return preview.aimAt(this, sector);
  }

  fire(vx: number, vy: number, drawn?: preview.DrawnAim) {
    this.scoreAtThrow = this.score;
    this.lastHit = null;
    const { x, y } = this.launch;
    const nova = novaForThrow(this.roundState());
    const warnedBonk = drawn?.badge ?? needsBonkBadge(this.predict(vx, vy).hit);
    this.shot = {
      kind: this.cur,
      x,
      y,
      vx,
      vy,
      t: 0,
      carry: 0,
      t0: drawn?.roundTime ?? this.time,
      rot0: drawn?.rotation ?? this.rot,
      trail: [],
      nova,
      warnedBonk,
      bounceCount: 0,
    };
    if (nova) {
      sfx.combo(6);
      haptic.heavy();
    }
    if (Number.isFinite(this.throwsLeft)) this.throwsLeft--;
    this.throwsUsed++;
    this.coachEl.classList.remove('show');
    clearTimeout(this.coachTimer);
    sfx.objectLaunch(this.shot.kind);
    haptic.object(this.shot.kind);
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
  flightWorld(rotation: number): FlightWorld {
    return fx.flightWorld(this, rotation);
  }

  predict(vx: number, vy: number) {
    return preview.predictFlight(this, vx, vy);
  }

  surfaceR(i: number) {
    return this.R * surfaceK(this.planet.sectors[i]);
  }

  roundState(): RoundState {
    return fx.roundState(this);
  }

  roundModifiers(): RoundModifiers {
    return fx.roundModifiers(this);
  }

  update(dt: number) {
    return fx.update(this, dt);
  }

  land(sh: Shot, i: number) {
    return fx.land(this, sh, i);
  }

  announce(id: string, at: number, firstArrival: boolean) {
    return hud.announce(this, id, at, firstArrival);
  }

  showDiscover() {
    return hud.showDiscover(this);
  }

  showCoach(k: number) {
    hud.showCoach(this, k);
    if (k === 0 && this.L.sky.gusty && this.o.gustTip) {
      this.o.onGustSeen?.();
      this.o.gustTip = undefined;
    }
  }

  showCoachEvent(event: CoachEvent) {
    return hud.showCoachEvent(this, event);
  }

  introCard(id: string) {
    const row = UNLOCKS.find((x) => x.id === id && x.intro);
    if (row) return hud.introCard(this, row);
  }

  endTimer = 0;
  afterShot() {
    if (this.score <= this.scoreAtThrow) this.shrugUntil = this.time + 0.75;
    return hud.afterShot(this);
  }

  checkEnd() {
    return hud.checkEnd(this);
  }

  endModal(stars: number) {
    return hud.endModal(this, stars);
  }

  exitRaf = 0;

  finish(stars: number) {
    return hud.finish(this, stars);
  }

  pause() {
    return hud.pause(this);
  }

  // ---------------------------------------------------------------- fx helpers
  /** Drifting streaks that show the wind's direction and strength. */
  drawWind() {
    return fx.drawWind(this);
  }

  burst(x: number, y: number, color: string, n: number, speed: number) {
    return fx.burst(this, x, y, color, n, speed);
  }

  ring(x: number, y: number, color: string, r: number) {
    return fx.ring(this, x, y, color, r);
  }

  cheerUntil = 0;
  private readonly fallbackLook: Look = { ...DEFAULT_LOOK };
  /** Bonus life from Object Lab perks (on top of the planet's own life). */
  bonus = 0;
  get look(): Look {
    const look = this.o.look ?? this.fallbackLook;
    look.expression = this.aimFrom ? 'focused' : this.shrugUntil > this.time ? 'shrug' : this.cheerUntil > this.time ? 'cheer' : undefined;
    look.dance = this.danceStart >= 0 && this.time - this.danceStart < 1 ? this.time - this.danceStart : undefined;
    return look;
  }

  emoteAt = -1;
  /** Comet Guardian health (boss planets). */
  bossHp = BOSS_HP;
  bossFlash = 0;

  hitBoss(x: number, y: number) {
    return fx.hitBoss(this, x, y);
  }

  /** The Comet Guardian: a grumpy comet with a fiery tail and health pips. */
  drawBoss() {
    return fx.drawBoss(this);
  }
  confetti() {
    return fx.confetti(this);
  }

  popup(x: number, y: number, text: string, color: string, size: number, dur = 1.2, priority = 1) {
    return fx.popup(this, x, y, text, color, size, dur, priority);
  }

  sectorPoint(i: number, k: number): [number, number] {
    const a = this.rot + (i + 0.5) * ((Math.PI * 2) / SECTORS);
    const r = this.R * k;
    return [this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r];
  }

  // ---------------------------------------------------------------- render
  frame = (now: number) => {
    const dt = Math.min(0.033, (now - (this.last || now)) / 1000);
    this.last = now;
    try {
      if (!this.paused && !this.modalOpen) this.update(dt);
      this.draw();
    } finally {
      if (!this.destroyed) this.raf = requestAnimationFrame(this.frame);
    }
  };

  draw() {
    return fx.draw(this);
  }

  drawPlanet() {
    drawChapterBackdrop(this.g, this.chapterNumber, this.w, this.h, this.time, !!this.o.reduceMotion);
    return fx.drawPlanet(this);
  }

  predictCache: {
    key: string;
    title: string;
    lost: string;
    reaction?: ReactionId;
    comboStep: number;
    comboEnd: boolean;
    changed: number[];
  } | null = null;
  previewTextScale = 0;

  /** Highlight the landing region and preview what it will become. */
  drawLanding(i: number) {
    return preview.drawLanding(this, i);
  }

  /** Supernova meter: a ring around the launcher that fills as you transform land. */
  /** The Supernova is introduced after the first tutorial planets. */
  get novaOn() {
    return this.L.nova;
  }

  drawNovaMeter(x: number, y: number, aiming: boolean) {
    return preview.drawNovaMeter(this, x, y, aiming);
  }

  drawAim() {
    return preview.drawAim(this);
  }

  destroy() {
    clearTimeout(this.endTimer);
    clearTimeout(this.liveTimer);
    clearTimeout(this.coachTimer);
    this.ended = true;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.exitRaf);
    window.removeEventListener('resize', this.resize);
    this.modalOpen?.close();
    // the next round may already have installed its own hook
    if (import.meta.env.DEV && window.__scene === this.devHook) delete window.__scene;
  }
}

declare global {
  interface Window {
    __scene?: {
      readonly w: number;
      aimAt: (sector: number) => { vx: number; vy: number };
      aimAtClear: (sector: number) => { vx: number; vy: number };
      drawPreview: (vector: { vx: number; vy: number }) => {
        drawn: preview.DrawnAim | null;
        clear: ReturnType<typeof flyFull>;
        predicted: ReturnType<LevelScene['predict']>;
      };
      fire: (vector: { vx: number; vy: number }) => void;
      predict: (vx: number, vy: number) => { kind: string; sector?: number; by?: string };
      readonly lastHit: { kind: string; sector?: number; by?: string } | null;
      roundTime: () => number;
      readonly surpriseBonks: number;
    };
  }
}
