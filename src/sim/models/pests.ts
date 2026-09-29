// Pests: slugs, aphids and potato and tomato blight in the garden, and what the gardener's pest policy does to them.
// Slugs live in each dug bed and in the lawn's edge, crawl onto planted beds on wet nights, come out after dark when it's
// damp and mild, and eat seedlings (a share of the stand, gone for good) and leaves (grams of what's ripe, and a little
// of what's to come); they breed in mild, moist springs and autumns and die off in drought and hard frost. Aphids fly in
// from late May onto beans (and less keenly lettuce and tomatoes), multiply by degree days, take a share of the crop's
// growth as sap, and are eaten by the ladybirds the flowers bring (src/sim/models/biodiversity.ts). Blight starts on
// potatoes and tomatoes in a Smith period and spreads over the tops, fastest in muggy weather, cutting the growth still
// to come and rotting ripe tubers and fruit; spores left in the garden start it earlier next year. Soil-borne pests of a
// family (clubroot on brassicas, potato cyst nematode, beans' root rots) build up in a bed each time the family finishes
// there and die away slowly without it, holding back the next crop of that family: the reason for rotation. Slugs and aphids are
// stocks in the 'pests' unit ('pests.slugs', 'pests.aphids'), so every one born, arriving, eaten or caught is a flow; a
// bed's blight and treatments are its `pests` lever and the garden's Smith-period count and spores the lawn's
// `outbreak` lever. The gardener does the policy's work (src/sim/gardener.ts) and calls control() as each job ends.
// docs/systems/pests.md says how it works.
//
// Sources: AHDB, "Slug control" (and the RHS's "Slugs and snails"): slugs feed at night on the surface when it's moist
//   and above about 3–5 °C, seedlings suffer most, populations build over mild wet seasons, and a torch patrol, traps and
//   ferric phosphate pellets each take a share; Edwards et al. (2009), "Toxicity of iron phosphate slug bait to
//   earthworms", for ferric phosphate's side effect (not modelled: the garden has no worms yet), and its dose of iron
//   phosphate as a trace of phosphorus to the soil. Degree-day insect models (the thermal constant above a lower
//   threshold sets development; Campbell et al. 1974) with the black bean aphid's threshold of about 4 °C and AHDB Aphid
//   News for the spring migration; Dixon (2000), "Insect predator-prey dynamics", for ladybirds' appetite (Holling's type
//   II functional response). The Smith period (Smith 1956; two consecutive days with a minimum of 10 °C or more and at
//   least 11 hours at 90 % relative humidity or more; the Met Office and AHDB's BlightWatch) for when blight starts, and
//   Cooke et al. (2011), "Epidemiology and integrated control of potato late blight in Europe", for how fast it spreads,
//   what a protectant fungicide does, and inoculum carried over on volunteer and discarded tubers. RHS, "Crop rotation",
//   Wallenhammar (1996) for clubroot's resting spores (a half-life of about 3.6 years) and AHDB's clubroot and potato cyst
//   nematode guidance for their build-up under the host and decline without it.
// Simplifies: the weather gives no humidity, so an hour counts as humid while it rains or while the air is within 2 °C of
//   the dew point, taken as the day's minimum (FAO-56's rule for a humid climate) and a degree higher on a wet day; one
//   population of slugs a bed, all alike (no eggs or sizes), feeding at a flat rate while out; slugs' damage to seedlings
//   a share of the stand, to grown crops grams of what's ripe; aphids as one population a bed with no winged or wingless
//   forms, their damage a share of the day's growth; blight as the share of the tops infected, growing logistically,
//   with no strains, no spread between beds and no tuber blight in store; the garden's own populations only, with
//   none arriving from the neighbours' gardens yet (the allotment's slugs from a neglected plot are part 8's); slugs
//   are hourly at the garden's hour step and skipped at longer ones (their nights need hours); a soil-borne pest is one
//   number a bed for its family, doubling as each crop of it finishes and halving over its years without one.
//   Fast effect: a seedling bed nibbled on one wet night, aphids thick on the bean tips in a warm week, and a potato bed's
//   tops browning within days of a muggy spell. Slow effect: slug numbers building over a wet season, aphids held down
//   year after year where there are flowers for the ladybirds, and blight spores carried to the next year on tubers left
//   in the ground, and a family grown bed after bed losing more each time.
import {APHIDS, BLIGHT, CONTROL, LADYBIRDS, SLUGS, SOILBORNE, type PestId, type Policy} from '../../data/pests';
import {calendar, type System, type TickContext} from '../clock';
import {note} from '../effects';
import {qty, type Graph, type GraphNode, type LeverValue} from '../graph';
import {knock, wildlifeOf} from './biodiversity';
import {resistance} from '../kit';
import {coverBlight, cropOf, foodKey, GREENS, harm, progress, remaining, ripe, specOf, stageOf, totalDd, WASTE} from './crops';
import {KITCHEN, recordWaste} from './kitchen';
import {areaOf, moisture} from './soil';
import {hourOf, weatherOf, type WeatherDay} from './weather';

