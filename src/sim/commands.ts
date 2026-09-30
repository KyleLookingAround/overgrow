// Commands: every way of changing the game, from the player, a manager or the bot alike. The UI never reaches into the
// sim's state; it sends one of these and gets a snapshot back. Later commands follow the same shape: a `type`, and what
// it acts on. Plans, policies and laws are levers a system declares on a node; what's bought belongs to the system that
// sells it (the shed, src/sim/shed.ts). docs/systems/commands.md says how each is handled.
import type {Speed} from '../data/ladder';
import {SPEEDS} from '../data/ladder';
import {CARDS, gateOf, revealed, unfolded} from '../data/unfold';
import {kindOf} from './effects';
import {goalOf, offered} from './goal';
import {stepUp} from './allotment';
import {backUp, goDown, sendSomeone, zoomTick} from './zoom';
import {helperCommand, secondPlotCommand, voteCommand, watchCommand} from './season';
import type {Watching} from '../data/agency';
import type {Vote} from './models/committee';
import {buyFlow, chit, cleanPots, digOver, fleece, henCare, orderSeeds, orderSets, placeOf, prune, rakeLeaves, sowSill, warmSoil} from './shed';
import {GLUT_POLICIES, type GlutPolicy} from '../data/kitchen';
import type {Variety} from '../data/shed';
import {askMulch, waterSooner} from './gardener';
import {SHED} from './kit';
import {KITCHEN} from './models/kitchen';
import {UPGRADES, type UpgradeId} from '../data/shed';
import {calendar, levelClock, runStep, type System} from './clock';
import {flowEffects, recordInto, Recorder} from './effects';
import {applyFlow, mergeFlows, touch, type Flow, type LeverValue, type NodeId} from './graph';
import {fromSave} from './save';
import {newState, type State} from './state';
import {spent, tally} from './purse';

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
  /** The garden's year done: the allotment offer's requirements met and latched (src/sim/goal.ts); 'ok' stays in the
   *  garden a while, the offer kept on the goal bar. */
  | {type: 'card'; id: 'year'; answer: 'ok'}
  /** Take the plot: the garden sealed into it and the allotment opened (src/sim/allotment.ts), once the offer is latched. */
  | {type: 'step-up'}
  /** The week's decisions, each asked once for what it's about (the State's `answered`): a glut sold, preserved or given
   *  away (the kitchen's `glut` policy); next year's seed from the winter catalogue, or later; fleece over the tender
   *  crops for a forecast frost; and the watering line raised for a dry spell, put back after the next rain. */
  | {type: 'card'; id: 'glut'; answer: GlutPolicy}
  | {type: 'card'; id: 'catalogue'; answer: Variety | 'later'}
  | {type: 'card'; id: 'frost'; answer: 'fleece' | 'no'}
  | {type: 'card'; id: 'dry'; answer: 'water' | 'no'}
  /** Seed potatoes set out to chit in February or March, for an earlier crop. */
  | {type: 'card'; id: 'chit'; answer: 'chit' | 'no'}
  /** The heap's compost spread on the beds as a winter mulch. */
  | {type: 'card'; id: 'mulch'; answer: 'mulch' | 'no'}
  /** Fleece over the empty beds to warm their soil for an early sowing. */
  | {type: 'card'; id: 'warm'; answer: 'warm' | 'no'}
  /** The autumn clear-up: the fallen leaves raked onto the heap. */
  | {type: 'card'; id: 'leaves'; answer: 'rake' | 'no'}
  /** Bare-root season: a cordon redcurrant planted along the fence (the shed's `cordon`, bought), later (asked again in
   *  three weeks), or not this winter. */
  | {type: 'card'; id: 'bare-root'; answer: 'plant' | 'later' | 'no'}
  /** Winter: the empty beds dug over, or left no-dig. */
  | {type: 'card'; id: 'dig-over'; answer: 'dig' | 'no-dig'}
  /** Midwinter's jobs (round four): the currants pruned, seed potatoes ordered by post, the pots and frame washed, salad
   *  sown on the windowsill, and the hens' winter care; and, when the purse is short of the next rung, the honesty box kept
   *  stocked (the kitchen's `box` policy). */
  | {type: 'card'; id: 'prune'; answer: 'prune' | 'no'}
  | {type: 'card'; id: 'sets'; answer: 'order' | 'no'}
  | {type: 'card'; id: 'clean'; answer: 'clean' | 'no'}
  | {type: 'card'; id: 'sill'; answer: 'sow' | 'no'}
  | {type: 'card'; id: 'hen-care'; answer: 'care' | 'no'}
  | {type: 'card'; id: 'box'; answer: 'stock' | 'spare'}
  /** The garden's first year done, whether or not the offer's requirements are met: 'ok' carries on into the second. */
  | {type: 'card'; id: 'first-year'; answer: 'ok'}
  /** The allotment's first season (src/sim/season.ts): take the neglected second plot on, or not yet; the helper's offer
   *  accepted, refused, or the helper let go; how closely the helper is watched; and the player's vote on the motion put
   *  to the committee, after talking to members (hours each, by id). */
  | {type: 'second-plot'; answer: 'take' | 'no'}
  | {type: 'helper'; answer: 'accept' | 'refuse' | 'let go'}
  | {type: 'watch'; watching: Watching}
  | {type: 'vote'; answer: Vote; talk?: Record<string, number>}
  /** The zoom back in (src/sim/zoom.ts): go down into the garden below to fix the outbreak yourself, come back up to the
   *  allotment, or send an adviser (by id, src/data/zoom.ts) for a fee and half the reward. */
  | {type: 'go-down'}
  | {type: 'back-up'}
  | {type: 'send-someone'; adviser: string}
  /** A setting of the page's that's saved with the game ('details': show every number early). It changes no play. */
  | {type: 'setting'; key: string; value: LeverValue};

