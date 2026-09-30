// The zoom back in (part 9): the outbreak comes once, in the allotment's first summer, on the player's plot from the
// neglected plot, and costs the plot its share of the kg while it lasts; left alone it's missed at the deadline and runs
// its course; going down opens the garden kept below with the slugs in its beds and the purse, the garden's tools fix it,
// and back up lifts the event, marks the plot and earns goodwill, the year as sealed and the carry-over rule untouched;
// an adviser does it for a fee and half the reward; a save taken down in the garden carries on exactly; and the reward
// is bigger the sooner.
import {beforeAll, describe, expect, it} from 'vitest';
import {PLAYER_PLOT} from '../data/allotment';
import {ADVISERS, OUTBREAK, RESCUE} from '../data/zoom';
import {carryReport, sealedOf} from './allotment';
import {calendar} from './clock';
import {applyCommand} from './commands';
import {GOAL, type Goal} from './goal';
import {qty, type LeverValue} from './graph';
import {emptyHistory, record} from './ladder';
import {neglectedPlot, relationOf} from './models/agency';
import {fromSave, toSave} from './save';
import {newState, type State} from './state';
import {SYSTEMS} from './systems';
import {bedSlugs, shareAt, type Zoom} from './zoom';

const SEED = 2;
/** A garden a year in with its offer latched (as the step up's tests), stepped up and run to the outbreak. */
function atOutbreak(): string {
  const s = newState(SEED);
  s.hours = 24 * 364;
  let history = emptyHistory(1);
  for (let w = 0; w < 52; w++) history = record(history, {output: qty(2 * (0.5 + (w % 4) / 4), 'kgFood'), quality: 0, upkeep: qty(0, 'GBP'), carbon: qty(0.3, 'kgCO2e'), health: {soil: 62}});
  s.graph.nodes.kitchen!.levers[GOAL] = {history, mark: {delivered: 0, carbon: 0}, fed: Array(52).fill(0.6), offered: s.hours} as unknown as LeverValue;
  expect(applyCommand(s, {type: 'step-up'}, SYSTEMS).rejected).toBeNull();
  while (!s.zoom) tick(s, 24);
  // the trace unfolds with it (a day later if something else unfolded that day)
  tick(s, 24);
  return toSave(s);
}
const tick = (s: State, hours: number) => applyCommand(s, {type: 'tick', hours}, SYSTEMS);
const load = (save: string) => fromSave(save);
const goodwill = (s: State) => {
  const ns = Object.values(s.graph.nodes).filter((n) => n.kind === 'neighbour');
  return ns.reduce((a, n) => a + relationOf(n).goodwill, 0) / ns.length;
};

let save = '';
beforeAll(() => {
  save = atOutbreak();
}, 60_000);

describe('the outbreak', () => {
  it('comes once, in the first summer, on the player’s plot from the neglected plot', () => {
    const s = load(save), z = s.zoom!;
    expect(calendar(z.event.from).month).toBe(6);
    expect(z.from).toBe(neglectedPlot(SEED).plot);
    expect(z.node).toBe(PLAYER_PLOT);
    expect(sealedOf(s.graph.nodes[PLAYER_PLOT])!.events.some((e) => e.id === z.event.id)).toBe(true);
    expect(z.deadline - z.event.from).toBe(OUTBREAK.deadlineDays * 24);
    expect(s.seen).toContain('zoom.trace');
  });

  it('left alone, costs the plot its share of the kg, is missed at the deadline and runs its course', () => {
    const s = load(save), z0 = s.zoom!, rate = sealedOf(s.graph.nodes[PLAYER_PLOT])!.plan.output!;
    const before = goodwill(s);
    tick(s, 24 * (OUTBREAK.days + 2));
    const z = s.zoom!;
    expect(z.missed).toBe(true);
    expect(z.rescued).toBeNull();
    // 40 % of the plot's output for 28 days (the plan's rate held steady over them within a few per cent)
    expect(z.kg).toBeGreaterThan(0.9 * OUTBREAK.size * rate * OUTBREAK.days);
    expect(z.kg).toBeLessThan(1.1 * OUTBREAK.size * rate * OUTBREAK.days);
    expect(sealedOf(s.graph.nodes[PLAYER_PLOT])!.events.some((e) => e.id === z0.event.id)).toBe(false);
    expect(s.graph.nodes[PLAYER_PLOT]!.levers.rescued).toBeUndefined();
    expect(applyCommand(s, {type: 'go-down'}, SYSTEMS).rejected).toMatch(/too late/);
    expect(goodwill(s)).toBeLessThan(before + 0.02);
  });
});

