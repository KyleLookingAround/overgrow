// The gardener: one person with about four hours a day for the garden (six at weekends), the household's hours for it
// around a weekday job (src/sim/models/household.ts), who does everything the plan and the garden call for. Each morning they plan the day's jobs in order (pick what's ready, water the beds below the
// plan's line, clear, compost, sow and water in what's due, carry the kitchen's surplus to the honesty box and its scraps
// to the heap, dig), each taking its time with the best tool they have (src/data/jobs.ts), and what doesn't fit waits
// until tomorrow. The plan's pest policy (src/data/pests.ts) adds its jobs: traps checked, pellets scattered, aphids
// squashed or sprayed, blighted leaves picked off or the potatoes sprayed, a border of flowers planted, and on a damp
// evening a patrol with a torch at dusk to pick slugs off the beds, its time kept back from the day's hours first. On a
// working day they leave through the gate for the job before the job that would run past the hour they go, and come
// home in the evening to finish the day's list, bringing the weekly shop's bags on their last working day. Every step
// is an activity the map draws, a new id each trip, and each job's flows move when the step that does it ends. A change to the plan during the working day re-plans the rest of it, finishing the job in hand
// first. docs/systems/gardener.md.
import {CROPS, type CropId} from '../data/crops';
import {BORDER} from '../data/flowers';
import {CONTROL, POLICIES, SLUGS, START_POLICY, type PestId, type Policy} from '../data/pests';
import {DIG_IN, FILL_L_PER_MIN, HOURS, LONG_WATERING, START_TOOLS, TOOLS, WALK, WATER_IN, COMPOST_PER_M2, type Job, type JobTime, type Tool} from '../data/jobs';
import {digCost} from '../data/garden';
import {commute, householdGardenHours, membersOf, shopDay, shopEstimate, weeklyShop, type Household} from './models/household';
import {START} from '../data/ladder';
import type {Activity} from './activity';
import {calendar, type CalendarDate, type System, type TickContext} from './clock';
import {qty, type Graph, type GraphNode, type LeverValue, type NodeId, type Unit} from './graph';
import {compostOn, dig, digIn, spread, toHeap} from './models/carbon';
import {borderOf, plantBorder} from './models/biodiversity';
import {cropOf, foodKey, inSeason, neighbours, PICK_MIN, plannedCrop, quality, ripe, sow, specOf, summerCrop, wasteOn} from './models/crops';
import {note} from './effects';
import {paySeed, seedCost} from './shed';
import {HENS} from '../data/shed';
import {SPECIES} from '../data/livestock';
import {BERRIES, ripeFruit} from './models/fruit';
import {clearOut, herdOf, LIVE} from './models/livestock';
import {chitStart} from './kit';
import {aphidsOn, control, draws, pestsOf, slugsOn} from './models/pests';
import {GATE, give, glutPolicy, KITCHEN, mixQuality, preserve, preserveRoom, qualityAt, recordGlut, recordPick, surplusOf} from './models/kitchen';
import {GLUT, PRESERVE} from '../data/kitchen';
import {areaOf, limitsOf, moisture, SOIL} from './models/soil';
import {hourOf, sunOn, weatherOf} from './models/weather';

export const GARDENER = 'gardener';
/** The hens' node, once they're bought (src/data/garden.ts's SITES). */
const HENS_NODE = 'hens';
/** Hours to pick a kg of soft fruit by hand (about two kilos an hour). */
const FRUIT_PICK = 0.5;
const HOME = 'shed';

/** What a step does when it ends. */
export type Effect =
  | {kind: 'water'; bed: NodeId; source: 'butt' | 'tap'; litres: number}
  | {kind: 'sow'; bed: NodeId; crop: CropId; seed: number}
  | {kind: 'pick'; bed: NodeId; product: string; kg: number}
  | {kind: 'heap'; from: NodeId; kg: number}
  | {kind: 'spread'; bed: NodeId; kg: number}
  | {kind: 'dig'; bed: NodeId; m2: number}
  | {kind: 'dig in'; bed: NodeId}
  | {kind: 'box'; items: {product: string; kg: number}[]}
  | {kind: 'pest'; bed: NodeId; pest: PestId; how: Policy}
  | {kind: 'border'; bed: NodeId; flower: CropId; seed: number}
  | {kind: 'home'; shop: boolean}
  | {kind: 'hens'; clean: boolean}
  | {kind: 'preserve' | 'give'; items: {product: string; kg: number}[]}
  | {kind: 'mulch'; bed: NodeId; kg: number};

/** One step of the day: an activity to show when it starts, and its effect when it ends. */
export interface Step {
  id: string;
  doing: string;
  from: NodeId;
  to: NodeId;
  start: number;
  end: number;
  carry?: {unit: Unit; amount: number; product?: string};
  effect?: Effect;
  shown?: boolean;
  /** The job it's part of: a re-plan keeps the whole of a job that's under way. */
  job: number;
}

/** The day's plan, kept as the gardener's `day` lever and replaced whenever it changes. */
export interface Day {
  /** The calendar's day index, and the plan it was made from (re-planned when that changes). */
  day: number;
  key: string;
  /** The next step's number, so a re-plan never reuses an id. */
  next: number;
  steps: Step[];
}

export const dayOf = (g: Graph): Day | null => (g.nodes[GARDENER]?.levers.day as unknown as Day | null | undefined) ?? null;
export const GARDENER_LEVERS = (): Record<string, LeverValue> => ({waterBelow: 0.5, ...START_POLICY, tools: [...START_TOOLS], day: null, mulch: []});
const PESTS = Object.keys(POLICIES) as PestId[];
/** What the plan's pest policy says for a pest. */
export const policyOf = (g: Graph, pest: PestId): Policy => (g.nodes[GARDENER]?.levers[pest] as Policy | undefined) ?? START_POLICY[pest];
const OWN = new Set(['tools', 'day', 'mulch']);

