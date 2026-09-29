// Rotation: a year plan over fields (a crop, a cover crop, a grass-clover ley or fallow each year, or "follow the rotation"),
// what came before on each field (the families grown and the soil-borne disease they build, the nitrogen legumes and manure
// leave, the carbon cover crops and residues put in, the wheels' compaction), and the soil at field scale, per hectare:
// organic matter, mineral and organic nitrogen, phosphorus and potassium, leaching and nitrous oxide, health. One call,
// farmYear(), runs a field through a year; the rotation system runs it on the year tick for every field node. It is
// written ahead of part 11 and nothing calls it yet. docs/systems/rotation.md says how it works and what the wiring adds.
//
// Sources: AHDB RB209 (2023) for the nitrogen a crop needs and the most it advises, the share of fertiliser nitrogen a crop
//   recovers, the nitrogen a legume break or a ley leaves for the next crop, the nitrogen in farmyard manure, and the
//   phosphorus and potassium crops take off (and index 1 as the level below which yield falls); IPCC (2019 refinement,
//   vol. 4 ch. 11) for nitrous oxide from applied and residue nitrogen (EF1, 1 %) and from leached nitrogen (EF5, 1.1 %);
//   RothC (Coleman & Jenkinson 1996), through the soil model's own functions (src/sim/models/soil.ts), for organic matter;
//   Saxton & Rawls (2006), through the same, for the water a soil holds; the Rothamsted long-term experiments (Broadbalk,
//   Highfield, Hoosfield) for continuous wheat losing yield to take-all against wheat in rotation, for bare fallow losing
//   organic matter and leaching nitrate, and for leys building it; AHDB's take-all, clubroot and potato cyst nematode
//   guidance for disease building with repeats and dying without a host; Håkansson & Reeder (1994) for compaction, through
//   src/sim/models/machinery.ts; Klein et al. (2007) and Wood et al. (2015) for a field margin's pollination and natural
//   enemies, through the flower data (src/data/flowers.ts).
// Simplifies: a field year is one step, September to August, on a mean year's temperature and moisture (a wetter or drier
//   year comes in as the winter's drainage and a dryness score); one 30 cm layer as in the garden; a rotation's crops all
//   drilled and harvested on the same days each year; nitrogen as mineral (nitrate), organic and a residue pool that
//   mineralises 60 % next year; no ammonia loss, denitrification beyond nitrous oxide, erosion, weeds or blight (the garden
//   has blight); phosphorus and potassium as one pool each that fertiliser tops up; a margin as a share of the field that
//   yields nothing and feeds bees and predators; the price and yield of a crop the same every year (the market, part 14,
//   moves prices). The garden's beds run the same numbers with the field's hectare as a bed's few square metres.
//   Fast effect: this year's yield and cash from the crop, the nitrogen it needs and what a legume before it has left.
//   Slow effect: soil-borne disease building over repeated families, organic matter and structure changing over years, and
//   compaction and leached nitrate carrying into the next years' yields.
import {
  ACTS, CATCH, CLIMATE, DROUGHT, FIELD_SOILBORNE, GENERIC_PEST, HEALTH_LOSS, MANURE, MARGIN_FULL, N2O, NITROGEN, NORMAL_YEAR, PK, PRICE, ROOT_DEPTH, ROTATION,
  type Act, type FieldFamily,
} from '../../data/rotation';
import {BEES} from '../../data/flowers';
import {USED_TRACTOR} from '../../data/machinery';
import {BULK_DENSITY, DEPTH, START_NITRATE_KG_HA, TEXTURES, type TextureName} from '../../data/soils';
import type {System, TickContext} from '../clock';
import {qty, type GraphNode, type LeverValue, type Unit} from '../graph';
import {ATMOSPHERE} from '../state';
import {recovered, wheelings, yieldFactor, compactedStructure} from './machinery';
import {hydraulics, humified, moistFactor, tempFactor} from './soil';

export {ACTS, ROTATION, NORMAL_YEAR};
export type {Act};

const C_TO_N = 10, OM_PER_C = 1.724, C_PER_CO2 = 12 / 44;
/** soil.ts's decay constants a year (RothC's humus and fresh matter): they aren't exported there. */
const K_HUMUS = 0.02, K_FRESH = 1.0;
/** Kilograms of dry soil in a hectare of the layer. */
const SOIL_KG = DEPTH * BULK_DENSITY * 1e4;
/** Years of past crops a field remembers. */
export const MEMORY = 5;

