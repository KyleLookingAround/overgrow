// Skips (docs/specs/one-map.md, item 7): at the levels the camera can't pull far enough out to hurry time, what's next
// that needs the player, so the page can offer to skip to it, and what wakes a skip early. Pacing only: the sim runs
// every hour of a skip as it would any other, so a skipped week ends where a watched one would (the page's time-lapse is
// src/app/clock-loop.ts). The foresight is rough by design: a crop's ready day from its degree days still to go at the
// month's normal warmth, a bed's next sowing from its plan, and none at all while a frost is forecast on tender crops
// (the frost card's own test, src/sim/shed.ts's frostBeds). A skip wakes at the first thing the player would act on: a
// cause in WAKES, a frost forecast on tender crops, or something newly unfolded (a pest's first sighting among them),
// which the tick checks (src/sim/commands.ts).
// docs/systems/clock.md says how it works.
import {CROPS, type CropId} from '../data/crops';
import {NORMALS} from '../data/climate-normals';
import {SKIP} from '../data/ladder';
import {calendar} from './clock';
import {nodeList, type GraphNode} from './graph';
import {cropOf, nextSowing, stageOf} from './models/crops';
import {frostBeds} from './shed';
import {forecastOf, tonight, weatherOf} from './models/weather';
import type {State} from './state';

/** What's next that needs the player, at a game hour (the morning it comes), and why, in a few words. */
export interface Due {
  hours: number;
  why: string;
}

/** The effects that wake a skip: something on the map the player would want to act on, as the sim records it (the
 *  Explain table's causes, src/data/explain.ts): a frost on a crop, blight weather, and the allotment's slug outbreak.
 *  Pests that come every evening or every day of their season (slugs, aphids) wake one only the first time, when they
 *  unfold. */
export const WAKES: ReadonlySet<string> = new Set(['frost damage', 'Smith period', 'slugs in your garden', 'slugs from next door']);

/** A frost forecast tonight or tomorrow night on tender crops up in the open, at the garden: the frost card's question. */
function frostDue(s: State): boolean {
  if (s.level !== 1) return false;
  const today = weatherOf(s.graph), f = forecastOf(s.graph);
  return !!today && !!f && (tonight(today, f.day) < 0 || f.day.tmin < 0) && frostBeds(s.graph).length > 0;
}

/** What wakes a skip in the last tick: the first cause in its effects that does, a frost forecast on tender crops, or
 *  null. (Something newly unfolded wakes one too; the tick sees that itself.) */
export function wakeOf(s: State): string | null {
  for (const e of s.effects) if (e.amount > 0 && WAKES.has(e.cause)) return e.cause;
  return frostDue(s) ? 'frost forecast' : null;
}

/** Game hours of the morning (07:00) `days` whole days after the day `hours` falls in. */
function morning(hours: number, days: number): number {
  const d = calendar(hours);
  return hours - d.hour - d.minute / 60 + 24 * days + 7;
}

/** Degree days a day above a base at the month's normal warmth, at least a little so a winter crop still comes. */
const ddPerDay = (month: number, base: number) => {
  const m = NORMALS[month - 1]!;
  return Math.max(0.5, (m.tmax + m.tmin) / 2 - base);
};

/** Days until a bed's crop is ready, or until its plan sows next; null if neither. */
function bedNext(n: GraphNode, hours: number): {days: number; why: string} | null {
  const s = cropOf(n), d = calendar(hours);
  if (s && !s.dead) {
    const stage = stageOf(s);
    if (stage === 'ready' || stage === 'over') return null;
    const c = CROPS[s.id as CropId];
    return {days: Math.max(0, c.dd.mature - s.dd) / ddPerDay(d.month, c.base), why: `${c.name.toLowerCase()} ready in ${n.name.toLowerCase()}`};
  }
  // only a dug bed is sown (and asking an undug one searches the whole year)
  if ((n.stocks['land.crops']?.amount ?? 0) <= 0 || n.levers.sow === 'none') return null;
  const next = nextSowing(n, d);
  if (!next) return null;
  const ahead = (next.day - d.dayOfYear + 365) % 365;
  return {days: ahead, why: `time to ${CROPS[next.crop].how} ${CROPS[next.crop].name.toLowerCase()} in ${n.name.toLowerCase()}`};
}

/** Each state's last answer, kept for the game day: the foresight is asked every snapshot. */
const kept = new WeakMap<State, {day: number; level: number; due: Due | null}>();

/**
 * What's next that needs the player at a level where skips are offered, at least a day off and at most SKIP.mostDays;
 * null where it's too close, where a frost is forecast on tender crops, or where skips aren't offered (above
 * SKIP.levels, or down in a rescue with its deadline running).
 */
export function dueOf(s: State): Due | null {
  if (s.level > SKIP.levels || s.zoom?.down) return null;
  const day = Math.floor(s.hours / 24), had = kept.get(s);
  if (had && had.day === day && had.level === s.level) return had.due;
  const due = foresee(s);
  kept.set(s, {day, level: s.level, due});
  return due;
}

function foresee(s: State): Due | null {
  const most = morning(s.hours, SKIP.mostDays), soon = s.hours + 24;
  if (s.level === 1) {
    // a frost tonight or tomorrow night on tender crops needs the player now (the frost card), so nothing is offered
    if (frostDue(s)) return null;
    let best: {hours: number; why: string} | null = null;
    for (const n of nodeList(s.graph)) {
      if (n.kind !== 'bed') continue;
      const next = bedNext(n, s.hours);
      if (!next) continue;
      const at = morning(s.hours, Math.ceil(next.days));
      if (!best || at < best.hours) best = {hours: at, why: next.why};
    }
    if (!best) return {hours: most, why: 'a fortnight on'};
    if (best.hours < soon) return null;
    return best.hours > most ? {hours: most, why: 'a fortnight on'} : best;
  }
  // the allotment: its week, from Monday morning, is when the plots' work is planned (src/sim/season.ts)
  const d = calendar(s.hours), monday = morning(s.hours, ((7 - d.weekday) % 7) || 7);
  return monday < soon ? null : {hours: Math.min(monday, most), why: 'a new week at the allotment'};
}