/** A bed's pests beside its slug and aphid stocks: its `pests` lever, replaced, never changed in place. */
export interface BedPests {
  /** Slugs out feeding this hour, and the most out last night (what a morning's traps caught from). */
  out: number;
  night: number;
  /** Game hours slugs were last out on it (the slime they leave). */
  slimed: number | null;
  /** The share of its crop's tops blighted, 0–1. */
  blight: number;
  /** Game hours each treatment lasts until: pellets, the insecticide, the fungicide; and when blighted leaves were
   *  last picked off. */
  pellets: number;
  sprayed: number;
  fungicide: number;
  picked: number;
  /** kg of produce lost to pests on it since the start: eaten, or rotted by blight. */
  eaten: number;
  /** Soil-borne inoculum by family, 0–1 (clubroot, potato cyst nematode, foot and root rot), and the crop last seen in
   *  the bed (when sown, its family), so one finishing is noticed. */
  soil: Record<string, number>;
  grew: {sown: number; family: string} | null;
}

/** The garden's blight risk: the lawn's `outbreak` lever. */
export interface Outbreak {
  /** Smith days in a row, and game hours the last Smith period completed. */
  streak: number;
  smith: number | null;
  /** Blight spores left in the garden from earlier crops, 0–1. */
  spores: number;
  /** Game hours it last rained (the ground stays wet for slugs through the night). */
  wet: number | null;
}

export const SLUG_KEY = 'pests.slugs', APHID_KEY = 'pests.aphids';
const LAWN = 'lawn';
export const NO_PESTS: BedPests = {out: 0, night: 0, slimed: null, blight: 0, pellets: 0, sprayed: 0, fungicide: 0, picked: 0, eaten: 0, soil: {}, grew: null};
/** A dug bed's starting inoculum of each soil-borne pest. */
const startingSoil = () => Object.fromEntries(Object.entries(SOILBORNE).map(([f, s]) => [f, s.start]));
const QUIET: Outbreak = {streak: 0, smith: null, spores: 0, wet: null};

export const pestsOf = (n: GraphNode): BedPests => (n.levers.pests as unknown as BedPests | undefined) ?? NO_PESTS;
export const outbreakOf = (g: Graph): Outbreak => (g.nodes[LAWN]?.levers.outbreak as unknown as Outbreak | undefined) ?? QUIET;
const setPests = (n: GraphNode, p: Partial<BedPests>) => void (n.levers.pests = {...pestsOf(n), ...p} as unknown as LeverValue);
const setOutbreak = (g: Graph, o: Partial<Outbreak>) => {
  const lawn = g.nodes[LAWN];
  if (lawn && 'outbreak' in lawn.levers) lawn.levers.outbreak = {...outbreakOf(g), ...o} as unknown as LeverValue;
};
export const slugsOn = (n: GraphNode) => Math.max(0, n.stocks[SLUG_KEY]?.amount ?? 0);
export const aphidsOn = (n: GraphNode) => Math.max(0, n.stocks[APHID_KEY]?.amount ?? 0);

