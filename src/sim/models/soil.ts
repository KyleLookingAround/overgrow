// Soil: what each bed and the lawn is made of, how much water it holds, its organic matter and nutrients, and its health.
// The water it holds comes from its texture and organic matter; its organic matter decays a little each day into the air,
// faster when warm and moist and on bare ground, and grass puts some back; the nitrogen that decay frees becomes nitrate,
// which drains away with the water (the water model calls leach()). docs/systems/soil.md says how it works.
//
// Sources: Saxton & Rawls (2006), "Soil water characteristic estimates by texture and organic matter for hydrologic
//   solutions", Soil Science Society of America Journal 70, equations 1–3, 5 and 16, for the water held at wilting
//   point, field capacity and saturation, and how fast a saturated soil drains. RothC-26.3 (Coleman & Jenkinson 1996)
//   in spirit for organic matter: its rate modifiers for temperature, topsoil moisture and plant cover, its humus
//   decay constant and its split of decayed carbon between CO₂ and new humus by clay content. Van Bemmelen's 1.724 for
//   organic matter from organic carbon. RB209 (AHDB 2023), section 1, for the sizes of soil nitrogen, phosphorus and
//   potassium, and for nitrate lost with drainage over winter. Johannes et al. (2017) and Prout et al. (2021) for the
//   organic carbon to clay ratio as a measure of structure (1/8 very good, 1/10 good, 1/13 moderate), and Loveland &
//   Webb (2003) for organic carbon below about 2 % as the line for trouble.
// Simplifies: one layer 30 cm deep, well mixed; organic matter as two pools (fresh plant matter and humus) instead of
//   RothC's five, with one C:N ratio of 10 for both; grass as a steady input by growing degree-days, not a crop; no
//   nitrogen from the air (deposition or fixation until legumes), no denitrification, and phosphorus and potassium
//   still until crops take them (RB209: they barely leach); structure read from the carbon to clay ratio, not kept.
//   Fast effect: moisture and its stress on the soil's health, and nitrate washed out after heavy rain. Slow effect:
//   organic matter falling over years on bare ground (and with it the water the soil holds and its structure), and
//   holding steady under grass.
import {BULK_DENSITY, DEPTH, START_K_MG_L, START_NITRATE_KG_HA, START_P_MG_L, TEXTURES, type SoilSpec, type Texture} from '../../data/soils';
import {PLACES} from '../../data/garden';
import type {System, TickContext} from '../clock';
import {qty, type GraphNode, type Stock} from '../graph';
import {ATMOSPHERE} from '../state';
import {weatherOf} from './weather';

/** The stocks a soil has, by key. Later parts move compost, crops' uptake, legumes and digging as flows between them. */
export const SOIL = {
  water: 'water', // L in the layer
  humus: 'carbon', // kg CO₂e in humus: the node's own carbon stock
  fresh: 'carbon.fresh', // kg CO₂e in fresh plant matter: roots, litter, compost
  organicN: 'nitrogen.organic', // kg N in the organic matter
  nitrate: 'nitrate', // kg N, mineral and free to leach
  phosphorus: 'phosphorus', // kg P, plant-available (Olsen)
  potassium: 'potassium', // kg K, exchangeable
} as const;

const C_PER_CO2 = 12 / 44, OM_PER_C = 1.724, C_TO_N = 10;

// ---- water held (Saxton & Rawls 2006) ----

/** Volumetric water at wilting point, field capacity and saturation (m³/m³), and saturated conductivity (mm/h). */
export function hydraulics(t: Pick<Texture, 'sand' | 'clay'>, organicMatter: number) {
  const S = t.sand, C = t.clay, OM = Math.min(8, Math.max(0, organicMatter));
  const w1500t = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const wp = w1500t + (0.14 * w1500t - 0.02);
  const w33t = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  const fc = w33t + (1.283 * w33t * w33t - 0.374 * w33t - 0.015);
  const wS33t = 0.278 * S + 0.034 * C + 0.022 * OM - 0.018 * S * OM - 0.027 * C * OM - 0.584 * S * C + 0.078;
  const sat = fc + wS33t + (0.636 * wS33t - 0.107) - 0.097 * S + 0.043;
  const lambda = (Math.log(fc) - Math.log(wp)) / (Math.log(1500) - Math.log(33));
  return {wp, fc, sat, ksat: 1930 * Math.pow(sat - fc, 3 - lambda)};
}

