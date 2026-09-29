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
// The mid-priced kit, each a smaller trade than the big buys:
// - A digging fork: its tines go into heavy ground and lift turf and roots out with less effort than a spade's blade, so
//   a new bed is dug about a fifth faster (RHS, "Digging": a fork for heavy or stony soil).
// - Cloches: a row of polythene tunnel cloches over one bed keeps off about 2 °C of frost and warms the soil, so sowings
//   go in about two weeks earlier in spring and later in autumn; like the frame, they keep the rain off (RHS, "Cloches").
// - A heated propagator: tender plants raised from a packet of seed on a windowsill instead of bought as young plants, a
//   packet costing about a third of a tray of plants (RHS, "Propagators"; rough 2027 prices).
// - A bee hotel: bundled hollow stems where red mason bees (Osmia bicornis) nest from April to June, a few more bees
//   about the garden's flowers (the Wildlife Trusts, "How to build a bee hotel"; Gathmann & Tscharntke 2002 for their
//   foraging range of a few hundred metres).
// - A cordon redcurrant: a bare-root bush trained as a single stem against the fence, about 1 kg of fruit a summer once
//   established; bare-root plants are sold and planted from November to March, when they're dormant: cheaper than potted
//   ones, and they settle in best then (RHS, "Redcurrants" and "Bare-root plants").

export type UpgradeId = 'beer-trap' | 'hose' | 'nematodes' | 'compost-bin' | 'cold-frame' | 'water-butt' | 'raised-bed' | 'water-tank' | 'greenhouse' | 'fruit-cage' | 'hens' |
  'fork' | 'cloches' | 'propagator' | 'bee-hotel' | 'cordon';

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
  'bee-hotel': {
    id: 'bee-hotel', name: 'Bee hotel', price: 12, kept: true,
    does: 'Hollow stems on the fence where mason bees nest in spring.',
    saves: 'A few more bees over the beans and tomatoes: a little more set.',
    trade: 'Only from April to June, and only a few bees.',
  },
  cordon: {
    id: 'cordon', name: 'Cordon redcurrant', price: 12, kept: false,
    does: 'A bare-root redcurrant trained up the fence.',
    saves: 'About 1 kg of fruit a summer once established.',
    trade: 'Only planted from November to March, and a light crop the first summer.',
  },
  fork: {
    id: 'fork', name: 'Digging fork', price: 22, kept: true,
    does: 'A fork for lifting turf and breaking up heavy ground.',
    saves: 'A new bed dug about a fifth faster.',
    trade: 'No help with anything but digging.',
  },
  cloches: {
    id: 'cloches', name: 'Cloches', price: 20, kept: true,
    does: 'A row of tunnel cloches over one bed: 2 °C of frost kept off.',
    saves: 'Sowings two weeks earlier in spring and later in autumn.',
    trade: 'Less than the frame, and the bed under them needs watering.',
  },
  propagator: {
    id: 'propagator', name: 'Propagator', price: 25, kept: true,
    does: 'A heated tray on the windowsill for raising plants from seed.',
    saves: 'Tomatoes, leeks and marigolds from a packet, not a tray of plants.',
    trade: 'It pays back only after a few sowings.',
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

/** The winter seed catalogue: next year's seed ordered in winter, by post, about a third cheaper than the garden centre's
 *  packets at sowing time (a catalogue's collection prices against single packets, rough 2027): about £5.50 a dug bed
 *  for its year's sowings. Blight-resistant varieties (Sarpo Mira potatoes, Crimson Crush tomatoes: bred to resist
 *  Phytophthora infestans; the Sarpo Potatoes trust and the RHS's trials) cost about a quarter more and let through about
 *  a third of blight's start and spread (`resists`). Ordered from December to February, for the garden year from March. */
export const CATALOGUE = {perBed: 5.5, resistant: 1.25, resists: 0.3, crops: ['potatoes', 'tomatoes'], from: 12, to: 2};
export type Variety = 'standard' | 'resistant';
/** Horticultural fleece: a 17 g/m² sheet laid over a bed keeps about 2 °C of frost off (RHS, "Frost protection"); it's
 *  left on through a cold spell, four nights, then taken off to let the light in; a roll for the garden's beds costs
 *  about £6, bought the first time it's needed and kept. */
export const FLEECE = {frost: 2, gbp: 6, hours: 4 * 24};
/** Chitting seed potatoes: set out in egg boxes on a cool, light windowsill from February, they sprout short green shoots
 *  and come up about two weeks sooner once planted (RHS, "Potatoes: chitting"); about 70 degree days of a spring
 *  start. A chitting lasts until the planting, up to about a hundred days. */
export const CHIT = {dd: 70, days: 100, from: 2, to: 3};
/** Warming the soil: fleece (or polythene) laid over an empty bed for a fortnight before sowing warms it a few degrees,
 *  so the first sowings go in about two weeks sooner (RHS, "Soil: warming"); asked from February to mid-April, and the
 *  sowing season stays early for a month after. */
export const WARM = {days: 14, lasts: 45, from: 2, to: 4};

/** The digging fork: the share of a spade's time a m² of digging takes with it. */
export const FORK = {dig: 0.8};
/** The propagator: the crops it raises from seed, and their seed's cost as a share of a tray of young plants. */
export const PROPAGATOR = {crops: ['tomatoes', 'leeks', 'marigolds'], share: 0.35};
/** The bee hotel: mason bees it adds in the months they fly. */
export const HOTEL = {bees: 3, months: [4, 5, 6]};
/** Cordon redcurrants: the most the fence takes, each one's fruit a summer once established, kg, the fence it takes, m²,
 *  and bare-root season (November to March). */
export const CORDON = {most: 6, kg: 1, m2: 0.3, from: 11, to: 3};
/** Whether a date is in bare-root season. */
export const bareRoot = (month: number) => month >= CORDON.from || month <= CORDON.to;
/** Raking the autumn leaves onto the heap: kg a clear-up gathers from the lawn and the beds (a small garden's share of a
 *  street tree's fall), and what a kg carries: fallen leaves are about 40 % dry matter, 45 % of it carbon, 0.8 % nitrogen
 *  (RHS, "Leaf mould"; Garden Organic, "Leafmould"). Asked from mid-October to November. */
export const LEAVES = {kg: 25, co2e: 0.4 * 0.45 * (44 / 12), n: 0.4 * 0.008, from: [10, 15], to: [11, 30]} as const;
/** Digging the beds over in winter: the flush of CO₂ from the soil's organic matter, kg CO₂e a m² (as a new bed's,
 *  src/data/garden.ts's DIG), and the share of a bed's slugs and their eggs turned up to the birds and the frost (RHS,
 *  "Slugs and snails": cultivation exposes eggs). No-dig leaves both (Charles Dowding's no-dig trials at Homeacres:
 *  similar or higher yields from undug beds under a compost mulch). Asked in December and January. */
export const DIG_OVER = {flushPerM2: 0.03, slugs: 0.3, from: 12, to: 1};