describe('going down', () => {
  it('opens the garden kept below with the slugs in its beds, fixed with its own tools, and back up rescues the plot', () => {
    const s = load(save), money = s.graph.nodes.household!.stocks.money!.amount, rel = sealedOf(s.graph.nodes[PLAYER_PLOT])!.totals.reliability;
    const sealedYear = JSON.stringify((s.ladder[0]!.graph.nodes.kitchen!.levers[GOAL] as unknown as Goal).history), before = goodwill(s);
    expect(applyCommand(s, {type: 'go-down'}, SYSTEMS).rejected).toBeNull();
    expect(s.level).toBe(1);
    expect(s.home).toBe('kitchen');
    expect(s.graph).toBe(s.ladder[0]!.graph);
    expect(s.graph.nodes.kitchen!.stocks.money!.amount).toBeCloseTo(money, 9);
    expect(s.zoom!.peak!).toBeGreaterThan(OUTBREAK.arrive.perM2);
    expect(bedSlugs(s.graph)).toBeCloseTo(s.zoom!.peak!, 9);
    // one clock, at the garden's rate, and no second plot from down here
    expect(applyCommand(s, {type: 'step-up'}, SYSTEMS).rejected).toMatch(/already yours/);
    expect(applyCommand(s, {type: 'policy', node: 'gardener', lever: 'slugs', value: 'pick'}, SYSTEMS).rejected).toBeNull();
    // the beds thriving with slugs: nematodes are worth having, and bought from the household's purse
    tick(s, 24);
    expect(applyCommand(s, {type: 'buy', id: 'nematodes'}, SYSTEMS).rejected).toBeNull();
    for (let h = 0; h < 24 * OUTBREAK.deadlineDays && !s.zoom!.rescued; h++) tick(s, 1);
    const z = s.zoom!;
    expect(z.rescued?.by).toBe('you');
    expect(z.rescued!.at).toBeLessThan(z.deadline);
    expect(bedSlugs(s.graph)).toBeLessThanOrEqual(OUTBREAK.clear * z.peak!);
    expect(applyCommand(s, {type: 'back-up'}, SYSTEMS).rejected).toBeNull();
    expect(s.level).toBe(2);
    const n = s.graph.nodes[PLAYER_PLOT]!, sealed = sealedOf(n)!;
    expect(sealed.totals.reliability).toBeCloseTo(Math.min(100, rel + RESCUE.reliability), 6);
    expect(n.levers.rescued).toMatchObject({by: 'you'});
    const e = sealed.events.find((x) => x.id === z.event.id);
    expect(!e || e.from + e.days * 24 <= z.rescued!.at + 1e-6).toBe(true);
    expect(goodwill(s)).toBeGreaterThan(before);
    // the garden's weeks down there don't join its sealed year, and the carry-over rule still holds
    expect(JSON.stringify((s.ladder[0]!.graph.nodes.kitchen!.levers[GOAL] as unknown as Goal).history)).toBe(sealedYear);
    const carry = carryReport(s)!;
    expect(carry.output.off).toBeLessThan(0.01);
    expect(carry.rebuilt.ok).toBe(true);
    expect(s.errors).toEqual([]);
  }, 60_000);

  it('brings the slugs once, however often the player goes down', () => {
    const s = load(save);
    applyCommand(s, {type: 'go-down'}, SYSTEMS);
    const peak = s.zoom!.peak!;
    applyCommand(s, {type: 'back-up'}, SYSTEMS);
    const before = bedSlugs(s.ladder[0]!.graph);
    expect(applyCommand(s, {type: 'go-down'}, SYSTEMS).rejected).toBeNull();
    expect(s.zoom!.peak).toBe(peak);
    expect(bedSlugs(s.graph)).toBeLessThanOrEqual(before + 1e-9);
  }, 60_000);

  it('carries on exactly from a save taken down in the garden', () => {
    const a = load(save);
    applyCommand(a, {type: 'go-down'}, SYSTEMS);
    tick(a, 30);
    const b = fromSave(toSave(a));
    for (const s of [a, b]) tick(s, 24 * 3), applyCommand(s, {type: 'back-up'}, SYSTEMS), tick(s, 24);
    expect(toSave(b)).toBe(toSave(a));
    expect(b.level).toBe(2);
  }, 60_000);
});

describe('sending someone', () => {
  it('sorts it for a fee and half the reward', () => {
    const s = load(save), a = ADVISERS.slugs!, money = s.graph.nodes.household!.stocks.money!.amount;
    expect(applyCommand(s, {type: 'send-someone', adviser: a.id}, SYSTEMS).rejected).toBeNull();
    expect(s.graph.nodes.household!.stocks.money!.amount).toBeCloseTo(money - a.fee, 9);
    expect(applyCommand(s, {type: 'go-down'}, SYSTEMS).rejected).toMatch(/sent/);
    const z = s.zoom! as Zoom;
    expect(z.rescued!.share).toBeCloseTo(shareAt(z, z.rescued!.at) * a.reward, 9);
    tick(s, 24 * (a.days + 1));
    expect(s.graph.nodes[PLAYER_PLOT]!.levers.rescued).toMatchObject({by: 'adviser'});
  });

  it('is refused too near the deadline to finish', () => {
    const s = load(save);
    s.hours = s.zoom!.deadline - 24;
    expect(applyCommand(s, {type: 'send-someone', adviser: 'slugs'}, SYSTEMS).rejected).toMatch(/before the deadline/);
  });

  it('is refused when the purse is short', () => {
    const s = load(save);
    s.graph.nodes.household!.stocks.money!.amount = qty(1, 'GBP');
    expect(applyCommand(s, {type: 'send-someone', adviser: 'slugs'}, SYSTEMS).rejected).toMatch(/short/);
  });
});

describe('the reward', () => {
  it('is bigger the sooner the rescue', () => {
    const z = {event: {from: 0}, deadline: 14 * 24} as Pick<Zoom, 'event' | 'deadline'>;
    expect(shareAt(z, 0)).toBeCloseTo(RESCUE.most, 9);
    expect(shareAt(z, 7 * 24)).toBeLessThan(shareAt(z, 24));
    expect(shareAt(z, 14 * 24)).toBeCloseTo(RESCUE.least, 9);
  });
});
