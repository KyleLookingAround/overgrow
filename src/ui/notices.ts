// Notices (the owner's win W27): rare in Overgrow, where impacts go on the map, but the ones there are (a command the
// game refused, and the sign that something new has unfolded) are capped and expire. A pure queue, so a Vitest test holds the rules: at most NOTICE_CAP shown, the
// newest kept, an informational notice gone after NOTICE_MS, a choice kept until it's answered, and no repeats.
import {UNFOLD} from '../data/unfold';

export interface Notice {
  id: number;
  text: string;
  /** A choice stays until answered; anything else expires. */
  choice?: boolean;
  /** An unfold sign: the keys that unfolded together, one sign for the batch (src/data/unfold.ts; win W26). */
  keys?: string[];
  /** A short line under the text: the sign's short Explain. */
  more?: string;
  /** A choice's buttons. */
  actions?: {label: string; run: () => void}[];
  /** When it was shown, ms. */
  at: number;
}

export const NOTICE_CAP = 2, NOTICE_MS = 6000;
/** The most an unfold sign names; the rest are counted. */
export const SIGN_NAMES = 2;

/** The notices still showing at a time. */
export const current = (list: readonly Notice[], now: number) => list.filter((n) => n.choice || now - n.at < NOTICE_MS);

/** Adds a notice: the same text again refreshes it rather than stacking, and the oldest go past the cap (choices last). */
export function push(list: readonly Notice[], n: Notice): Notice[] {
  const rest = current(list, n.at).filter((x) => x.text !== n.text), all = [...rest, n];
  while (all.length > NOTICE_CAP) {
    const i = all.findIndex((x) => !x.choice);
    all.splice(i >= 0 ? i : 0, 1);
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
