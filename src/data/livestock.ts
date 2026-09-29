// Livestock: the species the garden and the smallholding keep, with what the livestock model (src/sim/models/livestock.ts)
// needs of each. Figures are rounded from published tables (FAO feed conversion and intake, IPCC 2006 and the 2019
// Refinement for methane and excreted nitrogen, RB209 for manure's value to a crop, Poore & Nemecek 2018 for what a kg of
// each product costs the planet, the RSPCA and the Soil Association for space); they are facts and rates, not creative
// work, and are written out here as our own rough numbers. Licence: none needed (no table is copied; the figures are
// rounded, and the sources are named so a reader can check them). No real place or brand is named.
//
// Added for the hooks the owner's answers on #29 ask of it: hours a head a day (the Farm Management Pocketbook's and
// Nix's labour tables give a laying hen about 1–2 hours a year, a ewe about 5–8, a finishing pig about 2–3 over its
// four months and a suckler cow about 12–20, rounded, with a full day's checks in them), and what a kg of each product
// sells for (AHDB's and Defra's rough 2026 farm-gate figures, rounded: eggs by the kg at about £3, deadweight lamb
// about £8 a kg carcass, pork about £3, beef about £5.50, cull ewe meat about £3, milk about 35 p a litre).

export type SpeciesId = 'hen' | 'ewe' | 'lamb' | 'pig' | 'cow';

/** What a species makes: eggs, meat (a growing animal's liveweight), lambs (a ewe's, made by part 12) or milk (data only). */
export type Product = 'eggs' | 'meat' | 'lambs' | 'milk';

export interface Species {
  id: SpeciesId;
  name: string;
  product: Product;
  /** Typical liveweight, kg (a lamb's and a pig's is the mid-point of the time they're kept). */
  weight: number;
  /** Dry matter eaten a head a day at a comfortable temperature, kg (feed and grass together). */
  intake: number;
  /** A growing animal is finished at this liveweight, kg (0 for one that isn't fattened). */
  finish: number;
  /** Liveweight gained a head a day on full feed, kg (0 for one that's kept for its eggs or its lambs). */
  gain: number;
  /** Carcass as a share of liveweight (what's sold as meat). */
  dressing: number;
  /** Eggs a hen lays a day at the best of the light, each about `EGG_KG`. */
  layRate: number;
  /** Milk a head gives a day, litres: data for later levels. */
  milk: number;
  /** Water drunk a head a day at 20 °C, litres. */
  water: number;
  /** The air temperatures, °C, between which it needs no shelter: colder than the first or hotter than the second stresses it. */
  comfort: {low: number; high: number};
  /** Space a head needs at a good stocking density, m² (a run, or grazing). */
  land: number;
  /** How fast welfare falls as the herd is packed tighter than that (a higher figure is a less tolerant species). */
  crowding: number;
  /** The share of a day's intake it can take from grass (0 for a species that's fed). */
  grazes: number;
  /** How fast overstocking wears the ground bare, a day per unit of overstocking (pigs root, hens scratch). */
  wear: number;
  /** The chance a herd at good density and welfare falls ill in a year. */
  illness: number;
  /** Enteric methane, kg CH₄ a head a year (IPCC Tier 1, temperate developed regions). */
  methane: number;
  /** Nitrogen excreted, kg N per 1,000 kg liveweight a day (IPCC 2006 vol. 4 table 10.19, western Europe). */
  nRate: number;
  /** Fresh manure, kg a head a day, its dry matter share, and the methane it can make (m³ CH₄ per kg of volatile solids, IPCC). */
  manure: {fresh: number; dry: number; b0: number};
  /** Manure nitrogen's direct nitrous oxide when it's left on the ground: kg N₂O-N per kg N (IPCC 2006 table 11.1: EF3 PRP). */
  n2oPasture: number;
  /** Keeper's time a head a day, hours (feeding, watering, checking, clearing out; more when ill, see `ILL_HOURS`). */
  hours: number;
  /** A breeding stock that its young carry: head-years a year for each head raised (a ewe for every 1.5 lambs). */
  breeders?: {species: SpeciesId; headYears: number};
}

