// Water: the FAO-56 soil water balance for each bed and the lawn, every step. Rain falls in; water goes back to the air
// by evapotranspiration, the reference rate for the weather times the ground's coefficient (bare soil, grass, or the
// crop growing there, src/sim/models/crops.ts); what's above field capacity drains below the roots, taking nitrate with it (the soil model's
// leach()); and what's above saturation runs off. The shed's roof fills the water butt, which overflows once full.
// Every litre moves as a flow to or from a named boundary. docs/systems/water.md says how it works.
//
// Sources: FAO Irrigation and Drainage Paper 56 (Allen, Pereira, Raes & Smith 1998): the FAO Penman-Monteith reference
//   evapotranspiration (eq. 6) with its missing-data rules (chapter 3: dew point from the minimum temperature in a humid
//   climate, wind 2 m/s, radiation from sunshine hours, eqs. 7–13, 17, 35–40), Hargreaves (eq. 52) where there is
//   temperature alone, the crop coefficient and water stress coefficient (eqs. 56, 84), the evaporation from bare soil
//   with readily and totally evaporable water (eqs. 71–74, table 19), and the root-zone water balance (eq. 85) with
//   drainage above field capacity and runoff above saturation. Penman-Monteith is used because the weather generator
//   gives temperature and sunshine, and FAO-56 prefers it with estimated humidity and wind to Hargreaves; Hargreaves is
//   kept for a day without sunshine (a place whose data give temperature only) and cross-checks it in the test. Grass's
//   coefficient, 0.9, is FAO-56 table 12's cool-season turf. A roof's runoff coefficient of about 0.85 (CIRIA C753).
// Simplifies: one bucket 30 cm deep per place (no layers, no capillary rise); the day's reference evapotranspiration is
//   shared over its hours by the sun's curve, none at night; excess over field capacity drains over about half a day,
//   no faster than the saturated conductivity; rain that can't soak in runs off the garden, not onto a neighbour; bare
//   soil's evaporation reads the whole layer's dryness instead of a separate surface layer; the butt loses nothing.
//   Fast effect: beds wetting in the rain and drying in the sun, draining after a downpour, and a full butt overflowing.
//   Slow effect: the season's balance, from wet winters that drain and leach to summers that dry the soil down.
import {ROOF} from '../../data/garden';
import {STATION} from '../../data/climate-normals';
import {calendar, type System, type TickContext} from '../clock';
import {RAISED, TANK} from '../../data/shed';
import {owns} from '../kit';
import {qty, type GraphNode} from '../graph';
import {cropCover} from './crops';
import {areaOf, grassShare, hasSoil, leach, limitsOf, SOIL, type Limits} from './soil';
import {lightBetween, rainBetween, sunOn, weatherOf, type WeatherDay} from './weather';

// ---- reference evapotranspiration, mm a day ----

/** Saturation vapour pressure, kPa, at a temperature (°C): FAO-56 eq. 11. */
const es = (t: number) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
const PRESSURE = 101.3 * Math.pow((293 - 0.0065 * STATION.altitude) / 293, 5.26);
const GAMMA = 0.000665 * PRESSURE;
/** Wind at 2 m where none is measured (FAO-56, chapter 3). */
const WIND = 2;

/** FAO Penman-Monteith reference evapotranspiration for a day with sunshine hours, mm. */
export function et0PenmanMonteith(d: Pick<WeatherDay, 'tmax' | 'tmin' | 'sun' | 'dayOfYear'>): number {
  const {ra, length} = sunOn(d.dayOfYear), t = (d.tmax + d.tmin) / 2;
  const delta = (4098 * es(t)) / (t + 237.3) ** 2, esat = (es(d.tmax) + es(d.tmin)) / 2, ea = es(d.tmin);
  const rs = (0.25 + (0.5 * Math.min(d.sun, length)) / length) * ra, rso = (0.75 + 2e-5 * STATION.altitude) * ra;
  const k4 = (x: number) => (x + 273.16) ** 4;
  const rnl = 4.903e-9 * ((k4(d.tmax) + k4(d.tmin)) / 2) * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * Math.min(1, rs / rso) - 0.35);
  const rn = 0.77 * rs - rnl;
  const et = (0.408 * delta * rn + GAMMA * (900 / (t + 273)) * WIND * (esat - ea)) / (delta + GAMMA * (1 + 0.34 * WIND));
  return Math.max(0, et);
}

/** Hargreaves's reference evapotranspiration from temperature alone, mm a day. */
export function et0Hargreaves(d: Pick<WeatherDay, 'tmax' | 'tmin' | 'dayOfYear'>): number {
  const t = (d.tmax + d.tmin) / 2, ra = sunOn(d.dayOfYear).ra * 0.408;
  return Math.max(0, 0.0023 * (t + 17.8) * Math.sqrt(Math.max(0, d.tmax - d.tmin)) * ra);
}

const daily = new WeakMap<WeatherDay, number>();
/** The day's reference evapotranspiration: Penman-Monteith where there's sunshine to go on, Hargreaves where not. */
export function et0(d: WeatherDay): number {
  let v = daily.get(d);
  if (v === undefined) daily.set(d, (v = Number.isFinite(d.sun) ? et0PenmanMonteith(d) : et0Hargreaves(d)));
  return v;
}

