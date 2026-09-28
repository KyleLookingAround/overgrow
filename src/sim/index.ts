// The simulation: pure TypeScript with no DOM, so the same code runs in a Web Worker (the game, src/app/sim.worker.ts),
// in Node (the checks and the bot) and in a Vitest test. The UI reaches it only through commands and snapshots. What
// lives here is set by the founding spec (docs/specs/overgrow.md); until the first slice it's a seeded clock.
import {rng, type Rng} from './random';

/** A command from the player, a manager or the bot. Every way of changing the game goes through one of these. */
export type Command = {type: 'tick'; hours: number} | {type: 'new-game'; seed: number};

/** What the UI is shown after each command. Runtime-only detail (the camera, animations) never lives here. */
export interface Snapshot {
  seed: number;
  /** Game hours since the start. */
  hours: number;
}

export interface Sim {
  apply(cmd: Command): Snapshot;
  snapshot(): Snapshot;
}

export function createSim(seed: number): Sim {
  let r: Rng = rng(seed);
  const state = {seed, hours: 0};
  const snapshot = (): Snapshot => ({...state});
  return {
    snapshot,
    apply(cmd) {
      if (cmd.type === 'new-game') {
        r = rng(cmd.seed);
        state.seed = cmd.seed;
        state.hours = 0;
      } else {
        state.hours += cmd.hours;
        r.next(); // the stream moves once a tick, so later systems can't change the dice by being added
      }
      return snapshot();
    },
  };
}
