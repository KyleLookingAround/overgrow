// Storage and spoilage numbers: each product's shelf life and how fast it speeds up with warmth, where produce is kept
// and how warm that is, the grading standards' graded-out shares, what a van round costs and how much a cold room
// holds, and where wasted food goes. Rough, invented-place-free numbers, each with its source; src/sim/models/storage.ts
// uses them and docs/systems/storage.md says how.
//
// Licences: WRAP (UK household and supply chain food waste studies) and DEFRA/DESNZ (greenhouse gas conversion factors)
// are Open Government Licence v3.0 or WRAP's own open reports; FAO (Gustavsson et al. 2011, "Global food losses and
// food waste") is CC BY-NC-SA 3.0 IGO; Q10 values follow the food-science rule that spoilage rates rise by about 2 to 3
// times for each 10 °C (Labuza 1982; Tijskens and Polderdijk 1996 for fresh produce). Figures are read to about two
// figures and rounded. Shelf lives are calibrated so the home stage matches the kitchen's own days (src/data/crops.ts).
import type {Group} from './crops';
import type {FoodGroup} from './household';

export type ProductId = 'salad' | 'radish' | 'lettuce' | 'beans' | 'potatoes' | 'tomatoes' | 'eggs' | 'milk' | 'meat';
export type Place = 'field' | 'shed' | 'cold store' | 'van' | 'shelf' | 'home';
export type Standard = 'loose' | 'strict';

export interface ProductSpec {
  name: string;
  group: FoodGroup;
  /** Days it keeps at REF_C in the open, until the last of a lot has gone. */
  shelf: number;
  /** How many times faster it spoils for each 10 °C warmer. */
  q10: number;
  /** The coldest it's kept without chilling injury (or cold sweetening), °C: a cold room isn't colder than this for it. */
  coldMin: number;
  /** A dark, ventilated store keeps it this many times longer (potatoes don't green or sprout so soon). */
  dark: number;
  /** Kg one cubic metre of cold room holds, packed in crates. */
  density: number;
  /** Share left unharvested or dug in, or left unmilked and unpicked, before grading. */
  unharvested: number;
  /** Days a household takes to eat a purchase (a week's shop of salad is eaten over a few days), for the home stage. */
  eatDays: number;
  /** Days typically held in store, and shelf days, before the produce reaches a customer, in a typical chain. */
  hold: number;
  shelfDays: number;
}

export const REF_C = 20;
export const PRODUCTS: Record<ProductId, ProductSpec> = {
  salad: {name: 'Salad leaves', group: 'salads', shelf: 2.5, q10: 2.6, coldMin: 2, dark: 1, density: 40, unharvested: 0.06, eatDays: 3.6, hold: 0.5, shelfDays: 1},
  radish: {name: 'Radishes', group: 'salads', shelf: 6.5, q10: 2.2, coldMin: 2, dark: 1, density: 100, unharvested: 0.04, eatDays: 7, hold: 2, shelfDays: 1},
  lettuce: {name: 'Lettuce', group: 'salads', shelf: 4, q10: 2.5, coldMin: 2, dark: 1, density: 60, unharvested: 0.08, eatDays: 4.5, hold: 1, shelfDays: 1},
  beans: {name: 'French beans', group: 'greens', shelf: 2.8, q10: 2.6, coldMin: 7, dark: 1, density: 100, unharvested: 0.08, eatDays: 3.2, hold: 0.5, shelfDays: 1},
  potatoes: {name: 'Potatoes', group: 'potatoes', shelf: 39, q10: 2, coldMin: 5, dark: 2.5, density: 250, unharvested: 0.05, eatDays: 16, hold: 75, shelfDays: 1},
  tomatoes: {name: 'Tomatoes', group: 'tomatoes', shelf: 4.2, q10: 2.3, coldMin: 10, dark: 1, density: 120, unharvested: 0.04, eatDays: 4.5, hold: 0.5, shelfDays: 1},
  eggs: {name: 'Eggs', group: 'dairy', shelf: 21, q10: 3, coldMin: 4, dark: 1, density: 150, unharvested: 0.01, eatDays: 30, hold: 3, shelfDays: 3},
  milk: {name: 'Milk', group: 'dairy', shelf: 1.2, q10: 3.5, coldMin: 2, dark: 1, density: 500, unharvested: 0, eatDays: 2.5, hold: 1, shelfDays: 1},
  meat: {name: 'Fresh meat', group: 'meat', shelf: 1, q10: 3, coldMin: 0, dark: 1, density: 300, unharvested: 0, eatDays: 2, hold: 1, shelfDays: 1},
};
export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];
/** The product that stands for a veg group when produce is tracked by group: the market's veg groups. */
export const STANDS_FOR: Record<Group, ProductId> = {potatoes: 'potatoes', salads: 'salad', tomatoes: 'tomatoes', greens: 'beans'};

