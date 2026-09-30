// The allotment's first season (part 8): the neighbours' weeks onto their plots, the shared trough and its rota in a dry
// spell, pests creeping from an untended plot, the neglected second plot taken on and reclaimed (alone or with a helper
// who reports less than they take), the committee's first vote (the water rota), the swap shed, and the household's hours
// at the allotment. Two systems (`swapShed` before the allotment's day, `season` after the people's week) and the
// commands that are the player's say in it. The mechanisms are the models' (agency.ts, committee.ts, water.ts's trough,
// pests.ts's spread); this file wires them onto the level's graph. docs/systems/season.md says how it works.
//
// Sources: as the models' and src/data/season.ts's (FAO-56 and Ostrom on the trough; RHS on pests from untended ground;
//   Jensen & Meckling and Holmström on the helper; the National Allotment Society on reclaiming a plot).
// Simplifies: a plot is watered once a day in one queue; a neighbour's plot yields and heads for Health by how kept their
//   week left it; the second plot is reclaimed by hours alone, whatever the season; the swap shed swaps kg for kg with no
//   haggling, and what nobody takes goes home with someone within a week or two; goodwill from a swap is spread evenly
//   (each habit's share of it is part 10's).
//   Fast effect: a dry week's short plots, the helper's barrow, a swap. Slow effect: the second plot reclaimed over two
//   seasons, trust after an audit, Health from how kept and how watered a plot is.
import {PLAYER_PLOT, PLOTS, TILE, plotId} from '../data/allotment';
import {HELP, type Watching} from '../data/agency';
import {MOTIONS, type MotionId} from '../data/committee';
import type {FoodGroup} from '../data/household';
import {PRODUCT_GROUPS, type ProductGroup} from '../data/ladder-rules';
import {KEPT, MEETING, SECOND, SHED, SPREAD, TROUGH} from '../data/season';
import {unfolded} from '../data/unfold';
import {HOME, ledgerAt, plotDays, sealedOf, type AllotmentLedger} from './allotment';
import {calendar, systemRng, type System, type TickContext} from './clock';
import {kindOf, note} from './effects';
import {applyFlow, qty, touch, type Flow, type Graph, type GraphNode, type LeverValue, type NodeSpec} from './graph';
import {SEALED, type ByGroup, type GameEvent, type SealedNode} from './ladder';
import {after, AGENT, agentOf, allotment as people, HELPING, newRelation, newTakings, plotHours, relationOf, RELATION, spareHours, TAKINGS, takingsOf, type Agent, type Helping} from './models/agency';
import {COMMITTEE, committeeOf, effects, put, rulesOf, writeCommittee, type Tally, type Vote} from './models/committee';
import {basket, keptness, membersOf, people as heads, weekGardenHours} from './models/household';
import {HOURS_LEFT} from './models/labour';
import {pestSource, spreadPressure} from './models/pests';
import {et0, plotNeed, troughDay} from './models/water';
import {forecastOf, weatherOf} from './models/weather';
import {rng, type Rng} from './random';
import type {State} from './state';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const setLever = (n: GraphNode, k: string, v: unknown) => void (n.levers[k] = v as LeverValue);
const sumOf = (g: ByGroup) => PRODUCT_GROUPS.reduce((s, k) => s + (g[k] ?? 0), 0);
const VEG = ['potatoes', 'salads', 'tomatoes', 'greens'] as const;

/** The shed's node: the swap shed is the sheds (src/data/allotment.ts's SHARED). */
export const SHEDS = 'sheds';
export const TROUGH_NODE = 'trough';

// ---- what the levers hold ----

/** How kept a neighbour's plot is this week (from its holder's `week`), and what it yields when kept as usual. */
export interface Kept {
  /** This week's hours on it and how kept that leaves it, 0 to 1. */
  hours: number;
  kept: number;
  /** How kept it is on an average week, and its kg a day then (as drawn at the step up). */
  usual: number;
  base: number;
}
/** A plot's water at the trough today: what it needed and got, L, and its week's shortfall (the sum of each day's share short). */
export interface PlotWater {
  need: number;
  given: number;
  week: number;
}
/** The second plot: the neglected plot, offered to the player and, once taken, reclaimed. */
export interface Second {
  /** The game hour it was offered, and taken (null until then). */
  offered: number;
  taken: number | null;
  /** How far it's reclaimed, 0 to 1. */
  reclaimed: number;
  /** Its kg a day once reclaimed: a well-kept neighbour's. */
  full: number;
  /** The neighbour who offers to help, who helps (null alone), and whether the offer was turned down. */
  offer: string;
  helper: string | null;
  refused: boolean;
  /** Last week: hours worked on it, kg home, and (with a helper) what they said they took and what they carried off. */
  worked: number;
  kg: number;
  reported: number;
  took: number;
  /** The helper's running totals when last read, so a week's are the difference. */
  seen: {reported: number; took: number};
}
/** The trough's day: how stretched it was (0 to 1), the queue's order, the plots that went short, and the week's watering days and dryness. */
export interface TroughToday {
  dryness: number;
  queue: string[];
  short: string[];
  days: number;
  dry: number;
}
/** The swap shed's shelf by group (kg, adding up to its `food` stock), and the household's swaps. */
export interface Shelf {
  byGroup: ByGroup;
  left: number;
  took: number;
  first: number | null;
}
/** The committee's motion: which, who put it, when, when the meeting votes, and the tally once it has. */
export interface Meeting {
  motion: MotionId;
  by: string;
  put: number;
  closes: number;
  /** How dry the site was when it was put: the share of plots the trough left short that day (the vote's push, committee.ts's `dryness`). */
  dryness: number;
  tally: Tally | null;
  you: Vote | null;
  held: number | null;
}