/** What a year did to a crop's family or a field: one past year, most recent last. */
export interface Past {
  act: Act;
  family: FieldFamily | null;
  /** Its yield as a share of a full crop's, 0–1. */
  yield: number;
}

/** A field's soil and past, per hectare (all the stocks in kg/ha; compaction points of structure lost, 0–100). */
export interface Field {
  hectares: number;
  texture: TextureName;
  /** Carbon in humus and in fresh matter, kg C. */
  humus: number;
  fresh: number;
  /** Nitrogen in the organic matter, in last year's residues and manure (the credit the next crop gets), and as mineral nitrate, kg N. */
  organicN: number;
  residueN: number;
  nitrate: number;
  /** Plant-available phosphorus and potassium, kg. */
  p: number;
  k: number;
  compaction: number;
  /** Soil-borne disease by family, 0–1. */
  inoculum: Record<FieldFamily, number>;
  history: Past[];
  /** A catch crop was sown after last harvest, so the ground is green this winter. */
  catchCrop: boolean;
  /** The share of the field in margins and hedges, 0–1. */
  margin: number;
}

/** A year's plan for a field. */
export interface Plan {
  act: Act;
  /** Sow a catch crop after harvest, to hold next winter's nitrogen. */
  catchCrop?: boolean;
  /** Farmyard manure spread, t/ha. */
  manure?: number;
  /** The share of the advised nitrogen applied (1: RB209's advice). */
  feed?: number;
  /** Put back the phosphorus and potassium the harvest takes (default true); false mines the soil. */
  maintain?: boolean;
}

/** The winter's and summer's weather for a field year. */
export interface Weather {
  drainage: number;
  dry: number;
  season: number;
}

/** A new field: a loam of the given organic matter with soil.ts's index 2 nutrients, 40 kg N/ha of nitrate and clean of disease. */
export function newField(o: Partial<{hectares: number; texture: TextureName; organicMatter: number; margin: number}> = {}): Field {
  const texture = o.texture ?? 'loam', om = o.organicMatter ?? 3.5, c = (om / 100 / OM_PER_C) * SOIL_KG;
  return {
    hectares: o.hectares ?? 1, texture, humus: c * 0.98, fresh: c * 0.02, organicN: c / C_TO_N, residueN: 0, nitrate: START_NITRATE_KG_HA,
    p: PK.start.p, k: PK.start.k, compaction: 0,
    inoculum: {cereal: FIELD_SOILBORNE.cereal.start, solanum: FIELD_SOILBORNE.solanum.start, brassica: FIELD_SOILBORNE.brassica.start, legume: FIELD_SOILBORNE.legume.start},
    history: [], catchCrop: false, margin: o.margin ?? 0,
  };
}

// ---- the soil, per hectare ----

/** Organic matter, % of dry soil. */
export const organicMatterOf = (f: Field) => (100 * (f.humus + f.fresh) * OM_PER_C) / SOIL_KG;
/** Structure, 0–100, from the organic carbon to clay ratio (soil.ts's `structure()`), before compaction. */
export function structureOf(f: Field): number {
  const ratio = organicMatterOf(f) / OM_PER_C / (100 * TEXTURES[f.texture].clay);
  return 100 * Math.min(1, Math.max(0, (ratio - 1 / 20) / (1 / 8 - 1 / 20)));
}
/** Water a soil holds for roots, m³/m³ (field capacity less wilting point). */
export const awcOf = (f: Field) => {
  const h = hydraulics(TEXTURES[f.texture], organicMatterOf(f));
  return h.fc - h.wp;
};
/** Soil health, 0–100: soil.ts's 4:3:3 of organic matter, structure (less compaction) and moisture stress (none in a mean year). */
export function healthOf(f: Field): number {
  const om = 100 * Math.min(1, Math.max(0, (organicMatterOf(f) - 1) / 5));
  return 0.4 * om + 0.3 * compactedStructure(structureOf(f), f.compaction) + 0.3 * 100;
}
/** Water the rooting zone holds at field capacity, mm: winter rain drains through all of it, not only the 30 cm layer's. */
const fcMm = (f: Field) => hydraulics(TEXTURES[f.texture], organicMatterOf(f)).fc * ROOT_DEPTH * 1000;

