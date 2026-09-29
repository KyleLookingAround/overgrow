// Rotation: what each thing a field can carry in a year (a cash crop, a cover crop, a grass-clover ley, or fallow) costs,
// earns, takes from the soil and leaves in it, per hectare, for the rotation model (src/sim/models/rotation.ts). Rough
// numbers from the sources the model names: yields, prices and variable costs of the size of the Farm Management
// Pocketbook and AHDB's Cereal and Oilseed and Potato margins, rounded; nitrogen needs and maxima from RB209 (AHDB 2023,
// section 4: arable crops); the N a legume break or a ley leaves for the next crop from RB209's previous-crop tables; P
// and K offtake from RB209's crop removal figures; nitrous oxide from the IPCC's 2019 refinement, volume 4 chapter 11
// (emission factors EF1 and EF5) with AR6's 100-year warming potential; soil-borne disease from AHDB's take-all,
// clubroot and potato cyst nematode guidance (through the garden's own numbers for the last two,
// src/data/pests.ts). The figures are rounded facts from those sources, not copied text, so no licence is carried.
// Invented places only.
import {SOILBORNE} from './pests';
import {START_K_MG_L, START_P_MG_L, DEPTH} from './soils';
import type {Operation} from './machinery';

export type FieldCropId = 'wheat' | 'barley' | 'potatoes' | 'beans' | 'rape';
/** What a field can carry for a year. */
export type Act = FieldCropId | 'cover' | 'ley' | 'fallow';

export type FieldFamily = 'cereal' | 'solanum' | 'legume' | 'brassica';

/** A wheeled job in the year: the operation, how many passes, and the ground's wetness against field capacity when it's done. */
export interface Wheeling {
  op: Operation;
  passes: number;
  wet: number;
}

export interface ActSpec {
  name: string;
  /** The family a soil-borne disease follows; none for a cover crop, a ley or fallow. */
  family?: FieldFamily;
  /** Sown in autumn, so it holds the nitrogen through the winter that leaches it. */
  winter: boolean;
  /** The share of the year the ground is under a living crop (RothC's cover factor slows decay by 0.4 of this). */
  green: number;
  /** Fresh yield of a full crop, t per hectare (dry matter for a ley), and its price £ a tonne. */
  yield: number;
  price: number;
  /** Variable costs (seed, sprays, drying, contractors), £ a hectare, apart from fertiliser. */
  cost: number;
  /** Nitrogen a full crop takes from the soil (RB209 supply-and-demand), kg/ha; the most fertiliser RB209 advises; the
   *  nitrogen a legume fixes at full yield; the share of what it holds that leaves in the harvest. */
  need: number;
  maxN: number;
  fix: number;
  offtake: number;
  /** P and K it takes off in the harvest, kg/ha. */
  p: number;
  k: number;
  /** Carbon its roots, stubble and residues put in the soil, kg C/ha. */
  residueC: number;
  /** The nitrogen it can hold over winter, kg/ha, when it's in the ground then. */
  winterUptake: number;
  /** Klein et al. (2007): the share of yield lost with no pollinators. */
  pollinated?: number;
  wheelings: Wheeling[];
}

const passes = (plough: number, drill: number, spray: number, harvest: number, wetHarvest: number, wetWork = 0.8): Wheeling[] => [
  {op: 'plough', passes: plough, wet: wetWork},
  {op: 'drill', passes: drill, wet: wetWork},
  {op: 'spray', passes: spray, wet: 0.65},
  {op: 'harvest', passes: harvest, wet: wetHarvest},
];