/** The levers the model declares: every bed's pests, and the lawn's blight risk. */
export const BED_PEST_LEVERS = (): Record<string, LeverValue> => ({pests: {...NO_PESTS, soil: startingSoil()} as unknown as LeverValue});
export const LAWN_PEST_LEVERS = (): Record<string, LeverValue> => ({outbreak: {...QUIET} as unknown as LeverValue});
/** The slugs a dug bed and the lawn's edge start with. */
export const startingSlugs = (area: number, lawn: boolean) => ({[SLUG_KEY]: {unit: 'pests' as const, amount: qty(lawn ? SLUGS.start.edge : SLUGS.start.perM2 * area, 'pests'), product: 'slugs'}});

/** Whether a bed's crop is one a pest goes for, living and up. */
export function draws(n: GraphNode, pest: PestId): boolean {
  const s = cropOf(n);
  return !!s && !s.dead && specOf(s).pests.includes(pest) && stageOf(s) !== 'sown';
}

// ---- the weather, for pests ----

/** Humid hours in a day: raining, or the air within BLIGHT.near °C of the dew point (the stand-in; see the header). */
const humid = new WeakMap<WeatherDay, number>();
export function humidHours(d: WeatherDay): number {
  let n = humid.get(d);
  if (n !== undefined) return n;
  const dew = d.tmin + (d.wet ? 1 : 0);
  n = 0;
  for (let h = 0; h < 24; h++) {
    const w = hourOf(d, h + 0.5);
    if (w.rain > 0 || w.temp - dew <= BLIGHT.near) n++;
  }
  humid.set(d, n);
  return n;
}
/** A Smith day: warm nights and a long humid spell. */
export const smithDay = (d: WeatherDay) => d.tmin >= BLIGHT.minTemp && humidHours(d) >= BLIGHT.humidHours;

/** Whether it's dark at an hour of the day (between sunset and sunrise). */
export const dark = (d: WeatherDay, t: number) => t < 12 - d.length / 2 || t >= 12 + d.length / 2;

/** The share of a bed's slugs out at an hour of the day, from the warmth, rain and the soil's moisture. */
export function outShare(bed: GraphNode, d: WeatherDay, t: number, hours: number, o: Outbreak): number {
  const w = hourOf(d, t);
  if (w.temp < SLUGS.minTemp) return 0;
  if (w.rain > 0 || (o.wet !== null && hours - o.wet < 18)) return SLUGS.out.wet;
  const m = moisture(bed);
  return m >= 0.85 ? SLUGS.out.damp : m >= 0.5 ? (SLUGS.out.damp + SLUGS.out.dry) / 2 : SLUGS.out.dry;
}

// ---- the night: slugs out ----

function slugHour(c: TickContext, n: GraphNode, d: WeatherDay, t: number, o: Outbreak) {
  const p = pestsOf(n), P = slugsOn(n);
  const out = P > 0 && dark(d, t) ? P * outShare(n, d, t, c.hours, o) : 0;
  if (out <= 0) {
    if (p.out) setPests(n, {out: 0});
    return;
  }
  const first = p.out === 0 && (p.slimed === null || c.hours - p.slimed > 6); // the night's first hour out
  setPests(n, {out, night: first ? out : Math.max(p.night, out), slimed: c.hours});
  // pellets kill a share of those out each hour while they last
  if (p.pellets > c.hours) {
    const kill = Math.min(P, out * CONTROL.slugs.treat.kill * c.dt);
    if (kill > 1e-9) c.flow({what: 'slug pellets', unit: 'pests', product: 'slugs', amount: qty(kill, 'pests'), from: {node: n.id, stock: SLUG_KEY}, to: {boundary: 'decay'}});
  }
  // what they eat: seedlings outright, else grams of what's ripe and a little of what's to come
  if (!draws(n, 'slugs')) return;
  const s = cropOf(n)!, spec = specOf(s), area = Math.max(1e-6, areaOf(n));
  if (progress(s) < SLUGS.young) {
    const took = harm(n, (SLUGS.seedling * out * c.dt) / area * remaining(s));
    if (took > 0) note(c, 'slugs', n.id, took, 'share');
    return;
  }
  let kg = (SLUGS.graze * out * c.dt) / 1000;
  const eat = Math.min(kg, ripe(n));
  if (eat > 1e-9) {
    c.flow({what: 'slugs', unit: 'kgFood', product: spec.product, amount: qty(eat, 'kgFood'), from: {node: n.id, stock: foodKey(spec.product)}, to: {boundary: 'decay'}});
    setPests(n, {eaten: pestsOf(n).eaten + eat});
    kg -= eat;
  }
  const full = spec.yield * area, took = full > 0 ? harm(n, (0.5 * kg) / full) : 0;
  if (eat > 1e-9 || took > 0) note(c, 'slugs', n.id, took + (full > 0 ? eat / full : 0), 'share');
}

