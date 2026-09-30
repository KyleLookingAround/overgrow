// The allotment's first season (src/sim/season.ts): the trough's three rotas share a dry day's water as their rules say
// (first come leaves the back of the queue short, slots share it equally, by need in proportion), and a plot draws
// nothing until its soil has dried; pests press hardest next to an untended plot and fall off with distance; and on the
// graph, from a step up: the neighbours' weeks drive their plots, the neglected plot is offered after a fortnight and is
// the player's to take, the helper's barrow carries more than their report says while the panel's number is the report,
// an audit costs the household's hours and unfolds trust, the second plot is reclaimed over the seasons, the first dry
// spell brings a motion the player votes on, the swap shed swaps kilo for kilo, and every flow balances.
import {describe, expect, it} from 'vitest';
import {PLAYER_PLOT} from '../data/allotment';
import {SECOND, TROUGH} from '../data/season';
import {GOAL, type Goal} from './goal';
import {qty, type LeverValue} from './graph';
import {emptyHistory, record} from './ladder';
import {applyCommand} from './commands';
import {stepUp} from './allotment';
import {HELPING, takingsOf, type Helping} from './models/agency';
import {COMMITTEE, rulesOf} from './models/committee';
import {HOURS_LEFT} from './models/labour';
import {pestSource, spreadPressure} from './models/pests';
import {plotNeed, troughDay} from './models/water';
import {hoursLeft, keptOf, meetingOf, personNode, pressureOf, secondOf, secondPlot, shelfOf} from './season';
import {newState, type State} from './state';
import {SYSTEMS} from './systems';

function latched(seed: number): State {
  const s = newState(seed);
  s.hours = 24 * 364;
  let history = emptyHistory(1);
  for (let w = 0; w < 52; w++) history = record(history, {output: qty(2 * (0.5 + (w % 4) / 4), 'kgFood'), quality: 0, upkeep: qty(0, 'GBP'), carbon: qty(0.3, 'kgCO2e'), health: {soil: 62}});
  const goal: Goal = {history, mark: {delivered: 0, carbon: 0}, fed: Array(52).fill(0.6), offered: s.hours};
  s.graph.nodes.kitchen!.levers[GOAL] = goal as unknown as LeverValue;
  return s;
}
const send = (s: State, cmd: Parameters<typeof applyCommand>[1]) => applyCommand(s, cmd, SYSTEMS);
const tick = (s: State, hours: number) => send(s, {type: 'tick', hours});

describe('the trough', () => {
  const needs = [{id: 'a', need: 200}, {id: 'b', need: 200}, {id: 'c', need: 200}, {id: 'd', need: 100}];
  it('first come serves the front of the queue and leaves the back short', () => {
    const d = troughDay({water: 200, cap: 1000, refill: 300, needs, rota: 'open', limit: 300});
    expect(d.given).toEqual({a: 200, b: 200, c: 100, d: 0});
    expect(d.left).toBe(0);
  });
  it('slots share it equally, what one leaves going to the rest; by need shares it in proportion', () => {
    const slots = troughDay({water: 200, cap: 1000, refill: 300, needs, rota: 'slots', limit: 300}).given;
    expect(slots.d).toBeCloseTo(100);
    for (const k of ['a', 'b', 'c']) expect(slots[k]).toBeCloseTo(400 / 3);
    const need = troughDay({water: 200, cap: 1000, refill: 300, needs, rota: 'need', limit: 300}).given;
    expect(need.a! / need.d!).toBeCloseTo(2);
    expect(Object.values(need).reduce((a, x) => a + x, 0)).toBeCloseTo(500);
  });
  it('holds each plot to the limit, keeps what’s left up to its brim, and counts only the mains that stayed', () => {
    const d = troughDay({water: 900, cap: 1000, refill: 1400, needs: [{id: 'a', need: 500}], rota: 'open', limit: 300});
    expect(d.given.a).toBe(300);
    expect(d.left).toBe(1000);
    // what went in less what came out is what the trough gained: water is conserved
    expect(d.left - 900).toBeCloseTo(d.refill - 300);
  });
  it('draws nothing until the soil has had its dry days, then about FAO-56’s use over the watered share', () => {
    expect(plotNeed(5, 96, 1, TROUGH.dryDays - 1)).toBe(0);
    const hot = plotNeed(5, 96, 1, 5), cool = plotNeed(2, 96, 1, 5), weedy = plotNeed(5, 96, 0.2, 5);
    expect(hot).toBeGreaterThan(150);
    expect(hot).toBeLessThan(300);
    expect(cool).toBeLessThan(hot / 2);
    expect(weedy).toBeLessThan(hot * 0.6);
  });
});

