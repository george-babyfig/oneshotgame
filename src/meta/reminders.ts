export const QUIET_FROM = 21;
export const QUIET_UNTIL = 9;

export function inQuietHours(t: number): boolean {
  const hour = new Date(t).getHours();
  return hour >= QUIET_FROM || hour < QUIET_UNTIL;
}

/** Move a reminder into 10:00–20:30 local time. */
export function friendlyTime(t: number): number {
  const d = new Date(t);
  const localMs = ((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
  if (localMs >= 10 * 3600000 && localMs <= (20 * 60 + 30) * 60000) return t;
  const next = new Date(d);
  if (localMs > (20 * 60 + 30) * 60000) next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return next.getTime();
}

export interface PlannedReminder {
  id: number;
  at: number;
  kind: 'vault' | 'daily';
}

export function planReminders(o: { now: number; vaultFullAt: number | null }): PlannedReminder[] {
  const tomorrow = new Date(o.now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 30, 0, 0);
  const planned: PlannedReminder[] = [{ id: 102, at: tomorrow.getTime(), kind: 'daily' }];
  if (o.vaultFullAt !== null && o.vaultFullAt > o.now) {
    planned.push({ id: 101, at: friendlyTime(o.vaultFullAt), kind: 'vault' });
  }
  planned.sort((a, b) => a.at - b.at);
  // Never remind on a day the child already opened the game: whatever fired earlier today
  // plus a new one would make two in a day.
  const nowDate = new Date(o.now);
  const days = new Set<string>([`${nowDate.getFullYear()}-${nowDate.getMonth()}-${nowDate.getDate()}`]);
  return planned.filter((item) => {
    if (item.at <= o.now || inQuietHours(item.at)) return false;
    const date = new Date(item.at);
    const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (days.has(day)) return false;
    days.add(day);
    return true;
  });
}
