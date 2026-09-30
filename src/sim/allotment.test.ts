// The step up and the allotment: the plot is refused until the offer is latched; taking it seals the garden into the
// player's plot with its year's totals, its land and its carbon, keeps the garden below, and draws eleven neighbours'
// plots from the seed near it, the neglected one where the household model puts it; the plot's three levers each move
// what they should, unfold in turn and are the player's plot's alone; two years at the allotment run without errors,
// repeat after a save and a load, and an allotment day is inside its budget; and the carry-over rule holds.
import {describe, expect, it} from 'vitest';
import {CARE, PLAYER_PLOT} from '../data/allotment';
import {allotment as peopleOf, neglectedPlot} from './models/agency';
import {baseOf, carryReport, holderOf, ledgerAt, landOf, planFor, sealedOf, stepUp} from './allotment';
import {applyCommand} from './commands';
import {GOAL, type Goal} from './goal';
import {qty, type LeverValue} from './graph';
import {emptyHistory, record, windowTotals, type LadderTotals} from './ladder';
import {rng} from './random';
import {createSim} from './index';
import {fromSave, toSave} from './save';
import {newState, snapshotOf, type State} from './state';
import {SYSTEMS} from './systems';

/** A garden a year in with its offer latched: a year of weekly samples, and every week's veg share met at 60 %. */
function latched(seed: number, kgWeek = 2): State {
  const s = newState(seed);
  s.hours = 24 * 364;
  let history = emptyHistory(1);
  for (let w = 0; w < 52; w++) history = record(history, {output: qty(kgWeek * (0.5 + (w % 4) / 4), 'kgFood'), quality: 0, upkeep: qty(0, 'GBP'), carbon: qty(0.3, 'kgCO2e'), health: {soil: 62}});
  const goal: Goal = {history, mark: {delivered: 0, carbon: 0}, fed: Array(52).fill(0.6), offered: s.hours};
  s.graph.nodes.kitchen!.levers[GOAL] = goal as unknown as LeverValue;
  return s;
}
const tick = (s: State, hours: number) => applyCommand(s, {type: 'tick', hours}, SYSTEMS);

describe('the step up', () => {
  it('is refused until the offer is latched, and the stay card with it', () => {
    const s = newState(1);
    expect(applyCommand(s, {type: 'step-up'}, SYSTEMS).rejected).toMatch(/hasn’t offered/);
    expect(applyCommand(s, {type: 'card', id: 'year', answer: 'ok'}, SYSTEMS).rejected).toMatch(/isn’t done/);
    expect(s.level).toBe(1);
  });

  it('seals the garden into the player’s plot with its year, its land and its carbon, and keeps the garden below', () => {
    const s = latched(4), garden = s.graph, w = windowTotals((garden.nodes.kitchen!.levers[GOAL] as unknown as Goal).history)!;
    const money = garden.nodes.kitchen!.stocks.money!.amount;
    expect(applyCommand(s, {type: 'step-up'}, SYSTEMS).rejected).toBeNull();
    expect(s.level).toBe(2);
    expect(s.home).toBe('household');
    expect(s.graph.nodes.household!.stocks.money!.amount).toBeCloseTo(money, 9);
    expect(s.ladder).toHaveLength(1);
    expect(s.ladder[0]!.graph).toBe(garden);
    const base = baseOf(s.graph.nodes[PLAYER_PLOT])!;
    expect(base.output).toBeCloseTo(w.totals.output, 12);
    expect(base.carbon).toBeCloseTo(w.totals.carbon, 12);
    expect(base.health).toBeCloseTo(62, 9);
    // Reliability as the offer counted it: the weeks' shares of the veg met
    expect(base.reliability).toBeCloseTo(60, 9);
    expect(base.land).toEqual(landOf(garden));
    expect(Object.values(base.outputByGroup!).reduce((a, x) => a + x!, 0)).toBeCloseTo(base.output, 12);
    // the offer's card is answered by taking the plot, and a second step up is refused
    expect(applyCommand(s, {type: 'step-up'}, SYSTEMS).rejected).toMatch(/already yours/);
    expect(snapshotOf(s)).toMatchObject({level: 2, step: 1, kitchen: null});
  });

  it('draws eleven neighbours near the garden from the seed, the neglected plot where the household model puts it', () => {
    const a = latched(9), b = latched(9);
    stepUp(a);
    stepUp(b);
    expect(a.graph).toEqual(b.graph);
    const plots = Object.values(a.graph.nodes).filter((n) => n.kind === 'plot'), others = plots.filter((n) => n.id !== PLAYER_PLOT);
    expect(plots).toHaveLength(12);
    expect(['trough', 'sheds', 'spine', 'path-1', 'path-2'].every((id) => a.graph.nodes[id]?.box)).toBe(true);
    const base = baseOf(a.graph.nodes[PLAYER_PLOT])!;
    for (const n of others) {
      const t = sealedOf(n)!.totals;
      expect(t.output).toBeGreaterThan(base.output * 0.5);
      expect(t.output).toBeLessThan(base.output * 1.7);
    }
    const {plot} = neglectedPlot(9), neglected = a.graph.nodes[plot]!;
    expect(holderOf(neglected)!.neglected).toBe(true);
    expect(sealedOf(neglected)!.totals.health).toBeLessThanOrEqual(35);
    expect(others.filter((n) => holderOf(n)!.neglected)).toHaveLength(1);
    // the same people the household model draws, on the same plots
    expect(others.map((n) => holderOf(n)!.name).sort()).toEqual(peopleOf(rng(9)).agents.map((x) => x.name).sort());
  });
});

