// Private, aggregate-only balance data. No identifiers or event log leave this device.
import { loadKey, saveKey } from './storage';

const KEY = 'pp.ledger';
const DAY = 86400000;
const MAX_BYTES = 16 * 1024;
const CURRENCIES = ['gems', 'dust', 'stone', 'dew', 'leaf', 'ember', 'frost'] as const;
export type LedgerKpi =
  | 'round_started'
  | 'round_won'
  | 'round_failed'
  | 'round_failed_score'
  | 'round_failed_goal'
  | 'round_restarted'
  | 'round_seconds'
  | 'continues_bought'
  | 'boosters_used'
  | 'help_used'
  | 'help_what_happened_shown'
  | 'help_what_happened_used'
  | 'help_tip_shown'
  | 'help_tip_used'
  | 'help_buddy_throws_shown'
  | 'help_buddy_throws_used'
  | 'help_hint_try_shown'
  | 'help_hint_try_used'
  | 'homeworld_action'
  | 'gate_shown'
  | 'gate_passed'
  | 'gate_failed'
  | 'purchase_ok'
  | 'purchase_cancelled'
  | 'purchase_pending'
  | 'purchase_failed'
  | 'contents_sheet'
  | 'app_open'
  | `offer_${string}`
  | `earn_${string}`
  | `spend_${string}`;
type Bucket = { day: number; totals: Record<string, number>; seconds: number[] };
type Week = { week: number; totals: Record<string, number> };
export type PurchaseRecord = { tx: string; key: string; cents: number; at: number; currency?: string };
type State = {
  days: Bucket[];
  weeks: Week[];
  economy: Record<string, number>;
  discovery: Record<string, number>;
  purchases: PurchaseRecord[];
};
type Packed = {
  v: 1;
  k: string[];
  d: [number, number[], number[]][];
  w: [number, number[]][];
  s: string[];
  e: [number, number, number, number][];
  f: Record<string, number>;
  p?: PurchaseRecord[];
};
const fresh = (): State => ({ days: [], weeks: [], economy: {}, discovery: {}, purchases: [] });
let state = fresh();
let loaded = false;
let pending: Promise<void> = Promise.resolve();
let homeworldPending = false;
let scheduled = false;
const dayOf = (now: number) => Math.floor(now / DAY);
const weekOf = (day: number) => Math.floor((day + 3) / 7);
const validKey = (key: string) => /^[a-z][a-z0-9_]{0,63}$/.test(key);
const validAmount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const validIndex = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

function pack(): Packed {
  const keys = [...new Set([...state.days, ...state.weeks].flatMap((b) => Object.keys(b.totals)))].sort();
  const values = (totals: Record<string, number>) => keys.map((key) => totals[key] ?? 0);
  const sources: string[] = [];
  const economy: Packed['e'] = [];
  for (const [key, amount] of Object.entries(state.economy)) {
    const match = /^(earn|spend)_(gems|dust|stone|dew|leaf|ember|frost)_(.+)$/.exec(key);
    if (!match) throw new Error('Invalid economy key');
    let source = sources.indexOf(match[3]);
    if (source < 0) source = sources.push(match[3]) - 1;
    economy.push([match[1] === 'earn' ? 0 : 1, CURRENCIES.indexOf(match[2] as (typeof CURRENCIES)[number]), source, amount]);
  }
  return {
    v: 1,
    k: keys,
    d: state.days.map((b) => [b.day, values(b.totals), Array.from({ length: 12 }, (_, i) => b.seconds[i] ?? 0)]),
    w: state.weeks.map((b) => [b.week, values(b.totals)]),
    s: sources,
    e: economy,
    f: state.discovery,
    p: state.purchases,
  };
}

