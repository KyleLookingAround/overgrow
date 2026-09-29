// Livestock: a herd or flock kept on a node (three hens in a run, a flock of ewes on a field, pigs in a paddock): what it
// eats, drinks and makes, the manure and methane it gives off, its welfare and the chance it falls ill. A herd is fed
// from the node's `feed` stock and grazes its sward; it lays eggs by the day's light or gains liveweight; it breathes out
// enteric methane and drops manure, whose carbon and nitrogen go where its keeper manages them (to the heap, spread on a
// field, or left on the pasture) and whose gases are counted as kg CO₂e as the carbon model counts them; and a slow
// welfare index, from space, feed, water and warmth, cuts what it makes when it's low. docs/systems/livestock.md says how
// it works and what part 6 (the hens) and part 12 (the flock and pigs) wire.
//
// Sources: FAO (2013), "Greenhouse gas emissions from ruminant supply chains" and (2013) "Poultry and pig" GLEAM notes, and
//   FAO's feed intake and conversion tables, for intake and feed conversion; IPCC 2006 Guidelines vol. 4 ch. 10 (tables
//   10.10–10.11, Tier 1 enteric methane per head a year; 10.14–10.15 and 10A, manure methane from volatile solids, B₀ and
//   the methane conversion factor; 10.19, nitrogen excreted) and ch. 11 (table 11.1, direct nitrous oxide: EF1 1 % of
//   nitrogen on soils, EF3 for what's left on pasture); IPCC AR6 WGI ch. 7 (non-fossil CH₄ 27, N₂O 273 times CO₂ over
//   100 years); RB209 (AHDB, 9th edition) for how much of a manure's nitrogen a crop can use; the RHS's and industry
//   breeders' laying figures (a hybrid layer 250–300 eggs a year, few in the dark months: Lewis & Morris 2006, "Light and
//   lay", on day length and laying); the RSPCA and Soil Association stocking rates for space; Poore & Nemecek (2018),
//   Science 360, for land, water and emissions of a kg of each product (in src/data/livestock.ts).
// Simplifies: one herd, one species, on a node; the animals are all alike (no ages, breeds, lactation or breeding: a ewe's
//   lambs and a cow's milk are data for later parts); liveweight gain stops at finishing weight and never goes negative;
//   feed and grass are counted together in kg of dry matter; welfare is one index and there are no deaths; illness is
//   one state that halves what the herd makes for three weeks; drinking water leaves as `evapotranspiration`; indirect
//   nitrous oxide (from ammonia and leaching) and the manure's phosphorus and potassium are left out; a heap's own
//   methane and nitrous oxide are the carbon model's, on the manure's mass, not counted twice here; the feed's own
//   emissions (its fields, its lorry) belong to the crops and the supply chain, not to the herd.
//   Fast effect: a missed feed, an empty trough or a cold snap cuts today's eggs and gain. Slow effect: overstocking wears
//   welfare down and the ground bare over a season, and a flock's methane adds up in the air over years.
import type {System, TickContext} from '../clock';
import {qty, type Flow, type GraphNode, type LeverValue} from '../graph';
import type {Rng} from '../random';
import {ATMOSPHERE} from '../state';
import {EGG_KG, GRASS, LAYING, MANAGED, MANURE_C, MANURE_VS, N_AVAILABLE, SPECIES, type Managed, type Species, type SpeciesId} from '../../data/livestock';
import {HEAP, HEAPED, OTHER_GASES} from './carbon';
import {SOIL} from './soil';
import {weatherOf, type WeatherDay} from './weather';

