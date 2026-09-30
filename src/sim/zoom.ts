// The zoom back in (part 9): the scripted slug outbreak from the neglected plot into the player's own garden, sealed
// below the allotment, and its rescue. The outbreak is a `GameEvent` on the sealed garden (src/sim/ladder.ts), so its kg
// come off the plot's output by `eventFactor`; the map traces it from the neglected plot to the player's tile. Going
// down swaps the garden kept in `State.ladder` back in as the level being played, run on from where it was sealed to
// today (inflating) with the slugs arrived in its beds, one clock ticking at the garden's rate; the fix is the garden's
// own slug tools, the slugs in its growing beds halved before the deadline. Back up swaps the allotment back and runs
// it on over the hours spent down. A rescue lifts the event, marks the plot (Reliability +10, the Rescued badge) and
// earns goodwill with every neighbour, more the faster it came; an adviser sent instead does it for a fee and half the
// reward. docs/systems/zoom.md says how it works; the founding spec's "Zooming back in" sets it.
//
// Sources: as src/data/zoom.ts's (RHS and AHDB on slugs from untended ground and what they cost; Nemaslug's pack and
//   its days), and the garden's own slug model (src/sim/models/pests.ts).
// Simplifies: the one scripted outbreak, in the allotment's first summer (unscripted ones are part 10's); the garden
//   run on unseen to today when the player goes down, its weeks since kept out of its sealed year; the household's purse
//   carried down and back up whole, set on the level the player goes to rather than moved by a flow (what the garden's
//   run-on earned or spent is dropped: the allotment's purse was the real one meanwhile); the allotment standing still while the player is down, then run on over those
//   hours at once on the way back up (the player's plot's food came through the garden's kitchen meanwhile).
//   Fast effect: the plot's output falling 40 % while the slugs last. Slow effect: the Rescued mark and the goodwill it
//   earned, carried on the plot.
import {PLAYER_PLOT} from '../data/allotment';
import {unfolded} from '../data/unfold';
import {ADVISERS, OUTBREAK, RESCUE} from '../data/zoom';
import {ALLOTMENT, HOME, ledgerAt, sealedOf} from './allotment';
import {calendar, levelClock, runStep, type System} from './clock';
import {GOAL} from './goal';
import {applyFlow, qty, touch, type Flow, type Graph, type GraphNode, type LeverValue, type NodeId} from './graph';
import {SEALED, type GameEvent} from './ladder';
import {after, neglectedPlot, RELATION, relationOf} from './models/agency';
import {KITCHEN} from './models/kitchen';
import {cropOf} from './models/crops';
import {weatherOf} from './models/weather';
import {SLUG_KEY, slugsOn} from './models/pests';
import {ATMOSPHERE, type State} from './state';
import type {Effect} from './effects';
import {kindOf} from './effects';

/** The allotment kept while the player is down in the garden: the hour they went down, and the level as it stood. */
export interface Down {
  at: number;
  level: number;
  home: NodeId;
  graph: Graph;
  /** The garden's year as sealed (its goal's ring): the weeks down there don't count towards it. */
  goal: LeverValue | null;
}

/** A rescue: by the player or an adviser, the game hour the slugs were back to normal, and the share of the reward. */
export interface Rescue {
  by: 'you' | 'adviser';
  at: number;
  share: number;
  /** Put on the plot yet: the event lifted, the mark and the goodwill (done back at the allotment). */
  applied: boolean;
}

/** The zoom back in, once a game: saved state. */
export interface Zoom {
  /** The sealed node it's on (the player's plot), and the neglected plot the slugs came from and its holder's name. */
  node: NodeId;
  from: NodeId;
  holder: string;
  event: GameEvent;
  /** The game hour the fix has to be in by. */
  deadline: number;
  /** kg of food the outbreak has cost the plot so far, and the hour counted up to. */
  kg: number;
  counted: number;
  down: Down | null;
  sent: {adviser: string; at: number; fee: number} | null;
  rescued: Rescue | null;
  missed: boolean;
  /** Slugs a m² of the dug beds once they'd arrived, on the first trip down (null before it): fixed at `OUTBREAK.clear`
   *  of it. The slugs arrive once, however often the player goes down. */
  peak: number | null;
}

