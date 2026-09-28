// The simulation: pure TypeScript with no DOM, so the same code runs in a Web Worker (the game, src/app/sim.worker.ts),
// in Node (the checks and the bot) and in a Vitest test. The UI reaches it only through commands (src/sim/commands.ts)
// and snapshots (src/sim/state.ts). The founding spec (docs/specs/overgrow.md) sets what lives here; the systems that
// run on the clock's ticks are listed in src/sim/systems.ts.
import type {System} from './clock';
import {applyCommand, type Command} from './commands';
import {toSave} from './save';
import {newState, snapshotOf, type Snapshot} from './state';
import {SYSTEMS} from './systems';

export type {Command} from './commands';
export type {Snapshot} from './state';

export interface Sim {
  /** Carries out a command and returns what the UI is shown next. */
  apply(cmd: Command): Snapshot;
  snapshot(): Snapshot;
  /** The game as save text (src/sim/save.ts); `apply({type: 'load', save})` carries on from it exactly. */
  save(): string;
}

/** A new game from a seed. Tests may pass their own systems; the game runs src/sim/systems.ts. */
export function createSim(seed: number, systems: readonly System[] = SYSTEMS): Sim {
  let state = newState(seed);
  return {
    snapshot: () => snapshotOf(state),
    save: () => toSave(state),
    apply(cmd) {
      state = applyCommand(state, cmd, systems);
      return snapshotOf(state);
    },
  };
}
