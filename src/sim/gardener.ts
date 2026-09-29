// The gardener: one person with about four hours a day for the garden (six at weekends), who does everything the plan
// and the garden call for. Each morning they plan the day's jobs in order (pick what's ready, water the beds below the
// plan's line, clear, compost, sow and water in what's due, carry the kitchen's surplus to the honesty box and its scraps
// to the heap, dig), each taking its time with the best tool they have (src/data/jobs.ts), and what doesn't fit waits
// until tomorrow. Every step is an activity the map draws, a new id each trip, and each job's flows move when the step
// that does it ends. A change to the plan during the working day re-plans the rest of it. docs/systems/gardener.md.
import {CROPS, type CropId} from '../data/crops';
import {FILL_L_PER_MIN, HOURS, START_TOOLS, TOOLS, WALK, WATER_IN, COMPOST_PER_M2, type Job, type JobTime, type Tool} from '../data/jobs';
import {START} from '../data/ladder';
import type {Activity} from './activity';
import {calendar, type CalendarDate, type System, type TickContext} from './clock';
import {qty, type Graph, type GraphNode, type LeverValue, type NodeId, type Unit} from './graph';
import {compostOn, dig, spread, toHeap} from './models/carbon';
import {cropOf, foodKey, plannedCrop, ripe, sow, specOf, wasteOn} from './models/crops';
import {GATE, KITCHEN, recordPick, surplus} from './models/kitchen';
import {areaOf, limitsOf, moisture, SOIL} from './models/soil';

export const GARDENER = 'gardener';
const HOME = 'shed';

/** What a step does when it ends. */
export type Effect =
  | {kind: 'water'; bed: NodeId; source: 'butt' | 'tap'; litres: number}
  | {kind: 'sow'; bed: NodeId; crop: CropId}
  | {kind: 'pick'; bed: NodeId; product: string; kg: number}
  | {kind: 'heap'; from: NodeId; kg: number}
  | {kind: 'spread'; bed: NodeId; kg: number}
  | {kind: 'dig'; bed: NodeId; m2: number}
  | {kind: 'box'; items: {product: string; kg: number}[]};

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
export const GARDENER_LEVERS = (): Record<string, LeverValue> => ({waterBelow: 0.5, tools: [...START_TOOLS], day: null});
const OWN = new Set(['tools', 'day']);

/** The plan the day's jobs come from: the watering line and every bed's plan. */
function planKey(g: Graph): string {
  const parts: LeverValue[] = [g.nodes[GARDENER]?.levers.waterBelow ?? null];
  for (const n of Object.values(g.nodes)) if (n.kind === 'bed') parts.push(n.id, n.levers.sow ?? null, n.levers.sowFrom ?? null, n.levers.dig ?? null);
  return JSON.stringify(parts);
}