// ---- a node's soil ----

/** The places with soil: the beds and the lawn. */
export const hasSoil = (n: GraphNode) => n.kind === 'bed' || n.kind === 'lawn';

const DEFAULT: SoilSpec = {texture: 'loam', organicMatter: 4};
const SPECS = new Map(PLACES.filter((p) => p.soil).map((p) => [p.id, p.soil!]));
/** The soil a place was laid down with (src/data/garden.ts); a loam where the data names none. */
export const specOf = (id: string): SoilSpec => SPECS.get(id) ?? DEFAULT;
export const textureOf = (id: string): Texture => TEXTURES[specOf(id).texture];

/** The soil's area, m²: its cropland and grass. */
export const areaOf = (n: GraphNode) => (n.stocks['land.crops']?.amount ?? 0) + (n.stocks['land.grass']?.amount ?? 0);
/** The share of it under grass, 0–1. */
export const grassShare = (n: GraphNode) => {
  const a = areaOf(n);
  return a > 0 ? (n.stocks['land.grass']?.amount ?? 0) / a : 0;
};
/** Dry soil in the layer, kg. */
const massOf = (area: number) => area * DEPTH * BULK_DENSITY;

/** Organic matter, % of the soil's dry weight, from its carbon (humus and fresh). */
export function organicMatter(n: GraphNode): number {
  const area = areaOf(n);
  if (!area) return 0;
  const co2 = (n.stocks[SOIL.humus]?.amount ?? 0) + (n.stocks[SOIL.fresh]?.amount ?? 0);
  return (100 * co2 * C_PER_CO2 * OM_PER_C) / massOf(area);
}

export interface Limits {
  /** Litres in the layer at wilting point, field capacity and saturation. */
  wp: number;
  fc: number;
  sat: number;
  /** Litres an hour a saturated layer drains. */
  ksat: number;
  /** Litres the surface can lose before evaporation slows, and in all (FAO-56 REW and TEW). */
  rew: number;
  tew: number;
}

// the last limits worked out for each place, kept while its area and organic carbon are unchanged (they change daily
// at most, and the water model asks every hour)
const known = new Map<string, {area: number; co2: number; lim: Limits}>();

/** What a node's soil holds, in litres, from its texture and today's organic matter. */
export function limitsOf(n: GraphNode): Limits {
  const area = areaOf(n), co2 = (n.stocks[SOIL.humus]?.amount ?? 0) + (n.stocks[SOIL.fresh]?.amount ?? 0), had = known.get(n.id);
  if (had && had.area === area && had.co2 === co2) return had.lim;
  const t = textureOf(n.id), h = hydraulics(t, organicMatter(n)), litres = area * DEPTH * 1000;
  const lim = {wp: h.wp * litres, fc: h.fc * litres, sat: h.sat * litres, ksat: h.ksat * area, rew: t.rew * area, tew: t.tew * area};
  known.set(n.id, {area, co2, lim});
  return lim;
}

/** Water for roots: 0 at wilting point, 1 at field capacity, more when wetter. */
export function moisture(n: GraphNode, lim = limitsOf(n)): number {
  return lim.fc > lim.wp ? ((n.stocks[SOIL.water]?.amount ?? 0) - lim.wp) / (lim.fc - lim.wp) : 0;
}