/** The settings there are, and the values each takes. */
export const SETTINGS: Record<string, readonly LeverValue[]> = {details: [true, false]};
/** The first plan card's bed and what "let them choose" gives it: the gardener follows the rotation there. */
export const FIRST_PLAN = {bed: 'bed-2', chosen: 'rotation'} as const;

/** Asks each system in turn; the first answer that isn't undefined wins. */
function ask(systems: readonly System[], s: State, cmd: Command): string | null | undefined {
  for (const sys of systems) {
    if (sys.levels && !sys.levels.includes(s.level)) continue;
    const r = sys.command?.(cmd, s.graph, s.level);
    if (r !== undefined) return r;
  }
  return undefined;
}

/** Runs whole steps of the clock, collecting the flows they moved, any that couldn't, and every effect with its cause and
 *  place (src/sim/effects.ts). */
function tick(s: State, systems: readonly System[], hours: number) {
  const from = s.hours, step = levelClock(s.level).stepHours, steps = Math.floor(hours / step + 1e-9);
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
    if (s.activities.some((a) => a.end < s.hours - step)) s.activities = s.activities.filter((a) => a.end >= s.hours - step);
  }
  recordInto(s.graph, null);
  s.flows = mergeFlows(flows);
  // the zoom back in: the outbreak's start, its kg, a rescue and the deadline (src/sim/zoom.ts)
  const zoomed = zoomTick(s, from);
  // the purse's week: what came in, and what the garden spent (src/sim/purse.ts)
  tally(s.graph, s.flows, s.hours);
  // each flow is an effect of its `what` at its place, and the systems' events besides
  s.effects = flowEffects(s.graph, s.flows).concat(effects.list(), zoomed);
  // an instrument unfolds the first time one of its causes happens (src/data/unfold.ts), one batch a day
  unfold(s, revealed(s.seen, causesOf(s.effects)));
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
    case 'step-up':
      s.rejected = stepUp(s);
      if (!s.rejected) seeOnce(s, CARDS.year);
      return s;
    case 'second-plot':
    case 'helper':
    case 'watch':
    case 'vote': {
      s.rejected = cmd.type === 'second-plot' ? secondPlotCommand(s, cmd.answer) : cmd.type === 'helper' ? helperCommand(s, cmd.answer)
        : cmd.type === 'watch' ? watchCommand(s, cmd.watching) : voteCommand(s, cmd.answer, cmd.talk);
      // what the command did is its effect: an instrument it reveals unfolds (src/data/unfold.ts)
      if (!s.rejected) reveal(s, s.effects.map((e) => e.cause));
      return s;
    }
    case 'go-down':
    case 'back-up':
    case 'send-someone':
      s.rejected = cmd.type === 'go-down' ? goDown(s, systems) : cmd.type === 'back-up' ? backUp(s, systems) : sendSomeone(s, cmd.adviser);
      if (!s.rejected) reveal(s, s.effects.map((e) => e.cause));
      return s;
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
        // the purchase is this command's flow and effect: the map shows the thing in use, and money unfolds if it hadn't
        s.flows = [buyFlow(cmd.id as UpgradeId)];
        // the purse's week names the thing bought
        tally(s.graph, [{...s.flows[0]!, what: UPGRADES[cmd.id as UpgradeId].name}], s.hours);
        // at the thing's place, so the map pulses where it now stands
        s.effects = [{kind: kindOf('buying'), cause: 'buying', at: placeOf(s.graph, cmd.id as UpgradeId), amount: 1, unit: cmd.id}];
        // and the next step towards a big buy shows once the one before is bought (src/data/unfold.ts)
        unfold(s, revealed(s.seen, ['buying', `bought ${cmd.id}`]));
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
/** The watering line a dry-spell card's "water more" sets: three quarters of the soil's available water. */
export const DRY_LINE = 0.75;
/** The game hours of the garden's first year: the "Your first year" card comes on its first anniversary. */
export const YEAR_HOURS = 365 * 24;

