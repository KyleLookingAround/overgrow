// One bot run: a new game from a seed, played hour by hour through `createSim()` and commands for a length of game
// time, with the player's policies asked each morning. It returns what the bot prints (src/../tools/bot.ts): the day
// each milestone was reached, the days it saw, the sealed garden's would-be totals, `PLAY` (a fingerprint of the saved
// state that affects play) and `ERR` (flows the sim couldn't move, and commands it refused). The same seed, player and
// code always give the same run: the only dice are the game's own.
import {START} from '../../src/data/ladder';
import {calendar} from '../../src/sim/clock';
import {createSim, type Command} from '../../src/sim/index';
import type {System} from '../../src/sim/clock';
import {SYSTEMS} from '../../src/sim/systems';
import {ALLOTMENT_ANSWER, Diary, isDug, Quiet, sealed, type Day, type Sealed} from './measure';
import {meetingOf, secondOf, secondPlot, shelfOf} from '../../src/sim/season';
import {takingsOf} from '../../src/sim/models/agency';
import {MILESTONES} from './milestones';
import {gardenStatus, goalOf} from '../../src/sim/goal';
import type {Snapshot} from '../../src/sim/state';

/** The offer's three numbers from a snapshot's goal. */
function offerOf(snap: Snapshot): Run['offer'] {
  const st = gardenStatus(goalOf({nodes: Object.fromEntries(snap.nodes.map((n) => [n.id, n]))} as never)), v = (k: string) => st.requirements.find((r) => r.key === k)?.value ?? 0;
  return {output: v('output'), reliability: v('reliability'), health: v('health'), weeks: Math.round(st.days / 7)};
}
import {allotmentPolicies, downPolicies, PLAYERS, policiesOf, type Player} from './player';
import {PLAYER_PLOT} from '../../src/data/allotment';

/** The hour of the morning the player looks at the garden and changes the plan. */
export const MORNING = 6;

export interface Run {
  seed: number;
  player: string;
  /** Game hours played. */
  hours: number;
  /** The game day each milestone was first reached, by id; a milestone not reached is missing. */
  reached: Record<string, number>;
  days: Day[];
  sealed: Sealed;
  /** Food that rotted, bolted or spoiled over the run, kg; and what was preserved and given to a neighbour. */
  wasted: number;
  preserved: number;
  given: number;
  /** kg CO₂e the garden put into the air over the run, less what it took back out. */
  carbon: number;
  /** The longest run of whole game days with nothing for the player to do or see (tools/bot/measure.ts's Quiet). */
  quiet: {days: number; from: number};
  /** Every quiet stretch of a week or more. */
  stretches: {days: number; from: number}[];
  /** The game day each thing was bought, in order. */
  bought: {id: string; day: number}[];
  /** The garden's step-up offer at the end (src/sim/goal.ts): Output kg a day, Reliability and Health, over its year. */
  offer: {output: number; reliability: number; health: number; weeks: number};
  /** Beds dug at the end, the two dug on day 1 among them. */
  beds: number;
  play: string;
  err: string[];
  /** The allotment, once the plot's taken: the step-up day, the days played there, the player's plot's kg a day and its
   *  numbers at the end, the household's groceries saved there, and the neighbours' plots. Null in the garden. */
  allotment: AllotmentRun | null;
  /** The last save's text, when the options asked for it. */
  save?: string;
}

export interface AllotmentRun {
  day: number;
  days: number;
  output: number;
  health: number;
  upkeep: number;
  saved: number;
  plan: string;
  neighbours: {output: number; health: number; neglected: number};
  /** The first season (src/sim/season.ts): the day the second plot was taken, the first swap's day, the vote's day and
   *  result, the helper's hidden take and what they reported (kg, all told), the second plot's kg a day and how far it's
   *  reclaimed, and the longest quiet stretch at the allotment. */
  season: {second: number | null; swap: number | null; vote: {day: number; motion: string; passed: boolean; yes: number; no: number} | null;
    hidden: number; reported: number; secondKg: number; reclaimed: number; quiet: {days: number; from: number}};
  /** The zoom back in (src/sim/zoom.ts): the outbreak's day, how it was met (down, sent or neither), the garden days to
   *  the rescue against the deadline's, the kg it cost the plot, and the plot's kg a day over the four weeks before it and
   *  from it (the dive's days counted at the garden's own). Null before the outbreak. */
  zoom: {day: number; how: 'down' | 'sent' | 'none'; days: number | null; deadline: number; kg: number; before: number; during: number} | null;
}
const dayAt = (hours: number | null | undefined) => (hours == null ? null : calendar(hours).dayIndex + 1);

