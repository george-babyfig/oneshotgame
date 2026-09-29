/** One interrupting Home card per open, after time away. */
export type PopupKind = 'away' | 'intro' | 'inbox' | 'festival' | 'starter';

export interface PopupState {
  homeSeen: boolean;
  shownThisOpen: boolean;
  awayMs: number;
}

const PRIORITY: PopupKind[] = ['away', 'intro', 'inbox', 'festival', 'starter'];
export const POPUP_COOLDOWN_MS = 30 * 60_000;

export function choosePopup(state: PopupState, ready: readonly PopupKind[]): PopupKind | null {
  if (!state.homeSeen || state.shownThisOpen) return null;
  if (state.awayMs < POPUP_COOLDOWN_MS) return null;
  return PRIORITY.find((kind) => ready.includes(kind)) ?? null;
}