/** A soil's stocks as it's laid down: moist to field capacity (a British spring), its organic matter and RB209's index 2. */
export function startingSoil(spec: SoilSpec, area: number, grass: boolean): Record<string, Stock> {
  const t = TEXTURES[spec.texture], mass = massOf(area), m3 = area * DEPTH;
  const organicC = (spec.organicMatter / 100 / OM_PER_C) * mass, freshShare = grass ? 0.06 : 0.02;
  const kg = <U extends Stock['unit']>(n: number, unit: U): Stock => ({unit, amount: qty(n, unit)});
  return {
    [SOIL.water]: kg(hydraulics(t, spec.organicMatter).fc * m3 * 1000, 'L'),
    [SOIL.humus]: kg((organicC * (1 - freshShare)) / C_PER_CO2, 'kgCO2e'),
    [SOIL.fresh]: kg((organicC * freshShare) / C_PER_CO2, 'kgCO2e'),
    [SOIL.organicN]: kg(organicC / C_TO_N, 'kgN'),
    [SOIL.nitrate]: kg((START_NITRATE_KG_HA * area) / 1e4, 'kgN'),
    [SOIL.phosphorus]: kg((START_P_MG_L * m3 * 1000) / 1e6, 'kgP'),
    [SOIL.potassium]: kg((START_K_MG_L * m3 * 1000) / 1e6, 'kgK'),
  };
}

// ---- health ----

/** Structure, 0–100, from the organic carbon to clay ratio: 0 at 1/20 or less, 100 at 1/8 or more. */
export function structure(n: GraphNode): number {
  const ratio = organicMatter(n) / OM_PER_C / (100 * textureOf(n.id).clay);
  return 100 * Math.min(1, Math.max(0, (ratio - 1 / 20) / (1 / 8 - 1 / 20)));
}

/** Moisture stress as a score, 100 when roots have all they need: falls below half of the available water, and when waterlogged. */
export function moistureScore(n: GraphNode, lim = limitsOf(n)): number {
  const m = moisture(n, lim), water = n.stocks[SOIL.water]?.amount ?? 0;
  if (m < 0.5) return Math.max(0, 200 * m);
  if (water <= lim.fc) return 100;
  return 100 * (1 - 0.6 * Math.min(1, (water - lim.fc) / Math.max(1e-9, lim.sat - lim.fc)));
}

/** Soil health, 0–100: organic matter (up to 6 %), structure and moisture stress, weighted 4:3:3. */
export function health(n: GraphNode, lim = limitsOf(n)): number {
  const om = 100 * Math.min(1, Math.max(0, (organicMatter(n) - 1) / 5));
  return 0.4 * om + 0.3 * structure(n) + 0.3 * moistureScore(n, lim);
}

// ---- organic matter (RothC in spirit) ----

/** RothC's humus decay constant, a year, and one for fresh plant matter between its decomposable and resistant pools. */
const K_HUMUS = 0.02, K_FRESH = 1.0;
/** Grass's carbon going into the soil, kg C per m² per degree-day above 5 °C: about 4 t C/ha a year at this station. */
export const GRASS_INPUT = 0.43 / 2250;

/** RothC's rate modifier for temperature (°C). */
export const tempFactor = (t: number) => (t < -5 ? 0 : 47.91 / (1 + Math.exp(106.06 / (t + 18.27))));
/** RothC's for topsoil moisture, on the water available to roots (0 at wilting point, 1 at field capacity). */
export const moistFactor = (m: number) => {
  const deficit = 1 - Math.min(1, Math.max(0, m));
  return deficit <= 0.444 ? 1 : 0.2 + (0.8 * (1 - deficit)) / (1 - 0.444);
};
/** RothC's share of decayed carbon that becomes new humus rather than CO₂, by clay. */
export const humified = (clay: number) => 1 / (1 + 1.67 * (1.85 + 1.6 * Math.exp(-0.0786 * clay * 100)));

