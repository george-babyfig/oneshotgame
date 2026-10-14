import { describe, expect, it } from 'vitest';
import { advanceFeedback, enqueueFeedback, feedbackState, type FeedbackItem } from '../src/ui/feel';

const item = (text: string, priority = 1): FeedbackItem => ({
  text,
  x: 0,
  y: 0,
  color: '#fff',
  size: 16,
  duration: 1,
  priority,
});

describe('in-round feedback governor', () => {
  it('starts at most two popups with at least 250 ms between them', () => {
    let state = feedbackState<FeedbackItem>();
    for (const text of ['one', 'two', 'three']) state = enqueueFeedback(state, item(text));
    state = advanceFeedback(state, 0);
    expect(state.active.map((value) => value.text)).toEqual(['one']);
    state = advanceFeedback(state, 249);
    expect(state.active).toHaveLength(1);
    state = advanceFeedback(state, 250);
    expect(state.active).toHaveLength(2);
    state = advanceFeedback(state, 500);
    expect(state.active).toHaveLength(2);
    state = advanceFeedback(state, 1000);
    expect(state.active.map((value) => value.text)).toEqual(['two', 'three']);
  });

  it('drops the least important waiting popup on overflow', () => {
    let state = feedbackState<FeedbackItem>();
    state = enqueueFeedback(state, item('low', 0));
    for (let index = 0; index < 8; index++) state = enqueueFeedback(state, item(`important-${index}`, 2));
    expect(state.waiting).toHaveLength(8);
    expect(state.waiting.map((value) => value.text)).not.toContain('low');
  });

  it('shows important news first and lets stale small callouts expire', () => {
    let state = feedbackState<FeedbackItem>();
    state = enqueueFeedback(state, { ...item('bloom', 0), queuedAt: 0 });
    state = enqueueFeedback(state, { ...item('creature', 3), queuedAt: 0 });
    state = advanceFeedback(state, 0);
    expect(state.active.map((value) => value.text)).toEqual(['creature']);
    state = advanceFeedback(state, 850);
    expect(state.waiting).toEqual([]);
    expect(state.active.map((value) => value.text)).toEqual(['creature']);
  });
});
