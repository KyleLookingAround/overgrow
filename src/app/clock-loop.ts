// The real-time loop: turns real seconds into the sim's fixed steps at the level's rate and the chosen speed (the
// ladder, src/data/ladder.ts), and gives the map a view time between two snapshots to interpolate at. The sim is kept up
// to two steps ahead of what's shown, so the map never waits on it; pausing freezes the view at once. The game only runs
// while the page is open and showing: a hidden tab gets no frames, and a long gap between frames counts as a short one.
// docs/systems/clock.md says how it works.
import {hoursPerSecond} from '../sim/clock';
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
}

export interface Loop {
  view(): View | null;
  /** The newest snapshot, up to two steps ahead of the view: the speed the player last set is read here. */
  latest(): Snapshot | null;
  /** Called every frame with the view, after the clock moves. */
  onFrame(fn: (v: View, now: number) => void): void;
  /** Check-only: replace the game with a synthetic scene of n nodes and m people, n by default (0 stops it). */
  bench(n: number, m?: number): void;
  /** Whether a bench is running (the panels ignore its snapshots). */
  benching(): boolean;
  /** Movement jumps per tick instead of gliding (prefers-reduced-motion). */
  setReducedMotion(on: boolean): void;
}

const AHEAD = 2, MAX_STEPS = 8, MAX_GAP = 0.25, JUMP = 4;
/** The bench runs at the garden's 4×, four ticks a second, the busiest the first levels get. */
const BENCH_RATE = 4;

export function createLoop(sim: SimClient): Loop {
  let queue: Snapshot[] = [], target = 0, inFlight = false, last = 0, reduced = false, benchN = 0, benchM = 0;
  let game: Snapshot | null = null; // the game's latest, kept while a bench runs
  const frames: ((v: View, now: number) => void)[] = [];

  const take = (s: Snapshot) => {
    const top = queue[queue.length - 1];
    if (!top || s.hours < top.hours || s.seed !== top.seed) {
      queue = [s]; // a new game, a load, or the bench starting: start the view here
      target = s.hours;
    } else if (s.hours === top.hours) queue[queue.length - 1] = s;
    else queue.push(s);
  };
  sim.onSnapshot((s) => {
    if (benchN) game = s; // the game's replies while benching wait here
    else take(s);
  });

  const request = (top: Snapshot) => {
    const steps = Math.min(MAX_STEPS, Math.ceil((target + AHEAD * top.step - top.hours) / top.step));
    if (steps < 1) return;
    inFlight = true;
    const done = () => void (inFlight = false);
    if (benchN) sim.bench(benchN, benchM, top.hours + top.step).then((s) => {
      done();
      if (benchN) take(s);
    }, done);
    else sim.send({type: 'tick', hours: steps * top.step}).then(done, done);
  };

  const view = (): View | null => {
    if (!queue.length) return null;
    let i = queue.length - 1;
    while (i > 0 && queue[i - 1]!.hours >= target) i--;
    const cur = queue[i]!, prev = queue[Math.max(0, i - 1)]!;
    const span = cur.hours - prev.hours, alpha = span > 0 ? Math.min(1, Math.max(0, (target - prev.hours) / span)) : 1;
    if (reduced) return alpha >= 1 ? {prev: cur, cur, hours: cur.hours, alpha: 1} : {prev, cur: prev, hours: prev.hours, alpha: 1};
    return {prev, cur, hours: target, alpha};
  };

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(MAX_GAP, (now - last) / 1000) : 0;
    last = now;
    const top = queue[queue.length - 1];
    if (!top) return;
    const rate = benchN ? BENCH_RATE : hoursPerSecond(top.level, top.speed);
    target = Math.min(target + dt * rate, top.hours);
    if (top.hours - target > JUMP * top.step) target = top.hours - top.step; // moved far ahead by a command: catch up at once
    // drop what's behind the view, keeping the one just before it to interpolate from
    while (queue.length > 2 && queue[1]!.hours <= target) queue.shift();
    if (!inFlight && rate > 0) request(top);
    const v = view();
    if (v) for (const fn of frames) fn(v, now);
  };
  requestAnimationFrame(frame);

  return {
    view,
    latest: () => queue[queue.length - 1] ?? null,
    onFrame: (fn) => void frames.push(fn),
    setReducedMotion: (on) => void (reduced = on),
    benching: () => benchN > 0,
    bench(n, m = n) {
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
