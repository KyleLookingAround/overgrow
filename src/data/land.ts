// The land's numbers (docs/specs/one-map.md, "Land as organic parcels"; docs/decisions/ADR-2026-10-01-organic-parcels.md):
// the size of a cell of the mosaic the land is built from, how far fields grow and join, the share of each kind of field
// on a smallholding, and each arable crop's year in England, so the land's colour follows the season. src/sim/land.ts
// builds the land from them; docs/systems/land.md says how.
//
// Sources: AHDB's growth guides for wheat, barley and oilseed rape (drilling, flowering and harvest dates in England),
// the Potato Council's planting and burning-off dates, PGRO for field beans; the "about a third of a hectare" cell and the
// eighteen-cell join from the one map's spec (rough: an English field of 2 to 6 ha). Dates are typical for lowland
// England, not any one farm.
// Licence: original to this project (rough figures from public guidance; no dataset copied), so it carries the project's.

/** A cell of the mosaic, m² on average (a third of a hectare); a field is three to twelve of them at first, and joined
 *  fields at most JOIN_MOST. Lloyd's relaxation, RELAX times, evens the cells' sizes without making them regular. */
export const LAND = {cellM2: 3300, relax: 2, fieldCells: [3, 12], joinMost: 18} as const;

/** What a field is used for. The yard is the house and its buildings. */
export type FieldKind = 'arable' | 'grass' | 'wood' | 'water' | 'yard';
export const FIELD_KINDS: readonly FieldKind[] = ['arable', 'grass', 'wood', 'water', 'yard'];

/** The farm crops a field can be in. */
export type FieldCrop = 'winter-wheat' | 'spring-barley' | 'oilseed-rape' | 'potatoes' | 'field-beans';
export const FIELD_CROPS: readonly FieldCrop[] = ['winter-wheat', 'spring-barley', 'oilseed-rape', 'potatoes', 'field-beans'];

/** How a field looks through its crop's year: bare ploughed earth, drilled (fine rows on bare soil), green, in flower,
 *  ripe, and stubble after harvest. */
export type CropStage = 'ploughed' | 'drilled' | 'green' | 'flowering' | 'ripe' | 'stubble';

/** Each crop's year: the stage it enters on a day of the year, in order (the last entry runs on into the new year). */
export const CALENDAR: Record<FieldCrop, readonly (readonly [CropStage, number])[]> = {
  // drilled in October, green through winter, gold in July, cut in August, ploughed in September
  'winter-wheat': [['ripe', 190], ['stubble', 220], ['ploughed', 255], ['drilled', 280], ['green', 315]],
  // stubble over winter, ploughed in February, drilled in March, cut in August
  'spring-barley': [['ploughed', 40], ['drilled', 75], ['green', 100], ['ripe', 200], ['stubble', 225]],
  // drilled in late August, yellow from late April into May, cut in July
  'oilseed-rape': [['flowering', 110], ['green', 150], ['ripe', 185], ['stubble', 205], ['ploughed', 222], ['drilled', 235], ['green', 255]],
  // planted in ridges in April, the haulm burnt off in September and lifted
  potatoes: [['ploughed', 60], ['drilled', 100], ['green', 140], ['ripe', 245], ['stubble', 270]],
  // drilled in February, white flowers in May and June, cut in August
  'field-beans': [['drilled', 50], ['green', 90], ['flowering', 140], ['green', 165], ['ripe', 215], ['stubble', 240], ['ploughed', 290]],
};

/** A smallholding's first layout: the shares of its fields' cells in grass and in crops (the rest is a wood, a pond and
 *  the yard), and the crops' weights. */
export const SMALLHOLDING = {w: 300, h: 400, grass: 0.4, woodCells: [4, 6], yardCells: 2, crops: {'winter-wheat': 3, 'spring-barley': 2, 'oilseed-rape': 2, potatoes: 1, 'field-beans': 1}} as const;

/** The stage a crop shows on a day of the year (1 to 366). */
export function stageOn(crop: FieldCrop, day: number): CropStage {
  const year = CALENDAR[crop];
  let at = year[year.length - 1]![0];
  for (const [stage, from] of year) if (day >= from) at = stage;
  return at;
}