export const keptOf = (n: GraphNode | undefined) => (n?.levers.kept as unknown as Kept | undefined) ?? null;
export const waterOf = (n: GraphNode | undefined) => (n?.levers.water as unknown as PlotWater | undefined) ?? null;
export const secondOf = (n: GraphNode | undefined) => (n?.levers.second as unknown as Second | undefined) ?? null;
export const pressureOf = (n: GraphNode | undefined) => Number(n?.levers.pressure ?? 0);
export const troughOf = (g: Graph) => (g.nodes[TROUGH_NODE]?.levers.today as unknown as TroughToday | undefined) ?? null;
export const shelfOf = (g: Graph) => (g.nodes[SHEDS]?.levers.shelf as unknown as Shelf | undefined) ?? null;
export const meetingOf = (g: Graph) => (g.nodes[COMMITTEE]?.levers.motion as unknown as Meeting | undefined) ?? null;
/** The second plot's node, offered or taken, if any. */
export const secondPlot = (g: Graph) => {
  for (let i = 1; i < PLOTS; i++) {
    const n = g.nodes[plotId(i)];
    if (secondOf(n)) return n!;
  }
  return null;
};
/** Whether the player has taken this plot on as their second. */
export const isSecond = (n: GraphNode | undefined) => secondOf(n)?.taken != null;
/** The household's hours left this week for the allotment. */
export const hoursLeft = (g: Graph) => g.nodes[HOME]?.stocks[HOURS_LEFT]?.amount ?? 0;
/** The neighbour's node that holds an agent by id. */
export const personNode = (g: Graph, id: string) => g.nodes[id] && agentOf(g.nodes[id]!) ? g.nodes[id]! : null;

// ---- the neighbours' plots ----

/** Where a neighbour's plot heads for Health from how kept it is. */
export const keptHealth = (kept: number) => lerp(KEPT.none, KEPT.full, clamp(kept, 0, 1) ** KEPT.curve);

/** The levers part 8 adds to the allotment's graph as it's built (src/sim/allotment.ts's `allotmentGraph`). */
export function seasonNodes(seed: number, plots: {id: string; base: number}[]): {neighbours: NodeSpec[]; kept: Record<string, Kept>; helper: string; neglected: string} {
  const who = people(rng(seed)), kept: Record<string, Kept> = {};
  const neighbours = who.agents.map((a): NodeSpec => {
    const hours = plotHours(a), usual = keptness(hours), base = plots.find((p) => p.id === a.plot)?.base ?? 0;
    kept[a.plot!] = {hours, kept: usual, usual, base};
    return {
      id: a.id, kind: 'neighbour', name: a.name, box: null, land: {built: 0},
      levers: {[AGENT]: a as unknown as LeverValue, [RELATION]: newRelation() as unknown as LeverValue, week: {hours, kept: usual} as unknown as LeverValue,
        [TAKINGS]: newTakings() as unknown as LeverValue},
    };
  });
  return {neighbours, kept, helper: who.helper, neglected: who.neglected};
}

/** A plot's Health target and kg a day before water and pests: a neighbour's from its holder's week, the second plot's
 *  from how far it's reclaimed. Null for the player's own (its plan is the allotment's). */
function planned(n: GraphNode): {health: number; output: number} | null {
  const sp = secondOf(n);
  if (sp?.taken != null) return {health: lerp(SECOND.health[0], SECOND.health[1], sp.reclaimed), output: sp.full * sp.reclaimed};
  const k = keptOf(n);
  if (!k) return null;
  return {health: keptHealth(k.kept), output: k.base * clamp(k.usual > 0 ? k.kept / k.usual : 1, KEPT.output[0], KEPT.output[1])};
}