describe('pests from next door', () => {
  it('press hardest beside an untended plot and fall off with distance; kept plots harbour none', () => {
    expect(pestSource(1)).toBe(0);
    expect(pestSource(0.5)).toBe(1);
    const row = [0, 1, 2, 3].map((i) => ({id: `p${i}`, x: i * 13, y: 0, source: i === 0 ? 1 : 0}));
    const p = spreadPressure(row, 11);
    expect(p.p0).toBe(0);
    expect(p.p1).toBeGreaterThan(0.25);
    expect(p.p1).toBeLessThan(0.4);
    expect(p.p2).toBeLessThan(p.p1! / 2);
    expect(p.p3).toBeLessThan(p.p2!);
    expect(spreadPressure(row.map((r) => ({...r, source: 0})), 11).p1).toBe(0);
  });
});

describe('the first season on the graph', () => {
  it('drives the neighbours’ plots by their weeks, and offers the neglected plot after a fortnight', () => {
    const s = latched(1);
    stepUp(s);
    expect(send(s, {type: 'second-plot', answer: 'take'}).rejected).toMatch(/no plot is going spare/);
    tick(s, 24 * 8);
    const kept = Object.values(s.graph.nodes).map(keptOf).filter((k) => k);
    expect(kept).toHaveLength(11);
    expect(kept.some((k) => k!.kept < 0.7)).toBe(true);
    expect(s.seen).toContain('allotment.neighbours');
    // the day's count is read from the last tick, so the offer comes the morning after its day
    tick(s, 24 * (SECOND.offerDay - 6));
    expect(s.seen).toContain('agency.helper');
    const n = secondPlot(s.graph)!;
    expect(keptOf(n)!.kept).toBeLessThan(0.8);
    expect(send(s, {type: 'second-plot', answer: 'take'}).rejected).toBeNull();
    expect(secondOf(s.graph.nodes[n.id])!.taken).toBe(s.hours);
    expect(send(s, {type: 'second-plot', answer: 'take'}).rejected).toMatch(/already yours/);
  });

  it('shows the helper’s report while their barrow carries the truth, and an audit costs hours and unfolds trust', () => {
    const s = latched(2);
    stepUp(s);
    tick(s, 24 * (SECOND.offerDay + 2));
    send(s, {type: 'second-plot', answer: 'take'});
    expect(send(s, {type: 'watch', watching: 'audit'}).rejected).toMatch(/nobody/);
    expect(send(s, {type: 'helper', answer: 'accept'}).rejected).toBeNull();
    const sp = secondOf(secondPlot(s.graph)!)!, p = personNode(s.graph, sp.helper!)!;
    expect(send(s, {type: 'watch', watching: 'audit'}).rejected).toBeNull();
    expect((p.levers[HELPING] as unknown as Helping).watching).toBe('audit');
    const before = hoursLeft(s.graph);
    let barrow = null;
    for (let d = 0; d < 7 * 20 && !barrow; d++) {
      tick(s, 24);
      barrow = s.activities.find((a) => a.carry?.product === 'barrow') ?? null;
    }
    expect(s.seen).toContain('agency.trust');
    expect(barrow).not.toBeNull();
    const t = takingsOf(s.graph.nodes[p.id]!);
    // the report is never more than the truth, and the second plot's lever carries the report, not the gap
    expect(t.reported).toBeLessThanOrEqual(t.took + 1e-9);
    expect(barrow!.carry!.of).toBeLessThanOrEqual(barrow!.carry!.amount + 1e-9);
    expect(Object.keys(secondOf(secondPlot(s.graph)!)!)).not.toContain('hidden');
    expect(t.hoursWatched).toBeGreaterThan(0);
    expect(before).toBeGreaterThan(0);
    expect(s.graph.nodes.household!.stocks[HOURS_LEFT]).toBeDefined();
  });

  it('reclaims the second plot over the seasons, and cuts the pests it sends next door', () => {
    const s = latched(3);
    stepUp(s);
    tick(s, 24 * (SECOND.offerDay + 2));
    const n = secondPlot(s.graph)!, id = n.id;
    tick(s, 24 * 60);
    const nextDoor = Object.values(s.graph.nodes).filter((x) => x.kind === 'plot' && x.id !== id).reduce((m, x) => Math.max(m, pressureOf(x)), 0);
    send(s, {type: 'second-plot', answer: 'take'});
    send(s, {type: 'helper', answer: 'refuse'});
    tick(s, 24 * 7 * 12);
    const half = secondOf(s.graph.nodes[id])!.reclaimed;
    expect(half).toBeGreaterThan(SECOND.start);
    expect(half).toBeLessThan(1);
    tick(s, 24 * 7 * 30);
    expect(secondOf(s.graph.nodes[id])!.reclaimed).toBe(1);
    // reclaimed, it yields like a well-kept neighbour's
    const sp = secondOf(s.graph.nodes[id])!;
    expect(s.graph.nodes[id]!.totals.output).toBeCloseTo(sp.full, 6);
    const after = Object.values(s.graph.nodes).filter((x) => x.kind === 'plot' && x.id !== id).reduce((m, x) => Math.max(m, pressureOf(x)), 0);
    expect(after).toBeLessThan(nextDoor);
  });

  it('brings a motion in the first dry spell that the player votes on, and swaps kilo for kilo', () => {
    const s = latched(1);
    stepUp(s);
    // more tomatoes than the household eats in a week: a surplus to swap
    tick(s, 24 * 8);
    expect(send(s, {type: 'plan', node: PLAYER_PLOT, lever: 'mix', value: 'fruit'}).rejected).toBeNull();
    const flows = {left: 0, swapped: 0};
    for (let d = 0; d < 365 && !(meetingOf(s.graph)?.tally && shelfOf(s.graph)?.first); d++) {
      for (let h = 0; h < 24; h++) {
        tick(s, 1);
        for (const f of s.flows) {
          if (f.what === 'left at the swap shed' && !('boundary' in f.from) && f.from.node === PLAYER_PLOT) flows.left += f.amount;
          if (f.what === 'from the swap shed') flows.swapped += f.amount;
        }
        expect(s.errors).toEqual([]);
      }
      if (s.seen.includes('allotment.shed') && s.graph.nodes.household!.levers.swap !== 'on') expect(send(s, {type: 'policy', node: 'household', lever: 'swap', value: 'on'}).rejected).toBeNull();
      const m = meetingOf(s.graph);
      if (m && !m.tally) {
        expect(send(s, {type: 'vote', answer: 'yes', talk: {nobody: 1}}).rejected).toMatch(/committee/);
        expect(send(s, {type: 'vote', answer: 'yes', talk: {[m.by]: 1}}).rejected).toBeNull();
        expect(send(s, {type: 'vote', answer: 'no'}).rejected).toMatch(/has voted/);
      }
    }
    const m = meetingOf(s.graph)!;
    expect(m.tally).not.toBeNull();
    expect(s.seen).toContain('committee.panel');
    expect(s.seen).toContain('allotment.trough');
    expect(rulesOf(s.graph.nodes[COMMITTEE]).rota).toBe(m.tally!.passes ? (m.motion === 'waterRota' ? 'slots' : 'need') : 'open');
    expect(flows.swapped).toBeGreaterThan(0);
    expect(flows.swapped).toBeCloseTo(flows.left, 9);
    expect(s.seen).toContain('agency.goodwill');
  });
});
