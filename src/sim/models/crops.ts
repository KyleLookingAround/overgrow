// Crops: what grows in each dug bed, from sowing to the compost heap. A crop develops by growing degree days above its
// base temperature, emerges, covers the ground and comes ready; it takes nitrogen, phosphorus and potassium from the
// bed's soil as it grows, and water through the water model's crop coefficient; water stress and short nutrients cut its
// yield and its quality; a frost kills the tender ones; and once it's picked, bolted or spent, its residue is left on
// the bed for the gardener to carry to the heap. The crop in a bed is kept on the bed as its `crop` lever (the garden's,
// not the plan's), and its produce as a `food.<product>` stock the gardener picks. docs/systems/crops.md says how.
//
// Sources: growing-degree-day phenology (the thermal time above a base temperature sets the pace of development;
//   McMaster & Wilhelm 1997, "Growing degree-days: one equation, two interpretations", the simple average method); RHS
//   sowing calendars and crop guides for when each is sown and how many weeks it takes; FAO Irrigation and Drainage
//   Paper 56 (Allen et al. 1998) for the crop coefficients by stage (table 12, the four-stage curve of figure 25), the
//   depletion fraction p (table 22) and the water stress coefficient Ks (eq. 84); FAO Irrigation and Drainage Paper 33
//   (Doorenbos & Kassam 1979) for the yield response to water, 1 − Ya/Ym = Ky (1 − ETa/ETm); RB209 (AHDB 2023,
//   section 6) for the nitrogen, phosphorus and potassium a full crop takes up; Liebig's law of the minimum for the
//   scarcest nutrient limiting growth; RHS guidance on frost-tender crops (beans and tomatoes killed below 0 °C,
//   potato haulm blackened and regrowing from the tubers).
// Simplifies: one crop to a bed, all sown at once and growing as one; development from the day's mean temperature (no
//   day length, no vernalisation, no heat stress); water stress cuts yield and quality but not the pace; uptake in
//   proportion to development; beans' own nitrogen fixation stands in as a small uptake, with no nitrogen added to the
//   soil; roots and stubble go to the heap with the residue, not into the soil; seed, seed potatoes and young tomato
//   plants cost nothing yet (the shed, part 6); a frost reads the grass minimum of the hour.
//   Fast effect: shoots in a week or two, a first cut of salad in about a month in spring, and frost blackening the
//   beans on a cold night. Slow effect: a cropped bed drawing its nutrients down year by year unless compost goes back.
import {COVERS, CROPS, GROWTH_PACE, ROTATION, type CropId, type CropSpec} from '../../data/crops';
import {calendar, type CalendarDate, type System, type TickContext} from '../clock';
import {qty, type GraphNode, type LeverValue} from '../graph';
import {recordWaste} from './kitchen';
import {areaOf, limitsOf, moisture, SOIL} from './soil';
import {et0} from './water';
import {hourOf, weatherOf} from './weather';

/** A crop growing in a bed: the bed's `crop` lever. Replaced, never changed in place, so the snapshot's deltas see it. */
export interface CropState {
  id: CropId;
  /** Game hours it was sown or planted. */
  sown: number;
  /** Degree days above its base since sowing. */
  dd: number;
  /** Its evapotranspiration against what it would have used unstressed, since emergence (for Ky): Σ Ks·Kc·ET₀, Σ Kc·ET₀. */
  eta: number;
  etc: number;
  /** Nutrients it needed and got, as shares of a full crop's uptake. */
  need: number;
  got: number;
  /** kg of produce it has made so far. */
  made: number;
  /** Today's water stress coefficient, 1 unstressed (for the map's wilting). */
  ks: number;
  /** Share of the yield lost to frost setbacks. */
  hurt: number;
  /** Game hours of the last frost that reached it, if any, and whether it killed it. */
  frosted?: number;
  dead?: boolean;
}

export type Stage = 'sown' | 'growing' | 'ready' | 'over' | 'dead';

/** The keys the crop model keeps on a bed. */
export const WASTE = 'waste', GREENS = 'greens';
export const foodKey = (product: string) => `food.${product}`;

export const cropOf = (n: GraphNode): CropState | null => (n.levers.crop as unknown as CropState | null | undefined) ?? null;
export const specOf = (s: CropState): CropSpec => CROPS[s.id];
const setCrop = (n: GraphNode, s: CropState | null) => void (n.levers.crop = s as unknown as LeverValue);

