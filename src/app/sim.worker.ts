// The simulation in a Web Worker: the page posts commands, the worker answers with snapshots, so a big graph ticking
// never stalls the map on a phone. src/app/sim-client.ts is the page's end. The sim itself (src/sim/) knows nothing
// about workers; this file is the only place the two meet.
import {createSim, type Command, type Snapshot} from '../sim/index';

export type ToWorker = {id: number; cmd: Command};
export type FromWorker = {id: number; snap: Snapshot};

const sim = createSim(1); // the page's first command is new-game with the real seed
self.onmessage = (e: MessageEvent<ToWorker>) => {
  const reply: FromWorker = {id: e.data.id, snap: sim.apply(e.data.cmd)};
  self.postMessage(reply);
};