/** The week's decision cards, each asked once for what it's about. */
export const DECISIONS = ['glut', 'catalogue', 'frost', 'dry', 'chit', 'mulch', 'warm', 'leaves', 'bare-root', 'dig-over', 'prune', 'sets', 'clean', 'sill', 'hen-care', 'box'] as const;
type DecisionCmd = Extract<Command, {type: 'card'; id: (typeof DECISIONS)[number]}>;
const isDecision = (c: Extract<Command, {type: 'card'}>): c is DecisionCmd => (DECISIONS as readonly string[]).includes(c.id);

/** What a decision's own spend is called in the purse's week (a cordon's is its buy's). */
const SPEND: Partial<Record<DecisionCmd['id'], string>> = {catalogue: 'seed catalogue', frost: 'fleece', warm: 'fleece', sets: 'seed potatoes', sill: 'seed', 'hen-care': 'hen care'};

/** Answers one of the week's decision cards: its choice carried out, and the hour kept so it asks once. */
function decide(s: State, cmd: DecisionCmd, systems: readonly System[]): State {
  const g = s.graph, date = calendar(s.hours), before = g.nodes[KITCHEN]?.stocks.money?.amount ?? 0;
  let r: string | null = null;
  if (cmd.id === 'glut') {
    if (!GLUT_POLICIES.includes(cmd.answer)) r = 'sell, preserve or give';
    else applyCommand(s, {type: 'policy', node: KITCHEN, lever: 'glut', value: cmd.answer}, systems), (r = s.rejected);
  } else if (cmd.id === 'catalogue') {
    if (cmd.answer !== 'standard' && cmd.answer !== 'resistant' && cmd.answer !== 'later') r = 'standard, resistant or later';
    else if (cmd.answer !== 'later') {
      r = orderSeeds(g, cmd.answer, date);
      // next year's seed ordered: the propagator is worth having for the tender ones (src/data/unfold.ts)
      if (!r) reveal(s, ['seed catalogue']);
    }
  } else if (cmd.id === 'leaves') {
    if (cmd.answer !== 'rake' && cmd.answer !== 'no') r = 'rake or no';
    else if (cmd.answer === 'rake') r = rakeLeaves(g, date);
  } else if (cmd.id === 'bare-root') {
    if (cmd.answer !== 'plant' && cmd.answer !== 'later' && cmd.answer !== 'no') r = 'plant, later or no';
    else if (cmd.answer === 'plant') applyCommand(s, {type: 'buy', id: 'cordon'}, systems), (r = s.rejected);
    // "not this winter": asked again next bare-root season
    else if (cmd.answer === 'no') s.answered = {...s.answered, 'bare-root-no': s.hours};
  } else if (cmd.id === 'dig-over') {
    if (cmd.answer !== 'dig' && cmd.answer !== 'no-dig') r = 'dig or no-dig';
    else if (cmd.answer === 'dig') r = digOver(g, date);
  } else if (cmd.id === 'prune') {
    if (cmd.answer !== 'prune' && cmd.answer !== 'no') r = 'prune or no';
    else if (cmd.answer === 'prune') r = prune(g, date, s.hours);
  } else if (cmd.id === 'sets') {
    if (cmd.answer !== 'order' && cmd.answer !== 'no') r = 'order or no';
    else if (cmd.answer === 'order') r = orderSets(g, date);
  } else if (cmd.id === 'clean') {
    if (cmd.answer !== 'clean' && cmd.answer !== 'no') r = 'clean or no';
    else if (cmd.answer === 'clean') r = cleanPots(g, date);
  } else if (cmd.id === 'sill') {
    if (cmd.answer !== 'sow' && cmd.answer !== 'no') r = 'sow or no';
    else if (cmd.answer === 'sow') r = sowSill(g, date, s.hours);
  } else if (cmd.id === 'hen-care') {
    if (cmd.answer !== 'care' && cmd.answer !== 'no') r = 'care or no';
    else if (cmd.answer === 'care') r = henCare(g, date, s.hours);
  } else if (cmd.id === 'box') {
    if (cmd.answer !== 'stock' && cmd.answer !== 'spare') r = 'stock or spare';
    else applyCommand(s, {type: 'policy', node: KITCHEN, lever: 'box', value: cmd.answer}, systems), (r = s.rejected);
  } else if (cmd.id === 'frost') {
    if (cmd.answer !== 'fleece' && cmd.answer !== 'no') r = 'fleece or no';
    else if (cmd.answer === 'fleece') r = fleece(g, s.hours);
  } else if (cmd.id === 'warm') {
    if (cmd.answer !== 'warm' && cmd.answer !== 'no') r = 'warm or no';
    else if (cmd.answer === 'warm') r = warmSoil(g, date);
  } else if (cmd.id === 'mulch') {
    if (cmd.answer !== 'mulch' && cmd.answer !== 'no') r = 'mulch or no';
    else if (cmd.answer === 'mulch') r = askMulch(g);
  } else if (cmd.id === 'chit') {
    if (cmd.answer !== 'chit' && cmd.answer !== 'no') r = 'chit or no';
    else if (cmd.answer === 'chit') r = chit(g, date, s.hours);
  } else if (cmd.answer !== 'water' && cmd.answer !== 'no') r = 'water or no';
  else if (cmd.answer === 'water') r = unfolded(s.seen, 'garden.water') ? waterSooner(g, DRY_LINE) : 'that hasn’t come up in the garden yet';
  s.rejected = r;
  if (!r) {
    if (SPEND[cmd.id]) spent(g, SPEND[cmd.id]!, before, s.hours);
    s.answered = {...s.answered, [cmd.id]: s.hours};
    touch(g, KITCHEN);
    touch(g, SHED);
  }
  return s;
}

