// What unfolds when (the owner's principle, 29 Sep: "systems unfolding to the user as they have influence"): every
// system runs from day one and the map stays alive, but an instrument (a plan line, a lever, a panel's number, a badge)
// appears only once the player first has influence over its system. Each key here is revealed the first time the game
// records one of its causes (src/sim/effects.ts), and goes into the state's saved `seen` list; a key not in this table
// never unfolds (it fails closed). The sim refuses a command on a lever whose key hasn't unfolded, so the bot plays the
// same game. Part 6 adds the older instruments (the soil numbers, the carbon dial, the temperature) and the first-time
// pulse.

export interface Unfold {
  /** What it reveals, in a few words. */
  what: string;
  /** Any of these causes recorded reveals it. */
  causes: string[];
}

export const UNFOLD: Record<string, Unfold> = {
  // the first pest the gardener meets: the slugs at dusk on the first damp evening (the founding spec's first minute)
  'pests.slugs': {what: 'the slugs’ policy line, their numbers and badges', causes: ['slugs', 'hand-picking']},
  'pests.aphids': {what: 'the aphids’ policy line, their numbers and badges', causes: ['aphids arriving', 'aphids']},
  'pests.blight': {what: 'the blight policy line, its share and badges', causes: ['Smith period', 'blight']},
  // flowers matter once there are aphids for ladybirds to eat or pods for bees to set
  flowers: {what: 'marigolds in a bed or along its edge, and the flowers’ badges', causes: ['aphids arriving', 'pollination', 'ladybirds']},
};

/** The levers each key gates: a command on one is refused until its key has unfolded (`except` a value that's always
 *  allowed, `only` the one value that's gated). */
export const GATES: {lever: string; key: string; except?: string; only?: string}[] = [
  {lever: 'slugs', key: 'pests.slugs'},
  {lever: 'aphids', key: 'pests.aphids'},
  {lever: 'blight', key: 'pests.blight'},
  {lever: 'edge', key: 'flowers', except: 'none'},
  {lever: 'sow', key: 'flowers', only: 'marigolds'},
];

/** Whether a key has unfolded: it must be in the table and seen. */
export const unfolded = (seen: readonly string[], key: string) => key in UNFOLD && seen.includes(key);

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
