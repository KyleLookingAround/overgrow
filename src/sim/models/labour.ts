// Labour: the hours a person has by season and day of the week, the work a hectare of each crop needs by month, what a
// role costs, how skill stretches a job's time, and what doesn't fit waiting. docs/systems/labour.md says how it works
// and what the wiring part adds.
//
// Sources: Defra Farm Business Survey and the Agricultural Wages orders for the working week and its seasons; AHDB Farm
//   Management Pocketbook and Nix labour tables for hours a hectare by crop and their monthly spread; the National
//   Living Wage and the Agricultural Wages orders' grades for rough 2026 pay; the learning-curve literature on picking
//   and field work (a new hand takes about twice the time of an experienced one, and reaches their pace in weeks).
// Simplifies: hours are per role, season and weekday, with no bank holidays, sickness, weather days or overtime rules;
//   a crop's work is one figure a hectare spread by month, not by operation and machine (machinery.ts gives hand against
//   tractor hours); skill is one number 0–1 for each of three kinds of work, and time falls smoothly with it; work is
//   shared out in the order given, most skilled first, and what doesn't fit waits (the gardener's rule at farm scale:
//   tomorrow it is planned again); a hand's goals and integrity are the agency system's, and this model only reads the
//   hours cap in `goals`.
//   Fast effect: a day's hours spent and a job left waiting, a harvest week that doesn't fit. Slow effect: a hired hand's
//   skill and wages over the seasons, and a farm that grows past what one person can work.
import {CROP_WORK, DAY_HOURS, SKILL_FLOOR, WAGES, WAIT_LOSS_PER_WEEK, type Role, type Season, type SkillName} from '../../data/labour';
import type {CalendarDate, System} from '../clock';
import {qty, type GraphNode} from '../graph';

/** The lever a person keeps their worker record in, and the stock their hours left today are in. */
export const WORKER = 'worker';
export const HOURS_LEFT = 'hours';

/** A person who works: what they can do (`skills`) and what they want (`goals`). The agency system decides both; this model reads them. */
export interface Worker {
  id: string;
  role: Role;
  /** 0 (never done it) to 1 (experienced), by kind of work; a missing skill is the beginner's 0. */
  skills: Partial<Record<SkillName, number>>;
  /** What they want: `hoursCap` is the most they'll work in a day, when it's less than the role's hours. */
  goals: {hoursCap?: number};
}

// ---- hours ----

/** Hours a role has on a day, by season and weekday (0 Monday to 6 Sunday), less any cap the worker's goals set. */
export function dayHours(role: Role, d: Pick<CalendarDate, 'season' | 'weekday'>, goals: Worker['goals'] = {}) {
  const h = DAY_HOURS[role][d.season as Season], base = d.weekday >= 5 ? h.weekend : h.weekday;
  return goals.hoursCap === undefined ? base : Math.min(base, Math.max(0, goals.hoursCap));
}

/** Hours over a longer step of `days` days: the day's own for one day, and a week's mix (five weekdays, two weekend days) averaged beyond. */
export function hoursOver(role: Role, d: Pick<CalendarDate, 'season' | 'weekday'>, days: number, goals: Worker['goals'] = {}) {
  if (days <= 1) return dayHours(role, d, goals);
  const week = [0, 1, 2, 3, 4, 5, 6].reduce((s, weekday) => s + dayHours(role, {season: d.season, weekday}, goals), 0);
  return (week / 7) * days;
}

// ---- work ----

/** Hours of work a hectare of a crop needs in a month (1–12), by hand and small machine at experienced pace. */
export function workNeeded(crop: string, month: number, hectares = 1) {
  const w = CROP_WORK[crop];
  return w ? w.total * (w.months[month - 1] ?? 0) * hectares : 0;
}

/** The month a crop's work peaks in, 1–12. */
export const peakMonth = (crop: string) => {
  const m = CROP_WORK[crop]?.months ?? [];
  return m.indexOf(Math.max(...m, 0)) + 1;
};

/** How much longer a job takes at a skill (0–1): 2 for a beginner, 1 for an experienced hand. */
export const timeFactor = (skill: number) => 1 / (SKILL_FLOOR + (1 - SKILL_FLOOR) * Math.min(1, Math.max(0, skill)));

/** A worker's time factor for a kind of work. */
export const factorOf = (w: Worker, kind: SkillName) => timeFactor(w.skills[kind] ?? 0);

// ---- pay ----