/** The plan the day's jobs come from: the watering line and every bed's plan (its winter line and cover too). Written out
 *  again only when one of them is a different value from the last time (levers are replaced, never changed in place). */
const planned = new WeakMap<Graph, {parts: LeverValue[]; key: string}>();
function planKey(g: Graph): string {
  const me = g.nodes[GARDENER]?.levers, parts: LeverValue[] = [me?.waterBelow ?? null, me?.mulch ?? null];
  for (const p of PESTS) parts.push(me?.[p] ?? null);
  for (const id in g.nodes) {
    const n = g.nodes[id]!;
    if (n.kind === 'bed') parts.push(n.id, n.levers.sow ?? null, n.levers.sowFrom ?? null, n.levers.dig ?? null, n.levers.edge ?? null, n.levers.winter ?? null, n.levers.cover ?? null);
  }
  const had = planned.get(g);
  if (had && had.parts.length === parts.length && had.parts.every((x, i) => x === parts[i])) return had.key;
  const key = JSON.stringify(parts);
  planned.set(g, {parts, key});
  return key;
}

/** The dug beds a winter mulch goes on: empty ones and those with a crop standing the winter (compost spread around the
 *  plants; RHS, "Mulches"), not the greenhouse's border. */
export const mulchBeds = (g: Graph) => Object.values(g.nodes).filter((n) => n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0 && n.levers.cover !== 'greenhouse');
/** Asks the gardener to mulch the empty beds with the heap's compost (the mulch card). Why not, or null. */
export function askMulch(g: Graph): string | null {
  const me = g.nodes[GARDENER], beds = mulchBeds(g);
  if (!me || !beds.length) return 'no bed is dug';
  if (compostOn(g) < MULCH_MIN) return 'the heap has too little compost';
  me.levers.mulch = beds.map((b) => b.id);
  return null;
}
/** The least compost on the heap, kg, worth a winter mulch. */
export const MULCH_MIN = 10;

/** The hours the gardener has for the garden on a day: the household's garden hours that weekday, to the minute. */
export const hoursOn = (h: Household, d: CalendarDate) => Math.round(householdGardenHours(h, d.weekday) * 60) / 60;

/** The steps of going to work and back: they take none of the garden's hours. */
const COMMUTE = new Set(['leave', 'away', 'home']);
/** A working day's time away, in game hours: leaving the shed for the gate, and back at the gate, and whether the weekly
 *  shop comes home with them. */
interface Away {
  leaves: number;
  returns: number;
  shop: boolean;
}
/** The gardener's time away at work on a day, or null on a day at home or once the hour they leave has passed. */
function awayOn(g: Graph, date: CalendarDate, t: number): Away | null {
  const me = membersOf(g).members.find((m) => m.role === 'gardener'), c = me && commute(me, date.weekday);
  if (!me || !c) return null;
  const midnight = date.dayIndex * 24 - START.hour, leaves = midnight + c.leaves;
  return leaves <= t ? null : {leaves, returns: midnight + c.returns, shop: shopDay(me) === date.weekday};
}

/** The fastest way the gardener's tools do a job, or null if none of them can. */
function best(g: Graph, job: Job): JobTime | null {
  const tools = (g.nodes[GARDENER]?.levers.tools as Tool[] | undefined) ?? START_TOOLS;
  let out: JobTime | null = null;
  for (const t of tools) {
    const j = TOOLS[t]?.jobs[job];
    if (j && (!out || j.per < out.per)) out = j;
  }
  return out;
}

/** The game hour the next day's work starts, after a time. */
export function nextStart(t: number): number {
  const hour = (((t + START.hour) % 24) + 24) % 24;
  return t - hour + HOURS.start + (hour >= HOURS.start ? 24 : 0);
}

// ---- planning ----

/** Builds a day's steps from a place and time with some hours, adding each job only if it fits. */
class Planner {
  steps: Step[] = [];
  butt: number;
  compost: number;
  money: number;
  constructor(readonly g: Graph, public pos: NodeId, public t: number, public left: number, public next: number, readonly dayIndex: number, public away: Away | null = null) {
    this.butt = g.nodes.butt?.stocks.water?.amount ?? 0;
    this.compost = compostOn(g);
    this.money = g.nodes[KITCHEN]?.stocks.money?.amount ?? 0;
  }
  private centre(id: NodeId) {
    const b = this.g.nodes[id]?.box;
    return b ? {x: b.x + b.w / 2, y: b.y + b.h / 2} : {x: 0, y: 0};
  }
  walkTime(a: NodeId, b: NodeId) {
    if (a === b) return 0;
    const p = this.centre(a), q = this.centre(b);
    return Math.hypot(p.x - q.x, p.y - q.y) / WALK;
  }
  /** Hours to walk a round from the shed through some places and back. */
  round(ids: NodeId[]) {
    let h = 0, at = HOME;
    for (const id of [...ids, HOME]) {
      h += this.walkTime(at, id);
      at = id;
    }
    return h;
  }
  /** Tries a job made of steps; keeps it only if all of it fits in the hours left. A job that would run past the hour
   *  the gardener leaves for work waits until they're home. */
  job(build: (j: JobBuilder) => void): boolean {
    let j = new JobBuilder(this);
    build(j);
    if (this.away && j.steps.length && j.t > this.away.leaves - this.walkTime(j.pos, GATE)) {
      this.goOut();
      j = new JobBuilder(this);
      build(j);
    }
    const time = j.t - this.t;
    if (!j.steps.length || time > this.left + 1e-9) return false;
    this.steps.push(...j.steps);
    this.t = j.t;
    this.pos = j.pos;
    this.left -= time;
    this.next = j.next;
    return true;
  }
  /** Out through the gate to work at the hour, and home through the kitchen door in the evening (with the week's shop on
   *  its day): none of it the garden's hours. */
  goOut() {
    const a = this.away;
    if (!a) return;
    this.away = null;
    // back to the shed to wait if there's time, then out through the gate at the hour
    const j = new JobBuilder(this), walk = this.walkTime(HOME, GATE), back = this.walkTime(j.pos, HOME);
    if (a.leaves - walk > j.t + back) {
      // the walk back is the garden's time, like the walk home at the end of the day
      j.walk(HOME);
      this.left -= back;
      j.step('rest', HOME, a.leaves - walk - j.t);
    }
    j.step('leave', GATE, this.walkTime(j.pos, GATE));
    j.step('away', GATE, Math.max(0, a.returns - j.t));
    const bags = a.shop ? {unit: 'kgFood' as const, amount: shopEstimate(this.g), product: 'shop'} : undefined;
    j.walk(KITCHEN, 'home', bags, {kind: 'home', shop: a.shop});
    this.steps.push(...j.steps);
    this.t = j.t;
    this.pos = j.pos;
    this.next = j.next;
  }
  /** A watering trip's source: the butt while it has water, then the tap. */
  source(): 'butt' | 'tap' {
    return this.butt >= 1 ? 'butt' : 'tap';
  }
}

