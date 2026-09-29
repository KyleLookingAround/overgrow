// The carry-over rule's tests: Reliability from a series; the five numbers over a window; a sealed node keeping its Output
// with a spread that matches its Reliability, Health below 50 costing a percent a point, and Health drifting slowly; an
// event's kg lost the same at every level, including a duration rounded up to a tick; inflating's 5 % and its layout
// key; and the step-up offer naming what holds the player back.
import {describe, expect, it} from 'vitest';
import {STEP_UP} from '../data/ladder-rules';
import {applyFlow, emptyTotals, qty, type Flow, type Totals} from './graph';
import {rng} from './random';
import {gardenGraph} from './state';
import {
  carryCheck, emptyHistory, eventFactor, eventKgLost, healthFactor, healthIndex, inflateTarget, layoutKey, record, reliability, sealedSystem,
  sealedTick, sealNode, showEvent, stepUpStatus, tickDays, windowTotals, type GameEvent, type Sample, type SealedNode,
} from './ladder';

const sample = (output: number, extra: Partial<Sample> = {}): Sample => ({
  output: qty(output, 'kgFood'), quality: 70, upkeep: qty(0.5, 'GBP'), carbon: qty(-0.2, 'kgCO2e'), health: {soil: 60, water: 60}, ...extra,
});
const totals = (t: Partial<Totals> = {}): Totals => ({...emptyTotals(), output: 2, quality: 70, reliability: 80, upkeep: 0.5, health: 60, carbon: -0.2, land: {crops: 9, grass: 60}, ...t});
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const cvOf = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
};
const EVENT: GameEvent = {id: 'e1', kind: 'pests', label: 'pest year', product: 'veg', place: 'the east', homeLevel: 1, size: 0.2, from: 0, days: 10};

function run(n: SealedNode, ticks: number, seed = 1, dayEach = 1) {
  const r = rng(seed), out: number[] = [];
  let node = n;
  for (let i = 1; i <= ticks; i++) {
    const t = sealedTick(node, node.at + dayEach * 24, r);
    out.push(t.output);
    node = t.node;
  }
  return {out, node};
}

describe('reliability', () => {
  it('is 100 for a steady series and lower for a lumpy one of the same mean', () => {
    const steady = Array(28).fill(2), lumpy = Array.from({length: 28}, (_, i) => (i % 7 === 0 ? 8 : 1));
    expect(mean(lumpy)).toBeCloseTo(2, 9);
    expect(reliability(steady)).toBe(100);
    expect(reliability(lumpy)).toBeLessThan(reliability(steady) - 30);
    expect(reliability([1, 3])).toBeCloseTo(50, 5); // cv 0.5
  });

  it('is clamped to 0–100, and 0 for nothing', () => {
    expect(reliability([0, 0, 0])).toBe(0);
    expect(reliability([])).toBe(0);
    expect(reliability([0, 0, 0, 0, 0, 0, 0, 0, 0, 30])).toBe(0);
  });
});

