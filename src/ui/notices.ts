// Notices (the owner's win W27): rare in Overgrow, where impacts go on the map, but the ones there are (a command the
// game refused) are capped and expire. A pure queue, so a Vitest test holds the rules: at most NOTICE_CAP shown, the
// newest kept, an informational notice gone after NOTICE_MS, a choice kept until it's answered, and no repeats.

export interface Notice {
  id: number;
  text: string;
  /** A choice stays until answered; anything else expires. */
  choice?: boolean;
  /** When it was shown, ms. */
  at: number;
}

export const NOTICE_CAP = 2, NOTICE_MS = 6000;

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