/** How kept each plot is, for the pests: a neighbour's by their week, the second plot by how far it's reclaimed, the player's by its care. */
function keptNow(n: GraphNode): number {
  const sp = secondOf(n);
  if (sp?.taken != null) return sp.reclaimed;
  const k = keptOf(n);
  if (k) return k.kept;
  // the player's plot is the garden's size (a tile), kept by its care against what that ground needs
  return n.id === PLAYER_PLOT ? keptness(Number(n.levers.care ?? 2), TILE.w * TILE.h) : 1;
}

// ---- the trough ----

/** The order the plots reach the trough on a day: the retired in the morning, the rest after work, the keen a little sooner. */
function queue(g: Graph, r: {next(): number}): string[] {
  const at: {id: string; t: number}[] = [];
  for (let i = 0; i < PLOTS; i++) {
    const n = g.nodes[plotId(i)];
    if (!n) continue;
    const holder = holderAgent(g, n), retired = holder?.household.members[0]?.job === 'none';
    at.push({id: n.id, t: (retired ? 0 : 0.5) + r.next() * 0.5 - (holder?.habit === 'competitive' ? 0.15 : 0)});
  }
  return at.sort((a, b) => a.t - b.t).map((p) => p.id);
}
/** The neighbour who holds a plot (not the player's, nor the second once it's taken). */
function holderAgent(g: Graph, n: GraphNode): Agent | null {
  if (n.id === PLAYER_PLOT || isSecond(n)) return null;
  const id = (n.levers.holder as {id?: string} | undefined)?.id;
  return id ? agentOf(g.nodes[id] ?? ({levers: {}} as GraphNode)) : null;
}

/** The trough's day: every plot's need on today's weather, shared out by the rota in force, the mains refilling it; what
 *  each plot got and how short it went; and the committee's first motion the first time a plot goes short. */
function troughDayTick(c: TickContext) {
  const g = c.graph, trough = g.nodes[TROUGH_NODE], stock = trough?.stocks.water, w = weatherOf(g), f = forecastOf(g);
  if (!trough || !stock || !w) return;
  const rules = rulesOf(g.nodes[COMMITTEE]), dry = f?.dry ?? 0, et = et0(w), m2 = TILE.w * TILE.h;
  const order = queue(g, c.rng), needs = order.map((id) => ({id, need: plotNeed(et, m2, keptNow(g.nodes[id]!), dry)}));
  const all = needs.reduce((s, p) => s + p.need, 0), dryness = clamp(all / (TROUGH.refill + (stock.cap ?? stock.amount)), 0, 1);
  const day = troughDay({water: stock.amount, cap: stock.cap ?? 1000, refill: TROUGH.refill, needs, rota: rules.rota, limit: effects(rules, dryness).litresPerPlotDay});
  if (day.refill > 1e-9) c.flow({what: 'the mains', unit: 'L', amount: qty(day.refill, 'L'), from: {boundary: 'mains'}, to: {node: TROUGH_NODE, stock: 'water'}});
  const short: string[] = [];
  for (const p of needs) {
    const n = g.nodes[p.id]!, got = day.given[p.id] ?? 0, was = waterOf(n);
    if (got > 1e-9) c.flow({what: 'watering from the trough', unit: 'L', amount: qty(Math.min(got, stock.amount), 'L'), from: {node: TROUGH_NODE, stock: 'water'}, to: {boundary: 'evapotranspiration'}});
    const gap = p.need > 1e-9 ? 1 - got / p.need : 0;
    if (p.need > 1e-9 && got < TROUGH.short * p.need) short.push(p.id);
    setLever(n, 'water', {need: p.need, given: got, week: (was?.week ?? 0) + gap} satisfies PlotWater);
    // a short day costs that day's harvest a share (the crops wilt), a fast effect the sealed tick takes
    if (gap > 0.05) addEvent(n, {id: `dry-${c.hours}`, kind: 'drought', label: 'short of water', homeLevel: 2, size: TROUGH.yield * gap, from: c.hours, days: 1});
  }
  const was = troughOf(g);
  setLever(trough, 'today', {dryness, queue: order, short, days: (was?.days ?? 0) + (all > 1e-9 ? 1 : 0), dry: (was?.dry ?? 0) + dryness} satisfies TroughToday);
  if (short.length) note(c, 'trough short', TROUGH_NODE, short.length, 'plots');
  // the queue at the trough in the evening: the holders in order with their cans
  if (all > 1e-9) watering(c, order, day.given);
  // the committee's first motion: the first time the trough leaves a plot short, a neighbour puts the rota
  const com = g.nodes[COMMITTEE];
  if (short.length && com && !meetingOf(g)) {
    const by = proposer(g, short);
    if (by) {
      const motion: MotionId = by.habit === 'generous' ? 'waterNeed' : 'waterRota';
      setLever(com, 'motion', {motion, by: by.id, put: c.hours, closes: c.hours + MEETING.days * 24, dryness: short.length / PLOTS, tally: null, you: null, held: null} satisfies Meeting);
      touch(g, COMMITTEE);
      note(c, 'motion put', SHEDS, 1, 'motion');
    }
  }
}
/** Who puts the rota: the holder of the plot that went shortest, or the first short neighbour. */
function proposer(g: Graph, short: string[]): Agent | null {
  let best: {a: Agent; gap: number} | null = null;
  for (const id of short) {
    const n = g.nodes[id]!, a = holderAgent(g, n), w = waterOf(n);
    if (!a || !w) continue;
    const gap = w.need > 0 ? 1 - w.given / w.need : 0;
    if (!best || gap > best.gap) best = {a, gap};
  }
  return best?.a ?? null;
}
/** The evening's queue: each holder waits their turn at the trough, then carries their can to their plot. */
function watering(c: TickContext, order: string[], given: Record<string, number>) {
  const t0 = c.hours + 18;
  order.forEach((id, i) => {
    const n = c.graph.nodes[id]!, who = id === PLAYER_PLOT || isSecond(n) ? 'gardener' : (n.levers.holder as {id?: string} | undefined)?.id;
    if (!who || (who === 'gardener' && id !== PLAYER_PLOT)) return;
    const start = t0 + i * 0.12;
    c.activity({id: `${who}-queue-${c.hours}`, who, kind: 'person', doing: 'queue', from: 'spine', to: TROUGH_NODE, start, end: start + 0.1 + i * 0.03});
    c.activity({id: `${who}-can-${c.hours}`, who, kind: 'person', doing: 'walk', from: TROUGH_NODE, to: id, start: start + 0.1 + i * 0.03, end: start + 0.35 + i * 0.03,
      carry: {unit: 'L', amount: given[id] ?? 0}});
  });
}

