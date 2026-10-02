import { sfx } from './audio';
import { haptic } from './haptics';
import type { Profile } from '../meta/profile';

export const MOTION = {
  popIn: 360,
  popOut: 180,
  toast: 300,
  tab: 300,
  zoom: 420,
  count: 560,
  fly: 700,
  calm: 160,
} as const;

export const EASE = {
  spring: 'cubic-bezier(.18,1.35,.32,1)',
  out: 'cubic-bezier(.2,.8,.25,1)',
  in: 'cubic-bezier(.7,0,1,.6)',
} as const;

export type RewardKind = 'dust' | 'gems' | 'stars';
export type Point = { x: number; y: number };
export type BurstVariant = 'soft' | 'bright';

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const duration = (ms: number, reduceMotion: boolean) => (reduceMotion ? Math.min(ms, MOTION.calm) : ms);
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const spring = (t: number) => {
  const p = clamp01(t);
  return p === 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(11 * p);
};
export const countValue = (from: number, to: number, elapsed: number, ms = MOTION.count) =>
  Math.round(from + (to - from) * easeOut(elapsed / Math.max(1, ms)));

export const systemReduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const effectiveReduceMotion = (p: Pick<Profile, 'settings'>) => p.settings.reduceMotion || systemReduceMotion();

export const prefersReducedMotion = () =>
  (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) || systemReduceMotion();

const activeCounts = new WeakMap<HTMLElement, () => void>();

function play(el: Element, frames: Keyframe[], ms: number, easing: string = EASE.out): Animation | null {
  if (typeof el.animate !== 'function') return null;
  return el.animate(frames, { duration: duration(ms, prefersReducedMotion()), easing, fill: 'both' });
}

export function popIn(el: HTMLElement) {
  const calm = prefersReducedMotion();
  sfx.sheet();
  haptic.tick();
  return play(
    el,
    calm
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          { opacity: 0, transform: 'scale(.84)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
    MOTION.popIn,
    calm ? EASE.out : EASE.spring,
  );
}

export function popOut(el: HTMLElement): Promise<void> {
  const calm = prefersReducedMotion();
  sfx.page();
  haptic.tick();
  const animation = play(
    el,
    calm
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(.88)' },
        ],
    MOTION.popOut,
    EASE.in,
  );
  return animation
    ? animation.finished.then(
        () => {},
        () => {},
      )
    : Promise.resolve();
}

export function countUp(el: HTMLElement, from: number, to: number, prefix = '', ms = MOTION.count) {
  activeCounts.get(el)?.();
  const calm = prefersReducedMotion();
  if (calm || from === to) {
    el.textContent = `${prefix}${Math.floor(to).toLocaleString('en-US')}`;
    return () => {};
  }
  const start = performance.now();
  haptic.tick();
  let raf = 0;
  let lastTick = -1;
  let waited = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (activeCounts.get(el) === stop) activeCounts.delete(el);
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const frame = (now: number) => {
    raf = 0;
    // a pill inserted during a screen transition may not be in the page yet: wait briefly, never leave a stale number
    if (!el.isConnected) {
      if (++waited > 30) {
        el.textContent = `${prefix}${to.toLocaleString('en-US')}`;
        stop();
        return;
      }
      schedule();
      return;
    }
    const elapsed = now - start;
    const value = countValue(from, to, elapsed, ms);
    el.textContent = `${prefix}${value.toLocaleString('en-US')}`;
    const step = Math.floor((elapsed / ms) * 5);
    if (step !== lastTick && step < 5) {
      lastTick = step;
      sfx.countTick();
    }
    if (elapsed < ms) schedule();
    else {
      el.textContent = `${prefix}${Math.floor(to).toLocaleString('en-US')}`;
      stop();
    }
  };
  activeCounts.set(el, stop);
  schedule();
  return stop;
}

