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
// The winter crops (the playable garden) are the RHS's for an autumn sowing that stands the winter: hardy salad leaves
// (lamb's lettuce, mizuna, land cress) sown from mid-August, cropping slowly through the winter and faster in spring;
// broad beans ('Aquadulce') sown in October and November for pods in early June; garlic planted from October for
// bulbs in July; onion sets for overwintering planted from mid-September for bulbs in late June, garlic and onions
// keeping for months once dried; and a green manure of grazing rye and winter vetch sown from mid-August and dug in
// in spring, holding the winter's nitrate from leaching and giving the bed its organic matter back (RHS, "Green
// manures"; Thorup-Kristensen et al. 2003, "Catch crops and green manures as biological tools in nitrogen management
// in temperate zones"). Broad beans and vetch grow from about 0 °C (Vicia faba's base temperature; Patrick & Stoddard
// 2010), garlic and onions from about 1 °C. Their uptake and yields are RB209's and the RHS's rough sizes. Kale (sown in
// spring) and leeks (planted out in early summer from a windowsill sowing) are the summer plan's crops for the winter:
// both stand hard frosts and are picked a few leaves or a few leeks at a time from autumn to spring (RHS, "Kale" and
// "Leeks"). In the rotation, onions, garlic and leeks go with the legumes (RHS, "Crop rotation": a four-bed plan of
// potatoes, legumes and onions, brassicas, and roots and salads).
// Seed prices are a bed's worth from a UK seed catalogue or garden centre, rough 2027 prices (Suttons, Thompson & Morgan):
// a packet of seed about £2–3, seed potatoes £4.50 for a bed's dozen tubers, onion sets and garlic bulbs, and a tray of
// young tomato, leek or marigold plants. A packet usually holds more than a bed needs; the rest is taken as going stale.

export type CropId = 'salad' | 'radish' | 'lettuce' | 'beans' | 'potatoes' | 'tomatoes' | 'kale' | 'leeks' | 'marigolds' | 'winter-salad' | 'broad-beans' | 'garlic' | 'onions' | 'green-manure';
/** For rotation: the botanical family (a bed shouldn't grow the same one twice running). */
export type Family = 'legume' | 'brassica' | 'solanum' | 'daisy' | 'allium' | 'cover';
/** What the kitchen groups a product under (src/data/kitchen.ts). */
export type Group = 'salads' | 'potatoes' | 'tomatoes' | 'greens';