// ---- the day: populations, aphids and blight ----

const md = (d: {month: number; day: number}) => d.month * 100 + d.day;
const moveSlugs = (c: TickContext, from: GraphNode, to: GraphNode, n: number) => {
  if (n > 1e-9) c.flow({what: 'slugs moving', unit: 'pests', product: 'slugs', amount: qty(n, 'pests'), from: {node: from.id, stock: SLUG_KEY}, to: {node: to.id, stock: SLUG_KEY}});
};

function slugDay(c: TickContext, days: WeatherDay[], mean: number) {
  const g = c.graph, lawn = g.nodes[LAWN], month = calendar(c.hours - 1).month, n = days.length;
  const frost = days.some((d) => d.tmin < -2), wet = days.some((d) => d.wet);
  const homes = Object.values(g.nodes).filter((x) => x.id === LAWN || (x.kind === 'bed' && (x.stocks['land.crops']?.amount ?? 0) > 0));
  for (const x of homes) {
    const P = slugsOn(x);
    if (P <= 0) continue;
    const isLawn = x.id === LAWN, cap = isLawn ? SLUGS.cap.edge : SLUGS.cap.perM2 * areaOf(x), m = moisture(x);
    // eggs need moist ground: all of it on wet days, less as the soil dries, none below half its water
    const damp = wet ? 1 : m >= 0.85 ? 0.3 : 0.1, season = SLUGS.breedMonths.includes(month) ? 1 : SLUGS.offSeason;
    const born = mean >= 5 && mean <= 20 && m >= 0.5 ? SLUGS.breed * season * damp * P * Math.max(0, 1 - P / cap) * n : 0;
    const died = Math.min(P, P * (SLUGS.die + (m < 0.3 ? SLUGS.dry : 0) + (frost ? SLUGS.frost : 0)) * n);
    if (born > 1e-9) c.flow({what: 'slugs breeding', unit: 'pests', product: 'slugs', amount: qty(born, 'pests'), from: {boundary: 'growth'}, to: {node: x.id, stock: SLUG_KEY}});
    if (died > 1e-9) c.flow({what: 'slugs dying', unit: 'pests', product: 'slugs', amount: qty(died, 'pests'), from: {node: x.id, stock: SLUG_KEY}, to: {boundary: 'decay'}});
    // a bed carrying many more slugs than it started with: they're getting the upper hand (nematodes are worth having)
    if (!isLawn && slugsOn(x) > SLUGS.thriving * areaOf(x)) note(c, 'slugs thriving', x.id, slugsOn(x), 'slugs');
  }
  // on a wet night slugs leave the lawn's edge for the planted beds, and a bed with nothing in it for the lawn
  if (!lawn || !(wet || moisture(lawn) >= 0.85)) return;
  for (const b of homes) {
    if (b === lawn) continue;
    if (cropOf(b) && !cropOf(b)!.dead) moveSlugs(c, lawn, b, Math.min(slugsOn(lawn), SLUGS.roam * slugsOn(lawn) * n));
    else moveSlugs(c, b, lawn, slugsOn(b) * Math.min(1, SLUGS.leave * n));
  }
}

