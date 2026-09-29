// The biodiversity model's plausibility test: flowers in bloom bring more bees and ladybirds; they raise a bean crop's
// yield by Klein et al.'s rough size for a "little" dependent crop (a few per cent, never more than ten) and do nothing
// for a crop that isn't pollinated; a border dies in a frost; a spray's knock to the wildlife wears off over weeks.
import {describe, expect, it} from 'vitest';
import {calendar, runStep, type System} from '../clock';
import {applyFlow, type Flow, type Graph, type GraphNode, type LeverValue} from '../graph';
import {gardenGraph} from '../state';
import {biodiversity, bloom, borderOf, knock, wildlifeOf} from './biodiversity';
import {cropOf, crops, sow} from './crops';
import type {WeatherDay} from './weather';

const day = (dayOfYear: number, w: Partial<WeatherDay>): WeatherDay => ({
  day: 0, dayOfYear, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 15, tmin: 5, sun: 5, length: 12, zMax: 0, zMin: 0, zSun: 0, warming: 0, ...w,
});
const midnight = (dayIndex: number) => dayIndex * 24 - 6;
const JUNE_15 = 92;

function run(g: Graph, systems: System[], from: number, days: number, w: WeatherDay): Flow[] {
  const flows: Flow[] = [];
  const ctx = {dt: 1, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
    const bad = applyFlow(g, f);
    if (bad) throw new Error(bad);
    flows.push(f);
    return null;
  }};
  let h = midnight(from);
  for (let d = 0; d < days; d++) {
    g.nodes.atmosphere!.levers.weather = {...w, day: calendar(h).dayIndex} as unknown as LeverValue;
    for (let i = 0; i < 24; i++) h = runStep(systems, ctx, 1, h);
  }
  return flows;
}
const border = (n: GraphNode, dd = 400) => void (n.levers.border = {id: 'marigolds', planted: 0, dd} as unknown as LeverValue);
const SUMMER = day(170, {tmax: 23, tmin: 13, sun: 9, length: 16.5});

describe('biodiversity', () => {
  it('brings more bees and ladybirds with flowers in bloom', () => {
    const about = (flowers: boolean) => {
      const g = gardenGraph();
      if (flowers) {
        border(g.nodes['bed-1']!);
        border(g.nodes['bed-2']!);
        border(g.nodes['bed-3']!);
      }
      run(g, [biodiversity], JUNE_15, 14, SUMMER);
      return {w: wildlifeOf(g), bloom: bloom(g)};
    };
    const none = about(false), some = about(true);
    expect(none.bloom).toBe(0);
    expect(some.bloom).toBeGreaterThan(1.5);
    expect(some.w.bees).toBeGreaterThan(2.5 * none.w.bees);
    expect(some.w.visits).toBeGreaterThan(0.9);
    expect(none.w.visits).toBeGreaterThan(0.2); // bees from the gardens around
    expect(some.w.ladybirds).toBeGreaterThan(3 * none.w.ladybirds);
  });

  it('raises a bean crop’s yield by Klein’s rough size, and leaves potatoes as they were', () => {
    const made = (id: 'beans' | 'potatoes', flowers: boolean) => {
      const g = gardenGraph(), bed = g.nodes['bed-1']!;
      sow(bed, id, 0);
      bed.levers.crop = {...cropOf(bed)!, dd: id === 'beans' ? 500 : 780} as unknown as LeverValue;
      if (flowers) {
        border(g.nodes['bed-2']!);
        border(g.nodes['bed-3']!);
        border(g.nodes['bed-4']!);
      }
      const flows = run(g, [biodiversity, crops], JUNE_15, 30, SUMMER);
      return flows.filter((f) => f.what === 'ripening').reduce((s, f) => s + f.amount, 0);
    };
    const gain = made('beans', true) / made('beans', false) - 1;
    expect(gain).toBeGreaterThan(0.015);
    expect(gain).toBeLessThan(0.1);
    expect(made('potatoes', true)).toBeCloseTo(made('potatoes', false), 6);
  });

  it('kills a border of marigolds in a frost', () => {
    const g = gardenGraph(), bed = g.nodes['bed-1']!;
    border(bed);
    run(g, [biodiversity], JUNE_15, 1, SUMMER);
    expect(borderOf(bed)).not.toBeNull();
    run(g, [biodiversity], 200, 1, day(290, {tmax: 8, tmin: -1, sun: 8, length: 10}));
    expect(borderOf(bed)).toBeNull();
  });

  it('knocks the wildlife back with a spray, and lets it recover over weeks', () => {
    const g = gardenGraph();
    border(g.nodes['bed-2']!);
    border(g.nodes['bed-3']!);
    run(g, [biodiversity], JUNE_15, 14, SUMMER);
    const before = wildlifeOf(g);
    knock(g, {bees: 0.6, ladybirds: 0.3});
    run(g, [biodiversity], JUNE_15 + 14, 2, SUMMER);
    expect(wildlifeOf(g).ladybirds).toBeLessThan(0.6 * before.ladybirds);
    run(g, [biodiversity], JUNE_15 + 16, 40, SUMMER);
    expect(wildlifeOf(g).ladybirds).toBeGreaterThan(0.85 * before.ladybirds);
  });
});
