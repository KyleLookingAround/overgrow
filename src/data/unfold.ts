// What unfolds when (the owner's principle, 29 Sep: "systems unfolding to the user as they have influence";
// docs/decisions/ADR-2026-09-29-unfolding.md): every system runs from day one and the map stays alive, but an instrument
// (a plan line, a lever, a panel's number, a badge, a tab) appears only once the player first has influence over its
// system. Each key here is revealed the first time the game records one of its causes (src/sim/effects.ts), and goes
// into the state's saved `seen` list; a key not in this table never unfolds (it fails closed). The sim refuses a command
// on a lever whose key hasn't unfolded, so the bot plays the same game. Keys are named by level and system
// (`garden.water`), or by the node beside the level for the household's (`household.commute`), so the allotment's reuse
// the pattern with their own. The table is in the order a new player meets
// them; what's always shown (the core) is in CORE.

export interface Unfold {
  /** What it reveals, in a few words: the sign's "New: …". */
  what: string;
  /** Why now, in a short line: the sign's short Explain. */
  why: string;
  /** Any of these causes recorded reveals it. */
  causes: string[];
}

/** Shown from the first morning: the level, the date and time, the speeds, the gardener's card, the plan's sowing lines,
 *  the places, and the goal bar. */
export const CORE = 'the map, the date, the speeds, the gardener, the sowing plan, the places and the goal bar';

