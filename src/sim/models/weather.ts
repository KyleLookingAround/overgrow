// The weather: a daily stochastic weather generator of the Richardson type, drawn from the station's monthly normals
// (src/data/climate-normals.ts) and bent by the warming index, with each hour shaped from its day for the hour tick.
// The day it makes is kept on the level's air node as its `weather` lever (read-only: no command can set it), so it is
// saved, sent to the page with the snapshot, and read by the water and soil models, the map and, later, the pests.
// docs/systems/weather.md says how it works.
//
// Sources: Richardson (1981), "Stochastic simulation of daily precipitation, temperature and solar radiation", Water
//   Resources Research 17: wet and dry days by a first-order Markov chain, rain amounts on wet days, and maximum and
//   minimum temperature and radiation as correlated residuals with lag-one persistence, their means shifted on wet days.
//   Wilks (1999) and Wilks & Wilby (1999) for the gamma-distributed amounts and the persistence's rough size. Met Office
//   1991–2020 climate normals (Open Government Licence) for the station's ranges. FAO-56 (Allen et al. 1998),
//   equations 21–25 and 35, for the sun: extraterrestrial radiation, day length, and radiation from sunshine hours
//   (Ångström). The warming index: IPCC AR6 WGI (2021), SPM D.1 and chapter 5 for the transient climate response to
//   cumulative emissions (TCRE, about 0.45 °C per 1,000 Gt CO₂), and chapters 11 and 12 with UKCP18 for how it shifts
//   the UK: warmer overall and more in summer, wetter winters, drier summers, heavier rain on wet days (Clausius–
//   Clapeyron, about 7 % a degree), and more hot days. Frost is a grass minimum below 0 °C: the grass cools a few
//   degrees below the air on a clear night (Met Office, "Ground frost").
// Simplifies: one station for the level, no wind, humidity or snow of its own (the water model takes FAO-56's missing-data
//   rules for them); rain falls in one spell a day, evenly; a day's temperature follows a fixed curve from the minimum at
//   sunrise to the maximum at 15:00; the Markov chain's persistence and the residuals' correlations are one set for the
//   year; the warming index moves every month by its season's factor, with no change to persistence or sunshine.
//   Fast effect: today's rain, heat and frost on the beds. Slow effect: the warming index moving the climate's means and
//   extremes over decades, once the higher levels put enough carbon in the air.
import {NORMALS, PER_DEGREE, STATION, WET_SHIFT} from '../../data/climate-normals';
import {calendar, type System} from '../clock';
import type {Graph, LeverValue} from '../graph';
import type {Rng} from '../random';
import {ATMOSPHERE} from '../state';

/** One day's weather: what the generator makes each morning, kept on the air node and saved. */
export interface WeatherDay {
  /** The calendar's day index (src/sim/clock.ts) it's for. */
  day: number;
  /** 1–366. */
  dayOfYear: number;
  /** 1 mm of rain or more. */
  wet: boolean;
  /** mm over the day. */
  rain: number;
  /** When the day's rain starts, hour of the day, and how many hours it lasts. */
  rainFrom: number;
  rainHours: number;
  /** Maximum and minimum air temperature, °C. */
  tmax: number;
  tmin: number;
  /** Hours of bright sunshine. */
  sun: number;
  /** Hours from sunrise to sunset. */
  length: number;
  /** The residuals the next day's temperatures and sunshine persist from (standard normal). */
  zMax: number;
  zMin: number;
  zSun: number;
  /** The warming index the day was drawn with, °C above the 1991–2020 baseline. */
  warming: number;
  /** At a step longer than a day (a week or a month, from level 6), every day of the step in order, this one last. */
  step?: WeatherDay[];
}

// ---- the sun (FAO-56) ----

const LAT = (STATION.latitude * Math.PI) / 180;

/** The sun on a day of the year: extraterrestrial radiation (MJ/m² a day, FAO-56 eq. 21) and day length (h, eq. 34). */
export function sunOn(dayOfYear: number): {ra: number; length: number} {
  const j = (2 * Math.PI * dayOfYear) / 365, dr = 1 + 0.033 * Math.cos(j), decl = 0.409 * Math.sin(j - 1.39);
  const ws = Math.acos(Math.min(1, Math.max(-1, -Math.tan(LAT) * Math.tan(decl))));
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.sin(ws));
  return {ra, length: (24 / Math.PI) * ws};
}

// ---- the warming index ----

/** IPCC AR6's TCRE, best estimate: °C of warming per kg of CO₂ emitted (0.45 °C per 1,000 Gt). */
export const TCRE = 0.45 / 1e15;

/**
 * °C above the 1991–2020 baseline, from the carbon the level has put in the air (its air node's stock, kg CO₂e) by
 * TCRE. A garden's few kilograms come to nothing; the nation's and the planet's air nodes carry enough for it to show.
 */