function addEvent(n: GraphNode, e: GameEvent) {
  const s = sealedOf(n);
  if (s) n.levers[SEALED.lever] = {...s, events: [...s.events, e]} as unknown as LeverValue;
}

// ---- the plots' plans, and pests from next door ----

/** Each plot's plan for today: a neighbour's and the second plot's from how kept they are, then every plot's Health target
 *  less what a short week of water and pests from next door cost it. */
function plans(c: TickContext) {
  const g = c.graph, month = calendar(c.hours).month, damp = month >= SPREAD.from && month <= SPREAD.to;
  for (let i = 0; i < PLOTS; i++) {
    const n = g.nodes[plotId(i)], s = sealedOf(n);
    if (!n || !s) continue;
    const p = planned(n), water = waterOf(n), pressure = pressureOf(n);
    const health = (p?.health ?? s.plan.health) - TROUGH.health * clamp((water?.week ?? 0) / 7, 0, 1) - (damp ? SPREAD.health * pressure : 0);
    n.levers[SEALED.lever] = {...s, plan: {...s.plan, ...(p ? {output: p.output} : {}), health: clamp(health, 0, 100)}} as unknown as LeverValue;
  }
}

/** Pests from next door, weekly: each plot's pressure from the untended plots about it, and in the damp months a week's
 *  share of its harvest lost to them. */
function spread(c: TickContext) {
  const g = c.graph, month = calendar(c.hours).month, damp = month >= SPREAD.from && month <= SPREAD.to, list = [];
  for (let i = 0; i < PLOTS; i++) {
    const n = g.nodes[plotId(i)];
    if (n?.box) list.push({id: n.id, x: n.box.x + n.box.w / 2, y: n.box.y + n.box.h / 2, source: pestSource(keptNow(n), SPREAD.wild)});
  }
  const p = spreadPressure(list, SPREAD.reach);
  let worst = 0;
  for (const {id} of list) {
    const n = g.nodes[id]!, v = p[id] ?? 0;
    setLever(n, 'pressure', Math.round(v * 1000) / 1000);
    if (damp && v > 0.02) addEvent(n, {id: `pests-${c.hours}`, kind: 'pests', label: 'pests from next door', homeLevel: 2, size: SPREAD.loss * v, from: c.hours, days: 7});
    worst = Math.max(worst, damp ? v : 0);
  }
  // shown where it's worst: the plot beside the untended one
  if (worst > 0.1) note(c, 'pests from next door', list.find((x) => p[x.id] === worst)!.id, worst, 'pressure');
}

// ---- the second plot ----