/** IPCC AR6's 100-year warming per kg of non-fossil methane and of nitrous oxide, as the carbon model uses them. */
export const GWP_CH4 = 27, GWP_N2O = 273;
/** kg CO₂ in a kg of carbon, and kg N₂O in a kg of N₂O-N. */
const CO2_PER_C = 44 / 12, N2O_PER_N = 44 / 28;
/** kg of methane in a cubic metre (IPCC). */
const CH4_KG_M3 = 0.67;
/** Intake goes up this much for each °C the day's mean is below the species' comfort. */
const COLD_INTAKE = 0.02;
/** Drinking goes up this much for each °C the day's maximum is over 20 °C. */
const HEAT_WATER = 0.04;
/** Days an illness lasts untreated, and days once treated. */
export const ILL_DAYS = 21, TREATED_DAYS = 4;
/** Days welfare takes to fall (a third of the way to where it's heading) and to recover: it falls faster than it mends. */
const FALL_DAYS = 12, MEND_DAYS = 30;
/** Ground recovers this much a day when it isn't overstocked; a sward this bare (kg DM/m²) is being grazed to the roots. */
const GROUND_MEND = 0.002, BARE = 0.03, BARE_WEAR = 0.003;

/** The stocks a livestock node holds, by key. The wiring part gives each herd's node these (docs/systems/livestock.md). */
export const LIVE = {
  feed: 'feed', // kgFeed, product 'feed': what the keeper has put out
  water: 'water', // L in the trough
  manure: 'manure', // kgWaste, product 'greens': droppings waiting to be cleared to the heap
  eggs: 'eggs', // kgFood, product 'eggs'
  mass: 'liveweight', // kgFood, product 'liveweight': the herd's growth, until it's sold
  nitrogen: 'nitrogen.organic', // kgN in the manure waiting on the node (its carbon is the node's `carbon`)
} as const;

/** A herd's state, kept on its node as the `herd` lever (replaced each day, never changed in place). */
export interface Herd {
  species: SpeciesId;
  head: number;
  /** m² of run or grazing. */
  area: number;
  /** 0–1: how much of the weather's cold and heat a house, hedge or shade keeps off (a hen house 0.9, an open field 0.2). */
  shelter: number;
  /** 0–1: the slow index of how well the animals are, from space, feed, water and warmth. */
  welfare: number;
  /** 0–1: how well the run or pasture is (worn bare by overstocking, mended slowly). */
  ground: number;
  /** kg of dry matter standing on each m² of a grazed sward. */
  sward: number;
  /** Liveweight of one head, kg. */
  weight: number;
  /** Days of illness left (0 when well). */
  ill: number;
  /** Where its manure goes. */
  manage: Managed;
  /** The chance it fell ill on the last day: what the vet and the Explain card read. */
  risk: number;
  /** False for a herd that never falls ill (the garden's hens until part 12's vet). */
  disease?: boolean;
  /** For manure left or spread on a field: the node of its soil, if not this one; and the heap, if not the garden's. */
  field?: string;
  heap?: string;
}

/** A new herd, well and on good ground. */
export function newHerd(species: SpeciesId, head: number, area: number, more: Partial<Herd> = {}): Herd {
  const sp = SPECIES[species];
  return {
    species, head, area, shelter: species === 'hen' ? 0.9 : 0.2, welfare: 1, ground: 1, sward: GRASS.standing * 0.6, weight: sp.weight,
    ill: 0, manage: sp.grazes >= 1 ? 'pasture' : 'heap', risk: 0, ...more,
  };
}

/** The day, as the herd feels it: the air's warmth, the hours of light, the place in the year. */
export interface Conditions {
  tmax: number;
  tmin: number;
  /** Hours from sunrise to sunset. */
  length: number;
  dayOfYear: number;
}

/** A weather day, or a step of several (a week at higher levels), as the herd feels it. */
export function conditionsOf(w: WeatherDay): Conditions {
  const step = w.step ?? [w], n = step.length;
  return {tmax: step.reduce((s, d) => s + d.tmax, 0) / n, tmin: step.reduce((s, d) => s + d.tmin, 0) / n, length: w.length, dayOfYear: w.dayOfYear};
}

/** What the node has for the herd today: dry matter of feed, and litres of water. */
export interface Supply {
  feed: number;
  water: number;
}

/** The manure a herd makes: fresh kg, its carbon (kg CO₂e of carbon) and its nitrogen (kg N, before any is lost). */
export interface Manure {
  kg: number;
  carbon: number;
  nitrogen: number;
}

