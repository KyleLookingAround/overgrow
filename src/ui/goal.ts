// What the goal bar says (the founding spec, "What makes the jump feel earned"; win W18), from the snapshot alone, so a
// Vitest test holds it. Before the first harvest it counts down to that; after, it shows the step-up offer's three
// numbers over the window stepUpStatus() takes (the garden's last full year, src/sim/ladder.ts) and names the one holding
// the player back, and the one next action that would raise it furthest, in a player's words, from the garden's own
// state (nextAction()): a bed to dig, a bed to sow, a winter crop, a thing in the shed that answers what the pests took.
// Early in the year it says what the window is waiting for, not an empty bar. The prize, what the allotment brings, is
// its own short line.
import {CROPS, WINTER_IDS, type CropId} from '../data/crops';
import type {Requirement} from '../data/ladder-rules';
import {firstStep, RUNGS, UPGRADES, type UpgradeId} from '../data/shed';
import {unfolded} from '../data/unfold';
import {calendar} from '../sim/clock';
import {gardenStatus, GOAL, type Goal} from '../sim/goal';
import type {GraphNode} from '../sim/graph';
import {NO_KIT, SHED, type Kit} from '../sim/kit';
import type {RequirementStatus, StepUpStatus} from '../sim/ladder';
import {cropOf, inSeason, nextSowing, progress, stageOf, winterPick} from '../sim/models/crops';
import {digCost} from '../data/garden';
import {refuseBuy} from '../sim/shed';
import type {Command} from '../sim/commands';
import type {LeverValue} from '../sim/graph';
import type {Snapshot} from '../sim/state';

export interface GoalLine {
  /** The one line: the goal, and what's holding it back. */
  text: string;
  /** The one next action that would raise it furthest, when the garden's state names one, and its commands. */
  action: string | null;
  step: Step | null;
  /** The three requirements, the furthest from its target first, or null before the first harvest. */
  rows: RequirementStatus[] | null;
  /** The share of the window there is so far, 0–1, or null before the first harvest. */
  window: number | null;
  /** The one thing to do, a verb first ("Sow kale in bed 3"), for the bar's one line. */
  verb: string;
  /** The button behind the verb: the step's commands, the Shed opened at what to save for, or the plan opened. */
  go: Go;
  /** How far the goal has come, 0–1, for the bar's ring: the first crop's growth before the first harvest, then the
   *  year's share so far times how near the three requirements are to their targets. */
  ring: number;
}

/** The three requirements in plain words: what the committee looks at, when the bar is opened. */
export const PLAIN: Record<Requirement, string> = {
  output: 'How well the garden fed the household',
  reliability: 'How steadily, week in, week out',
  health: 'The soil',
};
/** The prize, as the bar's icon says it. */
export const PRIZE_SHORT = 'A plot at the allotment';

const NAME: Record<Requirement, string> = {output: 'Output', reliability: 'Reliability', health: 'Health'};
/** What raises each, in a few words a player understands. */
export const RAISE: Record<Requirement, string> = {
  output: 'keep every bed sown and picked',
  reliability: 'grow a steadier mix, and something for the winter',
  health: 'feed the soil: compost, the rotation and steady watering',
};
/** What the next level brings, in a line: the prize the goal is for. */
export const PRIZE = 'The prize: a plot at the allotment, ten times the ground, with neighbours and a shared trough';

const lower = (s: string) => s[0]!.toLowerCase() + s.slice(1);
const grass = (n: GraphNode) => (n.stocks['land.grass']?.amount ?? 0) > 1e-6;
const dug = (n: GraphNode) => n.kind === 'bed' && !grass(n) && (n.stocks['land.crops']?.amount ?? 0) > 0;
const bedName = (n: GraphNode) => n.name.replace('Bed', 'bed');

/** A crop in season today that no dug bed grows, or any in season: what to sow in a bed that's free. */
function toSow(nodes: GraphNode[], snapHours: number): CropId | null {
  const d = calendar(snapHours), growing = new Set(nodes.map((n) => (n.kind === 'bed' ? cropOf(n)?.id : undefined)));
  const ok = (Object.keys(CROPS) as CropId[]).filter((c) => !CROPS[c].flower && !CROPS[c].winter && inSeason(CROPS[c], d));
  return ok.find((c) => !growing.has(c)) ?? ok[0] ?? null;
}

/** The one next action: its words and the commands that carry it out (a tap on the goal, or a player who follows the
 *  goal bar and nothing else: tools/bot/player.ts's `tips`). */
export interface Step {
  text: string;
  cmds: Command[];
  /** A thing in the shed the step saves for: the button opens the Shed at it. */
  shed?: UpgradeId;
}

