// The water balance's plausibility test: reference evapotranspiration of the right size by season, a bare bed drying
// faster in a hot dry week than a cool wet one, draining above field capacity, running off when full, grass drying
// deeper than bare soil, and the butt filling from the roof and overflowing.
import {describe, expect, it} from 'vitest';
import {ROOF} from '../../data/garden';
import {runStep, type System} from '../clock';
import {applyFlow, type Flow, type Graph, type LeverValue} from '../graph';
import {rng} from '../random';
import {gardenGraph} from '../state';
import {limitsOf, soil} from './soil';
import {et0, et0Hargreaves, et0PenmanMonteith, water} from './water';
import {nextDay, weather, type WeatherDay} from './weather';

const PHYSICAL = [weather, water, soil];

/** A day's weather held fixed, as the generator would store it. */
const day = (dayOfYear: number, w: Partial<WeatherDay>): WeatherDay => ({
  day: 0, dayOfYear, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 15, tmin: 5, sun: 5, length: 12, zMax: 0, zMin: 0, zSun: 0, warming: 0, ...w,
});
const JULY_HOT = day(196, {tmax: 27, tmin: 14, sun: 13, length: 16});
const NOVEMBER_WET = day(320, {tmax: 9, tmin: 4, sun: 1, length: 9, wet: true, rain: 5, rainFrom: 6, rainHours: 6});

/** Runs systems hour by hour on a graph under a fixed day's weather, returning the flows they moved. */
function run(g: Graph, systems: System[], hours: number, w: WeatherDay): Flow[] {
  const flows: Flow[] = [];
  g.nodes.atmosphere!.levers.weather = w as unknown as LeverValue;
  const ctx = {dt: 1, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
    const bad = applyFlow(g, f);
    if (bad) throw new Error(bad);
    flows.push(f);
    return null;
  }};
  let h = 18; // midnight
  for (let i = 0; i < hours; i++) h = runStep(systems, ctx, 1, h);
  return flows;
}
const total = (flows: Flow[], what: string, node?: string) =>
  flows.filter((f) => f.what === what && (!node || ('node' in f.from && f.from.node === node) || ('node' in f.to && f.to.node === node))).reduce((s, f) => s + f.amount, 0);
const litres = (g: Graph, id: string) => g.nodes[id]!.stocks.water!.amount;