/** What a day did: the herd's next state, and every amount that moves. */
export interface Day {
  herd: Herd;
  /** kg of feed eaten from the node's stock, and of grass grazed. */
  feed: number;
  grass: number;
  /** L drunk. */
  water: number;
  /** The shares of the day's wants met. */
  feedMet: number;
  waterMet: number;
  /** kg of eggs laid; kg of liveweight gained (all the herd's). */
  eggs: number;
  gain: number;
  manure: Manure;
  /** kg CO₂e of enteric methane. */
  methane: number;
  /** kg CO₂e of methane and nitrous oxide from the manure, as it's managed (a heap's are the carbon model's). */
  gases: number;
  /** kg N of the manure lost to the air (ammonia and nitrogen gases). */
  nLost: number;
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const ratio = (h: Herd, sp: Species) => (h.head * sp.land) / Math.max(h.area, 1e-6);

/** How crowded a herd is: 1 at the good density, 2 at twice as many as the space is good for. */
export const stocking = (h: Herd) => ratio(h, SPECIES[h.species]);

/** Eggs by the light: a hen lays little in the dark months and her best from `LAYING.light` hours of daylight. */
export const light = (length: number) => LAYING.floor + (1 - LAYING.floor) * clamp((length - LAYING.dark) / (LAYING.light - LAYING.dark));

/** What welfare does to what the herd makes: everything up to 0.8, less below it, nothing at 0.2. */
export const productive = (welfare: number) => clamp((welfare - 0.2) / 0.6);

/** Cold and heat as stress, 0–1, less what shelter keeps off: 0 in comfort, 1 in a hard frost with no house or a heatwave with no shade. */
export function thermal(sp: Species, c: Conditions, shelter: number) {
  const cold = clamp((sp.comfort.low - c.tmin) / 15) * (1 - 0.8 * shelter), heat = clamp((c.tmax - sp.comfort.high) / 10) * (1 - 0.6 * shelter);
  return 1 - 0.5 * Math.max(cold, heat);
}

/** The chance a herd falls ill in `days` days: higher packed tight, higher when welfare is low. Part 12's vet and later levels' disease read it. */
export function diseaseRisk(h: Herd, days = 1) {
  if (h.disease === false || h.head <= 0) return 0;
  const yearly = Math.min(0.95, SPECIES[h.species].illness * (1 + 1.5 * Math.max(0, stocking(h) - 1)) * (1 + 3 * (1 - h.welfare)));
  return 1 - Math.pow(1 - yearly, days / 365);
}

/** Rolls the dice: true if the herd falls ill. Draws once from the `Rng` it's given, whatever the chance. */
export const fallsIll = (risk: number, r: Rng) => r.next() < risk;

/** Treats a sick herd (the vet, part 12): it mends in a few days rather than three weeks. */
export const treat = (h: Herd): Herd => (h.ill > TREATED_DAYS ? {...h, ill: TREATED_DAYS} : h);

/** The gases from a day's manure, kg CO₂e, and the nitrogen lost to the air, by how it's managed. A heap's are the carbon model's. */
export function manureGases(sp: Species, m: Manure, kgDry: number, manage: Managed) {
  const how = MANAGED[manage], n2o = manage === 'pasture' ? sp.n2oPasture : how.n2o;
  const methane = kgDry * MANURE_VS * sp.manure.b0 * CH4_KG_M3 * how.mcf * GWP_CH4;
  const nitrous = m.nitrogen * n2o * N2O_PER_N * GWP_N2O;
  return {methane, nitrous, total: methane + nitrous, nLost: m.nitrogen * how.lost};
}

/** What a heap will book for a kg of manure once it's there: the carbon model's composting gases, kg CO₂e (for the Explain card). */
export const heapGases = (kg: number) => kg * OTHER_GASES;

/** The nitrogen of a manure a crop can use in the year (RB209's share), kg N. */
export const availableN = (species: SpeciesId, kgN: number) => kgN * N_AVAILABLE[species];

/** kg of meat (carcass) from a growing animal's liveweight. */
export const carcass = (species: SpeciesId, kgLive: number) => kgLive * SPECIES[species].dressing;

/**
 * One step of a herd's life (a day, or several: `days`): pure, with no graph. Feeds it from the grass and the supply,
 * waters it, makes its eggs or gain, its manure and methane, and moves welfare, ground and illness on.
 */
export function step(h: Herd, c: Conditions, supply: Supply, days = 1): Day {
  const sp = SPECIES[h.species];
  if (h.head <= 0) return {herd: h, feed: 0, grass: 0, water: 0, feedMet: 1, waterMet: 1, eggs: 0, gain: 0, manure: {kg: 0, carbon: 0, nitrogen: 0}, methane: 0, gases: 0, nLost: 0};
  const mean = (c.tmax + c.tmin) / 2, r = stocking(h);
  // what the herd wants, and what the grass and the trough give
  const demand = h.head * sp.intake * (1 + COLD_INTAKE * Math.max(0, sp.comfort.low - mean)) * days;
  let sward = h.sward, grass = 0;
  if (sp.grazes > 0) {
    sward = Math.min(GRASS.standing, sward + GRASS.growth * clamp((mean - GRASS.base) / (GRASS.best - GRASS.base)) * h.ground * (1 - sward / GRASS.standing) * days);
    grass = Math.min(demand * sp.grazes, sward * h.area * GRASS.take);
    sward -= grass / Math.max(h.area, 1e-6);
  }
  const feed = Math.min(demand - grass, Math.max(0, supply.feed)), feedMet = clamp((grass + feed) / demand);
  const need = h.head * sp.water * (1 + HEAT_WATER * Math.max(0, c.tmax - 20)) * days;
  const water = Math.min(need, Math.max(0, supply.water)), waterMet = clamp(water / need);
  // the slow effects: welfare moves toward what space, feed, water and warmth allow; the ground wears when overstocked
  const warmth = thermal(sp, c, h.shelter), over = Math.max(0, r - 1);
  const space = (1 / (1 + sp.crowding * over)) * (0.5 + 0.5 * h.ground);
  const target = Math.pow(space, 0.3) * Math.pow(Math.max(0.02, feedMet), 0.3) * Math.pow(Math.max(0.02, waterMet), 0.25) * Math.pow(warmth, 0.15) * (h.ill > 0 ? 0.7 : 1);
  const welfare = h.welfare + (target - h.welfare) * (1 - Math.exp(-days / (target < h.welfare ? FALL_DAYS : MEND_DAYS)));
  let ground = h.ground;
  if (over > 0) ground -= sp.wear * over * days;
  else ground += GROUND_MEND * days;
  if (sp.grazes >= 0.5 && sward < BARE) ground -= BARE_WEAR * days;
  ground = clamp(ground);
  // what it makes, cut by welfare, illness, the cold and what was missed
  const made = productive(welfare) * (h.ill > 0 ? 0.5 : 1) * warmth;
  const eggs = sp.layRate > 0 ? h.head * sp.layRate * light(c.length) * made * Math.pow(feedMet, 1.5) * Math.pow(waterMet, 2) * EGG_KG * days : 0;
  const room = Math.max(0, sp.finish - h.weight);
  const perHead = sp.gain > 0 ? Math.min(room, sp.gain * feedMet * waterMet * made * days) : 0;
  // what comes out: manure and methane follow what was eaten
  const ration = Math.min(1.3, (grass + feed) / (h.head * sp.intake * days));
  const kg = h.head * sp.manure.fresh * ration * days, dry = kg * sp.manure.dry;
  const manure: Manure = {kg, carbon: dry * MANURE_C * CO2_PER_C, nitrogen: ((h.head * sp.nRate * h.weight) / 1000) * ration * days};
  const managed = manureGases(sp, manure, dry, h.manage);
  const next: Herd = {...h, welfare, ground, sward, weight: h.weight + perHead, ill: Math.max(0, h.ill - days)};
  next.risk = diseaseRisk(next, days);
  return {
    herd: next, feed, grass, water, feedMet, waterMet, eggs, gain: perHead * h.head, manure,
    methane: ((h.head * sp.methane) / 365) * ration * days * GWP_CH4, gases: managed.total, nLost: managed.nLost,
  };
}

// ---- on the graph ----

const at = (node: string, stock: string) => ({node, stock});
// the air node, looked up when used (state.ts and the models import each other)
const air = () => at(ATMOSPHERE, 'carbon');

export const herdOf = (n: GraphNode): Herd | null => (n.levers.herd as unknown as Herd | undefined) ?? null;
export const setHerd = (n: GraphNode, h: Herd | null) => void (n.levers.herd = h as unknown as LeverValue);

/** Every flow a day makes, for the herd on `node`, as the flows to move (the wiring part's `System` applies them). */
export function dayFlows(node: string, res: Day, dest: {field: string; heap: string}): Flow[] {
  const h = res.herd, out: Flow[] = [];
  const add = (f: Flow) => void (f.amount > 1e-12 && out.push(f));
  add({what: 'feeding', unit: 'kgFeed', product: 'feed', amount: qty(res.feed, 'kgFeed'), from: at(node, LIVE.feed), to: {boundary: 'eaten'}});
  add({what: 'drinking', unit: 'L', amount: qty(res.water, 'L'), from: at(node, LIVE.water), to: {boundary: 'evapotranspiration'}});
  add({what: 'laying', unit: 'kgFood', product: 'eggs', amount: qty(res.eggs, 'kgFood'), from: {boundary: 'growth'}, to: at(node, LIVE.eggs)});
  add({what: 'growing', unit: 'kgFood', product: 'liveweight', amount: qty(res.gain, 'kgFood'), from: {boundary: 'growth'}, to: at(node, LIVE.mass)});
  add({what: 'enteric methane', unit: 'kgCO2e', amount: qty(res.methane, 'kgCO2e'), from: {boundary: 'decay'}, to: air()});
  const m = res.manure, keep = m.nitrogen - res.nLost;
  if (h.manage === 'heap') {
    // droppings wait on the node until they're cleared to the heap (`clearOut`)
    add({what: 'droppings', unit: 'kgWaste', product: 'greens', amount: qty(m.kg, 'kgWaste'), from: {boundary: 'decay'}, to: at(node, LIVE.manure)});
    add({what: 'droppings carbon', unit: 'kgCO2e', amount: qty(m.carbon, 'kgCO2e'), from: air(), to: at(node, 'carbon')});
    add({what: 'droppings nitrogen', unit: 'kgN', amount: qty(keep, 'kgN'), from: {boundary: 'growth'}, to: at(node, LIVE.nitrogen)});
  } else {
    // left on the pasture or spread: straight into the soil's fresh organic matter and its nitrogen
    add({what: h.manage === 'pasture' ? 'dung on the pasture' : 'spreading manure', unit: 'kgCO2e', amount: qty(m.carbon, 'kgCO2e'), from: air(), to: at(dest.field, SOIL.fresh)});
    add({what: 'manure nitrogen', unit: 'kgN', amount: qty(keep, 'kgN'), from: {boundary: 'growth'}, to: at(dest.field, SOIL.organicN)});
  }
  add({what: 'manure methane and nitrous oxide', unit: 'kgCO2e', amount: qty(res.gases, 'kgCO2e'), from: {boundary: 'decay'}, to: air()});
  return out;
}

/** Clears the droppings waiting on a node to the heap, with the carbon and nitrogen in them (the keeper's job, part 6). */
export function clearOut(c: TickContext, node: GraphNode, kg = Infinity) {
  const heap = c.graph.nodes[herdOf(node)?.heap ?? HEAP], have = node.stocks[LIVE.manure]?.amount ?? 0;
  kg = Math.min(kg, have);
  if (!heap || kg <= 1e-9) return;
  const share = kg / have, carbon = (node.stocks.carbon?.amount ?? 0) * share, n = (node.stocks[LIVE.nitrogen]?.amount ?? 0) * share;
  c.flow({what: 'clearing out', unit: 'kgWaste', product: 'greens', amount: qty(kg, 'kgWaste'), from: at(node.id, LIVE.manure), to: at(heap.id, HEAPED.waste)});
  if (carbon > 1e-9) c.flow({what: 'clearing out', unit: 'kgCO2e', amount: qty(carbon, 'kgCO2e'), from: at(node.id, 'carbon'), to: at(heap.id, 'carbon')});
  if (n > 1e-9) c.flow({what: 'clearing out', unit: 'kgN', amount: qty(n, 'kgN'), from: at(node.id, LIVE.nitrogen), to: at(heap.id, HEAPED.nitrogen)});
}

/** The herd's day on the graph: reads the weather and the node's stocks, moves the flows, keeps the herd's next state. */
function dayOn(c: TickContext, node: GraphNode, herd: Herd) {
  const w = weatherOf(c.graph);
  if (!w || !c.graph.nodes[ATMOSPHERE]) return;
  const days = Math.max(1, c.dt / 24);
  const res = step(herd, conditionsOf(w), {feed: node.stocks[LIVE.feed]?.amount ?? 0, water: node.stocks[LIVE.water]?.amount ?? 0}, days);
  const field = herd.field && c.graph.nodes[herd.field] ? herd.field : node.id;
  for (const f of dayFlows(node.id, res, {field, heap: herd.heap ?? HEAP})) c.flow(f);
  let next = res.herd;
  if (next.disease !== false && next.ill <= 0 && fallsIll(next.risk, c.rng)) next = {...next, ill: ILL_DAYS};
  setHerd(node, next);
}

export const livestock: System = {
  name: 'livestock',
  on: {
    day(c) {
      for (const node of Object.values(c.graph.nodes)) {
        const herd = herdOf(node);
        if (herd) dayOn(c, node, herd);
      }
    },
  },
};

// ---- per kg of product ----

/** kg CO₂e of methane and manure gases per kg of product, over a year at the good density (the herd's own; a heap's from the carbon model). */
export function footprint(species: SpeciesId, manage: Managed = SPECIES[species].grazes >= 1 ? 'pasture' : 'heap') {
  const own = perYear(species, manage);
  const dam = SPECIES[species].breeders;
  const raised = dam ? perYear(dam.species, manage) : {methane: 0, manure: 0, product: 0, days: 0};
  const product = own.product;
  const methane = (own.methane + (dam ? raised.methane * dam.headYears : 0)) / product;
  const manureGas = (own.manure + (dam ? raised.manure * dam.headYears : 0)) / product;
  return {methane, manure: manureGas, product};
}

/**
 * One head's year, for the per-kg figures: a year of `step` at a mild day, fed to need, its methane and manure gases
 * (a heap's booked by the carbon model's factor on its mass), and the product it makes: kg of eggs, or of carcass a head
 * raised (a grower's gain from start to finish, over the days that takes).
 */
function perYear(species: SpeciesId, manage: Managed) {
  const sp = SPECIES[species];
  const days = sp.gain > 0 ? (sp.finish - sp.weight * 0.2) / sp.gain : 365;
  let h = newHerd(species, 1, sp.land, {manage, disease: false, sward: GRASS.standing, shelter: 1});
  if (sp.gain > 0) h = {...h, weight: sp.weight * 0.2};
  let methane = 0, manure = 0, product = 0;
  const day: Conditions = {tmax: 14, tmin: 6, length: 12, dayOfYear: 120};
  for (let d = 0; d < Math.ceil(days); d++) {
    const r = step(h, day, {feed: 100, water: 100});
    methane += r.methane;
    manure += r.gases + (manage === 'heap' ? heapGases(r.manure.kg) : 0);
    product += sp.layRate > 0 ? r.eggs : carcass(species, r.gain);
    h = {...r.herd, sward: GRASS.standing};
  }
  return {methane, manure, product, days};
}