/** What some hours of a role cost in cash, £: the wage and the employer's on-cost. */
export const wageCost = (role: Role, hours: number) => hours * WAGES[role].hourly * (1 + WAGES[role].onCost);

/** What an hour of work is worth when it would otherwise wait `weeks` weeks: the crop's margin an hour of its work, less a quarter for each week it waits. */
export function waitValue(crop: string, weeks = 2) {
  const w = CROP_WORK[crop];
  return w ? (w.margin / w.total) * Math.min(1, WAIT_LOSS_PER_WEEK * weeks) : 0;
}

export interface Hire {
  /** Hours of work that would have waited and now doesn't. */
  saved: number;
  /** What those hours are worth, £, and what the hand costs for the hours they're paid for, £. */
  value: number;
  wages: number;
  net: number;
}

/**
 * Whether a hired hand pays back in a period: `demand` is the work due (hours at experienced pace), `ownHours` the hours
 * the people already there can work (at experienced pace when `ownSkill` is 1, its default), `handHours` the hand's paid
 * hours and `handSkill` their skill. The hand only earns their wage on work that would otherwise wait; when everything
 * fits without them their wages are all cost.
 */
export function hireBenefit(o: {crop: string; demand: number; ownHours: number; handHours: number; handSkill?: number; ownSkill?: number; weeks?: number; role?: Role}): Hire {
  const role = o.role ?? 'hired hand', done = o.handHours / timeFactor(o.handSkill ?? 0.5), own = o.ownHours / timeFactor(o.ownSkill ?? 1);
  const waitsWithout = Math.max(0, o.demand - own), waitsWith = Math.max(0, o.demand - own - done);
  const saved = waitsWithout - waitsWith, value = saved * waitValue(o.crop, o.weeks), wages = wageCost(role, o.handHours);
  return {saved, value, wages, net: value - wages};
}

// ---- fitting the work in ----

/** A piece of work: hours at experienced pace, of a kind of work; jobs are taken in the order given. */
export interface WorkJob {
  id: string;
  work: number;
  kind: SkillName;
}

export interface Fit {
  /** Work done, by job, in hours at experienced pace. */
  done: Record<string, number>;
  /** Work left waiting, by job (only jobs with some left). */
  waiting: Record<string, number>;
  /** Hours each worker spent. */
  used: Record<string, number>;
}

/**
 * Shares jobs out among workers with hours left, in the order given, the most skilled first for each: a worker gives what
 * they have and a slower worker does less in it. What doesn't fit waits, to be planned again tomorrow.
 */
export function fit(jobs: WorkJob[], workers: Worker[], hoursLeft: Record<string, number>): Fit {
  const left = {...hoursLeft}, out: Fit = {done: {}, waiting: {}, used: {}};
  for (const j of jobs) {
    let todo = j.work;
    for (const w of [...workers].sort((a, b) => factorOf(a, j.kind) - factorOf(b, j.kind))) {
      if (todo <= 1e-9) break;
      const have = left[w.id] ?? 0, f = factorOf(w, j.kind), time = Math.min(have, todo * f);
      if (time <= 1e-9) continue;
      left[w.id] = have - time;
      out.used[w.id] = (out.used[w.id] ?? 0) + time;
      out.done[j.id] = (out.done[j.id] ?? 0) + time / f;
      todo -= time / f;
    }
    if (todo > 1e-9) out.waiting[j.id] = todo;
  }
  return out;
}

// ---- on the graph ----

/** A node's worker record, if it's a person who works. */
export const workerOf = (n: GraphNode) => (n.levers[WORKER] as unknown as Worker | undefined) ?? null;

/** The labour system: each morning a worker's unused hours go back to `time` and the day's come from it, as the gardener's do. Not yet listed in src/sim/systems.ts (part 13 does). */
export const labour: System = {
  name: 'labour',
  on: {
    day(c) {
      const days = Math.max(1, c.dt / 24);
      for (const n of Object.values(c.graph.nodes)) {
        const w = workerOf(n);
        if (!w) continue;
        const left = n.stocks[HOURS_LEFT]?.amount ?? 0;
        if (left > 1e-9) c.flow({what: 'unused', unit: 'h', amount: qty(left, 'h'), from: {node: n.id, stock: HOURS_LEFT}, to: {boundary: 'time'}});
        const given = hoursOver(w.role, c.date, days, w.goals);
        if (given > 1e-9) c.flow({what: 'a day’s hours', unit: 'h', amount: qty(given, 'h'), from: {boundary: 'time'}, to: {node: n.id, stock: HOURS_LEFT}});
      }
    },
  },
};