function unpack(value: unknown): State {
  if (
    !record(value) ||
    value.v !== 1 ||
    !Array.isArray(value.k) ||
    !Array.isArray(value.d) ||
    !Array.isArray(value.w) ||
    !Array.isArray(value.s) ||
    !Array.isArray(value.e) ||
    !record(value.f)
  )
    throw new Error('Invalid ledger');
  const p = value as Packed;
  if (
    p.k.length > 256 ||
    p.s.length > 256 ||
    p.d.length > 30 ||
    p.w.length > 8 ||
    p.e.length > 2048 ||
    !p.k.every((k) => typeof k === 'string' && validKey(k)) ||
    new Set(p.k).size !== p.k.length ||
    !p.s.every((s) => typeof s === 'string' && validKey(s)) ||
    new Set(p.s).size !== p.s.length
  )
    throw new Error('Invalid ledger keys');
  const totals = (values: unknown): Record<string, number> => {
    if (!Array.isArray(values) || values.length !== p.k.length || !values.every(validAmount)) throw new Error('Invalid totals');
    return Object.fromEntries(p.k.flatMap((key, i) => (values[i] ? [[key, values[i]]] : [])));
  };
  const days = p.d.map((b) => {
    if (
      !Array.isArray(b) ||
      b.length !== 3 ||
      !Number.isSafeInteger(b[0]) ||
      !Array.isArray(b[2]) ||
      b[2].length !== 12 ||
      !b[2].every(validAmount)
    )
      throw new Error('Invalid day');
    return { day: b[0], totals: totals(b[1]), seconds: b[2] };
  });
  const weeks = p.w.map((b) => {
    if (!Array.isArray(b) || b.length !== 2 || !Number.isSafeInteger(b[0])) throw new Error('Invalid week');
    return { week: b[0], totals: totals(b[1]) };
  });
  if (new Set(days.map((b) => b.day)).size !== days.length || new Set(weeks.map((b) => b.week)).size !== weeks.length)
    throw new Error('Duplicate bucket');
  const economy: Record<string, number> = {};
  for (const entry of p.e) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 4 ||
      ![0, 1].includes(entry[0]) ||
      !validIndex(entry[1]) ||
      entry[1] >= CURRENCIES.length ||
      !validIndex(entry[2]) ||
      entry[2] >= p.s.length ||
      !validAmount(entry[3])
    )
      throw new Error('Invalid economy');
    const key = `${entry[0] ? 'spend' : 'earn'}_${CURRENCIES[entry[1]]}_${p.s[entry[2]]}`;
    if (key in economy) throw new Error('Duplicate economy entry');
    economy[key] = entry[3];
  }
  const discovery: Record<string, number> = {};
  for (const [key, planet] of Object.entries(p.f)) {
    if (!validKey(key) || !validIndex(planet) || planet < 1) throw new Error('Invalid discovery');
    discovery[key] = planet;
  }
  const purchases = Array.isArray(p.p)
    ? (p.p.filter(
        (x) => record(x) && typeof x.tx === 'string' && typeof x.key === 'string' && validAmount(x.cents) && validAmount(x.at),
      ) as PurchaseRecord[])
    : [];
  return { days, weeks, economy, discovery, purchases: purchases.slice(-50) };
}