class JobBuilder {
  steps: Step[] = [];
  pos: NodeId;
  t: number;
  next: number;
  readonly job: number;
  constructor(readonly p: Planner) {
    this.pos = p.pos;
    this.t = p.t;
    this.next = p.next;
    this.job = p.next; // the job's first step number: unique within the day
  }
  step(doing: string, to: NodeId, hours: number, carry?: Step['carry'], effect?: Effect) {
    const s: Step = {id: `g${this.p.dayIndex}-${this.next++}`, doing, from: this.pos, to, start: this.t, end: this.t + hours, job: this.job};
    if (carry) s.carry = carry;
    if (effect) s.effect = effect;
    this.steps.push(s);
    this.t += hours;
    this.pos = to;
  }
  walk(to: NodeId, doing = 'walk', carry?: Step['carry'], effect?: Effect) {
    const h = this.p.walkTime(this.pos, to);
    if (h > 0 || effect) this.step(doing, to, h, carry, effect);
  }
  work(doing: string, hours: number, carry?: Step['carry'], effect?: Effect) {
    this.step(doing, this.pos, hours, carry, effect);
  }
}

const can = (litres: number): Step['carry'] => ({unit: 'L', amount: litres});

/** Whether a way of watering is the hose's: straight from the tap, no trips. */
const byHose = (how: JobTime) => how === TOOLS.hose.jobs.water;

/** The hose run out from the tap to a bed, the bed watered and the hose reeled back, in a job's steps. */
function hose(j: JobBuilder, bed: NodeId, litres: number, how: JobTime) {
  j.walk('tap', 'fetch');
  j.work('unreel', (how.setup ?? 0) / 2);
  j.walk(bed, 'hose');
  j.work('water', litres * how.per, undefined, {kind: 'water', bed, source: 'tap', litres});
  j.walk('tap', 'hose');
  j.work('reel', (how.setup ?? 0) / 2);
}

/** Water trips to bring a bed to some litres; returns false once a trip doesn't fit. */
function water(p: Planner, bed: GraphNode, litres: number): boolean {
  const how = best(p.g, 'water');
  if (!how) return false;
  if (byHose(how)) return litres <= 0.5 || p.job((j) => hose(j, bed.id, litres, how));
  while (litres > 0.5) {
    const source = p.source(), trip = Math.min(litres, how.trip ?? litres, source === 'butt' ? Math.max(p.butt, 0) : Infinity);
    if (trip <= 0.5) break;
    const ok = p.job((j) => {
      j.walk(source, 'fetch', can(0));
      j.work('fill', trip / FILL_L_PER_MIN[source]! / 60 + (how.load ?? 0), can(trip));
      j.walk(bed.id, 'carry', can(trip));
      j.work('water', trip * how.per + (how.setup ?? 0), can(trip), {kind: 'water', bed: bed.id, source, litres: trip});
    });
    if (!ok) return false;
    if (source === 'butt') p.butt -= trip;
    litres -= trip;
  }
  return true;
}

/** Picks what's ripe on a bed and carries it to the kitchen, a basketful a trip. */
function harvest(p: Planner, bed: GraphNode) {
  const s = cropOf(bed), pick = best(p.g, 'pick'), carry = best(p.g, 'carry');
  if (!s || !pick || !carry) return;
  const spec = specOf(s);
  let kg = ripe(bed);
  while (kg >= PICK_MIN) {
    const load = Math.min(kg, carry.trip ?? kg);
    const ok = p.job((j) => {
      j.walk(bed.id);
      j.work('pick', load * spec.pick * pick.per, {unit: 'kgFood', amount: load, product: spec.product});
      j.walk(KITCHEN, 'carry', {unit: 'kgFood', amount: load, product: spec.product}, {kind: 'pick', bed: bed.id, product: spec.product, kg: load});
    });
    if (!ok) return;
    kg -= load;
  }
}

