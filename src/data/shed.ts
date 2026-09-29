// The shed: what the garden can buy, each shown in the Shed tab once it's worth having (its own `shed.<id>` key in
// src/data/unfold.ts), with its price, the time it saves and what it costs besides, bought with a `buy` command from the
// household's purse (src/sim/shed.ts). Each works through a real mechanism in the sim, not a bonus, and each is a trade:
// money for time, or yield for soil or carbon. Prices are rough UK garden-centre ones for 2027.
// - A beer trap: a pot sunk to its rim and part-filled with beer; slugs drawn by the yeast drown in it, every night,
//   without the gardener out with a torch. It needs fresh beer each week, and catches a smaller share of the night's
//   slugs than picking them by torch (RHS, "Slugs and snails").
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
// - Raised beds: a timber frame a board or two high filled with topsoil and compost over a dug bed; the soil drains
//   faster after rain and warms sooner in spring, so sowings can go in a little earlier (RHS, "Raised beds").
// - A rainwater tank on the house's downpipe: a slimline 350 L tank takes half the back roof's rain through a diverter,
//   many times the shed roof's (RHS, "Water butts"; a UK back roof is about 40 m²).
// - A greenhouse: a 6 × 8 ft (1.8 × 2.4 m) polycarbonate house on a base, an unheated one: it keeps about 5 °C of frost
//   off, runs a few degrees warmer than outside by day, stretches the seasons about six weeks at each end, and keeps
//   tomatoes' leaves dry, so blight rarely starts (RHS, "Greenhouses: getting started" and "Tomato blight"). It's cropped
//   and watered like a bed; the gardener waters it, since no rain falls inside.
// - A fruit cage with soft fruit: a netted cage over raspberry canes and currant bushes, the net keeping the birds off.
//   Summer raspberries fruit on last year's canes and currants on older wood, so a new planting crops lightly the next
//   summer and fully from the one after (RHS, "Raspberries" and "Blackcurrants": about 1.5–2 kg a m² once established).
// - A hen house and three hens: point-of-lay hybrids in a house with a run on the lawn (src/data/livestock.ts, the
//   `livestock` model): a daily chore of feeding, watering and collecting eggs, and a weekly clean-out whose droppings
//   go to the heap with their nitrogen; layers' pellets from the purse (about £13 for 20 kg, which three hens eat in about
//   two months). Hybrids lay about 280 eggs a year, few in the dark months (the British Hen Welfare Trust; Defra's
//   guidance for keepers of fewer than 50 birds).

export type UpgradeId = 'beer-trap' | 'hose' | 'nematodes' | 'compost-bin' | 'cold-frame' | 'water-butt' | 'raised-bed' | 'water-tank' | 'greenhouse' | 'fruit-cage' | 'hens';

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
  /** Bought once and kept, or used up (a pack of nematodes lasts about six weeks, and can be bought again); a raised bed
   *  is kept but bought once for each dug bed. */
  kept: boolean;
  /** A big buy, worth saving for: the Shed tab shows how far the purse has to go. */
  big?: true;
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  'beer-trap': {
    id: 'beer-trap', name: 'Beer traps', price: 4, kept: true,
    does: 'A pot of beer sunk in each bed: slugs drown in it every night.',
    saves: 'The torch patrol’s evenings: set the slug policy to leave them.',
    trade: 'Beer at 80p a week, and it catches fewer than the torch.',
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
  'raised-bed': {
    id: 'raised-bed', name: 'Raised bed', price: 45, kept: false,
    does: 'A timber frame topped up with soil and compost over one dug bed.',
    saves: 'It drains after rain and warms sooner: sowings go in ten days earlier.',
    trade: 'Timber and compost for one bed; the next bed is another.',
  },
  'water-tank': {
    id: 'water-tank', name: 'Rainwater tank', price: 85, kept: true,
    does: 'A 350 L tank on the house’s downpipe, linked to the butt.',
    saves: 'Half the house roof’s rain: the tap left alone through most dry spells.',
    trade: 'A big tank against the house wall.',
  },
  greenhouse: {
    id: 'greenhouse', name: 'Greenhouse', price: 320, kept: true, big: true,
    does: 'A 6 × 8 ft greenhouse on the lawn, cropped like a bed under glass.',
    saves: 'Tomatoes without blight, and six more weeks of season at each end.',
    trade: 'Lawn under glass, no rain inside, and the price of a year’s saving.',
  },
  'fruit-cage': {
    id: 'fruit-cage', name: 'Fruit cage', price: 150, kept: true, big: true,
    does: 'Raspberry canes and currant bushes under a net on the lawn.',
    saves: 'About 10 kg of fruit a summer once established, for the household’s fruit.',
    trade: 'A light crop next summer and the full one only the summer after.',
  },
  hens: {
    id: 'hens', name: 'Hen house and three hens', price: 240, kept: true, big: true,
    does: 'Three hens in a house with a run on the lawn.',
    saves: 'Eggs every day in summer, and droppings rich in nitrogen for the heap.',
    trade: 'A chore every day, layers’ pellets each week, and few eggs in winter.',
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
/** A raised bed: the days it moves sowing seasons earlier and later, and how much faster it drains. */
export const RAISED = {days: 10, drain: 2};
/** The rainwater tank: litres it adds to the store, and the house roof it takes, m² (half a 40 m² back roof). */
export const TANK = {litres: 350, roofM2: 20};
/** The hens: three of them on 12 m², their run and an hour or two out on the lawn a day (the RSPCA's 4 m² a hen); layers' pellets bought a week, £ (a 20 kg sack at about £13 lasts three hens about eight weeks), kg of feed
 *  a sack, the feed kept topped up to a week's, and the keeper's minutes a day and for the weekly clean-out (feeding,
 *  water, eggs and a look at the birds: the British Hen Welfare Trust's ten minutes or so a day). */
export const HENS = {head: 3, area: 12, sackGbp: 13, sackKg: 20, feedDays: 7, dailyMinutes: 10, cleanMinutes: 30};

/** The hose: litres a minute from the tap, and minutes to run it out and reel it back. */
export const HOSE = {perMin: 12, setup: 5};
