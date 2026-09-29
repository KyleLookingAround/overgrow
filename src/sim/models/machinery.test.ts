// The machinery model's plausibility test: ploughing a hectare burns about what energy audits find and takes a small
// fraction of the hand hours; an old, unserviced tractor breaks down far more often than a serviced one and a broken job
// leaves work waiting; repairs cost about ASABE's rate; wheelings on wet ground compact a soil, cutting its structure and
// yield, and dry ground takes a twentieth of the damage; compaction fades over years.
import {describe, expect, it} from 'vitest';
import {runStep} from '../clock';
import {applyFlow, makeNode, type Flow, type Graph, type LeverValue} from '../graph';
import {rng} from '../random';
import {gardenGraph} from '../state';
import {structure} from './soil';
import {
  breakdownChance, COMPACTION_LEVER, compactedStructure, compactionOf, expectedRepairPerHour, handHours, hazardPerHour, jobOf, machinery, operate, recovered,
  service, TRACTOR, tractorOf, usedTractor, wetnessOf, wheelings, wheelRisk, work, yieldFactor,
} from './machinery';

function context(g: Graph, dt = 24) {
  const flows: Flow[] = [];
  const ctx = {dt, level: 3, graph: g, rng: rng(5), activity: () => {}, flow: (f: Flow) => {
    const bad = applyFlow(g, f);
    if (bad) throw new Error(bad);
    flows.push(f);
    return null;
  }};
  return {ctx, flows};
}

