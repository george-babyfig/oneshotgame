// Game Center (iOS only). Uses the app's own native plugin (ios/App/App/GameCenterPlugin.swift);
// on the web every call is a silent no-op.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LEADERBOARDS, pendingAchievements } from '../meta/achievements';
import { totalStars, type Profile } from '../meta/profile';

interface GameCenterPlugin {
  authenticate(o: { interactive: boolean }): Promise<{ authenticated: boolean }>;
  submitScore(o: { leaderboardId: string; score: number }): Promise<{ submitted: boolean }>;
  reportAchievements(o: { achievements: { id: string; percent: number }[] }): Promise<{ reported: boolean }>;
  showDashboard(): Promise<{ shown: boolean }>;
}

const GC = registerPlugin<GameCenterPlugin>('GameCenter');
const available = () => Capacitor.getPlatform() === 'ios';
let signedIn = false;

export async function gcSignIn(interactive = false) {
  if (!available()) return false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      GC.authenticate({ interactive }),
      new Promise<{ authenticated: boolean }>((resolve) => {
        timeout = setTimeout(() => resolve({ authenticated: false }), 20000);
      }),
    ]);
    signedIn = result.authenticated;
  } catch {
    signedIn = false;
  } finally {
    clearTimeout(timeout);
  }
  return signedIn;
}

export function gcAvailable() {
  return available();
}

export function gcIsSignedIn() {
  return signedIn;
}

export async function gcScore(board: keyof typeof LEADERBOARDS, score: number) {
  if (!signedIn || score <= 0) return;
  try {
    await GC.submitScore({ leaderboardId: LEADERBOARDS[board], score: Math.floor(score) });
  } catch {
    /* best effort */
  }
}

/** Report newly earned achievements and refresh the headline leaderboards. */
export async function gcSync(p: Profile, save: () => void) {
  if (!signedIn) return;
  const pending = pendingAchievements(p);
  if (pending.length) {
    try {
      const r = await GC.reportAchievements({ achievements: pending.map((a) => ({ id: a.id, percent: 100 })) });
      if (r.reported) {
        p.gcReported = [...new Set([...p.gcReported, ...pending.map((a) => a.id)])];
        save();
      }
    } catch {
      /* try again next time */
    }
  }
  gcScore('stars', totalStars(p));
  gcScore('life', p.stats.bestLife);
  gcScore('rush', p.stats.rushBest);
}

export async function gcDashboard(p: Profile) {
  if (!available() || !p.settings.gameCenter || !signedIn) return false;
  try {
    return (await GC.showDashboard()).shown;
  } catch {
    return false;
  }
}
