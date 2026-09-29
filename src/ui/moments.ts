// Moments (the playable garden): the few things worth a word when they first happen, found by comparing two snapshots,
// so a Vitest test holds them. The first harvest ("First harvest: 0.6 kg of salad leaves", while the map shows it carried
// to the kitchen), the first sale at the honesty box (the money flashes once), and each season's turn, with a line of
// how the garden did in the season just gone. The first thing bought needs no words: it's drawn in use on the map.
import {CROPS, type CropId} from '../data/crops';
import {calendar} from '../sim/clock';
import type {Snapshot} from '../sim/state';
import {money, num} from './format';

export interface Moment {
  kind: 'harvest' | 'sale' | 'season';
  text: string;
}

/** The kitchen's running totals at a season's start: what the season's line counts from. */
export interface SeasonMark {
  season: string;
  picked: number;
  eaten: number;
  sold: number;
  earned: number;
}

export const markOf = (s: Pick<Snapshot, 'hours' | 'kitchen'>): SeasonMark => ({
  season: calendar(s.hours).season, picked: s.kitchen?.picked ?? 0, eaten: s.kitchen?.eaten ?? 0, sold: s.kitchen?.sold ?? 0, earned: s.kitchen?.earned ?? 0,
});

const name = (product: string | undefined) => (product && product in CROPS ? CROPS[product as CropId].name.toLowerCase() : 'produce');
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** What's worth a word between two snapshots of the same game, and the season mark to carry on with. */
export function momentsOf(before: Snapshot, after: Snapshot, mark: SeasonMark): {moments: Moment[]; mark: SeasonMark} {
  const out: Moment[] = [], k0 = before.kitchen, k1 = after.kitchen;
  if (k0?.firstHarvest == null && k1?.firstHarvest != null) {
    const pick = after.flows.find((f) => f.what === 'picking');
    out.push({kind: 'harvest', text: `First harvest: ${num(k1.picked)} kg of ${name(pick?.product)}`});
  }
  if (k0?.firstSale == null && k1?.firstSale != null) out.push({kind: 'sale', text: `First sale at the honesty box: ${money(k1.earned)}`});
  const now = markOf(after);
  if (now.season === mark.season) return {moments: out, mark};
  const picked = now.picked - mark.picked;
  out.push({kind: 'season', text: `${cap(mark.season)} in the garden: ${num(picked)} kg picked, ${num(now.eaten - mark.eaten)} kg eaten, ${num(now.sold - mark.sold)} kg sold (${money(now.earned - mark.earned)})`});
  return {moments: out, mark: now};
}