/** Picks the ripe soft fruit in the cage and carries it to the kitchen, a basketful a trip. */
function pickFruit(p: Planner, f: GraphNode) {
  const carry = best(p.g, 'carry');
  if (!carry) return;
  let kg = ripeFruit(f);
  while (kg >= PICK_MIN) {
    const load = Math.min(kg, carry.trip ?? kg);
    const ok = p.job((j) => {
      j.walk(f.id);
      j.work('pick', load * FRUIT_PICK, {unit: 'kgFood', amount: load, product: BERRIES});
      j.walk(KITCHEN, 'carry', {unit: 'kgFood', amount: load, product: BERRIES}, {kind: 'pick', bed: f.id, product: BERRIES, kg: load});
    });
    if (!ok) return;
    kg -= load;
  }
}

/** The hens' morning: the feed topped up to a week's, bought from the purse as it's used; the trough filled from the tap;
 *  the eggs brought in to the kitchen; and on a Saturday the house cleaned out, the droppings to the heap. */
function keepHens(c: TickContext, clean: boolean) {
  const g = c.graph, n = g.nodes[HENS_NODE], herd = n && herdOf(n);
  if (!n || !herd) return;
  const sp = SPECIES[herd.species], want = herd.head * sp.intake * HENS.feedDays, feed = n.stocks[LIVE.feed]?.amount ?? 0;
  const perKg = HENS.sackGbp / HENS.sackKg, money = g.nodes[KITCHEN]?.stocks.money?.amount ?? 0, kg = Math.min(Math.max(0, want - feed), money / perKg);
  if (kg > 1e-6) {
    c.flow({what: 'hen feed', unit: 'GBP', amount: qty(kg * perKg, 'GBP'), from: at(KITCHEN, 'money'), to: {boundary: 'bought'}});
    c.flow({what: 'hen feed', unit: 'kgFeed', product: 'feed', amount: qty(kg, 'kgFeed'), from: {boundary: 'bought'}, to: at(HENS_NODE, LIVE.feed)});
  }
  const water = herd.head * sp.water * 2 - (n.stocks[LIVE.water]?.amount ?? 0);
  if (water > 1e-6) c.flow({what: 'water for the hens', unit: 'L', amount: qty(water, 'L'), from: {boundary: 'mains'}, to: at(HENS_NODE, LIVE.water)});
  const eggs = n.stocks[LIVE.eggs]?.amount ?? 0;
  if (eggs > 1e-9) {
    recordPick(g, c.hours, eggs);
    c.flow({what: 'collecting eggs', unit: 'kgFood', product: 'eggs', amount: qty(eggs, 'kgFood'), from: at(HENS_NODE, LIVE.eggs), to: at(KITCHEN, foodKey('eggs'))});
  }
  if (clean) clearOut(c, n);
}

/** Carries the waste on a place to the heap (clearing a bed first). */
function clear(p: Planner, from: GraphNode, bed: boolean): boolean {
  const kg = wasteOn(from), how = best(p.g, 'clear');
  if (kg < 0.02) return true;
  return p.job((j) => {
    j.walk(from.id);
    if (bed && how) j.work('clear', areaOf(from) * how.per, {unit: 'kgWaste', amount: kg, product: 'greens'});
    j.walk('heap', 'carry', {unit: 'kgWaste', amount: kg, product: 'greens'}, {kind: 'heap', from: from.id, kg});
  });
}

/** Clears a bed, spreads compost if the heap has some, sows the plan's crop and waters it in: all of it, or none today. */
function sowBed(p: Planner, bed: GraphNode, crop: CropId): boolean {
  const spec = CROPS[crop], area = areaOf(bed), how = best(p.g, spec.how), bucket = best(p.g, 'spread'), cans = best(p.g, 'water');
  if (!how) return false;
  const kg = bucket ? Math.min(p.compost, COMPOST_PER_M2 * area) : 0, seed = seedCost(p.g, crop, calendar(p.t).year);
  // the seed comes out of the purse: a sowing waits until it has the price
  if (p.money < seed) return false;
  let fromButt = 0;
  return p.job((j) => {
    fromButt = 0; // built again if it has to wait until they're home from work
    const waste = wasteOn(bed), clearing = best(p.g, 'clear');
    if (waste >= 0.02) {
      j.walk(bed.id);
      if (clearing) j.work('clear', area * clearing.per, {unit: 'kgWaste', amount: waste, product: 'greens'});
      j.walk('heap', 'carry', {unit: 'kgWaste', amount: waste, product: 'greens'}, {kind: 'heap', from: bed.id, kg: waste});
    }
    for (let left = kg; bucket && left >= 0.5; ) {
      const load = Math.min(left, bucket.trip ?? left);
      j.walk('heap', 'fetch');
      j.work('load', bucket.load ?? 0, {unit: 'kgWaste', amount: load, product: 'compost'});
      j.walk(bed.id, 'carry', {unit: 'kgWaste', amount: load, product: 'compost'});
      j.work('spread', load * bucket.per, {unit: 'kgWaste', amount: load, product: 'compost'}, {kind: 'spread', bed: bed.id, kg: load});
      left -= load;
    }
    j.walk(HOME, 'fetch');
    j.walk(bed.id);
    j.work(spec.how, area * how.per, undefined, {kind: 'sow', bed: bed.id, crop, seed});
    // watered in: by hose, or a trip a can
    if (cans && byHose(cans)) hose(j, bed.id, WATER_IN * area, cans);
    else for (let litres = WATER_IN * area; cans && litres > 0.5; ) {
      const left = j.p.butt - fromButt, source = left >= 1 ? 'butt' : 'tap', trip = Math.min(litres, cans.trip ?? litres, source === 'butt' ? left : Infinity);
      j.walk(source, 'fetch', can(0));
      j.work('fill', trip / FILL_L_PER_MIN[source]! / 60 + (cans.load ?? 0), can(trip));
      j.walk(bed.id, 'carry', can(trip));
      j.work('water', trip * cans.per + (cans.setup ?? 0), can(trip), {kind: 'water', bed: bed.id, source, litres: trip});
      if (source === 'butt') fromButt += trip;
      litres -= trip;
    }
  }) && ((p.compost -= kg), (p.butt -= fromButt), (p.money -= seed), true);
}

