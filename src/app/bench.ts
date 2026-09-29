// A check-only synthetic scene for measuring the speed budget (docs/SYSTEMS.md, "Speed budget"): a snapshot of n nodes
// shaped like the garden's, a tenth of them changing each hour, with n people walking between them on trips of two to
// eight hours, built in the worker so its copy across the worker boundary is measured like a real tick's. The game
// never shows it; the checks start it through window.__sim.bench().
import {qty} from '../sim/graph';
import type {Snapshot} from '../sim/state';
import {makeNode} from '../sim/graph';
import {rng} from '../sim/random';

/** n nodes and m people (n by default) at an hour. */
export function benchSnapshot(n: number, hours: number, m = n): Snapshot {
  const side = Math.ceil(Math.sqrt(n)), r = rng(12345);
  const nodes = Array.from({length: n}, (_, i) =>
    makeNode({
      id: `n${i}`, kind: 'bench', name: `Node ${i}`, box: {x: (i % side) * 3, y: Math.floor(i / side) * 3, w: 2, h: 1.5}, land: {crops: 3}, carbon: 10,
      stocks: {water: {unit: 'L', amount: qty(50 + (Math.floor((hours + i) / 10) % 50), 'L')}, 'food.salad': {unit: 'kgFood', amount: qty(1, 'kgFood'), product: 'salad'}},
    }));
  const activities = Array.from({length: m}, (_, i) => {
    const period = 2 + Math.floor(r.next() * 6), start = Math.floor(hours / period) * period, a = Math.floor(r.next() * n), b = Math.floor(r.next() * n);
    return {id: `m${i}-${start}`, who: `walker-${i}`, kind: 'person', doing: 'walk', from: `n${a}`, to: `n${b}`, start, end: start + period};
  });
  return {
    seed: 0, hours, level: 1, step: 1, speed: 1, money: 0, carbon: 0, rev: 1_000_000 + n, nodes, edges: [], flows: [], activities,
    kitchen: null, rejected: null, errors: [], effects: [], seen: [], settings: {},
  };
}