/** The nitrogen a soil, its last crop's residues and this year's weather give the season before any fertiliser: the mineral nitrogen in spring, kg/ha. */
export const nitrogenSupply = (f: Field, act: Act, w: Weather = NORMAL_YEAR) => season(f, act, w).supply;

// ---- what came before ----

export const lastAct = (f: Field): Past | null => f.history[f.history.length - 1] ?? null;
/** How many years running (counting back) the field has carried this family. */
export function yearsOf(f: Field, family: FieldFamily): number {
  let n = 0;
  for (let i = f.history.length - 1; i >= 0 && f.history[i]!.family === family; i--) n++;
  return n;
}
/** The yield a soil-borne disease leaves: 1 with none, less as inoculum builds. */
export const diseaseFactor = (f: Field, family: FieldFamily | undefined) => (family ? 1 - FIELD_SOILBORNE[family].harm * f.inoculum[family] : 1);

/** "Follow the rotation": the next in the sequence after what the field last carried (the first if it is new or carried none of it). */
export function followRotation(f: Field, sequence: readonly Act[] = ROTATION): Plan {
  const last = [...f.history].reverse().find((p) => sequence.includes(p.act));
  const i = last ? sequence.indexOf(last.act) : -1;
  return {act: sequence[(i + 1) % sequence.length]!};
}

// ---- a year ----

/** What a field year did, per hectare. */
export interface Result {
  field: Field;
  act: Act;
  /** Tonnes of produce, its share of a full crop and the factors on it. */
  yieldT: number;
  relative: number;
  factors: {nitrogen: number; disease: number; pests: number; compaction: number; nutrients: number; health: number; drought: number; pollination: number; land: number; season: number};
  revenue: number;
  cost: number;
  margin: number;
  /** Nitrogen, kg/ha: what came in and went out, and the stocks' change (nitrate + organic + residue): in − out = change. */
  n: {fertiliser: number; manure: number; fixed: number; offtake: number; uptake: number; mineralised: number; leached: number; nitrous: number; held: number; change: number};
  /** Carbon, kg C/ha: put in, lost to the air, and the change in the organic matter. */
  c: {input: number; lost: number; change: number};
  /** Kg CO₂e per hectare from nitrous oxide, and the net change in soil carbon in CO₂e (positive stored). */
  nitrousCo2e: number;
  soilCo2e: number;
  /** Fertiliser P and K put on, kg/ha. */
  pk: {p: number; k: number};
  /** Mineral nitrogen that leached over the winter, kg/ha, and the share of the year's ground that was green. */
  green: number;
}

/** The season's nitrogen before any fertiliser and the year's decay, from the soil model's own rate modifiers. */
function season(f: Field, act: Act, w: Weather) {
  const spec = ACTS[act], t = TEXTURES[f.texture], h = humified(t.clay);
  const rate = tempFactor(CLIMATE.meanTemp) * moistFactor(CLIMATE.moisture) * (1 - 0.4 * spec.green);
  const lostHumus = f.humus * (1 - Math.exp(-K_HUMUS * rate)) * (1 - h), decayed = f.fresh * (1 - Math.exp(-K_FRESH * rate));
  const toAir = lostHumus + decayed * (1 - h), toHumus = decayed * h;
  const mineralised = Math.min(f.organicN, toAir / C_TO_N), release = NITROGEN.residueRelease * f.residueN;
  const freed = mineralised + release;
  const winter = NITROGEN.winterShare * freed, summer = freed - winter;
  const cover = spec.winter || f.catchCrop || act === 'cover' || act === 'ley';
  const held = cover ? Math.min(f.nitrate + winter, Math.max(spec.winterUptake, f.catchCrop ? CATCH.uptake : 0)) : 0;
  const exposed = f.nitrate + winter - held, share = 1 - Math.exp(-w.drainage / Math.max(1, fcMm(f)));
  const leachedGross = exposed * share;
  const supply = exposed - leachedGross + held * NITROGEN.heldRelease + summer;
  return {spec, h, toAir, toHumus, lostHumus, decayed, mineralised, release, held, leachedGross, supply, cover};
}