/** Moves nitrate out with the water draining from a soil: its share of the water before the drainage. */
export function leach(c: TickContext, n: GraphNode, drained: number, before: number) {
  const no3 = n.stocks[SOIL.nitrate]?.amount ?? 0;
  if (no3 <= 0 || drained <= 0 || before <= 0) return;
  c.flow({what: 'leaching', unit: 'kgN', amount: qty(no3 * Math.min(1, drained / before), 'kgN'), from: {node: n.id, stock: SOIL.nitrate}, to: {boundary: 'drainage'}});
}

/** One node's day (or the step's days): decay, grass's input, mineralisation, health. */
function soilDay(c: TickContext, n: GraphNode, temp: number, days: number) {
  const s = n.stocks, lim = limitsOf(n), m = moisture(n, lim), grass = grassShare(n), clay = textureOf(n.id).clay;
  const rate = tempFactor(temp) * moistFactor(m) * (1 - 0.4 * grass) * (days / 365), h = humified(clay);
  const air = {node: ATMOSPHERE, stock: 'carbon'};
  let toAir = 0;
  const humus = s[SOIL.humus]?.amount ?? 0, fresh = s[SOIL.fresh]?.amount ?? 0;
  const lostHumus = humus * (1 - Math.exp(-K_HUMUS * rate)) * (1 - h), decayed = fresh * (1 - Math.exp(-K_FRESH * rate));
  if (lostHumus > 0) {
    c.flow({what: 'decay', unit: 'kgCO2e', amount: qty(lostHumus, 'kgCO2e'), from: {node: n.id, stock: SOIL.humus}, to: air});
    toAir += lostHumus;
  }
  if (decayed > 0) {
    c.flow({what: 'decay', unit: 'kgCO2e', amount: qty(decayed * (1 - h), 'kgCO2e'), from: {node: n.id, stock: SOIL.fresh}, to: air});
    c.flow({what: 'humification', unit: 'kgCO2e', amount: qty(decayed * h, 'kgCO2e'), from: {node: n.id, stock: SOIL.fresh}, to: {node: n.id, stock: SOIL.humus}});
    toAir += decayed * (1 - h);
  }
  // what decay frees of the organic matter's nitrogen becomes nitrate
  const freed = Math.min(s[SOIL.organicN]?.amount ?? 0, (toAir * C_PER_CO2) / C_TO_N);
  if (freed > 0) c.flow({what: 'mineralisation', unit: 'kgN', amount: qty(freed, 'kgN'), from: {node: n.id, stock: SOIL.organicN}, to: {node: n.id, stock: SOIL.nitrate}});
  // grass grows above 5 °C while it has water, and its roots and litter feed the soil, taking nitrate with them
  const grassM2 = s['land.grass']?.amount ?? 0;
  if (grassM2 > 0 && temp > 5) {
    const c_kg = GRASS_INPUT * grassM2 * (temp - 5) * days * Math.min(1, 2 * Math.max(0, m));
    if (c_kg > 0) {
      c.flow({what: 'grass', unit: 'kgCO2e', amount: qty(c_kg / C_PER_CO2, 'kgCO2e'), from: air, to: {node: n.id, stock: SOIL.fresh}});
      const uptake = Math.min(s[SOIL.nitrate]?.amount ?? 0, c_kg / C_TO_N);
      if (uptake > 0) c.flow({what: 'grass', unit: 'kgN', amount: qty(uptake, 'kgN'), from: {node: n.id, stock: SOIL.nitrate}, to: {node: n.id, stock: SOIL.organicN}});
    }
  }
  n.totals.health = health(n, lim);
}

export const soil: System = {
  name: 'soil',
  on: {
    day(c) {
      const w = weatherOf(c.graph);
      if (!w || !c.graph.nodes[ATMOSPHERE]) return;
      const step = w.step ?? [w], temp = step.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / step.length, days = Math.max(1, c.dt / 24);
      for (const n of Object.values(c.graph.nodes)) if (hasSoil(n) && areaOf(n) > 0) soilDay(c, n, temp, days);
    },
  },
};