/** The allotment's numbers at the end of a run. */
function allotmentOf(snap: Snapshot, day: number | null, kg: number, days: number, secondKg: number, quiet: Quiet['longest'], daily: Map<number, number>, went: boolean): AllotmentRun | null {
  if (day === null || snap.level < 2) return null;
  const plots = snap.nodes.filter((n) => n.kind === 'plot'), mine = plots.find((n) => n.id === PLAYER_PLOT)!, others = plots.filter((n) => n !== mine);
  const held = (n: Snapshot['nodes'][number]) => n.levers.holder as unknown as {neglected: boolean};
  const ledger = snap.nodes.find((n) => n.id === 'household')?.levers.ledger as unknown as {saved: number} | undefined;
  const mean = (l: number[]) => l.reduce((a, x) => a + x, 0) / Math.max(1, l.length);
  const g = {nodes: Object.fromEntries(snap.nodes.map((n) => [n.id, n])), edges: [], rev: 0} as never, sp = secondOf(secondPlot(g) ?? undefined);
  const helper = sp?.offer ? snap.nodes.find((n) => n.id === sp.offer) : undefined, t = helper ? takingsOf(helper) : null, m = meetingOf(g);
  const season: AllotmentRun['season'] = {
    second: dayAt(sp?.taken), swap: dayAt(shelfOf(g)?.first), hidden: t?.hidden ?? 0, reported: t?.reported ?? 0, secondKg: days ? secondKg / days : 0, reclaimed: sp?.reclaimed ?? 0, quiet,
    vote: m?.tally ? {day: dayAt(m.held)!, motion: m.motion, passed: m.tally.passes, yes: m.tally.yes, no: m.tally.no} : null,
  };
  return {
    day, days, output: days ? kg / days : 0, health: mine.totals.health, upkeep: mine.totals.upkeep, saved: ledger?.saved ?? 0,
    plan: `care ${String(mine.levers.care)} h, ${String(mine.levers.mix)}, ${String(mine.levers.feed)}`,
    neighbours: {output: mean(others.map((n) => n.totals.output)), health: mean(others.map((n) => n.totals.health)), neglected: (others.find((n) => held(n)?.neglected) ?? secondPlot(g))?.totals.health ?? 0},
    season, zoom: zoomOf(snap, daily, went),
  };
}

/** The zoom back in's line from the run's plot kg by game day. */
function zoomOf(snap: Snapshot, daily: Map<number, number>, went: boolean): AllotmentRun['zoom'] {
  const z = snap.zoom;
  if (!z) return null;
  const d0 = calendar(z.event.from).dayIndex + 1, mean = (a: number, b: number) => {
    let s = 0;
    for (let d = a; d < b; d++) s += daily.get(d) ?? 0;
    return s / (b - a);
  };
  return {
    day: d0, how: z.sent ? 'sent' : went ? 'down' : 'none', days: z.rescued ? (z.rescued.at - z.event.from) / 24 : null, deadline: (z.deadline - z.event.from) / 24,
    kg: z.kg, before: mean(d0 - 28, d0), during: mean(d0, d0 + 28),
  };
}

export interface Options {
  seed: number;
  /** Game hours to play. */
  hours: number;
  player?: Player;
  systems?: readonly System[];
  /** Keep the run's last save text in `save` (the `carry` check reads the sealed garden from it). */
  keepSave?: boolean;
}

/**
 * Game time from the command line, as game hours from the start: `120d` plays through the end of day 120 (day 1 starts
 * at 06:00), `2w` through the end of day 14, `1y` through day 365, `36h` 36 hours. A bare number is days.
 */
export function parseGameTime(s: string): number {
  const m = /^(\d+(?:\.\d+)?)([hdwy]?)$/.exec(s.trim());
  if (!m) throw new Error(`can't read the game time "${s}": use 120d, 2w, 1y or 36h`);
  const n = Number(m[1]), unit = m[2] || 'd';
  if (unit === 'h') return n;
  const days = n * {d: 1, w: 7, y: 365}[unit as 'd' | 'w' | 'y'];
  return Math.max(0, days * 24 - START.hour);
}

/** The saved state that affects play: the save less the speed (the real-time loop's) and what the player has seen. */
export function playState(save: string): string {
  const {speed: _speed, seen: _seen, ...rest} = JSON.parse(save) as Record<string, unknown>;
  return JSON.stringify(rest);
}

