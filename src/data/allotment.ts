// The allotment (level 2): its layout of twelve plots in rows with paths, the trough and the sheds, the rent, the
// player's plot's three levers (care, mix and feed) and what each does, and the ranges the neighbours' plots are drawn
// from. Rough numbers with their sources; src/sim/allotment.ts uses them and docs/systems/allotment.md says how.
//
// Sources: the National Allotment Society's guidance (a ten-rod plot of 250 m², about six hours a week to keep it, a rent
// of roughly £50 to £150 a year for a full plot in England, the median near £100) through src/data/household.ts's PLOT;
// RHS guidance on allotment care (weeding, mulching and keeping the soil covered) for what care and compost do to the
// ground; yields by crop from RHS and Garden Organic's rough figures (potatoes about 3–4 kg a m², salads and greens
// 1–2 kg, tomatoes outdoors about 2–3 kg) for what the mix does to the kg; the carbon of bought feed from the fertiliser
// literature (making ammonium nitrate emits about 4–6 kg CO₂e a kg of nitrogen; Brentrup et al. 2016) and of home
// compost against bought from the heap's model (src/sim/models/carbon.ts).
// Licence: original to this project (rough figures from public guidance; no dataset copied), so it carries the project's.
import type {ProductGroup} from './ladder-rules';

/** A place on the map, m (the graph's Box). */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type LandUse = 'crops' | 'grass' | 'built' | 'path' | 'water' | 'woodland';

/** The player's plot, which is the garden sealed, and the eleven neighbours' after it. */
export const PLAYER_PLOT = 'plot-1';
export const PLOTS = 12;
export const plotId = (i: number) => `plot-${i + 1}`;

/** A plot tile's size on the map, m: the garden's own shape, so the garden shrinks into its tile without stretching. */
export const TILE = {w: 12, h: 8};
const COLS = 4, GAP = 1, ROW_PATH = 2, SPINE = 2, SHEDS_W = 5;
const X0 = SHEDS_W + SPINE;

/** Where a plot is drawn: four in a row, three rows, the player's first (top left, by the sheds). */
export function plotBox(i: number): Box {
  const col = i % COLS, row = Math.floor(i / COLS);
  return {x: X0 + col * (TILE.w + GAP), y: row * (TILE.h + ROW_PATH), w: TILE.w, h: TILE.h};
}
const WIDTH = X0 + COLS * (TILE.w + GAP) - GAP, HEIGHT = 3 * TILE.h + 2 * ROW_PATH;

/** The allotment's shared places: the sheds, the spine path by them, the two paths between the rows and the trough on the first. */
export const SHARED: {id: string; kind: string; name: string; box: Box; land: LandUse}[] = [
  {id: 'sheds', kind: 'sheds', name: 'The sheds', box: {x: 0, y: 0, w: SHEDS_W - 0.5, h: 7}, land: 'built'},
  {id: 'spine', kind: 'path', name: 'The main path', box: {x: SHEDS_W, y: 0, w: SPINE - 0.5, h: HEIGHT}, land: 'path'},
  {id: 'path-1', kind: 'path', name: 'The top path', box: {x: X0, y: TILE.h + 0.25, w: WIDTH - X0, h: ROW_PATH - 0.5}, land: 'path'},
  {id: 'path-2', kind: 'path', name: 'The bottom path', box: {x: X0, y: 2 * TILE.h + ROW_PATH + 0.25, w: WIDTH - X0, h: ROW_PATH - 0.5}, land: 'path'},
  {id: 'trough', kind: 'trough', name: 'The trough', box: {x: X0 + 2 * (TILE.w + GAP) - 2.3, y: TILE.h + 0.35, w: 3.6, h: 1.3}, land: 'water'},
];
/** The trough's water when the allotment opens, and what it holds, L (a galvanised trough of about 1 m³, part 8's). */
export const TROUGH_L = {start: 600, cap: 1000};

/** A plot's rent, £ a day: about £100 a year for a full ten-rod plot (the National Allotment Society's rough median). */
export const RENT_PER_DAY = 100 / 365;

// ---- the player's plot's plan: three levers, each a real trade ----

/**
 * Care: the hours a week the household gives the plot. What a plot needs is household.ts's `keptness` against a
 * standard ten-rod plot (six hours a week keeps 250 m², the plot the committee lets). Health's target moves by `points`
 * across the whole range of keptness, from none to fully kept, against the garden's own care (`base`), so the default
 * plan leaves the garden's Health where it was.
 */
export const CARE = {options: [1, 2, 3, 4] as const, base: 2 as 1 | 2 | 3 | 4, points: 30};
export type Care = (typeof CARE.options)[number];

/**
 * Mix: what the plot grows more of. `as grown` is the garden's own mix, sealed. Each other weights its groups by
 * `weight` (then the mix is made to add up to the Output again), and moves the kg by `output`: potatoes give more kg a m²
 * than salads and greens (RHS: roughly 3–4 kg against 1–2), tomatoes about the same.
 */
export const MIXES = {
  'as grown': {name: 'As the garden grew', weight: {}, output: 1},
  roots: {name: 'More roots', weight: {potatoes: 2.2}, output: 1.12},
  greens: {name: 'More greens', weight: {salads: 1.8, greens: 1.8}, output: 0.92},
  fruit: {name: 'More fruit', weight: {tomatoes: 2.5}, output: 1},
} satisfies Record<string, {name: string; weight: Partial<Record<ProductGroup, number>>; output: number}>;
export type Mix = keyof typeof MIXES;
export const MIX_IDS = Object.keys(MIXES) as Mix[];

/**
 * Feed: the plot's own compost, or bought feed. Compost is what the garden did (its heap), so it changes nothing; bought
 * feed (pelleted chicken manure or a balanced fertiliser, about £35 a year for a plot this size) gives more kg now, costs
 * £ and carbon every day, and lets the soil's organic matter run down: Health's target falls.
 */
export const FEEDS = {
  compost: {name: 'The plot’s own compost', output: 1, upkeep: 0, carbon: 0, health: 0},
  bought: {name: 'Bought feed', output: 1.1, upkeep: 0.1, carbon: 0.12, health: -8},
} satisfies Record<string, {name: string; output: number; upkeep: number; carbon: number; health: number}>;
export type Feed = keyof typeof FEEDS;
export const FEED_IDS = Object.keys(FEEDS) as Feed[];

/** The plot's plan's levers, as the node keeps them. */
export const PLAN_LEVERS = {care: 'care', mix: 'mix', feed: 'feed'} as const;

/** The allotment's levers unfold one at a time over its first weeks (win W26's unfolding): care at once, then mix, then feed. */
export const LEVER_DAYS: Record<keyof typeof PLAN_LEVERS, number> = {care: 0, mix: 7, feed: 21};

// ---- the neighbours' plots ----

/**
 * What a neighbour's plot is drawn from, against the player's garden: its Output is the garden's times `output` at
 * the lowest keptness to the highest (a plot kept well by a household with time yields more), with `jitter` of luck
 * either way; its Health is `health` from least kept to best kept, give or take `jitter` × 100 × 0.5; Reliability,
 * upkeep and carbon the garden's give or take `jitter`. The neglected plot's Health is held at or below `neglected`.
 */
export const NEIGHBOUR_RANGE = {output: [0.6, 1.4] as const, health: [38, 72] as const, jitter: 0.15, neglected: 35};

/** The allotment's length, game days: about two years (the owner's decision 17), for part 8 to fill. */
export const ALLOTMENT_DAYS = 730;