function encoded() {
  return JSON.stringify(pack());
}
function fit() {
  state.days.sort((a, b) => a.day - b.day);
  state.weeks.sort((a, b) => a.week - b.week);
  let value = encoded();
  while (new TextEncoder().encode(value).length > MAX_BYTES && state.days.length) {
    state.days.shift();
    value = encoded();
  }
  while (new TextEncoder().encode(value).length > MAX_BYTES && state.weeks.length) {
    state.weeks.shift();
    value = encoded();
  }
  return value;
}
function persist() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    try {
      const value = fit();
      if (new TextEncoder().encode(value).length > MAX_BYTES) return;
      pending = pending
        .catch(() => {})
        .then(() => saveKey(KEY, value))
        .catch(() => {
          state = fresh();
        });
    } catch {
      state = fresh();
    }
  });
}
function roll(now: number) {
  const day = dayOf(now);
  state.days = state.days.filter((x) => x.day <= day && x.day > day - 30);
  const week = weekOf(day);
  state.weeks = state.weeks.filter((x) => x.week <= week && x.week > week - 8);
}
export const ledger = {
  count(kpi: LedgerKpi, n = 1, now = Date.now()) {
    try {
      this.add(kpi, n, now);
    } catch {
      state = fresh();
    }
  },
  add(kpi: LedgerKpi, value: number, now = Date.now()) {
    try {
      if (!validKey(kpi) || !Number.isFinite(value) || value <= 0 || !Number.isFinite(now)) return;
      roll(now);
      const day = dayOf(now);
      let d = state.days.find((x) => x.day === day);
      if (!d) state.days.push((d = { day, totals: {}, seconds: [] }));
      const week = weekOf(day);
      let w = state.weeks.find((x) => x.week === week);
      if (!w) state.weeks.push((w = { week, totals: {} }));
      const bucketKey = kpi.startsWith('earn_') || kpi.startsWith('spend_') ? kpi.split('_').slice(0, 2).join('_') : kpi;
      d.totals[bucketKey] = (d.totals[bucketKey] ?? 0) + value;
      w.totals[bucketKey] = (w.totals[bucketKey] ?? 0) + value;
      if (kpi.startsWith('earn_') || kpi.startsWith('spend_')) state.economy[kpi] = (state.economy[kpi] ?? 0) + value;
      if (kpi === 'round_seconds') {
        const bin = Math.min(11, Math.floor(value / 30));
        d.seconds[bin] = (d.seconds[bin] ?? 0) + 1;
      }
      persist();
    } catch {
      state = fresh();
    }
  },
  homeworldOpen() {
    homeworldPending = true;
  },
  homeworldClose() {
    homeworldPending = false;
  },
  homeworldAction() {
    if (!homeworldPending) return;
    homeworldPending = false;
    this.count('homeworld_action');
  },
  discover(feature: string, planet: number) {
    try {
      if (!validKey(feature) || !Number.isInteger(planet) || planet < 1 || feature in state.discovery) return;
      state.discovery[feature] = planet;
      persist();
    } catch {
      state = fresh();
    }
  },
};
export async function loadLedger() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await loadKey(KEY);
    state = raw && new TextEncoder().encode(raw).length <= MAX_BYTES ? unpack(JSON.parse(raw)) : fresh();
  } catch {
    state = fresh();
  }
}
export async function clearLedger(includePurchases = false) {
  const purchases = state.purchases;
  state = { ...fresh(), purchases: includePurchases ? [] : purchases };
  homeworldPending = false;
  pending = pending
    .catch(() => {})
    .then(() => saveKey(KEY, encoded()))
    .catch(() => {
      state = fresh();
    });
  await pending;
}
export async function flushLedger(txId?: string) {
  await Promise.resolve();
  await pending;
  if (txId) {
    const saved = await loadKey(KEY);
    if (!saved || !JSON.parse(saved).p?.some((entry: PurchaseRecord) => entry.tx === txId))
      throw new Error('Purchase history was not saved');
  }
}
export function recordPurchase(record: PurchaseRecord) {
  if (!record.tx || !validKey(record.key) || !validAmount(record.cents) || !validAmount(record.at)) return;
  if (state.purchases.some((x) => x.tx === record.tx)) return;
  state.purchases = [...state.purchases.slice(-49), record];
  persist();
}

export function playTimeThisWeek(now = Date.now()) {
  const week = weekOf(dayOf(now));
  const days = state.days.filter((x) => weekOf(x.day) === week);
  return {
    rounds: days.reduce((n, x) => n + (x.totals.round_started ?? 0), 0),
    minutes: Math.round(days.reduce((n, x) => n + (x.totals.round_seconds ?? 0), 0) / 60),
  };
}

export function spentThisMonth(now = Date.now(), currency = 'USD') {
  const date = new Date(now);
  return state.purchases
    .filter((x) => {
      const at = new Date(x.at);
      return at.getFullYear() === date.getFullYear() && at.getMonth() === date.getMonth() && (x.currency ?? 'USD') === currency;
    })
    .reduce((cents, x) => cents + x.cents, 0);
}

export function purchaseHistory() {
  return [...state.purchases].reverse();
}
export function serializedSize() {
  return new TextEncoder().encode(fit()).length;
}
export function ledgerSummary(now = Date.now()) {
  roll(now);
  fit();
  const day = dayOf(now);
  const recent = state.days.filter((x) => x.day > day - 7);
  const total = (key: string) => state.days.reduce((sum, d) => sum + (d.totals[key] ?? 0), 0);
  const bins = state.days.reduce<number[]>((all, d) => {
    d.seconds.forEach((n, i) => (all[i] = (all[i] ?? 0) + (n ?? 0)));
    return all;
  }, []);
  const middle = Math.ceil(bins.reduce((a, b) => a + (b ?? 0), 0) / 2);
  let seen = 0;
  const medianBin = middle ? bins.findIndex((n) => (seen += n ?? 0) >= middle) : -1;
  return {
    activeDays7: recent.length,
    activeDays30: state.days.length,
    rounds: total('round_started'),
    wins: total('round_won'),
    failed: total('round_failed'),
    scoreMisses: total('round_failed_score'),
    goalMisses: total('round_failed_goal'),
    restarts: total('round_restarted'),
    minutes: Math.round(total('round_seconds') / 60),
    medianSeconds: medianBin < 0 ? 0 : medianBin * 30 + 15,
    days: state.days,
    weeks: state.weeks,
    economy: state.economy,
    discovery: state.discovery,
    purchases: purchaseHistory(),
    bytes: serializedSize(),
  };
}
