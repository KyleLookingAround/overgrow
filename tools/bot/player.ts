// The bot's player: the choices a sensible player makes, as policies that read the snapshot and return commands. Each
// morning the bot asks every policy in turn and sends what they return through `apply()`, exactly as the page does for
// the player; a policy never touches a bed or a stock. A player is its policies: the plan (what to sow where, in
// season, rotating families), the moisture line to water at, and the places later parts fill: the pest policy (part 5)
// and the shop, which buys the next upgrade once the purse holds three times its price (part 6).
import type {CalendarDate} from '../../src/sim/clock';
import type {GraphNode, LeverValue} from '../../src/sim/graph';
import type {Command, Snapshot} from '../../src/sim/index';
import {isDug} from './measure';

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

/** Sets a lever on every node of a kind that has it, where it isn't set to that already. */
export const setLever = (lever: string, value: LeverValue, kind: string): Policy =>
  ({snap}) =>
    snap.nodes
      .filter((n) => n.kind === kind && lever in n.levers && JSON.stringify(n.levers[lever]) !== JSON.stringify(value))
      .map((n) => ({type: 'plan', node: n.id, lever, value}));

/** Each dug bed's plan: `want(bed, i)` for the i-th dug bed, sent only where the plan says something else. */
const eachBed = (want: (n: GraphNode, i: number) => LeverValue): Policy =>
  ({snap}) =>
    snap.nodes.filter(isDug).flatMap((n, i) => {
      const value = want(n, i);
      return JSON.stringify(n.levers.sow) === JSON.stringify(value) ? [] : [{type: 'plan' as const, node: n.id, lever: 'sow', value}];
    });

/** Starts each dug bed on a crop of its own (a mix for the kitchen), then follows the family rotation once one's in. */
export const rotate = (first: readonly string[]): Policy =>
  eachBed((n, i) => (n.levers.crop == null && !((n.levers.history as unknown[] | undefined) ?? []).length ? first[i % first.length]! : 'rotation'));

/** The same crop in every dug bed, round after round: the single trick the strategy test checks doesn't win. */
export const oneCrop = (crop: string): Policy => eachBed(() => crop);

/** Water when the soil is below this share of its available water: half, where FAO-56 puts most vegetables' stress. */
export const WATER_LINE = 0.5;

/** The players the bot and the strategy tests know, by name. */
export const PLAYERS: Record<string, Player> = {
  /** Salad leaves and potatoes to start, for early leaves and a big crop by July, then the rotation in both beds. */
  sensible: {name: 'sensible', plan: rotate(['salad', 'potatoes']), water: setLever('waterBelow', WATER_LINE, 'person'), pests: null, shop: null},
  'one-crop': {name: 'one-crop', plan: oneCrop('salad'), water: setLever('waterBelow', WATER_LINE, 'person'), pests: null, shop: null},
};

/** The policies in the order the bot asks them each morning. */
export const policiesOf = (p: Player): Policy[] => [p.plan, p.water, p.pests, p.shop].filter((x): x is Policy => x !== null);
