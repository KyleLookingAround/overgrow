// The purse's week (the playable garden, round three): what came into the household's purse this week and what the garden
// spent from it, and the last big spend, so the Shed can say where the money went. Kept as the kitchen's `purse` lever,
// which no command can set. Pay counts as what the job left after the weekly shop and the rest of life (the household
// model's three flows, src/sim/models/household.ts), and the honesty box's takings come in beside it; everything else the
// purse pays for (seed, beer, feed, jars, edging, compost, fleece, the catalogue, what the shed sells) is the garden's
// spending. commands.ts tallies each command's money flows here; each week the tally starts again.
import type {System} from './clock';
import {isBoundary, qty, type Flow, type Graph, type LeverValue} from './graph';
import {KITCHEN} from './models/kitchen';

export interface Purse {
  /** This week so far and last week, £: what came in, and what the garden spent. */
  now: {in: number; out: number};
  last: {in: number; out: number} | null;
  /** The last spend of BIG_SPEND or more in one go: what, £, and the game hour. */
  big: {what: string; gbp: number; hours: number} | null;
}

/** A spend this big in one go is the one the Shed names, £. */
export const BIG_SPEND = 20;
/** The household's own flows, netted into what the week's pay left for the purse. */
const PAY = new Set(['wages', 'the weekly shop', 'the rest of life']);

export const PURSE = 'purse';
export const newPurse = (): Purse => ({now: {in: 0, out: 0}, last: null, big: null});
export const purseOf = (g: Graph): Purse | null => (g.nodes[KITCHEN]?.levers[PURSE] as unknown as Purse | undefined) ?? null;

const intoPurse = (f: Flow) => !isBoundary(f.to) && f.to.node === KITCHEN && f.to.stock === 'money';
const fromPurse = (f: Flow) => !isBoundary(f.from) && f.from.node === KITCHEN && f.from.stock === 'money';

/** Adds a command's money flows to the week: pay and the box in, the garden's spending out; a big spend remembered. */
export function tally(g: Graph, flows: readonly Flow[], hours: number) {
  const had = purseOf(g);
  if (!had) return;
  let add = 0, out = 0, big = had.big;
  for (const f of flows) {
    if (f.unit !== 'GBP') continue;
    const inn = intoPurse(f), from = fromPurse(f);
    if (!inn && !from) continue;
    if (PAY.has(f.what)) add += inn ? f.amount : -f.amount;
    else if (inn) add += f.amount;
    else {
      out += f.amount;
      if (f.amount >= BIG_SPEND) big = {what: f.what, gbp: f.amount, hours};
    }
  }
  if (!add && !out && big === had.big) return;
  g.nodes[KITCHEN]!.levers[PURSE] = {...had, now: {in: had.now.in + add, out: had.now.out + out}, big} as unknown as LeverValue;
}

/** Notes a spend a command made directly (the catalogue's order, a roll of fleece): the purse before and after it. */
export function spent(g: Graph, what: string, before: number, hours: number) {
  const gbp = before - (g.nodes[KITCHEN]?.stocks.money?.amount ?? 0);
  if (gbp > 1e-9) tally(g, [{what, unit: 'GBP', amount: qty(gbp, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}}], hours);
}

export const purse: System = {
  name: 'purse',
  on: {
    // each week the tally starts again, last week's kept to show
    week(c) {
      const had = purseOf(c.graph);
      if (had) c.graph.nodes[KITCHEN]!.levers[PURSE] = {...had, now: {in: 0, out: 0}, last: had.now} as unknown as LeverValue;
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.lever === PURSE) return 'the purse’s week is kept, not set';
    return undefined;
  },
};
