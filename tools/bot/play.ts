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
import {Diary, sealed, type Day, type Sealed} from './measure';
import {MILESTONES} from './milestones';
import {PLAYERS, policiesOf, type Player} from './player';

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
  /** Food that rotted, bolted or spoiled over the run, kg. */
  wasted: number;
  /** kg CO₂e the garden put into the air over the run, less what it took back out. */
  carbon: number;
  play: string;
  err: string[];
}

export interface Options {
  seed: number;
  /** Game hours to play. */
  hours: number;
  player?: Player;
  systems?: readonly System[];
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

export function play({seed, hours, player = PLAYERS.sensible!, systems = SYSTEMS}: Options): Run {
  const sim = createSim(seed, systems), diary = new Diary(), reached: Record<string, number> = {}, err: string[] = [];
  const policies = policiesOf(player), watching = MILESTONES.filter((m) => m.reached);
  let snap = sim.snapshot();
  const send = (cmd: Command, day: number) => {
    snap = sim.apply(cmd);
    if (snap.rejected) err.push(`day ${day}: ${cmd.type} ${JSON.stringify(cmd)} refused: ${snap.rejected}`);
  };
  while (snap.hours < hours) {
    const date = calendar(snap.hours), day = date.dayIndex + 1;
    if (date.hour === MORNING) for (const policy of policies) for (const cmd of policy({snap, day, date})) send(cmd, day);
    snap = sim.apply({type: 'tick', hours: snap.step});
    for (const e of snap.errors) err.push(`day ${day}: ${e}`);
    diary.add(snap);
    for (const m of watching) if (!(m.id in reached) && m.reached!({snap, diary})) reached[m.id] = diary.current!.day;
  }
  diary.close();
  const days = diary.days;
  return {
    seed, player: player.name, hours: snap.hours, reached, days, sealed: sealed(days),
    wasted: days.reduce((a, d) => a + d.wasted, 0), carbon: snap.carbon, play: fingerprint(playState(sim.save())), err,
  };
}