/** A treatment's job: fetch it from the shed, then treat the bed; only if the purse has its price. */
function treat(p: Planner, bed: GraphNode, doing: string, minutes: number, cost: number, pest: PestId) {
  if (p.money < cost) return;
  if (p.job((j) => {
    j.walk(HOME, 'fetch');
    j.walk(bed.id);
    j.work(doing, minutes / 60, undefined, {kind: 'pest', bed: bed.id, pest, how: 'treat'});
  })) p.money -= cost;
}

/** The pest policy's daytime jobs on the dug beds: traps, pellets, aphids and blight. */
function pestJobs(p: Planner, dug: GraphNode[], date: CalendarDate) {
  const slugs = policyOf(p.g, 'slugs'), aphids = policyOf(p.g, 'aphids'), blight = policyOf(p.g, 'blight');
  const inPlace = (bed: GraphNode, doing: string, minutes: number, pest: PestId, how: Policy) =>
    p.job((j) => {
      j.walk(bed.id);
      j.work(doing, minutes / 60, undefined, {kind: 'pest', bed: bed.id, pest, how});
    });
  for (const b of dug) {
    const pests = pestsOf(b), dense = aphidsOn(b) / Math.max(1e-6, areaOf(b)), slugged = slugsOn(b) >= 1 && draws(b, 'slugs');
    if (slugs === 'trap' && slugged && pests.night > 0) inPlace(b, 'trap', CONTROL.slugs.trap.minutes, 'slugs', 'trap');
    if (slugs === 'treat' && slugged && pests.pellets <= p.t + 12) treat(p, b, 'pellets', CONTROL.slugs.treat.minutes, CONTROL.slugs.treat.cost, 'slugs');
    if (aphids === 'pick' && draws(b, 'aphids') && dense > CONTROL.aphids.pick.over) inPlace(b, 'squash', CONTROL.aphids.pick.minutes, 'aphids', 'pick');
    if (aphids === 'treat' && draws(b, 'aphids') && dense > CONTROL.aphids.treat.over && pests.sprayed <= p.t)
      treat(p, b, 'spray', CONTROL.aphids.treat.minutes, CONTROL.aphids.treat.cost, 'aphids');
    if (blight === 'pick' && draws(b, 'blight') && pests.blight > CONTROL.blight.pick.over) inPlace(b, 'deleaf', CONTROL.blight.pick.minutes, 'blight', 'pick');
    if (blight === 'treat' && draws(b, 'blight') && CONTROL.blight.treat.months.includes(date.month) && pests.fungicide <= p.t)
      treat(p, b, 'spray', CONTROL.blight.treat.minutes, CONTROL.blight.treat.cost, 'blight');
  }
}

/** The beds worth a torch patrol tonight: the policy picks slugs, and a planted bed has slugs and a damp, mild enough
 *  evening coming. */
function patrolBeds(g: Graph, dug: GraphNode[], date: CalendarDate): GraphNode[] {
  if (policyOf(g, 'slugs') !== 'pick') return [];
  const w = weatherOf(g), today = !!w && w.day === date.dayIndex, wet = today && w!.wet;
  // not on a night too cold for slugs to be out
  if (today && hourOf(w!, (duskOf(g, date) + START.hour) % 24).temp < SLUGS.minTemp) return [];
  return dug.filter((b) => slugsOn(b) >= 1 && draws(b, 'slugs') && (wet || moisture(b) >= 0.5));
}

/** When the dusk patrol goes out, game hours: half an hour after sunset, and not before the day's work stops. */
function duskOf(g: Graph, date: CalendarDate): number {
  const w = weatherOf(g), length = w && w.day === date.dayIndex ? w.length : sunOn(date.dayOfYear).length;
  return date.dayIndex * 24 - START.hour + Math.max(HOURS.stop, Math.min(23, 12 + length / 2 + 0.5));
}

