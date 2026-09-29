// The kitchen: how it keeps what the garden gives, and the honesty box at the gate. What the household wants of the
// garden each day is the weekly basket's veg for its people (src/data/household.ts, `kitchenAsk` in
// src/sim/models/kitchen.ts). The honesty box's price is a plain farm-gate one, about what a lane-side box asks per kg
// across a bag of mixed veg.
/** A group can stand in for another that's short, up to this many times its own ask (more salad when there are no beans). */
export const STRETCH = 2;
/** The household eats at this hour. */
export const MEAL_HOUR = 18;
/** The kitchen keeps as many days of each group's ask as it keeps fresh for (half its shelf life), up to three weeks;
 *  what's over goes to the honesty box. */
export const KEEP_DAYS = 21;

/** The honesty box: £ per kg, and how much the lane's passers-by take a day (more at weekends). */
export const BOX = {price: 2.5, perDay: 2, weekend: 3.5};