/** Offers the neglected plot once the allotment is a fortnight old: its holder gives it up to the committee. */
function offer(c: TickContext) {
  const g = c.graph;
  if (secondPlot(g) || plotDays(g) < SECOND.offerDay) return;
  const who = people(rng(seedOf(g))), n = g.nodes[who.neglected], k = keptOf(n);
  if (!n || !k) return;
  const kept = Object.values(g.nodes).map(keptOf).filter((x): x is Kept => !!x && x.usual > 0.9);
  const full = kept.length ? kept.reduce((s, x) => s + x.base, 0) / kept.length : k.base;
  setLever(n, 'second', {offered: c.hours, taken: null, reclaimed: SECOND.start, full, offer: who.helper, helper: null, refused: false, worked: 0, kg: 0, reported: 0, took: 0, seen: {reported: 0, took: 0}} satisfies Second);
  touch(g, n.id);
  note(c, 'second plot offered', n.id, 1, 'plot');
}
/** The game's seed, kept on the household's node at the step up (the allotment's draws come from it). */
const seedOf = (g: Graph) => Number(g.nodes[HOME]?.levers.seed ?? 0);

/** The second plot's week: the hours on it (the helper's, or the household's), how far that reclaims it, and what's on its
 *  shelf after the helper's share going home. Runs after the people's week, so the helper has taken theirs. */
function secondWeek(c: TickContext) {
  const g = c.graph, n = secondPlot(g), sp = secondOf(n ?? undefined);
  if (!n || !sp || sp.taken == null) return;
  const home = g.nodes[HOME], helper = sp.helper ? personNode(g, sp.helper) : null, a = helper ? agentOf(helper) : null;
  let worked = 0;
  if (a) worked = Math.min(HELP.hoursNeeded, spareHours(a));
  else if (home?.stocks[HOURS_LEFT]) {
    worked = Math.min(HELP.hoursNeeded, home.stocks[HOURS_LEFT].amount);
    if (worked > 1e-9) c.flow({what: 'reclaiming the second plot', unit: 'h', amount: qty(worked, 'h'), from: {node: HOME, stock: HOURS_LEFT}, to: {boundary: 'time'}});
  }
  const reclaimed = Math.min(1, sp.reclaimed + worked / SECOND.hours);
  if (Math.floor(reclaimed * 4) > Math.floor(sp.reclaimed * 4)) note(c, 'reclaimed', n.id, reclaimed, 'share');
  // the week's harvest, less the helper's take, home
  const kg = n.stocks[SEALED.food]?.amount ?? 0, l = ledgerAt(g);
  if (kg > 1e-9) {
    c.flow({what: 'eaten from the second plot', unit: 'kgFood', product: SEALED.product, amount: qty(kg, 'kgFood'), from: {node: n.id, stock: SEALED.food}, to: {boundary: 'eaten'}});
    if (home && l) {
      const mix = sealedOf(n)?.totals.outputByGroup ?? {}, t = sumOf(mix), week: ByGroup = {...l.week};
      for (const k of PRODUCT_GROUPS) if (mix[k] && t > 0) week[k] = (week[k] ?? 0) + (kg * mix[k]!) / t;
      home.levers.ledger = {...l, week, grown: l.grown + kg} satisfies AllotmentLedger as unknown as LeverValue;
    }
  }
  // what the helper said they took this week, and what they carried off (the truth, for the barrow)
  const t = helper ? takingsOf(helper) : null, reported = t ? t.reported - sp.seen.reported : 0, took = t ? t.took - sp.seen.took : 0;
  if (helper && a && took > 1e-9) {
    const start = c.hours + 16;
    c.activity({id: `${a.id}-barrow-${c.hours}`, who: a.id, kind: 'person', doing: 'walk', from: n.id, to: SHEDS, via: ['spine'], start, end: start + 0.6,
      carry: {unit: 'kgFood', amount: took, product: 'barrow', of: reported}});
  }
  setLever(n, 'second', {...sp, reclaimed, worked, kg, reported, took, seen: t ? {reported: t.reported, took: t.took} : sp.seen} satisfies Second);
  // a week of watching at an audit teaches trust: the first one unfolds it
  const job = helper?.levers[HELPING] as unknown as Helping | undefined;
  if (job?.watching === 'audit') note(c, 'audit', n.id, 1, 'week');
}

// ---- the household's hours ----

/** The household's hours for the allotment each week: its garden hours less the plot's care, topped up from its time. */
function hoursWeek(c: TickContext) {
  const g = c.graph, home = g.nodes[HOME], stock = home?.stocks[HOURS_LEFT];
  if (!home || !stock) return;
  // the week's queueing at the trough first (the hours it took), at the week's dryness
  const t = troughOf(g), trough = g.nodes[TROUGH_NODE];
  if (t && trough) {
    if (t.days > 0) {
      const q = effects(rulesOf(g.nodes[COMMITTEE]), t.dry / t.days).queueHours * (t.days / 7);
      if (q > 1e-9 && stock.amount > 1e-9) c.flow({what: 'queueing at the trough', unit: 'h', amount: qty(Math.min(q, stock.amount), 'h'), from: {node: HOME, stock: HOURS_LEFT}, to: {boundary: 'time'}});
    }
    setLever(trough, 'today', {...t, days: 0, dry: 0} satisfies TroughToday);
    for (let i = 0; i < PLOTS; i++) {
      const n = g.nodes[plotId(i)], w = waterOf(n);
      if (n && w) setLever(n, 'water', {...w, week: 0});
    }
  }
  const budget = Math.max(0, weekGardenHours(membersOf(g)) - Number(g.nodes[PLAYER_PLOT]?.levers.care ?? 0)), top = budget - stock.amount;
  if (top > 1e-9) c.flow({what: 'garden hours', unit: 'h', amount: qty(top, 'h'), from: {boundary: 'time'}, to: {node: HOME, stock: HOURS_LEFT}});
  else if (top < -1e-9) c.flow({what: 'garden hours', unit: 'h', amount: qty(-top, 'h'), from: {node: HOME, stock: HOURS_LEFT}, to: {boundary: 'time'}});
}