function aphidDay(c: TickContext, beds: GraphNode[], days: WeatherDay[], mean: number) {
  const g = c.graph, date = calendar(c.hours - 1), n = days.length, heavy = days.some((d) => d.rain >= APHIDS.washMm);
  const total = beds.reduce((s, b) => s + aphidsOn(b), 0), ladybirds = wildlifeOf(g).ladybirds;
  const at = (b: GraphNode) => ({node: b.id, stock: APHID_KEY});
  for (const b of beds) {
    const N = aphidsOn(b), s = cropOf(b), host = s && draws(b, 'aphids') ? APHIDS.host[s.id] ?? 0 : 0;
    if (!host) {
      if (N > 1e-9) c.flow({what: 'aphids leaving', unit: 'pests', product: 'aphids', amount: qty(N, 'pests'), from: at(b), to: {boundary: 'wild'}});
      continue;
    }
    const area = Math.max(1e-6, areaOf(b)), spec = specOf(s!);
    const season = md(date) >= APHIDS.arrive.from[0] * 100 + APHIDS.arrive.from[1] && md(date) <= APHIDS.arrive.to[0] * 100 + APHIDS.arrive.to[1];
    const arrive = season && mean >= APHIDS.arrive.minMean ? host * APHIDS.arrive.perM2 * area * n : 0;
    const r = APHIDS.perDD * Math.min(APHIDS.top - APHIDS.base, Math.max(0, mean - APHIDS.base)) * (0.5 + 0.5 * host);
    const born = N * r * n * Math.max(0, 1 - N / (APHIDS.cap * area));
    if (arrive > 1e-9) c.flow({what: 'aphids arriving', unit: 'pests', product: 'aphids', amount: qty(arrive, 'pests'), from: {boundary: 'wild'}, to: at(b)});
    if (born > 1e-9) c.flow({what: 'aphids breeding', unit: 'pests', product: 'aphids', amount: qty(born, 'pests'), from: {boundary: 'growth'}, to: at(b)});
    let left = N + arrive + born;
    const dens = left / area, take = (what: string, k: number, to: 'decay' | 'wild' = 'decay') => {
      const x = Math.min(left, k);
      if (x > 1e-9) c.flow({what, unit: 'pests', product: 'aphids', amount: qty(x, 'pests'), from: at(b), to: {boundary: to}});
      left -= Math.max(0, x);
    };
    // the garden's ladybirds go where the aphids are, each eating up to its fill
    const here = total > 0 ? ladybirds * (N / total) : 0;
    take('ladybirds', here * LADYBIRDS.eats * (dens / (dens + LADYBIRDS.half)) * n);
    take('aphids dying', N * (APHIDS.die * n + (heavy ? APHIDS.wash : 0)));
    if (dens > APHIDS.cap / 2) take('aphids leaving', N * APHIDS.leave * n, 'wild');
    // the sap they take: a share of the day's growth
    const grew = days.reduce((sum, d) => sum + Math.max(0, (d.tmax + d.tmin) / 2 - spec.base), 0) / Math.max(1, totalDd(spec));
    const took = harm(b, APHIDS.harm * Math.min(1, left / area / APHIDS.harmAt) * grew);
    if (took > 0) note(c, 'aphids', b.id, took, 'share');
  }
}

function blightDay(c: TickContext, beds: GraphNode[], days: WeatherDay[], smith: boolean, spores: number) {
  const n = days.length, humid = days.some((d) => d.wet || humidHours(d) >= BLIGHT.humidHours), hot = days.every((d) => d.tmax > BLIGHT.hot);
  const washed = days.some((d) => d.rain >= CONTROL.blight.treat.washMm);
  let left = 0;
  for (const b of beds) {
    let p = pestsOf(b);
    if (washed && p.fungicide > c.hours) setPests(b, {fungicide: 0});
    p = pestsOf(b);
    if (!draws(b, 'blight')) {
      // a blighted crop that's done leaves spores in the garden: tubers missed, haulm on the heap
      if (p.blight > 0) {
        left += BLIGHT.carry * p.blight;
        setPests(b, {blight: 0});
      }
      continue;
    }
    // a fungicide protects the tops, glass keeps the leaves dry, and a resistant variety fights it off
    const s = cropOf(b)!, spec = specOf(s), protect = (p.fungicide > c.hours ? 1 - CONTROL.blight.treat.protect : 1) * coverBlight(b) * resistance(c.graph, s.id, c.date.year);
    let sev = p.blight;
    if (sev <= 0 && smith) {
      sev = (BLIGHT.start + BLIGHT.spores * spores) * protect;
      const took = harm(b, sev * remaining(s));
      if (took > 0) note(c, 'blight', b.id, took, 'share');
    } else if (sev > 0) {
      const slow = p.picked > c.hours - 24 ? CONTROL.blight.pick.slows : 1;
      const r = (hot ? BLIGHT.spread.hot : humid ? BLIGHT.spread.humid : BLIGHT.spread.dry) * protect * slow;
      const next = Math.min(1, sev + r * sev * (1 - sev) * n);
      const took = harm(b, (next - sev) * remaining(cropOf(b)!));
      if (took > 0) note(c, 'blight', b.id, took, 'share');
      sev = next;
    }
    if (sev !== p.blight) setPests(b, {blight: sev});
    // ripe tubers and fruit rot under a blighted crop
    const kg = ripe(b) * sev * (BLIGHT.rot[s.id] ?? 0) * n;
    if (kg > 1e-9) {
      c.flow({what: 'blight rot', unit: 'kgFood', product: spec.product, amount: qty(kg, 'kgFood'), from: {node: b.id, stock: foodKey(spec.product)}, to: {boundary: 'decay'}});
      c.flow({what: 'blight rot', unit: 'kgWaste', product: GREENS, amount: qty(kg, 'kgWaste'), from: {boundary: 'decay'}, to: {node: b.id, stock: WASTE}});
      setPests(b, {eaten: pestsOf(b).eaten + kg});
      recordWaste(c.graph, kg);
    }
  }
  return left;
}

