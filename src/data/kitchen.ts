// The kitchen: what the household wants of the garden each day, and the honesty box at the gate. About 1 kg of veg a day
// is a household of 2.4 people (ONS, "Families and households", the UK average) eating the NHS's five 80 g portions of
// fruit and veg a day each, most of it veg; the mix across the groups the garden can grow is DEFRA Family Food's rough
// shares of household veg by weight (potatoes the biggest, then salad veg, tomatoes and green veg). The honesty box's
// price is a plain farm-gate one, about what a lane-side box asks per kg across a bag of mixed veg.
import type {Group} from './crops';

/** The day's ask, kg, by group. */
export const ASK: Record<Group, number> = {potatoes: 0.4, salads: 0.3, tomatoes: 0.15, greens: 0.15};
/** A group can stand in for another that's short, up to this many times its own ask (more salad when there are no beans). */
export const STRETCH = 2;
/** The household eats at this hour. */
export const MEAL_HOUR = 18;
/** The kitchen keeps as many days of each group's ask as it keeps fresh for (half its shelf life), up to three weeks;
 *  what's over goes to the honesty box. */
export const KEEP_DAYS = 21;

/** The honesty box: £ per kg, and how much the lane's passers-by take a day (more at weekends). */
export const BOX = {price: 2.5, perDay: 2, weekend: 3.5};