export const ACTS: Record<Act, ActSpec> = {
  wheat: {
    name: 'Winter wheat', family: 'cereal', winter: true, green: 0.85, yield: 8, price: 190, cost: 380, need: 200, maxN: 220, fix: 0, offtake: 0.85,
    p: 26, k: 37, residueC: 1300, winterUptake: 45, wheelings: passes(1, 1, 3, 1, 0.6),
  },
  barley: {
    name: 'Spring barley', family: 'cereal', winter: false, green: 0.6, yield: 6, price: 170, cost: 300, need: 130, maxN: 150, fix: 0, offtake: 0.8,
    p: 20, k: 28, residueC: 1100, winterUptake: 0, wheelings: passes(1, 1, 3, 1, 0.6, 0.85),
  },
  potatoes: {
    name: 'Potatoes', family: 'solanum', winter: false, green: 0.5, yield: 40, price: 130, cost: 3200, need: 170, maxN: 240, fix: 0, offtake: 0.7,
    p: 21, k: 193, residueC: 900, winterUptake: 0, wheelings: passes(1, 1, 5, 2, 1.0),
  },
  beans: {
    name: 'Field beans', family: 'legume', winter: false, green: 0.55, yield: 4, price: 250, cost: 320, need: 25, maxN: 0, fix: 180, offtake: 0.55,
    p: 17, k: 40, residueC: 1500, winterUptake: 0, pollinated: 0.15, wheelings: passes(1, 1, 2, 1, 0.7),
  },
  rape: {
    name: 'Oilseed rape', family: 'brassica', winter: true, green: 0.9, yield: 3.5, price: 400, cost: 500, need: 190, maxN: 250, fix: 0, offtake: 0.5,
    p: 15, k: 25, residueC: 1600, winterUptake: 60, pollinated: 0.1, wheelings: passes(1, 1, 4, 1, 0.6),
  },
  // a season of vetch and rye ploughed in: costs seed and a pass, earns nothing, fixes a little and puts a lot of carbon in
  cover: {
    name: 'Cover crop', winter: true, green: 0.8, yield: 0, price: 0, cost: 90, need: 30, maxN: 0, fix: 50, offtake: 0,
    p: 0, k: 0, residueC: 2600, winterUptake: 70, wheelings: [{op: 'drill', passes: 1, wet: 0.8}, {op: 'plough', passes: 1, wet: 0.8}],
  },
  // a year of grass and clover cut for forage: earns a little, fixes nitrogen, builds carbon, leaves a credit when ploughed in
  ley: {
    name: 'Grass-clover ley', winter: true, green: 1, yield: 7, price: 55, cost: 150, need: 60, maxN: 0, fix: 80, offtake: 0.6,
    p: 15, k: 70, residueC: 3500, winterUptake: 60, wheelings: [{op: 'drill', passes: 1, wet: 0.8}, {op: 'harvest', passes: 2, wet: 0.7}],
  },
  // a year of bare, topped ground: earns nothing; pests die back and wheels stay off, but the soil's carbon and nitrogen are lost
  fallow: {
    name: 'Fallow', winter: false, green: 0, yield: 0, price: 0, cost: 60, need: 0, maxN: 0, fix: 0, offtake: 0,
    p: 0, k: 0, residueC: 200, winterUptake: 0, wheelings: [{op: 'spray', passes: 1, wet: 0.6}],
  },
};

export const ACT_IDS = Object.keys(ACTS) as Act[];
export const CROP_ACTS = ACT_IDS.filter((a) => ACTS[a].yield > 0 && a !== 'ley') as FieldCropId[];

/** "Follow the rotation": the four-course, legume first (a break for the disease, nitrogen for the cereal after it). */
export const ROTATION: Act[] = ['beans', 'wheat', 'potatoes', 'barley'];

/** A cover crop sown after harvest to hold the winter's nitrogen (a catch crop): its cost, £, the nitrogen it holds, kg/ha, and carbon it leaves, kg C/ha. */
export const CATCH = {cost: 45, uptake: 40, carbon: 800};

/** Soil-borne disease in a field: the garden's numbers (src/data/pests.ts) with a cereal's take-all added, and each
 *  family's build-up a field's bigger, less-watched population makes faster (AHDB: take-all worsens for a second and a
 *  third wheat; potato cyst nematode multiplies several times on each susceptible crop). `gain` is the share added when
 *  a crop of the family finishes (inoculum × (1 + gain), capped at 1); `harm` the yield lost at full inoculum. */
