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
  // the household's first ask of the garden, on its second evening (the first minute's last moment)
  'garden.kitchen': {what: 'the Kitchen tab and the day’s ask', why: 'The household is looking to the garden for its veg.', causes: ['ask', 'eating']},
  // the gardener home from work on the second day, noted with the kitchen's first ask so the two share one sign
  'household.commute': {what: 'the gardener’s job', why: 'They work weekdays: that’s why the garden gets four hours a day.', causes: ['commute']},
  // money matters from the first payday (Friday of the first week), or the first sale or purchase if that comes sooner
  'garden.money': {what: 'money in the top bar and the week’s pay and shop', why: 'Payday: what’s left after the shop and the bills is the garden’s to spend.',
    causes: ['wages', 'honesty box', 'slug pellets', 'insecticide', 'fungicide']},
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
  // the temperature matters once a frost reaches a crop it can hurt
  'garden.weather': {what: 'the temperature', why: 'A frost reached a crop: the temperature now shows.', causes: ['frost damage']},
};

/** Cards answered once a save (src/sim/commands.ts): the first plan and the one "try faster" nudge. */
export const CARDS = {firstPlan: 'card.first-plan', tryFaster: 'card.try-faster'} as const;

/** The levers each key gates: a command on one is refused until its key has unfolded (`except` a value that's always
 *  allowed, `only` the one value that's gated). */
export const GATES: {lever: string; key: string; except?: string; only?: string}[] = [
  {lever: 'waterBelow', key: 'garden.water'},
  {lever: 'slugs', key: 'garden.slugs'},
  {lever: 'aphids', key: 'garden.aphids'},
  {lever: 'blight', key: 'garden.blight'},
  {lever: 'edge', key: 'garden.flowers', except: 'none'},
  {lever: 'sow', key: 'garden.flowers', only: 'marigolds'},
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
export function revealed(seen: readonly string[], causes: Iterable<string>): string[] {
  let out: string[] | null = null;
  for (const c of causes) {
    const keys = BY_CAUSE.get(c);
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
