// The page's end of the simulation: commands go to the worker (src/app/sim.worker.ts) and snapshots come back. The
// checks and the bot skip this and call createSim() in Node directly, so the sim never has two ways of being driven.
import type {Command, Snapshot} from '../sim/index';
import type {FromWorker, ToWorker} from './sim.worker';

export interface SimClient {
  send(cmd: Command): Promise<Snapshot>;
}

export function connectSim(): SimClient {
  const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), {type: 'module'});
  const waiting = new Map<number, (s: Snapshot) => void>();
  let next = 1;
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    waiting.get(e.data.id)?.(e.data.snap);
    waiting.delete(e.data.id);
  };
  return {
    send(cmd) {
      const id = next++;
      const msg: ToWorker = {id, cmd};
      return new Promise((resolve) => {
        waiting.set(id, resolve);
        worker.postMessage(msg);
      });
    },
  };
}