describe('the totals over a cycle', () => {
  it('takes the last 28 days of a garden: means, output-weighted quality, reliability, and health at the end', () => {
    let h = emptyHistory(1);
    expect(h.cap).toBe(28);
    for (let d = 0; d < 40; d++) h = record(h, sample(d < 12 ? 100 : 2, {quality: d < 12 ? 10 : 70, health: {soil: d, water: 50}}), {crops: 12, grass: 57});
    expect(h.samples).toHaveLength(28); // the first twelve, and their odd figures, have dropped out
    const w = windowTotals(h)!;
    expect(w.full).toBe(true);
    expect(w.days).toBe(28);
    expect(w.totals.output).toBeCloseTo(2, 6);
    expect(w.totals.quality).toBeCloseTo(70, 6);
    expect(w.totals.reliability).toBe(100);
    expect(w.totals.upkeep).toBeCloseTo(0.5, 6);
    expect(w.totals.carbon).toBeCloseTo(-0.2, 6);
    expect(w.totals.health).toBeCloseTo(healthIndex({soil: 39, water: 50}), 6);
    expect(w.totals.land).toEqual({crops: 12, grass: 57});
  });

  it('weights quality by output, is not full until the cycle is, and is null when empty', () => {
    let h = emptyHistory(1);
    expect(windowTotals(h)).toBeNull();
    h = record(record(h, sample(1, {quality: 100})), sample(3, {quality: 20}));
    const w = windowTotals(h)!;
    expect(w.full).toBe(false);
    expect(w.totals.quality).toBeCloseTo((100 + 60) / 4, 6);
  });

  it('gives Freshness from output-weighted shelf life, and takes a level that samples weekly per day', () => {
    let h = emptyHistory(7);
    expect(h.sampleDays).toBe(7);
    expect(h.cap).toBe(53); // a year of weeks, rounded up to whole samples
    h = record(record(h, sample(70, {freshness: 4})), sample(210, {freshness: 8}));
    const w = windowTotals(h)!;
    expect(w.totals.freshness).toBeCloseTo((4 * 70 + 8 * 210) / 280, 6);
    expect(w.totals.output).toBeCloseTo(280 / 14, 6);
    expect(w.days).toBe(14);
  });

  it('restates a weekly level\'s Reliability per day, so a sealed node ticking daily keeps the spread', () => {
    const r = rng(5), weekly: number[] = [];
    let h = emptyHistory(7);
    for (let i = 0; i < 53; i++) {
      let kg = 0;
      for (let d = 0; d < 7; d++) kg += 10 * Math.exp(0.5 * (r.next() + r.next() + r.next() - 1.5) * 2);
      weekly.push(kg);
      h = record(h, sample(kg));
    }
    const daily = windowTotals(h)!.totals.reliability, raw = reliability(weekly.map((x) => x / 7));
    expect(daily).toBeLessThan(raw);
    expect(100 - daily).toBeCloseTo((100 - raw) * Math.sqrt(7), 6);
  });

  it('keeps a small ring: a season of a garden is a few hundred numbers, not the level', () => {
    let h = emptyHistory(1);
    for (let d = 0; d < 200; d++) h = record(h, sample(2));
    expect(JSON.stringify(h).length).toBeLessThan(6000);
  });

  it('averages the Health parts a level has, and shares the missing ones out', () => {
    expect(healthIndex({soil: 80})).toBe(80);
    expect(healthIndex({soil: 80, water: 40, kit: 40, goodwill: 40, herd: 40})).toBeCloseTo(0.35 * 80 + 0.65 * 40, 6);
    expect(healthIndex({})).toBe(0);
  });
});