/** The day's jobs, in order, from a place and time with the hours left. */
function plan(g: Graph, date: CalendarDate, pos: NodeId, t: number, left: number, next: number): {steps: Step[]; next: number} {
  const beds = Object.values(g.nodes).filter((n) => n.kind === 'bed');
  const dug = beds.filter((n) => (n.stocks['land.crops']?.amount ?? 0) > 0);
  // the dusk patrol's time comes off the day's hours first, so it's always done
  const probe = new Planner(g, pos, t, left, next, date.dayIndex), tour = patrolBeds(g, dug, date);
  const patrol = tour.length ? probe.round(tour.map((b) => b.id)) + (tour.length * CONTROL.slugs.pick.minutes) / 60 : 0;
  const night = patrol > 0 && patrol <= left ? tour : [];
  const p = new Planner(g, pos, t, left - (night.length ? patrol : 0), next, date.dayIndex, awayOn(g, date, t)), line = Number(g.nodes[GARDENER]?.levers.waterBelow ?? 0.5);
  // 0. the hens first thing: fed, watered and their eggs brought in, and cleaned out on a Saturday
  const hens = g.nodes[HENS_NODE];
  if (hens && herdOf(hens)) {
    const clean = date.weekday === 5;
    p.job((j) => {
      j.walk(HENS_NODE);
      j.work('hens', (HENS.dailyMinutes + (clean ? HENS.cleanMinutes : 0)) / 60);
      const eggs = hens.stocks[LIVE.eggs]?.amount ?? 0;
      j.walk(KITCHEN, 'carry', eggs > 0.01 ? {unit: 'kgFood', amount: eggs, product: 'eggs'} : undefined, {kind: 'hens', clean});
    });
  }
  // 1. pick what's ready, and the soft fruit in the cage
  for (const b of dug) if (ripe(b) >= PICK_MIN) harvest(p, b);
  for (const f of Object.values(g.nodes)) if (f.kind === 'fruit' && ripeFruit(f) >= PICK_MIN) pickFruit(p, f);
  // 2. water what's below the line
  for (const b of dug) {
    const s = cropOf(b);
    if (!s || s.dead) continue;
    const lim = limitsOf(b), m = moisture(b, lim);
    if (m < line) water(p, b, lim.fc - (b.stocks[SOIL.water]?.amount ?? 0));
  }
  // 2b. the pest policy's daytime work
  pestJobs(p, dug, date);
  // 3. a green manure dug in where it stands once the summer plan's next crop is due (sown the day after)
  const spade = best(g, 'dig');
  for (const b of dug) {
    const s = cropOf(b);
    if (!spade || !s || !specOf(s).dugIn || !summerCrop(b, date)) continue;
    p.job((j) => {
      j.walk(HOME, 'fetch');
      j.walk(b.id);
      j.work('dig', areaOf(b) * spade.per * DIG_IN, undefined, {kind: 'dig in', bed: b.id});
    });
  }
  // and sow what's due (clearing and composting first, watering in after)
  const sown = new Set<string>(), today: CropId[] = [];
  for (const b of dug) {
    if (cropOf(b) || (b.stocks['land.grass']?.amount ?? 0) > 0) continue;
    // what the other beds grow, and what's going in today
    const crop = plannedCrop(b, date, [...neighbours(dug, b), ...today]);
    if (crop && sowBed(p, b, crop)) sown.add(b.id), today.push(crop);
  }
  // a winter mulch of the heap's compost on the beds the household asked for (the mulch card), a bed at a time
  const mulch = ((g.nodes[GARDENER]?.levers.mulch as string[] | undefined) ?? []).map((id) => g.nodes[id]).filter((b): b is GraphNode => !!b);
  const bucket = best(g, 'spread');
  for (const b of mulch) {
    const kg = bucket ? Math.min(p.compost, COMPOST_PER_M2 * areaOf(b)) : 0;
    if (kg < 0.5) break;
    if (p.job((j) => {
      for (let left = kg; left >= 0.5; ) {
        const load = Math.min(left, bucket!.trip ?? left);
        j.walk('heap', 'fetch');
        j.work('load', bucket!.load ?? 0, {unit: 'kgWaste', amount: load, product: 'compost'});
        j.walk(b.id, 'carry', {unit: 'kgWaste', amount: load, product: 'compost'});
        j.work('spread', load * bucket!.per, {unit: 'kgWaste', amount: load, product: 'compost'}, {kind: 'mulch', bed: b.id, kg: load});
        left -= load;
      }
    })) p.compost -= kg;
  }
  // and a border of flowers along a bed's edge, where the plan wants one and it's their season
  for (const b of dug) {
    const want = b.levers.edge;
    if (typeof want !== 'string' || !(want in CROPS) || borderOf(b) || !inSeason(CROPS[want as CropId], date)) continue;
    const seed = seedCost(g, want as CropId, date.year);
    if (p.money < seed) continue;
    if (p.job((j) => {
      j.walk(HOME, 'fetch');
      j.walk(b.id);
      j.work('plant', BORDER.minutes / 60, undefined, {kind: 'border', bed: b.id, flower: want as CropId, seed});
    })) p.money -= seed;
  }
  // 4. carry: the kitchen's surplus to the honesty box, scraps and waste to the heap
  const kitchen = g.nodes[KITCHEN], carry = best(g, 'carry');
  if (kitchen && g.nodes[GATE] && carry) {
    let items = surplusOf(g);
    // the household's glut policy first: preserved in the kitchen while the freezer has room, or given over the fence
    const policy = glutPolicy(g);
    if (policy === 'preserve' && items.length) {
      let room = preserveRoom(g);
      const jar: {product: string; kg: number}[] = [], rest: {product: string; kg: number}[] = [];
      for (const it of items) {
        const kg = Math.min(it.kg, room);
        if (kg > 0.05) jar.push({product: it.product, kg});
        room -= Math.max(0, kg);
        if (it.kg - kg > 0.05) rest.push({product: it.product, kg: it.kg - kg});
      }
      const kg = jar.reduce((a, x) => a + x.kg, 0);
      if (kg > 0 && p.money >= kg * PRESERVE.gbpPerKg && p.job((j) => {
        j.walk(KITCHEN);
        j.work('preserve', kg * PRESERVE.hoursPerKg, undefined, {kind: 'preserve', items: jar});
      })) {
        p.money -= kg * PRESERVE.gbpPerKg;
        items = rest;
      }
    }
    const neighbour = policy === 'give';
    while (items.length) {
      let room = carry.trip ?? Infinity;
      const load: {product: string; kg: number}[] = [], rest: {product: string; kg: number}[] = [];
      for (const it of items) {
        const kg = Math.min(it.kg, room);
        if (kg > 0.01) load.push({product: it.product, kg});
        room -= kg;
        if (it.kg - kg > 0.01) rest.push({product: it.product, kg: it.kg - kg});
      }
      const kg = load.reduce((s, x) => s + x.kg, 0);
      const ok = p.job((j) => {
        j.walk(KITCHEN);
        j.work('load', carry.load ?? 0, {unit: 'kgFood', amount: kg, product: load[0]!.product});
        // to the box by the gate, or over the fence there to the neighbour
        j.walk(GATE, neighbour ? 'give' : 'carry', {unit: 'kgFood', amount: kg, product: load[0]!.product}, neighbour ? {kind: 'give', items: load} : {kind: 'box', items: load});
      });
      if (!ok) break;
      items = rest;
    }
    if (wasteOn(kitchen) >= 1) clear(p, kitchen, false);
  }
  for (const b of dug) if (!sown.has(b.id) && wasteOn(b) >= 0.5) clear(p, b, true);
  // 5. dig a plot the plan wants dug, a quarter of a square metre at a time, each with its edging and compost from the purse: one bed
  // at a time, the first the plan wants, so a new bed is a project that's finished before the next is begun
  const digging = beds.find((b) => b.levers.dig === true && (b.stocks['land.grass']?.amount ?? 0) > 1e-6);
  let grass = digging ? digging.stocks['land.grass']?.amount ?? 0 : 0;
  while (digging && spade && grass > 1e-6) {
    const m2 = Math.min(0.25, grass);
    if (p.money < digCost(m2) || !p.job((j) => {
      j.walk(digging.id);
      j.work('dig', m2 * spade.per, undefined, {kind: 'dig', bed: digging.id, m2});
    })) break;
    p.money -= digCost(m2);
    grass -= m2;
  }
  // off to work if they haven't gone yet; home to the shed; out again at dusk with a torch if there's a patrol; then rest
  // until tomorrow's start
  p.goOut();
  const back = new JobBuilder(p);
  back.walk(HOME);
  if (night.length) {
    const dusk = duskOf(g, date);
    if (dusk > back.t) back.step('rest', HOME, dusk - back.t);
    for (const b of night) {
      back.walk(b.id, 'torch');
      back.work('torch', CONTROL.slugs.pick.minutes / 60, undefined, {kind: 'pest', bed: b.id, pest: 'slugs', how: 'pick'});
    }
    back.walk(HOME, 'torch');
  }
  back.step('rest', HOME, Math.max(0.01, nextStart(back.t) - back.t));
  return {steps: [...p.steps, ...back.steps], next: back.next};
}