export interface CropSpec {
  id: CropId;
  name: string;
  /** £ for a bed's sowing: a packet of seed, a bag of seed potatoes, sets or cloves, or a tray of young plants. */
  seed: number;
  /** The food it makes, kept by product ('food.<product>' stocks, kg). */
  product: string;
  family: Family;
  /** The kitchen's group; none for flowers, which aren't eaten. */
  group?: Group;
  /** Flowers: grown for the bees and ladybirds, never in the rotation. */
  flower?: true;
  /** Sown in autumn to stand the winter: offered as a bed's winter crop, never in the summer rotation. */
  winter?: true;
  /** A green manure: grown for the soil, dug in where it stands (its residue and all it took go back into the bed). */
  dugIn?: true;
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
  /** The share of its phosphorus and potassium in the part that's eaten (its nutrient harvest index), standing in for
   *  its nitrogen too: that leaves as food, the rest (leaves, stems, roots) goes back to the heap with the residue. */
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
    id: 'salad', name: 'Salad leaves', seed: 2.5, product: 'salad', family: 'brassica', group: 'salads', sow: {from: [3, 1], to: [9, 15]}, how: 'sow',
    base: 2, dd: {emerge: 55, mature: 230, picking: 650}, harvest: 'repeat', first: 0.3, keeps: {plant: 6, kitchen: 4},
    kc: {ini: 0.7, mid: 1.0, end: 0.95}, p: 0.3, ky: 1.0, yield: 2.2, residue: 0.3, uptake: {n: 90, p: 12, k: 100}, harvestIndex: 0.75, frost: 'none', pick: 0.4,
    pests: ['slugs', 'flea beetle'],
  },
  radish: {
    id: 'radish', name: 'Radishes', seed: 1.8, product: 'radish', family: 'brassica', group: 'salads', sow: {from: [3, 1], to: [8, 31]}, how: 'sow',
    base: 2, dd: {emerge: 45, mature: 330, picking: 130}, harvest: 'once', keeps: {plant: 0, kitchen: 10},
    kc: {ini: 0.7, mid: 0.9, end: 0.85}, p: 0.3, ky: 1.0, yield: 2.0, residue: 0.4, uptake: {n: 60, p: 8, k: 70}, harvestIndex: 0.5, frost: 'none', pick: 0.2,
    pests: ['slugs', 'flea beetle'],
  },
  lettuce: {
    id: 'lettuce', name: 'Lettuce', seed: 2.2, product: 'lettuce', family: 'daisy', group: 'salads', sow: {from: [3, 1], to: [8, 15]}, how: 'sow',
    base: 2, dd: {emerge: 60, mature: 620, picking: 200}, harvest: 'once', keeps: {plant: 0, kitchen: 7},
    kc: {ini: 0.7, mid: 1.0, end: 0.95}, p: 0.3, ky: 1.0, yield: 3.0, residue: 0.6, uptake: {n: 100, p: 15, k: 150}, harvestIndex: 0.8, frost: 'none', pick: 0.1,
    pests: ['slugs', 'aphids'],
  },
  beans: {
    id: 'beans', name: 'French beans', seed: 2.8, product: 'beans', family: 'legume', group: 'greens', sow: {from: [5, 15], to: [7, 15]}, how: 'sow',
    base: 8, dd: {emerge: 70, mature: 520, picking: 450}, harvest: 'repeat', first: 0, keeps: {plant: 5, kitchen: 5},
    kc: {ini: 0.5, mid: 1.05, end: 0.9}, p: 0.45, ky: 1.15, yield: 2.0, residue: 1.0, uptake: {n: 40, p: 12, k: 60}, harvestIndex: 0.45, frost: 'plant', pick: 0.5,
    pests: ['slugs', 'aphids'], pollinated: 0.05,
  },
  potatoes: {
    id: 'potatoes', name: 'Potatoes', seed: 4.5, product: 'potatoes', family: 'solanum', group: 'potatoes', sow: {from: [3, 15], to: [5, 15]}, how: 'plant',
    base: 5, dd: {emerge: 180, mature: 800, picking: 700}, harvest: 'once', keeps: {plant: 0, kitchen: 60},
    kc: {ini: 0.5, mid: 1.15, end: 0.75}, p: 0.35, ky: 1.1, yield: 3.5, residue: 1.0, uptake: {n: 160, p: 25, k: 220}, harvestIndex: 0.75, frost: 'tops', pick: 0.1,
    pests: ['slugs', 'blight'],
  },
  tomatoes: {
    id: 'tomatoes', name: 'Tomatoes', seed: 6, product: 'tomatoes', family: 'solanum', group: 'tomatoes', sow: {from: [5, 20], to: [6, 30]}, how: 'plant',
    base: 10, dd: {emerge: 0, mature: 560, picking: 550}, harvest: 'repeat', first: 0, keeps: {plant: 7, kitchen: 7},
    kc: {ini: 0.6, mid: 1.15, end: 0.8}, p: 0.4, ky: 1.05, yield: 4.0, residue: 1.5, uptake: {n: 150, p: 25, k: 250}, harvestIndex: 0.6, frost: 'plant', pick: 0.15,
    pests: ['aphids', 'blight'], pollinated: 0.05,
  },
  kale: {
    id: 'kale', name: 'Kale', seed: 2.2, product: 'kale', family: 'brassica', group: 'greens', sow: {from: [4, 1], to: [6, 30]}, how: 'sow',
    base: 4, dd: {emerge: 80, mature: 900, picking: 1300}, harvest: 'repeat', first: 0.1, keeps: {plant: 30, kitchen: 5},
    kc: {ini: 0.7, mid: 1.05, end: 0.95}, p: 0.45, ky: 1.0, yield: 2.5, residue: 1.0, uptake: {n: 150, p: 20, k: 150}, harvestIndex: 0.5, frost: 'none', pick: 0.4,
    pests: ['slugs'],
  },
  leeks: {
    id: 'leeks', name: 'Leeks', seed: 4.5, product: 'leeks', family: 'allium', group: 'greens', sow: {from: [6, 1], to: [7, 31]}, how: 'plant',
    base: 3, dd: {emerge: 0, mature: 1100, picking: 1000}, harvest: 'repeat', first: 0.1, keeps: {plant: 40, kitchen: 10},
    kc: {ini: 0.7, mid: 1.0, end: 0.95}, p: 0.3, ky: 1.1, yield: 3.0, residue: 0.5, uptake: {n: 130, p: 18, k: 140}, harvestIndex: 0.7, frost: 'none', pick: 0.15,
    pests: ['slugs'],
  },
  marigolds: {
    id: 'marigolds', name: 'French marigolds', seed: 4, product: 'marigolds', family: 'daisy', flower: true, sow: {from: [5, 20], to: [6, 30]}, how: 'plant',
    base: 8, dd: {emerge: 0, mature: 250, picking: 1100}, harvest: 'repeat', first: 0, keeps: {plant: 0, kitchen: 1},
    kc: {ini: 0.6, mid: 0.9, end: 0.8}, p: 0.5, ky: 1.0, yield: 0, residue: 0.8, uptake: {n: 40, p: 8, k: 50}, harvestIndex: 0, frost: 'plant', pick: 0,
    pests: ['slugs'],
  },
  'winter-salad': {
    id: 'winter-salad', name: 'Winter salad leaves', seed: 2.5, product: 'winter-salad', family: 'brassica', group: 'salads', winter: true, sow: {from: [8, 15], to: [10, 15]}, how: 'sow',
    base: 0, dd: {emerge: 70, mature: 420, picking: 1100}, harvest: 'repeat', first: 0.2, keeps: {plant: 12, kitchen: 5},
    kc: {ini: 0.7, mid: 0.95, end: 0.9}, p: 0.3, ky: 1.0, yield: 1.4, residue: 0.3, uptake: {n: 70, p: 10, k: 80}, harvestIndex: 0.75, frost: 'none', pick: 0.5,
    pests: ['slugs'],
  },
  'broad-beans': {
    id: 'broad-beans', name: 'Broad beans', seed: 3, product: 'broad-beans', family: 'legume', group: 'greens', winter: true, sow: {from: [10, 15], to: [11, 30]}, how: 'sow',
    base: 0, dd: {emerge: 150, mature: 1250, picking: 350}, harvest: 'repeat', first: 0, keeps: {plant: 6, kitchen: 5},
    kc: {ini: 0.5, mid: 1.15, end: 1.1}, p: 0.45, ky: 1.15, yield: 1.6, residue: 1.2, uptake: {n: 20, p: 15, k: 70}, harvestIndex: 0.4, frost: 'none', pick: 0.4,
    pests: ['slugs', 'aphids'], pollinated: 0.05,
  },
  garlic: {
    id: 'garlic', name: 'Garlic', seed: 5, product: 'garlic', family: 'allium', group: 'greens', winter: true, sow: {from: [10, 1], to: [12, 15]}, how: 'plant',
    base: 1, dd: {emerge: 160, mature: 1750, picking: 200}, harvest: 'once', keeps: {plant: 0, kitchen: 180},
    kc: {ini: 0.7, mid: 1.0, end: 0.7}, p: 0.3, ky: 1.1, yield: 1.1, residue: 0.3, uptake: {n: 100, p: 15, k: 90}, harvestIndex: 0.7, frost: 'none', pick: 0.2,
    pests: ['slugs'],
  },
  onions: {
    id: 'onions', name: 'Overwintering onions', seed: 2.5, product: 'onions', family: 'allium', group: 'greens', winter: true, sow: {from: [9, 15], to: [10, 31]}, how: 'plant',
    base: 1, dd: {emerge: 120, mature: 1700, picking: 200}, harvest: 'once', keeps: {plant: 0, kitchen: 150},
    kc: {ini: 0.7, mid: 1.05, end: 0.75}, p: 0.3, ky: 1.1, yield: 2.2, residue: 0.3, uptake: {n: 110, p: 20, k: 120}, harvestIndex: 0.75, frost: 'none', pick: 0.1,
    pests: ['slugs'],
  },
  'green-manure': {
    id: 'green-manure', name: 'Green manure (rye and vetch)', seed: 4, product: 'green-manure', family: 'cover', winter: true, dugIn: true, sow: {from: [8, 15], to: [10, 31]}, how: 'sow',
    base: 1, dd: {emerge: 60, mature: 900, picking: 400}, harvest: 'once', keeps: {plant: 0, kitchen: 1},
    kc: {ini: 0.6, mid: 1.0, end: 0.9}, p: 0.5, ky: 1.0, yield: 0, residue: 2.5, uptake: {n: 90, p: 10, k: 70}, harvestIndex: 0, frost: 'none', pick: 0,
    pests: [],
  },
};