export function stageOf(s: CropState): Stage {
  const c = specOf(s);
  if (s.dead) return 'dead';
  if (s.dd < c.dd.emerge) return 'sown';
  if (s.dd < c.dd.mature) return 'growing';
  return s.dd < c.dd.mature + c.dd.picking ? 'ready' : 'over';
}

/** How far a crop is from sowing to its first harvest, 0–1 (1 once ready). */
export const progress = (s: CropState) => Math.min(1, s.dd / Math.max(1, specOf(s).dd.mature));

/** Ripe produce on a bed waiting to be picked, kg. */
export function ripe(n: GraphNode): number {
  const s = cropOf(n);
  return s ? (n.stocks[foodKey(specOf(s).product)]?.amount ?? 0) : 0;
}

/** The waste lying on a bed (residue, what bolted or rotted), kg. */
export const wasteOn = (n: GraphNode) => n.stocks[WASTE]?.amount ?? 0;

// ---- water (FAO-56) ----

/** FAO-56's water stress coefficient (eq. 84) for a share p of the available water used before stress. */
export function waterStress(n: GraphNode, p: number): number {
  const m = moisture(n, limitsOf(n)), depleted = 1 - m;
  return depleted <= p ? 1 : Math.max(0, Math.min(1, m / (1 - p)));
}

/**
 * The ground a crop covers (0–1), its coefficient at its stage (FAO-56's four-stage curve: flat at the initial value, up
 * to mid-season as it covers the ground, down to the end value while it's picked) and its p, or null for a bed
 * with nothing living in it. The water model's groundCoefficient() uses it for the ground the crop covers.
 */
export function cropCover(n: GraphNode): {cover: number; kc: number; p: number} | null {
  const s = cropOf(n);
  if (!s || s.dead) return null;
  const c = specOf(s);
  if (s.dd < c.dd.emerge) return null;
  const grow = (s.dd - c.dd.emerge) / Math.max(1, c.dd.mature - c.dd.emerge);
  const cover = Math.min(1, 0.1 + (0.9 * grow) / 0.7);
  const kc = grow < 0.3 ? c.kc.ini : grow < 0.7 ? c.kc.ini + ((c.kc.mid - c.kc.ini) * (grow - 0.3)) / 0.4
    : s.dd <= c.dd.mature ? c.kc.mid : c.kc.mid + ((c.kc.end - c.kc.mid) * Math.min(1, (s.dd - c.dd.mature) / c.dd.picking));
  return {cover, kc, p: c.p};
}

// ---- yield and quality ----

/** The share of a full yield the crop is on course for: water (FAO-33's Ky), nutrients (the scarcest) and frost. */
export function yieldFactor(s: CropState): number {
  const c = specOf(s), water = s.etc > 0 ? s.eta / s.etc : 1, nutrients = s.need > 0 ? s.got / s.need : 1;
  return Math.max(0, 1 - c.ky * (1 - water)) * (1 - 0.8 * (1 - nutrients)) * (1 - s.hurt);
}

/** Quality, 0–100: stress shows as tough leaves, split roots and small pods. */
export function quality(s: CropState): number {
  const water = s.etc > 0 ? s.eta / s.etc : 1, nutrients = s.need > 0 ? s.got / s.need : 1;
  return Math.round(100 * Math.max(0, 1 - 0.6 * (1 - water) - 0.4 * (1 - nutrients) - s.hurt));
}

// ---- the plan ----

const md = (d: {month: number; day: number}) => d.month * 100 + d.day;
/** Whether a crop can be sown or planted outdoors on a date (its RHS season). */
export const inSeason = (c: CropSpec, d: CalendarDate) => md(d) >= c.sow.from[0] * 100 + c.sow.from[1] && md(d) <= c.sow.to[0] * 100 + c.sow.to[1];

/** What a bed's plan says to sow on a date, or null: a crop in season, from the plan's date on, or the rotation's next. */
export function plannedCrop(n: GraphNode, d: CalendarDate): CropId | null {
  const plan = n.levers.sow, from = n.levers.sowFrom;
  if (typeof from === 'number' && d.dayOfYear < from) return null;
  if (plan === 'rotation') {
    const history = (n.levers.history as string[] | undefined) ?? [], last = ROTATION.indexOf(history[history.length - 1] as never);
    for (let i = 1; i <= ROTATION.length; i++) {
      const family = ROTATION[(last + i + ROTATION.length) % ROTATION.length];
      const crop = Object.values(CROPS).find((c) => c.family === family && inSeason(c, d));
      if (crop) return crop.id;
    }
    return null;
  }
  const c = typeof plan === 'string' ? CROPS[plan as CropId] : undefined;
  return c && inSeason(c, d) ? c.id : null;
}

