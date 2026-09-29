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
  carryCheck, emptyHistory, eventFactor, eventKgLost, eventValueLost, healthFactor, healthIndex, inflateTarget, layoutKey, record, reliability,
  sampleOf, sealedSystem, sealedTick, sealNode, showEvent, stepUpStatus, sumTotals, tickDays, wildlifeIndex, windowTotals,
  type GameEvent, type LadderTotals, type Sample, type SealedNode,
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
  it('takes the last full year of a garden, sampled weekly: means, output-weighted quality, reliability, and health at the end', () => {
    let h = emptyHistory(1);
    expect(h).toMatchObject({sampleDays: 7, cap: 52}); // the garden's year: 52 weeks from the first day
    const week = {upkeep: qty(3.5, 'GBP'), carbon: qty(-1.4, 'kgCO2e')};
    for (let d = 0; d < 65; d++) h = record(h, sample(d < 12 ? 700 : 14, {...week, quality: d < 12 ? 10 : 70, health: {soil: d, water: 50}}), {crops: 12, grass: 57});
    expect(h.samples).toHaveLength(52); // the first thirteen weeks, and their odd figures, have dropped out
    const w = windowTotals(h)!;
    expect(w.full).toBe(true);
    expect(w.days).toBe(364);
    expect(w.totals.output).toBeCloseTo(2, 6);
    expect(w.totals.quality).toBeCloseTo(70, 6);
    expect(w.totals.reliability).toBe(100);
    expect(w.totals.upkeep).toBeCloseTo(0.5, 6);
    expect(w.totals.carbon).toBeCloseTo(-0.2, 6);
    expect(w.totals.health).toBeCloseTo(healthIndex({soil: 64, water: 50}), 6);
    expect(w.totals.land).toEqual({crops: 12, grass: 57});
    // a ring of a year is small: a garden's fifty-three weeks of about thirty numbers, in JSON (see docs/systems/ladder.md)
    expect(JSON.stringify(h).length).toBeLessThan(30_000);
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
    expect(t).toMatchObject({tolerance: 0.05, windowDays: 364, events: [EVENT]});
    expect(inflateTarget(totals(), 2).windowDays).toBe(365);
    let h = emptyHistory(1);
    for (let d = 0; d < 53; d++) h = record(h, sample(14, {health: {soil: 60}}), {crops: 9, grass: 60});
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
  const cycle = (o: number, r: number, hp: number, full = true) => ({totals: totals({output: o, reliability: r, health: hp}), days: full ? 371 : 100, full});

  it('is the spec\'s proposal as data', () => {
    expect(STEP_UP[1]).toEqual({from: 1, output: 0.25, reliability: 35, health: 50});
  });

  // the rules' own shape, apart from the garden's figures (src/data/ladder-rules.ts): the spec's first proposal
  const RULES = {from: 1, output: 1.5, reliability: 60, health: 50};
  it('is ready when all three are met over a full cycle, at the edges too', () => {
    expect(stepUpStatus(cycle(1.5, 60, 50), RULES).ready).toBe(true);
    expect(stepUpStatus(cycle(1.49, 60, 50), RULES).ready).toBe(false);
    expect(stepUpStatus(cycle(1.5, 59.9, 50), RULES).ready).toBe(false);
    expect(stepUpStatus(cycle(1.5, 60, 49.9), RULES).ready).toBe(false);
    expect(stepUpStatus(cycle(3, 90, 80), RULES).binding).toBeNull();
  });

  it('names the requirement furthest from its target, first', () => {
    expect(stepUpStatus(cycle(0.5, 70, 60), RULES).binding?.key).toBe('output');
    expect(stepUpStatus(cycle(2, 30, 60), RULES).binding?.key).toBe('reliability');
    expect(stepUpStatus(cycle(2, 70, 20), RULES).binding?.key).toBe('health');
    const s = stepUpStatus(cycle(1.2, 45, 45), RULES); // shortfalls 20 %, 25 %, 10 %
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
    expect(early.days).toBe(100);
    expect(early.windowDays).toBe(364);
    const none = stepUpStatus(null);
    expect(none.ready).toBe(false);
    expect(none.binding).not.toBeNull();
  });
});

