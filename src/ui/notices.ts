// Notices (the owner's win W27): rare in Overgrow, where impacts go on the map, but the ones there are (a command the
// game refused, and the sign that something new has unfolded) are queued and expire. A pure queue, so a Vitest test holds
// the rules: one shown at a time (the head), the rest waiting behind it up to NOTICE_QUEUE, the oldest informational one
// dropped past that; an informational notice gone NOTICE_MS after it was first shown, a choice kept until it's answered,
// and no repeats. Short, so it never covers most of a phone's map: one line, and its Explain on a tap.
import {UNFOLD} from '../data/unfold';

export interface Notice {
  id: number;
  text: string;
  /** A choice stays until answered; anything else expires. */
  choice?: boolean;
  /** An unfold sign: the keys that unfolded together, one sign for the batch (src/data/unfold.ts; win W26). */
  keys?: string[];
  /** A moment worth a word (src/ui/moments.ts): the first harvest, the first sale, a season's line. */
  moment?: 'harvest' | 'sale' | 'season';
  /** A short line under the text: the sign's short Explain. */
  more?: string;
  /** A choice's buttons. */
  actions?: {label: string; run: () => void}[];
  /** When it was queued, ms, and once it's at the head of the queue, when it was first shown. */
  at: number;
  /** The game day it's about: an informational notice not shown by the end of its day is dropped, never shown on a
   *  later day (a choice waits until it's answered). */
  day?: number;
}

/** The queue as it stands on a game day: informational notices from earlier days gone, unshown. */
export const today = (list: readonly Notice[], day: number) => list.filter((n) => n.choice || n.day === undefined || n.day >= day);

/** One shown at a time; the most waiting behind it; how long an informational one shows, ms. */
export const NOTICE_CAP = 1, NOTICE_QUEUE = 4, NOTICE_MS = 6000;
/** The most an unfold sign names; the rest are counted. */
export const SIGN_NAMES = 2;

/** The queue at a time: an informational head that has shown for NOTICE_MS goes, and the next one's time starts. */
export function current(list: readonly Notice[], now: number): Notice[] {
  let out = list.slice();
  while (out.length && !out[0]!.choice && now - out[0]!.at >= NOTICE_MS) {
    // the next one showed from the moment the head's time ran out
    const ended = out[0]!.at + NOTICE_MS;
    out = out.slice(1);
    if (out.length && !out[0]!.choice) out[0] = {...out[0]!, at: Math.max(out[0]!.at, ended)};
  }
  return out;
}

/** The one shown now: the head of the queue. */
export const shownOf = (list: readonly Notice[]) => list.slice(0, NOTICE_CAP);

/** Adds a notice to the back of the queue: the same text again replaces the waiting one rather than stacking, and past
 *  NOTICE_QUEUE the oldest informational one waiting goes (a choice stays). */
export function push(list: readonly Notice[], n: Notice): Notice[] {
  const head = current(list, n.at);
  const all = head.length && head[0]!.text === n.text ? [{...n, at: head[0]!.at}, ...head.slice(1)] : [...head.filter((x) => x.text !== n.text), n];
  // the first to show starts its time now
  if (all.length === 1) all[0] = {...all[0]!, at: n.at};
  while (all.length > NOTICE_QUEUE) {
    const i = all.findIndex((x, j) => j > 0 && !x.choice);
    all.splice(i >= 0 ? i : 1, 1);
  }
  return all;
}

/** The sign for what unfolded between two snapshots' `seen` lists: one for the whole batch (win W26), or null. */
export function unfoldSign(before: readonly string[], after: readonly string[], id: number, at: number): Notice | null {
  const keys = after.filter((k) => k in UNFOLD && !before.includes(k));
  if (!keys.length) return null;
  // a long batch (a big tick, or a save carried on after a while) names two and counts the rest, with the first's why
  const what = keys.map((k) => UNFOLD[k]!.what), shown = what.length > SIGN_NAMES ? `${what.slice(0, SIGN_NAMES).join('; ')} and ${what.length - SIGN_NAMES} more` : what.join('; ');
  return {id, at, keys, text: `New: ${shown}`, more: keys.length > SIGN_NAMES ? UNFOLD[keys[0]!]!.why : keys.map((k) => UNFOLD[k]!.why).join(' ')};
}
