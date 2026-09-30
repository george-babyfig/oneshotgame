import type { Kind } from '../core/world';
import type { FlightHit } from '../core/flight';
import { EMPTY_SKY_STATE, type SkyState } from '../core/sky';
import type { TroubleEvent } from '../core/troubles';

export function troubleFeel(event: TroubleEvent): { color: string; haptic: FeelHaptic } {
  return {
    color:
      event.kind === 'settled' || event.kind === 'blocked'
        ? '#a4e8bc'
        : event.id === 'vent'
          ? '#ffb587'
          : event.id === 'vine'
            ? '#9ee68d'
            : '#b8e8ff',
    haptic: event.kind === 'settled' ? 'medium' : 'light',
  };
}

export type FeelSound = 'thud' | 'chime' | 'pop' | 'rumble' | 'patter' | 'sparkle';
export type FeelHaptic = 'light' | 'medium';
export type TrailStyle = 'stone' | 'crystal' | 'leaf' | 'ember' | 'drop' | 'star';

export const REACTION_HAPTIC: Record<'fusion' | 'clash', FeelHaptic> = { fusion: 'medium', clash: 'light' };
export const COMBO_HAPTIC: FeelHaptic = 'light';

export function needsBonkBadge(hit: FlightHit | null): boolean {
  return hit?.kind === 'bonk' || hit?.kind === 'fizzle';
}

export function surpriseBonk(warned: boolean, hit: FlightHit | null): boolean {
  return needsBonkBadge(hit) && !warned;
}

export function restoredSkyState(saved?: SkyState): SkyState {
  return {
    ...EMPTY_SKY_STATE,
    brokenRocks: Array.isArray(saved?.brokenRocks)
      ? saved.brokenRocks.filter((index) => Number.isInteger(index) && index >= 0 && index < 4)
      : [],
  };
}

export function bonkRefund(
  gentle: boolean,
  teachingPlanet: boolean,
  practiceBonkUsed: boolean,
): { refund: boolean; practiceUsed: boolean } {
  const practice = teachingPlanet && !practiceBonkUsed;
  return { refund: gentle || practice, practiceUsed: practiceBonkUsed || practice };
}

export function rockAfterBonk(state: SkyState, index: number, refunded: boolean): SkyState {
  return refunded || state.brokenRocks.includes(index) ? state : { ...state, brokenRocks: [...state.brokenRocks, index] };
}

export const OBJECT_FEEL: Record<Kind, { launch: FeelSound; impact: FeelSound; haptic: FeelHaptic; trail: TrailStyle; burst: string }> = {
  rock: { launch: 'thud', impact: 'thud', haptic: 'medium', trail: 'stone', burst: '#d6c8bb' },
  ice: { launch: 'chime', impact: 'chime', haptic: 'light', trail: 'crystal', burst: '#b9efff' },
  seed: { launch: 'pop', impact: 'pop', haptic: 'light', trail: 'leaf', burst: '#b7f083' },
  magma: { launch: 'rumble', impact: 'rumble', haptic: 'medium', trail: 'ember', burst: '#ff9b54' },
  storm: { launch: 'patter', impact: 'patter', haptic: 'medium', trail: 'drop', burst: '#a9d7ff' },
  sun: { launch: 'sparkle', impact: 'sparkle', haptic: 'light', trail: 'star', burst: '#ffe28b' },
};

export interface FeedbackItem {
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  duration: number;
  priority: number;
  queuedAt?: number;
}

export interface FeedbackState<T extends FeedbackItem> {
  active: (T & { startedAt: number })[];
  waiting: T[];
  lastStart: number;
}

export function feedbackState<T extends FeedbackItem>(): FeedbackState<T> {
  return { active: [], waiting: [], lastStart: -Infinity };
}

export function enqueueFeedback<T extends FeedbackItem>(state: FeedbackState<T>, item: T): FeedbackState<T> {
  const waiting = [...state.waiting, item];
  if (waiting.length > 8) {
    const least = waiting.reduce((index, value, i) => (value.priority < waiting[index].priority ? i : index), 0);
    waiting.splice(least, 1);
  }
  return { ...state, waiting };
}

export function advanceFeedback<T extends FeedbackItem>(state: FeedbackState<T>, now: number): FeedbackState<T> {
  const active = state.active.filter((item) => now - item.startedAt < item.duration * 1000);
  const waiting = state.waiting.filter((item) => item.priority >= 2 || now - (item.queuedAt ?? now) < 800);
  let lastStart = state.lastStart;
  if (active.length < 2 && waiting.length && now - lastStart >= 250) {
    const index = waiting.reduce((best, item, i) => (item.priority > waiting[best].priority ? i : best), 0);
    const next = waiting.splice(index, 1)[0];
    active.push({ ...next, startedAt: now });
    lastStart = now;
  }
  return { active, waiting, lastStart };
}
