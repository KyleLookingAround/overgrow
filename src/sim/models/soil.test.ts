// The soil's plausibility test: water held by texture and organic matter as Saxton & Rawls give it, organic matter
// falling over years on a bare bed and holding under grass, decay faster when warm and moist, nitrate leaching after
// heavy rain, and health falling as a soil loses its organic matter or dries out.
import {describe, expect, it} from 'vitest';
import {TEXTURES} from '../../data/soils';
import {runStep, type System} from '../clock';
import {applyFlow, type Flow, type Graph, type LeverValue} from '../graph';
import {gardenGraph} from '../state';
import {SYSTEMS} from '../systems';
import {health, humified, hydraulics, limitsOf, moistFactor, organicMatter, SOIL, structure, tempFactor} from './soil';
import {water} from './water';
import type {WeatherDay} from './weather';

/** Runs systems step by step on a graph from 06:00 on day 1, returning the flows they moved. */
function run(g: Graph, systems: readonly System[], hours: number, weather?: WeatherDay): Flow[] {
  const flows: Flow[] = [];
  if (weather) g.nodes.atmosphere!.levers.weather = weather as unknown as LeverValue;
  const ctx = {dt: 1, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
    const bad = applyFlow(g, f);
    if (bad) throw new Error(bad);
    flows.push(f);
    return null;
  }};
  let h = 0;
  for (let i = 0; i < hours; i++) h = runStep(systems, ctx, 9, h);
  return flows;
}
const YEAR = 24 * 365;

describe('soil', () => {
  it('holds water by texture and organic matter as Saxton & Rawls give it', () => {
    const loam = hydraulics(TEXTURES.loam, 2.5);
    expect(loam.fc).toBeGreaterThan(0.25); // their table: a loam at 2.5 % holds about 0.28 at field capacity
    expect(loam.fc).toBeLessThan(0.31);
    expect(loam.wp).toBeGreaterThan(0.11); // and 0.14 at wilting point
    expect(loam.wp).toBeLessThan(0.16);
    expect(loam.sat).toBeGreaterThan(0.4);
    const sand = hydraulics(TEXTURES['sandy loam'], 2.5), clay = hydraulics(TEXTURES.clay, 2.5);
    expect(sand.fc).toBeLessThan(loam.fc);
    expect(clay.wp).toBeGreaterThan(loam.wp);
    expect(sand.ksat).toBeGreaterThan(5 * clay.ksat);
    // more organic matter, more water for roots
    const avail = (om: number) => hydraulics(TEXTURES.loam, om).fc - hydraulics(TEXTURES.loam, om).wp;
    expect(avail(5)).toBeGreaterThan(avail(1));
  });

  it('decays faster warm and moist than cold or dry, and turns about a fifth of what decays into humus', () => {
    expect(tempFactor(20)).toBeGreaterThan(2 * tempFactor(10));
    expect(tempFactor(10)).toBeGreaterThan(3 * tempFactor(0));
    expect(moistFactor(0.1)).toBeLessThan(0.6 * moistFactor(1));
    expect(humified(0.2)).toBeGreaterThan(0.15);
    expect(humified(0.2)).toBeLessThan(0.3);
  });

  it('loses organic matter over years on a bare bed, and holds it under grass', () => {
    const g = gardenGraph(), bare = g.nodes['bed-1']!, lawn = g.nodes.lawn!;
    const bare0 = organicMatter(bare), lawn0 = organicMatter(lawn), grass0 = organicMatter(g.nodes['bed-4']!);
    run(g, SYSTEMS, 10 * YEAR);
    expect(organicMatter(bare) / bare0).toBeLessThan(0.92); // RothC's bare fallow: a percent or two a year
    expect(organicMatter(bare) / bare0).toBeGreaterThan(0.7);
    expect(Math.abs(organicMatter(lawn) / lawn0 - 1)).toBeLessThan(0.04);
    expect(Math.abs(organicMatter(g.nodes['bed-4']!) / grass0 - 1)).toBeLessThan(0.04);
    expect(g.nodes.atmosphere!.stocks.carbon!.amount).toBeGreaterThan(0); // the bare beds' carbon went into the air
    expect(health(bare)).toBeGreaterThan(40);
    // ten years of the whole garden hour by hour: about 2.5 s on a developer's machine and twice that on CI's
  }, 20_000);

  it('leaches nitrate after heavy rain', () => {
    const g = gardenGraph(), bed = g.nodes['bed-1']!, before = bed.stocks[SOIL.nitrate]!.amount;
    const storm: WeatherDay = {day: 0, dayOfYear: 320, wet: true, rain: 40, rainFrom: 0, rainHours: 12, tmax: 10, tmin: 7, sun: 0, length: 9, zMax: 0, zMin: 0, zSun: 0, warming: 0};
    const flows = run(g, [water], 36, storm);
    const leached = flows.filter((f) => f.what === 'leaching' && 'node' in f.from && f.from.node === 'bed-1').reduce((s, f) => s + f.amount, 0);
    expect(leached).toBeGreaterThan(0.25 * before); // a soil at field capacity loses a good share of its nitrate to 40 mm
    expect(bed.stocks[SOIL.nitrate]!.amount).toBeCloseTo(before - leached);
    expect(flows.some((f) => f.unit === 'kgN' && 'boundary' in f.to && f.to.boundary === 'drainage')).toBe(true);
  });

  it('scores health lower as organic matter goes and as the soil dries', () => {
    const g = gardenGraph(), bed = g.nodes['bed-1']!, good = health(bed);
    expect(good).toBeGreaterThan(80);
    bed.stocks.water!.amount = (limitsOf(bed).wp + 1) as never;
    expect(health(bed)).toBeLessThan(good - 20);
    bed.stocks.water!.amount = limitsOf(bed).fc as never;
    const s = structure(bed);
    bed.stocks[SOIL.humus]!.amount = (bed.stocks[SOIL.humus]!.amount * 0.4) as never;
    expect(structure(bed)).toBeLessThan(s);
    expect(health(bed)).toBeLessThan(good - 15);
  });
});
