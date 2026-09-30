// The allotment committee's numbers: its four motions and what each does for each want, how goodwill and persuasion
// tip a vote, political capital, and the rules a passed motion sets and what they cost the plots. Rough, numbers with their sources; src/sim/models/committee.ts uses them and docs/systems/committee.md says how.
//
// Licences: nothing copied. Rota and hosepipe rules follow the shape of allotment site rules and water companies'
// temporary use bans (a hosepipe ban still allows a watering can filled from a butt or trough; Water Industry Act 1991 as amended by the Flood and Water Management Act 2010);
// burning and composting emissions come from the IPCC 2006 Guidelines for National Greenhouse Gas Inventories, vol. 4 and
// 5 (open burning and biological treatment of waste, CH₄ and N₂O by mass of waste), with the dry-matter and carbon
// fractions of green waste from the same volumes' defaults; those are published for reuse with attribution. The way a
// vote is scored (goals as weights, veto and coalition thresholds) is the founding spec's own model. Sizes are the game's.
import type {Habit, Want} from './agency';

export type MotionId = 'waterRota' | 'waterNeed' | 'bonfireBan' | 'plotToBees' | 'hosepipe';
export const MOTION_IDS: readonly MotionId[] = ['waterRota', 'waterNeed', 'bonfireBan', 'plotToBees', 'hosepipe'];

/**
 * A motion: what it changes, what it costs its proposer in political capital, and how well it serves each want (−1
 * harms, 1 serves fully). `habits` adds a nudge for the habits it sits well or badly with, and `dryness` how far a dry
 * summer pushes every member towards it (0 none, 1 hard). 
 */
export interface Motion {
  name: string;
  what: string;
  cost: number;
  appeal: Record<Want, number>;
  habits: Partial<Record<Habit, number>>;
  dryness: number;
}
export const MOTIONS: Record<MotionId, Motion> = {
  waterRota: {
    name: 'The water rota', what: 'Fixed slots at the trough instead of first come first served', cost: 3,
    appeal: {harvest: 0.25, rest: 0.1, standing: -0.2, money: 0}, habits: {competitive: -0.15}, dryness: 0.2,
  },
  // part 8's other rota: the trough shared by what each plot is short of (Ostrom's allocation by need), put by a generous neighbour
  waterNeed: {
    name: 'Water by need', what: 'The trough shared by what each plot needs instead of first come first served', cost: 3,
    appeal: {harvest: 0.2, rest: 0.05, standing: -0.1, money: 0}, habits: {generous: 0.1, competitive: -0.2}, dryness: 0.25,
  },
  bonfireBan: {
    name: 'The bonfire ban', what: 'No burning garden waste on site: a heap for it instead', cost: 4,
    appeal: {harvest: 0.1, rest: -0.35, standing: 0.3, money: 0.1}, habits: {tidy: -0.22, lazy: -0.22, generous: 0.1}, dryness: 0,
  },
  plotToBees: {
    name: 'A plot for the bees', what: 'One empty plot sown with flowers, not let again', cost: 3,
    appeal: {harvest: -0.3, rest: 0.3, standing: 0.3, money: -0.1}, habits: {tidy: -0.3, generous: 0.1}, dryness: 0,
  },
  hosepipe: {
    name: 'The hosepipe rule', what: 'Cans only from the trough until the water company lifts its ban', cost: 2,
    appeal: {harvest: -0.5, rest: 0.1, standing: 0.2, money: 0.1}, habits: {competitive: -0.2}, dryness: 0.9,
  },
};

/** How a vote tips. A member's lean is the wants' weights times the motion's appeal, plus the habit's nudge, the dryness, and `goodwill` times how far their goodwill towards the proposer is from neutral (either way, doubled); a day's mood (from the dice) moves it up to `mood` either way. They vote yes above `abstainBand`, no below its negative, and abstain between. */
export const VOTE = {goodwill: 0.35, mood: 0.05, abstainBand: 0.02};

/**
 * Persuasion: an hour spent talking to a member moves their lean towards yours by up to `max` in all, with `scale`
 * hours to get most of the way there (`1 − e^(−h/scale)`), more for someone who likes you (`× (0.5 + goodwill)`).
 */
export const PERSUADE = {max: 0.25, scale: 2};

/** Political capital: `start` and `cap` in points, and what a week adds at neutral goodwill (goodwill above or below 0.5 scales it, doubled). */
export const CAPITAL = {start: 4, cap: 8, weekly: 0.4};

/** What a vote does to goodwill: voting the way a member did earns `with` from them; voting against them costs `against`; a member on the losing side is sour with the proposer, `proposer`. */
export const AFTERMATH = {with: 0.01, against: -0.03, proposer: -0.02};

/** The rules a plot lives under. */
export interface Rules {
  /** First come first served, fixed slots (an equal share each), or shared by need. */
  rota: 'open' | 'slots' | 'need';
  bonfires: 'allowed' | 'banned';
  /** Plots let go to bees. */
  bees: number;
  hosepipe: 'off' | 'on';
}
export const START_RULES: Rules = {rota: 'open', bonfires: 'allowed', bees: 0, hosepipe: 'off'};
export const PLOTS = 12;
/** The most plots that can go to the bees: empty ones only, and a plot let go is one the site has spare. */
export const MAX_BEES = 3;
/**
 * What a rule costs or does, per plot: hours a week queueing at the trough (open: `queueBase` in a wet week, up to
 * `queue` more at the driest; slots: a flat `slot`, the wrong time now and then), the trough's litres a plot a day (a
 * hosepipe rule cuts them by `hosepipeCut`), the share of garden waste burnt where burning is allowed (`burn`), and the
 * pollination each bee plot adds to every plot's fruit set (a share).
 */
export const RULE = {queue: 1.5, queueBase: 0.25, slot: 0.5, litres: 300, hosepipeCut: 0.5, burn: 0.5, pollination: 0.02};

/**
 * Garden waste, burnt or composted, kg CO₂e per kg wet waste. Green waste is about 40 % dry matter and 45 % carbon
 * (IPCC 2006 defaults), so a kg holds 0.66 kg CO₂ that plants took from the air: burnt, 95 % goes back at once and open
 * burning adds CH₄ (6.5 g/kg wet) and N₂O (0.15 g/kg) at GWP 28 and 265; composted, about 60 % of the carbon goes back
 * over a year and biological treatment adds CH₄ (4 g/kg) and N₂O (0.3 g/kg). What isn't returned is kept: as compost
 * carbon, or as ash and char.
 */
export const WASTE = {co2: 0.66, burnReturned: 0.95, burnCh4: 0.0065, burnN2o: 0.00015, compostReturned: 0.6, compostCh4: 0.004, compostN2o: 0.0003, gwp: {ch4: 28, n2o: 265}};
