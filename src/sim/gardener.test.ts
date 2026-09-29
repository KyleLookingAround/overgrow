// The gardener: the day's jobs in order within their hours, each step a new activity, watering from the butt and then
// the tap, a trip per can, what doesn't fit waiting for tomorrow, and a change of plan changing what they do next.
import {describe, expect, it} from 'vitest';
import {HOURS} from '../data/jobs';
import type {Activity} from './activity';
import {calendar} from './clock';
import {createSim} from './index';
import {GARDENER, hoursOn, nextStart} from './gardener';

/** Runs hour by hour, collecting every activity and flow. */
function play(sim: ReturnType<typeof createSim>, hours: number) {
  const acts = new Map<string, Activity>(), flows = [];
  for (let i = 0; i < hours; i++) {
    const s = sim.apply({type: 'tick', hours: 1});
    for (const a of s.activities) acts.set(a.id, a);
    flows.push(...s.flows);
  }
  return {acts: [...acts.values()], flows};
}

describe('gardener', () => {
  it('sows both beds on the first morning and waters each in, a trip a can from the butt', () => {
    const sim = createSim(1), {acts, flows} = play(sim, 12);
    const at = (doing: string, bed: string) => acts.filter((a) => a.doing === doing && a.to === bed);
    expect(at('sow', 'bed-1')).toHaveLength(1);
    expect(at('sow', 'bed-2')).toHaveLength(1);
    expect(at('water', 'bed-1').length).toBeGreaterThanOrEqual(1);
    expect(at('water', 'bed-2').length).toBeGreaterThanOrEqual(1);
    expect(acts.every((a) => a.who === GARDENER)).toBe(true);
    // every trip a new id, and each can carried from the butt to the bed it waters
    expect(new Set(acts.map((a) => a.id)).size).toBe(acts.length);
    const cans = acts.filter((a) => a.doing === 'carry' && a.carry?.unit === 'L');
    expect(cans.every((a) => a.from === 'butt' && a.carry!.amount > 0 && a.carry!.amount <= 10)).toBe(true);
    const watering = flows.filter((f) => f.what === 'watering');
    expect(watering.every((f) => 'node' in f.from && f.from.node === 'butt')).toBe(true);
    expect(watering.reduce((s, f) => s + f.amount, 0)).toBeCloseTo(cans.reduce((s, a) => s + a.carry!.amount, 0));
    // what's sown is in the beds, and the work took their hours
    const snap = sim.snapshot(), bed = (id: string) => snap.nodes.find((n) => n.id === id)!.levers.crop as {id: string};
    expect(bed('bed-1').id).toBe('salad');
    expect(bed('bed-2').id).toBe('radish');
    const me = snap.nodes.find((n) => n.id === GARDENER)!;
    expect(me.stocks.hours!.amount).toBeLessThan(hoursOn(calendar(0)));
    expect(me.stocks.hours!.amount).toBeGreaterThan(0);
  });

  it('works only the hours they have, leaving what doesn’t fit until tomorrow', () => {
    const sim = createSim(3);
    // dig a whole plot out of the lawn: three hours of spade work on a four-hour weekday, after the sowing
    sim.apply({type: 'plan', node: 'bed-3', lever: 'dig', value: true});
    const day1 = play(sim, 24);
    const spent = day1.flows.filter((f) => f.unit === 'h' && f.what === 'work').reduce((s, f) => s + f.amount, 0);
    expect(spent).toBeLessThanOrEqual(HOURS.weekday + 1e-9);
    const dug1 = sim.snapshot().nodes.find((n) => n.id === 'bed-3')!.stocks['land.crops']?.amount ?? 0;
    expect(dug1).toBeGreaterThan(0);
    expect(dug1).toBeLessThan(3);
    play(sim, 24);
    expect(sim.snapshot().nodes.find((n) => n.id === 'bed-3')!.stocks['land.crops']!.amount).toBeCloseTo(3);
  });

  it('fetches from the tap once the butt is empty', () => {
    const sim = createSim(1);
    const save = JSON.parse(sim.save());
    save.graph.nodes.butt.stocks.water.amount = 12; // enough for one can and a bit
    sim.apply({type: 'load', save: JSON.stringify(save)});
    const {flows, acts} = play(sim, 12);
    const from = flows.filter((f) => f.what === 'watering').map((f) => ('node' in f.from ? f.from.node : f.from.boundary));
    expect(from).toContain('butt');
    expect(from).toContain('mains');
    expect(acts.some((a) => a.doing === 'fill' && a.to === 'tap')).toBe(true);
  });

  it('changes what they do next when the plan changes', () => {
    const sim = createSim(1);
    sim.apply({type: 'plan', node: 'bed-2', lever: 'sow', value: 'lettuce'});
    play(sim, 6);
    expect((sim.snapshot().nodes.find((n) => n.id === 'bed-2')!.levers.crop as {id: string}).id).toBe('lettuce');
    // mid-morning on day 3, a watering line above the beds' moisture sends them out with the can within the hour
    play(sim, 48 - 6 + 3);
    sim.apply({type: 'plan', node: GARDENER, lever: 'waterBelow', value: 1});
    const {acts} = play(sim, 2);
    expect(acts.some((a) => a.doing === 'water')).toBe(true);
    expect(sim.apply({type: 'plan', node: GARDENER, lever: 'waterBelow', value: 2}).rejected).toMatch(/moisture/);
    expect(sim.apply({type: 'plan', node: 'bed-1', lever: 'sow', value: 'turnips'}).rejected).toMatch(/no crop/);
    expect(sim.apply({type: 'plan', node: 'bed-1', lever: 'crop', value: null}).rejected).toMatch(/garden's/);
    expect(sim.apply({type: 'plan', node: GARDENER, lever: 'day', value: null}).rejected).toMatch(/aren’t the plan’s/);
  });

  it('gets more hours at the weekend, and starts each day at the same hour', () => {
    expect(hoursOn(calendar(24 * 5))).toBe(HOURS.weekend); // day 6 is a Saturday
    expect(hoursOn(calendar(0))).toBe(HOURS.weekday);
    expect(nextStart(3)).toBe(24 + HOURS.start - 6);
    expect(nextStart(-1)).toBe(HOURS.start - 6);
  });
});
