import { describe, expect, it } from 'vitest';
import { ScreenHistory } from '../src/ui/app';

describe('screen history', () => {
  it('returns through nested screens in visit order', () => {
    const history = new ScreenHistory();
    history.visit('collection', 'lifebook');
    history.visit('lifebook', 'album');
    expect(history.pop()).toBe('lifebook');
    expect(history.pop()).toBe('collection');
    expect(history.pop()).toBeUndefined();
  });

  it('clears old destinations when a tab is selected', () => {
    const history = new ScreenHistory();
    history.visit('home', 'map');
    history.reset();
    history.visit('missions', 'road');
    expect(history.pop()).toBe('missions');
    expect(history.pop()).toBeUndefined();
  });

  it('does not save same-screen refreshes or live rounds', () => {
    const history = new ScreenHistory();
    history.visit('styles', 'styles');
    history.visit('home', 'level');
    history.visit('level', 'home');
    expect(history.length).toBe(0);
  });
});