function center(from: Element | Point): Point {
  if (!('getBoundingClientRect' in from)) return from;
  const r = from.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function flyReward(from: Element | Point, kind: RewardKind, amount: number): Promise<void> {
  const target = document.querySelector<HTMLElement>(kind === 'stars' ? '.topbar .pill.stars, .end-stars' : `.topbar .pill.${kind}`);
  if (!target || amount <= 0) return Promise.resolve();
  const origin = center(from);
  const end = center(target);
  const calm = prefersReducedMotion();
  const symbol = kind === 'dust' ? '✨' : kind === 'gems' ? '💎' : '★';
  const chip = document.createElement('span');
  chip.className = `motion-reward ${kind}`;
  chip.textContent = symbol;
  chip.style.left = `${origin.x}px`;
  chip.style.top = `${origin.y}px`;
  document.body.append(chip);
  sfx.rewardFlight();
  haptic.light();
  const animation = play(
    chip,
    calm
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }]
      : [
          { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          {
            opacity: 1,
            transform: `translate(calc(-50% + ${(end.x - origin.x) * 0.55}px), calc(-50% + ${(end.y - origin.y) * 0.15 - 36}px)) scale(1.2)`,
            offset: 0.5,
          },
          { opacity: 0.6, transform: `translate(calc(-50% + ${end.x - origin.x}px), calc(-50% + ${end.y - origin.y}px)) scale(.35)` },
        ],
    MOTION.fly,
  );
  const finish = () => {
    chip.remove();
    target.classList.remove('motion-arrive');
    void target.offsetWidth;
    target.classList.add('motion-arrive');
    sfx.rewardArrive();
    haptic.tick();
  };
  return animation ? animation.finished.then(finish, () => chip.remove()) : Promise.resolve().then(finish);
}

export function burst(at: Element | Point, variant: BurstVariant = 'soft') {
  const origin = center(at);
  const calm = prefersReducedMotion();
  const count = calm ? 1 : variant === 'bright' ? 10 : 6;
  const layer = document.createElement('div');
  layer.className = 'motion-burst';
  layer.style.left = `${origin.x}px`;
  layer.style.top = `${origin.y}px`;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('i');
    const angle = (i / count) * Math.PI * 2;
    const radius = variant === 'bright' ? 56 : 34;
    dot.style.setProperty('--dx', `${Math.cos(angle) * radius}px`);
    dot.style.setProperty('--dy', `${Math.sin(angle) * radius}px`);
    layer.append(dot);
  }
  document.body.append(layer);
  sfx.burst();
  haptic.light();
  window.setTimeout(() => layer.remove(), duration(620, calm));
}

export function sparkle(at: Element | Point) {
  burst(at, 'soft');
}

export function shake(el: HTMLElement, strength = 5) {
  sfx.shake();
  haptic.medium();
  const calm = prefersReducedMotion();
  return play(
    el,
    calm
      ? [{ opacity: 0.7 }, { opacity: 1 }]
      : [{ transform: `translateX(${-strength}px)` }, { transform: `translateX(${strength}px)` }, { transform: 'translateX(0)' }],
    260,
  );
}

export function screenTransition(el: HTMLElement, mode: 'tab' | 'planet' | 'page', direction = 1) {
  const calm = prefersReducedMotion();
  if (mode === 'planet') sfx.zoom();
  else sfx.page();
  haptic.tick();
  const shift = mode === 'tab' ? 32 * Math.sign(direction || 1) : 0;
  const scale = mode === 'planet' ? 0.86 : 0.98;
  return play(
    el,
    calm
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          { opacity: 0, transform: `translateX(${shift}px) scale(${scale})` },
          { opacity: 1, transform: 'translateX(0) scale(1)' },
        ],
    mode === 'planet' ? MOTION.zoom : MOTION.tab,
  );
}

export function menuParticles(count = 12): HTMLElement {
  const layer = document.createElement('div');
  layer.className = 'menu-particles';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('i');
    dot.style.setProperty('--x', `${(i * 37 + 13) % 100}%`);
    dot.style.setProperty('--y', `${(i * 53 + 9) % 100}%`);
    dot.style.setProperty('--time', `${4 + (i % 5)}s`);
    layer.append(dot);
  }
  return layer;
}