/** What the page is shown of it: all but the allotment kept below while down. */
export type ZoomView = Omit<Zoom, 'down'> & {down: number | null};
export const zoomView = (z: Zoom | null): ZoomView | null => (z ? {...z, down: z.down?.at ?? null} : null);

/** The unfold key Go down and Send someone wait for (src/data/unfold.ts). */
export const TRACE = 'zoom.trace';
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const H = 24;

/** When the event stops taking food: at a rescue, else at its end. */
const endOf = (z: Pick<Zoom, 'event' | 'rescued'>) => Math.min(z.event.from + z.event.days * H, z.rescued?.at ?? Infinity);

/** Whether it's open: the trace up, and Go down or Send someone to be done. */
export const zoomOpen = (z: Pick<Zoom, 'rescued' | 'missed' | 'sent'> | null) => !!z && !z.rescued && !z.missed && !z.sent;

/** The reward's share for a rescue at an hour: all of it at once, falling to `least` at the deadline. */
export const shareAt = (z: Pick<Zoom, 'event' | 'deadline'>, at: number) =>
  RESCUE.most - (RESCUE.most - RESCUE.least) * clamp01((at - z.event.from) / Math.max(1, z.deadline - z.event.from));

/** A dug bed, where slugs live; and one with a crop growing in it, where the slugs from next door go to eat. */
const dug = (b: GraphNode) => b.kind === 'bed' && (b.stocks['land.crops']?.amount ?? 0) > 0 && !!b.stocks[SLUG_KEY];
const growing = (b: GraphNode) => dug(b) && !!cropOf(b) && !cropOf(b)!.dead;

/** Slugs a m² of the garden's dug beds (0 with none), whatever is growing in them: a harvest or a crop lost moves no
 *  slugs out, so only catching or killing them brings the figure down. */
export function bedSlugs(g: Graph): number {
  let n = 0, m2 = 0;
  for (const b of Object.values(g.nodes)) {
    const area = b.stocks['land.crops']?.amount ?? 0;
    if (!dug(b)) continue;
    n += slugsOn(b);
    m2 += area;
  }
  return m2 > 0 ? n / m2 : 0;
}

/** Whether the outbreak comes now: at the allotment, not had yet, on the first wet day of summer (slugs move on wet
 *  nights) once the plot has been held long enough, or on the summer's last day if none was wet. */
function due(s: State): boolean {
  if (s.zoom || s.level !== ALLOTMENT) return false;
  const l = ledgerAt(s.graph), d = calendar(s.hours);
  if (!l || s.hours - l.since < OUTBREAK.afterDays * H || !OUTBREAK.months.includes(d.month)) return false;
  return !!weatherOf(s.graph)?.wet || (d.month === OUTBREAK.months.at(-1) && d.day === 31);
}

/** Starts the outbreak: the event on the player's plot, and the zoom. */
function begin(s: State): Effect[] {
  const n = s.graph.nodes[PLAYER_PLOT], sealed = sealedOf(n);
  if (!n || !sealed) return [];
  const {plot, who} = neglectedPlot(s.seed);
  const event: GameEvent = {id: 'slugs-outbreak', kind: 'pests', label: 'slugs in your garden', product: 'veg', homeLevel: 1, size: OUTBREAK.size, from: s.hours, days: OUTBREAK.days};
  n.levers[SEALED.lever] = {...sealed, events: [...sealed.events, event]} as unknown as LeverValue;
  touch(s.graph, n.id);
  s.zoom = {node: n.id, from: plot, holder: s.graph.nodes[who]?.name ?? 'a neighbour', event, deadline: s.hours + OUTBREAK.deadlineDays * H, kg: 0, counted: s.hours, down: null, sent: null, rescued: null, missed: false, peak: null};
  return [{kind: kindOf('slugs in your garden'), cause: 'slugs in your garden', at: n.id, amount: 0, unit: 'kgFood'}];
}

