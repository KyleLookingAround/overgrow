// What the bot measures as it plays: each game day's food harvested, eaten, sold and wasted, the household's money and
// the dug beds' soil health, read only from the snapshots (never from the sim's state): the food from the kitchen's
// ledger (src/sim/models/kitchen.ts), which counts every kg picked, eaten, gone off or left to rot, and sold. The
// sealed garden's would-be totals (the founding spec, "The carry-over rule") are worked out here over the last 28 days,
// the way part 7's sealing will: Output as food delivered a day, Reliability as 100 × (1 − its coefficient of
// variation), Health as the dug beds' mean soil health.
import {calendar} from '../../src/sim/clock';
import type {Snapshot} from '../../src/sim/state';

/** The window the sealed totals are taken over (the founding spec, "What makes the jump feel earned"). */
export const WINDOW_DAYS = 28;

/** One game day, as the bot saw it. */
export interface Day {
  /** Day 1 is the game's first day. */
  day: number;
  /** kg of food that left the garden to be eaten or sold: the node's Output. */
  delivered: number;
  /** kg of food eaten in the household. */
  eaten: number;
  /** kg of food sold at the gate. */
  sold: number;
  /** kg of food harvested from the beds. */
  harvested: number;
  /** kg of food that rotted, bolted or spoiled before it was eaten or sold. */
  wasted: number;
  /** The household's money at the end of the day, £. */
  money: number;
  /** The dug beds' mean soil health at the end of the day, 0–100. */
  health: number;
  /** kg CO₂e the level has put into the air since the start, at the end of the day. */
  carbon: number;
}

/** The game day a step ending at `hours` belongs to: the step from 23:00 to midnight is still the day before. */
export const dayOf = (hours: number, step = 1) => calendar(hours - step / 2).dayIndex + 1;

/** The kitchen's running totals since the start (its ledger, carried in the snapshot), kg. */
const totalsOf = (s: Snapshot) => {
  const k = s.kitchen;
  return {harvested: k?.picked ?? 0, eaten: k?.eaten ?? 0, sold: k?.sold ?? 0, wasted: k?.wasted ?? 0};
};

/** A dug bed: one with land under crops. */
export const isDug = (n: Snapshot['nodes'][number]) => n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0;

export function meanHealth(s: Snapshot): number {
  const beds = s.nodes.filter(isDug);
  return beds.length ? beds.reduce((a, n) => a + n.totals.health, 0) / beds.length : 0;
}

/** Adds up the days as the ticks come in. */
export class Diary {
  readonly days: Day[] = [];
  private today: Day | null = null;
  /** The ledger's totals at the end of the last closed day. */
  private before = {harvested: 0, eaten: 0, sold: 0, wasted: 0};

  /** One tick's snapshot: it goes to the day the tick belongs to, and a day closes when the next one starts. */
  add(s: Snapshot): void {
    const day = dayOf(s.hours, s.step);
    if (this.today && this.today.day !== day) this.close();
    const t = (this.today ??= {day, delivered: 0, eaten: 0, sold: 0, harvested: 0, wasted: 0, money: 0, health: 0, carbon: 0});
    const now = totalsOf(s);
    for (const k of ['harvested', 'eaten', 'sold', 'wasted'] as const) t[k] = now[k] - this.before[k];
    t.delivered = t.eaten + t.sold;
    t.money = s.money;
    t.health = meanHealth(s);
    t.carbon = s.carbon;
    this.last = now;
  }

  private last = this.before;

  /** The day being added to, if any. */
  get current(): Day | null {
    return this.today;
  }

  close(): void {
    if (this.today) this.days.push(this.today);
    this.today = null;
    this.before = this.last;
  }
}

export interface Sealed {
  /** kg of food delivered a day over the window. */
  output: number;
  /** 100 × (1 − the coefficient of variation of the days' output), 0–100. */
  reliability: number;
  /** The dug beds' mean soil health over the window, 0–100. */
  health: number;
}

/** The garden's would-be totals if it were sealed now: over the last 28 whole days (or all of them, if fewer). */
export function sealed(days: readonly Day[], window = WINDOW_DAYS): Sealed {
  const w = days.slice(-window);
  if (!w.length) return {output: 0, reliability: 0, health: 0};
  const mean = w.reduce((a, d) => a + d.delivered, 0) / w.length;
  const sd = Math.sqrt(w.reduce((a, d) => a + (d.delivered - mean) ** 2, 0) / w.length);
  const reliability = mean > 0 ? Math.min(100, Math.max(0, 100 * (1 - sd / mean))) : 0;
  return {output: mean, reliability, health: w.reduce((a, d) => a + d.health, 0) / w.length};
}