/** Runs a field through a year under a plan and a year's weather; the input field is never changed. */
export function farmYear(f: Field, plan: Plan, w: Weather = NORMAL_YEAR): Result {
  const act = plan.act, s = season(f, act, w), {spec} = s;
  const manureT = plan.manure ?? 0, manureN = manureT * MANURE.n, manureAvail = manureN * MANURE.avail;
  // nitrogen: the advised fertiliser fills what the soil, residues and manure leave short of the crop's need
  const pool2 = s.supply + manureAvail;
  const advised = spec.need > 0 && spec.maxN > 0 ? Math.min(spec.maxN, Math.max(0, spec.need / NITROGEN.recovery - pool2)) : 0;
  const fertiliser = advised * (plan.feed ?? 1), pool3 = pool2 + fertiliser;
  const take = Math.min(spec.need, NITROGEN.recovery * pool3), nShare = spec.need > 0 ? take / spec.need : 1;
  const nitrogen = 1 - NITROGEN.yieldLoss * (1 - nShare);
  // the other things that hold a crop back
  const disease = diseaseFactor(f, spec.family);
  const pests = 1 - GENERIC_PEST.loss * (1 - GENERIC_PEST.held * Math.min(1, f.margin / MARGIN_FULL));
  const compaction = yieldFactor(f.compaction);
  const short = (have: number, floor: number) => 1 - PK.yieldLoss * (1 - Math.min(1, Math.max(0, have) / floor));
  const nutrients = Math.min(short(f.p + manureT * MANURE.p, PK.floor.p), short(f.k + manureT * MANURE.k, PK.floor.k));
  const health = 1 - HEALTH_LOSS * (1 - healthOf(f) / 100);
  const drought = 1 - w.dry * DROUGHT.loss * Math.max(0, 1 - awcOf(f) / DROUGHT.awcRef);
  const bees = Math.min(1, (BEES.base + BEES.flowers * Math.min(1, f.margin / MARGIN_FULL)) / BEES.full);
  const pollination = 1 - (spec.pollinated ?? 0) * (1 - bees);
  const land = 1 - f.margin;
  const factors = {nitrogen, disease, pests, compaction, nutrients, health, drought, pollination, land, season: w.season};
  const others = disease * pests * compaction * nutrients * health * drought * pollination * land * w.season;
  const relative = spec.yield > 0 ? nitrogen * others : 0, yieldT = spec.yield * relative;
  const crop = spec.yield > 0 || spec.fix > 0 || spec.need > 0;
  const fixed = spec.fix * others, uptake = crop ? take + fixed : 0, offtake = uptake * spec.offtake, residueNew = uptake - offtake;
  const nitrous = Math.min(Math.max(0, pool3 - take), N2O.direct * (fertiliser + manureN + s.release));
  const pool4 = pool3 - take - nitrous;
  const indirect = s.leachedGross * N2O.indirect, leached = s.leachedGross - indirect;
  // carbon: residues, roots, manure and catch crop go in as fresh matter, decaying from next year
  const residueC = spec.residueC * (0.5 + 0.5 * (spec.yield > 0 ? relative : 1)), cIn = residueC + manureT * MANURE.carbon + (plan.catchCrop ? CATCH.carbon : 0);
  // phosphorus and potassium: the harvest takes them off; the plan puts them back (and manure brings some)
  const takeP = spec.p * relative, takeK = spec.k * relative;
  const putP = plan.maintain === false ? 0 : Math.max(0, takeP - manureT * MANURE.p), putK = plan.maintain === false ? 0 : Math.max(0, takeK - manureT * MANURE.k);
  // wheels
  let compact = f.compaction;
  for (const j of spec.wheelings) compact = wheelings(compact, j.op, USED_TRACTOR.weightT, j.wet, j.passes);
  compact = recovered(compact, 365);
  const past: Past = {act, family: spec.family ?? null, yield: relative};
  const inoculum = {...f.inoculum};
  for (const fam of Object.keys(inoculum) as FieldFamily[]) {
    inoculum[fam] *= Math.pow(0.5, 365 / FIELD_SOILBORNE[fam].halfLife);
    if (spec.family === fam) inoculum[fam] = Math.min(1, inoculum[fam] * (1 + FIELD_SOILBORNE[fam].gain));
  }
  const humus = f.humus - s.lostHumus + s.toHumus, fresh = f.fresh - s.decayed + cIn;
  const next: Field = {
    ...f, humus, fresh, compaction: compact, inoculum, history: [...f.history, past].slice(-MEMORY), catchCrop: !!plan.catchCrop,
    organicN: f.organicN - s.mineralised + (1 - NITROGEN.residueRelease) * f.residueN + (1 - NITROGEN.heldRelease) * s.held + MANURE.organic * manureN,
    residueN: residueNew + MANURE.residue * manureN,
    nitrate: pool4,
    p: Math.max(0, f.p - takeP + putP + manureT * MANURE.p), k: Math.max(0, f.k - takeK + putK + manureT * MANURE.k),
  };
  const revenue = yieldT * spec.price;
  const cost = spec.cost + fertiliser * PRICE.n + putP * PRICE.p + putK * PRICE.k + manureT * MANURE.cost + (plan.catchCrop ? CATCH.cost : 0);
  const nBefore = f.nitrate + f.organicN + f.residueN, nAfter = next.nitrate + next.organicN + next.residueN;
  const carbonChange = humus + fresh - f.humus - f.fresh;
  return {
    field: next, act, yieldT, relative, factors, revenue, cost, margin: revenue - cost,
    n: {fertiliser, manure: manureN, fixed, offtake, uptake, mineralised: s.mineralised + s.release, leached, nitrous: nitrous + indirect, held: s.held, change: nAfter - nBefore},
    c: {input: cIn, lost: s.toAir, change: carbonChange},
    nitrousCo2e: (nitrous + indirect) * N2O.massRatio * N2O.gwp,
    soilCo2e: carbonChange / C_PER_CO2,
    pk: {p: putP, k: putK}, green: spec.green,
  };
}