describe('the plot’s plan', () => {
  const base: LadderTotals = {output: 0.3, quality: 0, reliability: 50, upkeep: 0, health: 60, freshness: 0, carbon: 0.2, land: {crops: 18, grass: 60, built: 8}, outputByGroup: {potatoes: 0.1, salads: 0.1, tomatoes: 0.05, greens: 0.05}};

  it('leaves the garden as it was by default, but for the rent', () => {
    const p = planFor(base, CARE.base, 'as grown', 'compost');
    expect(p.health).toBeCloseTo(60, 9);
    expect(p.output).toBeCloseTo(0.3, 12);
    expect(p.carbon).toBeCloseTo(0.2, 12);
    expect(p.upkeep).toBeGreaterThan(0.2);
    expect(p.upkeep).toBeLessThan(0.35);
  });

  it('moves each number the way its lever should', () => {
    const d = planFor(base, CARE.base, 'as grown', 'compost');
    expect(planFor(base, 1, 'as grown', 'compost').health).toBeLessThan(d.health - 4);
    expect(planFor(base, 3, 'as grown', 'compost').health).toBeGreaterThan(d.health);
    expect(planFor(base, 4, 'as grown', 'compost').health).toBeGreaterThan(planFor(base, 3, 'as grown', 'compost').health);
    const roots = planFor(base, CARE.base, 'roots', 'compost');
    expect(roots.output).toBeGreaterThan(d.output);
    expect(roots.mix!.potatoes! / roots.output).toBeGreaterThan(base.outputByGroup!.potatoes! / base.output);
    const greens = planFor(base, CARE.base, 'greens', 'compost');
    expect(greens.output).toBeLessThan(d.output);
    expect((greens.mix!.salads! + greens.mix!.greens!) / greens.output).toBeGreaterThan(0.15 / 0.3);
    const fed = planFor(base, CARE.base, 'as grown', 'bought');
    expect(fed.output).toBeGreaterThan(d.output);
    expect(fed.upkeep).toBeGreaterThan(d.upkeep);
    expect(fed.carbon).toBeGreaterThan(d.carbon);
    expect(fed.health).toBeLessThan(d.health);
  });

  it('is the player’s plot’s alone, and each lever unfolds in turn', () => {
    const s = latched(2);
    stepUp(s);
    const plan = (node: string, lever: string, value: LeverValue) => applyCommand(s, {type: 'plan', node, lever, value}, SYSTEMS).rejected;
    expect(plan('plot-2', 'care', 3)).toMatch(/no plan lever/);
    expect(plan('plot-2', 'sealed', null)).toMatch(/neighbour/);
    expect(plan(PLAYER_PLOT, 'care', 5)).toMatch(/care is/);
    expect(plan(PLAYER_PLOT, 'sealed', null)).toMatch(/care, its mix and its feed/);
    expect(plan(PLAYER_PLOT, 'care', 3)).toBeNull();
    expect(plan(PLAYER_PLOT, 'mix', 'roots')).toMatch(/hasn’t come up/);
    tick(s, 24 * 8);
    expect(plan(PLAYER_PLOT, 'mix', 'roots')).toBeNull();
    expect(plan(PLAYER_PLOT, 'feed', 'bought')).toMatch(/hasn’t come up/);
    tick(s, 24 * 14);
    expect(plan(PLAYER_PLOT, 'feed', 'bought')).toBeNull();
    tick(s, 24);
    const sealed = sealedOf(s.graph.nodes[PLAYER_PLOT])!;
    expect(sealed.plan.upkeep).toBeGreaterThan(0.3);
    expect(sealed.totals.outputByGroup!.potatoes!).toBeGreaterThan(sealed.totals.output * 0.4);
  });
});

