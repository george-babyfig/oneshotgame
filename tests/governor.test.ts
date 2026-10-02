import { describe, expect, it } from 'vitest';
import { choosePopup, POPUP_COOLDOWN_MS } from '../src/meta/governor';

const ready = ['starter', 'festival', 'inbox', 'away'] as const;
const state = { homeSeen: true, shownThisOpen: false, awayMs: POPUP_COOLDOWN_MS };

describe('automatic pop-up governor', () => {
  it('waits for Home and allows one card per app open', () => {
    expect(choosePopup({ ...state, homeSeen: false }, ready)).toBeNull();
    expect(choosePopup({ ...state, shownThisOpen: true }, ready)).toBeNull();
  });

  it('keeps a 30 minute quiet window after a visit', () => {
    expect(choosePopup({ ...state, awayMs: POPUP_COOLDOWN_MS - 1 }, ready)).toBeNull();
    expect(choosePopup({ ...state, awayMs: POPUP_COOLDOWN_MS }, ready)).toBe('away');
  });

  it('chooses one card in priority order', () => {
    expect(choosePopup(state, ready)).toBe('away');
    expect(choosePopup(state, ['intro', 'inbox'])).toBe('intro');
    expect(choosePopup(state, ['starter', 'inbox'])).toBe('inbox');
    expect(choosePopup(state, [])).toBeNull();
  });
});
