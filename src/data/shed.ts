// The shed: what's worth having next, shown in the Shed tab once the garden first needs it (src/data/unfold.ts,
// `garden.shed`). Part 6a shows the first, the beer trap, with its price and what it does; buying it, and the rest of the
// shed's upgrades (a hose, nematodes, a wheelbarrow, a cold frame, netting, more beds, the hen house), are part 6c's.
// A beer trap is a small pot sunk to its rim and part-filled with beer: slugs are drawn by the smell of the yeast and
// drown. It catches slugs every night without the gardener going out with a torch, so it costs no time once set, and a
// few pounds for the pot and the beer (RHS, "Slugs and snails").

export interface ShedOffer {
  id: string;
  name: string;
  /** £ */
  price: number;
  /** What it does, in a line. */
  does: string;
}

/** The first thing worth having: shown with the first time slugs cost the gardener time or money. */
export const FIRST_OFFER: ShedOffer = {id: 'beer-trap', name: 'Beer trap', price: 4, does: 'Catches most slugs, costs no time.'};