/** The plot's output a day before events: its plan's. */
function rateOf(s: State, z: Zoom): number {
  const g = z.down ? z.down.graph : s.graph, sealed = sealedOf(g.nodes[z.node]);
  return sealed ? sealed.plan.output ?? sealed.totals.output : 0;
}

/** Runs a level's systems on a graph from one game hour to another, unseen: the flows move, activities and effects
 *  are dropped (the garden run on to today as the player goes down, and the allotment on the way back up). */
export function runOn(g: Graph, seed: number, level: number, from: number, to: number, systems: readonly System[]) {
  const dt = levelClock(level).stepHours, ctx = {dt, level, graph: g, flow: (f: Flow) => applyFlow(g, f), activity: () => {}};
  let h = from;
  while (h + dt <= to + 1e-9) h = runStep(systems, ctx, seed, h);
}

/** Puts a rescue on the plot at the allotment: the event lifted at the hour of the fix, Reliability's mark and the
 *  Rescued badge, and every neighbour's goodwill for it. */
function applyRescue(s: State, z: Zoom): Effect[] {
  const r = z.rescued, g = s.graph, n = g.nodes[z.node], sealed = sealedOf(n);
  if (!r || r.applied || !n || !sealed) return [];
  const events = sealed.events.map((e) => (e.id === z.event.id ? {...e, days: Math.max(0, (r.at - e.from) / H)} : e)).filter((e) => e.days > 0);
  const totals = {...sealed.totals, reliability: Math.min(100, sealed.totals.reliability + RESCUE.reliability)};
  n.levers[SEALED.lever] = {...sealed, events, totals} as unknown as LeverValue;
  n.totals = {...n.totals, reliability: totals.reliability};
  n.levers.rescued = {by: r.by, at: r.at} as unknown as LeverValue;
  touch(g, n.id);
  for (const p of Object.values(g.nodes)) {
    if (p.kind !== 'neighbour' || !(RELATION in p.levers)) continue;
    p.levers[RELATION] = after(relationOf(p), {type: 'rescued', share: r.share}) as unknown as LeverValue;
    touch(g, p.id);
  }
  s.zoom = {...z, rescued: {...r, applied: true}};
  return [{kind: kindOf('rescued'), cause: 'rescued', at: n.id, amount: r.share, unit: 'share'}];
}

/** The zoom's part of each tick command, after the systems have run, given the game hour the command started at: the
 *  outbreak's start, its kg counted, the deadline and a rescue put on the plot back at the allotment, once a game day
 *  (the page and the bot tick an hour at a time, and the allotment's day budget is tight); and down in the garden, each
 *  tick, a rescue seen and the kg its slugs ate. Returns its effects. */
export function zoomTick(s: State, since: number): Effect[] {
  if (!s.zoom?.down && Math.floor(since / H) === Math.floor(s.hours / H)) return [];
  if (!s.zoom) return due(s) ? begin(s) : [];
  let z = s.zoom;
  const out: Effect[] = [];
  // the kg the slugs take while they last, counted as the clock goes: from the plot's output at the allotment (the event
  // on its sealed node), and down in the garden the kg its slugs actually ate (the plot's shortfall still counting)
  const to = Math.min(s.hours, endOf(z)), from = Math.max(z.counted, z.event.from);
  if (to > from) {
    let kg = 0;
    if (z.down) for (const f of s.flows) kg += f.what === 'slugs' && f.unit === 'kgFood' ? f.amount : 0;
    else kg = z.event.size * rateOf(s, z) * ((to - from) / H);
    z = s.zoom = {...z, kg: z.kg + kg, counted: to};
    if (!z.down) out.push({kind: kindOf('slugs in your garden'), cause: 'slugs in your garden', at: z.node, amount: kg, unit: 'kgFood'});
  }
  // down in the garden: fixed once the dug beds' slugs are down to a share of what arrived (the outbreak broken)
  if (z.down && !z.rescued && !z.missed && z.peak && bedSlugs(s.graph) <= OUTBREAK.clear * z.peak) {
    z = s.zoom = {...z, rescued: {by: 'you', at: s.hours, share: shareAt(z, s.hours), applied: false}};
    out.push({kind: kindOf('slugs back to normal'), cause: 'slugs back to normal', at: 'lawn', amount: 1, unit: 'share'});
  }
  if (!z.rescued && !z.missed && s.hours >= z.deadline) z = s.zoom = {...z, missed: true};
  if (!z.down && z.rescued && !z.rescued.applied && s.hours >= z.rescued.at) out.push(...applyRescue(s, z));
  return out;
}

