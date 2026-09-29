// The quiet night: when nothing needs the player, the night passes at four times the chosen speed on the page, and
// hands back at dawn or the moment something happens (the brief "a shorter garden year"). It holds on the levels that
// step by the hour, after dark, once the gardener has gone to bed until dawn (after any dusk patrol), with no slug out
// and no frost on the map; the page adds that no card or notice is waiting. Pacing on the page only: the sim runs the
// same steps, so play is unchanged. docs/systems/clock.md.
import {LEVELS} from '../data/ladder';
import {calendar} from '../sim/clock';
import {pestsOf} from '../sim/models/pests';
import type {WeatherHour} from '../sim/models/weather';
import type {Snapshot} from '../sim/state';
import {darkness} from './map/daylight';

/** The dawn a quiet night runs to, in game hours (06:00 the next morning), or null if the night at `hours` isn't quiet
 *  as far as the map goes: `hour` is the weather at that hour, or null if the snapshot doesn't carry it. */
export function quietUntil(snap: Snapshot, hours: number, hour: WeatherHour | null): number | null {
  if (LEVELS[snap.level - 1]?.stepHours !== 1 || snap.speed === 0) return null;
  // hour 0 is 06:00: the next dawn, and after dawn the day's own
  const dawn = Math.floor(hours / 24 + 1) * 24, d = calendar(hours);
  if (d.hour >= 6 && darkness(d) < 0.5) return null;
  // the gardener's latest activity to have started: gone to bed until dawn
  let bed = null;
  for (const a of snap.activities) if (a.who === 'gardener' && a.start <= hours && (!bed || a.start >= bed.start)) bed = a;
  if (!bed || bed.doing !== 'rest' || bed.end < dawn - 1e-6) return null;
  // something live on the map: a slug out on a bed, or a frost
  if (hour && hour.frost > 0) return null;
  if (snap.nodes.some((n) => n.kind === 'bed' && pestsOf(n).out >= 0.5)) return null;
  return dawn;
}
