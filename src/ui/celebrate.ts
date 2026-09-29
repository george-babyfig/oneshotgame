/** Short, tap-skippable presentations for earned milestones. */
export type CelebrationKind = 'results' | 'creature' | 'chest' | 'passport' | 'costume' | 'homeworld' | 'fusion';

export interface CelebrationBeat {
  at: number;
  play: (instant: boolean) => void;
}

export interface CelebrationOptions {
  root: HTMLElement;
  reduceMotion: boolean;
  firstEver?: boolean;
  duration?: number;
  beats: CelebrationBeat[];
  onComplete?: () => void;
}

export function celebrate(kind: CelebrationKind, opts: CelebrationOptions): { skip: () => void; done: Promise<void> } {
  const limit = opts.firstEver ? 4000 : 2000;
  const duration = Math.min(limit, Math.max(0, opts.duration ?? 1600));
  const beats = [...opts.beats].sort((a, b) => a.at - b.at);
  const pending: number[] = [];
  let next = 0;
  let finished = false;
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => (resolveDone = resolve));
  opts.root.dataset.celebration = kind;
  opts.root.classList.toggle('celebrate-still', opts.reduceMotion);
  const playThrough = (at: number, instant: boolean) => {
    while (next < beats.length && beats[next].at <= at) beats[next++].play(instant);
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    pending.forEach(clearTimeout);
    opts.root.removeEventListener('pointerdown', skip);
    opts.root.classList.add('celebrate-done');
    opts.onComplete?.();
    resolveDone();
  };
  const skip = () => {
    playThrough(Infinity, true);
    finish();
  };
  opts.root.addEventListener('pointerdown', skip);
  if (opts.reduceMotion) {
    playThrough(Infinity, true);
    pending.push(window.setTimeout(finish, Math.min(220, duration)));
  } else {
    for (const beat of beats) pending.push(window.setTimeout(() => playThrough(beat.at, false), Math.min(duration, Math.max(0, beat.at))));
    pending.push(window.setTimeout(skip, duration));
  }
  return { skip, done };
}
