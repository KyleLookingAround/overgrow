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
import {Diary, isDug, Quiet, sealed, type Day, type Sealed} from './measure';
import {MILESTONES} from './milestones';
import {gardenStatus, goalOf} from '../../src/sim/goal';
import type {Snapshot} from '../../src/sim/state';

/** The offer's three numbers from a snapshot's goal. */
function offerOf(snap: Snapshot): Run['offer'] {
  const st = gardenStatus(goalOf({nodes: Object.fromEntries(snap.nodes.map((n) => [n.id, n]))} as never)), v = (k: string) => st.requirements.find((r) => r.key === k)?.value ?? 0;
  return {output: v('output'), reliability: v('reliability'), health: v('health'), weeks: Math.round(st.days / 7)};
}
import {allotmentPolicies, PLAYERS, policiesOf, type Player} from './player';
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
}

/** The allotment's numbers at the end of a run. */
function allotmentOf(snap: Snapshot, day: number | null, kg: number, days: number): AllotmentRun | null {
  if (day === null || snap.level < 2) return null;
  const plots = snap.nodes.filter((n) => n.kind === 'plot'), mine = plots.find((n) => n.id === PLAYER_PLOT)!, others = plots.filter((n) => n !== mine);
  const held = (n: Snapshot['nodes'][number]) => n.levers.holder as unknown as {neglected: boolean};
  const ledger = snap.nodes.find((n) => n.id === 'household')?.levers.ledger as unknown as {saved: number} | undefined;
  const mean = (l: number[]) => l.reduce((a, x) => a + x, 0) / Math.max(1, l.length);
  return {
    day, days, output: days ? kg / days : 0, health: mine.totals.health, upkeep: mine.totals.upkeep, saved: ledger?.saved ?? 0,
    plan: `care ${String(mine.levers.care)} h, ${String(mine.levers.mix)}, ${String(mine.levers.feed)}`,
    neighbours: {output: mean(others.map((n) => n.totals.output)), health: mean(others.map((n) => n.totals.health)), neglected: others.find((n) => held(n)?.neglected)?.totals.health ?? 0},
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
    snap = sim.apply(cmd);
    if (snap.rejected) err.push(`day ${day}: ${cmd.type} ${JSON.stringify(cmd)} refused: ${snap.rejected}`);
    else {
      // a decision: the day isn't quiet
      quiet.mark(day);
      if (cmd.type === 'buy') bought.push({id: cmd.id, day});
      // a cordon planted from bare-root season's card is a purchase too
      if (cmd.type === 'card' && cmd.id === 'bare-root' && cmd.answer === 'plant') bought.push({id: 'cordon', day});
    }
  };
  const allot = allotmentPolicies(player);
  let steppedUp: number | null = null, plotKg = 0, plotDays = 0, gardenOffer = offerOf(snap);
  while (snap.hours < hours) {
    const date = calendar(snap.hours), day = date.dayIndex + 1, level = snap.level;
    // each morning the level's policies; a policy that takes the plot ends the garden's for the day
    if (date.hour === MORNING)
      for (const policy of level >= 2 ? allot : policies) {
        if (snap.level !== level) break;
        for (const cmd of policy({snap, day, date})) send(cmd, day);
      }
    if (snap.level >= 2 && steppedUp === null) steppedUp = day;
    if (snap.level === 1) gardenOffer = offerOf(snap);
    const before = snap;
    snap = sim.apply({type: 'tick', hours: snap.step});
    for (const e of snap.errors) err.push(`day ${day}: ${e}`);
    // the garden's diary keeps the garden's days; the allotment's are counted from the player's plot
    if (snap.level === 1) diary.add(snap);
    else {
      for (const f of snap.flows) if (f.what === 'harvest' && !('boundary' in f.to) && f.to.node === PLAYER_PLOT) plotKg += f.amount;
      plotDays += (snap.hours - before.hours) / 24;
    }
    quiet.watch(before, snap);
    for (const m of watching) if (!(m.id in reached) && m.reached!({snap, diary})) reached[m.id] = diary.current!.day;
  }
  diary.close();
  const days = diary.days;
  quiet.close(days.at(-1)?.day ?? 0);
  return {
    seed, player: player.name, hours: snap.hours, reached, days, sealed: sealed(days),
    wasted: days.reduce((a, d) => a + d.wasted, 0), preserved: snap.kitchen?.preserved ?? 0, given: snap.kitchen?.given ?? 0, carbon: snap.carbon, quiet: quiet.longest, stretches: quiet.stretches, bought, offer: snap.level === 1 ? offerOf(snap) : gardenOffer, beds: snap.nodes.filter(isDug).length,
    play: fingerprint(playState(sim.save())), err, allotment: allotmentOf(snap, steppedUp, plotKg, plotDays), ...(keepSave ? {save: sim.save()} : {}),
  };
}
