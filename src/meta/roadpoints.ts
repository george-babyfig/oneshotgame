import { today, type Profile } from './profile';

export const ROAD_DAILY_CAP = 4;

/** All Road sources share one daily limit. */
export function addRoadPoints(p: Profile, amount: number, day = today()): number {
  if (amount <= 0) return 0;
  if (!p.roadDay.day || day > p.roadDay.day) p.roadDay = { day, earned: 0 };
  const granted = Math.min(amount, Math.max(0, ROAD_DAILY_CAP - p.roadDay.earned));
  p.roadDay.earned += granted;
  p.roadPoints += granted;
  return granted;
}