describe('a sealed node', () => {
  it('delivers its Output on average, whatever its Reliability, and the spread matches it', () => {
    for (const rel of [100, 80, 60, 30]) {
      const {out} = run(sealNode(totals({reliability: rel, health: 70}), 0), 40000, 3);
      expect(Math.abs(mean(out) / 2 - 1), `mean at reliability ${rel}`).toBeLessThan(0.01);
      expect(Math.abs(cvOf(out) - (100 - rel) / 100), `spread at reliability ${rel}`).toBeLessThan(0.02);
      expect(reliability(out), `reliability at ${rel}`).toBeGreaterThan(rel - 3);
      expect(reliability(out)).toBeLessThan(rel + 3);
    }
  });

  it('is steady at Reliability 100 and never negative at 0', () => {
    expect(new Set(run(sealNode(totals({reliability: 100}), 0), 20).out).size).toBe(1);
    expect(Math.min(...run(sealNode(totals({reliability: 0}), 0), 2000).out)).toBeGreaterThanOrEqual(0);
  });

  it('is the same on the same seed', () => {
    const a = run(sealNode(totals(), 0), 50, 9).out, b = run(sealNode(totals(), 0), 50, 9).out, c = run(sealNode(totals(), 0), 50, 10).out;
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('loses a percent of Output for each point of Health below 50, and gains nothing above', () => {
    const at = (health: number) => sealedTick(sealNode(totals({reliability: 100, health}), 0), 24, rng(1)).output;
    expect(at(50)).toBeCloseTo(2, 9);
    expect(at(80)).toBeCloseTo(2, 9);
    expect(at(40) / at(50)).toBeCloseTo(0.9, 9);
    expect(at(25) / at(50)).toBeCloseTo(0.75, 9);
    expect(healthFactor(0)).toBe(0.5);
  });

  it('drifts in Health toward the plan by at most a point a season, either way', () => {
    const up = run(sealNode(totals({reliability: 100, health: 60}), 0, {health: 90}), 365);
    expect(up.node.totals.health).toBeCloseTo(60 + 4, 1);
    const down = run(sealNode(totals({reliability: 100, health: 60}), 0, {health: 10}), 91);
    expect(down.node.totals.health).toBeCloseTo(59, 0);
    const near = run(sealNode(totals({reliability: 100, health: 60}), 0, {health: 60.4}), 365);
    expect(near.node.totals.health).toBeCloseTo(60.4, 9); // it stops at the plan
    const week = sealedTick(sealNode(totals({health: 60}), 0, {health: 90}), 7 * 24, rng(1)).node.totals.health;
    expect(week - 60).toBeCloseTo(7 / 91.25, 6);
  });

  it('pays upkeep, and its emissions and land follow the plan', () => {
    const n = sealNode(totals({upkeep: 0.5, carbon: -0.2}), 0, {carbon: 1.5, land: {crops: 30, grass: 39}});
    const t = sealedTick(n, 72, rng(1));
    expect(t.upkeep).toBeCloseTo(1.5, 9);
    expect(t.carbon).toBeCloseTo(4.5, 9);
    expect(t.node.totals.land).toEqual({crops: 30, grass: 39});
    expect(t.node.totals.carbon).toBe(1.5);
    expect(sealedTick(sealNode(totals({carbon: -0.2}), 0), 24, rng(1)).carbon).toBeCloseTo(-0.2, 9); // a sink stays a sink
  });

  it('changes nothing for a tick that has not moved on', () => {
    const n = sealNode(totals(), 100);
    const t = sealedTick(n, 100, rng(1));
    expect(t.output).toBe(0);
    expect(t.node).toBe(n);
  });

  it('lives on the graph: a system delivering food, upkeep and emissions as flows that balance', () => {
    const g = gardenGraph();
    const plot = g.nodes.shed!;
    plot.stocks.money = {unit: 'GBP', amount: qty(10, 'GBP')};
    plot.levers.sealed = sealNode(totals({reliability: 100, health: 70, carbon: 0.4}), 0) as never;
    const flows: Flow[] = [];
    const ctx = {tick: 'day', hours: 24, dt: 24, level: 2, graph: g, rng: rng(1), activity: () => {}, flow: (f: Flow) => {
      const bad = applyFlow(g, f);
      if (bad) throw new Error(bad);
      flows.push(f);
      return null;
    }};
    sealedSystem.on.day!(ctx as never);
    const by = (what: string) => flows.filter((f) => f.what === what).reduce((s, f) => s + f.amount, 0);
    expect(by('harvest')).toBeCloseTo(2, 9);
    expect(by('upkeep')).toBeCloseTo(0.5, 9);
    expect(by('emissions')).toBeCloseTo(0.4, 9);
    expect(plot.stocks.food!.amount).toBeCloseTo(2, 9);
    expect(plot.stocks.money!.amount).toBeCloseTo(9.5, 9);
    expect((plot.levers.sealed as unknown as SealedNode).at).toBe(24);
  });
});

describe('events across scales', () => {
  it('destroys the same kg whichever level shows it, at home, one up and two up, rounded up or not', () => {
    const output = 3.7;
    for (const home of [1, 2, 3, 4, 5, 6]) {
      for (const days of [0.01, 0.5, 3, 10, 40]) {
        const ev: GameEvent = {...EVENT, homeLevel: home, days, size: 0.2};
        const truth = ev.size * output * days;
        for (let up = 0; up <= 2; up++) {
          const level = home + up;
          if (level > 8) continue;
          const shown = showEvent(ev, level, {node: output, region: output * 40})!;
          const kg = eventKgLost(shown, up >= 2 ? output * 40 : output);
          expect(Math.abs(kg / truth - 1), `home ${home}, ${days} days, ${up} up`).toBeLessThan(0.05);
        }
      }
    }
  });

  it('rounds a duration shorter than a tick up to the tick, with the size scaled down', () => {
    const ev: GameEvent = {...EVENT, homeLevel: 5, days: 0.5, size: 0.3};
    const home = showEvent(ev, 5)!, up = showEvent(ev, 6)!;
    expect(tickDays(5)).toBe(1);
    expect(tickDays(6)).toBe(7);
    expect(home.days).toBe(1);
    expect(home.size).toBeCloseTo(0.15, 9);
    expect(up.days).toBe(7);
    expect(up.size).toBeCloseTo(0.3 * 0.5 / 7, 9);
    expect(eventKgLost(up, 10)).toBeCloseTo(eventKgLost(home, 10), 9);
    expect(eventKgLost(up, 10)).toBeCloseTo(0.3 * 10 * 0.5, 9);
  });

  it('is never shown below its home level, and shows three ways above it', () => {
    expect(showEvent({...EVENT, homeLevel: 3}, 2)).toBeNull();
    expect(showEvent({...EVENT, homeLevel: 3}, 1)).toBeNull();
    const thing = showEvent(EVENT, 1)!, tile = showEvent(EVENT, 2)!, region = showEvent(EVENT, 3, {node: 2, region: 40})!;
    expect(thing).toMatchObject({mode: 'thing', text: '', tint: ''});
    expect(tile).toMatchObject({mode: 'tile', text: 'Output −20 % for 10 days', tint: ''});
    expect(region).toMatchObject({mode: 'region', text: 'pest year in the east: veg −1 %', tint: 'pests'});
    expect(region.size).toBeCloseTo(0.2 * 2 / 40, 9);
    expect(showEvent({...EVENT, days: 0.2, homeLevel: 3}, 4)!.text).toBe('Output −4 % for 1 day');
  });

  it('is taken out of a sealed node the same: a partial tick loses its share, and the total is size × Output × days', () => {
    const ev: GameEvent = {...EVENT, size: 0.2, from: 30, days: 10.5};
    const n = sealNode(totals({reliability: 100, health: 70}), 0);
    n.events = [ev];
    const {out, node} = run(n, 30);
    const lost = out.reduce((s, x) => s + (2 - x), 0);
    expect(lost).toBeCloseTo(0.2 * 2 * 10.5, 6);
    expect(node.events).toHaveLength(0);
    expect(eventFactor([ev], 0, 24)).toBe(1);
    expect(eventFactor([ev], 36, 60)).toBeCloseTo(1 - 0.2, 9);
    expect(eventFactor([ev, {...ev, size: 0.5}], 36, 60)).toBeCloseTo(0.8 * 0.5, 9);
    expect(sealedTick({...n, events: [ev], at: 24}, 48, rng(1)).lost).toBeCloseTo(2 * (1 - eventFactor([ev], 24, 48)), 9);
  });
});

describe('inflating', () => {
  it('accepts a rebuilt first cycle within 5 % and names what is outside it', () => {
    const sealed = totals();
    const near = {...sealed, output: 2 * 1.049, upkeep: 0.5 * 0.96, quality: 70 * 1.04, land: {crops: 9.2, grass: 59}};
    expect(carryCheck(sealed, near).ok).toBe(true);
    const far = carryCheck(sealed, {...sealed, output: 2 * 1.06, health: 60 * 0.9, land: {crops: 9, grass: 60, path: 5}});
    expect(far.ok).toBe(false);
    expect(far.off.map((o) => o.key).sort()).toEqual(['health', 'land.path', 'output']);
  });

  it('holds a node with almost no carbon to a floor, not to 5 % of nothing', () => {
    expect(carryCheck(totals({carbon: 0.001}), totals({carbon: 0.003})).ok).toBe(true);
    expect(carryCheck(totals({carbon: 0.001}), totals({carbon: 0.5})).ok).toBe(false);
  });

  it('targets the sealed totals over the level\'s cycle, and a sealed then unsealed node passes its own test', () => {
    const t = inflateTarget(totals(), 1, [EVENT]);
    expect(t).toMatchObject({tolerance: 0.05, windowDays: 28, events: [EVENT]});
    expect(inflateTarget(totals(), 2).windowDays).toBeCloseTo(91.25, 6);
    let h = emptyHistory(1);
    for (let d = 0; d < 28; d++) h = record(h, sample(2, {health: {soil: 60}}), {crops: 9, grass: 60});
    const sealed = windowTotals(h)!.totals;
    expect(carryCheck(inflateTarget(sealed, 1).totals, windowTotals(h)!.totals).ok).toBe(true);
  });

  it('lays a node out the same every time: the same key for the same seed and node, different for others', () => {
    expect(layoutKey(7, 'plot-1')).toBe(layoutKey(7, 'plot-1'));
    expect(layoutKey(7, 'plot-1')).not.toBe(layoutKey(7, 'plot-2'));
    expect(layoutKey(7, 'plot-1')).not.toBe(layoutKey(8, 'plot-1'));
    expect(layoutKey(7, 'plot-1')).toBe(layoutKey(7, 'plot-1') >>> 0);
  });
});

describe('the step-up offer', () => {
  const cycle = (o: number, r: number, hp: number, full = true) => ({totals: totals({output: o, reliability: r, health: hp}), days: full ? 28 : 10, full});

  it('is the spec\'s proposal as data', () => {
    expect(STEP_UP[1]).toEqual({from: 1, output: 1.5, reliability: 60, health: 50});
  });

  it('is ready when all three are met over a full cycle, at the edges too', () => {
    expect(stepUpStatus(cycle(1.5, 60, 50)).ready).toBe(true);
    expect(stepUpStatus(cycle(1.49, 60, 50)).ready).toBe(false);
    expect(stepUpStatus(cycle(1.5, 59.9, 50)).ready).toBe(false);
    expect(stepUpStatus(cycle(1.5, 60, 49.9)).ready).toBe(false);
    expect(stepUpStatus(cycle(3, 90, 80)).binding).toBeNull();
  });

  it('names the requirement furthest from its target, first', () => {
    expect(stepUpStatus(cycle(0.5, 70, 60)).binding?.key).toBe('output');
    expect(stepUpStatus(cycle(2, 30, 60)).binding?.key).toBe('reliability');
    expect(stepUpStatus(cycle(2, 70, 20)).binding?.key).toBe('health');
    const s = stepUpStatus(cycle(1.2, 45, 45)); // shortfalls 20 %, 25 %, 10 %
    expect(s.requirements.map((r) => r.key)).toEqual(['reliability', 'output', 'health']);
    expect(s.binding).toMatchObject({key: 'reliability', met: false});
    expect(s.binding!.shortfall).toBeCloseTo(0.25, 9);
    expect(s.requirements[0]!.hint).toMatch(/steadier/);
    expect(s.requirements.find((r) => r.key === 'output')!.progress).toBeCloseTo(0.8, 9);
  });

  it('waits for the whole cycle, and reads no history as nothing met', () => {
    const early = stepUpStatus(cycle(3, 90, 80, false));
    expect(early.ready).toBe(false);
    expect(early.binding).toBeNull();
    expect(early.days).toBe(10);
    expect(early.windowDays).toBe(28);
    const none = stepUpStatus(null);
    expect(none.ready).toBe(false);
    expect(none.binding).not.toBeNull();
  });
});