/** Soil-borne pests: a finished crop's family builds up in its bed, every family dies away over time, and a crop of an
 *  infested family loses a share of the day's growth. */
function soilDay(c: TickContext, beds: GraphNode[], days: WeatherDay[]) {
  for (const b of beds) {
    const p = pestsOf(b), s = cropOf(b), soil: Record<string, number> = {};
    for (const [f, x] of Object.entries(p.soil ?? {})) soil[f] = x * Math.pow(0.5, days.length / (SOILBORNE[f]?.halfLife ?? 365));
    // the crop last seen here has finished (or been replaced): its family's spores and cysts go into the soil
    if (p.grew && (!s || s.sown !== p.grew.sown)) {
      const d = SOILBORNE[p.grew.family];
      if (d) soil[p.grew.family] = Math.min(1, (soil[p.grew.family] ?? 0) * (1 + d.gain));
    }
    const spec = s && specOf(s), d = spec ? SOILBORNE[spec.family] : undefined;
    if (s && spec && d && !s.dead && stageOf(s) !== 'sown') {
      const grew = days.reduce((sum, w) => sum + Math.max(0, (w.tmax + w.tmin) / 2 - spec.base), 0) / Math.max(1, totalDd(spec));
      const took = harm(b, d.harm * (soil[spec.family] ?? 0) * grew);
      if (took > 0) note(c, d.name, b.id, took, 'share');
    }
    setPests(b, {soil, grew: s ? {sown: s.sown, family: specOf(s).family} : null});
  }
}

function day(c: TickContext) {
  const g = c.graph, w = weatherOf(g);
  if (!w || !g.nodes[LAWN]) return;
  const days = w.step ?? [w], mean = days.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / days.length;
  // the Smith period: two Smith days in a row
  const o = outbreakOf(g);
  let streak = o.streak, smith = false;
  for (const d of days) {
    streak = smithDay(d) ? streak + 1 : 0;
    if (streak >= 2) smith = true;
  }
  if (smith) note(c, 'Smith period', LAWN, humidHours(days[days.length - 1]!), 'h');
  const beds = Object.values(g.nodes).filter((n) => n.kind === 'bed');
  const spores = o.spores * Math.pow(BLIGHT.fade, days.length / 365);
  const left = blightDay(c, beds, days, smith, spores);
  setOutbreak(g, {streak, smith: smith ? c.hours : o.smith, spores: Math.min(1, spores + left)});
  aphidDay(c, beds, days, mean);
  slugDay(c, days, mean);
  soilDay(c, beds, days);
}

// ---- the policy's work ----

