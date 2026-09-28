export type UntilLabel =
  { key: 'until tonight' } | { key: 'until {day}'; vars: { day: string } } | { key: 'until {date}'; vars: { date: string } };

function localDay(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}

/** End times are exclusive; show the last day a player can take part. */
export function untilText(end: number, now: number, locale: string): UntilLabel {
  const last = new Date(end - 1);
  const days = localDay(last.getTime()) - localDay(now);
  if (days === 0) return { key: 'until tonight' };
  if (days >= 1 && days <= 6) {
    return { key: 'until {day}', vars: { day: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(last) } };
  }
  return { key: 'until {date}', vars: { date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(last) } };
}

/** The device's local clock time, in the selected language. */
export function clockText(t: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(t));
}

/** Add a day to a clock time when the time is not today. */
export function whenText(t: number, now: number, locale: string): string {
  const time = clockText(t, locale);
  const days = localDay(t) - localDay(now);
  if (days === 0) return time;
  if (days === 1) return `${new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(1, 'day')} ${time}`;
  return `${new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(t))} ${time}`;
}
