// The ladder's clock: each level's rate (real seconds per game day at 1×) and the length of the sim's fixed step, the
// speeds, and the date the game starts on. From the founding spec's ladder table (docs/specs/overgrow.md, "The ladder"
// and "The simulation's state and time"); the clock itself is src/sim/clock.ts, the real-time loop src/app/clock-loop.ts.

export interface LevelClock {
  /** 1 to 8, from the back garden to the planet. */
  n: number;
  name: string;
  /** What a node is at this level. */
  node: string;
  /** Real seconds a game day takes at 1×. */
  secondsPerDay: number;
  /** Game hours in one fixed step of the sim. */
  stepHours: number;
}

const DAY = 24, WEEK = 7 * 24, MONTH = (365 * 24) / 12;

export const LEVELS: readonly LevelClock[] = [
  {n: 1, name: 'Back Garden', node: 'bed', secondsPerDay: 12, stepHours: 1},
  {n: 2, name: 'Allotment', node: 'plot', secondsPerDay: 4, stepHours: 1},
  {n: 3, name: 'Smallholding', node: 'field', secondsPerDay: 1, stepHours: DAY},
  {n: 4, name: 'Farm', node: 'enterprise', secondsPerDay: 2 / 3, stepHours: DAY},
  {n: 5, name: 'Market Town', node: 'shop, market or road', secondsPerDay: 1 / 3, stepHours: DAY},
  {n: 6, name: 'Supply Chain', node: 'supplier, depot or store', secondsPerDay: 1 / 6, stepHours: WEEK},
  {n: 7, name: 'The Nation', node: 'region', secondsPerDay: 1 / 30, stepHours: WEEK},
  {n: 8, name: 'The Planet', node: 'country', secondsPerDay: 1 / 300, stepHours: MONTH},
];

/** Pause, 1×, 2×, 4× and 8×, at every level. */
export const SPEEDS = [0, 1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];

/** How many times faster than the chosen speed a quiet night passes on the page, at the levels that step by the hour
 *  (src/ui/quiet-night.ts): pacing in the real-time loop only, never the sim's steps. */
export const QUIET_BOOST = 4;

/**
 * Day 1 of every game: 06:00 on Monday 15 March, early spring, as a UTC calendar (no clock change) so every date
 * repeats. The year only sets the weekdays; the top bar counts game years from 1.
 */
export const START = {year: 2027, month: 3, day: 15, hour: 6};