// ---- the neighbours' week onto their plots ----

/** Each neighbour's week (their `week`, from the people's week) onto their plot's `kept`. */
function keptWeek(g: Graph) {
  for (const n of Object.values(g.nodes)) {
    const a = agentOf(n), w = n.levers.week as unknown as {hours: number; kept: number} | undefined, plot = a?.plot ? g.nodes[a.plot] : undefined, k = keptOf(plot);
    if (!plot || !k || !w || isSecond(plot)) continue;
    setLever(plot, 'kept', {...k, hours: w.hours, kept: w.kept} satisfies Kept);
  }
}

// ---- the meeting ----

/** The meeting votes on the day it closes if the player hasn't: the room decides, the player abstaining. */
function meetingDay(c: TickContext) {
  const m = meetingOf(c.graph);
  if (m && !m.tally && c.hours >= m.closes) hold(c.graph, m, 'abstain', {}, c.rng, c.hours);
}
/** Holds the vote: the committee as the graph has it, the motion put by a member, the player's vote and talk. */
function hold(g: Graph, m: Meeting, you: Vote, talked: Record<string, number>, dice: Rng, hours: number): Tally {
  const r = put(committeeOf(g), m.motion, {you, dryness: m.dryness, talked}, dice);
  writeCommittee(g, r.committee);
  setLever(g.nodes[COMMITTEE]!, 'motion', {...m, tally: r.tally, you, held: hours} satisfies Meeting);
  touch(g, COMMITTEE);
  return r.tally;
}

// ---- the swap shed ----

/** The day at the swap shed, before the allotment takes the plots' food home: the neighbours' gluts left on its shelf,
 *  and, if the household swaps, what the player's plot gave beyond the week's need of a group swapped kg for kg for what
 *  it's short of. */
