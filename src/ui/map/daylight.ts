// How dark the map is at a game hour: the sun's day length at a southern-English latitude from the date, with an hour's
// twilight either side. Cosmetic: nothing here changes the game, and part 2's weather owns the real sun.
// Day length from the solar declination (Cooper 1969) and the sunrise hour angle, solar noon taken as 12:00.
import type {CalendarDate} from '../../sim/clock';

const LAT = (51.5 * Math.PI) / 180;

/** 0 in full day, 1 in full night. */
export function darkness(d: CalendarDate): number {
  const decl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + d.dayOfYear)) / 365);
  const cos = -Math.tan(LAT) * Math.tan(decl), half = (Math.acos(Math.min(1, Math.max(-1, cos))) * 12) / Math.PI; // hours from noon to sunset
  const h = d.hour + d.minute / 60, fromNoon = Math.abs(h - 12);
  return Math.min(1, Math.max(0, fromNoon - half + 0.5)); // an hour of twilight centred on sunrise and sunset
}
