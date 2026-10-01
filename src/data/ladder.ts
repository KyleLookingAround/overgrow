// The ladder's clock: each level's rate (real seconds a game day takes with the camera at the level's widest view), the
// length of the sim's fixed step, pause and run, and the date the game starts on. From the founding spec's ladder table
// (docs/specs/overgrow.md, "The ladder" and "The simulation's state and time") as the one map amends it: the zoom is the
// speed (docs/specs/one-map.md, "The clock"; docs/decisions/ADR-2026-09-30-zoom-is-the-speed.md). The clock itself is
// src/sim/clock.ts, the real-time loop src/app/clock-loop.ts.

export interface LevelClock {
  /** 1 to 8, from the back garden to the planet. */
  n: number;
  name: string;
  /** What a node is at this level. */
  node: string;
  /** Real seconds a game day takes with the camera at this level's widest view. */
  secondsPerDay: number;
  /** Game hours in one fixed step of the sim. */
  stepHours: number;
}

const DAY = 24, WEEK = 7 * 24, MONTH = (365 * 24) / 12;

export const LEVELS: readonly LevelClock[] = [
  {n: 1, name: 'Back Garden', node: 'bed', secondsPerDay: 12, stepHours: 1},
  {n: 2, name: 'Allotment', node: 'plot', secondsPerDay: 6, stepHours: 1},
  {n: 3, name: 'Smallholding', node: 'field', secondsPerDay: 1, stepHours: DAY},
  {n: 4, name: 'Farm', node: 'enterprise', secondsPerDay: 2 / 3, stepHours: DAY},
  {n: 5, name: 'Market Town', node: 'shop, market or road', secondsPerDay: 1 / 3, stepHours: DAY},
  {n: 6, name: 'Supply Chain', node: 'supplier, depot or store', secondsPerDay: 1 / 6, stepHours: WEEK},
  {n: 7, name: 'The Nation', node: 'region', secondsPerDay: 1 / 30, stepHours: WEEK},
  {n: 8, name: 'The Planet', node: 'country', secondsPerDay: 1 / 300, stepHours: MONTH},
];

/** Pause and run: the zoom sets how fast the game runs, not a speed (the owner, 30 Sep 2026). */
export const SPEEDS = [0, 1] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * Real seconds a game day takes at a level with the camera zoomed `t` of the way in, 0 at the level's widest view and 1
 * at its closest (where the level below would fill the view): the level's rate and the one below's, between in log space,
 * so each step in the zoom changes the pace by the same factor. The garden's closest view (a bed) keeps the garden's rate.
 */
export function secondsPerDayAt(level: number, t: number): number {
  const here = LEVELS[Math.min(Math.max(level, 1), LEVELS.length) - 1]!.secondsPerDay, below = LEVELS[Math.max(level - 1, 1) - 1]!.secondsPerDay;
  const k = Math.min(1, Math.max(0, t));
  return Math.exp(Math.log(here) * (1 - k) + Math.log(below) * k);
}

/** Skips (docs/specs/one-map.md, item 7): at the levels the camera can't pull far enough out to hurry time, the most a
 *  skip runs, and how long its time-lapse lasts on the page. */
export const SKIP = {levels: 3, mostDays: 14, seconds: 2.5} as const;

/** How many times faster a quiet night passes on the page, at the levels that step by the hour (src/ui/quiet-night.ts):
 *  pacing in the real-time loop only, never the sim's steps. */
export const QUIET_BOOST = 4;
/** The fastest a quiet night passes, game hours a real second: under what the worker gives on a phone at 4× CPU
 *  throttling (about 77, the `scene` check). */
export const QUIET_MOST = 64;

/**
 * Day 1 of every game: 06:00 on Monday 15 March, early spring, as a UTC calendar (no clock change) so every date
 * repeats. The year only sets the weekdays; the top bar counts game years from 1.
 */
export const START = {year: 2027, month: 3, day: 15, hour: 6};