/** Unfolds what a command's causes reveal (src/data/unfold.ts). */
function reveal(s: State, causes: string[]) {
  unfold(s, revealed(s.seen, causes));
}

/** From this game day on (the third), no more than one batch unfolds a day, so no more than one "New:" sign: the first
 *  minute's own run of them (the water, the slugs, the shed, the kitchen) is its design. */
export const SPACED_FROM = 2;
/** Unfolds keys, spaced (round four): a batch today, with any still waiting, unless one has unfolded today already, when
 *  they wait for the next day's first tick or command. The sim's gates wait with them, so the bot plays the same game. */
export function unfold(s: State, fresh: readonly string[]) {
  const u = s.unfolding, day = calendar(s.hours).dayIndex;
  if (!fresh.length && (!u.waiting.length || u.day === day)) return;
  const all = [...u.waiting, ...fresh.filter((k) => !u.waiting.includes(k) && !s.seen.includes(k))];
  if (!all.length) return;
  if (day < SPACED_FROM || u.day !== day) {
    s.seen = [...s.seen, ...all];
    s.unfolding = {day, waiting: []};
  } else if (all.length !== u.waiting.length) s.unfolding = {day, waiting: all};
}

function answer(s: State, cmd: Extract<Command, {type: 'card'}>, systems: readonly System[]): State {
  if (isDecision(cmd)) return decide(s, cmd, systems);
  const key = cmd.id === 'first-plan' ? CARDS.firstPlan : cmd.id === 'try-faster' ? CARDS.tryFaster : cmd.id === 'year' ? CARDS.year : cmd.id === 'first-year' ? CARDS.firstYear : null;
  if (!key) s.rejected = `no card ${String(cmd.id)}`;
  else if (s.seen.includes(key)) s.rejected = 'that’s been answered';
  else if (cmd.id === 'year') {
    if (!offered(goalOf(s.graph))) s.rejected = 'the garden’s year isn’t done yet';
    else if (cmd.answer !== 'ok') s.rejected = 'ok';
    else seeOnce(s, key);
  } else if (cmd.id === 'first-year') {
    if (s.hours < YEAR_HOURS) s.rejected = 'the garden’s first year isn’t done yet';
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
