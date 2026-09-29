// Commands: every way of changing the game, from the player, a manager or the bot alike. The UI never reaches into the
// sim's state; it sends one of these and gets a snapshot back. Later commands follow the same shape: a `type`, and what
// it acts on. Plans, policies and laws are levers a system declares on a node; what's bought belongs to the system that
// sells it (the shed, src/sim/shed.ts). docs/systems/commands.md says how each is handled.
import type {Speed} from '../data/ladder';
import {SPEEDS} from '../data/ladder';
import {CARDS, gateOf, revealed, unfolded} from '../data/unfold';
import {kindOf} from './effects';
import {gardenStatus, goalOf} from './goal';
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
  /** Buy something from the system that sells it (the shed's upgrades), once it has unfolded. */
  | {type: 'buy'; id: string}
  /** Answer a card that's asked once a save: the first plan ('accept' the card's plan, or 'choose' to let the gardener
   *  follow the rotation), and the one "try faster" nudge ('yes' goes to 2×, 'no' leaves it). */
  | {type: 'card'; id: 'first-plan'; answer: 'accept' | 'choose'}
  | {type: 'card'; id: 'try-faster'; answer: 'yes' | 'no'}
  /** The garden's year done: the allotment offer's requirements met (src/sim/goal.ts); 'ok' carries on playing. */
  | {type: 'card'; id: 'year'; answer: 'ok'}
  /** A setting of the page's that's saved with the game ('details': show every number early). It changes no play. */
  | {type: 'setting'; key: string; value: LeverValue};

/** The settings there are, and the values each takes. */
export const SETTINGS: Record<string, readonly LeverValue[]> = {details: [true, false]};
/** The first plan card's bed and what "let them choose" gives it: the gardener follows the rotation there. */
export const FIRST_PLAN = {bed: 'bed-2', chosen: 'rotation'} as const;

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
  // an instrument unfolds the first time one of its causes happens (src/data/unfold.ts)
  const fresh = revealed(s.seen, causesOf(s.effects));
  if (fresh.length) s.seen = [...s.seen, ...fresh];
  s.errors = errors;
}

/** Carries out a command on the state, in place. A refusal leaves the state as it was and says why in `rejected`. */
export function applyCommand(s: State, cmd: Command, systems: readonly System[]): State {
  s.rejected = null;
  switch (cmd.type) {
    case 'tick':
      tick(s, systems, cmd.hours);
      return s;
    case 'new-game': {
      // the page's settings carry over to the new game
      const n = newState(cmd.seed, cmd.speed ?? 1);
      n.settings = {...s.settings};
      return n;
    }
    case 'load':
      try {
        return fromSave(cmd.save);
      } catch (e) {
        s.rejected = `the save can't be read: ${e instanceof Error ? e.message : String(e)}`;
        return s;
      }
    case 'speed':
      if (!(SPEEDS as readonly number[]).includes(cmd.speed)) s.rejected = `no speed ${cmd.speed}`;
      else {
        s.speed = cmd.speed;
        // starting the clock from the first morning keeps the card's plan; any way of reaching a faster speed answers
        // the "try faster" nudge
        if (cmd.speed > 0 && s.hours === 0) seeOnce(s, CARDS.firstPlan);
        if (cmd.speed >= 2) seeOnce(s, CARDS.tryFaster);
      }
      return s;
    case 'plan':
    case 'policy':
    case 'law': {
      const n = s.graph.nodes[cmd.node];
      if (!n) s.rejected = `no node ${cmd.node}`;
      else if (!(cmd.lever in n.levers)) s.rejected = `${n.name} has no ${cmd.type} lever ${cmd.lever}`;
      else if (gateOf(cmd.lever, cmd.value) && !unfolded(s.seen, gateOf(cmd.lever, cmd.value)!)) s.rejected = `that hasn’t come up in the garden yet`;
      else {
        const r = ask(systems, s, cmd);
        if (r) s.rejected = r;
        else n.levers[cmd.lever] = cmd.value;
      }
      return s;
    }
    case 'card':
      return answer(s, cmd, systems);
    case 'setting':
      if (!(cmd.key in SETTINGS)) s.rejected = `no setting ${cmd.key}`;
      else if (!SETTINGS[cmd.key]!.includes(cmd.value)) s.rejected = `${cmd.key} is ${SETTINGS[cmd.key]!.join(' or ')}`;
      else s.settings = {...s.settings, [cmd.key]: cmd.value};
      return s;
    case 'buy': {
      // an offer shows once it's worth having (src/data/unfold.ts): before, the shed doesn't sell it
      if (!unfolded(s.seen, `shed.${cmd.id}`)) {
        s.rejected = `the shed isn’t offering ${cmd.id} yet`;
        return s;
      }
      const r = ask(systems, s, cmd);
      s.rejected = r === undefined ? `no upgrade ${cmd.id}` : r;
      if (r === null) {
        s.upgrades = [...s.upgrades, cmd.id];
        // the purchase is this command's effect: the map shows the thing in use, and money unfolds if it hadn't
        s.effects = [{kind: kindOf('buying'), cause: 'buying', at: 'shed', amount: 1, unit: cmd.id}];
        const fresh = revealed(s.seen, ['buying']);
        if (fresh.length) s.seen = [...s.seen, ...fresh];
      }
      return s;
    }
  }
}

/** A tick's causes, without building a list. */
function* causesOf(effects: readonly {cause: string}[]) {
  for (const e of effects) yield e.cause;
}

const seeOnce = (s: State, key: string) => void (s.seen.includes(key) || (s.seen = [...s.seen, key]));

/** A card's answer: each card is answered once a save, and the first plan's clock starts with it. */
function answer(s: State, cmd: Extract<Command, {type: 'card'}>, systems: readonly System[]): State {
  const key = cmd.id === 'first-plan' ? CARDS.firstPlan : cmd.id === 'try-faster' ? CARDS.tryFaster : cmd.id === 'year' ? CARDS.year : null;
  if (!key) s.rejected = `no card ${String(cmd.id)}`;
  else if (s.seen.includes(key)) s.rejected = 'that’s been answered';
  else if (cmd.id === 'year') {
    if (!gardenStatus(goalOf(s.graph)).ready) s.rejected = 'the garden’s year isn’t done yet';
    else if (cmd.answer !== 'ok') s.rejected = 'ok';
    else seeOnce(s, key);
  }
  else if (cmd.id === 'first-plan') {
    if (s.hours > 0) s.rejected = 'the first plan’s already under way';
    else if (cmd.answer !== 'accept' && cmd.answer !== 'choose') s.rejected = 'accept or choose';
    else {
      if (cmd.answer === 'choose') applyCommand(s, {type: 'plan', node: FIRST_PLAN.bed, lever: 'sow', value: FIRST_PLAN.chosen}, systems);
      if (!s.rejected) {
        s.speed = 1;
        seeOnce(s, key);
      }
    }
  } else if (cmd.answer !== 'yes' && cmd.answer !== 'no') s.rejected = 'yes or no';
  else {
    if (cmd.answer === 'yes') s.speed = 2;
    seeOnce(s, key);
  }
  return s;
}