// ---- scoring plans ----

/** What a run of plans earns and costs a field. */
export interface Score {
  years: Result[];
  /** Cash margin, £/ha, by year and in all. */
  margins: number[];
  total: number;
  /** Nitrate leached, kg N/ha, and nitrous oxide, kg CO₂e/ha, in all. */
  leached: number;
  nitrousCo2e: number;
  /** Soil carbon change, kg CO₂e/ha (positive stored), and organic matter and soil-borne disease at the end. */
  soilCo2e: number;
  organicMatter: number;
  disease: number;
  compaction: number;
  health: number;
  /** The field at the end. */
  field: Field;
}

/** A plan per year over a field (or a chooser that picks each year's plan from the field as it stands); the score of what it costs and earns. */
export function scorePlans(f: Field, plans: readonly Plan[] | ((f: Field, year: number) => Plan), years = 3, weather: readonly Weather[] | Weather = NORMAL_YEAR): Score {
  const results: Result[] = [];
  let cur = f;
  for (let y = 0; y < years; y++) {
    const plan = typeof plans === 'function' ? plans(cur, y) : plans[y % plans.length]!;
    const r = farmYear(cur, plan, Array.isArray(weather) ? (weather as Weather[])[y % (weather as Weather[]).length]! : (weather as Weather));
    results.push(r);
    cur = r.field;
  }
  const margins = results.map((r) => r.margin);
  return {
    years: results, margins, total: margins.reduce((a, b) => a + b, 0),
    leached: results.reduce((a, r) => a + r.n.leached, 0), nitrousCo2e: results.reduce((a, r) => a + r.nitrousCo2e, 0),
    soilCo2e: results.reduce((a, r) => a + r.soilCo2e, 0), organicMatter: organicMatterOf(cur),
    disease: Math.max(...Object.values(cur.inoculum)), compaction: cur.compaction, health: healthOf(cur), field: cur,
  };
}
/** Follow the rotation, every year. */
export const followed = (f: Field, _year = 0): Plan => followRotation(f);
/** The same act every year. */
export const continuous = (act: Act) => (): Plan => ({act});

// ---- scale-free: the same functions for a bed, a field, a farm or a region ----

