// The crop model's plausibility test: lettuce ready in about the RHS's weeks from a spring sowing, a dry spell cutting
// yield in rough proportion to Ky, frost killing beans but not radishes, a cropped bed drawing its nutrients down (only
// the eaten part's phosphorus and potassium leaving, by RB209's offtake), and a crop's coefficient raising the bed's
// evapotranspiration as it covers the ground.
import {describe, expect, it} from 'vitest';
import {CROPS} from '../../data/crops';
import {calendar, runStep, type System} from '../clock';
import {applyFlow, qty, type Flow, type Graph, type LeverValue} from '../graph';
import {createSim} from '../index';
import {gardenGraph} from '../state';
import {cropCover, cropOf, crops, plannedCrop, progress, sow, stageOf, type CropState} from './crops';
import {limitsOf, soil, SOIL} from './soil';
import {water} from './water';
import type {WeatherDay} from './weather';

const day = (dayOfYear: number, w: Partial<WeatherDay>): WeatherDay => ({
  day: 0, dayOfYear, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 15, tmin: 5, sun: 5, length: 12, zMax: 0, zMin: 0, zSun: 0, warming: 0, ...w,
});

/** Runs systems hour by hour under a fixed day's weather, with a hook each midnight; returns the flows. */
function run(g: Graph, systems: System[], days: number, w: WeatherDay, midnight?: () => void): Flow[] {
  const flows: Flow[] = [];
  const ctx = {dt: 1, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
    const bad = applyFlow(g, f);
    if (bad) throw new Error(bad);
    flows.push(f);
    return null;
  }};
  let h = 18; // midnight
  for (let d = 0; d < days; d++) {
    g.nodes.atmosphere!.levers.weather = {...w, day: calendar(h).dayIndex} as unknown as LeverValue;
    for (let i = 0; i < 24; i++) h = runStep(systems, ctx, 1, h);
    midnight?.();
  }
  return flows;
}
const sum = (flows: Flow[], what: string, node: string) =>
  flows.filter((f) => f.what === what && (('node' in f.from && f.from.node === node) || ('node' in f.to && f.to.node === node))).reduce((s, f) => s + f.amount, 0);