/** The share of a lot gone when `life` of its shelf life has been used: life to this power (nothing much goes early, then
 *  all of it goes together), so at half the shelf life about 3 % has gone and at the whole of it, all. */
export const LOSS_POWER = 5;

/**
 * Where produce is, as its temperature (°C) from the outside air: the field is the outside air; an ambient shed follows
 * it a good way (`shed` of it, the rest at 15 °C); a cold store is held at the setpoint; a van is a few degrees above the
 * outside air (sun on the panels); a shop shelf is a room, two-fifths outside and the rest 18 °C, except for what a shop chills (whatever can take 4 °C: salad, eggs, milk, meat), held at 8 °C; a home mixes the fridge with the
 * worktop at about 14 °C (calibrated to the kitchen's days).
 */
export const TEMPS = {shed: {follows: 0.7, base: 15}, cold: 4, van: 4, shelf: {follows: 0.4, base: 18}, chilled: 8, home: 14};

/** Grading: the share of what's harvested that fails the cosmetic standard, by veg group (WRAP: farms reject a tenth to a
 *  quarter of some crops for shape, size and blemish; FAO Europe: 20 % lost at production for fruit and veg). Loose is a
 *  farm-gate box's; strict a supermarket's, and it pays a price premium and sends the rest to waste, compost or feed. */
export const GRADE: Record<Group, Record<Standard, number>> = {
  potatoes: {loose: 0.06, strict: 0.22},
  salads: {loose: 0.05, strict: 0.15},
  tomatoes: {loose: 0.08, strict: 0.2},
  greens: {loose: 0.06, strict: 0.18},
};
/** The price a strict standard earns over a loose one, as a multiple. */
export const GRADE_PREMIUM = 1.12;

/** Where graded-out and spoiled food goes: kg CO₂e a kg beyond what growing it emitted (landfill methane from food waste
 *  is about 0.5 kg CO₂e a kg, DESNZ's factor; home composting adds a little methane and nitrous oxide), and £ a kg it's worth. */
export const ROUTES = {
  waste: {co2e: 0.5, value: 0},
  compost: {co2e: 0.1, value: 0},
  feed: {co2e: 0.05, value: 0.08},
};
export type Route = keyof typeof ROUTES;

/** A small diesel van's round: the fixed run to the first stop and back (km), the km between stops, its average speed
 *  (km/h), the minutes a stop takes, litres a 100 km loaded (a small diesel van about 9 L/100 km, DESNZ and manufacturer
 *  figures), boxes a round holds, and the packing crates' insulation (no fridge: the van is above the outside air). */
export const VAN = {baseKm: 8, kmPerStop: 0.7, speed: 32, stopMin: 3, litresPer100km: 9, capacity: 60};

/** Losses of a typical chain by stage, WRAP and FAO's rough shares of UK food waste by weight, the test's target: the
 *  home stage the largest (WRAP puts households at about 70 % of UK post-farm food waste), farms next, then stores and
 *  distribution, and retail the smallest (about 4 %). Shares of the food lost, summing to about 1. */
export const TARGET_SHARES = {home: 0.5, field: 0.3, store: 0.08, shelf: 0.07, road: 0.01};
