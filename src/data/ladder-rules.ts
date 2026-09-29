// The carry-over rule's numbers: each level's rhythm (the window its headline numbers are taken over), what goes into
// the Health index, how a sealed node's Health drifts and what it costs, the tolerance of inflating, and the step-up
// offer's test. From the founding spec ("The carry-over rule", "What makes the jump feel earned",
// docs/specs/overgrow.md); the step-up figures are the spec's proposals, for part 4's bot baselines to set. The
// product groups, the wildlife part of Health and the longer windows are the owner's answers on #29 (Q3, Q6 and Q15),
// also proposals: the wildlife weights are rough shares (a hedge and a flower strip feed and shelter the most; a
// margin less), not measured figures.
// Licence: original to this project (figures from the founding spec; no outside dataset), so it carries the project's.

/** How a level's history is kept: the window its headline numbers cover, and how many game days each sample spans. */
export interface Rhythm {
  /** The last full cycle of the level's rhythm, in game days (the garden's last full year). */
  windowDays: number;
  /** Game days one sample of the history spans (a level's tick, but never finer than a day). */
  sampleDays: number;
}

const SEASON = 365 / 4;

/**
 * By level, 1 to 8. Each level's window is the last full cycle of its rhythm (#29 Q15, so the slowest lever, soil or a
 * hedge, can pay back inside the level that teaches it): the garden's and the allotment's are the last full year (four
 * seasons, not the 28 days and the season the spec first had), the smallholding and above are proposed as a year, the
 * planet's as a decade. The sample is the level's tick, but the garden and the allotment sample weekly, not daily: a
 * daily ring of a year would be 365 samples of about thirty numbers each (about 75 kB of saved state) where a weekly
 * one is 53; from level 3 up the tick is a day and the ring is 365 (level 6 and 7 a week, level 8 a month).
 */
export const RHYTHMS: readonly Rhythm[] = [
  {windowDays: 365, sampleDays: 7},
  {windowDays: 365, sampleDays: 7},
  {windowDays: 365, sampleDays: 1},
  {windowDays: 365, sampleDays: 1},
  {windowDays: 365, sampleDays: 1},
  {windowDays: 365, sampleDays: 7},
  {windowDays: 365, sampleDays: 7},
  {windowDays: 3652.5, sampleDays: 365 / 12},
];

/** The slow stocks behind a node's Health: soil, water, kit, goodwill, herd and wildlife. A level keeps the ones it has. */
export const HEALTH_PARTS = ['soil', 'water', 'kit', 'goodwill', 'herd', 'wildlife'] as const;
export type HealthPart = (typeof HEALTH_PARTS)[number];

/** Each part's share of the Health index (rough; a level without a part shares its weight among the rest). */
export const HEALTH_WEIGHTS: Record<HealthPart, number> = {soil: 0.35, water: 0.2, kit: 0.15, goodwill: 0.15, herd: 0.15, wildlife: 0.1};

/** What wildlife is made of: flowers, hedges and margins, each 0–100 as an index, and each one's share of it. */
export const WILDLIFE_PARTS = ['flowers', 'hedges', 'margins'] as const;
export type WildlifePart = (typeof WILDLIFE_PARTS)[number];
export const WILDLIFE_WEIGHTS: Record<WildlifePart, number> = {flowers: 0.4, hedges: 0.4, margins: 0.2};

/** The product groups a level's output and demand are carried in: the kitchen's four (src/data/kitchen.ts), and room for the rest of a diet. */
export const PRODUCT_GROUPS = ['potatoes', 'salads', 'tomatoes', 'greens', 'eggs', 'meat', 'milk', 'grain'] as const;
export type ProductGroup = (typeof PRODUCT_GROUPS)[number];

/** Below this Health a sealed node loses output; above it, none. */
export const HEALTH_FLOOR = 50;
/** The share of Output lost for each point of Health below the floor. */
export const HEALTH_PENALTY = 0.01;
/** The most Health drifts toward the plan, in points a season (a season is a quarter of a year). */
export const HEALTH_DRIFT_PER_SEASON = 1;
export const SEASON_DAYS = SEASON;

/** How close a rebuilt detail level's first cycle must come to the totals it was sealed with (the `carry` test). */
export const INFLATE_TOLERANCE = 0.05;

/**
 * The smallest a totals' figure is taken to be when comparing, so a node with almost no carbon isn't held to 5 % of
 * almost nothing: kg a day, £ a day and points of an index (m² for land).
 */
export const INFLATE_FLOOR = {output: 0.05, quality: 1, reliability: 1, upkeep: 0.05, health: 1, freshness: 0.1, carbon: 0.05, land: 1};

export type Requirement = 'output' | 'reliability' | 'health';

/** A step-up offer's test: what a level's sealed totals must show over its window. */
export interface StepUpRules {
  /** The level whose offer this is (the garden's committee offers a plot). */
  from: number;
  output: number;
  reliability: number;
  health: number;
}

/** Proposed by the spec ("What makes the jump feel earned"); the bot's baselines set the final figures. */
export const STEP_UP: Readonly<Record<number, StepUpRules>> = {
  1: {from: 1, output: 1.5, reliability: 60, health: 50},
};

/** What to do about each requirement, in a line for the goal bar. */
export const STEP_UP_HINTS: Record<Requirement, string> = {
  output: 'Harvest more each day: keep the beds sown and picked.',
  reliability: 'Make harvests steadier: sow in turns and grow a mix.',
  health: 'Look after the ground and water: compost, rotate and keep the butt topped up.',
};