/** A field's or bed's stocks as totals for its own area, kg: what a graph node holds. */
export function totalsOf(f: Field, hectares = f.hectares) {
  return {
    carbon: (f.humus + f.fresh) * hectares / C_PER_CO2, nitrate: f.nitrate * hectares, organicN: f.organicN * hectares, residueN: f.residueN * hectares,
    p: f.p * hectares, k: f.k * hectares,
  };
}
/** Fields summed to a farm or a region: hectares, and the area-weighted organic matter, health and yield of a set of results. */
export function summed(fields: readonly Field[], results: readonly Result[] = []) {
  const ha = fields.reduce((a, f) => a + f.hectares, 0), avg = (g: (f: Field) => number) => (ha ? fields.reduce((a, f) => a + g(f) * f.hectares, 0) / ha : 0);
  return {
    hectares: ha, organicMatter: avg(organicMatterOf), health: avg(healthOf), compaction: avg((f) => f.compaction),
    yieldT: results.reduce((a, r, i) => a + r.yieldT * (fields[i]?.hectares ?? 1), 0), margin: results.reduce((a, r, i) => a + r.margin * (fields[i]?.hectares ?? 1), 0),
    leached: results.reduce((a, r, i) => a + r.n.leached * (fields[i]?.hectares ?? 1), 0), nitrousCo2e: results.reduce((a, r, i) => a + r.nitrousCo2e * (fields[i]?.hectares ?? 1), 0),
  };
}

// ---- on the graph ----

/** The stocks a field node keeps beside soil.ts's `SOIL` ones: last year's residue nitrogen (the crop's credit). */
export const RESIDUE_N = 'nitrogen.residue';
/** The levers a field node keeps: its plan (an Act, a Plan, or 'rotation' to follow it), and the state that isn't a stock. */
export const PLAN_LEVER = 'plan', PAST_LEVER = 'past', PAYER_LEVER = 'payer';
export interface FieldPast {
  history: Past[];
  inoculum: Record<FieldFamily, number>;
  catchCrop: boolean;
  margin: number;
  compaction: number;
}
const stock = (n: GraphNode, key: string) => Math.max(0, n.stocks[key]?.amount ?? 0);

/** A field's state read from its node: soil.ts's stocks per hectare (land.crops is its area, m²) and its levers. */
export function fieldOf(n: GraphNode): Field | null {
  const m2 = stock(n, 'land.crops') + stock(n, 'land.grass');
  if (m2 <= 0) return null;
  const ha = m2 / 1e4, past = n.levers[PAST_LEVER] as unknown as FieldPast | undefined, fresh = newField();
  return {
    hectares: ha, texture: (n.levers.texture as TextureName | undefined) ?? 'loam',
    humus: (stock(n, 'carbon') * C_PER_CO2) / ha, fresh: (stock(n, 'carbon.fresh') * C_PER_CO2) / ha,
    organicN: stock(n, 'nitrogen.organic') / ha, residueN: stock(n, RESIDUE_N) / ha, nitrate: stock(n, 'nitrate') / ha,
    p: stock(n, 'phosphorus') / ha, k: stock(n, 'potassium') / ha,
    compaction: past?.compaction ?? 0, inoculum: past?.inoculum ?? fresh.inoculum, history: past?.history ?? [], catchCrop: past?.catchCrop ?? false, margin: past?.margin ?? 0,
  };
}

/** The plan a node's lever gives this year. */
export function planOf(n: GraphNode, f: Field): Plan {
  const v = n.levers[PLAN_LEVER] as unknown;
  if (v === undefined || v === null || v === 'rotation') return followRotation(f);
  if (typeof v === 'string') return {act: v as Act};
  return v as Plan;
}