/** Go down: the garden kept below opens as the level, run on to today with the slugs arrived in its beds. Why not, or null. */
export function goDown(s: State, systems: readonly System[]): string | null {
  const z = s.zoom;
  if (!z || s.level !== ALLOTMENT) return 'there’s nothing to go down for';
  if (z.down) return 'you’re down there already';
  if (z.sent) return 'someone’s been sent';
  if (z.rescued) return 'it’s sorted';
  if (z.missed) return 'too late: the slugs are running their course';
  if (!unfolded(s.seen, TRACE)) return 'that hasn’t come up at the allotment yet';
  const i = s.ladder.findIndex((b) => b.level === 1), below = s.ladder[i];
  if (!below) return 'the garden isn’t kept below';
  const g = below.graph, k = g.nodes[KITCHEN], goal = k?.levers[GOAL] ?? null;
  // inflating: the garden run on from where it was left to today, unseen; its weeks since don't join its sealed year
  runOn(g, s.seed, 1, below.at ?? below.hours, s.hours, systems);
  if (k) k.levers[GOAL] = goal;
  // the household's purse comes down with you, and the same sky
  const money = s.graph.nodes[s.home]?.stocks.money, kept = k?.stocks.money;
  if (money && kept) (kept.amount = qty(money.amount, 'GBP')), touch(g, KITCHEN);
  const air = g.nodes[ATMOSPHERE], sky = s.graph.nodes[ATMOSPHERE];
  if (air && sky) (air.levers.weather = sky.levers.weather ?? null), (air.levers.forecast = sky.levers.forecast ?? null);
  // while down the garden is both the level and the ladder's entry (one object; a save writes it twice, and a load's two
  // copies are joined again on the way back up, where the level's copy becomes the ladder's)
  // the slugs from next door, on the first trip down only: into the beds with a crop growing (every dug bed if none
  // is) and onto the lawn's edge
  const flows: Flow[] = [], beds = Object.values(g.nodes).filter(growing), into = beds.length ? beds : Object.values(g.nodes).filter(dug);
  for (const b of z.peak === null ? [...into, ...(g.nodes.lawn?.stocks[SLUG_KEY] ? [g.nodes.lawn] : [])] : []) {
    const area = b.stocks['land.crops']?.amount ?? 0, lawn = b.id === 'lawn';
    const f: Flow = {what: 'slugs from next door', unit: 'pests', product: 'slugs', amount: qty(lawn ? OUTBREAK.arrive.edge : OUTBREAK.arrive.perM2 * area, 'pests'), from: {boundary: 'wild'}, to: {node: b.id, stock: SLUG_KEY}};
    if (!applyFlow(g, f)) flows.push(f);
  }
  // the plot's kg counted up to the hour you went down (at the allotment they're counted once a day)
  const upTo = Math.min(s.hours, endOf(z)), since = Math.max(z.counted, z.event.from), kg = upTo > since ? z.event.size * rateOf(s, z) * ((upTo - since) / H) : 0;
  s.zoom = {...z, kg: z.kg + kg, counted: Math.max(z.counted, upTo), down: {at: s.hours, level: s.level, home: s.home, graph: s.graph, goal}, peak: z.peak ?? bedSlugs(g)};
  s.ladder = s.ladder.map((b, j) => (j === i ? {...b, at: s.hours} : b));
  s.graph = g;
  s.level = 1;
  s.home = KITCHEN;
  s.flows = flows;
  s.activities = [];
  // the slugs' own instruments unfold with them, if the garden never had them
  s.effects = [{kind: kindOf('going down'), cause: 'going down', at: 'lawn', amount: 1, unit: 'visit'},
    ...flows.map((f): Effect => ({kind: kindOf(f.what), cause: f.what, at: (f.to as {node: NodeId}).node, amount: f.amount, unit: f.unit}))];
  return null;
}

