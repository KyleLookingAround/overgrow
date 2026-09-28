// A test-only system that moves random flows of every kind across the garden each hour and starts an activity each
// day, so the conservation, save and long-run tests exercise the graph before the real models arrive (parts 2 and 3).
// The game never lists it in src/sim/systems.ts.
import type {System} from './clock';
import {qty} from './graph';
import {ATMOSPHERE} from './state';

export const churn: System = {
  name: 'churn',
  on: {
    hour(c) {
      const r = c.rng, g = c.graph, bed = `bed-${1 + Math.floor(r.next() * 6)}`;
      const butt = g.nodes.butt!.stocks.water!, grass = g.nodes['bed-3']!.stocks['land.grass'];
      c.flow({what: 'rain', unit: 'L', amount: qty(r.next() * 5, 'L'), from: {boundary: 'rain'}, to: {node: 'butt', stock: 'water'}});
      c.flow({what: 'watering', unit: 'L', amount: qty(Math.min(butt.amount, r.next() * 4), 'L'), from: {node: 'butt', stock: 'water'}, to: {node: bed, stock: 'water'}});
      c.flow({what: 'tap', unit: 'L', amount: qty(r.next() * 2, 'L'), from: {boundary: 'mains'}, to: {node: bed, stock: 'water'}});
      const wet = g.nodes[bed]!.stocks.water?.amount ?? 0;
      c.flow({what: 'evapotranspiration', unit: 'L', amount: qty(wet * r.next() * 0.5, 'L'), from: {node: bed, stock: 'water'}, to: {boundary: 'evapotranspiration'}});
      c.flow({what: 'respiration', unit: 'kgCO2e', amount: qty(r.next() * 0.01, 'kgCO2e'), from: {node: bed, stock: 'carbon'}, to: {node: ATMOSPHERE, stock: 'carbon'}});
      c.flow({what: 'bought', unit: 'kgFood', product: 'salad', amount: qty(r.next() * 0.1, 'kgFood'), from: {boundary: 'bought'}, to: {node: bed, stock: 'food.salad'}});
      const salad = g.nodes[bed]!.stocks['food.salad']?.amount ?? 0;
      c.flow({what: 'picking', unit: 'kgFood', product: 'salad', amount: qty(salad * r.next(), 'kgFood'), from: {node: bed, stock: 'food.salad'}, to: {node: 'kitchen', stock: 'food.salad'}});
      const kitchen = g.nodes.kitchen!.stocks['food.salad']?.amount ?? 0;
      if (kitchen) c.flow({what: 'eating', unit: 'kgFood', product: 'salad', amount: qty(kitchen * r.next(), 'kgFood'), from: {node: 'kitchen', stock: 'food.salad'}, to: {boundary: 'eaten'}});
      c.flow({what: 'spending', unit: 'GBP', amount: qty(r.next() * 0.01, 'GBP'), from: {node: 'kitchen', stock: 'money'}, to: {boundary: 'bought'}});
      if (grass && grass.amount > 0.01) c.flow({what: 'digging', unit: 'm2', amount: qty(Math.min(grass.amount, r.next() * 0.01), 'm2'), from: {node: 'bed-3', stock: 'land.grass'}, to: {node: 'bed-3', stock: 'land.crops'}});
    },
    day(c) {
      const to = `bed-${1 + Math.floor(c.rng.next() * 6)}`;
      c.activity({id: `walk-${c.hours}`, who: 'gardener', kind: 'person', doing: 'walk', from: 'shed', to, via: ['path'], start: c.hours + 8, end: c.hours + 8.5});
    },
  },
};