/** Sows (or plants) a crop in a bed: the gardener calls it when the job's done. */
export function sow(n: GraphNode, id: CropId, hours: number) {
  setCrop(n, {id, sown: hours, dd: 0, eta: 0, etc: 0, need: 0, got: 0, made: 0, ks: 1, hurt: 0});
}

/** The levers the crop model declares on every bed: the plan's (what to sow, from when, and whether to dig it) and its own. */
export const BED_LEVERS = (sow: string): Record<string, LeverValue> => ({sow, sowFrom: null, dig: false, crop: null, history: []});
const OWN = new Set(['crop', 'history']);

// ---- the day ----

/** Moves produce that has gone off on a bed to waste on it, and counts it as food wasted. */
function spoil(c: TickContext, n: GraphNode, product: string, kg: number, what: string) {
  if (kg <= 1e-9) return;
  c.flow({what, unit: 'kgFood', product, amount: qty(kg, 'kgFood'), from: {node: n.id, stock: foodKey(product)}, to: {boundary: 'decay'}});
  c.flow({what, unit: 'kgWaste', product: GREENS, amount: qty(kg, 'kgWaste'), from: {boundary: 'decay'}, to: {node: n.id, stock: WASTE}});
  recordWaste(c.graph, kg);
}

/** A crop that's done (picked, bolted, spent or killed): its residue left on the bed, the rest of its produce gone off. */
function finish(c: TickContext, n: GraphNode, s: CropState, why: string) {
  const spec = specOf(s), area = areaOf(n);
  spoil(c, n, spec.product, ripe(n), why);
  const residue = spec.residue * area * Math.min(1, s.dd / Math.max(1, spec.dd.mature));
  if (residue > 1e-6) c.flow({what: 'residue', unit: 'kgWaste', product: GREENS, amount: qty(residue, 'kgWaste'), from: {boundary: 'growth'}, to: {node: n.id, stock: WASTE}});
  const history = ((n.levers.history as string[] | undefined) ?? []).concat(spec.family).slice(-4);
  n.levers.history = history;
  setCrop(n, null);
}

/** Takes a share of a full crop's nutrients from the soil, as much as is there; returns the share it got of what it wanted. */
function uptake(c: TickContext, n: GraphNode, spec: CropSpec, share: number): number {
  const ha = areaOf(n) / 1e4;
  let got = 1;
  for (const [stock, unit, want] of [[SOIL.nitrate, 'kgN', spec.uptake.n], [SOIL.phosphorus, 'kgP', spec.uptake.p], [SOIL.potassium, 'kgK', spec.uptake.k]] as const) {
    const need = want * ha * share;
    if (need <= 0) continue;
    const take = Math.min(need, Math.max(0, n.stocks[stock]?.amount ?? 0));
    if (take > 0) c.flow({what: 'uptake', unit, amount: qty(take, unit), from: {node: n.id, stock}, to: {boundary: 'growth'}});
    got = Math.min(got, take / need);
  }
  return got;
}

