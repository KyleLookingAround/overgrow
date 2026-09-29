// The weather generator's plausibility test: a seeded climate inside the station's normals, the warming index bending
// it the way IPCC AR6 gives for the UK, each hour shaped from its day, and the system's day kept on the air.
import {describe, expect, it} from 'vitest';
import {NORMALS} from '../../data/climate-normals';
import {calendar} from '../clock';
import {createSim} from '../index';
import {rng} from '../random';
import {gardenGraph} from '../state';
import {SYSTEMS} from '../systems';
import {hourOf, lightBetween, nextDay, rainBetween, sunOn, TCRE, warmingIndex, weather, weatherOf, type WeatherDay} from './weather';

/** Years of days from a seed, from 1 January. */
function climate(years: number, warming: number, seed: number) {
  const r = rng(seed), days: {month: number; year: number; d: WeatherDay}[] = [];
  let prev: WeatherDay | null = null;
  for (let i = 0; i < 365 * years; i++) {
    const date = calendar(-6 + 24 * (i - 73)); // day 0 of the game is 15 March: start from 1 January
    prev = nextDay(prev, date, warming, r);
    days.push({month: date.month, year: Math.floor(i / 365), d: prev});
  }
  return days;
}
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const WINTER = [12, 1, 2], SUMMER = [6, 7, 8];

