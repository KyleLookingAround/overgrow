// The labour model's plausibility test: a harvest month needs several times a quiet month's hours; a hired hand pays back
// only when the work would otherwise wait; a beginner takes about twice an experienced hand's time; what doesn't fit
// waits; the day's hours are given from `time` and the unused handed back.
import {describe, expect, it} from 'vitest';
import {CROP_WORK, WAGES} from '../../data/labour';
import {calendar, runStep} from '../clock';
import {applyFlow, makeNode, type Flow, type Graph} from '../graph';
import {gardenGraph} from '../state';
import {commuteHours, dayWage, newMember, workHours} from './household';
import {dayHours, earnOffFarm, fit, hireBenefit, hoursOver, labour, offFarmDay, payWages, peakMonth, timeFactor, wageCost, withMinimumWage, workNeeded, type Worker, WORKER} from './labour';
import {imbalance, qty, stockTotals} from '../graph';

const owner: Worker = {id: 'owner', role: 'owner', skills: {general: 1, harvest: 1, sowing: 1}, goals: {}};
const hand = (skill: number): Worker => ({id: 'hand', role: 'hired hand', skills: {general: skill, harvest: skill, sowing: skill}, goals: {}});
const sept = {season: 'autumn', weekday: 1} as const;

describe('labour', () => {
  it('needs several times a quiet month’s hours at harvest', () => {
    // potatoes go in during April and May and come out in September; brassicas are cut through October
    expect(workNeeded('potatoes', 9, 10)).toBeGreaterThan(3 * workNeeded('potatoes', 6, 10));
    expect(workNeeded('brassicas', 10, 10)).toBeGreaterThan(3 * workNeeded('brassicas', 7, 10));
    expect(workNeeded('potatoes', 1, 10)).toBe(0); // nothing to do in a midwinter field of potatoes
    expect(peakMonth('potatoes')).toBe(9);
    // AHDB's tables: a hectare of potatoes is tens of hours a year, of carrots a couple of hundred, of wheat a dozen
    expect(CROP_WORK.potatoes!.total).toBeGreaterThan(50);
    expect(CROP_WORK.carrots!.total).toBeGreaterThan(CROP_WORK.potatoes!.total);
    expect(CROP_WORK.wheat!.total).toBeLessThan(20);
    for (const w of Object.values(CROP_WORK)) expect(w.months.reduce((s, m) => s + m, 0)).toBeCloseTo(1, 6);
  });

  it('gives a working week of about 40 hours to a hand and more to the owner in summer, and more at the weekend to the owner only', () => {
    const week = (role: 'owner' | 'hired hand', season: 'summer' | 'winter') => hoursOver(role, {season, weekday: 0}, 7);
    expect(week('hired hand', 'summer')).toBeGreaterThan(35);
    expect(week('hired hand', 'summer')).toBeLessThan(45);
    expect(week('owner', 'summer')).toBeGreaterThan(week('hired hand', 'summer'));
    expect(week('owner', 'winter')).toBeLessThan(week('owner', 'summer'));
    expect(dayHours('hired hand', {season: 'summer', weekday: 6})).toBe(0);
    expect(dayHours('owner', {season: 'summer', weekday: 6})).toBeGreaterThan(0);
    expect(dayHours('owner', sept, {hoursCap: 4})).toBe(4); // a goal can cap the day
  });

  it('pays a hired hand about the National Living Wage plus on-costs, and a hand back only when the work would otherwise wait', () => {
    expect(wageCost('hired hand', 1)).toBeGreaterThan(14);
    expect(wageCost('hired hand', 1)).toBeLessThan(20);
    expect(WAGES['seasonal picker'].hourly).toBeGreaterThan(12); // the 2026 floor is £12.71
    expect(wageCost('owner', 100)).toBe(0);
    const ownHours = hoursOver('owner', sept, 30), handHours = hoursOver('hired hand', sept, 30);
    // a September lifting 20 ha of potatoes is more than one person can do: the hand saves work that would wait
    const busy = hireBenefit({crop: 'potatoes', demand: workNeeded('potatoes', 9, 20), ownHours, handHours});
    expect(busy.saved).toBeGreaterThan(100);
    expect(busy.net).toBeGreaterThan(0);
    // a hectare fits in the owner's hours: the hand's pay is all cost
    const quiet = hireBenefit({crop: 'potatoes', demand: workNeeded('potatoes', 9, 1), ownHours, handHours});
    expect(quiet.saved).toBe(0);
    expect(quiet.net).toBeLessThan(0);
    expect(quiet.net).toBeCloseTo(-quiet.wages);
    // a beginner owner does less of the work in the same hours, so the hand saves more
    expect(hireBenefit({crop: 'potatoes', demand: workNeeded('potatoes', 9, 10), ownHours, handHours, ownSkill: 0}).saved).toBeGreaterThan(hireBenefit({crop: 'potatoes', demand: workNeeded('potatoes', 9, 10), ownHours, handHours}).saved);
    // and the same field in a month with no potato work
    expect(hireBenefit({crop: 'potatoes', demand: workNeeded('potatoes', 1, 20), ownHours, handHours}).net).toBeLessThan(0);
  });

  it('stretches a job’s time by skill: a beginner takes about twice as long as an experienced hand', () => {
    expect(timeFactor(1)).toBe(1);
    expect(timeFactor(0)).toBe(2);
    expect(timeFactor(0.5)).toBeGreaterThan(1.2);
    expect(timeFactor(0.5)).toBeLessThan(1.5);
    // so a green hand is worth less at the same wage: half the work done in a day
    const green = fit([{id: 'lift', work: 100, kind: 'harvest'}], [hand(0)], {hand: 8}), expert = fit([{id: 'lift', work: 100, kind: 'harvest'}], [hand(1)], {hand: 8});
    expect(green.done.lift).toBeCloseTo(4);
    expect(expert.done.lift).toBeCloseTo(8);
  });

  it('shares jobs out in order, most skilled first, and leaves what doesn’t fit waiting', () => {
    const jobs = [{id: 'lift', work: 12, kind: 'harvest' as const}, {id: 'sow', work: 10, kind: 'sowing' as const}];
    const r = fit(jobs, [owner, hand(0.5)], {owner: 8, hand: 8});
    expect(r.done.lift).toBeCloseTo(12); // the owner takes eight hours of it, the hand the rest at their slower pace
    expect(r.used.owner).toBeCloseTo(8);
    expect(r.used.hand).toBeGreaterThan(4);
    const total = (r.done.lift ?? 0) + (r.done.sow ?? 0) + (r.waiting.lift ?? 0) + (r.waiting.sow ?? 0);
    expect(total).toBeCloseTo(22); // nothing lost, nothing made up
    expect(r.waiting.sow).toBeGreaterThan(0); // 16 hours between them don't cover 22 hours' work at that pace
    expect(r.used.owner! + r.used.hand!).toBeLessThanOrEqual(16 + 1e-9);
  });

  it('hands out a day’s hours from time each morning and takes the unused back', () => {
    const g: Graph = gardenGraph(), flows: Flow[] = [];
    const person = makeNode({id: 'hand', kind: 'person', name: 'Hand'});
    person.levers[WORKER] = hand(1) as never;
    g.nodes.hand = person;
    const ctx = {dt: 1, level: 3, graph: g, activity: () => {}, flow: (f: Flow) => {
      const bad = applyFlow(g, f);
      if (bad) throw new Error(bad);
      flows.push(f);
      return null;
    }};
    // the hour before the first midnight that starts a Tuesday, a working day for a hand
    let h = 17; // the game starts at 06:00, so a midnight is 18 hours in
    while (calendar(h + 1).weekday !== 1) h += 24;
    h = runStep([labour], ctx, 1, h);
    expect(calendar(h).weekday).toBe(1);
    const given = person.stocks.hours!.amount;
    expect(given).toBeGreaterThan(7);
    expect(given).toBe(dayHours('hired hand', calendar(h)));
    // the next midnight: what was unused (all of it) goes back to time, and the new day's arrives
    h = runStep([labour], ctx, 1, h + 23); // Wednesday: the hand’s hours are fresh and Tuesday’s are handed back
    expect(flows.some((f) => f.what === 'unused' && 'boundary' in f.to && f.to.boundary === 'time')).toBe(true);
    expect(person.stocks.hours!.amount).toBe(dayHours('hired hand', calendar(h)));
  });
});

