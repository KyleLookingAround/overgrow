// Flowers and the wildlife they bring, for the biodiversity model (src/sim/models/biodiversity.ts). A strip of French
// marigolds along a bed's edge (companion planting, RHS "Companion planting") or a bed of them; bees and hoverflies
// visit from about 10 °C (Corbet et al. 1993, "Temperature and the pollinating activity of social bees"), fewer on a wet
// day; ladybirds come out of winter at about the same warmth and gather where there are flowers (for nectar and
// pollen) and aphids (Dixon 2000). Numbers are a small suburban garden's: a few bees at a time from the gardens around
// with no flowers of its own, and a score or so with a patch in flower.

/** A border of flowers along a bed's front edge: its area, m², and the minutes the gardener takes to plant it. */
export const BORDER = {m2: 0.6, minutes: 12};

/** m² of flowers in bloom at which the garden's flowers count in full. */
export const FULL_FLOWERS = 1.5;

/** Bees about the garden at midday: from the neighbours' gardens, and more with the garden's own flowers in full; on a
 *  wet day a share of that; the bees at which every flower is visited. */
export const BEES = {base: 5, flowers: 15, wet: 0.4, full: 15, minMean: 10, months: [3, 4, 5, 6, 7, 8, 9, 10], follow: 0.5};

/** Ladybirds about the garden: a few with no flowers and no aphids, more with both; how fast they gather or leave a day. */
export const LADYBIRDS_ABOUT = {base: 2, flowers: 20, aphidsFull: 2000, minMean: 10, follow: 0.25};

/** How a spray's knock to the bees and ladybirds wears off: back this share of the way each day. */
export const RECOVER = 0.1;
