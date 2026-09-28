// The simulation in a Web Worker: the page posts commands, the worker answers with snapshots, so a big graph ticking
// never stalls the map on a phone. src/app/sim-client.ts is the page's end. The sim itself (src/sim/) knows nothing
// about workers; this file is the only place the two meet. Snapshots go as deltas (src/app/delta.ts), and each carries
// how long the worker took to write the one before it, so the page can measure the copy (the speed budget).
import {createSim, type Command, type Snapshot} from '../sim/index';
import {benchSnapshot} from './bench';
import {diff, type SnapshotDelta} from './delta';

export type ToWorker = {id: number; cmd: Command} | {id: number; save: true} | {id: number; bench: {n: number; m: number; hours: number}};
export type FromWorker = {id: number; delta: SnapshotDelta; bench: boolean; serialised: number} | {id: number; save: string};

let sent: Snapshot | null = null, benchSent: Snapshot | null = null;

const sim = createSim(1); // the page's first command is new-game with the real seed, or load
let serialised = 0;
self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if ('save' in m) {
    const reply: FromWorker = {id: m.id, save: sim.save()};
    self.postMessage(reply);
    return;
  }
  const bench = 'bench' in m, snap = bench ? benchSnapshot(m.bench.n, m.bench.hours, m.bench.m) : sim.apply(m.cmd);
  const delta = diff(bench ? benchSent : sent, snap);
  if (bench) benchSent = snap;
  else sent = snap;
  const reply: FromWorker = {id: m.id, delta, bench, serialised}, t0 = performance.now();
  self.postMessage(reply);
  serialised = performance.now() - t0;
};