/** kg of nitrogen, phosphorus and potassium in a kg of fresh vegetables: what the kitchen's scraps carry to the heap. */
export const PRODUCE = {n: 0.0025, p: 0.0003, k: 0.003} as const;

export const CROP_IDS = Object.keys(CROPS) as CropId[];
/** The flowers the plan can put in a bed or along its edge. */
export const FLOWER_IDS = CROP_IDS.filter((c) => CROPS[c].flower);
/** The crops a bed's winter line offers: sown in autumn when the summer plan has nothing in season. */
export const WINTER_IDS = CROP_IDS.filter((c) => CROPS[c].winter);

/** The family rotation the gardener follows when a bed's plan says so: beans, then brassicas, then potatoes and
 *  tomatoes, then lettuce, and round again (RHS, "Crop rotation"). */
export const ROTATION: readonly Family[] = ['legume', 'brassica', 'solanum', 'daisy'];
/** The rotation's step a family takes: onions, garlic and leeks go with the legumes; a green manure isn't in it. */
export const STEP_OF: Partial<Record<Family, Family>> = {legume: 'legume', allium: 'legume', brassica: 'brassica', solanum: 'solanum', daisy: 'daisy'};

/**
 * How fast crops develop against the real degree days: 1, the real pace. The owner chose a head start (#11) over a
 * faster pace for the spec's first harvest in the first week: a bed of overwintered salad leaves (src/sim/state.ts).
 */
export const GROWTH_PACE = 1;

/** What a cover does for a bed, by cover: the degrees of frost it keeps off, and the days it moves a sowing season earlier
 *  in spring and later in autumn (the cold frame, src/data/shed.ts). */
export const COVERS: Record<string, {frost: number; days: number}> = {'cold-frame': {frost: 3, days: 21}};