export const UNFOLD: Record<string, Unfold> = {
  // the gardener waters the first sowing in on the first morning: the first say the player has over the soil's water
  'garden.water': {what: 'soil moisture and the watering line', why: 'The gardener watered for the first time: now you set when they water.',
    causes: ['watering', 'drought', 'water stress']},
  // the slugs at dusk on the first damp evening (the founding spec's first minute)
  'garden.slugs': {what: 'the slugs’ policy line, their numbers and badges', why: 'Slugs came out on the damp beds: choose what the gardener does about them.',
    causes: ['slugs', 'hand-picking']},
  // the first time slugs cost the gardener time or money, a tool that saves it is worth having
  'garden.shed': {what: 'the Shed tab', why: 'Slugs are costing the gardener time: the shed has something for that.',
    causes: ['hand-picking', 'trapping', 'slug pellets']},
  // each thing the shed sells shows once it answers something that has happened (src/data/shed.ts): the beer traps with
  // the first time slugs cost time or money, so the first buy can come in the first week or two
  'shed.beer-trap': {what: 'beer traps in the shed', why: 'Slugs are costing the gardener time: beer traps catch them for nothing but beer.',
    causes: ['hand-picking', 'trapping', 'slug pellets']},
  // the household's first ask of the garden, on its second evening (the first minute's last moment)
  'garden.kitchen': {what: 'the Kitchen tab and the day’s ask', why: 'The household is looking to the garden for its veg.', causes: ['ask', 'eating']},
  // the gardener home from work on the second day, noted with the kitchen's first ask so the two share one sign
  'household.commute': {what: 'the gardener’s job', why: 'They work weekdays: that’s why the garden gets four hours a day.', causes: ['commute']},
  // money matters from the first payday (Friday of the first week), or the first sale or purchase if that comes sooner
  'garden.money': {what: 'money in the top bar and the week’s pay and shop', why: 'Payday: what’s left after the shop and the bills is the garden’s to spend.',
    causes: ['wages', 'honesty box', 'slug pellets', 'insecticide', 'fungicide', 'buying']},
  // every dug bed in use and a plot still under grass: "Dig this bed" on the plot's card (the command is open from the
  // start: digging is the first carbon choice)
  'garden.dig': {what: '“Dig this bed” on the beds under grass', why: 'Every dug bed is in use: another bed means more to eat and sell.',
    causes: ['beds full', 'digging']},
  // the first weekly shop the garden fed the household some of
  'household.groceries': {what: 'groceries saved', why: 'The garden fed the household this week: food it didn’t have to buy.', causes: ['groceries saved']},
  // aphids fly in from late May, and blight starts in a Smith period
  'garden.aphids': {what: 'the aphids’ policy line, their numbers and badges', why: 'Aphids have arrived: choose what the gardener does about them.',
    causes: ['aphids arriving', 'aphids']},
  'garden.blight': {what: 'the blight policy line, its share and badges', why: 'The weather has turned warm and muggy: blight can start.',
    causes: ['Smith period', 'blight']},
  // flowers matter once there are aphids for ladybirds to eat or pods for bees to set
  'garden.flowers': {what: 'marigolds in a bed or along its edge, and the flowers’ badges', why: 'Flowers bring ladybirds for the aphids and bees for the pods.',
    causes: ['aphids arriving', 'pollination', 'ladybirds']},
  // feeding the soil and the first carbon choice: the first compost spread or the first dig (and peat, part 6c)
  'garden.soil': {what: 'organic matter, N-P-K and soil health', why: 'The first compost went on a bed: what it feeds now shows.',
    causes: ['spreading compost']},
  'garden.carbon': {what: 'the carbon dial and the land', why: 'Compost and digging move carbon: the dial shows where it goes.',
    causes: ['spreading compost', 'digging']},
  // the shop food's footprint sits beside the dial, so it comes with it: the same first carbon choice
  'household.footprint': {what: 'the shop food’s footprint beside the dial', why: 'Beside the garden’s own: the carbon in the food the household buys.',
    causes: ['spreading compost', 'digging']},
  // a day's watering by can taking the gardener most of an hour: a hose would save it
  'shed.hose': {what: 'a hose in the shed', why: 'Watering by can took most of an hour today.', causes: ['long watering']},
  // the butt run dry with beds to water: a second butt keeps more of the roof's rain
  'shed.water-butt': {what: 'a second water butt in the shed', why: 'The butt ran dry: the gardener’s filling the can at the tap.', causes: ['butt dry']},
  // the first compost on a bed: a bin makes it faster
  'shed.compost-bin': {what: 'a compost bin in the shed', why: 'The heap’s compost is going on the beds: a bin makes it faster.', causes: ['spreading compost']},
  // slugs building up in a bed: nematodes, while the soil is warm
  'shed.nematodes': {what: 'nematodes in the shed', why: 'Slugs are building up in a bed: nematodes kill them below ground.', causes: ['slugs thriving']},
  // the first autumn bed standing empty: winter crops, a green manure, and the cold frame for later sowings
  'garden.winter': {what: 'each bed’s winter crop line', why: 'A bed stands empty for the autumn: sow a winter crop or a green manure.',
    causes: ['empty autumn bed']},
  'shed.cold-frame': {what: 'a cold frame in the shed', why: 'A frost or the autumn: a cold frame keeps frost off and sows later.',
    causes: ['frost damage', 'empty autumn bed']},
  // the big buys, each once it's worth having: a raised bed with the first new bed dug; the rainwater tank with the butt
  // run dry; the greenhouse after the first frost loss or the first blight; the fruit cage with the first bees on the
  // flowers (it grows the fruit the household buys); the hens once the heap is making compost
  'shed.raised-bed': {what: 'raised beds in the shed', why: 'A new bed is dug: a raised one drains faster and warms sooner.', causes: ['digging']},
  'shed.water-tank': {what: 'a rainwater tank in the shed', why: 'The butt ran dry: a tank on the house’s downpipe takes far more rain.', causes: ['butt dry']},
  'shed.greenhouse': {what: 'a greenhouse in the shed', why: 'The lean-to raises plants: a greenhouse grows them, and keeps frost and blight off.', causes: ['bought lean-to']},
  'shed.fruit-cage': {what: 'a fruit cage in the shed', why: 'The blackcurrant is in: a cage of canes and bushes grows the household’s fruit.', causes: ['bought fruit-bush']},
  // round four's ladder: each big buy in steps, the next shown once the one before is bought (the buy's `bought <id>`)
  'shed.coop': {what: 'a hen house in the shed', why: 'The heap is making compost: a hen house first, then hens for eggs and droppings.', causes: ['spreading compost']},
  'shed.hens': {what: 'hens for the house', why: 'The hen house is up: two hens to start, since hens are never kept alone.', causes: ['bought coop']},
  'shed.hen': {what: 'a third hen', why: 'The house takes three: one more for more eggs.', causes: ['bought hens']},
  'shed.lean-to': {what: 'a lean-to growhouse in the shed', why: 'Frost or blight took a crop: plants raised under cover go out stronger.', causes: ['frost damage', 'blight']},
  'shed.fruit-bush': {what: 'a blackcurrant bush in the shed', why: 'The garden is feeding the household: a fruit bush would add fruit.', causes: ['groceries saved', 'pollination']},
  // the mid-priced kit, each when it first helps: the fork with the first bed dug; cloches with the first empty autumn
  // bed or a frost; the propagator once next year's seed is ordered; the bee hotel with the first bees on the flowers;
  // cordon redcurrants when bare-root season opens in November
  'shed.fork': {what: 'a digging fork in the shed', why: 'A new bed is being dug: a fork breaks new ground faster.', causes: ['digging']},
  'shed.cloches': {what: 'cloches in the shed', why: 'A frost or the autumn: cloches keep frost off a bed for less than a frame.',
    causes: ['frost damage', 'empty autumn bed']},
  'shed.propagator': {what: 'a propagator in the shed', why: 'Next year’s seed is ordered: a propagator raises the tender plants from it.',
    causes: ['seed catalogue']},
  'shed.bee-hotel': {what: 'a bee hotel in the shed', why: 'Bees are working the flowers: a bee hotel brings a few more in spring.', causes: ['pollination']},
  'shed.cordon': {what: 'cordon redcurrants in the shed', why: 'Bare-root season: fruit bushes are cheapest and settle best planted now.',
    causes: ['bare-root season']},
  // the temperature matters once a frost reaches a crop it can hurt
  'garden.weather': {what: 'the temperature', why: 'A frost reached a crop: the temperature now shows.', causes: ['frost damage']},
  // the allotment's first season (part 8), one at a time: the neighbours on the first day; the neglected plot offered,
  // with the helper's offer, after a fortnight; the trough the first time it leaves a plot short, and the vote a
  // neighbour puts with it; trust with the first week of auditing the helper; the shed with the first surplus, and
  // goodwill with the first swap
  'allotment.neighbours': {what: 'the neighbours, a face each', why: 'Eleven households garden here, each as their lives allow.', causes: ['a neighbour’s harvest']},
  'agency.helper': {what: 'the second plot, and a neighbour’s offer to help', why: 'The neglected plot’s holder has given it up: it’s yours if you want it.',
    causes: ['second plot offered']},
  'allotment.trough': {what: 'the trough, its queue and who went short', why: 'A dry spell: twelve plots, one trough, and the back of the queue went short.',
    causes: ['trough short']},
  'committee.panel': {what: 'the committee and its vote', why: 'A neighbour has put the water rota to the committee: you have a vote.', causes: ['motion put']},
  'agency.trust': {what: 'how far you trust the helper’s report', why: 'An audit compares what they said with what you saw.', causes: ['audit']},
  'allotment.shed': {what: 'the swap shed', why: 'The plot gave more of something than the household needs: swap it.', causes: ['surplus']},
  'agency.goodwill': {what: 'each neighbour’s goodwill', why: 'A swap is a favour: the neighbours notice.', causes: ['from the swap shed']},
};