describe('water', () => {
  it('gives reference evapotranspiration of the right size by season, Penman-Monteith and Hargreaves agreeing roughly', () => {
    expect(et0PenmanMonteith(JULY_HOT)).toBeGreaterThan(4); // a hot sunny July day in southern England: 4–6 mm
    expect(et0PenmanMonteith(JULY_HOT)).toBeLessThan(6.5);
    const jan = day(15, {tmax: 7, tmin: 2, sun: 2, length: 8});
    expect(et0PenmanMonteith(jan)).toBeLessThan(0.8);
    const june = day(172, {tmax: 21, tmin: 11, sun: 7, length: 16.5});
    expect(et0Hargreaves(june) / et0PenmanMonteith(june)).toBeGreaterThan(0.7);
    expect(et0Hargreaves(june) / et0PenmanMonteith(june)).toBeLessThan(1.4);
    expect(et0({...june, sun: NaN})).toBeCloseTo(et0Hargreaves(june)); // no sunshine to go on: Hargreaves
    // a generated year at the station: FAO-56's grass reference for lowland southern England is about 550–700 mm
    const r = rng(2);
    let prev: WeatherDay | null = null, year = 0;
    for (let i = 0; i < 365; i++) year += et0((prev = nextDay(prev, {dayIndex: i, dayOfYear: i + 1, month: Math.min(12, 1 + Math.floor(i / 30.5))}, 0, r)));
    expect(year).toBeGreaterThan(420);
    expect(year).toBeLessThan(760);
  });

  it('dries a bare bed faster in a hot dry week than a cool wet one', () => {
    const hot = gardenGraph(), cool = gardenGraph(), start = litres(hot, 'bed-1');
    run(hot, [water], 24 * 7, JULY_HOT);
    run(cool, [water], 24 * 7, NOVEMBER_WET);
    const lostHot = start - litres(hot, 'bed-1'), lostCool = start - litres(cool, 'bed-1');
    expect(lostHot).toBeGreaterThan(3 * 6); // a few mm a day off its 3 m²
    expect(lostHot).toBeGreaterThan(3 * Math.max(0, lostCool));
    expect(litres(cool, 'bed-1')).toBeGreaterThan(limitsOf(cool.nodes['bed-1']!).fc - 5); // the wet week keeps it at field capacity
  });

  it('drains what passes field capacity below the roots, and runs off what the soil can’t take', () => {
    const g = gardenGraph(), bed = g.nodes['bed-1']!, lim = limitsOf(bed);
    const storm = day(300, {tmax: 12, tmin: 8, sun: 0, wet: true, rain: 30, rainFrom: 0, rainHours: 6});
    const flows = run(g, [water], 48, {...storm});
    expect(total(flows, 'rain', 'bed-1')).toBeCloseTo(30 * 3 * 2); // two days of 30 mm on 3 m²
    expect(total(flows, 'drainage', 'bed-1')).toBeGreaterThan(100);
    expect(litres(g, 'bed-1')).toBeLessThan(lim.fc + 0.2 * (lim.sat - lim.fc));
    // a soil at saturation sheds a downpour
    bed.stocks.water!.amount = lim.sat as never;
    const burst = run(g, [water], 2, day(300, {tmax: 12, tmin: 8, sun: 0, wet: true, rain: 40, rainFrom: 0, rainHours: 1}));
    expect(total(burst, 'runoff', 'bed-1')).toBeGreaterThan(40 * 3 * 0.5);
  });

  it('lets grass dry deeper than bare soil in a long dry spell', () => {
    const g = gardenGraph();
    // bed 3 is under grass and bed 1 bare: give them the same soil water to start
    for (const id of ['bed-1', 'bed-3']) g.nodes[id]!.stocks.water!.amount = limitsOf(g.nodes[id]!).fc as never;
    run(g, [water], 24 * 30, JULY_HOT);
    const left = (id: string) => {
      const lim = limitsOf(g.nodes[id]!);
      return (litres(g, id) - lim.wp) / (lim.fc - lim.wp);
    };
    expect(left('bed-3')).toBeLessThan(left('bed-1') - 0.2); // bare soil seals itself once the top dries (FAO-56's TEW)
    expect(left('bed-3')).toBeGreaterThanOrEqual(-0.01); // and nothing dries past wilting point
  });

  it('keeps the same balance at a day’s, a week’s and a month’s step as at an hour’s, with no downpour made of a week', () => {
    const year = (dt: number) => {
      const g = gardenGraph(), flows: Flow[] = [];
      const ctx = {dt, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
        const bad = applyFlow(g, f);
        if (bad) throw new Error(bad);
        flows.push(f);
        return null;
      }};
      // the weather, water and soil alone: the gardener's watering is the garden's, at an hour's step
      for (let h = 0; h < 24 * 365 * 10; ) h = runStep(PHYSICAL, ctx, 4, h);
      const mm = (what: string) => total(flows, what, 'bed-1') / 3 / 10;
      return {rain: mm('rain'), et: mm('evapotranspiration'), drainage: mm('drainage'), runoff: mm('runoff')};
    };
    const hourly = year(1);
    for (const dt of [24, 168, 730]) {
      const y = year(dt);
      // each step length draws its own dice, so a decade's rain differs by chance: compare what becomes of it
      expect(y.rain / hourly.rain).toBeGreaterThan(0.85);
      expect(y.rain / hourly.rain).toBeLessThan(1.15);
      expect(y.et / hourly.et).toBeGreaterThan(0.85);
      expect(y.et / hourly.et).toBeLessThan(1.15);
      expect(y.drainage / y.rain / (hourly.drainage / hourly.rain)).toBeGreaterThan(0.85);
      expect(y.drainage / y.rain / (hourly.drainage / hourly.rain)).toBeLessThan(1.15);
      expect(y.runoff).toBeLessThan(10);
    }
  });

  it('fills the butt from the shed roof and overflows once it’s full', () => {
    const g = gardenGraph(), butt = g.nodes.butt!.stocks.water!;
    const flows = run(g, [water], 24, day(300, {sun: 0, wet: true, rain: 20, rainFrom: 0, rainHours: 10}));
    expect(total(flows, 'rain', 'butt')).toBeCloseTo(20 * ROOF.m2 * ROOF.runoff);
    expect(butt.amount).toBeCloseTo(100 + 20 * ROOF.m2 * ROOF.runoff);
    run(g, [water], 24 * 3, day(300, {sun: 0, wet: true, rain: 30, rainFrom: 0, rainHours: 10}));
    expect(butt.amount).toBeCloseTo(butt.cap!);
  });
});