describe('crops', () => {
  it('brings lettuce sown in a mild spring to harvest in about the RHS’s 8 to 12 weeks', () => {
    for (const seed of [1, 2, 3]) {
      const sim = createSim(seed);
      sim.apply({type: 'plan', node: 'bed-2', lever: 'sow', value: 'lettuce'});
      sim.apply({type: 'plan', node: 'bed-2', lever: 'sowFrom', value: 91}); // 1 April
      let sown = -1, ready = -1;
      for (let h = 0; h < 24 * 200 && ready < 0; h += 24) {
        const s = sim.apply({type: 'tick', hours: 24}), c = s.nodes.find((n) => n.id === 'bed-2')!.levers.crop as unknown as CropState | null;
        if (c && sown < 0) sown = c.sown;
        if (c && stageOf(c) === 'ready') ready = s.hours;
      }
      const weeks = (ready - sown) / 24 / 7;
      expect(weeks).toBeGreaterThan(7);
      expect(weeks).toBeLessThan(12);
    }
  });

  it('cuts the yield of a crop left unwatered in a dry spell in rough proportion to Ky', () => {
    const JUNE_DRY = day(170, {tmax: 24, tmin: 12, sun: 11, length: 16.5});
    const grow = (watered: boolean) => {
      const g = gardenGraph(), bed = g.nodes['bed-1']!;
      sow(bed, 'lettuce', 0);
      const flows = run(g, [water, soil, crops], 70, JUNE_DRY, () => {
        const lim = limitsOf(bed), w = bed.stocks[SOIL.water]!.amount;
        if (watered && w < lim.fc) applyFlow(g, {what: 'watering', unit: 'L', amount: qty(lim.fc - w, 'L'), from: {boundary: 'mains'}, to: {node: 'bed-1', stock: SOIL.water}});
      });
      return {kg: sum(flows, 'ripening', 'bed-1'), et: sum(flows, 'evapotranspiration', 'bed-1')};
    };
    const wet = grow(true), dry = grow(false);
    expect(wet.kg).toBeGreaterThan(0);
    const yieldLoss = 1 - dry.kg / wet.kg, etDeficit = 1 - dry.et / wet.et;
    expect(yieldLoss).toBeGreaterThan(0.2);
    expect(yieldLoss / etDeficit).toBeGreaterThan(0.6 * CROPS.lettuce.ky);
    expect(yieldLoss / etDeficit).toBeLessThan(1.6 * CROPS.lettuce.ky);
  });

  it('lets a frost kill beans but not radishes', () => {
    const g = gardenGraph(), beans = g.nodes['bed-1']!, radish = g.nodes['bed-2']!;
    sow(beans, 'beans', 0);
    sow(radish, 'radish', 0);
    run(g, [water, soil, crops], 20, day(150, {tmax: 20, tmin: 12, sun: 8, length: 16})); // up and growing
    expect(stageOf(cropOf(beans)!)).toBe('growing');
    expect(stageOf(cropOf(radish)!)).toBe('growing');
    // a clear night at −2 °C: the grass (and the seedlings) well below freezing before dawn
    const flows = run(g, [water, soil, crops], 1, day(151, {tmax: 9, tmin: -2, sun: 10, length: 16}));
    expect(cropOf(beans)).toBeNull(); // killed, and cleared to residue at the day's end
    expect(sum(flows, 'residue', 'bed-1')).toBeGreaterThan(0);
    expect(stageOf(cropOf(radish)!)).toBe('growing');
    expect(cropOf(radish)!.dead).toBeUndefined();
  });

  it('sets potatoes back with a frost on their tops while growing, but makes no second crop once they’re ready', () => {
    const g = gardenGraph(), bed = g.nodes['bed-1']!, FROSTY = day(290, {tmax: 8, tmin: -2, sun: 8, length: 10.5});
    sow(bed, 'potatoes', 0);
    run(g, [water, soil, crops], 30, day(170, {tmax: 22, tmin: 12, sun: 8, length: 16.5, wet: true, rain: 5, rainFrom: 2, rainHours: 3}));
    const growing = cropOf(bed)!;
    expect(stageOf(growing)).toBe('growing');
    run(g, [water, soil, crops], 1, FROSTY);
    expect(cropOf(bed)!.hurt).toBeCloseTo(0.1);
    run(g, [water, soil, crops], 60, day(170, {tmax: 22, tmin: 12, sun: 8, length: 16.5, wet: true, rain: 5, rainFrom: 2, rainHours: 3}));
    const ready = cropOf(bed)!;
    expect(stageOf(ready)).toBe('ready');
    const flows = run(g, [water, soil, crops], 10, FROSTY);
    expect(sum(flows, 'ripening', 'bed-1')).toBe(0);
    expect(cropOf(bed)!.made).toBe(ready.made);
  });

  it('draws a bed’s nutrients down over a year of cropping, against the same bed left bare', () => {
    const year = (plan: string) => {
      const sim = createSim(2);
      sim.apply({type: 'plan', node: 'bed-2', lever: 'sow', value: plan});
      let uptake = 0;
      for (let d = 0; d < 365; d++) uptake += sim.apply({type: 'tick', hours: 24}).flows.filter((f) => f.what === 'uptake' && f.unit === 'kgN' && 'node' in f.from && f.from.node === 'bed-2' && f.from.stock === SOIL.nitrate).reduce((s, f) => s + f.amount, 0);
      const bed = sim.snapshot().nodes.find((n) => n.id === 'bed-2')!;
      return {uptake, p: bed.stocks[SOIL.phosphorus]!.amount, k: bed.stocks[SOIL.potassium]!.amount};
    };
    const cropped = year('rotation'), bare = year('none');
    // about RB209's size: a few crops of 60–160 kg N a hectare over the bed's 3 m²
    expect(cropped.uptake * 1e4 / 3).toBeGreaterThan(60);
    expect(cropped.uptake * 1e4 / 3).toBeLessThan(400);
    expect(bare.uptake).toBe(0);
    expect(cropped.p).toBeLessThan(bare.p);
    expect(cropped.k).toBeLessThan(bare.k);
  });

  it('takes only the eaten part’s phosphorus and potassium away as food, and sends the rest to the heap with the residue', () => {
    const sim = createSim(2);
    const pk = () => sim.snapshot().nodes.reduce((s, n) => s + Object.values(n.stocks).filter((x) => x.unit === 'kgP').reduce((t, x) => t + x.amount, 0), 0);
    const start = pk();
    let food = 0, held = 0, back = 0, spread = 0;
    for (let d = 0; d < 365; d++) {
      for (const f of sim.apply({type: 'tick', hours: 24}).flows) {
        if (f.unit !== 'kgP') continue;
        if (f.what === 'uptake' && 'boundary' in f.to) food += f.amount;
        if (f.what === 'residue') held += f.amount;
        if ('boundary' in f.from) back += f.amount; // the kitchen's scraps, from the produce that left as food
        if (f.what === 'compost') spread += f.amount;
      }
    }
    // of what the finished crops took, their harvest indexes (a half to four fifths) left as food, the rest with the residue
    expect(food / (food + held)).toBeGreaterThan(0.45);
    expect(food / (food + held)).toBeLessThan(0.8);
    // conserved: the garden's phosphorus falls by what left as food, less what came back as scraps
    expect(start - pk()).toBeCloseTo(food - back, 9);
    // and the heap has handed some of it back to the beds
    expect(spread).toBeGreaterThan(0.1 * held);
  });

  it('covers the ground as it grows, raising the bed’s coefficient to mid-season’s and its evapotranspiration with it', () => {
    const g = gardenGraph(), bed = g.nodes['bed-1']!;
    sow(bed, 'potatoes', 0);
    expect(cropCover(bed)).toBeNull();
    run(g, [water, soil, crops], 90, day(170, {tmax: 22, tmin: 11, sun: 8, length: 16.5, wet: true, rain: 6, rainFrom: 2, rainHours: 3}));
    const c = cropCover(bed)!;
    expect(c.cover).toBe(1);
    expect(c.kc).toBeGreaterThan(1);
    expect(progress(cropOf(bed)!)).toBe(1);
  });

  it('opens the game with overwintered salad leaves in bed 1, cut in the first week, and bed 2 bare for the first sowing', () => {
    for (const seed of [1, 2, 3]) {
      const sim = createSim(seed), start = sim.snapshot(), c = start.nodes.find((n) => n.id === 'bed-1')!.levers.crop as unknown as CropState;
      expect(c.id).toBe('salad');
      expect(c.sown).toBeLessThan(-24 * 150); // sown last autumn
      expect(stageOf(c)).toBe('growing');
      expect(start.nodes.find((n) => n.id === 'bed-2')!.levers.crop).toBeNull();
      for (let d = 0; d < 7; d++) sim.apply({type: 'tick', hours: 24});
      expect(sim.snapshot().kitchen!.firstHarvest).not.toBeNull();
      expect(sim.snapshot().kitchen!.firstHarvest!).toBeLessThan(24 * 7);
    }
  });

  it('follows the rotation to the next family in season', () => {
    const g = gardenGraph(), bed = g.nodes['bed-1']!;
    bed.levers.sow = 'rotation';
    const date = (m: number, d: number) => calendar((Date.UTC(2027, m - 1, d, 12) - Date.UTC(2027, 2, 15, 6)) / 3600e3);
    expect(plannedCrop(bed, date(3, 20))).toBe('salad'); // nothing grown yet: the first family in season
    bed.levers.history = ['brassica'];
    expect(plannedCrop(bed, date(4, 10))).toBe('potatoes');
    bed.levers.history = ['legume'];
    expect(plannedCrop(bed, date(6, 1))).toBe('salad');
    bed.levers.history = ['solanum'];
    expect(plannedCrop(bed, date(6, 1))).toBe('lettuce');
    bed.levers.history = ['daisy'];
    expect(plannedCrop(bed, date(6, 1))).toBe('beans');
    bed.levers.sow = 'tomatoes';
    expect(plannedCrop(bed, date(4, 1))).toBeNull(); // out of season: waits
  });
});