export const SPECIES: Record<SpeciesId, Species> = {
  hen: {
    id: 'hen', name: 'Laying hens', product: 'eggs', weight: 2, intake: 0.115, finish: 0, gain: 0, dressing: 0.7,
    layRate: 0.95, milk: 0, water: 0.25, comfort: {low: 8, high: 27}, land: 4, crowding: 0.4, grazes: 0, wear: 0.004,
    illness: 0.15, methane: 0, nRate: 0.83, manure: {fresh: 0.14, dry: 0.25, b0: 0.39}, n2oPasture: 0.02,
    hours: 0.005,
  },
  ewe: {
    id: 'ewe', name: 'Ewes', product: 'lambs', weight: 70, intake: 1.8, finish: 0, gain: 0, dressing: 0.45,
    layRate: 0, milk: 0, water: 4, comfort: {low: -10, high: 25}, land: 800, crowding: 0.8, grazes: 1, wear: 0.004,
    illness: 0.3, methane: 8, nRate: 0.36, manure: {fresh: 2.4, dry: 0.25, b0: 0.19}, n2oPasture: 0.01,
    hours: 0.02,
  },
  lamb: {
    id: 'lamb', name: 'Lambs', product: 'meat', weight: 25, intake: 1.1, finish: 40, gain: 0.25, dressing: 0.45,
    layRate: 0, milk: 0, water: 2.5, comfort: {low: -5, high: 25}, land: 300, crowding: 0.8, grazes: 1, wear: 0.004,
    illness: 0.3, methane: 5, nRate: 0.36, manure: {fresh: 1.4, dry: 0.25, b0: 0.19}, n2oPasture: 0.01,
    hours: 0.008,
    breeders: {species: 'ewe', headYears: 1 / 1.5},
  },
  pig: {
    id: 'pig', name: 'Pigs', product: 'meat', weight: 60, intake: 2.2, finish: 100, gain: 0.75, dressing: 0.75,
    layRate: 0, milk: 0, water: 5.5, comfort: {low: 15, high: 25}, land: 100, crowding: 1, grazes: 0.1, wear: 0.008,
    illness: 0.25, methane: 1.5, nRate: 0.42, manure: {fresh: 3, dry: 0.13, b0: 0.45}, n2oPasture: 0.02,
    hours: 0.03,
  },
  cow: {
    id: 'cow', name: 'Cattle', product: 'milk', weight: 550, intake: 14, finish: 0, gain: 0, dressing: 0.5,
    layRate: 0, milk: 22, water: 55, comfort: {low: -5, high: 25}, land: 5000, crowding: 0.8, grazes: 1, wear: 0.004,
    illness: 0.3, methane: 57, nRate: 0.33, manure: {fresh: 30, dry: 0.12, b0: 0.24}, n2oPasture: 0.02,
    hours: 0.05,
  },
};

/** An egg's mass, kg (a medium egg, 58–63 g). */
export const EGG_KG = 0.06;

/**
 * What a kg of each product costs, whole chain, from Poore & Nemecek (2018), rounded: kg CO₂e, m² of land for a year and
 * litres of fresh water withdrawn, with the rough spread of the farms they studied for emissions ([low, high], kg CO₂e).
 * The diet question the game rests on. Meat is per kg of meat as sold, milk per litre.
 */
export const PER_KG: Record<'eggs' | 'lamb' | 'pig' | 'poultry' | 'beef' | 'milk', {ghg: number; land: number; water: number; range: [number, number]}> = {
  eggs: {ghg: 4.7, land: 6.3, water: 580, range: [2.5, 8]},
  lamb: {ghg: 40, land: 370, water: 1800, range: [20, 80]},
  pig: {ghg: 12, land: 17, water: 1800, range: [5, 25]},
  poultry: {ghg: 10, land: 12, water: 660, range: [4, 20]},
  beef: {ghg: 100, land: 330, water: 1450, range: [40, 200]},
  milk: {ghg: 3.2, land: 9, water: 630, range: [1.5, 6]},
};

