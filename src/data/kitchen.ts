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
/** What keeps for two months or more (potatoes, cured onions and garlic) is stored in a cool, dark, airy place, the
 *  shed, for up to five months of the household's ask, not sold at the gate (RHS, "Storing fruit and vegetables"). */
export const STORE = {keeps: 60, days: 150};

/** The honesty box: £ per kg, and how much the lane's passers-by take a day (more at weekends). */
export const BOX = {price: 2.5, perDay: 2, weekend: 3.5};

/** The garden's food beyond its veg: the hens' eggs and the fruit cage's berries. Each stands in for some of a group of the
 *  rest of the diet the household would otherwise buy (src/data/household.ts's BASKET): up to `perWeek` kg a person a
 *  week (about four eggs, a little more than Family Food's purchases, since some go into baking; soft fruit in season up
 *  to the whole fruit ration). It keeps `keeps` days in the kitchen (eggs a month from laying; raspberries a few days),
 *  and sells at the honesty box at `box` £ a kg (eggs about £1.80 a half dozen; raspberries about £2 a 250 g punnet). */
export const EXTRAS = [
  {product: 'eggs', name: 'Eggs', group: 'dairy', perWeek: 0.25, keeps: 28, box: 5},
  {product: 'berries', name: 'Soft fruit', group: 'fruit', perWeek: 1, keeps: 4, box: 8},
] as const;
export type Extra = (typeof EXTRAS)[number];

/** A glut: more than this many kg over what the kitchen will eat while it's fresh, all at once. A new one starts after
 *  this many days without one (the glut card asks once a glut, not every day of it). */
export const GLUT = {kg: 3, gapDays: 5};
/** What the household does with a glut: sell it at the box (the default), preserve it (freeze, bottle or pickle) or give
 *  it to a neighbour. */
export type GlutPolicy = 'sell' | 'preserve' | 'give';
export const GLUT_POLICIES: GlutPolicy[] = ['sell', 'preserve', 'give'];
/** Preserving: about 25 minutes of washing, blanching and bagging a kg (WRAP, "Love Food Hate Waste": freezing veg), jars,
 *  bags and the freezer's electricity about 30p a kg, keeping about ten months, up to a freezer drawer's 20 kg; eaten
 *  in place of fresh veg the garden can't meet, most in the lean months. A household that preserves or gives its gluts
 *  keeps only `freshDays` of the ask fresh and deals with the rest while it's fresh. WRAP counts fresh veg as a third of household
 *  food waste, most of it thrown out for not being used in time. */
export const PRESERVE = {hoursPerKg: 0.4, gbpPerKg: 0.3, keeps: 300, cap: 20, freshDays: 3};
/** Given over the fence: the neighbour's thanks, counted as goodwill (the allotment's currency, part 8). */
export const GIFT = {goodwillPerKg: 1};
