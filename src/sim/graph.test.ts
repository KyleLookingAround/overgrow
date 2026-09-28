import {describe, expect, it} from 'vitest';
import {add, applyFlow, flowProblem, imbalance, landOf, makeGraph, mergeFlows, qty, stockTotals, type Flow} from './graph';
import {gardenGraph} from './state';

describe('graph', () => {
  it('keeps units apart in the types', () => {
    const water = qty(3, 'L'), n = qty(0.2, 'kgN');
    expect(add(water, qty(2, 'L'))).toBe(5);
    // @ts-expect-error litres and kg of nitrogen can't be added
    add(water, n);
  });

  it('gives every node carbon and land, and the garden its whole area', () => {
    const g = gardenGraph();
    for (const n of Object.values(g.nodes)) {
      expect(n.stocks.carbon?.unit, n.id).toBe('kgCO2e');
      expect(Object.keys(landOf(n)).length, n.id).toBeGreaterThan(0);
      expect(Object.keys(n.totals), n.id).toEqual(['output', 'quality', 'reliability', 'upkeep', 'health', 'freshness', 'carbon', 'land']);
    }
    expect(stockTotals(Object.values(g.nodes)).m2).toBeCloseTo(12 * 8);
    const beds = Object.values(g.nodes).filter((n) => n.kind === 'bed');
    expect(beds.map((b) => Object.keys(landOf(b))[0])).toEqual(['crops', 'crops', 'grass', 'grass', 'grass', 'grass']);
  });

  it('moves a flow out of one stock and into another, and balances', () => {
    const g = gardenGraph(), before = stockTotals(Object.values(g.nodes));
    const f: Flow = {what: 'watering', unit: 'L', amount: qty(10, 'L'), from: {node: 'butt', stock: 'water'}, to: {node: 'bed-1', stock: 'water'}};
    const rain: Flow = {what: 'rain', unit: 'L', amount: qty(4, 'L'), from: {boundary: 'rain'}, to: {node: 'butt', stock: 'water'}};
    expect(applyFlow(g, f)).toBeNull();
    expect(applyFlow(g, rain)).toBeNull();
    expect(g.nodes.butt!.stocks.water!.amount).toBe(94);
    expect(g.nodes['bed-1']!.stocks.water!.amount).toBe(10);
    expect(imbalance(before, stockTotals(Object.values(g.nodes)), [f, rain])).toEqual({});
    expect(imbalance(before, stockTotals(Object.values(g.nodes)), [f])).toEqual({L: 4});
  });

  it('refuses a flow with no edge, the wrong unit, a missing stock or a bad amount', () => {
    const g = gardenGraph(), to = {node: 'bed-1', stock: 'water'};
    expect(flowProblem(g, {what: 'x', unit: 'L', amount: qty(1, 'L'), from: {node: 'shed', stock: 'water'}, to})).toMatch(/no stock/);
    expect(flowProblem(g, {what: 'x', unit: 'GBP', amount: qty(1, 'GBP'), from: {node: 'kitchen', stock: 'money'}, to: {node: 'bed-1', stock: 'money'}})).toMatch(/no edge/);
    expect(flowProblem(g, {what: 'x', unit: 'kgN', amount: qty(1, 'kgN'), from: {node: 'butt', stock: 'water'}, to})).toMatch(/is in L/);
    expect(flowProblem(g, {what: 'x', unit: 'L', amount: qty(-1, 'L'), from: {node: 'butt', stock: 'water'}, to})).toMatch(/positive/);
    expect(flowProblem(g, {what: 'x', unit: 'L', amount: qty(1, 'L'), from: {boundary: 'rain'}, to: {boundary: 'drainage'}})).toMatch(/boundary/);
    const before = g.nodes.butt!.stocks.water!.amount;
    expect(applyFlow(g, {what: 'x', unit: 'L', amount: qty(NaN, 'L'), from: {node: 'butt', stock: 'water'}, to})).not.toBeNull();
    expect(g.nodes.butt!.stocks.water!.amount).toBe(before);
  });

  it('keeps food by product, and merges repeated flows', () => {
    const g = makeGraph([{id: 'a', kind: 'bed', name: 'A', land: {crops: 1}}, {id: 'b', kind: 'kitchen', name: 'B'}], [{id: 'e', from: 'a', to: 'b', carries: ['kgFood']}]);
    const pick = (p: string): Flow => ({what: 'pick', unit: 'kgFood', product: p, amount: qty(1, 'kgFood'), from: {boundary: 'bought'}, to: {node: 'a', stock: 'food.' + p}});
    applyFlow(g, pick('salad'));
    applyFlow(g, pick('beans'));
    expect(stockTotals(Object.values(g.nodes))).toMatchObject({'kgFood:salad': 1, 'kgFood:beans': 1});
    const wrong: Flow = {what: 'x', unit: 'kgFood', product: 'beans', amount: qty(1, 'kgFood'), from: {node: 'a', stock: 'food.salad'}, to: {node: 'b', stock: 'food.salad'}};
    expect(flowProblem(g, wrong)).toMatch(/holds salad/);
    expect(mergeFlows([pick('salad'), pick('salad'), pick('beans')]).map((f) => f.amount)).toEqual([2, 1]);
  });
});