/** Back up: the allotment again, run on over the hours spent down, and a rescue put on the plot. Why not, or null. */
export function backUp(s: State, systems: readonly System[]): string | null {
  const z = s.zoom, d = z?.down;
  if (!z || !d) return 'you’re not down in the garden';
  const garden = s.graph, k = garden.nodes[KITCHEN];
  if (k) k.levers[GOAL] = d.goal;
  const i = s.ladder.findIndex((b) => b.level === 1);
  s.ladder = s.ladder.map((b, j) => (j === i ? {...b, graph: garden, at: s.hours} : b));
  // the purse comes back up, and the sky
  const money = d.graph.nodes[d.home]?.stocks.money, kept = k?.stocks.money;
  if (money && kept) (money.amount = qty(kept.amount, 'GBP')), touch(d.graph, d.home);
  const air = d.graph.nodes[ATMOSPHERE], sky = garden.nodes[ATMOSPHERE];
  if (air && sky) (air.levers.weather = sky.levers.weather ?? null), (air.levers.forecast = sky.levers.forecast ?? null);
  s.graph = d.graph;
  s.level = d.level;
  s.home = d.home;
  s.zoom = {...z, down: null};
  // the plot's food came through the garden's kitchen while you were down: it runs on from now
  const n = s.graph.nodes[z.node], sealed = sealedOf(n);
  if (n && sealed) n.levers[SEALED.lever] = {...sealed, at: s.hours} as unknown as LeverValue;
  const effects = applyRescue(s, s.zoom);
  // one clock: the allotment's hours while you were down
  runOn(s.graph, s.seed, s.level, d.at, s.hours, systems);
  s.flows = [];
  s.activities = [];
  s.effects = [{kind: kindOf('back up'), cause: 'back up', at: z.node, amount: 1, unit: 'visit'}, ...effects];
  return null;
}

/** Send someone: an adviser sorts it for a fee from the household's purse and half the reward. Why not, or null. */
export function sendSomeone(s: State, id: string): string | null {
  const z = s.zoom, a = ADVISERS[id];
  if (!a) return `no adviser ${id}`;
  if (!z || s.level !== ALLOTMENT) return z?.down ? 'you’re down there yourself' : 'there’s nothing to send anyone to';
  if (z.rescued || z.sent) return 'it’s sorted';
  if (!unfolded(s.seen, TRACE)) return 'that hasn’t come up at the allotment yet';
  if (z.missed) return 'too late: the slugs are running their course';
  if (s.hours + a.days * H > z.deadline) return `${a.name} can’t be done before the deadline`;
  const home = s.graph.nodes[HOME];
  if ((home?.stocks.money?.amount ?? 0) < a.fee) return `${a.name} charges £${a.fee}, and the purse is short`;
  const f: Flow = {what: 'an adviser’s fee', unit: 'GBP', amount: qty(a.fee, 'GBP'), from: {node: HOME, stock: 'money'}, to: {boundary: 'bought'}};
  const bad = applyFlow(s.graph, f);
  if (bad) return bad;
  const at = s.hours + a.days * H;
  s.zoom = {...z, sent: {adviser: a.id, at: s.hours, fee: a.fee}, rescued: {by: 'adviser', at, share: shareAt(z, at) * a.reward, applied: false}};
  s.flows = [f];
  s.effects = [{kind: kindOf('an adviser’s fee'), cause: 'an adviser’s fee', at: z.node, amount: a.fee, unit: 'GBP'}];
  return null;
}