function cropDay(c: TickContext, n: GraphNode, s0: CropState) {
  const spec = specOf(s0), area = areaOf(n), w = weatherOf(c.graph);
  if (s0.dead) return finish(c, n, s0, 'frost');
  const days = w ? (w.step ?? [w]) : [];
  const s: CropState = {...s0};
  const before = s.dd, total = spec.dd.mature + (spec.harvest === 'repeat' ? spec.dd.picking : 0);
  for (const d of days) s.dd += Math.max(0, (d.tmax + d.tmin) / 2 - spec.base) * GROWTH_PACE;
  // water: how stressed it is today, weighted by what it would have used
  const cover = cropCover(n);
  if (cover) {
    s.ks = waterStress(n, spec.p);
    const et = days.reduce((sum, d) => sum + et0(d), 0) * cover.kc * cover.cover;
    s.etc += et;
    s.eta += et * s.ks;
  }
  // nutrients, in step with its development after emergence
  const span = Math.max(1, total - spec.dd.emerge), was = Math.min(1, Math.max(0, before - spec.dd.emerge) / span);
  const now = Math.min(1, Math.max(0, s.dd - spec.dd.emerge) / span);
  if (now > was) {
    s.need += now - was;
    s.got += (now - was) * uptake(c, n, spec, now - was);
  }
  // ripening: a once-crop all at once when it's ready, a repeat crop a first flush and then day by day
  const full = spec.yield * area, key = foodKey(spec.product);
  let make = 0;
  if (before < spec.dd.mature && s.dd >= spec.dd.mature) make = full * yieldFactor(s) * (spec.harvest === 'once' ? 1 : spec.first ?? 0);
  if (spec.harvest === 'repeat' && s.dd > spec.dd.mature) {
    const inWindow = Math.min(s.dd, total) - Math.max(before, spec.dd.mature);
    if (inWindow > 0) make += (full * (1 - (spec.first ?? 0)) * yieldFactor(s) * inWindow) / spec.dd.picking;
  }
  // what's been left too long on the plant goes off
  if (spec.harvest === 'repeat' && spec.keeps.plant > 0) spoil(c, n, spec.product, ripe(n) * (1 - Math.exp(-days.length / spec.keeps.plant)), 'rotting');
  if (make > 1e-9) {
    c.flow({what: 'ripening', unit: 'kgFood', product: spec.product, amount: qty(make, 'kgFood'), from: {boundary: 'growth'}, to: {node: n.id, stock: key}});
    s.made += make;
  }
  setCrop(n, s);
  const stage = stageOf(s);
  if (stage === 'over') finish(c, n, s, spec.harvest === 'once' ? 'bolting' : 'spent');
  else if (spec.harvest === 'once' && stage === 'ready' && s.made > 0 && ripe(n) <= 1e-6) finish(c, n, s, 'picked');
}

/** Degrees of frost a bed's cover keeps off (none today; part 6's cold frame adds itself to COVERS). */
export const shelter = (n: GraphNode) => COVERS[String(n.levers.cover ?? '')] ?? 0;

/** A frost reaching a crop this hour: kills a tender one, blackens potatoes' tops and sets them back a week or so. */
function cropFrost(c: TickContext, n: GraphNode, s: CropState) {
  const spec = specOf(s);
  if (spec.frost === 'none' || s.dead || s.dd < spec.dd.emerge) return;
  if (spec.frost === 'plant') return setCrop(n, {...s, dead: true, frosted: c.hours, ks: 0});
  if (s.frosted !== undefined && c.hours - s.frosted < 24) return;
  setCrop(n, {...s, dd: Math.max(spec.dd.emerge, s.dd - 100), hurt: Math.min(0.9, s.hurt + 0.1), frosted: c.hours});
}

export const crops: System = {
  name: 'crops',
  on: {
    hour(c) {
      const w = weatherOf(c.graph);
      if (!w || c.dt >= 24) return;
      const mid = calendar(c.hours - c.dt / 2);
      if (w.day !== mid.dayIndex) return;
      const ground = hourOf(w, mid.hour + mid.minute / 60).ground;
      if (ground >= 0) return;
      for (const n of Object.values(c.graph.nodes)) {
        const s = n.kind === 'bed' ? cropOf(n) : null;
        if (s && ground + shelter(n) < 0) cropFrost(c, n, s);
      }
    },
    day(c) {
      for (const n of Object.values(c.graph.nodes)) {
        const s = n.kind === 'bed' ? cropOf(n) : null;
        if (s) cropDay(c, n, s);
      }
    },
  },
  command(cmd, g) {
    if (cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law') return undefined;
    const n = g.nodes[cmd.node];
    if (n?.kind !== 'bed') return undefined;
    if (OWN.has(cmd.lever)) return `the ${cmd.lever} in a bed is the garden's, not the plan's`;
    if (!['sow', 'sowFrom', 'dig'].includes(cmd.lever)) return undefined;
    if (cmd.type !== 'plan') return `what's sown is the plan's`;
    const v = cmd.value;
    if (cmd.lever === 'sow') return v === 'rotation' || v === 'none' || (typeof v === 'string' && v in CROPS) ? null : `no crop ${String(v)}`;
    if (cmd.lever === 'sowFrom') return v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 366) ? null : 'a day of the year from 1 to 366, or null';
    return typeof v === 'boolean' ? null : 'dig is true or false';
  },
};
