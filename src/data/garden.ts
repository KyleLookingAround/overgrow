// The back garden's layout: a UK back garden about 12 × 8 m behind the house, with six bed plots (two dug), a tap, a
// water butt, a compost heap, a shed, the lawn, the kitchen and an honesty box by the side gate, and the paths and pipes
// between them. Positions are in
// metres from the top-left corner; land is each place's footprint, and the lawn (drawn under everything) is what's left. Part 3's gardener walks
// these edges; part 2's weather falls on these beds.
// Sizes: a raised bed of 2 × 1.5 m and a 200 L butt are the common garden-centre sizes (RHS, "Raised beds"; "Water
// butts"). Starting money is a placeholder the shed's prices (part 6) set against. The soils (src/data/soils.ts): the
// dug beds a loam improved by years of compost, the lawn and the plots under it the clay loam of the ground beneath,
// all of them a long-kept garden's, rich in phosphorus and potassium (RB209's index 4).
// The shed's roof drains into the butt.
import {GARDEN_K_MG_L, GARDEN_P_MG_L, type SoilSpec} from './soils';

export type GardenLand = 'crops' | 'grass' | 'built' | 'path';

export interface PlaceSpec {
  id: string;
  kind: string;
  name: string;
  box: {x: number; y: number; w: number; h: number};
  land: GardenLand;
  /** Bed plots only: dug and ready to sow, or still under grass. */
  dug?: boolean;
  /** The beds and the lawn: the soil the weather falls on (src/sim/models/soil.ts). */
  soil?: SoilSpec;
}

const FED = {p: GARDEN_P_MG_L, k: GARDEN_K_MG_L};
const DUG: SoilSpec = {texture: 'loam', organicMatter: 4.5, ...FED}, UNDER_GRASS: SoilSpec = {texture: 'clay loam', organicMatter: 4, ...FED};

export const GARDEN = {w: 12, h: 8};

const bed = (i: number, x: number, y: number, dug: boolean): PlaceSpec =>
  ({id: `bed-${i}`, kind: 'bed', name: `Bed ${i}`, box: {x, y, w: 2, h: 1.5}, land: dug ? 'crops' : 'grass', dug, soil: dug ? DUG : UNDER_GRASS});

export const PLACES: readonly PlaceSpec[] = [
  {id: 'lawn', kind: 'lawn', name: 'Lawn', box: {x: 0, y: 0, w: 12, h: 8}, land: 'grass', soil: UNDER_GRASS},
  {id: 'kitchen', kind: 'kitchen', name: 'Kitchen', box: {x: 0, y: 0, w: 12, h: 0.5}, land: 'built'},
  {id: 'path', kind: 'path', name: 'Path', box: {x: 0.6, y: 2.85, w: 7.4, h: 0.55}, land: 'path'},
  bed(1, 1, 1.2, true),
  bed(2, 3.5, 1.2, true),
  bed(3, 6, 1.2, false),
  bed(4, 1, 3.75, false),
  bed(5, 3.5, 3.75, false),
  bed(6, 6, 3.75, false),
  {id: 'shed', kind: 'shed', name: 'Shed', box: {x: 9, y: 1, w: 2.25, h: 1.75}, land: 'built'},
  {id: 'tap', kind: 'tap', name: 'Tap', box: {x: 7.85, y: 0.5, w: 0.3, h: 0.4}, land: 'built'},
  {id: 'butt', kind: 'butt', name: 'Water butt', box: {x: 8.1, y: 2.85, w: 0.75, h: 0.75}, land: 'built'},
  {id: 'heap', kind: 'heap', name: 'Compost heap', box: {x: 9.25, y: 6, w: 1.5, h: 1.1}, land: 'built'},
  {id: 'gate', kind: 'gate', name: 'Honesty box', box: {x: 0.1, y: 0.65, w: 0.55, h: 0.45}, land: 'built'},
];

/** Where the shed's big buys stand once bought, taken out of the lawn (hidden until then): the greenhouse on the sunny
 *  side by the shed, cropped like a bed; the hen house and its run, and the fruit cage, along the bottom of the garden.
 *  Each is a node added to the graph when it's bought (src/sim/shed.ts), its land moved from the lawn's grass. */
