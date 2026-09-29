// Machinery: what a small second-hand tractor and its implements use, how fast they work against hand work, when they
// fail and what fails costs, and how hard their wheels press on wet ground. Fuel per hectare and hours per hectare are
// typical UK contractor and farm energy audit figures (Nix Farm Management Pocketbook style contractor rates; AHDB and
// Carbon Trust energy audits), rounded; hand hours are what the same work takes with a spade, a hoe or a sickle. The
// repair-cost curve is ASABE D497 (2011), cumulative repairs as a share of list price = RF1 (hours/1000)^RF2, with the
// standard two-wheel-drive tractor's factors. Wheel pressure rests on Håkansson & Reeder (1994) and on AHDB and Defra
// soil guidance that wet ground carries almost no weight. The figures are rounded facts from those sources, not copied
// text, so no licence is carried. Invented places only.

export type Operation = 'plough' | 'drill' | 'spray' | 'harvest';

export interface OperationSpec {
  name: string;
  /** Diesel a hectare with the tractor and its implement, litres. */
  litres: number;
  /** Hours a hectare with the tractor. */
  hours: number;
  /** Hours a hectare by hand (a spade, a dibber and a hoe, a knapsack sprayer, a sickle and a sack). */
  handHours: number;
  /** The share of the field the wheels run over on one pass (a plough's furrow wheel, a sprayer's tramlines). */
  wheeled: number;
}

export const OPERATIONS: Record<Operation, OperationSpec> = {
  plough: {name: 'Ploughing', litres: 24, hours: 1.4, handHours: 400, wheeled: 0.5},
  drill: {name: 'Drilling', litres: 7, hours: 0.6, handHours: 100, wheeled: 0.4},
  spray: {name: 'Spraying', litres: 1.5, hours: 0.15, handHours: 8, wheeled: 0.15},
  harvest: {name: 'Harvesting', litres: 18, hours: 1.1, handHours: 90, wheeled: 0.4},
};

/** The tractor for sale second-hand: about 15 years old with 5,000 hours on it, a 75 horsepower, 3.5 tonne machine. */
export const USED_TRACTOR = {ageYears: 15, hours: 5000, hoursSinceService: 120, weightT: 3.5, listPrice: 60000, value: 9000};

/**
 * Breakdowns: the chance a working hour ends in one is `base` when new and serviced, times (1 + age / ageScale) and times
 * (1 + (hours since service / interval)²): a tractor is serviced about every 250 hours, and an old, unserviced one
 * fails many times as often (Weibull wear-out, ASABE D497's rising repair rate with hours).
 */
export const HAZARD = {base: 0.0015, ageScale: 8, serviceEvery: 250};

/** Repairs: the average bill of one, £, before its spread and its age, the days the tractor is down (1 to 3), and a service, £. */
export const REPAIR = {meanCost: 250, downDays: 3, serviceCost: 350, rf1: 0.007, rf2: 2};

/**
 * Wheelings: compaction is the share of the soil's structure lost, 0–100. A pass adds `perPass` at the worst (soil at or
 * over field capacity, a 3 tonne axle, the whole field wheeled), scaled by the wheel share, the axle load over `refAxleT`
 * and the ground's wetness; dry ground (below `dry` of field capacity) carries the load and takes a twentieth of it.
 * Compaction fades by freeze and thaw, roots and worms with a half-life of about five years. Yield falls by
 * `yieldLoss` at full compaction (Håkansson & Reeder's 10–15 % for the typical compacted field, more when severe).
 */
export const COMPACTION = {perPass: 8, refAxleT: 3, dry: 0.75, dryShare: 0.05, halfLifeYears: 5, yieldLoss: 0.3};
