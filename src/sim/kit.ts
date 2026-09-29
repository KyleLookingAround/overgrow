// The garden's kit: what's been bought from the shed (src/data/shed.ts), kept as the shed node's `kit` lever so every
// system reads it from the graph, and the saved state's `upgrades` lists it too. src/sim/shed.ts sells it and runs what
// it does each day; the gardener, the water, the heap and the crops read it here.
import {CATALOGUE, CHIT, type UpgradeId, type Variety} from '../data/shed';
import type {Graph, GraphNode, LeverValue} from './graph';

export const SHED = 'shed';

export interface Kit {
  /** What's been bought and kept. */
  owned: UpgradeId[];
  /** Days a pack of nematodes has left in the beds (0 when there are none). */
  nematodes: number;
  /** The beer traps went dry this week: the purse didn't have the beer. */
  dry: boolean;
  /** The winter catalogue's order: the garden year it's seed for, and the variety (src/data/shed.ts's CATALOGUE). */
  seeds: {year: number; variety: Variety} | null;
  /** A roll of fleece, bought the first frost it was needed for. */
  fleece: boolean;
  /** The game hour the seed potatoes were set out to chit, or null. */
  chitted: number | null;
}

export const NO_KIT: Kit = {owned: [], nematodes: 0, dry: false, seeds: null, fleece: false, chitted: null};
/** Degree days of a head start a potato planted now has from its chitting (none unchitted, or chitted too long ago). */
export const chitStart = (g: Graph, crop: string, hours: number) => {
  const t = kitOf(g).chitted;
  return crop === 'potatoes' && t !== null && hours - t <= CHIT.days * 24 ? CHIT.dd : 0;
};
export const kitOf = (g: Graph): Kit => (g.nodes[SHED]?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;
export const owns = (g: Graph, id: UpgradeId) => kitOf(g).owned.includes(id);
export const setKit = (g: Graph, k: Partial<Kit>) => {
  const shed: GraphNode | undefined = g.nodes[SHED];
  if (shed) shed.levers.kit = {...kitOf(g), ...k} as unknown as LeverValue;
};

/** The share of blight's start and spread a crop's variety lets through this garden year: a third for the resistant
 *  potatoes and tomatoes the catalogue sold, all of it otherwise. */
export function resistance(g: Graph, crop: string, year: number): number {
  const seeds = kitOf(g).seeds;
  return seeds?.year === year && seeds.variety === 'resistant' && CATALOGUE.crops.includes(crop) ? CATALOGUE.resists : 1;
}