/** Pays for a treatment from the household's purse; false if there isn't the money. */
function pay(c: TickContext, what: string, gbp: number): boolean {
  const purse = c.graph.nodes[KITCHEN]?.stocks.money;
  if (!purse || purse.amount < gbp) return false;
  c.flow({what, unit: 'GBP', amount: qty(gbp, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  return true;
}

/** Whether the purse has a treatment's price. */
export const canPay = (g: Graph, gbp: number) => (g.nodes[KITCHEN]?.stocks.money?.amount ?? 0) >= gbp;

/** The pest policy's work on a bed, done: the gardener calls it as each job ends. */
export function control(c: TickContext, bedId: string, pest: PestId, how: Policy) {
  const bed = c.graph.nodes[bedId];
  if (!bed) return;
  const p = pestsOf(bed), kill = (what: string, key: string, product: string, n: number) => {
    const x = Math.min(n, Math.max(0, bed.stocks[key]?.amount ?? 0));
    if (x > 1e-9) c.flow({what, unit: 'pests', product, amount: qty(x, 'pests'), from: {node: bed.id, stock: key}, to: {boundary: 'decay'}});
  };
  if (pest === 'slugs') {
    if (how === 'pick') kill('hand-picking', SLUG_KEY, 'slugs', CONTROL.slugs.pick.share * p.out);
    else if (how === 'trap') {
      kill('trapping', SLUG_KEY, 'slugs', CONTROL.slugs.trap.share * p.night);
      setPests(bed, {night: 0});
    } else if (how === 'treat' && pay(c, 'slug pellets', CONTROL.slugs.treat.cost)) {
      const pKg = CONTROL.slugs.treat.phosphorusPerM2 * areaOf(bed);
      if (pKg > 0 && bed.stocks.phosphorus) c.flow({what: 'slug pellets', unit: 'kgP', amount: qty(pKg, 'kgP'), from: {boundary: 'bought'}, to: {node: bed.id, stock: 'phosphorus'}});
      setPests(bed, {pellets: c.hours + CONTROL.slugs.treat.days * 24});
    }
  } else if (pest === 'aphids') {
    if (how === 'pick') kill('squashing aphids', APHID_KEY, 'aphids', CONTROL.aphids.pick.share * aphidsOn(bed));
    else if (how === 'treat' && pay(c, 'insecticide', CONTROL.aphids.treat.cost)) {
      kill('insecticide', APHID_KEY, 'aphids', CONTROL.aphids.treat.share * aphidsOn(bed));
      knock(c.graph, {bees: CONTROL.aphids.treat.bees, ladybirds: CONTROL.aphids.treat.ladybirds});
      setPests(bed, {sprayed: c.hours + CONTROL.aphids.treat.days * 24});
    }
  } else if (pest === 'blight') {
    if (how === 'pick' && p.blight > 0) {
      note(c, 'removing blighted leaves', bed.id, p.blight * CONTROL.blight.pick.share, 'share');
      setPests(bed, {blight: p.blight * (1 - CONTROL.blight.pick.share), picked: c.hours});
    } else if (how === 'treat' && pay(c, 'fungicide', CONTROL.blight.treat.cost)) {
      knock(c.graph, {ladybirds: CONTROL.blight.treat.ladybirds});
      setPests(bed, {fungicide: c.hours + CONTROL.blight.treat.days * 24});
    }
  }
}

export const pests: System = {
  name: 'pests',
  on: {
    hour(c) {
      const w = weatherOf(c.graph);
      if (!w || c.dt >= 24) return;
      // the middle of the step, as an hour of its day (the step ending at midnight is the day before's)
      const mid = c.date.hour + c.date.minute / 60 - c.dt / 2, t = mid < 0 ? mid + 24 : mid;
      if (w.day !== c.date.dayIndex - (mid < 0 ? 1 : 0)) return;
      if (hourOf(w, t).rain > 0) setOutbreak(c.graph, {wet: c.hours});
      const o = outbreakOf(c.graph), nodes = c.graph.nodes, night = dark(w, t);
      for (const id in nodes) {
        const n = nodes[id]!;
        // by day there's nothing to do but put away last night's
        if (n.kind === 'bed' && 'pests' in n.levers && (night || pestsOf(n).out)) slugHour(c, n, w, t, o);
      }
    },
    day,
  },
  command(cmd, g) {
    if (cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law') return undefined;
    const n = g.nodes[cmd.node];
    if (cmd.lever === 'pests' && n?.kind === 'bed') return 'a bed’s pests come as they will';
    if (cmd.lever === 'outbreak' && n?.id === LAWN) return 'the blight comes with the weather';
    return undefined;
  },
};
