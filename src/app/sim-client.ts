// The page's end of the simulation: commands go to the worker (src/app/sim.worker.ts) and snapshots come back. The
// checks and the bot skip this and call createSim() in Node directly, so the sim never has two ways of being driven.
// Every game snapshot that comes back, whatever command asked for it, goes to the listeners (the clock loop); a bench
// snapshot goes only to whoever asked. What each copy cost is kept for the speed budget: the page's side (reading the
// message, which is when the browser rebuilds it, and patching the last snapshot with it) and the worker's (writing it,
// off the page's thread).
import type {Command, Snapshot} from '../sim/index';
import {patcher} from './delta';
import type {FromWorker, ToWorker} from './sim.worker';

export interface SimClient {
  send(cmd: Command): Promise<Snapshot>;
  /** The game as save text. */
  save(): Promise<string>;
  /** Check-only: a synthetic snapshot of n nodes and m people at an hour (src/app/bench.ts). */
  bench(n: number, m: number, hours: number): Promise<Snapshot>;
  onSnapshot(fn: (s: Snapshot) => void): void;
  /** Milliseconds for each of the last snapshots, newest last: the page reading the message and patching its copy,
   *  and the worker writing it. */
  copyTimes(): {read: number[]; patched: number[]; written: number[]};
}

export function connectSim(): SimClient {
  const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), {type: 'module'});
  const waiting = new Map<number, (r: FromWorker) => void>(), listeners: ((s: Snapshot) => void)[] = [], read: number[] = [], patched: number[] = [], written: number[] = [];
  const game = patcher(), bench = patcher(), snaps = new Map<number, Snapshot>();
  let next = 1;
  const keep = (a: number[], x: number) => void (a.push(x) > 120 && a.shift());
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    const t0 = performance.now(), r = e.data; // the message is rebuilt here, on first reading
    if ('delta' in r) {
      const t1 = performance.now(), snap = (r.bench ? bench : game)(r.delta);
      keep(read, t1 - t0);
      keep(patched, performance.now() - t1);
      keep(written, r.serialised);
      snaps.set(r.id, snap);
      if (!r.bench) for (const fn of listeners) fn(snap);
    }
    waiting.get(r.id)?.(r);
    waiting.delete(r.id);
  };
  const post = (msg: Omit<ToWorker, 'id'>) =>
    new Promise<FromWorker>((resolve) => {
      const id = next++;
      waiting.set(id, resolve);
      worker.postMessage({...msg, id} as ToWorker);
    });
  const snapOf = (r: FromWorker) => {
    const s = snaps.get(r.id);
    snaps.delete(r.id);
    return s ?? Promise.reject(new Error('expected a snapshot'));
  };
  return {
    send: (cmd) => post({cmd}).then(snapOf),
    save: () => post({save: true}).then((r) => ('save' in r ? r.save : Promise.reject(new Error('expected a save')))),
    bench: (n, m, hours) => post({bench: {n, m, hours}}).then(snapOf),
    onSnapshot: (fn) => void listeners.push(fn),
    copyTimes: () => ({read: read.slice(), patched: patched.slice(), written: written.slice()}),
  };
}