// ---- the ground's coefficient ----

/** FAO-56 table 12: cool-season turf grass. */
export const KC_GRASS = 0.9;
/** FAO-56's most a wet bare surface evaporates, relative to the reference (Kc max, eq. 72, rounded for a calm garden). */
export const KE_BARE = 1.05;
/** FAO-56: the share of grass's available water it uses before it's stressed. */
const P_GRASS = 0.5;

/**
 * How fast a place's ground gives water back relative to the reference rate, at its current dryness: grass by its
 * coefficient and water stress, a crop by its coefficient at its stage and its own water stress (its p) over the
 * ground it covers, and bare soil by FAO-56's evaporation reduction over the rest, in proportion to their areas.
 */
export function groundCoefficient(n: GraphNode, lim: Limits): number {
  const water = n.stocks[SOIL.water]?.amount ?? 0, depleted = Math.max(0, lim.fc - water), taw = Math.max(1e-9, lim.fc - lim.wp);
  const ks = (p: number) => (depleted <= p * taw ? 1 : Math.max(0, (taw - depleted) / ((1 - p) * taw)));
  const kr = depleted <= lim.rew ? 1 : Math.max(0, (lim.tew - depleted) / Math.max(1e-9, lim.tew - lim.rew));
  const g = grassShare(n), crop = n.kind === 'bed' ? cropCover(n) : null, cover = crop?.cover ?? 0;
  return g * KC_GRASS * ks(P_GRASS) + (1 - g) * (cover * (crop ? crop.kc * ks(crop.p) : 0) + (1 - cover) * KE_BARE * kr);
}

// ---- the balance ----

/** Excess over field capacity drains with this time constant, hours. */
const DRAIN_HOURS = 12;

function balance(c: TickContext, n: GraphNode, rainMm: number, et0Mm: number, hours: number) {
  const area = areaOf(n);
  if (!area) return;
  const at = {node: n.id, stock: SOIL.water}, lim = limitsOf(n), water = () => n.stocks[SOIL.water]?.amount ?? 0;
  // a bed under the cold frame gets no rain: the glass keeps it off (the gardener waters it)
  if (rainMm > 0 && !n.levers.cover) c.flow({what: 'rain', unit: 'L', amount: qty(rainMm * area, 'L'), from: {boundary: 'rain'}, to: at});
  if (water() > lim.sat) c.flow({what: 'runoff', unit: 'L', amount: qty(water() - lim.sat, 'L'), from: at, to: {boundary: 'runoff'}});
  if (et0Mm > 0) {
    const et = Math.min(et0Mm * area * groundCoefficient(n, lim), Math.max(0, water() - 0.5 * lim.wp));
    if (et > 0) c.flow({what: 'evapotranspiration', unit: 'L', amount: qty(et, 'L'), from: at, to: {boundary: 'evapotranspiration'}});
  }
  const before = water(), excess = before - lim.fc;
  if (excess > 0) {
    // the last half millimetre goes at once, so a soil at field capacity isn't left dripping for days
    // a raised bed drains faster: its soil stands above the ground's
    const ksat = lim.ksat * (n.levers.raised === true ? RAISED.drain : 1);
    const drained = excess < 0.5 * area ? excess : Math.min(excess * (1 - Math.exp(-hours / DRAIN_HOURS)), ksat * hours);
    if (drained > 0) {
      c.flow({what: 'drainage', unit: 'L', amount: qty(drained, 'L'), from: at, to: {boundary: 'drainage'}});
      leach(c, n, drained, before);
    }
  }
}

/** One stretch of the balance: every soil, then the butt. */
function step(c: TickContext, rain: number, et: number, hours: number) {
  for (const n of Object.values(c.graph.nodes)) if (hasSoil(n)) balance(c, n, rain, et, hours);
  // the shed's roof into the butt, and over its brim once it's full
  const butt = c.graph.nodes[ROOF.to]?.stocks.water;
  if (butt && rain > 0) {
    const at = {node: ROOF.to, stock: 'water'};
    // and the house's back roof too, once the tank is on its downpipe
    const roof = ROOF.m2 + (owns(c.graph, 'water-tank') ? TANK.roofM2 : 0);
    c.flow({what: 'rain', unit: 'L', amount: qty(rain * roof * ROOF.runoff, 'L'), from: {boundary: 'rain'}, to: at});
    if (butt.cap !== undefined && butt.amount > butt.cap) c.flow({what: 'overflow', unit: 'L', amount: qty(butt.amount - butt.cap, 'L'), from: at, to: {boundary: 'runoff'}});
  }
}

export const water: System = {
  name: 'water',
  on: {
    hour(c) {
      const w = weatherOf(c.graph);
      if (!w) return;
      // the step's rain and share of the day's evapotranspiration, from its first hour; at a day or more, each day's whole
      if (c.dt < 24) {
        const start = calendar(c.hours - c.dt), a = start.hour + start.minute / 60, b = a + c.dt;
        step(c, rainBetween(w, a, b), et0(w) * lightBetween(w, a, b), c.dt);
      } else for (const d of w.step ?? [w]) step(c, d.rain, et0(d), 24);
    },
  },
};
