// The shed: what the garden can buy, each shown in the Shed tab once it's worth having (its own `shed.<id>` key in
// src/data/unfold.ts), with its price, the time it saves and what it costs besides, bought with a `buy` command from the
// household's purse (src/sim/shed.ts). Each works through a real mechanism in the sim, not a bonus, and each is a trade:
// money for time, or yield for soil or carbon. Prices are rough UK garden-centre ones for 2027.
// - A beer trap: a pot sunk to its rim and part-filled with beer; slugs drawn by the yeast drown in it, every night,
//   without the gardener out with a torch. It needs fresh beer each week, and drowns some ground beetles, which eat
//   slugs, as well (RHS, "Slugs and snails").
// - A hose on a reel from the tap: the beds watered straight from the mains, no trips with a can, but no rain from the
//   butt either (RHS, "Watering"; a garden tap runs 10–15 L a minute).
// - Nematodes (Phasmarhabditis hermaphrodita, sold as Nemaslug): watered onto moist soil, they enter slugs below
//   ground and kill them over a few days, for about six weeks; they only work in soil above about 5 °C and moist
//   (Wilson et al. 1993, "Biological control of slugs in winter wheat using the rhabditid nematode Phasmarhabditis
//   hermaphrodita"; RHS, "Biological controls").
// - A compost bin: a closed plastic bin keeps the heap warm and moist, so it breaks down faster and loses less of its
//   nitrogen to the air and the rain, though a closed bin left unturned goes short of air and makes a little more
//   methane (WRAP, "Home composting"; Amlinger, Peyr & Cuhls 2008, "Greenhouse gas emissions from composting and
//   mechanical biological treatment").
// - A cold frame: a glazed box over a bed keeps off a few degrees of frost and warms the soil, so sowings go in about
//   three weeks earlier in spring and later in autumn; it keeps the rain off too, so the bed under it needs watering
//   (RHS, "Cold frames").
// - A second water butt linked to the first: twice the store of the shed roof's rain for a dry spell; the roof is small,
//   so it only fills in a wet one (RHS, "Water butts").

export type UpgradeId = 'beer-trap' | 'hose' | 'nematodes' | 'compost-bin' | 'cold-frame' | 'water-butt';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  /** £ */
  price: number;
  /** What it does, in a line. */
  does: string;
  /** The time it saves or the crop it keeps, in a line. */
  saves: string;
  /** What it costs besides the price: its trade, in a line. */
  trade: string;
  /** Bought once and kept, or used up (a pack of nematodes lasts about six weeks, and can be bought again). */
  kept: boolean;
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  'beer-trap': {
    id: 'beer-trap', name: 'Beer traps', price: 4, kept: true,
    does: 'A pot of beer sunk in each bed: slugs drown in it every night.',
    saves: 'The torch patrol’s evenings: set the slug policy to leave them.',
    trade: 'Beer at 80p a week, and it drowns a few slug-eating beetles too.',
  },
  hose: {
    id: 'hose', name: 'Hose and reel', price: 25, kept: true,
    does: 'Water straight from the tap onto the beds.',
    saves: 'No trips with the can: a bed watered in minutes.',
    trade: 'All of it mains water: the butt’s rain goes unused.',
  },
  nematodes: {
    id: 'nematodes', name: 'Nematodes', price: 13, kept: false,
    does: 'Tiny worms watered onto the beds kill slugs below ground for six weeks.',
    saves: 'Slugs cut down without pellets or the torch.',
    trade: 'Only in moist soil above 5 °C, and gone after six weeks.',
  },
  'compost-bin': {
    id: 'compost-bin', name: 'Compost bin', price: 30, kept: true,
    does: 'A closed bin for the heap: warmer and moister inside.',
    saves: 'Compost in about two thirds of the time, keeping more of its nitrogen.',
    trade: 'Unturned, it makes a little more methane.',
  },
  'cold-frame': {
    id: 'cold-frame', name: 'Cold frame', price: 40, kept: true,
    does: 'A glazed frame over one bed: 3 °C of frost kept off.',
    saves: 'Sowings three weeks earlier in spring and later in autumn.',
    trade: 'It keeps the rain off too: the bed under it needs watering.',
  },
  'water-butt': {
    id: 'water-butt', name: 'Second water butt', price: 40, kept: true,
    does: 'Another 200 L butt linked to the first.',
    saves: 'Twice the rain kept for a dry spell: fewer trips to the tap.',
    trade: 'The shed roof is small: it only fills in a wet spell.',
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** The beer trap: the share of each night's slugs out that drown in it, and the beer it takes a week, £. */
export const BEER_TRAP = {share: 0.35, beerPerWeek: 0.8};
/** Nematodes: how long a pack lasts, days, and the share of a bed's slugs they kill a day in warm, moist soil (a
 *  field dose cuts slug numbers by most of their number over two or three weeks: Wilson et al. 1993). */
export const NEMATODES = {days: 42, kill: 0.06, minTemp: 5, minMoisture: 0.5};
/** The compost bin: breakdown faster by this factor, the share of nitrogen lost instead of the open heap's, and the
 *  methane and nitrous oxide as a multiple of the open heap's. */
export const BIN = {pace: 1.5, nLost: 0.12, gases: 1.25};
/** The second butt: litres it adds to the store. */
export const SECOND_BUTT = 200;
/** The hose: litres a minute from the tap, and minutes to run it out and reel it back. */
export const HOSE = {perMin: 12, setup: 5};