export const SITES = {
  greenhouse: {id: 'greenhouse', kind: 'bed', name: 'Greenhouse', box: {x: 9.2, y: 3.3, w: 2.4, h: 1.8}, land: 'crops'},
  hens: {id: 'hens', kind: 'hens', name: 'Hens', box: {x: 0.8, y: 5.75, w: 3.4, h: 2}, land: 'grass'},
  'fruit-cage': {id: 'fruit', kind: 'fruit', name: 'Fruit cage', box: {x: 4.8, y: 5.75, w: 3, h: 2}, land: 'crops'},
} as const satisfies Record<string, Omit<PlaceSpec, 'dug' | 'soil'>>;
/** The ways each site needs, as WAYS has them for the places there from the start. */
export const SITE_WAYS: Record<keyof typeof SITES, readonly {from: string; to: string; carries: ('L' | 'kgFood' | 'kgWaste' | 'kgCO2e' | 'kgN' | 'kgP' | 'kgK' | 'pests' | 'm2')[]}[]> = {
  greenhouse: [
    {from: 'tap', to: 'greenhouse', carries: ['L']},
    {from: 'butt', to: 'greenhouse', carries: ['L']},
    {from: 'greenhouse', to: 'kitchen', carries: ['kgFood']},
    {from: 'greenhouse', to: 'heap', carries: ['kgWaste', 'kgCO2e', 'kgN', 'kgP', 'kgK']},
    {from: 'lawn', to: 'greenhouse', carries: ['m2', 'pests', 'L', 'kgCO2e', 'kgN', 'kgP', 'kgK']},
  ],
  hens: [
    {from: 'tap', to: 'hens', carries: ['L']},
    {from: 'hens', to: 'kitchen', carries: ['kgFood']},
    {from: 'hens', to: 'heap', carries: ['kgWaste', 'kgCO2e', 'kgN']},
    {from: 'lawn', to: 'hens', carries: ['m2']},
  ],
  'fruit-cage': [
    {from: 'fruit', to: 'kitchen', carries: ['kgFood']},
    {from: 'lawn', to: 'fruit', carries: ['m2']},
  ],
};

/** The water butt: 200 L, half full on day 1. */
export const BUTT_LITRES = {cap: 200, start: 100};
/** The roof that fills the butt: the shed's, 2.25 × 1.75 m, of which about 85 % of the rain reaches the gutter (a
 *  pitched roof's runoff coefficient; the rest wets it, splashes and dries). */
export const ROOF = {place: 'shed', to: 'butt', m2: 2.25 * 1.75, runoff: 0.85};
/** Money in the household's purse on day 1, £. */
export const START_MONEY = 20;
/** Digging a bed out of the lawn: £ a m² for edging boards to hold the lawn back (a 2 × 1.5 m bed's seven metres of
 *  treated board and its pegs, about £27), and bagged compost forked in (RHS, "Digging": 5–10 kg a m² of organic matter
 *  into new ground; a 50 L bag of peat-free soil improver, about 20 kg, costs about £6.50), with what a kg of it carries
 *  (WRAP's PAS 100 green compost: about 60 % dry matter, a third of that organic matter, about 1 % N, 0.2 % P and 0.6 %
 *  K of the fresh weight, rough). Then the flush of CO₂ from the soil's organic matter that turning it over exposes, kg
 *  CO₂e a m² (mouldboard tillage releases about 30 g CO₂ a m² in the weeks after; Reicosky & Lindstrom 1993, "Fall
 *  tillage method: effect on short-term carbon dioxide flux from soil"). The slower loss, bare dug ground's organic
 *  matter decaying faster than grass's for years, is the soil model's. A bed costs about £37 and most of a week's spare
 *  hours (src/data/jobs.ts). */
export const DIG = {edgingPerM2: 9, compostKgPerM2: 10, compostGbpPerKg: 0.33, flushPerM2: 0.03};
/** A kg of bagged compost: kg CO₂e of carbon in it (0.6 × 0.35 organic matter, 58 % carbon), and kg of N, P and K. */
export const BAGGED = {co2e: 0.6 * 0.35 * 0.58 * (44 / 12), n: 0.01, p: 0.002, k: 0.006};
/** £ a m² of digging: its edging and its compost. */
export const digCost = (m2: number) => m2 * (DIG.edgingPerM2 + DIG.compostKgPerM2 * DIG.compostGbpPerKg);

/** The ways between places and what each carries: water by can or hose, food and scraps by hand, and waste to the heap
 *  and compost back to the beds with their carbon, nitrogen, phosphorus and potassium. (Every place's carbon also has a
 *  way to the air, which the sim adds.) */
export const WAYS: readonly {from: string; to: string; carries: ('L' | 'kgFood' | 'kgWaste' | 'kgCO2e' | 'kgN' | 'kgP' | 'kgK')[]}[] = [
  ...[1, 2, 3, 4, 5, 6].flatMap((i) => [
    {from: 'tap', to: `bed-${i}`, carries: ['L' as const]},
    {from: 'butt', to: `bed-${i}`, carries: ['L' as const]},
    {from: `bed-${i}`, to: 'kitchen', carries: ['kgFood' as const]},
    {from: `bed-${i}`, to: 'heap', carries: ['kgWaste' as const, 'kgCO2e' as const, 'kgN' as const, 'kgP' as const, 'kgK' as const]},
  ]),
  {from: 'kitchen', to: 'heap', carries: ['kgWaste']},
  {from: 'kitchen', to: 'gate', carries: ['kgFood']},
  {from: 'lawn', to: 'heap', carries: ['kgWaste']},
];