/** Cards answered once a save (src/sim/commands.ts): the first plan, the one "try faster" nudge, the garden's year done
 *  (the level's end, once the allotment offer's requirements are met), and the garden's first year, on its anniversary. */
export const CARDS = {firstPlan: 'card.first-plan', tryFaster: 'card.try-faster', year: 'card.year', firstYear: 'card.first-year'} as const;

/** The levers each key gates: a command on one is refused until its key has unfolded (`except` a value that's always
 *  allowed, `only` the one value that's gated). */
export const GATES: {lever: string; key: string; except?: string; only?: string}[] = [
  {lever: 'waterBelow', key: 'garden.water'},
  {lever: 'slugs', key: 'garden.slugs'},
  {lever: 'aphids', key: 'garden.aphids'},
  {lever: 'blight', key: 'garden.blight'},
  {lever: 'edge', key: 'garden.flowers', except: 'none'},
  {lever: 'sow', key: 'garden.flowers', only: 'marigolds'},
  {lever: 'winter', key: 'garden.winter', except: 'none'},
  {lever: 'swap', key: 'allotment.shed'},
];

/** Whether a key has unfolded: it must be in the table and seen. */
export const unfolded = (seen: readonly string[], key: string) => key in UNFOLD && seen.includes(key);

/** Whether a view shows: its key has unfolded, or the player asked to see every detail (the setting shows numbers, it
 *  opens no lever: the sim's gates stay). A key not in the table never shows, whatever the setting. */
export const shows = (seen: readonly string[], key: string, all = false) => key in UNFOLD && (all || seen.includes(key));

const ORDER = Object.keys(UNFOLD);
/** The keys each cause reveals: built once, so a tick's check is one lookup an effect. */
const BY_CAUSE = new Map<string, string[]>();
for (const [k, u] of Object.entries(UNFOLD)) for (const c of u.causes) BY_CAUSE.set(c, [...(BY_CAUSE.get(c) ?? []), k]);

/** The keys a tick's causes reveal, in the table's order, that haven't unfolded yet. */
/** The causes whose every key a seen list already holds, by the list (a tick's check skips them in one lookup). */
const spent = new WeakMap<readonly string[], Set<string>>();
export function revealed(seen: readonly string[], causes: Iterable<string>): string[] {
  let out: string[] | null = null, done = spent.get(seen);
  if (!done) spent.set(seen, (done = new Set()));
  for (const c of causes) {
    if (done.has(c)) continue;
    const keys = BY_CAUSE.get(c);
    if (!keys || keys.every((k) => seen.includes(k))) {
      done.add(c);
      continue;
    }
    if (keys) for (const k of keys) if (!seen.includes(k) && !out?.includes(k)) (out ??= []).push(k);
  }
  return out ? out.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)) : [];
}

/** The key a lever command waits on, or null if it's open. */
export function gateOf(lever: string, value: unknown): string | null {
  for (const g of GATES) {
    if (g.lever !== lever) continue;
    if (g.except !== undefined && value === g.except) continue;
    if (g.only !== undefined && value !== g.only) continue;
    return g.key;
  }
  return null;
}