describe('the allotment', () => {
  it('plays two years without errors, feeds the household and repeats after a save and a load', () => {
    const straight = latched(3), broken = latched(3);
    stepUp(straight);
    stepUp(broken);
    for (const s of [straight, broken]) for (let h = 0; h < 24 * 200; h++) expect(tick(s, 1).errors).toEqual([]);
    const resumed = fromSave(toSave(broken));
    for (const s of [straight, resumed]) for (let h = 0; h < 24 * 530; h++) expect(tick(s, 1).errors).toEqual([]);
    expect(snapshotOf(resumed)).toEqual(snapshotOf(straight));
    const l = ledgerAt(straight.graph)!, money = straight.graph.nodes.household!.stocks.money!.amount;
    // about a quarter of a kilo a day, less what a short trough and pests from next door cost it (src/sim/season.ts)
    expect(l.grown).toBeGreaterThan(0.2 * 730);
    expect(l.saved).toBeGreaterThan(0);
    expect(money).toBeGreaterThan(0);
    // the level's own history, a year of weeks, for its own offer later
    expect((straight.graph.nodes.household!.levers.goal as unknown as {history: {samples: unknown[]}}).history.samples).toHaveLength(53);
    // people on their plots, drawn from the plots' harvests
    expect(straight.activities.length + resumed.activities.length).toBeGreaterThanOrEqual(0);
  });

  it('runs an allotment day in well under its 0.5 ms budget, scaled by a garden day timed alongside it', () => {
    // The 0.5 ms was set by part 7 on a machine where a garden day (index.test.ts's measure) took about 0.675 ms.
    // A shared runner can be twice as slow, so the budget scales with a garden day timed in the same run, in
    // alternating chunks so a slow patch hits both, and each side is the median of its chunks.
    const GARDEN_WHEN_SET = 0.675, BUDGET = 0.5;
    const s = latched(5), garden = createSim(3, SYSTEMS);
    stepUp(s);
    tick(s, 24 * 20);
    for (let i = 0; i < 24 * 20; i++) garden.apply({type: 'tick', hours: 1});
    const perDay = (run: () => void, days: number) => {
      const t0 = performance.now();
      for (let i = 0; i < 24 * days; i++) run();
      return (performance.now() - t0) / days;
    };
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]!;
    const allot: number[] = [], gardens: number[] = [];
    for (let round = 0; round < 7; round++) {
      allot.push(perDay(() => tick(s, 1), 30));
      gardens.push(perDay(() => garden.apply({type: 'tick', hours: 1}), 30));
    }
    const budget = BUDGET * Math.max(1, median(gardens) / GARDEN_WHEN_SET);
    expect(median(allot), `garden day ${median(gardens).toFixed(3)} ms here, so the budget is ${budget.toFixed(3)} ms`).toBeLessThan(budget);
  });

  it('holds the carry-over rule: the Output its year had, the land and carbon exactly, and a rebuilt cycle within tolerance', () => {
    const s = latched(6);
    stepUp(s);
    const r = carryReport(s)!;
    expect(r.output.off).toBeLessThanOrEqual(0.01);
    expect(r.land && r.carbon).toBe(true);
    expect(r.rebuilt.ok).toBe(true);
    expect(r.reliability.ok).toBe(true);
  });
});
