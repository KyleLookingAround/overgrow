// The allotment's people: the four habits and what each wants, the eleven neighbours and their households, the helper's
// share and what an unwatched one takes beyond it, what watching costs, how trust and goodwill move, and the seed
// catalogue's interest. Rough, invented-name numbers with their sources; src/sim/models/agency.ts uses them and
// docs/systems/agency.md says how.
//
// Licences: none of this is copied data. Allotment hours and yields are rounded from the National Allotment Society's
// and RHS's public guidance (about six hours a week keeps a ten-rod plot, src/data/household.ts's PLOT); the principal–
// agent figures (how far a report drifts from the truth, what watching costs and deters) are this file's own, set so a
// lever has a trade-off, not read from a survey; goodwill's slow drift and its halving time are set from the repeated-
// games literature's shape (Axelrod 1984; Ostrom 1990 on monitoring common-pool rules), the sizes are the game's own. The
// names are invented first names; no real place or person.
import type {JobKind} from './household';

export type Habit = 'tidy' | 'lazy' | 'generous' | 'competitive';
export const HABIT_IDS: readonly Habit[] = ['tidy', 'lazy', 'generous', 'competitive'];
/** What a person wants; each agent's goals are weights over these that sum to 1. */
export type Want = 'harvest' | 'rest' | 'standing' | 'money';
export const WANTS: readonly Want[] = ['harvest', 'rest', 'standing', 'money'];

/**
 * A habit sets a person's starting goals, the share of the plot hours they really give (`effort`), the share of a
 * surplus they give away at the swap shed (`give`), how hard they lean on a helper's share (`grab`, 1 an average
 * neighbour), and how far their honesty sits from the site's mean (`integrity`, added to it).
 */
export const HABITS: Record<Habit, {name: string; goals: Record<Want, number>; effort: number; give: number; grab: number; integrity: number}> = {
  tidy: {name: 'Tidy', goals: {harvest: 0.3, rest: 0.1, standing: 0.5, money: 0.1}, effort: 1.1, give: 0.2, grab: 0.5, integrity: 0.1},
  lazy: {name: 'Lazy', goals: {harvest: 0.15, rest: 0.6, standing: 0.05, money: 0.2}, effort: 0.85, give: 0.1, grab: 1, integrity: 0},
  generous: {name: 'Generous', goals: {harvest: 0.3, rest: 0.2, standing: 0.4, money: 0.1}, effort: 1, give: 0.5, grab: 0.6, integrity: 0.05},
  competitive: {name: 'Competitive', goals: {harvest: 0.5, rest: 0.05, standing: 0.3, money: 0.15}, effort: 1.05, give: 0.05, grab: 1.6, integrity: -0.1},
};
/** How far a person's own goals stray from their habit's, so no two tidy neighbours want quite the same (a share of each weight). */
export const GOAL_SPREAD = 0.3;

/** The share of a household's garden hours that go to its allotment plot: the rest are the home garden and the rest of life. A full-time worker alone gives their plot about 3.8 hours, 64 % of what a ten-rod plot needs. */
export const PLOT_SHARE = 0.12;
/** A week's luck (a cold, a wet weekend, a good spell) spreads each week's plot hours by up to this share either way. */
export const WEEK_JITTER = 0.2;

/** What a household looks like, by jobs (src/data/household.ts): the plot-holder, a partner if any, a child if any. */
export interface HouseholdShape {
  holder: JobKind;
  partner?: JobKind;
  child?: boolean;
}
export const SHAPES: Record<string, HouseholdShape> = {
  alone: {holder: 'full'},
  alonePart: {holder: 'part'},
  aloneRetired: {holder: 'none'},
  couple: {holder: 'full', partner: 'full'},
  coupleMixed: {holder: 'part', partner: 'full'},
  coupleRetired: {holder: 'none', partner: 'none'},
  family: {holder: 'full', partner: 'part', child: true},
  coupleOne: {holder: 'full', partner: 'none'},
};