function shedDay(c: TickContext) {
  const g = c.graph, sheds = g.nodes[SHEDS], shelf = shelfOf(g), home = g.nodes[HOME], l = ledgerAt(g);
  if (!sheds || !shelf || !home || !l) return;
  const season = calendar(c.hours).season, by: ByGroup = {...shelf.byGroup}, groups = SHED.groups[season];
  // the neighbours' gluts, by the season
  for (let i = 1; i < PLOTS; i++) {
    const n = g.nodes[plotId(i)], kg = n?.stocks[SEALED.food]?.amount ?? 0, glut = kg * SHED.glut[season];
    if (!n || isSecond(n) || glut <= 1e-6) continue;
    c.flow({what: 'left at the swap shed', unit: 'kgFood', product: SEALED.product, amount: qty(glut, 'kgFood'), from: {node: n.id, stock: SEALED.food}, to: {node: SHEDS, stock: SEALED.food}});
    for (const k of groups) by[k] = (by[k] ?? 0) + glut / groups.length;
  }
  // the player's plot's surplus against the week's need so far
  const mine = g.nodes[PLAYER_PLOT], kg = mine?.stocks[SEALED.food]?.amount ?? 0, mix = sealedOf(mine)?.totals.outputByGroup ?? {}, t = sumOf(mix);
  let next = {...shelf, byGroup: by};
  if (mine && kg > 1e-9 && t > 0) {
    const need = basket(heads(membersOf(g))), today: ByGroup = {}, surplus: ByGroup = {}, short: ByGroup = {};
    for (const k of VEG) {
      today[k] = (kg * (mix[k] ?? 0)) / t;
      const still = Math.max(0, need[k as FoodGroup] - (l.week[k] ?? 0));
      surplus[k] = Math.max(0, today[k]! - still);
      short[k] = Math.max(0, still - today[k]!);
    }
    const spare = sumOf(surplus);
    if (spare > 1e-6) note(c, 'surplus', SHEDS, spare, 'kgFood');
    const on = home.levers.swap === 'on', can = VEG.reduce((s, k) => s + Math.min(short[k] ?? 0, by[k] ?? 0), 0), x = on ? Math.min(spare, can) : 0;
    if (x > 1e-6) {
      c.flow({what: 'left at the swap shed', unit: 'kgFood', product: SEALED.product, amount: qty(x, 'kgFood'), from: {node: PLAYER_PLOT, stock: SEALED.food}, to: {node: SHEDS, stock: SEALED.food}});
      c.flow({what: 'from the swap shed', unit: 'kgFood', product: SEALED.product, amount: qty(x, 'kgFood'), from: {node: SHEDS, stock: SEALED.food}, to: {boundary: 'eaten'}});
      // what the household took, from its short groups in proportion, and what it left, from its surplus groups
      const took: ByGroup = {}, left: ByGroup = {}, week: ByGroup = {...l.week};
      for (const k of VEG) {
        took[k] = can > 0 ? (Math.min(short[k] ?? 0, by[k] ?? 0) * x) / can : 0;
        left[k] = (surplus[k]! * x) / spare;
        by[k] = Math.max(0, (by[k] ?? 0) - took[k]! + left[k]!);
      }
      // the allotment counts what stays on the plot by its mix; this puts right the groups the swap changed (it adds x in all)
      for (const k of PRODUCT_GROUPS) {
        const d = ((kg * (mix[k] ?? 0)) / t - (left[k] ?? 0) + (took[k] ?? 0)) - ((kg - x) * (mix[k] ?? 0)) / t;
        if (Math.abs(d) > 1e-12) week[k] = (week[k] ?? 0) + d;
      }
      home.levers.ledger = {...l, week, grown: l.grown + x} satisfies AllotmentLedger as unknown as LeverValue;
      next = {byGroup: by, left: shelf.left + x, took: shelf.took + x, first: shelf.first ?? c.hours};
      // a swap is noticed: goodwill, a little, all round (weighted by each habit's giving in part 10)
      for (const p of Object.values(g.nodes)) if (agentOf(p)?.plot) setLever(p, RELATION, after(relationOf(p), {type: 'shared', kg: x / 11}));
      const start = c.hours + 7;
      c.activity({id: `gardener-swap-${c.hours}`, who: 'gardener', kind: 'person', doing: 'walk', from: PLAYER_PLOT, to: SHEDS, via: ['spine'], start, end: start + 0.3, carry: {unit: 'kgFood', amount: x}});
    }
  }
  setLever(sheds, 'shelf', next satisfies Shelf);
}
/** What's left on the shelf a week goes home with whoever wants it. */
function shedWeek(c: TickContext) {
  const g = c.graph, sheds = g.nodes[SHEDS], shelf = shelfOf(g), kg = sheds?.stocks[SEALED.food]?.amount ?? 0;
  if (!sheds || !shelf) return;
  const out = kg * SHED.clear, by: ByGroup = {};
  if (out > 1e-9) c.flow({what: 'taken from the swap shed', unit: 'kgFood', product: SEALED.product, amount: qty(out, 'kgFood'), from: {node: SHEDS, stock: SEALED.food}, to: {boundary: 'eaten'}});
  for (const k of VEG) if (shelf.byGroup[k]) by[k] = shelf.byGroup[k]! * (1 - SHED.clear);
  setLever(sheds, 'shelf', {...shelf, byGroup: by} satisfies Shelf);
}

// ---- the systems ----

/** The swap shed, listed before the allotment: it takes its share of the plots' food before they go home. */
export const swapShed: System = {
  name: 'swap shed',
  levels: [2],
  on: {day: shedDay, week: shedWeek},
  command(cmd, _g, level) {
    if (level !== 2 || cmd.type !== 'policy' || cmd.node !== HOME || cmd.lever !== 'swap') return undefined;
    return cmd.value === 'on' || cmd.value === 'off' ? null : 'swap is on or off';
  },
};

/** The season, listed after the people's week and before the sealed plots tick: the trough, the plans, the offer and the
 *  meeting each day; the neighbours' weeks, pests, the second plot and the household's hours each week. */
export const season: System = {
  name: 'season',
  levels: [2],
  on: {
    day(c) {
      offer(c);
      troughDayTick(c);
      plans(c);
      meetingDay(c);
    },
    week(c) {
      keptWeek(c.graph);
      secondWeek(c);
      spread(c);
      hoursWeek(c);
    },
  },
  command(cmd, g, level) {
    if (level !== 2) return undefined;
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && ['kept', 'water', 'second', 'pressure', 'today', 'shelf', 'motion', 'week', HELPING].includes(cmd.lever) && g.nodes[cmd.node])
      return 'that’s the allotment’s to keep, not set';
    return undefined;
  },
};

// ---- the player's say: commands ----

const WATCHING: readonly Watching[] = ['trust', 'glance', 'audit'];

