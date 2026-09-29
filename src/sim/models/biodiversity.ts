// Biodiversity: the flowers in the garden and the wildlife they bring. French marigolds in a bed, or a border of them
// along a bed's edge, bring bees and hoverflies to the pollinated crops (beans and tomatoes set a little more) and
// ladybirds to the aphids (the pest model, src/sim/models/pests.ts, has them eat); a spray knocks both back for a while.
// The garden's wildlife is the lawn's `wildlife` lever, a border its bed's `border` lever, and the plan's choice of
// border its `edge` lever. The neighbour's cat is here too: it strolls across the lawn on dry days and does nothing to
// the game. docs/systems/biodiversity.md says how it works.
//
// Sources: Klein et al. (2007), "Importance of pollinators in changing landscapes for world crops", Proc. R. Soc. B 274,
//   for how much of a crop's yield depends on pollinators (French beans and tomatoes "little", 0–10 %); Garibaldi et al.
//   (2013), "Wild pollinators enhance fruit set of crops regardless of honey bee abundance", Science 339, for yield rising
//   with visits until every flower is visited; Corbet et al. (1993) for bees flying from about 10 °C and staying in on
//   wet days; Dixon (2000), "Insect predator-prey dynamics", for ladybirds gathering where aphids are and feeding on
//   pollen and nectar between; UK agri-environment evidence on flower strips raising natural enemies and pollinators
//   (Wood et al. 2015, "Farm-scale evidence for pollinator and natural enemy habitat", and the Natural England
//   evidence reviews); RHS "Companion planting" for marigolds among vegetables; the Wildlife Trusts' "How to build a bee
//   hotel" for red mason bees nesting in hollow stems from April to June (the shed's bee hotel adds a few).
// Simplifies: one pool of bees and one of ladybirds for the garden, following a target set by the flowers in bloom, the
//   warmth, the rain and (for ladybirds) the aphids, with no breeding of their own; every flower the same to a bee;
//   visits share out evenly over the pollinated crops; a border costs the bed nothing; a border is killed by a frost
//   read as the grass at dawn; the cat hunts nothing.
//   Fast effect: bees over the beans on a warm day, and ladybirds turning up where the aphids are. Slow effect: a garden
//   with flowers every summer keeping its aphids down and its pods set, year after year.
import {CROPS, FLOWER_IDS, type CropId} from '../../data/crops';
import {BEES, BORDER, FULL_FLOWERS, LADYBIRDS_ABOUT, RECOVER} from '../../data/flowers';
import type {System, TickContext} from '../clock';
import {note} from '../effects';
import type {Graph, GraphNode, LeverValue} from '../graph';
import {hourOf, weatherOf} from './weather';
import {HOTEL} from '../../data/shed';
import {owns} from '../kit';

/** The garden's wildlife: the lawn's `wildlife` lever, replaced, never changed in place. */
export interface Wildlife {
  /** Bees about at midday, and the share of the pollinated crops' flowers they visit, 0–1. */
  bees: number;
  visits: number;
  /** Ladybirds about the garden. */
  ladybirds: number;
  /** A spray's knock still on each, as the share left (1: none). */
  knock: {bees: number; ladybirds: number};
  /** The neighbour's cat, out on a dry day: 1, or 0. */
  cat: number;
}

/** A border of flowers along a bed's edge: its bed's `border` lever. */
export interface Border {
  id: CropId;
  /** Game hours it was planted, and degree days above its base since. */
  planted: number;
  dd: number;
}

const LAWN = 'lawn';
export const NO_WILDLIFE: Wildlife = {bees: 0, visits: 0, ladybirds: 0, knock: {bees: 1, ladybirds: 1}, cat: 0};
export const wildlifeOf = (g: Graph): Wildlife => (g.nodes[LAWN]?.levers.wildlife as unknown as Wildlife | undefined) ?? NO_WILDLIFE;
export const borderOf = (n: GraphNode): Border | null => (n.levers.border as unknown as Border | null | undefined) ?? null;

/** The levers the model declares: every bed's border and the plan's choice of it, and the lawn's wildlife. */
export const BED_FLOWER_LEVERS = (): Record<string, LeverValue> => ({edge: 'none', border: null});
export const LAWN_LEVERS = (): Record<string, LeverValue> => ({wildlife: {...NO_WILDLIFE, knock: {...NO_WILDLIFE.knock}} as unknown as LeverValue});

/** Whether a border is in flower. */
export const inFlower = (b: Border) => {
  const c = CROPS[b.id];
  return b.dd >= c.dd.mature && b.dd < c.dd.mature + c.dd.picking;
};

/** m² of flowers in bloom on a bed: a bed of flowers past its first flowering, and its border. */
export function bloomOn(n: GraphNode): number {
  let m2 = 0;
  const crop = n.levers.crop as {id?: CropId; dd?: number; dead?: boolean} | null | undefined;
  const c = crop?.id ? CROPS[crop.id] : undefined;
  if (c?.flower && !crop!.dead && (crop!.dd ?? 0) >= c.dd.mature) m2 += (n.stocks['land.crops']?.amount ?? 0);
  const b = borderOf(n);
  if (b && inFlower(b)) m2 += BORDER.m2;
  return m2;
}