export function warmingIndex(g: Graph): number {
  return TCRE * (g.nodes[ATMOSPHERE]?.stocks.carbon?.amount ?? 0);
}

/** Today's weather on a graph, or null before the first hour has run. */
export function weatherOf(g: Graph): WeatherDay | null {
  return (g.nodes[ATMOSPHERE]?.levers.weather as unknown as WeatherDay | undefined) ?? null;
}

// ---- the generator ----

/** Winter (Dec–Feb), spring, summer, autumn: the index into the per-season tables. */
export const seasonOf = (month: number) => [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0][month - 1]!;
const DAYS_IN = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** How much more likely a wet day is after a wet day than after a dry one (Wilks 1999: 0.2–0.4 in the UK). */
const PERSIST_WET = 0.3;
/** Gamma shape of a wet day's rain above the first millimetre (Wilks 1999: 0.6–0.9 for daily rain). */
const SHAPE = 0.75;
/** Lag-one persistence of the maximum, minimum and sunshine residuals, and their correlations (Richardson 1981's rough sizes). */
const PERSIST = {max: 0.65, min: 0.6, sun: 0.3};
const CORR = {maxMin: 0.55, maxSun: 0.45};
/** A wet day's sunshine as a share of the month's mean. */
const WET_SUN = 0.4;

/** The month's normals at a day of the year, interpolated between the middles of the months so nothing jumps on the 1st. */
function smooth(dayOfYear: number) {
  const x = ((dayOfYear - 15.5) / 30.44 + 12) % 12, i = Math.floor(x), k = x - i;
  const a = NORMALS[i]!, b = NORMALS[(i + 1) % 12]!, mix = (p: number, q: number) => p + (q - p) * k;
  return {tmax: mix(a.tmax, b.tmax), tmin: mix(a.tmin, b.tmin), sdMax: mix(a.sdMax, b.sdMax), sdMin: mix(a.sdMin, b.sdMin)};
}

function normal(r: Rng): number {
  const u = 1 - r.next(), v = r.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A gamma variate (Marsaglia & Tsang 2000; for a shape under 1, boosted by U^(1/shape)). */
function gamma(shape: number, scale: number, r: Rng): number {
  const boost = shape < 1 ? Math.pow(1 - r.next(), 1 / shape) : 1, k = shape < 1 ? shape + 1 : shape;
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = normal(r);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = 1 - r.next();
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v * scale * boost;
  }
}

/** The chances and sizes of rain in a month at a warming index. */
export function rainfall(month: number, warming: number) {
  const n = NORMALS[month - 1]!, s = seasonOf(month);
  const total = Math.max(0.2, 1 + warming * PER_DEGREE.rain[s]!), heavier = Math.max(0.5, 1 + warming * PER_DEGREE.intensity);
  const chance = Math.min(0.95, Math.max(0.02, (n.rainDays / DAYS_IN[month - 1]!) * (total / heavier)));
  return {chance, mean: (n.rain / n.rainDays) * heavier};
}

/**
 * The next day's weather from the day before (null on the first day), drawn from `r`. Pure: the same
 * inputs and dice give the same day.
 */
export function nextDay(prev: WeatherDay | null, date: {dayIndex: number; dayOfYear: number; month: number}, warming: number, r: Rng): WeatherDay {
  const s = seasonOf(date.month), rain = rainfall(date.month, warming), n = smooth(date.dayOfYear), sunNow = sunOn(date.dayOfYear);
  // wet or dry: a first-order Markov chain whose long-run share of wet days is the month's
  const p01 = rain.chance * (1 - PERSIST_WET), p11 = p01 + PERSIST_WET;
  const wet = r.next() < (prev ? (prev.wet ? p11 : p01) : rain.chance);
  const mm = wet ? 1 + gamma(SHAPE, (rain.mean - 1) / SHAPE, r) : 0;
  const rainHours = wet ? Math.min(20, Math.max(1, Math.round(1 + mm / 3 + r.next() * 5))) : 0;
  const rainFrom = wet ? Math.floor(r.next() * (24 - rainHours + 1)) : 0;
  // the residuals: correlated, persisting from yesterday's
  const e1 = normal(r), e2 = normal(r), e3 = normal(r);
  const step = (p: number, z: number | undefined, e: number) => p * (z ?? 0) + Math.sqrt(1 - p * p) * e;
  const zMax = step(PERSIST.max, prev?.zMax, e1);
  const zMin = step(PERSIST.min, prev?.zMin, CORR.maxMin * e1 + Math.sqrt(1 - CORR.maxMin ** 2) * e2);
  const zSun = step(PERSIST.sun, prev?.zSun, CORR.maxSun * e1 + Math.sqrt(1 - CORR.maxSun ** 2) * e3);
  // wet days are cooler by day and warmer by night; dry days the other way, so the month's mean holds
  const pw = rain.chance, dry = pw / (1 - pw), warm = warming * PER_DEGREE.warming[s]!;
  const shiftMax = wet ? WET_SHIFT.tmax[s]! : -WET_SHIFT.tmax[s]! * dry, shiftMin = wet ? WET_SHIFT.tmin[s]! : -WET_SHIFT.tmin[s]! * dry;
  const tmax = n.tmax + warm + shiftMax + n.sdMax * (1 + warming * PER_DEGREE.spread[s]!) * zMax;
  const tmin = Math.min(tmax - 1, n.tmin + warm + shiftMin + n.sdMin * zMin);
  // sunshine: the month's share of the day, less on wet days, with its own noise
  const mean = NORMALS[date.month - 1]!.sun / DAYS_IN[date.month - 1]! / sunNow.length;
  const base = wet ? mean * WET_SUN : (mean * (1 - WET_SUN * pw)) / (1 - pw);
  const share = Math.min(0.95, Math.max(0, base * (1 + 0.5 * zSun)));
  return {
    day: date.dayIndex, dayOfYear: date.dayOfYear, wet, rain: mm, rainFrom, rainHours, tmax, tmin, sun: share * sunNow.length,
    length: sunNow.length, zMax, zMin, zSun, warming,
  };
}