describe('labour: hooks for the levels above', () => {
  const ctxOf = (g: Graph) => {
    const flows: Flow[] = [];
    const c = {dt: 24, level: 3, graph: g, activity: () => {}, flow: (f: Flow) => {
      const bad = applyFlow(g, f);
      if (bad) throw new Error(bad);
      flows.push(f);
      return null;
    }};
    return {c: c as never, flows};
  };
  /** The garden with a hand on the payroll: the kitchen's purse pays, and the hand is a person with (or without) a purse of their own. */
  const payroll = (purse: boolean) => {
    const g: Graph = gardenGraph();
    const person = makeNode({id: 'hand', kind: 'person', name: 'Hand', stocks: purse ? {money: {unit: 'GBP', amount: qty(0, 'GBP')}} : {}});
    person.levers[WORKER] = hand(1) as never;
    g.nodes.hand = person;
    g.nodes.kitchen!.stocks.money!.amount = qty(1000, 'GBP');
    g.edges.push({id: 'kitchen-hand', from: 'kitchen', to: 'hand', carries: ['GBP']});
    return {g, person};
  };

  it('takes wages as a parameter: a higher wage raises the cost, and the default is what it was', () => {
    expect(wageCost('hired hand', 10)).toBe(wageCost('hired hand', 10, WAGES));
    const higher = {...WAGES, 'hired hand': {...WAGES['hired hand'], hourly: 2 * WAGES['hired hand'].hourly}};
    expect(wageCost('hired hand', 10, higher)).toBeCloseTo(2 * wageCost('hired hand', 10), 9);
    // a dearer hand pays back less on the same work
    const own = hoursOver('owner', sept, 30), h = hoursOver('hired hand', sept, 30), o = {crop: 'potatoes', demand: workNeeded('potatoes', 9, 20), ownHours: own, handHours: h};
    expect(hireBenefit({...o, wages: higher}).wages).toBeCloseTo(2 * hireBenefit(o).wages, 9);
    expect(hireBenefit({...o, wages: higher}).net).toBeLessThan(hireBenefit(o).net);
  });

  it('raises the paid roles to a minimum wage and leaves the owner unpaid and the table it was given alone', () => {
    const before = JSON.stringify(WAGES), mw = withMinimumWage(15);
    expect(mw['hired hand'].hourly).toBe(15);
    expect(mw['seasonal picker'].hourly).toBe(15);
    expect(mw.owner.hourly).toBe(0);
    expect(mw['hired hand'].onCost).toBe(WAGES['hired hand'].onCost);
    expect(withMinimumWage(10)['hired hand'].hourly).toBe(WAGES['hired hand'].hourly); // a floor under it does nothing
    expect(wageCost('seasonal picker', 8, mw)).toBeGreaterThan(wageCost('seasonal picker', 8));
    expect(JSON.stringify(WAGES)).toBe(before);
  });

  it('pays wages as flows: the wage to the worker, the on-cost out, the purse down by the total, and the graph balances', () => {
    for (const purse of [true, false]) {
      const {g, person} = payroll(purse), {c, flows} = ctxOf(g), before = stockTotals(Object.values(g.nodes));
      const paid = payWages(c, person, 8, 'kitchen');
      expect(paid.wage).toBeCloseTo(8 * WAGES['hired hand'].hourly, 9);
      expect(paid.onCost).toBeCloseTo(paid.wage * WAGES['hired hand'].onCost, 9);
      expect(paid.total).toBeCloseTo(wageCost('hired hand', 8), 9);
      expect(g.nodes.kitchen!.stocks.money!.amount).toBeCloseTo(1000 - paid.total, 9);
      expect(person.stocks.money?.amount ?? 0).toBeCloseTo(purse ? paid.wage : 0, 9);
      expect(imbalance(before, stockTotals(Object.values(g.nodes)), flows)).toEqual({});
    }
    // a higher wage parameter raises what's paid; no hours, no purse and no worker pay nothing
    const {g, person} = payroll(true), {c} = ctxOf(g), higher = withMinimumWage(20);
    expect(payWages(c, person, 8, 'kitchen', higher).total).toBeGreaterThan(payWages(c, person, 8, 'kitchen').total);
    expect(payWages(c, person, 0, 'kitchen').total).toBe(0);
    expect(payWages(c, person, 8, 'nowhere').total).toBe(0);
    expect(payWages(c, g.nodes.kitchen!, 8, 'kitchen').total).toBe(0);
  });

  it('sends an owner off the farm to the household model’s job: it takes their weekdays and brings the pay into the purse', () => {
    const away: Worker = {...owner, goals: {offFarm: 'full'}}, part: Worker = {...owner, goals: {offFarm: 'part'}};
    const at = (w: Worker, weekday: number) => dayHours(w.role, {season: 'summer', weekday}, w.goals);
    expect(at(owner, 0)).toBe(10);
    expect(at(away, 0)).toBe(1); // ten hours, less eight at work and an hour's commute each way (the model's commute is the round trip)
    expect(at(away, 5)).toBe(6); // the weekend is the farm's
    expect(at(part, 0)).toBe(1);
    expect(at(part, 3)).toBe(10); // a part-time job is three days
    expect(hoursOver('owner', {season: 'summer', weekday: 0}, 7, away.goals)).toBeLessThan(hoursOver('owner', {season: 'summer', weekday: 0}, 7));
    // the same hours, commute and pay as the household model's member with that job
    const m = newMember('kyle', 'Kyle', 'gardener', 'full');
    for (let d = 0; d < 7; d++) {
      const day = offFarmDay('full', d);
      expect(day.hours).toBe(workHours(m, d));
      expect(day.commute).toBe(commuteHours(m, d));
      expect(day.pay).toBeCloseTo(dayWage(m, d), 9);
    }
    expect(offFarmDay('full', 0).pay).toBeGreaterThan(100); // about £118 a day take-home
    expect(offFarmDay('full', 0).pay).toBeLessThan(140);
    expect(offFarmDay('full', 6)).toEqual({hours: 0, commute: 0, pay: 0});
    expect(offFarmDay('part', 0, 0.5).pay).toBeCloseTo(offFarmDay('part', 0).pay / 2, 9);
    // the pay is income: from outside into the purse, and the graph balances
    const g: Graph = gardenGraph(), {c, flows} = ctxOf(g), before = stockTotals(Object.values(g.nodes)), purse = g.nodes.kitchen!.stocks.money!.amount;
    const pay = earnOffFarm(c, 'kitchen', 'full', 0);
    expect(pay).toBeCloseTo(offFarmDay('full', 0).pay, 9);
    expect(g.nodes.kitchen!.stocks.money!.amount).toBeCloseTo(purse + pay, 9);
    expect(imbalance(before, stockTotals(Object.values(g.nodes)), flows)).toEqual({});
    expect(earnOffFarm(c, 'kitchen', 'full', 6)).toBe(0);
    expect(earnOffFarm(c, 'nowhere', 'full', 0)).toBe(0); // no purse to take it
  });
});
