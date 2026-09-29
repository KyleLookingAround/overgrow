// The household economy's numbers: who lives in the household, their jobs and hours and wages, the weekly shop and its
// footprint, and the income deciles the same functions serve one level up. Rough, invented-place-free numbers, each with
// its source; src/sim/models/household.ts uses them and docs/systems/household.md says how.
//
// Licences: ONS (Annual Survey of Hours and Earnings, Family Spending, Effects of taxes and benefits on household income,
// Families and households) and DEFRA (Family Food, National Travel Survey via DfT) are Open Government Licence v3.0;
// Poore & Nemecek (2018), "Reducing food's environmental impacts through producers and consumers", Science 360, is CC BY
// 4.0 for its supplementary data. Numbers are read to about two figures and rounded; where a group mixes products
// (dairy and eggs, meat and fish) the weighting by what a UK basket holds is this file's own. Check them against the
// sources' tables when part 6b wires the model.
import type {Group} from './crops';

/** The food groups: the kitchen's veg groups (src/data/crops.ts), then the rest of the diet in five coarse groups. */
export type FoodGroup = Group | 'fruit' | 'cereals' | 'dairy' | 'meat' | 'other';
export const VEG: readonly Group[] = ['potatoes', 'salads', 'tomatoes', 'greens'];
export const FOOD_GROUPS: readonly FoodGroup[] = [...VEG, 'fruit', 'cereals', 'dairy', 'meat', 'other'];
export const FOOD_NAMES: Record<FoodGroup, string> = {
  potatoes: 'Potatoes', salads: 'Salad veg', tomatoes: 'Tomatoes', greens: 'Green veg',
  fruit: 'Fruit', cereals: 'Bread and cereals', dairy: 'Dairy and eggs', meat: 'Meat and fish', other: 'Everything else',
};

export type Role = 'gardener' | 'partner' | 'child';
/** A job: none, part-time (three days), full-time (five), or school (a child's weekday). */
export type JobKind = 'none' | 'part' | 'full' | 'school';

// ---- hours ----

/** A waking day, and what's left of it for meals, washing and the house before any free time: hours. */
export const DAY = {waking: 16, essentials: 2};

/**
 * Each job's hours by weekday (Monday first) at the workplace, its commute there and back in hours on a working day,
 * and the hour the member leaves. ASHE has full-time employees at about 37.5 paid hours a week, so about eight hours at
 * work with an unpaid lunch; DfT's National Travel Survey has the average commute about half an hour each way. Part-time
 * is three days (ONS counts part-time as under 30 hours a week).
 */
export const JOBS: Record<JobKind, {name: string; hours: number[]; commute: number; depart: number}> = {
  none: {name: 'No job', hours: [0, 0, 0, 0, 0, 0, 0], commute: 0, depart: 0},
  part: {name: 'Part-time', hours: [8, 8, 8, 0, 0, 0, 0], commute: 1, depart: 8.5},
  full: {name: 'Full-time', hours: [8, 8, 8, 8, 8, 0, 0], commute: 1, depart: 8.5},
  school: {name: 'School', hours: [6, 6, 6, 6, 6, 0, 0], commute: 0.5, depart: 8.25},
};

/** Take-home pay: £ a week for a full-time week of 40 hours at work. ASHE's median full-time gross is about £37,000 a
 *  year, about £590 a week after tax and National Insurance (2026 rates, rough). Pay is by the hour at work. */
export const WAGE = {fullWeek: 590, fullHours: 40};

/**
 * The share of free hours (waking, less essentials, work and commute) each role gives the garden, on a weekday and at a
 * weekend: the rest is the rest of life. The gardener's give the four weekday and six weekend hours the owner set
 * (src/data/jobs.ts) for a full-time worker: 5 free hours × 0.8, and 14 × 3/7. A partner gives less by default, and
 * their share is what "help" draws on when they stop work.
 */
export const GARDEN_SHARE: Record<Role, {weekday: number; weekend: number}> = {
  gardener: {weekday: 0.8, weekend: 3 / 7},
  partner: {weekday: 0.25, weekend: 0.2},
  child: {weekday: 0.1, weekend: 0.1},
};

/** Take-home pay is only the household's main income; everything else it spends is one flat outgoing (£ a week). ONS
 *  Family Spending has a one-adult household spending about £330 a week and a two-adult one about £700; the gardener's
 *  also carries housing, bills, travel and the savings and mortgage capital ONS doesn't count as spending. What's left
 *  after it and the weekly shop is the garden's budget, about £10 a week: a keen grower's, about twice what the average
 *  household spends on gardens, plants and flowers (ONS Family Spending, COICOP 09.3.3, about £4 a week). The purse
 *  grows on that, the groceries the garden saves and the honesty box's takings. */
export const REST_SPEND: Record<Role, number> = {gardener: 550, partner: 230, child: 90};

/** A plot: an allotment plot is ten rods, about 250 m² (NSALG); keeping it takes about six hours a week (RHS and
 *  allotment societies: a few hours, more in summer). */
export const PLOT = {m2: 250, hoursPerWeek: 6};

// ---- the shop ----

