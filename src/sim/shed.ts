// The shed: buying what the garden needs (src/data/shed.ts), and what each thing bought does day by day. A `buy` pays its
// price from the household's purse (the kitchen's `money`) to the `bought` boundary and adds it to the garden's kit (the
// shed node's `kit` lever, src/sim/kit.ts); the command refuses what hasn't unfolded (src/sim/commands.ts), what's owned
// already, and what the purse can't pay for. Each works through its mechanism: the beer traps drown a share of each
// night's slugs and take their beer each week; a pack of nematodes kills slugs in warm, moist soil for six weeks; the
// cold frame goes over a bed (its `cover`, which the plan can move) and the second butt adds its store to the first's.
// The hose (src/sim/gardener.ts), the compost bin (src/sim/models/carbon.ts), the frame's frost, rain and sowing
// windows (src/sim/models/crops.ts, src/sim/models/water.ts) are read where they act. docs/systems/shed.md says how.
import {CROPS, type CropId} from '../data/crops';
import {BEER_TRAP, BUSH, CATALOGUE, CHIT, CLEAN, CORDON, DIG_OVER, FLEECE, FORCE, HEN_CARE, LEAVES, PROPAGATOR, PRUNE, SETS, SILL, WARM, HENS, NEMATODES, SECOND_BUTT, TANK, UPGRADES, bareRoot, inWinter, type UpgradeId, type Variety} from '../data/shed';
import {calendar, type CalendarDate} from './clock';
import {cropOf} from './models/crops';
import type {System, TickContext} from './clock';
import {note} from './effects';
import {SITES, SITE_WAYS} from '../data/garden';
import {applyFlow, makeNode, qty, touch, type Flow, type Graph, type GraphNode, type LeverValue, type NodeSpec, type Stock} from './graph';
import {BED_FLOWER_LEVERS} from './models/biodiversity';
import {BED_LEVERS} from './models/crops';
import {herdOf, LIVE, newHerd} from './models/livestock';
import {bushesOf, BERRIES} from './models/fruit';
import {recordPick} from './models/kitchen';
import {BED_PEST_LEVERS} from './models/pests';
import {ATMOSPHERE} from './state';
import {kitOf, owns, setKit} from './kit';
import {KITCHEN} from './models/kitchen';
import {pestsOf, SLUG_KEY, slugsOn} from './models/pests';
import {moisture, SOIL} from './models/soil';
import {weatherOf} from './models/weather';

const isUpgrade = (id: string): id is UpgradeId => id in UPGRADES;
const dugBeds = (g: Graph) => Object.values(g.nodes).filter((n) => n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0);
/** A bed dug right through: no grass left in it (a raised bed goes only on one). */
const wholeBed = (n: GraphNode) => (n.stocks['land.grass']?.amount ?? 0) <= 1e-6;
const purse = (g: Graph) => g.nodes[KITCHEN]?.stocks.money?.amount ?? 0;

/** The next dug bed a raised bed goes on: the first not raised yet (never the greenhouse's border). */
export const nextRaised = (g: Graph) => dugBeds(g).find((b) => wholeBed(b) && b.levers.raised !== true && b.levers.cover !== 'greenhouse') ?? null;
/** The hens in the house: none until they're bought, two, then three. */
export const hensIn = (g: Graph) => {
  const n = g.nodes.hens;
  return n ? (herdOf(n)?.head ?? 0) : 0;
};
/** Where each thing that stands on the lawn goes (src/data/garden.ts's SITES): the hen house's is the hens'. */
const SITE_OF: Partial<Record<UpgradeId, keyof typeof SITES>> = {greenhouse: 'greenhouse', coop: 'hens', 'fruit-cage': 'fruit-cage', 'fruit-bush': 'fruit-bush'};

/** The cordons planted along the fence. */
export const cordons = (g: Graph) => kitOf(g).owned.filter((x) => x === 'cordon').length;
/** The dug bed a new cover goes on: the first in the open with nothing in it, else the first in the open. */
const nextCovered = (g: Graph) => {
  const beds = dugBeds(g).filter((b) => !b.levers.cover);
  return beds.find((b) => !b.levers.crop) ?? beds[0] ?? null;
};

