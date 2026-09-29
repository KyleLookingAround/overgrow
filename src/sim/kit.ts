// The garden's kit: what's been bought from the shed (src/data/shed.ts), kept as the shed node's `kit` lever so every
// system reads it from the graph, and the saved state's `upgrades` lists it too. src/sim/shed.ts sells it and runs what
// it does each day; the gardener, the water, the heap and the crops read it here.
import type {UpgradeId} from '../data/shed';
import type {Graph, GraphNode, LeverValue} from './graph';

export const SHED = 'shed';

export interface Kit {
  /** What's been bought and kept. */
  owned: UpgradeId[];
  /** Days a pack of nematodes has left in the beds (0 when there are none). */
  nematodes: number;
  /** The beer traps went dry this week: the purse didn't have the beer. */
  dry: boolean;
}

export const NO_KIT: Kit = {owned: [], nematodes: 0, dry: false};
export const kitOf = (g: Graph): Kit => (g.nodes[SHED]?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;
export const owns = (g: Graph, id: UpgradeId) => kitOf(g).owned.includes(id);
export const setKit = (g: Graph, k: Partial<Kit>) => {
  const shed: GraphNode | undefined = g.nodes[SHED];
  if (shed) shed.levers.kit = {...kitOf(g), ...k} as unknown as LeverValue;
};
