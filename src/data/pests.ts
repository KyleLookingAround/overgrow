// Pests: the garden's slugs, aphids and potato and tomato blight, and what the gardener's pest policy costs and does,
// for the pest model (src/sim/models/pests.ts). Rough numbers from the sources the model names: slugs from AHDB's slug
// control guidance and the RHS ("Slugs and snails": most active on mild, damp nights, seedlings the worst hit, a torch
// patrol and traps catching a share, ferric phosphate pellets for about two weeks); aphids from degree-day development
// (black bean aphid, a lower threshold of about 4 °C and a generation in about 120 degree days, doubling in two or three
// days in a warm spell) with winged migrants arriving from late May (AHDB Aphid News); ladybirds eating up to about 50
// aphids a day each as adults and more as larvae (Dixon 2000, "Insect predator-prey dynamics: ladybird beetles and
// biological control"); blight from the Smith period (two days in a row with a minimum of 10 °C or more and at least 11
// hours at 90 % humidity; the Met Office and AHDB's BlightWatch) and a crop blackened within two weeks or so of the first
// lesions in muggy weather (Cooke et al. 2011, "Epidemiology and integrated control of potato late blight in Europe").

/** Slugs, per bed and in the lawn's edge. */
export const SLUGS = {
  /** Slugs to a m² of dug bed, and in the whole lawn's edge, on day 1. */
  start: {perM2: 4, edge: 100},
  /** The most a bed holds a m², and the lawn's edge in all. */
  cap: {perM2: 30, edge: 400},
  /** Eggs hatching: a share of the population a day in mild (5–20 °C), moist weather, most in spring and autumn and a
   *  share of that in the other months. */
  breed: 0.04,
  breedMonths: [3, 4, 5, 9, 10, 11],
  offSeason: 0.3,
  /** Dying: a share a day, more on dry soil and after a hard frost. */
  die: 0.003,
  dry: 0.01,
  frost: 0.05,
  /** On a wet night, the share of the lawn's edge that crawls onto each planted bed; from a bed with nothing growing,
   *  the share that goes back. */
  roam: 0.02,
  leave: 0.05,
  /** The share of a bed's slugs out feeding in the dark: after rain, on moist soil, on dry soil; none below 3 °C. */
  out: {wet: 0.6, damp: 0.25, dry: 0.04},
  minTemp: 3,
  /** The share of a m² of seedlings one slug out for an hour destroys (a row can go in a wet night). */
  seedling: 0.0012,
  /** Grams of leaf one slug out for an hour eats from a grown crop. */
  graze: 0.05,
  /** A crop counts as seedlings until it is this far to its first harvest. */
  young: 0.2,
};

/** Aphids, on the crops that draw them. */
export const APHIDS = {
  /** Lower development threshold, °C, and the population's growth a day for each degree above it, capped at 25 °C. */
  base: 4,
  perDD: 0.018,
  top: 25,
  /** The most a m² of crop carries. */
  cap: 3000,
  /** Winged migrants arriving a day on a m² of the favourite host, between two dates, once the day's mean is 11 °C. */
  arrive: {from: [5, 15] as [number, number], to: [7, 31] as [number, number], minMean: 11, perM2: 8},
  /** How good a host each crop is. */
  host: {beans: 1, lettuce: 0.5, tomatoes: 0.3} as Record<string, number>,
  /** Dying a day; washed off by heavy rain (mm); leaving once crowded (above half the cap). */
  die: 0.03,
  washMm: 10,
  wash: 0.15,
  leave: 0.1,
  /** Sap they take: the share of the day's growth lost at `harmAt` aphids a m² or more. */
  harm: 0.5,
  harmAt: 1500,
};

/** Ladybirds eating aphids (Holling's type II): the most one eats a day, and the aphids a m² at which it eats half that. */
export const LADYBIRDS = {eats: 50, half: 150};

/** Potato and tomato blight. */
export const BLIGHT = {
  /** A Smith day: a minimum of at least 10 °C and at least 11 humid hours; two in a row are a Smith period. */
  minTemp: 10,
  humidHours: 11,
  /** The stand-in for humidity the weather doesn't give: an hour is humid (90 % or more) while it rains or while the air
   *  is within this many degrees of the dew point, taken as the day's minimum (FAO-56, a humid climate), a degree higher
   *  on a wet day. At 10–15 °C, 90 % humidity is about 1.6 °C above the dew point; 2 °C allows for dew and mist. */
  near: 2,
  /** The share of the tops infected when a Smith period starts it, and more for the spores left in the garden. */
  start: 0.005,
  spores: 0.03,
  /** Spread a day, as a share of what's still green: in humid weather, otherwise, and on a hot day (tmax above `hot`). */
  spread: {humid: 0.35, dry: 0.1, hot: 0.03},
  hot: 28,
  /** Ripe produce rotting a day, as a share of it times the infection: tubers, and fruit. */
  rot: {potatoes: 0.02, tomatoes: 0.1} as Record<string, number>,
  /** Spores left in the garden when a blighted crop ends (tubers missed, haulm on the heap), times its infection, and
   *  the share still there a year on. */
  carry: 0.5,
  fade: 0.5,
};