/** The hours the gardener has for the garden on a day. */
export const hoursOn = (d: CalendarDate) => (d.weekday >= 5 ? HOURS.weekend : HOURS.weekday);

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
  constructor(readonly g: Graph, public pos: NodeId, public t: number, public left: number, public next: number, readonly dayIndex: number) {
    this.butt = g.nodes.butt?.stocks.water?.amount ?? 0;
    this.compost = compostOn(g);
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
  /** Tries a job made of steps; keeps it only if all of it fits in the hours left. */
  job(build: (j: JobBuilder) => void): boolean {
    const j = new JobBuilder(this);
    build(j);
    const time = j.t - this.t;
    if (!j.steps.length || time > this.left + 1e-9) return false;
    this.steps.push(...j.steps);
    this.t = j.t;
    this.pos = j.pos;
    this.left -= time;
    this.next = j.next;
    return true;
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
  constructor(readonly p: Planner) {
    this.pos = p.pos;
    this.t = p.t;
    this.next = p.next;
  }
  step(doing: string, to: NodeId, hours: number, carry?: Step['carry'], effect?: Effect) {
    const s: Step = {id: `g${this.p.dayIndex}-${this.next++}`, doing, from: this.pos, to, start: this.t, end: this.t + hours};
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

/** Water trips to bring a bed to some litres; returns false once a trip doesn't fit. */
function water(p: Planner, bed: GraphNode, litres: number): boolean {
  const how = best(p.g, 'water');
  if (!how) return false;
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
  while (kg >= 0.02) {
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
  const kg = bucket ? Math.min(p.compost, COMPOST_PER_M2 * area) : 0;
  return p.job((j) => {
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
    j.work(spec.how, area * how.per, undefined, {kind: 'sow', bed: bed.id, crop});
    // watered in, a trip a can
    for (let litres = WATER_IN * area; cans && litres > 0.5; ) {
      const source = j.p.butt >= 1 ? 'butt' : 'tap', trip = Math.min(litres, cans.trip ?? litres, source === 'butt' ? j.p.butt : Infinity);
      j.walk(source, 'fetch', can(0));
      j.work('fill', trip / FILL_L_PER_MIN[source]! / 60 + (cans.load ?? 0), can(trip));
      j.walk(bed.id, 'carry', can(trip));
      j.work('water', trip * cans.per + (cans.setup ?? 0), can(trip), {kind: 'water', bed: bed.id, source, litres: trip});
      if (source === 'butt') j.p.butt -= trip;
      litres -= trip;
    }
  }) && ((p.compost -= kg), true);
}

/** The day's jobs, in order, from a place and time with the hours left. */
function plan(g: Graph, date: CalendarDate, pos: NodeId, t: number, left: number, next: number): {steps: Step[]; next: number} {
  const p = new Planner(g, pos, t, left, next, date.dayIndex), line = Number(g.nodes[GARDENER]?.levers.waterBelow ?? 0.5);
  const beds = Object.values(g.nodes).filter((n) => n.kind === 'bed');
  const dug = beds.filter((n) => (n.stocks['land.crops']?.amount ?? 0) > 0);
  // 1. pick what's ready
  for (const b of dug) if (ripe(b) >= 0.02) harvest(p, b);
  // 2. water what's below the line
  for (const b of dug) {
    const s = cropOf(b);
    if (!s || s.dead) continue;
    const lim = limitsOf(b), m = moisture(b, lim);
    if (m < line) water(p, b, lim.fc - (b.stocks[SOIL.water]?.amount ?? 0));
  }
  // 3. sow what's due (clearing and composting first, watering in after)
  const sown = new Set<string>();
  for (const b of dug) {
    if (cropOf(b) || (b.stocks['land.grass']?.amount ?? 0) > 0) continue;
    const crop = plannedCrop(b, date);
    if (crop && sowBed(p, b, crop)) sown.add(b.id);
  }
  // 4. carry: the kitchen's surplus to the honesty box, scraps and waste to the heap
  const kitchen = g.nodes[KITCHEN], carry = best(g, 'carry');
  if (kitchen && g.nodes[GATE] && carry) {
    let items = surplus(kitchen);
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
        j.walk(GATE, 'carry', {unit: 'kgFood', amount: kg, product: load[0]!.product}, {kind: 'box', items: load});
      });
      if (!ok) break;
      items = rest;
    }
    if (wasteOn(kitchen) >= 1) clear(p, kitchen, false);
  }
  for (const b of dug) if (!sown.has(b.id) && wasteOn(b) >= 0.5) clear(p, b, true);
  // 5. dig a plot the plan wants dug, a square metre at a time
  const spade = best(g, 'dig');
  for (const b of beds) {
    let grass = b.levers.dig === true ? b.stocks['land.grass']?.amount ?? 0 : 0;
    while (spade && grass > 1e-6) {
      const m2 = Math.min(1, grass);
      if (!p.job((j) => {
        j.walk(b.id);
        j.work('dig', m2 * spade.per, undefined, {kind: 'dig', bed: b.id, m2});
      })) break;
      grass -= m2;
    }
  }
  // home to the shed, to rest until tomorrow's start
  const back = new JobBuilder(p);
  back.walk(HOME);
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
      if (bed && !cropOf(bed)) sow(bed, e.crop, c.hours);
      return;
    }
    case 'pick': {
      const kg = Math.min(e.kg, g.nodes[e.bed]?.stocks[foodKey(e.product)]?.amount ?? 0);
      if (kg <= 1e-9) return;
      c.flow({what: 'picking', unit: 'kgFood', product: e.product, amount: qty(kg, 'kgFood'), from: at(e.bed, foodKey(e.product)), to: at(KITCHEN, foodKey(e.product))});
      recordPick(g, c.hours, kg);
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
    case 'box':
      for (const it of e.items) {
        const kg = Math.min(it.kg, g.nodes[KITCHEN]?.stocks[foodKey(it.product)]?.amount ?? 0);
        if (kg > 1e-9) c.flow({what: 'to the honesty box', unit: 'kgFood', product: it.product, amount: qty(kg, 'kgFood'), from: at(KITCHEN, foodKey(it.product)), to: at(GATE, foodKey(it.product))});
      }
  }
}

const hoursLeft = (me: GraphNode) => me.stocks.hours?.amount ?? 0;

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
      const working = start.hour >= HOURS.start && start.hour < HOURS.stop;
      if (working && (!day || day.day !== start.dayIndex)) {
        // a new day: yesterday's unused hours go, today's come
        spend(c, hoursLeft(me), 'unused');
        c.flow({what: 'a day’s hours', unit: 'h', amount: qty(hoursOn(start), 'h'), from: {boundary: 'time'}, to: at(GARDENER, 'hours')});
        const made = plan(c.graph, start, HOME, from, hoursLeft(me), day?.day === start.dayIndex ? day.next : 0);
        day = {day: start.dayIndex, key, next: made.next, steps: made.steps};
      } else if (working && day && day.key !== key) {
        // the plan changed: keep what's under way, plan the rest from where they'll be
        const kept = day.steps.filter((s) => s.start < from && s.doing !== 'rest');
        const last = kept[kept.length - 1], owed = kept.reduce((s, x) => s + (x.end - x.start), 0);
        const made = plan(c.graph, start, last?.to ?? HOME, Math.max(from, last?.end ?? from), Math.max(0, hoursLeft(me) - owed), day.next);
        day = {...day, key, next: made.next, steps: [...kept, ...made.steps]};
      }
      if (!day) return;
      // show the steps that start in this step, and do the ones that end in it
      let changed = false;
      const steps: Step[] = [];
      for (const s of day.steps) {
        let step = s;
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
          spend(c, Math.min(step.end - step.start, hoursLeft(me)));
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
    void g;
    return undefined;
  },
};
