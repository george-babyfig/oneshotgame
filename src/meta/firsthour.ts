import type { Kind } from '../core/world';
import type { Profile } from './profile';
import { buildLab, suggestedFirstLab } from './labs';
import { candidates, countOf, denCapacity, invite, type BuildCheck } from './homeworld';
import { FIRST_HOUR_REWARD } from './tuning';
import { earn } from './wallet';

export function firstHourStep(p: Profile): 'lab' | 'friend' | 'done' {
  // An old Homeworld letter reserves the original 300-stardust welcome gift.
  if (p.home.firstHour !== 2 && p.mail.some((m) => m.kind === 'homeworld' && !m.vars?.m10)) p.home.firstHour = 2;
  // A Lab can also be built from a plot's build list.
  if (p.home.firstHour === 0 && p.home.plots.some((b) => b?.type === 'lab')) p.home.firstHour = 1;
  return p.home.firstHour === 0 ? 'lab' : p.home.firstHour === 1 ? 'friend' : 'done';
}
export function firstHourLab(
  p: Profile,
  kind: Kind = suggestedFirstLab(p),
  plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i)),
  now = Date.now(),
): BuildCheck | 'locked' {
  if (firstHourStep(p) !== 'lab') return 'locked';
  // Old saves may still carry debris before the migration clears it.
  if (plot < 0) {
    plot = p.home.plots.findIndex((b) => !b);
    if (plot >= 0) p.home.debris = p.home.debris.filter((i) => i !== plot);
  }
  const check = buildLab(p, plot, kind, now);
  if (check === 'ok') p.home.firstHour = 1;
  return check;
}
export function firstHourFriend(p: Profile, now = Date.now()): { species: string; dust: number } | null {
  if (firstHourStep(p) !== 'friend') return null;
  if (p.home.plots.some((b) => b?.type === 'lab' && b.done && b.done > now)) return null;
  const existing = p.home.residents[0]?.species;
  const species = existing ?? candidates(p)[0]?.id;
  if (!species) return null;
  if (!existing && countOf(p.home, 'den') === 0) {
    let plot = p.home.plots.findIndex((b, i) => !b && !p.home.debris.includes(i));
    if (plot < 0) {
      plot = p.home.plots.findIndex((b) => !b);
      if (plot >= 0) p.home.debris = p.home.debris.filter((i) => i !== plot);
    }
    // An already filled Homeworld keeps its buildings; the welcome Den gets a plot.
    if (plot < 0) plot = p.home.plots.push(null) - 1;
    p.home.plots[plot] = { type: 'den', lv: 1, since: now };
  }
  if (!existing) {
    const den = p.home.plots.find((b) => b?.type === 'den');
    if (den?.done && den.done > now) delete den.done;
    if (p.home.residents.length >= denCapacity(p.home, now) && den && den.lv < 5) den.lv++;
    if (!invite(p, species)) return null;
  }
  earn(p, 'dust', FIRST_HOUR_REWARD.dust, 'first_hour');
  p.home.firstHour = 2;
  return { species, dust: FIRST_HOUR_REWARD.dust };
}
