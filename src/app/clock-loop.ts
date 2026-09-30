// The real-time loop: turns real seconds into the sim's fixed steps at the level's rate and the chosen speed (the
// ladder, src/data/ladder.ts), and gives the map a view time between two snapshots to interpolate at. The sim is kept up
// to two steps ahead of what's shown (two frames' worth at a fast pace), so the map never waits on it; pausing freezes
// the view at once. The game only runs while the page is open and showing: a hidden tab gets no frames, and a long gap
// between frames counts as a short one.
// A quiet night the page names (src/ui/quiet-night.ts) passes QUIET_BOOST times faster (at most QUIET_MOST game hours a
// second), up to its dawn: the same steps.
// docs/systems/clock.md says how it works.
import {hoursPerSecond} from '../sim/clock';
import {QUIET_BOOST, QUIET_MOST, type Speed} from '../data/ladder';
import type {Snapshot} from '../sim/state';
import type {SimClient} from './sim-client';

/** What the map draws: the snapshots either side of the view time, and how far between them it is. */
export interface View {
  prev: Snapshot;
  cur: Snapshot;
  /** Game hours the map is showing. */
  hours: number;
  /** 0 at prev, 1 at cur. */
  alpha: number;
  /** A quiet night passing quickly now. */
  quiet: boolean;
}

export interface Loop {
  view(): View | null;
  /** The newest snapshot, up to two steps ahead of the view: the speed the player last set is read here. */
  latest(): Snapshot | null;
  /** Called every frame with the view, after the clock moves; returns a function that stops it. */
  onFrame(fn: (v: View, now: number) => void): () => void;
  /** Check-only: replace the game with a synthetic scene of n nodes and m people (n by default) at a speed (4× by
   *  default, the busiest the first levels get); 0 nodes stops it. */
  bench(n: number, m?: number, speed?: number): void;
  /** Whether a bench is running (the panels ignore its snapshots). */
  benching(): boolean;
  /** Movement jumps per tick instead of gliding (prefers-reduced-motion). */
  setReducedMotion(on: boolean): void;
  /** A quiet night up to a game hour (its dawn), passing QUIET_BOOST times faster until then; null when it isn't. */
  setQuiet(until: number | null): void;
}

const AHEAD = 2, MAX_STEPS = 8, MAX_GAP = 0.25, JUMP = 4;

export function createLoop(sim: SimClient): Loop {
  let queue: Snapshot[] = [], target = 0, inFlight = false, last = 0, reduced = false, benchN = 0, benchM = 0, benchRate = 4;
  let quiet: number | null = null, fast = false, asked = 0; // asked: the furthest hour the loop has asked the sim for // the quiet night's dawn, and whether it's passing quickly now
  let game: Snapshot | null = null; // the game's latest, kept while a bench runs
  const frames: ((v: View, now: number) => void)[] = [];

  const take = (s: Snapshot) => {
    const top = queue[queue.length - 1];
    if (!top || s.hours < top.hours || s.seed !== top.seed || s.level !== top.level) {
      queue = [s]; // a new game, a load, a step up to the next level, or the bench starting: start the view here
      target = s.hours;
      asked = s.hours;
    } else if (s.hours === top.hours) queue[queue.length - 1] = s;
    else queue.push(s);
  };
  sim.onSnapshot((s) => {
    if (benchN) game = s; // the game's replies while benching wait here
    else take(s);
  });

  const request = (top: Snapshot, rate: number, dt: number) => {
    // two steps ahead, or two frames' worth of game hours at a fast pace on a slow page
    const lead = Math.min(MAX_STEPS * top.step, Math.max(AHEAD * top.step, AHEAD * rate * dt));
    const steps = Math.min(MAX_STEPS, Math.ceil((target + lead - top.hours) / top.step));
    if (steps < 1) return;
    inFlight = true;
    const done = () => void (inFlight = false);
    asked = Math.max(asked, top.hours + (benchN ? 1 : steps) * top.step);
    if (benchN) {
      const n = benchN, m = benchM;
      sim.bench(n, m, top.hours + top.step).then((s) => {
        done();
        if (benchN === n && benchM === m) take(s);
      }, done);
    }
    else sim.send({type: 'tick', hours: steps * top.step}).then(done, done);
  };

  const view = (): View | null => {
    if (!queue.length) return null;
    let i = queue.length - 1;
    while (i > 0 && queue[i - 1]!.hours >= target) i--;
    const cur = queue[i]!, prev = queue[Math.max(0, i - 1)]!;
    const span = cur.hours - prev.hours, alpha = span > 0 ? Math.min(1, Math.max(0, (target - prev.hours) / span)) : 1;
    if (reduced) return alpha >= 1 ? {prev: cur, cur, hours: cur.hours, alpha: 1, quiet: fast} : {prev, cur: prev, hours: prev.hours, alpha: 1, quiet: fast};
    return {prev, cur, hours: target, alpha, quiet: fast};
  };

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(MAX_GAP, (now - last) / 1000) : 0;
    last = now;
    const top = queue[queue.length - 1];
    if (!top) return;
    const base = benchN ? benchRate : hoursPerSecond(top.level, top.speed);
    // a quiet night passes faster, handing back at its dawn
    fast = !benchN && base > 0 && quiet !== null && target < quiet;
    const rate = fast ? Math.max(base, Math.min(base * QUIET_BOOST, QUIET_MOST)) : base;
    target = Math.min(target + dt * rate, fast ? quiet! : Infinity, top.hours);
    // moved far ahead by a command, past what the loop asked for itself: catch up at once
    if (top.hours - target > JUMP * top.step && top.hours > asked + 1e-9) target = top.hours - top.step;
    // drop what's behind the view, keeping the one just before it to interpolate from
    while (queue.length > 2 && queue[1]!.hours <= target) queue.shift();
    if (!inFlight && rate > 0) request(top, rate, dt);
    const v = view();
    if (v) for (const fn of frames) fn(v, now);
  };
  requestAnimationFrame(frame);

  return {
    view,
    latest: () => queue[queue.length - 1] ?? null,
    onFrame(fn) {
      frames.push(fn);
      return () => void frames.splice(frames.indexOf(fn) >>> 0, 1);
    },
    setReducedMotion: (on) => void (reduced = on),
    setQuiet: (until) => void (quiet = until),
    benching: () => benchN > 0,
    bench(n, m = n, speed = 4) {
      benchRate = hoursPerSecond(1, speed as Speed);
      if (n === benchN && m === benchM) return;
      if (!benchN && n) game = queue[queue.length - 1] ?? null;
      benchN = n;
      benchM = m;
      inFlight = false;
      if (n) {
        queue = [];
        void sim.bench(n, m, 0).then((s) => void (benchN === n && take(s)));
      }
      else if (game) {
        queue = [];
        take(game);
      }
    },
  };
}