/** The eleven neighbours: invented first names, a habit each (three tidy, three lazy, two generous, three competitive) and a household. Exactly one lives alone in full-time work, so exactly one household has the least time: which plot they hold is drawn from the seed, who they are is not. */
export const NEIGHBOURS: {name: string; habit: Habit; shape: keyof typeof SHAPES}[] = [
  {name: 'Bryony', habit: 'tidy', shape: 'coupleRetired'},
  {name: 'Idris', habit: 'lazy', shape: 'alone'},
  {name: 'Marnie', habit: 'generous', shape: 'aloneRetired'},
  {name: 'Osei', habit: 'competitive', shape: 'couple'},
  {name: 'Tamsin', habit: 'tidy', shape: 'family'},
  {name: 'Wendell', habit: 'lazy', shape: 'coupleOne'},
  {name: 'Priya', habit: 'competitive', shape: 'coupleMixed'},
  {name: 'Dougal', habit: 'generous', shape: 'coupleRetired'},
  {name: 'Halima', habit: 'tidy', shape: 'alonePart'},
  {name: 'Rafe', habit: 'lazy', shape: 'coupleMixed'},
  {name: 'Sunniva', habit: 'competitive', shape: 'family'},
];

/** Honesty (integrity, 0 to 1) is drawn around `mean` with `spread` either way, then the habit's shift is added and it is kept between `min` and `max`. The helper is drawn from the low end: `helperMax` is the highest a helper's can be, so the lesson lands. */
export const INTEGRITY = {mean: 0.72, spread: 0.25, min: 0.2, max: 1, helperMax: 0.6};

/**
 * Helping with the second plot, for a share of its harvest. `share` is the agreed share of the harvest; a helper of no
 * integrity, never watched, and of an average appetite takes `extra` more of it, a share of the harvest, unreported.
 * `plotKg` is a fully kept second plot's harvest in a week, kg (about 12 kg at the National Allotment Society's rough
 * 2 to 4 kg a m² a year over 250 m², in season), `hourKg` the kg one more hour on a plot is worth to the player:
 * the price of their time, which the tests set both higher and lower, `hoursNeeded` the hours a week a plot needs
 * (src/data/household.ts's PLOT), and `lend` the share of a household's garden hours it would lend a neighbour, less its
 * wish to rest.
 */
export const HELP = {share: 0.33, extra: 0.35, plotKg: 12, hourKg: 1.5, hoursNeeded: 6, lend: 0.1};

/**
 * Watching, by how closely (the lever's three settings). `hours` is what it costs the player a week, `watch` how far it
 * closes the gap between report and truth (0 not at all, 1 entirely), `goodwill` what it costs in the watched person's
 * goodwill a week, and `deter` (of its `watch`) how much of the extra taking it stops beyond what it merely finds out.
 */
export const WATCH = {
  trust: {hours: 0, watch: 0, goodwill: 0},
  glance: {hours: 0.5, watch: 0.35, goodwill: 0.01},
  audit: {hours: 2, watch: 0.8, goodwill: 0.04},
  deter: 0.6,
};
export type Watching = 'trust' | 'glance' | 'audit';

/**
 * Goodwill and trust, both 0 to 1 and slow. Goodwill (theirs towards you) drifts back to `baseline` by `drift` a week
 * (a half-life of about half a year); each thing that moves it is worth `per` of a step that shrinks as it nears 0 or 1.
 * Trust (yours in their reports) starts at `prior` and moves `learn` of the way to what an audit finds.
 */
export const TRUST = {
  baseline: 0.5,
  drift: 0.026,
  prior: 0.5,
  learn: 0.4,
  /** What each kind of thing is worth to goodwill; shared surplus and help are per kg and per hour. */
  events: {kept: 0.03, missed: -0.06, shared: 0.004, help: 0.006, gap: -0.05, rescued: 0.06} as Record<string, number>,
  /** The most a week's shared surplus can add, whatever the kg. */
  sharedCap: 0.05,
};

/** What a carbon choice does to goodwill (Q14: carbon has a price through people): smoke and peat and a plot dug from grass cost it; a heap and no-dig earn it. */
export const CARBON_CHOICE: Record<string, number> = {peat: -0.03, bonfire: -0.05, 'plot dug from grass': -0.04, compost: 0.02, 'no-dig': 0.02};

/** The seed catalogue, an adviser with an interest: it scores its own seeds `bias` higher than their merit. Merit is 0 to 1. Its recommendation is honest about the merit and weighted in the score, which is what the Explain card shows. */
export const CATALOGUE = {bias: 0.3};