export const FIELD_SOILBORNE: Record<FieldFamily, {name: string; start: number; gain: number; halfLife: number; harm: number}> = {
  cereal: {name: 'take-all', start: 0.05, gain: 3, halfLife: 365, harm: 0.45},
  solanum: {...SOILBORNE.solanum!, gain: 4, harm: 0.8},
  brassica: {...SOILBORNE.brassica!, gain: 1.5},
  legume: {...SOILBORNE.legume!},
};

/** Pests without a soil life (aphids, pigeons, slugs): the share of yield lost in a normal year, and how much of it a field's margin's natural enemies hold back at full strength. */
export const GENERIC_PEST = {loss: 0.06, held: 0.5};

/** A field's margin (a hedge or flower strip along its edge): the share of the field it takes at which the bees and predators it feeds count in full (Wood et al. 2015; the garden's `FULL_FLOWERS`, scaled to a field's edge). */
export const MARGIN_FULL = 0.05;

/** Nitrogen: the share of the soil's mineral nitrogen a crop can take up (RB209's fertiliser recovery, about two thirds); how much of last year's residue nitrogen mineralises next year, the rest joining the organic matter; the share of a year's mineralisation that comes in autumn and winter; the share of a cover crop's held nitrogen released to the next crop (the rest joins organic matter). */
export const NITROGEN = {recovery: 0.7, residueRelease: 0.6, winterShare: 0.35, heldRelease: 0.7, yieldLoss: 0.8};

/** Manure (farmyard, well rotted), per tonne: carbon kg, total N kg, and the shares of that N in the first year's soil (RB209: about 12 %), in next year's residue pool, and in the organic matter; P and K kg; £ to spread. */
export const MANURE = {carbon: 80, n: 6, avail: 0.12, residue: 0.28, organic: 0.6, p: 1.4, k: 6.6, cost: 4};

/** Nitrous oxide (IPCC 2019 refinement, vol. 4 ch. 11): EF1, the share of applied and residue nitrogen emitted as N₂O-N; EF5, the share of leached nitrogen emitted downstream; N₂O's mass over N₂O-N's; and AR6's 100-year warming potential. */
export const N2O = {direct: 0.01, indirect: 0.011, massRatio: 44 / 28, gwp: 273};

/** Fertiliser prices: £ a kg of N, P and K. */
export const PRICE = {n: 0.9, p: 1.5, k: 0.85};

/** Phosphorus and potassium in the soil, kg/ha in the layer (soil.ts's index 2: 20 and 150 mg/L in 30 cm), the level (index 1) below which yield falls, and the yield lost with none. */
export const PK = {
  start: {p: (START_P_MG_L * DEPTH * 1e4 * 1000) / 1e6, k: (START_K_MG_L * DEPTH * 1e4 * 1000) / 1e6},
  floor: {p: 40, k: 300},
  yieldLoss: 0.5,
};

/** Weather a field year is run under: the winter's drainage, mm; how dry the summer was, 0–1; a yield multiplier. */
export const NORMAL_YEAR = {drainage: 250, dry: 0, season: 1};
/** The year's mean temperature and the soil's usual moisture (0–1 of available water) that soil.ts's rate modifiers are fed. */
export const CLIMATE = {meanTemp: 10, moisture: 0.75};
/** Yield lost in a dry summer at `dry` = 1, for a soil holding no more water than `awcRef` (m³/m³ available); a soil holding more loses less. */
export const DROUGHT = {loss: 0.35, awcRef: 0.22};
/** Yield lost at zero soil health (a poor structure, low organic matter): 0.1 × (1 − health / 100). */
export const HEALTH_LOSS = 0.1;
/** The rooting zone winter drainage flushes nitrate through, m (the model's soil layer is 30 cm; a crop's roots and the rain's wetting front go three times as deep). */
export const ROOT_DEPTH = 0.9;
