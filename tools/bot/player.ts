// The bot's player: the choices a sensible player makes, as policies that read the snapshot and return commands. Each
// morning the bot asks every policy in turn and sends what they return through `apply()`, exactly as the page does for
// the player; a policy never touches a bed or a stock. A player is its policies: the plan (what to sow where, in
// season, rotating families), the moisture line to water at, and the places later parts fill: the pest policy (part 5)
// and the shop, which buys the next upgrade once the purse holds three times its price (part 6).
import type {CalendarDate} from '../../src/sim/clock';
import type {Command, Snapshot} from '../../src/sim/index';

/** What a policy sees: the snapshot after the last tick, and the date. */
export interface View {
  snap: Snapshot;
  /** Day 1 is the game's first day. */
  day: number;
  date: CalendarDate;
}

/** One kind of choice: returns the commands to send now (none if nothing needs changing). */
export type Policy = (v: View) => Command[];

export interface Player {
  name: string;
  /** What to sow in each bed and when. */
  plan: Policy;
  /** The moisture line the gardener waters at. */
  water: Policy;
  /** Part 5: leave, pick, trap or treat. */
  pests: Policy | null;
  /** Part 6: the next upgrade, bought at three times its price. */
  shop: Policy | null;
}

const none: Policy = () => [];

/** Each lever a node has that the player hasn't set to `value` yet, as a command setting it. */
export const setLever = (type: 'plan' | 'policy', lever: string, value: Command extends infer C ? (C extends {value: infer V} ? V : never) : never, kind = 'bed'): Policy =>
  ({snap}) =>
    snap.nodes
      .filter((n) => n.kind === kind && lever in n.levers && JSON.stringify(n.levers[lever]) !== JSON.stringify(value))
      .map((n) => ({type, node: n.id, lever, value}));

/** The players the bot and the strategy tests know, by name. */
export const PLAYERS: Record<string, Player> = {
  sensible: {name: 'sensible', plan: none, water: none, pests: null, shop: null},
};

/** The policies in the order the bot asks them each morning. */
export const policiesOf = (p: Player): Policy[] => [p.plan, p.water, p.pests, p.shop].filter((x): x is Policy => x !== null);
