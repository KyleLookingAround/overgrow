// The `conservation` test: nothing appears from nowhere. Every tick of a long run, the change in the graph's stocks,
// unit by unit and product by product, equals what crossed its named boundaries, to rounding.
import {describe, expect, it} from 'vitest';
import {churn} from './churn';
import type {System} from './clock';
import {imbalance, stockTotals} from './graph';
import {createSim} from './index';
import {SYSTEMS} from './systems';

function everyTickBalances(systems: readonly System[], hours: number) {
  const sim = createSim(5, systems), bad: string[] = [];
  let before = stockTotals(sim.snapshot().nodes);
  for (let i = 0; i < hours; i++) {
    const s = sim.apply({type: 'tick', hours: 1}), after = stockTotals(s.nodes), off = imbalance(before, after, s.flows);
    if (Object.keys(off).length || s.errors.length) bad.push(`hour ${s.hours}: ${JSON.stringify(off)} ${s.errors.join('; ')}`);
    before = after;
  }
  return bad;
}

describe('conservation', () => {
  it("balances every tick of the game's own systems over two years", () => {
    expect(everyTickBalances(SYSTEMS, 24 * 365 * 2)).toEqual([]);
  });
  it('balances every tick of flows of every kind moving over two years', () => {
    expect(everyTickBalances([churn], 24 * 365 * 2)).toEqual([]);
  });
  it('catches a system that changes a stock without a flow', () => {
    const leak: System = {name: 'leak', on: {day: (c) => {
      const water = c.graph.nodes.butt!.stocks.water!;
      water.amount = (water.amount + 1) as typeof water.amount;
    }}};
    expect(everyTickBalances([churn, leak], 48).length).toBe(2);
  });
});
