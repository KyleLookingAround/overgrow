// The page's memory of recent effects: every snapshot's effects (src/sim/effects.ts) added up over the last week of game
// time by cause, place and unit, so a place's panel can list what happened there and each opens its Explain card. Only
// the screen needs it, so it lives here, never in the sim or the save; a new game or a load starts it again.
import type {Effect} from '../sim/effects';
import type {Snapshot} from '../sim/state';

export interface Logged extends Effect {
  /** Added up over the window, and the latest step's own amount. */
  total: number;
  last: number;
  /** Game hours it last happened. */
  hours: number;
}

/** Game hours an effect stays in the log. */
export const WINDOW = 24 * 7;

export class EffectsLog {
  private by = new Map<string, Logged>();
  private seed = -1;
  private hours = -Infinity;
  /** Goes up with every snapshot added, so a view can tell it changed. */
  rev = 0;
  add(s: Snapshot) {
    if (s.seed !== this.seed || s.hours < this.hours) this.by.clear();
    this.seed = s.seed;
    if (s.hours === this.hours) return;
    this.hours = s.hours;
    for (const e of s.effects) {
      const k = e.cause + '|' + e.at + '|' + e.unit, had = this.by.get(k);
      if (had) this.by.set(k, {...had, total: had.total + e.amount, last: e.amount, amount: e.amount, hours: s.hours});
      else this.by.set(k, {...e, total: e.amount, last: e.amount, hours: s.hours});
    }
    for (const [k, e] of this.by) if (e.hours < s.hours - WINDOW) this.by.delete(k);
    this.rev++;
  }
  /** What happened at a place, most recent first. */
  at(node: string): Logged[] {
    return [...this.by.values()].filter((e) => e.at === node).sort((a, b) => b.hours - a.hours || a.cause.localeCompare(b.cause));
  }
  /** Everything in the window, most recent first. */
  all(): Logged[] {
    return [...this.by.values()].sort((a, b) => b.hours - a.hours);
  }
}