/** The goal bar's button: one tap does the step, or opens the Shed at what it saves for, or the Garden tab's plan. */
export interface Go {
  label: string;
  cmds: Command[];
  tab: 'garden' | 'shed' | null;
  shed: UpgradeId | null;
}
/** The button for a step, or for none: the plan, where every bed's sowing is chosen. */
export function goOf(step: Step | null): Go {
  if (step?.shed) return {label: 'Open the Shed', cmds: [], tab: 'shed', shed: step.shed};
  if (step?.cmds.length) return {label: 'Do it', cmds: step.cmds, tab: null, shed: null};
  return {label: 'See the plan', cmds: [], tab: 'garden', shed: null};
}

/** A thing in the shed as the next step: bought if the purse can pay and the shed would sell it, saved for (the Shed
 *  opened at it) if only the money is short, or null if something else stands in the way (no room on the lawn, no bed
 *  in the open for a cover). */
function shedStep(nodes: GraphNode[], aim: UpgradeId, purse: number, why: string, seen?: readonly string[]): Step | null {
  // a big buy in steps: the first step not yet bought (the hen house before the hens), once it's on offer
  const kit = (nodes.find((n) => n.id === SHED)?.levers.kit as unknown as Kit | undefined) ?? NO_KIT, id = firstStep(aim, kit.owned);
  if (seen && !unfolded(seen, `shed.${id}`)) return null;
  const u = UPGRADES[id], why_not = refuseBuy(graphOf(nodes), id);
  if (!why_not) return {text: `Buy the ${lower(u.name)}: ${id === aim ? why : lower(u.saves)}`, cmds: [{type: 'buy', id}]};
  return purse < u.price && why_not === `${u.name} costs £${u.price.toFixed(2)}` ? {text: `${u.name}: £${Math.ceil(u.price - purse)} to go`, cmds: [], shed: id} : null;
}
const graphOf = (nodes: GraphNode[]) => ({nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), edges: [], rev: 0});

/** The next rung on the money ladder (src/data/shed.ts's RUNGS): the first on offer that the garden hasn't got and could
 *  take, whether or not the purse can pay for it yet. Null when the ladder's climbed as far as it's shown. */