/** Runs a field node through a year: the flows move its stocks to the new ones (money too, if it has a payer), its levers are replaced. Returns the result, or null if it isn't a field with land. */
export function growYear(c: TickContext, n: GraphNode, plan?: Plan, weather: Weather = NORMAL_YEAR): Result | null {
  const f = fieldOf(n);
  if (!f) return null;
  const p = plan ?? planOf(n, f), r = farmYear(f, p, weather), ha = f.hectares, s = season(f, p.act, weather);
  const air = {node: ATMOSPHERE, stock: 'carbon'}, at = (stock: string) => ({node: n.id, stock});
  const mv = (what: string, unit: Unit, amount: number, from: Parameters<TickContext['flow']>[0]['from'], to: Parameters<TickContext['flow']>[0]['to']) => {
    if (amount > 1e-9) c.flow({what, unit, amount: qty(amount, unit), from, to});
  };
  const co2 = (kgC: number) => (kgC * ha) / C_PER_CO2;
  // organic matter: decay to the air, humus formed, and the carbon in
  mv('decay', 'kgCO2e', co2(s.lostHumus), at('carbon'), air);
  mv('decay', 'kgCO2e', co2(s.decayed - s.toHumus), at('carbon.fresh'), air);
  mv('humification', 'kgCO2e', co2(s.toHumus), at('carbon.fresh'), at('carbon'));
  const manureC = (p.manure ?? 0) * MANURE.carbon;
  mv('residues', 'kgCO2e', co2(r.c.input - manureC), air, at('carbon.fresh'));
  // nitrogen (the balance in Result.n is per hectare; the flows are for the whole field)
  const N = (x: number) => x * ha;
  mv('mineralisation', 'kgN', N(s.mineralised), at('nitrogen.organic'), at('nitrate'));
  mv('mineralisation', 'kgN', N(s.release), at(RESIDUE_N), at('nitrate'));
  mv('immobilisation', 'kgN', N((1 - NITROGEN.residueRelease) * f.residueN), at(RESIDUE_N), at('nitrogen.organic'));
  mv('fertiliser', 'kgN', N(r.n.fertiliser), {boundary: 'bought'}, at('nitrate'));
  const manureT = p.manure ?? 0;
  mv('manure', 'kgN', N(r.n.manure * MANURE.avail), {boundary: 'bought'}, at('nitrate'));
  mv('manure', 'kgN', N(r.n.manure * MANURE.residue), {boundary: 'bought'}, at(RESIDUE_N));
  mv('manure', 'kgN', N(r.n.manure * MANURE.organic), {boundary: 'bought'}, at('nitrogen.organic'));
  mv('manure', 'kgCO2e', co2(manureC), {boundary: 'bought'}, at('carbon.fresh'));
  mv('leaching', 'kgN', N(r.n.leached), at('nitrate'), {boundary: 'drainage'});
  mv('nitrous oxide', 'kgN', N(r.n.nitrous), at('nitrate'), {boundary: 'decay'});
  mv('nitrous oxide', 'kgCO2e', N(r.nitrousCo2e), {boundary: 'decay'}, air);
  mv('uptake', 'kgN', N(r.n.uptake - r.n.fixed), at('nitrate'), {boundary: 'growth'});
  mv('residues', 'kgN', N(r.n.uptake - r.n.offtake), {boundary: 'growth'}, at(RESIDUE_N));
  mv('held', 'kgN', N(s.held * (1 - NITROGEN.heldRelease)), at('nitrate'), at('nitrogen.organic'));
  // phosphorus and potassium
  const spec = ACTS[p.act];
  mv('uptake', 'kgP', N(spec.p * r.relative), at('phosphorus'), {boundary: 'growth'});
  mv('uptake', 'kgK', N(spec.k * r.relative), at('potassium'), {boundary: 'growth'});
  mv('fertiliser', 'kgP', N(r.pk.p + manureT * MANURE.p), {boundary: 'bought'}, at('phosphorus'));
  mv('fertiliser', 'kgK', N(r.pk.k + manureT * MANURE.k), {boundary: 'bought'}, at('potassium'));
  // money
  const payer = n.levers[PAYER_LEVER] as string | undefined, purse = payer ? c.graph.nodes[payer] : undefined;
  if (purse?.stocks.money) {
    mv('sales', 'GBP', N(r.revenue), {boundary: 'sold'}, {node: purse.id, stock: 'money'});
    mv('inputs', 'GBP', Math.min(N(r.cost), stock(purse, 'money') + N(r.revenue)), {node: purse.id, stock: 'money'}, {boundary: 'bought'});
  }
  const rf = r.field;
  n.levers[PAST_LEVER] = {history: rf.history, inoculum: rf.inoculum, catchCrop: rf.catchCrop, margin: rf.margin, compaction: rf.compaction} as unknown as LeverValue;
  return r;
}

/** The rotation system: each `year` tick every field node grows a year under its plan. Not listed in src/sim/systems.ts (part 11 lists it). */
export const rotation: System = {
  name: 'rotation',
  on: {
    year(c) {
      for (const n of Object.values(c.graph.nodes)) if (n.kind === 'field') growYear(c, n);
    },
  },
};
