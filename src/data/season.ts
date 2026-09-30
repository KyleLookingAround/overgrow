// The allotment's first season (part 8): the shared trough's refill and what a plot draws from it in a dry spell, what
// going short costs a plot, pests spreading from an untended plot by distance, the second plot's reclaiming and when it's
// offered, the swap shed's gluts by the season, and the household's hours at the allotment. Rough numbers with their
// sources; src/sim/season.ts uses them and docs/systems/season.md says how.
//
// Sources: FAO-56 (Allen et al. 1998) for a crop's water use as the reference evapotranspiration times a coefficient
// (about 0.9 for a mixed vegetable plot in full growth) over the ground watered; allotment site rules and water companies'
// guidance on shared troughs fed by a ballcock on a standpipe (a low-pressure shared supply refills a trough of about a
// cubic metre over hours, not minutes); Ostrom (1990), "Governing the Commons", for a common-pool resource shared by
// first come, by rota or by need; RHS, "Slugs and snails" and "Weeds", for untended ground as a reservoir of slugs and
// weed-borne pests that move a few metres a night into the plots beside it; the National Allotment Society's guidance on
// taking on an overgrown plot (clearing it by hand takes a season or two of steady weekends); DEFRA Family Food for the
// household's basket (src/data/household.ts). Licence: original to this project (rough figures from public guidance; no
// dataset copied), so it carries the project's.

/** The shared trough: its mains refill a day through the ballcock, L (a standpipe on a shared, low-pressure supply). */
export const TROUGH = {
  refill: 1400,
  /** A plot is watered once its soil has had this many days in a row with less than a millimetre of rain. */
  dryDays: 3,
  /** The share of a plot's ground watered by can (the thirsty crops, not the paths and the potatoes), and FAO-56's
   *  coefficient for a mixed vegetable plot in full growth. */
  watered: 0.5,
  kc: 0.9,
  /** A plot's need scales with how kept it is: a weedy plot has fewer crops to water. `floor` of the need at none kept. */
  floor: 0.3,
  /** What going short costs a plot: `yield` of a day's harvest at a fully short day (the crops wilt and slow), and
   *  `health` of its Health target at a fully short week (bolting, blossom end rot, a check to the soil's life). */
  yield: 0.4,
  health: 10,
  /** A plot counts as short on a day it gets less than this share of its need. */
  short: 0.8,
};

/**
 * How kept a neighbour's plot is (its holder's week, src/sim/models/agency.ts) sets where its Health heads, from `none`
 * (nobody's been) to `full` (all the hours it needs), `kept^curve` of the way (a little neglect costs little, a lot costs
 * a lot: RHS on weeds seeding and perennials taking hold), and its kg against its usual week's, kept to `output`.
 */
export const KEPT = {none: 15, full: 80, curve: 1.5, output: [0.6, 1.3] as const};

/**
 * Pests from an untended plot (RHS): each plot is a source of slugs and weed-borne pests as it goes untended, `(1 −
 * kept) / wild`, up to 1 (a plot half untended harbours as much as one gone wild), and the pressure on a plot is the sources about it falling off with distance, `e^(−d / reach)`, d the metres
 * between the plots' centres (next door is about 13 m). Pressure costs `loss` of a week's harvest at full pressure,
 * from `from` to `to` (months, April to October: slugs are out in the damp months), and `health` of a plot's Health
 * target.
 */
export const SPREAD = {reach: 11, loss: 0.25, health: 8, from: 4, to: 10, wild: 0.5};

/**
 * The second plot: the neglected plot comes up for the taking `offerDay` days into the allotment (its holder gives it
 * up to the committee). Reclaiming it by hand takes `hours` of work in all (about six hours a week for half a year: the
 * National Allotment Society's "a season or two"), after which it yields like a well-kept neighbour's. `start` is how
 * reclaimed it is when taken (the holder did something). Its Health target runs from `health[0]` to `health[1]` as it's
 * reclaimed.
 */
export const SECOND = {offerDay: 12, hours: 150, start: 0.1, health: [30, 70] as const};

/**
 * The swap shed. Neighbours leave a share of their harvest there when their plots glut, by the season (`glut`, a share
 * of each day's harvest), in the season's glut groups; what's on the shelf a week goes home with whoever wants it
 * (`clear`, the share of the shelf taken each week). The household leaves what it grew beyond its week's need of a
 * group and takes the same kg of what it's short of, while there is some.
 */
export const SHED = {
  glut: {spring: 0.04, summer: 0.12, autumn: 0.1, winter: 0.02} as Record<'spring' | 'summer' | 'autumn' | 'winter', number>,
  groups: {spring: ['salads', 'greens'], summer: ['salads', 'tomatoes', 'greens'], autumn: ['potatoes', 'greens'], winter: ['greens', 'potatoes']} as
    Record<'spring' | 'summer' | 'autumn' | 'winter', readonly ('potatoes' | 'salads' | 'tomatoes' | 'greens')[]>,
  clear: 0.5,
};

/** The committee's first motion comes the first time the trough leaves a plot short; the meeting votes `days` later if
 *  the player hasn't. A member's persuasion is bought in whole hours, up to `talk` a member. */
export const MEETING = {days: 7, talk: 3};
