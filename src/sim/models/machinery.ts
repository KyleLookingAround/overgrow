// Machinery: a second-hand tractor's fuel and hours by operation against hand work, its breakdowns (a hazard rising with
// its age and the hours since it was serviced, drawn from a passed Rng), what repairs and services cost, and the soil
// compaction its wheels leave on wet ground, which takes structure off the soil and so yield. docs/systems/machinery.md
// says how it works and what the wiring part adds.
//
// Sources: typical UK contractor rates and farm energy audits (Nix Farm Management Pocketbook; AHDB and Carbon Trust
//   audits) for litres and hours a hectare; ASABE D497 (2011) for repair costs rising as (hours/1000)²; a Weibull-style
//   wear-out hazard, rising with age and with the hours since the last service; Håkansson & Reeder (1994), "Subsoil
//   compaction by vehicles with high axle load", and AHDB and Defra soil guidance for wet ground taking the damage
//   (the load a soil carries falls sharply once it is at field capacity) and lasting for years.
// Simplifies: one tractor and one implement per operation (no horsepower to implement matching, no ballast or tyre
//   pressure, no autosteer); breakdowns are single events with a random bill and one to three days down, drawn per job;
//   the wheel load is the tractor's whole weight over a 3 tonne reference, not a true axle load; compaction is one number for the whole plough layer, kept as points of structure lost and recovering by one
//   half-life, with no subsoil, no deep loosening and no crop-root repair; a broken job finishes a random share of its
//   hectares before it stops.
//   Fast effect: a lost day (or three) at harvest when it breaks down, and the litres and hours a job takes. Slow effect:
//   a field compacted by wheelings on wet ground, losing structure and yield for years.
import {COMPACTION, HAZARD, OPERATIONS, REPAIR, USED_TRACTOR, type Operation} from '../../data/machinery';
import type {System, TickContext} from '../clock';
import {qty, type GraphNode} from '../graph';
import type {Rng} from '../random';
import {burn} from './energy';
import {limitsOf} from './soil';

/** The lever a node keeps its tractor in, and the lever a field keeps its compaction in (points of structure lost, 0–100). */
export const TRACTOR = 'tractor';
export const COMPACTION_LEVER = 'compaction';

/** A tractor's state: what the hazard and the bills read, and the days left before it works again. */
export interface Tractor {
  ageYears: number;
  /** Hours worked in its life, and since it was last serviced. */
  hours: number;
  hoursSinceService: number;
  /** Days it is down for; 0 when it works. */
  downDays: number;
  weightT: number;
  listPrice: number;
}

/** The second-hand tractor the smallholding buys first. */
export const usedTractor = (): Tractor => ({ageYears: USED_TRACTOR.ageYears, hours: USED_TRACTOR.hours, hoursSinceService: USED_TRACTOR.hoursSinceService, downDays: 0, weightT: USED_TRACTOR.weightT, listPrice: USED_TRACTOR.listPrice});

// ---- what a job takes ----

export interface Job {
  hours: number;
  litres: number;
}

/** The tractor's hours and diesel for an operation over some hectares. */
export const jobOf = (op: Operation, hectares: number): Job => ({hours: OPERATIONS[op].hours * hectares, litres: OPERATIONS[op].litres * hectares});
/** The hours the same work takes by hand. */
export const handHours = (op: Operation, hectares: number) => OPERATIONS[op].handHours * hectares;

// ---- breakdowns ----

/** The chance a working hour ends in a breakdown: rises with age, and with the square of the hours since the last service. */
export function hazardPerHour(t: Pick<Tractor, 'ageYears' | 'hoursSinceService'>) {
  return HAZARD.base * (1 + t.ageYears / HAZARD.ageScale) * (1 + (t.hoursSinceService / HAZARD.serviceEvery) ** 2);
}
/** The chance some hours of work include a breakdown. */
export const breakdownChance = (t: Pick<Tractor, 'ageYears' | 'hoursSinceService'>, hours: number) => 1 - Math.exp(-hazardPerHour(t) * hours);

/** What a breakdown costs, £, for a draw in [0, 1): the average bill, more for an old machine, and spread from 0.4 to 1.6 times. */
export const repairCost = (t: Pick<Tractor, 'ageYears'>, u: number) => REPAIR.meanCost * (1 + t.ageYears / 10) * (0.4 + 1.2 * u);

/** ASABE D497's expected repair spend for an hour at this age of machine, £: the derivative of list price × RF1 × (hours/1000)^RF2. */
export const expectedRepairPerHour = (t: Pick<Tractor, 'hours' | 'listPrice'>) => (t.listPrice * REPAIR.rf1 * REPAIR.rf2 * (t.hours / 1000) ** (REPAIR.rf2 - 1)) / 1000;

export interface Outcome {
  /** The tractor after the job. */
  tractor: Tractor;
  /** The hectares done: all of them, or the share done before it broke. */
  hectares: number;
  hours: number;
  litres: number;
  /** £ of repairs, and the days down, when it broke; else 0. */
  repair: number;
  days: number;
  broke: boolean;
}

/**
 * Works a tractor through an operation over some hectares. It may break down (a draw from the Rng): then only a random
 * share of the hectares is done, the repair bill comes due and it is down for one to three days; the rest waits.
 */