/** m² of flowers in bloom in the garden. */
export const bloom = (g: Graph) => Object.values(g.nodes).reduce((s, n) => s + (n.kind === 'bed' ? bloomOn(n) : 0), 0);

/** A pollinated crop's yield factor at today's visits: 1 − D × (1 − visits), for Klein's dependence D. */
export const pollination = (g: Graph, dependence: number) => 1 - dependence * (1 - wildlifeOf(g).visits);

/** Plants a border along a bed's edge: the gardener calls it when the job's done. */
export function plantBorder(n: GraphNode, id: CropId, hours: number) {
  n.levers.border = {id, planted: hours, dd: 0} as unknown as LeverValue;
}

/** A spray's knock to the bees and ladybirds: each multiplied by a share left. */
export function knock(g: Graph, k: {bees?: number; ladybirds?: number}) {
  const lawn = g.nodes[LAWN], w = wildlifeOf(g);
  if (!lawn || !('wildlife' in lawn.levers)) return;
  const bees = k.bees ?? 1, ladybirds = k.ladybirds ?? 1;
  lawn.levers.wildlife = {
    ...w, bees: w.bees * bees, visits: w.visits * bees, ladybirds: w.ladybirds * ladybirds,
    knock: {bees: w.knock.bees * bees, ladybirds: w.knock.ladybirds * ladybirds},
  } as unknown as LeverValue;
}

/** All the aphids in the garden. */
const aphidsIn = (g: Graph) => Object.values(g.nodes).reduce((s, n) => s + Math.max(0, n.stocks['pests.aphids']?.amount ?? 0), 0);

function day(c: TickContext) {
  const g = c.graph, w = weatherOf(g), lawn = g.nodes[LAWN];
  if (!w || !lawn || !('wildlife' in lawn.levers)) return;
  const days = w.step ?? [w], mean = days.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / days.length;
  const wet = days.filter((d) => d.wet).length / days.length, month = c.date.month;
  // borders grow by degree days, flower, and die in a frost or once they're over
  for (const n of Object.values(g.nodes)) {
    const b = n.kind === 'bed' ? borderOf(n) : null;
    if (!b) continue;
    const spec = CROPS[b.id], frost = days.some((d) => hourOf(d, 12 - d.length / 2).ground < 0);
    const dd = b.dd + days.reduce((s, d) => s + Math.max(0, (d.tmax + d.tmin) / 2 - spec.base), 0);
    n.levers.border = frost || dd >= spec.dd.mature + spec.dd.picking ? null : ({...b, dd} as unknown as LeverValue);
  }
  const flowers = bloom(g), share = Math.min(1, flowers / FULL_FLOWERS);
  for (const n of Object.values(g.nodes)) {
    const m2 = n.kind === 'bed' ? bloomOn(n) : 0;
    if (m2 > 0) note(c, 'flowers', n.id, m2, 'm2');
  }
  // the pools follow their targets; a spray's knock wears off
  const was = wildlifeOf(g), k = {bees: was.knock.bees + (1 - was.knock.bees) * RECOVER, ladybirds: was.knock.ladybirds + (1 - was.knock.ladybirds) * RECOVER};
  const beeSeason = mean >= BEES.minMean && BEES.months.includes(month);
  // a bee hotel's mason bees fly from April to June
  const hotel = owns(g, 'bee-hotel') && HOTEL.months.includes(month) ? HOTEL.bees : 0;
  const beesWant = beeSeason ? (BEES.base + hotel + BEES.flowers * share) * (1 - (1 - BEES.wet) * wet) * k.bees : 0;
  const bees = was.bees + (beesWant - was.bees) * BEES.follow;
  const lbWant = mean >= LADYBIRDS_ABOUT.minMean
    ? (LADYBIRDS_ABOUT.base + LADYBIRDS_ABOUT.flowers * share) * (0.4 + 0.6 * Math.min(1, aphidsIn(g) / LADYBIRDS_ABOUT.aphidsFull)) * k.ladybirds : 0;
  const ladybirds = was.ladybirds + (lbWant - was.ladybirds) * LADYBIRDS_ABOUT.follow;
  const next: Wildlife = {bees, visits: Math.min(1, bees / BEES.full), ladybirds, knock: k, cat: wet < 0.5 ? 1 : 0};
  lawn.levers.wildlife = next as unknown as LeverValue;
}

export const biodiversity: System = {
  name: 'biodiversity',
  on: {day},
  command(cmd, g) {
    if (cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law') return undefined;
    const n = g.nodes[cmd.node];
    if (cmd.lever === 'wildlife' && n?.id === LAWN) return 'the wildlife comes and goes as it will';
    if (n?.kind !== 'bed') return undefined;
    if (cmd.lever === 'border') return 'the border is the garden’s, not the plan’s';
    if (cmd.lever !== 'edge') return undefined;
    if (cmd.type !== 'plan') return 'what’s planted is the plan’s';
    return cmd.value === 'none' || (typeof cmd.value === 'string' && (FLOWER_IDS as string[]).includes(cmd.value)) ? null : `no flowers ${String(cmd.value)}`;
  },
};
