// The smallholding's first markets: the box scheme (households who take a box a week at a set price) and the farm shop
// (walk-in customers), with prices, footfall, goodwill and churn. Rough, invented-place-free numbers, each with its
// source; src/sim/models/market.ts uses them and docs/systems/market.md says how.
//
// Licences: DEFRA Family Food and ONS Family Spending (Open Government Licence v3.0) for baskets and prices;
// Soil Association and Local Food Direct-style box-scheme surveys, CSA network reports and farm retail association
// figures for churn, footfall and the box's share of a basket are rough, rounded, and read as orders of magnitude, not
// copied; Green et al. (2013, BMJ) for price elasticities. Invented places only; nothing here names a real shop or scheme.
import type {Group} from './crops';

/** The box scheme: a box holds `share` of a household's weekly veg (by group, from src/sim/models/household.ts's demand);
 *  its price is `priceIndex` times national average shop prices (a steady, contracted price below a farm shop's); a
 *  household leaves at `churn` a month plus `unhappy` for each point of goodwill short of 1; joiners a month are
 *  `join` plus `word` for each subscriber (word of mouth), times goodwill squared and the price's pull; goodwill moves
 *  toward the share of the promise delivered by `rate` a week. Five minutes to pack a box. */
export const BOX = {
  share: 0.4, priceIndex: 0.9, refPrice: 0.9, priceElasticity: 2, churn: 0.04, unhappy: 0.25, join: 1, word: 0.03,
  rate: 0.3, startGoodwill: 0.8, weeksPerMonth: 4, packMin: 5,
  /** Who joins, by income decile (lowest first): box schemes skew to the middle and upper deciles. */
  deciles: [0, 0.02, 0.04, 0.06, 0.09, 0.14, 0.18, 0.2, 0.16, 0.11],
};

/** What topping up a short box from a wholesaler costs, as a share of national shop prices: about what the box charges, so
 *  a top-up earns nothing (and carries the import's carbon). */
export const IMPORT = {priceShare: 0.95};

/**
 * The farm shop: customers a day at the reference price in a mid-summer week (`base`), by season (multiples) and weekday
 * (Monday first); each buys `visit` of a household's weekly veg; footfall falls with the price by `elasticity` (a dearer
 * shop draws fewer walkers-in); a day's weather and the day's luck spread it (`luck`, a standard deviation as a share).
 * The shop's price is `priceIndex` times national average shop prices, above a box's (local and fresh, no contract).
 * Customers skew to the upper deciles.
 */
export const SHOP = {
  base: 30, season: {winter: 0.5, spring: 0.85, summer: 1, autumn: 0.8} as Record<string, number>,
  weekday: [0.7, 0.7, 0.75, 0.8, 1, 1.7, 1.2], visit: 0.25, elasticity: 0.8, luck: 0.35, priceIndex: 1.25, refPrice: 1.25, openHours: 7, serveMin: 4,
  deciles: [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.16, 0.12],
};

/** Prices move with the season: dearer when the produce is scarce (the amplitude, a share of the mean) at the day of the
 *  year of the peak. Potatoes peak in late spring (the old crop running out), salad, tomatoes and greens in winter (when
 *  imports supply them). DEFRA's food price series for fresh veg, rounded. */
export const SEASONAL: Record<Group, {amp: number; peak: number}> = {
  potatoes: {amp: 0.18, peak: 120}, salads: {amp: 0.25, peak: 15}, tomatoes: {amp: 0.3, peak: 15}, greens: {amp: 0.2, peak: 60},
};
/** Quality sets price: a lot earns the top price fresh and `min` of it with none of its life left, losing little at first
 *  (the look holds until it turns): the loss goes with life to `power`. */
export const FRESH_PRICE = {min: 0.5, power: 3};