describe('what a level carries beside the five numbers (#29 Q2, Q3, Q6)', () => {
  const MIX = {potatoes: 1, salads: 0.5, tomatoes: 0.3, greens: 0.2};
  const daily = (over: Partial<Sample> = {}) => sampleOf(MIX, {quality: 70, upkeep: qty(0.5, 'GBP'), carbon: qty(-0.2, 'kgCO2e'), health: {soil: 60}, ...over});

  it('records demand and hours in the ring beside the five numbers, and takes them per day', () => {
    let h = emptyHistory(3);
    for (let d = 0; d < 10; d++) h = record(h, daily({demand: {kg: {potatoes: 2, salads: 1}, spend: 8}, hours: {had: 12, used: 9}}));
    const t = windowTotals(h)!.totals;
    expect(t.demand).toEqual({kg: {potatoes: 2, salads: 1}, spend: 8});
    expect(t.hours).toEqual({had: 12, used: 9});
    // a level that records none carries none
    expect(windowTotals(record(emptyHistory(3), daily()))!.totals.demand).toBeUndefined();
    // and a week's sample spreads over its seven days
    const w = record(emptyHistory(1), daily({demand: {kg: {potatoes: 14}, spend: 35}, hours: {had: 28, used: 14}}));
    expect(windowTotals(w)!.totals).toMatchObject({demand: {kg: {potatoes: 2}, spend: 5}, hours: {had: 4, used: 2}});
  });

  it('carries Output by product group, the headline Output their sum', () => {
    let h = emptyHistory(3);
    for (let d = 0; d < 20; d++) h = record(h, daily());
    const t = windowTotals(h)!.totals;
    for (const [g, kg] of Object.entries(MIX)) expect(t.outputByGroup![g as keyof typeof MIX]).toBeCloseTo(kg, 9);
    expect(Object.values(t.outputByGroup!).reduce((a, b) => a + b, 0)).toBeCloseTo(t.output, 9);
  });

  it('keeps the mix through a sealed tick: the groups add up to the delivered kg and the lost kg, and the loss has a price', () => {
    const t = windowTotals(record(emptyHistory(3), daily()))!.totals;
    const node = {...sealNode(t, 0), events: [{...EVENT, homeLevel: 3, size: 0.5, from: 0, days: 10}]};
    const r = sealedTick({...node, totals: {...node.totals, reliability: 100}}, 240, rng(1), {potatoes: 1, salads: 3, tomatoes: 3.5, greens: 2.6});
    const sum = (g: Record<string, number | undefined>) => Object.values(g).reduce<number>((a, b) => a + (b ?? 0), 0);
    expect(sum(r.byGroup)).toBeCloseTo(r.output, 9);
    expect(sum(r.lostByGroup)).toBeCloseTo(r.lost, 9);
    expect(r.byGroup.potatoes! / r.output).toBeCloseTo(0.5, 9); // potatoes are half of the 2 kg a day
    expect(r.lost).toBeCloseTo(0.5 * 2 * 10, 6);
    // £: half of the loss is potatoes at £1, a quarter salads at £3, and so on
    expect(r.lostGBP).toBeCloseTo(r.lostByGroup.potatoes! * 1 + r.lostByGroup.salads! * 3 + r.lostByGroup.tomatoes! * 3.5 + r.lostByGroup.greens! * 2.6, 9);
    expect(sealedTick(node, 240, rng(1), 2).lostGBP).toBeCloseTo(2 * sealedTick(node, 240, rng(1)).lost, 9);
    expect(sealedTick(node, 240, rng(1)).lostGBP).toBe(0);
    // a node sealed without a mix has none to keep
    expect(sealedTick(sealNode(totals(), 0), 24, rng(1)).byGroup).toEqual({});
  });

  it('puts a money loss beside an event’s kg lost, the same at every level', () => {
    const at = (level: number, o: number) => {
      const shown = showEvent(EVENT, level, {node: 2, region: 200 * o})!;
      return {kg: eventKgLost(shown, level >= 3 ? 200 * o : 2), gbp: eventValueLost(shown, level >= 3 ? 200 * o : 2, 2.5)};
    };
    const home = at(1, 1), tile = at(2, 1), region = at(3, 1);
    expect(home.kg).toBeCloseTo(0.2 * 2 * 10, 9);
    expect(tile.kg).toBeCloseTo(home.kg, 9);
    expect(region.gbp).toBeCloseTo(region.kg * 2.5, 9);
    expect(home.gbp).toBeCloseTo(0.2 * 2 * 10 * 2.5, 9);
  });

  it('counts wildlife in Health, from flowers, hedges and margins, and leaves a level without it alone', () => {
    expect(wildlifeIndex({flowers: 100, hedges: 100, margins: 100})).toBe(100);
    expect(wildlifeIndex({})).toBe(0);
    expect(wildlifeIndex({hedges: 80})).toBe(80); // the parts a level has share the weight
    expect(wildlifeIndex({flowers: 100, hedges: 0, margins: 0})).toBeCloseTo(40, 9);
    const base = {soil: 60, water: 60};
    expect(healthIndex(base)).toBeCloseTo(60, 9); // no wildlife part, no change
    expect(healthIndex({...base, wildlife: 100})).toBeGreaterThan(healthIndex(base));
    expect(healthIndex({...base, wildlife: 20})).toBeLessThan(healthIndex(base));
    const h = record(emptyHistory(1), daily({health: {soil: 60, wildlife: wildlifeIndex({flowers: 90, hedges: 70, margins: 50})}}));
    expect(windowTotals(h)!.totals.health).toBeCloseTo(healthIndex({soil: 60, wildlife: 74}), 9);
  });

  it('must be rebuilt with its mix, group by group', () => {
    const sealed: LadderTotals = {...totals(), outputByGroup: {potatoes: 1, salads: 1}};
    expect(carryCheck(sealed, {...sealed}).ok).toBe(true);
    const off = carryCheck(sealed, {...sealed, outputByGroup: {potatoes: 1.5, salads: 0.5}});
    expect(off.ok).toBe(false);
    expect(off.off.map((o) => o.key)).toEqual(['group.potatoes', 'group.salads']);
  });
});

