// What the goal bar says (the founding spec, "What makes the jump feel earned"; win W18), from the snapshot alone, so a
// Vitest test holds it. Before the first harvest it counts down to that; after, it shows the step-up offer's three
// numbers over the window stepUpStatus() takes (the garden's last full year, src/sim/ladder.ts) and names the one holding
// the player back, and the one next action that would raise it furthest, in a player's words, from the garden's own
// state (nextAction()): a bed to dig, a bed to sow, a winter crop, a thing in the shed that answers what the pests took.
// Early in the year it says what the window is waiting for, not an empty bar. The prize, what the allotment brings, is
// its own short line.
import {CROPS, WINTER_IDS, type CropId} from '../data/crops';
import type {Requirement} from '../data/ladder-rules';
import {UPGRADES} from '../data/shed';
import {unfolded} from '../data/unfold';
import {calendar} from '../sim/clock';
import {gardenStatus, GOAL, type Goal} from '../sim/goal';
import type {GraphNode} from '../sim/graph';
import {NO_KIT, SHED, type Kit} from '../sim/kit';
import type {RequirementStatus, StepUpStatus} from '../sim/ladder';
import {cropOf, inSeason, nextSowing, progress, stageOf} from '../sim/models/crops';
import type {Snapshot} from '../sim/state';

export interface GoalLine {
  /** The one line: the goal, and what's holding it back. */
  text: string;
  /** The one next action that would raise it furthest, when the garden's state names one. */
  action: string | null;
  /** The three requirements, the furthest from its target first, or null before the first harvest. */
  rows: RequirementStatus[] | null;
  /** The share of the window there is so far, 0–1, or null before the first harvest. */
  window: number | null;
}

const NAME: Record<Requirement, string> = {output: 'Output', reliability: 'Reliability', health: 'Health'};
/** What raises each, in a few words a player understands. */
export const RAISE: Record<Requirement, string> = {
  output: 'more to pick: keep every bed sown',
  reliability: 'a steadier mix of crops',
  health: 'compost, the rotation and steady watering',
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

/**
 * The one next action that would raise the requirement furthest from its target, from the garden's own state, or null
 * if nothing in the garden names one: a bed to dig once every dug bed is in use, an empty bed to sow, a winter crop in
 * an autumn bed standing empty, the thing in the shed that answers what pests took, a green manure for the soil.
 */
export function nextAction(snap: Pick<Snapshot, 'nodes' | 'seen' | 'hours'>, key: Requirement): string | null {
  const nodes = snap.nodes, beds = nodes.filter(dug), d = calendar(snap.hours), autumn = d.month >= 8 && d.month <= 11;
  const kit = (nodes.find((n) => n.id === SHED)?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;
  const empty = beds.filter((n) => !cropOf(n));
  // an empty bed whose plan sows nothing soon: sow it (a winter crop in autumn, once they've come up)
  const idle = empty.find((n) => {
    const next = nextSowing(n, d);
    return !next || (next.day - d.dayOfYear + 365) % 365 > 7;
  });
  if (idle && autumn && unfolded(snap.seen, 'garden.winter') && (idle.levers.winter ?? 'none') === 'none')
    return key === 'health' ? `Sow a green manure in ${bedName(idle)}` : `Sow a winter crop in ${bedName(idle)}`;
  const crop = toSow(nodes, snap.hours);
  if (idle && crop && key !== 'health') return `Sow ${lower(CROPS[crop].name)} in ${bedName(idle)}`;
  // what the slugs took, and the shed's answer to it
  const hit = beds.map((n) => ({n, c: cropOf(n)})).filter((x) => x.c && !x.c.dead).sort((a, b) => b.c!.lost - a.c!.lost)[0];
  if (hit && hit.c!.lost >= 0.15 && unfolded(snap.seen, 'shed.beer-trap') && !kit.owned.includes('beer-trap'))
    return `Buy the ${lower(UPGRADES['beer-trap'].name)}: slugs took ${Math.round(100 * hit.c!.lost)} % of the ${lower(CROPS[hit.c!.id].name)}`;
  // every dug bed in use, and a plot under grass: dig it
  const plot = nodes.find((n) => n.kind === 'bed' && grass(n));
  if (plot && !empty.length && unfolded(snap.seen, 'garden.dig') && plot.levers.dig !== true && key !== 'health')
    return crop ? `Dig ${bedName(plot)} and sow ${lower(CROPS[crop].name)}` : `Dig ${bedName(plot)}`;
  if (key === 'reliability') {
    // a garden that feeds the household in the winter: something that stands through it
    const winter = beds.find((n) => (n.levers.winter ?? 'none') === 'none');
    if (winter && unfolded(snap.seen, 'garden.winter')) return `Plan a winter crop for ${bedName(winter)}: ${WINTER_IDS.slice(0, 3).map((c) => lower(CROPS[c].name)).join(', ')}`;
    // kale or leeks, sown or planted in spring and summer and picked through the winter: in the bed that's free first
    const plan = beds.some((n) => n.levers.sow === 'kale' || n.levers.sow === 'leeks') ? null : inSeason(CROPS.kale, d) ? 'kale' : inSeason(CROPS.leeks, d) ? 'leeks' : null;
    const cold = [...beds].sort((a, b) => (cropOf(a) ? 1 : 0) - (cropOf(b) ? 1 : 0))[0];
    if (plan && cold) return `Plan ${plan} in ${bedName(cold)}: it’s picked through the winter`;
  }
  if (key === 'health') {
    const same = beds.find((n) => n.levers.sow !== 'rotation' && n.levers.sow !== 'none');
    if (same) return `Put ${bedName(same)} on the rotation`;
    if (unfolded(snap.seen, 'shed.compost-bin') && !kit.owned.includes('compost-bin')) return 'Buy the compost bin: more compost for the beds';
  }
  return null;
}

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
    return {text, action: null, rows: null, window: null};
  }
  const st = statusOf(snap), weeks = Math.round(st.days / 7), of = Math.round(st.windowDays / 7);
  if (!st.days) return {text: 'The allotment: the committee looks at your garden’s whole year, from its first full week', action: nextAction(snap, 'output'), rows: null, window: 0};
  const action = st.binding ? nextAction(snap, st.binding.key) : null;
  const held = st.binding ? `${valueText(st.binding)}: ${action ?? RAISE[st.binding.key]}` : 'All three met';
  return {text: st.full ? held : `${held} (${weeks} of ${of} weeks so far)`, action, rows: st.requirements, window: Math.min(1, st.days / st.windowDays)};
}

/** The garden's step-up offer from a snapshot (src/sim/goal.ts's gardenStatus()). */
export const statusOf = (snap: Pick<Snapshot, 'nodes'>): StepUpStatus =>
  gardenStatus((snap.nodes.find((n) => n.id === 'kitchen')?.levers[GOAL] as unknown as Goal | null | undefined) ?? null);