/** Why a buy is refused, or null if it can go ahead. */
export function refuseBuy(g: Graph, id: string): string | null {
  if (!isUpgrade(id)) return `no upgrade ${id}`;
  const u = UPGRADES[id];
  if (u.kept && owns(g, id)) return `the garden has ${u.name.toLowerCase()} already`;
  if (u.after && !owns(g, u.after)) return `${u.name} comes after the ${UPGRADES[u.after].name.toLowerCase()}`;
  if (id === 'raised-bed' && !nextRaised(g)) return 'every dug bed is raised already';
  if (id === 'cordon') {
    if (!kitOf(g).bare) return 'bare-root cordons are planted from November to March';
    if (cordons(g) >= CORDON.most) return 'the fence has no room for another cordon';
    if ((g.nodes.lawn?.stocks['land.grass']?.amount ?? 0) < CORDON.m2) return 'the lawn has no room for it';
  }
  if (id === 'cloches' && !nextCovered(g)) return 'every dug bed has a cover already';
  // a big buy needs its ground on the lawn
  const at = SITE_OF[id], site = at ? SITES[at] : null;
  if (site && (g.nodes.lawn?.stocks['land.grass']?.amount ?? 0) < site.box.w * site.box.h) return 'the lawn has no room for it';
  if (id === 'nematodes' && kitOf(g).nematodes > 0) return 'the last pack is still at work';
  if (purse(g) < u.price) return `${u.name} costs £${u.price.toFixed(2)}`;
  return null;
}

/** Where a bought thing stands on the map, for its effect (the map pulses there): its own place for the big buys, the
 *  tap's hose, the butt's store, the heap's bin, the bed under the frame or the last bed raised, the first bed's trap. */
export function placeOf(g: Graph, id: UpgradeId): string {
  switch (id) {
    case 'greenhouse':
      return id;
    case 'coop':
    case 'hens':
    case 'hen':
      return 'hens';
    case 'fruit-bush':
      return SITES['fruit-bush'].id;
    case 'lean-to':
      return KITCHEN;
    case 'fruit-cage':
      return 'fruit';
    case 'hose':
      return 'tap';
    case 'water-butt':
    case 'water-tank':
      return 'butt';
    case 'compost-bin':
      return 'heap';
    case 'cold-frame':
    case 'cloches':
      return Object.values(g.nodes).find((n) => n.levers.cover === id)?.id ?? 'shed';
    case 'cordon':
      return g.nodes.cordons ? 'cordons' : 'shed';
    case 'raised-bed':
      return dugBeds(g).filter((b) => b.levers.raised === true).at(-1)?.id ?? 'shed';
    case 'beer-trap':
      return dugBeds(g)[0]?.id ?? 'shed';
    default:
      return 'shed';
  }
}

