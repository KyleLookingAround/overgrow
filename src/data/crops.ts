// Crops: the six the back garden grows, with what the crop model (src/sim/models/crops.ts) needs of each. Sowing windows
// are the RHS's for sowing or planting outdoors in southern England ("Grow your own" crop guides); degree days to
// emergence, to the first harvest and through the harvest window are growing-degree-day phenology above each crop's base
// temperature, set so a crop sown in its season takes about the RHS's weeks; crop coefficients by stage and the share of
// available water used before stress are FAO-56's tables 12 and 22 (Allen et al. 1998); the yield response to water
// stress (Ky) is FAO-33's (Doorenbos & Kassam 1979) as FAO-56 table 24 repeats it; nutrient uptake for a full crop is
// RB209's rough size (AHDB 2023, section 6, vegetables and potatoes); yields are a well-kept garden bed's, at the upper
// end of RHS and allotment figures. Beans and tomatoes are tender and die in a frost; a frost blackens potatoes' tops
// and sets them back; the rest shrug off a light frost. French marigolds are the garden's flowers (part 5): planted out
// as young plants after the frosts and in flower from early summer to the first frost (RHS, "Tagetes"), they feed no one
// but bring bees and hoverflies, and ladybirds after the aphids (src/sim/models/biodiversity.ts). Beans and tomatoes
// set more pods and fruit with pollinators about: Klein et al. (2007) class both as "little" dependent (a 0–10 % loss
// without them), taken here as 5 %. The harvest index, the share of a crop's phosphorus and potassium in the part that's
// eaten, is RB209's offtake in the produce (AHDB 2023, section 6, and section 5 for potatoes: about 0.4 kg P and 5 kg K a
// tonne of tubers, of a crop's 25 kg P and 220 kg K a hectare) against the crop's whole uptake: most of a lettuce or a
// cut of salad is eaten, half a radish's is in its leaves, and a bean's haulm holds more than its pods. The P and K in a
// kg of fresh produce going to the heap as scraps are McCance and Widdowson's (The Composition of Foods, 7th ed.,
// 2014) rough middle for vegetables: about 0.3 g of phosphorus and 3 g of potassium.

export type CropId = 'salad' | 'radish' | 'lettuce' | 'beans' | 'potatoes' | 'tomatoes' | 'marigolds';
/** For rotation: the botanical family (a bed shouldn't grow the same one twice running). */
export type Family = 'legume' | 'brassica' | 'solanum' | 'daisy';
/** What the kitchen groups a product under (src/data/kitchen.ts). */
export type Group = 'salads' | 'potatoes' | 'tomatoes' | 'greens';

export interface CropSpec {
  id: CropId;
  name: string;
  /** The food it makes, kept by product ('food.<product>' stocks, kg). */
  product: string;
  family: Family;
  /** The kitchen's group; none for flowers, which aren't eaten. */
  group?: Group;
  /** Flowers: grown for the bees and ladybirds, never in the rotation. */
  flower?: true;
  /** Klein et al. (2007): the share of its yield lost with no pollinators at all (none for a crop harvested for its
   *  leaves or roots, or one the wind or its own flowers pollinate). */
  pollinated?: number;
  /** Sown or planted outdoors from the first day of `from` to the last of `to`, as [month, day] pairs. */
  sow: {from: [number, number]; to: [number, number]};
  /** Sown as seed, or planted out as seed potatoes or young plants raised on a windowsill (not modelled). */
  how: 'sow' | 'plant';
  /** Base temperature for growth, °C. */
  base: number;
  /** Degree days above base: to emergence, to the first harvest, and how long picking lasts after it. */
  dd: {emerge: number; mature: number; picking: number};
  /** 'once': the whole crop is ready together and bolts or rots once picking time has passed. 'repeat': picked again
   *  and again while picking lasts (cut-and-come-again leaves, beans, tomatoes), `first` of it ready at once at maturity. */
  harvest: 'once' | 'repeat';
  first?: number;
  /** Days a ripe crop keeps on the plant before it spoils (repeat crops), and in the kitchen. */
  keeps: {plant: number; kitchen: number};
  /** FAO-56 table 12: crop coefficients at the initial stage, mid-season and the end. */
  kc: {ini: number; mid: number; end: number};
  /** FAO-56 table 22: the share of the available water it uses before it's stressed. */
  p: number;
  /** FAO-33 yield response to water: relative yield loss per unit of relative evapotranspiration deficit. */
  ky: number;
  /** Fresh yield of a full crop, kg per m², and crop residue left when it's done (leaves, haulm, stems), kg per m². */
  yield: number;
  residue: number;
  /** Uptake from the soil for a full crop, kg per hectare of N, P and K (beans fix most of their own nitrogen). */
  uptake: {n: number; p: number; k: number};
  /** The share of its phosphorus and potassium in the part that's eaten (its nutrient harvest index): that leaves as
   *  food, the rest (leaves, stems, roots) goes back to the heap with the residue. */
  harvestIndex: number;
  /** Killed outright by a frost ('plant'), set back ('tops'), or unharmed ('none'). */
  frost: 'plant' | 'tops' | 'none';
  /** Hours to pick a kg by hand. */
  pick: number;
  /** The pests it draws (src/sim/models/pests.ts; flea beetle isn't modelled yet). */
  pests: string[];
}

