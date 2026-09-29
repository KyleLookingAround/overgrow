// Labour: the hours a person has, the work a hectare of each crop needs by month, what a person costs, and how skill
// changes the time a job takes. Hours a day follow the farm working-week figures of the Defra Farm Business Survey and
// the Agricultural Wages orders (about 39 hours a week contracted, more in the busy seasons); work per hectare is the
// AHDB Farm Management Pocketbook and Nix labour tables (hours a hectare a year by crop, rounded), spread over the
// months by the crop's calendar (drilling in spring, harvest in late summer and autumn); wages are rough 2026 figures
// from the National Living Wage (£12.71 an hour from April 2026) and the Agricultural Wages orders' grades. Gross margins
// are AHDB-style rounded figures for small growers selling direct. All are rounded facts, not copied text, so no licence
// is carried. Invented places only.
//
// Wages are kept as a parameter (`Wages`, with `WAGES` the default) so a level above can set them, a minimum wage among
// them (#29): the model reads the table it is given. An owner's off-farm job is the household model's (src/data/household.ts:
// its `JOBS` hours and commute, and `WAGE`, ASHE's median full-time take-home of about £590 for a 40-hour week, so about
// £14.75 an hour); nothing here restates them.

export type Role = 'owner' | 'hired hand' | 'seasonal picker';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/** Hours a day a person of a role can work, on a weekday and at the weekend, by season. */
export const DAY_HOURS: Record<Role, Record<Season, {weekday: number; weekend: number}>> = {
  owner: {
    winter: {weekday: 6, weekend: 3},
    spring: {weekday: 9, weekend: 6},
    summer: {weekday: 10, weekend: 6},
    autumn: {weekday: 9, weekend: 5},
  },
  'hired hand': {
    winter: {weekday: 7.8, weekend: 0},
    spring: {weekday: 7.8, weekend: 0},
    summer: {weekday: 8.5, weekend: 0},
    autumn: {weekday: 8.5, weekend: 0},
  },
  'seasonal picker': {
    winter: {weekday: 0, weekend: 0},
    spring: {weekday: 0, weekend: 0},
    summer: {weekday: 9, weekend: 4},
    autumn: {weekday: 9, weekend: 4},
  },
};

/** What a role costs: £ an hour in cash (the owner takes profit, not a wage) and the employer's on-cost on top (holiday pay, pension, National Insurance). */
export type Wages = Record<Role, {hourly: number; onCost: number}>;
export const WAGES: Wages = {
  owner: {hourly: 0, onCost: 0},
  'hired hand': {hourly: 13.5, onCost: 0.2},
  'seasonal picker': {hourly: 12.71, onCost: 0.2},
};

/** The skills a worker can have, each 0 (never done it) to 1 (experienced). */
export const SKILLS = ['sowing', 'harvest', 'general'] as const;
export type SkillName = (typeof SKILLS)[number];

/** A new hand takes twice the time an experienced one does; the time factor is 1 / (FLOOR + (1 − FLOOR) × skill). */
export const SKILL_FLOOR = 0.5;

/** The share of a crop's margin lost for each week its harvest work waits (leaves bolt, potatoes go green, fruit spoils). */
export const WAIT_LOSS_PER_WEEK = 0.25;

export interface CropWork {
  name: string;
  /** Hours a hectare in a year by hand and small machine, all operations. */
  total: number;
  /** The share of it in each month, January to December; adds to 1. */
  months: number[];
  /** Gross margin a hectare when the crop is sold direct, £. */
  margin: number;
}

/** Hours a hectare needs, by crop (the field crops a smallholding grows; part 11's fields choose among them). */
export const CROP_WORK: Record<string, CropWork> = {
  potatoes: {name: 'Potatoes', total: 90, months: [0, 0, 0.02, 0.14, 0.14, 0.06, 0.06, 0.1, 0.24, 0.2, 0.04, 0], margin: 6000},
  carrots: {name: 'Carrots', total: 200, months: [0, 0, 0.03, 0.1, 0.12, 0.1, 0.06, 0.08, 0.2, 0.25, 0.06, 0], margin: 7000},
  brassicas: {name: 'Cabbages and kale', total: 220, months: [0.03, 0.02, 0.03, 0.1, 0.12, 0.06, 0.06, 0.07, 0.15, 0.2, 0.1, 0.06], margin: 6500},
  onions: {name: 'Onions', total: 160, months: [0, 0, 0.05, 0.12, 0.08, 0.06, 0.06, 0.22, 0.26, 0.1, 0.05, 0], margin: 6000},
  beans: {name: 'Field beans', total: 25, months: [0, 0, 0.1, 0.25, 0.05, 0.03, 0.04, 0.3, 0.2, 0.03, 0, 0], margin: 900},
  wheat: {name: 'Winter wheat', total: 12, months: [0, 0, 0.1, 0.1, 0.06, 0.05, 0.02, 0.3, 0.24, 0.08, 0.05, 0], margin: 1000},
};
