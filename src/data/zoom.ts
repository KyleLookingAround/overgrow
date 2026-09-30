// The zoom back in (part 9): the scripted slug outbreak from the neglected plot into the player's own garden, the
// deadline to fix it in, what a rescue earns, and the adviser who can be sent instead. For src/sim/zoom.ts. Rough numbers:
// - Slugs from untended ground: RHS, "Slugs and snails", and AHDB, "Slug control": weedy, untended ground next door is a
//   reservoir, and in a mild wet summer a garden beside it can carry three times its usual slugs, about 12 a m² of bed
//   against about 4 (src/data/pests.ts's `SLUGS.start` and `thriving`).
// - What they cost a plot left alone: a heavy slug year takes a third to a half of leafy crops (AHDB, "Slug control");
//   the outbreak takes 40 % of the plot's output for four weeks, and dies back as the summer dries.
// - The fix, the outbreak broken (its slugs halved): in the garden's own model a torch patrol, traps or pellets do it in
//   about a week of a damp June, nematodes in about a week whatever the weather, and doing nothing takes two weeks or more
//   (the probes on seeds 1–3, docs/systems/zoom.md).
// - The adviser: a slug-savvy neighbour with a pack of nematodes (Nemaslug, about £13–£20 a pack for 40 m², working in
//   three to seven days) and beer traps, for their time and the pack.

/** The outbreak: when it comes (the first wet day from June to August at least `afterDays` after the plot is taken), what
 *  it takes from the sealed garden while it lasts, and the deadline to fix it in, in garden days. */
export const OUTBREAK = {
  months: [6, 7, 8] as readonly number[],
  afterDays: 28,
  size: 0.4,
  days: 28,
  deadlineDays: 14,
  /** Slugs arriving in the garden: a m² of planted bed, and onto the lawn's edge. */
  arrive: {perM2: 14, edge: 100},
  /** Fixed: the slugs a m² of the growing beds down to this share of what they were once the slugs arrived (the outbreak
   *  broken, as a patrol in a wet spell, traps, pellets or nematodes do it in a week or two). */
  clear: 0.5,
} as const;

/** A rescue in time: Reliability's lasting mark, and goodwill with the neighbours, from `most` (at once) to `least` (at
 *  the deadline), as a share of the agency model's rescue step. */
export const RESCUE = {reliability: 10, most: 1, least: 0.35} as const;

/** Someone who can be sent down instead of the player ("let them decide"): their fee, how many days they take, and the
 *  line saying what they did. Part 10's advisers join this table. */
export interface Adviser {
  id: string;
  name: string;
  /** £ from the household's purse. */
  fee: number;
  days: number;
  /** The share of a rescue's reward the player still gets. */
  reward: number;
  did: string;
}

export const ADVISERS: Record<string, Adviser> = {
  slugs: {
    id: 'slugs', name: 'Pat from Row C', fee: 18, days: 4, reward: 0.5,
    did: 'watered nematodes onto the beds and sank beer traps along the fence',
  },
};
