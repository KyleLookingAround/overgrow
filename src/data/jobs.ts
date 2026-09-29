// The gardener's time: the hours they have, how fast they walk, and how long each job takes with each tool. The table is
// keyed by tool, so a new tool (part 6's hose, drip lines or wheelbarrow) adds its row here and the gardener
// (src/sim/gardener.ts) takes whichever tool they have that does a job fastest. Four hours a day for the garden is the
// owner's figure (#2), a working adult's evenings and early mornings; more at weekends. Times are rough garden ones: a
// 10 L can filled from a butt's tap in about a minute and a half and from the mains in under one (a garden tap runs 10–15
// L a minute), poured in about a minute; seed sown in drills at about ten minutes a square metre; digging turf over by
// spade at about an hour a square metre (RHS, "Digging"); picking by the crop (src/data/crops.ts).

export type Tool = 'can' | 'hands' | 'spade' | 'basket' | 'bucket';
export type Job = 'water' | 'sow' | 'plant' | 'pick' | 'clear' | 'dig' | 'carry' | 'spread';

/**
 * How long a job takes with a tool: `per` hours for each unit of work (a litre poured, a m² sown, a kg picked or spread);
 * `trip` units carried each trip, with `load` hours to fill up at the source each trip (a can at the butt); `setup` hours
 * once per job. A job without `trip` is done in one go.
 */
export interface JobTime {
  per: number;
  trip?: number;
  load?: number;
  setup?: number;
}

export const TOOLS: Record<Tool, {name: string; jobs: Partial<Record<Job, JobTime>>}> = {
  can: {name: 'Watering can', jobs: {water: {per: 1 / 60 / 10, trip: 10}}}, // filled at the source's rate (FILL_L_PER_MIN)
  hands: {name: 'Hands', jobs: {sow: {per: 10 / 60}, plant: {per: 20 / 60}, pick: {per: 1}, clear: {per: 6 / 60}}},
  spade: {name: 'Spade', jobs: {dig: {per: 1}}},
  basket: {name: 'Basket', jobs: {carry: {per: 0, trip: 5, load: 1 / 60}}},
  bucket: {name: 'Bucket', jobs: {spread: {per: 0.3 / 60, trip: 10, load: 2 / 60}}},
};

/** The tools the gardener starts with. */
export const START_TOOLS: Tool[] = ['can', 'hands', 'spade', 'basket', 'bucket'];

/** Filling a can: litres a minute from each source (the butt's own little tap is slower than the mains). */
export const FILL_L_PER_MIN: Record<string, number> = {butt: 7, tap: 12};

/** Hours for the garden on a weekday and at the weekend, and when the day's work starts and stops (hour of the day). */
export const HOURS = {weekday: 4, weekend: 6, start: 6, stop: 20};
/** Walking pace about the garden with things to carry, m an hour (0.8 m/s). */
export const WALK = 0.8 * 3600;
/** Water poured when a bed is sown, to settle the seed, litres per m² (about 3 mm). */
export const WATER_IN = 3;
/** Compost spread before sowing, kg per m² (about a bucket a square metre; RHS, "Compost"). */
export const COMPOST_PER_M2 = 5;