/**
 * Soil-borne pests and diseases of a family, building up in a bed that grows the family again and dying away while it
 * doesn't: the reason for rotation (RHS, "Crop rotation"). Each is the bed's inoculum, 0–1: `start` in a dug bed, times
 * (1 + `gain`) when a crop of the family finishes (roots rotting release spores and cysts), halving every `halfLife`
 * days without it; a crop of the family loses up to `harm` of its growth at full inoculum. Clubroot on brassicas: resting
 * spores with a half-life of about 3.6 years (Wallenhammar 1996, Plant Pathology 45) and a crop on badly infested ground
 * lost (AHDB clubroot guidance); potato cyst nematode on potatoes and tomatoes: cysts declining about 30 % a year
 * without a host and multiplying many times under one (AHDB, "Potato cyst nematode"); foot and root rots of beans
 * (Aphanomyces, Fusarium) lasting a few years. Lettuce has none here.
 */
export const SOILBORNE: Record<string, {name: string; start: number; gain: number; halfLife: number; harm: number}> = {
  brassica: {name: 'clubroot', start: 0.02, gain: 1, halfLife: 3.6 * 365, harm: 0.5},
  solanum: {name: 'potato cyst nematode', start: 0.02, gain: 1, halfLife: 2 * 365, harm: 0.5},
  legume: {name: 'foot and root rot', start: 0.02, gain: 1, halfLife: 1.5 * 365, harm: 0.3},
};

export type PestId = 'slugs' | 'aphids' | 'blight';
export type Policy = 'leave' | 'pick' | 'trap' | 'treat';

/** The pest policy's choices for each pest (a trap for aphids or blight isn't a thing a garden does). */
export const POLICIES: Record<PestId, Policy[]> = {slugs: ['leave', 'pick', 'trap', 'treat'], aphids: ['leave', 'pick', 'treat'], blight: ['leave', 'pick', 'treat']};
/** The plan's pest policy on day 1: the gardener picks slugs at dusk (the founding spec's first minute) and leaves the rest. */
export const START_POLICY: Record<PestId, Policy> = {slugs: 'pick', aphids: 'leave', blight: 'leave'};

/**
 * What each policy costs the gardener and does. Minutes are for a bed, each time; `share` is the share caught or cut;
 * `cost` is £ a bed each time from the household's purse; `days` is how long a treatment lasts.
 */
export const CONTROL = {
  slugs: {
    /** Out after dark with a torch, picking what's on the move (RHS): a share of the slugs out. */
    pick: {minutes: 10, share: 0.5},
    /** A home-made trap (a sunken jar, a board) checked each morning: a share of last night's slugs caught. */
    trap: {minutes: 4, share: 0.3},
    /** Ferric phosphate pellets, scattered thinly: they kill a share of the slugs out each hour for two weeks. A dose adds
     *  about 0.02 g of phosphorus a m² (6 g of pellets at 1 % iron phosphate). */
    treat: {minutes: 3, days: 14, kill: 0.08, cost: 0.1, phosphorusPerM2: 0.02e-3},
  },
  aphids: {
    /** Squashing the colonies and pinching out the bean tips, once there are more than `over` a m². */
    pick: {minutes: 10, share: 0.6, over: 30},
    /** A contact insecticide (a pyrethrin spray): most of the aphids, and the ladybirds and bees it touches. */
    treat: {minutes: 5, share: 0.9, over: 30, days: 7, cost: 0.15, ladybirds: 0.3, bees: 0.6},
  },
  blight: {
    /** Picking off blighted leaves: a share of the infection, and it spreads slower for a day. */
    pick: {minutes: 10, share: 0.3, slows: 0.5, over: 0.01},
    /** A protectant fungicide every week from June to September: new infection and spread cut by `protect` until it
     *  runs out or heavy rain (mm) washes it off; a little hard on ladybirds too. */
    treat: {minutes: 5, days: 7, protect: 0.8, washMm: 10, cost: 0.25, ladybirds: 0.9, months: [6, 7, 8, 9]},
  },
};
