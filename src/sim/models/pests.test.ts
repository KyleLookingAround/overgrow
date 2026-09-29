// The pest model's plausibility test: slugs rising after a wet week and doing most of their damage to seedlings, aphids
// building on beans in a warm June and falling where flowers keep ladybirds, a Smith period starting blight that takes
// most of an unsprayed potato bed's tops, the policy's treatments cutting pests fast (and the wildlife with them), and
// the Smith-period stand-in for humidity finding a few Smith periods a summer at the garden’s station and hardly any in spring.
import {describe, expect, it} from 'vitest';
import {calendar, runStep, type System, type TickContext} from '../clock';
import {applyFlow, qty, type Flow, type Graph, type GraphNode, type LeverValue} from '../graph';
import {gardenGraph} from '../state';
import {biodiversity, wildlifeOf} from './biodiversity';
import {cropOf, sow, type CropState} from './crops';
import {APHID_KEY, aphidsOn, control, pests, pestsOf, SLUG_KEY, slugsOn, smithDay} from './pests';
import {soil} from './soil';
import {water} from './water';
import {nextDay, type WeatherDay} from './weather';
import {rng} from '../random';

const day = (dayOfYear: number, w: Partial<WeatherDay>): WeatherDay => ({
  day: 0, dayOfYear, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 15, tmin: 5, sun: 5, length: 12, zMax: 0, zMin: 0, zSun: 0, warming: 0, ...w,
});

/** Game hours at midnight starting a day of the game's first year (day 0 is 15 March). */
const midnight = (dayIndex: number) => dayIndex * 24 - 6;
const JUNE_1 = 78, JULY_1 = 108;

function context(g: Graph, flows: Flow[] = []) {
  return {dt: 1, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
    const bad = applyFlow(g, f);
    if (bad) throw new Error(bad);
    flows.push(f);
    return null;
  }};
}
/** Runs systems hour by hour under a fixed day's weather from a day of the year; returns the flows. */
function run(g: Graph, systems: System[], from: number, days: number, w: WeatherDay, each?: () => void): Flow[] {
  const flows: Flow[] = [], ctx = context(g, flows);
  let h = midnight(from);
  for (let d = 0; d < days; d++) {
    g.nodes.atmosphere!.levers.weather = {...w, day: calendar(h).dayIndex} as unknown as LeverValue;
    for (let i = 0; i < 24; i++) h = runStep(systems, ctx, 1, h);
    each?.();
  }
  return flows;
}
/** A crop in a bed, a share of the way to its first harvest. */
function growing(n: GraphNode, id: CropState['id'], dd: number) {
  sow(n, id, 0);
  n.levers.crop = {...cropOf(n)!, dd} as unknown as LeverValue;
}
const setStock = (n: GraphNode, key: string, product: string, amount: number) =>
  void (n.stocks[key] = {unit: 'pests', amount: qty(amount, 'pests'), product});
const allSlugs = (g: Graph) => Object.values(g.nodes).reduce((s, n) => s + slugsOn(n), 0);

const WET_APRIL = day(20, {wet: true, rain: 8, rainFrom: 16, rainHours: 8, tmax: 12, tmin: 7, sun: 2, length: 13});
const DRY_APRIL = day(20, {tmax: 17, tmin: 5, sun: 10, length: 13});

