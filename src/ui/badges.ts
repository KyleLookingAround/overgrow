// The map's badges: what a place is going through now, read from the snapshot, one small badge each (a slug out, aphids,
// blight, flowers in bloom, a thirsty crop, a frost). A badge is a button over the map that opens its Explain card; the
// map's meaning is never colour alone, so each has its own shape. A pest's or the flowers' badge shows only once they
// have come up in the garden (src/data/unfold.ts), so a badge is always something the player can act on. Where they sit is src/ui/map/placement.ts's.
import type {GraphNode} from '../sim/graph';
import {bloomOn} from '../sim/models/biodiversity';
import {cropOf} from '../sim/models/crops';
import {aphidsOn, pestsOf} from '../sim/models/pests';
import {areaOf, hasSoil, limitsOf, moisture} from '../sim/models/soil';
import type {WeatherHour} from '../sim/models/weather';
import {isDug} from './map/draw';
import {unfolded} from '../data/unfold';

export interface Badge {
  /** Unique: the place and the cause. */
  id: string;
  cause: string;
  at: string;
  /** What a screen reader says. */
  label: string;
}

/** The badges for a snapshot's places, at most two a place, most pressing first; the frost's on the lawn. */
export function badgesOf(nodes: readonly GraphNode[], hour: WeatherHour | null, seen: readonly string[]): Badge[] {
  const out: Badge[] = [];
  for (const n of nodes) {
    if (!n.box) continue;
    const mine: Badge[] = [], add = (cause: string, label: string) => mine.push({id: `${n.id}:${cause}`, cause, at: n.id, label: `${n.name}: ${label}`});
    if (n.kind === 'lawn' && hour && hour.frost > 0) add('frost', 'frost');
    if (n.kind === 'bed' && isDug(n)) {
      const p = pestsOf(n), c = cropOf(n);
      if (c?.dead) add('frost damage', 'killed by frost');
      if (p.blight > 0.01 && unfolded(seen, 'pests.blight')) add('blight', `blight on ${Math.round(100 * p.blight)} % of the tops`);
      if (p.out >= 0.5 && unfolded(seen, 'pests.slugs')) add('slugs', `${Math.round(p.out)} slugs out`);
      if (aphidsOn(n) / Math.max(1e-6, areaOf(n)) > 30 && unfolded(seen, 'pests.aphids')) add('aphids', `aphids, ${Math.round(aphidsOn(n))}`);
      if (c && !c.dead && c.ks < 0.75) add('water stress', 'the crop is short of water');
      else if (hasSoil(n) && moisture(n, limitsOf(n)) < 0.3) add('drought', 'the soil is dry');
      if (bloomOn(n) > 0 && unfolded(seen, 'flowers')) add('flowers', 'flowers in bloom');
    }
    out.push(...mine.slice(0, 2));
  }
  return out;
}
