// The one clock: game hours since the start, advanced in fixed steps (an hour at levels 1 and 2, a day at 3 to 5, a week
// at 6 and 7, a month at 8), with the calendar for the top bar and the ticks systems subscribe to (hour, day, week,
// season, year). A system is its own file with a `System` value listed in src/sim/systems.ts; adding one never edits
// another's. The real-time loop that turns seconds into steps is src/app/clock-loop.ts, not the sim.
// docs/systems/clock.md says how it works.
import {LEVELS, START, type LevelClock, type Speed} from '../data/ladder';
import type {Graph, Flow} from './graph';
import type {Activity} from './activity';
import type {Command} from './commands';
import {rng, type Rng} from './random';

export const TICKS = ['hour', 'day', 'week', 'season', 'year'] as const;
export type Tick = (typeof TICKS)[number];

const HOUR_MS = 3600e3;
const START_MS = Date.UTC(START.year, START.month - 1, START.day, START.hour);
const START_YEAR_MS = Date.UTC(START.year, START.month - 1, START.day);

export function levelClock(level: number): LevelClock {
  return LEVELS[Math.min(Math.max(level, 1), LEVELS.length) - 1]!;
}

/** Game hours that pass in one real second at a speed. */
export function hoursPerSecond(level: number, speed: Speed): number {
  return (24 / levelClock(level).secondsPerDay) * speed;
}

export interface CalendarDate {
  /** Game years from 1; a game year starts on the anniversary of the first day. */
  year: number;
  /** 1–12. */
  month: number;
  /** 1–31. */
  day: number;
  /** 0 Monday to 6 Sunday. */
  weekday: number;
  hour: number;
  minute: number;
  /** 1–366 in the calendar year, for the sun and the seasons. */
  dayOfYear: number;
  /** Whole days since the first midnight before the start: day 1 is 0. */
  dayIndex: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

const SEASONS = ['winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter', 'winter'] as const;

/** The calendar at a game hour, from the start date in early spring (a UTC calendar: no clock change). */
export function calendar(hours: number): CalendarDate {
  const ms = START_MS + hours * HOUR_MS, d = new Date(ms);
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  const dayIndex = Math.floor((ms - START_YEAR_MS) / (24 * HOUR_MS));
  const anniversary = (yr: number) => Date.UTC(yr, START.month - 1, START.day);
  return {
    year: y - START.year + (ms >= anniversary(y) ? 1 : 0),
    month: m + 1,
    day: d.getUTCDate(),
    weekday: (d.getUTCDay() + 6) % 7,
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    dayOfYear: Math.floor((Date.UTC(y, m, d.getUTCDate()) - Date.UTC(y, 0, 1)) / (24 * HOUR_MS)) + 1,
    dayIndex,
    season: SEASONS[m]!,
  };
}

// counters that change exactly when a tick's boundary is crossed: midnight, Monday midnight, the first of March, June,
// September and December (the meteorological seasons, as the Met Office counts them), and midnight on the game's
// anniversary (the game year the top bar shows)
const counters = (hours: number) => {
  const ms = START_MS + hours * HOUR_MS, d = new Date(ms), days = Math.floor(ms / (24 * HOUR_MS));
  const months = d.getUTCFullYear() * 12 + d.getUTCMonth();
  const anniversary = Date.UTC(d.getUTCFullYear(), START.month - 1, START.day);
  const year = d.getUTCFullYear() + (ms >= anniversary ? 1 : 0);
  return {day: days, week: Math.floor((days + 3) / 7), season: Math.floor((months - 2) / 3), year}; // 1 Jan 1970 was a Thursday
};

/** The ticks a step from one hour to the next fires, in order. Every step fires 'hour'; each other at most once. */
export function ticksCrossed(from: number, to: number): Tick[] {
  const a = counters(from), b = counters(to), out: Tick[] = ['hour'];
  if (a.day !== b.day) out.push('day');
  if (a.week !== b.week) out.push('week');
  if (a.season !== b.season) out.push('season');
  if (a.year !== b.year) out.push('year');
  return out;
}

// ---- the registry ----

/** What a system is handed on a tick. */
export interface TickContext {
  tick: Tick;
  /** Game hours at the end of this step. */
  hours: number;
  /** The step's length in game hours: an hourly system at level 3 is called once a day with 24. */
  dt: number;
  date: CalendarDate;
  level: number;
  graph: Graph;
  /** This system's own dice for this tick, from the game's seed: adding a system never changes another's draws. */
  rng: Rng;
  /** Moves a flow now (docs/systems/graph.md); returns why it couldn't, and then nothing moved. */
  flow(f: Flow): string | null;
  /** Starts an activity the map can animate: who is doing what, where, from when to when. */
  activity(a: Activity): void;
}

/** A system: its own file, listed in src/sim/systems.ts, subscribing to the ticks it needs. */
export interface System {
  name: string;
  on: Partial<Record<Tick, (ctx: TickContext) => void>>;
  /**
   * The commands it owns (src/sim/commands.ts): return undefined if it's not this system's, null once it has carried it
   * out, or why it refuses. For a plan, policy or law, null lets the lever be set; a refusal leaves it as it was.
   */
  command?(cmd: Command, graph: Graph, level: number): string | null | undefined;
}

/** A small, fast hash of a string into 32 bits (FNV-1a), for seeding each system's dice. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** The dice a system gets on one tick: a stream from the seed, the system, the tick and the hour, never shared. */
export function systemRng(seed: number, system: string, tick: Tick, hours: number): Rng {
  return rng((hash(`${system}:${tick}`) ^ Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(Math.round(hours) | 0, 0x85ebca6b)) >>> 0);
}

/**
 * Runs one step: the ticks it crosses, in order, and for each the systems that subscribe, in the order
 * src/sim/systems.ts lists them.
 */
export function runStep(
  systems: readonly System[],
  base: Omit<TickContext, 'tick' | 'rng' | 'date' | 'hours'>,
  seed: number,
  from: number,
): number {
  const to = from + base.dt, date = calendar(to);
  for (const tick of ticksCrossed(from, to))
    for (const s of systems) {
      const fn = s.on[tick];
      if (fn) fn({...base, tick, hours: to, date, rng: systemRng(seed, s.name, tick, to)});
    }
  return to;
}