describe('summing sealed children into a parent', () => {
  // twelve plots, each a little different
  const plot = (i: number): LadderTotals => ({
    ...totals({output: 1 + i / 10, quality: 60 + i, reliability: 70 + i, upkeep: 0.4 + i / 100, health: 40 + 2 * i, freshness: 3 + i, carbon: -0.1 * i, land: {crops: 10 + i, grass: 5}}),
    outputByGroup: {potatoes: 0.5 + i / 20, salads: 0.5 + i / 20},
    demand: {kg: {potatoes: 0.4, greens: 0.1}, spend: 1.5},
    hours: {had: 2, used: 1 + i / 12},
  });
  const plots = Array.from({length: 12}, (_, i) => plot(i));
  const sumOfKey = (k: 'output' | 'upkeep' | 'carbon') => plots.reduce((s, p) => s + p[k], 0);

  it('adds Output, demand and hours by group, and upkeep, carbon and land', () => {
    const p = sumTotals(plots.map((totals) => ({totals})));
    expect(p.output).toBeCloseTo(sumOfKey('output'), 9);
    expect(p.upkeep).toBeCloseTo(sumOfKey('upkeep'), 9);
    expect(p.carbon).toBeCloseTo(sumOfKey('carbon'), 9);
    expect(p.land).toEqual({crops: plots.reduce((s, x) => s + x.land.crops!, 0), grass: 60});
    expect(p.outputByGroup!.potatoes).toBeCloseTo(plots.reduce((s, x) => s + x.outputByGroup!.potatoes!, 0), 9);
    expect(p.outputByGroup!.potatoes! + p.outputByGroup!.salads!).toBeCloseTo(p.output, 9); // the groups still sum to the headline
    expect(p.demand).toMatchObject({kg: {potatoes: 4.8, greens: 1.2}, spend: 18});
    expect(p.hours!.had).toBe(24);
    expect(p.hours!.used).toBeCloseTo(plots.reduce((s, x) => s + x.hours!.used, 0), 9);
  });

  it('weights Quality, Freshness and Health by output', () => {
    const p = sumTotals(plots.map((totals) => ({totals})));
    const w = (k: 'quality' | 'freshness' | 'health') => plots.reduce((s, x) => s + x[k] * x.output, 0) / sumOfKey('output');
    expect(p.quality).toBeCloseTo(w('quality'), 9);
    expect(p.freshness).toBeCloseTo(w('freshness'), 9);
    expect(p.health).toBeCloseTo(w('health'), 9);
    // a big plot in poor health drags the parent's Health toward its own
    const big = sumTotals([{totals: totals({output: 9, health: 20})}, {totals: totals({output: 1, health: 100})}]);
    expect(big.health).toBeCloseTo(28, 9);
  });

  it('takes Reliability from the summed series when the children bring theirs, and from their spreads when not', () => {
    // two children swinging against each other cancel out: the parent is steady where each is lumpy
    const up = [3, 1, 3, 1, 3, 1, 3, 1], down = [1, 3, 1, 3, 1, 3, 1, 3];
    const c = (series: number[]) => ({totals: totals({output: 2, reliability: reliability(series)}), series});
    const lumpy = reliability(up), together = sumTotals([c(up), c(down)]).reliability;
    expect(lumpy).toBeLessThan(60);
    expect(together).toBe(100);
    expect(together).toBeCloseTo(reliability(up.map((x, i) => x + down[i]!)), 9);
    // without series, many independent children are steadier together (a spread of 1/√n of each one's)
    const cvOne = (100 - 60) / 100, n = 100;
    const parent = sumTotals(Array.from({length: n}, () => ({totals: totals({output: 2, reliability: 60})})));
    expect(parent.reliability).toBeCloseTo(100 * (1 - cvOne / Math.sqrt(n)), 6);
    expect(parent.reliability).toBeGreaterThan(60);
    expect(sumTotals([{totals: totals({output: 2, reliability: 60})}]).reliability).toBeCloseTo(60, 9); // one child is itself
  });

  it('is empty for no children, and a sealed parent of them delivers the sum, kg for kg', () => {
    expect(sumTotals([])).toEqual(emptyTotals());
    const parent = sumTotals(plots.map((totals) => ({totals: {...totals, reliability: 100}})));
    const day = sealedTick(sealNode({...parent, reliability: 100}, 0), 24, rng(1));
    expect(day.output).toBeCloseTo(parent.output * healthFactor(parent.health), 6);
    expect(Object.values(day.byGroup).reduce<number>((a, b) => a + (b ?? 0), 0)).toBeCloseTo(day.output, 9);
  });
});