describe('pests', () => {
  it('has slugs rise after a wet week, far more than after a dry one', () => {
    const week = (w: WeatherDay) => {
      const g = gardenGraph(), before = allSlugs(g);
      run(g, [water, soil, pests], 20, 7, w);
      return allSlugs(g) / before;
    };
    const wet = week(WET_APRIL), dry = week(DRY_APRIL);
    expect(wet).toBeGreaterThan(1.1);
    expect(wet - 1).toBeGreaterThan(2 * (dry - 1));
  });

  it('does most of its slug damage to seedlings: a wet week takes far more of a seedling bed than of a grown one', () => {
    const lost = (dd: number) => {
      const g = gardenGraph(), bed = g.nodes['bed-2']!;
      growing(bed, 'lettuce', dd);
      setStock(bed, SLUG_KEY, 'slugs', 20);
      run(g, [pests], 20, 7, WET_APRIL);
      return cropOf(bed)!.lost;
    };
    const seedlings = lost(70), grown = lost(400);
    expect(seedlings).toBeGreaterThan(0.1); // a real share of the stand gone in a week
    expect(seedlings).toBeGreaterThan(5 * grown);
  });

  it('builds aphids on beans in a warm June, and holds them down where flowers keep ladybirds', () => {
    const JUNE = day(160, {tmax: 23, tmin: 12, sun: 9, length: 16.5});
    const aphids = (flowers: boolean) => {
      const g = gardenGraph(), bed = g.nodes['bed-1']!;
      growing(bed, 'beans', 200);
      if (flowers) g.nodes['bed-2']!.levers.border = {id: 'marigolds', planted: 0, dd: 400} as unknown as LeverValue;
      const counts: number[] = [];
      run(g, [biodiversity, pests], JUNE_1, 28, JUNE, () => counts.push(aphidsOn(bed)));
      return {counts, g};
    };
    const bare = aphids(false), kept = aphids(true);
    expect(bare.counts[27]!).toBeGreaterThan(1500); // hundreds a m² on 3 m² of beans
    expect(bare.counts[27]!).toBeGreaterThan(bare.counts[13]!);
    expect(kept.counts[27]!).toBeLessThan(bare.counts[27]! / 3);
    expect(wildlifeOf(kept.g).ladybirds).toBeGreaterThan(1.5 * wildlifeOf(bare.g).ladybirds);
    // and a colony already there falls once the ladybirds are about
    const g = gardenGraph(), bed = g.nodes['bed-1']!;
    growing(bed, 'beans', 200);
    g.nodes['bed-2']!.levers.border = {id: 'marigolds', planted: 0, dd: 400} as unknown as LeverValue;
    run(g, [biodiversity], JUNE_1, 10, JUNE); // the ladybirds gather first
    setStock(bed, APHID_KEY, 'aphids', 600);
    run(g, [biodiversity, pests], JUNE_1 + 10, 14, day(170, {tmax: 20, tmin: 11, sun: 7, length: 16.5}));
    expect(aphidsOn(bed)).toBeLessThan(600);
  });

  it('starts blight in a Smith period and takes a large share of an unsprayed potato bed’s tops', () => {
    const MUGGY = day(190, {wet: true, rain: 6, rainFrom: 4, rainHours: 12, tmax: 18, tmin: 13, sun: 1, length: 16});
    expect(smithDay(MUGGY)).toBe(true);
    const blight = (sprayed: boolean) => {
      const g = gardenGraph(), bed = g.nodes['bed-1']!;
      growing(bed, 'potatoes', 450);
      if (sprayed) bed.levers.pests = {...pestsOf(bed), fungicide: 1e9} as unknown as LeverValue;
      const sev: number[] = [];
      run(g, [pests], JULY_1, 21, MUGGY, () => sev.push(pestsOf(bed).blight));
      return {sev, lost: cropOf(bed)!.lost};
    };
    const bare = blight(false), sprayed = blight(true);
    expect(bare.sev[0]).toBe(0); // one Smith day isn't a Smith period
    expect(bare.sev[1]!).toBeGreaterThan(0);
    expect(bare.sev[20]!).toBeGreaterThan(0.6); // most of the tops blighted in three weeks
    expect(bare.lost).toBeGreaterThan(0.25); // and the tubers still to come with them
    expect(sprayed.sev[20]!).toBeLessThan(bare.sev[20]! / 3);
  });

  it('finds a few Smith periods a summer at the garden’s station, and hardly any in spring', () => {
    let summer = 0, spring = 0, prev: WeatherDay | null = null;
    const r = rng(11);
    for (let y = 0; y < 20; y++)
      for (let d = 0; d < 365; d++) {
        const date = calendar(24 * (y * 365 + d));
        const w: WeatherDay = nextDay(prev, date, 0, r);
        const was = prev;
        prev = w;
        if (!was || !smithDay(w) || !smithDay(was)) continue;
        if (date.month >= 6 && date.month <= 9) summer++;
        if (date.month >= 3 && date.month <= 4) spring++;
      }
    expect(summer / 20).toBeGreaterThan(2);
    expect(summer / 20).toBeLessThan(40);
    expect(spring / 20).toBeLessThan(0.5);
  });

  it('cuts pests fast with a treatment, and the wildlife with it', () => {
    const JUNE = day(160, {tmax: 22, tmin: 12, sun: 9, length: 16.5});
    const g = gardenGraph(), bed = g.nodes['bed-1']!;
    growing(bed, 'beans', 200);
    g.nodes['bed-2']!.levers.border = {id: 'marigolds', planted: 0, dd: 400} as unknown as LeverValue;
    run(g, [biodiversity], JUNE_1, 14, JUNE);
    setStock(bed, APHID_KEY, 'aphids', 3000);
    const before = wildlifeOf(g), ctx = {...context(g), tick: 'hour', hours: midnight(JUNE_1 + 14), date: calendar(midnight(JUNE_1 + 14)), rng: rng(1)} as TickContext;
    control(ctx, 'bed-1', 'aphids', 'treat');
    expect(aphidsOn(bed)).toBeLessThan(400);
    expect(wildlifeOf(g).ladybirds).toBeLessThan(before.ladybirds * 0.5);
    expect(wildlifeOf(g).bees).toBeLessThan(before.bees * 0.8);
    // pellets: a wet night with them takes far more slugs than one without
    const night = (pellets: boolean) => {
      const h = gardenGraph(), b = h.nodes['bed-2']!;
      setStock(b, SLUG_KEY, 'slugs', 30);
      if (pellets) control({...context(h), tick: 'hour', hours: midnight(20), date: calendar(midnight(20)), rng: rng(1)} as TickContext, 'bed-2', 'slugs', 'treat');
      run(h, [pests], 20, 1, WET_APRIL);
      return slugsOn(b);
    };
    expect(night(true)).toBeLessThan(night(false) * 0.75);
  });
});
