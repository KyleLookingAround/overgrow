// How dark the map is at a game hour: the sun's day length at a southern-English latitude from the date, with an hour's
// twilight either side. Cosmetic: nothing here changes the game, and part 2's weather owns the real sun.
// Day length from the solar declination (Cooper 1969) and the sunrise hour angle, solar noon taken as 12:00.
import {hoursPerSecond, type CalendarDate} from '../../sim/clock';
import {QUIET_BOOST, QUIET_MOST, type Speed} from '../../data/ladder';

const LAT = (51.5 * Math.PI) / 180;

/** 0 in full day, 1 in full night. */
export function darkness(d: CalendarDate): number {
  const decl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + d.dayOfYear)) / 365);
  const cos = -Math.tan(LAT) * Math.tan(decl), half = (Math.acos(Math.min(1, Math.max(-1, cos))) * 12) / Math.PI; // hours from noon to sunset
  const h = d.hour + d.minute / 60, fromNoon = Math.abs(h - 12);
  return Math.min(1, Math.max(0, fromNoon - half + 0.5)); // an hour of twilight centred on sunrise and sunset
}

// The steady light: at speed a game day passes in a second or less, and a night layer following darkness() would flash
// the whole map between day and night more than once a second (the owner's complaint; WCAG 2.3.1 allows at most three
// flashes a second, and far fewer is comfortable). So below STEADY_DAY_S a day the map holds a steady light, and every
// full-map light layer eases at no more than LIGHT_MOST a second, whatever the speed, a load or a jump asks.

/** Below this many real seconds a game day (at the pace it's passing, a quiet night's included), the map holds a steady
 *  light instead of cycling: the eases below take about 1¾ s each way, so a shorter day spends most of itself easing
 *  (a slow pulse every few seconds, never a clear day or night). 1× in the back garden (12 s a day) still cycles; 2×
 *  (6 s), the allotment (4 s at 1×) and every level above hold. */
export const STEADY_DAY_S = 8;
/** The fastest a full-map light layer's opacity may change, a second: the full night (--map-night-max, 0.35) falls in
 *  about 1¾ s, a gentle fade the eye follows rather than a flash. */
export const LIGHT_MOST = 0.2;
/** How long a held light must be asked for before the map darkens towards it (it lightens at once): a quiet night at 2×
 *  to 16× lasts under a real second (a fifth of one at 8× and 16×), too short to dim for and back. */
export const SETTLE_S = 1;

/** Real seconds a game day takes at a level and speed, a quiet night at its pace as the clock loop runs it
 *  (src/app/clock-loop.ts); a paused day never ends. */
export function daySeconds(level: number, speed: Speed, quiet: boolean): number {
  const base = hoursPerSecond(level, speed), rate = quiet ? Math.max(base, Math.min(base * QUIET_BOOST, QUIET_MOST)) : base;
  return rate > 0 ? 24 / rate : Infinity;
}

/**
 * One full-map light layer's opacity, frame by frame: `raw` (what the hour asks for) while a day lasts STEADY_DAY_S or
 * more, otherwise `held` (the steady light: 0 by day, a fixed dim for a quiet night), darkening only once it has been asked
 * for SETTLE_S;
 * either way moving at most LIGHT_MOST a second towards it. The first frame shows its target at once. `now` in ms.
 */
export function steadyLight(): (raw: number, held: number, day: number, now: number) => number {
  let shown = NaN, last = 0, want = NaN, since = 0;
  return (raw, held, day, now) => {
    const steady = day < STEADY_DAY_S, dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); // a hidden tab's gap counts as a short one
    last = now;
    if (steady && held !== want) [want, since] = [held, now];
    if (!steady) want = NaN;
    if (Number.isNaN(shown)) return (shown = steady ? held : raw);
    const to = !steady ? raw : held <= shown || now - since >= SETTLE_S * 1000 ? held : shown; // lighter at once, darker once settled
    return (shown += Math.min(LIGHT_MOST * dt, Math.max(-LIGHT_MOST * dt, to - shown)));
  };
}