describe('machinery', () => {
  it('burns roughly the audited litres ploughing a hectare, in a fraction of the hand hours', () => {
    const j = jobOf('plough', 1);
    expect(j.litres).toBeGreaterThan(18); // energy audits: 20–28 L/ha for ploughing, 5–8 drilling, about 1.5 spraying, 15–20 combining
    expect(j.litres).toBeLessThan(30);
    expect(jobOf('drill', 1).litres).toBeGreaterThan(5);
    expect(jobOf('drill', 1).litres).toBeLessThan(10);
    expect(jobOf('spray', 1).litres).toBeLessThan(3);
    expect(jobOf('harvest', 1).litres).toBeGreaterThan(14);
    expect(jobOf('harvest', 1).litres).toBeLessThan(24);
    expect(j.hours).toBeGreaterThan(1);
    expect(j.hours).toBeLessThan(2);
    expect(handHours('plough', 1)).toBeGreaterThan(100 * j.hours); // a tractor does a spade's month in a day
  });

  it('breaks down far more often when old and unserviced, and a broken job leaves work waiting', () => {
    const old = {...usedTractor(), ageYears: 20, hoursSinceService: 600}, fresh = {...old, hoursSinceService: 20};
    expect(hazardPerHour(old)).toBeGreaterThan(5 * hazardPerHour(fresh));
    expect(hazardPerHour(fresh)).toBeGreaterThan(hazardPerHour({...fresh, ageYears: 2}));
    expect(breakdownChance(old, 11)).toBeGreaterThan(0.2); // a ten-hectare harvest: about one in three
    expect(breakdownChance(fresh, 11)).toBeLessThan(0.1);
    const R = rng(11), runs = 2000;
    let a = 0, b = 0;
    for (let i = 0; i < runs; i++) {
      if (work(old, 'harvest', 10, R).broke) a++;
      if (work(fresh, 'harvest', 10, R).broke) b++;
    }
    expect(a).toBeGreaterThan(3 * b);
    expect(a / runs).toBeGreaterThan(0.2);
    expect(a / runs).toBeLessThan(0.5);
    // when one breaks: part of the field is done, a repair bill comes and it's down for one to three days
    let broken = work(old, 'harvest', 10, R);
    while (!broken.broke) broken = work(old, 'harvest', 10, R);
    expect(broken.hectares).toBeLessThan(10);
    expect(broken.days).toBeGreaterThanOrEqual(1);
    expect(broken.days).toBeLessThanOrEqual(3);
    expect(broken.repair).toBeGreaterThan(100);
    expect(broken.repair).toBeLessThan(1500);
    expect(broken.tractor.downDays).toBe(broken.days);
    // wear: the hours it worked are on the clock and since its service
    expect(broken.tractor.hoursSinceService).toBeCloseTo(old.hoursSinceService + broken.hours);
    // a tractor that is down doesn't break again
    expect(work({...old, downDays: 2}, 'harvest', 10, R).broke).toBe(false);
  });

  it('costs repairs at about ASABE’s rate', () => {
    const t = usedTractor(); // 5,000 hours on a £60,000 machine: ASABE puts the marginal repair spend at £4 or so an hour
    expect(expectedRepairPerHour(t)).toBeGreaterThan(2);
    expect(expectedRepairPerHour(t)).toBeLessThan(8);
    // the game's own hazard × bill gives the same order of size
    const own = hazardPerHour(t) * 250 * (1 + t.ageYears / 10);
    expect(own).toBeGreaterThan(expectedRepairPerHour(t) / 4);
    expect(own).toBeLessThan(expectedRepairPerHour(t) * 4);
  });

  it('compacts wet ground far more than dry, cutting structure and yield, and fades over years', () => {
    const wet = wheelings(0, 'plough', 3.5, 1.05, 3), dry = wheelings(0, 'plough', 3.5, 0.5, 3);
    expect(wheelRisk(1.2)).toBe(1);
    expect(wheelRisk(0.5)).toBeLessThan(0.1);
    expect(wet).toBeGreaterThan(8);
    expect(wet).toBeGreaterThan(10 * dry);
    expect(wheelings(wet, 'plough', 3.5, 1.05, 3)).toBeGreaterThan(wet); // and again
    expect(wheelings(99, 'plough', 3.5, 1.05, 50)).toBeLessThanOrEqual(100);
    // the soil's structure (from part 2's organic carbon to clay ratio) is less by the same share
    const bed = gardenGraph().nodes['bed-1']!, s = structure(bed);
    expect(s).toBeGreaterThan(0);
    expect(compactedStructure(s, wet)).toBeLessThan(s);
    expect(compactedStructure(s, wet)).toBeCloseTo(s * (1 - wet / 100));
    expect(compactedStructure(s, 0)).toBe(s);
    // and so yield: Håkansson & Reeder's 10–15 % for a compacted field
    expect(yieldFactor(0)).toBe(1);
    expect(yieldFactor(40)).toBeGreaterThan(0.85);
    expect(yieldFactor(40)).toBeLessThan(0.92);
    expect(yieldFactor(wet)).toBeLessThan(1);
    // half in five years
    expect(recovered(40, 5 * 365)).toBeCloseTo(20, 1);
    expect(recovered(40, 60)).toBeGreaterThan(39);
  });

  it('reads a bed’s wetness from its water over field capacity', () => {
    const bed = gardenGraph().nodes['bed-1']!;
    bed.stocks.water!.amount = (bed.stocks.water!.amount * 0) as never;
    expect(wetnessOf(bed)).toBe(0);
    bed.stocks.water!.amount = 1e6 as never;
    expect(wetnessOf(bed)).toBeGreaterThan(1);
  });

  it('works a field on the graph: diesel burnt, wheels compact it wet and not dry, a repair paid and the tractor kept', () => {
    const g = gardenGraph(), {ctx, flows} = context(g);
    const shed = g.nodes.shed!, wetBed = g.nodes['bed-1']!, dryBed = g.nodes['bed-2']!;
    shed.levers[TRACTOR] = {...usedTractor(), ageYears: 2, hours: 300, hoursSinceService: 10} as unknown as LeverValue;
    wetBed.stocks.water!.amount = 1e6 as never;
    dryBed.stocks.water!.amount = 0 as never;
    const money = g.nodes.kitchen!.stocks.money!.amount;
    const o = operate(ctx as never, shed, wetBed, 'plough', 1, 'kitchen')!;
    expect(o.litres).toBeGreaterThan(0);
    expect(flows.find((f) => f.what === 'ploughing' && f.unit === 'kgCO2e')!.amount).toBeGreaterThan(50); // 24 L of diesel is 65 kg
    expect(g.nodes.kitchen!.stocks.money!.amount).toBeLessThan(money);
    expect(compactionOf(wetBed)).toBeGreaterThan(3);
    operate(ctx as never, shed, dryBed, 'plough', 1, 'kitchen');
    expect(compactionOf(dryBed)).toBeLessThan(compactionOf(wetBed) / 10);
    expect(tractorOf(shed)!.hours).toBeGreaterThan(300);
    // a servicing resets the hours and costs the same as the service
    expect(service(ctx as never, shed, 'kitchen')).toBe(true);
    expect(tractorOf(shed)!.hoursSinceService).toBe(0);
    // no tractor, no work
    expect(operate(ctx as never, g.nodes.kitchen!, wetBed, 'plough', 1)).toBeNull();
  });

  it('fades compaction and mends a broken tractor over the days', () => {
    const g = gardenGraph(), {ctx} = context(g);
    const bed = g.nodes['bed-1']!, shed = g.nodes.shed!;
    bed.levers[COMPACTION_LEVER] = 40;
    shed.levers[TRACTOR] = {...usedTractor(), downDays: 3} as unknown as LeverValue;
    let h = 23;
    for (let d = 0; d < 365; d++) h = runStep([machinery], ctx, 1, h + (d ? 23 : 0));
    expect(compactionOf(bed)).toBeLessThan(40);
    expect(compactionOf(bed)).toBeGreaterThan(30); // a year takes about a seventh off
    expect(tractorOf(shed)!.downDays).toBe(0);
    // a pure node with none of either is left alone
    expect(makeNode({id: 'x', kind: 'x', name: 'x'}).levers).toEqual({});
  });
});
