// The gardener: the day's jobs in order within their hours, each step a new activity, watering from the butt and then
// the tap, a trip per can, what doesn't fit waiting for tomorrow, a change of plan changing what they do next, and the
// pest policy: a torch patrol at dusk picking slugs on a damp evening, and the policy refused unless it's a policy; and the
// job: out through the gate on a weekday morning and home in the evening, none of it the garden's hours, with the week's
// shop on Friday.
import {describe, expect, it} from 'vitest';
import {HOURS} from '../data/jobs';
import type {Activity} from './activity';
import {calendar} from './clock';
import {createSim} from './index';
import {GARDENER, hoursOn, nextStart} from './gardener';
import {startHousehold} from './models/household';

const START_HOUSEHOLD = startHousehold();

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
  it('sows bed 2 on the first morning and waters it in, a trip a can from the butt, beside bed 1’s overwintered salad', () => {
    const sim = createSim(1), {acts, flows} = play(sim, 12);
    const at = (doing: string, bed: string) => acts.filter((a) => a.doing === doing && a.to === bed);
    expect(at('sow', 'bed-2')).toHaveLength(1);
    expect(at('sow', 'bed-1')).toHaveLength(0);
    expect(at('water', 'bed-2').length).toBeGreaterThanOrEqual(1);
    expect(acts.every((a) => a.who === GARDENER)).toBe(true);
    // every trip a new id, and each can carried from the butt to the bed it waters
    expect(new Set(acts.map((a) => a.id)).size).toBe(acts.length);
    const cans = acts.filter((a) => a.doing === 'carry' && a.carry?.unit === 'L');
    expect(cans.length).toBeGreaterThanOrEqual(1);
    expect(cans.every((a) => a.from === 'butt' && a.carry!.amount > 0 && a.carry!.amount <= 10)).toBe(true);
    const watering = flows.filter((f) => f.what === 'watering');
    expect(watering.every((f) => 'node' in f.from && f.from.node === 'butt')).toBe(true);
    expect(watering.reduce((s, f) => s + f.amount, 0)).toBeCloseTo(cans.reduce((s, a) => s + a.carry!.amount, 0));
    // what's sown is in the bed, and the work took their hours
    const snap = sim.snapshot(), bed = (id: string) => snap.nodes.find((n) => n.id === id)!.levers.crop as {id: string};
    expect(bed('bed-1').id).toBe('salad');
    expect(bed('bed-2').id).toBe('radish');
    const me = snap.nodes.find((n) => n.id === GARDENER)!;
    expect(me.stocks.hours!.amount).toBeLessThan(hoursOn(START_HOUSEHOLD, calendar(0)));
    expect(me.stocks.hours!.amount).toBeGreaterThan(0);
  });

  it('works only the hours they have, leaving what doesn’t fit until tomorrow', () => {
    const sim = createSim(3);
    // dig two plots out of the lawn: six hours of spade work, more than a four-hour weekday holds after the sowing
    sim.apply({type: 'plan', node: 'bed-3', lever: 'dig', value: true});
    sim.apply({type: 'plan', node: 'bed-4', lever: 'dig', value: true});
    const dug = () => ['bed-3', 'bed-4'].reduce((s, id) => s + (sim.snapshot().nodes.find((n) => n.id === id)!.stocks['land.crops']?.amount ?? 0), 0);
    const day1 = play(sim, 24);
    const spent = day1.flows.filter((f) => f.unit === 'h' && f.what === 'work').reduce((s, f) => s + f.amount, 0);
    expect(spent).toBeLessThanOrEqual(hoursOn(START_HOUSEHOLD, calendar(0)) + 1e-9);
    const dug1 = dug();
    expect(dug1).toBeGreaterThan(0);
    expect(dug1).toBeLessThan(6);
    play(sim, 48);
    expect(dug()).toBeCloseTo(6);
  });

  it('fetches from the tap once the butt is empty', () => {
    const sim = createSim(1);
    const save = JSON.parse(sim.save());
    save.graph.nodes.butt.stocks.water.amount = 4; // less than a can: bed 2's watering in finishes from the tap
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
    // on day 3's evening, home from work, a watering line above the beds' moisture sends them out with the can within
    // the hour
    play(sim, 48 - 6 + 12);
    sim.apply({type: 'plan', node: GARDENER, lever: 'waterBelow', value: 1});
    const {acts} = play(sim, 2);
    expect(acts.some((a) => a.doing === 'water')).toBe(true);
    expect(sim.apply({type: 'plan', node: GARDENER, lever: 'waterBelow', value: 2}).rejected).toMatch(/moisture/);
    expect(sim.apply({type: 'plan', node: 'bed-1', lever: 'sow', value: 'turnips'}).rejected).toMatch(/no summer crop/);
    expect(sim.apply({type: 'plan', node: 'bed-1', lever: 'crop', value: null}).rejected).toMatch(/garden's/);
    expect(sim.apply({type: 'plan', node: GARDENER, lever: 'day', value: null}).rejected).toMatch(/aren’t the plan’s/);
  });

  it('gets the household’s hours: four on a weekday around the job, six at the weekend, and starts each day at the same hour', () => {
    expect(hoursOn(START_HOUSEHOLD, calendar(24 * 5))).toBe(6); // day 6 is a Saturday
    expect(hoursOn(START_HOUSEHOLD, calendar(0))).toBe(4);
    expect(nextStart(3)).toBe(24 + HOURS.start - 6);
    expect(nextStart(-1)).toBe(HOURS.start - 6);
  });

  it('goes out at dusk with a torch on the first evening to pick slugs, and takes the time from the day’s hours', () => {
    const sim = createSim(1), {acts, flows} = play(sim, 24);
    const torch = acts.filter((a) => a.doing === 'torch');
    expect(torch.length).toBeGreaterThan(0);
    // after dark (sunset is about 18:00 in mid-March, and the day's work stops at 20:00)
    expect(torch.every((a) => calendar(a.start).hour >= HOURS.stop)).toBe(true);
    expect(torch.some((a) => a.to === 'bed-1')).toBe(true);
    expect(flows.some((f) => f.what === 'hand-picking' && f.unit === 'pests' && f.amount > 0)).toBe(true);
    const spent = flows.filter((f) => f.unit === 'h' && f.what === 'work').reduce((s, f) => s + f.amount, 0);
    expect(spent).toBeLessThanOrEqual(hoursOn(START_HOUSEHOLD, calendar(0)) + 1e-9);
  });

  it('leaves for work through the gate on a weekday and comes home in the evening, on none of the garden’s hours', () => {
    const sim = createSim(1), {acts, flows} = play(sim, 24);
    const leave = acts.find((a) => a.doing === 'leave'), away = acts.find((a) => a.doing === 'away'), home = acts.find((a) => a.doing === 'home');
    expect(leave?.to).toBe('gate');
    expect(calendar(leave!.end).hour).toBe(8); // out by 08:30
    expect(away!.from).toBe('gate');
    expect(calendar(away!.end).hour).toBe(17); // back at 17:30
    expect(home!.to).toBe('kitchen');
    expect(home!.carry).toBeUndefined(); // Monday: no shop
    // nothing in the garden while they're out
    const garden = acts.filter((a) => !['leave', 'away', 'home', 'rest'].includes(a.doing));
    expect(garden.some((a) => a.start < away!.end - 1e-9 && a.end > away!.start + 1e-9)).toBe(false);
    expect(garden.some((a) => a.start >= away!.end)).toBe(true); // the rest of the list after work
    const spent = flows.filter((f) => f.unit === 'h' && f.what === 'work').reduce((s, f) => s + f.amount, 0);
    expect(spent).toBeLessThanOrEqual(4 + 1e-9);
  });

  it('brings the week’s shop home on Friday, with the pay and the rest of life’s spending, and stays in at the weekend', () => {
    const sim = createSim(2);
    play(sim, 24 * 4); // to Friday 06:00
    const {acts, flows} = play(sim, 24);
    const home = acts.find((a) => a.doing === 'home');
    expect(home?.carry?.product).toBe('shop');
    for (const what of ['wages', 'the weekly shop', 'the rest of life', 'shop food', 'shop food carbon']) expect(flows.some((f) => f.what === what)).toBe(true);
    // the shop's carbon goes to the household's footprint, never to the air
    expect(flows.filter((f) => f.what === 'shop food carbon').every((f) => 'node' in f.to && f.to.node === 'household')).toBe(true);
    const weekend = play(sim, 48);
    expect(weekend.acts.some((a) => a.doing === 'leave')).toBe(false);
  });

  it('takes the pest policy only as a policy, with a choice each pest has', () => {
    const sim = createSim(1);
    // not until the slugs have come up (the first evening's patrol: src/data/unfold.ts)
    expect(sim.apply({type: 'policy', node: GARDENER, lever: 'slugs', value: 'leave'}).rejected).toMatch(/hasn’t come up/);
    play(sim, 24);
    expect(sim.snapshot().seen).toContain('garden.slugs');
    expect(sim.apply({type: 'plan', node: GARDENER, lever: 'slugs', value: 'trap'}).rejected).toMatch(/pest policy/);
    expect(sim.apply({type: 'policy', node: GARDENER, lever: 'slugs', value: 'bait'}).rejected).toMatch(/leave, pick, trap, treat/);
    expect(sim.apply({type: 'policy', node: GARDENER, lever: 'aphids', value: 'pick'}).rejected).toMatch(/hasn’t come up/);
    expect(sim.apply({type: 'policy', node: GARDENER, lever: 'slugs', value: 'leave'}).rejected).toBeNull();
    const {acts} = play(sim, 24);
    expect(acts.some((a) => a.doing === 'torch')).toBe(false);
  });
});