/** A buy's payment: its price from the purse to the `bought` boundary (the command's flow, src/sim/commands.ts). */
export const buyFlow = (id: UpgradeId): Flow => ({what: 'buying', unit: 'GBP', amount: qty(UPGRADES[id].price, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});

/** Carries out a buy the command has allowed: the price out of the purse, and the thing into the kit. */
function buy(g: Graph, id: UpgradeId) {
  applyFlow(g, buyFlow(id));
  if (id === 'nematodes') return setKit(g, {nematodes: NEMATODES.days});
  // a cordon goes in along the fence, its land from the lawn: the fruit system dates it on its next day
  if (id === 'cordon') {
    plantCordon(g);
    return setKit(g, {owned: [...kitOf(g).owned, id]});
  }
  // a raised bed goes on the next dug bed that isn't one; the kit counts each
  if (id === 'raised-bed') {
    const bed = nextRaised(g);
    if (bed) bed.levers.raised = true;
    return setKit(g, {owned: [...kitOf(g).owned, id]});
  }
  setKit(g, {owned: [...kitOf(g).owned, id]});
  if (id === 'water-tank') {
    const butt = g.nodes.butt?.stocks.water;
    if (butt?.cap !== undefined) butt.cap = qty(butt.cap + TANK.litres, 'L');
    touch(g, 'butt');
  }
  if (id === 'greenhouse' || id === 'fruit-cage' || id === 'fruit-bush') addSite(g, id);
  if (id === 'coop') addSite(g, 'hens');
  // the hens into their house: a pair, then a third
  if (id === 'hens' || id === 'hen') {
    const n = g.nodes.hens, h = n && herdOf(n);
    if (n && h) {
      n.levers.herd = {...h, head: id === 'hens' ? HENS.pair : HENS.head} as unknown as LeverValue;
      touch(g, 'hens');
    }
  }
  // the hose and the fork join the gardener's tools: the fastest they have for a job is the one they use (src/data/jobs.ts)
  if (id === 'hose' || id === 'fork') {
    const me = g.nodes.gardener, tools = (me?.levers.tools as string[] | undefined) ?? [];
    if (me && !tools.includes(id)) me.levers.tools = [...tools, id];
  }
  if (id === 'cloches') {
    const bed = nextCovered(g);
    if (bed) bed.levers.cover = 'cloches';
  }
  if (id === 'water-butt') {
    const butt = g.nodes.butt?.stocks.water;
    if (butt?.cap !== undefined) butt.cap = qty(butt.cap + SECOND_BUTT, 'L');
    touch(g, 'butt');
  }
  // the frame goes over the first dug bed with nothing in it, else the first dug bed; the plan can move it
  if (id === 'cold-frame') {
    const beds = dugBeds(g).filter((b) => !b.levers.cover), bed = beds.find((b) => !b.levers.crop) ?? beds[0];
    if (bed) bed.levers.cover = 'cold-frame';
  }
}

/** What a bed's sowing of a crop costs from the purse, £: its seed, plants or sets (src/data/crops.ts), a packet for
 *  what the propagator raises, or nothing when the winter catalogue's order covers this garden year. */
export const seedCost = (g: Graph, crop: CropId, year: number) =>
  kitOf(g).seeds?.year === year || (kitOf(g).sets === year && (SETS.crops as readonly string[]).includes(crop)) ? 0 : CROPS[crop].seed * (owns(g, 'propagator') && PROPAGATOR.crops.includes(crop) ? PROPAGATOR.share : 1);

/** The catalogue's order for next year: its price, for every bed plot the garden has (dug or to be dug, and the
 *  greenhouse's border), and the variety. */
export const cataloguePrice = (g: Graph, variety: Variety) =>
  Object.values(g.nodes).filter((n) => n.kind === 'bed').length * CATALOGUE.perBed * (variety === 'resistant' ? CATALOGUE.resistant : 1);
/** Whether the catalogue is open on a date (December to February) and next year's seed isn't ordered yet. */
export const catalogueOpen = (g: Graph, d: CalendarDate) =>
  (d.month >= CATALOGUE.from || d.month <= CATALOGUE.to) && kitOf(g).seeds?.year !== d.year + 1;
/** Orders next year's seed from the catalogue: the price from the purse, the order into the kit. Why not, or null. */
export function orderSeeds(g: Graph, variety: Variety, d: CalendarDate): string | null {
  if (!catalogueOpen(g, d)) return 'the catalogue’s order goes in from December to February';
  const price = cataloguePrice(g, variety);
  if (purse(g) < price) return `next year’s seed costs £${price.toFixed(2)}`;
  applyFlow(g, {what: 'seed catalogue', unit: 'GBP', amount: qty(price, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  setKit(g, {seeds: {year: d.year + 1, variety}});
  return null;
}
/** Whether it's the time to chit seed potatoes (February and March) and they aren't chitting already. */
export const chitOpen = (g: Graph, d: CalendarDate, hours: number) =>
  d.month >= CHIT.from && d.month <= CHIT.to && !(kitOf(g).chitted !== null && hours - kitOf(g).chitted! <= CHIT.days * 24);
/** Sets the seed potatoes out to chit. Why not, or null. */
export function chit(g: Graph, d: CalendarDate, hours: number): string | null {
  if (!chitOpen(g, d, hours)) return 'seed potatoes are chitted in February and March';
  setKit(g, {chitted: hours});
  return null;
}

/** The empty dug beds in the open whose soil could be warmed for an early sowing now (February to mid-April), not warmed
 *  already this spring. */
export const warmBeds = (g: Graph, d: CalendarDate) =>
  d.month >= WARM.from && d.month <= WARM.to && !(d.month === WARM.to && d.day > 15)
    ? dugBeds(g).filter((b) => !cropOf(b) && !b.levers.cover && !(typeof b.levers.warmed === 'number' && d.dayIndex - b.levers.warmed < 120))
    : [];
/** Fleece laid over the empty beds to warm their soil, the roll bought the first time. Why not, or null. */
export function warmSoil(g: Graph, d: CalendarDate): string | null {
  const beds = warmBeds(g, d);
  if (!beds.length) return 'no empty bed to warm';
  const r = buyFleece(g);
  if (r) return r;
  for (const b of beds) b.levers.warmed = d.dayIndex;
  return null;
}
/** The roll of fleece, bought from the purse the first time it's needed. Why not, or null. */
function buyFleece(g: Graph): string | null {
  if (kitOf(g).fleece) return null;
  if (purse(g) < FLEECE.gbp) return `a roll of fleece costs £${FLEECE.gbp.toFixed(2)}`;
  applyFlow(g, {what: 'fleece', unit: 'GBP', amount: qty(FLEECE.gbp, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  setKit(g, {fleece: true});
  return null;
}

/** The tender crops up in the open that a frost tonight would hurt. */
export const frostBeds = (g: Graph) => Object.values(g.nodes).filter((n) => {
  const s = n.kind === 'bed' ? cropOf(n) : null;
  return s && !s.dead && CROPS[s.id].frost !== 'none' && s.dd >= CROPS[s.id].dd.emerge && !n.levers.cover;
});
/** Fleece laid over the tender beds for tonight, the roll bought the first time. Why not, or null. */
export function fleece(g: Graph, hours: number): string | null {
  const beds = frostBeds(g);
  if (!beds.length) return 'nothing tender is up in the open';
  const r = buyFleece(g);
  if (r) return r;
  for (const b of beds) b.levers.fleece = hours + FLEECE.hours;
  return null;
}

/** Pays for a sowing's seed from the purse, as far as it goes (the gardener checked it had the price that morning). */
export function paySeed(c: TickContext, gbp: number) {
  const pay = Math.min(gbp, purse(c.graph));
  if (pay > 1e-9) c.flow({what: 'seed', unit: 'GBP', amount: qty(pay, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
}

/**
 * Puts a big buy on the map: its node, taken out of the lawn (its land moved from the lawn's grass, and for the greenhouse
 * the lawn's soil under it, a share of each of the lawn's stocks, so nothing appears from nowhere), the ways it needs and
 * its way to the air; then what it starts with: the greenhouse's border planned for tomatoes, the hens in their house
 * with a week's feed and water, the canes and bushes planted.
 */
function addSite(g: Graph, id: keyof typeof SITES) {
  const site = SITES[id], lawn = g.nodes.lawn;
  if (!lawn || g.nodes[site.id]) return;
  const area = site.box.w * site.box.h, grass = lawn.stocks['land.grass']?.amount ?? 0, share = Math.min(1, area / Math.max(1e-9, grass));
  const spec: NodeSpec = {id: site.id, kind: site.kind, name: site.name, box: {...site.box}, land: {built: 0}};
  if (site.id === 'greenhouse') spec.levers = {...BED_LEVERS('tomatoes'), ...BED_PEST_LEVERS(), ...BED_FLOWER_LEVERS(), cover: 'greenhouse'};
  if (site.id === 'hens') {
    spec.stocks = {[LIVE.feed]: {unit: 'kgFeed', amount: qty(0, 'kgFeed'), product: 'feed'}, [LIVE.water]: {unit: 'L', amount: qty(0, 'L')}};
    // the house and run first, empty until the hens are bought (a herd of none)
    spec.levers = {herd: newHerd('hen', 0, HENS.area, {disease: false}) as unknown as LeverValue, cleaned: null};
  }
  g.nodes[site.id] = makeNode(spec);
  for (const w of [...SITE_WAYS[id], {from: site.id, to: ATMOSPHERE, carries: ['kgCO2e' as const]}])
    g.edges.push({id: `${site.id}-${w.from}-${w.to}`, from: w.from, to: w.to, carries: [...w.carries]});
  g.rev++;
  const move = (stock: string, to: string, unit: Stock['unit'], kg: number, product?: string) => {
    if (kg <= 1e-12) return;
    const f: Flow = {what: 'building', unit, amount: qty(kg, unit), from: {node: 'lawn', stock}, to: {node: site.id, stock: to}};
    if (product !== undefined) f.product = product;
    applyFlow(g, f);
  };
  move('land.grass', `land.${site.land}`, 'm2', area);
  // the greenhouse's border is the lawn's soil under it, dug
  if (site.id === 'greenhouse')
    for (const [k, st] of Object.entries(lawn.stocks)) if (!k.startsWith('land.')) move(k, k, st.unit, st.amount * share, st.product);
  // the canes and bushes go in: the fruit system dates the planting on its next day (src/sim/models/fruit.ts)
  if (site.id === 'fruit') g.nodes.fruit!.levers.bushes = null;
  // the blackcurrant goes in, dated like a cordon, with its own kg a summer
  if (id === 'fruit-bush') g.nodes[site.id]!.levers.bushes = {planted: null, plants: [null], kg: BUSH.kg} as unknown as LeverValue;
  touch(g, 'lawn');
  touch(g, site.id);
}

/** Plants a cordon along the fence: the strip's node the first time (its land none yet), then a cordon's ground moved from
 *  the lawn's grass, and an undated planting the fruit system dates on its next day (src/sim/models/fruit.ts). */
function plantCordon(g: Graph) {
  const site = SITES.cordon;
  if (!g.nodes[site.id]) {
    g.nodes[site.id] = makeNode({id: site.id, kind: site.kind, name: site.name, box: {...site.box}, land: {crops: 0}, levers: {bushes: {planted: null, plants: []} as unknown as LeverValue}});
    for (const w of [...SITE_WAYS.cordon, {from: site.id, to: ATMOSPHERE, carries: ['kgCO2e' as const]}])
      g.edges.push({id: `${site.id}-${w.from}-${w.to}`, from: w.from, to: w.to, carries: [...w.carries]});
    g.rev++;
  }
  const n = g.nodes[site.id]!, b = n.levers.bushes as unknown as {planted: number | null; plants: (number | null)[]};
  applyFlow(g, {what: 'planting', unit: 'm2', amount: qty(CORDON.m2, 'm2'), from: {node: 'lawn', stock: 'land.grass'}, to: {node: site.id, stock: 'land.crops'}});
  n.levers.bushes = {...b, plants: [...b.plants, null]} as unknown as LeverValue;
  touch(g, 'lawn');
  touch(g, site.id);
}

/** Rakes the autumn leaves onto the heap, with their carbon and nitrogen (the clear-up card). Why not, or null. */
export function rakeLeaves(g: Graph, d: CalendarDate): string | null {
  if (!leavesOpen(d)) return 'the leaves are raked from mid-October to November';
  if (!g.nodes.heap) return 'there is no heap';
  applyFlow(g, {what: 'raking leaves', unit: 'kgWaste', product: 'greens', amount: qty(LEAVES.kg, 'kgWaste'), from: {boundary: 'growth'}, to: {node: 'heap', stock: 'waste'}});
  applyFlow(g, {what: 'raking leaves', unit: 'kgCO2e', amount: qty(LEAVES.kg * LEAVES.co2e, 'kgCO2e'), from: {node: ATMOSPHERE, stock: 'carbon'}, to: {node: 'heap', stock: 'carbon'}});
  applyFlow(g, {what: 'raking leaves', unit: 'kgN', amount: qty(LEAVES.kg * LEAVES.n, 'kgN'), from: {boundary: 'growth'}, to: {node: 'heap', stock: 'nitrogen.organic'}});
  touch(g, 'heap');
  return null;
}
/** Whether it's leaf-raking time: mid-October to November. */
export const leavesOpen = (d: CalendarDate) =>
  (d.month === LEAVES.from[0] && d.day >= LEAVES.from[1]) || (d.month > LEAVES.from[0] && d.month <= LEAVES.to[0]);

/** The empty dug beds a winter dig would turn over (December and January): in the open, nothing growing in them. */
export const digOverBeds = (g: Graph, d: CalendarDate) =>
  d.month >= DIG_OVER.from || d.month <= DIG_OVER.to ? dugBeds(g).filter((b) => !cropOf(b) && b.levers.cover !== 'greenhouse') : [];
/** Digs the empty beds over: the flush of CO₂ from their organic matter, and a share of their slugs turned up to the birds
 *  and the frost. Why not, or null. */
export function digOver(g: Graph, d: CalendarDate): string | null {
  const beds = digOverBeds(g, d);
  if (!beds.length) return 'no empty bed to dig over';
  for (const b of beds) {
    const m2 = b.stocks['land.crops']?.amount ?? 0, flush = Math.min(DIG_OVER.flushPerM2 * m2, Math.max(0, b.stocks[SOIL.humus]?.amount ?? 0));
    if (flush > 1e-9 && g.nodes[ATMOSPHERE]) applyFlow(g, {what: 'digging over', unit: 'kgCO2e', amount: qty(flush, 'kgCO2e'), from: {node: b.id, stock: SOIL.humus}, to: {node: ATMOSPHERE, stock: 'carbon'}});
    const slugs = slugsOn(b) * DIG_OVER.slugs;
    if (slugs > 1e-9) applyFlow(g, {what: 'digging over', unit: 'pests', product: 'slugs', amount: qty(slugs, 'pests'), from: {node: b.id, stock: SLUG_KEY}, to: {boundary: 'decay'}});
    touch(g, b.id);
  }
  return null;
}

// ---- midwinter's jobs (round four), each a card asked once a winter (src/ui/decisions.ts) ----

/** Whether a winter pruning is due: currants planted before the summer, not pruned this winter. */
export const pruneOpen = (g: Graph, d: CalendarDate, hours: number) =>
  inWinter(PRUNE, d.month, d.day) && kitOf(g).pruned !== d.year + 1 && pruneCount(g, hours) > 0;
/** The currants that need pruning: planted before the summer (so fruiting next summer on wood more than a year old). */
export function pruneCount(g: Graph, hours: number) {
  let n = 0;
  for (const node of Object.values(g.nodes)) for (const t of bushesOf(node)?.plants ?? []) if (t !== null && hours - t > 150 * 24) n++;
  return n;
}
/** Prunes the currants for next summer. Why not, or null. */
export function prune(g: Graph, d: CalendarDate, hours: number): string | null {
  if (!pruneOpen(g, d, hours)) return 'the currants are pruned in winter, a year after planting';
  setKit(g, {pruned: d.year + 1});
  return null;
}
/** Whether seed potatoes can be ordered by post now: January and February, when the catalogue hasn't covered them. */
export const setsOpen = (g: Graph, d: CalendarDate) => inWinter(SETS, d.month, d.day) && kitOf(g).seeds?.year !== d.year + 1 && kitOf(g).sets !== d.year + 1;
/** Orders the seed potatoes: the price from the purse, the spring's potato plantings paid for. Why not, or null. */
export function orderSets(g: Graph, d: CalendarDate): string | null {
  if (!setsOpen(g, d)) return 'seed potatoes are ordered in January and February';
  if (purse(g) < SETS.gbp) return `seed potatoes cost £${SETS.gbp.toFixed(2)}`;
  applyFlow(g, {what: 'seed potatoes', unit: 'GBP', amount: qty(SETS.gbp, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  setKit(g, {sets: d.year + 1});
  return null;
}
/** Washing the pots and the frame: a share of each dug bed's slugs, sheltering under them, go. Why not, or null. */
export function cleanPots(g: Graph, d: CalendarDate): string | null {
  if (!inWinter(CLEAN, d.month, d.day)) return 'the pots are washed in midwinter';
  if (kitOf(g).cleaned === d.year + 1) return 'the pots are washed already this winter';
  if (forcing(g, d.year)) return 'the pots are forcing chicory this winter';
  for (const b of dugBeds(g)) {
    const slugs = slugsOn(b) * CLEAN.slugs;
    if (slugs > 1e-9) applyFlow(g, {what: 'washing pots', unit: 'pests', product: 'slugs', amount: qty(slugs, 'pests'), from: {node: b.id, stock: SLUG_KEY}, to: {boundary: 'decay'}});
    touch(g, b.id);
  }
  setKit(g, {cleaned: d.year + 1});
  return null;
}
/** Whether the pots are forcing chicory this winter (forced since the start of the garden year's winter). */
const forcing = (g: Graph, year: number) => { const t = kitOf(g).forced; return t != null && t > 0 && calendar(t).year === year; };
/** Whether chicory can be put to force now: in its window, the pots not washed this winter, and not forcing already. */
export const forceOpen = (g: Graph, d: CalendarDate) => inWinter(FORCE, d.month, d.day) && kitOf(g).cleaned !== d.year + 1 && !forcing(g, d.year);
/** Puts chicory roots to force under the pots, which then can't be washed. Why not, or null. */
export function forceChicory(g: Graph, d: CalendarDate, hours: number): string | null {
  if (!forceOpen(g, d)) return kitOf(g).cleaned === d.year + 1 ? 'the pots are washed already this winter' : 'chicory is forced in January';
  setKit(g, {forced: hours});
  return null;
}
/** Whether salad can be sown on the windowsill now, and isn't already growing there. */
export const sillOpen = (g: Graph, d: CalendarDate, hours: number) => {
  const t = kitOf(g).sill;
  return inWinter(SILL, d.month, d.day) && !(t != null && hours - t < (SILL.wait + SILL.days) * 24);
};
/** Sows salad in trays on the windowsill, its seed from the purse. Why not, or null. */
export function sowSill(g: Graph, d: CalendarDate, hours: number): string | null {
  if (!sillOpen(g, d, hours)) return 'salad goes on the windowsill in midwinter';
  if (purse(g) < SILL.gbp) return `a packet of seed costs £${SILL.gbp.toFixed(2)}`;
  applyFlow(g, {what: 'seed', unit: 'GBP', amount: qty(SILL.gbp, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  setKit(g, {sill: hours});
  return null;
}
/** Whether the hens are due their winter care: in the house, and not cared for this winter. */
export const henCareOpen = (g: Graph, d: CalendarDate, hours: number) => {
  const t = kitOf(g).henCare;
  return inWinter(HEN_CARE, d.month, d.day) && hensIn(g) > 0 && !(t != null && hours - t < 100 * 24);
};
/** The hens' winter care: straw and a mite check from the purse, their welfare mended. Why not, or null. */
export function henCare(g: Graph, d: CalendarDate, hours: number): string | null {
  if (!henCareOpen(g, d, hours)) return 'the hens’ winter care is from mid-December, once there are hens';
  if (purse(g) < HEN_CARE.gbp) return `straw and mite powder cost £${HEN_CARE.gbp.toFixed(2)}`;
  applyFlow(g, {what: 'hen care', unit: 'GBP', amount: qty(HEN_CARE.gbp, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  const n = g.nodes.hens!, h = herdOf(n)!;
  n.levers.herd = {...h, welfare: 1} as unknown as LeverValue;
  setKit(g, {henCare: hours});
  touch(g, 'hens');
  return null;
}

/** The windowsill's salad, cut each day once it's ready, into the kitchen. */
function sill(c: TickContext) {
  const t = kitOf(c.graph).sill;
  if (t == null) return;
  const age = (c.hours - t) / 24;
  if (age < SILL.wait || age > SILL.wait + SILL.days) return;
  const kg = (owns(c.graph, 'propagator') ? SILL.warm : SILL.kg) * Math.max(1, Math.round(c.dt / 24));
  c.flow({what: 'windowsill salad', unit: 'kgFood', product: 'salad', amount: qty(kg, 'kgFood'), from: {boundary: 'growth'}, to: {node: KITCHEN, stock: 'food.salad'}});
  recordPick(c.graph, c.hours, kg);
}

/** The forced chicory, cut each day once it's ready, into the kitchen. */
function chicory(c: TickContext) {
  const t = kitOf(c.graph).forced;
  if (t == null) return;
  const age = (c.hours - t) / 24;
  if (age < FORCE.wait || age > FORCE.wait + FORCE.days) return;
  const kg = FORCE.kg * Math.max(1, Math.round(c.dt / 24));
  c.flow({what: 'forced chicory', unit: 'kgFood', product: 'salad', amount: qty(kg, 'kgFood'), from: {boundary: 'growth'}, to: {node: KITCHEN, stock: 'food.salad'}});
  recordPick(c.graph, c.hours, kg);
}

/** Pays for the beer traps' week from the purse; they go dry for the week if it can't. */
function beerWeek(c: TickContext) {
  if (!owns(c.graph, 'beer-trap')) return;
  const ok = purse(c.graph) >= BEER_TRAP.beerPerWeek;
  if (ok) c.flow({what: 'beer for the traps', unit: 'GBP', amount: qty(BEER_TRAP.beerPerWeek, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  if (kitOf(c.graph).dry === ok) setKit(c.graph, {dry: !ok});
}

/** The day's work of what's in the beds: the traps' catch of last night's slugs, and the nematodes'; and bare-root season
 *  opening in November and closing after March. */
function day(c: TickContext) {
  sill(c);
  chicory(c);
  const g = c.graph, kit = kitOf(g), trap = kit.owned.includes('beer-trap') && !kit.dry, bare = bareRoot(c.date.month);
  if (!!kit.bare !== bare) {
    setKit(g, {bare});
    if (bare && c.date.month === CORDON.from) note(c, 'bare-root season', 'shed', 1, 'season');
  }
  if (!trap && kit.nematodes <= 0) return;
  const w = weatherOf(g), days = w ? (w.step ?? [w]) : [], mean = days.length ? days.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / days.length : 0;
  const n = Math.max(1, days.length);
  for (const b of dugBeds(g)) {
    const kill = (what: string, k: number) => {
      const x = Math.min(k, slugsOn(b));
      if (x > 1e-9) c.flow({what, unit: 'pests', product: 'slugs', amount: qty(x, 'pests'), from: {node: b.id, stock: SLUG_KEY}, to: {boundary: 'decay'}});
    };
    // the traps catch from last night's slugs out: only at the garden's hourly steps, where the nights are played
    if (trap && n === 1) kill('beer trap', BEER_TRAP.share * pestsOf(b).night);
    // nematodes work only in soil warm and moist enough for them to move and find the slugs
    if (kit.nematodes > 0 && mean >= NEMATODES.minTemp && moisture(b) >= NEMATODES.minMoisture) kill('nematodes', slugsOn(b) * (1 - Math.pow(1 - NEMATODES.kill, n)));
  }
  if (kit.nematodes > 0) {
    const left = Math.max(0, kit.nematodes - n);
    setKit(g, {nematodes: left});
    if (!left) note(c, 'nematodes spent', 'shed', 1, 'packs');
  }
}

export const shed: System = {
  name: 'shed',
  on: {day, week: beerWeek},
  command(cmd, g) {
    if (cmd.type === 'buy') {
      const r = refuseBuy(g, cmd.id);
      if (!r) buy(g, cmd.id as UpgradeId);
      return r;
    }
    // the cold frame's place: over a dug bed, moved from wherever it was
    // a raised bed is built, not planned
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.lever === 'raised' && g.nodes[cmd.node]?.kind === 'bed') return 'a raised bed is bought in the shed';
    if (cmd.type === 'plan' && cmd.lever === 'cover' && g.nodes[cmd.node]?.kind === 'bed') {
      if (g.nodes[cmd.node]!.levers.cover === 'greenhouse') return 'the greenhouse’s glass stays on';
      if (cmd.value !== null && cmd.value !== 'cold-frame' && cmd.value !== 'cloches') return 'a cover is the cold frame, the cloches or none';
      if (cmd.value === 'cold-frame' || cmd.value === 'cloches') {
        const name = cmd.value === 'cold-frame' ? 'cold frame' : 'cloches';
        if (!owns(g, cmd.value)) return `the garden has no ${name} yet`;
        if ((g.nodes[cmd.node]!.stocks['land.crops']?.amount ?? 0) <= 0) return cmd.value === 'cold-frame' ? 'the cold frame goes on a dug bed' : 'the cloches go on a dug bed';
        const other = g.nodes[cmd.node]!.levers.cover;
        if (other && other !== cmd.value) return `${g.nodes[cmd.node]!.name} has the ${other === 'cold-frame' ? 'cold frame' : 'cloches'} over it`;
        for (const b of Object.values(g.nodes)) if (b.kind === 'bed' && b.id !== cmd.node && b.levers.cover === cmd.value) b.levers.cover = null;
      }
      return null;
    }
    if (cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law') return undefined;
    if (cmd.node === 'shed' && cmd.lever === 'kit') return 'the kit is bought, not set';
    return undefined;
  },
};