describe('weather', () => {
  it("gives a seeded year's rain and wet days inside a southern English station's range", () => {
    for (const seed of [1, 2, 3]) {
      const year = climate(1, 0, seed);
      expect(sum(year.map((x) => x.d.rain))).toBeGreaterThan(450); // the normals' 659 mm, and a dry year's 70 %
      expect(sum(year.map((x) => x.d.rain))).toBeLessThan(900);
      expect(year.filter((x) => x.d.wet).length).toBeGreaterThan(90); // the normals' 116 days
      expect(year.filter((x) => x.d.wet).length).toBeLessThan(145);
    }
  });

  it('keeps each month near its normals over thirty years', () => {
    const days = climate(30, 0, 7);
    NORMALS.forEach((n, i) => {
      const m = days.filter((x) => x.month === i + 1).map((x) => x.d);
      expect(Math.abs(mean(m.map((d) => d.tmax)) - n.tmax)).toBeLessThan(1);
      expect(Math.abs(mean(m.map((d) => d.tmin)) - n.tmin)).toBeLessThan(1);
      expect(sum(m.map((d) => d.rain)) / 30 / n.rain).toBeGreaterThan(0.75);
      expect(sum(m.map((d) => d.rain)) / 30 / n.rain).toBeLessThan(1.25);
      expect(m.filter((d) => d.wet).length / 30 / n.rainDays).toBeGreaterThan(0.8);
      expect(m.filter((d) => d.wet).length / 30 / n.rainDays).toBeLessThan(1.2);
      expect(sum(m.map((d) => d.sun)) / 30 / n.sun).toBeGreaterThan(0.85);
      expect(sum(m.map((d) => d.sun)) / 30 / n.sun).toBeLessThan(1.15);
      // air frosts: a handful a month in winter, none in summer
      expect(Math.abs(m.filter((d) => d.tmin < 0).length / 30 - n.airFrostDays)).toBeLessThan(3);
    });
  });

  it('persists: tomorrow is more like today than like any other day', () => {
    const d = climate(10, 0, 3).map((x) => x.d), wetAfterWet = d.slice(1).filter((x, i) => d[i]!.wet && x.wet).length / d.filter((x) => x.wet).length;
    expect(wetAfterWet).toBeGreaterThan(d.filter((x) => x.wet).length / d.length + 0.15);
    const anomaly = d.map((x) => x.zMax), lag = mean(anomaly.slice(1).map((a, i) => a * anomaly[i]!)) / mean(anomaly.map((a) => a * a));
    expect(lag).toBeGreaterThan(0.5);
    expect(lag).toBeLessThan(0.8);
  });

  it('warms, wets the winters, dries the summers and brings more hot and heavy-rain days at a warming index of 2', () => {
    const base = climate(40, 0, 11), warm = climate(40, 2, 11);
    const temp = (xs: typeof base) => mean(xs.map((x) => (x.d.tmax + x.d.tmin) / 2));
    const rain = (xs: typeof base, months: number[]) => sum(xs.filter((x) => months.includes(x.month)).map((x) => x.d.rain));
    const count = (xs: typeof base, f: (d: WeatherDay) => boolean) => xs.filter((x) => f(x.d)).length;
    expect(temp(warm) - temp(base)).toBeGreaterThan(1.8);
    expect(temp(warm) - temp(base)).toBeLessThan(2.8);
    expect(rain(warm, WINTER) / rain(base, WINTER)).toBeGreaterThan(1.03); // UKCP18: about +10 % at 2 °C
    expect(rain(warm, WINTER) / rain(base, WINTER)).toBeLessThan(1.3);
    expect(rain(warm, SUMMER) / rain(base, SUMMER)).toBeLessThan(0.9); // and about −20 % in summer
    expect(rain(warm, SUMMER) / rain(base, SUMMER)).toBeGreaterThan(0.6);
    expect(count(warm, (d) => d.tmax >= 27)).toBeGreaterThan(2 * count(base, (d) => d.tmax >= 27));
    expect(count(warm, (d) => d.rain >= 20)).toBeGreaterThan(1.1 * count(base, (d) => d.rain >= 20));
    expect(count(warm, (d) => d.tmin < 0)).toBeLessThan(0.7 * count(base, (d) => d.tmin < 0));
  });

  it('shapes each hour from its day: coldest at dawn, warmest mid-afternoon, the rain and the light adding up', () => {
    const day: WeatherDay = {...climate(1, 0, 5)[20]!.d, tmax: 6, tmin: -2, sun: 7, wet: true, rain: 6, rainFrom: 13, rainHours: 3};
    const rise = 12 - day.length / 2;
    expect(hourOf(day, rise).temp).toBeCloseTo(-2);
    expect(hourOf(day, 15).temp).toBeCloseTo(6);
    for (let t = 0; t < 24; t += 0.5) {
      expect(hourOf(day, t).temp).toBeGreaterThanOrEqual(-2 - 1e-9);
      expect(hourOf(day, t).temp).toBeLessThanOrEqual(6 + 1e-9);
    }
    // a clear, cold night: frost on the grass before dawn, gone by the afternoon
    expect(hourOf(day, rise - 1).frost).toBeGreaterThan(0);
    expect(hourOf(day, rise - 1).ground).toBeLessThan(hourOf(day, rise - 1).temp - 2);
    expect(hourOf(day, 15).frost).toBe(0);
    expect(hourOf(day, 14).rain).toBeCloseTo(2);
    expect(hourOf(day, 12).rain).toBe(0);
    let rain = 0, light = 0;
    for (let h = 0; h < 24; h++) {
      rain += rainBetween(day, h, h + 1);
      light += lightBetween(day, h, h + 1);
    }
    expect(rain).toBeCloseTo(6);
    expect(light).toBeCloseTo(1);
    expect(sunOn(172).length).toBeGreaterThan(16); // midsummer at 51.5° N
    expect(sunOn(355).length).toBeLessThan(8);
  });

  it("draws the day from its own dice on the air, the same whatever else runs, and nobody can set it", () => {
    const alone = createSim(1, [weather]), all = createSim(1, SYSTEMS);
    const air = (s: ReturnType<typeof alone.snapshot>) => s.nodes.find((n) => n.id === 'atmosphere')!.levers.weather;
    expect(air(alone.snapshot())).toBeNull();
    alone.apply({type: 'tick', hours: 100});
    all.apply({type: 'tick', hours: 100});
    // the same dice: the same rain and residuals; the temperatures differ only by the warming the others' few kg of
    // carbon make, which is nothing
    const a = air(alone.snapshot()) as unknown as WeatherDay, b = air(all.snapshot()) as unknown as WeatherDay;
    expect({...b, tmax: 0, tmin: 0, warming: 0}).toEqual({...a, tmax: 0, tmin: 0, warming: 0});
    expect(b.tmax).toBeCloseTo(a.tmax, 9);
    expect(b.day).toBe(calendar(100 - 1).dayIndex);
    expect(all.apply({type: 'plan', node: 'atmosphere', lever: 'weather', value: null}).rejected).toMatch(/nobody/);
  });

  it('reads the warming index from the carbon in the air by TCRE: nothing at the garden', () => {
    const g = gardenGraph();
    expect(warmingIndex(g)).toBe(0);
    g.nodes.atmosphere!.stocks.carbon!.amount = 1e3 as never; // a tonne: a garden's decades
    expect(warmingIndex(g)).toBeLessThan(1e-9);
    g.nodes.atmosphere!.stocks.carbon!.amount = 2.4e15 as never; // the world's emissions since the baseline, roughly
    expect(warmingIndex(g)).toBeCloseTo(2.4e15 * TCRE);
    expect(warmingIndex(g)).toBeGreaterThan(0.8);
    expect(weatherOf(g)).toBeNull();
  });
});
