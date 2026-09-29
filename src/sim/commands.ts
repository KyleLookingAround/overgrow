// Commands: every way of changing the game, from the player, a manager or the bot alike. The UI never reaches into the
// sim's state; it sends one of these and gets a snapshot back. Later commands follow the same shape: a `type`, and what
// it acts on. Plans, policies and laws are levers a system declares on a node; upgrades belong to the system that sells
// them. docs/systems/commands.md says how each is handled.
import type {Speed} from '../data/ladder';
import {SPEEDS} from '../data/ladder';
import {levelClock, runStep, type System} from './clock';
import {flowEffects, recordInto, Recorder} from './effects';
import {applyFlow, mergeFlows, type Flow, type LeverValue, type NodeId} from './graph';
import {fromSave} from './save';
import {newState, type State} from './state';

export type Command =
  /** Advance the clock by whole steps (the level's step; any part of a step left over is dropped). */
  | {type: 'tick'; hours: number}
  /** Start again from a seed, on the garden's first morning. */
  | {type: 'new-game'; seed: number; speed?: Speed}
  /** Carry on from a save (src/sim/save.ts). */
  | {type: 'load'; save: string}
  /** Pause (0), 1×, 2× or 4×. The real-time loop reads it; the sim itself only ticks when told. */
  | {type: 'speed'; speed: Speed}
  /** Set a lever a system has declared on a node: what to grow, when to water, a rule the people follow, a law. */
  | {type: 'plan' | 'policy' | 'law'; node: NodeId; lever: string; value: LeverValue}
  /** Buy an upgrade from the system that offers it. */
  | {type: 'upgrade'; id: string};

/** Asks each system in turn; the first answer that isn't undefined wins. */
function ask(systems: readonly System[], s: State, cmd: Command): string | null | undefined {
  for (const sys of systems) {
    const r = sys.command?.(cmd, s.graph, s.level);
    if (r !== undefined) return r;
  }
  return undefined;
}

/** Runs whole steps of the clock, collecting the flows they moved, any that couldn't, and every effect with its cause and
 *  place (src/sim/effects.ts). */
function tick(s: State, systems: readonly System[], hours: number) {
  const step = levelClock(s.level).stepHours, steps = Math.floor(hours / step + 1e-9);
  const flows: Flow[] = [], errors: string[] = [], effects = new Recorder();
  recordInto(s.graph, effects);
  const ctx = {
    dt: step, level: s.level, graph: s.graph,
    flow: (f: Flow) => {
      const bad = applyFlow(s.graph, f);
      if (bad) errors.push(bad);
      else flows.push(f);
      return bad;
    },
    activity: (a: State['activities'][number]) => void s.activities.push(a),
  };
  for (let i = 0; i < steps; i++) {
    s.hours = runStep(systems, ctx, s.seed, s.hours);
    s.rng.next(); // the main stream moves once a step, so adding a system never changes its draws
    s.activities = s.activities.filter((a) => a.end >= s.hours - step);
  }
  recordInto(s.graph, null);
  s.flows = mergeFlows(flows);
  // each flow is an effect of its `what` at its place, and the systems' events besides
  s.effects = flowEffects(s.graph, s.flows).concat(effects.list());
  s.errors = errors;
}

/** Carries out a command on the state, in place. A refusal leaves the state as it was and says why in `rejected`. */
export function applyCommand(s: State, cmd: Command, systems: readonly System[]): State {
  s.rejected = null;
  switch (cmd.type) {
    case 'tick':
      tick(s, systems, cmd.hours);
      return s;
    case 'new-game':
      return newState(cmd.seed, cmd.speed ?? 1);
    case 'load':
      try {
        return fromSave(cmd.save);
      } catch (e) {
        s.rejected = `the save can't be read: ${e instanceof Error ? e.message : String(e)}`;
        return s;
      }
    case 'speed':
      if (!(SPEEDS as readonly number[]).includes(cmd.speed)) s.rejected = `no speed ${cmd.speed}`;
      else s.speed = cmd.speed;
      return s;
    case 'plan':
    case 'policy':
    case 'law': {
      const n = s.graph.nodes[cmd.node];
      if (!n) s.rejected = `no node ${cmd.node}`;
      else if (!(cmd.lever in n.levers)) s.rejected = `${n.name} has no ${cmd.type} lever ${cmd.lever}`;
      else {
        const r = ask(systems, s, cmd);
        if (r) s.rejected = r;
        else n.levers[cmd.lever] = cmd.value;
      }
      return s;
    }
    case 'upgrade': {
      const r = ask(systems, s, cmd);
      s.rejected = r === undefined ? `no upgrade ${cmd.id}` : r;
      if (r === null) s.upgrades.push(cmd.id);
      return s;
    }
  }
}