// ---- doing ----

const at = (node: string, stock: string) => ({node, stock});

function apply(c: TickContext, e: Effect) {
  const g = c.graph;
  switch (e.kind) {
    case 'water': {
      const bed = g.nodes[e.bed];
      if (!bed) return;
      const litres = e.source === 'butt' ? Math.min(e.litres, g.nodes.butt?.stocks.water?.amount ?? 0) : e.litres;
      if (litres > 1e-9) c.flow({what: 'watering', unit: 'L', amount: qty(litres, 'L'), from: e.source === 'butt' ? at('butt', 'water') : {boundary: 'mains'}, to: at(e.bed, SOIL.water)});
      return;
    }
    case 'sow': {
      const bed = g.nodes[e.bed];
      if (bed && !cropOf(bed)) {
        sow(bed, e.crop, c.hours, chitStart(g, e.crop, c.hours));
        paySeed(c, e.seed);
      }
      return;
    }
    case 'pick': {
      const kg = Math.min(e.kg, g.nodes[e.bed]?.stocks[foodKey(e.product)]?.amount ?? 0);
      if (kg <= 1e-9) return;
      const s = cropOf(g.nodes[e.bed]!);
      recordPick(g, c.hours, kg, e.product, s ? quality(s) : undefined);
      c.flow({what: 'picking', unit: 'kgFood', product: e.product, amount: qty(kg, 'kgFood'), from: at(e.bed, foodKey(e.product)), to: at(KITCHEN, foodKey(e.product))});
      return;
    }
    case 'heap': {
      const from = g.nodes[e.from];
      if (from) toHeap(c, from, e.kg);
      return;
    }
    case 'spread': {
      const bed = g.nodes[e.bed];
      if (bed) spread(c, bed, e.kg);
      return;
    }
    case 'dig': {
      const bed = g.nodes[e.bed];
      if (bed) dig(c, bed, e.m2);
      return;
    }
    case 'dig in': {
      const bed = g.nodes[e.bed];
      if (bed) digIn(c, bed);
      return;
    }
    case 'pest':
      control(c, e.bed, e.pest, e.how);
      return;
    case 'border': {
      const bed = g.nodes[e.bed];
      if (bed && !borderOf(bed)) {
        plantBorder(bed, e.flower, c.hours);
        paySeed(c, e.seed);
      }
      return;
    }
    case 'box':
      for (const it of e.items) {
        const kg = Math.min(it.kg, g.nodes[KITCHEN]?.stocks[foodKey(it.product)]?.amount ?? 0);
        if (kg <= 1e-9) continue;
        mixQuality(g, GATE, it.product, kg, qualityAt(g.nodes[KITCHEN], it.product));
        c.flow({what: 'to the honesty box', unit: 'kgFood', product: it.product, amount: qty(kg, 'kgFood'), from: at(KITCHEN, foodKey(it.product)), to: at(GATE, foodKey(it.product))});
      }
      return;
    case 'hens':
      keepHens(c, e.clean);
      return;
    case 'preserve':
      preserve(c, e.items);
      return;
    case 'mulch': {
      const bed = g.nodes[e.bed], me = g.nodes[GARDENER];
      if (bed) spread(c, bed, e.kg);
      // a bed mulched comes off the list
      const list = (me?.levers.mulch as string[] | undefined) ?? [];
      if (me && list.includes(e.bed)) me.levers.mulch = list.filter((id) => id !== e.bed);
      return;
    }
    case 'give':
      give(c, e.items);
      return;
    case 'home':
      // home from work: the day's commute (noted from the second day, with the kitchen's first ask, so the first minute
      // stays the garden's), and the week's shop, pay and the rest of life on its day
      if (calendar(c.hours).dayIndex >= 1) note(c, 'commute', GATE, 1, 'h');
      if (e.shop) weeklyShop(c);
  }
}

