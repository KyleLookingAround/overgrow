// How long each level takes in real time on the page (the one map's clock, docs/decisions/ADR-2026-09-30-zoom-is-the-speed.md):
// at the level's widest view (src/data/ladder.ts's secondsPerDay), its quiet nights passing QUIET_BOOST times faster as
// the page runs them (src/ui/quiet-night.ts), and again with every skip the page would offer taken, each a time-lapse of
// SKIP.seconds, ended at its hour or at the first wake the sim records (its WAKES, or something newly unfolded). The bot
// plays without a clock and never skips: this is its estimate of the player's minutes, for the brief's "a garden year is
// at most about 53 minutes". A frost forecast on tender crops also wakes a real skip; the estimate misses those, so its
// skipped time is a little short.
import {LEVELS, QUIET_BOOST, QUIET_MOST, SKIP, START} from '../../src/data/ladder';
import {calendar} from '../../src/sim/clock';
import {hourOf, type WeatherDay} from '../../src/sim/models/weather';
import {WAKES} from '../../src/sim/skip';
import type {Snapshot} from '../../src/sim/state';
import {quietUntil} from '../../src/ui/quiet-night';

export interface LevelPace {
  /** Game days at the level. */
  days: number;
  /** Real seconds at its widest view with its quiet nights, and with the skips offered taken. */
  secs: number;
  skipped: number;
  /** The skips offered and taken, and how many a wake ended early. */
  skips: number;
  woken: number;
}

const weatherHour = (s: Snapshot) => {
  const day = s.nodes.find((n) => n.kind === 'atmosphere')?.levers.weather as unknown as WeatherDay | null | undefined;
  return day && day.day === calendar(s.hours).dayIndex ? hourOf(day, (s.hours + START.hour) % 24) : null;
};

export class Pace {
  readonly levels = new Map<number, LevelPace>();
  private skip: {from: number; until: number} | null = null;

  /** One tick, from the snapshot before it to the one after. */
  watch(before: Snapshot, after: Snapshot) {
    const level = before.level, dh = after.hours - before.hours;
    if (dh <= 0) return;
    const p = this.levels.get(level) ?? {days: 0, secs: 0, skipped: 0, skips: 0, woken: 0};
    this.levels.set(level, p);
    const base = 24 / LEVELS[level - 1]!.secondsPerDay, running = {...before, speed: 1 as const};
    const quiet = quietUntil(running, before.hours, weatherHour(before)) !== null;
    const secs = dh / (quiet ? Math.max(base, Math.min(base * QUIET_BOOST, QUIET_MOST)) : base);
    p.days += dh / 24;
    p.secs += secs;
    if (!this.skip && before.due && before.due.hours > before.hours) {
      this.skip = {from: before.hours, until: before.due.hours};
      p.skips++;
    }
    if (!this.skip) return void (p.skipped += secs);
    p.skipped += (dh / (this.skip.until - this.skip.from)) * SKIP.seconds;
    const woke = after.effects.some((e) => e.amount > 0 && WAKES.has(e.cause)) || after.seen.length > before.seen.length || after.level !== level;
    if (after.hours >= this.skip.until - 1e-9 || woke) {
      if (after.hours < this.skip.until - 1e-9) p.woken++;
      this.skip = null;
    }
  }
}

/** The report's line: each level's minutes at its widest view, and with the skips offered taken. */
export function paceLine(levels: ReadonlyMap<number, LevelPace>): string {
  const min = (s: number) => (s / 60).toFixed(1);
  return `PACE {${[...levels].map(([l, p]) => `${l}: ${p.days.toFixed(0)} days in ${min(p.secs)} min, ${min(p.skipped)} with ${p.skips} skips (${p.woken} woken)`).join('; ')}}`;
}