export function nextRung(snap: {nodes: GraphNode[]; seen: readonly string[]}): UpgradeId | null {
  const g = graphOf(snap.nodes), kit = (snap.nodes.find((n) => n.id === SHED)?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;
  for (const id of RUNGS) {
    const u = UPGRADES[id];
    if (!unfolded(snap.seen, `shed.${id}`) || (u.kept && kit.owned.includes(id))) continue;
    const r = refuseBuy(g, id);
    if (r === null || r === `${u.name} costs £${u.price.toFixed(2)}`) return id;
  }
  return null;
}
/** The ladder's next rung as the goal bar's step: bought when the purse can pay ("Do it"), else saved for (the Shed
 *  opened at it), with the gap: "Cold frame: £12 to go". */
export function rungStep(snap: {nodes: GraphNode[]; seen: readonly string[]}): Step | null {
  const id = nextRung(snap);
  if (!id) return null;
  const u = UPGRADES[id], purse = snap.nodes.find((n) => n.id === 'kitchen')?.stocks.money?.amount ?? 0;
  return purse >= u.price ? {text: `Buy the ${lower(u.name)} (£${u.price.toFixed(2)})`, cmds: [{type: 'buy', id}]} : {text: `${u.name}: £${Math.ceil(u.price - purse)} to go`, cmds: [], shed: id};
}

/**
 * The one next action that would raise the requirement furthest from its target, from the garden's own state, or null
 * if nothing in the garden names one: a bed to dig once every dug bed is in use, an empty bed to sow, a winter crop in
 * an autumn bed standing empty, the thing in the shed that answers what pests took, a green manure for the soil. It
 * offers only what the player can act on now: a buy or a dig the purse can pay for, a lever that has come up.
 */
export function nextStep(snap: Pick<Snapshot, 'nodes' | 'seen' | 'hours'>, key: Requirement): Step | null {
  const nodes = snap.nodes, beds = nodes.filter(dug), d = calendar(snap.hours), autumn = d.month >= 8 && d.month <= 11;
  const kit = (nodes.find((n) => n.id === SHED)?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;
  const purse = nodes.find((n) => n.id === 'kitchen')?.stocks.money?.amount ?? 0;
  const plan = (n: GraphNode, lever: string, value: LeverValue): Command => ({type: 'plan', node: n.id, lever, value});
  const empty = beds.filter((n) => !cropOf(n));
  // an empty bed whose plan sows nothing soon: sow it (a winter crop in autumn, once they've come up)
  const idle = empty.find((n) => {
    const next = nextSowing(n, d);
    return !next || (next.day - d.dayOfYear + 365) % 365 > 7;
  });
  if (idle && autumn && unfolded(snap.seen, 'garden.winter') && (idle.levers.winter ?? 'none') === 'none') {
    if (key === 'health' && inSeason(CROPS['green-manure'], d)) return {text: `Sow a green manure in ${bedName(idle)}`, cmds: [plan(idle, 'winter', 'green-manure')]};
    const w = winterPick(idle, d);
    if (w) return {text: `Sow a winter crop in ${bedName(idle)}`, cmds: [plan(idle, 'winter', w)]};
  }
  const crop = toSow(nodes, snap.hours);
  if (idle && crop && key !== 'health') return {text: `Sow ${lower(CROPS[crop].name)} in ${bedName(idle)}`, cmds: [plan(idle, 'sow', crop)]};
  // what the slugs took, and the shed's answer to it, once the purse can pay
  const hit = beds.map((n) => ({n, c: cropOf(n)})).filter((x) => x.c && !x.c.dead).sort((a, b) => b.c!.lost - a.c!.lost)[0];
  if (hit && hit.c!.lost >= 0.15 && unfolded(snap.seen, 'shed.beer-trap') && !kit.owned.includes('beer-trap') && purse >= UPGRADES['beer-trap'].price)
    return {text: `Buy the ${lower(UPGRADES['beer-trap'].name)}: slugs took ${Math.round(100 * hit.c!.lost)} % of the ${lower(CROPS[hit.c!.id].name)}`, cmds: [{type: 'buy', id: 'beer-trap'}]};
  // every dug bed in use, a plot under grass, and a bed's edging and compost in the purse: dig it
  const plot = nodes.find((n) => n.kind === 'bed' && grass(n)), digging = nodes.some((n) => n.kind === 'bed' && grass(n) && n.levers.dig === true);
  if (plot && !digging && !empty.length && unfolded(snap.seen, 'garden.dig') && key !== 'health' && purse >= digCost(plot.stocks['land.grass']?.amount ?? 0))
    return crop ? {text: `Dig ${bedName(plot)} and sow ${lower(CROPS[crop].name)}`, cmds: [plan(plot, 'dig', true), plan(plot, 'sow', crop)]} : {text: `Dig ${bedName(plot)}`, cmds: [plan(plot, 'dig', true)]};
  if (key === 'output') {
    // a big buy that makes more food this year, bought or saved for: eggs most days, then a crop under glass (the fruit
    // cage crops only from its second summer, so it's no answer to this year's Output)
    for (const id of ['hens', 'greenhouse'] as const)
      if (!kit.owned.includes(id)) {
        const s = shedStep(nodes, id, purse, lower(UPGRADES[id].saves), snap.seen);
        if (s) return s;
      }
  }
  if (key === 'reliability') {
    // a glut sold in summer is food the winter doesn't have: preserve it, once there's been one
    // (only while Output has room to spare: what's frozen is eaten later instead of sold now)
    const k = nodes.find((n) => n.id === 'kitchen'), glut = (k?.levers.ledger as {glutFrom?: number | null} | undefined)?.glutFrom;
    const output = statusOf(snap).requirements.find((r) => r.key === 'output');
    if (k && glut != null && (k.levers.glut ?? 'sell') === 'sell' && (output?.value ?? 0) >= 1.15 * (output?.target ?? Infinity)) return {text: 'Preserve the gluts: they feed the lean months', cmds: [{type: 'policy', node: 'kitchen', lever: 'glut', value: 'preserve'}]};
    // a garden that feeds the household in the winter: something that stands through it
    const winter = beds.find((n) => (n.levers.winter ?? 'none') === 'none' && n.levers.cover !== 'greenhouse');
    const w = winter && (winterPick(winter, d) ?? WINTER_IDS[0]!);
    if (winter && w && unfolded(snap.seen, 'garden.winter')) return {text: `Plan ${lower(CROPS[w].name)} for ${bedName(winter)} over the winter`, cmds: [plan(winter, 'winter', w)]};
    // kale or leeks, sown or planted in spring and summer and picked through the winter: in the bed that's free first
    const pick = beds.some((n) => n.levers.sow === 'kale' || n.levers.sow === 'leeks') ? null : inSeason(CROPS.kale, d) ? 'kale' : inSeason(CROPS.leeks, d) ? 'leeks' : null;
    const cold = [...beds].sort((a, b) => (cropOf(a) ? 1 : 0) - (cropOf(b) ? 1 : 0))[0];
    if (pick && cold) return {text: `Plan ${pick} in ${bedName(cold)}: it’s picked through the winter`, cmds: [plan(cold, 'sow', pick)]};
    // a longer season at each end, so the beds feed the household in the thin weeks: cloches, the frame, then glass
    for (const id of ['cloches', 'cold-frame', 'greenhouse'] as const)
      if (!kit.owned.includes(id)) {
        const s = shedStep(nodes, id, purse, 'a longer season at each end', snap.seen);
        if (s) return s;
      }
  }
  if (key === 'health') {
    const same = beds.find((n) => n.levers.sow !== 'rotation' && n.levers.sow !== 'none');
    if (same) return {text: `Put ${bedName(same)} on the rotation`, cmds: [plan(same, 'sow', 'rotation')]};
    if (unfolded(snap.seen, 'shed.compost-bin') && !kit.owned.includes('compost-bin') && purse >= UPGRADES['compost-bin'].price)
      return {text: 'Buy the compost bin: more compost for the beds', cmds: [{type: 'buy', id: 'compost-bin'}]};
  }
  return null;
}
/** The next action's words (nextStep()'s), or null. */
export const nextAction = (snap: Pick<Snapshot, 'nodes' | 'seen' | 'hours'>, key: Requirement): string | null => nextStep(snap, key)?.text ?? null;

/** A requirement's value against its target, as the bar shows it. */
export function valueText(r: RequirementStatus): string {
  const v = r.key === 'output' ? r.value.toFixed(1) : String(Math.round(r.value)), t = r.key === 'output' ? `${r.target} kg a day` : String(r.target);
  return `${NAME[r.key]} ${v} of ${t}`;
}

export function goalLine(snap: Pick<Snapshot, 'nodes' | 'kitchen' | 'seen' | 'hours'>): GoalLine {
  if (snap.kitchen?.firstHarvest == null) {
    // the crop nearest its first pick
    let best: {name: string; bed: string; p: number; ready: boolean} | null = null;
    for (const n of snap.nodes) {
      const c = n.kind === 'bed' ? cropOf(n) : null;
      if (!c || c.dead) continue;
      const ready = stageOf(c) === 'ready', p = ready ? 1 : progress(c);
      if (!best || p > best.p) best = {name: CROPS[c.id].name.toLowerCase(), bed: n.name, p, ready};
    }
    const text = !best ? 'First harvest: sow a bed' : best.ready ? `First harvest: ${best.name} in ${best.bed}, ready to pick` : `First harvest: ${best.name} in ${best.bed}, ${Math.round(100 * best.p)} % grown`;
    const verb = !best ? 'Sow a bed' : best.ready ? `Pick the ${best.name} in ${best.bed}` : `Grow the first harvest: ${best.name} in ${best.bed}`;
    return {text, action: null, step: null, rows: null, window: null, verb, ring: best?.p ?? 0, go: goOf(null)};
  }
  const st = statusOf(snap), weeks = Math.round(st.days / 7), of = Math.round(st.windowDays / 7);
  if (!st.days) {
    const step = nextStep(snap, 'output') ?? rungStep(snap), action = step?.text ?? null;
    return {text: 'The allotment: the committee looks at your garden’s whole year, from its first day', action, step, rows: null, window: 0, verb: action ?? 'Keep every bed sown and picked', ring: 0, go: goOf(step)};
  }
  // the requirement's own next action, or else the money ladder's next rung, so the bar always names something to do
  // (a big buy to save for gives way to a cheaper rung first: the ladder climbs one step at a time)
  let own = st.binding ? nextStep(snap, st.binding.key) : null;
  const rung = rungStep(snap), rungId = nextRung(snap);
  if (own?.shed && rung && rungId && UPGRADES[rungId].price < UPGRADES[own.shed].price) own = null;
  const step = own ?? rung, action = own?.text ?? null;
  const held = st.binding ? `${valueText(st.binding)}: ${action ?? RAISE[st.binding.key]}` : 'All three met';
  const window = Math.min(1, st.days / st.windowDays), near = st.requirements.reduce((a, r) => a + Math.min(1, r.progress), 0) / Math.max(1, st.requirements.length);
  const verb = step?.text ?? (st.binding ? RAISE[st.binding.key][0]!.toUpperCase() + RAISE[st.binding.key].slice(1) : 'Keep it up: all three are met');
  return {text: st.full ? held : `${held} (${weeks} of ${of} weeks so far)`, action, step, rows: st.requirements, window, verb, ring: window * near, go: goOf(step)};
}

/** The garden's step-up offer from a snapshot (src/sim/goal.ts's gardenStatus()). */
export const statusOf = (snap: Pick<Snapshot, 'nodes'>): StepUpStatus =>
  gardenStatus((snap.nodes.find((n) => n.id === 'kitchen')?.levers[GOAL] as unknown as Goal | null | undefined) ?? null);
