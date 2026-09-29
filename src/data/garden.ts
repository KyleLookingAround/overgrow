// The back garden's layout: a UK back garden about 12 × 8 m behind the house, with six bed plots (two dug), a tap, a
// water butt, a compost heap, a shed, the lawn and the kitchen, and the paths and pipes between them. Positions are in
// metres from the top-left corner; land is each place's footprint, and the lawn (drawn under everything) is what's left. Part 3's gardener walks
// these edges; part 2's weather falls on these beds.
// Sizes: a raised bed of 2 × 1.5 m and a 200 L butt are the common garden-centre sizes (RHS, "Raised beds"; "Water
// butts"). Starting money is a placeholder the shed's prices (part 6) set against. The soils (src/data/soils.ts): the
// dug beds a loam improved by years of compost, the lawn and the plots under it the clay loam of the ground beneath.
// The shed's roof drains into the butt.
import type {SoilSpec} from './soils';

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

const DUG: SoilSpec = {texture: 'loam', organicMatter: 4.5}, UNDER_GRASS: SoilSpec = {texture: 'clay loam', organicMatter: 4};

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
];

/** The water butt: 200 L, half full on day 1. */
export const BUTT_LITRES = {cap: 200, start: 100};
/** The roof that fills the butt: the shed's, 2.25 × 1.75 m, of which about 85 % of the rain reaches the gutter (a
 *  pitched roof's runoff coefficient; the rest wets it, splashes and dries). */
export const ROOF = {place: 'shed', to: 'butt', m2: 2.25 * 1.75, runoff: 0.85};
/** Money in the household's purse on day 1, £. */
export const START_MONEY = 20;

/** The ways between places and what each carries: water by can or hose, food and scraps by hand. (Every place's carbon
 *  also has a way to the air, which the sim adds.) */
export const WAYS: readonly {from: string; to: string; carries: ('L' | 'kgFood' | 'kgWaste')[]}[] = [
  ...[1, 2, 3, 4, 5, 6].flatMap((i) => [
    {from: 'tap', to: `bed-${i}`, carries: ['L' as const]},
    {from: 'butt', to: `bed-${i}`, carries: ['L' as const]},
    {from: `bed-${i}`, to: 'kitchen', carries: ['kgFood' as const]},
    {from: `bed-${i}`, to: 'heap', carries: ['kgWaste' as const]},
  ]),
  {from: 'kitchen', to: 'heap', carries: ['kgWaste']},
  {from: 'lawn', to: 'heap', carries: ['kgWaste']},
];