const hoursLeft = (me: GraphNode) => me.stocks.hours?.amount ?? 0;

/** What a new day's watering says about the kit: a long one by can (a hose would save it), and the butt run dry with
 *  water fetched from the tap (a second butt would keep more rain). */
function waterNotes(c: TickContext, steps: readonly Step[]) {
  let byCan = 0, fromTap = false;
  for (const s of steps) {
    if (s.carry?.unit === 'L') byCan += s.end - s.start;
    if (s.effect?.kind === 'water' && s.effect.source === 'tap' && s.carry) fromTap = true;
  }
  if (byCan > LONG_WATERING) note(c, 'long watering', GARDENER, byCan, 'h');
  if (fromTap && (c.graph.nodes.butt?.stocks.water?.amount ?? 0) < 1) note(c, 'butt dry', 'butt', 1, 'h');
}

/** Moves the gardener's hours: a step's time spent, or the day's given and yesterday's unused handed back. */
function spend(c: TickContext, hours: number, what = 'work') {
  if (hours > 1e-9) c.flow({what, unit: 'h', amount: qty(hours, 'h'), from: at(GARDENER, 'hours'), to: {boundary: 'time'}});
}

export const gardener: System = {
  name: 'gardener',
  on: {
    hour(c) {
      const me = c.graph.nodes[GARDENER];
      if (!me) return;
      const from = c.hours - c.dt, start = calendar(from), key = planKey(c.graph);
      let day = dayOf(c.graph);
      // the working day, and after it while there's still work in the day's list (home from work, the list runs later)
      const working = start.hour >= HOURS.start && start.hour < HOURS.stop, listed = !!day && day.steps.some((s) => s.doing !== 'rest');
      if (working && (!day || day.day !== start.dayIndex)) {
        // a new day: yesterday's unused hours go, today's come
        spend(c, hoursLeft(me), 'unused');
        c.flow({what: 'a day’s hours', unit: 'h', amount: qty(hoursOn(membersOf(c.graph), start), 'h'), from: {boundary: 'time'}, to: at(GARDENER, 'hours')});
        const made = plan(c.graph, start, HOME, from, hoursLeft(me), day?.day === start.dayIndex ? day.next : 0);
        day = {day: start.dayIndex, key, next: made.next, steps: made.steps};
        waterNotes(c, made.steps);
        // a glut: more ready in the kitchen than it will eat while it's fresh (the glut card asks what to do with it)
        const glut = surplusOf(c.graph).reduce((a, x) => a + x.kg, 0);
        if (glut >= GLUT.kg) {
          note(c, 'glut', KITCHEN, glut, 'kgFood');
          recordGlut(c.graph, c.hours);
        }
      } else if ((working || (listed && start.hour >= HOURS.start)) && day && day.key !== key) {
        // the plan changed: keep what's under way, plan the rest from where they'll be
        const started = new Set(day.steps.filter((s) => s.start < from && s.doing !== 'rest').map((s) => s.job));
        const kept = day.steps.filter((s) => started.has(s.job) && s.doing !== 'rest');
        const last = kept[kept.length - 1], owed = kept.reduce((s, x) => s + (COMMUTE.has(x.doing) ? 0 : x.end - x.start), 0);
        const made = plan(c.graph, start, last?.to ?? HOME, Math.max(from, last?.end ?? from), Math.max(0, hoursLeft(me) - owed), day.next);
        day = {...day, key, next: made.next, steps: [...kept, ...made.steps]};
      }
      if (!day) return;
      // show the steps that start in this step, and do the ones that end in it
      let changed = false;
      const steps: Step[] = [], all = day.steps;
      for (let i = 0; i < all.length; i++) {
        let step = all[i]!;
        // the steps are in order of time: from the first that neither starts nor ends in this step on, none does
        if (step.start >= c.hours && step.end > c.hours) {
          for (; i < all.length; i++) steps.push(all[i]!);
          break;
        }
        if (!step.shown && step.start < c.hours) {
          const a: Activity = {id: step.id, who: GARDENER, kind: 'person', doing: step.doing, from: step.from, to: step.to, start: step.start, end: step.end};
          if (step.carry) a.carry = step.carry;
          c.activity(a);
          step = {...step, shown: true};
          changed = true;
        }
        if (step.doing === 'rest' && step.shown) {
          changed = true;
          continue;
        }
        if (step.end <= c.hours) {
          if (step.effect) apply(c, step.effect);
          if (!COMMUTE.has(step.doing)) spend(c, Math.min(step.end - step.start, hoursLeft(me)));
          changed = true;
          continue;
        }
        steps.push(step);
      }
      if (changed || day !== dayOf(c.graph)) me.levers.day = {...day, steps} as unknown as LeverValue;
    },
  },
  command(cmd, g) {
    if ((cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law') || cmd.node !== GARDENER) return undefined;
    if (OWN.has(cmd.lever)) return `the gardener’s ${cmd.lever} aren’t the plan’s to set`;
    if (cmd.lever === 'waterBelow') {
      if (cmd.type !== 'plan') return 'when to water is the plan’s';
      return typeof cmd.value === 'number' && cmd.value >= 0 && cmd.value <= 1 ? null : 'a moisture from 0 to 1';
    }
    if ((PESTS as string[]).includes(cmd.lever)) {
      if (cmd.type !== 'policy') return 'what’s done about pests is the pest policy’s';
      const ok = POLICIES[cmd.lever as PestId] as string[];
      return typeof cmd.value === 'string' && ok.includes(cmd.value) ? null : `for ${cmd.lever}: ${ok.join(', ')}`;
    }
    void g;
    return undefined;
  },
};