/** How each species' product maps to a row of `PER_KG`. */
export const PRODUCT_ROW: Record<SpeciesId, keyof typeof PER_KG> = {hen: 'eggs', ewe: 'lamb', lamb: 'lamb', pig: 'pig', cow: 'milk'};

/**
 * The range a species' excreted nitrogen should fall in, kg N a head a year (IPCC 2006 defaults and RB209's book values),
 * for the plausibility test.
 */
export const N_RANGE: Record<SpeciesId, [number, number]> = {hen: [0.4, 0.9], ewe: [6, 14], lamb: [2, 7], pig: [6, 14], cow: [45, 100]};

/**
 * Manure as a fertiliser (RB209): the share of its nitrogen a first crop can use in the year. Poultry manure and pig
 * slurry are quick; farmyard manure from ruminants is mostly locked in organic matter and works over years.
 */
export const N_AVAILABLE: Record<SpeciesId, number> = {hen: 0.3, ewe: 0.1, lamb: 0.1, pig: 0.25, cow: 0.1};

/**
 * How manure is managed and what that costs the air (IPCC 2006 vol. 4 ch. 10 and 11, cool climate): the methane
 * conversion factor (the share of its methane potential released) and the nitrous oxide the nitrogen on the ground gives
 * off (kg N₂O-N per kg N: 0.01 on spread manure, EF1; the species' own on pasture, EF3 PRP), and the share of its
 * nitrogen lost to the air as ammonia and nitrogen gases. A heap's gases are the carbon model's (src/sim/models/carbon.ts).
 */
export const MANAGED = {
  heap: {mcf: 0, n2o: 0, lost: 0},
  spread: {mcf: 0.001, n2o: 0.01, lost: 0.1},
  pasture: {mcf: 0.01, n2o: 0, lost: 0.15}, // its nitrous oxide is the species' own (`n2oPasture`)
} as const;
export type Managed = keyof typeof MANAGED;

/** Carbon in manure dry matter, and the volatile solids among it (IPCC: the organic share). */
export const MANURE_C = 0.4, MANURE_VS = 0.85;

/** Grass: the most a thin sward grows a day at 15 °C or more (kept in check by the standing crop, temperate lowland swards make about 10 t of dry matter a hectare a year), the
 *  most a sward holds standing, the share of it grazing can take in a day, and the temperature it stops growing at. */
export const GRASS = {growth: 0.012, standing: 0.25, take: 0.6, base: 5, best: 15};

/** Eggs by the light: a hen lays little below `DARK` hours of daylight and her best from `LIGHT`; the least she'll lay is `FLOOR` of it. */
export const LAYING = {dark: 8, light: 13, floor: 0.4};

/**
 * What each species sells for, £: a kg of eggs, and a kg of carcass for the animals sold as meat (a cull ewe's is mutton),
 * a litre of milk. Rough 2026 farm-gate figures from AHDB and Defra's market prices, rounded.
 */
export const SALE_PRICE: Record<SpeciesId, {product: 'eggs' | 'meat' | 'milk'; perKg: number}> = {
  hen: {product: 'eggs', perKg: 3},
  ewe: {product: 'meat', perKg: 3},
  lamb: {product: 'meat', perKg: 8},
  pig: {product: 'meat', perKg: 3},
  cow: {product: 'meat', perKg: 5.5},
};
/** Milk, £ a litre (data for later levels: nothing milks yet). */
export const MILK_PRICE = 0.35;
/** A sick herd needs this many times the keeper's time (treating, isolating, more checks): a rough figure with no published source. */
export const ILL_HOURS = 1.5;
/** How much of a day's output an outbreak destroys while it lasts: illness halves what the herd makes (livestock.ts). */
export const OUTBREAK_SIZE = 0.5;