// ---- the hours ----

/** When the day's maximum comes, hour of the day. */
const PEAK = 15;

export interface WeatherHour {
  /** Air temperature, °C. */
  temp: number;
  /** At the grass, °C: a few degrees colder than the air on a clear night. */
  ground: number;
  /** Rain falling, mm an hour. */
  rain: number;
  /** How hard the frost is, 0 (none) to 1: the grass below 0 °C. */
  frost: number;
}

/** The weather at an hour of the day (0–24, fractional), shaped from the day's. Pure, so the map calls it too. */
export function hourOf(d: WeatherDay, t: number): WeatherHour {
  const rise = 12 - d.length / 2, set = 12 + d.length / 2, span = d.tmax - d.tmin;
  let temp: number;
  if (t >= rise && t <= PEAK) temp = d.tmin + (span * (1 - Math.cos((Math.PI * (t - rise)) / (PEAK - rise)))) / 2;
  else {
    const since = (t > PEAK ? t : t + 24) - PEAK, night = 24 + rise - PEAK;
    temp = d.tmax - (span * (1 - Math.cos((Math.PI * since) / night))) / 2;
  }
  // the grass loses heat to a clear sky at night: the less cloud (the more sunshine the day had), the colder
  const dark = t < rise + 1.5 ? Math.min(1, (rise + 1.5 - t) / 1.5) : t > set - 1 ? Math.min(1, (t - set + 1) / 1.5) : 0;
  const ground = temp - dark * (1 + 3 * Math.min(1, d.sun / Math.max(1, d.length)));
  const raining = d.rainHours > 0 && t >= d.rainFrom && t < d.rainFrom + d.rainHours;
  return {temp, ground, rain: raining ? d.rain / d.rainHours : 0, frost: ground < 0 ? Math.min(1, 0.3 + -ground / 3) : 0};
}

/** Rain between two hours of the day, mm. */
export function rainBetween(d: WeatherDay, a: number, b: number): number {
  if (!d.rainHours) return 0;
  const lo = Math.max(a, d.rainFrom), hi = Math.min(b, d.rainFrom + d.rainHours);
  return hi > lo ? (d.rain * (hi - lo)) / d.rainHours : 0;
}

/** The share of the day's sunlight between two hours of the day: a half sine from sunrise to sunset. */
export function lightBetween(d: WeatherDay, a: number, b: number): number {
  const rise = 12 - d.length / 2, clip = (t: number) => Math.min(d.length, Math.max(0, t - rise));
  return (Math.cos((Math.PI * clip(a)) / d.length) - Math.cos((Math.PI * clip(b)) / d.length)) / 2;
}

// ---- the system ----

export const weather: System = {
  name: 'weather',
  on: {
    // each morning's first step draws the day, from the day before and the warming the graph has reached
    hour(c) {
      const air = c.graph.nodes[ATMOSPHERE];
      if (!air) return;
      const start = calendar(c.hours - c.dt), was = weatherOf(c.graph), warming = warmingIndex(c.graph);
      if (was && was.day === start.dayIndex) return;
      // yesterday's persists into today
      if (c.dt <= 24) {
        air.levers.weather = nextDay(was, start, warming, c.rng) as unknown as LeverValue;
        return;
      }
      // a week's or a month's step draws each of its days in turn, so its rain comes in days, not one downpour
      const days: WeatherDay[] = [], n = Math.max(1, calendar(c.hours).dayIndex - start.dayIndex);
      let prev = was;
      for (let k = 0; k < n; k++) days.push((prev = nextDay(prev, calendar(c.hours - c.dt + 24 * k), warming, c.rng)));
      air.levers.weather = {...prev!, step: days} as unknown as LeverValue;
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.node === ATMOSPHERE && cmd.lever === 'weather') return 'the weather is nobody’s to set';
    return undefined;
  },
};