export const CROPS: Record<CropId, CropSpec> = {
  salad: {
    id: 'salad', name: 'Salad leaves', product: 'salad', family: 'brassica', group: 'salads', sow: {from: [3, 1], to: [9, 15]}, how: 'sow',
    base: 2, dd: {emerge: 55, mature: 230, picking: 650}, harvest: 'repeat', first: 0.3, keeps: {plant: 6, kitchen: 4},
    kc: {ini: 0.7, mid: 1.0, end: 0.95}, p: 0.3, ky: 1.0, yield: 2.2, residue: 0.3, uptake: {n: 90, p: 12, k: 100}, harvestIndex: 0.75, frost: 'none', pick: 0.4,
    pests: ['slugs', 'flea beetle'],
  },
  radish: {
    id: 'radish', name: 'Radishes', product: 'radish', family: 'brassica', group: 'salads', sow: {from: [3, 1], to: [8, 31]}, how: 'sow',
    base: 2, dd: {emerge: 45, mature: 330, picking: 130}, harvest: 'once', keeps: {plant: 0, kitchen: 10},
    kc: {ini: 0.7, mid: 0.9, end: 0.85}, p: 0.3, ky: 1.0, yield: 2.0, residue: 0.4, uptake: {n: 60, p: 8, k: 70}, harvestIndex: 0.5, frost: 'none', pick: 0.2,
    pests: ['slugs', 'flea beetle'],
  },
  lettuce: {
    id: 'lettuce', name: 'Lettuce', product: 'lettuce', family: 'daisy', group: 'salads', sow: {from: [3, 1], to: [8, 15]}, how: 'sow',
    base: 2, dd: {emerge: 60, mature: 620, picking: 200}, harvest: 'once', keeps: {plant: 0, kitchen: 7},
    kc: {ini: 0.7, mid: 1.0, end: 0.95}, p: 0.3, ky: 1.0, yield: 3.0, residue: 0.6, uptake: {n: 100, p: 15, k: 150}, harvestIndex: 0.8, frost: 'none', pick: 0.1,
    pests: ['slugs', 'aphids'],
  },
  beans: {
    id: 'beans', name: 'French beans', product: 'beans', family: 'legume', group: 'greens', sow: {from: [5, 15], to: [7, 15]}, how: 'sow',
    base: 8, dd: {emerge: 70, mature: 520, picking: 450}, harvest: 'repeat', first: 0, keeps: {plant: 5, kitchen: 5},
    kc: {ini: 0.5, mid: 1.05, end: 0.9}, p: 0.45, ky: 1.15, yield: 2.0, residue: 1.0, uptake: {n: 40, p: 12, k: 60}, harvestIndex: 0.45, frost: 'plant', pick: 0.5,
    pests: ['slugs', 'aphids'], pollinated: 0.05,
  },
  potatoes: {
    id: 'potatoes', name: 'Potatoes', product: 'potatoes', family: 'solanum', group: 'potatoes', sow: {from: [3, 15], to: [5, 15]}, how: 'plant',
    base: 5, dd: {emerge: 180, mature: 800, picking: 700}, harvest: 'once', keeps: {plant: 0, kitchen: 60},
    kc: {ini: 0.5, mid: 1.15, end: 0.75}, p: 0.35, ky: 1.1, yield: 3.5, residue: 1.0, uptake: {n: 160, p: 25, k: 220}, harvestIndex: 0.75, frost: 'tops', pick: 0.1,
    pests: ['slugs', 'blight'],
  },
  tomatoes: {
    id: 'tomatoes', name: 'Tomatoes', product: 'tomatoes', family: 'solanum', group: 'tomatoes', sow: {from: [5, 20], to: [6, 30]}, how: 'plant',
    base: 10, dd: {emerge: 0, mature: 560, picking: 550}, harvest: 'repeat', first: 0, keeps: {plant: 7, kitchen: 7},
    kc: {ini: 0.6, mid: 1.15, end: 0.8}, p: 0.4, ky: 1.05, yield: 4.0, residue: 1.5, uptake: {n: 150, p: 25, k: 250}, harvestIndex: 0.6, frost: 'plant', pick: 0.15,
    pests: ['aphids', 'blight'], pollinated: 0.05,
  },
  marigolds: {
    id: 'marigolds', name: 'French marigolds', product: 'marigolds', family: 'daisy', flower: true, sow: {from: [5, 20], to: [6, 30]}, how: 'plant',
    base: 8, dd: {emerge: 0, mature: 250, picking: 1100}, harvest: 'repeat', first: 0, keeps: {plant: 0, kitchen: 1},
    kc: {ini: 0.6, mid: 0.9, end: 0.8}, p: 0.5, ky: 1.0, yield: 0, residue: 0.8, uptake: {n: 40, p: 8, k: 50}, harvestIndex: 0, frost: 'plant', pick: 0,
    pests: ['slugs'],
  },
};

/** kg of nitrogen, phosphorus and potassium in a kg of fresh vegetables: what the kitchen's scraps carry to the heap. */
export const PRODUCE = {n: 0.0025, p: 0.0003, k: 0.003} as const;

export const CROP_IDS = Object.keys(CROPS) as CropId[];
/** The flowers the plan can put in a bed or along its edge. */
export const FLOWER_IDS = CROP_IDS.filter((c) => CROPS[c].flower);

/** The family rotation the gardener follows when a bed's plan says so: beans, then brassicas, then potatoes and
 *  tomatoes, then lettuce, and round again (RHS, "Crop rotation"). */
export const ROTATION: readonly Family[] = ['legume', 'brassica', 'solanum', 'daisy'];

/**
 * How fast crops develop against the real degree days: 1, the real pace. The owner chose a head start (#11) over a
 * faster pace for the spec's first harvest in the first week: a bed of overwintered salad leaves (src/sim/state.ts).
 */
export const GROWTH_PACE = 1;

/** Degrees of frost a cover keeps off a bed, by cover (part 6's cold frame adds itself here). */
export const COVERS: Record<string, number> = {};