export function work(t: Tractor, op: Operation, hectares: number, rng: Rng): Outcome {
  const full = jobOf(op, hectares), broke = t.downDays <= 0 && rng.next() < breakdownChance(t, full.hours);
  const share = broke ? rng.next() : 1, hours = full.hours * share;
  const repair = broke ? repairCost(t, rng.next()) : 0, days = broke ? 1 + Math.floor(rng.next() * REPAIR.downDays) : 0;
  return {
    tractor: {...t, hours: t.hours + hours, hoursSinceService: t.hoursSinceService + hours, downDays: days || t.downDays},
    hectares: hectares * share, hours, litres: full.litres * share, repair, days, broke,
  };
}

/** A service: the hours since it was serviced go back to nothing. */
export const serviced = (t: Tractor): Tractor => ({...t, hoursSinceService: 0});

// ---- compaction ----

/** The ground's wetness as the risk of damage from wheels, `dryShare` (dry ground carries the load) to 1 (at or over field capacity); `wetness` is water over field capacity. */
export function wheelRisk(wetness: number) {
  const {dry, dryShare} = COMPACTION;
  if (wetness >= 1) return 1;
  if (wetness <= dry) return dryShare;
  return dryShare + (1 - dryShare) * ((wetness - dry) / (1 - dry));
}

/** Compaction (points of structure lost, 0–100) after passes over a field (a share of a pass counts too): the wheel share, axle load and wetness set the size, and less is left to lose as it fills. */
export function wheelings(compaction: number, op: Operation, tractorT: number, wetness: number, passes = 1) {
  const size = COMPACTION.perPass * OPERATIONS[op].wheeled * (tractorT / COMPACTION.refAxleT) * wheelRisk(wetness);
  return Math.min(100, compaction + size * passes * (1 - compaction / 100));
}

/** Compaction after some days: freeze and thaw, roots and worms loosen it, half in about five years. */
export const recovered = (compaction: number, days: number) => compaction * 0.5 ** (days / 365 / COMPACTION.halfLifeYears);

/** A soil's structure (0–100, from the soil model) less the compaction on it. */
export const compactedStructure = (structure: number, compaction: number) => structure * (1 - Math.min(100, Math.max(0, compaction)) / 100);

/** The share of yield a field keeps, 1 uncompacted. */
export const yieldFactor = (compaction: number) => 1 - COMPACTION.yieldLoss * (Math.min(100, Math.max(0, compaction)) / 100);

/** A field's water over its field capacity, from the soil model's limits: 1 and over is wet enough to damage. */
export function wetnessOf(field: GraphNode) {
  const fc = limitsOf(field).fc;
  return fc > 0 ? (field.stocks.water?.amount ?? 0) / fc : 0;
}

/** The compaction a field holds. */
export const compactionOf = (n: GraphNode) => (typeof n.levers[COMPACTION_LEVER] === 'number' ? (n.levers[COMPACTION_LEVER] as number) : 0);
/** The tractor a node keeps, if any. */
export const tractorOf = (n: GraphNode) => (n.levers[TRACTOR] as unknown as Tractor | undefined) ?? null;

// ---- on the graph ----

const pay = (c: TickContext, payer: string | undefined, what: string, gbp: number) => {
  if (payer && gbp > 1e-9 && c.graph.nodes[payer]?.stocks.money) c.flow({what, unit: 'GBP', amount: qty(gbp, 'GBP'), from: {node: payer, stock: 'money'}, to: {boundary: 'bought'}});
};

/**
 * A tractor works an operation over hectares of a field: its diesel is burnt at the tractor's node (fuel and carbon as
 * flows, the energy model's), the wheels compact the field (a lever, replaced), the tractor's wear and any breakdown are
 * kept on its lever, and a repair bill is paid. Returns what happened, or null if the tractor is down or missing.
 */
export function operate(c: TickContext, tractorNode: GraphNode, field: GraphNode, op: Operation, hectares: number, payer?: string): Outcome | null {
  const t = tractorOf(tractorNode);
  if (!t || t.downDays > 0 || hectares <= 0) return null;
  const wetness = wetnessOf(field), o = work(t, op, hectares, c.rng);
  burn(c, tractorNode.id, 'diesel', o.litres, OPERATIONS[op].name.toLowerCase(), payer);
  pay(c, payer, 'repair', o.repair);
  tractorNode.levers[TRACTOR] = o.tractor as unknown as GraphNode['levers'][string];
  const share = hectares > 0 ? o.hectares / hectares : 0;
  field.levers[COMPACTION_LEVER] = wheelings(compactionOf(field), op, t.weightT, wetness, share);
  return o;
}

/** Services a tractor: its cost is paid and the hours since service go back to nothing. */
export function service(c: TickContext, tractorNode: GraphNode, payer?: string): boolean {
  const t = tractorOf(tractorNode);
  if (!t) return false;
  pay(c, payer, 'service', REPAIR.serviceCost);
  tractorNode.levers[TRACTOR] = serviced(t) as unknown as GraphNode['levers'][string];
  return true;
}

/** The machinery system: each day compaction fades and a broken tractor is a day nearer mended. Not yet listed in src/sim/systems.ts (part 13 does). */
export const machinery: System = {
  name: 'machinery',
  on: {
    day(c) {
      const days = Math.max(1, c.dt / 24);
      for (const n of Object.values(c.graph.nodes)) {
        const comp = compactionOf(n);
        if (comp > 0) n.levers[COMPACTION_LEVER] = recovered(comp, days);
        const t = tractorOf(n);
        if (t && t.downDays > 0) n.levers[TRACTOR] = {...t, downDays: Math.max(0, t.downDays - days)} as unknown as GraphNode['levers'][string];
      }
    },
  },
};