/** Takes the second plot on (or turns it down for now). Refused before it's offered or after it's taken. */
export function secondPlotCommand(s: State, answer: 'take' | 'no'): string | null {
  const g = s.graph, n = secondPlot(g), sp = secondOf(n ?? undefined);
  if (s.level !== 2 || !n || !sp || !unfolded(s.seen, 'agency.helper')) return 'no plot is going spare yet';
  if (sp.taken != null) return 'the second plot is already yours';
  if (answer !== 'take' && answer !== 'no') return 'take or no';
  if (answer === 'no') return null;
  // the holder gives it up: it's the player's, rent and all; they're a neighbour still, with no plot
  const holder = (n.levers.holder as {id?: string} | undefined)?.id, p = holder ? personNode(g, holder) : null;
  if (p) setLever(p, 'agent', {...agentOf(p)!, plot: null});
  delete n.levers.holder;
  delete n.levers.kept;
  setLever(n, SEALED.payer, HOME);
  setLever(n, 'second', {...sp, taken: s.hours} satisfies Second);
  n.name = 'Your second plot';
  touch(g, n.id);
  if (p) touch(g, p.id);
  s.effects = [{kind: kindOf('offer of help'), cause: 'offer of help', at: n.id, amount: 1, unit: 'offer'}];
  return null;
}

/** The helper's offer: accept it (they work the plot for a third of its harvest), refuse it (the household does it), or
 *  let them go once they're helping. */
export function helperCommand(s: State, answer: 'accept' | 'refuse' | 'let go'): string | null {
  const g = s.graph, n = secondPlot(g), sp = secondOf(n ?? undefined);
  if (s.level !== 2 || !n || !sp || sp.taken == null) return 'there’s no second plot to help with';
  const p = personNode(g, sp.offer);
  if (!p) return 'nobody has offered';
  if (answer === 'accept') {
    if (sp.helper) return 'they’re already helping';
    setLever(p, HELPING, {plot: n.id, watching: 'trust', payer: HOME} satisfies Helping);
    setLever(n, 'second', {...sp, helper: sp.offer, refused: false, seen: {reported: takingsOf(p).reported, took: takingsOf(p).took}} satisfies Second);
  } else if (answer === 'refuse' || answer === 'let go') {
    if (answer === 'let go' && !sp.helper) return 'nobody’s helping';
    delete p.levers[HELPING];
    setLever(n, 'second', {...sp, helper: null, refused: true} satisfies Second);
  } else return 'accept, refuse or let go';
  touch(g, n.id);
  touch(g, p.id);
  return null;
}

/** How closely the player watches the helper: trust, a glance or an audit (each costs hours a week, agency.ts's WATCH). */
export function watchCommand(s: State, watching: Watching): string | null {
  const g = s.graph, sp = secondOf(secondPlot(g) ?? undefined), p = sp?.helper ? personNode(g, sp.helper) : null, job = p?.levers[HELPING] as unknown as Helping | undefined;
  if (s.level !== 2 || !p || !job) return 'nobody’s helping';
  if (!WATCHING.includes(watching)) return 'trust, glance or audit';
  setLever(p, HELPING, {...job, watching} satisfies Helping);
  touch(g, p.id);
  return null;
}

/** The player's vote on the motion put, after any talk (hours a member, from the household's hours this week). */
export function voteCommand(s: State, answer: Vote, talk: Record<string, number> = {}): string | null {
  const g = s.graph, m = meetingOf(g);
  if (s.level !== 2 || !m || !unfolded(s.seen, 'committee.panel')) return 'there’s nothing to vote on';
  if (m.tally) return 'the meeting has voted';
  if (answer !== 'yes' && answer !== 'no' && answer !== 'abstain') return 'yes, no or abstain';
  const members = new Set(committeeOf(g).members.map((a) => a.id)), talked: Record<string, number> = {};
  let hours = 0;
  for (const [id, h] of Object.entries(talk)) {
    if (!members.has(id)) return `${id} isn’t on the committee`;
    if (!(h >= 0 && h <= MEETING.talk)) return `talk is up to ${MEETING.talk} hours a member`;
    if (h > 0) (talked[id] = h), (hours += h);
  }
  if (hours > hoursLeft(g) + 1e-9) return 'the household hasn’t the hours this week';
  const flows: Flow[] = hours > 0 ? [{what: 'talking to members', unit: 'h', amount: qty(hours, 'h'), from: {node: HOME, stock: HOURS_LEFT}, to: {boundary: 'time'}}] : [];
  for (const f of flows) applyFlow(g, f);
  hold(g, m, answer, talked, systemRng(s.seed, 'committee', 'day', s.hours), s.hours);
  s.flows = flows;
  s.effects = [{kind: kindOf('vote'), cause: 'vote', at: SHEDS, amount: 1, unit: MOTIONS[m.motion].name},
    ...(hours > 0 ? [{kind: kindOf('talking to members'), cause: 'talking to members', at: SHEDS, amount: hours, unit: 'h'}] : [])];
  return null;
}