/** The weekly basket, kg a person: veg by the kitchen's groups, then the rest of the diet. Family Food's household
 *  purchases (kg a person a week) give the rest; the veg is set to the kitchen's NHS-portions ask (src/data/kitchen.ts:
 *  about 1 kg a day for 2.4 people), which is more than Family Food's purchases alone (they miss eating out, and count
 *  processed veg separately). */
export const BASKET: Record<FoodGroup, number> = {
  potatoes: 1.1, salads: 0.85, tomatoes: 0.45, greens: 0.45,
  fruit: 1.0, cereals: 1.3, dairy: 1.9, meat: 0.9, other: 1.5,
};

/** Shop prices, £ a kg: Family Food's expenditure over its quantities, rounded, at 2026 prices (its 2020s figures with
 *  food inflation, rough). Dairy and eggs is milk-dominated by weight; meat and fish a mix of poultry, pork, beef and fish. */
export const PRICE: Record<FoodGroup, number> = {
  potatoes: 1.1, salads: 3.0, tomatoes: 3.5, greens: 2.6,
  fruit: 3.0, cereals: 2.0, dairy: 1.9, meat: 9.5, other: 3.5,
};

/** What each kg carries from farm to shop (Poore & Nemecek's global means, all stages to the shop's door): kg CO₂e, land
 *  in m² a year and fresh water withdrawn in L; the share of the carbon that is transport; and the share of the weight
 *  that arrives by air (which adds AIR to that weight's carbon). */
export const FOOTPRINT: Record<FoodGroup, {co2e: number; land: number; water: number; transport: number; air: number}> = {
  potatoes: {co2e: 0.46, land: 0.9, water: 60, transport: 0.1, air: 0},
  salads: {co2e: 0.6, land: 0.4, water: 120, transport: 0.15, air: 0.03},
  tomatoes: {co2e: 2.1, land: 0.8, water: 210, transport: 0.05, air: 0.02},
  greens: {co2e: 0.5, land: 0.35, water: 100, transport: 0.1, air: 0.04},
  fruit: {co2e: 1.0, land: 0.9, water: 400, transport: 0.2, air: 0.03},
  cereals: {co2e: 1.4, land: 2.9, water: 500, transport: 0.08, air: 0},
  dairy: {co2e: 4.3, land: 12.9, water: 880, transport: 0.02, air: 0},
  meat: {co2e: 25, land: 80, water: 1100, transport: 0.01, air: 0},
  other: {co2e: 3.5, land: 4, water: 800, transport: 0.05, air: 0},
};
/** Air freight: kg CO₂e a kg for a long-haul flight (DEFRA's conversion factors, about 1.2 kg per tonne-kilometre over
 *  about 8,000 km), added to the footprint of the share of a group that arrives by air. */
export const AIR = 9;

// ---- income deciles ----

/**
 * ONS household disposable income deciles, rough: £ thousand a year for the average household of each decile (ONS,
 * "Effects of taxes and benefits on household income"), and the average people in it (ONS, "Families and households").
 * Family Food's spend by income quintile is the check on what they buy: the lowest spends a larger share of its income
 * and buys less fruit, veg and meat.
 */
export const DECILES: readonly {income: number; people: number}[] = [
  {income: 14, people: 1.6}, {income: 19, people: 1.8}, {income: 24, people: 2.0}, {income: 29, people: 2.2},
  {income: 34, people: 2.4}, {income: 40, people: 2.6}, {income: 47, people: 2.7}, {income: 56, people: 2.8},
  {income: 70, people: 2.8}, {income: 100, people: 2.7},
];
/** How a household's basket differs from the average at the lowest and the highest decile (a multiple of BASKET, by
 *  group); the deciles between are in proportion. Family Food: richer households buy more fruit, meat and fish. */
export const MIX_LOW: Record<FoodGroup, number> = {
  potatoes: 1.0, salads: 0.8, tomatoes: 0.8, greens: 0.8, fruit: 0.65, cereals: 1.05, dairy: 0.9, meat: 0.9, other: 1.05,
};
export const MIX_HIGH: Record<FoodGroup, number> = {
  potatoes: 0.9, salads: 1.2, tomatoes: 1.2, greens: 1.2, fruit: 1.5, cereals: 0.95, dairy: 1.1, meat: 1.15, other: 1.0,
};
/** The price paid, a multiple of PRICE, at the lowest and the highest decile (discount lines against premium ones). */
export const PRICE_PAID = {low: 0.88, high: 1.15};
/** Own-price elasticity of demand by group: the percentage change in kg for 1 % on the price (Green et al. 2013, BMJ,
 *  "The effect of rising food prices on food consumption", and the UK demand literature: staples inelastic, meat and
 *  fruit more). */
export const ELASTICITY: Record<FoodGroup, number> = {
  potatoes: -0.3, salads: -0.5, tomatoes: -0.5, greens: -0.5, fruit: -0.7, cereals: -0.3, dairy: -0.5, meat: -0.7, other: -0.6,
};
/** A lower decile is more sensitive to price: a multiple of ELASTICITY at the lowest and the highest decile. */
export const SENSITIVITY = {low: 1.25, high: 0.75};
