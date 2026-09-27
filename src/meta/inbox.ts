// Inbox: letters shipped with the app, delivered when something happens
// (milestones, seasons, meteor showers, new friends). Some carry a small gift.
import type { Profile } from './profile';
import { applyReward, type Reward } from './progression';
import { seasonOf, skyEventOn } from './seasons';
import { chaptersDone, friendLevel, FRIEND_LEVELS, homeUnlocked } from './homeworld';

export interface Mail {
  id: string;
  /** Which letter this is (a RULES id). */
  kind: string;
  at: number;
  read: boolean;
  claimed: boolean;
  /** Template variables (e.g. a creature id or chapter number). */
  vars?: Record<string, string | number>;
}

export interface LetterDef {
  from: string;
  /** Creature id for the portrait (or '' for Mission Control). */
  face?: string;
  title: string;
  body: string;
  gift?: Reward;
}

interface Rule {
  kind: string;
  /** Mail id, possibly with a suffix so it can repeat (per season, per chapter...); null = not yet. */
  key: (p: Profile, now: Date) => string | null;
  letter: (vars: Record<string, string | number>) => LetterDef;
  vars?: (p: Profile, now: Date) => Record<string, string | number>;
}

const MC = 'Mission Control';

const RULES: Rule[] = [
  {
    kind: 'welcome',
    key: (p) => (p.tutorial ? 'welcome' : null),
    letter: () => ({
      from: MC,
      title: 'Welcome, Keeper!',
      body: 'Your job is simple: fling, grow, and bring planets to life. We packed a little something for the trip.',
      gift: { gems: 20 },
    }),
  },
  {
    kind: 'homeworld',
    key: (p) => (homeUnlocked(p) ? 'homeworld' : null),
    letter: () => ({
      from: MC,
      title: 'A planet of your own',
      body: 'We found you a quiet little world. Build a Stardust Mill and a Critter Den — it will grow with every chapter you finish.',
      gift: { dust: 300 },
    }),
  },
  {
    kind: 'chapter',
    key: (p) => {
      const n = chaptersDone(p);
      return n > 0 ? `chapter-${n}` : null;
    },
    vars: (p) => ({ n: chaptersDone(p) }),
    letter: () => ({
      from: MC,
      title: 'Chapter {n} complete!',
      body: 'Every planet in the chapter is alive and orbiting your galaxy. The crew is proud of you. Onward!',
      gift: { gems: 15, boosters: { spark: 1 } },
    }),
  },
  {
    kind: 'resident',
    key: (p) => (p.home.residents.length ? 'first-resident' : null),
    vars: (p) => ({ c: p.home.residents[0]?.species ?? '' }),
    letter: () => ({
      from: '{c}',
      face: '{c}',
      title: 'Thank you for my new home',
      body: 'The den is cosy and the view is wonderful. I will ask for small favours sometimes. Is that okay? I think it is.',
    }),
  },
  {
    kind: 'best',
    key: (p) => {
      const best = p.home.residents.find((r) => friendLevel(r.fp) >= FRIEND_LEVELS.length);
      return best ? `best-${best.species}` : null;
    },
    vars: (p) => ({ c: p.home.residents.find((r) => friendLevel(r.fp) >= FRIEND_LEVELS.length)?.species ?? '' }),
    letter: () => ({
      from: '{c}',
      face: '{c}',
      title: 'Best friends forever',
      body: 'I made you something to remember our adventures by. Please keep it somewhere safe.',
      gift: { gems: 25 },
    }),
  },
  {
    kind: 'season',
    key: (p, now) => (p.tutorial ? `season-${now.getFullYear()}-${seasonOf(now, p.settings.hemi)}` : null),
    vars: (p, now) => ({ s: seasonOf(now, p.settings.hemi) }),
    letter: (v) => ({
      from: MC,
      title: SEASON_TITLES[v.s as string] ?? 'A new season',
      body: SEASON_BODIES[v.s as string] ?? '',
      gift: { boosters: { shower: 1 } },
    }),
  },
  {
    kind: 'sky',
    key: (p, now) => {
      const e = skyEventOn(now);
      return p.tutorial && e ? `sky-${now.getFullYear()}-${e.id}` : null;
    },
    vars: (_p, now) => ({ e: skyEventOn(now)?.name ?? '' }),
    letter: () => ({
      from: MC,
      title: 'Look up tonight!',
      body: 'The {e} is happening for real, right now. If your sky is clear, go outside and look up. In the game, Supernovas charge twice as fast.',
    }),
  },
  {
    kind: 'pass',
    key: (p) => (p.pass ? 'pass' : null),
    letter: () => ({
      from: MC,
      title: 'Welcome aboard, Captain',
      body: 'Your Star Captain uniform is waiting in the Workshop, and the golden lane of the Star Road is open. Thank you for supporting Pocket Planet!',
    }),
  },
  {
    kind: 'calendar',
    key: (p) => (p.daily.streak >= 28 ? 'calendar-28' : null),
    letter: () => ({
      from: MC,
      title: 'Twenty-eight stamps!',
      body: 'A whole Star Calendar. Your Starlight suit is in the Workshop — it glows best at night.',
    }),
  },
];

const SEASON_TITLES: Record<string, string> = {
  spring: 'Spring has sprung',
  summer: 'Hello, summer',
  autumn: 'Autumn is here',
  winter: 'Winter wonderland',
};
const SEASON_BODIES: Record<string, string> = {
  spring: 'Blossoms are drifting across the galaxy. Perfect weather for planting seeds.',
  summer: 'Warm nights mean fireflies on your Homeworld. Look for them after dark.',
  autumn: 'Leaves are falling everywhere, even in space. Cosy season has begun.',
  winter: 'Snow is falling on every planet. Wrap up warm, Keeper!',
};

/** Deliver any letters whose moment has come. Returns how many arrived. */
export function checkMail(p: Profile, now = new Date()): number {
  let n = 0;
  for (const r of RULES) {
    const id = r.key(p, now);
    if (!id || p.mail.some((m) => m.id === id)) continue;
    p.mail.unshift({ id, kind: r.kind, at: now.getTime(), read: false, claimed: false, vars: r.vars?.(p, now) });
    n++;
  }
  if (p.mail.length > 60) p.mail.length = 60;
  return n;
}

export function letterOf(m: Mail): LetterDef | null {
  const r = RULES.find((x) => x.kind === m.kind);
  return r ? r.letter(m.vars ?? {}) : null;
}

export function unread(p: Profile) {
  return p.mail.filter((m) => !m.read || (!m.claimed && letterOf(m)?.gift)).length;
}

export function claimMail(p: Profile, id: string): Reward | null {
  const m = p.mail.find((x) => x.id === id);
  if (!m) return null;
  m.read = true;
  const gift = letterOf(m)?.gift;
  if (!gift || m.claimed) return null;
  m.claimed = true;
  applyReward(p, gift);
  return gift;
}

/** Every translatable string in the letters (for the i18n coverage test). */
export function letterStrings(): string[] {
  const out = new Set<string>();
  for (const r of RULES)
    for (const s of ['spring', 'summer', 'autumn', 'winter']) {
      const L = r.letter({ s, n: 1, c: '', e: '' });
      [L.from, L.title, L.body].forEach((x) => x && out.add(x));
    }
  return [...out];
}