/** cyrb53: a 53-bit hash of a string, as 14 hex digits. Small and dependency-free, enough to tell two runs apart. */
export function fingerprint(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function play({seed, hours, player = PLAYERS.sensible!, systems = SYSTEMS, keepSave = false}: Options): Run {
  const sim = createSim(seed, systems), diary = new Diary(), quiet = new Quiet(), reached: Record<string, number> = {}, err: string[] = [], bought: Run['bought'] = [];
  const policies = policiesOf(player), watching = MILESTONES.filter((m) => m.reached);
  let snap = sim.snapshot();
  const send = (cmd: Command, day: number) => {
    const garden = snap.level === 1 && snap.zoom?.down == null;
    snap = sim.apply(cmd);
    if (snap.rejected) err.push(`day ${day}: ${cmd.type} ${JSON.stringify(cmd)} refused: ${snap.rejected}`);
    else {
      // a decision: the day isn't quiet (the garden's measure stops at the step up; the allotment's starts there)
      if (garden) quiet.mark(day);
      else quiet2?.mark(day);
      if (cmd.type === 'buy' && garden) bought.push({id: cmd.id, day});
      // a cordon planted from bare-root season's card is a purchase too
      if (cmd.type === 'card' && cmd.id === 'bare-root' && cmd.answer === 'plant') bought.push({id: 'cordon', day});
    }
  };
  const allot = allotmentPolicies(player), below = downPolicies(player);
  // the plot's kg by game day (the garden's eaten and sold while down), and whether the player went down
  const daily = new Map<number, number>();
  let went = false;
  let steppedUp: number | null = null, plotKg = 0, secondKg = 0, plotDays = 0, gardenOffer = offerOf(snap), quiet2: Quiet | null = null;
  while (snap.hours < hours) {
    const date = calendar(snap.hours), day = date.dayIndex + 1, level = snap.level;
    // each morning the level's policies; a policy that takes the plot ends the garden's for the day
    if (date.hour === MORNING)
      for (const policy of snap.zoom?.down != null ? below : level >= 2 ? allot : policies) {
        if (snap.level !== level) break;
        for (const cmd of policy({snap, day, date})) send(cmd, day);
      }
    if (snap.level >= 2 && steppedUp === null) (steppedUp = day), (quiet2 = new Quiet(ALLOTMENT_ANSWER, day));
    const down = snap.zoom?.down != null;
    if (down) went = true;
    if (snap.level === 1 && !down) gardenOffer = offerOf(snap);
    const before = snap;
    snap = sim.apply({type: 'tick', hours: snap.step});
    for (const e of snap.errors) err.push(`day ${day}: ${e}`);
    // the garden's diary keeps the garden's days; the allotment's are counted from the player's plot
    if (down) {
      // down in the garden: its kitchen's harvest stands in for the plot's, and the allotment's quiet measure goes on
      for (const f of snap.flows) if (f.what === 'harvest' && !('boundary' in f.to)) daily.set(day, (daily.get(day) ?? 0) + f.amount);
      quiet2?.watch(before, snap);
    } else if (snap.level === 1) diary.add(snap);
    else {
      for (const f of snap.flows) if (f.what === 'harvest' && !('boundary' in f.to) && f.to.node === PLAYER_PLOT) daily.set(day, (daily.get(day) ?? 0) + f.amount);
      for (const f of snap.flows) if (f.what === 'harvest' && !('boundary' in f.to) && f.to.node === PLAYER_PLOT) plotKg += f.amount;
      // the second plot's kg that came home (after the helper's share)
      for (const f of snap.flows) if (f.what === 'eaten from the second plot') secondKg += f.amount;
      quiet2?.watch(before, snap);
      plotDays += (snap.hours - before.hours) / 24;
    }
    if (before.level === 1 && steppedUp === null) quiet.watch(before, snap);
    for (const m of watching) if (!(m.id in reached) && m.reached!({snap, diary})) reached[m.id] = diary.current!.day;
  }
  diary.close();
  const days = diary.days;
  quiet.close(days.at(-1)?.day ?? 0);
  quiet2?.close(calendar(snap.hours).dayIndex + 1);
  return {
    seed, player: player.name, hours: snap.hours, reached, days, sealed: sealed(days),
    wasted: days.reduce((a, d) => a + d.wasted, 0), preserved: snap.kitchen?.preserved ?? 0, given: snap.kitchen?.given ?? 0, carbon: snap.carbon, quiet: quiet.longest, stretches: quiet.stretches, bought, offer: snap.level === 1 ? offerOf(snap) : gardenOffer, beds: snap.nodes.filter(isDug).length,
    play: fingerprint(playState(sim.save())), err, allotment: allotmentOf(snap, steppedUp, plotKg, plotDays, secondKg, quiet2?.longest ?? {days: 0, from: 0}, daily, went), ...(keepSave ? {save: sim.save()} : {}),
  };
}
