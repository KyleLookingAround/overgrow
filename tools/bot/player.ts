// The bot's player: the choices a sensible player makes, as policies that read the snapshot and return commands. Each
// morning the bot asks every policy in turn and sends what they return through `apply()`, exactly as the page does for
// the player; a policy never touches a bed or a stock. A player is its policies: the plan (what to sow where, in
// season, rotating families), the moisture line to water at, the pest policy, and the shop, which buys the next upgrade
// once the purse holds three times its price (part 6c). A policy on a lever that unfolds (src/data/unfold.ts) waits until
// it has, as a player would: the sim refuses it before.
import {unfolded} from '../../src/data/unfold';
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
  /** Leave, pick, trap or treat, for each pest once it has come up. */
  pests: Policy | null;
  /** Part 6c: the next upgrade, bought at three times its price. */
  shop: Policy | null;
}

/** Sets a lever on every node of a kind that has it, where it isn't set to that already. */
export const setLever = (lever: string, value: LeverValue, kind: string): Policy =>
  ({snap}) =>
    snap.nodes
      .filter((n) => n.kind === kind && lever in n.levers && JSON.stringify(n.levers[lever]) !== JSON.stringify(value))
      .map((n) => ({type: 'plan', node: n.id, lever, value}));

/** A policy that waits until a key has unfolded (the sim refuses its lever before). */
export const once = (key: string, policy: Policy): Policy => (v) => (unfolded(v.snap.seen, key) ? policy(v) : []);

/** Sets a pest's policy on the gardener once the pest has come up in the garden, where it isn't that already. */
export const pestPolicy = (want: Record<string, string>): Policy => (v) =>
  Object.entries(want).flatMap(([pest, value]) => {
    const me = v.snap.nodes.find((n) => n.kind === 'person' && pest in n.levers);
    return me && unfolded(v.snap.seen, `garden.${pest}`) && me.levers[pest] !== value ? [{type: 'policy' as const, node: me.id, lever: pest, value}] : [];
  });

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

/** Slugs picked at dusk (the plan's start), aphids squashed and blighted leaves picked off by hand once each comes up:
 *  the gardener's time rather than the purse's, and nothing that harms the ladybirds. */
export const SENSIBLE_PESTS = pestPolicy({slugs: 'pick', aphids: 'pick', blight: 'pick'});

/** The players the bot and the strategy tests know, by name. */
export const PLAYERS: Record<string, Player> = {
  /** Salad leaves and potatoes to start, for early leaves and a big crop by July, then the rotation in both beds. */
  sensible: {name: 'sensible', plan: rotate(['salad', 'potatoes']), water: once('garden.water', setLever('waterBelow', WATER_LINE, 'person')), pests: SENSIBLE_PESTS, shop: null},
  'one-crop': {name: 'one-crop', plan: oneCrop('salad'), water: once('garden.water', setLever('waterBelow', WATER_LINE, 'person')), pests: SENSIBLE_PESTS, shop: null},
};

/** The policies in the order the bot asks them each morning. */
export const policiesOf = (p: Player): Policy[] => [p.plan, p.water, p.pests, p.shop].filter((x): x is Policy => x !== null);
